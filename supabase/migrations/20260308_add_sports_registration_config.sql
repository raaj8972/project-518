-- Add sports_registration_config to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS sports_registration_config jsonb DEFAULT '{
  "registration_open": true,
  "participant_types": ["Student", "Faculty"],
  "form_fields": [
    {"name": "name", "label": "Full Name", "required": true, "type": "text"},
    {"name": "phone", "label": "Phone Number", "required": true, "type": "tel"},
    {"name": "email", "label": "Email", "required": false, "type": "email"},
    {"name": "year", "label": "Year / Class", "required": true, "type": "text"},
    {"name": "position", "label": "Role / Position", "required": true, "type": "text"},
    {"name": "experience", "label": "Past Experience / Achievements", "required": true, "type": "textarea"}
  ]
}'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
