-- KOMPASS 8.2.1 – sichere stufenbezogene Cloud-Struktur
-- Einmalig im Supabase SQL Editor ausführen, BEVOR KOMPASS mit Supabase verbunden wird.
-- Noch keine echten Schülerdaten hochladen, bevor schulischer Datenschutz / AVV geklärt ist.

create table if not exists public.kompass_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'teacher' check (role in ('teacher','admin')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.kompass_grade_access (
  user_id uuid not null references public.kompass_profiles(id) on delete cascade,
  grade smallint not null check (grade in (5,6,7)),
  access_level text not null check (access_level in ('teacher','leitung')),
  created_at timestamptz not null default now(),
  primary key (user_id, grade)
);

-- Schülerbezogene Daten werden getrennt pro Stufe gespeichert.
create table if not exists public.kompass_grade_state (
  grade smallint primary key check (grade in (5,6,7)),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Nur schulweit gemeinsame, nicht schülerbezogene Konfiguration.
create table if not exists public.kompass_shared_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.kompass_audit_log (
  id text primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null default '',
  action text not null default 'Änderung gespeichert',
  details jsonb not null default '{}'::jsonb,
  sections text[] not null default '{}'
);

alter table public.kompass_profiles enable row level security;
alter table public.kompass_grade_access enable row level security;
alter table public.kompass_grade_state enable row level security;
alter table public.kompass_shared_state enable row level security;
alter table public.kompass_audit_log enable row level security;

create or replace function public.is_active_kompass_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.kompass_profiles where id=auth.uid() and active=true)
$$;

create or replace function public.is_kompass_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.kompass_profiles where id=auth.uid() and active=true and role='admin')
$$;

create or replace function public.has_kompass_grade_access(g smallint, required text default 'teacher')
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_kompass_admin() or exists(
    select 1 from public.kompass_grade_access a
    join public.kompass_profiles p on p.id=a.user_id
    where a.user_id=auth.uid() and p.active=true and a.grade=g
      and (required='teacher' or a.access_level='leitung')
  )
$$;

-- Erster registrierter Benutzer wird Admin und aktiv. Danach sind neue Konten zunächst gesperrt.
create or replace function public.handle_new_kompass_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare is_first boolean;
begin
  perform pg_advisory_xact_lock(82401);
  select not exists(select 1 from public.kompass_profiles) into is_first;
  insert into public.kompass_profiles(id,display_name,role,active)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name',new.email,''),
    case when is_first then 'admin' else 'teacher' end,
    is_first
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_kompass on auth.users;
create trigger on_auth_user_created_kompass after insert on auth.users
for each row execute procedure public.handle_new_kompass_user();

-- Profile: eigenes Profil lesen; Admins sehen und verwalten alle Konten.
drop policy if exists "profile self read" on public.kompass_profiles;
drop policy if exists "profile admin update" on public.kompass_profiles;
create policy "profile read" on public.kompass_profiles for select to authenticated
using (id=auth.uid() or public.is_kompass_admin());
create policy "profile admin update" on public.kompass_profiles for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());

-- Stufenzuordnungen: Benutzer sehen die eigenen; Admins verwalten alle.
create policy "grade access read" on public.kompass_grade_access for select to authenticated
using (user_id=auth.uid() or public.is_kompass_admin());
create policy "grade access admin insert" on public.kompass_grade_access for insert to authenticated
with check (public.is_kompass_admin());
create policy "grade access admin update" on public.kompass_grade_access for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());
create policy "grade access admin delete" on public.kompass_grade_access for delete to authenticated
using (public.is_kompass_admin());

-- Schülerdaten: Zugriff wird von der Datenbank selbst pro Stufe erzwungen.
create policy "grade state read" on public.kompass_grade_state for select to authenticated
using (public.has_kompass_grade_access(grade,'teacher'));
create policy "grade state insert" on public.kompass_grade_state for insert to authenticated
with check (public.has_kompass_grade_access(grade,'leitung'));
create policy "grade state update" on public.kompass_grade_state for update to authenticated
using (public.has_kompass_grade_access(grade,'teacher'))
with check (public.has_kompass_grade_access(grade,'teacher'));

-- Schulweite Konfiguration: aktive Konten lesen, nur Admins schreiben.
create policy "shared state read" on public.kompass_shared_state for select to authenticated
using (public.is_active_kompass_user());
create policy "shared state insert" on public.kompass_shared_state for insert to authenticated
with check (public.is_kompass_admin());
create policy "shared state update" on public.kompass_shared_state for update to authenticated
using (public.is_kompass_admin()) with check (public.is_kompass_admin());

-- Logs: aktive Konten dürfen eigene Änderungen protokollieren; nur Admins lesen die Gesamtliste.
create policy "audit insert" on public.kompass_audit_log for insert to authenticated
with check (public.is_active_kompass_user() and (user_id is null or user_id=auth.uid()));
create policy "audit admin read" on public.kompass_audit_log for select to authenticated
using (public.is_kompass_admin());


-- Feldschutz innerhalb einer Stufe:
-- Lehrkräfte/Lerncoaches dürfen fachliche Schülerdaten schreiben, aber nicht die Schüler-Stammliste verändern.
-- Stufenleitungen und Admins dürfen innerhalb ihrer Stufen auch Namen, Klasse, Team, Coach usw. ändern.
create or replace function public.guard_kompass_grade_state()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_kompass_admin() or public.has_kompass_grade_access(new.grade,'leitung') then
    return new;
  end if;
  if tg_op='INSERT' then
    raise exception 'Nur Stufenleitung oder Admin darf eine Stufe initial anlegen.';
  end if;
  if coalesce(new.payload->'pupils','[]'::jsonb) is distinct from coalesce(old.payload->'pupils','[]'::jsonb) then
    raise exception 'Schüler-Stammdaten dürfen nur durch Stufenleitung oder Admin geändert werden.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_kompass_grade_state_trigger on public.kompass_grade_state;
create trigger guard_kompass_grade_state_trigger
before insert or update on public.kompass_grade_state
for each row execute procedure public.guard_kompass_grade_state();
