# KOMPASS 8.0

## Neu im Stundenplanmodul

- vollständiges Deputatskonto je Lehrkraft
- mehrere Ermäßigungen mit automatischer Summierung
- automatische Berechnung: volles Deputat − Ermäßigungen − externe Einsätze = durch KOMPASS zu verplanen
- externe Einsätze in Stufe 8–10, Oberstufe oder sonstigen Bereichen
- bekannte Zeiten externer Einsätze werden als Sperrzeiten berücksichtigt
- Einsatzbereiche Stufe 5–10 und Oberstufe frei markierbar
- genau eine reguläre Coach-Stufe und ein Coach-Farbteam
- Coach-Zuordnung bleibt unabhängig von den Team-/Fachzuordnungen
- Unterricht in mehreren Teams weiterhin möglich
- Lernatelier-, Kreativband- und Werkstattprofile bleiben erhalten
- Generator berücksichtigt das verbleibende KOMPASS-Deputat

Die Anwendung läuft offline und speichert weiterhin im LocalStorage des Browsers.

## KOMPASS 8.1b – Stundenplangenerator 3.0

- Deputatskonto mit Ermäßigungen, externen Einsätzen sowie Coaching- und Teamstunden
- Einsatzbereiche Stufe 5–10 und Oberstufe
- dynamische Coach-Stufe und Coach-Team-Auswahl; Unterteams Pink/Lila bei Team Violett
- Lernatelier-Eignung und Präferenzen getrennt für Stufe 5, 6 und 7
- Kreativband- und Werkstattprofil mit Lab-Präferenzen
- verbindliche ganze und stundenweise Sperrzeiten
- Wunsch nach einem oder zwei freien Tagen als Optimierungsziel

## KOMPASS 8.2: Login, gemeinsame Speicherung und Kalender

Beim ersten Start ohne Cloud-Verbindung legt KOMPASS einen lokalen Admin an. Dieser Modus ist sofort testbar, speichert aber nur in diesem Browser.

Für den Einsatz mit mehreren Kolleg:innen/Geräten wird Supabase verwendet:
1. Ein Supabase-Projekt anlegen.
2. `SUPABASE_SETUP.sql` einmal im SQL Editor ausführen.
3. Auf der KOMPASS-Login-Seite unter „Gemeinsame Speicherung einrichten“ Project URL und den öffentlichen anon/publishable key eintragen. Niemals den Service-Role-Key in KOMPASS eintragen.
4. Das erste registrierte Konto wird automatisch Admin. Weitere Kolleg:innen registrieren sich mit ihrer Schul-E-Mail und werden anschließend unter „Verwaltung → Benutzer“ freigegeben und einer Rolle zugeordnet.

KOMPASS speichert im Cloud-Modus den gemeinsamen Datenstand in `kompass_state`. Änderungen werden zusätzlich im internen Änderungsprotokoll erfasst. Der Kalender ist über die Navigation erreichbar.
