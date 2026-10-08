/* KOMPASS Lernatelier – erste Lehrkraft-Version. Schüler-Selbstbuchung folgt nach Rollenprüfung. */
const LA_ROOMS=['LA 1','LA 2','LA 3'];
const LA_PLACES=['Lernatelier','Stichgang','Marktplatz','Bibliothek','Input','Coaching'];
const LA_LEVELS=['Hiker','Climber','Free-Climber'];
let laSelectedRoom='LA 1';
let laViewMode='teacher';
let laPreviewPupilId='';
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

function laRequestPlace(id,place){
 if(!Auth.canAccessGrade(6)||!LA_PLACES.includes(place)||place==='Lernatelier')return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p||!laRoom(p))return;
 p.laRequest={place,status:'pending',at:new Date().toISOString()};
 Store.save('Lernort-Anfrage erstellt',{pupilId:p.id,place});render();
}
function laAnswerRequest(id,yes){
 if(!Auth.canAccessGrade(6))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p||p.laRequest?.status!=='pending')return;
 const place=p.laRequest.place;
 p.laRequest={...p.laRequest,status:yes?'approved':'denied',decidedAt:new Date().toISOString()};
 if(yes)p.learningPlace=place;
 Store.save('Lernort-Anfrage entschieden',{pupilId:p.id,approved:yes});render();
}
function laSetHelp(id,enabled){
 if(!Auth.canAccessGrade(6))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 p.laNeedsHelp=!!enabled;Store.save('Hilfehand geändert',{pupilId:p.id});render();
}

