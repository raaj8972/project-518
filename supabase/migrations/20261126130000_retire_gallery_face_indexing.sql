-- Face indexing was removed at the owner's request. Keep gallery photos and Drive links intact.
BEGIN;
DO $$ DECLARE routine regprocedure; BEGIN
 FOR routine IN SELECT p.oid::regprocedure FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('gallery_index_stats','claim_gallery_face_batch','complete_gallery_face_index','search_gallery_faces')
 LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',routine);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
