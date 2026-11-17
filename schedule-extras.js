// Weitere Wochenübersichten; ausschließlich für angemeldete Kollegiums-Konten.
const EXTRA_PLANS={
'Pausenaufsicht':{label:'Aufsicht',times:['Frühaufsicht (ca. 7.30)','1. Pause (9.10–9.30)','2. Pause (11.00–11.20)','Mittagspause'],rows:[
['Vietinghoff / Dierolf','Brusda / Putz','Rock / Okhrimenko','Moser / Okhrimenko','Zwilling / Putz'],
['Bachmair / Mück','Bachmair / Okhrimenko','Oursin / Beißwenger','Vogt / Mück','Rock / Kümmerer'],
['Bachmair / Feil','Vogt / Dierolf','Tsehaye / Putz / Feil','Schnepf / Putz / Feil','Brusda / Gärtner'],
['Rock (20 Min.) / Zwilling (20 Min.)','Kindermann','','Peschel','']]},
'Flexstunden Stufe 6':{"label":"Stunde","times":["2. Stunde","3. Stunde","4. Stunde","5. Stunde"],"note":"Stand 17.11.2026 · ★ = von Ferien bis Ferien fest · ohne ★ frei buchbar · Teams in Klammern nach Absprache","rows":[["★ Tischtennis & Ballspiele – Moraintinis · Foyer Sporthalle 1 · Blau","","★ Deutsch – Vogt · Sprachenraum · Blau, Grün\nEnglisch iPad-Übungen – Schöne · Flexraum · (Blau), Gelb, (Violett), Grün","","★ Mathe – Moser · Matheraum · Blau, Rot, Gelb, Grün"],["★ Englisch – Tsehaye · 10a · Violett\nMathe-LWL – Vietinghoff · 10b · Rot, Violett\n★ Tischtennis & Ballspiele – Moraintinis · Foyer Sporthalle 1 · Rot, Violett","★ Lernen lernen – Oursin · OS1 · Rot, Grün\nMathe-LWL – Vietinghoff · OS2 · Rot, Grün\n★ Sportspiele – Pfeffer · Ausgang 5er-Nest · Rot, Grün","★ Mathe – Moser · Nawi 2 · Violett\n★ Turnen (3.+4.) – Steinle · Foyer Sporthalle · (Rot), Violett, (Grün)","","Mathe-LWL – Vietinghoff · 10b · Gelb, Violett\n★ Tischtennis & Ballspiele – Moraintinis · Halle 1 · Gelb, Violett"],["Mathe-LWL – Schnepf · Matheraum · Rot, Grün\n★ Gummitwist – Hoffmann · Ausgang 5er-Nest · Rot, Grün","★ Lernen lernen (bei Bedarf) – Bachmair · OS1 · (Blau), (Gelb), (Violett)\nDeutsch-LWL – Oursin · 9a · (Blau), Gelb, (Violett)\nMathe-LWL – Bay · OS2 · (Blau), (Gelb), (Violett)\n★ Ropeskipping – Hoffmann · Ausgang 5er-Nest\n★ Sportspiele – Pfeffer · Ausgang 5er-Nest","★ Deutsch – Brusda · 9b · Rot, Gelb, Violett\nEnglisch-LWL – Tsehaye · 9a · (Rot), Gelb, Violett, (Grün)\n★ Turnen (3.+4.) – Steinle · Foyer Sporthalle","Mathe-LWL – Bay · 9a · Blau, Grün","★ Englisch – Zwilling · 9b · Blau, Rot, Gelb, Grün\nMathe-LWL – Moser · 9a · Blau, (Rot), Gelb, (Grün)\n★ Sportchallenges – Steinle · Ausgang 5er-Nest"],["","","","","Englisch iPad-Übungen – Tsehaye · OS2 · Blau, Rot, Gelb, Violett, Grün"]]},
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
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA / Religion – Gronbach",
    "Ankommen · LA",
    "Ankommen · LA"
  ],
  [
    "LA",
    "Deutsch – Oursin · Sprachenraum",
    "Religion – Gronbach · Matheraum / LA",
    "LA",
    "LA"
  ],
  [
    "Englisch – Rock · Flexraum",
    "Mathe – Bay · Matheraum",
    "LA",
    "Mathe – Bay · Matheraum",
    "Englisch – Rock · Flexraum"
  ],
  [
    "Teamstunde Blau · 10a/b / sonst LA",
    "Französisch – Seyllan · Matheraum / LA",
    "Deutsch – Oursin · Sprachenraum",
    "LA",
    "LA"
  ],
  [
    "Kreativband / LA",
    "Französisch-LWL · LA",
    "Kreativband / LA",
    "Chor / Französisch · Flexraum / Kreativband / LA",
    "Kreativband / LA"
  ],
  [
    "Bläserklasse / Kreativband / LA",
    "Kreativband / LA",
    "Kreativband / LA",
    "",
    "Assembly"
  ],
  [
    "",
    "",
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
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA"
  ],
  [
    "Deutsch – Brusda · Sprachenraum",
    "Mathe – Moser · Matheraum",
    "Teamstunde Rot · Nawi / sonst LA",
    "Mathe – Moser · Matheraum",
    "LA"
  ],
  [
    "LA",
    "LA",
    "Religion – Gronbach · Matheraum / LA",
    "LA",
    "Englisch – Zwilling · Sprachenraum"
  ],
  [
    "LA",
    "Englisch – Zwilling · Sprachenraum",
    "Religion – Gronbach · Matheraum / LA",
    "Deutsch – Brusda · Sprachenraum",
    "Französisch – May fällt aus / LA"
  ],
  [
    "Kreativband / LA",
    "Französisch – Seyllan · Matheraum / Kreativband / LA",
    "Kreativband / LA",
    "Chor / Kreativband / LA",
    "Kreativband / LA"
  ],
  [
    "Bläserklasse / Kreativband / LA",
    "Französisch – May fällt aus / Kreativband / LA",
    "Kreativband / LA",
    "",
    "Assembly"
  ],
  [
    "",
    "",
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
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA"
  ],
  [
    "Teamstunde Gelb · 10a/b / sonst LA",
    "LA",
    "LA",
    "Deutsch – Bachmair · Sprachenraum",
    "LA"
  ],
  [
    "Deutsch – Bachmair · Sprachenraum",
    "Mathe – Bachmair · Flexraum",
    "Englisch – Tsehaye · Sprachenraum",
    "LA",
    "LA"
  ],
  [
    "Englisch – Tsehaye · Sprachenraum",
    "Französisch – Seyllan · Matheraum / LA",
    "LA",
    "Mathe – Bachmair · Matheraum",
    "LA"
  ],
  [
    "Kreativband / LA",
    "Französisch-LWL · LA",
    "Religion – Gronbach · Matheraum / Kreativband / LA",
    "Chor / Französisch · Flexraum / Kreativband / LA",
    "Kreativband / LA"
  ],
  [
    "Bläserklasse / Kreativband / LA",
    "Kreativband / LA",
    "Religion – Gronbach / Kreativband / LA",
    "",
    "Assembly"
  ],
  [
    "",
    "",
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
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA / Religion – Gronbach",
    "Ankommen · LA",
    "Ankommen · LA"
  ],
  [
    "Mathe – Vietinghoff · Matheraum",
    "LA",
    "Religion – Gronbach · Matheraum / LA",
    "LA",
    "Englisch – Schöne · Flexraum"
  ],
  [
    "LA",
    "Deutsch – Brusda · Sprachenraum",
    "Teamstunde Violett · Flexraum / sonst LA",
    "Deutsch – Brusda · Sprachenraum",
    "LA"
  ],
  [
    "Englisch – Schöne · Flexraum",
    "Französisch – Seyllan · Matheraum / LA",
    "LA",
    "LA",
    "Mathe – Vietinghoff · Matheraum"
  ],
  [
    "Kreativband / LA",
    "Französisch-LWL · LA",
    "Kreativband / LA",
    "Chor / Französisch · Flexraum / Kreativband / LA",
    "Kreativband / LA"
  ],
  [
    "Bläserklasse / Kreativband / LA",
    "Kreativband / LA",
    "Kreativband / LA",
    "",
    "Assembly"
  ],
  [
    "",
    "",
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
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA",
    "Ankommen · LA"
  ],
  [
    "Deutsch – Vogt · Flexraum",
    "Teamstunde Grün · Nawi / sonst LA",
    "LA",
    "Englisch – Rock · Flexraum",
    "LA"
  ],
  [
    "Mathe – Schnepf · Matheraum",
    "LA",
    "Religion – Gronbach · Matheraum / LA",
    "Deutsch – Vogt · Flexraum",
    "Mathe – Schnepf · Matheraum"
  ],
  [
    "LA",
    "Englisch – Rock · Flexraum",
    "Religion – Gronbach · Matheraum / LA",
    "Französisch – Seyllan · Flexraum / LA",
    "Französisch – May fällt aus / LA"
  ],
  [
    "Kreativband / LA",
    "Französisch – Seyllan · Matheraum / Kreativband / LA",
    "Kreativband / LA",
    "Chor / Kreativband / LA",
    "Kreativband / LA"
  ],
  [
    "Bläserklasse / Kreativband / LA",
    "Französisch – May fällt aus / Kreativband / LA",
    "Kreativband / LA",
    "",
    "Assembly"
  ],
  [
    "",
    "",
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
