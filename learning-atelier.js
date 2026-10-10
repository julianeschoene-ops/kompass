/* KOMPASS Lernatelier – erste Lehrkraft-Version. Schüler-Selbstbuchung folgt nach Rollenprüfung. */
const LA_ROOMS=['LA 1','LA 2','LA 3'];
const LA_PLACES=['Lernatelier','Stichgang','Marktplatz','Bibliothek','Input','Coaching'];
const LA_LEVELS=['Hiker','Climber','Free-Climber'];
const LA_DEFAULT_PLACES=['Lernatelier','Input Deutsch','Input Mathematik','Input Englisch','Stichgang','Bibliothek','Marktplatz','WC','Zu Hause','VKL','Chor / Bläserklasse','Sport','Club','SMV','Bäcker','Teamstunde','Coaching','Schülersozialarbeit','LA 3 / Extraraum'];
function laPlaces(room=laSelectedRoom){
 const configured=Store.data.settings?.laPlaces?.[room];
 const names=Array.isArray(configured)&&configured.length?configured:LA_DEFAULT_PLACES;
 const used=laPupils().filter(p=>laRoom(p)===room).map(p=>p.learningPlace).filter(Boolean);
 return [...new Set(['Lernatelier',...names,...used])];
}
function laSavePlaces(){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 const input=document.getElementById('laPlaceEditor');if(!input)return;
 const names=[...new Set(input.value.split(/\n/).map(x=>x.trim()).filter(Boolean))].slice(0,40);
 if(!names.length){alert('Bitte mindestens einen Lernort eingeben.');return;}
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laPlaces=Store.data.settings.laPlaces||{};
 Store.data.settings.laPlaces[laSelectedRoom]=['Lernatelier',...names.filter(x=>x!=='Lernatelier')];
 Store.save('Lernorte aktualisiert',{room:laSelectedRoom});render();
}

