let lebSectionsState = {};
let lebMode = 'fach';
let lebSubject = 'Geographie';
let lebSelectedPupil = null;

function leb(){
  if(!Store.subjects.includes(lebSubject)) lebSubject = Store.subjects[0] || 'Geographie';
  let content = header('Lernentwicklungsberichte','Fachweise LEB-Texte erzeugen und anschließend bei Bedarf pro Schüler bearbeiten.');
  content += `<div class="toolbar">
    <button class="chip ${lebMode==='fach'?'active':''}" onclick="lebMode='fach';render()">Fachansicht</button>
    <button class="chip ${lebMode==='schueler'?'active':''}" onclick="lebMode='schueler';render()">Schüleransicht</button>
  </div>`;
  content += lebMode === 'fach' ? renderLebSubjectView() : renderLebStudentView();
  shell(content);
}

function renderLebSubjectView(){
  const pupils = Store.pupils.filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de'));
  if(!lebSelectedPupil && pupils.length) lebSelectedPupil = pupils[0].id;
  const selected = pupils.find(p=>p.id===lebSelectedPupil) || pupils[0];
  return `<div class="toolbar formgrid">
    <div><label>Jahrgang</label><select onchange="State.year=Number(this.value);lebSelectedPupil=null;render()">${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div>
    <div><label>Fach</label><select onchange="lebSubject=this.value;lebSelectedPupil=null;render()">${Store.subjects.map(s=>`<option ${lebSubject===s?'selected':''}>${s}</option>`).join('')}</select></div>
  </div>
  <div class="grid2">
    <div class="card">
      <h2>${lebSubject}</h2>
      <p>${subjectDoneCount(pupils, lebSubject)} von ${pupils.length} Texten gespeichert.</p>
      <table class="studentTable"><thead><tr><th>Status</th><th>Schüler*in</th><th>Klasse</th><th></th></tr></thead><tbody>
      ${pupils.map(p=>`<tr><td>${lebSubjectStatus(p,lebSubject)}</td><td><span class="dot ${p.color}"></span>${p.short}</td><td>${p.className}</td><td><button class="chip ${selected&&selected.id===p.id?'dark':''}" onclick="lebSelectedPupil='${p.id}';render()">Öffnen</button></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card">${selected ? renderSubjectEditor(selected,lebSubject,pupils) : '<p>Keine Schüler*innen vorhanden.</p>'}</div>
  </div>`;
}

function renderSubjectEditor(pupil, subject, pupils){
  const generated = generateSubjectOnlyText(pupil, subject);
  const key = lebSubjectKey(pupil.id, subject);
  const saved = Store.lebDrafts[key] || generated;
  const idx = pupils.findIndex(p=>p.id===pupil.id);
  return `<h2>${pupil.short} · ${subject}</h2>
    <p>Coach ${pupil.coach} · ${pupil.className}</p>
    <textarea id="subjectLebText" style="min-height:300px">${saved}</textarea>
    <button class="chip dark" onclick="saveSubjectLeb('${pupil.id}','${subject}')">Speichern</button>
    <button class="chip dark" onclick="saveSubjectLebAndNext('${pupil.id}','${subject}')">Speichern & weiter</button>
    <button class="chip" onclick="document.getElementById('subjectLebText').value = generateSubjectOnlyText(Store.pupils.find(p=>p.id==='${pupil.id}'),'${subject}')">neu erzeugen</button>
    <button class="chip" onclick="copySubjectLeb()">kopieren</button>
    <div class="section">Navigation</div>
    <button class="chip" ${idx<=0?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.max(0,idx-1)]?.id}';render()">← vorheriger Schüler</button>
    <button class="chip" ${idx>=pupils.length-1?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.min(pupils.length-1,idx+1)]?.id}';render()">nächster Schüler →</button>`;
}

function subjectDoneCount(pupils, subject){ return pupils.filter(p=>Store.lebDrafts[lebSubjectKey(p.id, subject)]).length; }
function lebSubjectKey(pupilId, subject){ return 'subjectLeb_'+pupilId+'_'+subject; }
function lebSubjectStatus(pupil, subject){
  if(Store.lebDrafts[lebSubjectKey(pupil.id, subject)]) return '<span class="statusPill status-green">fertig</span>';
  const rows = getRowsForPupil(pupil).filter(r=>r.comp.subject===subject);
  if(rows.length) return '<span class="statusPill status-yellow">Entwurf</span>';
  return '<span class="statusPill status-red">fehlt</span>';
}
function saveSubjectLeb(pupilId, subject){ Store.lebDrafts[lebSubjectKey(pupilId, subject)] = document.getElementById('subjectLebText').value; Store.save(); toast(); render(); }
function saveSubjectLebAndNext(pupilId, subject){
  Store.lebDrafts[lebSubjectKey(pupilId, subject)] = document.getElementById('subjectLebText').value; Store.save();
  const pupils = Store.pupils.filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de'));
  const idx=pupils.findIndex(p=>p.id===pupilId); if(idx>=0 && idx<pupils.length-1) lebSelectedPupil=pupils[idx+1].id; toast(); render();
}
function copySubjectLeb(){ navigator.clipboard.writeText(document.getElementById('subjectLebText').value); toast('Kopiert'); }

