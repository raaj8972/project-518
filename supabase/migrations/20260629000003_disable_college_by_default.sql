-- Disable college/institution visibility by default in site settings
UPDATE public.site_settings 
SET registration_institution_visible = false;
