// Weitere Wochenübersichten; ausschließlich für angemeldete Kollegiums-Konten.
const EXTRA_PLANS={
'Pausenaufsicht':{label:'Aufsicht',times:['Frühaufsicht (ca. 7.30)','1. Pause (9.10–9.30)','2. Pause (11.00–11.20)','Mittagspause'],rows:[
['Vietinghoff / Dierolf','Brusda / Putz','Rock / Okhrimenko','Moser / Okhrimenko','Zwilling / Putz'],
['Bachmair / Mück','Bachmair / Okhrimenko','Oursin / Beißwenger','Vogt / Mück','Rock / Kümmerer'],
['Bachmair / Feil','Vogt / Dierolf','Tsehaye / Putz / Feil','Schnepf / Putz / Feil','Brusda / Gärtner'],
['Rock (20 Min.) / Zwilling (20 Min.)','Kindermann','','Peschel','']]},
'Flexstunden Stufe 6':{label:'Stunde',times:['2. Stunde','3. Stunde','4. Stunde','5. Stunde'],note:'Gültig bis 23.10.2026. Teams in Klammern nach Absprache.',rows:[
['','','Deutsch: QUOP / FLINK – Vogt, Sprachenraum (Blau), Gelb, (Violett), Grün, Rot\nEnglisch: Story Time – Schöne, Flexraum (Blau), Rot, Gelb, (Violett), Grün','','Mathe: Runden & Überschlagen – Moser, Flexraum; Blau, Grün, Violett, Gelb, Rot'],
['Mathe: Geometrische Figuren zeichnen – Viet., 10b; (Violett), Rot\nEnglisch: Englisch üben mit dem iPad – Tsehaye, 10a; Rot, Violett','Mathe: Rechenvorteile & Rechengesetze – Viet., OS 2; Grün, Rot\nDeutsch: QUOP / FLINK – Oursin, OS 1; Rot, Grün','Mathe: Schriftliche Subtraktion – Moser, Nawi 2; Blau, Violett, Gelb, (Grün), (Rot)','Deutsch: QUOP / FLINK – Oursin, 9a; Rot','Mathe: Schriftliche Division – Viet., Matheraum; Violett, Gelb'],
['Mathe: Schriftliche Division – Schnepf; (Blau), Grün, Rot','Mathe: Uhrzeit: Zeitpunkt & Zeitspannen – Bay, OS 2; (Blau), (Violett), (Gelb)\nDeutsch: QUOP / FLINK – Bachmair, OS 1; (Blau), (Gelb), (Violett)','Deutsch: QUOP / FLINK – Brusda, 9b; Blau, (Rot), Gelb, Violett, (Grün)\nEnglisch: Englisch üben mit dem iPad – Tsehaye, 9a; Blau, (Rot), Gelb, Violett, (Grün)','Mathe: Uhrzeit: Zeitpunkt & Zeitspannen – Bay, 9a; Grün','Mathe: Schriftliche Subtraktion – Moser, 9a; Blau, (Grün), Gelb, (Rot)\nEnglisch: Sketches & Board Games – Zwilling, 9b; Blau, (Rot), Gelb, Violett, (Grün)'],
['','','','','Englisch: Story Time – Tsehaye, OS 2; Blau, Gelb, Grün, Violett, Rot']]},
'Kreativband Stufe 5–7':{label:'Stunde',times:['5. Stunde','6. Stunde'],note:'Zweistündige Angebote: Buchung der 5. Stunde gilt auch für die 6. Stunde. Koch- und Nähstudio aktuell: Nähen.',rows:[
['Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); Heimbacher Hof (Sport); IT-Studio (COMP 2); Koch- und Nähstudio – Nähen (TW 2); Kunstatelier (BK 2); Technikwerkstatt; Musik: eigenständiges Üben','Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); IT-Studio (COMP 2); Koch- und Nähstudio – Nähen (TW 2); Kunstatelier (BK 2); Musikatelier (Musiksaal 2); Musik: eigenständiges Üben; Sportangebot; Technikwerkstatt','Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); IT-Studio (COMP 2); Kunstatelier (BK 2); Musikatelier (Musiksaal 2); Musik: eigenständiges Üben; Sportangebot; Technikwerkstatt','Kunstatelier (BK 2); Musik: eigenständiges Üben; Sportangebot','Kunstatelier (BK 2); Musik: eigenständiges Üben; Schulgarten (Nawi 8); Sportangebot'],
['Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); Heimbacher Hof (Sport); IT-Studio (COMP 2); Koch- und Nähstudio – Nähen (TW 2); Kunstatelier (BK 2); Technikwerkstatt; Musikatelier (Musiksaal 2)','Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); IT-Studio (COMP 2); Koch- und Nähstudio – Nähen (TW 2); Kunstatelier (BK 2); Musikatelier (Musiksaal 2); Musik: eigenständiges Üben; Sportangebot; Technikwerkstatt','Naturwiss. Labor (Nawi 5); Schulgarten (Nawi 8); IT-Studio (COMP 2); Kunstatelier (BK 2); Musikatelier (Musiksaal 2); Musik: eigenständiges Üben; Sportangebot; Technikwerkstatt','','']]},
'Bläserklasse Stufe 6':{label:'Zeit',times:['10.15–11.00','11.00–11.45','11.20–12.05'],note:'Bläserklasse – Übersicht für das Kollegium. Unterrichtstag ist in der Vorlage nicht angegeben.',rows:[
['Blechbläser (Hubert Holzner), Aula: Anne Breit; Luke Hettesheimer; Andreas Ion Tudor; Sophia Kugler; Lea Schimminger\nHolzbläser (Sonja Fahrian), Musik 1: Helena Dyba; Emma Fritz; Sophia-Loren Glasbrenner; Marie Nagel; Pia Poggensee; Tanja Prokisch; Sira Wakal; Liam Noel Wieland','','','',''],
['Holzbläser (Sonja Fahrian), Musik 1: Emma Hilkert','','','',''],
['Schlagzeug (Frank Wenninger), Musik 2: Mikka Lenz','','','','']]}
};