function renderLebStudentView(){
  const list=Store.pupils.slice().sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de'));
  if(!State.pupil && list[0]) State.pupil=list[0].id;
  const pupil=Store.pupils.find(p=>p.id===State.pupil);
  if(!pupil) return '<div class="card"><p>Keine Schüler*innen vorhanden.</p></div>';
  const sections=buildLebSections(pupil);
  if(!lebSectionsState[pupil.id]){ lebSectionsState[pupil.id]={}; sections.forEach(s=>lebSectionsState[pupil.id][s.id]={include:true,text:s.text});}
  return `<div class="toolbar"><label>Schüler*in</label><select onchange="State.pupil=this.value;render()">${list.map(p=>`<option value="${p.id}" ${State.pupil===p.id?'selected':''}>${p.short} (${p.team}) · Coach ${p.coach}</option>`).join('')}</select></div>
  <div class="grid2"><div class="card"><h2>${pupil.short} (${pupil.team})</h2><p>Coach ${pupil.coach} · ${pupil.className}</p><div class="section">Abschnitte</div>
  ${sections.map(s=>renderLebSection(s,pupil)).join('')}<div class="section">Eigene Ergänzung</div><textarea id="ownLebAddition" oninput="updateLebPreview()" placeholder="Optionaler eigener Abschnitt...">${Store.lebDrafts[pupil.id+'_addition']||''}</textarea><button class="chip dark" onclick="saveLebAssistant()">LEB speichern</button><button class="chip" onclick="copyLebPreview()">Text kopieren</button></div><div class="card"><h2>Vorschau</h2><div id="lebPreview" class="lebText">${composeLebPreview(pupil,sections)}</div></div></div>`;
}

