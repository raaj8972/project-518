-- Alter profiles table to add unique username
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create group invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id text NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_username text NOT NULL,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER TABLE public.group_invitations REPLICA IDENTITY FULL;

-- Check publication membership
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invitations;
  END IF;
END $$;

-- Create RLS Policies
CREATE POLICY "Users can view their own sent/received invitations"
ON public.group_invitations
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert group invitations"
ON public.group_invitations
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations they belong to"
ON public.group_invitations
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Senders can delete their invitations"
ON public.group_invitations
FOR DELETE
USING (auth.uid() = sender_id);
