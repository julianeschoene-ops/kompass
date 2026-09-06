# KOMPASS 8.3.4

Hotfix für den Produktivstart 2026/27.

- behebt den Login-Abbruch `Store.pupils.filter` nach leerem Cloud-State
- Schülerlisten werden defensiv initialisiert
- bestehende Produktivstart-Stammdaten 5–7 bleiben unverändert
- keine Änderung an Benutzerkonten oder Supabase-Daten erforderlich


8.3.4 Startfix: data.js kann die Schüler-Startliste nun laden, bevor app.js geladen wird.
