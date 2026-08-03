const TT_DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
let ttView='plan',ttYear=5,ttTeacherFilter='',ttPlanFilter='all',ttDragId=null;
function tt(){return Store.timetable}
function ttActivePlan(){let p=tt().plans.find(x=>x.id===tt().activePlanId);if(!p){p=tt().plans[0];tt().activePlanId=p?.id||null;}return p}
function timetable(){const t=tt(),p=ttActivePlan();let c=header('Stundenplanung','IServ-Wünsche, Personal, Räume und Stundenpläne der Stufen 5–7 gemeinsam planen.');c+=`<div class="toolbar ttTabs"><button class="chip ${ttView==='plan'?'dark':''}" onclick="ttView='plan';render()">Wochenplan</button><button class="chip ${ttView==='teachers'?'dark':''}" onclick="ttView='teachers';render()">Lehrkräfte</button><button class="chip ${ttView==='setup'?'dark':''}" onclick="ttView='setup';render()">Planungsgrundlagen</button><button class="chip ${ttView==='checks'?'dark':''}" onclick="ttView='checks';render()">Prüfung</button><button class="chip ${ttView==='summary'?'dark':''}" onclick="ttView='summary';render()">Auswertung</button></div>`;
if(ttView==='teachers')c+=ttTeachersView();else if(ttView==='setup')c+=ttSetupView();else if(ttView==='checks')c+=ttChecksView();else if(ttView==='summary')c+=ttSummaryView();else c+=ttPlanView(p);shell(c)}
function ttTeachersView(){const q=ttTeacherFilter.toLowerCase(),rows=tt().teachers.filter(x=>!q||`${x.first} ${x.last} ${x.subjects} ${x.notes}`.toLowerCase().includes(q));return `<div class="grid2"><div class="card"><h2>IServ-Deputatswünsche importieren</h2><p>Die gemeinsame CSV für Stufe 5, 6 und 7 kann unverändert hochgeladen werden. Mehrfachantworten werden nach Name zusammengeführt; die neueste Antwort wird verwendet.</p><input type="file" accept=".csv,text/csv" onchange="ttImportTeachers(this.files[0])"><div class="mini">${tt().teachers.length} Lehrkräfte gespeichert${tt().importedAt?' · letzter Import '+new Date(tt().importedAt).toLocaleString('de-DE'):''}</div></div><div class="card"><h2>Lehrkraft ergänzen</h2><button class="chip dark" onclick="ttOpenTeacher()">Lehrkraft anlegen</button><input placeholder="Lehrkräfte durchsuchen …" value="${esc(ttTeacherFilter)}" oninput="ttTeacherFilter=this.value;render()"></div></div><div class="section">Lehrkräftepool</div><div class="teacherGrid">${rows.map(x=>`<div class="teacherCard"><div class="teacherHead"><div><b>${esc(x.first)} ${esc(x.last)}</b><div class="mini">${esc(x.subjects||'Fächer noch offen')}</div></div><span class="badge">${esc(x.deputat||'–')} Std.</span></div><div class="stageTags">${[5,6,7].map(y=>`<span class="statusPill ${x.years?.includes(y)?'status-green':'status-empty'}">Stufe ${y}</span>`).join('')}</div><div class="mini">${x.external?.length||0} externe Einsätze · ${x.blocks?.length||0} Sperrzeiten</div><button class="chip" onclick="ttOpenTeacher('${x.id}')">Bearbeiten</button></div>`).join('')||'<div class="card empty">Noch keine Lehrkräfte importiert.</div>'}</div>`}
function ttImportTeachers(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const rows=parseCsv(r.result),by={};for(const raw of rows){const first=raw['Vorname']||'',last=raw['Nachname']||'';if(!first&&!last)continue;const key=(first+'|'+last).toLowerCase(),date=raw['Ausgefüllt am']||'';if(!by[key]||date>by[key].date)by[key]={raw,date};}for(const {raw} of Object.values(by)){let x=tt().teachers.find(t=>t.first.toLowerCase()===(raw['Vorname']||'').toLowerCase()&&t.last.toLowerCase()===(raw['Nachname']||'').toLowerCase());if(!x){x={id:uid('teacher'),first:raw['Vorname']||'',last:raw['Nachname']||'',years:[],external:[],blocks:[]};tt().teachers.push(x)}x.account=raw['Account']||x.account||'';x.deputat=raw['Deputatsumfang:']||'';x.reductions=raw['Ermäßigungen:']||'';x.subjects=raw['Studierte Fächer:']||'';x.otherSubjects=raw['Mögliche fachfremde Fächer:']||'';x.deputatNotes=raw['Im Deputat zu beachten:']||'';x.notes=raw['Hinweise zur Stundenplanung']||'';x.arrival=raw['Wie häufig kannst du die Ankommensstunde (1. Stunde) übernehmen?']||'';x.creative=raw['In welchen Bereichen könntest du dir einen Einsatz im Kreativband vorstellen?']||'';x.workshop=raw['Wünsche oder Anmerkungen zum Werkstattunterricht']||'';x.theme7=raw['Kannst du dir einen Einsatz im Themenfeldunterricht der Stufe 7 vorstellen?']||'';x.club=raw['Welches Clubangebot/ welche Angebote möchtest du im kommenden Schuljahr gerne anbieten?']||'';x.otherYears=raw['Gibt es einen Wunsch/ die Notwendigkeit in weiteren Klassenstufen eingesetzt zu werden?']||'';x.source=raw;x.blocks=(x.blocks||[]).filter(b=>b.manual);TT_DAYS.forEach((d,i)=>{const v=raw[`Notwendige Sperrzeiten ${d}:`];if(v)x.blocks.push({id:uid('block'),day:i,periods:ttParsePeriods(v),label:v,type:'blocked',manual:false})});}tt().importedAt=new Date().toISOString();Store.save();toast('IServ-Wünsche importiert');render()}catch(e){console.error(e);alert('Die CSV konnte nicht gelesen werden.')}};r.readAsText(file,'utf-8')}
function ttParsePeriods(v){const nums=[...String(v).matchAll(/\d+/g)].map(m=>Number(m[0])).filter(n=>n>=1&&n<=10);return [...new Set(nums)]}
function ttOpenTeacher(id=null){State.dialog={mode:'ttTeacher',id};renderDialog()}
function ttRenderTeacherDialog(target){const x=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{id:null,first:'',last:'',deputat:'',subjects:'',years:[],external:[],blocks:[]};target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${x.id?'Lehrkraft bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first)}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last)}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div></div><label>Einsatz in unseren Stufen</label><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years?.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div><label>Hinweise</label><textarea id="tt_notes">${esc(x.notes||'')}</textarea><div class="section">Externe Einsätze</div><div id="tt_external_rows">${(x.external||[]).map((e,i)=>ttExternalRow(e,i)).join('')}</div><button class="chip" onclick="ttAddExternalRow()">+ externer Einsatz</button><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div>`}
function ttExternalRow(e={},i=0){return `<div class="ttInlineRow"><input data-ext="label" value="${esc(e.label||'Oberstufe')}" placeholder="z. B. Oberstufe"><select data-ext="day">${TT_DAYS.map((d,j)=>`<option value="${j}" ${Number(e.day)===j?'selected':''}>${d}</option>`).join('')}</select><input data-ext="period" type="number" min="1" max="10" value="${e.period||1}" placeholder="Std."><button class="miniBtn" onclick="this.parentElement.remove()">×</button></div>`}
function ttAddExternalRow(){document.getElementById('tt_external_rows').insertAdjacentHTML('beforeend',ttExternalRow({},Date.now()))}
function ttSaveTeacher(){const old=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=old||{id:uid('teacher'),external:[],blocks:[]};x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.notes=document.getElementById('tt_notes').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);x.external=[...document.querySelectorAll('#tt_external_rows .ttInlineRow')].map(r=>({id:uid('external'),label:r.querySelector('[data-ext=label]').value.trim(),day:Number(r.querySelector('[data-ext=day]').value),period:Number(r.querySelector('[data-ext=period]').value)})).filter(e=>e.label);if(!x.first&&!x.last)return;if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast();render()}
function ttDeleteTeacher(id){if(!confirm('Lehrkraft wirklich löschen?'))return;tt().teachers=tt().teachers.filter(x=>x.id!==id);Store.save();State.dialog=null;render()}
function ttSetupView(){return `<div class="grid2"><div class="card"><h2>Teams und Lerngruppen</h2><p>Jede Gruppe gehört zu einer Stufe und kann im Plan belegt werden.</p>${tt().groups.map(g=>`<div class="ttSetupRow"><b>${esc(g.name)}</b><span>Stufe ${g.year}</span><button class="miniBtn" onclick="ttRemoveSetup('groups','${g.id}')">×</button></div>`).join('')}<div class="formgrid"><input id="tt_group_name" placeholder="z. B. Team Lila"><select id="tt_group_year">${[5,6,7].map(y=>`<option>${y}</option>`).join('')}</select></div><button class="chip" onclick="ttAddGroup()">+ Gruppe</button></div><div class="card"><h2>Räume</h2>${tt().rooms.map(r=>`<div class="ttSetupRow"><b>${esc(r.name)}</b><span>${esc(r.type||'Raum')}</span><button class="miniBtn" onclick="ttRemoveSetup('rooms','${r.id}')">×</button></div>`).join('')}<div class="formgrid"><input id="tt_room_name" placeholder="z. B. Lernatelier 2"><input id="tt_room_type" placeholder="Art"></div><button class="chip" onclick="ttAddRoom()">+ Raum</button></div><div class="card"><h2>Unterrichtsbedarfe</h2><p>Die Sollstunden werden in der Prüfung mit dem aktuellen Plan verglichen.</p>${tt().requirements.map(r=>`<div class="ttSetupRow"><b>Stufe ${r.year}: ${esc(r.subject)}</b><span>${r.hours} Std.</span><button class="miniBtn" onclick="ttRemoveSetup('requirements','${r.id}')">×</button></div>`).join('')}<div class="formgrid"><select id="tt_req_year">${[5,6,7].map(y=>`<option>${y}</option>`).join('')}</select><input id="tt_req_subject" placeholder="Fach/Block"><input id="tt_req_hours" type="number" min="1" value="2"></div><button class="chip" onclick="ttAddRequirement()">+ Bedarf</button></div><div class="card"><h2>Planvarianten</h2>${tt().plans.map(p=>`<div class="ttSetupRow"><b>${esc(p.name)}</b><span>${p.lessons.length} Blöcke</span><button class="miniBtn" onclick="ttActivatePlan('${p.id}')">Öffnen</button><button class="miniBtn" onclick="ttClonePlan('${p.id}')">Kopie</button></div>`).join('')}<button class="chip dark" onclick="ttNewPlan()">Neue Variante</button></div></div>`}
function ttAddGroup(){const n=document.getElementById('tt_group_name').value.trim();if(!n)return;tt().groups.push({id:uid('group'),name:n,year:Number(document.getElementById('tt_group_year').value)});Store.save();render()}
function ttAddRoom(){const n=document.getElementById('tt_room_name').value.trim();if(!n)return;tt().rooms.push({id:uid('room'),name:n,type:document.getElementById('tt_room_type').value.trim()});Store.save();render()}
function ttAddRequirement(){const s=document.getElementById('tt_req_subject').value.trim();if(!s)return;tt().requirements.push({id:uid('req'),year:Number(document.getElementById('tt_req_year').value),subject:s,hours:Number(document.getElementById('tt_req_hours').value||1)});Store.save();render()}
function ttRemoveSetup(k,id){tt()[k]=tt()[k].filter(x=>x.id!==id);Store.save();render()}
function ttNewPlan(){const name=prompt('Name der neuen Variante','Plan '+String.fromCharCode(65+tt().plans.length));if(!name)return;const p={id:uid('plan'),name,lessons:[]};tt().plans.push(p);tt().activePlanId=p.id;Store.save();ttView='plan';render()}
function ttClonePlan(id){const src=tt().plans.find(p=>p.id===id),name=prompt('Name der Kopie',src.name+' – Kopie');if(!name)return;const p={id:uid('plan'),name,lessons:clone(src.lessons).map(l=>({...l,id:uid('lesson')}))};tt().plans.push(p);tt().activePlanId=p.id;Store.save();render()}
function ttActivatePlan(id){tt().activePlanId=id;Store.save();ttView='plan';render()}
function ttPlanView(p){if(!p)return '<div class="card empty">Bitte zuerst eine Planvariante anlegen.</div>';const lessons=p.lessons.filter(l=>ttPlanFilter==='all'||String(l.year)===ttPlanFilter);return `<div class="toolbar ttPlanToolbar"><select onchange="tt().activePlanId=this.value;Store.save();render()">${tt().plans.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><select onchange="ttPlanFilter=this.value;render()"><option value="all">Alle Stufen</option>${[5,6,7].map(y=>`<option value="${y}" ${ttPlanFilter==y?'selected':''}>Stufe ${y}</option>`).join('')}</select><button class="chip dark" onclick="ttGeneratePlan()">⚙ Stundenplan erstellen</button><button class="chip" onclick="ttOpenLesson()">+ Unterrichtsblock</button></div><div class="ttWeek">${TT_DAYS.map((d,day)=>`<div class="ttDay"><h2>${d}</h2>${[1,2,3,4,5,6,7,8,9,10].map(period=>`<div class="ttCell" ondragover="event.preventDefault()" ondrop="ttDrop(${day},${period})" onclick="ttOpenLesson(null,${day},${period})"><span class="ttPeriod">${period}.</span><div>${lessons.filter(l=>l.day===day&&l.period===period).map(l=>ttLessonCard(l)).join('')}</div></div>`).join('')}</div>`).join('')}</div>`}
function ttLessonCard(l){const teacher=tt().teachers.find(x=>x.id===l.teacherId),room=tt().rooms.find(x=>x.id===l.roomId),group=tt().groups.find(x=>x.id===l.groupId);return `<div class="ttLesson year${l.year}" draggable="true" ondragstart="ttDragId='${l.id}'" onclick="event.stopPropagation();ttOpenLesson('${l.id}')"><b>${esc(l.subject)}</b><div>${esc(group?.name||'Stufe '+l.year)}</div><small>${esc(teacher?teacher.first+' '+teacher.last:'ohne Lehrkraft')}${room?' · '+esc(room.name):''}</small></div>`}
function ttDrop(day,period){if(!ttDragId)return;const l=ttActivePlan().lessons.find(x=>x.id===ttDragId);if(l){l.day=day;l.period=period;Store.save()}ttDragId=null;render()}
function ttOpenLesson(id=null,day=0,period=1){State.dialog={mode:'ttLesson',id,day,period};renderDialog()}
function ttRenderLessonDialog(target){const p=ttActivePlan(),l=State.dialog.id?p.lessons.find(x=>x.id===State.dialog.id):{id:null,year:ttPlanFilter==='all'?ttYear:Number(ttPlanFilter),day:State.dialog.day,period:State.dialog.period,duration:1,subject:'Lernatelier',teacherId:'',groupId:'',roomId:'',type:'Unterricht'};target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${l.id?'Unterrichtsblock bearbeiten':'Unterrichtsblock anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><div class="formgrid"><div><label>Stufe</label><select id="ttl_year">${[5,6,7].map(y=>`<option ${l.year===y?'selected':''}>${y}</option>`).join('')}</select></div><div><label>Bezeichnung/Fach</label><input id="ttl_subject" value="${esc(l.subject)}"></div><div><label>Tag</label><select id="ttl_day">${TT_DAYS.map((d,i)=>`<option value="${i}" ${l.day===i?'selected':''}>${d}</option>`).join('')}</select></div><div><label>Stunde</label><input id="ttl_period" type="number" min="1" max="10" value="${l.period}"></div><div><label>Lehrkraft</label><select id="ttl_teacher"><option value="">noch offen</option>${tt().teachers.map(x=>`<option value="${x.id}" ${l.teacherId===x.id?'selected':''}>${esc(x.first)} ${esc(x.last)}</option>`).join('')}</select></div><div><label>Gruppe</label><select id="ttl_group"><option value="">ganze Stufe/offen</option>${tt().groups.map(x=>`<option value="${x.id}" ${l.groupId===x.id?'selected':''}>${esc(x.name)} (Stufe ${x.year})</option>`).join('')}</select></div><div><label>Raum</label><select id="ttl_room"><option value="">ohne Raum</option>${tt().rooms.map(x=>`<option value="${x.id}" ${l.roomId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div><label>Art</label><select id="ttl_type">${['Unterricht','Lernatelier','Input','Werkstatt','Sprint','Kreativband','Club','Coaching','Religion/Ethik','Sport'].map(x=>`<option ${l.type===x?'selected':''}>${x}</option>`).join('')}</select></div></div><button class="chip dark" onclick="ttSaveLesson()">Speichern</button>${l.id?`<button class="chip" onclick="ttDeleteLesson('${l.id}')">Löschen</button>`:''}</div></div>`}
function ttSaveLesson(){const p=ttActivePlan(),old=State.dialog.id?p.lessons.find(x=>x.id===State.dialog.id):null,l=old||{id:uid('lesson')};l.year=Number(document.getElementById('ttl_year').value);l.subject=document.getElementById('ttl_subject').value.trim()||'Unterricht';l.day=Number(document.getElementById('ttl_day').value);l.period=Number(document.getElementById('ttl_period').value);l.teacherId=document.getElementById('ttl_teacher').value;l.groupId=document.getElementById('ttl_group').value;l.roomId=document.getElementById('ttl_room').value;l.type=document.getElementById('ttl_type').value;if(!old)p.lessons.push(l);Store.save();State.dialog=null;toast();render()}
function ttDeleteLesson(id){ttActivePlan().lessons=ttActivePlan().lessons.filter(x=>x.id!==id);Store.save();State.dialog=null;render()}
function ttConflicts(){const p=ttActivePlan(),out=[];for(const l of p.lessons){const same=p.lessons.filter(x=>x.id!==l.id&&x.day===l.day&&x.period===l.period);if(l.teacherId&&same.some(x=>x.teacherId===l.teacherId))out.push({level:'red',text:`Lehrkraft doppelt: ${ttNameTeacher(l.teacherId)} am ${TT_DAYS[l.day]} in Stunde ${l.period}.`});if(l.roomId&&same.some(x=>x.roomId===l.roomId))out.push({level:'red',text:`Raum doppelt: ${tt().rooms.find(r=>r.id===l.roomId)?.name||'Raum'} am ${TT_DAYS[l.day]} in Stunde ${l.period}.`});if(l.groupId&&same.some(x=>x.groupId===l.groupId))out.push({level:'red',text:`Gruppe doppelt: ${tt().groups.find(g=>g.id===l.groupId)?.name||'Gruppe'} am ${TT_DAYS[l.day]} in Stunde ${l.period}.`});const t=tt().teachers.find(x=>x.id===l.teacherId);if(t?.external?.some(e=>e.day===l.day&&e.period===l.period))out.push({level:'red',text:`Externer Einsatz kollidiert: ${ttNameTeacher(l.teacherId)} am ${TT_DAYS[l.day]} in Stunde ${l.period}.`});if(t?.blocks?.some(b=>b.day===l.day&&(!b.periods?.length||b.periods.includes(l.period))))out.push({level:'yellow',text:`Sperrzeit beachten: ${ttNameTeacher(l.teacherId)} am ${TT_DAYS[l.day]} in Stunde ${l.period}.`});if(!l.teacherId)out.push({level:'yellow',text:`Noch ohne Lehrkraft: ${l.subject}, Stufe ${l.year}, ${TT_DAYS[l.day]} ${l.period}. Stunde.`})}return out.filter((x,i,a)=>a.findIndex(y=>y.text===x.text)===i)}
function ttNameTeacher(id){const x=tt().teachers.find(t=>t.id===id);return x?`${x.first} ${x.last}`:'Unbekannt'}
function ttChecksView(){const c=ttConflicts();return `<div class="grid"><div class="tile roseTile"><b>${c.filter(x=>x.level==='red').length} Konflikte</b><span>Doppelbelegungen und externe Einsätze</span><i>⚠️</i></div><div class="tile amberTile"><b>${c.filter(x=>x.level==='yellow').length} Hinweise</b><span>Sperrzeiten und offene Besetzungen</span><i>!</i></div><div class="tile mintTile"><b>${ttActivePlan()?.lessons.length||0} Blöcke</b><span>in ${esc(ttActivePlan()?.name||'Plan')}</span><i>✓</i></div></div><div class="section">Prüfergebnis</div><div class="list">${c.map(x=>`<div class="row"><span class="statusPill status-${x.level}">${x.level==='red'?'Konflikt':'Hinweis'}</span><div>${esc(x.text)}</div></div>`).join('')||'<div class="card empty">Keine Konflikte gefunden.</div>'}</div>`}
function ttSummaryView(){const p=ttActivePlan(),counts={};(p?.lessons||[]).forEach(l=>{const k=l.year+'|'+l.subject;counts[k]=(counts[k]||0)+1});const req=tt().requirements.map(r=>({...r,actual:counts[r.year+'|'+r.subject]||0}));return `<div class="grid2"><div class="card"><h2>Soll-Ist nach Stufe</h2><table class="studentTable"><thead><tr><th>Stufe</th><th>Bereich</th><th>Soll</th><th>Ist</th><th>Status</th></tr></thead><tbody>${req.map(r=>`<tr><td>${r.year}</td><td>${esc(r.subject)}</td><td>${r.hours}</td><td>${r.actual}</td><td>${statusLabel(r.actual>=r.hours?'green':r.actual?'yellow':'red')}</td></tr>`).join('')||'<tr><td colspan="5">Noch keine Bedarfe angelegt.</td></tr>'}</tbody></table></div><div class="card"><h2>Lehrkräfteauslastung im Plan</h2>${tt().teachers.map(t=>{const n=(p?.lessons||[]).filter(l=>l.teacherId===t.id).length;return `<div class="ttLoad"><b>${esc(t.first)} ${esc(t.last)}</b><span>${n} geplante Std. · Deputat ${esc(t.deputat||'–')}</span></div>`}).join('')||'<p class="mini">Noch keine Lehrkräfte vorhanden.</p>'}</div></div>`}


/* KOMPASS 7.2 – automatischer Stundenplangenerator */
function ttSeedSchoolModel(){
 const t=tt();
 if(!t.groups.length){['Blau','Rot','Gelb','Violett','Grün'].forEach(n=>t.groups.push({id:uid('group'),name:'Team '+n,year:6}));}
 if(!t.rooms.length){['Lernatelier 1','Lernatelier 2','Lernatelier 3'].forEach(n=>t.rooms.push({id:uid('room'),name:n,type:'Lernatelier'}));t.rooms.push({id:uid('room'),name:'Sporthalle',type:'Sport'});}
 if(!t.requirements.length){
  [5,6,7].forEach(y=>[['Deutsch',3],['Mathematik',3],['Englisch',3],['Sport',2],['Religion/Ethik',2],['Werkstatt',4],['Kreativband',2]].forEach(([subject,hours])=>t.requirements.push({id:uid('req'),year:y,subject,hours})));
 }
 if(!t.generator)t.generator={periods:9,corePeriods:[2,3,4],latePeriods:[5,6],maxTeacherDay:7,avoidFirstCore:true,lastRun:null,report:null};
 Store.save();
}
function ttTeacherCan(t,subject,year){
 if(!t)return false;if(t.years?.length&&!t.years.includes(year))return false;
 const hay=(String(t.subjects||'')+' '+String(t.otherSubjects||'')).toLowerCase();
 const aliases={'mathematik':['mathematik','mathe'],'deutsch':['deutsch'],'englisch':['englisch','english'],'sport':['sport'],'religion/ethik':['religion','ethik'],'werkstatt':['werkstatt','geografie','geschichte','informatik','kunst','musik'],'kreativband':['kreativ','kunst','musik','informatik']};
 return (aliases[subject.toLowerCase()]||[subject.toLowerCase()]).some(x=>hay.includes(x)) || ['Werkstatt','Kreativband','Lernatelier'].includes(subject);
}
function ttUnavailable(t,day,period){return !!(t?.external?.some(e=>Number(e.day)===day&&Number(e.period)===period)||t?.blocks?.some(b=>Number(b.day)===day&&(!b.periods?.length||b.periods.map(Number).includes(period))))}
function ttBusy(lessons,teacherId,day,period){return !!teacherId&&lessons.some(l=>l.teacherId===teacherId&&l.day===day&&l.period===period)}
function ttGroupBusy(lessons,groupId,day,period){return lessons.some(l=>l.groupId===groupId&&l.day===day&&l.period===period)}
function ttRoomBusy(lessons,roomId,day,period){return !!roomId&&lessons.some(l=>l.roomId===roomId&&l.day===day&&l.period===period)}
function ttTeacherLoad(lessons,id){return lessons.filter(l=>l.teacherId===id).length}
function ttTeacherDayLoad(lessons,id,day){return lessons.filter(l=>l.teacherId===id&&l.day===day).length}
function ttCandidateTeachers(subject,year,lessons,day,period){
 return tt().teachers.filter(t=>ttTeacherCan(t,subject,year)&&!ttUnavailable(t,day,period)&&!ttBusy(lessons,t.id,day,period)).sort((a,b)=>{
  const da=ttTeacherDayLoad(lessons,a.id,day),db=ttTeacherDayLoad(lessons,b.id,day);if(da!==db)return da-db;
  return ttTeacherLoad(lessons,a.id)-ttTeacherLoad(lessons,b.id);
 });
}
function ttFindSlot(lessons,group,subject,duration){
 const core=['Deutsch','Mathematik','Englisch'].includes(subject), sport=subject==='Sport', rel=subject==='Religion/Ethik';
 let slots=[];
 if(core){for(let d=0;d<5;d++)for(const p of [2,3,4])slots.push([d,p]);}
 else if(duration===2){for(let d=0;d<5;d++)for(const p of [2,3,4,5,6,7,8])if(p<9)slots.push([d,p]);}
 else {for(let d=0;d<5;d++)for(let p=2;p<=8;p++)slots.push([d,p]);}
 slots.sort((a,b)=>{
  const ca=lessons.filter(l=>l.day===a[0]&&l.groupId===group.id).length,cb=lessons.filter(l=>l.day===b[0]&&l.groupId===group.id).length;
  return ca-cb || a[1]-b[1];
 });
 for(const [day,period] of slots){
  let ok=true;for(let k=0;k<duration;k++)if(ttGroupBusy(lessons,group.id,day,period+k))ok=false;if(!ok)continue;
  const teachers=ttCandidateTeachers(subject,group.year,lessons,day,period).filter(t=>duration===1||!ttUnavailable(t,day,period+1)&&!ttBusy(lessons,t.id,day,period+1));
  const teacher=teachers[0]||null;
  if(teacher||['Religion/Ethik','Sport'].includes(subject))return {day,period,teacher};
 }
 return null;
}
function ttAddGenerated(lessons,group,subject,duration,slot){
 const sportRoom=tt().rooms.find(r=>String(r.type).toLowerCase().includes('sport'));
 for(let k=0;k<duration;k++)lessons.push({id:uid('lesson'),year:group.year,subject,day:slot.day,period:slot.period+k,duration:1,teacherId:slot.teacher?.id||'',groupId:group.id,roomId:subject==='Sport'?(sportRoom?.id||''):'',type:subject==='Sport'?'Sport':subject==='Religion/Ethik'?'Religion/Ethik':subject==='Werkstatt'?'Werkstatt':subject==='Kreativband'?'Kreativband':'Unterricht',generated:true});
}
function ttGeneratePlan(){
 ttSeedSchoolModel();const t=tt(),p=ttActivePlan();
 if(!p)return alert('Bitte zuerst eine Planvariante anlegen.');
 if(!t.teachers.length&&!confirm('Es sind noch keine Lehrkräfte importiert. Soll trotzdem ein Plan mit offenen Lehrkraftstellen erzeugt werden?'))return;
 if(p.lessons.length&&!confirm('Der aktuelle Plan enthält bereits Unterricht. Automatisch erzeugte Blöcke werden ersetzt, manuell angelegte bleiben erhalten. Fortfahren?'))return;
 const lessons=p.lessons.filter(l=>!l.generated),issues=[];
 const groups=t.groups.filter(g=>[5,6,7].includes(Number(g.year)));
 for(const group of groups){
  const reqs=t.requirements.filter(r=>Number(r.year)===Number(group.year));
  for(const req of reqs){
   let left=Number(req.hours)||0;const subject=req.subject;
   const doublePreferred=['Sport','Religion/Ethik','Werkstatt'].includes(subject);
   while(left>0){const duration=doublePreferred&&left>=2?2:1,slot=ttFindSlot(lessons,group,subject,duration);if(!slot){issues.push(`${group.name}: ${left} Std. ${subject} konnten nicht gesetzt werden.`);break;}ttAddGenerated(lessons,group,subject,duration,slot);if(!slot.teacher)issues.push(`${group.name}: ${subject} am ${TT_DAYS[slot.day]} noch ohne Lehrkraft.`);left-=duration;}
  }
 }
 // Ankommen: erster Stundenblock, je Jahrgang ein Lernatelier-Coach, soweit möglich
 for(const year of [5,6,7])for(let day=0;day<5;day++){
  const g=groups.find(x=>Number(x.year)===year);if(!g)continue;
  const cand=t.teachers.filter(x=>(!x.years?.length||x.years.includes(year))&&!ttUnavailable(x,day,1)&&!ttBusy(lessons,x.id,day,1)).sort((a,b)=>ttTeacherLoad(lessons,a.id)-ttTeacherLoad(lessons,b.id))[0];
  lessons.push({id:uid('lesson'),year,subject:'Ankommen / Lernatelier',day,period:1,duration:1,teacherId:cand?.id||'',groupId:'',roomId:'',type:'Lernatelier',generated:true});if(!cand)issues.push(`Stufe ${year}: Ankommen am ${TT_DAYS[day]} ohne Lehrkraft.`)
 }
 p.lessons=lessons;
 const conflicts=ttConflicts();const red=conflicts.filter(x=>x.level==='red').length,yellow=conflicts.filter(x=>x.level==='yellow').length;
 const expected=t.requirements.reduce((sum,r)=>sum+(Number(r.hours)||0)*Math.max(1,groups.filter(g=>Number(g.year)===Number(r.year)).length),0);
 const generated=lessons.filter(l=>l.generated&&l.subject!=='Ankommen / Lernatelier').length;
 const coverage=expected?Math.min(100,Math.round(generated/expected*100)):100;
 t.generator.lastRun=new Date().toISOString();t.generator.report={coverage,issues:[...issues,...conflicts.map(x=>x.text)],red,yellow,generated};
 Store.save();ttView='checks';toast('Stundenplan erstellt');render();
}

/* ================================================================
   KOMPASS 7.1 – schulischer Organisationsgenerator
   Erweiterung: Regelbibliothek, Unterrichtseigenschaften, Coaches,
   Ankommensstunde und dynamische Lernatelier-Besetzung.
   ================================================================ */

function ttEnsureSchoolConfig(){
 const t=tt();
 t.school=t.school||{};
 t.school.rules=t.school.rules||{
  arrivalEveryDay:true,
  arrivalCoachPerTeam:true,
  corePeriods:[2,3,4],
  creativePeriods:[5,6],
  workshop56:{0:[8,9],1:[8,9],3:[7,8,9]},
  lunch:{0:[7],1:[7],3:[6]},
  fridayNoSubject:[1,2],
  fridayNoCreative:[5,6],
  laRooms:3,
  laNormalCoaches:3,
  laReducedCoaches:2,
  laReducedFromInputs:2,
  laLateCoaches:2,
  la3MustBeStaffed:true,
  workshopUnstaffedLA:true
 };
 t.school.lessonTypes=t.school.lessonTypes||[
  {id:'core_de',name:'Deutsch',years:[5,6,7],kind:'team',groups:'teams',hours:3,duration:1,window:'core',teacherMode:'fixed',priority:'must'},
  {id:'core_ma',name:'Mathematik',years:[5,6,7],kind:'team',groups:'teams',hours:3,duration:1,window:'core',teacherMode:'fixed',priority:'must'},
  {id:'core_en',name:'Englisch',years:[5,6,7],kind:'team',groups:'teams',hours:3,duration:1,window:'core',teacherMode:'fixed',priority:'must'},
  {id:'sport',name:'Sport',years:[5,6],kind:'team',groups:'teams',hours:2,duration:2,window:'day',teacherMode:'fixed-or-external',priority:'must'},
  {id:'religion',name:'Religion/Ethik',years:[5,6],kind:'stage',groups:2,hours:2,duration:2,window:'day',teacherMode:'external-open',parallelLA:true,priority:'must'},
  {id:'creative',name:'Kreativband',years:[5,6,7],kind:'offer',groups:'variable',hours:2,duration:2,window:'creative',teacherMode:'interest',priority:'preferred'},
  {id:'workshop56',name:'Werkstatt',years:[5,6],kind:'offer',groups:'variable',hours:7,duration:'2/3',window:'workshop56',teacherMode:'availability',priority:'must'},
  {id:'workshop7',name:'Werkstatt',years:[7],kind:'offer',groups:'variable',hours:11,duration:'blocks',window:'flexible',teacherMode:'availability',priority:'must'}
 ];
 t.school.ruleLibrary=t.school.ruleLibrary||[
  {id:'r_arrival',name:'1. Stunde ist Ankommensstunde',level:'must',active:true},
  {id:'r_arrival_team',name:'Pro Farbteam mindestens ein Coach in der Ankommensstunde',level:'must',active:true},
  {id:'r_core_single',name:'Deutsch, Mathematik und Englisch als Einzelstunden',level:'must',active:true},
  {id:'r_friday_12',name:'Freitag 1./2. Stunde kein Fachunterricht',level:'must',active:true},
  {id:'r_la3',name:'Lernatelier 3 muss bei Lernatelierbetrieb besetzt sein',level:'must',active:true},
  {id:'r_la_dynamic',name:'Ab mindestens zwei Teams im Input reichen zwei Lerncoaches',level:'must',active:true},
  {id:'r_creative',name:'5./6. Stunde Kreativband, Ateliers und Labore',level:'preferred',active:true},
  {id:'r_workshop_blocks',name:'Werkstatt möglichst in zusammenhängenden Blöcken',level:'preferred',active:true},
  {id:'r_no_double',name:'Keine Doppelbelegung von Lehrkraft, Gruppe oder Raum',level:'must',active:true}
 ];
 t.school.teamAssignments=t.school.teamAssignments||{};
 t.school.version='7.1';
 return t.school;
}

function ttRuleActive(id){return ttEnsureSchoolConfig().ruleLibrary.find(r=>r.id===id)?.active!==false}

// Erweiterte Hauptnavigation des Moduls
function timetable(){
 ttEnsureSchoolConfig();const p=ttActivePlan();
 let c=header('Stundenplanung','Stufenpläne, Unterricht, Lernateliers und Betreuungsaufgaben gemeinsam berechnen.');
 c+=`<div class="toolbar ttTabs">
 <button class="chip ${ttView==='plan'?'dark':''}" onclick="ttView='plan';render()">Wochenplan</button>
 <button class="chip ${ttView==='teachers'?'dark':''}" onclick="ttView='teachers';render()">Lehrkräfte</button>
 <button class="chip ${ttView==='model'?'dark':''}" onclick="ttView='model';render()">Schulmodell</button>
 <button class="chip ${ttView==='setup'?'dark':''}" onclick="ttView='setup';render()">Grunddaten</button>
 <button class="chip ${ttView==='checks'?'dark':''}" onclick="ttView='checks';render()">Prüfung</button>
 <button class="chip ${ttView==='summary'?'dark':''}" onclick="ttView='summary';render()">Auswertung</button></div>`;
 if(ttView==='teachers')c+=ttTeachersView();else if(ttView==='model')c+=ttModelView();else if(ttView==='setup')c+=ttSetupView();else if(ttView==='checks')c+=ttChecksView();else if(ttView==='summary')c+=ttSummaryView();else c+=ttPlanView(p);shell(c)
}

function ttModelView(){
 const s=ttEnsureSchoolConfig(),r=s.rules;
 return `<div class="grid2">
 <div class="card"><h2>Regelbibliothek</h2><p>Muss-Regeln dürfen nie verletzt werden. Möglichst-Regeln werden bei der Optimierung berücksichtigt.</p>
 ${s.ruleLibrary.map(x=>`<div class="ttRuleRow"><label class="check"><input type="checkbox" ${x.active?'checked':''} onchange="ttToggleRule('${x.id}',this.checked)"><span class="ruleDot ${x.level}"></span><b>${esc(x.name)}</b></label><span class="statusPill ${x.level==='must'?'status-red':'status-yellow'}">${x.level==='must'?'Muss':'Möglichst'}</span></div>`).join('')}</div>
 <div class="card"><h2>Lernatelier-Logik</h2><div class="formgrid">
 <div><label>Anzahl Lernateliers</label><input id="tt_la_rooms" type="number" min="1" value="${r.laRooms}"></div>
 <div><label>Normalbesetzung 2.–4.</label><input id="tt_la_normal" type="number" min="1" value="${r.laNormalCoaches}"></div>
 <div><label>Reduzierte Besetzung</label><input id="tt_la_reduced" type="number" min="1" value="${r.laReducedCoaches}"></div>
 <div><label>Reduktion ab Inputs</label><input id="tt_la_inputs" type="number" min="1" value="${r.laReducedFromInputs}"></div>
 <div><label>Besetzung 5./6.</label><input id="tt_la_late" type="number" min="0" value="${r.laLateCoaches}"></div></div>
 <label class="check"><input id="tt_la3" type="checkbox" ${r.la3MustBeStaffed?'checked':''}> Lernatelier 3 muss besetzt sein</label><br><button class="chip dark" onclick="ttSaveLARules()">Regeln speichern</button></div>
 <div class="card span2"><h2>Unterrichtsarten</h2><p>Der Generator plant anhand dieser Eigenschaften und nicht anhand fest eingebauter Sonderfälle.</p><div class="ttTypeGrid">${s.lessonTypes.map(x=>`<div class="ttTypeCard"><b>${esc(x.name)}</b><span>${esc(x.kind==='team'?'Teamunterricht':x.kind==='stage'?'Stufenunterricht':'Angebotsunterricht')}</span><small>${x.hours} Wochenstunden · ${esc(String(x.duration))} Std. je Block · ${esc(x.window)}</small><small>Lehrkräfte: ${esc(x.teacherMode)}</small></div>`).join('')}</div></div>
 <div class="card"><h2>Berechnungsphasen</h2><ol class="ttPhases"><li>Zeitgerüst und feste Sperren</li><li>Haupt- und Pflichtunterricht</li><li>Lernatelier-Betreuung</li><li>Angebote und Werkstatt</li><li>Prüfen und optimieren</li></ol></div>
 <div class="card"><h2>Aktueller Modellstand</h2><p><b>${tt().groups.length}</b> Teams/Gruppen · <b>${tt().teachers.length}</b> Lehrkräfte · <b>${tt().rooms.length}</b> Räume</p><button class="chip" onclick="ttSeedSchoolModel();toast('Schulmodell ergänzt');render()">Fehlende Grunddaten ergänzen</button></div>
 </div>`
}
function ttToggleRule(id,v){const x=ttEnsureSchoolConfig().ruleLibrary.find(r=>r.id===id);if(x)x.active=v;Store.save();render()}
function ttSaveLARules(){const r=ttEnsureSchoolConfig().rules;r.laRooms=Number(document.getElementById('tt_la_rooms').value)||3;r.laNormalCoaches=Number(document.getElementById('tt_la_normal').value)||3;r.laReducedCoaches=Number(document.getElementById('tt_la_reduced').value)||2;r.laReducedFromInputs=Number(document.getElementById('tt_la_inputs').value)||2;r.laLateCoaches=Number(document.getElementById('tt_la_late').value)||2;r.la3MustBeStaffed=document.getElementById('tt_la3').checked;Store.save();toast('Lernatelier-Regeln gespeichert');render()}

// Lehrkraftdialog um Coaching und Eignung erweitert
function ttRenderTeacherDialog(target){
 const x=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{id:null,first:'',last:'',deputat:'',subjects:'',years:[],external:[],blocks:[],coachTeams:[],laSuitability:{1:2,2:2,3:2}};
 x.coachTeams=x.coachTeams||[];x.laSuitability=x.laSuitability||{1:2,2:2,3:2};
 target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${x.id?'Lehrkraft bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
 <div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first)}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last)}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div></div>
 <label>Einsatz in unseren Stufen</label><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years?.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div>
 <label>Coach von</label><div class="choice">${tt().groups.map(g=>`<label class="check"><input data-coachteam="${g.id}" type="checkbox" ${x.coachTeams.includes(g.id)?'checked':''}> ${esc(g.name)}</label>`).join('')||'<span class="mini">Teams zuerst unter Grunddaten anlegen.</span>'}</div>
 <div class="section">Lernatelier-Eignung</div><div class="formgrid">${[1,2,3].map(n=>`<div><label>Lernatelier ${n}</label><select id="tt_la_${n}">${[[3,'bevorzugt'],[2,'möglich'],[1,'nur wenn nötig'],[0,'nicht einsetzen']].map(([v,l])=>`<option value="${v}" ${Number(x.laSuitability[n])===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div>
 <label>Hinweise</label><textarea id="tt_notes">${esc(x.notes||'')}</textarea><div class="section">Externe Einsätze</div><div id="tt_external_rows">${(x.external||[]).map((e,i)=>ttExternalRow(e,i)).join('')}</div><button class="chip" onclick="ttAddExternalRow()">+ externer Einsatz</button><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div>`
}
function ttSaveTeacher(){
 const old=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=old||{id:uid('teacher'),external:[],blocks:[]};
 x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.notes=document.getElementById('tt_notes').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);
 x.coachTeams=[...document.querySelectorAll('[data-coachteam]:checked')].map(e=>e.dataset.coachteam);x.laSuitability={1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)};
 x.external=[...document.querySelectorAll('#tt_external_rows .ttInlineRow')].map(r=>({id:uid('external'),label:r.querySelector('[data-ext=label]').value.trim(),day:Number(r.querySelector('[data-ext=day]').value),period:Number(r.querySelector('[data-ext=period]').value)})).filter(e=>e.label);
 if(!x.first&&!x.last)return;if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast();render()
}

function ttIsCoreSubject(subject){return ['Deutsch','Mathematik','Englisch'].includes(subject)}
function ttFixedForbidden(subject,day,period,year){
 const r=ttEnsureSchoolConfig().rules;
 if(day===4&&r.fridayNoSubject.includes(period)&&subject!=='Ankommen / Coaching'&&subject!=='Assembly'&&subject!=='Chor / Bläserklasse')return true;
 if(ttIsCoreSubject(subject)&&!r.corePeriods.includes(period))return true;
 if(subject==='Kreativband'&&(day===4||!r.creativePeriods.includes(period)))return true;
 return false;
}
function ttFindSlot(lessons,group,subject,duration){
 let slots=[];for(let d=0;d<5;d++)for(let p=1;p<=9-duration+1;p++){if(ttFixedForbidden(subject,d,p,group.year))continue;let bad=false;for(let k=0;k<duration;k++)if(ttFixedForbidden(subject,d,p+k,group.year))bad=true;if(!bad)slots.push([d,p])}
 slots.sort((a,b)=>{const ca=lessons.filter(l=>l.day===a[0]&&l.groupId===group.id).length,cb=lessons.filter(l=>l.day===b[0]&&l.groupId===group.id).length;return ca-cb||a[1]-b[1]});
 for(const [day,period] of slots){let ok=true;for(let k=0;k<duration;k++)if(ttGroupBusy(lessons,group.id,day,period+k))ok=false;if(!ok)continue;const teachers=ttCandidateTeachers(subject,group.year,lessons,day,period).filter(t=>{for(let k=0;k<duration;k++)if(ttUnavailable(t,day,period+k)||ttBusy(lessons,t.id,day,period+k))return false;return true});const teacher=teachers[0]||null;if(teacher||['Religion/Ethik','Sport'].includes(subject))return {day,period,teacher}}
 return null
}
function ttPickCoachForTeam(lessons,group,day,period){
 const preferred=tt().teachers.filter(t=>t.coachTeams?.includes(group.id));
 const pool=[...preferred,...tt().teachers.filter(t=>!preferred.includes(t))].filter(t=>(!t.years?.length||t.years.includes(Number(group.year)))&&!ttUnavailable(t,day,period)&&!ttBusy(lessons,t.id,day,period));
 return pool.sort((a,b)=>ttTeacherLoad(lessons,a.id)-ttTeacherLoad(lessons,b.id))[0]||null
}
function ttPickLACoach(lessons,year,day,period,laIndex,used=[]){
 return tt().teachers.filter(t=>(!t.years?.length||t.years.includes(year))&&!used.includes(t.id)&&!ttUnavailable(t,day,period)&&!ttBusy(lessons,t.id,day,period)&&(t.laSuitability?.[laIndex]??2)>0).sort((a,b)=>((b.laSuitability?.[laIndex]??2)-(a.laSuitability?.[laIndex]??2))||ttTeacherLoad(lessons,a.id)-ttTeacherLoad(lessons,b.id))[0]||null
}
function ttAddSupport(lessons,{year,day,period,teacher,subject,roomId='',meta={}}){lessons.push({id:uid('lesson'),year,subject,day,period,duration:1,teacherId:teacher?.id||'',groupId:'',roomId,type:'Betreuung',generated:true,meta})}
function ttGenerateArrival(lessons,groups,issues){
 for(const day of [0,1,2,3,4])for(const group of groups){const coach=ttPickCoachForTeam(lessons,group,day,1);ttAddSupport(lessons,{year:Number(group.year),day,period:1,teacher:coach,subject:'Ankommen / Coaching',meta:{teamId:group.id,role:'arrival'}});if(!coach)issues.push(`${group.name}: ${TT_DAYS[day]} Ankommensstunde ohne Coach.`)}
}
function ttGenerateLearningAteliers(lessons,groups,issues){
 const r=ttEnsureSchoolConfig().rules,laRooms=tt().rooms.filter(x=>String(x.type).toLowerCase().includes('lernatelier')).slice(0,r.laRooms);
 for(const year of [5,6,7]){const yearGroups=groups.filter(g=>Number(g.year)===year);if(!yearGroups.length)continue;
  for(let day=0;day<5;day++)for(const period of [2,3,4]){
   const inputTeams=new Set(lessons.filter(l=>l.year===year&&l.day===day&&l.period===period&&l.groupId&&l.type!=='Betreuung').map(l=>l.groupId)).size;
   const teamsInLA=Math.max(0,yearGroups.length-inputTeams);if(!teamsInLA)continue;
   let needed=inputTeams>=r.laReducedFromInputs?r.laReducedCoaches:r.laNormalCoaches;needed=Math.min(needed,r.laRooms);
   const used=[];const requiredRooms=[];if(r.la3MustBeStaffed&&laRooms[2])requiredRooms.push(laRooms[2]);for(const room of laRooms)if(requiredRooms.length<needed&&!requiredRooms.includes(room))requiredRooms.push(room);
   for(let i=0;i<needed;i++){const room=requiredRooms[i]||laRooms[i],idx=room?laRooms.indexOf(room)+1:i+1,coach=ttPickLACoach(lessons,year,day,period,idx,used);if(coach)used.push(coach.id);ttAddSupport(lessons,{year,day,period,teacher:coach,subject:`Lernatelier ${idx}`,roomId:room?.id||'',meta:{role:'learning_atelier',teamsInLA,inputTeams}});if(!coach)issues.push(`Stufe ${year}: ${TT_DAYS[day]} ${period}. Stunde – Lernatelier ${idx} ohne Coach.`)}
  }
  for(let day=0;day<5;day++)for(const period of [5,6]){if(day===4)continue;const used=[];for(let i=0;i<Math.min(r.laLateCoaches,r.laRooms);i++){const idx=(r.la3MustBeStaffed&&i===0)?3:i+1,room=laRooms[idx-1],coach=ttPickLACoach(lessons,year,day,period,idx,used);if(coach)used.push(coach.id);ttAddSupport(lessons,{year,day,period,teacher:coach,subject:`Lernatelier ${idx}`,roomId:room?.id||'',meta:{role:'learning_atelier_late'}})}}
 }
}

function ttGeneratePlan(){
 ttSeedSchoolModel();ttEnsureSchoolConfig();const t=tt(),p=ttActivePlan();if(!p)return alert('Bitte zuerst eine Planvariante anlegen.');
 if(!t.teachers.length&&!confirm('Es sind noch keine Lehrkräfte importiert. Soll trotzdem ein Plan mit offenen Lehrkraftstellen erzeugt werden?'))return;
 if(p.lessons.length&&!confirm('Automatisch erzeugte Blöcke werden ersetzt, manuell angelegte bleiben erhalten. Fortfahren?'))return;
 const lessons=p.lessons.filter(l=>!l.generated),issues=[],groups=t.groups.filter(g=>[5,6,7].includes(Number(g.year)));
 // Phase 1: Ankommen wird zuerst reserviert
 if(ttRuleActive('r_arrival'))ttGenerateArrival(lessons,groups,issues);
 // Phase 2: Unterricht; Angebotsblöcke werden bewusst noch nicht wie normaler Teamunterricht vervielfacht
 for(const group of groups){const reqs=t.requirements.filter(r=>Number(r.year)===Number(group.year)&&!['Werkstatt','Kreativband'].includes(r.subject));for(const req of reqs){let left=Number(req.hours)||0;const subject=req.subject,doublePreferred=['Sport','Religion/Ethik'].includes(subject);while(left>0){const duration=doublePreferred&&left>=2?2:1,slot=ttFindSlot(lessons,group,subject,duration);if(!slot){issues.push(`${group.name}: ${left} Std. ${subject} konnten nicht gesetzt werden.`);break}ttAddGenerated(lessons,group,subject,duration,slot);if(!slot.teacher)issues.push(`${group.name}: ${subject} am ${TT_DAYS[slot.day]} noch ohne Lehrkraft.`);left-=duration}}}
 // Phase 3: Lernatelier-Betreuung auf Basis der tatsächlich gesetzten Inputs
 ttGenerateLearningAteliers(lessons,groups,issues);
 p.lessons=lessons;const conflicts=ttConflicts(),red=conflicts.filter(x=>x.level==='red').length,yellow=conflicts.filter(x=>x.level==='yellow').length;
 const generated=lessons.filter(l=>l.generated).length;t.generator.lastRun=new Date().toISOString();t.generator.report={coverage:100,issues:[...issues,...conflicts.map(x=>x.text)],red,yellow,generated,phases:['Zeitgerüst','Unterricht','Lernateliers']};Store.save();ttView='checks';toast('Organisationsplan erstellt');render()
}

// Zusätzliche schulische Prüfregeln
const ttBaseConflicts=ttConflicts;
function ttConflicts(){
 const out=ttBaseConflicts(),p=ttActivePlan(),r=ttEnsureSchoolConfig().rules;
 if(!p)return out;
 for(const group of tt().groups){for(let day=0;day<5;day++){const arrivals=p.lessons.filter(l=>l.day===day&&l.period===1&&l.subject==='Ankommen / Coaching'&&l.meta?.teamId===group.id);if(ttRuleActive('r_arrival_team')&&!arrivals.some(l=>l.teacherId))out.push({level:'red',text:`${group.name}: ${TT_DAYS[day]} fehlt ein Coach in der Ankommensstunde.`})}}
 if(ttRuleActive('r_la3'))for(const year of [5,6,7])for(let day=0;day<5;day++)for(const period of [2,3,4]){const anyLA=p.lessons.some(l=>l.year===year&&l.day===day&&l.period===period&&l.meta?.role==='learning_atelier');if(anyLA&&!p.lessons.some(l=>l.year===year&&l.day===day&&l.period===period&&l.subject==='Lernatelier 3'&&l.teacherId))out.push({level:'red',text:`Stufe ${year}: ${TT_DAYS[day]} ${period}. Stunde – Lernatelier 3 ist nicht besetzt.`})}
 for(const l of p.lessons)if(ttIsCoreSubject(l.subject)&&!r.corePeriods.includes(l.period))out.push({level:'yellow',text:`Hauptfach außerhalb 2.–4. Stunde: ${l.subject}, ${TT_DAYS[l.day]} ${l.period}. Stunde.`});
 return out.filter((x,i,a)=>a.findIndex(y=>y.text===x.text)===i)
}

/* ============================================================
   KOMPASS 7.2 – neue Lehrkräfteprofile, kompakte Stufenansicht
   und gemeinsam berechnete Input-/Lernatelier-Logik
   ============================================================ */
const TT72_STATES=['possible','preferred','avoid','blocked'];
function tt72EnsureTeacher(x){
  x.years=x.years||[];x.external=x.external||[];x.blocks=x.blocks||[];
  x.availability=x.availability||{};x.laPrefs=x.laPrefs||{1:2,2:2,3:2};
  x.arrivalMax=Number.isFinite(Number(x.arrivalMax))?Number(x.arrivalMax):tt72ArrivalMax(x.arrival);
  x.arrivalDays=x.arrivalDays||[0,1,2,3,4];x.workshopDays=x.workshopDays||[];
  return x;
}
function tt72ArrivalMax(v){const s=String(v||'').toLowerCase();const n=(s.match(/\d+/)||[])[0];if(n)return Number(n);if(s.includes('nie')||s.includes('nicht'))return 0;if(s.includes('häufig'))return 4;if(s.includes('gelegentlich'))return 2;return 3}
function tt72ParseCSV(text){
  const delim=(text.split(/\r?\n/,1)[0].match(/;/g)||[]).length>(text.split(/\r?\n/,1)[0].match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(ch==='"'){if(q&&nx==='"'){cell+='"';i++}else q=!q}else if(ch===delim&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&nx==='\n')i++;row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);row=[];cell=''}else cell+=ch}
  if(cell||row.length){row.push(cell);rows.push(row)}
  const head=(rows.shift()||[]).map(x=>x.trim());return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,(r[i]||'').trim()])))
}
function ttImportTeachers(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const rows=tt72ParseCSV(r.result),by={};for(const raw of rows){const first=raw['Vorname']||'',last=raw['Nachname']||'';if(!first&&!last)continue;const key=(first+'|'+last).toLowerCase(),date=raw['Ausgefüllt am']||'';if(!by[key]||date>by[key].date)by[key]={raw,date}}for(const {raw} of Object.values(by)){let x=tt().teachers.find(t=>(t.first||'').toLowerCase()===(raw['Vorname']||'').toLowerCase()&&(t.last||'').toLowerCase()===(raw['Nachname']||'').toLowerCase());if(!x){x={id:uid('teacher'),first:raw['Vorname']||'',last:raw['Nachname']||'',years:[],external:[],blocks:[]};tt().teachers.push(x)}tt72EnsureTeacher(x);x.account=raw['Account']||x.account||'';x.deputat=raw['Deputatsumfang:']||x.deputat||'';x.reductions=raw['Ermäßigungen:']||x.reductions||'';x.subjects=raw['Studierte Fächer:']||x.subjects||'';x.otherSubjects=raw['Mögliche fachfremde Fächer:']||x.otherSubjects||'';x.deputatNotes=raw['Im Deputat zu beachten:']||x.deputatNotes||'';x.notes=raw['Hinweise zur Stundenplanung']||x.notes||'';x.arrival=raw['Wie häufig kannst du die Ankommensstunde (1. Stunde) übernehmen?']||x.arrival||'';x.arrivalNotes=raw['Weitere Hinweise zur Ankommensstunde']||x.arrivalNotes||'';x.arrivalMax=tt72ArrivalMax(x.arrival);x.creative=raw['In welchen Bereichen könntest du dir einen Einsatz im Kreativband vorstellen?']||x.creative||'';x.workshopMax=raw['An wie vielen Nachmittagen könntest du im Werkstattunterricht eingesetzt werden?']||x.workshopMax||'';x.workshop=raw['Wünsche oder Anmerkungen zum Werkstattunterricht']||x.workshop||'';x.source=raw;
    // Importierte Sperren ergänzen, manuelle Angaben bleiben erhalten.
    x.blocks=(x.blocks||[]).filter(b=>b.manual);TT_DAYS.forEach((d,day)=>{const v=raw[`Notwendige Sperrzeiten ${d}:`];if(!v)return;const ps=ttParsePeriods(v);if(ps.length)x.blocks.push({id:uid('block'),day,periods:ps,label:v,type:'blocked',manual:false})});
    // Sperrzeiten auch in das editierbare Raster übertragen.
    for(const b of x.blocks)for(const p of (b.periods||[]))x.availability[`${b.day}-${p}`]='blocked';
  }tt().importedAt=new Date().toISOString();Store.save();toast('Deputatswünsche importiert');render()}catch(e){console.error(e);alert('Die CSV konnte nicht gelesen werden: '+e.message)}};r.readAsText(file,'utf-8')}
function tt72StateLabel(s){return s==='preferred'?'Bevorzugt':s==='avoid'?'Möglichst vermeiden':s==='blocked'?'Gesperrt':'Möglich'}
function tt72CycleAvailability(btn){const cur=btn.dataset.state||'possible',i=TT72_STATES.indexOf(cur),next=TT72_STATES[(i+1)%TT72_STATES.length];btn.dataset.state=next;btn.className='ttAvail '+next;btn.textContent=next==='preferred'?'★':next==='avoid'?'!':next==='blocked'?'×':'·';btn.title=tt72StateLabel(next)}
function ttRenderTeacherDialog(target){const x=tt72EnsureTeacher(State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{id:null,first:'',last:'',deputat:'',subjects:'',otherSubjects:'',years:[],external:[],blocks:[],availability:{},laPrefs:{1:2,2:2,3:2},arrivalMax:3,arrivalDays:[0,1,2,3,4]});target.innerHTML=`<div class="dialogBackdrop"><div class="dialog ttTeacherDialog"><div class="dialogHead"><h2>${x.id?'Lehrkraft bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
  <div class="ttProfileTabs"><b>Allgemein</b><span>Verfügbarkeit</span><span>Ankommen</span><span>Lernatelier</span><span>Angebote</span></div>
  <div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first)}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last)}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Studierte Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div><div><label>Weitere mögliche Fächer</label><input id="tt_other_subj" value="${esc(x.otherSubjects||'')}"></div></div>
  <label>Einsatz in unseren Stufen</label><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div>
  <div class="section">Verfügbarkeit und Sperrzeiten</div><p class="mini">Jedes Feld lässt sich durch Antippen ändern: möglich → bevorzugt → vermeiden → gesperrt.</p><div class="ttAvailGrid"><div></div>${Array.from({length:9},(_,i)=>`<b>${i+1}</b>`).join('')}${TT_DAYS.map((d,day)=>`<b>${d.slice(0,2)}</b>${Array.from({length:9},(_,i)=>{const p=i+1,s=x.availability[`${day}-${p}`]||'possible';return `<button type="button" class="ttAvail ${s}" data-day="${day}" data-period="${p}" data-state="${s}" onclick="tt72CycleAvailability(this)" title="${tt72StateLabel(s)}">${s==='preferred'?'★':s==='avoid'?'!':s==='blocked'?'×':'·'}</button>`}).join('')}`).join('')}</div>
  <div class="grid2 ttProfileColumns"><div><div class="section">Ankommensstunde</div><label>Maximal pro Woche</label><input id="tt_arrival_max" type="number" min="0" max="5" value="${x.arrivalMax}"><label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_arrival_day_${i}" type="checkbox" ${x.arrivalDays.includes(i)?'checked':''}> ${d.slice(0,2)}</label>`).join('')}</div><label>Hinweise</label><textarea id="tt_arrival_notes">${esc(x.arrivalNotes||x.arrival||'')}</textarea></div>
  <div><div class="section">Lernatelier-Präferenzen</div>${[1,2,3].map(i=>`<label>Lernatelier ${i}</label><select id="tt_la_${i}"><option value="3" ${Number(x.laPrefs[i])===3?'selected':''}>bevorzugt</option><option value="2" ${Number(x.laPrefs[i])===2?'selected':''}>möglich</option><option value="1" ${Number(x.laPrefs[i])===1?'selected':''}>nur bei Bedarf</option><option value="0" ${Number(x.laPrefs[i])===0?'selected':''}>nicht einsetzen</option></select>`).join('')}</div></div>
  <div class="grid2 ttProfileColumns"><div><div class="section">Angebote</div><label>Kreativband / Interessen</label><textarea id="tt_creative">${esc(x.creative||'')}</textarea><label>Werkstatt: mögliche Nachmittage</label><input id="tt_workshop_max" value="${esc(x.workshopMax||'')}"><label>Werkstatt-Hinweise</label><textarea id="tt_workshop">${esc(x.workshop||'')}</textarea></div><div><div class="section">Weitere Hinweise</div><textarea id="tt_notes">${esc(x.notes||'')}</textarea><div class="section">Externe Einsätze</div><div id="tt_external_rows">${(x.external||[]).map((e,i)=>ttExternalRow(e,i)).join('')}</div><button class="chip" onclick="ttAddExternalRow()">+ externer Einsatz</button></div></div>
  <div class="dialogActions"><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div></div>`}
function ttSaveTeacher(){const old=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=tt72EnsureTeacher(old||{id:uid('teacher'),external:[],blocks:[],availability:{}});x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.otherSubjects=document.getElementById('tt_other_subj').value.trim();x.notes=document.getElementById('tt_notes').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);x.arrivalMax=Number(document.getElementById('tt_arrival_max').value)||0;x.arrivalDays=TT_DAYS.map((_,i)=>i).filter(i=>document.getElementById('tt_arrival_day_'+i).checked);x.arrivalNotes=document.getElementById('tt_arrival_notes').value.trim();x.laPrefs={1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)};x.creative=document.getElementById('tt_creative').value.trim();x.workshopMax=document.getElementById('tt_workshop_max').value.trim();x.workshop=document.getElementById('tt_workshop').value.trim();x.availability={};document.querySelectorAll('.ttAvail[data-day]').forEach(b=>{if(b.dataset.state!=='possible')x.availability[`${b.dataset.day}-${b.dataset.period}`]=b.dataset.state});x.blocks=(x.blocks||[]).filter(b=>!b.manual);for(const [key,state] of Object.entries(x.availability))if(state==='blocked'){const [day,p]=key.split('-').map(Number);let b=x.blocks.find(z=>z.manual&&z.day===day);if(!b){b={id:uid('block'),day,periods:[],label:'Manuell',type:'blocked',manual:true};x.blocks.push(b)}if(!b.periods.includes(p))b.periods.push(p)}x.external=[...document.querySelectorAll('#tt_external_rows .ttInlineRow')].map(r=>({id:uid('external'),label:r.querySelector('[data-ext=label]').value.trim(),day:Number(r.querySelector('[data-ext=day]').value),period:Number(r.querySelector('[data-ext=period]').value)})).filter(e=>e.label);if(!x.first&&!x.last)return;if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast('Lehrkraft gespeichert');render()}
function ttTeachersView(){const q=ttTeacherFilter.toLowerCase(),rows=tt().teachers.map(tt72EnsureTeacher).filter(x=>!q||`${x.first} ${x.last} ${x.subjects} ${x.notes}`.toLowerCase().includes(q));return `<div class="grid2"><div class="card"><h2>IServ-Deputatswünsche importieren</h2><p>Importierte Angaben bleiben anschließend vollständig bearbeitbar. Manuelle Ergänzungen werden bei erneutem Import nicht gelöscht.</p><input type="file" accept=".csv,text/csv" onchange="ttImportTeachers(this.files[0])"><div class="mini">${tt().teachers.length} Lehrkräfte gespeichert${tt().importedAt?' · letzter Import '+new Date(tt().importedAt).toLocaleString('de-DE'):''}</div></div><div class="card"><h2>Lehrkraft ergänzen</h2><button class="chip dark" onclick="ttOpenTeacher()">Lehrkraft anlegen</button><input placeholder="Lehrkräfte durchsuchen …" value="${esc(ttTeacherFilter)}" oninput="ttTeacherFilter=this.value;render()"></div></div><div class="section">Lehrkräftepool</div><div class="teacherGrid tt72TeacherGrid">${rows.map(x=>{const blocked=Object.values(x.availability).filter(v=>v==='blocked').length,complete=x.arrivalMax>=0&&x.laPrefs;return `<div class="teacherCard"><div class="teacherHead"><div><b>${esc(x.first)} ${esc(x.last)}</b><div class="mini">${esc(x.subjects||'Fächer noch offen')}</div></div><span class="badge">${esc(x.deputat||'–')} Std.</span></div><div class="stageTags">${[5,6,7].map(y=>`<span class="statusPill ${x.years?.includes(y)?'status-green':'status-empty'}">Stufe ${y}</span>`).join('')}</div><div class="ttTeacherFacts"><span>🌅 max. ${x.arrivalMax}</span><span>🚫 ${blocked} Sperren</span><span>LA ${x.laPrefs[1]}/${x.laPrefs[2]}/${x.laPrefs[3]}</span></div><div class="mini">${complete?'Profil bearbeitbar':'Angaben unvollständig'}</div><button class="chip" onclick="ttOpenTeacher('${x.id}')">Profil bearbeiten</button></div>`}).join('')||'<div class="card empty">Noch keine Lehrkräfte importiert.</div>'}</div>`}
function ttUnavailable(t,day,period){tt72EnsureTeacher(t);const state=t?.availability?.[`${day}-${period}`];return state==='blocked'||!!(t?.external?.some(e=>Number(e.day)===day&&Number(e.period)===period)||t?.blocks?.some(b=>Number(b.day)===day&&(!b.periods?.length||b.periods.map(Number).includes(period))))}
function tt72PreferencePenalty(t,day,period){const s=t?.availability?.[`${day}-${period}`];return s==='preferred'?-5:s==='avoid'?20:0}
function tt72TeacherSubjectScore(t,subject){const hay=(String(t.subjects||'')+' '+String(t.otherSubjects||'')).toLowerCase(),s=subject.toLowerCase();if(s==='mathematik'&&hay.includes('mathe'))return 0;if(hay.includes(s))return 0;return 15}
function tt72PickTeacher(lessons,subject,year,day,period,duration=1,extra=()=>true){return tt().teachers.map(tt72EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year))&&extra(t)&&Array.from({length:duration},(_,k)=>period+k).every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p))).sort((a,b)=>(tt72TeacherSubjectScore(a,subject)+tt72PreferencePenalty(a,day,period)+ttTeacherLoad(lessons,a.id)*2+ttTeacherDayLoad(lessons,a.id,day)*3)-(tt72TeacherSubjectScore(b,subject)+tt72PreferencePenalty(b,day,period)+ttTeacherLoad(lessons,b.id)*2+ttTeacherDayLoad(lessons,b.id,day)*3))[0]||null}
function tt72CoreSlots(){const a=[];for(let d=0;d<5;d++)for(const p of [2,3,4])if(!(d===4&&(p===2)))a.push([d,p]);return a}
function tt72GenerateCore(lessons,groups,issues){const subjects=['Deutsch','Mathematik','Englisch'],slots=tt72CoreSlots();groups.forEach((g,gi)=>{subjects.forEach((subject,si)=>{for(let n=0;n<3;n++){let best=null;for(const [day,period] of slots){if(ttGroupBusy(lessons,g.id,day,period))continue;const parallel=lessons.filter(l=>l.day===day&&l.period===period&&ttIsCoreSubject(l.subject)).length;const sameDay=lessons.filter(l=>l.groupId===g.id&&l.day===day&&l.subject===subject).length;const teacher=tt72PickTeacher(lessons,subject,g.year,day,period);const score=parallel*12+sameDay*30+Math.abs(((gi*3+si+n)%5)-day)*2+(period-2);if((teacher||tt().teachers.length===0)&&(!best||score<best.score))best={day,period,teacher,score}}if(!best){issues.push(`${g.name}: ${subject} konnte nicht vollständig verteilt werden.`);return}lessons.push({id:uid('lesson'),year:g.year,subject,day:best.day,period:best.period,duration:1,teacherId:best.teacher?.id||'',groupId:g.id,roomId:'',type:'Input',generated:true})}})})}
function tt72GenerateArrival(lessons,groups,issues){for(let day=0;day<5;day++)for(const g of groups){const candidates=tt().teachers.map(tt73EnsureTeacher).filter(t=>t.coachTeams.includes(g.id)&&(!t.years.length||t.years.includes(g.year))&&t.arrivalMax>0&&t.arrivalDays.includes(day)&&!ttUnavailable(t,day,1)&&!ttBusy(lessons,t.id,day,1)&&lessons.filter(l=>l.teacherId===t.id&&l.subject==='Ankommen / Coaching').length<t.arrivalMax).sort((a,b)=>tt72PreferencePenalty(a,day,1)-tt72PreferencePenalty(b,day,1)||lessons.filter(l=>l.teacherId===a.id&&l.subject==='Ankommen / Coaching').length-lessons.filter(l=>l.teacherId===b.id&&l.subject==='Ankommen / Coaching').length);const teacher=candidates[0];lessons.push({id:uid('lesson'),year:g.year,subject:'Ankommen / Coaching',day,period:1,duration:1,teacherId:teacher?.id||'',groupId:g.id,roomId:'',type:'Coaching',generated:true});if(!teacher)issues.push(`${g.name}: ${TT_DAYS[day]} Ankommensstunde ohne verfügbaren zugeordneten Coach.`)}}
function tt72GenerateLA(lessons,groups,issues){const rooms=tt().rooms.filter(r=>String(r.type||r.name).toLowerCase().includes('lernatelier')).slice(0,3);for(let day=0;day<5;day++)for(const period of [2,3,4]){if(day===4&&period===2)continue;const inputs=groups.filter(g=>lessons.some(l=>l.groupId===g.id&&l.day===day&&l.period===period&&ttIsCoreSubject(l.subject))).length;const needed=inputs>=2?2:3;const chosen=[];const indices=needed===2?[3,1]:[1,2,3];for(const la of indices){const room=rooms[la-1];const teacher=tt().teachers.map(tt72EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(groups[0]?.year))&&!chosen.includes(t.id)&&!ttUnavailable(t,day,period)&&!ttBusy(lessons,t.id,day,period)&&Number(t.laPrefs[la]||0)>0).sort((a,b)=>Number(b.laPrefs[la]||0)-Number(a.laPrefs[la]||0)||ttTeacherDayLoad(lessons,a.id,day)-ttTeacherDayLoad(lessons,b.id,day))[0];if(teacher)chosen.push(teacher.id);lessons.push({id:uid('lesson'),year:groups[0]?.year||ttYear,subject:`Lernatelier ${la}`,day,period,duration:1,teacherId:teacher?.id||'',groupId:'',roomId:room?.id||'',type:'Lernatelier',generated:true,meta:{inputs,la}});if(!teacher)issues.push(`${TT_DAYS[day]} ${period}. Stunde: Lernatelier ${la} ohne Coach.`)}}}
function ttGeneratePlan(){ttSeedSchoolModel();const p=ttActivePlan();if(!p)return alert('Bitte zuerst eine Planvariante anlegen.');if(p.lessons.length&&!confirm('Automatisch erzeugte Blöcke werden ersetzt; manuelle Einträge bleiben erhalten. Fortfahren?'))return;const lessons=p.lessons.filter(l=>!l.generated),issues=[];const groups=tt().groups.filter(g=>Number(g.year)===Number(ttYear));if(!groups.length)return alert(`Für Stufe ${ttYear} sind noch keine Farbteams angelegt.`);tt72GenerateArrival(lessons,groups,issues);tt72GenerateCore(lessons,groups,issues);tt72GenerateLA(lessons,groups,issues);p.lessons=lessons;tt().generator=tt().generator||{};tt().generator.lastRun=new Date().toISOString();tt().generator.report={issues,generated:lessons.filter(l=>l.generated).length};Store.save();ttView='plan';toast('Stufenplan 7.2 berechnet');render()}
function tt72CellText(l){const t=tt().teachers.find(x=>x.id===l.teacherId),short=t?`${t.first?.[0]||''}. ${t.last}`:'offen';return `<b>${esc(l.subject.replace('Mathematik','Mathe').replace('Ankommen / Coaching','Ankommen'))}</b><small>${esc(short)}</small>`}
function ttPlanView(p){if(!p)return '<div class="card empty">Noch keine Planvariante.</div>';const groups=tt().groups.filter(g=>Number(g.year)===Number(ttYear));return `<div class="card ttPlanToolbar"><select onchange="tt().activePlanId=this.value;Store.save();render()">${tt().plans.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><select onchange="ttYear=Number(this.value);render()">${[5,6,7].map(y=>`<option value="${y}" ${ttYear===y?'selected':''}>Stufe ${y}</option>`).join('')}</select><button class="chip dark" onclick="ttGeneratePlan()">⚙ Stufenplan berechnen</button></div><div class="ttCompactWrap"><table class="ttCompact"><thead><tr><th>Tag / Std.</th>${groups.map(g=>`<th>${esc(g.name.replace('Team ',''))}</th>`).join('')}<th class="laHead">Lernateliers / Betreuung</th></tr></thead><tbody>${TT_DAYS.map((dayName,day)=>Array.from({length:9},(_,i)=>i+1).map(period=>{const ls=p.lessons.filter(l=>l.day===day&&l.period===period&&Number(l.year)===Number(ttYear));return `<tr class="${period===1?'arrivalRow':''}"><th>${dayName.slice(0,2)} ${period}</th>${groups.map(g=>{const l=ls.find(x=>x.groupId===g.id);return `<td onclick="ttOpenLesson('${l?.id||''}',${day},${period})">${l?tt72CellText(l):'<span class="emptyDot">·</span>'}</td>`}).join('')}<td class="laCell">${ls.filter(l=>l.type==='Lernatelier').map(l=>`<span class="laMini ${l.teacherId?'ok':'open'}">${esc(l.subject.replace('Lernatelier ', 'LA'))}: ${esc(ttNameTeacher(l.teacherId).replace('Unbekannt','offen'))}</span>`).join('')||'<span class="emptyDot">·</span>'}</td></tr>`}).join('')).join('')}</tbody></table></div>`}
function timetable(){ttEnsureSchoolConfig();const p=ttActivePlan();let c=header('Stundenplanung','Farbteams, Inputs, Lernateliers und Lehrkräfte gemeinsam berechnen.');c+=`<div class="toolbar ttTabs"><button class="chip ${ttView==='plan'?'dark':''}" onclick="ttView='plan';render()">Wochenplan</button><button class="chip ${ttView==='teachers'?'dark':''}" onclick="ttView='teachers';render()">Lehrkräfte</button><button class="chip ${ttView==='model'?'dark':''}" onclick="ttView='model';render()">Schulmodell</button><button class="chip ${ttView==='setup'?'dark':''}" onclick="ttView='setup';render()">Grunddaten</button><button class="chip ${ttView==='checks'?'dark':''}" onclick="ttView='checks';render()">Prüfung</button><button class="chip ${ttView==='summary'?'dark':''}" onclick="ttView='summary';render()">Auswertung</button></div>`;if(ttView==='teachers')c+=ttTeachersView();else if(ttView==='model')c+=ttModelView();else if(ttView==='setup')c+=ttSetupView();else if(ttView==='checks')c+=ttChecksView();else if(ttView==='summary')c+=ttSummaryView();else c+=ttPlanView(p);shell(c)}

/* ============================================================
   KOMPASS 7.3 – ganztägige Sperren und verbindliche
   Team-/Fachzuordnungen für Hauptfächer
   ============================================================ */
function tt73EnsureTeacher(x){
  tt72EnsureTeacher(x);
  x.fullDayBlocked=x.fullDayBlocked||[];
  x.teamSubjects=x.teamSubjects||{};
  x.coachTeams=x.coachTeams||[];
  return x;
}
function tt73InferFullDays(x){
  const text=[x.notes,x.deputatNotes,x.arrivalNotes,x.arrival, ...(x.source?Object.values(x.source):[])].join(' ').toLowerCase();
  TT_DAYS.forEach((d,day)=>{
    const n=d.toLowerCase();
    const patterns=[`${n} ganztägig`,`${n} komplett`,`${n} gar nicht`,`${n} nicht verfügbar`,`${n} seminar`];
    if(patterns.some(p=>text.includes(p))&&!x.fullDayBlocked.includes(day))x.fullDayBlocked.push(day);
  });
  x.fullDayBlocked=[...new Set(x.fullDayBlocked.map(Number))];
  return x;
}
function tt73TeamKey(groupId,subject){return `${groupId}|${subject}`}
function tt73AssignedTo(t,group,subject){
  tt73EnsureTeacher(t);
  const key=tt73TeamKey(group.id,subject);
  return t.teamSubjects[key]===true;
}
function tt73SeedKnownAssignments(){
  const groups=tt().groups.filter(g=>Number(g.year)===6);
  const byColour={};groups.forEach(g=>{const n=g.name.toLowerCase();['blau','rot','gelb','violett','grün'].forEach(c=>{if(n.includes(c))byColour[c]=g})});
  const coachMap=[
    ['Rock','blau'],['Oursin','blau'],
    ['Zwilling','rot'],['Moser','rot'],
    ['Tsehaye','gelb'],['Bachmair','gelb'],
    ['Schöne','violett'],['Brusda','violett'],
    ['Schnepf','grün'],['Vogt','grün']
  ];
  for(const [last,colour] of coachMap){const g=byColour[colour],t=tt().teachers.find(x=>(x.last||'').toLowerCase().includes(last.toLowerCase()));if(g&&t){tt73EnsureTeacher(t);if(!t.coachTeams.includes(g.id))t.coachTeams.push(g.id)}}
  const map=[
    ['Rock','blau','Englisch'],['Oursin','blau','Deutsch'],['Bay','blau','Mathematik'],
    ['Zwilling','rot','Englisch'],['Zwilling','rot','Deutsch'],['Brusda','rot','Deutsch'],['Moser','rot','Mathematik'],
    ['Tsehaye','gelb','Englisch'],['Bachmair','gelb','Deutsch'],['Bachmair','gelb','Mathematik'],
    ['Schöne','violett','Englisch'],['Brusda','violett','Deutsch'],['Fürle','violett','Mathematik'],
    ['Vogt','grün','Deutsch'],['Schnepf','grün','Mathematik'],['Zwilling','grün','Englisch'],['Schöne','grün','Englisch'],['Rock','grün','Englisch']
  ];
  for(const [last,colour,subject] of map){const g=byColour[colour],t=tt().teachers.find(x=>(x.last||'').toLowerCase().includes(last.toLowerCase()));if(g&&t){tt73EnsureTeacher(t);const k=tt73TeamKey(g.id,subject);if(t.teamSubjects[k]===undefined)t.teamSubjects[k]=true}}
}
function tt73SetWholeDay(day,blocked){
  document.querySelectorAll(`.ttAvail[data-day="${day}"]`).forEach(b=>{b.dataset.state=blocked?'blocked':'possible';b.className='ttAvail '+b.dataset.state;b.textContent=blocked?'×':'·';b.title=tt72StateLabel(b.dataset.state)});
  const cb=document.getElementById('tt_full_day_'+day);if(cb)cb.checked=blocked;
}
function ttImportTeachers(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const rows=tt72ParseCSV(r.result),by={};for(const raw of rows){const first=raw['Vorname']||'',last=raw['Nachname']||'';if(!first&&!last)continue;const key=(first+'|'+last).toLowerCase(),date=raw['Ausgefüllt am']||'';if(!by[key]||date>by[key].date)by[key]={raw,date}}for(const {raw} of Object.values(by)){let x=tt().teachers.find(t=>(t.first||'').toLowerCase()===(raw['Vorname']||'').toLowerCase()&&(t.last||'').toLowerCase()===(raw['Nachname']||'').toLowerCase());if(!x){x={id:uid('teacher'),first:raw['Vorname']||'',last:raw['Nachname']||'',years:[],external:[],blocks:[]};tt().teachers.push(x)}tt73EnsureTeacher(x);x.account=raw['Account']||x.account||'';x.deputat=raw['Deputatsumfang:']||x.deputat||'';x.reductions=raw['Ermäßigungen:']||x.reductions||'';x.subjects=raw['Studierte Fächer:']||x.subjects||'';x.otherSubjects=raw['Mögliche fachfremde Fächer:']||x.otherSubjects||'';x.deputatNotes=raw['Im Deputat zu beachten:']||x.deputatNotes||'';x.notes=raw['Hinweise zur Stundenplanung']||x.notes||'';x.arrival=raw['Wie häufig kannst du die Ankommensstunde (1. Stunde) übernehmen?']||x.arrival||'';x.arrivalNotes=raw['Weitere Hinweise zur Ankommensstunde']||x.arrivalNotes||'';x.arrivalMax=tt72ArrivalMax(x.arrival);x.creative=raw['In welchen Bereichen könntest du dir einen Einsatz im Kreativband vorstellen?']||x.creative||'';x.workshopMax=raw['An wie vielen Nachmittagen könntest du im Werkstattunterricht eingesetzt werden?']||x.workshopMax||'';x.workshop=raw['Wünsche oder Anmerkungen zum Werkstattunterricht']||x.workshop||'';x.source=raw;x.blocks=(x.blocks||[]).filter(b=>b.manual);TT_DAYS.forEach((d,day)=>{const v=raw[`Notwendige Sperrzeiten ${d}:`];if(!v)return;const ps=ttParsePeriods(v);if(ps.length)x.blocks.push({id:uid('block'),day,periods:ps,label:v,type:'blocked',manual:false})});for(const b of x.blocks)for(const p of (b.periods||[]))x.availability[`${b.day}-${p}`]='blocked';tt73InferFullDays(x);for(const d of x.fullDayBlocked)for(let p=1;p<=9;p++)x.availability[`${d}-${p}`]='blocked'}tt73SeedKnownAssignments();tt().importedAt=new Date().toISOString();Store.save();toast('Deputatswünsche und Sperrtage importiert');render()}catch(e){console.error(e);alert('Die CSV konnte nicht gelesen werden: '+e.message)}};r.readAsText(file,'utf-8')}
function ttRenderTeacherDialog(target){const x=tt73InferFullDays(tt73EnsureTeacher(State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{id:null,first:'',last:'',deputat:'',subjects:'',otherSubjects:'',years:[],external:[],blocks:[],availability:{},laPrefs:{1:2,2:2,3:2},arrivalMax:3,arrivalDays:[0,1,2,3,4],fullDayBlocked:[],teamSubjects:{}}));const core=['Deutsch','Mathematik','Englisch'];const groups=tt().groups.filter(g=>[5,6,7].includes(Number(g.year)));target.innerHTML=`<div class="dialogBackdrop"><div class="dialog ttTeacherDialog"><div class="dialogHead"><h2>${x.id?'Lehrkraft bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
<div class="ttProfileTabs"><b>Allgemein</b><span>Verfügbarkeit</span><span>Ankommen</span><span>Teamfächer</span><span>Lernatelier</span></div>
<div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first)}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last)}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Studierte Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div><div><label>Weitere mögliche Fächer</label><input id="tt_other_subj" value="${esc(x.otherSubjects||'')}"></div></div>
<label>Einsatz in unseren Stufen</label><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div>
<div class="section">Komplett freie / nicht verplanbare Tage</div><div class="choice ttDayLocks">${TT_DAYS.map((d,i)=>`<label class="check dayLock"><input id="tt_full_day_${i}" type="checkbox" ${x.fullDayBlocked.includes(i)?'checked':''} onchange="tt73SetWholeDay(${i},this.checked)"> ${d} komplett gesperrt</label>`).join('')}</div>
<div class="section">Verfügbarkeit und Sperrzeiten</div><p class="mini">Ganztägige Sperren werden oben gesetzt. Einzelne Stunden lassen sich hier zusätzlich ändern.</p><div class="ttAvailGrid"><div></div>${Array.from({length:9},(_,i)=>`<b>${i+1}</b>`).join('')}${TT_DAYS.map((d,day)=>`<b>${d.slice(0,2)}</b>${Array.from({length:9},(_,i)=>{const p=i+1,s=x.availability[`${day}-${p}`]||'possible';return `<button type="button" class="ttAvail ${s}" data-day="${day}" data-period="${p}" data-state="${s}" onclick="tt72CycleAvailability(this)" title="${tt72StateLabel(s)}">${s==='preferred'?'★':s==='avoid'?'!':s==='blocked'?'×':'·'}</button>`}).join('')}`).join('')}</div>
<div class="section">Coach-Zuordnung</div><p class="mini">In der Ankommensstunde wird eine Lehrkraft nur bei einem hier zugeordneten Farbteam eingesetzt.</p><div class="choice">${groups.map(g=>`<label class="check"><input type="checkbox" data-coach-team="${g.id}" ${x.coachTeams.includes(g.id)?'checked':''}> ${esc(g.name)} · Stufe ${g.year}</label>`).join('')}</div>
<div class="section">Verbindliche Team-/Fachzuordnungen</div><p class="mini">Nur angehakte Kombinationen dürfen vom Generator für Hauptfächer verwendet werden.</p><div class="ttTeamSubjectMatrix"><table><thead><tr><th>Team</th>${core.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)} · Stufe ${g.year}</td>${core.map(s=>{const k=tt73TeamKey(g.id,s);return `<td><input type="checkbox" data-team-subject="${esc(k)}" ${x.teamSubjects[k]?'checked':''}></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
<div class="grid2 ttProfileColumns"><div><div class="section">Ankommensstunde</div><label>Maximal pro Woche</label><input id="tt_arrival_max" type="number" min="0" max="5" value="${x.arrivalMax}"><label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_arrival_day_${i}" type="checkbox" ${x.arrivalDays.includes(i)?'checked':''}> ${d.slice(0,2)}</label>`).join('')}</div><label>Hinweise</label><textarea id="tt_arrival_notes">${esc(x.arrivalNotes||x.arrival||'')}</textarea></div><div><div class="section">Lernatelier-Präferenzen</div>${[1,2,3].map(i=>`<label>Lernatelier ${i}</label><select id="tt_la_${i}"><option value="3" ${Number(x.laPrefs[i])===3?'selected':''}>bevorzugt</option><option value="2" ${Number(x.laPrefs[i])===2?'selected':''}>möglich</option><option value="1" ${Number(x.laPrefs[i])===1?'selected':''}>nur bei Bedarf</option><option value="0" ${Number(x.laPrefs[i])===0?'selected':''}>nicht einsetzen</option></select>`).join('')}</div></div>
<div class="grid2 ttProfileColumns"><div><div class="section">Angebote</div><label>Kreativband / Interessen</label><textarea id="tt_creative">${esc(x.creative||'')}</textarea><label>Werkstatt: mögliche Nachmittage</label><input id="tt_workshop_max" value="${esc(x.workshopMax||'')}"><label>Werkstatt-Hinweise</label><textarea id="tt_workshop">${esc(x.workshop||'')}</textarea></div><div><div class="section">Weitere Hinweise</div><textarea id="tt_notes">${esc(x.notes||'')}</textarea><div class="section">Externe Einsätze</div><div id="tt_external_rows">${(x.external||[]).map((e,i)=>ttExternalRow(e,i)).join('')}</div><button class="chip" onclick="ttAddExternalRow()">+ externer Einsatz</button></div></div>
<div class="dialogActions"><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div></div>`}
function ttSaveTeacher(){const old=State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=tt73EnsureTeacher(old||{id:uid('teacher'),external:[],blocks:[],availability:{},teamSubjects:{},fullDayBlocked:[]});x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.otherSubjects=document.getElementById('tt_other_subj').value.trim();x.notes=document.getElementById('tt_notes').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);x.fullDayBlocked=TT_DAYS.map((_,i)=>i).filter(i=>document.getElementById('tt_full_day_'+i).checked);x.arrivalMax=Number(document.getElementById('tt_arrival_max').value)||0;x.arrivalDays=TT_DAYS.map((_,i)=>i).filter(i=>document.getElementById('tt_arrival_day_'+i).checked&&!x.fullDayBlocked.includes(i));x.arrivalNotes=document.getElementById('tt_arrival_notes').value.trim();x.laPrefs={1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)};x.creative=document.getElementById('tt_creative').value.trim();x.workshopMax=document.getElementById('tt_workshop_max').value.trim();x.workshop=document.getElementById('tt_workshop').value.trim();x.coachTeams=[...document.querySelectorAll('[data-coach-team]:checked')].map(e=>e.dataset.coachTeam);x.teamSubjects={};document.querySelectorAll('[data-team-subject]:checked').forEach(e=>x.teamSubjects[e.dataset.teamSubject]=true);x.availability={};document.querySelectorAll('.ttAvail[data-day]').forEach(b=>{if(b.dataset.state!=='possible')x.availability[`${b.dataset.day}-${b.dataset.period}`]=b.dataset.state});for(const d of x.fullDayBlocked)for(let p=1;p<=9;p++)x.availability[`${d}-${p}`]='blocked';x.blocks=(x.blocks||[]).filter(b=>!b.manual);for(const [key,state] of Object.entries(x.availability))if(state==='blocked'){const [day,p]=key.split('-').map(Number);let b=x.blocks.find(z=>z.manual&&z.day===day);if(!b){b={id:uid('block'),day,periods:[],label:'Manuell',type:'blocked',manual:true};x.blocks.push(b)}if(!b.periods.includes(p))b.periods.push(p)}x.external=[...document.querySelectorAll('#tt_external_rows .ttInlineRow')].map(r=>({id:uid('external'),label:r.querySelector('[data-ext=label]').value.trim(),day:Number(r.querySelector('[data-ext=day]').value),period:Number(r.querySelector('[data-ext=period]').value)})).filter(e=>e.label);if(!x.first&&!x.last)return;if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast('Lehrkraft und Teamzuordnungen gespeichert');render()}
function ttUnavailable(t,day,period){tt73EnsureTeacher(t);return t.fullDayBlocked.includes(Number(day))||t?.availability?.[`${day}-${period}`]==='blocked'||!!(t?.external?.some(e=>Number(e.day)===day&&Number(e.period)===period)||t?.blocks?.some(b=>Number(b.day)===day&&(!b.periods?.length||b.periods.map(Number).includes(period))))}
function tt72PickTeacher(lessons,subject,year,day,period,duration=1,extra=()=>true,group=null){return tt().teachers.map(tt73EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year))&&extra(t)&&(!group||!ttIsCoreSubject(subject)||tt73AssignedTo(t,group,subject))&&Array.from({length:duration},(_,k)=>period+k).every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p))).sort((a,b)=>(tt72TeacherSubjectScore(a,subject)+tt72PreferencePenalty(a,day,period)+ttTeacherLoad(lessons,a.id)*2+ttTeacherDayLoad(lessons,a.id,day)*3)-(tt72TeacherSubjectScore(b,subject)+tt72PreferencePenalty(b,day,period)+ttTeacherLoad(lessons,b.id)*2+ttTeacherDayLoad(lessons,b.id,day)*3))[0]||null}
function tt72GenerateCore(lessons,groups,issues){const subjects=['Deutsch','Mathematik','Englisch'],slots=tt72CoreSlots();groups.forEach((g,gi)=>{subjects.forEach((subject,si)=>{for(let n=0;n<3;n++){let best=null;for(const [day,period] of slots){if(ttGroupBusy(lessons,g.id,day,period))continue;const parallel=lessons.filter(l=>l.day===day&&l.period===period&&ttIsCoreSubject(l.subject)).length;const sameDay=lessons.filter(l=>l.groupId===g.id&&l.day===day&&l.subject===subject).length;const teacher=tt72PickTeacher(lessons,subject,g.year,day,period,1,()=>true,g);const score=parallel*12+sameDay*30+Math.abs(((gi*3+si+n)%5)-day)*2+(period-2);if(teacher&&(!best||score<best.score))best={day,period,teacher,score}}if(!best){issues.push(`${g.name}: ${subject} konnte nicht gesetzt werden – keine passende Teamzuordnung oder keine verfügbare Lehrkraft.`);return}lessons.push({id:uid('lesson'),year:g.year,subject,day:best.day,period:best.period,duration:1,teacherId:best.teacher.id,groupId:g.id,roomId:'',type:'Input',generated:true})}})})}
function ttTeachersView(){tt73SeedKnownAssignments();const q=ttTeacherFilter.toLowerCase(),rows=tt().teachers.map(tt73EnsureTeacher).filter(x=>!q||`${x.first} ${x.last} ${x.subjects} ${x.notes}`.toLowerCase().includes(q));return `<div class="grid2"><div class="card"><h2>IServ-Deputatswünsche importieren</h2><p>Ganztägige Sperren aus Hinweisen werden erkannt. Alle Angaben bleiben danach manuell bearbeitbar.</p><input type="file" accept=".csv,text/csv" onchange="ttImportTeachers(this.files[0])"><div class="mini">${tt().teachers.length} Lehrkräfte gespeichert${tt().importedAt?' · letzter Import '+new Date(tt().importedAt).toLocaleString('de-DE'):''}</div></div><div class="card"><h2>Lehrkraft ergänzen</h2><button class="chip dark" onclick="ttOpenTeacher()">Lehrkraft anlegen</button><input placeholder="Lehrkräfte durchsuchen …" value="${esc(ttTeacherFilter)}" oninput="ttTeacherFilter=this.value;render()"></div></div><div class="section">Lehrkräftepool</div><div class="teacherGrid tt72TeacherGrid">${rows.map(x=>{const blocked=Object.values(x.availability).filter(v=>v==='blocked').length,assignments=Object.values(x.teamSubjects||{}).filter(Boolean).length;return `<div class="teacherCard"><div class="teacherHead"><div><b>${esc(x.first)} ${esc(x.last)}</b><div class="mini">${esc(x.subjects||'Fächer noch offen')}</div></div><span class="badge">${esc(x.deputat||'–')} Std.</span></div><div class="stageTags">${[5,6,7].map(y=>`<span class="statusPill ${x.years?.includes(y)?'status-green':'status-empty'}">Stufe ${y}</span>`).join('')}</div><div class="ttTeacherFacts"><span>🌅 max. ${x.arrivalMax}</span><span>📅 ${x.fullDayBlocked.length} Sperrtage</span><span>🎯 ${assignments} Teamfächer</span><span>LA ${x.laPrefs[1]}/${x.laPrefs[2]}/${x.laPrefs[3]}</span></div><button class="chip" onclick="ttOpenTeacher('${x.id}')">Profil bearbeiten</button></div>`}).join('')||'<div class="card empty">Noch keine Lehrkräfte importiert.</div>'}</div>`}

/* ============================================================
   KOMPASS 7.5 – Kreativband und Lernatelier in der 5./6. Stunde
   ============================================================ */
function tt75CreativeStatusFromText(value){
  const s=String(value||'').trim().toLowerCase();
  if(!s)return 'la';
  if(/kein(en)? einsatz|nicht vorstellen|nicht möglich|nein/.test(s))return 'la';
  if(/vielleicht|eventuell|nach absprache/.test(s))return 'maybe';
  return 'creative';
}
function tt75CreativeAreasFromText(value){
  const s=String(value||'').replace(/^"|"$/g,'').trim();
  if(!s||tt75CreativeStatusFromText(s)==='la')return [];
  return s.split(',').map(x=>x.replace(/^"|"$/g,'').trim()).filter(Boolean);
}
function tt75EnsureTeacher(x){
  tt73EnsureTeacher(x);
  if(!x.creativeStatus)x.creativeStatus=tt75CreativeStatusFromText(x.creative);
  if(!Array.isArray(x.creativeAreas)||!x.creativeAreas.length)x.creativeAreas=tt75CreativeAreasFromText(x.creative);
  x.creativeDetails=x.creativeDetails||'';
  x.creativeDays=Array.isArray(x.creativeDays)?x.creativeDays:[0,1,2,3];
  return x;
}
const tt74RenderTeacherDialog=ttRenderTeacherDialog;
function ttRenderTeacherDialog(target){
  tt74RenderTeacherDialog(target);
  const x=tt75EnsureTeacher(State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{creative:'',creativeStatus:'la',creativeAreas:[],creativeDays:[0,1,2,3]});
  const actions=target.querySelector('.dialogActions');
  if(!actions)return;
  const wrap=document.createElement('div');
  wrap.className='tt75CreativeProfile';
  wrap.innerHTML=`<div class="section">Kreativband – Einsatz in der 5./6. Stunde</div>
    <p class="mini">Die importierte Antwort wird strukturiert erfasst und kann hier jederzeit angepasst werden.</p>
    <div class="formgrid">
      <div><label>Einsatzart</label><select id="tt_creative_status">
        <option value="creative" ${x.creativeStatus==='creative'?'selected':''}>im Kreativband einsetzen</option>
        <option value="maybe" ${x.creativeStatus==='maybe'?'selected':''}>nach Möglichkeit / Absprache</option>
        <option value="la" ${x.creativeStatus==='la'?'selected':''}>stattdessen im Lernatelier einsetzen</option>
      </select></div>
      <div><label>Bereiche / Räume</label><input id="tt_creative_areas" value="${esc((x.creativeAreas||[]).join(', '))}" placeholder="z. B. Kunstatelier, Schulgarten"></div>
    </div>
    <label>Konkrete Idee oder Hinweise</label><textarea id="tt_creative_details" placeholder="z. B. Scratch-Projekte, Nähen, Gartenarbeit …">${esc(x.creativeDetails||'')}</textarea>
    <label>Mögliche Tage für 5./6. Stunde</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_creative_day_${i}" type="checkbox" ${x.creativeDays.includes(i)?'checked':''} ${i===4?'disabled':''}> ${d.slice(0,2)}</label>`).join('')}</div>`;
  actions.parentNode.insertBefore(wrap,actions);
}
const tt74SaveTeacher=ttSaveTeacher;
function ttSaveTeacher(){
  const id=State.dialog?.id||null;
  const values={
    status:document.getElementById('tt_creative_status')?.value,
    areas:(document.getElementById('tt_creative_areas')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),
    details:document.getElementById('tt_creative_details')?.value.trim()||'',
    days:[0,1,2,3].filter(i=>document.getElementById('tt_creative_day_'+i)?.checked)
  };
  const first=document.getElementById('tt_first')?.value.trim(),last=document.getElementById('tt_last')?.value.trim();
  tt74SaveTeacher();
  const x=(id&&tt().teachers.find(t=>t.id===id))||tt().teachers.find(t=>t.first===first&&t.last===last);
  if(x){x.creativeStatus=values.status||'la';x.creativeAreas=values.areas;x.creativeDetails=values.details;x.creativeDays=values.days;Store.save()}
}
function tt75CreativeLabel(t){
  const areas=(t.creativeAreas||[]).filter(Boolean);
  if(t.creativeDetails)return t.creativeDetails;
  return areas.length?areas.join(' / '):'Kreativband';
}
function tt75PickLA(t,counts){
  const options=[1,2,3].filter(i=>Number(t.laPrefs?.[i]||0)>0).sort((a,b)=>Number(t.laPrefs[b]||0)-Number(t.laPrefs[a]||0)||(counts[a]||0)-(counts[b]||0));
  return options[0]||3;
}
function tt75GenerateFifthSixth(lessons,groups,issues){
  const year=Number(groups[0]?.year||ttYear);
  const teachers=tt().teachers.map(tt75EnsureTeacher).filter(t=>!t.years.length||t.years.includes(year));
  for(let day=0;day<4;day++){
    const laCounts={1:0,2:0,3:0};
    for(const t of teachers){
      if(![5,6].every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p)))continue;
      const canCreative=t.creativeStatus==='creative'||t.creativeStatus==='maybe';
      const creativeDay=(t.creativeDays||[]).includes(day);
      const useCreative=canCreative&&creativeDay&&(t.creativeStatus==='creative'||((day+t.id.length)%2===0));
      if(useCreative){
        const label=tt75CreativeLabel(t);
        for(const period of [5,6])lessons.push({id:uid('lesson'),year,subject:`Kreativband · ${label}`,day,period,duration:1,teacherId:t.id,groupId:'',roomId:'',type:'Kreativband',generated:true,meta:{block:'creative56'}});
      }else{
        const la=tt75PickLA(t,laCounts);laCounts[la]++;
        for(const period of [5,6])lessons.push({id:uid('lesson'),year,subject:`Lernatelier ${la}`,day,period,duration:1,teacherId:t.id,groupId:'',roomId:'',type:'Lernatelier',generated:true,meta:{block:'creative56',la}});
      }
    }
    if(!lessons.some(l=>l.year===year&&l.day===day&&l.period===5&&l.type==='Lernatelier'&&l.subject==='Lernatelier 3'))issues.push(`${TT_DAYS[day]} 5./6. Stunde: Lernatelier 3 ist nicht besetzt.`);
  }
}
function ttGeneratePlan(){
  ttSeedSchoolModel();const p=ttActivePlan();if(!p)return alert('Bitte zuerst eine Planvariante anlegen.');
  if(p.lessons.length&&!confirm('Automatisch erzeugte Blöcke werden ersetzt; manuelle Einträge bleiben erhalten. Fortfahren?'))return;
  const lessons=p.lessons.filter(l=>!l.generated),issues=[];const groups=tt().groups.filter(g=>Number(g.year)===Number(ttYear));
  if(!groups.length)return alert(`Für Stufe ${ttYear} sind noch keine Farbteams angelegt.`);
  tt72GenerateArrival(lessons,groups,issues);tt72GenerateCore(lessons,groups,issues);tt72GenerateLA(lessons,groups,issues);
  if([5,6].includes(Number(ttYear)))tt75GenerateFifthSixth(lessons,groups,issues);
  p.lessons=lessons;tt().generator=tt().generator||{};tt().generator.lastRun=new Date().toISOString();tt().generator.report={issues,generated:lessons.filter(l=>l.generated).length};
  Store.save();ttView='plan';toast('Stufenplan 7.7 berechnet');render();
}
function ttPlanView(p){
  if(!p)return '<div class="card empty">Noch keine Planvariante.</div>';
  const groups=tt().groups.filter(g=>Number(g.year)===Number(ttYear));
  return `<div class="card ttPlanToolbar"><select onchange="tt().activePlanId=this.value;Store.save();render()">${tt().plans.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><select onchange="ttYear=Number(this.value);render()">${[5,6,7].map(y=>`<option value="${y}" ${ttYear===y?'selected':''}>Stufe ${y}</option>`).join('')}</select><button class="chip dark" onclick="ttGeneratePlan()">⚙ Stufenplan berechnen</button></div><div class="ttCompactWrap"><table class="ttCompact"><thead><tr><th>Tag / Std.</th>${groups.map(g=>`<th>${esc(g.name.replace('Team ',''))}</th>`).join('')}<th class="laHead">Lernateliers / Kreativband / Betreuung</th></tr></thead><tbody>${TT_DAYS.map((dayName,day)=>Array.from({length:9},(_,i)=>i+1).map(period=>{const ls=p.lessons.filter(l=>l.day===day&&l.period===period&&Number(l.year)===Number(ttYear));const staffing=ls.filter(l=>l.type==='Lernatelier'||l.type==='Kreativband');return `<tr class="${period===1?'arrivalRow':''} ${[5,6].includes(period)?'creativeRow':''}"><th>${dayName.slice(0,2)} ${period}</th>${groups.map(g=>{const l=ls.find(x=>x.groupId===g.id);return `<td onclick="ttOpenLesson('${l?.id||''}',${day},${period})">${l?tt72CellText(l):'<span class="emptyDot">·</span>'}</td>`}).join('')}<td class="laCell">${staffing.map(l=>`<span class="laMini ${l.teacherId?'ok':'open'} ${l.type==='Kreativband'?'creativeMini':''}">${l.type==='Kreativband'?'KB: '+esc(l.subject.replace(/^Kreativband · /,'')):esc(l.subject.replace('Lernatelier ','LA'))}: ${esc(ttNameTeacher(l.teacherId).replace('Unbekannt','offen'))}</span>`).join('')||'<span class="emptyDot">·</span>'}</td></tr>`}).join('')).join('')}</tbody></table></div>`;
}
function ttTeachersView(){
  tt73SeedKnownAssignments();const q=ttTeacherFilter.toLowerCase(),rows=tt().teachers.map(tt75EnsureTeacher).filter(x=>!q||`${x.first} ${x.last} ${x.subjects} ${x.notes} ${x.creativeAreas.join(' ')}`.toLowerCase().includes(q));
  return `<div class="grid2"><div class="card"><h2>IServ-Deputatswünsche importieren</h2><p>Kreativband-Bereiche werden aus der CSV übernommen und anschließend strukturiert bearbeitbar.</p><input type="file" accept=".csv,text/csv" onchange="ttImportTeachers(this.files[0])"><div class="mini">${tt().teachers.length} Lehrkräfte gespeichert${tt().importedAt?' · letzter Import '+new Date(tt().importedAt).toLocaleString('de-DE'):''}</div></div><div class="card"><h2>Lehrkraft ergänzen</h2><button class="chip dark" onclick="ttOpenTeacher()">Lehrkraft anlegen</button><input placeholder="Lehrkräfte durchsuchen …" value="${esc(ttTeacherFilter)}" oninput="ttTeacherFilter=this.value;render()"></div></div><div class="section">Lehrkräftepool</div><div class="teacherGrid tt72TeacherGrid">${rows.map(x=>{const assignments=Object.values(x.teamSubjects||{}).filter(Boolean).length;const creative=x.creativeStatus==='creative'?'Kreativband':x.creativeStatus==='maybe'?'Kreativband nach Absprache':'Lernatelier 5./6.';return `<div class="teacherCard tt77ClickableTeacher" role="button" tabindex="0" onclick="ttOpenTeacher('${x.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();ttOpenTeacher('${x.id}')}"><div class="teacherHead"><div><b>${esc(x.first)} ${esc(x.last)}</b><div class="mini">${esc(x.subjects||'Fächer noch offen')}</div></div><span class="badge">${esc(x.deputat||'–')} Std.</span></div><div class="stageTags">${[5,6,7].map(y=>`<span class="statusPill ${x.years?.includes(y)?'status-green':'status-empty'}">Stufe ${y}</span>`).join('')}</div><div class="ttTeacherFacts"><span>🌅 max. ${x.arrivalMax}</span><span>🎯 ${assignments} Teamfächer</span><span>LA ${x.laPrefs[1]}/${x.laPrefs[2]}/${x.laPrefs[3]}</span></div><div class="tt75CreativeSummary"><b>${esc(creative)}</b><small>${esc((x.creativeAreas||[]).join(' · ')||'keine Bereiche angegeben')}</small></div><button class="chip" onclick="event.stopPropagation();ttOpenTeacher('${x.id}')">Profil bearbeiten</button></div>`}).join('')||'<div class="card empty">Noch keine Lehrkräfte importiert.</div>'}</div>`;
}

