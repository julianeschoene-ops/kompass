const CORE_SUBJECTS = ['Deutsch','Mathematik','Englisch'];
const WORKSHOP_SUBJECTS = ['Geographie','Geschichte','Informatik & Medienbildung','Bildende Kunst','Musik','Biologie','Physik','Technik','AES','WBS','Gemeinschaftskunde'];
const TEAMS = ['Blau','Rot','Gelb','Violett','Grün','Lila','Pink'];
const LEVELS = ['G','M','E'];
const DEFAULT_SCORE_CONFIG = { redMax:24, yellowMax:74 };
const CREATIVE_ROOMS = [
 {id:'room_garden',name:'Schulgarten',icon:'🌱',licenses:['Hochbeet-Führerschein','Aussaat-Führerschein','Kompost-Führerschein']},
 {id:'room_it',name:'IT-Studio',icon:'💻',licenses:['Scratch-Programmierschein','Micro:bit-Programmierschein','iPad-Basis']},
 {id:'room_cook',name:'Kochstudio',icon:'🍳',licenses:[]},
 {id:'room_sewing',name:'Nähstudio',icon:'🧵',licenses:['Nähmaschinenführerschein']},
 {id:'room_creative',name:'Kunstatelier',icon:'🎨',licenses:['Plotterführerschein','Textildruck-Führerschein']},
 {id:'room_music',name:'Musikatelier',icon:'🎵',licenses:['Keyboard-Basis','Cajón-Basis','Ukulele-Basis']},
 {id:'room_science',name:'Naturwissenschaftliches Labor',icon:'🧪',licenses:['Mikroskopführerschein','Laborführerschein','Experimentierführerschein']},
 {id:'room_tech',name:'Technikwerkstatt',icon:'🛠️',licenses:['Werkzeugführerschein','Bohrmaschinenführerschein','Lötführerschein']}
];
const PROJECT_TEMPLATES = [
 {id:'project_school',name:'Gemeinsam starten – Wir entdecken unsere Schule',labs:['GeoLab','MediaLab','TechLab','FutureFoodLab','HistoryLab','Bildende Kunst','Musik']},
 {id:'project_romans',name:'Die Römer vor unserer Haustür',labs:['HistoryLab','GeoLab','MediaLab','TechLab','FutureFoodLab','Bildende Kunst','Musik']},
 {id:'project_bread',name:'Vom Korn zum Brot',labs:['FutureFoodLab','GeoLab','MediaLab','TechLab','HistoryLab','Bildende Kunst','Musik']},
 {id:'project_hall',name:'Unsere Stadt Schwäbisch Hall – gestern, heute und morgen',labs:['HistoryLab','GeoLab','MediaLab','TechLab','FutureFoodLab','Bildende Kunst','Musik']}
];
const ENGLISH_5 = [
 ['Sprachliche Mittel – Wortschatz','U1','Ich kann Wörter über mich verstehen und benutzen.'],['Sprachliche Mittel – Wortschatz','U1','Ich kann Wörter aus dem Unterricht und zur Schule verstehen und anwenden.'],['Sprachliche Mittel – Wortschatz','U2','Ich kann Wörter zu Familie und Zuhause verstehen und benutzen.'],['Sprachliche Mittel – Wortschatz','U3','Ich kann Zahlen, Datum und Uhrzeit verstehen und sagen.'],['Sprachliche Mittel – Wortschatz','U3','Ich kann Wörter zu Freizeit und Alltag verstehen und benutzen.'],['Sprachliche Mittel – Wortschatz','U4','Ich kann Orts- und Zeitangaben verstehen und richtig benutzen.'],['Sprachliche Mittel – Wortschatz','U5','Ich kann Wörter zum Wetter und den Jahreszeiten benutzen.'],
 ['Sprachliche Mittel – Grammatik','U1','Ich kann Aufforderungen und Bitten höflich ausdrücken.'],['Sprachliche Mittel – Grammatik','U1','Ich kann Nomen im Singular und Plural anwenden.'],['Sprachliche Mittel – Grammatik','U1','Ich kann das Verb „to be“ und die Kurzformen richtig anwenden.'],['Sprachliche Mittel – Grammatik','U2','Ich kann den s-Genitiv sicher anwenden.'],['Sprachliche Mittel – Grammatik','U2','Ich kann einfache Sätze, Fragen und Verneinungen im Simple Present bilden.'],['Sprachliche Mittel – Grammatik','U5','Ich kann einfache Sätze im Simple Past bilden.'],
 ['Verstehen – Hörverstehen','U1','Ich kann kurze Anweisungen im Unterricht verstehen.'],['Verstehen – Hörverstehen','U1','Ich kann bekannte Wörter und Wendungen verstehen.'],['Verstehen – Hörverstehen','U3','Ich kann wichtige Informationen aus kurzen Hörtexten heraushören.'],['Verstehen – Hörverstehen','U4','Ich kann kurze Gespräche verstehen.'],['Verstehen – Hörverstehen','U5','Ich kann eine Reportage und Interviews verstehen.'],
 ['Verstehen – Leseverstehen','U1','Ich kann kurze Anleitungen und Erklärungen verstehen.'],['Verstehen – Leseverstehen','U1','Ich kann einfachen Texten Informationen entnehmen.'],['Verstehen – Leseverstehen','U2','Ich kann kurze Mitteilungen und Alltagstexte verstehen.'],['Verstehen – Leseverstehen','U2','Ich kann einen Lesetext verstehen.'],['Verstehen – Leseverstehen','U3','Ich kann kurze Szenen verstehen.'],['Verstehen – Leseverstehen','U4','Ich kann sagen, worum es in einem kurzen Text geht.'],['Verstehen – Leseverstehen','U5','Ich kann eine kurze Geschichte verstehen.'],
 ['Sprechen','U1','Ich kann begrüßen, mich verabschieden und vorstellen.'],['Sprechen','U1','Ich kann über meine Schule und meinen Unterricht sprechen.'],['Sprechen','U2','Ich kann über meine Familie sprechen und Fragen beantworten.'],['Sprechen','U2','Ich kann in Sätzen über mich und mein Zuhause sprechen.'],['Sprechen','U3','Ich kann über meinen Tagesablauf und meine Freizeit sprechen.'],['Sprechen','U4','Ich kann einen Weg beschreiben.'],['Sprechen','U5','Ich kann längere Gespräche über mein Umfeld führen.'],
 ['Schreiben','U1','Ich kann Wörter und kurze Sätze richtig schreiben.'],['Schreiben','U1','Ich kann über mich schreiben.'],['Schreiben','U2','Ich kann über meine Familie und mein Zuhause schreiben.'],['Schreiben','U2','Ich kann einfache Fragen schriftlich beantworten.'],['Schreiben','U3','Ich kann über meinen Alltag und meine Freizeit schreiben.'],
 ['Sprachmittlung','U1-M/E','Ich kann bekannte englische Wörter auf Deutsch beschreiben.'],['Sprachmittlung','U2','Ich kann kurze englische Aussagen auf Deutsch wiedergeben.'],['Sprachmittlung','U2','Ich kann einzelne bekannte deutsche Wörter auf Englisch sagen.'],['Sprachmittlung','U3','Ich kann einfache deutsche Aussagen auf Englisch wiedergeben.'],['Sprachmittlung','U4','Ich kann einfache Informationen für andere verständlich machen.']
];
function english5Competencies(){return ENGLISH_5.map((x,i)=>({id:'eng5_'+i,type:'core',year:5,sprint:null,subject:'Englisch',category:x[0],area:x[0],unit:x[1],level:'G/M/E',text:x[2],includeInLeb:true,order:(i+1)*10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''}));}

