-- Add unique constraint to event_categories.name
ALTER TABLE event_categories ADD CONSTRAINT event_categories_name_key UNIQUE (name);
