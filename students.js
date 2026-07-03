let showPupilEdit = false;

function students(){
  if(State.pupil) return studentProfile();

  const list = Store.pupils
    .filter(p => String(p.className).startsWith(String(State.year)))
    .filter(p => {
      const s = State.search.trim().toLowerCase();
      if(!s) return true;
      return (p.last+' '+p.first+' '+p.short).toLowerCase().includes(s);
    })
    .sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));

  let content = header('Schüler',`Alphabetische Schüleransicht · Jahrgang ${State.year}`);
  content += `<div class="toolbar formgrid">
    <div><label>Jahrgang</label><select onchange="State.year=Number(this.value);render()">
      ${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}
    </select></div>
    <div><label>Suche</label><input value="${State.search}" oninput="State.search=this.value;render()" placeholder="Name suchen..."></div>
  </div>`;
  content += `<table class="studentTable"><thead><tr><th>Schüler*in</th><th>Team</th><th>Coach</th><th>Klasse</th><th></th></tr></thead><tbody>`;
  content += list.map(p=>`<tr>
    <td><span class="dot ${p.color}"></span>${p.short}</td>
    <td>${p.team}</td>
    <td>Coach ${p.coach}</td>
    <td>${p.className}</td>
    <td><button class="chip dark" onclick="State.pupil='${p.id}';showPupilEdit=false;render()">Profil</button></td>
  </tr>`).join('');
  content += `</tbody></table>`;
  shell(content);
}

function studentProfile(){
  const p = Store.pupils.find(x=>x.id===State.pupil);
  const entries = Object.entries(Store.records).filter(([key])=>key.endsWith('|'+p.id));

  let content = header(`${p.short} (${p.team})`,`Coach ${p.coach} · ${p.className}`);
  content += `<button class="chip" onclick="State.pupil=null;showPupilEdit=false;render()">zurück</button>`;
  content += `<button class="chip dark" onclick="State.view='leb';render()">LEB-Entwurf öffnen</button>`;
  if(canEdit()){
    content += `<button class="chip" onclick="showPupilEdit=!showPupilEdit;render()">Schülerprofil bearbeiten</button>`;
  }

  if(showPupilEdit){
    content += pupilEditForm(p);
  }

  content += renderLevelSummary(entries);

  content += `<div class="section">Werkstattverlauf</div><div class="list">`;
  content += entries.length ? entries.map(([key,r])=>{
    const compId = key.split('|')[0];
    const comp = Store.competencies.find(c=>c.id===compId);
    return `<div class="card"><b>${comp ? comp.text : compId}</b><p>${comp ? comp.subject+' · '+(comp.sprint?'Sprint '+comp.sprint:'Prozess')+' · Zielniveau '+comp.level : ''}</p><p>Niveau ${r.level || '—'} · ${statusLabel(r.current)} · erstmals erreicht: ${r.firstGreen || '—'}</p><div class="mini">${r.history.length} Bewertung(en), ${(r.notes||[]).length} Notiz(en)</div></div>`;
  }).join('') : '<div class="card"><p>Noch keine Werkstatteinträge.</p></div>';
  content += `</div>`;
  shell(content);
}

function renderLevelSummary(entries){
  const rows = entries.map(([key,r])=>{
    const compId = key.split('|')[0];
    const comp = Store.competencies.find(c=>c.id===compId);
    if(!comp || !r.level) return '';
    return `<tr><td>${comp.subject}</td><td>${comp.sprint ? 'Sprint '+comp.sprint : 'Prozess'}</td><td>${r.level}</td><td>${statusLabel(r.current)}</td></tr>`;
  }).join('');
  if(!rows) return '';
  return `<div class="section">Niveaustände aus Bewertungen</div>
    <table class="studentTable"><thead><tr><th>Fach</th><th>Sprint</th><th>Niveau</th><th>Stand</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function pupilEditForm(p){
  return `<div class="card">
    <h2>Schülerprofil bearbeiten</h2>
    <div class="formgrid">
      <div><label>Vorname</label><input id="p_first" value="${p.first}"></div>
      <div><label>Nachname</label><input id="p_last" value="${p.last}"></div>
      <div><label>Kurzform</label><input id="p_short" value="${p.short}"></div>
      <div><label>Klasse</label><select id="p_class">
        ${['5a','5b','5c','5d','5e','6a','6b','6c','6d','6e','7a','7b','7c','7d','7e'].map(k=>`<option ${p.className===k?'selected':''}>${k}</option>`).join('')}
      </select></div>
      <div><label>Teamfarbe</label><select id="p_team">
        ${['Blau','Rot','Gelb','Violett','Grün'].map(t=>`<option ${p.team===t?'selected':''}>${t}</option>`).join('')}
      </select></div>
      <div><label>Coach</label><input id="p_coach" value="${p.coach}"></div>
    </div>
    <button class="chip dark" onclick="savePupilProfile()">Speichern</button>
  </div>`;
}

function savePupilProfile(){
  const p = Store.pupils.find(x=>x.id===State.pupil);
  p.first = document.getElementById('p_first').value.trim();
  p.last = document.getElementById('p_last').value.trim();
  p.short = document.getElementById('p_short').value.trim();
  p.className = document.getElementById('p_class').value;
  p.team = document.getElementById('p_team').value;
  p.coach = document.getElementById('p_coach').value.trim();
  p.color = teamToColor(p.team);
  Store.save();
  showPupilEdit = false;
  toast();
  render();
}

function teamToColor(team){
  if(team === 'Blau') return 'a';
  if(team === 'Rot') return 'b';
  if(team === 'Gelb') return 'c';
  if(team === 'Violett') return 'd';
  if(team === 'Grün') return 'e';
  return 'a';
}
