const ACTIVITY_TYPES=['Kreativband','Club','Besonderes Angebot'];
const COUNTABLE_ACTIVITY_TYPES=new Set(['Kreativband','Besonderes Angebot']);
const ACTIVITY_MAX_COUNT=39;
const DEFAULT_SPECIAL_OFFERS=['QUOP','Lesen','Kopfrechenübungen','Schwimmen','Sport'];
const ADDITIONAL_CREATIVE_OFFERS=['Kreativband Sport','Kreativband – Sportangebot Heimbacher Hof'];
let activityType='Kreativband',activitySelected=null,activitySearch='',activityTeam='alle',activityStatsAllGrades=true,activityPupilYear='alle',activityVisitDate=new Date().toLocaleDateString('en-CA'),activityWeeklyView=false,activityWeekDate=new Date().toLocaleDateString('en-CA');

function activityTeamsForGrade(year=State.year){
  const teams=[...new Set((Store.pupils||[]).filter(p=>Number(p.year||String(p.className||'').charAt(0))===Number(year)).map(p=>p.team).filter(Boolean))];
  return (teams.length?teams:TEAMS).sort((a,b)=>String(a).localeCompare(String(b),'de'));
}
function currentCoachTeam(year=State.year){return Auth.currentUser()?.coachTeams?.[year]||Auth.currentUser()?.coachTeams?.[String(year)]||'';}
function ensureActivityDefaultTeam(){
  // Kreativband is shared across all teams; never narrow to the coach team automatically.
  // Preserve an explicitly selected team filter; initial default is 'alle'.
}
function ensureCreativeRooms(){
  for(const name of ADDITIONAL_CREATIVE_OFFERS){if(!Store.activities.some(a=>a.type==='Kreativband'&&a.name===name))Store.activities.push({id:'creative_'+(name.includes('Heimbacher')?'heimbacher_hof':'sport'),type:'Kreativband',year:5,name,icon:'🏃',lebEnabled:true,maxCount:ACTIVITY_MAX_COUNT});}
  Store.creativeRooms.forEach(r=>{if(!Store.activities.some(a=>a.id===r.id))Store.activities.push({id:r.id,type:'Kreativband',year:State.year,name:r.name,icon:r.icon,licenses:r.licenses,lebEnabled:true,maxCount:ACTIVITY_MAX_COUNT});});
}
function ensureSpecialOffers(){
  for(const year of [5,6,7])for(const name of DEFAULT_SPECIAL_OFFERS){
    if(!Store.activities.some(a=>a.type==='Besonderes Angebot'&&Number(a.year)===year&&String(a.name).toLowerCase()===name.toLowerCase())){
      Store.activities.push({id:`special_${year}_${name.toLowerCase().replace(/[^a-z0-9äöüß]+/gi,'_')}`,type:'Besonderes Angebot',year,name,icon:name==='Sport'?'🏃':'✨',lebEnabled:true,maxCount:ACTIVITY_MAX_COUNT});
    }
  }
}
function ensureActivityDefaults(){const before=Store.activities.length;ensureCreativeRooms();ensureSpecialOffers();if(Store.activities.length!==before)Store.save('Standardangebote ergänzt');}
function isCountableActivity(a){return !!a&&COUNTABLE_ACTIVITY_TYPES.has(a.type);}
function activityRecord(a,p){const key=a+'|'+p;return Store.activityRecords[key]||{activityId:a,pupilId:p,active:false,count:0,note:'',licenses:[]};}
function datedVisitsForActivity(activityId,pupilId){return Object.values(Store.dailyCreativeVisits||{}).filter(v=>v&&String(v.activityId)===String(activityId)&&String(v.pupilId)===String(pupilId)&&v.date);}
function activityAttendance(activityId,pupilId){
  const r=activityRecord(activityId,pupilId),dated=datedVisitsForActivity(activityId,pupilId).length;
  const visits=Math.max(0,Math.max(Number(r.count||0),dated));
  const percent=Math.round(visits/ACTIVITY_MAX_COUNT*100),cfg=Store.settings?.scoreConfig||{redMax:24,yellowMax:74};
  return{visits,possible:ACTIVITY_MAX_COUNT,percent,status:scoreToStatus(percent,cfg.redMax,cfg.yellowMax)};
}
function activityAttendancePill(activityId,pupilId){const a=activityAttendance(activityId,pupilId);if(a.visits===0)return '<span class="mini">Noch keine Besuche erfasst</span>';const label=a.status==='green'?'Ziel erreicht':a.status==='yellow'?'im Aufbau':'im Aufbau';return`<span class="statusPill status-${a.status}" style="display:inline-block;max-width:100%;white-space:normal;line-height:1.4;overflow-wrap:anywhere">${a.visits}/${a.possible} Besuche · ${a.percent}%</span>`;}

