-- KOMPASS: Nur lesende Datenschutz-Pruefung, keine Aenderungen.
-- Vor Aktivierung des gemeinsamen LA-Accounts in Supabase ausfuehren.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in (
    'kompass_grade_state',
    'kompass_shared_state',
    'kompass_lernatelier_state'
  )
order by tablename, cmd, policyname;
