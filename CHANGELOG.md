## 8.3.9
- Kontenerstellung ruft `create-kompass-user` direkt per HTTP auf und zeigt die echte Server-Fehlermeldung inklusive HTTP-Status.
- Cache-Busting für JavaScript/CSS, damit GitHub Pages nach dem Upload sicher die neue Version lädt.

## 8.3.9
- Kontenerstellung aus dem Browser-`signUp` entfernt und auf eine geschützte Supabase Edge Function umgestellt. Dadurch entfällt das E-Mail-Rate-Limit bei der Admin-Kontoanlage.
- Coachinggruppen als feste Schulliste hinterlegt; Auswahl funktioniert auch dann, wenn die betreffende Stufe gerade nicht lokal geladen ist.
- Alle zehn konkreten Coach-Teams stehen im Auswahlfeld zur Verfügung.
- SQL-Reparatur aus 8.3.7 vollständig in `UPDATE_8_3_8.sql` übernommen.

## 8.3.7
- Fix: fehlende Profilzeilen für Supabase-Auth-Konten werden per Migration nachgezogen.
- Auth-Trigger für `kompass_profiles` wird zuverlässig neu installiert.
- Fix für Foreign-Key-Fehler beim Speichern von Stufenrechten.
- Benutzeränderungen melden Fehler jetzt sichtbar statt scheinbar nichts zu tun.
- „Konten neu laden“ erhält sichtbaren Ladestatus.
- Doppelte/bereits registrierte E-Mail wird beim Konto-Anlegen erkannt.

## 8.3.6
- Fix: Kollegiumskonten werden ohne Edge Function angelegt; die Admin-Sitzung bleibt bestehen.
- Benutzerzuordnung erweitert auf Stufe → Farbteam → konkrete Coachinggruppe.
- Bekannte Coachinggruppen der Stufe 6 werden vorausgefüllt.
- Datenbankmigration `UPDATE_8_3_6.sql` ergänzt.

# KOMPASS 8.3.2

- Start-Stammdaten 2026/27 für Stufe 5–7 ergänzt und migrationssicher gemacht.
- Stufe 6: Coachinggruppen und bekannte Coaches hinterlegt.
- Stufe 7: Farbteams + Hell/Dunkelgruppen hinterlegt; Coach-Unterzuordnung offen.
- Bestehende Datensätze werden beim ersten Start auf den neuen Jahrgangsstand migriert; Alt-SuS nur archiviert.

# Änderungsprotokoll

## 8.1b

- Verbindliche Sperrzeiten und externe Zeitblocker im Generator
- Ankommensstunde ausschließlich mit dem zugeordneten Coach des Farbteams
- Gemeinsame Teamstunde donnerstags in der 5. Stunde
- Hauptfächer stundenweise und gemeinsam für alle Farbteams geplant
- Deutsch, Mathematik und Englisch jeweils möglichst nie fachgleich parallel
- Hauptfachstunden möglichst über verschiedene Tage verteilt
- Lernatelier-Besetzung abhängig von der Zahl der parallelen Inputs
- Lernatelierpräferenzen der jeweiligen Stufe berücksichtigt
- Kreativband und Lernatelier in der 5./6. Stunde
- Werkstattplanung montags/dienstags 8./9. und donnerstags 7.–9. Stunde
- Werkstatt-Labs aus den Präferenzen der Lehrkräfte gebildet
- Zusätzliche Prüfmeldungen für Sperrzeitverletzungen und Fachparallelität
- ZIP- und Innenordner tragen dieselbe Versionsnummer

## 8.3.5
- Hotfix: leere/noch nicht geladene Schülerliste führt nicht mehr zum Absturz nach Login.

- Benutzerverwaltung: automatische Schul-E-Mail nach dem Schema vorname.nachname@jbgms-sha.de und gemeinsames Erstpasswort für neue Kollegiumskonten.
