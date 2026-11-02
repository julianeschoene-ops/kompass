let lebMode='fach';
let lebSubject='Englisch';
let lebSelectedPupil=null;
function leb(){ const subjects=[...CORE_SUBJECTS,...Store.subjects]; if(!subjects.includes(lebSubject))lebSubject=subjects[0]; let content=header('Lernentwicklungsberichte','Fachtexte erzeugen, bearbeiten, speichern und kopieren.'); content+=`<div class="toolbar"><button class="chip ${lebMode==='fach'?'dark':''}" onclick="lebMode='fach';render()">Fachansicht</button><button class="chip ${lebMode==='schueler'?'dark':''}" onclick="lebMode='schueler';render()">Schüleransicht</button></div>`; content+=lebMode==='fach'?renderLebSubjectView(subjects):renderLebStudentView(); shell(content); }
function renderLebSubjectView(subjects){ const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); if(!lebSelectedPupil&&pupils[0])lebSelectedPupil=pupils[0].id; const selected=pupils.find(p=>p.id===lebSelectedPupil)||pupils[0]; return `<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);lebSelectedPupil=null;render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Fach</label><select onchange="lebSubject=this.value;lebSelectedPupil=null;render()">${subjects.map(s=>`<option ${lebSubject===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div></div><div class="grid2"><div class="card"><h2>${esc(lebSubject)}</h2><p>${subjectDoneCount(pupils,lebSubject)} von ${pupils.length} Texten gespeichert.</p><div class="studentCards compact">${pupils.map(p=>`<div class="studentCard ${selected&&selected.id===p.id?'selectedCard':''}"><div><b>${esc(p.short)}</b><div class="mini">${p.className} · ${lebSubjectStatus(p,lebSubject)}</div></div><button class="chip" onclick="lebSelectedPupil='${p.id}';render()">Öffnen</button></div>`).join('')}</div></div><div class="card">${selected?renderSubjectEditor(selected,lebSubject,pupils):'Keine Schüler*innen vorhanden.'}</div></div>`; }
function renderSubjectEditor(pupil,subject,pupils){ const key=lebSubjectKey(pupil.id,subject); const generated=generateSubjectOnlyText(pupil,subject); const saved=Store.lebDrafts[key]||generated; const idx=pupils.findIndex(p=>p.id===pupil.id); return `<h2>${esc(pupil.short)} · ${esc(subject)}</h2><textarea id="subjectLebText" class="bigText">${esc(saved)}</textarea><button class="chip dark" onclick="saveSubjectLeb('${pupil.id}','${esc(subject)}')">Speichern</button><button class="chip dark" onclick="saveSubjectLebAndNext('${pupil.id}','${esc(subject)}')">Speichern & weiter</button><button class="chip" onclick="document.getElementById('subjectLebText').value=generateSubjectOnlyText((Store.pupils||[]).find(p=>p.id==='${pupil.id}'),'${esc(subject)}')">neu erzeugen</button><button class="chip" onclick="copySubjectLeb()">kopieren</button><div class="section">Navigation</div><button class="chip" ${idx<=0?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.max(0,idx-1)]?.id}';render()">← vorherig</button><button class="chip" ${idx>=pupils.length-1?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.min(pupils.length-1,idx+1)]?.id}';render()">weiter →</button>`; }
function subjectDoneCount(pupils,subject){return pupils.filter(p=>Store.lebDrafts[lebSubjectKey(p.id,subject)]).length;}
function lebSubjectKey(pupilId,subject){return 'subjectLeb_'+pupilId+'_'+subject;}
function creativeLebSubject(activity){
 const id=String(activity?.id||''),name=String(activity?.name||'').toLocaleLowerCase('de');
 if(id==='room_it'||/it.studio|informatik.studio/.test(name))return 'Informatik & Medienbildung';
 if(id==='room_science'||id==='room_garden'||/naturwissenschaft|nawi|schulgarten/.test(name))return 'Biologie';
 if(id==='room_cook'||id==='room_sewing'||/koch|näh|naeh/.test(name))return 'AES';
 if(id==='room_creative'||/kunst/.test(name))return 'Bildende Kunst';
 if(id==='room_music'||/musik/.test(name))return 'Musik';
 if(id==='room_tech'||/technik/.test(name))return 'Technik';
 if(/^creative_/.test(id)||/sport|heimbacher/.test(name))return 'Sport';
 return '';
}
function creativeLebRows(pupil,subject){
 return pupilActivities(pupil.id).filter(({activity,record})=>{
  if(activity.type!=='Kreativband'||activity.lebEnabled===false||creativeLebSubject(activity)!==subject)return false;
  const a=record.creativeAssessment||{};
  return !!(a.assessedBy||a.level||a.color||a.note||Object.values(a.competencies||{}).some(Boolean));
 });
}
function lebSubjectStatus(pupil,subject){ if(Store.lebDrafts[lebSubjectKey(pupil.id,subject)])return'<span class="statusPill status-green">fertig</span>'; const rows=getRowsForPupil(pupil).filter(r=>r.comp.subject===subject),creative=creativeLebRows(pupil,subject); return rows.length||creative.length?'<span class="statusPill status-yellow">Entwurf</span>':'<span class="statusPill status-empty">fehlt</span>'; }
function saveSubjectLeb(pupilId,subject){Store.lebDrafts[lebSubjectKey(pupilId,subject)]=document.getElementById('subjectLebText').value;Store.save();toast();render();}
function saveSubjectLebAndNext(pupilId,subject){Store.lebDrafts[lebSubjectKey(pupilId,subject)]=document.getElementById('subjectLebText').value;Store.save(); const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); const idx=pupils.findIndex(p=>p.id===pupilId); if(idx<pupils.length-1)lebSelectedPupil=pupils[idx+1].id; toast(); render();}
function copySubjectLeb(){navigator.clipboard.writeText(document.getElementById('subjectLebText').value);toast('Kopiert');}
function renderLebStudentView(){ const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); if(!State.pupil&&pupils[0])State.pupil=pupils[0].id; const pupil=(Store.pupils||[]).find(p=>p.id===State.pupil)||pupils[0]; if(!pupil)return'<div class="card">Keine Schüler*innen vorhanden.</div>'; const text=generateFullLebText(pupil); return `<div class="toolbar"><label>Schüler*in</label><select onchange="State.pupil=this.value;render()">${pupils.map(p=>`<option value="${p.id}" ${pupil.id===p.id?'selected':''}>${esc(p.short)} · ${esc(p.team)}</option>`).join('')}</select></div><div class="card"><h2>${esc(pupil.short)}</h2><textarea id="fullLebText" class="bigText">${esc(Store.lebDrafts[pupil.id]||text)}</textarea><button class="chip dark" onclick="Store.lebDrafts['${pupil.id}']=document.getElementById('fullLebText').value;Store.save();toast();">Speichern</button><button class="chip" onclick="document.getElementById('fullLebText').value=generateFullLebText((Store.pupils||[]).find(p=>p.id==='${pupil.id}'))">neu erzeugen</button><button class="chip" onclick="navigator.clipboard.writeText(document.getElementById('fullLebText').value);toast('Kopiert')">kopieren</button></div>`; }
function getRowsForPupil(pupil){return Object.entries(Store.records).filter(([key])=>key.endsWith('|'+pupil.id)).map(([key,record])=>{const comp=Store.competencies.find(c=>c.id===key.split('|')[0]);return comp&&comp.includeInLeb?{comp,record}:null;}).filter(Boolean);}
function generateSubjectOnlyText(pupil,subject){
 const rows=getRowsForPupil(pupil).filter(r=>r.comp.subject===subject),creative=creativeLebRows(pupil,subject);
 if(!rows.length&&!creative.length)return `Für ${pupil.first} liegen im Fach ${subject} noch keine dokumentierten Kompetenzen vor.`;
 return [rows.length?generateSubjectParagraph(pupil,subject,rows):'',...creative.map(x=>generateCreativeLebParagraph(pupil,x.activity,x.record))].filter(Boolean).join(' ');
}
function generateFullLebText(pupil){
 const rows=getRowsForPupil(pupil),by={}; rows.forEach(r=>{by[r.comp.subject]=by[r.comp.subject]||[];});
 for(const {activity,record} of pupilActivities(pupil.id)){if(!record?.creativeAssessment)continue;const subject=creativeLebSubject(activity);if(subject)by[subject]=by[subject]||[];}
 const subjectText=Object.keys(by).map(subject=>generateSubjectOnlyText(pupil,subject)).filter(Boolean).join('\n\n');
 const behaviourText=generateBehaviourParagraph(pupil),activityText=generateActivityParagraph(pupil);
 const text=[subjectText,behaviourText,activityText].filter(Boolean).join('\n\n');
 return text||`${pupil.first} hat bisher noch keine dokumentierten Kompetenzbewertungen erhalten.`;
}
function generateSubjectParagraph(pupil,subject,items){ const green=items.filter(r=>r.record.current==='green'), yellow=items.filter(r=>r.record.current==='yellow'), red=items.filter(r=>r.record.current==='red'); const level=mostCommon(items.map(r=>r.record.level).filter(Boolean))||'dem gewählten'; let text=`${pupil.first} arbeitet im Fach ${subject} überwiegend auf ${level}-Niveau. `; if(green.length)text+=`${pupil.first} zeigt Sicherheit in ${listAreas(green)}. `; if(yellow.length)text+=`In ${listAreas(yellow)} gelingen die Anforderungen bereits teilweise; hier entwickelt ${pupil.first} zunehmend mehr Sicherheit. `; if(red.length)text+=`Bei ${listAreas(red)} benötigt ${pupil.first} noch klare Unterstützung und weitere Übung. `; const scores=items.filter(r=>r.record.score).slice(-2); if(scores.length)text+=`Die dokumentierten Punkteergebnisse (${scores.map(r=>r.record.score.points+'/'+r.record.score.max+' Punkte').join(', ')}) stützen diese Einschätzung. `; return text.trim();}
function listAreas(rows){return [...new Set(rows.slice(0,3).map(r=>cleanCompetencyText(r.comp.text)))].join('; ');}
function cleanCompetencyText(text){return String(text||'').replace(/^Ich kann\s+/i,'').replace(/^I can\s+/i,'').replace(/\.$/,'');}
function mostCommon(arr){ if(!arr.length)return null; const c={}; arr.forEach(x=>c[x]=(c[x]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];}
function generateCreativeLebParagraph(pupil,activity,record){
 const a=record.creativeAssessment||{},status={green:'erfüllt die Anforderungen sicher',yellow:'erfüllt die Anforderungen teilweise',red:'benötigt bei den Anforderungen noch Unterstützung'}[a.color]||'arbeitet an den Anforderungen';
 let text=`Im Kreativband „${activity.name}“ ${status}`;
 if(a.level)text+=` auf ${a.level}-Niveau`;
 text+='.';
 const defs=typeof creativeCompetenciesFor==='function'?creativeCompetenciesFor(activity):[];
 const labels=new Map(defs),groups={green:[],yellow:[],red:[]};
 for(const [id,value] of Object.entries(a.competencies||{}))if(groups[value])groups[value].push(cleanCompetencyText(labels.get(id)||id));
 if(groups.green.length)text+=` ${pupil.first} zeigt Sicherheit in ${groups.green.join('; ')}.`;
 if(groups.yellow.length)text+=` In ${groups.yellow.join('; ')} gelingen die Anforderungen bereits teilweise.`;
 if(groups.red.length)text+=` Bei ${groups.red.join('; ')} benötigt ${pupil.first} noch weitere Übung und Unterstützung.`;
 if(a.note)text+=' '+String(a.note).trim().replace(/([^.!?])$/,'$1.');
 return text;
}

function generateBehaviourParagraph(pupil){const b=Store.behaviour[pupil.id];if(!b)return'';let text='';const obs=b.observations||[];if(obs.length)text+=`${pupil.first} ${obs.slice(0,3).join(', ')}. `;if(Number(b.teamStars)>=3)text+='Drei vollständig erreichte TeamStar-Karten unterstreichen das sehr positive Arbeits- und Sozialverhalten. ';else if(Number(b.teamStars)>=1)text+=`Die ${b.teamStars===1?'erreichte TeamStar-Karte':b.teamStars+' erreichten TeamStar-Karten'} zeigen eine positive Entwicklung. `;if(b.note)text+=b.note.trim();return text.trim();}
function generateActivityParagraph(pupil){ const rows=pupilActivities(pupil.id).filter(x=>x.activity.lebEnabled!==false&&x.activity.type!=='Kreativband'); if(!rows.length)return''; const parts=rows.map(({activity,record})=>{let s=activity.name; if(record.engagement)s+=` (${record.engagement})`; if(record.count)s+=` mit ${record.count} Teilnahmen`; if(record.licenses?.length)s+=` und erwarb ${record.licenses.join(' sowie ')}`; return s;}); return `${pupil.first} nahm darüber hinaus an ${parts.join(' und ')} teil.`; }
