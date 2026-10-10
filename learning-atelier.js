/* KOMPASS Lernatelier – erste Lehrkraft-Version. Schüler-Selbstbuchung folgt nach Rollenprüfung. */
const LA_ROOMS=['LA 1','LA 2','LA 3'];
let laGrade=(()=>{try{const g=Number(localStorage.getItem('kompass_la_grade_v1'));return [5,6,7].includes(g)?g:6;}catch(_){return 6;}})();
function laSetGrade(g){g=Number(g);if(![5,6,7].includes(g)||!Auth.canAccessGrade(g))return;laGrade=g;try{localStorage.setItem('kompass_la_grade_v1',String(g));}catch(_){}laSelectedRoom='LA 1';laBoardSelectedId='';laPreviewPupilId='';render();}
function laGradeTabs(){return '<div class="laRoomSwitcher">'+[5,6,7].filter(g=>Auth.canAccessGrade(g)).map(g=>'<button class="chip '+(laGrade===g?'dark':'')+'" onclick="laSetGrade('+g+')">Stufe '+g+'</button>').join('')+'</div>';}
function laSettingKey(k){return laGrade===6?k:k+'Grade'+laGrade;}
function laGradeSettings(k){if(Auth.isLernatelier()){const p=laLimitedPayloads[laGrade]||{};return ({laDailyBoard:p.dailyBoard,laPlaces:p.places,laNoise:p.noise,laBoardInfo:p.boardInfo,laLastPlaceReset:laDayData('').date})[k];}return Store.data.settings?.[laSettingKey(k)];}

const LA_PLACES=['Lernatelier','Stichgang','Marktplatz','Bibliothek','Input','Coaching'];
const LA_LEVELS=['Hiker','Climber','Free-Climber'];
const LA_DEFAULT_PLACES=['Lernatelier','Input Deutsch','Input Mathematik','Input Englisch','Stichgang','Bibliothek','Marktplatz','WC','Zu Hause','VKL','Chor / Bläserklasse','Sport','Club','SMV','Bäcker','Teamstunde','Coaching','Schülersozialarbeit','LA 3 / Extraraum'];
function laPlaces(room=laSelectedRoom){
 const configured=laGradeSettings('laPlaces')?.[room];
 const names=Array.isArray(configured)&&configured.length?configured:LA_DEFAULT_PLACES;
 const used=laPupils().filter(p=>laRoom(p)===room).map(p=>p.learningPlace).filter(Boolean);
 return [...new Set(['Lernatelier',...names,...used])];
}
function laSavePlaces(){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 const input=document.getElementById('laPlaceEditor');if(!input)return;
 const names=[...new Set(input.value.split(/\n/).map(x=>x.trim()).filter(Boolean))].slice(0,40);
 if(!names.length){alert('Bitte mindestens einen Lernort eingeben.');return;}
 Store.data.settings=Store.data.settings||{};
 Store.data.settings[laSettingKey('laPlaces')]=Store.data.settings[laSettingKey('laPlaces')]||{};
 Store.data.settings[laSettingKey('laPlaces')][laSelectedRoom]=['Lernatelier',...names.filter(x=>x!=='Lernatelier')];
 Store.save('Lernorte aktualisiert',{room:laSelectedRoom});laPublishSharedSettings().catch(e=>alert('Lernatelier-Cloud nicht aktualisiert: '+e.message));render();
}

let laSelectedRoom='LA 1';
const LA_KIOSK_LOCK_KEY='kompass_la_kiosk_lock_v1';
function laKioskLocked(){try{return localStorage.getItem(LA_KIOSK_LOCK_KEY)==='1';}catch(e){return true;}}
function laSetKioskLock(locked){if(locked)localStorage.setItem(LA_KIOSK_LOCK_KEY,'1');else localStorage.removeItem(LA_KIOSK_LOCK_KEY);}
let laViewMode=laKioskLocked()?'student':'teacher';
let laPreviewPupilId='';
function laPupils(){if(Auth.isLernatelier())return (laLimitedRows[laGrade]||[]).filter(p=>!p.archived);return (Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===laGrade);}
function laRoom(p){return LA_ROOMS.includes(p.learningAtelier)?p.learningAtelier:'';}
function laSafeId(id){return esc(String(id));}
async function laUpdate(id,key,value){
  if(!Auth.canLead(laGrade)&&!Auth.isAdmin()){toast('Nur Stufenleitung darf diese Zuordnung ändern.');return;}
  const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
  if(key==='learningAtelier'&&!LA_ROOMS.includes(value))return;
  if(key==='graduation'&&!LA_LEVELS.includes(value))return;
  if(key==='learningPlace'&&!laPlaces(laRoom(p)).includes(value))return;
  if(key==='learningPlace'){
  try{await laTeacherCloudChange(id,'place',value);}catch(e){alert('Lernort nicht gespeichert: '+e.message);return;}
 }
 p[key]=value;Store.save();render();
}
function laAssignUnassigned(room){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 if(!LA_ROOMS.includes(room))return;
 const pupils=laPupils().filter(p=>!laRoom(p));
 if(!pupils.length){toast('Alle SuS sind bereits zugeordnet.');return;}
 if(!confirm(pupils.length+' noch nicht zugeordnete SuS aus Stufe 6 in '+room+' eintragen? Bestehende Zuordnungen bleiben erhalten.'))return;
 pupils.forEach(p=>p.learningAtelier=room);
 Store.save('Lernatelier-Sammelzuordnung',{room,count:pupils.length});
 laSelectedRoom=room;render();
}
function laNoise(room,value){
  if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
  if(!LA_ROOMS.includes(room)||!['green','yellow','red'].includes(value))return;
  Store.data.settings=Store.data.settings||{};
  Store.data.settings[laSettingKey('laNoise')]=Store.data.settings[laSettingKey('laNoise')]||{};
  Store.data.settings[laSettingKey('laNoise')][room]=value;
  Store.save();render();
}

async function laTeacherRefresh(){
 if(!Sync.enabled())return;
 try{await Sync.overlayLernatelier(Auth.allowedGrades(),Store.data);render();toast('Lernatelier aktualisiert');}
 catch(e){alert('Aktualisierung fehlgeschlagen: '+(e.message||String(e)));}
}
async function laTeacherCloudChange(id,action,value){
 if(Auth.session?.mode!=='cloud'||!Auth.cloudClient)return;
 const {error}=await Auth.cloudClient.rpc('kompass_la_change',{
  p_grade:laGrade,p_pupil_id:String(id),p_action:action,
  p_value:value==null?null:String(value)
 });
 if(error)throw error;
}
async function laRequestPlace(id,place){
 if(!Auth.canAccessGrade(laGrade)||!laPlaces(laSelectedRoom).includes(place)||place==='Lernatelier')return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p||!laRoom(p))return;
 try{await laTeacherCloudChange(id,'request',place);}catch(e){alert('Anfrage nicht gespeichert: '+e.message);return;}
 p.laRequest={place,status:'pending',at:new Date().toISOString()};
 Store.save('Lernort-Anfrage erstellt',{pupilId:p.id,place});render();
}
async function laAnswerRequest(id,yes){
 if(!Auth.canAccessGrade(laGrade))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p||p.laRequest?.status!=='pending')return;
 const place=p.laRequest.place;
 try{await laTeacherCloudChange(id,yes?'approve':'deny',null);}catch(e){alert('Entscheidung nicht gespeichert: '+e.message);return;}
 p.laRequest={...p.laRequest,status:yes?'approved':'denied',decidedAt:new Date().toISOString()};
 if(yes)p.learningPlace=place;
 Store.save('Lernort-Anfrage entschieden',{pupilId:p.id,approved:yes});render();
}
async function laSetHelp(id,enabled){
 if(Auth.isLernatelier()){laLimitedAction(id,'help',String(!!enabled));return;}
 if(!Auth.canAccessGrade(laGrade))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 try{await laTeacherCloudChange(id,'help',String(!!enabled));}catch(e){alert('Hilfehand nicht gespeichert: '+e.message);return;}
 p.laNeedsHelp=!!enabled;Store.save('Hilfehand geändert',{pupilId:p.id});render();
}

