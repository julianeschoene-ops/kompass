-- KOMPASS 8.2.3 – Coach-Team-Zuordnung + stabile Benutzerverwaltung
-- Im Supabase SQL Editor einmal ausführen.

alter table public.kompass_profiles
  add column if not exists coach_teams jsonb not null default '{}'::jsonb;

grant select, update on table public.kompass_profiles to authenticated;
grant select, insert, update, delete on table public.kompass_grade_access to authenticated;
grant select, insert, update on table public.kompass_grade_state to authenticated;
grant select, insert, update on table public.kompass_shared_state to authenticated;
grant select, insert on table public.kompass_audit_log to authenticated;

create or replace function public.is_active_kompass_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.kompass_profiles where id=auth.uid() and active=true)
$$;

create or replace function public.is_kompass_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.kompass_profiles where id=auth.uid() and active=true and role='admin')
$$;

revoke all on function public.is_active_kompass_user() from public;
revoke all on function public.is_kompass_admin() from public;
grant execute on function public.is_active_kompass_user() to authenticated;
grant execute on function public.is_kompass_admin() to authenticated;

drop policy if exists "profile self read" on public.kompass_profiles;
drop policy if exists "profile read" on public.kompass_profiles;
create policy "profile read" on public.kompass_profiles for select to authenticated
using (id=auth.uid() or public.is_kompass_admin());

drop policy if exists "profile admin update" on public.kompass_profiles;
create policy "profile admin update" on public.kompass_profiles for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());

drop policy if exists "grade access read" on public.kompass_grade_access;
create policy "grade access read" on public.kompass_grade_access for select to authenticated
using (user_id=auth.uid() or public.is_kompass_admin());

drop policy if exists "grade access admin insert" on public.kompass_grade_access;
create policy "grade access admin insert" on public.kompass_grade_access for insert to authenticated
with check (public.is_kompass_admin());

drop policy if exists "grade access admin update" on public.kompass_grade_access;
create policy "grade access admin update" on public.kompass_grade_access for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());

drop policy if exists "grade access admin delete" on public.kompass_grade_access;
create policy "grade access admin delete" on public.kompass_grade_access for delete to authenticated
using (public.is_kompass_admin());
