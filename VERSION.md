# KOMPASS 8.3.5

- Kollegiumsliste 5–7 in der Benutzerverwaltung: bekannte Lehrkräfte erscheinen mit „kein Login“ und können vorausgefüllt angelegt werden.
- Bekannte Stufen-, Stufenleitungs- und Coach-Team-Zuordnungen werden beim Anlegen vorausgefüllt und bleiben änderbar.
- Besuchszählung im Kreativband und in zählbaren besonderen Angeboten ist nicht mehr bei 39 gedeckelt. 39 Besuche = 100 %, weitere Besuche werden weitergezählt.
- Die große Anzeige „39 Maximum“ wurde entfernt.

Hotfix für den Produktivstart 2026/27.

- behebt den Login-Abbruch `Store.pupils.filter` nach leerem Cloud-State
- Schülerlisten werden defensiv initialisiert
- bestehende Produktivstart-Stammdaten 5–7 bleiben unverändert
- keine Änderung an Benutzerkonten oder Supabase-Daten erforderlich


8.3.5 Startfix: data.js kann die Schüler-Startliste nun laden, bevor app.js geladen wird.
