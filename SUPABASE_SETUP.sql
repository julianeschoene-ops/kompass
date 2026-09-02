-- KOMPASS 8.2 – einmalig im Supabase SQL Editor ausführen.
-- Danach in KOMPASS auf der Login-Seite Project URL + anon/public key eintragen.

create table if not exists public.kompass_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'teacher' check (role in ('teacher','leitung','admin')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.kompass_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.kompass_profiles enable row level security;
alter table public.kompass_state enable row level security;

create or replace function public.current_kompass_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.kompass_profiles where id=auth.uid() and active=true
$$;

create or replace function public.handle_new_kompass_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare is_first boolean;
begin
  select not exists(select 1 from public.kompass_profiles) into is_first;
  insert into public.kompass_profiles(id,display_name,role,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email,''),case when is_first then 'admin' else 'teacher' end,is_first);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_kompass on auth.users;
create trigger on_auth_user_created_kompass after insert on auth.users
for each row execute procedure public.handle_new_kompass_user();

-- Jede angemeldete Person darf ihr eigenes Profil lesen.
create policy "profile self read" on public.kompass_profiles for select to authenticated
using (id=auth.uid() or public.current_kompass_role()='admin');

-- Nur Admins dürfen Profile/Rollen/Freigaben ändern.
create policy "profile admin update" on public.kompass_profiles for update to authenticated
using (public.current_kompass_role()='admin') with check (public.current_kompass_role()='admin');

-- Aktive Konten lesen den gemeinsamen KOMPASS-Datenstand.
create policy "state active read" on public.kompass_state for select to authenticated
using (public.current_kompass_role() in ('teacher','leitung','admin'));

-- Aktive Konten dürfen speichern. Fachliche Bearbeitungsrechte steuert zusätzlich die App-Rolle.
create policy "state active insert" on public.kompass_state for insert to authenticated
with check (public.current_kompass_role() in ('teacher','leitung','admin'));
create policy "state active update" on public.kompass_state for update to authenticated
using (public.current_kompass_role() in ('teacher','leitung','admin'))
with check (public.current_kompass_role() in ('teacher','leitung','admin'));
