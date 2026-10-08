/* KOMPASS Lernatelier – erste Lehrkraft-Version. Schüler-Selbstbuchung folgt nach Rollenprüfung. */
const LA_ROOMS=['LA 1','LA 2','LA 3'];
const LA_PLACES=['Lernatelier','Stichgang','Marktplatz','Bibliothek','Input','Coaching'];
const LA_LEVELS=['Hiker','Climber','Free-Climber'];
let laSelectedRoom='LA 1';
function laPupils(){return (Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===6);}
function laRoom(p){return LA_ROOMS.includes(p.learningAtelier)?p.learningAtelier:'';}
function laSafeId(id){return JSON.stringify(String(id)).replace(/"/g,'&quot;');}
function laUpdate(id,key,value){
  if(!Auth.canLead(6)&&!Auth.isAdmin()){toast('Nur Stufenleitung darf diese Zuordnung ändern.');return;}
  const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
  if(key==='learningAtelier'&&!LA_ROOMS.includes(value))return;
  if(key==='graduation'&&!LA_LEVELS.includes(value))return;
  if(key==='learningPlace'&&!LA_PLACES.includes(value))return;
  p[key]=value;Store.save();render();
}
function laNoise(room,value){
  if(!Auth.canLead(6)&&!Auth.isAdmin())return;
  if(!LA_ROOMS.includes(room)||!['green','yellow','red'].includes(value))return;
  Store.data.settings=Store.data.settings||{};
  Store.data.settings.laNoise=Store.data.settings.laNoise||{};
  Store.data.settings.laNoise[room]=value;
  Store.save();render();
}
function learningAtelier(){
  if(!Auth.canAccessGrade(6)){shell(header('Lernatelier')+'<div class="card">Kein Zugriff auf Jahrgang 6.</div>');return;}
  const all=laPupils(),current=all.filter(p=>laRoom(p)===laSelectedRoom);
  const unknown=all.filter(p=>!laRoom(p));
  const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
  const can=Auth.canLead(6)||Auth.isAdmin();
  let html=header('Lernatelier','Jahrgang 6 · alle Farbteams gemeinsam · Lehrkraftansicht');
  html+='<div class="toolbar"><div class="laTabs">'+LA_ROOMS.map(r=>`<button class="chip ${laSelectedRoom===r?'dark':''}" onclick="laSelectedRoom='${r}';render()">${r} · ${all.filter(p=>laRoom(p)===r).length}</button>`).join('')+'</div><p class="mini">Die Zuordnung zum Lernatelier bleibt auch bei einem Standortwechsel bestehen.</p></div>';
  html+=`<div class="card"><h2>Lärmampel · ${esc(laSelectedRoom)}</h2><div class="laLights">${[['green','🟢','Leise sprechen'],['yellow','🟡','Flüstern'],['red','🔴','Ruhe']].map(([v,i,l])=>`<button class="chip ${noise===v?'dark':''}" ${can?'':'disabled'} onclick="laNoise(laSelectedRoom,'${v}')">${i} ${l}</button>`).join('')}</div></div>`;
  html+='<div class="section">Standortübersicht</div><div class="laBoard">';
  for(const place of LA_PLACES){const ps=current.filter(p=>(p.learningPlace||'Lernatelier')===place);html+=`<div class="card"><h2>${esc(place)} <span class="mini">(${ps.length})</span></h2><div class="laNames">${ps.map(p=>`<span class="laName"><span class="dot ${teamColor(p.team)}"></span>${esc(p.short||p.first+' '+p.last)}</span>`).join('')||'<span class="mini">Niemand eingetragen</span>'}</div></div>`;}
  html+='</div><div class="section">Schülerverwaltung</div>';
  if(!can)html+='<div class="card">Die Zuordnungen und Graduierungen können nur durch die Stufenleitung geändert werden.</div>';
  html+='<div class="card"><div class="laTableWrap"><table class="studentTable"><thead><tr><th>Name</th><th>Team</th><th>Graduierung</th><th>Standort</th><th>Stamm-LA</th></tr></thead><tbody>';
  for(const p of current){
    const id=laSafeId(p.id),sel=(key,values,currentValue)=>`<select aria-label="${esc(key)} für ${esc(p.short||p.first)}" ${can?'':'disabled'} onchange="laUpdate('${id}','${key}',this.value)">${values.map(v=>`<option value="${esc(v)}" ${currentValue===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
    html+=`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td>${sel('graduation',LA_LEVELS,p.graduation||'Hiker')}</td><td>${sel('learningPlace',LA_PLACES,p.learningPlace||'Lernatelier')}</td><td>${sel('learningAtelier',LA_ROOMS,laRoom(p))}</td></tr>`;
  }
  html+='</tbody></table></div></div>';
  if(unknown.length)html+=`<div class="section">Noch keinem Lernatelier zugeordnet · ${unknown.length}</div><div class="card"><p class="mini">Diese SuS sind bereits in Kompass vorhanden und müssen nur einem Lernatelier zugeordnet werden.</p><div class="laTableWrap"><table class="studentTable"><tbody>${unknown.map(p=>`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td><select ${can?'':'disabled'} onchange="laUpdate('${laSafeId(p.id)}','learningAtelier',this.value)"><option value="">Bitte wählen</option>${LA_ROOMS.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>`;
  html+='<p class="mini">Erste Ausbaustufe: Die Standortänderung erfolgt durch berechtigte Lehrkräfte. Schüler-Selbstbuchung und digitale Genehmigungen werden erst nach Einrichtung gesicherter Schülerzugänge freigeschaltet.</p>';
  shell(html);
}
