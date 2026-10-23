# English Practice: QR + PIN und Kompetenzzuordnung

## Zugangskarten für alle Kinder

In **Kernfächer → Englisch** gibt es direkt über der Kompetenz zwei Druckoptionen:
**QR + PIN · ganzer Jahrgang** und, bei ausgewähltem Team, **QR + PIN · Team**.
Ein Klick erzeugt eine gemeinsame Druckliste für die gesamte Auswahl.
Bereits vorhandene Zugänge werden wiederverwendet, nicht bei jedem Drucken geändert.
Die Karten sind mobil lesbar und zum Drucken als A4-Bogen eingerichtet.

Das Kind scannt den persönlichen QR-Code, gibt seine sechsstellige PIN ein
und bestätigt den angezeigten Vornamen. Danach werden abgeschlossene Tests
im getrennten **Testbereich · Englisch** automatisch übertragen. **Selbstcheck · Übung** ist jederzeit verfügbar und erzeugt keinen Kompetenznachweis. Der QR-Code allein genügt
weder zur Namensabfrage noch zum Einsenden eines Ergebnisses.

Im Schülerprofil gibt es nur ein kleines eingeklapptes Menü **English Practice ·
Zugang**. Darüber lassen sich einzelne Karten erneut drucken, Zugänge bewusst
ersetzen oder sperren. Für QR-Codes aus der ersten Version muss einmal eine neue
Karte mit PIN erzeugt werden. Vorhandene Testergebnisse bleiben erhalten.

## Ergebnisse in der normalen Kompetenz

Nur ausdrücklich auf der Lernwegeliste markierte und digital verfügbare Tests dürfen
Kompetenznachweise erzeugen. Normale Vokabellisten und Selbstchecks sind Übungen.
Die serverseitige Freigabe (`is_assessment`) und die vollständige Aufgabenanzahl
werden zusätzlich zur PIN und Serverzeit geprüft.

| Digitaler LWL-Test | Bereich | Vorhandene Kompetenz |
| --- | --- | --- |
| Unit 4, Vocabulary Test 1 | Station 1 / 2a, Liste 16, shop – now, alle 23 Wörter | Orts- und Zeitangaben (`eng5_5`) |
| Unit 4, Vocabulary Test 2 | Station 2 / 3a, Liste 17, way – by (bike), alle 50 Wörter | Orts- und Zeitangaben (`eng5_5`) |

Quelle: `LWL4_Year_5_Orange_Line_SuS.pdf`. Die digitalen Abfragen nutzen die
bestehenden Vokabeldaten, Deutsch → Englisch, ohne Lösungen während des Tests.
Sie sind keine Kopie unbekannter IServ-Testfragen. Teststationen ohne digitale Originalaufgaben bzw. bestätigte digitale Fassung
erscheinen nicht im Testbereich. Es gibt dort ausschließlich freigegebene Tests.
QR-Selbstchecks und „Time to practice“ zählen nicht als bewertete LWL-Tests.

Orange Line 1 nutzt den vorhandenen Kompetenzkatalog aus Stufe 5 auch für
Lernende der Stufe 6. Die Zuordnung kann durch die Lehrkraft geändert werden.

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

Tests können an **Schultagen von Montag bis Freitag, 08:00 bis vor 12:30 Uhr (Europe/Berlin)** gestartet
und neu eingereicht werden. Der Server prüft seine eigene Uhr; Datum, Uhrzeit
und Zeitzone des iPads ändern diese Entscheidung nicht. Sommer- und Winterzeit
werden automatisch berücksichtigt. Übungsmodi sind jederzeit verfügbar.
Die aktuelle Freigabe wird vor dem Start vom Server abgefragt. Neue Ergebnisse
außerhalb des Zeitfensters und liegengebliebene Versuche von vorherigen Tagen
werden abgewiesen. Eine verlorene Bestätigung für ein bereits gespeichertes
Ergebnis kann weiterhin ohne doppelten Eintrag nachgeholt werden.
Migration: `migrations/english_practice_test_window.sql`.

## Korrektur der bisherigen Selbstcheck-Übertragung

Migration `migrations/english_practice_lwl_assessments.sql` ergänzt die explizite
Freigabe und deaktiviert alte per-Liste-Zuordnungen für neue Einreichungen.
Historische Zeilen werden nicht gelöscht. Der alte v2-Endpunkt gibt eine
verständliche Aktualisierungsaufforderung zurück und speichert grundsätzlich nichts.
Beim Laden werden alte ausstehende Übungsergebnisse nicht als Tests übernommen.
Clientfehler (4xx) werden als abgelehnt angezeigt; nur Verbindungsprobleme werden
mit unveränderter Versuchs-ID erneut gesendet. Zeitgrenzen bleiben serverseitig.

## Geschlossener Testbereich und Ferienkalender

Die Übungsseite bietet nur einen Einstieg **Testbereich · Englisch**. Weder die
Lernwegseiten noch ein direkter Testlink zeigen vor der Freigabe Testkarten oder
Aufgaben. Die Kinder benötigen bestätigten persönlichen QR-Code und PIN.
`kompass_english_test_catalog` liefert nur während des serverseitig erlaubten
Zeitfensters Tests mit gültiger bestehender Kernfachkompetenz Englisch. Die Karten
zeigen Kompetenztext, Kompetenzbereich und den Umfang **Wortschatz-Teilnachweis**.
Vokabelpunkte bestätigen keine Hör-, Lese-, Sprech- oder Sprachmittlungskompetenz.
Bestehende Lehrkraftbewertungen bleiben erhalten.

