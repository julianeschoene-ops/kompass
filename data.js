const CORE_SUBJECTS = ['Deutsch','Mathematik','Englisch'];
const WORKSHOP_SUBJECTS = ['Geographie','Geschichte','Informatik & Medienbildung','BK','Musik'];
const TEAMS = ['Blau','Rot','Gelb','Violett','Grün'];
const LEVELS = ['G','M','E'];
const DEFAULT_SCORE_CONFIG = { redMax:24, yellowMax:74 };

const SEED = {
  version:'4.1',
  subjects:[...WORKSHOP_SUBJECTS],
  coreSubjects:[...CORE_SUBJECTS],
  sprints:[
    {id:'s5_1',year:5,number:1,name:'Ankommen',startDate:'',endDate:''},
    {id:'s5_2',year:5,number:2,name:'Ägypten / Schwäbisch Hall',startDate:'',endDate:''},
    {id:'s5_3',year:5,number:3,name:'Natur und Technik',startDate:'',endDate:''},
    {id:'s5_4',year:5,number:4,name:'Europa',startDate:'',endDate:''},
    {id:'s5_5',year:5,number:5,name:'Projektabschluss',startDate:'',endDate:''},
    {id:'s6_1',year:6,number:1,name:'Sprint 1',startDate:'',endDate:''},
    {id:'s6_2',year:6,number:2,name:'Sprint 2',startDate:'',endDate:''},
    {id:'s6_3',year:6,number:3,name:'Sprint 3',startDate:'',endDate:''},
    {id:'s6_4',year:6,number:4,name:'Sprint 4',startDate:'',endDate:''},
    {id:'s6_5',year:6,number:5,name:'Sprint 5',startDate:'',endDate:''},
    {id:'s7_1',year:7,number:1,name:'Sprint 1',startDate:'',endDate:''},
    {id:'s7_2',year:7,number:2,name:'Sprint 2',startDate:'',endDate:''},
    {id:'s7_3',year:7,number:3,name:'Sprint 3',startDate:'',endDate:''},
    {id:'s7_4',year:7,number:4,name:'Sprint 4',startDate:'',endDate:''},
    {id:'s7_5',year:7,number:5,name:'Sprint 5',startDate:'',endDate:''}
  ],
  pupils:[
    {id:'p_asma_a',first:'Asma',last:'Alshlash',short:'Asma A.',className:'5d',team:'Violett',color:'violet',coach:'J.S.'},
    {id:'p_mikka_l',first:'Mikka',last:'Lent',short:'Mikka L.',className:'5a',team:'Blau',color:'blue',coach:'P.M.'},
    {id:'p_rabija_k',first:'Rabija',last:'Krasniqi',short:'Rabija K.',className:'5d',team:'Violett',color:'violet',coach:'J.S.'},
    {id:'p_semih_k',first:'Semih',last:'Krasniqi',short:'Semih K.',className:'5d',team:'Violett',color:'violet',coach:'J.S.'},
    {id:'p_lotta_m',first:'Lotta',last:'Müller',short:'Lotta M.',className:'5b',team:'Gelb',color:'yellow',coach:'C.B.'},
    {id:'p_lio_s',first:'Lio',last:'Schneider',short:'Lio S.',className:'5d',team:'Violett',color:'violet',coach:'J.S.'}
  ],
  competencies:[
    {id:'w_geo_5_2_1',type:'workshop',year:5,sprint:2,subject:'Geographie',category:'Orientierung',area:'Orientierung',level:'G/M/E',text:'Ich kann Informationen aus Karten entnehmen und einfache geografische Zusammenhänge beschreiben.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'w_ges_5_2_1',type:'workshop',year:5,sprint:2,subject:'Geschichte',category:'Zeit und Wandel',area:'Zeit und Wandel',level:'G/M/E',text:'Ich kann wichtige Informationen zu einem historischen Thema sammeln und geordnet darstellen.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'w_inf_5_2_1',type:'workshop',year:5,sprint:2,subject:'Informatik & Medienbildung',category:'Medienprodukt',area:'Medienprodukt',level:'G/M/E',text:'Ich kann digitale Werkzeuge sinnvoll nutzen und Ergebnisse übersichtlich gestalten.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'p_org_5',type:'process',year:5,sprint:null,subject:'Prozess',category:'Selbstorganisation',area:'Selbstorganisation',level:'G/M/E',text:'Ich kann Material, Zeit und Aufgaben zunehmend selbstständig organisieren.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'c_eng_vocab_5',type:'core',year:5,sprint:null,subject:'Englisch',category:'Wortschatz',area:'Wortschatz',level:'G/M/E',text:'Ich kann bekannten Wortschatz zu Alltag und Freizeit verstehen und passend verwenden.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'c_eng_grammar_5',type:'core',year:5,sprint:null,subject:'Englisch',category:'Grammatik',area:'Grammatik',level:'G/M/E',text:'Ich kann einfache grammatische Strukturen in Sätzen anwenden.',includeInLeb:true,order:20,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'c_de_read_5',type:'core',year:5,sprint:null,subject:'Deutsch',category:'Lesen',area:'Lesen',level:'G/M/E',text:'Ich kann altersgemäße Texte lesen, Informationen entnehmen und wiedergeben.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
    {id:'c_math_numbers_5',type:'core',year:5,sprint:null,subject:'Mathematik',category:'Zahlen und Rechnen',area:'Zahlen und Rechnen',level:'G/M/E',text:'Ich kann Grundrechenarten sicher anwenden und Rechenwege nachvollziehbar darstellen.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''}
  ]
};
