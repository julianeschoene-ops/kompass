let adminFilter = {sprint:'alle', subject:'alle', kind:'alle'};
let openGroups = {};

function admin(){
  if(!canEdit()){
    shell(header('Kein Zugriff','Nur Stufenleitung und Admin können Kompetenzen bearbeiten.'));
    return;
  }

  let content = header('Verwaltung',`Sprints, Fächer und Kompetenzen für Jahrgang ${State.year}.`);
  content += `<div class="toolbar"><label>Jahrgang</label><select onchange="State.year=Number(this.value);render()">${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>`;

  content += `<div class="grid2">
    <div class="card">
      <h2>Sprints Jahrgang 5</h2>
      ${Store.sprints.filter(s=>s.year===State.year).map(s=>`<div class="row"><div><b>Sprint ${s.number}</b><div class="mini">${s.name}</div></div><button class="chip" onclick="renameSprint(${s.number})">Umbenennen</button></div>`).join('')}
    </div>
    <div class="card">
      <h2>Werkstattfächer</h2>
      ${Store.subjects.map(s=>`<span class="chip">${s}</span>`).join('')}
      <button class="chip dark" onclick="addSubject()">+ Fach hinzufügen</button>
    </div>
  </div>`;

  content += `<div class="section">Kompetenzen</div>
    <div class="toolbar formgrid">
      <div><label>Sprint</label><select onchange="adminFilter.sprint=this.value;render()">
        <option value="alle" ${adminFilter.sprint==='alle'?'selected':''}>alle</option>
        ${[1,2,3,4,5].map(n=>`<option value="${n}" ${adminFilter.sprint==n?'selected':''}>Sprint ${n}: ${sprintName(n)}</option>`).join('')}
        <option value="prozess" ${adminFilter.sprint==='prozess'?'selected':''}>Prozesskompetenzen</option>
      </select></div>
      <div><label>Fach</label><select onchange="adminFilter.subject=this.value;render()">
        <option value="alle" ${adminFilter.subject==='alle'?'selected':''}>alle</option>
        ${Store.subjects.map(s=>`<option ${adminFilter.subject===s?'selected':''}>${s}</option>`).join('')}
        <option ${adminFilter.subject==='Prozess'?'selected':''}>Prozess</option>
      </select></div>
      <div><label>Typ</label><select onchange="adminFilter.kind=this.value;render()">
        <option value="alle" ${adminFilter.kind==='alle'?'selected':''}>alle</option>
        <option value="fach" ${adminFilter.kind==='fach'?'selected':''}>Fachkompetenz</option>
        <option value="prozess" ${adminFilter.kind==='prozess'?'selected':''}>Prozesskompetenz</option>
      </select></div>
    </div>
    <button class="chip dark" onclick="addCompetency()">+ Kompetenz anlegen</button>
    <button class="chip" onclick="openGroups={};render()">alle einklappen</button>`;

  content += renderCompetencyGroups();
  shell(content);
}

function filteredCompetencies(){
  return Store.competencies.filter(c=>{
    if(c.year !== State.year) return false;
    if(adminFilter.kind !== 'alle' && c.kind !== adminFilter.kind) return false;
    if(adminFilter.subject !== 'alle' && c.subject !== adminFilter.subject) return false;
    if(adminFilter.sprint === 'prozess') return !c.sprint;
    if(adminFilter.sprint !== 'alle' && Number(adminFilter.sprint) !== c.sprint) return false;
    return true;
  });
}

function renderCompetencyGroups(){
  const comps = filteredCompetencies();
  if(!comps.length) return '<div class="card"><p>Keine Kompetenzen für diese Filter.</p></div>';

  const grouped = {};
  comps.forEach(c=>{
    const sprintLabel = c.sprint ? `Sprint ${c.sprint}: ${sprintName(c.sprint)}` : 'Prozesskompetenzen';
    grouped[sprintLabel] = grouped[sprintLabel] || {};
    grouped[sprintLabel][c.subject] = grouped[sprintLabel][c.subject] || {};
    grouped[sprintLabel][c.subject][c.area] = grouped[sprintLabel][c.subject][c.area] || [];
    grouped[sprintLabel][c.subject][c.area].push(c);
  });

  let html = '<div class="list">';
  Object.entries(grouped).forEach(([sprint,subjects])=>{
    html += `<div class="card"><h2>${sprint}</h2>`;
    Object.entries(subjects).forEach(([subject,areas])=>{
      const subjectCount = Object.values(areas).flat().length;
      const key = encodeURIComponent(sprint+'|'+subject);
      const plainKey = sprint+'|'+subject;
      html += `<div class="row" onclick="toggleGroup('${key}')" style="cursor:pointer">
        <div><b>${subject}</b><div class="mini">${subjectCount} Kompetenz(en)</div></div>
        <button class="chip">${openGroups[plainKey]?'einklappen':'öffnen'}</button>
      </div>`;
      if(openGroups[plainKey]){
        Object.entries(areas).forEach(([area,items])=>{
          html += `<div class="card" style="box-shadow:none;margin:8px 0 12px 20px"><b>${area}</b><div class="mini">${items.length} Kompetenz(en)</div>`;
          items.forEach(c=>{
            html += `<div class="row" style="margin-top:8px">
              <div><b>${c.text}</b><span class="badge">${c.kind==='prozess'?'Prozess':'Fach'}</span><div class="mini">Niveau ${c.level} · LEB: ${c.includeInLeb?'ja':'nein'}</div></div>
              <button class="chip" onclick="event.stopPropagation();editCompetency('${c.id}')">Bearbeiten</button>
            </div>`;
          });
          html += `</div>`;
        });
      }
    });
    html += `</div>`;
  });
  html += '</div>';
  return html;
}

function toggleGroup(encodedKey){
  const key = decodeURIComponent(encodedKey);
  openGroups[key] = !openGroups[key];
  render();
}

function renameSprint(number){
  const s = Store.sprints.find(x=>x.year===State.year && x.number===number);
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
  const isProcess = adminFilter.kind === 'prozess' || adminFilter.sprint === 'prozess';
  Store.competencies.push({
    id,
    year:State.year,
    sprint:isProcess ? null : (adminFilter.sprint !== 'alle' ? Number(adminFilter.sprint) : State.sprint),
    subject:isProcess ? 'Prozess' : (adminFilter.subject !== 'alle' ? adminFilter.subject : State.subject),
    area:isProcess ? 'Selbstorganisation' : 'Neuer Bereich',
    level:'G/M/E',
    kind:isProcess ? 'prozess' : 'fach',
    includeInLeb:true,
    text:'Neue Kompetenz'
  });
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
  const leb = prompt('Im LEB berücksichtigen? ja/nein:', c.includeInLeb ? 'ja' : 'nein');
  if(leb !== null) c.includeInLeb = leb.toLowerCase().startsWith('j');
  Store.save();
  toast();
  render();
}
