# English Practice: QR + PIN und Kompetenzzuordnung

## Zugangskarten für alle Kinder

In **Kernfächer → Englisch** gibt es direkt über der Kompetenz zwei Druckoptionen:
**QR + PIN · ganzer Jahrgang** und, bei ausgewähltem Team, **QR + PIN · Team**.
Ein Klick erzeugt eine gemeinsame Druckliste für die gesamte Auswahl.
Bereits vorhandene Zugänge werden wiederverwendet, nicht bei jedem Drucken geändert.
Die Karten sind mobil lesbar und zum Drucken als A4-Bogen eingerichtet.

Das Kind scannt den persönlichen QR-Code, gibt seine sechsstellige PIN ein
und bestätigt den angezeigten Vornamen. Danach werden abgeschlossene Tests
unter **Test yourself** automatisch übertragen. Der QR-Code allein genügt
weder zur Namensabfrage noch zum Einsenden eines Ergebnisses.

Im Schülerprofil gibt es nur ein kleines eingeklapptes Menü **English Practice ·
Zugang**. Darüber lassen sich einzelne Karten erneut drucken, Zugänge bewusst
ersetzen oder sperren. Für QR-Codes aus der ersten Version muss einmal eine neue
Karte mit PIN erzeugt werden. Vorhandene Testergebnisse bleiben erhalten.

## Ergebnisse in der normalen Kompetenz

Jede vorhandene Vokabelliste ist serverseitig einer vorhandenen Englischkompetenz
zugeordnet. Die Zuordnung folgt dem Unterrichtsinhalt, nicht dem Jahrgang des Kindes:
Orange Line 1 nutzt aktuell den vorhandenen Kompetenzkatalog aus Stufe 5 auch für
Lernende der Stufe 6.

| Vokabellisten | Vorhandene Kompetenz |
| --- | --- |
| Unit 1, Listen 1–5 | Wörter aus Unterricht und Schule (`eng5_1`) |
| Unit 2, Listen 5–9 | Wörter zu Familie und Zuhause (`eng5_2`) |
| Unit 3, Listen 10–14 | Wörter zu Freizeit und Alltag (`eng5_4`) |
| Unit 4, Listen 15–19 | Orts- und Zeitangaben (`eng5_5`) |

Ein abgeschlossener Test schreibt Punkte, Prozentwert, Datum, Thema, Ampelstatus
und den Versuch direkt in den regulären Kompetenzdatensatz beim richtigen Kind.
Die Versuche sind als kleine aufklappbare Zeile direkt bei der Kompetenz sichtbar.
Es gibt keinen eigenen großen Ergebnisbereich im Schülerprofil mehr.

Solange keine Lehrkraftbewertung vorliegt, zeigt die Kompetenz den aktuellen
Selbsttest mit der bestehenden Prozent-Ampel der Kompetenz. Bereits vorhandene
Lehrkraftbewertungen werden nicht überschrieben; neue Selbsttests ergänzen den
Verlauf als Nachweise. Ein Niveau G/M/E wird nicht aus Vokabelpunkten abgeleitet.

Admin oder Stufenleitung können unter der ausgewählten Kompetenz die kleine
Zeile **English Practice · zugeordnete Vokabeltests** öffnen und die Zuordnung
für künftige Versuche ändern. Die bisherigen Versuche bleiben dort, wo sie zum
Zeitpunkt des Tests zugeordnet waren. Ergebnisse werden über die bestehende
KOMPASS-Synchronisierung geladen, im Normalfall nach höchstens 15 Sekunden.

## Technischer Aufbau und Prüfungen

- Migrationen nacheinander: `migrations/english_practice.sql`, danach
  `migrations/english_practice_competencies_pin.sql`.
- `kompass_english_links` ist vollständig vor direkten Tabellenzugriffen geschützt.
  Die Druckdaten (QR-Token und PIN) sind nur über berechtigte Verwaltungsfunktionen
  für Admin/Stufenleitung abrufbar. Hashes prüfen die Anmeldung. Nach zehn falschen
  PIN-Versuchen wird der Zugang für fünf Minuten gebremst.
- Die alten PIN-freien Endpunkte sind für Kinder und Lehrkräfte deaktiviert.
- `kompass_english_tasks` hält die explizite Test-Kompetenz-Zuordnung.
- Das Einsenden und das Schreiben des Kompetenzdatensatzes erfolgen in einer
  Datenbanktransaktion. Derselbe Versuch wird auch bei Wiederholung nur einmal gespeichert.
- KOMPASS erhält den Versuch in `kompass_grade_state.payload.records` einschließlich
  Verlauf und `practiceResults`. Diese Kompetenznachweise sind dadurch im normalen
  KOMPASS-JSON-Export enthalten. Die zusätzlichen Zugangstabellen und die separate
  Rohdatentabelle erfordern weiterhin eine Datenbanksicherung.
- Die PIN bleibt im Übungsbrowser nur im Arbeitsspeicher. Sie wird weder im QR-Code
  noch im URL-Verlauf oder in localStorage/sessionStorage gespeichert. Nach Neuladen
  ist die PIN erneut erforderlich. Beim Beenden und nach 30 Minuten Inaktivität wird
  die persönliche Zuordnung gelöscht. Ausstehende Übertragungen bleiben im aktuellen
  Browser-Tab bis zum Abmelden/Timeout für einen erneuten Versuch verfügbar.
- QR-Codes entstehen lokal mit qrcode-generator 1.4.4, MIT, Kazuhiko Arase.
  Kein externer QR-Dienst erhält Daten der Kinder oder Zugangscodes.

Prüfungen: `node --test tests/english-practice.test.cjs` sowie im Schedule-Repository
`node --test tests/kompass-link.test.cjs`. Ein vollständig zurückgerollter Datenbanktest
prüft Sammelerstellung, unverändertes Nachdrucken, PIN-Prüfung, Sperre nach Fehlversuchen,
Deaktivierung der alten Endpunkte, Kompetenzzuordnung unabhängig vom Schülerjahrgang,
Duplikatschutz, Zuordnung zum richtigen Kind und den Erhalt von Lehrkraftbewertungen.

## Testzeit und Geräteuhr

Tests können täglich von **08:00 bis vor 12:30 Uhr (Europe/Berlin)** gestartet
und neu eingereicht werden. Der Server prüft seine eigene Uhr; Datum, Uhrzeit
und Zeitzone des iPads ändern diese Entscheidung nicht. Sommer- und Winterzeit
werden automatisch berücksichtigt. Übungsmodi sind jederzeit verfügbar.
Die aktuelle Freigabe wird vor dem Start vom Server abgefragt. Neue Ergebnisse
außerhalb des Zeitfensters und liegengebliebene Versuche von vorherigen Tagen
werden abgewiesen. Eine verlorene Bestätigung für ein bereits gespeichertes
Ergebnis kann weiterhin ohne doppelten Eintrag nachgeholt werden.
Migration: `migrations/english_practice_test_window.sql`.
