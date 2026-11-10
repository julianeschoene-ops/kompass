let rosterCloudDiagnostic=null;
let rosterDiagnosticBusy=false;
async function checkRosterCloudDiagnostic(){
 if(rosterDiagnosticBusy||!Auth.cloudClient)return;
 rosterDiagnosticBusy=true;
 try{
  const result=await Auth.cloudClient.from('kompass_grade_state').select('grade,payload').in('grade',[5,6,7]);
  if(result.error)throw result.error;
  rosterCloudDiagnostic=[5,6,7].map(g=>{
   const row=(result.data||[]).find(x=>Number(x.grade)===g);
   const ps=row?.payload?.pupils||[];
   const valid=ps.filter(p=>Number(p.year||String(p.className||'').charAt(0))===g).length;
   const visits=Object.keys(row?.payload?.dailyCreativeVisits||{}).length;
   return 'Jg. '+g+': Cloud '+ps.length+' SuS, davon '+valid+' mit passendem Jahrgang; '+visits+' datierte Besuche';
  }).join(' | ');
 }catch(e){rosterCloudDiagnostic='Cloud-Abfrage fehlgeschlagen: '+(e?.message||String(e));}
 finally{rosterDiagnosticBusy=false;render();}
}
let showAddPupil=false; let showPupilImport=false;
let studentAutoReloadBusy=false;
const studentAutoReloadAttempted=new Set();
async function ensureStudentRosterLoaded(grade){
 if(studentAutoReloadBusy||studentAutoReloadAttempted.has(grade)||!Sync.enabled())return;
 studentAutoReloadAttempted.add(grade);
 studentAutoReloadBusy=true;
 try{
  try{await Sync.pull();}catch(e){console.warn('Combined roster load failed; trying direct grade read',e);}
  // Independently read the selected grade if the combined cloud load left it empty.
  if(!(Store.pupils||[]).some(p=>Number(p.year)===Number(grade))){
   const response=await Auth.cloudClient.from('kompass_grade_state').select('grade,payload').eq('grade',Number(grade)).maybeSingle();
   if(response.error)throw response.error;
   const payload=response.data?.payload;
   if(!Array.isArray(payload?.pupils)||!payload.pupils.length)throw new Error('Cloud hat für Jahrgang '+grade+' keine Schülerliste geliefert.');
   const d=Store.data;
   d.pupils=[...(d.pupils||[]).filter(p=>Number(p.year)!==Number(grade)),...payload.pupils.map(p=>({...p,year:Number(grade)}))];
   d.dailyCreativeVisits={...(d.dailyCreativeVisits||{}),...(payload.dailyCreativeVisits||{})};
   d.activityRecords={...(d.activityRecords||{}),...(payload.activityRecords||{})};
   Sync.baseGrades[grade]=clone(payload);
   Store.saveLocalOnly();
  }
  State.cloudLoadError=null;
 }catch(e){
  State.cloudLoadError=e?.message||String(e);
 }finally{
  studentAutoReloadBusy=false;
  render();
 }
}

