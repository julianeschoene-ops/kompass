let plannerType='Sprint',plannerStep='start',plannerRows=[],plannerOffers=[],plannerResult={},plannerTitle='',plannerCap=20;
function planner(){let c=header('Einteilungsassistent','IServ-Wahlen importieren, automatisch verteilen und anschließend von Hand anpassen.');c+=`<div class="toolbar"><button class="chip ${plannerType==='Sprint'?'dark':''}" onclick="plannerType='Sprint';plannerStep='start';render()">Sprint</button><button class="chip ${plannerType==='Club'?'dark':''}" onclick="plannerType='Club';plannerStep='start';render()">Club</button><button class="chip" onclick="renderAssignmentHistory()">Historie</button></div>`;if(plannerStep==='start')c+=plannerStart();if(plannerStep==='preview')c+=plannerPreview();if(plannerStep==='result')c+=plannerResultView();shell(c);}
function plannerStart(){return `<div class="grid2"><div class="card"><h2>${plannerType}wahl importieren</h2><p>CSV-Datei aus einem IServ-Formular auswählen. KOMPASS erkennt Namen, Accounts und die drei Prioritäten automatisch.</p><label>Bezeichnung</label><input id="planner_title" value="${esc(plannerTitle||`${plannerType} ${State.year}`)}"><label>Standard-Kapazität je Angebot</label><input id="planner_cap" type="number" min="1" value="${plannerCap}"><input type="file" accept=".csv,text/csv" onchange="readChoiceCsv(this.files[0])"></div><div class="card"><h2>So funktioniert die Verteilung</h2><p>1. Wünsche und möglichst ähnliche Gruppengrößen werden gemeinsam berücksichtigt.<br>2. Kinder mit früheren Drittwünschen erhalten mehr Vorrang.<br>3. Bereits besuchte Zugänge werden möglichst vermieden.<br>4. Jede Einteilung bleibt vor der Übernahme veränderbar.</p></div></div>`;}
function parseCsv(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean),sep=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';function row(line){let a=[],v='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){v+='"';i++;}else q=!q;}else if(ch===sep&&!q){a.push(v);v='';}else v+=ch;}a.push(v);return a;}const h=row(lines[0]).map(x=>x.trim());return lines.slice(1).map(l=>Object.fromEntries(row(l).map((v,i)=>[h[i],v.trim().replace(/^"|"$/g,'')])));}
function readChoiceCsv(file){if(!file)return;plannerTitle=document.getElementById('planner_title').value.trim();plannerCap=Number(document.getElementById('planner_cap').value||20);const r=new FileReader();r.onload=()=>{const raw=parseCsv(r.result);plannerRows=raw.map(x=>normalizeChoiceRow(x)).filter(x=>x.first&&x.last&&x.choices[0]);plannerOffers=[...new Set(plannerRows.flatMap(x=>x.choices).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de')).map(name=>({name,capacity:plannerCap}));plannerStep='preview';render();};r.readAsText(file,'utf-8');}
function normalizeChoiceRow(x){const vals=Object.entries(x),get=(patterns)=>vals.find(([k])=>patterns.some(p=>k.toLowerCase().includes(p)))?.[1]||'';const choiceCols=vals.filter(([k])=>/priorität|erstwunsch|zweitwunsch|drittwunsch|wähle hier deinen/i.test(k)).map(([,v])=>v).filter(Boolean);return{last:get(['nachname']),first:get(['vorname']),account:get(['account']),className:get(['klasse/information']),choices:choiceCols.slice(0,3),reason:get(['warum'])};}
function plannerPreview(){return `<div class="card"><h2>${esc(plannerTitle)}</h2><p>${plannerRows.length} Wahlzettel erkannt · ${plannerOffers.length} Angebote</p><div class="offerCapacityGrid">${plannerOffers.map((o,i)=>`<div><label>${esc(o.name)}</label><input type="number" min="1" value="${o.capacity}" onchange="plannerOffers[${i}].capacity=Number(this.value)"></div>`).join('')}</div><button class="chip dark" onclick="calculateAssignment()">Automatisch einteilen</button><button class="chip" onclick="plannerStep='start';render()">zurück</button></div><div class="section">Erkannte Wünsche</div><div class="list">${plannerRows.map(r=>`<div class="row"><div><b>${esc(r.first)} ${esc(r.last)}</b><div class="mini">${esc(r.className)} · ${r.choices.map((x,i)=>`${i+1}. ${esc(x)}`).join(' · ')}</div></div>${findPupilForChoice(r)?'<span class="statusPill status-green">zugeordnet</span>':'<span class="statusPill status-yellow">nicht in Datenbank</span>'}</div>`).join('')}</div>`;}
function findPupilForChoice(r){return (Store.pupils||[]).find(p=>(r.account&&p.account===r.account)||(`${p.first} ${p.last}`.toLowerCase()===`${r.first} ${r.last}`.toLowerCase()));}
function priorCount(p,offer){const hist=plannerType==='Sprint'?Store.sprintHistory[p.id]||[]:Store.clubHistory[p.id]||[];const key=offer.toLowerCase().replace(/\([^)]*\)/g,'').trim();return hist.filter(h=>String(h.name||h.offer||'').toLowerCase().includes(key)||key.includes(String(h.name||h.offer||'').toLowerCase())).length;}
function plannerWishRank(r,offer){const i=r.choices.indexOf(offer);return i<0?0:i+1;}
function plannerThirdCount(p){return p?(Store.sprintHistory[p.id]||[]).filter(h=>h.priority===3).length:0;}
function calculateAssignment(){
 plannerResult=Object.fromEntries(plannerOffers.map(o=>[o.name,[]]));
 const rows=plannerRows.map(r=>({...r,pupil:findPupilForChoice(r)}));
 const minSize=Math.floor(rows.length/Math.max(1,plannerOffers.length));
 rows.sort((a,b)=>plannerThirdCount(b.pupil)-plannerThirdCount(a.pupil)||String(a.last+a.first).localeCompare(String(b.last+b.first),'de'));
 for(const r of rows){
  const choices=plannerOffers.filter(o=>plannerResult[o.name].length<o.capacity).map(o=>{
   const count=plannerResult[o.name].length,rank=plannerWishRank(r,o.name);
   const visited=r.pupil?priorCount(r.pupil,o.name):0;
   const score=(rank?rank-1:4)*12+(count>=minSize?22:0)+visited*18+count/Math.max(1,o.capacity)*5;
   return {name:o.name,score,count};
  }).sort((a,b)=>a.score-b.score||a.count-b.count||a.name.localeCompare(b.name,'de'));
  const offer=choices[0]?.name||'Nicht zugeteilt';
  (plannerResult[offer]||(plannerResult[offer]=[])).push(r);
 }
 plannerStep='result';render();
}
function plannerExportCsv(a){
 const groups=a?a.groups:plannerResult,details=a?.details||{};
 const lines=[['Zugang','Nachname','Vorname','Klasse','Team','Wunsch','Bisherige Besuche']];
 for(const [offer,rows] of Object.entries(groups))for(const item of rows){
  const p=a?(Store.pupils||[]).find(x=>x.id===item):item.pupil;
  const d=a?details[item]||{}:item;
  const historical=a&&p?(a.type==='Sprint'?Store.sprintHistory[p.id]||[]:Store.clubHistory[p.id]||[]).find(h=>h.assignmentId===a.id):null;
  const rank=a?(d.priority??historical?.priority??0):plannerWishRank(d,offer);
  lines.push([offer,p?.last||d.last||'',p?.first||d.first||'',p?.className||d.className||'',p?.team||'',rank?'Wunsch '+rank:'Kein Wunsch',p?priorCount(p,offer):0]);
 }
 const csv='\uFEFF'+lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='KOMPASS_Einteilung_'+State.year+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function plannerResultView(){return `<div class="toolbar"><button class="chip dark" onclick="acceptAssignment()">Einteilung übernehmen</button><button class="chip" onclick="plannerStep='preview';render()">Kapazitäten ändern</button><button class="chip" onclick="plannerExportCsv()">⬇ Listen exportieren (CSV)</button><span class="badge">${Object.values(plannerResult).flat().length} Kinder</span></div><div class="assignmentBoard">${Object.entries(plannerResult).map(([offer,rows])=>`<div class="assignmentColumn"><h2>${esc(offer)}</h2><div class="mini">${rows.length} / ${plannerOffers.find(o=>o.name===offer)?.capacity||'–'}</div>${rows.map((r,i)=>`<div class="assignmentCard"><b>${esc(r.first)} ${esc(r.last)}</b><div class="mini">${plannerWishRank(r,offer)?`Wunsch ${plannerWishRank(r,offer)}`:"Kein Wunsch"}</div><select onchange="moveAssigned('${esc(offer)}',${i},this.value)">${Object.keys(plannerResult).map(x=>`<option ${x===offer?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`).join('')}</div>`).join('')}</div>`;}
function moveAssigned(from,index,to){if(from===to)return;const [r]=plannerResult[from].splice(index,1);plannerResult[to].push(r);render();}
function acceptAssignment(){const id=uid('assignment'),createdAt=new Date().toISOString(),groups={},details={};for(const [offer,rows] of Object.entries(plannerResult)){groups[offer]=rows.map(r=>r.pupil?.id||null).filter(Boolean);for(const r of rows){const p=r.pupil;if(!p)continue;details[p.id]={priority:plannerWishRank(r,offer),choices:r.choices.slice(),offer};const item={assignmentId:id,name:offer,title:plannerTitle,date:createdAt,year:State.year,priority:plannerWishRank(r,offer)};const target=plannerType==='Sprint'?Store.sprintHistory:Store.clubHistory;target[p.id]=target[p.id]||[];target[p.id].push(item);if(plannerType==='Club'){let a=Store.activities.find(x=>x.type==='Club'&&x.name===offer&&x.year===State.year);if(!a){a={id:uid('activity'),type:'Club',year:State.year,name:offer,lebEnabled:true};Store.activities.push(a);}Store.activityRecords[a.id+'|'+p.id]={activityId:a.id,pupilId:p.id,active:true,count:0,note:'',licenses:[]};}}}Store.assignments.push({id,type:plannerType,title:plannerTitle,year:State.year,createdAt,groups,details});Store.save();toast('Einteilung gespeichert – über Historie bei Bedarf in die Werkstatt-Bewertung übernehmen');plannerStep='start';plannerRows=[];plannerResult={};render();}
function plannerApplyToWorkshop(id,number){
 const a=Store.assignments.find(x=>x.id===id);if(!a||a.type!=='Sprint')return;
 if(!confirm('Diese Einteilung als Zugang für Sprint '+number+' in die Werkstatt-Bewertung übernehmen? Vorhandene Zugangszuordnungen dieses Sprints werden für die enthaltenen Kinder aktualisiert.'))return;
 let count=0;
 for(const [offer,ids] of Object.entries(a.groups||{}))for(const pupilId of ids){
  if(!(Store.pupils||[]).some(p=>p.id===pupilId))continue;
  Store.workshopPaths[pupilId+'|'+a.year+'|'+number]={lab:offer,assignmentId:a.id};count++;
 }
 Store.save('Sprint-Zugänge für Bewertung übernommen');toast(count+' Zugänge für Sprint '+number+' übernommen');renderAssignmentHistory();
}
function plannerWorkshopSelector(a){
 if(a.type!=='Sprint')return '';
 return '<select aria-label="Sprint für Bewertung" onchange="this.nextElementSibling.dataset.sprint=this.value">'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(n===State.sprint?'selected':'')+'>Sprint '+n+'</option>').join('')+'</select><button class="chip" data-sprint="'+State.sprint+'" onclick="plannerApplyToWorkshop(\''+a.id+'\',Number(this.dataset.sprint))">In Bewertung übernehmen</button>';
}
function renderAssignmentHistory(){const rows=Store.assignments.slice().reverse();shell(header('Einteilungshistorie')+`<button class="chip" onclick="State.view='planner';plannerStep='start';render()">← zurück</button><div class="list">${rows.map(a=>`<div class="row"><div><b>${esc(a.title)}</b><div class="mini">${esc(a.type)} · Jahrgang ${a.year} · ${new Date(a.createdAt).toLocaleDateString('de-DE')}</div></div><span class="badge">${Object.values(a.groups).flat().length} Kinder</span><button class="chip" onclick="plannerExportCsv(Store.assignments.find(x=>x.id===this.dataset.assignment))" data-assignment="${a.id}">⬇ CSV</button>${plannerWorkshopSelector(a)}</div>`).join('')||'<div class="card empty">Noch keine Einteilungen übernommen.</div>'}</div>`);}
