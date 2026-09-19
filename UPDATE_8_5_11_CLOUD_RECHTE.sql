-- KOMPASS 8.5.11 – Tabellenrechte für alle berechtigten Cloud-Konten reparieren
-- Einmalig im Supabase SQL Editor ausführen.
-- Die GRANTs erlauben den Tabellenzugriff; die vorhandenen RLS-Regeln begrenzen
-- weiterhin, welche Stufen und Aktionen das jeweilige Konto tatsächlich nutzen darf.

begin;

grant usage on schema public to authenticated;

grant select, update on table public.kompass_profiles to authenticated;
grant select, insert, update, delete on table public.kompass_grade_access to authenticated;
grant select, insert, update on table public.kompass_grade_state to authenticated;
grant select, insert, update on table public.kompass_shared_state to authenticated;
grant select, insert on table public.kompass_audit_log to authenticated;

grant execute on function public.is_active_kompass_user() to authenticated;
grant execute on function public.is_kompass_admin() to authenticated;
grant execute on function public.has_kompass_grade_access(smallint, text) to authenticated;

alter table public.kompass_profiles enable row level security;
alter table public.kompass_grade_access enable row level security;
alter table public.kompass_grade_state enable row level security;
alter table public.kompass_shared_state enable row level security;
alter table public.kompass_audit_log enable row level security;

drop policy if exists "grade state read" on public.kompass_grade_state;
drop policy if exists "grade state insert" on public.kompass_grade_state;
drop policy if exists "grade state update" on public.kompass_grade_state;

create policy "grade state read" on public.kompass_grade_state for select to authenticated
using (public.has_kompass_grade_access(grade,'teacher'));

create policy "grade state insert" on public.kompass_grade_state for insert to authenticated
with check (public.has_kompass_grade_access(grade,'leitung'));

create policy "grade state update" on public.kompass_grade_state for update to authenticated
using (public.has_kompass_grade_access(grade,'teacher'))
with check (public.has_kompass_grade_access(grade,'teacher'));

commit;
