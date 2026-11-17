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
let roomLevelOpen=true;
let roomCategory='Räume';
const ROOM_CATEGORIES={
'Räume':['Lernatelier 1','Lernatelier 2','Lernatelier 3','Flexraum','Sprachenraum','Matheraum','Weitere Räume'],
'Teamstundenpläne':['Teamstundenplan Blau','Teamstundenplan Rot','Teamstundenplan Gelb','Teamstundenplan Violett','Teamstundenplan Grün'],
'Unterricht & Angebote':['Flexstunden Stufe 6','Kreativband Stufe 5–7','Bläserklasse Stufe 6'],
'Lehrkräfte':['Lehrkraft Bachmair','Lehrkraft Brusda','Lehrkraft Moser','Lehrkraft Oursin','Lehrkraft Rock','Lehrkraft Schnepf','Lehrkraft Schöne','Lehrkraft Tsehaye','Lehrkraft Vietinghoff','Lehrkraft Vogt','Lehrkraft Zwilling'],
'Aufsicht':['Pausenaufsicht']
};
function roomData(){return Store.data.roomOccupancy||ROOM_SEED}
function roomSelectCategory(category){roomCategory=category;roomSelected=ROOM_CATEGORIES[category][0];render()}
function roomSelectPlan(plan){roomSelected=plan;render()}
let roomEditMode=false;
function roomPlanType(value){
 const v=String(value||'').toLowerCase();
 if(!v.trim())return 'empty';
 if(/kreativband|atelier|labor|studio|schulgarten|sportangebot|sportspiele|technikwerkstatt|eigenständiges üben|heimbacher/.test(v))return 'creative';
 if(/teamstunde|teamzeit|assembly/.test(v))return 'teamtime';
 if(/werkstatt|themenfeld/.test(v))return 'workshop';
 if(/flex|lwl|quop|flink/.test(v))return 'flex';
 if(/englisch|english/.test(v))return 'english';
 if(/mathe|rechnen|geometrie/.test(v))return 'math';
 if(/deutsch|schreiben/.test(v))return 'german';
 if(/religion|französisch|franz\./.test(v))return 'subject';
 if(/ankommen/.test(v))return 'arrival';
 if(/mitbetreuung|lernatelier|^la[ 123]|^la$/.test(v))return 'atelier';
 return 'neutral';
}
function roomPlanCell(value,editable,h,d){
 const lines=String(value||'').split('\\n').filter(x=>x.trim());
 const expanded=lines;
 const content=expanded.length?expanded.map(line=>{
  const type=roomPlanType(line);
  const parts=line.split(/\\s*[·–]\\s*/);
  const title=parts.shift()||line;
  return '<div class="roomLesson '+type+'"><strong>'+esc(title)+'</strong>'+(parts.length?'<span>'+esc(parts.join(' · '))+'</span>':'')+'</div>';
 }).join(''):'<span class="roomEmptySlot">—</span>';
 if(!editable)return '<div class="roomLessonStack">'+content+'</div>';
 return '<div class="roomLessonStack">'+content+'</div><textarea class="roomEditCell roomEditField" aria-label="'+ROOM_DAYS[d]+', '+(h+1)+'. Stunde" onchange="roomSave('+h+','+d+',this.value)" rows="'+Math.max(2,lines.length+1)+'">'+esc(value)+'</textarea>';
}
function roomOccupancy(){
 const editable=Auth.isAdmin(),extra=EXTRA_PLANS[roomSelected],all=roomData(),rows=all[roomSelected]||extra?.rows||ROOM_SEED[roomSelected]||[],times=extra?.times||ROOM_TIMES;
 const names={'Teamstundenpläne':'Teams','Unterricht & Angebote':'Angebote','Lehrkräfte':'Lehrkräfte','Aufsicht':'Aufsicht','Räume':'Räume'};
 const intro=header('Wochenpläne · Stufe 6','Nach den Stundenplanvorlagen vom 17.11.2026');
 const categories='<nav class="roomPlanCategories" aria-label="Planbereiche">'+Object.keys(ROOM_CATEGORIES).map(c=>'<button class="roomPlanTab '+(roomCategory===c?'active':'')+'" onclick="roomSelectCategory('+JSON.stringify(c).replace(/"/g,'&quot;')+')">'+esc(names[c]||c)+'</button>').join('')+'</nav>';
 const options='<div class="roomPlanOptions">'+ROOM_CATEGORIES[roomCategory].map(r=>'<button class="roomPlanOption '+(r===roomSelected?'active':'')+'" onclick="roomSelectPlan('+JSON.stringify(r).replace(/"/g,'&quot;')+')">'+esc(r.replace('Teamstundenplan ','').replace('Lehrkraft ',''))+'</button>').join('')+'</div>';
 const team=extra?.teamColor||({'Teamstundenplan Blau':'blau','Teamstundenplan Rot':'rot','Teamstundenplan Gelb':'gelb','Teamstundenplan Violett':'violett','Teamstundenplan Grün':'gruen'}[roomSelected])||'';
 const heading=roomSelected.replace('Teamstundenplan ','Team ').replace('Lehrkraft ','Stundenplan · ');
 const action=editable?'<button class="roomEditToggle" onclick="roomEditMode=!roomEditMode;render()">'+(roomEditMode?'✓ Bearbeitung beenden':'✎ Plan bearbeiten')+'</button>':'';
 const legend=roomCategory==='Teamstundenpläne'?'<div class="roomScheduleLegend"><span class="english">Englisch</span><span class="math">Mathe</span><span class="german">Deutsch</span><span class="subject">Französisch / Religion / Chor</span><span class="creative">Kreativband</span><span class="workshop">Werkstatt</span><span class="arrival">Ankommen / Teamstunde</span></div>':'';
 const grid='<div class="roomScheduleScroll"><table class="roomSchedule"><thead><tr><th class="roomHourHead">Stunde</th>'+ROOM_DAYS.map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,h)=>'<tr><th class="roomHour"><b>'+(h+1)+'.</b><small>'+esc((times[h]||'').replace(/^\\d+\\. Stunde\\s*[·-]?\\s*/,''))+'</small></th>'+ROOM_DAYS.map((d,i)=>'<td>'+roomPlanCell(row[i],editable&&roomEditMode,h,i)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 shell(intro+'<div class="roomPlanner"><div class="roomPlannerNav">'+categories+options+'</div><section class="roomPlannerSheet '+(team?'roomTeam-'+team:'')+' '+(roomEditMode?'editing':'')+'"><div class="roomPlannerTitle"><div><h2>'+esc(heading)+'</h2>'+(extra?.note?'<p>'+esc(extra.note)+'</p>':'')+'</div>'+action+'</div>'+grid+legend+'</section></div>');
}

function roomSave(hour,day,value){
 if(!Auth.isAdmin())return;
 if(!Store.data.roomOccupancy)Store.data.roomOccupancy=JSON.parse(JSON.stringify(ROOM_SEED));
 if(!Store.data.roomOccupancy[roomSelected])Store.data.roomOccupancy[roomSelected]=JSON.parse(JSON.stringify(EXTRA_PLANS[roomSelected]?.rows||ROOM_SEED[roomSelected]));
 Store.data.roomOccupancy[roomSelected][hour][day]=String(value);
 Store.save();toast();
}

// Kompakte Stundenplanansicht; Bearbeitung bleibt erhalten.
(function(){const id='kompass-room-compact-css';if(document.getElementById(id))return;const e=document.createElement('style');e.id=id;e.textContent=`
.roomCompactControls{display:flex;flex-direction:column;gap:8px;margin:0 0 12px;padding:10px 12px;border:1px solid #e0e5ed;border-radius:12px;background:#fff}
.roomCompactNav{margin:0!important}.roomCompactNav .chip{padding:7px 11px!important;font-size:12px!important;min-height:32px!important}
.roomCompactPlan{padding:14px!important}.roomCompactPlan h2{margin:0 0 10px!important;font-size:19px!important}
.roomCompactPlan .roomPlanTable{border-collapse:collapse;width:100%;table-layout:fixed}
.roomCompactPlan .roomPlanTable th,.roomCompactPlan .roomPlanTable td{padding:6px 8px!important;vertical-align:top!important}
.roomCompactPlan .roomPlanTable thead th{padding:10px 8px!important}
.roomCompactPlan .roomPlanTable th:first-child{width:100px!important}
.roomCompactPlan .roomTime{font-size:12px!important}
.roomCompactPlan .roomEditCell{min-height:36px!important;height:auto!important;padding:6px!important;font-size:13px!important;line-height:1.35!important;resize:vertical!important;border:1px solid transparent!important;background:transparent!important;border-radius:6px!important;box-sizing:border-box!important;width:100%!important}
.roomCompactPlan .roomEditCell:hover,.roomCompactPlan .roomEditCell:focus{border-color:#9aa9c4!important;background:#fff!important}
.roomCompactPlan .roomReadCell{font-size:13px;line-height:1.4;white-space:pre-wrap}
@media(max-width:850px){.roomCompactPlan .roomPlanScroll{overflow-x:auto}.roomCompactPlan .roomPlanTable{min-width:800px}}
`;document.head.appendChild(e)})();

(function(){const e=document.createElement('style');e.textContent=`
.roomCompactControls{background:#f7f8fc!important;border-color:#e7e9f1!important;box-shadow:none!important}
.roomCompactNav .chip{border-radius:9px!important}
.roomCompactPlan{border-radius:15px!important;box-shadow:none!important;border:1px solid #e4e8ef!important}
.roomCompactPlan .roomPlanTable thead th{background:#e9edf6!important;color:#25344d!important}
.roomCompactPlan .roomPlanTable tbody tr:nth-child(even) td{background:#fafbfe!important}
.roomCompactPlan .roomPlanTable tbody td:has(.roomEditCell:focus){background:#fff!important}
.roomCompactPlan .roomPlanTable td{border:1px solid #e8ebf1!important}
.roomCompactPlan .roomPlanTable .roomEditCell{white-space:pre-wrap!important;overflow:hidden!important}
`;document.head.appendChild(e)})();

(function(){
 const e=document.createElement('style');e.textContent=`
.roomPlanner{display:grid;gap:14px}.roomPlannerNav{display:grid;gap:10px}
.roomPlanCategories{display:flex;gap:6px;flex-wrap:wrap;padding:5px;background:#e9edf4;border-radius:12px;width:max-content;max-width:100%}
.roomPlanTab{border:0;border-radius:9px;background:transparent;color:#526079;padding:9px 17px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.roomPlanTab.active{background:#fff;color:#24334d;box-shadow:0 1px 5px #22334d1b}
.roomPlanOptions{display:flex;flex-wrap:wrap;gap:7px}
.roomPlanOption{border:1px solid #dce2ec;background:#fff;color:#485772;border-radius:9px;padding:9px 14px;font:inherit;font-size:13px;font-weight:650;cursor:pointer}
.roomPlanOption.active{background:#26354f;color:#fff;border-color:#26354f}
.roomPlannerSheet{--plan-accent:#aab8cd;--plan-head:#eef1f6;background:#fff;border:1px solid #e2e6ed;border-top:5px solid var(--plan-accent);border-radius:13px;padding:20px;min-width:0}
.roomTeam-blau{--plan-accent:#4c85d3;--plan-head:#e5f0ff}.roomTeam-rot{--plan-accent:#c66c70;--plan-head:#fcebec}.roomTeam-gelb{--plan-accent:#c7a43e;--plan-head:#fff6d9}.roomTeam-violett{--plan-accent:#9374bf;--plan-head:#f0eafb}.roomTeam-gruen{--plan-accent:#5c9d7a;--plan-head:#e8f5ed}
.roomPlannerTitle{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:16px}
.roomPlannerTitle h2{font-size:22px;margin:0;color:#26344d}.roomPlannerTitle p{font-size:12px;color:#68768b;margin:5px 0 0}
.roomEditToggle{border:1px solid #cfd8e5;background:#fff;color:#33455f;padding:9px 12px;border-radius:9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.roomScheduleScroll{overflow-x:auto}.roomSchedule{border-collapse:separate;border-spacing:3px;width:100%;min-width:770px;table-layout:fixed}
.roomSchedule th,.roomSchedule td{border:0!important;padding:0!important;vertical-align:top!important}
.roomSchedule thead th{background:var(--plan-head);color:#293951;font-size:13px;font-weight:750;text-align:center;padding:12px 6px!important;border-radius:7px 7px 2px 2px}
.roomSchedule .roomHourHead{width:76px!important}.roomSchedule .roomHour{width:76px!important;background:#f2f4f8;text-align:center;border-radius:5px;padding:11px 4px!important;color:#35445b}
.roomHour b{display:block;font-size:16px}.roomHour small{display:block;font-size:10px;font-weight:500;line-height:1.3;margin-top:4px;color:#69778a}
.roomSchedule td{background:#f7f8fb;border-radius:5px;padding:4px!important}
.roomLessonStack{display:flex;flex-direction:column;gap:4px;min-height:46px}
.roomLesson{border-radius:5px;border-left:3px solid #b6c3d6;background:#e9edf4;padding:7px 8px;line-height:1.25;overflow-wrap:anywhere}
.roomLesson strong{display:block;font-size:12px;font-weight:750;color:#26364e}.roomLesson span{display:block;font-size:11px;color:#536178;margin-top:3px}
.roomLesson.english{background:#fae5e5;border-color:#c85c66}.roomLesson.math{background:#e1ecfc;border-color:#5d91d0}.roomLesson.german{background:#fff0c7;border-color:#d5a841}
.roomLesson.arrival{background:#e7edf3;border-color:#889bb3}.roomLesson.atelier{background:#e8eef3;border-color:#8aa0b5}.roomLesson.teamtime{background:#e8e0f4;border-color:#9478ba}
.roomLesson.creative{background:#f9e8da;border-color:#d79b6c}.roomLesson.flex{background:#e5f3f0;border-color:#67a69a}.roomLesson.workshop{background:#eee7dc;border-color:#aa9270}.roomLesson.subject{background:#eee8f7;border-color:#9b83bc}
.roomEmptySlot{color:#c8d0dc;text-align:center;display:block;padding:15px 0;font-size:12px}
.roomEditField{display:none!important}.roomPlannerSheet.editing .roomLessonStack{display:none}.roomPlannerSheet.editing .roomEditField{display:block!important;min-height:60px!important;width:100%;font:inherit;font-size:12px;border:1px solid #c4cfdd;border-radius:6px;padding:8px;resize:vertical;background:#fff}
@media(max-width:700px){.roomPlannerSheet{padding:10px}.roomPlanTab{padding:8px 10px}.roomPlannerTitle{align-items:center}.roomPlannerTitle h2{font-size:18px}}
`;document.head.appendChild(e);
})();

(function(){const e=document.createElement('style');e.textContent=`
.roomPlannerSheet{max-width:1250px;margin:0 auto;padding:18px 22px!important;border-top-width:3px!important}
.roomSchedule{border-spacing:5px 6px!important;min-width:780px!important}
.roomSchedule thead th{background:#e8f2e8!important;color:#356446!important;font-size:12px!important;padding:9px 5px!important}
.roomSchedule td{background:transparent!important;padding:0!important}
.roomSchedule .roomHour{background:#fff!important;border-bottom:1px solid #e9edf0!important;border-radius:0!important;padding:12px 3px!important}
.roomSchedule tbody tr td{border-bottom:1px solid #edf0f3!important;padding:3px 0 8px!important}
.roomLessonStack{min-height:49px!important;gap:5px!important}
.roomLesson{min-height:35px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-left:0!important;border-radius:8px!important;padding:8px 6px!important;box-sizing:border-box}
.roomLesson strong{font-size:12px!important;line-height:1.25!important}
.roomLesson span{font-size:10px!important;line-height:1.25!important;margin-top:3px!important}
.roomLesson.atelier{background:#fff!important;outline:1.5px solid #83a58d;outline-offset:-2px;color:#37664c}
.roomLesson.atelier strong{color:#37664c}
.roomLesson.english{background:#fae6e9!important;border-left:4px solid #b94d5b!important}
.roomLesson.math{background:#e4ecfb!important;border-left:4px solid #3d70b4!important}
.roomLesson.german{background:#fff3cf!important;border-left:4px solid #c4a044!important}
.roomLesson.arrival{background:#f0f2f6!important}
.roomLesson.creative{background:#dff2f3!important}.roomLesson.creative strong{color:#2b7781!important}
.roomLesson.workshop{background:#f2e9db!important}.roomLesson.workshop strong{color:#82673d!important}
.roomLesson.subject{background:#f6e5f0!important}.roomLesson.subject strong{color:#885473!important}
.roomLesson.teamtime{background:#edf0f6!important}
.roomLesson.flex{background:#e5f1ed!important}
.roomScheduleLegend{display:flex;flex-wrap:wrap;gap:9px 14px;padding:14px 4px 0;font-size:11px;color:#586477}
.roomScheduleLegend span{display:inline-flex;align-items:center;gap:5px}
.roomScheduleLegend span:before{content:'';width:11px;height:11px;border-radius:3px;background:#e4e8ee}
.roomScheduleLegend .english:before{background:#fae6e9}.roomScheduleLegend .math:before{background:#e4ecfb}.roomScheduleLegend .german:before{background:#fff3cf}.roomScheduleLegend .subject:before{background:#f6e5f0}.roomScheduleLegend .creative:before{background:#dff2f3}.roomScheduleLegend .workshop:before{background:#f2e9db}.roomScheduleLegend .arrival:before{background:#f0f2f6}
.roomPlannerTitle h2{font-size:20px!important}
@media print{.roomPlannerNav,.roomEditToggle,.sidebar,.roomPlanCategories,.roomPlanOptions{display:none!important}.roomPlannerSheet{border:0!important;padding:0!important}.roomSchedule{min-width:0!important}.roomLesson{break-inside:avoid}}
`;document.head.appendChild(e)})();
