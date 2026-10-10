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
let laViewMode='teacher';
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

let laBoardSelectedId='';
function laBoardMove(id,place){
 if(!Auth.canAccessGrade(6)||!laPlaces(laSelectedRoom).includes(place))return;
 const p=laPupils().find(x=>String(x.id)===String(id));
 if(!p||laRoom(p)!==laSelectedRoom)return;
 // This remains a teacher-authenticated kiosk preview, not a public student login.
 p.learningPlace=place;
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
function laDuties(p){return Array.isArray(p.laDuties)?p.laDuties:[];}
function laToggleDuty(id,duty){
 if(!Auth.canLead(6)&&!Auth.isAdmin())return;
 if(!LA_DUTIES.some(x=>x[0]===duty))return;
 const p=laPupils().find(x=>String(x.id)===String(id));if(!p)return;
 p.laDuties=laDuties(p).includes(duty)?laDuties(p).filter(x=>x!==duty):[...laDuties(p),duty];
 Store.save('Lernatelier-Dienst geändert',{pupilId:p.id,duty});render();
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
const LA_FLEX_OFFERS=[
 ['2026-10-12','3.','Englisch','Speaking Activities','Ribanna Tsehaye'],['2026-10-12','4.','Mathematik','Schriftliche Division in kleinen Schritten','Melanie Schnepf'],
 ['2026-10-13','3.','Deutsch','QUOP / FLINK','Nicole Oursin'],['2026-10-13','4.','Deutsch','QUOP / FLINK','Julia Bachmair Neu'],['2026-10-13','3.','Mathematik','Parallelen & Senkrechten','Heike von Vietinghoff'],['2026-10-13','4.','Mathematik','Uhrzeit und Zeitspannen','Miriam Bay'],
 ['2026-10-14','2.','Deutsch','QUOP / FLINK','Jörg Vogt'],['2026-10-14','4.','Deutsch','QUOP / FLINK','Peter Brusda-Gleichmann'],['2026-10-14','4.','Englisch','Grammar Time','Ribanna Tsehaye'],['2026-10-14','3.','Mathematik','Schriftliche Subtraktion','Marcel Moser'],
 ['2026-10-15','3.','Deutsch','QUOP / FLINK','Nicole Oursin'],
 ['2026-10-16','4.','Englisch','Sketches & Board Games','Dagmar Zwilling'],['2026-10-16','5.','Englisch','Story Time','Ribanna Tsehaye'],['2026-10-16','2.','Mathematik','Runden & Überschlagen','Marcel Moser'],['2026-10-16','3.','Mathematik','Schriftliche Division','Heike von Vietinghoff'],['2026-10-16','4.','Mathematik','Schriftliche Subtraktion','Marcel Moser']
];
function laDayData(){const d=new Date(), day=d.getDay();return {day,date:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),label:d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})};}
function laTodayBoard(){
 const d=laDayData();const config=Store.data.settings?.laDailyBoard||{};
 const current=config[d.date]||{};const published=current.published===true;
 const list=(items)=>items.length?'<div class="laTodayItems">'+items.map(x=>'<div class="laTodayItem"><b>'+esc(x[0])+'. Std. · '+esc(x[1])+'</b><span>'+esc(x[2])+(x[3]?' · Treff: '+esc(x[3]):'')+'</span></div>').join('')+'</div>':'<p class="mini">Keine Angebote eingetragen.</p>';
 const flex=LA_FLEX_OFFERS.filter(x=>x[0]===d.date).map(x=>[x[1],x[2]+' · '+x[3],x[4],'']);
 const notes=published?String(current.notes||'').trim():'';
 const news=published?String(current.news||'').trim():'';
 return '<section class="laTodayBoard"><div class="laTodayHeading"><h2>☀️ Heute bei uns</h2><span>'+esc(d.label)+'</span></div>'+
 '<div class="laTodayGrid"><div class="laTodaySection"><h3>📣 Infos & Vertretungen</h3><p>'+ (notes?esc(notes).replace(/\\n/g,'<br>'):'Heute sind noch keine Änderungen veröffentlicht.')+'</p></div>'+
 '<div class="laTodaySection"><h3>🎨 Kreativband</h3>'+list(LA_DAY_OFFERS[d.day]||[])+'</div>'+
 '<div class="laTodaySection"><h3>📘 Flexstunden</h3>'+list(flex)+'</div>'+
 '<div class="laTodaySection"><h3>🏀 Weitere Sportangebote</h3>'+list(LA_SPORT_OFFERS[d.day]||[])+'</div>'+
 '<div class="laTodaySection"><h3>🌍 Neues aus der Welt</h3><p>'+(news?esc(news).replace(/\\n/g,'<br>'):'Noch keine geprüfte Nachricht veröffentlicht.')+'</p></div></div>'+
 (published&&current.updatedAt?'<p class="mini">Zuletzt aktualisiert: '+esc(new Date(current.updatedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))+'</p>':'')+'</section>';
}
function laEditDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
 const d=laDayData(),entry=Store.data.settings?.laDailyBoard?.[d.date]||{};
 State.dialog={mode:'laDailyBoard',date:d.date};renderDialog();
}
function laSaveDailyBoard(){
 if(!Auth.isAdmin()&&!Auth.canLead(6))return;
 const date=State.dialog?.date;if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date||''))return;
 Store.data.settings=Store.data.settings||{};
 Store.data.settings.laDailyBoard=Store.data.settings.laDailyBoard||{};
 Store.data.settings.laDailyBoard[date]={notes:document.getElementById('laDailyNotes')?.value||'',news:document.getElementById('laDailyNews')?.value||'',published:!!document.getElementById('laDailyPublish')?.checked,updatedAt:new Date().toISOString()};
 Store.save('Tagesübersicht gespeichert',{date});State.dialog=null;render();
}

