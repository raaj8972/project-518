BEGIN;
ALTER TABLE public.gallery_images
 ADD COLUMN IF NOT EXISTS face_index_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS face_index_error text,
 ADD COLUMN IF NOT EXISTS face_index_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS face_index_started_at timestamptz,
 ADD COLUMN IF NOT EXISTS face_indexed_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='gallery_face_index_status_check' AND conrelid='public.gallery_images'::regclass) THEN
  ALTER TABLE public.gallery_images ADD CONSTRAINT gallery_face_index_status_check CHECK(face_index_status IN ('pending','processing','indexed','no_faces','failed'));
 END IF;
END $$;
UPDATE public.gallery_images i SET face_index_status=CASE WHEN EXISTS(SELECT 1 FROM public.gallery_faces f WHERE f.image_id=i.id) THEN 'indexed' ELSE 'no_faces' END WHERE faces_indexed=true AND face_index_status='pending';
CREATE INDEX IF NOT EXISTS gallery_images_face_queue ON public.gallery_images(face_index_status,id);
CREATE INDEX IF NOT EXISTS gallery_faces_image_idx ON public.gallery_faces(image_id);
-- Explicit page guards also close an old gallery_settings UPDATE policy that allowed id=1 publicly.
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['gallery_images','gallery_faces','gallery_settings'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
  EXECUTE format('DROP POLICY IF EXISTS gallery_scope_insert ON public.%I',table_name);
  EXECUTE format('CREATE POLICY gallery_scope_insert ON public.%I AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(public.admin_can_manage_pages(ARRAY[''gallery''],ARRAY[''can_gallery'']))',table_name);
  EXECUTE format('DROP POLICY IF EXISTS gallery_scope_update ON public.%I',table_name);
  EXECUTE format('CREATE POLICY gallery_scope_update ON public.%I AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(public.admin_can_manage_pages(ARRAY[''gallery''],ARRAY[''can_gallery''])) WITH CHECK(public.admin_can_manage_pages(ARRAY[''gallery''],ARRAY[''can_gallery'']))',table_name);
  EXECUTE format('DROP POLICY IF EXISTS gallery_scope_delete ON public.%I',table_name);
  EXECUTE format('CREATE POLICY gallery_scope_delete ON public.%I AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(public.admin_can_manage_pages(ARRAY[''gallery''],ARRAY[''can_gallery'']))',table_name);
 END LOOP;
END $$;
DROP POLICY IF EXISTS gallery_face_private_read ON public.gallery_faces;
CREATE POLICY gallery_face_private_read ON public.gallery_faces AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(public.admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery']));

CREATE OR REPLACE FUNCTION public.gallery_index_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' AND NOT public.admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery']) THEN RAISE insufficient_privilege USING MESSAGE='Gallery access required';END IF;
 RETURN (SELECT jsonb_build_object('total',count(*),'processed',count(*) FILTER(WHERE face_index_status IN ('indexed','no_faces')),'pending',count(*) FILTER(WHERE face_index_status='pending'),'processing',count(*) FILTER(WHERE face_index_status='processing'),'failed',count(*) FILTER(WHERE face_index_status='failed'),'noFaces',count(*) FILTER(WHERE face_index_status='no_faces'),'facesFound',(SELECT count(*) FROM public.gallery_faces)) FROM public.gallery_images);
END $$;

CREATE OR REPLACE FUNCTION public.claim_gallery_face_batch(p_limit integer DEFAULT 1,p_retry_failed boolean DEFAULT false,p_image_ids integer[] DEFAULT null)
RETURNS TABLE(id integer,src text,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role()<>'service_role' AND NOT public.admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery']) THEN RAISE insufficient_privilege USING MESSAGE='Gallery access required';END IF;
 RETURN QUERY WITH candidates AS (
  SELECT i.id FROM public.gallery_images i WHERE (p_image_ids IS NULL OR i.id=ANY(p_image_ids)) AND
   (i.face_index_status='pending' OR (p_retry_failed AND i.face_index_status='failed') OR (i.face_index_status='processing' AND i.face_index_started_at<now()-interval '10 minutes'))
  ORDER BY i.id FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(coalesce(p_limit,1),3))
 ) UPDATE public.gallery_images i SET face_index_status='processing',face_index_error=null,face_index_started_at=now(),face_index_attempts=i.face_index_attempts+1
 FROM candidates c WHERE i.id=c.id RETURNING i.id,i.src,i.face_index_attempts;
