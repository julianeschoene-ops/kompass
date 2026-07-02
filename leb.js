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

function phrase(kind,status,index=0){
  const bank = SEED.phraseBank[kind] || SEED.phraseBank.fach;
  const arr = bank[status] || bank.yellow;
  return arr[index % arr.length];
}

function cleanCompetenceText(text){
  return text
    .replace(/^Ich kann\s+/i,'')
    .replace(/\.$/,'');
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

  const fach = rows.filter(r=>r.comp.kind === 'fach');
  const prozess = rows.filter(r=>r.comp.kind === 'prozess');

  const parts = [];

  if(prozess.length){
    const positives = prozess.filter(r=>r.record.current==='green').slice(0,2);
    const partial = prozess.filter(r=>r.record.current==='yellow').slice(0,1);
    const needs = prozess.filter(r=>r.record.current==='red').slice(0,1);

    if(positives.length){
      parts.push(`${pupil.first} ${positives.map((r,i)=>`${phrase('prozess','green',i)} im Bereich ${r.comp.area.toLowerCase()}`).join(' und ')}.`);
    }
    if(partial.length){
      const r = partial[0];
      parts.push(`Im Bereich ${r.comp.area.toLowerCase()} ${phrase('prozess','yellow')}.`);
    }
    if(needs.length){
      const r = needs[0];
      parts.push(`Im Bereich ${r.comp.area.toLowerCase()} ${phrase('prozess','red')}.`);
    }
  }

  const bySubject = {};
  fach.forEach(r=>{
    bySubject[r.comp.subject] = bySubject[r.comp.subject] || [];
    bySubject[r.comp.subject].push(r);
  });

  Object.entries(bySubject).forEach(([subject,items])=>{
    const green = items.filter(r=>r.record.current==='green').slice(0,2);
    const yellow = items.filter(r=>r.record.current==='yellow').slice(0,1);
    const red = items.filter(r=>r.record.current==='red').slice(0,1);

    if(green.length){
      parts.push(`Im Fach ${subject} ${green.map((r,i)=>`${phrase('fach','green',i)} beim ${cleanCompetenceText(r.comp.text)}`).join(' und ')}.`);
    }
    if(yellow.length){
      const r = yellow[0];
      parts.push(`Beim ${cleanCompetenceText(r.comp.text)} ${phrase('fach','yellow')}.`);
    }
    if(red.length){
      const r = red[0];
      parts.push(`Beim ${cleanCompetenceText(r.comp.text)} ${phrase('fach','red')}.`);
    }
  });

  const notes = rows.flatMap(r=>(r.record.notes||[]).map(n=>n.note)).filter(Boolean).slice(-2);
  if(notes.length){
    parts.push(`Besonders festgehalten wurde: ${notes.join(' ')}`);
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