/* ============================================================
   KOMPASS 7.6 – Kreativband-Matching und Angebotsplanung
   ============================================================ */
const TT76_CREATIVE_AREAS=[
  'Schulgarten','Naturwissenschaftliches Labor','IT-Maker-Space',
  'Kunstatelier','Handarbeitsraum','Technikraum','Musikraum'
];
function tt76EnsureCreativeModel(){
  const s=ttEnsureSchoolConfig();
  s.creativeOfferings=s.creativeOfferings||TT76_CREATIVE_AREAS.map((name,i)=>({
    id:'creative_'+i,name,active:true,maxGroupSize:name==='Schulgarten'?15:name==='IT-Maker-Space'?20:18,
    neededTeachers:1,room:name,notes:''
  }));
  return s.creativeOfferings;
}
function tt75EnsureTeacher(x){
  tt73EnsureTeacher(x);
  const raw=String(x.creative||'');
  if(!x.creativeStatus)x.creativeStatus=tt75CreativeStatusFromText(raw);
  if(!Array.isArray(x.creativeAreas)||!x.creativeAreas.length){
    x.creativeAreas=TT76_CREATIVE_AREAS.filter(a=>raw.toLowerCase().includes(a.toLowerCase()));
  }
  x.creativeDetails=x.creativeDetails||'';
  x.creativeDays=Array.isArray(x.creativeDays)?x.creativeDays:[0,1,2,3];
  x.creativeMaxBlocks=Number(x.creativeMaxBlocks||1);
  x.creativeOwnIdea=x.creativeOwnIdea||'';
  return x;
}
const tt75DialogBase=ttRenderTeacherDialog;
function ttRenderTeacherDialog(target){
  tt75DialogBase(target);
  const old=target.querySelector('.tt75CreativeProfile');if(old)old.remove();
  const x=tt75EnsureTeacher(State.dialog.id?tt().teachers.find(t=>t.id===State.dialog.id):{creativeStatus:'la',creativeAreas:[],creativeDays:[0,1,2,3],creativeMaxBlocks:1});
  const actions=target.querySelector('.dialogActions');if(!actions)return;
  const wrap=document.createElement('div');wrap.className='tt75CreativeProfile tt76CreativeProfile';
  wrap.innerHTML=`<div class="section">Kreativband – 5./6. Stunde</div>
  <p class="mini">Die Angaben aus dem Deputatswunschzettel sind vorausgewählt. Mehrfachauswahl und manuelle Änderungen sind jederzeit möglich.</p>
  <div class="formgrid">
    <div><label>Einsatzwunsch</label><select id="tt_creative_status">
      <option value="creative" ${x.creativeStatus==='creative'?'selected':''}>sehr gerne / gerne im Kreativband</option>
      <option value="maybe" ${x.creativeStatus==='maybe'?'selected':''}>nach Möglichkeit / Absprache</option>
      <option value="la" ${x.creativeStatus==='la'?'selected':''}>lieber im Lernatelier</option>
      <option value="no" ${x.creativeStatus==='no'?'selected':''}>nicht im Kreativband einsetzen</option>
    </select></div>
    <div><label>Maximale Blöcke pro Woche</label><select id="tt_creative_max">
      ${[1,2,3,4].map(n=>`<option value="${n}" ${Number(x.creativeMaxBlocks)===n?'selected':''}>${n} Block${n>1?'e':''}</option>`).join('')}
    </select></div>
  </div>
  <label>Mögliche Bereiche (Mehrfachauswahl)</label><div class="tt76AreaGrid">${TT76_CREATIVE_AREAS.map(a=>`<label class="tt76Area"><input type="checkbox" data-creative-area="${esc(a)}" ${x.creativeAreas.includes(a)?'checked':''}><span>${esc(a)}</span></label>`).join('')}</div>
  <label>Eigenes Angebot</label><input id="tt_creative_own" value="${esc(x.creativeOwnIdea||'')}" placeholder="z. B. Podcast, Robotik, Schach …">
  <label>Fachliche Schwerpunkte / organisatorische Hinweise</label><textarea id="tt_creative_details" placeholder="z. B. nur kleine Gruppe, bestimmter Raum, Materialbedarf …">${esc(x.creativeDetails||'')}</textarea>
  <label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_creative_day_${i}" type="checkbox" ${x.creativeDays.includes(i)?'checked':''} ${i===4?'disabled':''}> ${d.slice(0,2)}</label>`).join('')}</div>`;
  actions.parentNode.insertBefore(wrap,actions);
}
const tt75SaveBase=ttSaveTeacher;
function ttSaveTeacher(){
  const id=State.dialog?.id||null,first=document.getElementById('tt_first')?.value.trim(),last=document.getElementById('tt_last')?.value.trim();
  const values={
    status:document.getElementById('tt_creative_status')?.value||'la',
    areas:[...document.querySelectorAll('[data-creative-area]:checked')].map(e=>e.dataset.creativeArea),
    own:document.getElementById('tt_creative_own')?.value.trim()||'',
    details:document.getElementById('tt_creative_details')?.value.trim()||'',
    max:Number(document.getElementById('tt_creative_max')?.value||1),
    days:[0,1,2,3].filter(i=>document.getElementById('tt_creative_day_'+i)?.checked)
  };
  tt75SaveBase();
  const x=(id&&tt().teachers.find(t=>t.id===id))||tt().teachers.find(t=>t.first===first&&t.last===last);
  if(x){x.creativeStatus=values.status;x.creativeAreas=values.areas;x.creativeOwnIdea=values.own;x.creativeDetails=values.details;x.creativeMaxBlocks=values.max;x.creativeDays=values.days;Store.save()}
}
function tt76TeacherScore(t,area,day,used){
  let score=0;if(t.creativeStatus==='creative')score+=100;if(t.creativeStatus==='maybe')score+=40;
  if((t.creativeAreas||[]).includes(area))score+=80;
  if(t.creativeOwnIdea===area)score+=80;
  if((t.creativeDays||[]).includes(day))score+=20;
  score+=(3-Number(t.laPrefs?.[3]||0))*2;
  score-=Number(used[t.id]||0)*25;return score;
}
function tt76AvailableForBlock(t,lessons,day){return [5,6].every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p))}
function tt76AddBlock(lessons,year,day,t,subject,type,meta={}){
  for(const period of [5,6])lessons.push({id:uid('lesson'),year,subject,day,period,duration:1,teacherId:t?.id||'',groupId:'',roomId:'',type,generated:true,meta:{block:'creative56',...meta}})
}
function tt75GenerateFifthSixth(lessons,groups,issues){
  const year=Number(groups[0]?.year||ttYear),offerings=tt76EnsureCreativeModel().filter(o=>o.active);
  const teachers=tt().teachers.map(tt75EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year)));
  const used={};
  for(let day=0;day<4;day++){
    const available=teachers.filter(t=>tt76AvailableForBlock(t,lessons,day));
    const assigned=new Set();
    // Phase 1: Angebote bilden und passende Lehrkräfte zuordnen.
    for(const offer of offerings){
      const candidates=available.filter(t=>!assigned.has(t.id)&&['creative','maybe'].includes(t.creativeStatus)&&((t.creativeAreas||[]).includes(offer.name)||t.creativeOwnIdea===offer.name)&&Number(used[t.id]||0)<Number(t.creativeMaxBlocks||1));
      candidates.sort((a,b)=>tt76TeacherScore(b,offer.name,day,used)-tt76TeacherScore(a,offer.name,day,used));
      const teacher=candidates[0];if(!teacher)continue;
      assigned.add(teacher.id);used[teacher.id]=(used[teacher.id]||0)+1;
      tt76AddBlock(lessons,year,day,teacher,`Kreativband · ${offer.name}`,'Kreativband',{offerId:offer.id,offerName:offer.name});
    }
    // Eigene Angebote, die nicht zur vorgegebenen Liste gehören.
    for(const t of available.filter(t=>!assigned.has(t.id)&&['creative','maybe'].includes(t.creativeStatus)&&t.creativeOwnIdea&&Number(used[t.id]||0)<Number(t.creativeMaxBlocks||1))){
      assigned.add(t.id);used[t.id]=(used[t.id]||0)+1;tt76AddBlock(lessons,year,day,t,`Kreativband · ${t.creativeOwnIdea}`,'Kreativband',{offerName:t.creativeOwnIdea,custom:true});
    }
    // Phase 2: Genau zwei Lerncoaches einsetzen, LA3 ist zwingend dabei.
    const laCandidates=available.filter(t=>!assigned.has(t.id)&&!['creative'].includes(t.creativeStatus)).sort((a,b)=>{
      const sa=Number(a.laPrefs?.[3]||0)+Number(a.laPrefs?.[1]||0)+Number(a.laPrefs?.[2]||0),sb=Number(b.laPrefs?.[3]||0)+Number(b.laPrefs?.[1]||0)+Number(b.laPrefs?.[2]||0);return sb-sa
    });
    const chosen=[];
    const la3=laCandidates.sort((a,b)=>Number(b.laPrefs?.[3]||0)-Number(a.laPrefs?.[3]||0))[0];if(la3){chosen.push({t:la3,la:3});assigned.add(la3.id)}
    const second=laCandidates.filter(t=>!assigned.has(t.id)).sort((a,b)=>Math.max(Number(b.laPrefs?.[1]||0),Number(b.laPrefs?.[2]||0))-Math.max(Number(a.laPrefs?.[1]||0),Number(a.laPrefs?.[2]||0)))[0];
    if(second){const la=Number(second.laPrefs?.[1]||0)>=Number(second.laPrefs?.[2]||0)?1:2;chosen.push({t:second,la});assigned.add(second.id)}
    for(const c of chosen)tt76AddBlock(lessons,year,day,c.t,`Lernatelier ${c.la}`,'Lernatelier',{la:c.la});
    if(!la3)issues.push(`${TT_DAYS[day]} 5./6. Stunde: Lernatelier 3 konnte nicht besetzt werden.`);
    if(chosen.length<2)issues.push(`${TT_DAYS[day]} 5./6. Stunde: Es stehen weniger als zwei Lerncoaches zur Verfügung.`);
  }
}
const tt75ModelBase=ttModelView;
function ttModelView(){
  const html=tt75ModelBase(),offers=tt76EnsureCreativeModel();
  const extra=`<div class="card span2"><h2>Kreativband-Angebote</h2><p>Der Generator bildet zunächst Angebote und ordnet danach passende Lehrkräfte zu.</p><div class="tt76OfferGrid">${offers.map(o=>`<label class="tt76OfferCard"><input type="checkbox" ${o.active?'checked':''} onchange="tt76ToggleOffer('${o.id}',this.checked)"><b>${esc(o.name)}</b><small>Raum: ${esc(o.room)} · max. ${o.maxGroupSize} SuS</small></label>`).join('')}</div></div>`;
  return html.replace(/<\/div>\s*$/,'')+extra+'</div>';
}
function tt76ToggleOffer(id,v){const o=tt76EnsureCreativeModel().find(x=>x.id===id);if(o)o.active=v;Store.save();render()}
// Version sichtbar aktualisieren.
try{ttEnsureSchoolConfig().version='7.6'}catch(e){}


/* ============================================================
   KOMPASS 7.7 – klickbare Profile und entzerrte Hauptfächer
   ============================================================ */
function tt77CoreConflictScore(lessons,group,subject,day,period){
  const inSlot=lessons.filter(l=>l.day===day&&l.period===period&&ttIsCoreSubject(l.subject));
  const sameSubject=inSlot.filter(l=>l.subject===subject).length;
  const otherCore=inSlot.length-sameSubject;
  const sameSubjectSameDay=lessons.filter(l=>l.groupId===group.id&&l.day===day&&l.subject===subject).length;
  const anyCoreSameDay=lessons.filter(l=>l.groupId===group.id&&l.day===day&&ttIsCoreSubject(l.subject)).length;
  // Gleiches Hauptfach parallel wird nahezu ausgeschlossen. Andere Hauptfächer
  // dürfen überlappen, werden aber zugunsten einer entzerrten Stufenwoche bestraft.
  return sameSubject*10000 + otherCore*35 + sameSubjectSameDay*1200 + anyCoreSameDay*55 + (period-2)*2;
}
function tt72GenerateCore(lessons,groups,issues){
  const subjects=['Deutsch','Mathematik','Englisch'],slots=tt72CoreSlots();
  // Runde statt Team-für-Team: erst die erste Stunde jedes Fachs für alle Teams,
  // danach die zweite und dritte. So besetzt ein frühes Team nicht alle guten Slots.
  for(let n=0;n<3;n++){
    for(let si=0;si<subjects.length;si++){
      const subject=subjects[si];
      for(let gi=0;gi<groups.length;gi++){
        const g=groups[gi];let best=null;
        for(const [day,period] of slots){
          if(ttGroupBusy(lessons,g.id,day,period))continue;
          const teacher=tt72PickTeacher(lessons,subject,g.year,day,period,1,()=>true,g);
          if(!teacher)continue;
          let score=tt77CoreConflictScore(lessons,g,subject,day,period);
          // Zieltag variiert nach Team, Fach und Wiederholung, damit die Fächer
          // nicht für alle Farbteams dieselbe Wochenstruktur erhalten.
          const target=(gi*2+si+n*2)%5;
          score+=Math.abs(target-day)*4;
          score+=ttTeacherDayLoad(lessons,teacher.id,day)*8;
          if(!best||score<best.score)best={day,period,teacher,score};
        }
        if(!best){issues.push(`${g.name}: ${subject} konnte nicht gesetzt werden – keine passende Teamzuordnung oder keine verfügbare Lehrkraft.`);continue}
        lessons.push({id:uid('lesson'),year:g.year,subject,day:best.day,period:best.period,duration:1,teacherId:best.teacher.id,groupId:g.id,roomId:'',type:'Input',generated:true});
      }
    }
  }
  // Transparente Meldung, falls die verfügbare Zeitstruktur eine Parallelität
  // desselben Fachs unvermeidbar gemacht hat.
  for(const subject of subjects){
    const collisions={};
    for(const l of lessons.filter(l=>l.generated&&l.subject===subject)){
      const k=`${l.day}-${l.period}`;collisions[k]=(collisions[k]||0)+1;
    }
    for(const [k,count] of Object.entries(collisions))if(count>1){
      const [day,period]=k.split('-').map(Number);
      issues.push(`${subject} liegt ${TT_DAYS[day]} in der ${period}. Stunde ${count}-fach parallel. Bitte prüfen; der Generator versucht dies mit höchster Priorität zu vermeiden.`);
    }
  }
}
try{ttEnsureSchoolConfig().version='7.7'}catch(e){}

/* ============================================================
   KOMPASS 7.8 – stabile Lehrkraftprofile (stundenweise Planung)
   ============================================================ */
function ttOpenTeacher(id=null){
  State.dialog={mode:'ttTeacher',id:id||null};
  const target=document.getElementById('dialog');
  if(target)ttRenderTeacherDialog(target);
}
function tt78Teacher(id){
  const base=id?tt().teachers.find(t=>t.id===id):{id:null,first:'',last:'',deputat:'',subjects:'',otherSubjects:'',years:[],external:[],blocks:[],availability:{},laPrefs:{1:2,2:2,3:2},arrivalMax:0,arrivalDays:[0,1,2,3,4],fullDayBlocked:[],teamSubjects:{},coachTeams:[],creativeStatus:'la',creativeAreas:[],creativeDays:[0,1,2,3],creativeMaxBlocks:1};
  return tt75EnsureTeacher(tt73EnsureTeacher(base));
}
function ttRenderTeacherDialog(target){
  const x=tt78Teacher(State.dialog?.id),groups=tt().groups.filter(g=>[5,6,7].includes(Number(g.year))),core=['Deutsch','Mathematik','Englisch'];
  target.innerHTML=`<div class="dialogBackdrop" onclick="if(event.target===this){State.dialog=null;renderDialog()}"><div class="dialog ttTeacherDialog"><div class="dialogHead"><h2>${x.id?'Lehrkraftprofil bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
  <div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first||'')}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last||'')}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Studierte Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div><div><label>Weitere mögliche Fächer</label><input id="tt_other_subj" value="${esc(x.otherSubjects||'')}"></div></div>
  <div class="section">Stufen</div><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years?.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div>
  <div class="section">Komplett freie / nicht verplanbare Tage</div><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_full_day_${i}" type="checkbox" ${x.fullDayBlocked?.includes(i)?'checked':''} onchange="tt73SetWholeDay(${i},this.checked)"> ${d}</label>`).join('')}</div>
  <div class="section">Stundenweise Verfügbarkeit</div><p class="mini">Feld anklicken: möglich → bevorzugt → vermeiden → gesperrt.</p><div class="ttAvailGrid"><div></div>${Array.from({length:9},(_,i)=>`<b>${i+1}</b>`).join('')}${TT_DAYS.map((d,day)=>`<b>${d.slice(0,2)}</b>${Array.from({length:9},(_,i)=>{const p=i+1,s=x.availability?.[`${day}-${p}`]||'possible';return `<button type="button" class="ttAvail ${s}" data-day="${day}" data-period="${p}" data-state="${s}" onclick="tt72CycleAvailability(this)">${s==='preferred'?'★':s==='avoid'?'!':s==='blocked'?'×':'·'}</button>`}).join('')}`).join('')}</div>
  <div class="section">Ankommensstunde</div><div class="formgrid"><div><label>Maximal pro Woche</label><input id="tt_arrival_max" type="number" min="0" max="5" value="${Number(x.arrivalMax||0)}"></div><div><label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_arrival_day_${i}" type="checkbox" ${x.arrivalDays?.includes(i)?'checked':''}> ${d.slice(0,2)}</label>`).join('')}</div></div></div><label>Hinweise</label><textarea id="tt_arrival_notes">${esc(x.arrivalNotes||x.arrival||'')}</textarea>
  <div class="section">Coach-Zuordnung</div><div class="choice">${groups.map(g=>`<label class="check"><input type="checkbox" data-coach-team="${g.id}" ${x.coachTeams?.includes(g.id)?'checked':''}> ${esc(g.name)} · Stufe ${g.year}</label>`).join('')}</div>
  <div class="section">Verbindliche Team-/Fachzuordnungen</div><div class="ttTeamSubjectMatrix"><table><thead><tr><th>Team</th>${core.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)} · Stufe ${g.year}</td>${core.map(s=>{const k=tt73TeamKey(g.id,s);return `<td><input type="checkbox" data-team-subject="${esc(k)}" ${x.teamSubjects?.[k]?'checked':''}></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="section">Lernatelier-Präferenzen</div><div class="formgrid">${[1,2,3].map(i=>`<div><label>Lernatelier ${i}</label><select id="tt_la_${i}"><option value="3" ${Number(x.laPrefs?.[i])===3?'selected':''}>bevorzugt</option><option value="2" ${Number(x.laPrefs?.[i])===2?'selected':''}>möglich</option><option value="1" ${Number(x.laPrefs?.[i])===1?'selected':''}>nur bei Bedarf</option><option value="0" ${Number(x.laPrefs?.[i])===0?'selected':''}>nicht einsetzen</option></select></div>`).join('')}</div>
  <div class="section">Kreativband – 5./6. Stunde</div><div class="formgrid"><div><label>Einsatzwunsch</label><select id="tt_creative_status"><option value="creative" ${x.creativeStatus==='creative'?'selected':''}>gerne im Kreativband</option><option value="maybe" ${x.creativeStatus==='maybe'?'selected':''}>nach Absprache</option><option value="la" ${x.creativeStatus==='la'?'selected':''}>lieber Lernatelier</option><option value="no" ${x.creativeStatus==='no'?'selected':''}>nicht einsetzen</option></select></div><div><label>Maximale Blöcke</label><input id="tt_creative_max" type="number" min="0" max="4" value="${Number(x.creativeMaxBlocks||1)}"></div></div>
  <div class="tt76AreaGrid">${TT76_CREATIVE_AREAS.map(a=>`<label class="tt76Area"><input type="checkbox" data-creative-area="${esc(a)}" ${x.creativeAreas?.includes(a)?'checked':''}><span>${esc(a)}</span></label>`).join('')}</div><label>Eigenes Angebot</label><input id="tt_creative_own" value="${esc(x.creativeOwnIdea||'')}"><label>Hinweise</label><textarea id="tt_creative_details">${esc(x.creativeDetails||'')}</textarea><label>Mögliche Tage</label><div class="choice">${[0,1,2,3].map(i=>`<label class="check"><input id="tt_creative_day_${i}" type="checkbox" ${x.creativeDays?.includes(i)?'checked':''}> ${TT_DAYS[i].slice(0,2)}</label>`).join('')}</div>
  <div class="section">Weitere Hinweise</div><textarea id="tt_notes">${esc(x.notes||'')}</textarea>
  <div class="dialogActions"><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button><button class="chip" onclick="State.dialog=null;renderDialog()">Abbrechen</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div></div>`;
}
function ttSaveTeacher(){
  const old=State.dialog?.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=tt78Teacher(State.dialog?.id);
  x.id=x.id||uid('teacher');x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.otherSubjects=document.getElementById('tt_other_subj').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);x.fullDayBlocked=[0,1,2,3,4].filter(i=>document.getElementById('tt_full_day_'+i).checked);x.availability={};document.querySelectorAll('.ttAvail').forEach(b=>x.availability[`${b.dataset.day}-${b.dataset.period}`]=b.dataset.state);for(const d of x.fullDayBlocked)for(let p=1;p<=9;p++)x.availability[`${d}-${p}`]='blocked';x.arrivalMax=Number(document.getElementById('tt_arrival_max').value)||0;x.arrivalDays=[0,1,2,3,4].filter(i=>document.getElementById('tt_arrival_day_'+i).checked);x.arrivalNotes=document.getElementById('tt_arrival_notes').value.trim();x.coachTeams=[...document.querySelectorAll('[data-coach-team]:checked')].map(e=>e.dataset.coachTeam);x.teamSubjects={};document.querySelectorAll('[data-team-subject]').forEach(e=>x.teamSubjects[e.dataset.teamSubject]=e.checked);x.laPrefs={1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)};x.creativeStatus=document.getElementById('tt_creative_status').value;x.creativeMaxBlocks=Number(document.getElementById('tt_creative_max').value)||0;x.creativeAreas=[...document.querySelectorAll('[data-creative-area]:checked')].map(e=>e.dataset.creativeArea);x.creativeOwnIdea=document.getElementById('tt_creative_own').value.trim();x.creativeDetails=document.getElementById('tt_creative_details').value.trim();x.creativeDays=[0,1,2,3].filter(i=>document.getElementById('tt_creative_day_'+i).checked);x.notes=document.getElementById('tt_notes').value.trim();if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast('Lehrkraftprofil gespeichert');render();
}
try{ttEnsureSchoolConfig().version='7.8'}catch(e){}

