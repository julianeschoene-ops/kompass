-- KOMPASS: Separate LA accounts from general school data at the database layer.
-- Review existing policy names in Supabase before executing.
begin;
-- Restrict the grade-state INSERT policy to teachers/admins only.
drop policy if exists "grade state insert" on public.kompass_grade_state;
drop policy if exists "grade_state_insert" on public.kompass_grade_state;
-- Any other legacy permissive INSERT policies must also be removed.
-- Do not activate shared LA accounts before verifying all policies.
-- Restrict the shared-state read policy for LA accounts.
-- Inspect pg_policies before replacing unknown policy names.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname='public'
and tablename in ('kompass_grade_state','kompass_shared_state','kompass_lernatelier_state')
order by tablename,cmd,policyname;
commit;