const DEUTSCH_7 = [
 ['Lesen / Literatur verstehen','LT1','Sachtext erschließen'],
 ['Lesen / Literatur verstehen','LT1','(Sach-)Text untersuchen (Merkmale Sachtext – literarischer Text)'],
 ['Lesen / Literatur verstehen','LT2','Sich und andere informieren'],
 ['Lesen / Literatur verstehen','LT3','Aufbau eines Argumentes verstehen'],
 ['Lesen / Literatur verstehen','LT4','Bericht erschließen / untersuchen'],
 ['Lesen / Literatur verstehen','LT5','Ballade erschließen / untersuchen'],
 ['Lesen / Literatur verstehen','LT5','Merkmale von Lyrik, Epik und Dramatik'],
 ['Lesen / Literatur verstehen','LT6','Jugendbuch erschließen / untersuchen'],
 ['Schreiben','LT1','Sachtext zusammenfassen'],
 ['Schreiben','LT2','Stichwortzettel'],
 ['Schreiben','LT3','Argument(e) formulieren'],
 ['Schreiben','LT4','Bericht verfassen'],
 ['Schreiben','LT5','Ballade zusammenfassen (Inhaltsangabe)'],
 ['Schreiben','LT5/6','Kreatives Schreiben – Ballade / Jugendbuch'],
 ['Rechtschreiben','LT1','Rechtschreibstrategien'],
 ['Rechtschreiben','LT2','Rechtschreibregeln'],
 ['Rechtschreiben','LT3','Zeichensetzung'],
 ['Rechtschreiben','','Texte überarbeiten'],
 ['Sprechen / Zuhören','LT2','Über Texte sprechen'],
 ['Sprechen / Zuhören','LT2','Inhalte präsentieren'],
 ['Sprechen / Zuhören','LT2','Adressatengerecht sprechen'],
 ['Sprechen / Zuhören','LT3','Aktiv zuhören'],
 ['Sprechen / Zuhören','LT3','Gesprächsregeln einhalten'],
 ['Sprechen / Zuhören','LT3','Argumentieren'],
 ['Sprechen / Zuhören','LT4','Über Ereignisse berichten'],
 ['Sprechen / Zuhören','LT5','Ballade (auswendig) vortragen'],
 ['Sprechen / Zuhören','','Texte flüssig vorlesen'],
 ['Sprechen / Zuhören','','Texte sinngestaltend vorlesen'],
 ['Sprache untersuchen','LT1','Wortarten'],
 ['Sprache untersuchen','LT2','Verben / Zeitformen'],
 ['Sprache untersuchen','LT3','Haupt- und Nebensätze'],
 ['Sprache untersuchen','LT4','Verben – aktiv / passiv'],
 ['Sprache untersuchen','LT5','Verben – indirekte Rede'],
 ['Sprache untersuchen','LT5','Reim, Strophe, Vers'],
 ['Sprache untersuchen','LT5/6','Sprachliche Bilder'],
 ['Sprache untersuchen','LT6','Feldermodell / Satzglieder']
];
function deutsch7Competencies(){return DEUTSCH_7.map((x,i)=>({id:'deu7_'+i,type:'core',year:7,sprint:null,subject:'Deutsch',category:x[0],area:x[0],unit:x[1],level:'G/M/E',text:x[2],includeInLeb:true,order:(i+1)*10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''}));}

