# Edge Function 8.4.1

Die Datei `supabase/functions/create-kompass-user/index.ts` ersetzt die bisherige Function vollständig.

Wichtig: Nach dem Einfügen **Deploy updates** ausführen. `Verify JWT with legacy secret` bleibt AUS.

8.4.1 behebt insbesondere:
- falsche Browser-Nachkontrolle bei neu angelegten, noch gesperrten Konten
- hängenbleibende E-Mail-Adressen nach fehlgeschlagenen Kontoanlagen
- robuste Verifikation von Änderungen an bestehenden Konten
- klare Meldung, falls im Browser 8.4.1 läuft, aber die Edge Function noch alt ist
