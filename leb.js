function leb(){
  const list = Store.pupils.slice().sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));
  const selected = State.pupil || list[0]?.id;
  if(!State.pupil) State.pupil = selected;
  const pupil = Store.pupils.find(p=>p.id===State.pupil);

  let content = header('LEB-Entwurf','Aus Ampelbewertung, Kompetenztyp und Notizen wird ein fortlaufender Text erzeugt.');
  content += `<div class="toolbar"><label>Schüler*in</label><select onchange="State.pupil=this.value;render()">${list.map(p=>`<option value="${p.id}" ${State.pupil===p.id?'selected':''}>${p.short} (${p.team}) · Coach ${p.coach}</option>`).join('')}</select></div>`;

  const generated = generateLebText(pupil);
  const saved = Store.lebDrafts[pupil.id] || generated;

  content += `<div class="grid2">
    <div class="card">
      <h2>${pupil.short} (${pupil.team})</h2>
      <p>Coach ${pupil.coach} · ${pupil.className} · Niveau ${pupil.level}</p>
      <div class="section">Automatisch erzeugter Entwurf</div>
      <div class="lebText">${generated}</div>
      <button class="chip dark" onclick="copyGeneratedLeb()">Entwurf in Bearbeitung übernehmen</button>
    </div>
    <div class="card">
      <h2>Bearbeitbarer LEB-Text</h2>
      <textarea id="lebEditor" style="min-height:360px">${saved}</textarea>
      <button class="chip dark" onclick="saveLebDraft()">LEB-Text speichern</button>
      <button class="chip" onclick="navigator.clipboard.writeText(document.getElementById('lebEditor').value);toast('Kopiert')">Text kopieren</button>
    </div>
  </div>`;

  shell(content);
}

function competenceCore(text){
  return text
    .replace(/^Ich kann\s+/i,'')
    .replace(/\.$/,'')
    .trim();
}

function verbalizeCompetence(comp, status, pupil){
  const core = competenceCore(comp.text);
  const lower = core.charAt(0).toLowerCase() + core.slice(1);

  if(status === 'green'){
    return `${pupil.first} kann ${lower} sicher und selbstständig.`;
  }
  if(status === 'yellow'){
    return `${pupil.first} kann ${lower} in Grundzügen und entwickelt hierbei zunehmend Sicherheit.`;
  }
  if(status === 'red'){
    return `${pupil.first} benötigt bei dieser Kompetenz noch Unterstützung.`;
  }
  return '';
}

function verbalizeProcess(comp, status, pupil){
  const area = comp.area.toLowerCase();

  const green = {
    'selbstorganisation': `${pupil.first} plant und organisiert die eigene Arbeit zuverlässig.`,
    'zusammenarbeit': `${pupil.first} arbeitet konstruktiv im Team und bringt sich verlässlich ein.`,
    'problemlösen': `${pupil.first} entwickelt eigene Lösungsstrategien und setzt diese zunehmend selbstständig um.`,
    'reflexion': `${pupil.first} überprüft Arbeitsergebnisse sorgfältig und verbessert sie eigenständig.`,
    'kommunikation': `${pupil.first} stellt Ergebnisse verständlich dar.`
  };
  const yellow = {
    'selbstorganisation': `${pupil.first} organisiert die eigene Arbeit zunehmend selbstständiger.`,
    'zusammenarbeit': `${pupil.first} arbeitet in vielen Situationen kooperativ im Team.`,
    'problemlösen': `${pupil.first} findet mit Unterstützung passende Lösungswege.`,
    'reflexion': `${pupil.first} überprüft Arbeitsergebnisse in Ansätzen und nimmt Hinweise zur Verbesserung auf.`,
    'kommunikation': `${pupil.first} kann Ergebnisse in Grundzügen verständlich darstellen.`
  };
  const red = {
    'selbstorganisation': `${pupil.first} benötigt bei der Planung und Organisation der eigenen Arbeit noch Unterstützung.`,
    'zusammenarbeit': `${pupil.first} benötigt in der Zusammenarbeit im Team noch klare Orientierung.`,
    'problemlösen': `${pupil.first} benötigt beim Entwickeln eigener Lösungswege noch Unterstützung.`,
    'reflexion': `${pupil.first} benötigt beim Überprüfen und Verbessern eigener Arbeitsergebnisse noch Unterstützung.`,
    'kommunikation': `${pupil.first} benötigt beim verständlichen Darstellen von Ergebnissen noch Unterstützung.`
  };

  if(status === 'green') return green[area] || `${pupil.first} setzt die Prozesskompetenz ${comp.area} zuverlässig um.`;
  if(status === 'yellow') return yellow[area] || `${pupil.first} zeigt im Bereich ${comp.area} zunehmend sichere Ansätze.`;
  if(status === 'red') return red[area] || `${pupil.first} benötigt im Bereich ${comp.area} noch Unterstützung.`;
  return '';
}

function generateLebText(pupil){
  const rows = Object.entries(Store.records)
    .filter(([key])=>key.endsWith('|'+pupil.id))
    .map(([key,record])=>{
      const compId = key.split('|')[0];
      const comp = Store.competencies.find(c=>c.id===compId);
      return comp && comp.includeInLeb ? {comp,record} : null;
    })
    .filter(Boolean);

  if(!rows.length){
    return `${pupil.first} hat im Werkstattunterricht noch keine dokumentierten Kompetenzbewertungen erhalten.`;
  }

  const prozess = rows.filter(r=>r.comp.kind === 'prozess');
  const fach = rows.filter(r=>r.comp.kind === 'fach');
  const parts = [];

  const processRank = {green:0,yellow:1,red:2};
  prozess
    .slice()
    .sort((a,b)=>processRank[a.record.current]-processRank[b.record.current])
    .slice(0,3)
    .forEach(r=>{
      const s = verbalizeProcess(r.comp, r.record.current, pupil);
      if(s) parts.push(s);
    });

  const bySubject = {};
  fach.forEach(r=>{
    bySubject[r.comp.subject] = bySubject[r.comp.subject] || [];
    bySubject[r.comp.subject].push(r);
  });

  Object.entries(bySubject).forEach(([subject,items])=>{
    const sorted = items.slice().sort((a,b)=> {
      const rank = {green:0,yellow:1,red:2};
      return rank[a.record.current]-rank[b.record.current];
    }).slice(0,3);

    if(sorted.length === 1){
      parts.push(`Im Fach ${subject}: ${verbalizeCompetence(sorted[0].comp, sorted[0].record.current, pupil)}`);
    } else {
      parts.push(`Im Fach ${subject} zeigt sich folgender Lernstand:`);
      sorted.forEach(r=>parts.push(verbalizeCompetence(r.comp, r.record.current, pupil)));
    }
  });

  const notes = rows
    .flatMap(r=>(r.record.notes||[]).map(n=>n.note))
    .filter(Boolean)
    .slice(-2);

  if(notes.length){
    parts.push(`Ergänzende Beobachtung: ${notes.join(' ')}`);
  }

  return parts.join('\n\n');
}

function copyGeneratedLeb(){
  const pupil = Store.pupils.find(p=>p.id===State.pupil);
  document.getElementById('lebEditor').value = generateLebText(pupil);
}

function saveLebDraft(){
  Store.lebDrafts[State.pupil] = document.getElementById('lebEditor').value;
  Store.save();
  toast();
}