Die BW-Schulferien sind vom Schuljahr 2026/27 bis einschließlich Sommerferien
2030 gemäß https://km.baden-wuerttemberg.de/de/service/ferien eingetragen.
Gesetzliche Feiertage sowie Gründonnerstag und Reformationsfest werden nach
https://im.baden-wuerttemberg.de/de/service/feiertage gesperrt. Ein eigener,
serverseitiger Kalender gilt vom 14.09.2026 bis 08.09.2030; außerhalb der geprüften
Abdeckung bleibt der Testbereich bis zur Kalenderaktualisierung geschlossen.
Die gesetzlichen beweglichen Feiertage wurden aus dem gregorianischen Osterdatum
berechnet. Bewegliche Ferientage der jeweiligen Schule werden nicht geraten.

Unter **Kernfächer → Englisch → English Practice · Testzeiten & schulfreie Tage**
können Admins zusätzliche schulweite Sperrzeiträume ergänzen, deaktivieren und
wieder aktivieren. Die Änderungen sind durch Admin-RPCs geschützt; normale
Lehrkräfte und Kinder können sie nicht verändern. Es gibt keine direkte
Tabellenschreibberechtigung. Die schulischen Sperrzeiten sind bei einer separaten
Datenbanksicherung zu berücksichtigen.

Die Freigabe gilt für Zugang, Aufgabenanzeige, Teststart und Einsenden. Um 12:30
schließt die geöffnete Testansicht anhand der vom Server gelieferten Restzeit.
Eine zusätzliche Serverabfrage alle 30 Sekunden und beim Wiederöffnen des Tabs
berücksichtigt neu eingetragene Sperrtage. Die Geräteuhr bestimmt keine Freigabe.
Die Datenbank weist verspätete Ergebnisse weiterhin ab. Ein bereits gespeicherter
Versuch kann nach Ende der Testzeit ohne doppelten Eintrag bestätigt werden.

Migration: `migrations/english_practice_school_calendar.sql` nach allen bisherigen
English-Practice-Migrationen. Regressionen: `tests/english-practice-calendar.sql`
prüft Tagesgrenzen, Feriengrenzen, Feiertage, Sommer-/Winterzeit, Schul-Sperrtage,
Deaktivieren/Wiederherstellen, Rechte und Kompetenzzuordnung in einer vollständig
zurückgerollten Transaktion. Browser-/Clienttests prüfen unter anderem Direktlinks,
Anmeldung, Katalogausblendung und das Schließen ohne Nutzung der Geräteuhr.

## Ergänzende Unit-4-Kompetenzchecks

Die expliziten Vokabeltests bleiben erhalten. Ergänzend zu diesen LWL-Teststellen
wurden neue Kompetenzchecks passend zur Unit-4-LWL erstellt. Sie sind ausdrücklich
keine Kopien unbekannter Buch- oder IServ-Prüfungen. Alle fünf vorhandenen
Unit-4-Rasterkompetenzen haben damit passende Aufgaben:

| Kompetenz | Aufgabe | Erfassung |
| --- | --- | --- |
| `eng5_5` · Orts-/Zeitangaben, Wortschatz | Vocabulary Tests 1 und 2 | Automatische Punkteübertragung |
| `eng5_16` · Kurze Gespräche verstehen | Vier kurze Hördialoge mit Verständnisfragen | Automatische Punkteübertragung |
| `eng5_23` · Worum geht es in einem kurzen Text? | Vier kurze Texte, jeweils Hauptaussage auswählen | Automatische Punkteübertragung |
| `eng5_30` · Einen Weg beschreiben | Wegbeschreibung im Gespräch mit der Lehrkraft | Normale KOMPASS-Kompetenzbewertung durch die Lehrkraft |
| `eng5_41` · Informationen verständlich machen | Museumshinweis für einen deutschsprachigen Bruder sinngemäß erklären | Normale KOMPASS-Kompetenzbewertung durch die Lehrkraft |

Offene Leistungen zeigen Aufgabe und Kriterien; weder das Kind noch ein
automatischer Client darf dafür einen Punktwert an den Ergebnis-Endpunkt senden.
Bei Lese- und Hörchecks wird der Bereich als eigener Teilnachweis im Verlauf
benannt. Bereits vorhandene Lehrkraftbewertungen werden weiterhin geschützt.
G/M/E wird nicht aus einem kurzen Check abgeleitet. Die neuen Kurzchecks prüfen
jeweils einen Ausschnitt und sind kein umfassender standardisierter Lernnachweis.

Hörtexte werden mit der vorhandenen englischen Geräte-Sprachausgabe abgespielt.
Die Kinder sehen keine Transkripte und können jeden Dialog höchstens zweimal
anhören. Antworten werden erst nach vollständigem Abspielen möglich. Ein
Audiotest vor Beginn hilft beim Prüfen von Stimme, Lautstärke und Kopfhörern;
ohne unterstützte Sprachausgabe lässt sich der Hörcheck nicht starten. Es werden
keine Sprachaufnahmen von Kindern angefertigt.

Lehrkräfte können die ergänzenden Aufgaben einschließlich Lösungen und Kriterien
in **Kernfächer → Englisch → passende Kompetenz → zugeordnete Tests** jederzeit
als **Lehrkraftvorschau** lesen. Die Vorschau schreibt keine Ergebnisse und öffnet
den Schüler-Testbereich nicht. So ist die fachliche Prüfung auch in Ferien möglich.

Migration: `migrations/english_practice_unit4_competency_checks.sql` nach
`english_practice_school_calendar.sql`. Regressionen in
`tests/english-practice-unit4.sql` prüfen die getrennten Kompetenznachweise,
Lehrkraftvorrang, Wiederholschutz und das Abweisen erfundener mündlicher Punkte.
Die Musteraufgaben für die Clientregression stehen im Schedule-Repository unter
`tests/fixtures/unit4-checks.json`.
