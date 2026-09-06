-- KOMPASS 8.3.7 – Reparatur Kollegiumskonten / Profilzuordnung
-- Einmal vollständig im Supabase SQL Editor ausführen.

-- 1) benötigte Profilfelder sicherstellen
alter table public.kompass_profiles
  add column if not exists coach_teams jsonb not null default '{}'::jsonb,
  add column if not exists coaching_groups jsonb not null default '{}'::jsonb;

-- 2) Trigger für jedes neu angelegte Supabase-Auth-Konto neu und eindeutig installieren
create or replace function public.handle_new_kompass_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare is_first boolean;
begin
  perform pg_advisory_xact_lock(82401);
  select not exists(select 1 from public.kompass_profiles) into is_first;

  insert into public.kompass_profiles(id,display_name,role,active,coach_teams,coaching_groups)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name',new.email,''),
    case when is_first then 'admin' else 'teacher' end,
    is_first,
    '{}'::jsonb,
    '{}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_kompass on auth.users;
create trigger on_auth_user_created_kompass
after insert on auth.users
for each row execute procedure public.handle_new_kompass_user();

-- 3) Bereits vorhandene Auth-Konten reparieren, denen wegen des bisherigen Fehlers
--    noch kein Eintrag in kompass_profiles zugeordnet ist.
insert into public.kompass_profiles(id,display_name,role,active,coach_teams,coaching_groups)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name',u.email,''),
  'teacher',
  false,
  '{}'::jsonb,
  '{}'::jsonb
from auth.users u
left join public.kompass_profiles p on p.id=u.id
where p.id is null
on conflict (id) do nothing;

-- 4) RLS-Regeln für die Admin-Verwaltung sicher neu setzen
alter table public.kompass_profiles enable row level security;
alter table public.kompass_grade_access enable row level security;

drop policy if exists "profile read" on public.kompass_profiles;
drop policy if exists "profile self read" on public.kompass_profiles;
drop policy if exists "profile admin update" on public.kompass_profiles;
create policy "profile read" on public.kompass_profiles for select to authenticated
using (id=auth.uid() or public.is_kompass_admin());
create policy "profile admin update" on public.kompass_profiles for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());

drop policy if exists "grade access read" on public.kompass_grade_access;
drop policy if exists "grade access admin insert" on public.kompass_grade_access;
drop policy if exists "grade access admin update" on public.kompass_grade_access;
drop policy if exists "grade access admin delete" on public.kompass_grade_access;
create policy "grade access read" on public.kompass_grade_access for select to authenticated
using (user_id=auth.uid() or public.is_kompass_admin());
create policy "grade access admin insert" on public.kompass_grade_access for insert to authenticated
with check (public.is_kompass_admin());
create policy "grade access admin update" on public.kompass_grade_access for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());
create policy "grade access admin delete" on public.kompass_grade_access for delete to authenticated
using (public.is_kompass_admin());
