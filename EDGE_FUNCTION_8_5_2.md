# Edge Function 8.5.2

Die vollständige, zu KOMPASS 8.5.2 passende Function liegt unter:
`supabase/functions/create-kompass-user/index.ts`

Neu:
- kompakte Kontenverwaltung im Frontend
- `deleteAccount` löscht Stufenrechte, Profil und Auth-Konto gemeinsam
- das aktuell angemeldete Admin-Konto ist gegen Löschen, Sperren und Rollenverlust geschützt
- Löschvorgänge werden serverseitig nachkontrolliert
