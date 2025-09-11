-- Remove occurrences of the word "cyberpunk" from user-visible seeded content
-- This is case-insensitive and removes optional trailing spaces

-- Core team member descriptions (text)
update public.core_team_members
set description = regexp_replace(description, '(?i)cyberpunk[[:space:]]*', '', 'g')
where description ~* 'cyberpunk';

-- Core team member achievements can be either jsonb[] or text[] depending on schema.
-- Detect the column type at runtime and apply the correct transformation.
do $$
declare
  col_type text;
begin
  select atttypid::regtype::text into col_type
  from pg_attribute
  where attrelid = 'public.core_team_members'::regclass
    and attname = 'achievements'
    and not attisdropped;

  if col_type = 'jsonb' then
    -- JSONB array of text values
    update public.core_team_members
    set achievements = (
      select coalesce(
               jsonb_agg(regexp_replace(elem, '(?i)cyberpunk[[:space:]]*', '', 'g')),
               '[]'::jsonb
             )
      from jsonb_array_elements_text(coalesce(achievements, '[]'::jsonb)) as t(elem)
    )
    where achievements::text ~* 'cyberpunk';

  elsif col_type = 'text[]' then
    -- Text array
    update public.core_team_members
    set achievements = (
      select array_agg(regexp_replace(x, '(?i)cyberpunk[[:space:]]*', '', 'g'))
      from unnest(achievements) as x
    )
    where exists (
      select 1 from unnest(achievements) as x where x ~* 'cyberpunk'
    );
  end if;
end $$;
