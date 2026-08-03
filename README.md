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

## Neu in 7.5
- Kreativband-Antworten aus dem Deputatswunschzettel werden strukturiert übernommen.
- Im Lehrkraftprofil: Einsatzart, konkrete Bereiche, eigene Ideen und mögliche Tage.
- Lehrkräfte ohne Kreativband-Wunsch werden in der 5./6. Stunde anhand ihrer Lernatelier-Präferenzen eingesetzt.
- Montag bis Donnerstag werden 5./6. Stunde als zusammenhängender Personalblock erzeugt.
- Kreativband und Lernatelier-Besetzungen werden kompakt in der Wochenansicht dargestellt.
