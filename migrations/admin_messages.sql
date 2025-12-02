-- Admin Messages Table for Real-Time Messaging
-- Allows owners to send instant messages to admins

CREATE TABLE IF NOT EXISTS admin_messages (
  id BIGSERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages sent to them or from them
CREATE POLICY "Users can view their messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Only owners can send messages
CREATE POLICY "Owners can send messages"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND (role = 'owner' OR is_primary = true)
    )
  );

-- Users can mark their own messages as read
CREATE POLICY "Users can update own messages"
  ON admin_messages FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_admin_messages_to_user ON admin_messages(to_user_id, created_at DESC);
CREATE INDEX idx_admin_messages_unread ON admin_messages(to_user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_admin_messages_from_user ON admin_messages(from_user_id, created_at DESC);
