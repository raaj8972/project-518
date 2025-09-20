-- Add ended text for Coming Soon countdown to site_settings

alter table if exists public.site_settings
	add column if not exists coming_soon_ended_text text null;

comment on column public.site_settings.coming_soon_ended_text is 'Text shown after Coming Soon countdown finishes (while site remains closed)';

-- Ensure PostgREST schema cache reloads so the new column is visible immediately
do $$ begin
	perform pg_notify('pgrst', 'reload schema');
exception when others then null; end $$;

