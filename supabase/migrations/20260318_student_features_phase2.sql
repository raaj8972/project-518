
-- Phase 2: All 6 Premium Student Features (Fixed v2)
-- F1: Wallet Pass additions to entry_passes
-- F2: Next Up Timeline VIEW
-- F3: XP Ring gamification tables + triggers
-- F4: Announcements -> see 20260318_chat_announcements.sql
-- F5: Floating Hub  -> UI only
-- F6: Day/Night     -> UI only

-- ==========================
-- F1: WALLET PASS additions
-- ==========================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='pass_color') THEN
    ALTER TABLE public.entry_passes ADD COLUMN pass_color TEXT DEFAULT '#dc2626,#ea580c';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='pass_notes') THEN
    ALTER TABLE public.entry_passes ADD COLUMN pass_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='barcode_type') THEN
    ALTER TABLE public.entry_passes ADD COLUMN barcode_type TEXT DEFAULT 'qr';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='student_name') THEN
    ALTER TABLE public.entry_passes ADD COLUMN student_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='event_title') THEN
    ALTER TABLE public.entry_passes ADD COLUMN event_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='venue') THEN
    ALTER TABLE public.entry_passes ADD COLUMN venue TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='entry_passes' AND column_name='batch_id') THEN
    ALTER TABLE public.entry_passes ADD COLUMN batch_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entry_passes_batch ON public.entry_passes(batch_id);

-- Fix: Use registrations.user_id instead of student_id
DROP POLICY IF EXISTS "students_read_own_pass" ON public.entry_passes;
CREATE POLICY "students_read_own_pass" ON public.entry_passes
  FOR SELECT TO authenticated
  USING (
    registration_id IN (
      SELECT id::TEXT FROM public.registrations WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );


-- ==========================
-- F2: NEXT UP TIMELINE VIEW
-- ==========================
DROP VIEW IF EXISTS public.student_upcoming_events;
CREATE VIEW public.student_upcoming_events AS
  SELECT
    e.id::TEXT       AS item_id,
    e.title          AS event_title,   -- events table uses title, not name
    e.date::TEXT     AS start_time,    -- events table uses date (text or date)
    e.time::TEXT     AS end_time,      -- events table uses time
    e.venue,
    r.user_id        AS student_id,
    'event'          AS item_type,
    r.status
  FROM public.events e
  JOIN public.registrations r ON r.event_id::TEXT = e.id::TEXT
  WHERE r.status = 'approved'

  UNION ALL

  SELECT
    se.id::TEXT      AS item_id,
    se.name          AS event_title,   -- annual_sports_events uses name
    NULL             AS start_time,
    NULL             AS end_time,
    NULL             AS venue,
    sr.user_id       AS student_id,
    'sport'          AS item_type,
    sr.status
  FROM public.annual_sports_events se
  JOIN public.annual_sports_registrations sr ON sr.event_id = se.id
  WHERE sr.status = 'approved';

-- Usage in frontend:
-- SELECT * FROM student_upcoming_events WHERE student_id = auth.uid() ORDER BY start_time ASC NULLS LAST;


-- ==========================
-- F3: XP RING
-- ==========================
-- Using user_id instead of student_id for consistency with existing tables
CREATE TABLE IF NOT EXISTS public.student_xp (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  tier        TEXT NOT NULL DEFAULT 'bronze'
                CHECK (tier IN ('bronze','silver','gold','platinum')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_select" ON public.student_xp;
CREATE POLICY "xp_select" ON public.student_xp
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "xp_write" ON public.student_xp;
CREATE POLICY "xp_write" ON public.student_xp
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.student_activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  xp_earned   INTEGER NOT NULL DEFAULT 0,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_student ON public.student_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON public.student_activity_log(action);

ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON public.student_activity_log;
CREATE POLICY "activity_select" ON public.student_activity_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "activity_insert" ON public.student_activity_log;
CREATE POLICY "activity_insert" ON public.student_activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- XP award function (idempotent)
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id    UUID,
  p_action     TEXT,
  p_xp         INTEGER,
  p_meta       JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_total INTEGER;
  new_tier  TEXT;
BEGIN
  -- Skip duplicate same-action within 30 days
  IF EXISTS (
    SELECT 1 FROM public.student_activity_log
    WHERE user_id = p_user_id
      AND action = p_action
      AND created_at > NOW() - INTERVAL '30 days'
  ) THEN RETURN; END IF;

  INSERT INTO public.student_activity_log (user_id, action, xp_earned, meta)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  INSERT INTO public.student_xp (user_id, total_xp)
  VALUES (p_user_id, p_xp)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp   = public.student_xp.total_xp + p_xp,
        updated_at = NOW();

  SELECT total_xp INTO new_total FROM public.student_xp WHERE user_id = p_user_id;
  new_tier := CASE
    WHEN new_total >= 1000 THEN 'platinum'
    WHEN new_total >= 500  THEN 'gold'
    WHEN new_total >= 200  THEN 'silver'
    ELSE                        'bronze'
  END;

  UPDATE public.student_xp SET tier = new_tier WHERE user_id = p_user_id;
END;
$$;

-- Auto-award +50 XP when registration approved
CREATE OR REPLACE FUNCTION public.trg_xp_on_reg_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.award_xp(
      NEW.user_id::UUID,
      'event_registration_approved',
      50,
      jsonb_build_object('event_id', NEW.event_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_registration ON public.registrations;
CREATE TRIGGER trg_xp_registration
  AFTER UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.trg_xp_on_reg_approve();

-- Auto-award +100 XP when student registers for 3rd event
CREATE OR REPLACE FUNCTION public.trg_xp_multi_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.registrations
  WHERE user_id = NEW.user_id AND status IN ('pending','approved');
  IF cnt = 3 THEN
    PERFORM public.award_xp(NEW.user_id::UUID, 'multi_event_bonus', 100, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_multi_event ON public.registrations;
CREATE TRIGGER trg_xp_multi_event
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.trg_xp_multi_event();

-- REALTIME for XP
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_xp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_activity_log;
