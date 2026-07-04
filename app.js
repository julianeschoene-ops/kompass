const CORE_SUBJECTS = ['Deutsch','Mathematik','Englisch'];
const WORKSHOP_SUBJECTS = ['Geographie','Geschichte','Informatik & Medienbildung','BK','Musik'];

function ensureV40Data(){
  let changed=false;
  (SEED.subjects||[]).forEach(s=>{ if(!Store.subjects.includes(s)){ Store.subjects.push(s); changed=true; }});
  (SEED.competencies||[]).forEach(c=>{ if(!Store.competencies.some(x=>x.id===c.id)){ Store.competencies.push(c); changed=true; }});
  Store.metadata.version='4.0';
  if(changed) Store.save();
}

function dashboard(){
  const pupils=Store.pupils.filter(p=>String(p.className).startsWith(String(State.year)));
  const recs=Object.values(Store.records);
  const done=recs.filter(r=>r.current).length;
  const scoreCount=recs.filter(r=>r.score).length;
  let content=header('Dashboard',`KOMPASS 4.0 · Jahrgang ${State.year}`);
  content += `<div class="toolbar"><label>Jahrgang</label><select onchange="State.year=Number(this.value);render()">${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>`;
  content += `<div class="grid">
    <div class="tile" onclick="setView('workshop')"><b>Werkstattunterricht</b><span>Sprints, Nebenfächer und Prozesskompetenzen dokumentieren.</span></div>
    <div class="tile" onclick="setView('core')"><b>Kernfächer</b><span>Deutsch, Mathe und Englisch ohne Units dokumentieren.</span></div>
    <div class="tile" onclick="setView('leb')"><b>LEB-Texte</b><span>Differenzierte Fachtexte erzeugen, bearbeiten und kopieren.</span></div>
  </div>`;
  content += `<div class="section">Überblick</div><div class="grid">
    <div class="card"><h2>${pupils.length}</h2><p>Schüler*innen im Jahrgang</p></div>
    <div class="card"><h2>${done}</h2><p>gespeicherte Bewertungen</p></div>
    <div class="card"><h2>${scoreCount}</h2><p>Bewertungen mit Punkte-Auswertung</p></div>
  </div>`;
  shell(content);
}

function settings(){
  let content=header('Einstellungen','Datensicherung, Wiederherstellung und Update-Hinweise.');
  content += `<div class="card"><h2>Datensicherung</h2><p>Vor Updates bitte immer sichern.</p><button class="chip dark" onclick="downloadBackup()">Datensicherung herunterladen</button><label class="chip">Datensicherung einspielen<input type="file" accept="application/json" style="display:none" onchange="uploadBackup(this)"></label></div>`;
  content += `<div class="card"><h2>Version 4.0</h2><p>Neu: Punkte → rot/gelb/grün, Kernfächer Deutsch/Mathematik/Englisch und differenziertere LEB-Texte.</p></div>`;
  shell(content);
}
function downloadBackup(){
  const blob=new Blob([JSON.stringify(Store.exportData(),null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kompass-4-backup.json'; a.click(); URL.revokeObjectURL(a.href);
}
function uploadBackup(input){
  const file=input.files?.[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ try{ const ok=Store.importData(JSON.parse(reader.result)); if(ok){ ensureV40Data(); toast('Importiert'); render(); }}catch(e){ alert('Die Datei konnte nicht gelesen werden.'); }};
  reader.readAsText(file);
}

function coreSubjects(){
  if(!CORE_SUBJECTS.includes(State.subject)) State.subject='Englisch';
  const comps=Store.competencies.filter(c=>c.year===State.year && CORE_SUBJECTS.includes(c.subject) && c.subject===State.subject && !c.sprint);
  if(!State.competency || !comps.find(c=>c.id===State.competency)) State.competency=comps[0]?.id||null;
  let content=header('Kernfächer',`Jahrgang ${State.year} · ${State.subject} · Kompetenzdokumentation ohne Units`);
  content += `<div class="toolbar formgrid">
    <div><label>Jahrgang</label><select onchange="State.year=Number(this.value);State.competency=null;render()">${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>
    <div><label>Kernfach</label><select onchange="State.subject=this.value;State.competency=null;render()">${CORE_SUBJECTS.map(s=>`<option ${State.subject===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <div><label>Kompetenz</label><select onchange="State.competency=this.value;render()">${comps.map(c=>`<option value="${c.id}" ${State.competency===c.id?'selected':''}>${c.area}: ${c.text}</option>`).join('')}</select></div>
    <div><label>Team</label><select onchange="State.team=this.value;render()">${['alle','Blau','Rot','Gelb','Violett','Grün'].map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}</select></div>
  </div>`;
  const comp=Store.competencies.find(c=>c.id===State.competency);
  if(comp) content += `<div class="card"><b>${comp.text}</b><span class="badge">Kernfach</span><p>${comp.subject} · ${comp.area} · Zielniveau ${comp.level}</p></div>`;
  else content += `<div class="card"><p>Für dieses Kernfach sind noch keine Kompetenzen angelegt. Du kannst sie in der Kompetenzverwaltung ergänzen.</p></div>`;
  content += renderPupilTable(comp);
  shell(content);
}

ensureV40Data();
render();
