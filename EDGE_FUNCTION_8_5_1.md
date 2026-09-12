# Edge Function 8.5.1

Die Datei `supabase/functions/create-kompass-user/index.ts` ersetzt die bisherige Function vollständig.

Neu:
- `ping` liefert eindeutig `apiVersion: 8.5.1` und `mutation: false`.
- `listAccounts` lädt Profile, Stufenrechte und Auth-E-Mail serverseitig mit Service-Role.
- Dadurch sind auch gesperrte Konten in KOMPASS zuverlässig sichtbar.
- Gleichnamige Konten können über ihre E-Mail unterschieden werden.
