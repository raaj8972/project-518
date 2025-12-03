-- Clean up stale admin activity entries
-- This removes entries older than 5 minutes to clear the clutter from the previous bug
-- Active sessions will simply upsert and reappear instantly

DELETE FROM admin_activity 
WHERE last_activity < NOW() - INTERVAL '5 minutes';

-- Optional: If you want to clear ALL history to start fresh
-- DELETE FROM admin_activity;