function laEnterStudentKiosk(){try{laSetKioskLock(true);laViewMode='student';State.view='learningAtelier';render();}catch(e){alert('Schülermodus konnte nicht gesichert werden.');}}
function laToggleExitPassword(visible){const input=document.getElementById('laExitPassword');if(input)input.type=visible?'text':'password';}
function laCloseExitDialog(){
 const dialog=document.getElementById('laExitDialog');
 if(dialog)dialog.remove();
}
function laExitStudentPreview(){
 if(Auth.isLernatelier()){laLimitedTeacher();return;}
 const user=Auth.currentUser();
 if(!user)return;
 if(Auth.session?.mode!=='cloud'){alert('Die geschützte Rückkehr benötigt ein Cloud-Lehrkraftkonto.');return;}
 if(document.getElementById('laExitDialog'))return;
 const overlay=document.createElement('div');
 overlay.id='laExitDialog';
 overlay.className='laExitOverlay';
 overlay.innerHTML='<form class="laExitCard" onsubmit="laConfirmExitStudentPreview(event)"><h2>🔒 Lehrkraftmodus</h2><p>Bitte bestätige dein KOMPASS-Passwort.</p><label for="laExitUsername">Schul-E-Mail</label><input id="laExitUsername" type="email" autocomplete="username" readonly value="'+esc(user.username||'')+'"><label for="laExitPassword">Passwort</label><input id="laExitPassword" type="password" autocomplete="current-password" required><label class="laExitShow"><input id="laExitShowPassword" type="checkbox" onchange="laToggleExitPassword(this.checked)"><span>Passwort anzeigen</span></label><p id="laExitError" class="loginError" role="alert"></p><div class="laExitActions"><button class="chip" type="button" onclick="laCloseExitDialog()">Abbrechen</button><button class="chip dark" type="submit">Lehrkraftmodus öffnen</button></div></form>';
 document.body.appendChild(overlay);
 document.getElementById('laExitPassword')?.focus();
}
async function laConfirmExitStudentPreview(event){
 event.preventDefault();
 const input=document.getElementById('laExitPassword');
 const error=document.getElementById('laExitError');
 const form=document.querySelector('#laExitDialog form');
 if(!input||!form)return;
 const password=input.value;
 const user=Auth.currentUser();
 if(!user||!password)return;
 const submit=form.querySelector('[type="submit"]');
 submit.disabled=true;
 if(error)error.textContent='';
 try{
  const ok=await Auth.verifyCloudPassword(user.username,password);
  if(!ok){if(error)error.textContent='Passwort nicht korrekt. Bitte erneut versuchen.';return;}
  laCloseExitDialog();
  laSetKioskLock(false);laViewMode='teacher';laPreviewPupilId='';State.view='dashboard';render();
 }catch(e){if(error)error.textContent='Überprüfung fehlgeschlagen: '+(e?.message||String(e));}
 finally{if(submit.isConnected)submit.disabled=false;input.value='';}
}

let laBoardSelectedId='';
let laStudentTab='news';
async function laBoardMove(id,place){
 if(Auth.isLernatelier()){await laLimitedAction(id,'request',place);laBoardSelectedId='';return;}
 if(!Auth.canAccessGrade(laGrade)||!laPlaces(laSelectedRoom).includes(place))return;
 const p=laPupils().find(x=>String(x.id)===String(id));
 if(!p||laRoom(p)!==laSelectedRoom)return;
 // Write the same learning-place change to the isolated shared LA state first.
 try{await laTeacherCloudChange(id,'place',place);}catch(e){alert('Lernort nicht synchronisiert: '+e.message);return;}
 p.learningPlace=place;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings[laSettingKey('laLastPlaceReset')]=laDayData('').date;
 p.laRequest=null;
 Store.save('Standorttafel: Lernort gewechselt',{pupilId:p.id,place});
 laBoardSelectedId='';render();
}
function laSaveRoomInfo(){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 const star=laGradeSettings('laBoardInfo')?.[laSelectedRoom]?.star||'';
 const duties=document.getElementById('laDutiesEdit')?.value||'';
 Store.data.settings=Store.data.settings||{};
 Store.data.settings[laSettingKey('laBoardInfo')]=Store.data.settings[laSettingKey('laBoardInfo')]||{};
 Store.data.settings[laSettingKey('laBoardInfo')][laSelectedRoom]={star:star.slice(0,150),duties:duties.slice(0,500)};
 Store.save('Teamstar und Dienste gespeichert',{room:laSelectedRoom});render();
}
function laSetRoomInfo(kind,value){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 if(!LA_ROOMS.includes(laSelectedRoom)||!['duties','star'].includes(kind))return;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings[laSettingKey('laBoardInfo')]=Store.data.settings[laSettingKey('laBoardInfo')]||{};
 const info=Store.data.settings[laSettingKey('laBoardInfo')][laSelectedRoom]||{duties:'',star:''};
 info[kind]=String(value||'').slice(0,500);
 Store.data.settings[laSettingKey('laBoardInfo')][laSelectedRoom]=info;
 Store.save('Lernatelier-Tafel aktualisiert',{room:laSelectedRoom,kind});render();
}
const LA_STAR_SUBJECTS=[['en','Englisch','red'],['de','Deutsch','yellow'],['ma','Mathematik','blue']];
function laStars(p){return Array.isArray(p.laStars)?p.laStars:[];}
function laToggleStar(id,subject){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 if(!LA_STAR_SUBJECTS.some(x=>x[0]===subject))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 const old=laStars(p);
 p.laStars=old.includes(subject)?old.filter(x=>x!==subject):[...old,subject];
 Store.save('Fach-Teamstar geändert',{pupilId:p.id,subject});render();
}
const LA_DUTIES=[['broom','🧹','Besen'],['book','📖','Buch'],['hall','🚪','Flur'],['trash','🗑️','Mülleimer']];
function laWeekKey(date=new Date()){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();const jan=new Date(Date.UTC(year,0,1));return year+'-W'+String(Math.ceil((((d-jan)/86400000)+1)/7)).padStart(2,'0');}
function laDutyHistory(){return laGradeSettings('laDutyHistory')||{};}
function laDutyCount(id,duty){return Object.values(laDutyHistory()).filter(w=>w&&w.assignments&&w.assignments[String(id)]?.includes(duty)).length;}
function laDuties(p){return Array.isArray(p.laDuties)?p.laDuties:[];}
function laEnsureWeeklyDuties(){
 const week=laWeekKey(),settings=Store.data.settings||(Store.data.settings={});
 settings[laSettingKey('laDutyHistory')]=settings[laSettingKey('laDutyHistory')]||{};
 if(settings[laSettingKey('laDutyHistory')][week])return;
 if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return;
 const assignments={};
 for(const room of LA_ROOMS){
  const pupils=laPupils().filter(p=>laRoom(p)===room);
  const used=new Set();
  for(const [duty] of LA_DUTIES){
   const chosenTeams=new Set();
   for(let slot=0;slot<3;slot++){
    const candidates=pupils.filter(p=>!used.has(String(p.id))&&!chosenTeams.has(String(p.team||''))).sort((a,b)=>laDutyCount(a.id,duty)-laDutyCount(b.id,duty)||Object.values(laDutyHistory()).filter(w=>w.assignments?.[String(a.id)]?.length).length-Object.values(laDutyHistory()).filter(w=>w.assignments?.[String(b.id)]?.length).length||String(a.id).localeCompare(String(b.id)));
    const chosen=candidates[0];if(!chosen)break;
    used.add(String(chosen.id));chosenTeams.add(String(chosen.team||''));assignments[String(chosen.id)]=[duty];
   }
  }
 }
 settings[laSettingKey('laDutyHistory')][week]={createdAt:new Date().toISOString(),assignments};
 for(const p of laPupils())p.laDuties=assignments[String(p.id)]||[];
 Store.save('Wöchentliche Dienste automatisch eingeteilt',{week});
}
function laToggleDuty(id,duty){
 if(!Auth.canLead(laGrade)&&!Auth.isAdmin())return;
 if(!LA_DUTIES.some(x=>x[0]===duty))return;
 laEnsureWeeklyDuties();
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 const week=laWeekKey(),history=Store.data.settings[laSettingKey('laDutyHistory')];
 const old=laDuties(p),adding=!old.includes(duty);
 if(adding){const others=laPupils().filter(x=>laRoom(x)===laRoom(p)&&String(x.id)!==String(id)&&laDuties(x).includes(duty));if(others.length>=3&&!confirm('Für diesen Dienst sind bereits drei Kinder eingeteilt. Trotzdem hinzufügen?'))return;if(others.some(x=>String(x.team||'')===String(p.team||''))&&!confirm('Ein Kind aus demselben Farbteam ist bereits eingeteilt. Trotzdem hinzufügen?'))return;}
 if(adding&&laDutyCount(id,duty)>=2&&!confirm((p.short||p.first)+' hatte diesen Dienst bereits '+laDutyCount(id,duty)+'-mal. Trotzdem einteilen?'))return;
 p.laDuties=adding?[...old,duty]:old.filter(x=>x!==duty);
 history[week]=history[week]||{createdAt:new Date().toISOString(),assignments:{}};
 history[week].assignments[String(id)]=p.laDuties.slice();
 Store.save('Lernatelier-Dienst geändert',{pupilId:p.id,duty,week});render();
}
function laDutyOverview(){
 if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return '';
 const room=laSelectedRoom,people=laPupils().filter(p=>laRoom(p)===room);
 return '<div class="card"><h2>🧹 Wochendienste · '+esc(room)+' · '+esc(laWeekKey())+'</h2><p class="mini">Wird beim ersten Aufruf in einer neuen Kalenderwoche automatisch eingeteilt. Pro Dienst werden drei Kinder aus unterschiedlichen Farbteams vorgeschlagen. Falls nicht genügend Kinder verfügbar sind, bleiben Plätze offen. Manuelle Änderungen sind in der Tabelle möglich.</p><div class="laTodayItems">'+LA_DUTIES.map(([id,icon,label])=>{const assigned=people.filter(p=>laDuties(p).includes(id));return '<div class="laTodayItem"><b>'+icon+' '+esc(label)+'</b><span>'+(assigned.length?assigned.map(p=>esc(p.short||p.first)+' (bisher '+laDutyCount(p.id,id)+'×)').join(', '):'Noch niemand eingeteilt')+'</span></div>';}).join('')+'</div></div>';
}
function laInitDrag(){
 const root=document.querySelector('.laKioskBoard');if(!root)return;
 let drag=null;
 root.querySelectorAll('.laPublicName[data-pupil]').forEach(node=>{
  node.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   drag={id:node.dataset.pupil,x:e.clientX,y:e.clientY,node,active:false,pointer:e.pointerId};
   try{node.setPointerCapture(e.pointerId)}catch(_){}
  });
  node.addEventListener('pointermove',e=>{
   if(!drag||drag.pointer!==e.pointerId||drag.node!==node)return;
   if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9){
    drag.active=true;node.classList.add('laDragging');root.classList.add('laIsDragging');
   }
   if(drag.active){
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.laPublicPlace[data-place]');
    root.querySelectorAll('.laPublicPlace').forEach(el=>el.classList.toggle('laDropTarget',el===target));
   }
  });
  node.addEventListener('pointerup',e=>{
   if(!drag||drag.pointer!==e.pointerId||drag.node!==node)return;
   const wasDrag=drag.active,id=drag.id;
   const target=wasDrag?document.elementFromPoint(e.clientX,e.clientY)?.closest('.laPublicPlace[data-place]'):null;
   drag=null;node.classList.remove('laDragging');root.classList.remove('laIsDragging');
   root.querySelectorAll('.laDropTarget').forEach(el=>el.classList.remove('laDropTarget'));
   if(wasDrag){
    node.dataset.dragHandled='yes';
    if(target)laBoardMove(id,target.dataset.place);
    else {laBoardSelectedId=id;render();}
   }
  });
  node.addEventListener('pointercancel',()=>{drag=null;node.classList.remove('laDragging');root.classList.remove('laIsDragging');});
 });
}
function laSelectBoardPupil(id,node){
 if(node?.dataset.dragHandled==='yes'){delete node.dataset.dragHandled;return;}
 laBoardSelectedId=id;render();
}

