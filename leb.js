let lebMode='fach';
let lebSubject='Englisch';
let lebSelectedPupil=null;
function leb(){ const subjects=[...CORE_SUBJECTS,...Store.subjects]; if(!subjects.includes(lebSubject))lebSubject=subjects[0]; let content=header('Lernentwicklungsberichte','Fachtexte erzeugen, bearbeiten, speichern und kopieren.'); content+=`<div class="toolbar"><button class="chip ${lebMode==='fach'?'dark':''}" onclick="lebMode='fach';render()">Fachansicht</button><button class="chip ${lebMode==='schueler'?'dark':''}" onclick="lebMode='schueler';render()">Schüleransicht</button></div>`; content+=lebMode==='fach'?renderLebSubjectView(subjects):renderLebStudentView(); shell(content); }
function renderLebSubjectView(subjects){ const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); if(!lebSelectedPupil&&pupils[0])lebSelectedPupil=pupils[0].id; const selected=pupils.find(p=>p.id===lebSelectedPupil)||pupils[0]; return `<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);lebSelectedPupil=null;render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Fach</label><select onchange="lebSubject=this.value;lebSelectedPupil=null;render()">${subjects.map(s=>`<option ${lebSubject===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div></div><div class="grid2"><div class="card"><h2>${esc(lebSubject)}</h2><p>${subjectDoneCount(pupils,lebSubject)} von ${pupils.length} Texten gespeichert.</p><div class="studentCards compact">${pupils.map(p=>`<div class="studentCard ${selected&&selected.id===p.id?'selectedCard':''}"><div><b>${esc(p.short)}</b><div class="mini">${p.className} · ${lebSubjectStatus(p,lebSubject)}</div></div><button class="chip" onclick="lebSelectedPupil='${p.id}';render()">Öffnen</button></div>`).join('')}</div></div><div class="card">${selected?renderSubjectEditor(selected,lebSubject,pupils):'Keine Schüler*innen vorhanden.'}</div></div>`; }
function renderSubjectEditor(pupil,subject,pupils){ const key=lebSubjectKey(pupil.id,subject); const generated=generateSubjectOnlyText(pupil,subject); const saved=Object.prototype.hasOwnProperty.call(Store.lebDrafts,key)?Store.lebDrafts[key]:generated; const idx=pupils.findIndex(p=>p.id===pupil.id); return `<h2>${esc(pupil.short)} · ${esc(subject)}</h2><textarea id="subjectLebText" class="bigText">${esc(saved)}</textarea><button class="chip dark" onclick="saveSubjectLeb('${pupil.id}','${esc(subject)}')">Speichern</button><button class="chip dark" onclick="saveSubjectLebAndNext('${pupil.id}','${esc(subject)}')">Speichern & weiter</button><button class="chip" onclick="document.getElementById('subjectLebText').value=generateSubjectOnlyText((Store.pupils||[]).find(p=>p.id==='${pupil.id}'),'${esc(subject)}')">neu erzeugen</button><button class="chip" onclick="copySubjectLeb()">kopieren</button><div class="section">Navigation</div><button class="chip" ${idx<=0?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.max(0,idx-1)]?.id}';render()">← vorherig</button><button class="chip" ${idx>=pupils.length-1?'disabled':''} onclick="lebSelectedPupil='${pupils[Math.min(pupils.length-1,idx+1)]?.id}';render()">weiter →</button>`; }
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
function lebSubjectStatus(pupil,subject){ if(Store.lebDrafts[lebSubjectKey(pupil.id,subject)])return'<span class="statusPill status-green">fertig</span>'; const rows=getRowsForPupil(pupil).filter(r=>r.comp.subject===subject&&['green','yellow','red'].includes(r.record.current)),creative=creativeLebRows(pupil,subject); const pending=rows.filter(r=>typeof sharedAssessmentState==='function'&&sharedAssessmentState(r.record).conflict&&!sharedAssessmentAgreementValid(r.record)); const approved=rows.filter(r=>!pending.includes(r)); return rows.length||creative.length?'<span class="statusPill status-yellow">Entwurf</span>':'<span class="statusPill status-empty">fehlt</span>'; }
function saveSubjectLeb(pupilId,subject){Store.lebDrafts[lebSubjectKey(pupilId,subject)]=document.getElementById('subjectLebText').value;Store.save();toast();render();}
function saveSubjectLebAndNext(pupilId,subject){Store.lebDrafts[lebSubjectKey(pupilId,subject)]=document.getElementById('subjectLebText').value;Store.save(); const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); const idx=pupils.findIndex(p=>p.id===pupilId); if(idx<pupils.length-1)lebSelectedPupil=pupils[idx+1].id; toast(); render();}
function copySubjectLeb(){navigator.clipboard.writeText(document.getElementById('subjectLebText').value);toast('Kopiert');}
function renderLebStudentView(){ const pupils=(Store.pupils||[]).filter(p=>String(p.className).startsWith(String(State.year))).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de')); if(!State.pupil&&pupils[0])State.pupil=pupils[0].id; const pupil=(Store.pupils||[]).find(p=>p.id===State.pupil)||pupils[0]; if(!pupil)return'<div class="card">Keine Schüler*innen vorhanden.</div>'; const text=generateFullLebText(pupil); return `<div class="toolbar"><label>Schüler*in</label><select onchange="State.pupil=this.value;render()">${pupils.map(p=>`<option value="${p.id}" ${pupil.id===p.id?'selected':''}>${esc(p.short)} · ${esc(p.team)}</option>`).join('')}</select></div><div class="card"><h2>${esc(pupil.short)}</h2><textarea id="fullLebText" class="bigText">${esc(Object.prototype.hasOwnProperty.call(Store.lebDrafts,pupil.id)?Store.lebDrafts[pupil.id]:text)}</textarea><button class="chip dark" onclick="Store.lebDrafts['${pupil.id}']=document.getElementById('fullLebText').value;Store.save();toast();">Speichern</button><button class="chip" onclick="document.getElementById('fullLebText').value=generateFullLebText((Store.pupils||[]).find(p=>p.id==='${pupil.id}'))">neu erzeugen</button><button class="chip" onclick="navigator.clipboard.writeText(document.getElementById('fullLebText').value);toast('Kopiert')">kopieren</button></div>`; }
function getRowsForPupil(pupil){return Object.entries(Store.records).filter(([key,record])=>key.endsWith('|'+pupil.id)&&record&&['green','yellow','red'].includes(record.current)).map(([key,record])=>{const comp=Store.competencies.find(c=>c.id===key.split('|')[0]);return comp&&comp.includeInLeb?{comp,record}:null;}).filter(Boolean);}
function generateSubjectOnlyText(pupil,subject){
 const rows=getRowsForPupil(pupil).filter(r=>r.comp.subject===subject),creative=creativeLebRows(pupil,subject);
 const pending=rows.filter(r=>typeof sharedAssessmentState==='function'&&sharedAssessmentState(r.record).conflict&&typeof sharedAssessmentAgreementValid==='function'&&!sharedAssessmentAgreementValid(r.record));
 const approved=rows.filter(r=>!pending.includes(r));
 if(!rows.length&&!creative.length)return `Für ${pupil.first} liegen im Fach ${subject} noch keine dokumentierten Kompetenzen vor.`;
 return [approved.length?generateSubjectParagraph(pupil,subject,approved):'',...creative.map(x=>generateCreativeLebParagraph(pupil,x.activity,x.record)),pending.length?'Für '+pending.length+' Kompetenz(en) steht die gemeinsame Bewertung noch aus.':''].filter(Boolean).join(' ');
}
function generateFullLebText(pupil){
 const rows=getRowsForPupil(pupil),by={}; rows.forEach(r=>{by[r.comp.subject]=by[r.comp.subject]||[];});
 for(const {activity,record} of pupilActivities(pupil.id)){if(!record?.creativeAssessment)continue;const subject=creativeLebSubject(activity);if(subject)by[subject]=by[subject]||[];}
 const subjectText=Object.keys(by).map(subject=>generateSubjectOnlyText(pupil,subject)).filter(Boolean).join('\n\n');
 const behaviourText=generateBehaviourParagraph(pupil),activityText=generateActivityParagraph(pupil);
 const text=[subjectText,behaviourText,activityText].filter(Boolean).join('\n\n');
 return text||`${pupil.first} hat bisher noch keine dokumentierten Kompetenzbewertungen erhalten.`;
}
function lebStableVariant(key,variants){
 let hash=0;for(const char of String(key||''))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 return variants[hash%variants.length];
}

/* LEB text generator v2: evidence-led prose, no inferred personality or progress. */
function lebStableVariant(key,variants){
 if(!variants.length)return '';
 let hash=0;for(const char of String(key||''))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 return variants[hash%variants.length];
}
function cleanCompetencyText(value){
 return String(value||'').trim().replace(/^(?:Ich kann|I can)\s+/i,'').replace(/[.!;,\s]+$/,'').trim();
}
function lebStatement(value){
 const s=cleanCompetencyText(value);
 if(!s)return '';
 return s.charAt(0).toLowerCase()+s.slice(1);
}
function lebSentence(s){s=String(s||'').trim();return s?s.replace(/[.!?]+$/,'')+'.':'';}
function lebEvidence(items,max=3){
 const seen=new Set(),out=[];
 for(const item of items){
  const raw=typeof item==='string'?item:item?.comp?.text;
  const statement=lebStatement(raw),key=statement.toLocaleLowerCase('de');
  if(!statement||seen.has(key))continue;
  seen.add(key);out.push(statement);if(out.length>=max)break;
 }
 return out;
}
function lebJoin(values){
 if(values.length===1)return values[0];
 if(values.length===2)return values.join(' und ');
 return values.slice(0,-1).join(', ')+' und '+values[values.length-1];
}
function lebTopic(raw,subject){
 const t=String(raw||'').toLocaleLowerCase('de').replace(/\\s+/g,' ');
 if(/\\bto be\\b|verb|grammatik|zeitform|simple (present|past)|satzbau/.test(t))return {area:'Grammatik',skill:/to be/.test(t)?'das Verb „to be“ korrekt anzuwenden':'grammatische Strukturen richtig anzuwenden'};
 if(/höflich|bitten|aufforderung/.test(t))return {area:'Kommunikation',skill:'höfliche Bitten und Aufforderungen auf Englisch zu formulieren'};
 if(/text.*information|information.*text|leseversteh|lesen|reading/.test(t))return {area:'Leseverstehen',skill:'Informationen aus Texten zu entnehmen'};
 if(/wörter|wortschatz|vokabel/.test(t)){
  const school=/schule|school/.test(t);
  return {area:'Wortschatz',skill:school?'den englischen Wortschatz rund um die Schule anzuwenden':'den erarbeiteten Wortschatz anzuwenden'};
 }
 if(/hörversteh|zuhör|listening/.test(t))return {area:'Hörverstehen',skill:'gesprochenen englischen Äußerungen Informationen zu entnehmen'};
 if(/schreib|writing|texte verfassen/.test(t))return {area:'Schreiben',skill:'eigene englische Texte zu verfassen'};
 if(/sprech|dialog|gespräch|speaking/.test(t))return {area:'Sprechen',skill:'sich mündlich auf Englisch auszudrücken'};
 // Unknown competency wording must not be forced into a potentially false skill claim.
 return {area:'Weitere Kompetenzen',skill:'die Kompetenz „'+cleanCompetencyText(raw).replace(/\\([^)]*seite[^)]*\\)/gi,'').trim()+'“ umzusetzen'};
}
function lebEvidenceTopics(items){
 const seen=new Set(),out=[];
 for(const item of items){
  const raw=typeof item==='string'?item:item?.comp?.text;
  if(!raw)continue;
  const topic=lebTopic(raw);
  const key=topic.skill.toLocaleLowerCase('de');
  if(!seen.has(key)){seen.add(key);out.push(topic);}
 }
 return out;
}
function lebSkillList(topics){return lebJoin(topics.map(t=>t.skill));}
function generateSubjectParagraph(pupil,subject,items){
 if(!items.length)return '';
 const groups={green:[],yellow:[],red:[]};
 for(const item of items)if(groups[item.record.current])groups[item.record.current].push(item);
 const good=lebEvidenceTopics(groups.green),partial=lebEvidenceTopics(groups.yellow),needs=lebEvidenceTopics(groups.red);
 const first=pupil.first, sentences=[];
 if(good.length)sentences.push(lebSentence(first+' kann bereits '+lebSkillList(good.slice(0,2))));
 if(partial.length)sentences.push(lebSentence(lebStableVariant(pupil.id+'|'+subject+'|partial',[
  first+' verfügt über erste Grundlagen, um '+lebSkillList(partial.slice(0,2))+', muss diese aber noch festigen',
  'Beim Versuch, '+lebSkillList(partial.slice(0,2))+', zeigt '+first+' erste Ansätze, benötigt jedoch noch Übung'
 ])));
 if(needs.length)sentences.push(lebSentence('Beim Lernen, '+lebSkillList(needs.slice(0,2))+', benötigt '+first+' noch Unterstützung'));
 if(good.length>2)sentences.push(lebSentence('Darüber hinaus gelingt es '+first+' bereits, '+lebSkillList(good.slice(2,4))));
 if(partial.length>2)sentences.push(lebSentence('Weiter zu festigen sind '+lebJoin(partial.slice(2,4).map(t=>t.area.toLowerCase()))));
 if(needs.length>2)sentences.push(lebSentence('Ein weiterer Lernschritt ist, '+lebSkillList(needs.slice(2,4))));
 return sentences.filter(Boolean).slice(0,6).join(' ');
}
function lebCompetencySentence(pupil,status,statements,subject,key){
 const topics=lebEvidenceTopics(statements);
 if(!topics.length)return '';
 if(status==='green')return lebSentence(pupil.first+' kann bereits '+lebSkillList(topics));
 if(status==='yellow')return lebSentence(pupil.first+' zeigt erste Grundlagen, um '+lebSkillList(topics)+', und sollte diese weiter festigen');
 return lebSentence('Beim Lernen, '+lebSkillList(topics)+', benötigt '+pupil.first+' noch Unterstützung');
}
function generateCreativeLebParagraph(pupil,activity,record){
 const a=record.creativeAssessment||{},groups={green:[],yellow:[],red:[]};
 const defs=typeof creativeCompetenciesFor==='function'?creativeCompetenciesFor(activity):[];
 const labels=new Map(defs);
 for(const [id,value] of Object.entries(a.competencies||{})){
  if(!groups[value])continue;
  const label=labels.get(id);
  if(label)groups[value].push(label); // Never expose an internal competency ID as prose.
 }
 const sentences=[lebSentence(pupil.first+' wurde im Kreativband „'+activity.name+'“ beurteilt')];
 for(const status of ['green','yellow','red']){
  const statements=lebEvidence(groups[status],4);
  if(statements.length)sentences.push(lebCompetencySentence(pupil,status,statements,activity.name,pupil.id+'|'+activity.id+'|'+status));
 }
 if(a.level&&['G','M','E'].includes(String(a.level).toUpperCase()))sentences.push('Die Bewertung erfolgte auf '+String(a.level).toUpperCase()+'-Niveau.');
 if(!Object.values(groups).some(x=>x.length)&&['green','yellow','red'].includes(a.color)){
  const labels={green:'erreicht',yellow:'teilweise erreicht',red:'noch nicht erreicht'};
  sentences.push('Die Gesamtbewertung lautet „'+labels[a.color]+'“.');
 }
 if(a.note)sentences.push(lebSentence(a.note));
 return sentences.filter(Boolean).slice(0,6).join(' ');
}
function generateBehaviourParagraph(pupil){const b=Store.behaviour[pupil.id];if(!b)return'';let text='';const obs=b.observations||[];if(obs.length)text+=`${pupil.first} ${obs.slice(0,3).join(', ')}. `;if(Number(b.teamStars)>=3)text+='Drei vollständig erreichte TeamStar-Karten unterstreichen das sehr positive Arbeits- und Sozialverhalten. ';else if(Number(b.teamStars)>=1)text+=`Die ${b.teamStars===1?'erreichte TeamStar-Karte':b.teamStars+' erreichten TeamStar-Karten'} zeigen eine positive Entwicklung. `;if(b.note)text+=b.note.trim();return text.trim();}
function generateActivityParagraph(pupil){ const rows=pupilActivities(pupil.id).filter(x=>x.activity.lebEnabled!==false&&x.activity.type!=='Kreativband'); if(!rows.length)return''; const parts=rows.map(({activity,record})=>{let s=activity.name; if(record.engagement)s+=` (${record.engagement})`; if(record.count)s+=` mit ${record.count} Teilnahmen`; if(record.licenses?.length)s+=` und erwarb ${record.licenses.join(' sowie ')}`; return s;}); return `${pupil.first} nahm darüber hinaus an ${parts.join(' und ')} teil.`; }
