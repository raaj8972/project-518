-- Add Google Auth and Profile Visibility settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS student_google_auth_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_institution_visible boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.site_settings.student_google_auth_enabled IS 'Toggle for allowing students to sign in with Google';
COMMENT ON COLUMN public.site_settings.registration_institution_visible IS 'Toggle for showing the College/Institution field in student forms';

-- Refine handle_new_user function to be more robust with Google metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      ''
    ), 
    COALESCE(
      new.raw_user_meta_data->>'avatar_url', 
      new.raw_user_meta_data->>'picture', 
      NULL
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
