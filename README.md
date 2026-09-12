# KOMPASS 8.5.2

## Kontenliste zuverlässig + E-Mail sichtbar

Die Kontenverwaltung lädt Profile, Stufenrechte und die zugehörige Supabase-Auth-E-Mail jetzt gemeinsam über die geschützte Edge Function. Dadurch werden auch gesperrte Konten eindeutig angezeigt; mehrere Konten mit demselben Anzeigenamen sind anhand der E-Mail unterscheidbar.

## Wichtig: Kontenverwaltung neu aufgebaut

8.5.2 behebt den Versionsfehler aus 8.4.1: Dort wurde die Version der Edge Function erst **nach** einer schreibenden Aktion geprüft. Dadurch konnte ein Konto bereits angelegt worden sein, obwohl der Browser anschließend meldete, die Function sei veraltet.

In 8.5.2 erfolgt die Versionsprüfung immer zuerst über eine nicht verändernde `ping`-Anfrage. Ein bereits liegen gebliebenes gesperrtes Konto wird beim erneuten Anlegen repariert und mit dem eingegebenen Startpasswort sowie den ausgewählten Rechten vervollständigt. Aktive Konten werden nicht überschrieben.

Bestehende Konten werden nicht mehr Feld für Feld per `onchange` gespeichert. Stattdessen gibt es pro Konto einen Button **„Änderungen speichern“**. Rolle, Status, Stufenrechte, Farbteam und Coachinggruppe werden in einer serverseitigen Aktion gespeichert und geprüft.

Einmalig muss die Edge Function durch `supabase/functions/create-kompass-user/index.ts` aus diesem Paket ersetzt und deployed werden.

---

# KOMPASS 8.4.1

## Wichtig für dieses Update
Die mitgelieferte Edge Function `supabase/functions/create-kompass-user/index.ts` muss einmal in Supabase eingesetzt und deployed werden. Danach erkennt KOMPASS automatisch, ob wirklich die 8.4.1-Funktion aktiv ist.

Die Kontoanlage wird jetzt ausschließlich serverseitig bestätigt. Scheitert nach dem Erzeugen des Auth-Kontos ein späterer Schritt, werden Stufenrechte, Profil und Auth-Konto in dieser Reihenfolge wieder entfernt, damit die E-Mail-Adresse nicht hängen bleibt. Änderungen an bestehenden Konten werden ebenfalls serverseitig gespeichert und direkt verifiziert.

---

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

### Kollegiumskonten
Für vorbereitete Kolleg:innen wird die Schul-E-Mail automatisch aus dem Namen erzeugt. Ein gemeinsames Erstpasswort kann in der Benutzerverwaltung einmal pro Sitzung gesetzt werden; es wird nicht dauerhaft gespeichert.


## Update 8.4.0 (vorherige Version) – Kontenverwaltung
Für 8.4.0 muss die Supabase Edge Function `create-kompass-user` durch die mitgelieferte Datei `supabase/functions/create-kompass-user/index.ts` ersetzt und neu deployed werden. `Verify JWT with legacy secret` bleibt AUS. `UPDATE_8_4_0.sql` ist idempotent und kann einmal im SQL Editor ausgeführt werden.
