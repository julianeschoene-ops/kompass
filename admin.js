function admin(){
  if(!canEdit()){
    shell(header('Kein Zugriff','Nur Stufenleitung und Admin können Kompetenzen bearbeiten.'));
    return;
  }

  let content = header('Verwaltung','Werkstattkompetenzen bearbeiten. Weitere Unterrichtsformen kommen später.');
  content += `<button class="chip dark" onclick="addCompetency()">+ Kompetenz anlegen</button>`;
  content += `<div class="list">`;
  content += Store.competencies.map(c=>`<div class="row">
    <div><b>${c.text}</b><div class="mini">Sprint ${c.sprint} · ${c.subject} · ${c.area} · Niveau ${c.level}</div></div>
    <button class="chip" onclick="editCompetency('${c.id}')">Bearbeiten</button>
  </div>`).join('');
  content += `</div>`;
  shell(content);
}

function addCompetency(){
  const id = 'c' + Date.now();
  Store.competencies.push({id,sprint:State.sprint,subject:'WBS',area:'Neuer Bereich',level:'alle',text:'Neue Kompetenz'});
  Store.save();
  toast();
  render();
}

function editCompetency(id){
  const c = Store.competencies.find(x=>x.id===id);
  const text = prompt('Kompetenztext bearbeiten:', c.text);
  if(text === null) return;
  c.text = text;
  const level = prompt('Niveau (alle, G, M, E, G/M/E):', c.level);
  if(level !== null) c.level = level;
  Store.save();
  toast();
  render();
}
