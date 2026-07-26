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


/* KOMPASS 7.0 – automatischer Stundenplangenerator */
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
