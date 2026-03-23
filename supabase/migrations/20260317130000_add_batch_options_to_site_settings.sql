-- Add batch_options to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS batch_options text[] DEFAULT '{}';

-- Update the column with some initial values if needed
UPDATE site_settings SET batch_options = '{"Batch 2021", "Batch 2022", "Batch 2023", "Batch 2024", "Batch 2025"}'::text[] WHERE id = 1 AND (batch_options IS NULL OR batch_options = '{}');
