function workshop(){
  const subjects = Store.subjects;
  if(!subjects.includes(State.subject)) State.subject = subjects[0] || 'Geographie';

  const comps = Store.competencies.filter(c=>c.year===State.year && c.sprint===State.sprint && c.subject===State.subject);
  if(!State.competency || !comps.find(c=>c.id===State.competency)) State.competency = comps[0]?.id || null;

  let content = header('Werkstatt',`Jahrgang ${State.year} · Sprint ${State.sprint}: ${sprintName(State.sprint)} · ganze Stufe alphabetisch`);

  content += `<div class="toolbar">
    <label>Jahrgang</label>
    <select onchange="State.year=Number(this.value);State.competency=null;render()">
      ${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}
    </select>
    <div>
      ${[1,2,3,4,5].map(n=>`<button class="chip ${State.sprint===n?'active':''}" onclick="State.sprint=${n};State.competency=null;render()">Sprint ${n}: ${sprintName(n)}</button>`).join('')}
    </div>
    <label>Fach</label>
    <select onchange="State.subject=this.value;State.competency=null;render()">
      ${subjects.map(s=>`<option ${State.subject===s?'selected':''}>${s}</option>`).join('')}
    </select>
    <label>Kompetenz</label>
    <select onchange="State.competency=this.value;render()">
      ${comps.map(c=>`<option value="${c.id}" ${State.competency===c.id?'selected':''}>${c.text} · Zielniveau ${c.level}</option>`).join('')}
    </select>
  </div>`;

  content += `<div class="toolbar formgrid">
    <div><label>Suche</label><input value="${State.search}" oninput="State.search=this.value;render()" placeholder="Name suchen..."></div>
    <div><label>Team</label><select onchange="State.team=this.value;render()">
      ${['alle','Blau','Rot','Gelb','Violett','Grün'].map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}
    </select></div>
    <div><label>Bewertungsniveau</label><select onchange="State.level=this.value;render()">
      ${['alle','G','M','E'].map(n=>`<option ${State.level===n?'selected':''}>${n}</option>`).join('')}
    </select></div>
  </div>`;

  const comp = Store.competencies.find(c=>c.id===State.competency);
  if(comp){
    content += `<div class="card"><b>${comp.text}</b><span class="badge">${comp.kind==='prozess'?'Prozesskompetenz':'Fachkompetenz'}</span><p>${comp.subject} · Sprint ${comp.sprint} · ${comp.area} · Zielniveau ${comp.level}</p></div>`;
  } else {
    content += `<div class="card"><p>Für dieses Fach, diesen Jahrgang und diesen Sprint sind noch keine Kompetenzen angelegt.</p></div>`;
  }

  content += renderPupilTable(comp);
  shell(content);
}

function filteredPupils(){
  return Store.pupils
    .filter(p => String(p.className).startsWith(String(State.year)))
    .filter(p => State.team === 'alle' || p.team === State.team)
    .filter(p => {
      const s = State.search.trim().toLowerCase();
      if(!s) return true;
      return (p.last+' '+p.first+' '+p.short).toLowerCase().includes(s);
    })
    .sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));
}

