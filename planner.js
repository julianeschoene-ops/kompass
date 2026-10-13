let plannerType='Sprint',plannerStep='start',plannerRows=[],plannerOffers=[],plannerResult={},plannerTitle='',plannerCap=20;
function planner(){let c=header('Einteilungsassistent','IServ-Wahlen importieren, automatisch verteilen und anschließend von Hand anpassen.');c+=`<div class="toolbar"><button class="chip ${plannerType==='Sprint'?'dark':''}" onclick="plannerType='Sprint';plannerStep='start';render()">Sprint</button><button class="chip ${plannerType==='Club'?'dark':''}" onclick="plannerType='Club';plannerStep='start';render()">Club</button><button class="chip" onclick="renderAssignmentHistory()">Historie</button></div>`;if(plannerStep==='start')c+=plannerStart();if(plannerStep==='preview')c+=plannerPreview();if(plannerStep==='result')c+=plannerResultView();shell(c);}
function plannerStart(){return `<div class="grid2"><div class="card"><h2>${plannerType}wahl importieren</h2><p>CSV-Datei aus einem IServ-Formular auswählen. KOMPASS erkennt Namen, Accounts und die drei Prioritäten automatisch.</p><label>Bezeichnung</label><input id="planner_title" value="${esc(plannerTitle||`${plannerType} ${State.year}`)}"><label>Standard-Kapazität je Angebot</label><input id="planner_cap" type="number" min="1" value="${plannerCap}"><input type="file" accept=".csv,text/csv" onchange="readChoiceCsv(this.files[0])"></div><div class="card"><h2>So funktioniert die Verteilung</h2><p>1. Wünsche und möglichst ähnliche Gruppengrößen werden gemeinsam berücksichtigt.<br>2. Kinder mit früheren Drittwünschen erhalten mehr Vorrang.<br>3. Bereits besuchte Zugänge werden möglichst vermieden.<br>4. Jede Einteilung bleibt vor der Übernahme veränderbar.</p></div></div>`;}
function parseCsv(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean),sep=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';function row(line){let a=[],v='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){v+='"';i++;}else q=!q;}else if(ch===sep&&!q){a.push(v);v='';}else v+=ch;}a.push(v);return a;}const h=row(lines[0]).map(x=>x.trim());return lines.slice(1).map(l=>Object.fromEntries(row(l).map((v,i)=>[h[i],v.trim().replace(/^"|"$/g,'')])));}
function readChoiceCsv(file){if(!file)return;plannerTitle=document.getElementById('planner_title').value.trim();plannerCap=Number(document.getElementById('planner_cap').value||20);const r=new FileReader();r.onload=()=>{const raw=parseCsv(r.result);plannerRows=raw.map(x=>normalizeChoiceRow(x)).filter(x=>x.first&&x.last&&x.choices[0]&&findPupilForChoice(x));plannerOffers=[...new Set(plannerRows.flatMap(x=>x.choices).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de')).map(name=>({name,capacity:plannerCap}));plannerStep='preview';render();};r.readAsText(file,'utf-8');}
function normalizeChoiceRow(x){const vals=Object.entries(x),get=(patterns)=>vals.find(([k])=>patterns.some(p=>k.toLowerCase().includes(p)))?.[1]||'';const choiceCols=vals.filter(([k])=>/priorität|erstwunsch|zweitwunsch|drittwunsch|wähle hier deinen/i.test(k)).map(([,v])=>v).filter(Boolean);return{last:get(['nachname']),first:get(['vorname']),account:get(['account']),className:get(['klasse/information']),choices:choiceCols.slice(0,3),reason:get(['warum'])};}
function plannerPreview(){return `<div class="card"><h2>${esc(plannerTitle)}</h2><p>${plannerRows.length} Wahlzettel erkannt · ${plannerAllRows().filter(r=>r.withoutChoice).length} Kinder ohne IServ-Wahl werden zusätzlich berücksichtigt · ${plannerOffers.length} Angebote</p><div class="offerCapacityGrid">${plannerOffers.map((o,i)=>`<div><label>${esc(o.name)}</label><input type="number" min="1" value="${o.capacity}" onchange="plannerOffers[${i}].capacity=Number(this.value)"></div>`).join('')}</div><button class="chip" onclick="plannerApplyPaperWishes()">✍ Handschriftliche Wünsche ergänzen (9)</button><button class="chip dark" onclick="calculateAssignment()">Automatisch einteilen</button><button class="chip" onclick="plannerStep='start';render()">zurück</button></div><div class="section">Erkannte Wünsche</div><div class="list">${plannerRows.map(r=>`<div class="row"><div><b>${esc(r.first)} ${esc(r.last)}</b><div class="mini">${esc(r.className)} · ${r.choices.map((x,i)=>`${i+1}. ${esc(x)}`).join(' · ')}</div></div>${findPupilForChoice(r)?'<span class="statusPill status-green">zugeordnet</span>':'<span class="statusPill status-yellow">nicht in Datenbank</span>'}</div>`).join('')}</div>`;}
function findPupilForChoice(r){return (Store.pupils||[]).find(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===Number(State.year)&&((r.account&&p.account===r.account)||(`${p.first} ${p.last}`.toLowerCase()===`${r.first} ${r.last}`.toLowerCase())));}
function priorCount(p,offer){const hist=plannerType==='Sprint'?Store.sprintHistory[p.id]||[]:Store.clubHistory[p.id]||[];const key=offer.toLowerCase().replace(/\([^)]*\)/g,'').trim();return hist.filter(h=>String(h.name||h.offer||'').toLowerCase().includes(key)||key.includes(String(h.name||h.offer||'').toLowerCase())).length;}
function plannerWishRank(r,offer){const i=r.choices.indexOf(offer);return i<0?0:i+1;}
function plannerThirdCount(p){return p?(Store.sprintHistory[p.id]||[]).filter(h=>h.priority===3).length:0;}

// Handwritten wishes supplied on 13 October 2026. Kept in the draft only.
const PLANNER_PAPER_WISHES_20261013=[
 ['Nila',['Tech','History','IT']],['Lennard',['Tech','History','IT']],
 ['Arik',['IT','Tech','Life']],['Ole',['Tech','Life','Geo']],
 ['Anne',['History','Tech','IT']],['Mark',['Tech','History','IT']],
 ['Teodora',['History','IT','Tech']],['Liam',['Tech','IT','Life']],
 ['Muhammad',['Tech','IT','History']]
];
function plannerLabAlias(name){
 const x=String(name||'').toLowerCase();
 if(/geograph|geogr|geo/.test(x))return 'Geo';
 if(/histor|geschicht/.test(x))return 'History';
 if(/\b(?:it|medienbildung)\b/.test(x))return 'IT';
 if(/tec|technik/.test(x))return 'Tech';
 if(/life|aes/.test(x))return 'Life';
 return '';
}
function plannerPaperRows(){
 if(plannerType!=='Sprint')return [];
 const pupils=(Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===Number(State.year));
 return PLANNER_PAPER_WISHES_20261013.map(([first,aliases])=>{
  const matches=pupils.filter(p=>String(p.first||'').trim().toLocaleLowerCase('de')===first.toLocaleLowerCase('de'));
  if(matches.length!==1)return {first,aliases,issue:matches.length?'Mehrere gleichnamige Kinder':'Nicht im aktiven Jahrgang gefunden'};
  const p=matches[0];
  const choices=aliases.map(alias=>plannerOffers.find(o=>plannerLabAlias(o.name)===alias)?.name);
  if(choices.some(x=>!x))return {first,aliases,issue:'Zugang nicht eindeutig gefunden'};
  return {first:p.first,last:p.last,className:p.className,account:p.account||'',choices,pupil:p,paper:true};
 });
}
function plannerApplyPaperWishes(){
 const items=plannerPaperRows(),ok=items.filter(x=>!x.issue),issues=items.filter(x=>x.issue);
 const ids=new Set(ok.map(x=>x.pupil.id));
 plannerRows=plannerRows.filter(r=>!ids.has(findPupilForChoice(r)?.id)).concat(ok);
 if(issues.length)toast('Handschriftliche Wünsche teilweise ungeklärt: '+issues.map(x=>x.first).join(', '));
 plannerStep='preview';render();
}
function plannerAllRows(){
 const matched=new Set(plannerRows.map(r=>findPupilForChoice(r)?.id).filter(Boolean));
 const extras=(Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===Number(State.year)&&!matched.has(p.id)).map(p=>({first:p.first,last:p.last,className:p.className,account:p.account||'',choices:[],pupil:p,withoutChoice:true}));
 return plannerRows.map(r=>({...r,pupil:findPupilForChoice(r)})).concat(extras);
}
function calculateAssignment(){
 plannerResult=Object.fromEntries(plannerOffers.map(o=>[o.name,[]]));
 plannerResult['Nicht zugeteilt']=[];
 const rows=plannerAllRows(),voted=rows.filter(r=>r.choices?.length&&!r.withoutChoice);
 const names=plannerOffers.map(o=>o.name),n=names.length;
 if(!n){toast('Bitte zuerst Angebote einlesen.');return;}
 const cap=Object.fromEntries(plannerOffers.map(o=>[o.name,Math.max(0,Number(o.capacity)||0)]));
 // Keep voting pupils balanced across the available labs; pupils without votes are placed manually later.
 const balanced=Math.ceil(voted.length/n);
 const limit=Object.fromEntries(names.map(name=>[name,Math.min(cap[name],balanced+1)]));
 const used=new Set();
 const order=voted.slice().sort((a,b)=>plannerThirdCount(b.pupil)-plannerThirdCount(a.pupil)||
  String(a.last+' '+a.first).localeCompare(String(b.last+' '+b.first),'de'));
 // Preference priority dominates, but do not fill one lab while another has very few pupils.
 for(let rank=0;rank<3;rank++){
  for(const r of order){
   if(used.has(r))continue;
   const name=r.choices[rank];
   if(!name||!(name in limit)||plannerResult[name].length>=limit[name])continue;
   plannerResult[name].push(r);used.add(r);
  }
 }
 // Rebalance by changing as few preference ranks as possible.
 const target=Math.floor(voted.length/n);
 for(let round=0;round<voted.length*n;round++){
  const small=names.filter(name=>plannerResult[name].length<Math.min(target,cap[name]));
  if(!small.length)break;
  let best=null;
  for(const dest of small)for(const src of names){
   if(src===dest||plannerResult[src].length<=Math.min(target,cap[src]))continue;
   for(const r of plannerResult[src]){
    const oldRank=plannerWishRank(r,src)||4,newRank=plannerWishRank(r,dest)||4;
    const cost=(newRank-oldRank)*100+(newRank===4?500:0);
    if(!best||cost<best.cost)best={src,dest,r,cost};
   }
  }
  if(!best)break;
  plannerResult[best.src].splice(plannerResult[best.src].indexOf(best.r),1);
  plannerResult[best.dest].push(best.r);
 }
 // Remaining voters: choose an available place, prioritizing a requested lab.
 for(const r of order.filter(r=>!used.has(r))){
  const choices=names.filter(name=>plannerResult[name].length<cap[name]).sort((x,y)=>
   (plannerWishRank(r,x)||4)-(plannerWishRank(r,y)||4)||
   plannerResult[x].length-plannerResult[y].length);
  if(choices.length)plannerResult[choices[0]].push(r);
  else plannerResult['Nicht zugeteilt'].push(r);
 }
 plannerResult['Nicht zugeteilt'].push(...rows.filter(r=>r.withoutChoice));
 plannerStep='result';render();
}
function plannerExportRows(a){
 const groups=a?a.groups:plannerResult,details=a?.details||{};
 const output=[];
 for(const [offer,rows] of Object.entries(groups))for(const item of rows){
  const p=a?(Store.pupils||[]).find(x=>x.id===item):item.pupil;
  const d=a?details[item]||{}:item;
  const rank=a?(d.priority??0):plannerWishRank(d,offer);
  output.push({offer,last:p?.last||d.last||'',first:p?.first||d.first||'',className:p?.className||d.className||'',team:p?.team||'',rank,previous:p?priorCount(p,offer):0});
 }
 return output.sort((a,b)=>a.offer.localeCompare(b.offer,'de')||a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de'));
}
function plannerExportCsv(a){
 const rows=plannerExportRows(a);
 const header=['Zugang','Nachname','Vorname','Klasse','Team','Wunsch','Bisherige Besuche'];
 const data=[header,...rows.map(r=>[r.offer,r.last,r.first,r.className,r.team,r.rank?'Wunsch '+r.rank:'Ohne Wunsch',r.previous])];
 // Comma-separated UTF-8 opens in separate columns in Excel for iPad.
 const csv='\uFEFF'+data.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='KOMPASS_Einteilung_'+State.year+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function plannerPrintLists(a){
 const rows=plannerExportRows(a),groups=[...new Set(rows.map(r=>r.offer))];
 const escPrint=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const html='<!doctype html><html lang="de"><head><meta charset="utf-8"><title>KOMPASS Zugangslisten</title><style>body{font:12px Arial,sans-serif;color:#24314a;margin:24px}h1{font-size:20px}h2{font-size:16px;margin:20px 0 8px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ccd2db;padding:7px;text-align:left}th{background:#eef1f7}section{break-after:page}section:last-child{break-after:auto}@page{size:A4;margin:15mm}.hint{color:#667085}</style></head><body><h1>KOMPASS · Zugangslisten · Jahrgang '+escPrint(State.year)+'</h1>'+groups.map(name=>{const group=rows.filter(r=>r.offer===name);return '<section><h2>'+escPrint(name)+' · '+group.length+' Kinder</h2><table><thead><tr><th>Nr.</th><th>Nachname</th><th>Vorname</th><th>Klasse</th><th>Team</th><th>Wunsch</th><th>Anwesenheit</th></tr></thead><tbody>'+group.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+escPrint(r.last)+'</td><td>'+escPrint(r.first)+'</td><td>'+escPrint(r.className)+'</td><td>'+escPrint(r.team)+'</td><td>'+(r.rank?'Wunsch '+r.rank:'Ohne Wunsch')+'</td><td>☐</td></tr>').join('')+'</tbody></table></section>'}).join('')+'</body></html>';
 const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='KOMPASS_Zugangslisten_'+State.year+'.html';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function plannerResultView(){return `<div class="toolbar"><span class="badge">ENTWURF – noch nicht gespeichert</span><button class="chip" onclick="calculateAssignment()">↻ Erstwünsche neu berechnen</button><button class="chip dark" onclick="acceptAssignment()">Einteilung übernehmen</button><button class="chip" onclick="plannerStep='preview';render()">Kapazitäten ändern</button><button class="chip" onclick="plannerExportCsv()">⬇ Excel-Liste (CSV)</button><button class="chip" onclick="plannerPrintLists()">🖨 Drucklisten (HTML)</button><span class="badge">${Object.values(plannerResult).flat().length} Kinder</span></div><div class="assignmentBoard">${Object.entries(plannerResult).map(([offer,rows])=>`<div class="assignmentColumn"><h2>${esc(offer)}</h2><div class="mini">${rows.length} / ${plannerOffers.find(o=>o.name===offer)?.capacity||'–'}</div>${rows.map((r,i)=>`<div class="assignmentCard"><b>${esc(r.first)} ${esc(r.last)}</b><div class="mini">${plannerWishRank(r,offer)?`Wunsch ${plannerWishRank(r,offer)}`:"Kein Wunsch"}</div><select onchange="moveAssigned('${esc(offer)}',${i},this.value)">${Object.keys(plannerResult).map(x=>`<option ${x===offer?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`).join('')}</div>`).join('')}</div>`;}
function moveAssigned(from,index,to){if(from===to)return;const [r]=plannerResult[from].splice(index,1);plannerResult[to].push(r);render();}
function acceptAssignment(){if((plannerResult['Nicht zugeteilt']||[]).length||Object.values(plannerResult).flat().some(r=>!r.pupil)){toast('Bitte fehlende Zuordnungen oder unbekannte Schülerkonten zuerst klären.');return;}const id=uid('assignment'),createdAt=new Date().toISOString(),groups={},details={};for(const [offer,rows] of Object.entries(plannerResult)){groups[offer]=rows.map(r=>r.pupil?.id||null).filter(Boolean);for(const r of rows){const p=r.pupil;if(!p)continue;details[p.id]={priority:plannerWishRank(r,offer),choices:r.choices.slice(),offer};const item={assignmentId:id,name:offer,title:plannerTitle,date:createdAt,year:State.year,priority:plannerWishRank(r,offer)};const target=plannerType==='Sprint'?Store.sprintHistory:Store.clubHistory;target[p.id]=target[p.id]||[];target[p.id].push(item);if(plannerType==='Club'){let a=Store.activities.find(x=>x.type==='Club'&&x.name===offer&&x.year===State.year);if(!a){a={id:uid('activity'),type:'Club',year:State.year,name:offer,lebEnabled:true};Store.activities.push(a);}Store.activityRecords[a.id+'|'+p.id]={activityId:a.id,pupilId:p.id,active:true,count:0,note:'',licenses:[]};}}}Store.assignments.push({id,type:plannerType,title:plannerTitle,year:State.year,createdAt,groups,details});Store.save();toast('Einteilung gespeichert – über Historie bei Bedarf in die Werkstatt-Bewertung übernehmen');plannerStep='start';plannerRows=[];plannerResult={};render();}
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
function plannerCompleteSavedAssignment(id){
 const a=Store.assignments.find(x=>x.id===id);if(!a)return;
 const pupils=(Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===Number(a.year));
 const existing=new Set(Object.values(a.groups||{}).flat());
 const missing=pupils.filter(p=>!existing.has(p.id));
 if(!missing.length){toast('Alle Kinder dieses Jahrgangs sind bereits zugeteilt.');return;}
 const offers=Object.keys(a.groups||{}).filter(x=>x!=='Nicht zugeteilt');if(!offers.length){toast('Keine Zugänge vorhanden.');return;}
 if(!confirm(missing.length+' Kinder ohne Zuordnung zunächst in „Nicht zugeteilt“ sammeln? Du kannst sie anschließend selbst verteilen.'))return;
 a.details=a.details||{};
 a.groups['Nicht zugeteilt']=a.groups['Nicht zugeteilt']||[];
 for(const p of missing){
  a.groups['Nicht zugeteilt'].push(p.id);
  a.details[p.id]={priority:0,choices:[],offer:'Nicht zugeteilt',withoutChoice:true};
 }
 Store.save('Fehlende Kinder der Einteilung zugeordnet');
 toast(missing.length+' Kinder unter „Nicht zugeteilt“ gesammelt.');renderAssignmentHistory();
}
function plannerMissingCount(a){const used=new Set(Object.values(a.groups||{}).flat());return (Store.pupils||[]).filter(p=>Number(p.year||String(p.className||'').charAt(0))===Number(a.year)&&!used.has(p.id)).length;}
function renderAssignmentHistory(){const rows=Store.assignments.slice().reverse();shell(header('Einteilungshistorie')+`<button class="chip" onclick="State.view='planner';plannerStep='start';render()">← zurück</button><div class="list">${rows.map(a=>`<div class="row"><div><b>${esc(a.title)}</b><div class="mini">${esc(a.type)} · Jahrgang ${a.year} · ${new Date(a.createdAt).toLocaleDateString('de-DE')}</div></div><span class="badge">${Object.values(a.groups).flat().length} Kinder</span><button class="chip" onclick="plannerExportCsv(Store.assignments.find(x=>x.id===this.dataset.assignment))" data-assignment="${a.id}">⬇ CSV</button>${a.type==='Sprint'&&plannerMissingCount(a)?`<button class="chip dark" onclick="plannerCompleteSavedAssignment(\'${a.id}\')">+ ${plannerMissingCount(a)} fehlende Kinder zuteilen</button>`:''}${plannerWorkshopSelector(a)}</div>`).join('')||'<div class="card empty">Noch keine Einteilungen übernommen.</div>'}</div>`);}
