-- Student Groups: Standing groups created by students (not event-specific)
CREATE TABLE IF NOT EXISTS public.student_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Members/invites for student groups
CREATE TABLE IF NOT EXISTS public.student_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_group_members ENABLE ROW LEVEL SECURITY;

-- student_groups: owner can do anything; members can read their groups
DROP POLICY IF EXISTS "student_groups_owner_all" ON public.student_groups;
CREATE POLICY "student_groups_owner_all" ON public.student_groups
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "student_groups_member_read" ON public.student_groups;
CREATE POLICY "student_groups_member_read" ON public.student_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_group_members m
      WHERE m.group_id = id AND m.user_id = auth.uid() AND m.status = 'accepted'
    )
  );

-- student_group_members: owner of group can manage; invitee can update own status; members can read
DROP POLICY IF EXISTS "sgm_owner_all" ON public.student_group_members;
CREATE POLICY "sgm_owner_all" ON public.student_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.student_groups g
      WHERE g.id = group_id AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sgm_invitee_read_update" ON public.student_group_members;
CREATE POLICY "sgm_invitee_read_update" ON public.student_group_members
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sgm_member_read" ON public.student_group_members;
CREATE POLICY "sgm_member_read" ON public.student_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_group_members m2
      WHERE m2.group_id = group_id AND m2.user_id = auth.uid() AND m2.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.student_groups g
      WHERE g.id = group_id AND g.owner_id = auth.uid()
    )
  );

