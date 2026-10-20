// Raumbelegung Stufe 6 – aus der vorliegenden sieben-seitigen Raumübersicht.
// Zellen sind unabhängig editierbar; Daten liegen im gemeinsamen KOMPASS-Cloudzustand.
const ROOM_DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const ROOM_TIMES=['7.40–8.25','8.25–9.10','9.30–10.15','10.15–11.00','11.20–12.05','12.05–12.50','13.00–13.45','13.50–14.35','14.35–15.20'];
const ROOM_SEED={
'Lernatelier 1':[
['Oursin','Rock','Rock','Rock','Team blau mitbetreuen'],
['Oursin*','Rock','Oursin','Oursin','Schnepf'],
['Oursin','Schnepf','Oursin','(Schöne)','Mitbetreuung'],
['Mitbetreuung','Schnepf','Schöne','Mitbetreuung','Rock'],
['Mitbetreuung','Mitbetreuung','Mitbetreuung','Teamstunde','(Schöne)'],
['Schnepf*','Mitbetreuung','Mitbetreuung','','Assembly']],
'Lernatelier 2':[
['Zwilling','Moser','Zwilling','Moser','Zwilling'],
['Mitbetreuung','Zwilling','Mitbetreuung','Tsehaye','Zwilling*'],
['Zwilling','Moser','Zwilling','Tsehaye','Tsehaye*'],
['Zwilling*','Tsehaye','Zwilling','Mitbetreuung','Tsehaye'],
['Tsehaye*','Tsehaye*','Tsehaye*','Teamstunde','Moser'],
['Tsehaye*','Tsehaye*','Moser','','Assembly']],
'Lernatelier 3':[
['Bachmair','Bachmair','Bachmair','Bachmair','Bachmair'],
['Mitbetreuung','Bachmair','Bachmair','Vogt','Bachmair*'],
['Vogt','Vogt','Bachmair','Mitbetreuung','Brusda*'],
['Bachmair','Brusda','Bachmair','Vogt*','Brusda'],
['Brusda*','Vogt*','Brusda*','Teamstunde','Brusda'],
['Mitbetreuung','Vogt*','Brusda*','','Assembly']],
'Flexraum':[
['Ankommen (Schöne)','Ankommen (Brusda)','Ankommen (Schöne)','Ankommen (Brusda)','Ankommen (Brusda)'],
['Deutsch – Vogt, grün','','Englisch – Schöne, flex','Englisch – Rock, grün','Mathe – Moser, flex'],
['Englisch – Rock, blau','Mathe – Bachmair, gelb','TS violett – Schöne/Brusda','Deutsch – Vogt, grün',''],
['Englisch – Schöne, violett','Englisch – Rock, grün','','Englisch – Schöne, violett','Englisch – Rock, blau'],
['','','','Teamzeit (bunt)',''],['','','','',''],
['','','','Werkstattunterricht (Zugang)',''],
['Werkstattunterricht (Zugang)','Werkstattunterricht (Zugang)','','Werkstattunterricht (Zugang)',''],
['Werkstattunterricht (Zugang)','Werkstattunterricht (Zugang)','','Werkstattunterricht (Zugang)','']],
'Sprachenraum':[
['Ankommen (Vogt)','Ankommen (Schnepf)','Ankommen (Vogt)','Ankommen (Vogt)','Ankommen (Schnepf)'],
['Deutsch – Brusda, rot','Deutsch – Oursin, blau','Deutsch – Vogt, flex','Deutsch – Bachmair, gelb','(Coach)'],
['Deutsch – Bachmair, gelb','Deutsch – Brusda, violett','Englisch – Tsehaye, gelb','Deutsch – Brusda, violett','Englisch – Zwilling, rot'],
['Englisch – Tsehaye, gelb','Englisch – Zwilling, rot','Deutsch – Oursin, blau','Deutsch – Brusda, rot','Franz. 2 – May'],
['(Coach)','Franz. 2 – May','(Coach)','','(Coach)'],
['(Coach)','Franz. 2 – May','(Coach)','',''],
['','','','Werkstattunterricht',''],
['Werkstattunterricht','Werkstattunterricht','','Werkstattunterricht',''],
['Werkstattunterricht','Werkstattunterricht','','Werkstattunterricht','']],
'Matheraum':[
['','','Religion (blau, violett)','',''],
['Mathe – Vietinghoff, violett','Mathe – Moser, rot','Religion (blau, violett)','Mathe – Moser, rot','Mathe – Schnepf, grün'],
['Mathe – Schnepf, grün','Mathe – Bay, blau','Religion (rot, grün)','Mathe – Bay, blau','Mathe – Vietinghoff, flex'],
['Mathe – Schnepf, flex','Franz. 1 – Seyllan','Religion (rot, grün)','Mathe – Bachmair, gelb','Mathe – Vietinghoff, violett'],
['(Coach)','Franz. 1 – Seyllan','Religion (gelb)','Franz. 1','(Coach)'],
['(Coach)','(Coach)','Religion (gelb)','',''],
['','','','Werkstattunterricht',''],
['Werkstattunterricht','Werkstattunterricht','','Werkstattunterricht',''],
['Werkstattunterricht','Werkstattunterricht','','Werkstattunterricht','']],
'Weitere Räume':[
['','','','',''],
['10a: Teamstunde gelb; 10b: Teamstunde gelb (Bachmair/Tsehaye)','Nawi 1: TS grün; Nawi 2: TS grün (Vogt/Schnepf)','Nawi 2 / Nawi 5: TS rot (Zwilling/Moser)','',''],
['10a: Engl. flex – Tsehaye; 10b: Ma. flex – Vietinghoff','OS1: De. flex – Oursin; OS2: Ma. flex – Vietinghoff','Nawi 2: Ma. flex – Moser','9a: De. flex – Oursin',''],
['10a: Teamstunde blau; 10b: Teamstunde blau (Oursin/Rock)','OS1: De. flex – Bachmair; OS2: Ma. flex – Bay','9a: Engl. flex – Tsehaye; 9b: De. flex – Brusda','9a: Ma. flex – Bay','9a: Ma. flex – Moser; 9b: Engl. flex – Tsehaye'],
['','','','','OS2: Engl. flex – Tsehaye'],
['','','','',''],['','','','',''],
['Werkstattunterricht: COMP 2, Marktplatz','Werkstattunterricht: COMP 2, Marktplatz','','Werkstattunterricht: COMP 2, Marktplatz',''],
['Werkstattunterricht: COMP 2, Marktplatz','Werkstattunterricht: COMP 2, Marktplatz','','Werkstattunterricht: COMP 2, Marktplatz','']]
};
let roomSelected='Lernatelier 1';
let roomLevelOpen=false;
let roomCategory='Räume';
const ROOM_CATEGORIES={
'Räume':['Lernatelier 1','Lernatelier 2','Lernatelier 3','Flexraum','Sprachenraum','Matheraum','Weitere Räume'],
'Teamstundenpläne':['Teamstundenplan Blau','Teamstundenplan Rot','Teamstundenplan Gelb','Teamstundenplan Violett','Teamstundenplan Grün'],
'Unterricht & Angebote':['Flexstunden Stufe 6','Kreativband Stufe 5–7','Bläserklasse Stufe 6'],
'Aufsicht':['Pausenaufsicht']
};
function roomData(){return Store.data.roomOccupancy||ROOM_SEED}
function roomSelectCategory(category){roomCategory=category;roomSelected=ROOM_CATEGORIES[category][0];render()}
function roomSelectPlan(plan){roomSelected=plan;render()}
function roomOccupancy(){
 const editable=Auth.isAdmin();
 const intro=header('Raum- & Wochenpläne','Gemeinsame Übersichten · '+(editable?'Bearbeitung durch Admins':'Nur Lesezugriff'));
 const level='<div class="card" style="margin-bottom:14px"><button class="chip '+(roomLevelOpen?'dark':'')+'" onclick="roomLevelOpen=!roomLevelOpen;render()">▸ Stufe 6 '+(roomLevelOpen?'▾':'▸')+'</button></div>';
 if(!roomLevelOpen){shell(intro+level);return;}
 const categories='<div class="toolbar" style="flex-wrap:wrap;gap:8px;margin-bottom:12px">'+Object.keys(ROOM_CATEGORIES).map(c=>'<button class="chip '+(roomCategory===c?'dark':'')+'" onclick="roomSelectCategory('+JSON.stringify(c).replace(/"/g,'&quot;')+')">'+esc(c)+'</button>').join('')+'</div>';
 const rooms=ROOM_CATEGORIES[roomCategory],all=roomData(),extra=EXTRA_PLANS[roomSelected],rows=all[roomSelected]||extra?.rows||ROOM_SEED[roomSelected]||[],times=extra?.times||ROOM_TIMES;
 const buttons='<div class="toolbar" style="flex-wrap:wrap;gap:8px">'+rooms.map(r=>'<button class="chip '+(r===roomSelected?'dark':'')+'" onclick="roomSelectPlan('+JSON.stringify(r).replace(/"/g,'&quot;')+')">'+esc(r)+'</button>').join('')+'</div>';
 const colorMap={blau:'#dbeafe',rot:'#fee2e2',gelb:'#fef9c3',violett:'#ede9fe',gruen:'#dcfce7'};
 const teamBg=extra?.teamColor?colorMap[extra.teamColor]:null;
 const isTeam=Boolean(extra?.teamColor);
 const isFlexible=roomSelected==='Flexstunden Stufe 6'||roomSelected==='Kreativband Stufe 5–7'||roomSelected==='Bläserklasse Stufe 6';
 const firstLabel=extra?.label||'Stunde';
 const table='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;table-layout:fixed;min-width:780px"><thead><tr><th style="width:130px;padding:12px;background:'+(teamBg||'#f1f5f9')+'">'+esc(firstLabel)+'</th>'+ROOM_DAYS.map(d=>'<th style="padding:12px;background:'+(teamBg||'#f1f5f9')+'">'+d+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,h)=>'<tr><th style="border:1px solid #ddd;padding:10px;vertical-align:top;background:#f8fafc">'+(extra?esc(times[h]||''):((h+1)+'. Stunde<div class="mini">'+esc(times[h]||'')+'</div>'))+'</th>'+ROOM_DAYS.map((d,i)=>{const value=String(row[i]||'');const content=editable?'<textarea aria-label="'+d+', '+(h+1)+'. Zeile" rows="'+Math.max(2,Math.ceil(value.length/21))+'" style="display:block;width:100%;min-height:74px;box-sizing:border-box;border:0;background:transparent;resize:vertical;font:inherit;line-height:1.4;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere" oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onchange="roomSave('+h+','+i+',this.value)">'+esc(value)+'</textarea>':'<div style="min-height:58px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4;padding:7px">'+esc(value)+'</div>';return '<td style="border:1px solid #ddd;padding:6px;vertical-align:top;'+(isTeam?'background:'+((h===0)?teamBg:'#fff')+';':'')+'">'+content+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
 shell(intro+level+'<div class="card">'+categories+buttons+'</div><div class="card" style="'+(teamBg?'border-top:6px solid '+teamBg+';':'')+'"><h2>'+esc(roomSelected)+'</h2>'+(extra?.note?'<p class="mini">'+esc(extra.note)+'</p>':'')+table+'<p class="mini">'+(editable?'Einträge bearbeiten: Speicherung beim Verlassen des Feldes. ':'')+(isFlexible?'Längere Einträge werden vollständig angezeigt.':'')+'</p></div>');
}
function roomSave(hour,day,value){
 if(!Auth.isAdmin())return;
 if(!Store.data.roomOccupancy)Store.data.roomOccupancy=JSON.parse(JSON.stringify(ROOM_SEED));
 if(!Store.data.roomOccupancy[roomSelected])Store.data.roomOccupancy[roomSelected]=JSON.parse(JSON.stringify(EXTRA_PLANS[roomSelected]?.rows||ROOM_SEED[roomSelected]));
 Store.data.roomOccupancy[roomSelected][hour][day]=String(value);
 Store.save();toast();
}