const MATHEMATIK_7 = [
 ['Flächen und Flächeninhalte','K1','Ich kann Flächen erkennen und benennen.'],
 ['Flächen und Flächeninhalte','K2','Ich kann Vierecke mithilfe ihrer Eigenschaften beschreiben.'],
 ['Flächen und Flächeninhalte','K3','Ich kann den Umfang von Rechteck und Quadrat berechnen.'],
 ['Flächen und Flächeninhalte','K4','Ich kann Flächeninhalte miteinander vergleichen.'],
 ['Flächen und Flächeninhalte','K5','Ich kann Flächeninhalte umrechnen.'],
 ['Flächen und Flächeninhalte','K6','Ich kann den Flächeninhalt von Rechtecken und Quadraten berechnen.'],
 ['Körper','K1','Ich kann die Eigenschaften von Würfeln und Quadern beschreiben.'],
 ['Körper','K2','Ich kann Schrägbilder von Quadern und Würfeln zeichnen.'],
 ['Körper','K3','Ich kann Netze von Quadern und Würfeln zeichnen.'],
 ['Körper','K4','Ich kann den Oberflächeninhalt von Quadern und Würfeln berechnen.'],
 ['Körper','K5','Ich kann ein Volumen in andere Einheiten umrechnen.'],
 ['Körper','K6','Ich kann das Volumen von Quadern und Würfeln berechnen.'],
 ['Zuordnungen','K1','Ich kann eine Zuordnung mit einer Tabelle darstellen und angeben, welche Größen einander zugeordnet werden.'],
 ['Zuordnungen','K2','Ich kann Werte aus einem Pfeildiagramm ablesen und eine Zuordnung mit einem Text darstellen.'],
 ['Zuordnungen','K3','Ich kann entscheiden und begründen, ob eine Zuordnung proportional ist.'],
 ['Zuordnungen','K4','Ich kann fehlende Werte für eine proportionale Zuordnung berechnen.'],
 ['Zuordnungen','K5','Ich kann Sachaufgaben mit dem Dreisatz für proportionale Zuordnungen lösen.'],
 ['Zuordnungen – Erweiterung','K1','Ich kann entscheiden und begründen, ob eine Zuordnung proportional ist.'],
 ['Zuordnungen – Erweiterung','K2','Ich kann Sachaufgaben mit dem Dreisatz für proportionale Zuordnungen lösen.'],
 ['Zuordnungen – Erweiterung','K3','Ich kann entscheiden und begründen, ob eine Zuordnung antiproportional ist.'],
 ['Zuordnungen – Erweiterung','K4','Ich kann Sachaufgaben mit dem Dreisatz für antiproportionale Zuordnungen lösen.'],
 ['Zuordnungen – Erweiterung','K5','Ich kann ein Weg-Zeit-Diagramm ergänzen und als Text darstellen.'],
 ['Winkel','K1','Ich kann Winkel mit Fachbegriffen beschriften.'],
 ['Winkel','K2','Ich kenne die verschiedenen Winkelarten.'],
 ['Winkel','K3','Ich kann Winkelgrößen schätzen und messen.'],
 ['Winkel','K4','Ich kann Winkel zeichnen.'],
 ['Dreiecke und Vierecke','K1','Ich kann die Größen von Neben-, Scheitel-, Stufen- und Wechselwinkeln bestimmen, ohne zu messen.'],
 ['Dreiecke und Vierecke','K2','Ich kann eine fehlende Winkelgröße in einem Dreieck oder einem Viereck mit dem Winkelsummensatz berechnen.'],
 ['Dreiecke und Vierecke','K3','Ich kann Dreiecke nach Winkelarten und Seitenlängen benennen.'],
 ['Dreiecke und Vierecke','K4','Ich kann Mittelsenkrechten konstruieren.'],
 ['Dreiecke und Vierecke','K5','Ich kann Winkelhalbierende konstruieren.'],
 ['Dreiecke und Vierecke','K6','Ich kann Vierecksarten unterscheiden und ihre Eigenschaften nennen.'],
 ['Rationale Zahlen','K1','Ich kann rationale Zahlen auf der Zahlengeraden ablesen und eintragen.'],
 ['Rationale Zahlen','K2','Ich kann rationale Zahlen ordnen und vergleichen.'],
 ['Rationale Zahlen','K3','Ich kann Punkte im erweiterten Koordinatensystem ablesen und eintragen.'],
 ['Rationale Zahlen','K4','Ich kann anschaulich mit rationalen Zahlen rechnen und Sachaufgaben lösen.'],
 ['Rationale Zahlen','K5','Ich kann rationale Zahlen addieren und subtrahieren.'],
 ['Rationale Zahlen','K6','Ich kann rationale Zahlen multiplizieren.'],
 ['Rationale Zahlen','K7','Ich kann rationale Zahlen dividieren.'],
 ['Terme und Gleichungen','K1','Ich kann den Wert eines Terms berechnen.'],
 ['Terme und Gleichungen','K2','Ich kann Terme mit Variablen aufstellen.'],
 ['Terme und Gleichungen','K3','Ich kann Terme durch Addieren und Subtrahieren vereinfachen.'],
 ['Terme und Gleichungen','K4','Ich kann Terme durch Auflösen von Klammern vereinfachen.'],
 ['Terme und Gleichungen','K5','Ich kann Gleichungen durch Probieren lösen.'],
 ['Terme und Gleichungen','K6','Ich kann Gleichungen durch Äquivalenzumformungen lösen.'],
 ['Terme und Gleichungen','K7','Ich kann Sachaufgaben mit dem Sechsschritt-Verfahren lösen.']
];
function mathematik7Competencies(){return MATHEMATIK_7.map((x,i)=>({id:'mat7_'+i,type:'core',year:7,sprint:null,subject:'Mathematik',category:x[0],area:x[0],unit:x[1],level:'G/M/E',text:x[2],includeInLeb:true,order:(i+1)*10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''}));}

