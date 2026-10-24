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
Die serverseitige Freigabe (`is_assessment`) und die zum ausgestellten Versuch gehörende Aufgabenanzahl
werden zusätzlich zur PIN und Serverzeit geprüft.

| Digitaler LWL-Test | Bereich | Vorhandene Kompetenz |
| --- | --- | --- |
| Unit 4, Vocabulary Test 1 | Station 1 / 2a, Liste 16, shop – now, höchstens 20 Vokabelziele pro Versuch | Orts- und Zeitangaben (`eng5_5`) |
| Unit 4, Vocabulary Test 2 | Station 2 / 3a, Liste 17, way – by (bike), höchstens 20 Vokabelziele pro Versuch | Orts- und Zeitangaben (`eng5_5`) |

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
Verlauf als Nachweise. Beim gemeinsamen Nachweis wird G/M/E aus der nachgewiesenen fachlichen Tiefe der Aufgabenbereiche ermittelt; die Erfüllung nutzt die vorhandenen Prozentregeln.

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

## Befristeter Wochenendzugang für Testkind

Für das bestehende synthetische Kind `ep_demo_juliane_2026` ist der persönliche
Zugang ab Aktivierung bis **26.10.2026, 00:00 Europe/Berlin** freigeschaltet,
also einschließlich Sonntag, 25.10., bis 23:59 Uhr. Die Ausnahme steht im
serverseitigen Zugang, nicht im QR-Link oder in einer Geräteuhr-Einstellung.
Sie greift nur, solange der konkrete Datensatz aktiv und im Schülerbestand
explizit `isDemo: true` ist. Sie gilt weder für andere Demo-IDs noch für echte Kinder.
PIN und Namensbestätigung bleiben erforderlich. Es werden keine echten Zugänge
freigeschaltet und keine Ferientermine geändert.

`kompass_english_access_window` liefert nach PIN-Prüfung entweder die reguläre
Schulfreigabe oder die befristete persönliche Demo-Freigabe. Katalog und
Ergebnisübertragung verwenden dieselbe private Prüfung. Ablaufdatum und Serverzeit
werden auch in der Demoansicht verwendet. Ab Ende der Freigabe ist ohne weitere
Änderung wieder ausschließlich der normale Schulkalender wirksam. Ein bereits
abgespeicherter Versuch darf weiterhin ohne doppelten Eintrag bestätigt werden.
Die Ergebnisse von bewussten Nutzertests gehören zum Testkind und sind in dessen
normalen Kompetenzdatensätzen sichtbar.

Migration: `migrations/english_practice_demo_weekend.sql`. Regression:
`tests/english-practice-demo-weekend.sql`, vollständig zurückgerollt, prüft QR/PIN,
Katalog, echte serverseitige Einreichung, Wiederholschutz, Ablaufzeit und die
Abgrenzung gegenüber Nicht-Demo-Kindern. Zugangsdaten stehen nicht im Repository.

## Gemeinsamer Vokabel-Lernnachweis nach fachlicher Tiefe (24.10.2026)

Es gibt keine Niveauwahl durch das Kind vor dem Start. Alle erhalten denselben
Aufbau; die Aufgaben sind mit G, M/E oder E gekennzeichnet und alle Bereiche sind
zugänglich. Die Bereichsschaltflächen sind reine Navigation. Sie bestimmen kein
Kompetenzniveau. Aufgaben können ausgelassen und vor der Abgabe erneut aufgerufen
werden; unbeantwortete Aufgaben bleiben ohne Punkte.

| Testteil | Aufgaben | Fachliche Anforderung | Punkte |
| --- | --- | --- | --- |
| Basis G | 15 gemischte Vokabelübersetzungen Deutsch ↔ Englisch | Gelernte Wörter verstehen und wiedergeben | 15 |
| M/E | 5 englische Wortbeschreibungen, passenden Begriff aus der Liste finden | Wortbedeutungen über eine englische Beschreibung erschließen | 5 |
| E | 3 vollständige Sätze ins Englische übersetzen | Wörter in einem vollständigen sprachlichen Zusammenhang übertragen | 6 |

Damit bestehen 23 Aufgaben mit insgesamt höchstens 20 verschiedenen Vokabelzielen.
Die 3 Satzaufgaben verwenden Wörter aus dem Basisteil. Es werden nicht 23 neue
Vokabeln geprüft. Die Auswahl rotiert weiterhin pro Kind und Test: bisher nicht
verwendete Wörter werden bevorzugt. Bei kurzen Listen sind Überschneidungen zwischen
Versuchen unvermeidlich. Die alte Startfunktion mit freier G/M/E-Wahl ist für
Schüler- und Lehrkraftclients deaktiviert; bereits ausgestellte frühere Versuche
bleiben als solche nachvollziehbar.

### Niveau und Erfüllung