END $$;

CREATE OR REPLACE FUNCTION public.complete_gallery_face_index(p_image_id integer,p_source text,p_attempt integer,p_faces jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; face_count integer;
BEGIN
 IF auth.role()<>'service_role' AND NOT public.admin_can_manage_pages(ARRAY['gallery'],ARRAY['can_gallery']) THEN RAISE insufficient_privilege USING MESSAGE='Gallery access required';END IF;
 IF jsonb_typeof(p_faces) IS DISTINCT FROM 'array' OR jsonb_array_length(p_faces)>100 THEN RAISE EXCEPTION 'Invalid face results';END IF;
 PERFORM 1 FROM public.gallery_images WHERE id=p_image_id AND src=p_source AND face_index_attempts=p_attempt AND face_index_status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Photo changed or another scan owns this entry. Refresh before retrying.';END IF;
 -- Face records and the success marker commit together, including a valid zero-face result.
 DELETE FROM public.gallery_faces WHERE image_id=p_image_id;
 FOR item IN SELECT * FROM jsonb_array_elements(p_faces) LOOP
  IF jsonb_typeof(item->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'embedding')<>128 OR jsonb_typeof(item->'bounds') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid face descriptor';END IF;
  INSERT INTO public.gallery_faces(image_id,embedding,bounds) VALUES(p_image_id,(item->'embedding')::text::extensions.vector(128),item->'bounds');
 END LOOP;
 face_count:=jsonb_array_length(p_faces);
 UPDATE public.gallery_images SET faces_indexed=true,face_index_status=CASE WHEN face_count=0 THEN 'no_faces' ELSE 'indexed' END,face_index_error=null,face_indexed_at=now(),updated_at=now() WHERE id=p_image_id;
 RETURN face_count;
END $$;

CREATE OR REPLACE FUNCTION public.reset_gallery_photo_faces() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.src IS DISTINCT FROM NEW.src THEN
  DELETE FROM public.gallery_faces WHERE image_id=OLD.id;
  NEW.faces_indexed:=false;NEW.face_index_status:='pending';NEW.face_index_error:=null;NEW.face_index_attempts:=0;NEW.face_index_started_at:=null;NEW.face_indexed_at:=null;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gallery_photo_source_changed ON public.gallery_images;
CREATE TRIGGER gallery_photo_source_changed BEFORE UPDATE OF src ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION public.reset_gallery_photo_faces();

-- Only IDs/scores are public; raw biometric descriptors remain restricted to gallery admins.
CREATE OR REPLACE FUNCTION public.search_gallery_faces(query_embedding extensions.vector,match_threshold double precision,match_count integer)
RETURNS TABLE(image_id bigint,similarity double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF query_embedding IS NULL OR extensions.vector_dims(query_embedding)<>128 THEN RAISE EXCEPTION 'A 128-dimensional descriptor is required';END IF;
 RETURN QUERY SELECT f.image_id,max(1-(f.embedding OPERATOR(extensions.<=>) query_embedding))::double precision
 FROM public.gallery_faces f JOIN public.gallery_images i ON i.id=f.image_id
 WHERE i.face_index_status='indexed' AND 1-(f.embedding OPERATOR(extensions.<=>) query_embedding)>greatest(0.70,least(coalesce(match_threshold,0.82),0.99))
 GROUP BY f.image_id ORDER BY 2 DESC LIMIT greatest(1,least(coalesce(match_count,100),100));
END $$;
REVOKE ALL ON FUNCTION public.gallery_index_stats(),public.claim_gallery_face_batch(integer,boolean,integer[]),public.complete_gallery_face_index(integer,text,integer,jsonb),public.reset_gallery_photo_faces() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gallery_index_stats(),public.claim_gallery_face_batch(integer,boolean,integer[]),public.complete_gallery_face_index(integer,text,integer,jsonb) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.search_gallery_faces(extensions.vector,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_gallery_faces(extensions.vector,double precision,integer) TO anon,authenticated,service_role;
DO $$ DECLARE table_name text;BEGIN
 FOREACH table_name IN ARRAY ARRAY['gallery_images','gallery_settings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=table_name) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',table_name);END IF;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
