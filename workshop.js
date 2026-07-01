function workshop(){
  const subjects = [...new Set(Store.competencies.filter(c=>c.sprint===State.sprint).map(c=>c.subject))];
  if(!subjects.includes(State.subject)) State.subject = subjects[0] || 'WBS';

  const comps = Store.competencies.filter(c=>c.sprint===State.sprint && c.subject===State.subject);
  if(!State.competency || !comps.find(c=>c.id===State.competency)) State.competency = comps[0]?.id || null;

  let content = header('Werkstatt','Ganze Stufe alphabetisch. Keine Zuordnung zu Sprintgruppen nötig.');

  content += `<div class="toolbar">
    <div>
      ${[1,2,3,4,5].map(n=>`<button class="chip ${State.sprint===n?'active':''}" onclick="State.sprint=${n};State.competency=null;render()">Sprint ${n}</button>`).join('')}
    </div>
    <label>Fach</label>
    <select onchange="State.subject=this.value;State.competency=null;render()">
      ${subjects.map(s=>`<option ${State.subject===s?'selected':''}>${s}</option>`).join('')}
    </select>
    <label>Kompetenz</label>
    <select onchange="State.competency=this.value;render()">
      ${comps.map(c=>`<option value="${c.id}" ${State.competency===c.id?'selected':''}>${c.text} · Niveau ${c.level}</option>`).join('')}
    </select>
  </div>`;

  content += `<div class="toolbar formgrid">
    <div><label>Suche</label><input value="${State.search}" oninput="State.search=this.value;render()" placeholder="Name suchen..."></div>
    <div><label>Team</label><select onchange="State.team=this.value;render()">
      ${['alle','Blau','Rot','Gelb','Violett','Grün'].map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}
    </select></div>
    <div><label>Niveau</label><select onchange="State.level=this.value;render()">
      ${['alle','G','M','E'].map(n=>`<option ${State.level===n?'selected':''}>${n}</option>`).join('')}
    </select></div>
  </div>`;

  const comp = Store.competencies.find(c=>c.id===State.competency);
  if(comp){
    content += `<div class="card"><b>${comp.text}</b><p>${comp.subject} · Sprint ${comp.sprint} · ${comp.area} · Niveau ${comp.level}</p></div>`;
  }

  content += renderPupilTable(comp);
  shell(content);
}

function filteredPupils(){
  return Store.pupils
    .filter(p => State.team === 'alle' || p.team === State.team)
    .filter(p => State.level === 'alle' || p.level === State.level)
    .filter(p => {
      const s = State.search.trim().toLowerCase();
      if(!s) return true;
      return (p.last+' '+p.first+' '+p.short).toLowerCase().includes(s);
    })
    .sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));
}

function renderPupilTable(comp){
  if(!comp) return '<div class="card"><p>Für diesen Sprint/Fach sind noch keine Kompetenzen angelegt.</p></div>';
  const rows = filteredPupils().map(p=>{
    const r = Store.records[recKey(comp.id,p.id)] || {};
    const last = (r.history || []).slice(-1)[0];
    return `<tr>
      <td><span class="dot ${p.color}"></span>${p.short}</td>
      <td>${p.team}</td>
      <td>Coach ${p.coach}</td>
      <td>${p.level}</td>
      <td>${statusLabel(r.current)}</td>
      <td class="mini">${last ? last.date + ' · ' + last.teacher : '—'}</td>
      <td><button class="chip dark" onclick="openAssessment('${comp.id}','${p.id}')">Bearbeiten</button></td>
    </tr>`;
  }).join('');

  return `<div class="section">Stufe alphabetisch</div>
    <table class="studentTable">
      <thead><tr><th>Schüler*in</th><th>Team</th><th>Coach</th><th>Niveau</th><th>Status</th><th>Letzte Änderung</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function openAssessment(competencyId,pupilId){
  State.dialog = {competencyId,pupilId};
  renderDialog();
}

function renderDialog(){
  const target = document.getElementById('dialog');
  if(!target) return;
  if(!State.dialog){ target.innerHTML=''; return; }

  const comp = Store.competencies.find(c=>c.id===State.dialog.competencyId);
  const pupil = Store.pupils.find(p=>p.id===State.dialog.pupilId);
  const key = recKey(comp.id,pupil.id);
  const record = Store.records[key] || {current:null,firstGreen:null,history:[],notes:[]};

  target.innerHTML = `<div class="dialogBackdrop">
    <div class="dialog">
      <h2>${pupil.short} (${pupil.team})</h2>
      <p>Coach ${pupil.coach} · ${pupil.className} · Niveau ${pupil.level}</p>
      <div class="card" style="box-shadow:none"><b>${comp.text}</b><p>${comp.subject} · Sprint ${comp.sprint} · ${comp.area} · Niveau ${comp.level}</p></div>

      <label>Aktuelle Ausprägung</label>
      <div class="choice">
        <button class="red ${record.current==='red'?'selected':''}" onclick="setTempStatus('red')">noch nicht</button>
        <button class="yellow ${record.current==='yellow'?'selected':''}" onclick="setTempStatus('yellow')">teilweise</button>
        <button class="green ${record.current==='green'?'selected':''}" onclick="setTempStatus('green')">sicher</button>
      </div>

      <label>Notiz / Beobachtung</label>
      <textarea id="assessmentNote" placeholder="Optional: Beobachtung, Hilfe, nächster Schritt..."></textarea>

      <div class="mini">Erstmals sicher erreicht: ${record.firstGreen || '—'}</div>

      <div class="section">Verlauf</div>
      <div>${record.history.length ? record.history.map(h=>`<div class="history">${h.date} · ${h.teacher} · ${h.value}${h.note ? '<br>'+h.note : ''}</div>`).join('') : '<p class="mini">Noch kein Verlauf.</p>'}</div>

      <button class="chip dark" onclick="saveAssessment()">Speichern</button>
      <button class="chip" onclick="State.dialog=null;renderDialog()">Schließen</button>
    </div>
  </div>`;
}

let tempStatus = null;
function setTempStatus(value){
  tempStatus = value;
  const comp = State.dialog.competencyId;
  const pupil = State.dialog.pupilId;
  const key = recKey(comp,pupil);
  Store.records[key] = Store.records[key] || {current:null,firstGreen:null,history:[],notes:[]};
  Store.records[key].current = value;
  renderDialog();
}

function saveAssessment(){
  const compId = State.dialog.competencyId;
  const pupilId = State.dialog.pupilId;
  const key = recKey(compId,pupilId);
  const record = Store.records[key] || {current:null,firstGreen:null,history:[],notes:[]};
  const status = record.current || tempStatus;
  const note = document.getElementById('assessmentNote').value.trim();

  if(!status){ alert('Bitte zuerst eine Ausprägung wählen.'); return; }

  record.current = status;
  if(status === 'green' && !record.firstGreen) record.firstGreen = today();
  record.history.push({date:today(),teacher:State.teacher,value:status,note});
  if(note) record.notes.push({date:today(),teacher:State.teacher,note});
  Store.records[key] = record;
  Store.save();
  State.dialog = null;
  tempStatus = null;
  toast();
  render();
}