Object.assign(EXTRA_PLANS,{
  "Teamstundenplan Blau": {
    "label": "Stunde",
    "times": [
      "1. Stunde · 7:40–8:25",
      "2. Stunde · 8:25–9:10",
      "3. Stunde · 9:30–10:15",
      "4. Stunde · 10:15–11:00",
      "5. Stunde · 11:20–12:05",
      "6. Stunde · 12:05–12:50",
      "7. Stunde · 13:00–13:45",
      "8. Stunde · 13:50–14:35",
      "9. Stunde · 14:40–15:25",
      "10. Stunde · 15:30–16:15"
    ],
    "teamColor": "blau",
    "rows": [
      [
        "Ankommen (Oursin)",
        "Ankommen (Rock)",
        "Ankommen (Rock) / Religion – Gronbach / LA",
        "Ankommen (Rock)",
        "Ankommen (alle Lerncoaches)"
      ],
      [
        "LA",
        "Deutsch – Oursin / Sprachenraum",
        "Religion – Gronbach / Matheraum / LA",
        "LA",
        "LA"
      ],
      [
        "Englisch – Rock / Flexraum",
        "Mathe – Bay / Matheraum",
        "LA",
        "Mathe – Bay / Matheraum",
        "Englisch – Rock / Flexraum"
      ],
      [
        "TS Blau / 10a/b",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "Deutsch – Oursin / Sprachenraum",
        "LA",
        "LA"
      ],
      [
        "Kreativband / LA",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "Kreativband / LA",
        "Chor / Franz. 1 – Seyllan / Matheraum / Kreativband / LA",
        "Kreativband / LA"
      ],
      [
        "Bläserklasse / Kreativband / LA",
        "Kreativband / LA",
        "Kreativband / LA",
        "—",
        "Assembly"
      ],
      [
        "—",
        "—",
        "—",
        "Werkstatt",
        "—"
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "",
        "",
        "",
        "",
        ""
      ]
    ],
    "note": "Teamstundenplan Stufe 6 · Stand 27.09.2026"
  },
  "Teamstundenplan Rot": {
    "label": "Stunde",
    "times": [
      "1. Stunde · 7:40–8:25",
      "2. Stunde · 8:25–9:10",
      "3. Stunde · 9:30–10:15",
      "4. Stunde · 10:15–11:00",
      "5. Stunde · 11:20–12:05",
      "6. Stunde · 12:05–12:50",
      "7. Stunde · 13:00–13:45",
      "8. Stunde · 13:50–14:35",
      "9. Stunde · 14:40–15:25",
      "10. Stunde · 15:30–16:15"
    ],
    "teamColor": "rot",
    "rows": [
      [
        "Ankommen (Zwilling)",
        "Ankommen (Moser)",
        "Ankommen (Zwilling)",
        "Ankommen (Moser)",
        "Ankommen (Zwilling)"
      ],
      [
        "Deutsch – Brusda / Sprachenraum",
        "Mathe – Moser / Matheraum",
        "Teamstunde rot / Nawi",
        "Mathe – Moser / Matheraum",
        "LA"
      ],
      [
        "LA",
        "LA",
        "Religion – Gronbach / Matheraum / LA",
        "LA",
        "Englisch – Zwilling / Sprachenraum"
      ],
      [
        "LA",
        "Englisch – Zwilling / Sprachenraum",
        "Religion – Gronbach / Matheraum / LA",
        "Deutsch – Brusda / Sprachenraum",
        "Franz. 2 – May / Sprachenraum / LA"
      ],
      [
        "Kreativband / LA",
        "Franz. 2 – May / Sprachenraum / Kreativband / LA",
        "Kreativband / LA",
        "Chor / Kreativband / LA",
        "Kreativband / LA"
      ],
      [
        "Bläserklasse / Kreativband / LA",
        "Franz. 2 – May / Sprachenraum / Kreativband / LA",
        "Kreativband / LA",
        "—",
        "Assembly"
      ],
      [
        "—",
        "—",
        "—",
        "Werkstatt",
        "—"
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "",
        "",
        "",
        "",
        ""
      ]
    ],
    "note": "Teamstundenplan Stufe 6 · Stand 27.09.2026"
  },
  "Teamstundenplan Gelb": {
    "label": "Stunde",
    "times": [
      "1. Stunde · 7:40–8:25",
      "2. Stunde · 8:25–9:10",
      "3. Stunde · 9:30–10:15",
      "4. Stunde · 10:15–11:00",
      "5. Stunde · 11:20–12:05",
      "6. Stunde · 12:05–12:50",
      "7. Stunde · 13:00–13:45",
      "8. Stunde · 13:50–14:35",
      "9. Stunde · 14:40–15:25",
      "10. Stunde · 15:30–16:15"
    ],
    "teamColor": "gelb",
    "rows": [
      [
        "Ankommen (Bachmair)",
        "Ankommen (Bachmair)",
        "Ankommen (Bachmair)",
        "Ankommen (Bachmair)",
        "Ankommen (Bachmair)"
      ],
      [
        "Teamstunde Gelb / 10a/b",
        "LA",
        "LA",
        "Deutsch – Bachmair / Sprachenraum",
        "LA"
      ],
      [
        "Deutsch – Bachmair / Sprachenraum",
        "Mathe – Bachmair / Flexraum",
        "Englisch – Tsehaye / Sprachenraum",
        "LA",
        "LA"
      ],
      [
        "Englisch – Tsehaye / Sprachenraum",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "LA",
        "Mathe – Bachmair / Matheraum",
        "LA"
      ],
      [
        "Kreativband / LA",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "Religion – Gronbach / Matheraum / Kreativband / LA",
        "Chor / Franz. 1 – Seyllan / Matheraum / Kreativband / LA",
        "Kreativband / LA"
      ],
      [
        "Bläserklasse / Kreativband / LA",
        "Kreativband / LA",
        "Religion – Gronbach / Kreativband / LA",
        "—",
        "Assembly"
      ],
      [
        "—",
        "—",
        "—",
        "Werkstatt",
        "—"
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "",
        "",
        "",
        "",
        ""
      ]
    ],
    "note": "Teamstundenplan Stufe 6 · Stand 27.09.2026"
  },
  "Teamstundenplan Violett": {
    "label": "Stunde",
    "times": [
      "1. Stunde · 7:40–8:25",
      "2. Stunde · 8:25–9:10",
      "3. Stunde · 9:30–10:15",
      "4. Stunde · 10:15–11:00",
      "5. Stunde · 11:20–12:05",
      "6. Stunde · 12:05–12:50",
      "7. Stunde · 13:00–13:45",
      "8. Stunde · 13:50–14:35",
      "9. Stunde · 14:40–15:25",
      "10. Stunde · 15:30–16:15"
    ],
    "teamColor": "violett",
    "rows": [
      [
        "Ankommen (Schöne, Viet.)",
        "Ankommen (Brusda)",
        "Ankommen (Schöne) / Religion – Gronbach / LA",
        "Ankommen (Brusda)",
        "Ankommen (Brusda)"
      ],
      [
        "Mathe – Vietinghoff / Matheraum",
        "LA",
        "Religion – Gronbach / Matheraum / LA",
        "LA",
        "LA"
      ],
      [
        "LA",
        "Deutsch – Brusda / Sprachenraum",
        "Teamstunde violett / Flexraum / LA",
        "Deutsch – Brusda / Sprachenraum",
        "LA"
      ],
      [
        "Englisch – Schöne / Flexraum",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "LA",
        "Englisch – Schöne / Flexraum",
        "Mathe – Vietinghoff / Matheraum"
      ],
      [
        "Kreativband / LA",
        "Franz. 1 – Seyllan / Matheraum / LA",
        "Kreativband / LA",
        "Chor / Franz. 1 – Seyllan / Matheraum / Kreativband / LA",
        "Kreativband / LA"
      ],
      [
        "Bläserklasse / Kreativband / LA",
        "Kreativband / LA",
        "Kreativband / LA",
        "—",
        "Assembly"
      ],
      [
        "—",
        "—",
        "—",
        "Werkstatt",
        "—"
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "",
        "",
        "",
        "",
        ""
      ]
    ],
    "note": "Teamstundenplan Stufe 6 · Stand 27.09.2026"
  },
  "Teamstundenplan Grün": {
    "label": "Stunde",
    "times": [
      "1. Stunde · 7:40–8:25",
      "2. Stunde · 8:25–9:10",
      "3. Stunde · 9:30–10:15",
      "4. Stunde · 10:15–11:00",
      "5. Stunde · 11:20–12:05",
      "6. Stunde · 12:05–12:50",
      "7. Stunde · 13:00–13:45",
      "8. Stunde · 13:50–14:35",
      "9. Stunde · 14:40–15:25",
      "10. Stunde · 15:30–16:15"
    ],
    "teamColor": "gruen",
    "rows": [
      [
        "Ankommen (Vogt)",
        "Ankommen (Schnepf)",
        "Ankommen (Vogt)",
        "Ankommen (Vogt)",
        "Ankommen (Schnepf)"
      ],
      [
        "Deutsch – Vogt / Flexraum",
        "Teamstunde / Nawi",
        "LA",
        "Englisch – Rock / Flexraum",
        "LA"
      ],
      [
        "Mathe – Schnepf / Matheraum",
        "LA",
        "Religion – Gronbach / Matheraum / LA",
        "Deutsch – Vogt / Flexraum",
        "Mathe – Schnepf / Matheraum"
      ],
      [
        "LA",
        "Englisch – Rock / Flexraum",
        "Religion – Gronbach / Matheraum / LA",
        "LA",
        "Franz. 2 – May / Sprachenraum / LA"
      ],
      [
        "Kreativband / LA",
        "Franz. 2 – May / Sprachenraum / Kreativband / LA",
        "Kreativband / LA",
        "Chor / Kreativband / LA",
        "Kreativband / LA"
      ],
      [
        "Bläserklasse / Kreativband / LA",
        "Franz. 2 – May / Sprachenraum / Kreativband / LA",
        "Kreativband / LA",
        "—",
        "Assembly"
      ],
      [
        "—",
        "—",
        "—",
        "Werkstatt",
        "—"
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "Werkstatt",
        "Werkstatt",
        "",
        "Werkstatt",
        ""
      ],
      [
        "",
        "",
        "",
        "",
        ""
      ]
    ],
    "note": "Teamstundenplan Stufe 6 · Stand 27.09.2026"
  }
});