async function laExitStudentPreview(){
 const user=Auth.currentUser();
 if(!user)return;
 if(Auth.session?.mode!=='cloud'){alert('Die geschützte Rückkehr benötigt ein Cloud-Lehrkraftkonto.');return;}
 const password=prompt('Lehrkraft-Passwort eingeben, um die Schülersicht zu verlassen:');
 if(password===null)return;
 try{
  const ok=await Auth.verifyCloudPassword(user.username,password);
  if(!ok){alert('Passwort nicht korrekt. Die Schülersicht bleibt geöffnet.');return;}
  laViewMode='teacher';laPreviewPupilId='';render();
 }catch(e){alert('Überprüfung fehlgeschlagen: '+(e?.message||String(e)));}
}
function laStudentPreview(){
 if(!Auth.canAccessGrade(6))return;
 const all=laPupils();
 if(!all.some(p=>laRoom(p)===laSelectedRoom)){const first=LA_ROOMS.find(room=>all.some(p=>laRoom(p)===room));if(first)laSelectedRoom=first;}
 const pupils=all.filter(p=>laRoom(p)===laSelectedRoom);
 if(!pupils.some(p=>String(p.id)===String(laPreviewPupilId)))laPreviewPupilId=pupils[0]?.id||'';
 const p=pupils.find(x=>String(x.id)===String(laPreviewPupilId));
 const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
 const noiseData={green:['🟢','Leise sprechen'],yellow:['🟡','Flüstern'],red:['🔴','Ruhe']}[noise];
 let html=header('Mein Lernatelier','Schülersicht · Vorschau im Lehrkraftkonto');
 html+='<div class="toolbar"><button class="chip" onclick="laExitStudentPreview()">🔒 Lehrkraftmodus entsperren</button><div class="mini">Geschützte Vorschau · Zurück nur mit Lehrkraft-Passwort</div></div>';
 html+='<div class="toolbar"><div class="laTabs">'+LA_ROOMS.map(room=>'<button class="chip '+(room===laSelectedRoom?'dark':'')+'" onclick="laSelectedRoom=\''+room+'\';laPreviewPupilId=\'\';render()">'+room+' · '+all.filter(p=>laRoom(p)===room).length+'</button>').join('')+'</div></div>';
 html+='<div class="toolbar">';
 html+='<label for="laPreviewSelect">Schüler*in für Vorschau auswählen</label><select id="laPreviewSelect" onchange="laPreviewPupilId=this.value;render()">';
 html+=pupils.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(laPreviewPupilId)?'selected':'')+'>'+esc(x.short||x.first+' '+x.last)+'</option>').join('');
 html+='</select></div>';
 if(!p){document.getElementById('app').innerHTML='<main class="laStudentFullscreen">'+html+'<div class="card">In diesem Lernatelier sind noch keine SuS zugeordnet.</div></main>';return;}
 const place=p.learningPlace||'Lernatelier',req=p.laRequest;
 html+='<div class="laStudentHero"><div class="mini">Hallo!</div><h2>'+esc(p.first||p.short)+'</h2><div>🧗 '+esc(p.graduation||'Hiker')+' · '+esc(laSelectedRoom)+'</div></div>';
 html+='<div class="laStudentGrid"><div class="card"><div class="mini">Mein aktueller Lernort</div><h2>📍 '+esc(place)+'</h2><p>Hier bist du gerade eingetragen.</p></div>';
 html+='<div class="card"><div class="mini">Lärmampel</div><h2>'+noiseData[0]+' '+noiseData[1]+'</h2><p>Bitte halte dich an die Regeln deines Lernateliers.</p></div></div>';
 html+='<div class="card laHelpCard"><h2>✋ Brauchst du Hilfe?</h2><p>Dein Lerncoach sieht, dass du Unterstützung brauchst.</p><button class="chip dark laHelpButton" onclick="laSetHelp(\''+esc(p.id)+'\','+(!p.laNeedsHelp)+')">'+(p.laNeedsHelp?'✓ Hilfe angefragt – zurücknehmen':'✋ Ich brauche Hilfe')+'</button></div>';
 html+='<div class="section">Mein Lernort</div><div class="laStudentPlaces">';
 for(const target of LA_PLACES){
  const isHere=place===target;
  const isPending=req?.status==='pending'&&req.place===target;
  html+='<button class="laPlaceButton" '+(isHere||isPending?'disabled':'')+' onclick="laRequestPlace(\''+esc(p.id)+'\',\''+esc(target)+'\')"><strong>'+esc(target)+'</strong><small>'+(isHere?'✓ Du bist hier':isPending?'⏳ Anfrage läuft':target==='Lernatelier'?'Stamm-Lernort':'Genehmigung anfragen')+'</small></button>';
 }
 html+='</div>';
 if(req?.status==='pending')html+='<div class="card"><b>⏳ Deine Anfrage für '+esc(req.place)+' wartet auf eine Entscheidung.</b></div>';
 else if(req?.status==='denied')html+='<div class="card"><b>Deine letzte Anfrage wurde nicht genehmigt.</b></div>';
 html+='<p class="mini">Lehrkraft-Vorschau: Aktionen werden im angemeldeten Lehrkraftkonto gespeichert. Die Schüler-Anmeldung und automatische Prüfung der Bewegungsrechte folgen separat.</p>';
 document.getElementById('app').innerHTML='<main class="laStudentFullscreen">'+html+'</main>';
}
function learningAtelier(){
  if(!Auth.canAccessGrade(6)){shell(header('Lernatelier')+'<div class="card">Kein Zugriff auf Jahrgang 6.</div>');return;}
  if(laViewMode==='student')return laStudentPreview();
  const all=laPupils(),current=all.filter(p=>laRoom(p)===laSelectedRoom);
  const unknown=all.filter(p=>!laRoom(p));
  const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
  const can=Auth.canLead(6)||Auth.isAdmin();
  let html=header('Lernatelier','Jahrgang 6 · alle Farbteams gemeinsam · Lehrkraftansicht');
  html+='<div class="toolbar"><button class="chip dark" onclick="laViewMode=\'student\';render()">👩‍🎓 Zur Schülersicht wechseln</button></div>';
  html+='<div class="toolbar"><div class="laTabs">'+LA_ROOMS.map(r=>`<button class="chip ${laSelectedRoom===r?'dark':''}" onclick="laSelectedRoom='${r}';laPreviewPupilId='';render()">${r} · ${all.filter(p=>laRoom(p)===r).length}</button>`).join('')+'</div><p class="mini">Die Zuordnung zum Lernatelier bleibt auch bei einem Standortwechsel bestehen.</p></div>';
  html+=`<div class="card"><h2>Lärmampel · ${esc(laSelectedRoom)}</h2><div class="laLights">${[['green','🟢','Leise sprechen'],['yellow','🟡','Flüstern'],['red','🔴','Ruhe']].map(([v,i,l])=>`<button class="chip ${noise===v?'dark':''}" ${can?'':'disabled'} onclick="laNoise(laSelectedRoom,'${v}')">${i} ${l}</button>`).join('')}</div></div>`;
  const pending=current.filter(p=>p.laRequest?.status==='pending');
  const help=current.filter(p=>p.laNeedsHelp);
  html+='<div class="laMetrics"><div class="card"><b>'+current.length+'</b><span>SuS in '+esc(laSelectedRoom)+'</span></div><div class="card"><b>'+current.filter(p=>(p.learningPlace||'Lernatelier')==='Lernatelier').length+'</b><span>Im Lernatelier</span></div><div class="card"><b>'+pending.length+'</b><span>Offene Anfragen</span></div><div class="card"><b>'+help.length+'</b><span>Hilfe benötigt</span></div></div>';
  html+='<div class="laDashboardGrid"><div class="card"><h2>🔔 Genehmigungen</h2>';
  html+=pending.length?pending.map(p=>'<div class="laQueue"><div><b>'+esc(p.short||p.first+' '+p.last)+'</b><div class="mini">'+esc(p.laRequest.place)+' · '+esc(p.graduation||'Hiker')+'</div></div><div><button class="chip dark" onclick="laAnswerRequest(\''+esc(p.id)+'\',true)">✓</button><button class="chip" onclick="laAnswerRequest(\''+esc(p.id)+'\',false)">✕</button></div></div>').join(''):'<p class="mini">Keine offenen Anfragen</p>';
  html+='</div><div class="card"><h2>✋ Hilfehand</h2>';
  html+=help.length?help.map(p=>'<div class="laQueue"><b>'+esc(p.short||p.first+' '+p.last)+'</b><button class="chip" onclick="laSetHelp(\''+esc(p.id)+'\',false)">Erledigt ✓</button></div>').join(''):'<p class="mini">Niemand wartet auf Hilfe</p>';
  html+='</div></div>';
  html+='<div class="section">Standortübersicht</div><div class="laBoard">';
  for(const place of LA_PLACES){const ps=current.filter(p=>(p.learningPlace||'Lernatelier')===place);html+=`<div class="card"><h2>${esc(place)} <span class="mini">(${ps.length})</span></h2><div class="laNames">${ps.map(p=>`<span class="laName"><span class="dot ${teamColor(p.team)}"></span>${esc(p.short||p.first+' '+p.last)}</span>`).join('')||'<span class="mini">Niemand eingetragen</span>'}</div></div>`;}
  html+='</div><div class="section">Schülerverwaltung</div>';
  if(!can)html+='<div class="card">Die Zuordnungen und Graduierungen können nur durch die Stufenleitung geändert werden.</div>';
  html+='<div class="card"><div class="laTableWrap"><table class="studentTable"><thead><tr><th>Name</th><th>Team</th><th>Graduierung</th><th>Standort</th><th>Stamm-LA</th><th>Aktionen</th></tr></thead><tbody>';
  for(const p of current){
    const id=laSafeId(p.id),sel=(key,values,currentValue)=>`<select aria-label="${esc(key)} für ${esc(p.short||p.first)}" ${can?'':'disabled'} onchange="laUpdate('${id}','${key}',this.value)">${values.map(v=>`<option value="${esc(v)}" ${currentValue===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
    html+=`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td>${sel('graduation',LA_LEVELS,p.graduation||'Hiker')}</td><td>${sel('learningPlace',LA_PLACES,p.learningPlace||'Lernatelier')}</td><td>${sel('learningAtelier',LA_ROOMS,laRoom(p))}</td><td><select aria-label="Lernort anfragen" onchange="if(this.value)laRequestPlace('${id}',this.value)"><option value="">Anfrage erstellen …</option>${LA_PLACES.filter(v=>v!=='Lernatelier').map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select><button class="chip" onclick="laSetHelp('${id}',${!p.laNeedsHelp})">${p.laNeedsHelp?'Hilfe erledigt':'✋ Hilfe'}</button></td></tr>`;
  }
  html+='</tbody></table></div></div>';
  if(unknown.length)html+=`<div class="section">Noch keinem Lernatelier zugeordnet · ${unknown.length}</div><div class="card"><p class="mini">Diese SuS sind bereits in Kompass vorhanden und müssen nur einem Lernatelier zugeordnet werden.</p><div class="laTableWrap"><table class="studentTable"><tbody>${unknown.map(p=>`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td><select ${can?'':'disabled'} onchange="laUpdate('${laSafeId(p.id)}','learningAtelier',this.value)"><option value="">Bitte wählen</option>${LA_ROOMS.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>`;
  html+='<p class="mini">Erste Ausbaustufe: Die Standortänderung erfolgt durch berechtigte Lehrkräfte. Schüler-Selbstbuchung und digitale Genehmigungen werden erst nach Einrichtung gesicherter Schülerzugänge freigeschaltet.</p>';
  shell(html);
}