function laStudentPreview(){
 if(!Auth.canAccessGrade(6))return;
 const all=laPupils();
 if(!all.some(p=>laRoom(p)===laSelectedRoom)){
  const first=LA_ROOMS.find(room=>all.some(p=>laRoom(p)===room));if(first)laSelectedRoom=first;
 }
 const pupils=all.filter(p=>laRoom(p)===laSelectedRoom).sort((a,b)=>String(a.first||a.short||'').localeCompare(String(b.first||b.short||''),'de'));
 const selected=pupils.find(p=>String(p.id)===String(laBoardSelectedId));
 const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
 const noiseData={green:['🟢','Leise sprechen'],yellow:['🟡','Flüstern'],red:['🔴','Ruhe']}[noise];
 const info=Store.data.settings?.laBoardInfo?.[laSelectedRoom]||{};
 let html='<div class="laBoardTop"><div><div class="mini">KOMPASS · Jahrgang 6</div><h1>🏫 '+esc(laSelectedRoom)+'</h1></div><div class="laTopActions"><div class="laCompactNoise">'+noiseData[0]+' '+noiseData[1]+'</div><button class="chip" onclick="laExitStudentPreview()">🔒 Lehrkraftmodus</button></div></div>';
 html+='<div class="laRoomSwitcher">'+LA_ROOMS.map(room=>'<button class="chip '+(room===laSelectedRoom?'dark':'')+'" onclick="laSelectedRoom=\''+room+'\';laBoardSelectedId=\'\';render()">'+room+' · '+all.filter(p=>laRoom(p)===room).length+'</button>').join('')+'</div>';
 
 html+=laTodayBoard();
 html+='<p class="laBoardInstructions">Namen antippen oder mit dem Finger in einen anderen Bereich ziehen.</p>';
 html+='<div class="laPublicBoard laCompactBoard">';
 for(const place of laPlaces()){
  const group=pupils.filter(p=>(p.learningPlace||'Lernatelier')===place);
  html+='<section class="laPublicPlace '+(place==='Lernatelier'?'laHomePlace':'')+' '+(group.length?'laOccupied':'laEmpty')+'" data-place="'+esc(place)+'"><h2>'+esc(place)+' <span>'+group.length+'</span></h2><div class="laPublicNames">';
  html+=group.map(p=>'<button type="button" data-pupil="'+esc(p.id)+'" class="laPublicName '+(String(p.id)===String(laBoardSelectedId)?'laChosen':'')+'" onclick="laSelectBoardPupil(\''+esc(p.id)+'\',this)"><span class="laPupilStars">'+LA_STAR_SUBJECTS.filter(x=>laStars(p).includes(x[0])).map(x=>'<span class="laStar laStar-'+x[2]+'" title="Teamstar '+x[1]+'">★</span>').join('')+'</span><span class="laNameLine"><span class="dot '+teamColor(p.team)+'"></span><span>'+esc(p.short||p.first+' '+p.last)+'</span>'+(p.laNeedsHelp?' <span title="Braucht Hilfe">✋</span>':'')+LA_DUTIES.filter(x=>laDuties(p).includes(x[0])).map(x=>'<span title="'+x[2]+'">'+x[1]+'</span>').join('')+'</span></button>').join('')||'<p class="mini">Hier ist gerade niemand.</p>';
  html+='</div></section>';
 }
 html+='</div>';
 if(selected){
  const here=selected.learningPlace||'Lernatelier';
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
  if(!Auth.canAccessGrade(6)){shell(header('Lernatelier')+'<div class="card">Kein Zugriff auf Jahrgang 6.</div>');return;}
  if(laViewMode==='student')return laStudentPreview();
  const all=laPupils(),current=all.filter(p=>laRoom(p)===laSelectedRoom);
  const unknown=all.filter(p=>!laRoom(p));
  const noise=Store.data.settings?.laNoise?.[laSelectedRoom]||'green';
  const can=Auth.canLead(6)||Auth.isAdmin();
  let html=header('Lernatelier','Jahrgang 6 · alle Farbteams gemeinsam · Lehrkraftansicht');
  html+='<div class="toolbar"><button class="chip dark" onclick="laViewMode=\'student\';render()">👩‍🎓 Zur Schülersicht wechseln</button></div>';
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
