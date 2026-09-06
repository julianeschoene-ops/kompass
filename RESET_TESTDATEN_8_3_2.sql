-- KOMPASS 8.3.2 – optionaler einmaliger Cloud-Cleanup
-- Löscht NUR bisherige KOMPASS-Testdaten. Benutzerkonten und Stufenrechte bleiben bestehen.
-- Die App lädt anschließend die geprüften Stammdaten 2026/27 neu hoch.

delete from public.kompass_audit_log;
delete from public.kompass_grade_state;
delete from public.kompass_shared_state;