/* ============================================================
   KOMPASS 7.9 – flexible Unterrichtseinsätze, LA-Ausschluss,
   Werkstattprofil und lesbare Kreativband-Auswahl
   ============================================================ */
function tt79EnsureTeacher(x){
  x=tt75EnsureTeacher(tt73EnsureTeacher(x));
  x.teachingAssignments=Array.isArray(x.teachingAssignments)?x.teachingAssignments:[];
  x.laEligible=x.laEligible!==false;
  x.workshopStatus=x.workshopStatus||'no';
  x.workshopMaxBlocks=Number.isFinite(Number(x.workshopMaxBlocks))?Number(x.workshopMaxBlocks):0;
  x.workshopDays=Array.isArray(x.workshopDays)?x.workshopDays:[0,1,3];
  x.workshopDetails=x.workshopDetails||x.workshop||'';
  return x;
}
function tt78Teacher(id){
  const base=id?tt().teachers.find(t=>t.id===id):{id:null,first:'',last:'',deputat:'',subjects:'',otherSubjects:'',years:[],external:[],blocks:[],availability:{},laPrefs:{1:2,2:2,3:2},arrivalMax:0,arrivalDays:[0,1,2,3,4],fullDayBlocked:[],teamSubjects:{},coachTeams:[],creativeStatus:'la',creativeAreas:[],creativeDays:[0,1,2,3],creativeMaxBlocks:1,teachingAssignments:[],laEligible:true,workshopStatus:'no',workshopMaxBlocks:0,workshopDays:[0,1,3]};
  return tt79EnsureTeacher(base);
}
function tt79TeachingRow(a={}){
  const groups=tt().groups.filter(g=>[5,6,7].includes(Number(g.year)));
  return `<div class="tt79AssignmentRow">
    <select data-ta="year">${[5,6,7].map(y=>`<option value="${y}" ${Number(a.year)===y?'selected':''}>Stufe ${y}</option>`).join('')}</select>
    <input data-ta="subject" placeholder="Fach / Einsatz, z. B. Mathematik oder Themenfeld" value="${esc(a.subject||'')}">
    <select data-ta="group"><option value="">ganze Stufe / flexibel</option>${groups.map(g=>`<option value="${g.id}" ${a.groupId===g.id?'selected':''}>${esc(g.name)} · Stufe ${g.year}</option>`).join('')}</select>
    <input data-ta="hours" type="number" min="1" max="20" value="${Number(a.hours||1)}" title="Wochenstunden">
    <button type="button" class="miniBtn" onclick="this.closest('.tt79AssignmentRow').remove()">×</button>
  </div>`;
}
function tt79AddTeachingAssignment(){const w=document.getElementById('tt79_assignment_rows');if(w)w.insertAdjacentHTML('beforeend',tt79TeachingRow({year:6,hours:1}))}
function tt79ToggleLA(checked){document.querySelectorAll('[id^=tt_la_]').forEach(s=>{s.disabled=!checked;if(!checked)s.value='0'})}
function ttRenderTeacherDialog(target){
  const x=tt78Teacher(State.dialog?.id),groups=tt().groups.filter(g=>[5,6,7].includes(Number(g.year))),core=['Deutsch','Mathematik','Englisch'];
  target.innerHTML=`<div class="dialogBackdrop" onclick="if(event.target===this){State.dialog=null;renderDialog()}"><div class="dialog ttTeacherDialog"><div class="dialogHead"><h2>${x.id?'Lehrkraftprofil bearbeiten':'Lehrkraft anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
  <div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first||'')}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last||'')}"></div><div><label>Deputat</label><input id="tt_dep" value="${esc(x.deputat||'')}"></div><div><label>Studierte Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div><div><label>Weitere mögliche Fächer</label><input id="tt_other_subj" value="${esc(x.otherSubjects||'')}"></div></div>
  <div class="section">Stufen</div><div class="choice">${[5,6,7].map(y=>`<label class="check"><input id="tt_y${y}" type="checkbox" ${x.years?.includes(y)?'checked':''}> Stufe ${y}</label>`).join('')}</div>
  <div class="section">Komplett freie / nicht verplanbare Tage</div><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_full_day_${i}" type="checkbox" ${x.fullDayBlocked?.includes(i)?'checked':''} onchange="tt73SetWholeDay(${i},this.checked)"> ${d}</label>`).join('')}</div>
  <div class="section">Stundenweise Verfügbarkeit</div><p class="mini">Feld anklicken: möglich → bevorzugt → vermeiden → gesperrt.</p><div class="ttAvailGrid"><div></div>${Array.from({length:9},(_,i)=>`<b>${i+1}</b>`).join('')}${TT_DAYS.map((d,day)=>`<b>${d.slice(0,2)}</b>${Array.from({length:9},(_,i)=>{const p=i+1,s=x.availability?.[`${day}-${p}`]||'possible';return `<button type="button" class="ttAvail ${s}" data-day="${day}" data-period="${p}" data-state="${s}" onclick="tt72CycleAvailability(this)">${s==='preferred'?'★':s==='avoid'?'!':s==='blocked'?'×':'·'}</button>`}).join('')}`).join('')}</div>
  <div class="section">Ankommensstunde</div><div class="formgrid"><div><label>Maximal pro Woche</label><input id="tt_arrival_max" type="number" min="0" max="5" value="${Number(x.arrivalMax||0)}"></div><div><label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_arrival_day_${i}" type="checkbox" ${x.arrivalDays?.includes(i)?'checked':''}> ${d.slice(0,2)}</label>`).join('')}</div></div></div><label>Hinweise</label><textarea id="tt_arrival_notes">${esc(x.arrivalNotes||x.arrival||'')}</textarea>
  <div class="section">Coach-Zuordnung</div><div class="choice">${groups.map(g=>`<label class="check"><input type="checkbox" data-coach-team="${g.id}" ${x.coachTeams?.includes(g.id)?'checked':''}> ${esc(g.name)} · Stufe ${g.year}</label>`).join('')}</div>
  <div class="section">Verbindliche Team-/Fachzuordnungen</div><div class="ttTeamSubjectMatrix"><table><thead><tr><th>Team</th>${core.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)} · Stufe ${g.year}</td>${core.map(s=>{const k=tt73TeamKey(g.id,s);return `<td><input type="checkbox" data-team-subject="${esc(k)}" ${x.teamSubjects?.[k]?'checked':''}></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="section">Weitere / geteilte Unterrichtseinsätze</div><p class="mini">Hier sind auch Mischkombinationen möglich: mehrere Lehrkräfte können dasselbe Fach in einer Stufe mit einer eigenen Stundenzahl übernehmen. Ohne Teamwahl gilt der Einsatz flexibel für die ganze Stufe.</p><div class="tt79AssignmentHead"><span>Stufe</span><span>Fach / Einsatz</span><span>Team (optional)</span><span>Std.</span><span></span></div><div id="tt79_assignment_rows">${x.teachingAssignments.map(tt79TeachingRow).join('')}</div><button type="button" class="chip" onclick="tt79AddTeachingAssignment()">+ Unterrichtseinsatz</button>
  <div class="section">Lernatelier-Präferenzen</div><label class="check tt79MasterCheck"><input id="tt_la_eligible" type="checkbox" ${x.laEligible?'checked':''} onchange="tt79ToggleLA(this.checked)"> Diese Lehrkraft darf im Lernatelier eingesetzt werden</label><div class="formgrid">${[1,2,3].map(i=>`<div><label>Lernatelier ${i}</label><select id="tt_la_${i}" ${x.laEligible?'':'disabled'}><option value="3" ${Number(x.laPrefs?.[i])===3?'selected':''}>bevorzugt</option><option value="2" ${Number(x.laPrefs?.[i])===2?'selected':''}>möglich</option><option value="1" ${Number(x.laPrefs?.[i])===1?'selected':''}>nur bei Bedarf</option><option value="0" ${Number(x.laPrefs?.[i])===0?'selected':''}>nicht einsetzen</option></select></div>`).join('')}</div>
  <div class="section">Kreativband – 5./6. Stunde</div><div class="formgrid"><div><label>Einsatzwunsch</label><select id="tt_creative_status"><option value="creative" ${x.creativeStatus==='creative'?'selected':''}>gerne im Kreativband</option><option value="maybe" ${x.creativeStatus==='maybe'?'selected':''}>nach Absprache</option><option value="la" ${x.creativeStatus==='la'?'selected':''}>lieber Lernatelier</option><option value="no" ${x.creativeStatus==='no'?'selected':''}>nicht einsetzen</option></select></div><div><label>Maximale Blöcke</label><input id="tt_creative_max" type="number" min="0" max="4" value="${Number(x.creativeMaxBlocks||1)}"></div></div>
  <div class="tt76AreaGrid">${TT76_CREATIVE_AREAS.map(a=>`<label class="tt76Area"><input type="checkbox" data-creative-area="${esc(a)}" ${x.creativeAreas?.includes(a)?'checked':''}><span>${esc(a)}</span></label>`).join('')}</div><label>Eigenes Angebot</label><input id="tt_creative_own" value="${esc(x.creativeOwnIdea||'')}"><label>Hinweise</label><textarea id="tt_creative_details">${esc(x.creativeDetails||'')}</textarea><label>Mögliche Tage</label><div class="choice">${[0,1,2,3].map(i=>`<label class="check"><input id="tt_creative_day_${i}" type="checkbox" ${x.creativeDays?.includes(i)?'checked':''}> ${TT_DAYS[i].slice(0,2)}</label>`).join('')}</div>
  <div class="section">Werkstattunterricht</div><div class="formgrid"><div><label>Einsatzbereitschaft</label><select id="tt_workshop_status"><option value="yes" ${x.workshopStatus==='yes'?'selected':''}>gerne / möglich</option><option value="maybe" ${x.workshopStatus==='maybe'?'selected':''}>nach Absprache</option><option value="no" ${x.workshopStatus==='no'?'selected':''}>nicht einsetzen</option></select></div><div><label>Maximale Werkstattblöcke pro Woche</label><input id="tt_workshop_max_blocks" type="number" min="0" max="3" value="${Number(x.workshopMaxBlocks||0)}"></div></div><label>Mögliche Nachmittage</label><div class="choice">${[0,1,3].map(i=>`<label class="check"><input id="tt_workshop_day_${i}" type="checkbox" ${x.workshopDays?.includes(i)?'checked':''}> ${TT_DAYS[i]}</label>`).join('')}</div><label>Wünsche / Hinweise zum Werkstattunterricht</label><textarea id="tt_workshop_details">${esc(x.workshopDetails||'')}</textarea>
  <div class="section">Weitere Hinweise</div><textarea id="tt_notes">${esc(x.notes||'')}</textarea>
  <div class="dialogActions"><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button><button class="chip" onclick="State.dialog=null;renderDialog()">Abbrechen</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div></div>`;
}
function ttSaveTeacher(){
  const old=State.dialog?.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=tt78Teacher(State.dialog?.id);
  x.id=x.id||uid('teacher');x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();x.deputat=document.getElementById('tt_dep').value.trim();x.subjects=document.getElementById('tt_subj').value.trim();x.otherSubjects=document.getElementById('tt_other_subj').value.trim();x.years=[5,6,7].filter(y=>document.getElementById('tt_y'+y).checked);x.fullDayBlocked=[0,1,2,3,4].filter(i=>document.getElementById('tt_full_day_'+i).checked);x.availability={};document.querySelectorAll('.ttAvail').forEach(b=>x.availability[`${b.dataset.day}-${b.dataset.period}`]=b.dataset.state);for(const d of x.fullDayBlocked)for(let p=1;p<=9;p++)x.availability[`${d}-${p}`]='blocked';x.arrivalMax=Number(document.getElementById('tt_arrival_max').value)||0;x.arrivalDays=[0,1,2,3,4].filter(i=>document.getElementById('tt_arrival_day_'+i).checked);x.arrivalNotes=document.getElementById('tt_arrival_notes').value.trim();x.coachTeams=[...document.querySelectorAll('[data-coach-team]:checked')].map(e=>e.dataset.coachTeam);x.teamSubjects={};document.querySelectorAll('[data-team-subject]').forEach(e=>x.teamSubjects[e.dataset.teamSubject]=e.checked);
  x.teachingAssignments=[...document.querySelectorAll('.tt79AssignmentRow')].map(r=>({year:Number(r.querySelector('[data-ta=year]').value),subject:r.querySelector('[data-ta=subject]').value.trim(),groupId:r.querySelector('[data-ta=group]').value,hours:Number(r.querySelector('[data-ta=hours]').value)||0})).filter(a=>a.subject&&a.hours>0);
  x.laEligible=document.getElementById('tt_la_eligible').checked;x.laPrefs=x.laEligible?{1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)}:{1:0,2:0,3:0};x.creativeStatus=document.getElementById('tt_creative_status').value;x.creativeMaxBlocks=Number(document.getElementById('tt_creative_max').value)||0;x.creativeAreas=[...document.querySelectorAll('[data-creative-area]:checked')].map(e=>e.dataset.creativeArea);x.creativeOwnIdea=document.getElementById('tt_creative_own').value.trim();x.creativeDetails=document.getElementById('tt_creative_details').value.trim();x.creativeDays=[0,1,2,3].filter(i=>document.getElementById('tt_creative_day_'+i).checked);x.workshopStatus=document.getElementById('tt_workshop_status').value;x.workshopMaxBlocks=Number(document.getElementById('tt_workshop_max_blocks').value)||0;x.workshopDays=[0,1,3].filter(i=>document.getElementById('tt_workshop_day_'+i).checked);x.workshopDetails=document.getElementById('tt_workshop_details').value.trim();x.workshop=x.workshopDetails;x.workshopMax=String(x.workshopMaxBlocks);x.notes=document.getElementById('tt_notes').value.trim();if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast('Lehrkraftprofil gespeichert');render();
}
function tt73AssignedTo(t,group,subject){
  tt79EnsureTeacher(t);const key=tt73TeamKey(group.id,subject);if(t.teamSubjects[key]===true)return true;
  return t.teachingAssignments.some(a=>Number(a.year)===Number(group.year)&&String(a.subject).trim().toLowerCase()===String(subject).trim().toLowerCase()&&(!a.groupId||a.groupId===group.id)&&Number(a.hours)>0);
}
function tt79AssignmentCapacity(t,group,subject){
  tt79EnsureTeacher(t);let cap=t.teamSubjects[tt73TeamKey(group.id,subject)]===true?3:0;
  cap+=t.teachingAssignments.filter(a=>Number(a.year)===Number(group.year)&&String(a.subject).trim().toLowerCase()===String(subject).trim().toLowerCase()&&(!a.groupId||a.groupId===group.id)).reduce((s,a)=>s+Number(a.hours||0),0);return cap;
}
function tt72PickTeacher(lessons,subject,year,day,period,duration=1,extra=()=>true,group=null){return tt().teachers.map(tt79EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year))&&extra(t)&&(!group||!ttIsCoreSubject(subject)||tt73AssignedTo(t,group,subject))&&(!group||!ttIsCoreSubject(subject)||lessons.filter(l=>l.teacherId===t.id&&l.subject===subject&&Number(l.year)===Number(year)).length<tt79AssignmentCapacity(t,group,subject))&&Array.from({length:duration},(_,k)=>period+k).every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p))).sort((a,b)=>(tt72TeacherSubjectScore(a,subject)+tt72PreferencePenalty(a,day,period)+ttTeacherLoad(lessons,a.id)*2+ttTeacherDayLoad(lessons,a.id,day)*3)-(tt72TeacherSubjectScore(b,subject)+tt72PreferencePenalty(b,day,period)+ttTeacherLoad(lessons,b.id)*2+ttTeacherDayLoad(lessons,b.id,day)*3))[0]||null}
function tt72GenerateLA(lessons,groups,issues){const rooms=tt().rooms.filter(r=>String(r.type||r.name).toLowerCase().includes('lernatelier')).slice(0,3);for(let day=0;day<5;day++)for(const period of [2,3,4]){if(day===4&&period===2)continue;const inputs=groups.filter(g=>lessons.some(l=>l.groupId===g.id&&l.day===day&&l.period===period&&ttIsCoreSubject(l.subject))).length;const needed=inputs>=2?2:3;const chosen=[];const indices=needed===2?[3,1]:[1,2,3];for(const la of indices){const room=rooms[la-1];const teacher=tt().teachers.map(tt79EnsureTeacher).filter(t=>t.laEligible&&(!t.years.length||t.years.includes(groups[0]?.year))&&!chosen.includes(t.id)&&!ttUnavailable(t,day,period)&&!ttBusy(lessons,t.id,day,period)&&Number(t.laPrefs[la]||0)>0).sort((a,b)=>Number(b.laPrefs[la]||0)-Number(a.laPrefs[la]||0)||ttTeacherDayLoad(lessons,a.id,day)-ttTeacherDayLoad(lessons,b.id,day))[0];if(teacher)chosen.push(teacher.id);lessons.push({id:uid('lesson'),year:groups[0]?.year||ttYear,subject:`Lernatelier ${la}`,day,period,duration:1,teacherId:teacher?.id||'',groupId:'',roomId:room?.id||'',type:'Lernatelier',generated:true,meta:{inputs,la}});if(!teacher)issues.push(`${TT_DAYS[day]} ${period}. Stunde: Lernatelier ${la} ohne Coach.`)}}}
function tt75GenerateFifthSixth(lessons,groups,issues){
  const year=Number(groups[0]?.year||ttYear),offerings=tt76EnsureCreativeModel().filter(o=>o.active);const teachers=tt().teachers.map(tt79EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year)));const used={};
  for(let day=0;day<4;day++){const available=teachers.filter(t=>tt76AvailableForBlock(t,lessons,day));const assigned=new Set();for(const offer of offerings){const candidates=available.filter(t=>!assigned.has(t.id)&&['creative','maybe'].includes(t.creativeStatus)&&((t.creativeAreas||[]).includes(offer.name)||t.creativeOwnIdea===offer.name)&&Number(used[t.id]||0)<Number(t.creativeMaxBlocks||1));candidates.sort((a,b)=>tt76TeacherScore(b,offer.name,day,used)-tt76TeacherScore(a,offer.name,day,used));const teacher=candidates[0];if(!teacher)continue;assigned.add(teacher.id);used[teacher.id]=(used[teacher.id]||0)+1;tt76AddBlock(lessons,year,day,teacher,`Kreativband · ${offer.name}`,'Kreativband',{offerId:offer.id,offerName:offer.name})}for(const t of available.filter(t=>!assigned.has(t.id)&&['creative','maybe'].includes(t.creativeStatus)&&t.creativeOwnIdea&&Number(used[t.id]||0)<Number(t.creativeMaxBlocks||1))){assigned.add(t.id);used[t.id]=(used[t.id]||0)+1;tt76AddBlock(lessons,year,day,t,`Kreativband · ${t.creativeOwnIdea}`,'Kreativband',{offerName:t.creativeOwnIdea,custom:true})}const laCandidates=available.filter(t=>t.laEligible&&!assigned.has(t.id)&&t.creativeStatus!=='creative'&&[1,2,3].some(i=>Number(t.laPrefs?.[i]||0)>0)).sort((a,b)=>{const sa=Number(a.laPrefs?.[3]||0)+Number(a.laPrefs?.[1]||0)+Number(a.laPrefs?.[2]||0),sb=Number(b.laPrefs?.[3]||0)+Number(b.laPrefs?.[1]||0)+Number(b.laPrefs?.[2]||0);return sb-sa});const chosen=[];const la3=laCandidates.slice().sort((a,b)=>Number(b.laPrefs?.[3]||0)-Number(a.laPrefs?.[3]||0))[0];if(la3&&Number(la3.laPrefs?.[3]||0)>0){chosen.push({t:la3,la:3});assigned.add(la3.id)}const second=laCandidates.filter(t=>!assigned.has(t.id)).sort((a,b)=>Math.max(Number(b.laPrefs?.[1]||0),Number(b.laPrefs?.[2]||0))-Math.max(Number(a.laPrefs?.[1]||0),Number(a.laPrefs?.[2]||0)))[0];if(second){const la=Number(second.laPrefs?.[1]||0)>=Number(second.laPrefs?.[2]||0)?1:2;chosen.push({t:second,la});assigned.add(second.id)}for(const c of chosen)tt76AddBlock(lessons,year,day,c.t,`Lernatelier ${c.la}`,'Lernatelier',{la:c.la});if(!chosen.some(c=>c.la===3))issues.push(`${TT_DAYS[day]} 5./6. Stunde: Lernatelier 3 konnte nicht besetzt werden.`);if(chosen.length<2)issues.push(`${TT_DAYS[day]} 5./6. Stunde: Es stehen weniger als zwei Lerncoaches zur Verfügung.`)}
}
try{ttEnsureSchoolConfig().version='7.9'}catch(e){}

