const SEED = {
  sprints: [
    {year:5, number:1, name:'Forschersonne'},
    {year:5, number:2, name:'Meine Schule'},
    {year:5, number:3, name:'Ägypten'},
    {year:5, number:4, name:'Schwäbisch Hall'},
    {year:5, number:5, name:'Sprint 5'},
    {year:6, number:1, name:'Sprint 1'},
    {year:6, number:2, name:'Sprint 2'},
    {year:6, number:3, name:'Sprint 3'},
    {year:6, number:4, name:'Sprint 4'},
    {year:6, number:5, name:'Sprint 5'},
    {year:7, number:1, name:'Sprint 1'},
    {year:7, number:2, name:'Sprint 2'},
    {year:7, number:3, name:'Sprint 3'},
    {year:7, number:4, name:'Sprint 4'},
    {year:7, number:5, name:'Sprint 5'}
  ],
  subjects: ['Geographie','Geschichte','Informatik & Medienbildung','BK','Musik'],
  pupils: [
    {id:'breit_anne', first:'Anne', last:'Breit', short:'Anne B.', className:'5d', team:'Violett', color:'d', coach:'J.S.', level:'M'},
    {id:'butsch_jolina', first:'Jolina', last:'Butsch', short:'Jolina B.', className:'5c', team:'Gelb', color:'c', coach:'N.O.', level:'G'},
    {id:'ebert_lio', first:'Lio', last:'Ebert', short:'Lio E.', className:'5d', team:'Violett', color:'d', coach:'J.S.', level:'M'},
    {id:'guemez_ela', first:'Ela', last:'Gülmez', short:'Ela G.', className:'5a', team:'Blau', color:'a', coach:'C.S.', level:'G'},
    {id:'held_sita', first:'Sita', last:'Held', short:'Sita H.', className:'5d', team:'Violett', color:'d', coach:'N.O.', level:'M'},
    {id:'hilkert_emma', first:'Emma', last:'Hilkert', short:'Emma H.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'G'},
    {id:'kabar_kudret', first:'Kudret', last:'Kabar', short:'Kudret K.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'G'},
    {id:'lenz_mikka', first:'Mikka', last:'Lenz', short:'Mikka L.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'M'},
    {id:'ley_emilia', first:'Emilia', last:'Ley', short:'Emilia L.', className:'5c', team:'Gelb', color:'c', coach:'J.S.', level:'M'},
    {id:'mamaev_elisey', first:'Elisey', last:'Mamaev', short:'Elisey M.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'G'},
    {id:'marschak_maksym', first:'Maksym', last:'Marschak', short:'Maksym M.', className:'5c', team:'Gelb', color:'c', coach:'C.S.', level:'G'},
    {id:'merkle_delisha', first:'Delisha', last:'Merkle', short:'Delisha M.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'M'},
    {id:'nwmamadu_juliet', first:'Juliet', last:'Nwmamadu', short:'Juliet N.', className:'5a', team:'Blau', color:'a', coach:'J.S.', level:'G'},
    {id:'orlamuender_elias', first:'Elias', last:'Orlamünder', short:'Elias O.', className:'5a', team:'Blau', color:'a', coach:'C.S.', level:'M'},
    {id:'pazarcikli_elif', first:'Elif', last:'Pazarcikli', short:'Elif P.', className:'5e', team:'Grün', color:'e', coach:'N.O.', level:'M'},
    {id:'preussler_finn', first:'Finn-Luca', last:'Preussler', short:'Finn-Luca P.', className:'5a', team:'Blau', color:'a', coach:'J.S.', level:'G'},
    {id:'sieger_david', first:'David', last:'Sieger', short:'David S.', className:'5b', team:'Rot', color:'b', coach:'C.S.', level:'M'},
    {id:'strobel_aurel', first:'Aurel', last:'Strobel', short:'Aurel S.', className:'5c', team:'Gelb', color:'c', coach:'N.O.', level:'E'},
    {id:'sulejmani_fiona', first:'Fiona', last:'Sulejmani', short:'Fiona S.', className:'5c', team:'Gelb', color:'c', coach:'J.S.', level:'M'},
    {id:'tudor_andreas', first:'Andreas Ion', last:'Tudor', short:'Andreas T.', className:'5c', team:'Gelb', color:'c', coach:'C.S.', level:'G'},
    {id:'ujuma_antonia', first:'Antonia-Andrea-Izabela', last:'Ujuma', short:'Antonia U.', className:'5a', team:'Blau', color:'a', coach:'N.O.', level:'M'},
    {id:'weiss_mia', first:'Mia', last:'Weiss', short:'Mia W.', className:'5a', team:'Blau', color:'a', coach:'J.S.', level:'G'},
    {id:'woitke_lotta', first:'Lotta', last:'Woitke', short:'Lotta W.', className:'5d', team:'Violett', color:'d', coach:'C.S.', level:'M'},
    {id:'wolbert_ida', first:'Ida', last:'Wolbert', short:'Ida W.', className:'5d', team:'Violett', color:'d', coach:'N.O.', level:'M'},
    {id:'zimmermann_emma', first:'Emma', last:'Zimmermann', short:'Emma Z.', className:'5c', team:'Gelb', color:'c', coach:'J.S.', level:'G'}
  ],
  competencies: [
    {id:'geo_s2_orientierung', year:5, sprint:2, subject:'Geographie', area:'Orientierung', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann wichtige Orte auf dem Schulgelände mithilfe eines Plans lokalisieren.'},
    {id:'geo_s2_weg', year:5, sprint:2, subject:'Geographie', area:'Orientierung', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Wege auf dem Schulgelände verständlich beschreiben.'},
    {id:'gesch_s2_frueher', year:5, sprint:2, subject:'Geschichte', area:'Schule früher und heute', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Schule früher und heute vergleichen.'},
    {id:'imb_s2_recherche', year:5, sprint:2, subject:'Informatik & Medienbildung', area:'Digitale Schule', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Informationen gezielt recherchieren und Quellen angeben.'},
    {id:'bk_s2_plan', year:5, sprint:2, subject:'BK', area:'Gestaltung', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann einen übersichtlichen Lageplan gestalten.'},
    {id:'musik_s2_schulleben', year:5, sprint:2, subject:'Musik', area:'Musik im Schulleben', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Musik im Schulleben bewusst wahrnehmen und beschreiben.'},

    {id:'geo_s3_karte', year:5, sprint:3, subject:'Geographie', area:'Ägypten', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Ägypten räumlich einordnen und auf Karten lokalisieren.'},
    {id:'geo_s3_klima', year:5, sprint:3, subject:'Geographie', area:'Ägypten', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Zusammenhänge zwischen Klima, Landschaft und Leben am Nil beschreiben.'},
    {id:'gesch_s3_nil', year:5, sprint:3, subject:'Geschichte', area:'Hochkultur', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann erklären, warum der Nil für das Alte Ägypten wichtig war.'},
    {id:'gesch_s3_hoch', year:5, sprint:3, subject:'Geschichte', area:'Hochkultur', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Merkmale einer Hochkultur beschreiben.'},
    {id:'imb_s3_praes', year:5, sprint:3, subject:'Informatik & Medienbildung', area:'Präsentation', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Arbeitsergebnisse digital strukturieren und präsentieren.'},
    {id:'bk_s3_symbol', year:5, sprint:3, subject:'BK', area:'Gestaltung', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann ägyptische Motive gestalterisch aufnehmen und bewusst einsetzen.'},
    {id:'musik_s3_klang', year:5, sprint:3, subject:'Musik', area:'Klang', level:'G/M/E', kind:'fach', includeInLeb:true, text:'Ich kann Klangwirkungen beschreiben und für eine Präsentation nutzen.'},

    {id:'prozess_planen', year:5, sprint:null, subject:'Prozess', area:'Selbstorganisation', level:'G/M/E', kind:'prozess', includeInLeb:true, text:'Ich plane und organisiere meine Arbeit.'},
    {id:'prozess_team', year:5, sprint:null, subject:'Prozess', area:'Zusammenarbeit', level:'G/M/E', kind:'prozess', includeInLeb:true, text:'Ich arbeite konstruktiv im Team.'},
    {id:'prozess_problem', year:5, sprint:null, subject:'Prozess', area:'Problemlösen', level:'G/M/E', kind:'prozess', includeInLeb:true, text:'Ich entwickle Lösungsstrategien und setze sie um.'},
    {id:'prozess_reflexion', year:5, sprint:null, subject:'Prozess', area:'Reflexion', level:'G/M/E', kind:'prozess', includeInLeb:true, text:'Ich überprüfe und verbessere meine Arbeit.'},
    {id:'prozess_praes', year:5, sprint:null, subject:'Prozess', area:'Kommunikation', level:'G/M/E', kind:'prozess', includeInLeb:true, text:'Ich stelle Ergebnisse verständlich dar.'}
  ],
  phraseBank: {
    fach: {
      red: ['benötigt dabei noch Unterstützung', 'zeigt hierbei noch Entwicklungsbedarf', 'gelingt dies noch nicht sicher'],
      yellow: ['gelingt dies teilweise', 'zeigt dabei erste sichere Ansätze', 'gelingt dies in Grundzügen'],
      green: ['gelingt dies sicher', 'setzt diese Kompetenz zuverlässig um', 'wendet dies selbstständig an']
    },
    prozess: {
      red: ['benötigt hierbei noch klare Unterstützung', 'zeigt in diesem Bereich noch Entwicklungsbedarf', 'gelingt dies noch nicht durchgängig'],
      yellow: ['gelingt dies zunehmend', 'zeigt hierbei bereits Ansätze', 'gelingt dies in vielen Situationen'],
      green: ['gelingt dies zuverlässig', 'setzt dies selbstständig um', 'zeigt dies sicher und beständig']
    }
  }
};
