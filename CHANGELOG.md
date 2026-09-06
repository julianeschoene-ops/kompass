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