function activities(){
  ensureActivityDefaults();ensureActivityDefaultTeam();
  const offers=Store.activities.filter(a=>a.type===activityType&&(a.type==='Kreativband'||Number(a.year)===Number(State.year))).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  let content=header('Angebote','Kreativband und weitere Angebote zählen jeden Besuch. 39 Besuche entsprechen 100 %.');
  content+=`<div class="toolbar formgrid">${activityType==='Kreativband'?'':`<div><label>Jahrgang</label><select onchange="State.year=Number(this.value);activitySelected=null;activityTeam='alle';render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>`}<div><label>Bereich</label><select onchange="activityType=this.value;activitySelected=null;activityTeam='alle';render()">${ACTIVITY_TYPES.map(t=>`<option value="${t}" ${activityType===t?'selected':''}>${t==='Besonderes Angebot'?'Weitere Angebote':t}</option>`).join('')}</select></div></div>`;
  if(activityType==='Kreativband')content+=`<div class="toolbar"><button class="chip ${activityWeeklyView?'dark':''}" onclick="activityWeeklyView=!activityWeeklyView;activitySelected=null;render()">${activityWeeklyView?'← Anwesenheit erfassen':'📊 Wochenstatistik'}</button></div>`;
  if(activityType==='Besonderes Angebot'&&canEdit())content+=`<button class="chip dark" onclick="openActivityEditor()">+ Weiteres Angebot</button>`;
  if(activityType==='Club'&&canEdit())content+=`<button class="chip dark" onclick="openActivityEditor()">+ Club anlegen</button>`;
  content+=activityType==='Kreativband'&&activityWeeklyView?renderCreativeWeeklyStatistics():activitySelected?renderActivityDetail(activitySelected):`<div class="offerGrid">${offers.map(a=>`<div class="tile activityTile" onclick="activitySelected='${a.id}';render()"><span class="activityIcon">${a.icon||activityIcon(a.type)}</span><b>${esc(a.name)}</b><span>${isCountableActivity(a)?'Besuche erfassen':activityMemberCount(a.id)+' Teilnehmende'}</span></div>`).join('')||'<div class="card empty">Noch keine Einträge.</div>'}</div>`;
  shell(content);
}
function activityIcon(type){return type==='Kreativband'?'🎨':type==='Club'?'🏆':'✨';}
function activityMemberCount(id){return Object.values(Store.activityRecords).filter(r=>r.activityId===id&&r.active).length;}
function renderActivityDetail(id){
  for(const grade of [5,6,7])if(!(Store.pupils||[]).some(p=>Number(p.year)===grade)&&typeof ensureStudentRosterLoaded==='function')setTimeout(()=>ensureStudentRosterLoaded(grade),0);
  const a=Store.activities.find(x=>x.id===id);if(!a)return'';ensureActivityDefaultTeam();
  const teams=activityTeamsForGrade(State.year),own=currentCoachTeam(State.year);
  let pupils=(Store.pupils||[]).filter(p=>a.type==='Kreativband'?(activityPupilYear==='alle'||Number(p.year||String(p.className||'').charAt(0))===Number(activityPupilYear)):Number(p.year||String(p.className||'').charAt(0))===Number(State.year)).filter(p=>activityTeam==='alle'||p.team===activityTeam).filter(p=>!activitySearch||(p.first+' '+p.last+' '+p.short).toLowerCase().includes(activitySearch.toLowerCase())).sort((x,y)=>x.last.localeCompare(y.last,'de')||x.first.localeCompare(y.first,'de'));
  return`<button class="chip" onclick="activitySelected=null;render()">← Übersicht</button>${a.type!=='Kreativband'&&canEdit()?`<button class="chip" onclick="openActivityEditor('${a.id}')">Bearbeiten</button>`:''}<div class="card focusCard"><div><h2>${a.icon||activityIcon(a.type)} ${esc(a.name)}</h2><p>${isCountableActivity(a)?`Jeder Besuch zählt. ${ACTIVITY_MAX_COUNT} Besuche entsprechen 100 %. Weitere Besuche werden weitergezählt.`:esc(a.type)}</p></div>${isCountableActivity(a)?'':`<div class="scoreHint">${activityMemberCount(a.id)}<br><span class="mini">Kinder mit Eintrag</span></div>`}</div>${isCountableActivity(a)?`<div class="card"><div class="formgrid"><div><label>Besuchsdatum</label><input type="date" value="${esc(activityVisitDate)}" onchange="activityVisitDate=this.value"></div><div><label>Ampel</label><div class="mini">Rot 0–${Store.settings?.scoreConfig?.redMax??24} % · Gelb ${(Store.settings?.scoreConfig?.redMax??24)+1}–${Store.settings?.scoreConfig?.yellowMax??74} % · Grün ab ${(Store.settings?.scoreConfig?.yellowMax??74)+1} %</div></div></div></div>`:''}<div class="toolbar formgrid">${a.type==='Kreativband'?`<div><label>Jahrgang</label><select onchange="activityPupilYear=this.value;activityTeam='alle';render()"><option value="alle" ${activityPupilYear==='alle'?'selected':''}>Alle Jahrgänge (5–7)</option>${[5,6,7].map(y=>`<option value="${y}" ${String(activityPupilYear)===String(y)?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>`:''}<div><label>Lerngruppe</label><select onchange="activityTeam=this.value;render()">${own?`<option value="${esc(own)}" ${activityTeam===own?'selected':''}>Meine Lerngruppe · ${esc(own)}</option>`:''}<option value="alle" ${activityTeam==='alle'?'selected':''}>alle Teams</option>${teams.filter(t=>t!==own).map(t=>`<option ${activityTeam===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div><label>Name filtern</label><input id="activityNameSearch" value="${esc(activitySearch)}" oninput="activitySearch=this.value;renderKeepingFocus('activityNameSearch')" placeholder="Name suchen …"></div></div><div class="quickList">${pupils.map(p=>activityQuickRow(a,p)).join('')||'<div class="card empty">Keine Schüler*innen in dieser Auswahl.</div>'}</div>`;
}
function saveCreativeAssessment(activityId,pupilId,field,value){
 const activity=Store.activities.find(x=>x.id===activityId);
 const pupil=(Store.pupils||[]).find(x=>String(x.id)===String(pupilId));
 if(activity?.type!=='Kreativband'||!pupil||!Auth.canAccessGrade(Number(pupil.year||String(pupil.className||'').charAt(0))))return;
 if(field==='level'&&!['','G','M','E'].includes(value))return;
 if(field==='color'&&!['','red','yellow','green'].includes(value))return;
 const key=activityId+'|'+pupilId,r=activityRecord(activityId,pupilId);
 r.creativeAssessment={...(r.creativeAssessment||{}),[field]:value,assessedBy:Auth.currentUser()?.name||'Lehrkraft',assessedAt:new Date().toISOString()};r.active=true;
 Store.activityRecords[key]=r;
 Store.save('Kreativband-Bewertung geändert',{target:pupilId,activity:activityId,field});
 const status=document.getElementById('assessmentStatus_'+activityId+'_'+pupilId);if(status)status.textContent='Automatisch gespeichert · '+(Auth.currentUser()?.name||'Lehrkraft')+' · '+new Date().toLocaleDateString('de-DE')+' · Cloud-Synchronisierung läuft';
 toast('Nur lokal gespeichert – warte auf Cloud-Bestätigung',4000);
 // Keep the other dropdown and current scroll position untouched.
}
function creativeAssessmentControls(a,p,r){
 if(a.type!=='Kreativband')return '';
 const assessment=r.creativeAssessment||{};
 const opts=(values,selected)=>values.map(([v,label])=>'<option value="'+v+'" '+(v===selected?'selected':'')+'>'+label+'</option>').join('');
 const attrs=(field)=>'onchange="saveCreativeAssessment('+JSON.stringify(a.id)+','+JSON.stringify(p.id)+','+JSON.stringify(field)+',this.value)"';
 return '<div class="creativeInlineAssessment"><label class="mini">Niveau <select aria-label="Niveau für '+esc(p.short||p.first)+'" '+attrs('level')+'>'+opts([['','–'],['G','G'],['M','M'],['E','E']],assessment.level||'')+'</select></label> <label class="mini">Bewertung <select aria-label="Bewertung für '+esc(p.short||p.first)+'" '+attrs('color')+'>'+opts([['','–'],['red','🔴 Rot'],['yellow','🟡 Gelb'],['green','🟢 Grün']],assessment.color||'')+'</select></label></div><p class="mini" id="assessmentStatus_'+esc(a.id)+'_'+esc(p.id)+'">'+(assessment.assessedBy?'Zuletzt bewertet von: '+esc(assessment.assessedBy)+(assessment.assessedAt?' · '+esc(new Date(assessment.assessedAt).toLocaleDateString('de-DE')):''):'Änderungen werden automatisch gespeichert')+'</p>';
}
function activityQuickRow(a,p){
  const r=activityRecord(a.id,p.id),att=isCountableActivity(a)?activityAttendance(a.id,p.id):null;
  return`<div class="quickRow"><div><b>${esc(p.short)}</b><div class="mini">${esc(p.team)} · ${esc(p.className)}</div>${att?`<div class="mini">${activityAttendancePill(a.id,p.id)}</div>`:''}${creativeAssessmentControls(a,p,r)}</div><div class="quickActions">${isCountableActivity(a)?`<strong>${att.visits}/${ACTIVITY_MAX_COUNT}</strong><button class="visitBtn" onclick="addVisit('${a.id}','${p.id}',1)">+1</button><button class="miniBtn" onclick="addVisit('${a.id}','${p.id}',-1)">−</button>${a.type==='Kreativband'?`<button class="miniBtn" onclick="openQualification('${a.id}','${p.id}')">🏅</button>`:''}`:`<button class="memberBtn ${r.active?'selected':''}" onclick="toggleMember('${a.id}','${p.id}')">${r.active?'✓ dabei':'+ hinzufügen'}</button>`}<button class="miniBtn" onclick="editActivityNote('${a.id}','${p.id}')">📝</button></div>${r.licenses?.length?`<div class="licenseLine">${r.licenses.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div>`:''}${r.note?`<div class="mini noteLine">${esc(r.note)}</div>`:''}</div>`;
}
function addVisit(a,p,delta){
  const pupil=(Store.pupils||[]).find(x=>String(x.id)===String(p));
  const pupilGrade=Number(pupil?.year||String(pupil?.className||'').charAt(0));
  if(!pupil||Auth.isLernatelier()||!Auth.canAccessGrade(pupilGrade)){toast('Keine Berechtigung für diesen Jahrgang');return;}
  const act=Store.activities.find(x=>x.id===a);if(!isCountableActivity(act))return;
  const k=a+'|'+p,r=activityRecord(a,p);r.active=true;
  if(delta>0){
    if(!activityVisitDate){alert('Bitte zuerst ein Besuchsdatum auswählen.');return;}
    const dk=`${activityVisitDate}|${a}|${p}`;const dk2=dk+'|2';
    if(Store.dailyCreativeVisits[dk]&&Store.dailyCreativeVisits[dk2]){toast('Für diesen Tag sind bereits zwei Schulstunden erfasst');return;}
    const visitKey=Store.dailyCreativeVisits[dk]?dk2:dk;
    Store.dailyCreativeVisits[visitKey]={date:activityVisitDate,activityId:a,pupilId:p,createdAt:new Date().toISOString()};
    r.count=Math.max(0,Number(r.count||0)+1);
  }else{
    const dk=`${activityVisitDate}|${a}|${p}`;
    if(Store.dailyCreativeVisits[dk+'|2']){toast('Korrektur der zweiten Stunde derzeit gesperrt, um Cloud-Daten zu schützen');return;}
    if(Store.dailyCreativeVisits[dk]){toast('Korrektur datierter Besuche derzeit gesperrt, um Cloud-Daten zu schützen');return;}
    r.count=Math.max(0,Number(r.count||0)-1);
  }
  Store.activityRecords[k]=r;Store.save('Angebotsbesuch geändert',{target:p,activity:a,date:activityVisitDate});render();
}
function toggleMember(a,p){const k=a+'|'+p,r=activityRecord(a,p);r.active=!r.active;Store.activityRecords[k]=r;Store.save();render();}
function editActivityNote(a,p){const k=a+'|'+p,r=activityRecord(a,p);const v=prompt('Notiz:',r.note||'');if(v===null)return;r.note=v.trim();r.active=true;Store.activityRecords[k]=r;Store.save();render();}
function openQualification(a,p){const act=Store.activities.find(x=>x.id===a);if(!act?.licenses?.length){toast('Keine Qualifikationen hinterlegt');return;}const k=a+'|'+p,r=activityRecord(a,p);const choices=(act.licenses||[]).map((x,i)=>`${i+1}: ${x}${r.licenses?.includes(x)?' ✓':''}`).join('\n');const answer=prompt(`Qualifikation auswählen:\n${choices}\n\nNummer eingeben`, '');const idx=Number(answer)-1;if(idx<0||idx>=act.licenses.length)return;r.licenses=r.licenses||[];const q=act.licenses[idx];r.licenses.includes(q)?r.licenses=r.licenses.filter(x=>x!==q):r.licenses.push(q);r.active=true;Store.activityRecords[k]=r;Store.save();render();}
function openActivityEditor(id=null){State.dialog={mode:'activity',id};renderDialog();}
function renderActivityDialog(target){const a=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):{id:null,type:activityType,name:'',year:State.year,period:'',lebEnabled:true,maxCount:isCountableActivity({type:activityType})?ACTIVITY_MAX_COUNT:null};target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${a.id?'Bearbeiten':'Anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><label>Name</label><input id="a_name" value="${esc(a.name||'')}"><label>Zeitraum optional</label><input id="a_period" value="${esc(a.period||'')}">${isCountableActivity(a)?`<p class="mini">${ACTIVITY_MAX_COUNT} Besuche entsprechen 100 %. Weitere Besuche werden weitergezählt.</p>`:''}<button class="chip dark" onclick="saveActivityDialog()">Speichern</button></div></div>`;}
function saveActivityDialog(){const existing=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):null,obj=existing||{id:uid('activity'),type:activityType,year:State.year,lebEnabled:true};obj.name=document.getElementById('a_name').value.trim();obj.period=document.getElementById('a_period').value.trim();if(isCountableActivity(obj))obj.maxCount=ACTIVITY_MAX_COUNT;if(!obj.name)return;if(!existing)Store.activities.push(obj);Store.save('Angebot gespeichert',{target:obj.name});activitySelected=obj.id;State.dialog=null;render();}
function pupilActivities(pupilId){return Object.values(Store.activityRecords).filter(r=>r.pupilId===pupilId&&r.active).map(r=>({record:r,activity:Store.activities.find(a=>a.id===r.activityId)})).filter(x=>x.activity);}

function creativeWeekStart(dateStr){
 const d=new Date((dateStr||new Date().toLocaleDateString('en-CA'))+'T12:00:00');
 if(Number.isNaN(d.getTime()))return creativeWeekStart(new Date().toLocaleDateString('en-CA'));
 d.setDate(d.getDate()-(d.getDay()+6)%7);
 return d.toLocaleDateString('en-CA');
}
function creativeWeekMove(delta){
 const d=new Date(creativeWeekStart(activityWeekDate)+'T12:00:00');
 d.setDate(d.getDate()+delta*7);activityWeekDate=d.toLocaleDateString('en-CA');render();
}
function creativeDateKey(v){
 const date=String(v||'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(date))return date;
 const de=date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
 if(de)return de[3]+'-'+de[2].padStart(2,'0')+'-'+de[1].padStart(2,'0');
 return '';
}
function creativeWeekData(){
 const start=creativeWeekStart(activityWeekDate),end=new Date(start+'T12:00:00');end.setDate(end.getDate()+6);
 const endStr=end.toLocaleDateString('en-CA');
 const pupils=(Store.pupils||[]).filter(p=>activityStatsAllGrades||Number(p.year||String(p.className||'').charAt(0))===Number(State.year));
 const ids=new Set(pupils.map(p=>String(p.id)));
 const offers=(Store.activities||[]).filter(a=>a.type==='Kreativband').sort((a,b)=>a.name.localeCompare(b.name,'de'));
 const counts={};const days={};
 Object.values(Store.dailyCreativeVisits||{}).forEach(v=>{
   const date=creativeDateKey(v?.date);if(!date||date<start||date>endStr||!ids.has(String(v.pupilId))||!offers.some(a=>String(a.id)===String(v.activityId)))return;
   const key=String(v.pupilId)+'|'+v.activityId;
   (days[key]??=[]).push(date);
 });
 Object.entries(days).forEach(([k,dates])=>counts[k]=dates.length);
 return{start,end:endStr,pupils,offers,counts,days};
}
function creativeWeeklyCsv(){
 const d=creativeWeekData(),rows=[['Woche ab','Jahrgang','Vorname','Nachname','Farbteam','Kreativband','Besuche','Besuchstage']];
 for(const p of d.pupils)for(const a of d.offers){
  const key=String(p.id)+'|'+a.id,n=d.counts[key]||0;
  if(n)rows.push([d.start,State.year,p.first||'',p.last||'',p.team||'',a.name,n,[...(d.days[key]||[])].sort().join('; ')]);
 }
 const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='KOMPASS_Kreativband_KW_'+d.start+'_Jg'+State.year+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function creativeRefreshFromCloud(){
 if(typeof Sync==='undefined'||!Sync.enabled()){toast('Keine Cloud-Verbindung aktiv. Bitte mit einem Lehrkraftkonto anmelden.',7000);return;}
 if(Sync.busy||Sync.dirty){toast('Es werden noch lokale Änderungen gespeichert. Bitte kurz warten und erneut versuchen.',7000);return;}
 try{
  await Sync.pull();
  const visits=Object.values(Store.dailyCreativeVisits||{}),roster=new Map((Store.pupils||[]).map(p=>[String(p.id),p]));
  const count=visits.filter(v=>v&&v.date&&v.pupilId&&Number(roster.get(String(v.pupilId))?.year)===Number(State.year)).length;
  const orphaned=visits.filter(v=>v&&!roster.has(String(v.pupilId))).length;
  const recognized=visits.filter(v=>v&&roster.has(String(v.pupilId))).length;
  render();
  alert('Cloud-Diagnose (nur Lesen):\\nAlle Besuchseinträge: '+visits.length+'\\nDavon mit bekanntem Schülerkonto: '+recognized+'\\nDavon ohne passende Schüler-ID: '+orphaned+'\\nBesuche Jahrgang '+State.year+': '+count+'\\n\\nBitte diese vier Zahlen mitteilen.');
 }catch(e){toast('Cloud-Abruf fehlgeschlagen: '+(e?.message||String(e)),8000);}
}
function renderCreativeWeeklyStatistics(){
 const d=creativeWeekData(),filtered=d.pupils.filter(p=>activityTeam==='alle'||p.team===activityTeam).filter(p=>!activitySearch||(p.first+' '+p.last+' '+p.short).toLowerCase().includes(activitySearch.toLowerCase())).sort((a,b)=>(a.last||'').localeCompare(b.last||'','de')||(a.first||'').localeCompare(b.first||'','de'));
 const fmt=s=>new Date(s+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
 const totals=d.offers.map(a=>filtered.reduce((n,p)=>n+(d.counts[String(p.id)+'|'+a.id]||0),0));
 const total=totals.reduce((a,b)=>a+b,0);
 const gradeSummary=[5,6,7].map(y=>({year:y,visits:filtered.filter(p=>Number(p.year||String(p.className||'').charAt(0))===y).reduce((sum,p)=>sum+d.offers.reduce((n,a)=>n+(d.counts[String(p.id)+'|'+a.id]||0),0),0)}));
 const undatedByGrade=[5,6,7].map(year=>{
  const ps=filtered.filter(p=>Number(p.year||String(p.className||'').charAt(0))===year);
  const undated=ps.reduce((sum,p)=>sum+d.offers.reduce((n,a)=>{
   const recorded=Number(activityRecord(a.id,p.id).count||0);
   const datedAll=datedVisitsForActivity(a.id,p.id).filter(v=>creativeDateKey(v.date)).length;
   return n+Math.max(0,recorded-datedAll);
  },0),0);
  return {year,undated};
 });
 const undatedTotal=undatedByGrade.reduce((n,g)=>n+g.undated,0);
 return `<div class="card"><h2>📊 Kreativband · Wochenstatistik</h2><p class="mini">Nur von Lehrkräften mit Datum erfasste Anwesenheiten werden gezählt. Jeder Schüler zählt je Angebot und Tag höchstens einmal.</p>
 <div class="toolbar"><button class="chip ${activityStatsAllGrades?'dark':''}" onclick="activityStatsAllGrades=!activityStatsAllGrades;activityTeam='alle';render()">${activityStatsAllGrades?'✓ Jahrgänge 5–7':'Jahrgänge 5–7 gesamt'}</button><button class="chip dark" onclick="creativeRefreshFromCloud()">↻ Cloud-Anwesenheiten laden</button><button class="chip" onclick="creativeWeekMove(-1)">← Vorwoche</button><strong>${fmt(d.start)} – ${fmt(d.end)}</strong><button class="chip" onclick="creativeWeekMove(1)">Folgewoche →</button><input type="date" aria-label="Datum in gewünschter Woche" value="${esc(activityWeekDate)}" onchange="activityWeekDate=this.value;render()"><button class="chip dark" onclick="creativeWeeklyCsv()">↓ CSV exportieren</button></div>
 <div class="toolbar formgrid"><div><label>Farbteam</label><select onchange="activityTeam=this.value;render()"><option value="alle">Alle Teams</option>${activityTeamsForGrade(State.year).map(t=>`<option value="${esc(t)}" ${activityTeam===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div><label>Schüler:in suchen</label><input value="${esc(activitySearch)}" id="activityNameSearch" oninput="activitySearch=this.value;renderKeepingFocus('activityNameSearch')" placeholder="Name suchen …"></div></div>
 <div class="toolbar">${gradeSummary.map(g=>`<span class="chip">Jg. ${g.year}: <b>${g.visits}</b> datierte Wochenbesuche</span>`).join('')}</div>${undatedTotal?`<div class="card"><b>${undatedTotal} weitere Besuche ohne zugeordnetes Datum</b><p class="mini">Diese Besuche sind in den Gesamtzählern vorhanden, können aber keiner Kalenderwoche zuverlässig zugeordnet werden.</p><p>${undatedByGrade.map(g=>`Jg. ${g.year}: ${g.undated}`).join(" · ")}</p></div>`:""}<p><b>${total}</b> erfasste Besuche · <b>${filtered.filter(p=>d.offers.some(a=>d.counts[String(p.id)+'|'+a.id])).length}</b> Kinder mit mindestens einem Besuch</p>
 <div class="creativeStatsScroll"><table class="creativeStatsTable"><thead><tr><th class="creativeStatsName">Schüler:in</th><th class="creativeStatsTeam">Team</th>${d.offers.map(a=>`<th class="creativeStatsOffer" title="${esc(a.name)}">${esc(a.name)}</th>`).join('')}<th>Gesamt</th></tr></thead><tbody>
 ${filtered.map(p=>{const nums=d.offers.map(a=>d.counts[String(p.id)+'|'+a.id]||0);return`<tr><td>${esc((p.first||'')+' '+(p.last||''))}</td><td>${esc(p.team||'')}</td>${nums.map(n=>`<td style="text-align:center">${n||'–'}</td>`).join('')}<td style="text-align:center"><b>${nums.reduce((a,b)=>a+b,0)}</b></td></tr>`}).join('')}
 <tr><th style="text-align:left">Summe</th><th></th>${totals.map(n=>`<th>${n}</th>`).join('')}<th>${total}</th></tr></tbody></table></div></div>`;
}
