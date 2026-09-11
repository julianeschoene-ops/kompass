# KOMPASS 8.3.9

- Kontenerstellung serverseitig über `create-kompass-user`, ohne Bestätigungs-E-Mail und ohne E-Mail-Rate-Limit.
- Neue Konten werden zunächst gesperrt angelegt und erhalten Profil, Stufenrechte, Farbteam und konkrete Coachinggruppe in einem Vorgang.
- Konkrete Coachinggruppen sind unabhängig von aktuell geladenen Schülerdaten immer auswählbar: Hell-/Dunkelblau, Hell-/Dunkelrot, Hell-/Dunkelgelb, Lila, Pink, Hell-/Dunkelgrün.
- Bestehende Konten können Rolle, Freigabe, Stufenrecht, Farbteam und Coachinggruppe ändern.
- `UPDATE_8_3_8.sql` repariert fehlende Profile und die benötigten RLS-Regeln.