Das Niveau des Nachweises entsteht aus der nachgewiesenen **fachlichen Tiefe**,
nicht aus der vorherigen Wahl eines Testformats oder einer hohen Prozentzahl in
leichten Aufgaben allein. Der Server wertet die Aufgabengruppen getrennt aus und
nimmt die höchste Tiefe, die nach den vorhandenen Kompetenz-Prozentgrenzen sicher
nachgewiesen ist. Ist keine Tiefe sicher erreicht, wird die höchste teilweise
nachgewiesene Tiefe ausgewiesen. Bei fehlenden Nachweisen wird kein G/M/E erfunden.
Die ursprünglichen Grenzen der Kompetenz (`scoreConfig`) bleiben unverändert.
Aktuell sind dies rot bis 24 %, gelb bis 74 %, grün darüber.

Die Erfüllung auf dem ermittelten Niveau nutzt die dazugehörigen Testteile:
G = Basis (15 P.), M = Basis und Bedeutungen (20 P.), E = alle Teile (26 P.).
Beispiel: Basis 15/15, Bedeutungen und Sätze offen ergibt **G grün**, zusätzlich
werden **15/26 Gesamtpunkte** dokumentiert. Es gibt keine Regel, nach der erst jeder
niedrigere Teil grün sein müsste, um höhere fachliche Tiefe zu zeigen. Die Punkte der
zugehörigen Testteile beeinflussen aber den Erfüllungsgrad des Nachweises.

Die Schüleransicht zeigt Niveau, Ampel, Gesamtpunkte und die einzelnen Teilwerte.
KOMPASS speichert das ermittelte Niveau in `record.level`, die Ampel in `current`,
die zum Erfüllungsniveau gehörenden Punkte in `score` sowie Gesamt- und Teilpunkte
in `assessmentSummary` und im Nachweisverlauf. Die Matrix zeigt beides ausdrücklich
getrennt, damit z. B. 15/26 Gesamtpunkte nicht mit 100 % Erfüllung auf G verwechselt
werden. Manuelle Lehrkraftbewertungen werden durch neue automatische Nachweise
weiterhin nicht ungefragt überschrieben; der neue Nachweis bleibt mit seiner
automatischen Einstufung im Verlauf erhalten.

### Bewertung, Varianten und Prüfung

Wörter und Wortbedeutungen geben 2 Punkte für eine richtige Antwort bzw. 1 Punkt
für einen kleinen Tippfehler. Artikelvarianten, Infinitiv-to, hinterlegte Alternativen,
bestimmte gebräuchliche Synonyme und britische/amerikanische Schreibungen werden
berücksichtigt. Kurze Wörter, Richtungsangaben und echte andere Wörter werden nicht
pauschal unscharf gleichgesetzt. Sätze geben 4 Punkte für hinterlegte sinngleiche
Varianten und 3 Punkte bei genau einem kleinen unbedenklichen Tippfehler. Andere
nicht leere Satzvarianten bleiben zur Lehrkraftprüfung offen; sie werden nicht als
endgültig falsch ausgegeben.

Ein bereits sicher nachgewiesenes niedrigeres Niveau kann automatisch dokumentiert
werden, während eine höhere Tiefe noch in Prüfung ist. Eine offene Prüfung führt
nicht zum ungeprüften Herabsetzen eines bereits sicher dokumentierten höheren
Niveaus. Die bisherigen Rückmeldungen und Lehrkrafturteile bleiben nachvollziehbar.

Unter **Einzelantworten & Punkte → Punkte nach Prüfung übernehmen** werden für den
gemeinsamen Nachweis die geprüften Punkte für Basis, Bedeutungen und Sätze getrennt
eingegeben. Der Server berechnet daraus Niveau und Ampel erneut, dokumentiert die
prüfende Lehrkraft und hält die automatische Vorbewertung fest. Ein späterer Retry
des ursprünglichen Schüler-Uploads überschreibt keine Lehrkraftprüfung.

### Technischer Aufbau und Prüfungen

Der Server stellt die zufällige Aufgabenfolge aus und liefert vor der Abgabe keine
Referenzantworten. Der Client sendet nur Antworten mit Versuchs-ID. Behauptete
Clientpunkte oder Niveauangaben beeinflussen die Bewertung nicht. Die vorhandene
private Antwortprüfung entscheidet über die Testpunkte; Browser-Fehlertoleranz ist
nur für sofortiges Übungsfeedback. Musterantworten und Einzelauswertung gibt es
für das Kind erst nach Abgabe des eigenen Versuchs. Die Referenzdaten, Auswahl und
Rohantworten benötigen eine separate Datenbanksicherung; übertragene Nachweise
sind zusätzlich in den normalen Kompetenzdaten enthalten.

