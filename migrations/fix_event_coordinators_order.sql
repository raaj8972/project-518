-- Fix for event_coordinators table missing order_position and index issue
ALTER TABLE public.event_coordinators 
ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 1;

-- Optional: Update existing records to have a default order
UPDATE public.event_coordinators SET order_position = 1 WHERE order_position IS NULL;