function seedTeamColor(t){const x=String(t||'').toLowerCase();if(x.includes('blau'))return'blue';if(x.includes('rot')||x.includes('pink'))return'rose';if(x.includes('gelb'))return'amber';if(x.includes('lila')||x.includes('violett'))return'violet';return'mint';}
const SEED = {
 version:'8.3.4', subjects:[...WORKSHOP_SUBJECTS], coreSubjects:[...CORE_SUBJECTS], projectTemplates:PROJECT_TEMPLATES, creativeRooms:CREATIVE_ROOMS,
 sprints:[1,2,3,4,5].flatMap(n=>[5,6,7].map(y=>({id:`s${y}_${n}`,year:y,number:n,name:n===1?'Gemeinsam starten':`Sprint ${n}`,projectId:n===1?'project_school':'',startDate:'',endDate:''}))),
 pupils:[],
 competencies:[...english5Competencies(),...deutsch7Competencies(),...mathematik7Competencies(),
 {id:'w_school_geo',type:'workshop',year:5,sprint:1,projectId:'project_school',phase:'base',lab:'GeoLab',subject:'Geographie',category:'Orientierung',area:'Orientierung',level:'G/M/E',text:'Ich kann Lagepläne und Karten nutzen, um mich sicher zu orientieren.',includeInLeb:true,order:10,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
 {id:'w_school_media',type:'workshop',year:5,sprint:1,projectId:'project_school',phase:'base',lab:'MediaLab',subject:'Informatik & Medienbildung',category:'Digitale Werkzeuge',area:'Digitale Werkzeuge',level:'G/M/E',text:'Ich kann digitale Werkzeuge zur Recherche, Dokumentation und Präsentation verantwortungsvoll nutzen.',includeInLeb:true,order:20,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
 {id:'w_school_history',type:'workshop',year:5,sprint:1,projectId:'project_school',phase:'base',lab:'HistoryLab',subject:'Geschichte',category:'Quellen',area:'Quellen',level:'G/M/E',text:'Ich kann Informationen aus einfachen historischen Quellen gewinnen und dokumentieren.',includeInLeb:true,order:30,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
 {id:'w_school_art',type:'workshop',year:5,sprint:1,projectId:'project_school',phase:'base',lab:'Bildende Kunst',subject:'Bildende Kunst',category:'Gestaltung',area:'Gestaltung',level:'G/M/E',text:'Ich kann Informationen übersichtlich visualisieren und Lernprodukte adressatengerecht gestalten.',includeInLeb:true,order:40,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''},
 {id:'w_school_music',type:'workshop',year:5,sprint:1,projectId:'project_school',phase:'base',lab:'Musik',subject:'Musik',category:'Präsentation',area:'Präsentation',level:'G/M/E',text:'Ich kann musikalische oder auditive Elemente für eine gemeinsame Präsentation gestalten.',includeInLeb:true,order:50,maxPoints:null,scoreConfig:{...DEFAULT_SCORE_CONFIG},note:''}
 ]
};
