let lebSectionsState = {};

function leb(){
  const list = Store.pupils.slice().sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));
  const selected = State.pupil || list[0]?.id;
  if(!State.pupil) State.pupil = selected;
  const pupil = Store.pupils.find(p=>p.id===State.pupil);
  const sections = buildLebSections(pupil);
  const key = pupil.id;
  if(!lebSectionsState[key]){
    lebSectionsState[key] = {};
    sections.forEach(s=>lebSectionsState[key][s.id] = {include:true, text:s.text});
  }
  let content = header('Lernentwicklungsberichte','LEB-Assistent mit auswählbaren und bearbeitbaren Abschnitten.');
  content += `<div class="toolbar"><label>Schüler*in</label><select onchange="State.pupil=this.value;render()">${list.map(p=>`<option value="${p.id}" ${State.pupil===p.id?'selected':''}>${p.short} (${p.team}) · Coach ${p.coach}</option>`).join('')}</select></div>`;
  content += `<div class="grid2"><div class="card"><h2>${pupil.short} (${pupil.team})</h2><p>Coach ${pupil.coach} · ${pupil.className}</p><div class="section">Abschnitte</div>${sections.map(s=>renderLebSection(s,pupil)).join('')}<div class="section">Eigene Ergänzung</div><textarea id="ownLebAddition" oninput="updateLebPreview()" placeholder="Optionaler eigener Abschnitt...">${Store.lebDrafts[pupil.id+'_addition'] || ''}</textarea><button class="chip dark" onclick="saveLebAssistant()">LEB speichern</button><button class="chip" onclick="copyLebPreview()">Text kopieren</button></div><div class="card"><h2>Vorschau</h2><div id="lebPreview" class="lebText">${composeLebPreview(pupil, sections)}</div></div></div>`;
  shell(content);
}

function renderLebSection(section,pupil){
  const state = lebSectionsState[pupil.id]?.[section.id] || {include:true,text:section.text};
  return `<div class="card" style="box-shadow:none;margin-bottom:12px"><label><input type="checkbox" ${state.include?'checked':''} onchange="setLebSectionInclude('${pupil.id}','${section.id}',this.checked)"> ${section.title}</label><textarea id="leb_${section.id}" oninput="setLebSectionText('${pupil.id}','${section.id}',this.value)" style="min-height:120px">${state.text}</textarea></div>`;
}
function setLebSectionInclude(pupilId,sectionId,value){ lebSectionsState[pupilId][sectionId].include=value; updateLebPreview(); }
function setLebSectionText(pupilId,sectionId,value){ lebSectionsState[pupilId][sectionId].text=value; updateLebPreview(); }
function updateLebPreview(){ const pupil=Store.pupils.find(p=>p.id===State.pupil); const sections=buildLebSections(pupil); const preview=document.getElementById('lebPreview'); if(preview) preview.textContent=composeLebPreview(pupil,sections); }
function composeLebPreview(pupil,sections){ const state=lebSectionsState[pupil.id]||{}; const parts=sections.filter(s=>state[s.id]?.include).map(s=>state[s.id]?.text||s.text).filter(Boolean); const addition=document.getElementById('ownLebAddition')?.value || Store.lebDrafts[pupil.id+'_addition'] || ''; if(addition.trim()) parts.push(addition.trim()); return parts.join('\n\n'); }
function saveLebAssistant(){ const pupil=Store.pupils.find(p=>p.id===State.pupil); const sections=buildLebSections(pupil); Store.lebDrafts[pupil.id]=composeLebPreview(pupil,sections); Store.lebDrafts[pupil.id+'_addition']=document.getElementById('ownLebAddition')?.value||''; Store.save(); toast(); }
function copyLebPreview(){ navigator.clipboard.writeText(document.getElementById('lebPreview').textContent); toast('Kopiert'); }

