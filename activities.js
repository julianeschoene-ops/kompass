const ACTIVITY_TYPES=['Kreativband','Club','Besonderes Angebot'];
const COUNTABLE_ACTIVITY_TYPES=new Set(['Kreativband','Besonderes Angebot']);
const ACTIVITY_MAX_COUNT=39;
const DEFAULT_SPECIAL_OFFERS=['QUOP','Lesen','Kopfrechenübungen'];
let activityType='Kreativband',activitySelected=null,activitySearch='',activityTeam='alle',activityVisitDate=new Date().toISOString().slice(0,10);

function activityTeamsForGrade(year=State.year){
  const teams=[...new Set((Store.pupils||[]).filter(p=>Number(p.year||String(p.className||'').charAt(0))===Number(year)).map(p=>p.team).filter(Boolean))];
  return (teams.length?teams:TEAMS).sort((a,b)=>String(a).localeCompare(String(b),'de'));
}
function currentCoachTeam(year=State.year){return Auth.currentUser()?.coachTeams?.[year]||Auth.currentUser()?.coachTeams?.[String(year)]||'';}
function ensureActivityDefaultTeam(){
  const own=currentCoachTeam(State.year);
  if(activityTeam==='alle'&&own)activityTeam=own;
}
function ensureCreativeRooms(){
  Store.creativeRooms.forEach(r=>{if(!Store.activities.some(a=>a.id===r.id))Store.activities.push({id:r.id,type:'Kreativband',year:State.year,name:r.name,icon:r.icon,licenses:r.licenses,lebEnabled:true,maxCount:ACTIVITY_MAX_COUNT});});
}
function ensureSpecialOffers(){
  for(const year of [5,6,7])for(const name of DEFAULT_SPECIAL_OFFERS){
    if(!Store.activities.some(a=>a.type==='Besonderes Angebot'&&Number(a.year)===year&&String(a.name).toLowerCase()===name.toLowerCase())){
      Store.activities.push({id:`special_${year}_${name.toLowerCase().replace(/[^a-z0-9äöüß]+/gi,'_')}`,type:'Besonderes Angebot',year,name,icon:'✨',lebEnabled:true,maxCount:ACTIVITY_MAX_COUNT});
    }
  }
}
function ensureActivityDefaults(){const before=Store.activities.length;ensureCreativeRooms();ensureSpecialOffers();if(Store.activities.length!==before)Store.save('Standardangebote ergänzt');}
function isCountableActivity(a){return !!a&&COUNTABLE_ACTIVITY_TYPES.has(a.type);}
function activityRecord(a,p){const key=a+'|'+p;return Store.activityRecords[key]||{activityId:a,pupilId:p,active:false,count:0,note:'',licenses:[]};}
function datedVisitsForActivity(activityId,pupilId){return Object.values(Store.dailyCreativeVisits||{}).filter(v=>v&&v.activityId===activityId&&v.pupilId===pupilId&&v.date);}
function activityAttendance(activityId,pupilId){
  const r=activityRecord(activityId,pupilId),dated=[...new Set(datedVisitsForActivity(activityId,pupilId).map(v=>v.date))].length;
  const visits=Math.max(0,Math.min(ACTIVITY_MAX_COUNT,Math.max(Number(r.count||0),dated)));
  const percent=Math.round(visits/ACTIVITY_MAX_COUNT*100),cfg=Store.settings?.scoreConfig||{redMax:24,yellowMax:74};
  return{visits,possible:ACTIVITY_MAX_COUNT,percent,status:scoreToStatus(percent,cfg.redMax,cfg.yellowMax)};
}
function activityAttendancePill(activityId,pupilId){const a=activityAttendance(activityId,pupilId);const label=a.status==='green'?'ausreichend':a.status==='yellow'?'noch nicht ausreichend':'zu wenig';return`<span class="statusPill status-${a.status}">${a.visits}/${a.possible} · ${a.percent}% · ${label}</span>`;}

