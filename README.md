# KOMPASS 7.0

Diese Version basiert auf KOMPASS 6.0 und ergänzt die integrierte automatische Stundenplanung.

## Stundenplan erstellen
1. Unter **Stundenplanung → Lehrkräfte** die IServ-Deputatswünsche importieren.
2. Unter **Planungsgrundlagen** Teams, Räume und Sollstunden prüfen.
3. Im **Wochenplan** auf **Stundenplan erstellen** klicken.
4. KOMPASS erzeugt eine erste Planvariante, markiert offene Lehrkräfte und zeigt Konflikte unter **Prüfung**.
5. Blöcke können anschließend per Drag-and-drop oder über die Bearbeitungsdialoge angepasst werden.

Der Generator arbeitet offline im Browser und verwendet eine heuristische, konfliktprüfende Berechnung. Bereits manuell angelegte Blöcke bleiben beim erneuten Erstellen erhalten; automatisch erzeugte Blöcke werden ersetzt.

## KOMPASS 7.1 – Organisationsgenerator

Neu ergänzt wurden:

- editierbare Regelbibliothek mit Muss- und Möglichst-Regeln
- konfigurierbare Unterrichtsarten statt fest verdrahteter Fach-Sonderfälle
- Coach-Zuordnung pro Farbteam
- Lernatelier-Eignung pro Lehrkraft und Lernatelier
- Ankommensstunde mit einem Coach pro Farbteam
- dynamische Lernatelier-Besetzung in Abhängigkeit von parallel stattfindenden Inputs
- feste Prüfung, dass Lernatelier 3 während des Lernatelierbetriebs besetzt ist
- phasenweise Berechnung: Zeitgerüst → Unterricht → Lernatelier-Betreuung → Prüfung

Wichtig: Werkstatt, Kreativband und die vollständige Stufe-7-Logik sind als Unterrichtsarten im Schulmodell vorbereitet. Die automatisierte Angebotsverteilung wird in der nächsten Ausbaustufe ergänzt.