function getRowsForPupil(pupil){return Object.entries(Store.records).filter(([key])=>key.endsWith('|'+pupil.id)).map(([key,record])=>{const compId=key.split('|')[0]; const comp=Store.competencies.find(c=>c.id===compId); return comp&&comp.includeInLeb?{comp,record}:null;}).filter(Boolean);}
function generateSubjectOnlyText(pupil, subject){ const items=getRowsForPupil(pupil).filter(r=>r.comp.subject===subject); if(!items.length) return `Für ${pupil.first} liegen im Fach ${subject} noch keine dokumentierten Kompetenzen vor.`; return generateSubjectParagraph(pupil,subject,items);}
function renderLebSection(section,pupil){ const state=lebSectionsState[pupil.id]?.[section.id]||{include:true,text:section.text}; return `<div class="card" style="box-shadow:none;margin-bottom:12px"><label><input type="checkbox" ${state.include?'checked':''} onchange="setLebSectionInclude('${pupil.id}','${section.id}',this.checked)"> ${section.title}</label><textarea oninput="setLebSectionText('${pupil.id}','${section.id}',this.value)" style="min-height:120px">${state.text}</textarea></div>`;}
function setLebSectionInclude(pupilId,sectionId,value){lebSectionsState[pupilId][sectionId].include=value; updateLebPreview();}
function setLebSectionText(pupilId,sectionId,value){lebSectionsState[pupilId][sectionId].text=value; updateLebPreview();}
function updateLebPreview(){const pupil=Store.pupils.find(p=>p.id===State.pupil); const sections=buildLebSections(pupil); const preview=document.getElementById('lebPreview'); if(preview) preview.textContent=composeLebPreview(pupil,sections);}
function composeLebPreview(pupil,sections){const state=lebSectionsState[pupil.id]||{}; const parts=sections.filter(s=>state[s.id]?.include).map(s=>state[s.id]?.text||s.text).filter(Boolean); const addition=document.getElementById('ownLebAddition')?.value||Store.lebDrafts[pupil.id+'_addition']||''; if(addition.trim()) parts.push(addition.trim()); return parts.join('\\n\\n');}
function saveLebAssistant(){const pupil=Store.pupils.find(p=>p.id===State.pupil); const sections=buildLebSections(pupil); Store.lebDrafts[pupil.id]=composeLebPreview(pupil,sections); Store.lebDrafts[pupil.id+'_addition']=document.getElementById('ownLebAddition')?.value||''; Store.save(); toast();}
function copyLebPreview(){navigator.clipboard.writeText(document.getElementById('lebPreview').textContent); toast('Kopiert');}
function buildLebSections(pupil){const rows=getRowsForPupil(pupil); if(!rows.length) return [{id:'empty',title:'Hinweis',text:`${pupil.first} hat im Werkstattunterricht noch keine dokumentierten Kompetenzbewertungen erhalten.`}]; const sections=[]; const process=rows.filter(r=>r.comp.kind==='prozess'); const fach=rows.filter(r=>r.comp.kind==='fach'); const processText=generateProcessParagraph(pupil,process); if(processText) sections.push({id:'process',title:'Arbeits- und Lernverhalten',text:processText}); const bySubject={}; fach.forEach(r=>{bySubject[r.comp.subject]=bySubject[r.comp.subject]||[]; bySubject[r.comp.subject].push(r);}); Object.entries(bySubject).forEach(([subject,items])=>sections.push({id:'subject_'+safeId(subject),title:subject,text:generateSubjectParagraph(pupil,subject,items)})); const notes=rows.flatMap(r=>(r.record.notes||[]).map(n=>n.note)).filter(Boolean).slice(-3); if(notes.length) sections.push({id:'notes',title:'Besondere Beobachtungen',text:`Besonders festgehalten wurde: ${notes.join(' ')}`}); const next=generateNextSteps(pupil,rows); if(next) sections.push({id:'next',title:'Nächste Entwicklungsschritte',text:next}); return sections;}
function safeId(s){return s.toLowerCase().replaceAll(' ','_').replaceAll('&','und').replace(/[^a-z0-9_]/g,'');}
function generateProcessParagraph(pupil,processRows){
  if(!processRows.length)return '';
  const green=processRows.filter(r=>r.record.current==='green');
  const yellow=processRows.filter(r=>r.record.current==='yellow');
  const red=processRows.filter(r=>r.record.current==='red');
  const parts=[];
  if(green.length) parts.push(`${pupil.first} arbeitet in den Bereichen ${green.slice(0,2).map(r=>r.comp.area.toLowerCase()).join(' und ')} zuverlässig.`);
  if(yellow.length) parts.push(`In ${yellow.slice(0,2).map(r=>r.comp.area.toLowerCase()).join(' und ')} ist ${pupil.first} auf einem guten Weg, benötigt aber stellenweise noch Orientierung.`);
  if(red.length) parts.push(`Im Bereich ${red.slice(0,1).map(r=>r.comp.area.toLowerCase()).join(' und ')} braucht ${pupil.first} noch klare Unterstützung und verbindliche nächste Schritte.`);
  return parts.join(' ');
}
function generateSubjectParagraph(pupil,subject,items){
  const levels=items.map(r=>r.record.level).filter(Boolean);
  const dominantLevel=mostCommon(levels)||'dem gewählten';
  const green=items.filter(r=>r.record.current==='green');
  const yellow=items.filter(r=>r.record.current==='yellow');
  const red=items.filter(r=>r.record.current==='red');
  const best=green.slice(0,2).map(r=>cleanCompetencyText(r.comp.text));
  const partial=yellow.slice(0,2).map(r=>cleanCompetencyText(r.comp.text));
  const needs=red.slice(0,1).map(r=>cleanCompetencyText(r.comp.text));
  const scoreItems=items.filter(r=>r.record.score).slice(-2);
  let text=`Im Fach ${subject} arbeitet ${pupil.first} überwiegend auf ${dominantLevel}-Niveau. `;
  if(best.length) text += `${pupil.first} zeigt sichere Leistungen bei folgenden Kompetenzen: ${best.join('; ')}. `;
  if(partial.length) text += `In folgenden Bereichen gelingen die Anforderungen bereits teilweise: ${partial.join('; ')}. `;
  if(needs.length) text += `Bei ${needs.join('; ')} benötigt ${pupil.first} noch gezielte Unterstützung. `;
  if(scoreItems.length){ text += `Die dokumentierten Punkteergebnisse (${scoreItems.map(r=>r.record.score.points+'/'+r.record.score.max+' Punkte').join(', ')}) stützen diese Einschätzung. `; }
  if(hasProgress(items)) text += `Im Verlauf der Arbeit ist eine Entwicklung zu mehr Sicherheit erkennbar.`;
  return text.trim();
}
function cleanCompetencyText(text){return String(text||'').replace(/^Ich kann\s+/i,'').replace(/^I can\s+/i,'').replace(/\.$/,'');}
function generateNextSteps(pupil,rows){const needs=rows.filter(r=>r.record.current==='yellow'||r.record.current==='red').slice(0,2); if(!needs.length)return ''; return `Als nächster Schritt sollte ${pupil.first} gezielt an ${needs.map(r=>r.comp.area.toLowerCase()).join(' und ')} weiterarbeiten und die jeweiligen Anforderungen mit weniger Unterstützung umsetzen.`;}
function hasProgress(items){return items.some(r=>{const h=r.record.history||[]; if(h.length<2)return false; const rank={red:0,yellow:1,green:2}; return rank[h[h.length-1].value]>rank[h[0].value];});}
function mostCommon(arr){if(!arr.length)return null; const counts={}; arr.forEach(x=>counts[x]=(counts[x]||0)+1); return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];}
