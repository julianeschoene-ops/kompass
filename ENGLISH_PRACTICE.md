# English Practice in KOMPASS

In **Kernfächer → Englisch** erscheinen abgeschlossene Vokabeltests für die
ausgewählte Stufe und das ausgewählte Team. Im Schülerprofil stehen dieselben
Ergebnisse beim einzelnen Kind. Gespeichert werden Thema, Punkte, Datum und
die Versuche je Vokabelliste. Die Anzeige lädt während der Nutzung alle
15 Sekunden neu; „Ergebnisse laden“ aktualisiert sofort.

## Persönliche QR-Codes

Admin oder Stufenleitung: Stufe und Team auswählen, dann im Englischbereich
„QR-Codes für die Auswahl erstellen“. Die Druckansicht kann ausgedruckt oder
als PDF gesichert werden. Einzelne Codes lassen sich im Schülerprofil erstellen
und sperren. Neue Codes ersetzen die bisherigen Codes der ausgewählten Kinder;
die bisherigen Ergebnisse bleiben erhalten. Codes werden nur bei der Erstellung
zum Ausdrucken ausgegeben, in der Datenbank bleibt nur ihr Hash.

Das Kind scannt den Code, bestätigt den angezeigten Vornamen und nutzt unter
einer Vokabelliste **Test yourself**. Nach Abschluss wird das Ergebnis übertragen.
Bei fehlender Verbindung bleibt es im aktuellen Browser-Tab zum erneuten Senden.
„End practice & reset“ entfernt die persönliche Zuordnung. Auch nach
30 Minuten ohne Aktivität wird sie entfernt. Ohne Code bleibt freies Üben möglich.

Die Ergebnisse sind **Selbsttests**, keine automatisch vergebenen Noten oder
Kompetenzbewertungen. Freie Übungsrunden, Flashcards und Grammatikübungen
werden nicht als Tests übertragen. Die QR-Codes sind persönliche Zugangscodes
zum Einsenden von Selbsttests und sollten nicht weitergegeben werden.

## Technischer Aufbau

- `migrations/english_practice.sql`: additive Datenbank-Erweiterung.
- `kompass_english_links`: gehashte, sperrbare Codes mit Stufe und Schüler-ID.
- `kompass_english_results`: serverseitiger Zeitstempel und eindeutige Versuch-ID.
- Kinder können nur ihren Code prüfen und Ergebnisse einsenden. Sie erhalten
  keinen Tabellenzugriff und keine KOMPASS-Anmeldung.
- Lehrkräfte sehen Ergebnisse nach den bestehenden Stufenrechten. Lernatelier-
  Konten erhalten keinen Zugriff auf diese Tabellen oder die Codeverwaltung.
- Punkte werden auf gültige Grenzen geprüft. Wiederholtes Einsenden derselben
  Versuch-ID legt keine Duplikate an. Die Punkte sind eine Selbstauskunft des
  Übungsclients; die bisherige Bewertung durch Lehrkräfte bleibt unabhängig.
- QR-Codes werden lokal mit `qrcode-generator` 1.4.4 (MIT, Kazuhiko Arase)
  erzeugt. Kein externer QR-Dienst erhält Zugangscodes oder Schülernamen.
- Neue Tabellen sind von den bisherigen JSON-Stufenständen getrennt. Sie sind
  daher nicht im bisherigen KOMPASS-JSON-Export enthalten; Supabase-Sicherungen
  sollten auch diese Tabellen berücksichtigen.

Prüfung: `node --test tests/english-practice.test.cjs`; im Schedule-Repository
`node --test tests/kompass-link.test.cjs`. Die Datenbankintegration wurde mit
einem vollständig zurückgerollten Testlauf für Codezuordnung, Einsenden,
Duplikatschutz, ungültige Punkte, Zugriffsrechte und Sperrung geprüft.
