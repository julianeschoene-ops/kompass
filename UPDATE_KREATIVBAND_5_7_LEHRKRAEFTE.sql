-- KOMPASS: cross-grade access for active teachers (grades 5-7).
-- IMPORTANT: This expands access to ALL grade-state data, not just Kreativband.
-- Run manually in Supabase SQL Editor after school approval.
begin;
create or replace function public.has_kompass_grade_access(g smallint, required text default 'teacher')
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_kompass_admin()
  or (required='teacher' and exists (
    select 1 from public.kompass_profiles p
    where p.id=auth.uid() and p.active=true and p.role='teacher'
  ))
  or exists (
    select 1 from public.kompass_grade_access a
    join public.kompass_profiles p on p.id=a.user_id
    where a.user_id=auth.uid() and p.active=true and a.grade=g
      and (required='teacher' or a.access_level='leitung')
  )
$$;
commit;
