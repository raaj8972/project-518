-- Fix RLS for security_settings to allow upsert (needs INSERT permission)
CREATE POLICY "Admins can insert security settings" 
ON public.security_settings FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (role = 'owner' OR role = 'admin')
  )
);