// Schulweite Tagesübersicht (zunächst ohne unbestätigte Echtzeitdaten).
const LA_DAY_OFFERS={
  1:[['5.','IT-Studio','Juliane Schöne','vor den Computerräumen'],['5.','Koch- und Nähstudio','Nina Kreuzberger','neben Aquarium links'],['5.','Kunstatelier','Anja Peschel','Fundbüro'],['5.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['5.','Schulgarten','Antonios Anastasatos','Treppe zur großen Schulstraße'],['5.','Sportangebot Heimbacher Hof','Anja Hoffmann','Glastür Stichgang Stufe 6/7'],['5.','Technikwerkstatt','Jan-Lukas Richter','Treppe zum 5er-Nest'],['5.','Musik – eigenständiges Üben','Friedrich Mück',''],['6.','Koch- und Nähstudio','Nina Kreuzberger','neben Aquarium links'],['6.','Kunstatelier','Anja Peschel','Fundbüro'],['6.','Musikatelier','Miriam Bay','Busausgang / Elterntaxi'],['6.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['6.','Schulgarten','Antonios Anastasatos','Treppe zur großen Schulstraße'],['6.','Technikwerkstatt','Jan-Lukas Richter','Treppe zum 5er-Nest']],
  2:[['5.','IT-Studio','Michael Feil','vor den Computerräumen'],['5.','Koch- und Nähstudio','Nina Kreuzberger','neben Aquarium links'],['5.','Kunstatelier','Julia Bachmair Neu','Fundbüro'],['5.','Musikatelier','Tobias Karpf','Busausgang / Elterntaxi'],['5.','Musik – eigenständiges Üben','Friedrich Mück',''],['5.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['5.','Schulgarten','Nicole Oursin','Treppe zur großen Schulstraße'],['5.','Sportangebot','Robin Steinle','vor Glastür Stichgang 6/7'],['5.','Technikwerkstatt','Marie Lang','Treppe zum 5er-Nest'],['6.','Koch- und Nähstudio','Nina Kreuzberger','neben Aquarium links'],['6.','Kunstatelier','Julia Bachmair Neu','Fundbüro'],['6.','Musikatelier','Tobias Karpf','Busausgang / Elterntaxi'],['6.','Musik – eigenständiges Üben','Friedrich Mück',''],['6.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['6.','Schulgarten','Nicole Oursin','Treppe zur großen Schulstraße'],['6.','Sportangebot','Robin Steinle','vor Glastür Stichgang 6/7'],['6.','Technikwerkstatt','Marie Lang','Treppe zum 5er-Nest']],
  3:[['5.','IT-Studio','Jörg Vogt','vor den Computerräumen'],['5.','Kunstatelier','Maria Kasatkin','Fundbüro'],['5.','Musikatelier','Friedrich Mück','Busausgang / Elterntaxi'],['5.','Musik – eigenständiges Üben','Friedrich Mück',''],['5.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['5.','Schulgarten','Nicole Oursin','Treppe zur großen Schulstraße'],['5.','Sportangebot','Robin Steinle','vor Glastür Stichgang 6/7'],['5.','Technikwerkstatt','Marie Lang','Treppe zum 5er-Nest'],['6.','IT-Studio','Jörg Vogt','vor den Computerräumen'],['6.','Kunstatelier','Maria Kasatkin','Fundbüro'],['6.','Musikatelier','Friedrich Mück','Busausgang / Elterntaxi'],['6.','Naturwissenschaftliches Labor','Dagmar Zwilling','neben Aquarium rechts'],['6.','Schulgarten','Nicole Oursin','Treppe zur großen Schulstraße'],['6.','Sportangebot','Robin Steinle','vor Glastür Stichgang 6/7'],['6.','Technikwerkstatt','Marie Lang','Treppe zum 5er-Nest']],
  4:[['5.','Kunstatelier','Maria Kasatkin','vor dem Sekretariat'],['5.','Musik – eigenständiges Üben','Friedrich Mück',''],['5.','Sportangebot','Robin Steinle','Stichgang 6/7']],
  5:[['5.','Kunstatelier','Maria Kasatkin','vor dem Sekretariat'],['5.','Musik – eigenständiges Üben','Friedrich Mück',''],['5.','Schulgarten','Melanie Schnepf','Treppe 6-/7-Stichgang'],['5.','Sportangebot','Robin Steinle','Stichgang 6/7']]
};
const LA_SPORT_OFFERS={1:[['2.','Tischtennis und Ballspiele','Pavlos Moraintinis','Foyer vor Sporthalle 1'],['3.','Tischtennis und Ballspiele','Pavlos Moraintinis','Foyer vor Sporthalle 1']],3:[['3.–4.','Turnen','Robin Steinle','Foyer Sporthalle']],5:[['3.','Tischtennis und Ballspiele','Pavlos Moraintinis','Halle 1'],['4.','Turnen','Robin Steinle','Foyer Sporthalle']]};
const LA_FLEX_SCHEDULE=[
 // [weekday, hour, subject, topic, teacher, room, teams] – 29.09.–23.10.2026
 [1,'3.','Mathematik','Parallelen & Senkrechten','Viet','10b','(Violett), Rot'],
 [1,'4.','Mathematik','Schriftliche Division in kleinen Schritten','Schnepf','','(Blau), Grün, Rot'],
 [1,'3.','Englisch','Thema noch festlegen','Tsehaye','10a','Rot, Violett'],
 [2,'3.','Mathematik','Parallelen & Senkrechten','Viet','OS 2','Grün, Rot'],
 [2,'4.','Mathematik','Uhrzeit & Zeitspannen','Bay','OS 2','(Blau), (Violett), (Gelb)'],
 [2,'3.','Deutsch','QUOP / FLINK','Oursin','OS 1','Rot, Grün'],
 [2,'4.','Deutsch','QUOP / FLINK','Bachmair','OS 1','(Blau), (Gelb), (Violett)'],
 [3,'3.','Mathematik','Schriftliche Subtraktion','Moser','Nawi 2','Blau, Violett, Gelb, (Grün), (Rot)'],
 [3,'2.','Deutsch','QUOP / FLINK','Vogt','Sprachenraum','(Blau), Gelb, (Violett), Grün, Rot'],
 [3,'4.','Deutsch','QUOP / FLINK','Brusda','9b','Blau, (Rot), Gelb, Violett, (Grün)'],
 [3,'2.','Englisch','Story Time – Geschichten lesen und schreiben','Schöne','Flexraum','(Blau), Rot, Gelb, (Violett), Grün'],
 [3,'4.','Englisch','Thema noch festlegen','Tsehaye','9a','Blau, (Rot), Gelb, Violett, (Grün)'],
 [4,'4.','Mathematik','Uhrzeit & Zeitspannen','Bay','9a','Grün'],
 [4,'3.','Deutsch','QUOP / FLINK','Oursin','9a','Rot'],
 [4,'4.','Englisch','Sketches & Board Games – Grammatik & Verständigung','Zwilling','9b','Blau, (Rot), Gelb, Violett, (Grün)'],
 [5,'4.','Mathematik','Schriftliche Subtraktion','Moser','9a','Blau, (Grün), Gelb, (Rot)'],
 [5,'3.','Mathematik','Schriftliche Division in kleinen Schritten','Viet','Matheraum','Violett, Gelb'],
 [5,'2.','Mathematik','Runden & Überschlagen','Moser','Flexraum','Blau, Grün, Violett, Gelb, Rot'],
 [5,'5.','Englisch','Thema noch festlegen','Tsehaye','OS 2','Blau, Gelb, Grün, Violett, Rot']
];
function laFlexForDate(d){
 if(d.date<'2026-09-29'||d.date>'2026-10-23')return [];
 return LA_FLEX_SCHEDULE.filter(x=>x[0]===d.day).sort((a,b)=>parseInt(a[1])-parseInt(b[1])||a[2].localeCompare(b[2],'de')).map(x=>[x[1],x[2]+' · '+x[3],x[4],x[5],x[6]]);
}
let laBoardDate='';
function laDayData(date=laBoardDate){const d=date?new Date(date+'T12:00:00'):new Date(), day=d.getDay();return {day,date:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),label:d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};}
function laMoveBoardDay(n){const d=laDayData(),next=new Date(d.date+'T12:00:00');next.setDate(next.getDate()+n);laBoardDate=[next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');render();}
const LA_MOTIVATION_QUOTES=[
'Jeder kleine Schritt bringt dich weiter.',
'Du musst nicht alles können. Du darfst alles lernen.',
'Fehler zeigen, dass du etwas ausprobierst.',
'Heute ist eine neue Chance, etwas zu entdecken.',
'Deine Ideen sind wichtig.',
'Mut bedeutet, es trotzdem zu versuchen.',
'Gemeinsam schaffen wir mehr.',
'Frag nach, wenn du etwas nicht verstehst.',
'Übung macht dich jeden Tag ein Stück sicherer.',
'Du kannst stolz auf deinen Fortschritt sein.',
'Neugier ist der Anfang von etwas Großem.',
'Ein guter Anfang muss nicht perfekt sein.',
'Gib dir Zeit. Lernen braucht Geduld.',
'Ein freundliches Wort kann viel verändern.',
'Heute zählt, was du ausprobierst.',
'Dein Tempo ist in Ordnung.',
'Es lohnt sich, dranzubleiben.',
'Du darfst um Hilfe bitten.',
'Manchmal ist ein neuer Versuch der beste Weg.',
'Sei mutig und stell deine Fragen.'
];
function laMotivationForDate(date){let hash=0;for(const c of date)hash=(hash*31+c.charCodeAt(0))>>>0;return LA_MOTIVATION_QUOTES[hash%LA_MOTIVATION_QUOTES.length];}
function laTeacherShort(name){
 const known={Viet:'H. Vietinghoff',Schnepf:'M. Schnepf',Tsehaye:'R. Tsehaye',Bay:'M. Bay',Oursin:'N. Oursin',Bachmair:'J. Bachmair',Moser:'M. Moser',Vogt:'J. Vogt',Brusda:'P. Brusda',Zwilling:'D. Zwilling',Schöne:'J. Schöne'};
 if(known[name])return known[name];
 const parts=String(name||'').trim().split(/\s+/);
 if(parts.length<2)return name;
 return parts[0].charAt(0)+'. '+parts.slice(1).join(' ');
}
function laMergeConsecutiveOffers(items){
 const groups=new Map();
 for(const item of items){
  const hour=String(item[0]||'').replace(/\.$/,'');
  const key=JSON.stringify(item.slice(1));
  if(!groups.has(key))groups.set(key,{item:[...item],hours:new Set()});
  groups.get(key).hours.add(hour);
 }
 return [...groups.values()].map(({item,hours})=>{
  if(hours.has('5')&&hours.has('6'))item[0]='5. & 6.';
  return item;
 }).sort((a,b)=>parseInt(a[0])-parseInt(b[0])||String(a[1]).localeCompare(String(b[1]),'de'));
}
function laTodayBoard(){
 const d=laDayData();const config=laGradeSettings('laDailyBoard')||{};
 const current=config[d.date]||{};const published=current.published===true;
 const events=(Store.calendarEvents||[]).filter(e=>e.date<=d.date&&d.date<=(e.endDate||e.date)&&(!e.grade||e.grade==='all'||Number(e.grade)===laGrade)&&(!e.visibility||e.visibility==='all'||e.visibility==='students'));
 const list=(items,isFlex=false)=>items.length?'<div class="laTodayItems">'+items.map(x=>'<div class="laTodayItem"><b>'+esc(x[0])+' Std. · '+esc(x[1])+'</b><span>'+esc(laTeacherShort(x[2]))+(x[3]?(isFlex?' · Raum: ':' · Treff: ')+esc(x[3]):'')+(isFlex&&x[4]?'<br>Teams: '+esc(x[4]):'')+'</span></div>').join('')+'</div>':'<p class="mini">Keine Angebote eingetragen.</p>';
 const flex=laGrade===6?laFlexForDate(d):[];
 const notes=published?String(current.notes||'').trim():'';
 const news=published?String(current.news||'').trim():'';
 const motivation=published&&String(current.motivation||'').trim()?String(current.motivation).trim():laMotivationForDate(d.date);
 return '<section class="laTodayBoard"><div class="laTodayHeading"><h2>☀️ Heute bei uns</h2><span>'+esc(d.label)+'</span></div>'+
 '<div class="laMotivation"><div class="laMotivationEyebrow">✨ Dein Gedanke für heute</div><div class="laMotivationQuote">'+esc(motivation)+'</div></div><div class="laTodayGrid laTodayMasonry">'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📅 Aus dem Kalender</h3>'+(events.length?'<div class="laTodayItems">'+events.map(e=>'<div class="laTodayItem"><b>'+esc((e.time?e.time+' · ':'')+e.title)+'</b><span>'+esc(e.location||'')+'</span></div>').join('')+'</div>':'<p class="mini">Keine Kalendereinträge für diesen Tag.</p>')+'</div>'+
 '<div class="laTodaySection"><h3>🏀 Weitere Sportangebote</h3>'+list(laMergeConsecutiveOffers(laGrade===6?(LA_SPORT_OFFERS[d.day]||[]):[]))+'</div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📣 Infos & Vertretungen</h3><p>'+(notes?esc(notes).replace(/\n/g,'<br>'):'Heute sind noch keine Änderungen veröffentlicht.')+'</p></div>'+
 '<div class="laTodaySection"><h3>🌍 Neues aus der Welt</h3><p>'+(news?esc(news).replace(/\n/g,'<br>'):'Noch keine geprüfte Nachricht veröffentlicht.')+'</p></div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>🎨 Kreativband</h3>'+list(laMergeConsecutiveOffers(LA_DAY_OFFERS[d.day]||[]))+'</div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📘 Flexstunden</h3>'+list(flex,true)+'</div></div></div>'+
 (published&&current.updatedAt?'<p class="mini">Zuletzt aktualisiert: '+esc(new Date(current.updatedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))+'</p>':'')+'</section>';
}
function laEditDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return;
 const d=laDayData(),entry=laGradeSettings('laDailyBoard')?.[d.date]||{};
 State.dialog={mode:'laDailyBoard',date:d.date};renderDialog();
}
async function laPublishSharedSettings(){
 if(Auth.session?.mode!=='cloud'||!Auth.cloudClient)return;
 const settings=Store.data.settings||{};
 const grade=laGrade;
 const suffix=grade===6?'':'Grade'+grade;
 const dailyBoard=settings['laDailyBoard'+suffix]||{};
 const places=settings['laPlaces'+suffix]||{};
 const noise=settings['laNoise'+suffix]||{};
 const calendar=(Store.calendarEvents||[]).filter(e=>
  (!e.grade||e.grade==='all'||Number(e.grade)===grade)&&
  (!e.visibility||e.visibility==='all'||e.visibility==='students')
 ).map(e=>({date:e.date,endDate:e.endDate||e.date,title:e.title,time:e.time||'',location:e.location||''}));
 const {error}=await Auth.cloudClient.rpc('kompass_la_publish',{
  p_grade:grade,p_daily_board:dailyBoard,p_places:places,p_noise:noise,p_calendar:calendar
 });
 if(error)throw error;
}
function laSaveDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return;
 const date=laDayData().date;if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings[laSettingKey('laDailyBoard')]=Store.data.settings[laSettingKey('laDailyBoard')]||{};
 Store.data.settings[laSettingKey('laDailyBoard')][date]={notes:document.getElementById('laDailyNotes')?.value||'',news:document.getElementById('laDailyNews')?.value||'',motivation:document.getElementById('laDailyMotivation')?.value||'',published:!!document.getElementById('laDailyPublish')?.checked,updatedAt:new Date().toISOString()};
 Store.save('Tagesübersicht gespeichert',{date});laPublishSharedSettings().catch(e=>alert('Lernatelier-Cloud nicht aktualisiert: '+e.message));State.dialog=null;render();
}

function laDailyEditor(){if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return '';const d=laDayData(),x=laGradeSettings('laDailyBoard')?.[d.date]||{};return '<div class="card"><h2>☀️ Tagesübersicht vorbereiten</h2><label>Datum auswählen</label><input type="date" value="'+esc(d.date)+'" onchange="laBoardDate=this.value;render()"><p class="mini">Du kannst beliebige zukünftige Tage vorbereiten. Die Veröffentlichung gilt nur für das gewählte Datum.</p><label>Hinweise und Vertretungen (nur für Schüler freigegebene Inhalte)</label><textarea id="laDailyNotes" rows="5">'+esc(x.notes||'')+'</textarea><label>Geprüfte Weltnachricht (mit Quelle)</label><textarea id="laDailyNews" rows="4">'+esc(x.news||'')+'</textarea><label>Motivationsspruch des Tages (optional – sonst automatisch)</label><textarea id="laDailyMotivation" rows="2">'+esc(x.motivation||'')+'</textarea><label class="check"><input type="checkbox" id="laDailyPublish" '+(x.published?'checked':'')+'> Für alle Lernateliers veröffentlichen</label><button class="chip dark" onclick="laSaveDailyBoard()">Tagesübersicht speichern</button></div>';}
function laResetLearningPlacesDaily(){
 const today=laDayData('').date;
 const settings=Store.data.settings||(Store.data.settings={});
 // Nur die Stufenleitung führt den täglichen Cloud-Reset durch.
 // Die Schülertafel zeigt veraltete Lernorte unabhängig davon nicht an.
 if(settings[laSettingKey('laLastPlaceReset')]===today)return;
 if(!Auth.isAdmin()&&!Auth.canLead(laGrade))return;
 for(const p of laPupils()){p.learningPlace='Lernatelier';p.laRequest=null;}
 settings[laSettingKey('laLastPlaceReset')]=today;
 Store.save('Täglicher Neustart der Lernorte',{date:today});
}
function laCurrentPlace(p){
 const today=laDayData('').date;
 return laGradeSettings('laLastPlaceReset')===today?(p.learningPlace||'Lernatelier'):'Lernatelier';
}
function laStudentPupilCard(p,selectedId,onSelect){
 const id=encodeURIComponent(String(p.id)).replace(/'/g,'%27');
 return '<button type="button" class="laPublicName '+(String(p.id)===String(selectedId)?'laChosen':'')+'" data-pupil="'+esc(String(p.id))+'" onclick="'+onSelect+'(decodeURIComponent(\''+id+'\')'+(onSelect==='laSelectBoardPupil'?',this':'')+')"><span class="laPupilStars">'+LA_STAR_SUBJECTS.filter(x=>laStars(p).includes(x[0])).map(x=>'<span class="laStar laStar-'+x[2]+'" title="Teamstar '+esc(x[1])+'">★</span>').join('')+'</span><span class="laNameLine"><span class="dot '+teamColor(p.team)+'"></span><span>'+esc(p.short||p.first+' '+p.last)+'</span>'+(p.laNeedsHelp?' <span title="Braucht Hilfe">✋</span>':'')+LA_DUTIES.filter(x=>laDuties(p).includes(x[0])).map(x=>'<span title="'+esc(x[2])+'">'+x[1]+'</span>').join('')+'</span></button>';
}
function laStudentPreview(){
 if(!Auth.canAccessGrade(laGrade))return;
 if(!Auth.isLernatelier())laResetLearningPlacesDaily();
 const all=laPupils();
 if(!all.some(p=>laRoom(p)===laSelectedRoom)){
  const first=LA_ROOMS.find(room=>all.some(p=>laRoom(p)===room));if(first)laSelectedRoom=first;
 }
 const pupils=all.filter(p=>laRoom(p)===laSelectedRoom).sort((a,b)=>String(a.first||a.short||'').localeCompare(String(b.first||b.short||''),'de'));
 const selected=pupils.find(p=>String(p.id)===String(laBoardSelectedId));
 const noise=laGradeSettings('laNoise')?.[laSelectedRoom]||'green';
 const noiseData={green:['🟢','Leise sprechen'],yellow:['🟡','Flüstern'],red:['🔴','Ruhe']}[noise];
 const info=laGradeSettings('laBoardInfo')?.[laSelectedRoom]||{};
 let html=laGradeTabs()+'<div class="laBoardTop"><div><div class="mini">KOMPASS · Jahrgang '+laGrade+'</div><h1>'+ (laStudentTab==='news'?'📰 News':'🏫 '+esc(laSelectedRoom))+'</h1></div><div class="laTopActions">'+(laStudentTab==='news'?'':'<div class="laCompactNoise">'+noiseData[0]+' '+noiseData[1]+'</div>')+'<button class="chip" onclick="laExitStudentPreview()">🔒 Lehrkraftmodus</button></div></div>';
 html+='<div class="laRoomSwitcher laMainTabs"><button class="chip '+(laStudentTab==='news'?'dark':'')+'" onclick="laStudentTab=\'news\';laBoardSelectedId=\'\';render()">📰 News</button>'+LA_ROOMS.map(room=>'<button class="chip '+(laStudentTab==='room'&&room===laSelectedRoom?'dark':'')+'" onclick="laStudentTab=\'room\';laSelectedRoom=\''+room+'\';laBoardSelectedId=\'\';render()">'+room+'</button>').join('')+'</div>';
 if(laStudentTab==='news'){
  const dateNav='<div class="laTodayDateNav"><button class="chip" onclick="laMoveBoardDay(-1)">‹ Vortag</button><button class="chip" onclick="laBoardDate=\'\';render()">Heute</button><button class="chip" onclick="laMoveBoardDay(1)">Nächster Tag ›</button></div>';
  const todayHtml=Auth.isLernatelier()?laLimitedNews():laTodayBoard();
  html+=todayHtml.replace(/(<div class="laTodayHeading">[\s\S]*?<\/span>)(<\/div>)/,'$1'+dateNav+'$2');
  document.getElementById('app').innerHTML='<main class="laStudentFullscreen">'+html+'</main>';
  return;
 }
 html+='<p class="laBoardInstructions">Namen antippen oder mit dem Finger in einen anderen Bereich ziehen.</p>';
 html+='<div class="laPublicBoard laCompactBoard">';
 for(const place of laPlaces()){
  const group=pupils.filter(p=>laCurrentPlace(p)===place);
  html+='<section class="laPublicPlace '+(place==='Lernatelier'?'laHomePlace':'')+' '+(group.length?'laOccupied':'laEmpty')+'" data-place="'+esc(place)+'"><h2>'+esc(place)+' <span>'+group.length+'</span></h2><div class="laPublicNames">';
  html+=group.map(p=>laStudentPupilCard(p,laBoardSelectedId,'laSelectBoardPupil')).join('')||'<p class="mini">Hier ist gerade niemand.</p>';
  html+='</div></section>';
 }
 html+='</div>';
 if(selected){
  const here=laCurrentPlace(selected);
  html+='<div class="laActionPanel" role="dialog" aria-label="Lernort auswählen"><div class="laActionHead"><div><span class="mini">Ausgewählt</span><h2>'+esc(selected.short||selected.first+' '+selected.last)+'</h2><span class="mini">Aktuell: '+esc(here)+'</span></div><button class="chip" onclick="laBoardSelectedId=\'\';render()">✕ Schließen</button></div>';
  html+='<div class="laActionPlaces">'+laPlaces().map(place=>'<button class="laPlaceButton" '+(place===here?'disabled':'')+' onclick="laBoardMove(\''+esc(selected.id)+'\',\''+esc(place)+'\')"><strong>'+esc(place)+'</strong></button>').join('')+'</div>';
  html+='<button class="chip dark laHelpButton" onclick="laSetHelp(\''+esc(selected.id)+'\','+(!selected.laNeedsHelp)+')">'+(selected.laNeedsHelp?'✓ Hilfehand zurücknehmen':'✋ Ich brauche Hilfe')+'</button>';
  html+='</div>';
 }
 html+='<p class="mini laBoardFoot">Vorschau im angemeldeten Lehrkraftkonto. Die Standortwechsel sind hier direkt möglich; gesicherte Schülerzugänge und automatische Bewegungsrechte werden noch entwickelt.</p>';
 document.getElementById('app').innerHTML='<main class="laStudentFullscreen laKioskBoard">'+html+'</main>';
 laInitDrag();
}
async function laRetryCloudPupils(){
 if(!Sync.enabled()){alert('Keine aktive Cloud-Anmeldung. Bitte mit dem Lehrkraftkonto anmelden.');return;}
 try{
  await Sync.pull();
  const count=laPupils().length;
  if(!count)alert('Die Cloud-Synchronisierung ist abgeschlossen, aber für Jahrgang '+laGrade+' wurden keine Schülerdaten geladen. Bitte die Cloud-Berechtigungen und den gespeicherten Jahrgangsbestand prüfen. Es wurden keine Schülerdaten verändert.');
  render();
 }catch(e){alert('Schülerdaten konnten nicht geladen werden: '+(e?.message||String(e))+'\n\nEs wurden keine Schülerdaten verändert.');}
}
let laFindQuery='';
function laFindPupil(value){laFindQuery=String(value||'');const target=document.getElementById('laFindResults');if(target)target.innerHTML=laFindResults();}
function laFindResults(){
 const q=laFindQuery.trim().toLocaleLowerCase('de');
 if(!q)return '<p class="mini">Durchsuche alle drei Lernateliers dieses Jahrgangs.</p>';
 const matches=laPupils().filter(p=>[p.first,p.last,p.short,p.className].some(v=>String(v||'').toLocaleLowerCase('de').includes(q))).sort((a,b)=>String(a.last||'').localeCompare(String(b.last||''),'de')).slice(0,30);
 return matches.length?matches.map(p=>'<div class="laQueue"><div><b>'+esc(p.short||[p.first,p.last].filter(Boolean).join(' '))+'</b><div class="mini">'+esc(laRoom(p)||'Noch keinem LA zugeordnet')+' · '+esc(p.className||'')+'</div></div><span class="statusPill">'+esc(laCurrentPlace(p))+'</span></div>').join(''):'<p class="mini">Keine passenden Schülerinnen oder Schüler gefunden.</p>';
}
function laFindPanel(){return '<div class="card"><h2>🔎 Schüler finden · gesamte Stufe '+laGrade+'</h2><label for="laFindInput">Name suchen – LA 1, LA 2 und LA 3</label><input id="laFindInput" type="search" autocomplete="off" placeholder="Schülername eingeben …" value="'+esc(laFindQuery)+'" oninput="laFindPupil(this.value)"><div id="laFindResults">'+laFindResults()+'</div></div>';}
function learningAtelier(){
  if(!Auth.canAccessGrade(laGrade)&&Auth.allowedGrades().length)laGrade=Auth.allowedGrades()[0];
  if(Auth.canAccessGrade(laGrade)&&laPupils().some(p=>laRoom(p)))laEnsureWeeklyDuties();
  if(Auth.canAccessGrade(laGrade))laResetLearningPlacesDaily();
  if(!Auth.canAccessGrade(laGrade)){shell(header('Lernatelier')+laGradeTabs()+'<div class="card">Kein Zugriff auf Jahrgang '+laGrade+'.</div>');return;}
  if(!laPupils().length){shell(header('Lernatelier')+laGradeTabs()+'<div class="card"><h2>Schülerdaten noch nicht geladen</h2><p>Die Oberfläche ist verfügbar, aber für Jahrgang '+laGrade+' wurden keine Schülerdaten geladen. Bitte nicht neu anlegen oder zurücksetzen.</p><button class="chip dark" onclick="laRetryCloudPupils()">☁️ Schülerdaten erneut aus der Cloud laden</button><p class="mini">Diese Prüfung liest nur Daten. Ein fehlender Cloudbestand wird nicht überschrieben.</p></div>');return;}
  if(laViewMode==='student')return laStudentPreview();
  const all=laPupils(),current=all.filter(p=>laRoom(p)===laSelectedRoom);
  const unknown=all.filter(p=>!laRoom(p));
  const noise=laGradeSettings('laNoise')?.[laSelectedRoom]||'green';
  const can=Auth.canLead(laGrade)||Auth.isAdmin();
  let html=header('Lernatelier','Jahrgang '+laGrade+' · alle Farbteams gemeinsam · Lehrkraftansicht');html+=laGradeTabs();
  html+='<div class="toolbar"><button class="chip dark" onclick="laEnterStudentKiosk()">👩‍🎓 Zur Schülersicht wechseln</button><button class="chip" onclick="laTeacherRefresh()">↻ Cloud aktualisieren</button></div>';
  html+=laFindPanel();html+=laDailyEditor();html+=laDutyOverview();
  html+='<div class="toolbar"><div class="laTabs">'+LA_ROOMS.map(r=>`<button class="chip ${laSelectedRoom===r?'dark':''}" onclick="laSelectedRoom='${r}';laPreviewPupilId='';render()">${r} · ${all.filter(p=>laRoom(p)===r).length}</button>`).join('')+'</div><p class="mini">Die Zuordnung zum Lernatelier bleibt auch bei einem Standortwechsel bestehen.</p></div>';
  if(unknown.length&&can)html+='<div class="card"><b>Sammelzuordnung</b><p class="mini">Noch nicht zugeordnet: '+unknown.length+' SuS aus Stufe '+laGrade+'. Bestehende Lernatelier-Zuordnungen bleiben unverändert.</p><button class="chip dark" onclick="laAssignUnassigned(\'LA 1\')">Alle noch nicht zugeordneten SuS → LA 1</button></div>';
  if(unknown.length)html+='<div class="card"><b>Hinweis: '+unknown.length+' SuS sind noch keinem Lernatelier zugeordnet.</b><p class="mini">Bitte unten im Bereich „Noch keinem Lernatelier zugeordnet“ die Zuordnung vornehmen. Die bisherige Auswahl wurde möglicherweise wegen eines Fehlers nicht gespeichert.</p></div>';
  html+='<div class="card"><h2>📍 Lernorte der Tafel</h2><p class="mini">Ein Standort pro Zeile. Du kannst Lernorte hinzufügen, umbenennen oder aus der Liste entfernen. Bereits belegte Standorte bleiben sichtbar, bis die Kinder umgezogen sind.</p><textarea id="laPlaceEditor" rows="8" '+(can?'':'disabled')+'>'+esc((laGradeSettings('laPlaces')?.[laSelectedRoom]||LA_DEFAULT_PLACES).join('\n'))+'</textarea>'+(can?'<button class="chip dark" onclick="laSavePlaces()">Lernorte speichern</button>':'')+'</div>';
  const boardInfo=laGradeSettings('laBoardInfo')?.[laSelectedRoom]||{};

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
  for(const place of laPlaces()){const ps=current.filter(p=>(p.learningPlace||'Lernatelier')===place);html+=`<div class="card"><h2>${esc(place)} <span class="mini">(${ps.length})</span></h2><div class="laNames">${ps.map(p=>`<span class="laName"><span class="dot ${teamColor(p.team)}"></span>${esc(p.short||p.first+' '+p.last)}</span>`).join('')||'<span class="mini">Niemand eingetragen</span>'}</div></div>`;}
  html+='</div><div class="section">Schülerverwaltung</div>';
  if(!can)html+='<div class="card">Die Zuordnungen und Graduierungen können nur durch die Stufenleitung geändert werden.</div>';
  html+='<div class="card"><div class="laTableWrap"><table class="studentTable"><thead><tr><th>Name</th><th>Team</th><th>⭐ Fach-Teamstar</th><th>🧹 Dienste</th><th>Graduierung</th><th>Standort</th><th>Stamm-LA</th><th>Aktionen</th></tr></thead><tbody>';
  for(const p of current){
    const id=laSafeId(p.id),sel=(key,values,currentValue)=>`<select aria-label="${esc(key)} für ${esc(p.short||p.first)}" ${can?'':'disabled'} onchange="laUpdate('${id}','${key}',this.value)">${values.map(v=>`<option value="${esc(v)}" ${currentValue===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
    html+=`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td><div class="laStarControls">${LA_STAR_SUBJECTS.map(([subject,label,color])=>`<button type="button" class="laStarToggle laStar-${color} ${laStars(p).includes(subject)?'selected':''}" ${can?'':'disabled'} title="Teamstar ${label}" onclick="laToggleStar('${id}','${subject}')">★</button>`).join('')}</div></td><td><div class="laDutyControls">${LA_DUTIES.map(([duty,icon,label])=>`<button type="button" class="laDutyToggle ${laDuties(p).includes(duty)?'selected':''}" ${can?'':'disabled'} title="${label}" onclick="laToggleDuty('${id}','${duty}')">${icon}</button>`).join('')}</div></td><td>${sel('graduation',LA_LEVELS,p.graduation||'Hiker')}</td><td>${sel('learningPlace',laPlaces(laRoom(p)),p.learningPlace||'Lernatelier')}</td><td>${sel('learningAtelier',LA_ROOMS,laRoom(p))}</td><td><select aria-label="Lernort anfragen" onchange="if(this.value)laRequestPlace('${id}',this.value)"><option value="">Anfrage erstellen …</option>${laPlaces().filter(v=>v!=='Lernatelier').map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select><button class="chip" onclick="laSetHelp('${id}',${!p.laNeedsHelp})">${p.laNeedsHelp?'Hilfe erledigt':'✋ Hilfe'}</button></td></tr>`;
  }
  html+='</tbody></table></div></div>';
  if(unknown.length)html+=`<div class="section">Noch keinem Lernatelier zugeordnet · ${unknown.length}</div><div class="card"><p class="mini">Diese SuS sind bereits in Kompass vorhanden und müssen nur einem Lernatelier zugeordnet werden.</p><div class="laTableWrap"><table class="studentTable"><tbody>${unknown.map(p=>`<tr><td>${esc(p.short||p.first+' '+p.last)}</td><td>${esc(p.team||'')}</td><td><select ${can?'':'disabled'} onchange="laUpdate('${laSafeId(p.id)}','learningAtelier',this.value)"><option value="">Bitte wählen</option>${LA_ROOMS.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>`;
  html+='<p class="mini">Erste Ausbaustufe: Die Standortänderung erfolgt durch berechtigte Lehrkräfte. Schüler-Selbstbuchung und digitale Genehmigungen werden erst nach Einrichtung gesicherter Schülerzugänge freigeschaltet.</p>';
  shell(html);
}


/* Restricted account: isolated LA data only. Never load full grade records. */
let laLimitedRows={},laLimitedMode='teacher',laLimitedRoom='LA 1',laLimitedQuery='',laLimitedBusy=false;
let laLimitedPollStarted=false;
let laLimitedPollInFlight=false;
let laLimitedSelectedId='';
let laLimitedTab='room';
let laLimitedPayloads={};
function laLimitedStartPoll(){
 if(laLimitedPollStarted)return;
 laLimitedPollStarted=true;
 setInterval(()=>{
  if(!Auth.isLernatelier()||laLimitedBusy||laLimitedPollInFlight||document.hidden||!Auth.cloudClient)return;
  laLimitedPollInFlight=true;
  const grade=laGrade;
  Auth.cloudClient.from('kompass_lernatelier_state').select('payload').eq('grade',grade).maybeSingle().then(({data,error})=>{
   if(error||!Array.isArray(data?.payload?.pupils))return;
   if(JSON.stringify(laLimitedPayloads[grade])!==JSON.stringify(data.payload)){
    laLimitedRows[grade]=data.payload.pupils;
    laLimitedPayloads[grade]=data.payload;
    if(Auth.isLernatelier()&&grade===laGrade)laLimitedView();
   }
  }).catch(()=>{}).finally(()=>{laLimitedPollInFlight=false;});
 },20000);
}
async function laLoadLimited(grade){
 if(laLimitedBusy)return;
 laLimitedBusy=true;
 try{
   const {data,error}=await Auth.cloudClient.from('kompass_lernatelier_state')
     .select('payload').eq('grade',Number(grade)).maybeSingle();
   if(error)throw error;
   if(!Array.isArray(data?.payload?.pupils))throw new Error('Für diese Stufe fehlen Lernatelier-Daten.');
   laLimitedRows[grade]=data.payload.pupils;
   laLimitedPayloads[grade]=data.payload;
   if(Auth.isLernatelier())laLimitedView();
 }catch(e){
   const root=document.getElementById('app');
   if(root)root.textContent='Lernatelier konnte nicht geladen werden: '+(e.message||String(e));
 }finally{laLimitedBusy=false;}
}
function laLimitedRefresh(){delete laLimitedRows[laGrade];laLimitedView();}
function laLimitedGrade(g){if(!Auth.canAccessGrade(g))return;laGrade=Number(g);laLimitedQuery='';laLimitedView();}
function laLimitedSearch(v){laLimitedQuery=String(v||'');const q=laLimitedQuery.toLocaleLowerCase('de').trim();document.querySelectorAll('[data-la-name]').forEach(el=>{el.style.display=!q||el.getAttribute('data-la-name').includes(q)?'':'none';});}
function laLimitedSetRoom(r){if(!LA_ROOMS.includes(r))return;laLimitedTab='room';laStudentTab='room';laLimitedRoom=r;laLimitedSelectedId='';laLimitedView();}
function laLimitedSelect(id){laLimitedSelectedId=String(id);laBoardSelectedId=String(id);laLimitedView();}
function laLimitedStudent(){laSelectedRoom=laLimitedRoom;laStudentTab='room';laBoardSelectedId='';laLimitedMode='student';laLimitedSelectedId='';laLimitedQuery='';laSetKioskLock(true);laLimitedView();}
function laLimitedTeacher(){
 if(!Auth.currentUser()||Auth.session?.mode!=='cloud')return;
 const password=prompt('Passwort des Lernatelier-Accounts zum Entsperren eingeben:');
 if(!password)return;
 Auth.verifyCloudPassword(Auth.currentUser().username,password).then(ok=>{
   if(!ok){alert('Passwort nicht korrekt.');return;}
   laSetKioskLock(false);laLimitedMode='teacher';laLimitedView();
 }).catch(()=>alert('Entsperren fehlgeschlagen.'));
}
async function laLimitedAction(id,action,value){
 if(!Auth.isLernatelier()||!Auth.canAccessGrade(laGrade))return;
 try{
  const {error}=await Auth.cloudClient.rpc('kompass_la_change',{p_grade:laGrade,p_pupil_id:id,p_action:action,p_value:value});
  if(error)throw error;
  delete laLimitedRows[laGrade];
  laLimitedView();
 }catch(e){alert('Nicht gespeichert: '+e.message);}
}
function laLimitedSignOut(){
 laSetKioskLock(false);
 laLimitedRows={};
 laLimitedPayloads={};
 laLimitedMode='teacher';
 laLimitedQuery='';
 Auth.logout();
}
function laLimitedNews(){
 const previous=Store.calendarEvents;
 const safe=laLimitedPayloads[laGrade]?.calendarEvents||[];
 try{
  Store.calendarEvents=safe;
  return laTodayBoard();
 }finally{
  Store.calendarEvents=previous;
 }
}
function laLimitedSetTab(tab){if(tab!=='room'&&tab!=='news')return;laStudentTab=tab;laLimitedTab=tab;laLimitedSelectedId='';laLimitedView();}
function laLimitedView(){
 laLimitedStartPoll();
 const grades=Auth.allowedGrades();
 if(!grades.includes(laGrade))laGrade=grades[0]||6;
 const root=document.getElementById('app');
 if(!root)return;
 if(!grades.length){root.textContent='Für diesen Account sind noch keine Stufen freigegeben.';return;}
 if(typeof laKioskLocked==='function'&&laKioskLocked())laLimitedMode='student';
 const pupils=laLimitedRows[laGrade];
 if(!pupils){root.textContent='Lernatelier wird geladen …';laLoadLimited(laGrade);return;}
 if(laLimitedMode==='student'){
  laLimitedRoom=laSelectedRoom;
  laLimitedTab=laStudentTab;
  laLimitedSelectedId=laBoardSelectedId;
  laStudentPreview();return;
 }
 const tabs=laLimitedMode==='teacher'?grades.map(g=>'<button class="chip '+(g===laGrade?'dark':'')+'" onclick="laLimitedGrade('+g+')">Stufe '+g+'</button>').join(''):'';
 const roomTabs=LA_ROOMS.map(r=>'<button class="chip '+(r===laLimitedRoom?'dark':'')+'" onclick="laLimitedSetRoom(\''+r+'\')">'+r+'</button>').join('');
 const visible=laLimitedMode==='student'?pupils.filter(p=>p.learningAtelier===laLimitedRoom):pupils;
 const query=laLimitedMode==='teacher'?laLimitedQuery.toLocaleLowerCase('de').trim():'';
 const filtered=visible.filter(p=>!p.archived&&(!query||[p.first,p.last,p.short,p.className].some(x=>String(x||'').toLocaleLowerCase('de').includes(query))));
 const entries=filtered.map(p=>{
   const name=esc(p.short||[p.first,p.last].filter(Boolean).join(' '));
   const room=esc(p.learningAtelier||'Ohne LA');
   const place=esc(p.learningPlace||'Lernatelier');
   const id=encodeURIComponent(String(p.id)).replace(/'/g,'%27');
   const actions='<button class="chip" onclick="laLimitedAction(decodeURIComponent(\''+id+'\'),\'help\',\''+(!p.laNeedsHelp)+'\')">'+(p.laNeedsHelp?'✓ Erledigt':'✋ Hilfe')+'</button>';
   const pending=p.laRequest?.status==='pending'
     ?'<div class="mini">Anfrage: '+esc(p.laRequest.place||'')+'</div>'+(laLimitedMode==='teacher'?'<button class="chip" onclick="laLimitedAction(decodeURIComponent(\''+id+'\'),\'approve\',null)">✓ Erlauben</button><button class="chip" onclick="laLimitedAction(decodeURIComponent(\''+id+'\'),\'deny\',null)">Ablehnen</button>':'')
     :'';
   const places='<select onchange="laLimitedAction(decodeURIComponent(\''+id+'\'),\''+(laLimitedMode==='teacher'?'place':'request')+'\',this.value);this.selectedIndex=0"><option value="">Lernort wählen</option>'+LA_DEFAULT_PLACES.filter(v=>v!=='Lernatelier').map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select>';
   return '<div class="laQueue" data-la-name="'+esc([p.first,p.last,p.short,p.className].join(' ').toLocaleLowerCase('de'))+'"><div><b>'+name+'</b>'+(laLimitedMode==='teacher'?'<div class="mini">'+room+' · '+esc(p.className||'')+'</div>':'')+'</div><span class="statusPill">'+place+'</span>'+pending+actions+places+'</div>';
 }).join('')||'<p class="mini">Keine passenden Schüler*innen.</p>';
 if(laLimitedMode==='student'){
   const roomPupils=pupils.filter(p=>!p.archived&&p.learningAtelier===laLimitedRoom);
   const selected=roomPupils.find(p=>String(p.id)===laLimitedSelectedId);
   const configured=laLimitedPayloads[laGrade]?.places?.[laLimitedRoom];
   const places=[...new Set(['Lernatelier',...(Array.isArray(configured)&&configured.length?configured:LA_DEFAULT_PLACES),...roomPupils.map(p=>p.learningPlace).filter(Boolean)])];
   let board='<div class="laPublicBoard laCompactBoard">';
   for(const place of places){
     const group=roomPupils.filter(p=>(p.learningPlace||'Lernatelier')===place);
     board+='<section class="laPublicPlace '+(place==='Lernatelier'?'laHomePlace':'')+' '+(group.length?'laOccupied':'laEmpty')+'"><h2>'+esc(place)+' <span>'+group.length+'</span></h2><div class="laPublicNames">';
     board+=group.map(p=>laStudentPupilCard(p,laLimitedSelectedId,'laLimitedSelect')).join('')||'<p class="mini">Hier ist gerade niemand.</p>';
     board+='</div></section>';
   }
   board+='</div>';
   if(selected){
     const id=encodeURIComponent(String(selected.id)).replace(/'/g,'%27');
     const current=selected.learningPlace||'Lernatelier';
     board+='<div class="laActionPanel"><div class="laActionHead"><div><span class="mini">Ausgewählt</span><h2>'+esc(selected.short||selected.first+' '+selected.last)+'</h2><span class="mini">Aktuell: '+esc(current)+'</span></div><button class="chip" onclick="laLimitedSelectedId=\'\';laLimitedView()">✕ Schließen</button></div>';
     board+='<div class="laActionPlaces">'+places.filter(x=>x!==current).map(place=>'<button class="laPlaceButton" onclick="laLimitedAction(decodeURIComponent(\''+id+'\'),\'request\',this.textContent)"><strong>'+esc(place)+'</strong></button>').join('')+'</div>';
     board+='<button class="chip dark laHelpButton" onclick="laLimitedAction(decodeURIComponent(\''+id+'\'),\'help\',\''+(!selected.laNeedsHelp)+'\')">'+(selected.laNeedsHelp?'✓ Hilfehand zurücknehmen':'✋ Ich brauche Hilfe')+'</button>';
     if(selected.laRequest?.status==='pending')board+='<p class="mini">Lernort angefragt: '+esc(selected.laRequest.place||'')+' · wartet auf Freigabe</p>';
     board+='</div>';
   }
   const nav='<button class="chip '+(laLimitedTab==='news'?'dark':'')+'" onclick="laLimitedSetTab(\'news\')">📰 News</button>'+roomTabs;
   root.innerHTML='<main class="laStudentFullscreen"><div class="laBoardTop"><div><div class="mini">KOMPASS · Stufe '+laGrade+'</div><h1>'+(laLimitedTab==='news'?'📰 News':'🏫 '+esc(laLimitedRoom))+'</h1></div><div class="laTopActions"><button class="chip" onclick="laLimitedTeacher()">🔒 Lehrkraftmodus</button></div></div><div class="laRoomSwitcher laMainTabs">'+nav+'</div>'+(laLimitedTab==='news'?laLimitedNews():'<p class="laBoardInstructions">Namen antippen und einen Lernort anfragen oder Hilfe melden.</p>'+board)+'</main>';
   return;
 }
 const controls=laLimitedMode==='teacher'
   ?'<div class="toolbar"><button class="chip" onclick="laLimitedRefresh()">↻ Aktualisieren</button><button class="chip" onclick="laLimitedSignOut()">Abmelden</button><button class="chip dark" onclick="laLimitedStudent()">👩‍🎓 Schüleransicht</button></div><div class="card"><h2>🔎 Schüler finden · gesamte Stufe</h2><input type="search" placeholder="Name suchen …" value="'+esc(laLimitedQuery)+'" oninput="laLimitedSearch(this.value)"><p class="mini">Alle drei Lernateliers · schreibgeschützte Übersicht</p></div>'
   :'<div class="toolbar"><button class="chip" onclick="laLimitedTeacher()">🔒 Lehrkraftmodus</button></div><div class="toolbar">'+roomTabs+'</div>';
 root.innerHTML='<main class="main"><h1>Lernatelier · Stufe '+laGrade+'</h1><div class="toolbar">'+tabs+'</div>'+controls+'<div class="card"><h2>'+(laLimitedMode==='teacher'?'Alle Lernateliers':esc(laLimitedRoom))+'</h2>'+entries+'</div><p class="mini">Änderungen werden in der separaten Lernatelier-Tabelle gespeichert. Voraussetzung: SQL-Migration UPDATE_LERNATELIER_AKTIONEN.sql.</p></main>';
}
