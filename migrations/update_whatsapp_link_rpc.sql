-- Secure function to update WhatsApp link (requires valid session token)
DROP FUNCTION IF EXISTS update_event_whatsapp_link(integer, text);
DROP FUNCTION IF EXISTS update_event_whatsapp_link(bigint, text);
DROP FUNCTION IF EXISTS update_event_whatsapp_link(bigint, text, text);

CREATE OR REPLACE FUNCTION update_event_whatsapp_link(
  event_id_param BIGINT,
  token_param TEXT,
  new_link TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_token TEXT;
BEGIN
  -- Verify session token matches
  SELECT coordinator_session_token INTO active_token 
  FROM events 
  WHERE id = event_id_param;
  
  IF active_token IS NULL OR active_token != token_param THEN
    RAISE EXCEPTION 'Invalid session - please login again';
  END IF;

  -- Update the WhatsApp link
  UPDATE events
  SET whatsapp_group_link = new_link
  WHERE id = event_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION update_event_whatsapp_link IS 'Securely updates WhatsApp group link for an event (requires valid session token)';