let showPupilEdit=false;
function studentTeamstarOverview(pupils,subjectFilter=null){
 if(!(Auth.isAdmin()||Auth.canLead(State.year)))return '';
 const codes={Englisch:'en',Mathematik:'ma',Deutsch:'de'};
 const suggestions=[];
 for(const p of pupils)for(const [subject,code] of Object.entries(codes)){if(subjectFilter&&subject!==subjectFilter)continue;
  if((p.laStars||[]).includes(code))continue;
  const grade=Number(p.year||String(p.className||'').charAt(0));
  const values=(Store.competencies||[]).filter(c=>c.type==='core'&&c.subject===subject&&(Number(c.year)===grade||Number(c.year)===grade-1)).map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(v=>['green','yellow','red'].includes(v));
  const green=values.filter(v=>v==='green').length;
  if(values.length>=3&&green/values.length>=.75)suggestions.push({p,subject,green,total:values.length});
 }
 return '<details class="card" open><summary><strong>TeamStar-Vorschläge · '+suggestions.length+' offen</strong></summary>'+
 (suggestions.length?'<div style="display:grid;gap:12px">'+suggestions.map(x=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e1e5ed"><span><strong>'+esc(x.p.short||x.p.first+' '+x.p.last)+'</strong> · '+esc(x.p.team||'')+' · '+esc(x.subject)+' · '+x.green+'/'+x.total+' grün</span><button class="chip dark" onclick="profileAwardSubjectStar('+esc(JSON.stringify(x.p.id))+','+esc(JSON.stringify(x.subject))+')">TeamStar vergeben</button></div>').join('')+'</div>':'<p>Zurzeit keine neuen Vorschläge.</p>')+'</details>';
}
function students(){ if(State.pupil)return studentProfile(); const list=filteredPupils(); if(!list.length&&Sync.enabled()&&!studentAutoReloadBusy&&!studentAutoReloadAttempted.has(State.year))setTimeout(()=>ensureStudentRosterLoaded(State.year),0); if(!list.length&&Auth.isAdmin()&&!rosterCloudDiagnostic&&!rosterDiagnosticBusy)setTimeout(checkRosterCloudDiagnostic,0); let content=header('Schülerinnen & Schüler'); if(!list.length&&Auth.isAdmin())content+='<div class="card"><b>Cloud-Prüfung (nur lesend)</b><p>'+esc(rosterCloudDiagnostic||'Prüfung läuft …')+'</p><p>Im Browser geladen: '+(Store.pupils||[]).length+' SuS</p></div>'; if(!list.length&&Sync.enabled())content+='<div class="card"><b>Keine Schülerdaten für diese Auswahl geladen.</b><p>Die vorhandenen Schülerlisten werden nicht verändert. Bitte Cloud-Daten erneut laden.</p><button class="chip dark" onclick="reloadTeacherCloudData()">↻ Schülerdaten aus Cloud neu laden</button></div>'; content+=`<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);State.team='alle';State.pupil=null;render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Suche</label><input id="pupilNameSearch" value="${esc(State.search)}" oninput="State.search=this.value;renderKeepingFocus('pupilNameSearch')" placeholder="Name suchen …"></div><div><label>Team</label><select onchange="State.team=this.value;render()"><option value="alle">alle Teams</option>${TEAMS.map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}</select></div></div>`; if(canEdit())content+=`<details class="studentManagement"><summary>Schülerverwaltung</summary><div class="studentManagementActions"><button class="chip dark" onclick="showAddPupil=!showAddPupil;render()">+ Schüler hinzufügen</button><button class="chip" onclick="showPupilImport=!showPupilImport;render()">IServ-Liste importieren</button></div></details>`; if(showAddPupil)content+=addPupilForm(); if(showPupilImport)content+=pupilImportForm(); content+=`<div class="studentCards">${list.map(p=>`<div class="studentCard"><div class="studentMain"><span class="dot ${teamColor(p.team)}"></span><div><b>${esc(p.short)}</b><div class="mini">${esc(p.first)} ${esc(p.last)} · ${esc(p.className)} · Team ${esc(p.team)} · Coach ${esc(p.coach)}</div></div></div><button class="chip dark" onclick="State.pupil='${p.id}';render()">Profil</button></div>`).join('')||'<div class="card empty">Keine Treffer.</div>'}</div>`; shell(content); }
function addPupilForm(){ return `<div class="card"><h2>Schüler hinzufügen</h2><div class="formgrid"><div><label>Vorname</label><input id="new_first" oninput="autoShortName()"></div><div><label>Nachname</label><input id="new_last" oninput="autoShortName()"></div><div><label>Kurzform</label><input id="new_short"></div><div><label>Klasse</label><select id="new_class">${['a','b','c','d','e'].map(k=>`<option>${State.year}${k}</option>`).join('')}</select></div><div><label>Team</label><select id="new_team">${TEAMS.map(t=>`<option>${t}</option>`).join('')}</select></div><div><label>Coach</label><input id="new_coach" value="${esc(State.teacher)}"></div></div><button class="chip dark" onclick="saveNewPupil()">Speichern</button><button class="chip" onclick="showAddPupil=false;render()">Abbrechen</button></div>`; }
function autoShortName(){ const first=document.getElementById('new_first')?.value.trim(); const last=document.getElementById('new_last')?.value.trim(); const short=document.getElementById('new_short'); if(first&&last&&short&&!short.value)short.value=`${first} ${last.charAt(0)}.`; }
function saveNewPupil(){ const first=document.getElementById('new_first').value.trim(), last=document.getElementById('new_last').value.trim(), short=document.getElementById('new_short').value.trim()||`${first} ${last.charAt(0)}.`, className=document.getElementById('new_class').value, team=document.getElementById('new_team').value, coach=document.getElementById('new_coach').value.trim(); if(!first||!last||!coach){alert('Bitte Vorname, Nachname und Coach eintragen.');return;} Store.pupils.push({id:uid('p'),first,last,short,className,team,color:teamColor(team),coach}); Store.save(); showAddPupil=false; toast(); render(); }
let profileSection='overview',profileSectionPupil=null,profileSubject='Englisch';
function openProfileSection(section){profileSection=section;render();document.getElementById('profileContent')?.focus();document.getElementById('profileContent')?.scrollIntoView({block:'start'});}
function selectProfileSubject(subject){profileSubject=subject;profileCoreTool='';render();}
function studentProfile(){
 const p=(Store.pupils||[]).find(x=>x.id===State.pupil);
 if(!p){State.pupil=null;return students();}
 if(profileSectionPupil!==p.id){profileSectionPupil=p.id;profileSection='overview';profileSubject='Englisch';showPupilEdit=false;}
 const entries=Object.entries(Store.records).filter(([key])=>key.endsWith('|'+p.id)&&Store.competencies.some(c=>c.id===key.split('|')[0]));
 const acts=pupilActivities(p.id),b=Store.behaviour[p.id]||{observations:[],teamStars:0};
 let content=header(`${esc(p.short)} (${esc(p.team)})`,`Coach ${esc(p.coach)} · ${esc(p.className)}`);
 content+=`<div class="toolbar">${typeof Coaching!=='undefined'&&Coaching.profileReturnPupil===String(p.id)?'<button class="chip dark" onclick="Coaching.returnFromProfile()">← Zurück zum Coaching</button>':''}<button class="chip" onclick="State.pupil=null;showPupilEdit=false;render()">← Schülerübersicht</button>`;
 if(Auth.isAdmin())content+=`<button class="chip" onclick="showPupilEdit=!showPupilEdit;render()">Profil bearbeiten</button><button class="chip" onclick="archivePupil('${p.id}')">Archivieren</button>`;
 content+='</div>';
 if(showPupilEdit&&Auth.isAdmin())content+=pupilEditForm(p);if(typeof coachingProfileButton==='function')content+=coachingProfileButton(p);
 if(profileSection==='overview'){content+=renderProfileTiles(p,entries,acts,b);content+='<section class="card" style="margin-top:16px"><h2>Schülerakte im Überblick</h2><p class="mini">Wähle einen Lernbereich, um die gespeicherten Bewertungen und Beobachtungen zu sehen.</p><div class="profileOverviewStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">'+[['Kernfächer','core'],[profileWorkshopLabel(p),'workshop'],['Coaching & Entwicklung','development'],['Lernentwicklungsbericht','leb']].map(([label,id])=>'<button class="chip" style="padding:15px;text-align:left" onclick="openProfileSection(\''+id+'\')">'+label+' →</button>').join('')+'</div></section>';}
 const core=profileCoreEntries(p);
 const workshopYear=Number(p.year||String(p.className||'').charAt(0));
 const workshop=Store.competencies.filter(c=>c.type==='workshop'&&Number(c.year)===workshopYear&&(!c.phase||c.phase!=='lab'||(Store.workshopPaths[`${p.id}|${workshopYear}|${c.sprint}`]?.lab===c.lab)||!!Store.records[c.id+'|'+p.id])).map(c=>[c.id+'|'+p.id,Store.records[c.id+'|'+p.id]||{}]);
 content+='<section id="profileContent" class="profileContent" tabindex="-1">';
 if(profileSection!=='overview')content+=renderProfileNavigation(p);
 if(profileSection==='core')content+=renderProfileCore(p,core);
 else if(profileSection==='practice')content+='<h2>English Practice · Übungsübersicht</h2><p class="mini">Übungen, Übungspunkte und selbst gemeldete Kontrollen. Testergebnisse stehen bei den Kompetenzen unter Kernfächer → Englisch.</p>'+(EnglishPractice.practiceReport(p)||'<div class="card empty">Noch keine Übungsberichte übermittelt.</div>')+EnglishPractice.access(p);
 else if(profileSection==='workshop')content+=renderWorkshopLearningOverview(p,workshop);
 else if(profileSection==='offers')content+=renderProfileOffers(p,acts);
 else if(profileSection==='development'){
  const canView=typeof Coaching!=='undefined'&&Coaching.allowed()&&((Coaching.coachPupils?.()||[]).some(x=>String(x.id)===String(p.id))||Auth.isAdmin()||Auth.canLead?.(Number(p.year)));
  const notes=canView?(Coaching.rows||[]).filter(r=>String(r.pupil_id)===String(p.id)&&Number(r.grade)===Number(p.year)&&!['checkliste','statusereignis'].includes(r.kind)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)):[];
  content+='<h2>Coaching & Entwicklung</h2>';
  if(canView){
   content+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><strong>Gespräche und Vereinbarungen</strong><button class="chip dark" onclick="Coaching.openFromProfile('+esc(JSON.stringify(String(p.id)))+')">Coaching öffnen</button></div>';
   content+=notes.length?notes.map(r=>'<div style="padding:12px 0;border-bottom:1px solid #e5eaf0"><strong>'+esc(r.title)+'</strong> <span class="mini">'+new Date(r.created_at).toLocaleDateString('de-DE')+(r.done?' · erledigt':'')+'</span><p>'+esc(r.body||'')+'</p></div>').join(''):'<p class="mini">Noch keine Coachinggespräche dokumentiert.</p>';
   content+='</div>';
  }else content+='<p class="mini">Coachinggespräche sind nur für berechtigte Lerncoaches und Stufenleitungen sichtbar.</p>';
  content+='<div class="card"><h3>Arbeits- & Sozialverhalten</h3>'+(b.observations||[]).map(x=>'<p>'+esc(typeof x==='string'?x:String(x?.text||x?.note||''))+'</p>').join('')+(b.note?'<p class="profileNote">'+esc(b.note)+'</p>':'')+'<div class="section">Beobachtungsverlauf</div>'+behaviourHistoryHtml(b.history)+'</div>';
 }
 else if(profileSection==='leb')content+=`<h2>Lernentwicklungsbericht</h2><div class="card"><p>${Store.lebDrafts[p.id]?'Ein gespeicherter Entwurf liegt vor.':'Noch kein Entwurf gespeichert.'}</p><button class="chip dark" onclick="State.view='leb';lebMode='schueler';State.pupil='${p.id}';render()">LEB öffnen</button></div>`;
 else content+='';
 content+='</section>';shell(content);
}
function workshopAreaLabel(year){return Number(year)===7?'Themenfeldunterricht':'Nebenfächer';}
function profileWorkshopLabel(p){return workshopAreaLabel(p.year||String(p.className||'').charAt(0));}
function renderProfileTiles(p,entries,acts,b){
 const tiles=[['core','Kernfächer'],['workshop',profileWorkshopLabel(p)],['offers','Angebote'],['development','Coaching & Entwicklung'],['leb','LEB']];
 return '<nav class="profileAreas profileAreaTabs" aria-label="Schülerprofil">'+tiles.map(([id,title])=>'<button type="button" class="profileArea '+(profileSection===id?'isActive':'')+'" onclick="openProfileSection(\''+id+'\')">'+title+'</button>').join('')+'</nav>';
}
function renderProfileWorkshop(p){
 const history=Store.sprintHistory[p.id]||[];
 const year=Number(p.year||String(p.className||'').charAt(0));
 const sprints=(Store.sprints||[]).filter(s=>Number(s.year)===year).sort((a,b)=>a.number-b.number);
 const cards=sprints.map(s=>{
  const key=`${p.id}|${year}|${s.number}`,path=(Store.workshopPaths||{})[key]||{};
  const match=history.find(h=>Number(h.sprint||h.number)===Number(s.number));
  const assigned=(Store.assignments||[]).filter(a=>a.type==='Sprint'&&Number(a.year)===year).filter(a=>Number(a.sprint||a.sprintNumber||1)===Number(s.number)).slice().reverse().find(a=>Object.entries(a.groups||{}).some(([offer,ids])=>offer!=='Nicht zugeteilt'&&(ids||[]).some(id=>String(id)===String(p.id))));
  const assignedLab=assigned?Object.entries(assigned.groups||{}).find(([offer,ids])=>offer!=='Nicht zugeteilt'&&(ids||[]).some(id=>String(id)===String(p.id)))?.[0]:'';
  const lab=assignedLab||path.lab||match?.title||match?.lab||'';
  if(!lab&&!match)return '';
  return `<div class="history"><b>Sprint ${s.number}${s.name&&s.name!=='Sprint '+s.number?' · '+esc(s.name):''}</b><br>${lab?'Zuteilung: '+esc(lab):'Noch keine Zuteilung'}${match?.priority?' · Wunsch '+esc(match.priority):''}</div>`;
 }).filter(Boolean);
 return '<h2>'+profileWorkshopLabel(p)+'</h2>'+(cards.length?'<div class="card"><h3>Sprintzuordnungen</h3>'+cards.join('')+'</div>':'<div class="card empty">Noch keine Sprintzuteilung gespeichert.</div>');
}
function creativeCompetencyProfileHtml(activity,assessment){
 const labels={red:'🔴 Noch nicht erreicht',yellow:'🟡 Teilweise erreicht',green:'🟢 Erreicht'};
 const entries=creativeCompetenciesFor(activity).filter(([id])=>labels[assessment?.competencies?.[id]]);
 if(!entries.length)return '';
 const title=creativeStatsGroupName(activity.name);
 return '<div class="profileNote"><b>'+esc(title)+' · Kompetenzen</b>'+entries.map(([id,t])=>'<p class="mini">'+esc(t)+' · '+esc(labels[assessment.competencies[id]])+'</p>').join('')+'</div>';
}
function musicOfferEvidence(p){
 return pupilActivities(p.id).filter(({activity})=>isMusicOffer(activity)).map(({activity,record})=>{
  const visits=activityAttendance(activity.id,p.id).visits;
  const assessment=record.creativeAssessment;
  if(!visits&&!record.note&&!assessment?.note&&!assessment?.level&&!assessment?.color)return '';
  return `<div class="history"><b>${esc(activity.name)}</b> · ${visits} ${visits===1?'Teilnahme':'Teilnahmen'}${assessment?.level||assessment?.color?`<p class="mini">${esc(creativeAssessmentSummary(assessment))}</p>`:''}${[record.note,assessment?.note].filter(Boolean).map(note=>`<p class="profileNote">${esc(note)}</p>`).join('')}</div>`;
 }).join('');
}
function renderProfileOffers(p,acts){
 const clubs=Store.clubHistory[p.id]||[],groups=new Map();
 for(const item of acts){const a=item.activity,name=a.type==='Kreativband'?creativeStatsGroupName(a.name):a.name,key=a.type+'|'+name; if(!groups.has(key))groups.set(key,{name,type:a.type,items:[]});groups.get(key).items.push(item);}
 const cards=[...groups.values()].map(group=>{
  const ids=new Set(group.items.map(x=>String(x.activity.id)));
  if(group.type==='Kreativband'&&group.name==='Kochen & Nähstudio')combinedCookSewIds().forEach(id=>ids.add(String(id)));
  const dated=Object.values(Store.dailyCreativeVisits||{}).filter(v=>v&&ids.has(String(v.activityId))&&String(v.pupilId)===String(p.id)&&v.date).length;
  const visits=group.items.every(({activity})=>isMusicOffer(activity))?Math.max(...group.items.map(({activity})=>activityAttendance(activity.id,p.id).visits)):Math.max(dated,...group.items.map(x=>Number(x.record.count)||0));
  return `<div class="card"><h3>${esc(group.name)}</h3><p class="mini">${esc(group.type)}</p><p>${visits} Teilnahmen</p>${group.items.map(({activity,record:r})=>`${r.note?`<p class="profileNote">${esc(r.note)}</p>`:''}${r.creativeAssessment?.assessedBy?`<p>${esc(creativeAssessmentSummary(r.creativeAssessment))}</p>${r.creativeAssessment.note?`<p class="profileNote">${esc(r.creativeAssessment.note)}</p>`:''}${creativeCompetencyProfileHtml(activity,r.creativeAssessment)}`:''}${r.licenses?.length?`<p>${r.licenses.map(x=>esc(x)).join(' · ')}</p>`:''}`).join('')}</div>`;
 }).join('');
 return '<h2>Angebote & Teilnahmen</h2>'+ (clubs.length?'<details class="card"><summary>Clubzuordnungen</summary>'+clubs.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${esc(x.priority)}</div>`).join('')+'</details>':'')+(cards||'<div class="card empty">Noch keine Teilnahmen erfasst.</div>');
}
function renderWorkshopLearningOverview(p,workshop){
 const year=Number(p.year||String(p.className||'').charAt(0));
 const all=(Store.sprints||[]).filter(s=>Number(s.year)===year).sort((a,b)=>Number(a.number)-Number(b.number));
 const current=all.find(s=>Number(s.number)===1)||all[0];
 const path=current?(Store.workshopPaths||{})[`${p.id}|${year}|${current.number}`]||{}:{};
 const assigned=(Store.assignments||[]).filter(a=>a.type==='Sprint'&&Number(a.year)===year&&Number(a.sprint||a.sprintNumber||1)===Number(current?.number||1)).slice().reverse().find(a=>Object.values(a.groups||{}).some(ids=>Array.isArray(ids)&&ids.some(id=>String(id)===String(p.id))));
 const assignedLab=assigned?Object.entries(assigned.groups||{}).find(([lab,ids])=>lab!=='Nicht zugeteilt'&&Array.isArray(ids)&&ids.some(id=>String(id)===String(p.id)))?.[0]:'';
 const project=(Store.projectTemplates||[]).find(x=>String(x.id)===String(current?.projectId));
 const topic=year===6&&Number(current?.number)===1?'Vom Korn zum Brot':project?.name||current?.name||'Noch kein Thema hinterlegt';
 const lab=path.lab||assignedLab||'noch nicht gewählt';
 const entries=(workshop||[]).filter(([key,r])=>r?.current||r?.level||r?.history?.length);
 const subjects=new Map();for(const [key,r] of entries){const id=key.split('|')[0];const comp=Store.competencies.find(x=>String(x.id)===id);const subject=comp?.subject||'Weitere Bewertungen';if(!subjects.has(subject))subjects.set(subject,[]);subjects.get(subject).push({comp,r});}
 let html=`<div class="section">Lernstand in den Nebenfächern</div><div class="card"><b>${year===7?'Themenfeldunterricht':'Aktuelle Werkstatt'} · Sprint ${esc(current?.number||1)}</b><p>${esc(topic)}</p><p class="mini"><b>${year===7?'Themenfeld / Vertiefung':'Gewähltes Lab / Vertiefung'}:</b> ${esc(lab)}</p></div>`;
 const music=musicOfferEvidence(p);
 if(music)html+='<details class="card" open><summary><b>Musik</b> · Chor & Bläserklasse</summary>'+music+'</details>';
 html+='<div class="section">Bewertungen nach Fach</div>';
 if(!subjects.size)html+='<div class="card empty">Noch keine Bewertungen für die Werkstatt hinterlegt.</div>';
 for(const [subject,items] of [...subjects].sort((a,b)=>a[0].localeCompare(b[0],'de'))){html+=`<details class="card" open><summary><b>${esc(subject)}</b> · ${items.length} ${items.length===1?'Kompetenz':'Kompetenzen'} · ${items.filter(x=>x.r.current==='green').length} erreicht</summary>`;for(const {comp,r} of items){html+=`<div class="history"><b>${esc(comp?.text||'Gespeicherte Kompetenzbewertung')}</b> · ${esc(r.level||'–')} · ${statusLabel(r.current)}${r.history?.length?`<details><summary>Bewertungsverlauf (${r.history.length})</summary>${r.history.slice().reverse().map(h=>`<div class="mini">${esc(h.date||'')} · ${esc(h.teacher||'')} · ${esc(h.level||'')} · ${esc(h.value||'')}</div>`).join('')}</details>`:''}</div>`;}html+='</details>';}
 const base=entries.filter(([key])=>Store.competencies.find(c=>String(c.id)===key.split('|')[0])?.phase==='base').length;
 const depth=entries.filter(([key])=>Store.competencies.find(c=>String(c.id)===key.split('|')[0])?.phase==='lab').length;
 if(year<=6)html+=`<p class="mini">Davon ${base} bewertete Basiskompetenzen und ${depth} bewertete Vertiefungskompetenzen.</p>`;
 html+='<details class="card"><summary><b>Werkstattweg und Sprintzuordnungen bearbeiten</b></summary>'+renderWorkshopPath(p)+'</details>';
 return html;
}
function renderWorkshopPath(p){
 const year=Number(p.year||String(p.className||'').charAt(0));
 const sprints=(Store.sprints||[]).filter(s=>Number(s.year)===year).sort((a,b)=>Number(a.number)-Number(b.number));
 return `<div class="section">Werkstattweg</div><div class="pathGrid">${sprints.map(s=>{
  const project=(Store.projectTemplates||[]).find(x=>String(x.id)===String(s.projectId));
  const key=`${p.id}|${s.year}|${s.number}`,path=(Store.workshopPaths||{})[key]||{};
  const assigned=(Store.assignments||[]).filter(a=>a.type==='Sprint'&&Number(a.year)===year&&Number(a.sprint||a.sprintNumber||1)===Number(s.number)).slice().reverse().find(a=>Object.entries(a.groups||{}).some(([lab,ids])=>lab!=='Nicht zugeteilt'&&Array.isArray(ids)&&ids.some(id=>String(id)===String(p.id))));
  const assignedLab=assigned?Object.entries(assigned.groups||{}).find(([lab,ids])=>lab!=='Nicht zugeteilt'&&Array.isArray(ids)&&ids.some(id=>String(id)===String(p.id)))?.[0]:'';
  // Explicit saved choices take precedence; assignment history is only a fallback.
  const lab=path.lab!==undefined?path.lab:(assignedLab||'');
  const title=project?.name||s.name||(assigned?.title||'').replace(/^Sprint\\s*\\d+\\s*[–-]\\s*/,'')||'Thema noch nicht gewählt';
  const labs=[...new Set([...(project?.labs||[]),...Object.keys(assigned?.groups||{}).filter(x=>x!=='Nicht zugeteilt'),lab].filter(Boolean))];
  return `<div class="pathCard"><b>Sprint ${esc(s.number)}: ${esc(s.name||title)}</b><div class="mini">Thema: ${esc(title)}</div><label>Vertiefung</label><select onchange="saveWorkshopPath('${key}',this.value)"><option value="" ${!lab?'selected':''}>noch nicht gewählt</option>${labs.map(l=>`<option value="${esc(l)}" ${lab===l?'selected':''}>${esc(l)}</option>`).join('')}</select><label>Notiz</label><input value="${esc(path.note||'')}" onchange="saveWorkshopPathNote('${key}',this.value)" placeholder="optional"></div>`;
 }).join('')}</div>`;
}
function saveWorkshopPath(key,lab){Store.workshopPaths[key]=Store.workshopPaths[key]||{};Store.workshopPaths[key].lab=lab;Store.save();toast();}
function saveWorkshopPathNote(key,note){Store.workshopPaths[key]=Store.workshopPaths[key]||{};Store.workshopPaths[key].note=note;Store.save();}
function profileCoreEntries(p){
 const grade=Number(p.year||String(p.className).charAt(0));
 return Store.competencies.filter(c=>{
  if(c.type==='workshop'||c.sprint)return false;
  const key=c.id+'|'+p.id;
  // Existing pupil evidence remains visible even when curriculum and class years differ.
  return Object.prototype.hasOwnProperty.call(Store.records,key)||(c.type==='core'&&Number(c.year)===grade);
 }).map(c=>[c.id+'|'+p.id,Store.records[c.id+'|'+p.id]||{}]);
}
function renderProfileNavigation(p){return `<nav class="profileCompactNav" aria-label="Profilbereiche"><button class="chip" onclick="openProfileSection('overview')">← Profilübersicht</button>${[['core','Kernfächer'],['workshop',profileWorkshopLabel(p)],['offers','Angebote'],['development','Coaching'],['leb','LEB']].map(([id,label])=>`<button class="chip ${profileSection===id?'dark':''}" aria-pressed="${profileSection===id}" onclick="openProfileSection('${id}')">${label}</button>`).join('')}</nav>`;}
function profileSubjectTeamstar(p,subject){
 const code={Englisch:'en',Deutsch:'de',Mathematik:'ma'}[subject];if(!code)return '';
 const grade=Number(p.year||String(p.className||'').charAt(0));
 const comps=(Store.competencies||[]).filter(c=>c.subject===subject&&(Number(c.year)===grade||Number(c.year)===grade-1));
 const values=comps.map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(v=>['green','yellow','red'].includes(v));
 const green=values.filter(v=>v==='green').length;
 const awarded=Array.isArray(p.laStars)&&p.laStars.includes(code);
 const eligible=values.length>=3&&green/values.length>=.75;
 const allowed=Auth.isAdmin()||Auth.canLead(grade);
 return '<div class="card"><h3>⭐ TeamStar '+esc(subject)+'</h3><p>'+(awarded?'Bereits vergeben und im Lernatelier sichtbar.':eligible?'Vorschlag: '+green+' von '+values.length+' bewerteten Kompetenzen grün.':'Noch kein Vorschlag · '+green+' von '+values.length+' bewerteten Kompetenzen grün.')+'</p>'+
 (allowed&&!awarded&&eligible?'<button class="chip dark" onclick="profileAwardSubjectStar('+esc(JSON.stringify(p.id))+','+esc(JSON.stringify(subject))+')">TeamStar '+esc(subject)+' vergeben und ins Lernatelier übernehmen</button>':'')+
 '<p class="mini">Vorschlag ab mindestens 3 Bewertungen und 75 % Grün. Die Vergabe erfolgt ausschließlich durch eine Lehrkraft.</p></div>';
}
function profileAwardSubjectStar(id,subject){
 const code={Englisch:'en',Deutsch:'de',Mathematik:'ma'}[subject];if(!code)return;
 const p=(Store.pupils||[]).find(x=>String(x.id)===String(id));if(!p)return;
 const grade=Number(p.year||String(p.className||'').charAt(0));
 if(!(Auth.isAdmin()||Auth.canLead(grade)))return;
 const stars=Array.isArray(p.laStars)?p.laStars:[];
 if(!stars.includes(code)){p.laStars=[...stars,code];Store.save('TeamStar '+esc(subject)+' vergeben',{pupilId:p.id,subject:code});}
 render();
}
function renderProfileCore(p,entries){
 const subjects=['Deutsch','Mathematik','Englisch'];
 if(!subjects.includes(profileSubject))profileSubject='Englisch';
 const grade=Number(p.year||String(p.className||'').charAt(0));
 const selected=(Store.competencies||[]).filter(c=>c.subject===profileSubject&&c.type!=='workshop'&&!c.sprint&&Number(c.year)>=5&&Number(c.year)<=Math.max(8,grade)).map(c=>[c.id+'|'+p.id,Store.records[c.id+'|'+p.id]||{}]);
 const assessed=selected.filter(([,r])=>['green','yellow','red'].includes(r.current));
 const green=assessed.filter(([,r])=>r.current==='green').length;
 const tools='<div class="profileCoreTools"><button class="chip" onclick="profileToggleTool(\'teamstar\')">⭐ TeamStars</button>'+(profileSubject==='Englisch'?'<button class="chip" onclick="profileToggleTool(\'practice\')">English Practice</button>':'')+'</div>';
 const detail=profileCoreTool==='teamstar'?'<div class="profileToolPanel">'+profileSubjectTeamstar(p,profileSubject)+'</div>':profileCoreTool==='practice'&&profileSubject==='Englisch'?'<div class="profileToolPanel">'+(EnglishPractice.practiceReport(p)||'<div class="card empty">Keine Übungsberichte vorhanden.</div>')+EnglishPractice.access(p)+'</div>':'';
 const years=[5,6,7,8].map(year=>{
  const rows=selected.filter(([key])=>Number(Store.competencies.find(c=>c.id===key.split('|')[0])?.year)===year);
  if(!rows.length)return '';
  const rated=rows.filter(([,r])=>['green','yellow','red'].includes(r.current));
  return '<section class="profileYear"><h3>Klasse '+year+' <span class="mini">'+rated.length+' von '+rows.length+' bewertet</span></h3>'+renderGroupedCompetencies(rows)+'</section>';
 }).join('');
 return '<div class="profileCoreHeading"><div><h2>Kompetenzraster</h2><div class="mini">'+assessed.length+' bewertet · '+green+' erreicht</div></div>'+tools+'</div><div class="profileSubjectNav">'+subjects.map(subject=>'<button class="chip '+(subject===profileSubject?'dark':'')+'" onclick="selectProfileSubject('+esc(JSON.stringify(subject))+')">'+esc(subject)+'</button>').join('')+'</div>'+detail+years;
}
let profileCoreTool='';
function profileToggleTool(tool){profileCoreTool=profileCoreTool===tool?'':tool;render();}
function renderGroupedCompetencies(entries){
 const groups={};entries.forEach(([key,r])=>{const c=Store.competencies.find(x=>x.id===key.split('|')[0]);if(!c)return;(groups[c.subject]||(groups[c.subject]=[])).push({c,r});});
 const subjects=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'de'));
 return subjects.length?subjects.map(sub=>`<div class="profileRaster"><div class="profileRasterScroll"><table class="profileRasterTable"><thead><tr><th scope="col">Kompetenz</th><th scope="col">Niveau</th><th scope="col">Bewertung</th><th scope="col">Nachweise</th></tr></thead><tbody>${groups[sub].sort((a,b)=>(a.c.order||0)-(b.c.order||0)).map(({c,r})=>{
  const history=(r.history||[]).filter(h=>!h.removed&&h.source!=='english_practice');
  return `<tr><th scope="row"><b>${esc(c.text)}</b><div class="mini">${esc(c.category||'')}${c.unit?' · '+esc(c.unit):''}${c.sprint?' · Sprint '+esc(c.sprint):''}</div></th><td>${esc(r.level||'—')}</td><td>${r.current?statusLabel(r.current):'<span class="mini">noch nicht bewertet</span>'}</td><td>${EnglishPractice.evidence(r)}${history.length?`<details><summary>Bewertungsverlauf (${history.length})</summary>${history.slice().reverse().map(h=>`<div class="history">${esc(h.date||'')} · ${esc(h.teacher||'')} · ${esc(h.level||'')}${h.value?' · '+statusLabel(h.value):''}${h.score?`<br>${Number(h.score.points)}/${Number(h.score.max)} Punkte`:''}${h.topic?'<br>'+esc(h.topic):''}${h.note?'<p class="profileNote">'+esc(h.note)+'</p>':''}</div>`).join('')}</details>`:''}${!(r.practiceResults||[]).length&&!history.length?'<span class="mini">—</span>':''}</td></tr>`;
 }).join('')}</tbody></table></div></div>`).join(''):'<div class="card empty">Für dieses Fach sind noch keine Kompetenzen hinterlegt.</div>';
}
function pupilEditForm(p){return `<div class="card"><h2>Profil bearbeiten</h2><div class="formgrid"><div><label>Vorname</label><input id="p_first" value="${esc(p.first)}"></div><div><label>Nachname</label><input id="p_last" value="${esc(p.last)}"></div><div><label>Kurzform</label><input id="p_short" value="${esc(p.short)}"></div><div><label>Klasse</label><input id="p_class" value="${esc(p.className)}"></div><div><label>Team</label><select id="p_team">${TEAMS.map(t=>`<option ${p.team===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label>Coach</label><input id="p_coach" value="${esc(p.coach)}"></div></div><button class="chip dark" onclick="savePupilProfile()">Speichern</button></div>`}
function savePupilProfile(){ if(!Auth.isAdmin()){toast('Nur die Administration darf Stammdaten ändern.');return;} const p=(Store.pupils||[]).find(x=>x.id===State.pupil); p.first=document.getElementById('p_first').value.trim(); p.last=document.getElementById('p_last').value.trim(); p.short=document.getElementById('p_short').value.trim(); p.className=document.getElementById('p_class').value.trim(); p.team=document.getElementById('p_team').value; p.coach=document.getElementById('p_coach').value.trim(); p.color=teamColor(p.team); Store.save(); showPupilEdit=false; toast(); render(); }
function archivePupil(id){ if(!Auth.isAdmin()){toast('Nur die Administration darf Kinder archivieren.');return;} const p=(Store.pupils||[]).find(x=>x.id===id); if(!confirm(`${p.short} archivieren? Bewertungen und Historie bleiben erhalten.`))return; p.archived=true; Store.save(); State.pupil=null; toast('Archiviert'); render(); }

const COACH_6={'dunkelblau':'N. Oursin','hellblau':'C. Rock','hellrot':'M. Moser','dunkelrot':'D. Zwilling','hellgelb':'R. Tsehaye','dunkelgelb':'J. Bachmair','lila':'P. Brusda','pink':'J. Schöne','hellgrün':'M. Schnepf','dunkelgrün':'J. Vogt'};
function pupilImportForm(){return `<div class="card"><h2>IServ-Schülerliste importieren</h2><p>Du kannst die Benutzer-CSV direkt aus IServ auswählen. Bestehende Schüler*innen werden über den Account erkannt und aktualisiert, nicht doppelt angelegt.</p><div class="formgrid"><div><label>Zieljahrgang</label><select id="import_year"><option value="5">Jahrgang 5</option><option value="6" selected>Jahrgang 6</option><option value="7">Jahrgang 7</option></select></div><div><label>Klassen hochstufen?</label><select id="import_promote"><option value="1" selected>ja, z. B. 5a → 6a</option><option value="0">nein</option></select></div></div><input type="file" accept=".csv,text/csv" onchange="importPupilCsv(this.files[0])"><button class="chip" onclick="showPupilImport=false;render()">Abbrechen</button></div>`;}
function parseStudentCsv(text){return parseCsv(text);}
function extractTeam(info,groups){const raw=`${info||''} ${groups||''}`.toLowerCase();return ['dunkelblau','hellblau','dunkelrot','hellrot','dunkelgelb','hellgelb','dunkelgrün','hellgrün','violett','lila','pink','blau','rot','gelb','grün'].find(x=>raw.includes(x))||'Blau';}
function importPupilCsv(file){if(!file)return;const year=Number(document.getElementById('import_year').value),promote=document.getElementById('import_promote').value==='1';const reader=new FileReader();reader.onload=()=>{const rows=parseStudentCsv(reader.result).filter(x=>(x['Benutzertyp']||'Schüler').toLowerCase().includes('schüler'));let added=0,updated=0;for(const r of rows){const first=(r['Vorname']||'').trim(),last=(r['Nachname']||'').trim(),account=(r['Account']||'').trim();if(!first||!last)continue;let className=(r['Klasse/Information']||'').trim().split(' ')[0]||`${year}a`;if(promote)className=className.replace(/^\d/,String(year));const team=extractTeam(r['Klasse/Information'],r['Gruppen']);const coach=year===6?(COACH_6[team.toLowerCase()]||'noch offen'):'noch offen';let p=(Store.pupils||[]).find(x=>account&&x.account===account);if(!p){p={id:uid('p'),first,last,short:`${first} ${last.charAt(0)}.`,account,email:r['E-Mail-Adresse']||'',internalId:r['Interne ID']||'',className,year,team,coach,color:teamColor(team),archived:false,history:[]};Store.pupils.push(p);added++;}else{Object.assign(p,{first,last,className,year,team,coach:coach==='noch offen'?(p.coach||coach):coach,color:teamColor(team),archived:false});updated++;}}Store.save();State.year=year;showPupilImport=false;toast(`${added} neu · ${updated} aktualisiert`);render();};reader.readAsText(file,'utf-8');}
function renderLearningBiography(p){const s=Store.sprintHistory[p.id]||[],c=Store.clubHistory[p.id]||[],creative=pupilActivities(p.id).filter(x=>x.activity.type==='Kreativband');return `<div class="section">Lernbiografie</div><div class="grid"><div class="card"><h2>Sprints</h2>${s.length?s.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${x.priority}</div>`).join(''):'<p class="mini">Noch keine Sprintzuordnung.</p>'}</div><div class="card"><h2>Clubs</h2>${c.length?c.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${x.priority}</div>`).join(''):'<p class="mini">Noch keine Clubzuordnung.</p>'}</div><div class="card"><h2>Kreativband</h2>${creative.length?creative.map(x=>`<div class="history"><b>${esc(x.activity.name)}</b><br>${x.record.count||0} Teilnahmen</div>`).join(''):'<p class="mini">Noch keine Teilnahmen.</p>'}</div></div>`;}



