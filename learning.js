function lernen(){ State.learning='Kernfächer'; renderFlow('Lernen','Kernfächer: Fach → Bereich → Kompetenz → Schüler*innen.'); }
function werkstatt(){ State.learning='Werkstatt'; renderFlow('Werkstatt','Erfassung nach Sprint 1–5.'); }
function kreativ(){ State.learning='Kreativband/Labore'; renderFlow('Kreativband','Anwesenheit, Engagement, optionale Kompetenzen.'); }
function clubs(){ State.learning='Clubs'; renderFlow('Clubs','Teilnahme, Engagement und Notizen.'); }

function currentEntries(){
  return Store.entries.filter(e => e.learning === State.learning && (State.learning !== 'Werkstatt' || e.sprint === State.sprint));
}

function renderFlow(title,hint){
  let content = header(title,hint);
  if(State.learning === 'Werkstatt'){
    content += `<div class="card">${[1,2,3,4,5].map(n=>`<button class="chip ${State.sprint===n?'active':''}" onclick="State.sprint=${n};State.subject=null;State.area=null;State.entry=null;render()">
      Sprint ${n}</button>`).join('')}</div>`;
  }

  const entries = currentEntries();

  if(!State.subject){
    const subjects = [...new Set(entries.map(e=>e.subject))];
    content += `<div class="section">Fach / Angebot wählen</div><div class="grid">` +
      subjects.map(s=>`<button class="tile" onclick="State.subject='${s}';render()"><b>${s}</b><span>${entries.filter(e=>e.subject===s).length} Einträge</span></button>`).join('') +
      `</div>`;
    shell(content); return;
  }

  const subjectEntries = entries.filter(e=>e.subject===State.subject);
  if(!State.area){
    const areas = [...new Set(subjectEntries.map(e=>e.area))];
    content += `<button class="chip" onclick="State.subject=null;render()">zurück</button><div class="section">Bereich wählen</div><div class="grid">` +
      areas.map(a=>`<button class="tile" onclick="State.area='${a}';render()"><b>${a}</b><span>${subjectEntries.filter(e=>e.area===a).length} Einträge</span></button>`).join('') +
      `</div>`;
    shell(content); return;
  }

  const areaEntries = subjectEntries.filter(e=>e.area===State.area);
  if(!State.entry){
    content += `<button class="chip" onclick="State.area=null;render()">zurück</button><div class="section">Eintrag wählen</div><div class="list">` +
      areaEntries.map(e=>`<div class="row"><div><b>${e.text}</b><div class="mini">${e.learning} · ${e.subject} · ${e.area} · Niveau ${e.level} · ${e.type}</div></div><button class="chip dark" onclick="State.entry='${e.id}';render()">Erfassen</button></div>`).join('') +
      `</div>`;
    shell(content); return;
  }

  const e = Store.entries.find(x=>x.id===State.entry);
  content += `<button class="chip" onclick="State.entry=null;render()">zurück</button><div class="card"><h2>${e.text}</h2><p>${e.learning} · ${e.subject} · ${e.area} · ${e.type}</p></div><div class="students">` +
    Store.pupils.map(p=>pupilAssessCell(e,p)).join('') + `</div>`;
  shell(content);
}

function pupilAssessCell(e,p){
  const r = Store.records[recKey(e.id,p.id)] || {};
  const isComp = e.type === 'kompetenz';
  const buttons = isComp
    ? ['green','yellow','red'].map(v=>`<button class="status ${v} ${r.current===v?'on':''}" onclick="setAssessment('${e.id}','${p.id}','${v}')">●</button>`).join('')
    : `<button class="status present ${r.current==='present'?'on':''}" onclick="setAssessment('${e.id}','${p.id}','present')">✓</button>
       <button class="status effort ${r.current==='effort'?'on':''}" onclick="setAssessment('${e.id}','${p.id}','effort')">★</button>`;
  return `<div class="card"><span class="dot ${p.color}"></span><b>${p.short}</b><p>${p.className} · ${p.level}</p>${buttons}<div class="mini">${(r.history||[]).length} Bewertungen</div></div>`;
}

function setAssessment(entryId,pupilId,value){
  const k = recKey(entryId,pupilId);
  const r = Store.records[k] || {current:null,firstGreen:null,history:[],notes:[]};
  r.current = value;
  if(value === 'green' && !r.firstGreen) r.firstGreen = today();
  r.history.push({date:today(),teacher:State.teacher,value});
  Store.records[k] = r;
  Store.save();
  toast();
  render();
}
