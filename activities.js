const ACTIVITY_TYPES=['Kreativband','Club','Besonderes Angebot'];
let activityType='Kreativband';
let activitySelected=null;
let activitySearch='';

function activities(){
  const offers=Store.activities.filter(a=>a.year===State.year&&a.type===activityType).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  let content=header('Angebote','Kreativband, Clubs und besondere Angebote übersichtlich dokumentieren.');
  content+=`<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);activitySelected=null;render()">${[5,6,7].map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Bereich</label><select onchange="activityType=this.value;activitySelected=null;render()">${ACTIVITY_TYPES.map(t=>`<option ${activityType===t?'selected':''}>${t}</option>`).join('')}</select></div></div>`;
  if(canEdit())content+=`<button class="chip dark" onclick="openActivityEditor()">+ Angebot anlegen</button>`;
  if(activitySelected){ content+=renderActivityDetail(activitySelected); }
  else content+=`<div class="offerGrid">${offers.map(a=>`<div class="tile activityTile" onclick="activitySelected='${a.id}';render()"><div><span class="activityIcon">${activityIcon(a.type)}</span><b>${esc(a.name)}</b><span>${activityMemberCount(a.id)} Teilnehmende${a.period?' · '+esc(a.period):''}</span></div></div>`).join('')||'<div class="card empty">Noch keine Angebote angelegt.</div>'}</div>`;
  shell(content);
}
function activityIcon(type){return type==='Kreativband'?'🎨':type==='Club'?'🏆':'✨';}
function activityMemberCount(id){return Object.values(Store.activityRecords).filter(r=>r.activityId===id&&r.active).length;}
function openActivityEditor(id=null){State.dialog={mode:'activity',id};renderDialog();}
function renderActivityDialog(target){
  const a=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):{id:null,type:activityType,name:'',year:State.year,period:'',lebEnabled:true,badge:''};
  target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${a.id?'Angebot bearbeiten':'Angebot anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><div class="formgrid"><div><label>Bereich</label><select id="a_type">${ACTIVITY_TYPES.map(t=>`<option ${a.type===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label>Jahrgang</label><select id="a_year">${[5,6,7].map(y=>`<option value="${y}" ${a.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Name</label><input id="a_name" value="${esc(a.name)}" placeholder="z. B. Gartenlabor"></div><div><label>Zeitraum optional</label><input id="a_period" value="${esc(a.period||'')}" placeholder="z. B. 1. Halbjahr"></div><div><label>Badge optional</label><input id="a_badge" value="${esc(a.badge||'')}" placeholder="z. B. Gartenprofi"></div></div><label class="check"><input id="a_leb" type="checkbox" ${a.lebEnabled!==false?'checked':''}> im LEB berücksichtigen</label><button class="chip dark" onclick="saveActivityDialog()">Speichern</button>${a.id?`<button class="chip" onclick="deleteActivityDialog()">Löschen</button>`:''}</div></div>`;
}
function saveActivityDialog(){
  const existing=State.dialog.id?Store.activities.find(x=>x.id===State.dialog.id):null;
  const obj=existing||{id:uid('activity')}; obj.type=document.getElementById('a_type').value; obj.year=Number(document.getElementById('a_year').value); obj.name=document.getElementById('a_name').value.trim(); obj.period=document.getElementById('a_period').value.trim(); obj.badge=document.getElementById('a_badge').value.trim(); obj.lebEnabled=document.getElementById('a_leb').checked;
  if(!obj.name){alert('Bitte einen Namen eintragen.');return;} if(!existing)Store.activities.push(obj); Store.save(); activityType=obj.type; activitySelected=obj.id; State.dialog=null; toast(); render();
}
function deleteActivityDialog(){if(!confirm('Angebot wirklich löschen?'))return; const id=State.dialog.id; Store.activities=Store.activities.filter(a=>a.id!==id); Object.keys(Store.activityRecords).forEach(k=>{if(Store.activityRecords[k].activityId===id)delete Store.activityRecords[k]}); Store.save(); activitySelected=null; State.dialog=null; toast('Gelöscht'); render();}
function renderActivityDetail(id){
  const a=Store.activities.find(x=>x.id===id); if(!a){activitySelected=null;return'';}
  const pupils=Store.pupils.filter(p=>String(p.className).startsWith(String(State.year))).filter(p=>{const s=activitySearch.trim().toLowerCase();return !s||(p.first+' '+p.last+' '+p.short).toLowerCase().includes(s)}).sort((x,y)=>x.last.localeCompare(y.last,'de'));
  return `<button class="chip" onclick="activitySelected=null;render()">← Angebote</button>${canEdit()?`<button class="chip" onclick="openActivityEditor('${a.id}')">Angebot bearbeiten</button>`:''}<div class="card focusCard"><div><h2>${activityIcon(a.type)} ${esc(a.name)}</h2><p>${esc(a.type)}${a.period?' · '+esc(a.period):''}${a.badge?' · Badge: '+esc(a.badge):''}</p></div><div class="scoreHint">${activityMemberCount(a.id)}<br><span class="mini">Teilnehmende</span></div></div><div class="toolbar"><label>Schüler*in suchen</label><input value="${esc(activitySearch)}" oninput="activitySearch=this.value;render()" placeholder="Name suchen …"></div><table class="studentTable"><thead><tr><th>Teilnahme</th><th>Schüler*in</th><th>Anzahl</th><th>Engagement</th><th>Bemerkung</th></tr></thead><tbody>${pupils.map(p=>activityPupilRow(a,p)).join('')}</tbody></table>`;
}
function activityPupilRow(a,p){
  const key=a.id+'|'+p.id; const r=Store.activityRecords[key]||{activityId:a.id,pupilId:p.id,active:false,count:0,engagement:'',note:''};
  return `<tr><td><input type="checkbox" ${r.active?'checked':''} onchange="saveActivityRecord('${a.id}','${p.id}','active',this.checked)"></td><td><b>${esc(p.short)}</b><div class="mini">${esc(p.className)} · ${esc(p.team)}</div></td><td><input class="smallInput" type="number" min="0" value="${r.count||0}" ${r.active?'':'disabled'} onchange="saveActivityRecord('${a.id}','${p.id}','count',Number(this.value))"></td><td><select ${r.active?'':'disabled'} onchange="saveActivityRecord('${a.id}','${p.id}','engagement',this.value)"><option value="">—</option>${['zurückhaltend','zuverlässig','engagiert','besonders engagiert'].map(v=>`<option ${r.engagement===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input value="${esc(r.note||'')}" ${r.active?'':'disabled'} onchange="saveActivityRecord('${a.id}','${p.id}','note',this.value)" placeholder="optional"></td></tr>`;
}
function saveActivityRecord(activityId,pupilId,field,value){const key=activityId+'|'+pupilId; const r=Store.activityRecords[key]||{activityId,pupilId,active:false,count:0,engagement:'',note:''}; r[field]=value; Store.activityRecords[key]=r; Store.save(); if(field==='active')render(); else toast();}
function pupilActivities(pupilId){return Object.values(Store.activityRecords).filter(r=>r.pupilId===pupilId&&r.active).map(r=>({record:r,activity:Store.activities.find(a=>a.id===r.activityId)})).filter(x=>x.activity);}