function activities(){
  ensureActivityDefaults();ensureActivityDefaultTeam();
  const offers=Store.activities.filter(a=>a.type===activityType&&(a.type==='Kreativband'||Number(a.year)===Number(State.year))).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  let content=header('Angebote','Kreativband und besondere Angebote werden bis maximal 39 Besuche gezählt.');
  content+=`<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);activitySelected=null;activityTeam=currentCoachTeam(State.year)||'alle';render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Bereich</label><select onchange="activityType=this.value;activitySelected=null;render()">${ACTIVITY_TYPES.map(t=>`<option ${activityType===t?'selected':''}>${t}</option>`).join('')}</select></div></div>`;
  if(activityType==='Besonderes Angebot'&&canEdit())content+=`<button class="chip dark" onclick="openActivityEditor()">+ Besonderes Angebot</button>`;
  if(activityType==='Club'&&canEdit())content+=`<button class="chip dark" onclick="openActivityEditor()">+ Club anlegen</button>`;
  content+=activitySelected?renderActivityDetail(activitySelected):`<div class="offerGrid">${offers.map(a=>`<div class="tile activityTile" onclick="activitySelected='${a.id}';render()"><span class="activityIcon">${a.icon||activityIcon(a.type)}</span><b>${esc(a.name)}</b><span>${isCountableActivity(a)?'0–39 Besuche erfassen':activityMemberCount(a.id)+' Teilnehmende'}</span></div>`).join('')||'<div class="card empty">Noch keine Einträge.</div>'}</div>`;
  shell(content);
}
function activityIcon(type){return type==='Kreativband'?'🎨':type==='Club'?'🏆':'✨';}
function activityMemberCount(id){return Object.values(Store.activityRecords).filter(r=>r.activityId===id&&r.active).length;}
function renderActivityDetail(id){
  const a=Store.activities.find(x=>x.id===id);if(!a)return'';ensureActivityDefaultTeam();
  const teams=activityTeamsForGrade(State.year),own=currentCoachTeam(State.year);
  let pupils=(Store.pupils||[]).filter(p=>Number(p.year||String(p.className||'').charAt(0))===Number(State.year)).filter(p=>activityTeam==='alle'||p.team===activityTeam).filter(p=>!activitySearch||(p.first+' '+p.last+' '+p.short).toLowerCase().includes(activitySearch.toLowerCase())).sort((x,y)=>x.last.localeCompare(y.last,'de')||x.first.localeCompare(y.first,'de'));
  return`<button class="chip" onclick="activitySelected=null;render()">← Übersicht</button>${a.type!=='Kreativband'&&canEdit()?`<button class="chip" onclick="openActivityEditor('${a.id}')">Bearbeiten</button>`:''}<div class="card focusCard"><div><h2>${a.icon||activityIcon(a.type)} ${esc(a.name)}</h2><p>${isCountableActivity(a)?`Jeder Besuch zählt. Maximal ${ACTIVITY_MAX_COUNT} Besuche entsprechen 100 %.`:esc(a.type)}</p></div><div class="scoreHint">${isCountableActivity(a)?ACTIVITY_MAX_COUNT:activityMemberCount(a.id)}<br><span class="mini">${isCountableActivity(a)?'Maximum':'Kinder mit Eintrag'}</span></div></div>${isCountableActivity(a)?`<div class="card"><div class="formgrid"><div><label>Besuchsdatum</label><input type="date" value="${esc(activityVisitDate)}" onchange="activityVisitDate=this.value"></div><div><label>Ampel</label><div class="mini">Rot 0–${Store.settings?.scoreConfig?.redMax??24} % · Gelb ${(Store.settings?.scoreConfig?.redMax??24)+1}–${Store.settings?.scoreConfig?.yellowMax??74} % · Grün ab ${(Store.settings?.scoreConfig?.yellowMax??74)+1} %</div></div></div></div>`:''}<div class="toolbar formgrid"><div><label>Lerngruppe</label><select onchange="activityTeam=this.value;render()">${own?`<option value="${esc(own)}" ${activityTeam===own?'selected':''}>Meine Lerngruppe · ${esc(own)}</option>`:''}<option value="alle" ${activityTeam==='alle'?'selected':''}>alle Teams</option>${teams.filter(t=>t!==own).map(t=>`<option ${activityTeam===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div><label>Name filtern</label><input value="${esc(activitySearch)}" oninput="activitySearch=this.value;render()" placeholder="Name suchen …"></div></div><div class="quickList">${pupils.map(p=>activityQuickRow(a,p)).join('')||'<div class="card empty">Keine Schüler*innen in dieser Auswahl.</div>'}</div>`;
}
function activityQuickRow(a,p){
  const r=activityRecord(a.id,p.id),att=isCountableActivity(a)?activityAttendance(a.id,p.id):null;
  return`<div class="quickRow"><div><b>${esc(p.short)}</b><div class="mini">${esc(p.team)} · ${esc(p.className)}</div>${att?`<div class="mini">${activityAttendancePill(a.id,p.id)}</div>`:''}</div><div class="quickActions">${isCountableActivity(a)?`<strong>${att.visits}/${ACTIVITY_MAX_COUNT}</strong><button class="visitBtn" ${att.visits>=ACTIVITY_MAX_COUNT?'disabled title="Maximum erreicht"':''} onclick="addVisit('${a.id}','${p.id}',1)">+1</button><button class="miniBtn" onclick="addVisit('${a.id}','${p.id}',-1)">−</button>${a.type==='Kreativband'?`<button class="miniBtn" onclick="openQualification('${a.id}','${p.id}')">🏅</button>`:''}`:`<button class="memberBtn ${r.active?'selected':''}" onclick="toggleMember('${a.id}','${p.id}')">${r.active?'✓ dabei':'+ hinzufügen'}</button>`}<button class="miniBtn" onclick="editActivityNote('${a.id}','${p.id}')">📝</button></div>${r.licenses?.length?`<div class="licenseLine">${r.licenses.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div>`:''}${r.note?`<div class="mini noteLine">${esc(r.note)}</div>`:''}</div>`;
}
function addVisit(a,p,delta){
  const act=Store.activities.find(x=>x.id===a);if(!isCountableActivity(act))return;
  const k=a+'|'+p,r=activityRecord(a,p);r.active=true;
  if(delta>0){
    if(!activityVisitDate){alert('Bitte zuerst ein Besuchsdatum auswählen.');return;}
    const att=activityAttendance(a,p);if(att.visits>=ACTIVITY_MAX_COUNT){toast('39/39 erreicht');return;}
    const dk=`${activityVisitDate}|${a}|${p}`;if(Store.dailyCreativeVisits[dk]){toast('Für dieses Datum bereits erfasst');return;}
    Store.dailyCreativeVisits[dk]={date:activityVisitDate,activityId:a,pupilId:p,createdAt:new Date().toISOString()};r.count=Math.min(ACTIVITY_MAX_COUNT,Number(r.count||0)+1);
  }else{
    const dk=`${activityVisitDate}|${a}|${p}`;
    if(Store.dailyCreativeVisits[dk])delete Store.dailyCreativeVisits[dk];
    r.count=Math.max(0,Number(r.count||0)-1);
  }
  Store.activityRecords[k]=r;Store.save('Angebotsbesuch geändert',{target:p,activity:a,date:activityVisitDate});render();
}
function toggleMember(a,p){const k=a+'|'+p,r=activityRecord(a,p);r.active=!r.active;Store.activityRecords[k]=r;Store.save();render();}
function editActivityNote(a,p){const k=a+'|'+p,r=activityRecord(a,p);const v=prompt('Notiz:',r.note||'');if(v===null)return;r.note=v.trim();r.active=true;Store.activityRecords[k]=r;Store.save();render();}
function openQualification(a,p){const act=Store.activities.find(x=>x.id===a);if(!act?.licenses?.length){toast('Keine Qualifikationen hinterlegt');return;}const k=a+'|'+p,r=activityRecord(a,p);const choices=(act.licenses||[]).map((x,i)=>`${i+1}: ${x}${r.licenses?.includes(x)?' ✓':''}`).join('\n');const answer=prompt(`Qualifikation auswählen:\n${choices}\n\nNummer eingeben`, '');const idx=Number(answer)-1;if(idx<0||idx>=act.licenses.length)return;r.licenses=r.licenses||[];const q=act.licenses[idx];r.licenses.includes(q)?r.licenses=r.licenses.filter(x=>x!==q):r.licenses.push(q);r.active=true;Store.activityRecords[k]=r;Store.save();render();}
function openActivityEditor(id=null){State.dialog={mode:'activity',id};renderDialog();}
function renderActivityDialog(target){const a=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):{id:null,type:activityType,name:'',year:State.year,period:'',lebEnabled:true,maxCount:isCountableActivity({type:activityType})?ACTIVITY_MAX_COUNT:null};target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${a.id?'Bearbeiten':'Anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><label>Name</label><input id="a_name" value="${esc(a.name||'')}"><label>Zeitraum optional</label><input id="a_period" value="${esc(a.period||'')}">${isCountableActivity(a)?`<p class="mini">Dieses Angebot wird automatisch bis maximal ${ACTIVITY_MAX_COUNT} Besuche gezählt.</p>`:''}<button class="chip dark" onclick="saveActivityDialog()">Speichern</button></div></div>`;}
function saveActivityDialog(){const existing=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):null,obj=existing||{id:uid('activity'),type:activityType,year:State.year,lebEnabled:true};obj.name=document.getElementById('a_name').value.trim();obj.period=document.getElementById('a_period').value.trim();if(isCountableActivity(obj))obj.maxCount=ACTIVITY_MAX_COUNT;if(!obj.name)return;if(!existing)Store.activities.push(obj);Store.save('Angebot gespeichert',{target:obj.name});activitySelected=obj.id;State.dialog=null;render();}
function pupilActivities(pupilId){return Object.values(Store.activityRecords).filter(r=>r.pupilId===pupilId&&r.active).map(r=>({record:r,activity:Store.activities.find(a=>a.id===r.activityId)})).filter(x=>x.activity);}