function buildLebSections(pupil){
  const rows=Object.entries(Store.records).filter(([key])=>key.endsWith('|'+pupil.id)).map(([key,record])=>{ const compId=key.split('|')[0]; const comp=Store.competencies.find(c=>c.id===compId); return comp&&comp.includeInLeb?{comp,record}:null; }).filter(Boolean);
  if(!rows.length) return [{id:'empty',title:'Hinweis',text:`${pupil.first} hat im Werkstattunterricht noch keine dokumentierten Kompetenzbewertungen erhalten.`}];
  const sections=[];
  const process=rows.filter(r=>r.comp.kind==='prozess');
  const fach=rows.filter(r=>r.comp.kind==='fach');
  const pText=generateProcessParagraph(pupil,process); if(pText) sections.push({id:'process',title:'Arbeits- und Lernverhalten',text:pText});
  const bySubject={}; fach.forEach(r=>{bySubject[r.comp.subject]=bySubject[r.comp.subject]||[];bySubject[r.comp.subject].push(r);});
  Object.entries(bySubject).forEach(([subject,items])=>sections.push({id:'subject_'+safeId(subject),title:subject,text:generateSubjectParagraph(pupil,subject,items)}));
  const notes=rows.flatMap(r=>(r.record.notes||[]).map(n=>n.note)).filter(Boolean).slice(-3); if(notes.length) sections.push({id:'notes',title:'Besondere Beobachtungen',text:`Besonders festgehalten wurde: ${notes.join(' ')}`});
  const next=generateNextSteps(pupil,rows); if(next) sections.push({id:'next',title:'Nächste Entwicklungsschritte',text:next});
  return sections;
}
function safeId(s){return s.toLowerCase().replaceAll(' ','_').replaceAll('&','und').replace(/[^a-z0-9_]/g,'');}
function generateProcessParagraph(pupil,rows){
  if(!rows.length) return '';
  const green=rows.filter(r=>r.record.current==='green'), yellow=rows.filter(r=>r.record.current==='yellow'), red=rows.filter(r=>r.record.current==='red');
  const parts=[];
  if(green.length) parts.push(`${pupil.first} zeigt im Bereich ${green.slice(0,2).map(r=>r.comp.area.toLowerCase()).join(' und ')} ein sicheres Arbeitsverhalten.`);
  if(yellow.length) parts.push(`In ${yellow.slice(0,2).map(r=>r.comp.area.toLowerCase()).join(' und ')} entwickelt ${pupil.first} zunehmend Sicherheit.`);
  if(red.length) parts.push(`Im Bereich ${red.slice(0,1).map(r=>r.comp.area.toLowerCase()).join(' und ')} benötigt ${pupil.first} noch Unterstützung.`);
  return parts.join(' ');
}
function generateSubjectParagraph(pupil,subject,items){
  const levels=items.map(r=>r.record.level).filter(Boolean); const dominant=mostCommon(levels)||'dem gewählten';
  const green=items.filter(r=>r.record.current==='green'), yellow=items.filter(r=>r.record.current==='yellow'), red=items.filter(r=>r.record.current==='red');
  let text=`Im Fach ${subject} arbeitet ${pupil.first} überwiegend auf ${dominant}-Niveau. `;
  if(green.length){ text += `${pupil.first} kann zentrale Anforderungen sicher bearbeiten`; if(green.length>1) text += ` und mehrere Kompetenzen selbstständig anwenden`; text += `. `; }
  if(yellow.length) text += `In einzelnen Bereichen zeigt ${pupil.first} bereits sichere Ansätze und entwickelt zunehmend Sicherheit. `;
  if(red.length) text += `Bei einzelnen Anforderungen benötigt ${pupil.first} noch Unterstützung. `;
  if(hasProgress(items)) text += `Im Verlauf der Werkstattarbeit ist eine positive Entwicklung erkennbar.`;
  return text.trim();
}
function generateNextSteps(pupil,rows){ const needs=rows.filter(r=>r.record.current==='yellow'||r.record.current==='red').slice(0,2); if(!needs.length)return''; return `${pupil.first} sollte weiter daran arbeiten, in den Bereichen ${needs.map(r=>r.comp.area.toLowerCase()).join(' und ')} sicherer zu werden.`; }
function hasProgress(items){return items.some(r=>{const h=r.record.history||[]; if(h.length<2)return false; const rank={red:0,yellow:1,green:2}; return rank[h[h.length-1].value]>rank[h[0].value];});}
function mostCommon(arr){ if(!arr.length)return null; const c={}; arr.forEach(x=>c[x]=(c[x]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]; }