function renderPupilTable(comp){
  if(!comp) return '';
  const rows = filteredPupils().map(p=>{
    const r = Store.records[recKey(comp.id,p.id)] || {};
    const last = (r.history || []).slice(-1)[0];
    if(State.level !== 'alle' && r.level && r.level !== State.level) return '';
    return `<tr>
      <td><span class="dot ${p.color}"></span>${p.short}</td>
      <td>${p.team}</td>
      <td>Coach ${p.coach}</td>
      <td>${p.className}</td>
      <td>${r.level ? r.level : '—'}</td>
      <td>${statusLabel(r.current)}</td>
      <td class="mini">${last ? last.date + ' · ' + last.teacher : '—'}</td>
      <td><button class="chip dark" onclick="openAssessment('${comp.id}','${p.id}')">Bearbeiten</button></td>
    </tr>`;
  }).join('');

  return `<div class="section">Stufe alphabetisch</div>
    <table class="studentTable">
      <thead><tr><th>Schüler*in</th><th>Team</th><th>Coach</th><th>Klasse</th><th>Niveau</th><th>Status</th><th>Letzte Änderung</th><th></th></tr></thead>
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
  const record = Store.records[key] || {current:null,level:null,firstGreen:null,history:[],notes:[]};

  target.innerHTML = `<div class="dialogBackdrop">
    <div class="dialog">
      <h2>${pupil.short} (${pupil.team})</h2>
      <p>Coach ${pupil.coach} · ${pupil.className}</p>
      <div class="card" style="box-shadow:none"><b>${comp.text}</b><span class="badge">${comp.kind==='prozess'?'Prozess':'Fach'}</span><p>${comp.subject} · ${comp.area} · Zielniveau ${comp.level}</p></div>

      <label>Niveau dieser Bewertung</label>
      <div class="choice">
        <button class="${record.level==='G'?'selected yellow':''}" onclick="setAssessmentLevel('G')">G</button>
        <button class="${record.level==='M'?'selected yellow':''}" onclick="setAssessmentLevel('M')">M</button>
        <button class="${record.level==='E'?'selected yellow':''}" onclick="setAssessmentLevel('E')">E</button>
      </div>

      <label>Aktuelle Ausprägung</label>
      <div class="choice">
        <button class="red ${record.current==='red'?'selected':''}" onclick="setTempStatus('red')">noch nicht erreicht</button>
        <button class="yellow ${record.current==='yellow'?'selected':''}" onclick="setTempStatus('yellow')">teilweise erreicht</button>
        <button class="green ${record.current==='green'?'selected':''}" onclick="setTempStatus('green')">erreicht</button>
      </div>

      <label>Notiz / Beobachtung</label>
      <textarea id="assessmentNote" placeholder="Optional: Beobachtung, Hilfe, nächster Schritt..."></textarea>

      <label><input id="includeLeb" type="checkbox" ${comp.includeInLeb?'checked':''}> im LEB berücksichtigen</label>

      <div class="mini">Erstmals erreicht: ${record.firstGreen || '—'}</div>

      <div class="section">Verlauf</div>
      <div>${record.history.length ? record.history.map(h=>`<div class="history">${h.date} · ${h.teacher} · Niveau ${h.level || '—'} · ${h.value}${h.note ? '<br>'+h.note : ''}</div>`).join('') : '<p class="mini">Noch kein Verlauf.</p>'}</div>

      <button class="chip dark" onclick="saveAssessment()">Speichern</button>
      <button class="chip" onclick="State.dialog=null;renderDialog()">Schließen</button>
    </div>
  </div>`;
}

function setAssessmentLevel(value){
  const comp = State.dialog.competencyId;
  const pupil = State.dialog.pupilId;
  const key = recKey(comp,pupil);
  Store.records[key] = Store.records[key] || {current:null,level:null,firstGreen:null,history:[],notes:[]};
  Store.records[key].level = value;
  renderDialog();
}

function setTempStatus(value){
  const comp = State.dialog.competencyId;
  const pupil = State.dialog.pupilId;
  const key = recKey(comp,pupil);
  Store.records[key] = Store.records[key] || {current:null,level:null,firstGreen:null,history:[],notes:[]};
  Store.records[key].current = value;
  renderDialog();
}

function saveAssessment(){
  const compId = State.dialog.competencyId;
  const pupilId = State.dialog.pupilId;
  const key = recKey(compId,pupilId);
  const comp = Store.competencies.find(c=>c.id===compId);
  const record = Store.records[key] || {current:null,level:null,firstGreen:null,history:[],notes:[]};
  const status = record.current;
  const level = record.level;
  const note = document.getElementById('assessmentNote').value.trim();
  const includeLeb = document.getElementById('includeLeb').checked;

  if(!level){ alert('Bitte zuerst ein Niveau wählen.'); return; }
  if(!status){ alert('Bitte zuerst eine Ausprägung wählen.'); return; }

  comp.includeInLeb = includeLeb;
  record.current = status;
  record.level = level;
  if(status === 'green' && !record.firstGreen) record.firstGreen = today();
  record.history.push({date:today(),teacher:State.teacher,value:status,level,note});
  if(note) record.notes.push({date:today(),teacher:State.teacher,note});
  Store.records[key] = record;
  Store.save();
  State.dialog = null;
  toast();
  render();
}
