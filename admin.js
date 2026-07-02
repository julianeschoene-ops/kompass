function admin(){
  if(!canEdit()){
    shell(header('Kein Zugriff','Nur Stufenleitung und Admin können Kompetenzen bearbeiten.'));
    return;
  }

  let content = header('Verwaltung','Sprints, Fächer und Kompetenzen für den Werkstattunterricht.');
  content += `<div class="grid2">
    <div class="card">
      <h2>Sprints Jahrgang 5</h2>
      ${Store.sprints.filter(s=>s.year===5).map(s=>`<div class="row"><div><b>Sprint ${s.number}</b><div class="mini">${s.name}</div></div><button class="chip" onclick="renameSprint(${s.number})">Umbenennen</button></div>`).join('')}
    </div>
    <div class="card">
      <h2>Werkstattfächer</h2>
      ${Store.subjects.map(s=>`<span class="chip">${s}</span>`).join('')}
      <button class="chip dark" onclick="addSubject()">+ Fach hinzufügen</button>
    </div>
  </div>`;

  content += `<div class="section">Kompetenzen</div><button class="chip dark" onclick="addCompetency()">+ Kompetenz anlegen</button>`;
  content += `<div class="list">`;
  content += Store.competencies.map(c=>`<div class="row">
    <div><b>${c.text}</b><span class="badge">${c.kind==='prozess'?'Prozess':'Fach'}</span><div class="mini">${c.sprint?'Sprint '+c.sprint:'alle Sprints'} · ${c.subject} · ${c.area} · Niveau ${c.level} · LEB: ${c.includeInLeb?'ja':'nein'}</div></div>
    <button class="chip" onclick="editCompetency('${c.id}')">Bearbeiten</button>
  </div>`).join('');
  content += `</div>`;
  shell(content);
}

function renameSprint(number){
  const s = Store.sprints.find(x=>x.year===5 && x.number===number);
  const name = prompt('Sprint benennen:', s.name);
  if(name===null) return;
  s.name = name;
  Store.save();
  toast();
  render();
}

function addSubject(){
  const name = prompt('Neues Werkstattfach:');
  if(!name) return;
  Store.subjects.push(name);
  Store.save();
  toast();
  render();
}

function addCompetency(){
  const id = 'c' + Date.now();
  Store.competencies.push({id,year:5,sprint:State.sprint,subject:State.subject,area:'Neuer Bereich',level:'G/M/E',kind:'fach',includeInLeb:true,text:'Neue Kompetenz'});
  Store.save();
  toast();
  render();
}

function editCompetency(id){
  const c = Store.competencies.find(x=>x.id===id);
  const text = prompt('Kompetenztext bearbeiten:', c.text);
  if(text === null) return;
  c.text = text;
  const subject = prompt('Fach:', c.subject);
  if(subject !== null) c.subject = subject;
  const area = prompt('Bereich:', c.area);
  if(area !== null) c.area = area;
  const level = prompt('Niveau (alle, G, M, E, G/M/E):', c.level);
  if(level !== null) c.level = level;
  const kind = prompt('Typ (fach oder prozess):', c.kind);
  if(kind !== null) c.kind = kind;
  const sprint = prompt('Sprintnummer leer lassen für Prozesskompetenz in allen Sprints:', c.sprint || '');
  if(sprint !== null) c.sprint = sprint ? Number(sprint) : null;
  Store.save();
  toast();
  render();
}