let laSelectedRoom='LA 1';
const LA_KIOSK_LOCK_KEY='kompass_la_kiosk_lock_v1';
function laKioskLocked(){try{return localStorage.getItem(LA_KIOSK_LOCK_KEY)==='1';}catch(e){return true;}}
function laSetKioskLock(locked){if(locked)localStorage.setItem(LA_KIOSK_LOCK_KEY,'1');else localStorage.removeItem(LA_KIOSK_LOCK_KEY);}
let laViewMode=laKioskLocked()?'student':'teacher';
let laPreviewPupilId='';
function laPupils(){return (Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className||'').charAt(0))===6);}
function laRoom(p){return LA_ROOMS.includes(p.learningAtelier)?p.learningAtelier:'';}
function laSafeId(id){return esc(String(id));}
function laUpdate(id,key,value){
  if(!Auth.canLead(6)&&!Auth.isAdmin()){toast('Nur Stufenleitung darf diese Zuordnung ändern.');return;}
  const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
  if(key==='learningAtelier'&&!LA_ROOMS.includes(value))return;
  if(key==='graduation'&&!LA_LEVELS.includes(value))return;
  if(key==='learningPlace'&&!laPlaces(laRoom(p)).includes(value))return;
  p[key]=value;Store.save();render();
}
function laAssignUnassigned(room){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 if(!LA_ROOMS.includes(room))return;
 const pupils=laPupils().filter(p=>!laRoom(p));
 if(!pupils.length){toast('Alle SuS sind bereits zugeordnet.');return;}
 if(!confirm(pupils.length+' noch nicht zugeordnete SuS aus Stufe 6 in '+room+' eintragen? Bestehende Zuordnungen bleiben erhalten.'))return;
 pupils.forEach(p=>p.learningAtelier=room);
 Store.save('Lernatelier-Sammelzuordnung',{room,count:pupils.length});
 laSelectedRoom=room;render();
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
 if(!Auth.canAccessGrade(6)||!laPlaces(laSelectedRoom).includes(place)||place==='Lernatelier')return;
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

function laEnterStudentKiosk(){try{laSetKioskLock(true);laViewMode='student';State.view='learningAtelier';render();}catch(e){alert('Schülermodus konnte nicht gesichert werden.');}}
async function laExitStudentPreview(){
 const user=Auth.currentUser();
 if(!user)return;
 if(Auth.session?.mode!=='cloud'){alert('Die geschützte Rückkehr benötigt ein Cloud-Lehrkraftkonto.');return;}
 const password=prompt('Lehrkraft-Passwort eingeben, um die Schülersicht zu verlassen:');
 if(password===null)return;
 try{
  const ok=await Auth.verifyCloudPassword(user.username,password);
  if(!ok){alert('Passwort nicht korrekt. Die Schülersicht bleibt geöffnet.');return;}
  laSetKioskLock(false);laViewMode='teacher';laPreviewPupilId='';render();
 }catch(e){alert('Überprüfung fehlgeschlagen: '+(e?.message||String(e)));}
}

let laBoardSelectedId='';
let laStudentTab='news';
function laBoardMove(id,place){
 if(!Auth.canAccessGrade(6)||!laPlaces(laSelectedRoom).includes(place))return;
 const p=laPupils().find(x=>String(x.id)===String(id));
 if(!p||laRoom(p)!==laSelectedRoom)return;
 // This remains a teacher-authenticated kiosk preview, not a public student login.
 p.learningPlace=place;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laLastPlaceReset=laDayData('').date;
 p.laRequest=null;
 Store.save('Standorttafel: Lernort gewechselt',{pupilId:p.id,place});
 laBoardSelectedId='';render();
}
function laSaveRoomInfo(){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 const star=Store.data.settings?.laBoardInfo?.[laSelectedRoom]?.star||'';
 const duties=document.getElementById('laDutiesEdit')?.value||'';
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laBoardInfo=Store.data.settings.laBoardInfo||{};
 Store.data.settings.laBoardInfo[laSelectedRoom]={star:star.slice(0,150),duties:duties.slice(0,500)};
 Store.save('Teamstar und Dienste gespeichert',{room:laSelectedRoom});render();
}
function laSetRoomInfo(kind,value){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 if(!LA_ROOMS.includes(laSelectedRoom)||!['duties','star'].includes(kind))return;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laBoardInfo=Store.data.settings.laBoardInfo||{};
 const info=Store.data.settings.laBoardInfo[laSelectedRoom]||{duties:'',star:''};
 info[kind]=String(value||'').slice(0,500);
 Store.data.settings.laBoardInfo[laSelectedRoom]=info;
 Store.save('Lernatelier-Tafel aktualisiert',{room:laSelectedRoom,kind});render();
}
const LA_STAR_SUBJECTS=[['en','Englisch','red'],['de','Deutsch','yellow'],['ma','Mathematik','blue']];
function laStars(p){return Array.isArray(p.laStars)?p.laStars:[];}
function laToggleStar(id,subject){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 if(!LA_STAR_SUBJECTS.some(x=>x[0]===subject))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 const old=laStars(p);
 p.laStars=old.includes(subject)?old.filter(x=>x!==subject):[...old,subject];
 Store.save('Fach-Teamstar geändert',{pupilId:p.id,subject});render();
}
const LA_DUTIES=[['broom','🧹','Besen'],['book','📖','Buch'],['hall','🚪','Flur'],['trash','🗑️','Mülleimer']];
function laWeekKey(date=new Date()){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();const jan=new Date(Date.UTC(year,0,1));return year+'-W'+String(Math.ceil((((d-jan)/86400000)+1)/7)).padStart(2,'0');}
function laDutyHistory(){return Store.data.settings?.laDutyHistory||{};}
function laDutyCount(id,duty){return Object.values(laDutyHistory()).filter(w=>w&&w.assignments&&w.assignments[String(id)]?.includes(duty)).length;}
function laDuties(p){return Array.isArray(p.laDuties)?p.laDuties:[];}
function laEnsureWeeklyDuties(){
 const week=laWeekKey(),settings=Store.data.settings||(Store.data.settings={});
 settings.laDutyHistory=settings.laDutyHistory||{};
 if(settings.laDutyHistory[week])return;
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
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
 settings.laDutyHistory[week]={createdAt:new Date().toISOString(),assignments};
 for(const p of laPupils())p.laDuties=assignments[String(p.id)]||[];
 Store.save('Wöchentliche Dienste automatisch eingeteilt',{week});
}
function laToggleDuty(id,duty){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 if(!LA_DUTIES.some(x=>x[0]===duty))return;
 laEnsureWeeklyDuties();
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 const week=laWeekKey(),history=Store.data.settings.laDutyHistory;
 const old=laDuties(p),adding=!old.includes(duty);
 if(adding){const others=laPupils().filter(x=>laRoom(x)===laRoom(p)&&String(x.id)!==String(id)&&laDuties(x).includes(duty));if(others.length>=3&&!confirm('Für diesen Dienst sind bereits drei Kinder eingeteilt. Trotzdem hinzufügen?'))return;if(others.some(x=>String(x.team||'')===String(p.team||''))&&!confirm('Ein Kind aus demselben Farbteam ist bereits eingeteilt. Trotzdem hinzufügen?'))return;}
 if(adding&&laDutyCount(id,duty)>=2&&!confirm((p.short||p.first)+' hatte diesen Dienst bereits '+laDutyCount(id,duty)+'-mal. Trotzdem einteilen?'))return;
 p.laDuties=adding?[...old,duty]:old.filter(x=>x!==duty);
 history[week]=history[week]||{createdAt:new Date().toISOString(),assignments:{}};
 history[week].assignments[String(id)]=p.laDuties.slice();
 Store.save('Lernatelier-Dienst geändert',{pupilId:p.id,duty,week});render();
}
function laDutyOverview(){
 if(!Auth.isAdmin()&&!Auth.canLead(6))return '';
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
 const d=laDayData();const config=Store.data.settings?.laDailyBoard||{};
 const current=config[d.date]||{};const published=current.published===true;
 const events=(Store.calendarEvents||[]).filter(e=>e.date<=d.date&&d.date<=(e.endDate||e.date)&&(!e.grade||e.grade==='all'||Number(e.grade)===6)&&(!e.visibility||e.visibility==='all'||e.visibility==='students'));
 const list=(items,isFlex=false)=>items.length?'<div class="laTodayItems">'+items.map(x=>'<div class="laTodayItem"><b>'+esc(x[0])+' Std. · '+esc(x[1])+'</b><span>'+esc(laTeacherShort(x[2]))+(x[3]?(isFlex?' · Raum: ':' · Treff: ')+esc(x[3]):'')+(isFlex&&x[4]?'<br>Teams: '+esc(x[4]):'')+'</span></div>').join('')+'</div>':'<p class="mini">Keine Angebote eingetragen.</p>';
 const flex=laFlexForDate(d);
 const notes=published?String(current.notes||'').trim():'';
 const news=published?String(current.news||'').trim():'';
 const motivation=published&&String(current.motivation||'').trim()?String(current.motivation).trim():laMotivationForDate(d.date);
 return '<section class="laTodayBoard"><div class="laTodayHeading"><h2>☀️ Heute bei uns</h2><span>'+esc(d.label)+'</span></div>'+
 '<div class="laMotivation"><div class="laMotivationEyebrow">✨ Dein Gedanke für heute</div><div class="laMotivationQuote">'+esc(motivation)+'</div></div><div class="laTodayGrid laTodayMasonry">'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📅 Aus dem Kalender</h3>'+(events.length?'<div class="laTodayItems">'+events.map(e=>'<div class="laTodayItem"><b>'+esc((e.time?e.time+' · ':'')+e.title)+'</b><span>'+esc(e.location||'')+'</span></div>').join('')+'</div>':'<p class="mini">Keine Kalendereinträge für diesen Tag.</p>')+'</div>'+
 '<div class="laTodaySection"><h3>🏀 Weitere Sportangebote</h3>'+list(laMergeConsecutiveOffers(LA_SPORT_OFFERS[d.day]||[]))+'</div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📣 Infos & Vertretungen</h3><p>'+(notes?esc(notes).replace(/\n/g,'<br>'):'Heute sind noch keine Änderungen veröffentlicht.')+'</p></div>'+
 '<div class="laTodaySection"><h3>🌍 Neues aus der Welt</h3><p>'+(news?esc(news).replace(/\n/g,'<br>'):'Noch keine geprüfte Nachricht veröffentlicht.')+'</p></div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>🎨 Kreativband</h3>'+list(laMergeConsecutiveOffers(LA_DAY_OFFERS[d.day]||[]))+'</div></div>'+
 '<div class="laTodayColumn"><div class="laTodaySection"><h3>📘 Flexstunden</h3>'+list(flex,true)+'</div></div></div>'+
 (published&&current.updatedAt?'<p class="mini">Zuletzt aktualisiert: '+esc(new Date(current.updatedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))+'</p>':'')+'</section>';
}
function laEditDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
 const d=laDayData(),entry=Store.data.settings?.laDailyBoard?.[d.date]||{};
 State.dialog={mode:'laDailyBoard',date:d.date};renderDialog();
}
function laSaveDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
 const date=laDayData().date;if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laDailyBoard=Store.data.settings.laDailyBoard||{};
 Store.data.settings.laDailyBoard[date]={notes:document.getElementById('laDailyNotes')?.value||'',news:document.getElementById('laDailyNews')?.value||'',motivation:document.getElementById('laDailyMotivation')?.value||'',published:!!document.getElementById('laDailyPublish')?.checked,updatedAt:new Date().toISOString()};
 Store.save('Tagesübersicht gespeichert',{date});State.dialog=null;render();
}

