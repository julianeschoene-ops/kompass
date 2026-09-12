-- KOMPASS 8.4.0 – Rechte für serverseitige Kontenverwaltung
-- Kann gefahrlos erneut ausgeführt werden.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.kompass_profiles to service_role;
grant select, insert, update, delete on table public.kompass_grade_access to service_role;