/* ============================================================
   KOMPASS 8.0 – Deputatskonto, externe Einsätze und Coachmodell
   ============================================================ */
const TT80_AREAS=['5','6','7','8','9','10','Oberstufe'];
function tt80Num(v){const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0}
function tt80EnsureTeacher(x){
  x=tt79EnsureTeacher(x);
  x.fullDeputat=Number.isFinite(Number(x.fullDeputat))?Number(x.fullDeputat):tt80Num(x.deputat);
  if(!Array.isArray(x.reductionEntries)){
    const total=tt80Num(x.reductions);x.reductionEntries=total?[{id:uid('red'),label:x.reductions||'Ermäßigung',hours:total}]:[];
  }
  x.deploymentAreas=Array.isArray(x.deploymentAreas)?x.deploymentAreas:[...(x.years||[]).map(String)];
  if(x.otherYears){const s=String(x.otherYears).toLowerCase();for(const a of ['8','9','10'])if(s.includes(a)&&!x.deploymentAreas.includes(a))x.deploymentAreas.push(a);if(/oberstufe|kursstufe|sek ii/.test(s)&&!x.deploymentAreas.includes('Oberstufe'))x.deploymentAreas.push('Oberstufe')}
  if(!Array.isArray(x.externalCommitments)){
    x.externalCommitments=[];
    for(const a of (x.teachingAssignments||[]))if(Number(a.year)>7)x.externalCommitments.push({id:uid('extc'),area:String(a.year),subject:a.subject||'',hours:Number(a.hours||0),blocks:[]});
    for(const e of (x.external||[]))x.externalCommitments.push({id:uid('extc'),area:e.label||'Außerhalb KOMPASS',subject:'',hours:0,blocks:[{day:Number(e.day),periods:[Number(e.period)]}]});
  }
  if(x.coachStage===undefined){const g=tt().groups.find(g=>(x.coachTeams||[]).includes(g.id));x.coachStage=g?String(g.year):'';x.coachTeamId=g?.id||''}
  x.coachStage=String(x.coachStage||'');x.coachTeamId=x.coachTeamId||'';
  return x;
}
function tt80ReductionTotal(x){return (x.reductionEntries||[]).reduce((s,r)=>s+Number(r.hours||0),0)}
function tt80ExternalTotal(x){return (x.externalCommitments||[]).reduce((s,e)=>s+Number(e.hours||0),0)}
function tt80TeachingTarget(x){return Math.max(0,Number(x.fullDeputat||0)-tt80ReductionTotal(x))}
function tt80KompassTarget(x){return Math.max(0,tt80TeachingTarget(x)-tt80ExternalTotal(x))}
function tt80PeriodsText(blocks){return (blocks||[]).map(b=>`${TT_DAYS[Number(b.day)]||'?'} ${[...(b.periods||[])].sort((a,b)=>a-b).join(',')}`).join(' · ')}
function tt80ReductionRow(r={}){return `<div class="tt80ReductionRow"><input data-red="label" value="${esc(r.label||'')}" placeholder="z. B. Stufenleitung"><input data-red="hours" type="number" min="0" step="0.5" value="${Number(r.hours||0)}"><button type="button" class="miniBtn" onclick="this.parentElement.remove();tt80UpdateDeputatPreview()">×</button></div>`}
function tt80AddReduction(){document.getElementById('tt80_reductions').insertAdjacentHTML('beforeend',tt80ReductionRow());tt80UpdateDeputatPreview()}
function tt80ExternalCommitmentRow(e={}){const blocks=e.blocks||[];return `<div class="tt80ExternalRow">
  <select data-extc="area">${TT80_AREAS.concat(['Sonstiges']).map(a=>`<option ${String(e.area)===a?'selected':''}>${a}</option>`).join('')}</select>
  <input data-extc="subject" value="${esc(e.subject||'')}" placeholder="Fach / Einsatz">
  <input data-extc="hours" type="number" min="0" step="0.5" value="${Number(e.hours||0)}">
  <select data-extc="day"><option value="">Zeit offen</option>${TT_DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>
  <input data-extc="periods" value="" placeholder="z. B. 2, 3 oder 8-9">
  <button type="button" class="miniBtn" onclick="tt80AddExternalBlock(this)">+ Zeit</button>
  <button type="button" class="miniBtn" onclick="this.closest('.tt80ExternalRow').remove();tt80UpdateDeputatPreview()">×</button>
  <div class="tt80BlockList">${blocks.map(b=>`<span class="tt80Block" data-day="${Number(b.day)}" data-periods="${(b.periods||[]).join(',')}">${TT_DAYS[Number(b.day)]} ${(b.periods||[]).join(', ')} <button type="button" onclick="this.parentElement.remove()">×</button></span>`).join('')}</div>
</div>`}
function tt80AddExternalCommitment(){document.getElementById('tt80_external').insertAdjacentHTML('beforeend',tt80ExternalCommitmentRow());}
function tt80ParsePeriods(v){const out=[];for(const part of String(v||'').split(/[,;\s]+/).filter(Boolean)){if(part.includes('-')){const [a,b]=part.split('-').map(Number);if(a&&b)for(let p=Math.min(a,b);p<=Math.max(a,b);p++)out.push(p)}else if(Number(part))out.push(Number(part))}return [...new Set(out.filter(p=>p>=1&&p<=10))]}
function tt80AddExternalBlock(btn){const row=btn.closest('.tt80ExternalRow'),day=row.querySelector('[data-extc=day]').value,periods=tt80ParsePeriods(row.querySelector('[data-extc=periods]').value);if(day===''||!periods.length){alert('Bitte Tag und Stunde(n) angeben.');return}row.querySelector('.tt80BlockList').insertAdjacentHTML('beforeend',`<span class="tt80Block" data-day="${day}" data-periods="${periods.join(',')}">${TT_DAYS[Number(day)]} ${periods.join(', ')} <button type="button" onclick="this.parentElement.remove()">×</button></span>`);row.querySelector('[data-extc=periods]').value=''}
function tt80UpdateDeputatPreview(){const full=Number(document.getElementById('tt80_full_dep')?.value||0),red=[...document.querySelectorAll('.tt80ReductionRow')].reduce((s,r)=>s+Number(r.querySelector('[data-red=hours]').value||0),0),ext=[...document.querySelectorAll('.tt80ExternalRow')].reduce((s,r)=>s+Number(r.querySelector('[data-extc=hours]').value||0),0);const teach=Math.max(0,full-red),kom=Math.max(0,teach-ext);const el=document.getElementById('tt80_dep_preview');if(el)el.innerHTML=`<b>${full} h</b> volles Deputat − <b>${red} h</b> Ermäßigung = <b>${teach} h</b> Unterricht · davon <b>${ext} h</b> außerhalb KOMPASS · <strong>${kom} h durch KOMPASS</strong>`}
function tt80CoachStageChanged(){const stage=document.getElementById('tt80_coach_stage').value,sel=document.getElementById('tt80_coach_team'),old=sel.value;sel.innerHTML='<option value="">kein Farbteam</option>'+tt().groups.filter(g=>String(g.year)===stage).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old}
function tt80AssignmentRow(a={}){const groups=tt().groups.filter(g=>Number(g.year)===Number(a.year));return `<div class="tt79AssignmentRow"><select data-ta="year">${[5,6,7].map(y=>`<option value="${y}" ${Number(a.year||6)===y?'selected':''}>${y}</option>`).join('')}</select><input data-ta="subject" value="${esc(a.subject||'')}" placeholder="Fach / Bereich"><select data-ta="group"><option value="">ganze Stufe / flexibel</option>${groups.map(g=>`<option value="${g.id}" ${a.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select><input data-ta="hours" type="number" min="0" step="1" value="${Number(a.hours||0)}"><button type="button" class="miniBtn" onclick="this.parentElement.remove()">×</button></div>`}
function tt80AddAssignment(){document.getElementById('tt79_assignment_rows').insertAdjacentHTML('beforeend',tt80AssignmentRow({year:6}));}
function ttRenderTeacherDialog(target){
 const x=tt80EnsureTeacher(tt78Teacher(State.dialog?.id)),groups=tt().groups.filter(g=>[5,6,7].includes(Number(g.year))),core=['Deutsch','Mathematik','Englisch'];
 const red=tt80ReductionTotal(x),teach=tt80TeachingTarget(x),ext=tt80ExternalTotal(x),kom=tt80KompassTarget(x),coachGroups=tt().groups.filter(g=>String(g.year)===String(x.coachStage));
 target.innerHTML=`<div class="dialogBackdrop" onclick="if(event.target===this){State.dialog=null;renderDialog()}"><div class="dialog ttTeacherDialog tt80Dialog"><div class="dialogHead"><div><h2>${x.id?'Lehrkraftprofil bearbeiten':'Lehrkraft anlegen'}</h2><div class="mini">KOMPASS 8.0 · Deputat und Einsatzplanung</div></div><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div>
 <div class="tt80Dashboard"><div><small>Volles Deputat</small><b>${Number(x.fullDeputat||0)} h</b></div><div><small>Ermäßigung</small><b>${red} h</b></div><div><small>Zu unterrichten</small><b>${teach} h</b></div><div><small>Außerhalb KOMPASS</small><b>${ext} h</b></div><div class="primary"><small>Durch KOMPASS</small><b>${kom} h</b></div></div>
 <details open><summary>1 · Deputat und Ermäßigungen</summary><div class="tt80Section"><div class="formgrid"><div><label>Vorname</label><input id="tt_first" value="${esc(x.first||'')}"></div><div><label>Nachname</label><input id="tt_last" value="${esc(x.last||'')}"></div><div><label>Volles Deputat</label><input id="tt80_full_dep" type="number" min="0" step="0.5" value="${Number(x.fullDeputat||0)}" oninput="tt80UpdateDeputatPreview()"></div><div><label>Studierte Fächer</label><input id="tt_subj" value="${esc(x.subjects||'')}"></div><div><label>Weitere mögliche Fächer</label><input id="tt_other_subj" value="${esc(x.otherSubjects||'')}"></div></div><label>Ermäßigungen / Entlastungen</label><div id="tt80_reductions">${(x.reductionEntries||[]).map(tt80ReductionRow).join('')}</div><button type="button" class="chip" onclick="tt80AddReduction()">+ Ermäßigung</button><div id="tt80_dep_preview" class="tt80Preview"><b>${Number(x.fullDeputat||0)} h</b> volles Deputat − <b>${red} h</b> Ermäßigung = <b>${teach} h</b> Unterricht · davon <b>${ext} h</b> außerhalb KOMPASS · <strong>${kom} h durch KOMPASS</strong></div></div></details>
 <details open><summary>2 · Bereits verplante Einsätze außerhalb des KOMPASS-Plans</summary><div class="tt80Section"><p class="mini">Diese Stunden werden vom zu unterrichtenden Deputat abgezogen. Bekannte Zeiten werden zugleich als Sperrzeiten behandelt.</p><div class="tt80ExternalHead"><span>Bereich</span><span>Fach / Einsatz</span><span>Std.</span><span>Tag</span><span>Stunden</span></div><div id="tt80_external">${(x.externalCommitments||[]).map(tt80ExternalCommitmentRow).join('')}</div><button type="button" class="chip" onclick="tt80AddExternalCommitment()">+ externer Einsatz</button></div></details>
 <details open><summary>3 · Einsatzbereiche und Coach</summary><div class="tt80Section"><label>Einsatzstufen / Bereiche</label><div class="choice">${TT80_AREAS.map(a=>`<label class="check"><input data-deployment="${a}" type="checkbox" ${x.deploymentAreas.includes(a)?'checked':''}> ${a==='Oberstufe'?'Oberstufe':'Stufe '+a}</label>`).join('')}</div><div class="formgrid"><div><label>Coach-Stufe</label><select id="tt80_coach_stage" onchange="tt80CoachStageChanged()"><option value="">kein Coach</option>${[5,6,7].map(y=>`<option value="${y}" ${String(x.coachStage)===String(y)?'selected':''}>Stufe ${y}</option>`).join('')}</select></div><div><label>Coach-Farbteam</label><select id="tt80_coach_team"><option value="">kein Farbteam</option>${coachGroups.map(g=>`<option value="${g.id}" ${x.coachTeamId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div></div><p class="mini">Coach-Zuordnung und Unterrichtseinsatz sind getrennt. Auch als Coach eines Teams kann die Lehrkraft in einem oder mehreren anderen Teams unterrichten.</p></div></details>
 <details open><summary>4 · Unterrichtseinsätze in Stufe 5–7</summary><div class="tt80Section"><div class="section">Verbindliche Hauptfachzuordnungen</div><div class="ttTeamSubjectMatrix"><table><thead><tr><th>Team</th>${core.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)} · Stufe ${g.year}</td>${core.map(s=>{const k=tt73TeamKey(g.id,s);return `<td><input type="checkbox" data-team-subject="${esc(k)}" ${x.teamSubjects?.[k]?'checked':''}></td>`}).join('')}</tr>`).join('')}</tbody></table></div><div class="section">Weitere / geteilte Unterrichtseinsätze</div><div class="tt79AssignmentHead"><span>Stufe</span><span>Fach / Bereich</span><span>Team</span><span>Std.</span><span></span></div><div id="tt79_assignment_rows">${(x.teachingAssignments||[]).filter(a=>Number(a.year)<=7).map(tt80AssignmentRow).join('')}</div><button type="button" class="chip" onclick="tt80AddAssignment()">+ Einsatz</button></div></details>
 <details><summary>5 · Verfügbarkeit und Ankommensstunde</summary><div class="tt80Section"><label>Komplett freie / nicht verplanbare Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_full_day_${i}" type="checkbox" ${x.fullDayBlocked?.includes(i)?'checked':''} onchange="tt73SetWholeDay(${i},this.checked)"> ${d}</label>`).join('')}</div><p class="mini">Feld anklicken: möglich → bevorzugt → vermeiden → gesperrt.</p><div class="ttAvailGrid"><div></div>${Array.from({length:9},(_,i)=>`<b>${i+1}</b>`).join('')}${TT_DAYS.map((d,day)=>`<b>${d.slice(0,2)}</b>${Array.from({length:9},(_,i)=>{const p=i+1,s=x.availability?.[`${day}-${p}`]||'possible';return `<button type="button" class="ttAvail ${s}" data-day="${day}" data-period="${p}" data-state="${s}" onclick="tt72CycleAvailability(this)">${s==='preferred'?'★':s==='avoid'?'!':s==='blocked'?'×':'·'}</button>`}).join('')}`).join('')}</div><div class="formgrid"><div><label>Ankommensstunden maximal</label><input id="tt_arrival_max" type="number" min="0" max="5" value="${Number(x.arrivalMax||0)}"></div><div><label>Mögliche Tage</label><div class="choice">${TT_DAYS.map((d,i)=>`<label class="check"><input id="tt_arrival_day_${i}" type="checkbox" ${x.arrivalDays?.includes(i)?'checked':''}> ${d.slice(0,2)}</label>`).join('')}</div></div></div><label>Hinweise zur Ankommensstunde</label><textarea id="tt_arrival_notes">${esc(x.arrivalNotes||x.arrival||'')}</textarea></div></details>
 <details><summary>6 · Lernatelier, Kreativband und Werkstatt</summary><div class="tt80Section"><label class="check tt79MasterCheck"><input id="tt_la_eligible" type="checkbox" ${x.laEligible?'checked':''}> Diese Lehrkraft darf im Lernatelier eingesetzt werden.</label><div class="formgrid">${[1,2,3].map(i=>`<div><label>Lernatelier ${i}</label><select id="tt_la_${i}"><option value="3" ${Number(x.laPrefs?.[i])===3?'selected':''}>bevorzugt</option><option value="2" ${Number(x.laPrefs?.[i])===2?'selected':''}>möglich</option><option value="1" ${Number(x.laPrefs?.[i])===1?'selected':''}>nur bei Bedarf</option><option value="0" ${Number(x.laPrefs?.[i])===0?'selected':''}>nicht einsetzen</option></select></div>`).join('')}</div><div class="section">Kreativband</div><div class="formgrid"><div><label>Einsatzwunsch</label><select id="tt_creative_status"><option value="creative" ${x.creativeStatus==='creative'?'selected':''}>gerne im Kreativband</option><option value="maybe" ${x.creativeStatus==='maybe'?'selected':''}>nach Absprache</option><option value="la" ${x.creativeStatus==='la'?'selected':''}>lieber Lernatelier</option><option value="no" ${x.creativeStatus==='no'?'selected':''}>nicht einsetzen</option></select></div><div><label>Maximale Blöcke</label><input id="tt_creative_max" type="number" min="0" max="4" value="${Number(x.creativeMaxBlocks||0)}"></div></div><div class="tt76AreaGrid">${TT76_CREATIVE_AREAS.map(a=>`<label class="tt76Area"><input type="checkbox" data-creative-area="${esc(a)}" ${x.creativeAreas?.includes(a)?'checked':''}><span>${esc(a)}</span></label>`).join('')}</div><label>Eigenes Angebot</label><input id="tt_creative_own" value="${esc(x.creativeOwnIdea||'')}"><label>Hinweise</label><textarea id="tt_creative_details">${esc(x.creativeDetails||'')}</textarea><label>Mögliche Tage</label><div class="choice">${[0,1,2,3].map(i=>`<label class="check"><input id="tt_creative_day_${i}" type="checkbox" ${x.creativeDays?.includes(i)?'checked':''}> ${TT_DAYS[i]}</label>`).join('')}</div><div class="section">Werkstattunterricht</div><div class="formgrid"><div><label>Einsatzbereitschaft</label><select id="tt_workshop_status"><option value="yes" ${x.workshopStatus==='yes'?'selected':''}>gerne / möglich</option><option value="maybe" ${x.workshopStatus==='maybe'?'selected':''}>nach Absprache</option><option value="no" ${x.workshopStatus==='no'?'selected':''}>nicht einsetzen</option></select></div><div><label>Maximale Werkstattblöcke pro Woche</label><input id="tt_workshop_max_blocks" type="number" min="0" max="3" value="${Number(x.workshopMaxBlocks||0)}"></div></div><label>Mögliche Nachmittage</label><div class="choice">${[0,1,3].map(i=>`<label class="check"><input id="tt_workshop_day_${i}" type="checkbox" ${x.workshopDays?.includes(i)?'checked':''}> ${TT_DAYS[i]}</label>`).join('')}</div><label>Wünsche / Hinweise</label><textarea id="tt_workshop_details">${esc(x.workshopDetails||'')}</textarea></div></details>
 <details><summary>7 · Weitere Hinweise</summary><div class="tt80Section"><textarea id="tt_notes">${esc(x.notes||'')}</textarea></div></details>
 <div class="dialogActions"><button class="chip dark" onclick="ttSaveTeacher()">Speichern</button><button class="chip" onclick="State.dialog=null;renderDialog()">Abbrechen</button>${x.id?`<button class="chip" onclick="ttDeleteTeacher('${x.id}')">Löschen</button>`:''}</div></div></div>`;
}
function ttSaveTeacher(){
 const old=State.dialog?.id?tt().teachers.find(t=>t.id===State.dialog.id):null,x=tt80EnsureTeacher(old||tt78Teacher(null));x.id=x.id||uid('teacher');
 x.first=document.getElementById('tt_first').value.trim();x.last=document.getElementById('tt_last').value.trim();if(!x.first&&!x.last)return;
 x.fullDeputat=Number(document.getElementById('tt80_full_dep').value)||0;x.deputat=String(x.fullDeputat);x.subjects=document.getElementById('tt_subj').value.trim();x.otherSubjects=document.getElementById('tt_other_subj').value.trim();
 x.reductionEntries=[...document.querySelectorAll('.tt80ReductionRow')].map(r=>({id:uid('red'),label:r.querySelector('[data-red=label]').value.trim(),hours:Number(r.querySelector('[data-red=hours]').value)||0})).filter(r=>r.label||r.hours);x.reductions=String(tt80ReductionTotal(x));
 x.externalCommitments=[...document.querySelectorAll('.tt80ExternalRow')].map(r=>({id:uid('extc'),area:r.querySelector('[data-extc=area]').value,subject:r.querySelector('[data-extc=subject]').value.trim(),hours:Number(r.querySelector('[data-extc=hours]').value)||0,blocks:[...r.querySelectorAll('.tt80Block')].map(b=>({day:Number(b.dataset.day),periods:String(b.dataset.periods).split(',').map(Number).filter(Boolean)}))})).filter(e=>e.subject||e.hours||e.blocks.length);
 x.external=x.externalCommitments.flatMap(e=>(e.blocks||[]).flatMap(b=>(b.periods||[]).map(period=>({id:uid('external'),label:`${e.area}${e.subject?' · '+e.subject:''}`,day:Number(b.day),period:Number(period)}))));
 x.deploymentAreas=[...document.querySelectorAll('[data-deployment]:checked')].map(e=>e.dataset.deployment);x.years=x.deploymentAreas.filter(a=>['5','6','7'].includes(a)).map(Number);
 x.coachStage=document.getElementById('tt80_coach_stage').value;x.coachTeamId=document.getElementById('tt80_coach_team').value;x.coachTeams=x.coachTeamId?[x.coachTeamId]:[];
 x.teamSubjects={};document.querySelectorAll('[data-team-subject]').forEach(e=>x.teamSubjects[e.dataset.teamSubject]=e.checked);
 x.teachingAssignments=[...document.querySelectorAll('.tt79AssignmentRow')].map(r=>({year:Number(r.querySelector('[data-ta=year]').value),subject:r.querySelector('[data-ta=subject]').value.trim(),groupId:r.querySelector('[data-ta=group]').value,hours:Number(r.querySelector('[data-ta=hours]').value)||0})).filter(a=>a.subject&&a.hours>0);
 x.fullDayBlocked=[0,1,2,3,4].filter(i=>document.getElementById('tt_full_day_'+i).checked);x.availability={};document.querySelectorAll('.ttAvail').forEach(b=>x.availability[`${b.dataset.day}-${b.dataset.period}`]=b.dataset.state);for(const d of x.fullDayBlocked)for(let p=1;p<=9;p++)x.availability[`${d}-${p}`]='blocked';
 x.arrivalMax=Number(document.getElementById('tt_arrival_max').value)||0;x.arrivalDays=[0,1,2,3,4].filter(i=>document.getElementById('tt_arrival_day_'+i).checked&&!x.fullDayBlocked.includes(i));x.arrivalNotes=document.getElementById('tt_arrival_notes').value.trim();
 x.laEligible=document.getElementById('tt_la_eligible').checked;x.laPrefs=x.laEligible?{1:Number(document.getElementById('tt_la_1').value),2:Number(document.getElementById('tt_la_2').value),3:Number(document.getElementById('tt_la_3').value)}:{1:0,2:0,3:0};
 x.creativeStatus=document.getElementById('tt_creative_status').value;x.creativeMaxBlocks=Number(document.getElementById('tt_creative_max').value)||0;x.creativeAreas=[...document.querySelectorAll('[data-creative-area]:checked')].map(e=>e.dataset.creativeArea);x.creativeOwnIdea=document.getElementById('tt_creative_own').value.trim();x.creativeDetails=document.getElementById('tt_creative_details').value.trim();x.creativeDays=[0,1,2,3].filter(i=>document.getElementById('tt_creative_day_'+i).checked);
 x.workshopStatus=document.getElementById('tt_workshop_status').value;x.workshopMaxBlocks=Number(document.getElementById('tt_workshop_max_blocks').value)||0;x.workshopDays=[0,1,3].filter(i=>document.getElementById('tt_workshop_day_'+i).checked);x.workshopDetails=document.getElementById('tt_workshop_details').value.trim();x.workshop=x.workshopDetails;x.workshopMax=String(x.workshopMaxBlocks);x.notes=document.getElementById('tt_notes').value.trim();
 if(!old)tt().teachers.push(x);Store.save();State.dialog=null;toast('Lehrkraftprofil gespeichert');render();
}
function ttUnavailable(t,day,period){tt80EnsureTeacher(t);return t.fullDayBlocked.includes(Number(day))||t?.availability?.[`${day}-${period}`]==='blocked'||!!(t?.externalCommitments?.some(e=>(e.blocks||[]).some(b=>Number(b.day)===Number(day)&&(b.periods||[]).map(Number).includes(Number(period))))||t?.blocks?.some(b=>Number(b.day)===Number(day)&&(!b.periods?.length||b.periods.map(Number).includes(Number(period)))))}
function tt72PickTeacher(lessons,subject,year,day,period,duration=1,extra=()=>true,group=null){return tt().teachers.map(tt80EnsureTeacher).filter(t=>(!t.years.length||t.years.includes(year))&&ttTeacherLoad(lessons,t.id)<tt80KompassTarget(t)&&extra(t)&&(!group||!ttIsCoreSubject(subject)||tt73AssignedTo(t,group,subject))&&(!group||!ttIsCoreSubject(subject)||lessons.filter(l=>l.teacherId===t.id&&l.subject===subject&&Number(l.year)===Number(year)).length<tt79AssignmentCapacity(t,group,subject))&&Array.from({length:duration},(_,k)=>period+k).every(p=>!ttUnavailable(t,day,p)&&!ttBusy(lessons,t.id,day,p))).sort((a,b)=>(tt72TeacherSubjectScore(a,subject)+tt72PreferencePenalty(a,day,period)+ttTeacherLoad(lessons,a.id)*2+ttTeacherDayLoad(lessons,a.id,day)*3)-(tt72TeacherSubjectScore(b,subject)+tt72PreferencePenalty(b,day,period)+ttTeacherLoad(lessons,b.id)*2+ttTeacherDayLoad(lessons,b.id,day)*3))[0]||null}
function ttTeachersView(){tt73SeedKnownAssignments();const q=ttTeacherFilter.toLowerCase(),rows=tt().teachers.map(tt80EnsureTeacher).filter(x=>!q||`${x.first} ${x.last} ${x.subjects} ${x.notes}`.toLowerCase().includes(q));return `<div class="grid2"><div class="card"><h2>IServ-Deputatswünsche importieren</h2><p>Importierte Angaben bleiben vollständig bearbeitbar. Ermäßigungen, externe Einsätze und bekannte Sperrzeiten werden im Profil ergänzt.</p><input type="file" accept=".csv,text/csv" onchange="ttImportTeachers(this.files[0])"><div class="mini">${tt().teachers.length} Lehrkräfte gespeichert${tt().importedAt?' · letzter Import '+new Date(tt().importedAt).toLocaleString('de-DE'):''}</div></div><div class="card"><h2>Lehrkraft ergänzen</h2><button class="chip dark" onclick="ttOpenTeacher()">Lehrkraft anlegen</button><input placeholder="Lehrkräfte durchsuchen …" value="${esc(ttTeacherFilter)}" oninput="ttTeacherFilter=this.value;render()"></div></div><div class="section">Lehrkräftepool</div><div class="teacherGrid tt72TeacherGrid">${rows.map(x=>{const target=tt80KompassTarget(x),coach=tt().groups.find(g=>g.id===x.coachTeamId),areas=x.deploymentAreas||[];return `<div class="teacherCard tt77ClickableTeacher" role="button" tabindex="0" onclick="ttOpenTeacher('${x.id}')"><div class="teacherHead"><div><b>${esc(x.first)} ${esc(x.last)}</b><div class="mini">${esc(x.subjects||'Fächer noch offen')}</div></div><span class="badge">${target} h KOMPASS</span></div><div class="stageTags">${areas.slice(0,5).map(a=>`<span class="statusPill status-green">${a==='Oberstufe'?'Oberstufe':'Stufe '+a}</span>`).join('')}${areas.length>5?`<span class="statusPill status-empty">+${areas.length-5}</span>`:''}</div><div class="ttTeacherFacts"><span>Deputat ${x.fullDeputat} h</span><span>− ${tt80ReductionTotal(x)} h Ermäßigung</span><span>− ${tt80ExternalTotal(x)} h extern</span><span>${coach?'Coach '+coach.name:'kein Coach'}</span></div><button class="chip" onclick="event.stopPropagation();ttOpenTeacher('${x.id}')">Profil bearbeiten</button></div>`}).join('')||'<div class="card empty">Noch keine Lehrkräfte importiert.</div>'}</div>`}
try{ttEnsureSchoolConfig().version='8.0'}catch(e){}