Zusätzliche Migrationen in Reihenfolge: `english_practice_vocab_lnw.sql`,
`english_practice_vocab_review.sql`, `english_practice_vocab_review_ack.sql`,
`english_practice_vocab_variants.sql`, `english_practice_common_depth.sql`,
`english_practice_common_depth_fixes.sql`. Die früheren Dateien bilden frühere
Serverstände ab; maßgeblich ist der vollständige Migrationsstand.

Regressionen: `tests/english-practice-common-depth.sql` prüft innerhalb eines
vollständig zurückgerollten Tests den Aufbau 15/5/3, beide Übersetzungsrichtungen,
maximal 20 Wortziele, verdeckte Lösungen, zufällige Wiederholungen, die Ermittlung
von G/M/E sowie deren Speicherung mit Punkten/Ampel und die nachträgliche
Lehrkraftprüfung. Ältere SQL-Tests dokumentieren ihre jeweils damaligen Formate.
Browserlogik: `Schedule/tests/answer-check.test.cjs` und
`Schedule/tests/kompass-link.test.cjs`.

## Schüleroberfläche und Ergebnisarchiv (24.10.2026)

Die Startseite hat eine Einführung und drei kurze Ziele: Üben, Testbereich,
Meine Tests. Testanweisungen beschränken sich auf die Aufgaben. Sprechen und
Sprachmittlung mit Lehrkraft werden im Schülerkatalog nicht mehr angeboten.

Neue Vokabelversuche haben 26 Punkte: 15 Basiswörter, 5 Bedeutungen je 1 Punkt,
3 Sätze je 2 Punkte. Ein kleiner sicher erkannter Worttippfehler bleibt richtig
(1 Punkt mit Korrekturhinweis), ein Satz mit kleinem Tippfehler erhält 1/2.
Alte Versuche behalten ihre ursprüngliche Skala und werden nicht umbewertet.
Niveauentscheidung und vorhandene Prozentgrenzen bleiben gleich.

`kompass_english_my_results` prüft aktiven persönlichen Token + PIN und liefert
ausschließlich eigene Ergebnisse. Liste: 50 je Seite mit Zeitstempelcursor.
Details: eigene abgegebene Antworten/Feedback, keine vollständigen privaten
Aufgabenpools oder Lösungsschlüssel. Ergebnisse können auch außerhalb der
Testzeit gelesen werden; Start/Abgabe bleiben zeitlich geschützt. Der Browser
hält das Archiv nur im Speicher, löscht es beim Abmelden und verwirft verspätete
Antworten nach einem Identitätswechsel.

Ein expliziter Schalter öffnet die Auswertung. Ältere Versuche ohne gespeicherte
Einzelantworten zeigen einen Hinweis, die Gesamtpunkte bleiben abrufbar.

## Testunterbrechungen – aktuelle Abzugsregel

Während eines laufenden Tests erkennen `visibilitychange` und Fenster-`blur`
eine mögliche App-/Tab-Unterbrechung. Ein Overlay pausiert die Bedienung; Eingaben
bleiben erhalten. Das Kind setzt nach Rückkehr ausdrücklich fort, wobei die
Serverfreigabe erneut geprüft wird. Doppelte Ereignisse derselben Pause zählen
einmal. Üben und Ergebnisansichten sind ausgenommen. Ein unterbrochenes
Hörgespräch kann erneut vollständig gehört werden.

Die erste Unterbrechung warnt ohne Abzug. Ab der zweiten Unterbrechung kostet
jede weitere einen Punkt: Abzug = max(0, Anzahl−1). Die Punktzahl fällt höchstens
auf 0. Startanweisung und Pausenhinweis erklären die Regel vor bzw. während des
Tests. Gesamtpunkte vor Abzug, Anzahl der Wechsel und Abzug werden getrennt
angezeigt, einschließlich im eigenen Ergebnisarchiv und in KOMPASS.

Die atomaren Abgaberouten `submit_vocab_v2` und `submit_result_v4` speichern
Test und Abzug gemeinsam. Das Ergebnis behält die ursprünglichen Teilpunkte
und das aus fachlicher Tiefe ermittelte Niveau. Gesamtpunkte und die Erfüllung
auf diesem Niveau werden um den Abzug reduziert; die bestehenden Prozentgrenzen
bestimmen die Ampel neu. Ein kleinerer Gesamtpunktwert allein ändert nicht die
nachgewiesene fachliche Tiefe. Manuelle bestehende Kompetenzurteile bleiben
geschützt, der konkrete Testnachweis zeigt den Abzug.

Erneutes Senden zieht nicht erneut ab. Eine spätere Satzprüfung verwendet die
neu geprüften fachlichen Punkte und wendet denselben Abzug genau einmal an.
Historische bereits gespeicherte Unterbrechungsvermerke aus der früheren Regel
werden nicht nachträglich umbewertet. Browsermeldungen sind kein Nachweis,
welche Seite/App geöffnet wurde. Es werden keine Suchanfragen oder App-Namen
erfasst. Diese Browserfunktion ist keine technische Sperre gegen Hilfsmittel.
