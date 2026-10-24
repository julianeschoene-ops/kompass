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
function students(){ if(State.pupil)return studentProfile(); const list=filteredPupils(); if(!list.length&&Sync.enabled()&&!studentAutoReloadBusy&&!studentAutoReloadAttempted.has(State.year))setTimeout(()=>ensureStudentRosterLoaded(State.year),0); if(!list.length&&Auth.isAdmin()&&!rosterCloudDiagnostic&&!rosterDiagnosticBusy)setTimeout(checkRosterCloudDiagnostic,0); let content=header('Schülerinnen & Schüler'); if(!list.length&&Auth.isAdmin())content+='<div class="card"><b>Cloud-Prüfung (nur lesend)</b><p>'+esc(rosterCloudDiagnostic||'Prüfung läuft …')+'</p><p>Im Browser geladen: '+(Store.pupils||[]).length+' SuS</p></div>'; if(!list.length&&Sync.enabled())content+='<div class="card"><b>Keine Schülerdaten für diese Auswahl geladen.</b><p>Die vorhandenen Schülerlisten werden nicht verändert. Bitte Cloud-Daten erneut laden.</p><button class="chip dark" onclick="reloadTeacherCloudData()">↻ Schülerdaten aus Cloud neu laden</button></div>'; content+=`<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);State.team='alle';State.pupil=null;render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Suche</label><input id="pupilNameSearch" value="${esc(State.search)}" oninput="State.search=this.value;renderKeepingFocus('pupilNameSearch')" placeholder="Name suchen …"></div><div><label>Team</label><select onchange="State.team=this.value;render()"><option value="alle">alle Teams</option>${TEAMS.map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}</select></div></div>`; if(canEdit())content+=`<button class="chip dark" onclick="showAddPupil=!showAddPupil;render()">+ Schüler hinzufügen</button><button class="chip" onclick="showPupilImport=!showPupilImport;render()">IServ-Liste importieren</button>`; if(showAddPupil)content+=addPupilForm(); if(showPupilImport)content+=pupilImportForm(); content+=`<div class="studentCards">${list.map(p=>`<div class="studentCard"><div class="studentMain"><span class="dot ${teamColor(p.team)}"></span><div><b>${esc(p.short)}</b><div class="mini">${esc(p.first)} ${esc(p.last)} · ${esc(p.className)} · Team ${esc(p.team)} · Coach ${esc(p.coach)}</div></div></div><button class="chip dark" onclick="State.pupil='${p.id}';render()">Profil</button></div>`).join('')||'<div class="card empty">Keine Treffer.</div>'}</div>`; shell(content); }
function addPupilForm(){ return `<div class="card"><h2>Schüler hinzufügen</h2><div class="formgrid"><div><label>Vorname</label><input id="new_first" oninput="autoShortName()"></div><div><label>Nachname</label><input id="new_last" oninput="autoShortName()"></div><div><label>Kurzform</label><input id="new_short"></div><div><label>Klasse</label><select id="new_class">${['a','b','c','d','e'].map(k=>`<option>${State.year}${k}</option>`).join('')}</select></div><div><label>Team</label><select id="new_team">${TEAMS.map(t=>`<option>${t}</option>`).join('')}</select></div><div><label>Coach</label><input id="new_coach" value="${esc(State.teacher)}"></div></div><button class="chip dark" onclick="saveNewPupil()">Speichern</button><button class="chip" onclick="showAddPupil=false;render()">Abbrechen</button></div>`; }
function autoShortName(){ const first=document.getElementById('new_first')?.value.trim(); const last=document.getElementById('new_last')?.value.trim(); const short=document.getElementById('new_short'); if(first&&last&&short&&!short.value)short.value=`${first} ${last.charAt(0)}.`; }
function saveNewPupil(){ const first=document.getElementById('new_first').value.trim(), last=document.getElementById('new_last').value.trim(), short=document.getElementById('new_short').value.trim()||`${first} ${last.charAt(0)}.`, className=document.getElementById('new_class').value, team=document.getElementById('new_team').value, coach=document.getElementById('new_coach').value.trim(); if(!first||!last||!coach){alert('Bitte Vorname, Nachname und Coach eintragen.');return;} Store.pupils.push({id:uid('p'),first,last,short,className,team,color:teamColor(team),coach}); Store.save(); showAddPupil=false; toast(); render(); }
let profileSection='overview',profileSectionPupil=null;
function openProfileSection(section){profileSection=section;render();document.getElementById('profileContent')?.focus();}
function studentProfile(){
 const p=(Store.pupils||[]).find(x=>x.id===State.pupil);
 if(!p){State.pupil=null;return students();}
 if(profileSectionPupil!==p.id){profileSectionPupil=p.id;profileSection='overview';showPupilEdit=false;}
 const entries=Object.entries(Store.records).filter(([key])=>key.endsWith('|'+p.id)&&Store.competencies.some(c=>c.id===key.split('|')[0]));
 const acts=pupilActivities(p.id),b=Store.behaviour[p.id]||{observations:[],teamStars:0};
 let content=header(`${esc(p.short)} (${esc(p.team)})`,`Coach ${esc(p.coach)} · ${esc(p.className)}`);
 content+=`<div class="toolbar"><button class="chip" onclick="State.pupil=null;showPupilEdit=false;render()">← Schülerübersicht</button>`;
 if(canEdit())content+=`<button class="chip" onclick="showPupilEdit=!showPupilEdit;render()">Profil bearbeiten</button><button class="chip" onclick="archivePupil('${p.id}')">Archivieren</button>`;
 content+='</div>';
 if(showPupilEdit)content+=pupilEditForm(p);
 content+=renderProfileTiles(p,entries,acts,b);
 const core=entries.filter(([key])=>!Store.competencies.find(c=>c.id===key.split('|')[0])?.sprint);
 const workshop=entries.filter(([key])=>Store.competencies.find(c=>c.id===key.split('|')[0])?.sprint);
 content+='<section id="profileContent" class="profileContent" tabindex="-1">';
 if(profileSection!=='overview')content+=`<button class="chip" onclick="openProfileSection('overview')">← Profilübersicht</button>`;
 if(profileSection==='core')content+='<h2>Kernfächer · Lernstand & Nachweise</h2>'+renderGroupedCompetencies(core)+EnglishPractice.practiceReport(p)+EnglishPractice.access(p);
 else if(profileSection==='workshop')content+=renderProfileWorkshop(p)+renderWorkshopPath(p)+(workshop.length?renderGroupedCompetencies(workshop):'');
 else if(profileSection==='offers')content+=renderProfileOffers(p,acts);
 else if(profileSection==='development')content+=`<h2>Coaching & Entwicklung</h2><div class="card"><h3>Arbeits- & Sozialverhalten</h3><p>${Number(b.teamStars)||0} volle TeamStar-Karten</p>${(b.observations||[]).map(x=>`<p>${esc(x)}</p>`).join('')||'<p class="mini">Noch keine Beobachtungen.</p>'}${b.note?`<h3>Notiz</h3><p class="profileNote">${esc(b.note)}</p>`:''}<button class="chip" onclick="State.view='behaviour';behaviourPupil='${p.id}';resetBehaviourDraft();render()">Beobachtungen bearbeiten</button><div class="section">Verlauf</div>${behaviourHistoryHtml(b.history)}</div>`;
 else if(profileSection==='leb')content+=`<h2>Lernentwicklungsbericht</h2><div class="card"><p>${Store.lebDrafts[p.id]?'Ein gespeicherter Entwurf liegt vor.':'Noch kein Entwurf gespeichert.'}</p><button class="chip dark" onclick="State.view='leb';lebMode='schueler';State.pupil='${p.id}';render()">LEB öffnen</button></div>`;
 else content+='<p class="mini">Wähle einen Bereich, um Lernstände, Teilnahmen oder Rückmeldungen anzusehen.</p>';
 content+='</section>';shell(content);
}
function renderProfileTiles(p,entries,acts,b){
 const subjects=[...new Set(entries.map(([key])=>Store.competencies.find(c=>c.id===key.split('|')[0])).filter(c=>c&&!c.sprint).map(c=>c.subject))];
 const tiles=[
 ['core','📚','Kernfächer','Lernstand, Kompetenzen & Nachweise',subjects.length?subjects.join(' · '):'Deutsch · Mathematik · Englisch','blueTile'],
 ['workshop','🧭','Werkstatt','Sprints, Labs & Vertiefungen','Zuordnungen und Werkstattweg','violetTile'],
 ['offers','🎨','Angebote','Clubs, Flexstunden & Kreativband','Teilnahmen und Rückmeldungen','mintTile'],
 ['development','⭐','Coaching & Entwicklung','Arbeits- und Sozialverhalten',`${(b.observations||[]).length} Beobachtungen · ${Number(b.teamStars)||0} TeamStar-Karten`,'amberTile'],
 ['leb','📝','LEB','Lernentwicklungsbericht',Store.lebDrafts[p.id]?'Entwurf gespeichert':'Noch kein Entwurf gespeichert','roseTile']
 ];
 return `<div class="section">Schülerprofil</div><nav class="profileAreas" aria-label="Profilbereiche">${tiles.map(([id,icon,title,desc,summary,color])=>`<button type="button" class="profileArea ${color} ${profileSection===id?'isActive':''}" aria-pressed="${profileSection===id}" aria-controls="profileContent" onclick="openProfileSection('${id}')"><span class="profileAreaIcon" aria-hidden="true">${icon}</span><b>${title}</b><span>${desc}</span><small>${esc(summary)}</small><span class="profileAreaOpen">${profileSection===id?'Geöffnet':'Öffnen →'}</span></button>`).join('')}</nav>`;
}
function renderProfileWorkshop(p){const history=Store.sprintHistory[p.id]||[];return '<h2>Werkstatt</h2>'+ (history.length?'<div class="card"><h3>Sprintzuordnungen</h3>'+history.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${esc(x.priority)}</div>`).join('')+'</div>':'');}
function renderProfileOffers(p,acts){
 const clubs=Store.clubHistory[p.id]||[],groups=new Map();
 for(const item of acts){const a=item.activity,name=a.type==='Kreativband'?creativeStatsGroupName(a.name):a.name,key=a.type+'|'+name; if(!groups.has(key))groups.set(key,{name,type:a.type,items:[]});groups.get(key).items.push(item);}
 const cards=[...groups.values()].map(group=>{
  const ids=new Set(group.items.map(x=>String(x.activity.id)));
  if(group.type==='Kreativband'&&group.name==='Kochen & Nähstudio')combinedCookSewIds().forEach(id=>ids.add(String(id)));
  const dated=Object.values(Store.dailyCreativeVisits||{}).filter(v=>v&&ids.has(String(v.activityId))&&String(v.pupilId)===String(p.id)&&v.date).length;
  const visits=Math.max(dated,...group.items.map(x=>Number(x.record.count)||0));
  return `<div class="card"><h3>${esc(group.name)}</h3><p class="mini">${esc(group.type)}</p><p>${visits} Teilnahmen</p>${group.items.map(({record:r})=>`${r.note?`<p class="profileNote">${esc(r.note)}</p>`:''}${r.creativeAssessment?.assessedBy?`<p>${esc(creativeAssessmentSummary(r.creativeAssessment))}</p>${r.creativeAssessment.note?`<p class="profileNote">${esc(r.creativeAssessment.note)}</p>`:''}`:''}${r.licenses?.length?`<p>${r.licenses.map(x=>esc(x)).join(' · ')}</p>`:''}`).join('')}</div>`;
 }).join('');
 return '<h2>Angebote & Teilnahmen</h2>'+ (clubs.length?'<details class="card"><summary>Clubzuordnungen</summary>'+clubs.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${esc(x.priority)}</div>`).join('')+'</details>':'')+(cards||'<div class="card empty">Noch keine Teilnahmen erfasst.</div>');
}
function renderWorkshopPath(p){const sprints=Store.sprints.filter(s=>s.year===Number(String(p.className).charAt(0))).sort((a,b)=>a.number-b.number);return`<div class="section">Werkstattweg</div><div class="pathGrid">${sprints.map(s=>{const project=Store.projectTemplates.find(x=>x.id===s.projectId),key=`${p.id}|${s.year}|${s.number}`,path=Store.workshopPaths[key]||{};return`<div class="pathCard"><b>Sprint ${s.number}: ${esc(s.name)}</b><div class="mini">${project?esc(project.name):'Thema noch nicht gewählt'}</div><label>Vertiefung</label><select onchange="saveWorkshopPath('${key}',this.value)"><option value="">noch nicht gewählt</option>${(project?.labs||[]).map(l=>`<option ${path.lab===l?'selected':''}>${esc(l)}</option>`).join('')}</select><label>Notiz</label><input value="${esc(path.note||'')}" onchange="saveWorkshopPathNote('${key}',this.value)" placeholder="optional"></div>`}).join('')}</div>`;}
function saveWorkshopPath(key,lab){Store.workshopPaths[key]=Store.workshopPaths[key]||{};Store.workshopPaths[key].lab=lab;Store.save();toast();}
function saveWorkshopPathNote(key,note){Store.workshopPaths[key]=Store.workshopPaths[key]||{};Store.workshopPaths[key].note=note;Store.save();}
function renderGroupedCompetencies(entries){const groups={};entries.forEach(([key,r])=>{const c=Store.competencies.find(x=>x.id===key.split('|')[0]);if(!c)return;(groups[c.subject]||(groups[c.subject]=[])).push({c,r});});const subjects=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'de'));return`<div class="section">Kompetenzverlauf</div>${subjects.length?subjects.map(sub=>`<details class="subjectGroup" open><summary>${esc(sub)} <span>${groups[sub].length}</span></summary>${groups[sub].sort((a,b)=>(a.c.order||0)-(b.c.order||0)).map(({c,r})=>`<div class="competencyRow"><div><b>${esc(c.text)}</b>${EnglishPractice.evidence(r)}<div class="mini">${esc(c.category)}${c.unit?' · '+c.unit:''}${c.sprint?' · Sprint '+c.sprint:''} · Niveau ${r.level||'—'}</div>${r.history?.slice().reverse().find(h=>!h.removed&&h.topic)?.topic||c.topic?`<div class="mini">Thema: ${esc(r.history?.slice().reverse().find(h=>!h.removed&&h.topic)?.topic||c.topic||'')}</div>`:''}</div><div>${statusLabel(r.current)}</div></div>`).join('')}</details>`).join(''):'<div class="card empty">Noch keine Einträge.</div>'}`;}
function pupilEditForm(p){return `<div class="card"><h2>Profil bearbeiten</h2><div class="formgrid"><div><label>Vorname</label><input id="p_first" value="${esc(p.first)}"></div><div><label>Nachname</label><input id="p_last" value="${esc(p.last)}"></div><div><label>Kurzform</label><input id="p_short" value="${esc(p.short)}"></div><div><label>Klasse</label><input id="p_class" value="${esc(p.className)}"></div><div><label>Team</label><select id="p_team">${TEAMS.map(t=>`<option ${p.team===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label>Coach</label><input id="p_coach" value="${esc(p.coach)}"></div></div><button class="chip dark" onclick="savePupilProfile()">Speichern</button></div>`}
function savePupilProfile(){ const p=(Store.pupils||[]).find(x=>x.id===State.pupil); p.first=document.getElementById('p_first').value.trim(); p.last=document.getElementById('p_last').value.trim(); p.short=document.getElementById('p_short').value.trim(); p.className=document.getElementById('p_class').value.trim(); p.team=document.getElementById('p_team').value; p.coach=document.getElementById('p_coach').value.trim(); p.color=teamColor(p.team); Store.save(); showPupilEdit=false; toast(); render(); }
function archivePupil(id){ const p=(Store.pupils||[]).find(x=>x.id===id); if(!confirm(`${p.short} archivieren? Bewertungen und Historie bleiben erhalten.`))return; p.archived=true; Store.save(); State.pupil=null; toast('Archiviert'); render(); }

const COACH_6={'dunkelblau':'N. Oursin','hellblau':'C. Rock','hellrot':'M. Moser','dunkelrot':'D. Zwilling','hellgelb':'R. Tsehaye','dunkelgelb':'J. Bachmair','lila':'P. Brusda','pink':'J. Schöne','hellgrün':'M. Schnepf','dunkelgrün':'J. Vogt'};
function pupilImportForm(){return `<div class="card"><h2>IServ-Schülerliste importieren</h2><p>Du kannst die Benutzer-CSV direkt aus IServ auswählen. Bestehende Schüler*innen werden über den Account erkannt und aktualisiert, nicht doppelt angelegt.</p><div class="formgrid"><div><label>Zieljahrgang</label><select id="import_year"><option value="5">Jahrgang 5</option><option value="6" selected>Jahrgang 6</option><option value="7">Jahrgang 7</option></select></div><div><label>Klassen hochstufen?</label><select id="import_promote"><option value="1" selected>ja, z. B. 5a → 6a</option><option value="0">nein</option></select></div></div><input type="file" accept=".csv,text/csv" onchange="importPupilCsv(this.files[0])"><button class="chip" onclick="showPupilImport=false;render()">Abbrechen</button></div>`;}
function parseStudentCsv(text){return parseCsv(text);}
function extractTeam(info,groups){const raw=`${info||''} ${groups||''}`.toLowerCase();return ['dunkelblau','hellblau','dunkelrot','hellrot','dunkelgelb','hellgelb','dunkelgrün','hellgrün','violett','lila','pink','blau','rot','gelb','grün'].find(x=>raw.includes(x))||'Blau';}
function importPupilCsv(file){if(!file)return;const year=Number(document.getElementById('import_year').value),promote=document.getElementById('import_promote').value==='1';const reader=new FileReader();reader.onload=()=>{const rows=parseStudentCsv(reader.result).filter(x=>(x['Benutzertyp']||'Schüler').toLowerCase().includes('schüler'));let added=0,updated=0;for(const r of rows){const first=(r['Vorname']||'').trim(),last=(r['Nachname']||'').trim(),account=(r['Account']||'').trim();if(!first||!last)continue;let className=(r['Klasse/Information']||'').trim().split(' ')[0]||`${year}a`;if(promote)className=className.replace(/^\d/,String(year));const team=extractTeam(r['Klasse/Information'],r['Gruppen']);const coach=year===6?(COACH_6[team.toLowerCase()]||'noch offen'):'noch offen';let p=(Store.pupils||[]).find(x=>account&&x.account===account);if(!p){p={id:uid('p'),first,last,short:`${first} ${last.charAt(0)}.`,account,email:r['E-Mail-Adresse']||'',internalId:r['Interne ID']||'',className,year,team,coach,color:teamColor(team),archived:false,history:[]};Store.pupils.push(p);added++;}else{Object.assign(p,{first,last,className,year,team,coach:coach==='noch offen'?(p.coach||coach):coach,color:teamColor(team),archived:false});updated++;}}Store.save();State.year=year;showPupilImport=false;toast(`${added} neu · ${updated} aktualisiert`);render();};reader.readAsText(file,'utf-8');}
function renderLearningBiography(p){const s=Store.sprintHistory[p.id]||[],c=Store.clubHistory[p.id]||[],creative=pupilActivities(p.id).filter(x=>x.activity.type==='Kreativband');return `<div class="section">Lernbiografie</div><div class="grid"><div class="card"><h2>Sprints</h2>${s.length?s.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${x.priority}</div>`).join(''):'<p class="mini">Noch keine Sprintzuordnung.</p>'}</div><div class="card"><h2>Clubs</h2>${c.length?c.slice().reverse().map(x=>`<div class="history"><b>${esc(x.name)}</b><br>${esc(x.title)} · Wunsch ${x.priority}</div>`).join(''):'<p class="mini">Noch keine Clubzuordnung.</p>'}</div><div class="card"><h2>Kreativband</h2>${creative.length?creative.map(x=>`<div class="history"><b>${esc(x.activity.name)}</b><br>${x.record.count||0} Teilnahmen</div>`).join(''):'<p class="mini">Noch keine Teilnahmen.</p>'}</div></div>`;}


