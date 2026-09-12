# Edge Function 8.5.0

Die Datei `supabase/functions/create-kompass-user/index.ts` ersetzt die bisherige Function vollständig.

Wesentliche Änderungen:
- `ping` prüft die API-Version **vor** jeder schreibenden Aktion.
- Ein bereits vorhandenes, aber gesperrtes/unvollständiges Konto kann beim erneuten Anlegen repariert werden.
- Bereits aktive Konten werden niemals durch „Konto anlegen“ überschrieben.
- Änderungen an bestehenden Konten werden als kompletter Datensatz in einer Aktion gespeichert und danach serverseitig geprüft.
- Bei Fehlern wird ein bestehendes Konto auf den vorherigen Stand zurückgesetzt.
- Neu angelegte Auth-Konten werden bei Folgefehlern automatisch wieder entfernt.