function laDailyEditor(){if(!Auth.isAdmin()&&!Auth.canLead(6))return '';const d=laDayData(),x=Store.data.settings?.laDailyBoard?.[d.date]||{};return '<div class="card"><h2>☀️ Tagesübersicht vorbereiten</h2><label>Datum auswählen</label><input type="date" value="'+esc(d.date)+'" onchange="laBoardDate=this.value;render()"><p class="mini">Du kannst beliebige zukünftige Tage vorbereiten. Die Veröffentlichung gilt nur für das gewählte Datum.</p><label>Hinweise und Vertretungen (nur für Schüler freigegebene Inhalte)</label><textarea id="laDailyNotes" rows="5">'+esc(x.notes||'')+'</textarea><label>Geprüfte Weltnachricht (mit Quelle)</label><textarea id="laDailyNews" rows="4">'+esc(x.news||'')+'</textarea><label>Motivationsspruch des Tages (optional – sonst automatisch)</label><textarea id="laDailyMotivation" rows="2">'+esc(x.motivation||'')+'</textarea><label class="check"><input type="checkbox" id="laDailyPublish" '+(x.published?'checked':'')+'> Für alle Lernateliers veröffentlichen</label><button class="chip dark" onclick="laSaveDailyBoard()">Tagesübersicht speichern</button></div>';}
function laResetLearningPlacesDaily(){
 const today=laDayData('').date;
 const settings=Store.data.settings||(Store.data.settings={});
 // Nur die Stufenleitung führt den täglichen Cloud-Reset durch.
 // Die Schülertafel zeigt veraltete Lernorte unabhängig davon nicht an.
 if(settings.laLastPlaceReset===today)return;
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
 for(const p of laPupils()){p.learningPlace='Lernatelier';p.laRequest=null;}
 settings.laLastPlaceReset=today;
 Store.save('Täglicher Neustart der Lernorte',{date:today});
}
function laCurrentPlace(p){
 const today=laDayData('').date;
 return Store.data.settings?.laLastPlaceReset===today?(p.learningPlace||'Lernatelier'):'Lernatelier';
}
function laStudentPreview(){
 if(!Auth.canAccessGrade(6))return;
 laResetLearningPlacesDaily();
 const all=laPupils();
 if(!all.some(p=>laRoom(p)===laSelectedRoom)){
  const first=LA_ROOMS.find(room=>all.some(p=>laRoom(p)===room));if(first)laSelectedRoom=first;
 }
 const pupils=all.filter(p=>laRoom(p)===laSelectedRoom).sort((a,b)=>String(a.first||a.short||'').localeCompare(String(b.first||b.short||''),'de'));
 const selected=pupils.find(p=>String(p.id)===String(laBoardSelectedId));
 const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
 const noiseData={green:['🟢','Leise sprechen'],yellow:['🟡','Flüstern'],red:['🔴','Ruhe']}[noise];
 const info=Store.data.settings?.laBoardInfo?.[laSelectedRoom]||{};
 let html='<div class="laBoardTop"><div><div class="mini">KOMPASS · Jahrgang 6</div><h1>'+ (laStudentTab==='news'?'📰 News':'🏫 '+esc(laSelectedRoom))+'</h1></div><div class="laTopActions">'+(laStudentTab==='news'?'':'<div class="laCompactNoise">'+noiseData[0]+' '+noiseData[1]+'</div>')+'<button class="chip" onclick="laExitStudentPreview()">🔒 Lehrkraftmodus</button></div></div>';
 html+='<div class="laRoomSwitcher laMainTabs"><button class="chip '+(laStudentTab==='news'?'dark':'')+'" onclick="laStudentTab=\'news\';laBoardSelectedId=\'\';render()">📰 News</button>'+LA_ROOMS.map(room=>'<button class="chip '+(laStudentTab==='room'&&room===laSelectedRoom?'dark':'')+'" onclick="laStudentTab=\'room\';laSelectedRoom=\''+room+'\';laBoardSelectedId=\'\';render()">'+room+'</button>').join('')+'</div>';
 if(laStudentTab==='news'){
  html+='<div class="laTodayDateNav"><button class="chip" onclick="laMoveBoardDay(-1)">‹ Vortag</button><button class="chip" onclick="laBoardDate=\'\';render()">Heute</button><button class="chip" onclick="laMoveBoardDay(1)">Nächster Tag ›</button></div>';
  html+=laTodayBoard();
  document.getElementById('app').innerHTML='<main class="laStudentFullscreen">'+html+'</main>';
  return;
 }
 html+='<p class="laBoardInstructions">Namen antippen oder mit dem Finger in einen anderen Bereich ziehen.</p>';
 html+='<div class="laPublicBoard laCompactBoard">';
 for(const place of laPlaces()){
  const group=pupils.filter(p=>laCurrentPlace(p)===place);
  html+='<section class="laPublicPlace '+(place==='Lernatelier'?'laHomePlace':'')+' '+(group.length?'laOccupied':'laEmpty')+'" data-place="'+esc(place)+'"><h2>'+esc(place)+' <span>'+group.length+'</span></h2><div class="laPublicNames">';
  html+=group.map(p=>'<button type="button" data-pupil="'+esc(p.id)+'" class="laPublicName '+(String(p.id)===String(laBoardSelectedId)?'laChosen':'')+'" onclick="laSelectBoardPupil(\''+esc(p.id)+'\',this)"><span class="laPupilStars">'+LA_STAR_SUBJECTS.filter(x=>laStars(p).includes(x[0])).map(x=>'<span class="laStar laStar-'+x[2]+'" title="Teamstar '+x[1]+'">★</span>').join('')+'</span><span class="laNameLine"><span class="dot '+teamColor(p.team)+'"></span><span>'+esc(p.short||p.first+' '+p.last)+'</span>'+(p.laNeedsHelp?' <span title="Braucht Hilfe">✋</span>':'')+LA_DUTIES.filter(x=>laDuties(p).includes(x[0])).map(x=>'<span title="'+x[2]+'">'+x[1]+'</span>').join('')+'</span></button>').join('')||'<p class="mini">Hier ist gerade niemand.</p>';
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
function learningAtelier(){
  if(Auth.canAccessGrade(6))laEnsureWeeklyDuties();
  if(Auth.canAccessGrade(6))laResetLearningPlacesDaily();
  if(!Auth.canAccessGrade(6)){shell(header('Lernatelier')+'<div class="card">Kein Zugriff auf Jahrgang 6.</div>');return;}
  if(laViewMode==='student')return laStudentPreview();
  const all=laPupils(),current=all.filter(p=>laRoom(p)===laSelectedRoom);
  const unknown=all.filter(p=>!laRoom(p));
  const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
  const can=Auth.canLead(6)||Auth.isAdmin();
  let html=header('Lernatelier','Jahrgang 6 · alle Farbteams gemeinsam · Lehrkraftansicht');
  html+='<div class="toolbar"><button class="chip dark" onclick="laEnterStudentKiosk()">👩‍🎓 Zur Schülersicht wechseln</button></div>';
  html+=laDailyEditor();html+=laDutyOverview();
  html+='<div class="toolbar"><div class="laTabs">'+LA_ROOMS.map(r=>`<button class="chip ${laSelectedRoom===r?'dark':''}" onclick="laSelectedRoom='${r}';laPreviewPupilId='';render()">${r} · ${all.filter(p=>laRoom(p)===r).length}</button>`).join('')+'</div><p class="mini">Die Zuordnung zum Lernatelier bleibt auch bei einem Standortwechsel bestehen.</p></div>';
  if(unknown.length&&can)html+='<div class="card"><b>Sammelzuordnung</b><p class="mini">Noch nicht zugeordnet: '+unknown.length+' SuS aus Stufe 6. Bestehende Lernatelier-Zuordnungen bleiben unverändert.</p><button class="chip dark" onclick="laAssignUnassigned(\'LA 1\')">Alle noch nicht zugeordneten SuS → LA 1</button></div>';
  if(unknown.length)html+='<div class="card"><b>Hinweis: '+unknown.length+' SuS sind noch keinem Lernatelier zugeordnet.</b><p class="mini">Bitte unten im Bereich „Noch keinem Lernatelier zugeordnet“ die Zuordnung vornehmen. Die bisherige Auswahl wurde möglicherweise wegen eines Fehlers nicht gespeichert.</p></div>';
  html+='<div class="card"><h2>📍 Lernorte der Tafel</h2><p class="mini">Ein Standort pro Zeile. Du kannst Lernorte hinzufügen, umbenennen oder aus der Liste entfernen. Bereits belegte Standorte bleiben sichtbar, bis die Kinder umgezogen sind.</p><textarea id="laPlaceEditor" rows="8" '+(can?'':'disabled')+'>'+esc((Store.data.settings?.laPlaces?.[laSelectedRoom]||LA_DEFAULT_PLACES).join('\n'))+'</textarea>'+(can?'<button class="chip dark" onclick="laSavePlaces()">Lernorte speichern</button>':'')+'</div>';
  const boardInfo=Store.data.settings?.laBoardInfo?.[laSelectedRoom]||{};

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
