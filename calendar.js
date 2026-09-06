let CalendarState={date:new Date(),filter:'alle'};
const QUOP_WINDOWS_2026_27=[
  ['1','2026-09-14','2026-10-02'],['2','2026-10-12','2026-10-23'],['3','2026-11-02','2026-11-20'],['4','2026-11-23','2026-12-11'],['5','2027-01-11','2027-01-29'],['6','2027-02-08','2027-02-26'],['7','2027-03-01','2027-03-19'],['8','2027-04-12','2027-04-30'],['9','2027-05-31','2027-06-18'],['10','2027-06-21','2027-07-09']
];
function calPad(n){return String(n).padStart(2,'0')}
function calISO(d){return `${d.getFullYear()}-${calPad(d.getMonth()+1)}-${calPad(d.getDate())}`}
function calTeamsForGrade(grade){
  const teams=[...new Set((Store.pupils||[]).filter(p=>Number(p.year||String(p.className||'').charAt(0))===Number(grade)).map(p=>p.team).filter(Boolean))];
  return (teams.length?teams:TEAMS).sort((a,b)=>String(a).localeCompare(String(b),'de'));
}
function ensureCalendarDefaults(){
  if(!Auth.isAdmin())return;
  let changed=false;
  for(const [n,start,end] of QUOP_WINDOWS_2026_27){
    const id=`preset_quop_2026_27_${n}`;
    if(!Store.calendarEvents.some(e=>e.id===id)){
      Store.calendarEvents.push({id,title:`QUOP · Test ${n}`,date:start,endDate:end,time:'',endTime:'',category:'Besonderes Angebot',offerName:'QUOP',location:'',notes:'QUOP-Testzeitraum',visibility:'all',grade:'all',targetTeam:'all',reminder:true,preset:true,createdAt:new Date().toISOString(),createdBy:'KOMPASS'});changed=true;
    }
  }
  if(changed)Store.save('QUOP-Zeiträume ergänzt');
}
function calendarCanManage(e=null){
  if(Auth.isAdmin())return true;
  const grade=e?.grade&&e.grade!=='all'?Number(e.grade):Number(State.year);
  return Number.isFinite(grade)&&Auth.canLead(grade);
}
function calendarVisibleEvent(e){
  if(!e)return false;
  if(e.grade&&e.grade!=='all'&&!Auth.canAccessGrade(Number(e.grade)))return false;
  return true;
}
function calendarEventRangeIncludes(e,date){const end=e.endDate||e.date;return e.date<=date&&date<=end;}
function calendarEventAppliesToCoach(e,grade=State.year){
  if(!calendarVisibleEvent(e))return false;
  if(e.grade&&e.grade!=='all'&&Number(e.grade)!==Number(grade))return false;
  if(e.targetTeam&&e.targetTeam!=='all'){
    const own=Auth.currentUser()?.coachTeams?.[grade]||Auth.currentUser()?.coachTeams?.[String(grade)]||'';
    if(!own||own!==e.targetTeam)return false;
  }
  return true;
}
function activeCoachReminders(grade=State.year){
  ensureCalendarDefaults();const now=calISO(new Date());
  return (Store.calendarEvents||[]).filter(e=>e.reminder&&calendarEventRangeIncludes(e,now)&&calendarEventAppliesToCoach(e,grade)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.title).localeCompare(String(b.title),'de'));
}
function coachReminderHtml(grade=State.year){
  const rows=activeCoachReminders(grade);if(!rows.length)return'';
  return `<div class="card"><h2>Erinnerungen für deine Lerngruppe</h2><div class="quickList">${rows.map(e=>`<div class="quickRow"><div><b>${esc(e.title)}</b><div class="mini">${new Date(e.date+'T12:00:00').toLocaleDateString('de-DE')} – ${new Date((e.endDate||e.date)+'T12:00:00').toLocaleDateString('de-DE')}${e.targetTeam&&e.targetTeam!=='all'?' · '+esc(e.targetTeam):''}</div>${e.notes?`<div class="mini">${esc(e.notes)}</div>`:''}</div><span class="statusPill status-yellow">fällig</span></div>`).join('')}</div></div>`;
}
function calendar(){
  ensureCalendarDefaults();
  const base=new Date(CalendarState.date.getFullYear(),CalendarState.date.getMonth(),1),year=base.getFullYear(),month=base.getMonth(),first=(base.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  const cats=['Schule','Kreativband','Besonderes Angebot','Team','Konferenz','Termin','Deadline','Sonstiges'];
  const events=Store.calendarEvents.filter(calendarVisibleEvent).filter(e=>CalendarState.filter==='alle'||e.category===CalendarState.filter);
  const cells=[];for(let i=0;i<first;i++)cells.push('<div class="calDay mutedDay"></div>');
  for(let day=1;day<=days;day++){
    const d=`${year}-${calPad(month+1)}-${calPad(day)}`,es=events.filter(e=>calendarEventRangeIncludes(e,d)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    cells.push(`<div class="calDay ${d===calISO(new Date())?'todayCell':''}" ${calendarCanManage()?`onclick="openCalendarEvent(null,'${d}')"`:''}><div class="calNum">${day}</div>${es.slice(0,4).map(e=>`<button class="calEvent" onclick="event.stopPropagation();openCalendarEvent('${e.id}','${d}')"><b>${esc(e.time||'')}</b> ${esc(e.title)}${e.endDate&&e.endDate!==e.date?' ↔':''}${e.grade&&e.grade!=='all'?` <span class="mini">· Stufe ${e.grade}</span>`:''}</button>`).join('')}${es.length>4?`<div class="mini">+${es.length-4} weitere</div>`:''}</div>`)
  }
  const canAdd=calendarCanManage();
  shell(header('Kalender','Admins und Stufenleitungen können Termine und Erinnerungen eintragen. Zeiträume können gezielt für eine Stufe oder Lerngruppe gelten.')+coachReminderHtml(State.year)+`<div class="calToolbar"><button class="chip" onclick="calMove(-1)">‹</button><h2>${base.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</h2><button class="chip" onclick="calMove(1)">›</button><button class="chip dark" onclick="CalendarState.date=new Date();render()">Heute</button><select onchange="CalendarState.filter=this.value;render()"><option value="alle">alle Kategorien</option>${cats.map(c=>`<option ${CalendarState.filter===c?'selected':''}>${c}</option>`).join('')}</select>${canAdd?`<button class="chip dark" onclick="openCalendarEvent(null,'${calISO(new Date())}')">+ Termin / Erinnerung</button>`:''}</div><div class="calWeekHead">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div>${x}</div>`).join('')}</div><div class="calGrid">${cells.join('')}</div>`);
}
function calMove(n){CalendarState.date=new Date(CalendarState.date.getFullYear(),CalendarState.date.getMonth()+n,1);render()}
function openCalendarEvent(id,date){
  const old=id?Store.calendarEvents.find(x=>x.id===id):null;
  if(old&&!calendarCanManage(old)){toast('Nur Admin oder zuständige Stufenleitung kann diesen Termin bearbeiten');return;}
  if(!old&&!calendarCanManage()){toast('Nur Admin oder Stufenleitung kann Termine anlegen');return;}
  State.dialog={mode:'calendar',id,date};renderDialog();
}
function calendarGradeOptions(e){
  if(Auth.isAdmin())return `<option value="all" ${!e.grade||e.grade==='all'?'selected':''}>alle Stufen</option>${[5,6,7].map(g=>`<option value="${g}" ${Number(e.grade)===g?'selected':''}>Stufe ${g}</option>`).join('')}`;
  return visibleYears().filter(g=>Auth.canLead(g)).map(g=>`<option value="${g}" ${Number(e.grade||State.year)===g?'selected':''}>Stufe ${g}</option>`).join('');
}
function renderCalendarDialog(target){
  const old=State.dialog.id?Store.calendarEvents.find(x=>x.id===State.dialog.id):null,e=old||{title:'',date:State.dialog.date||calISO(new Date()),endDate:State.dialog.date||calISO(new Date()),time:'',endTime:'',category:'Schule',offerName:'',location:'',notes:'',visibility:'all',grade:Auth.isAdmin()?'all':State.year,targetTeam:'all',reminder:false};
  const grade=e.grade&&e.grade!=='all'?Number(e.grade):State.year,teams=calTeamsForGrade(grade);
  target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>${old?'Termin bearbeiten':'Termin / Erinnerung anlegen'}</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><label>Titel</label><input id="cal_title" value="${esc(e.title)}"><div class="formgrid"><div><label>Von</label><input id="cal_date" type="date" value="${esc(e.date)}"></div><div><label>Bis</label><input id="cal_enddate" type="date" value="${esc(e.endDate||e.date)}"></div><div><label>Beginn optional</label><input id="cal_time" type="time" value="${esc(e.time)}"></div><div><label>Ende optional</label><input id="cal_end" type="time" value="${esc(e.endTime)}"></div><div><label>Kategorie</label><select id="cal_cat">${['Schule','Kreativband','Besonderes Angebot','Team','Konferenz','Termin','Deadline','Sonstiges'].map(c=>`<option ${e.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div><label>Gilt für</label><select id="cal_grade" onchange="calendarDialogGradeChanged()">${calendarGradeOptions(e)}</select></div><div><label>Lerngruppe</label><select id="cal_team"><option value="all" ${!e.targetTeam||e.targetTeam==='all'?'selected':''}>alle Lerngruppen</option>${teams.map(t=>`<option ${e.targetTeam===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div><div><label>Besonderes Angebot optional</label><input id="cal_offer" value="${esc(e.offerName||'')}" placeholder="z. B. QUOP"></div></div><label class="check"><input id="cal_reminder" type="checkbox" ${e.reminder?'checked':''}> als Erinnerung bei den zuständigen Lerncoaches anzeigen</label><label>Ort</label><input id="cal_loc" value="${esc(e.location)}"><label>Notizen</label><textarea id="cal_notes">${esc(e.notes)}</textarea><p class="mini">Bei Erinnerungen erscheint der Eintrag während des gesamten Zeitraums in der Übersicht der betroffenen Lerncoaches. Eine Stufenleitung kann nur Termine ihrer eigenen Stufe verwalten.</p><button class="chip dark" onclick="saveCalendarEvent()">Speichern</button>${old?`<button class="chip" onclick="deleteCalendarEvent()">Löschen</button>`:''}</div></div>`;
}
function calendarDialogGradeChanged(){const grade=document.getElementById('cal_grade').value,sel=document.getElementById('cal_team'),old=sel.value;sel.innerHTML='<option value="all">alle Lerngruppen</option>'+(grade==='all'?[]:calTeamsForGrade(Number(grade))).map(t=>`<option>${esc(t)}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old;}
function saveCalendarEvent(){
  const old=State.dialog.id?Store.calendarEvents.find(x=>x.id===State.dialog.id):null,e=old||{id:uid('event'),createdAt:new Date().toISOString(),createdBy:Auth.currentUser()?.name||State.teacher};
  e.title=document.getElementById('cal_title').value.trim();e.date=document.getElementById('cal_date').value;e.endDate=document.getElementById('cal_enddate').value||e.date;e.time=document.getElementById('cal_time').value;e.endTime=document.getElementById('cal_end').value;e.category=document.getElementById('cal_cat').value;e.grade=document.getElementById('cal_grade').value;e.targetTeam=document.getElementById('cal_team').value;e.offerName=document.getElementById('cal_offer').value.trim();e.reminder=document.getElementById('cal_reminder').checked;e.location=document.getElementById('cal_loc').value.trim();e.notes=document.getElementById('cal_notes').value.trim();e.updatedAt=new Date().toISOString();e.updatedBy=Auth.currentUser()?.name||State.teacher;
  if(!e.title||!e.date){alert('Bitte Titel und Startdatum eintragen.');return}if(e.endDate<e.date){alert('Das Bis-Datum darf nicht vor dem Von-Datum liegen.');return}if(!calendarCanManage(e)){alert('Du kannst nur Termine deiner eigenen Stufe verwalten.');return}
  if(!old)Store.calendarEvents.push(e);Store.save('Kalendertermin gespeichert',{target:e.title,date:e.date,endDate:e.endDate,grade:e.grade,team:e.targetTeam});State.dialog=null;toast();render();
}
function deleteCalendarEvent(){const e=Store.calendarEvents.find(x=>x.id===State.dialog.id);if(!e||!calendarCanManage(e)||!confirm('Termin wirklich löschen?'))return;Store.calendarEvents=Store.calendarEvents.filter(x=>x.id!==e.id);Store.save('Kalendertermin gelöscht',{target:e.title,date:e.date});State.dialog=null;toast('Gelöscht');render()}
function logs(){if(!Auth.isAdmin()){shell(header('Kein Zugriff','Änderungsprotokolle sind nur für Admins sichtbar.'));return}const rows=Store.auditLog.slice().reverse().slice(0,500);shell(header('Änderungsprotokoll','Die letzten 500 protokollierten Änderungen in KOMPASS.')+`<div class="card"><div class="logList">${rows.map(l=>`<div class="logRow"><div><b>${esc(l.action)}</b><div class="mini">${esc(l.user||'System')} · ${new Date(l.at).toLocaleString('de-DE')}</div></div><div class="mini">${esc((l.sections||[]).join(', '))}${l.details?.target?' · '+esc(l.details.target):''}</div></div>`).join('')||'<div class="empty">Noch keine Änderungen protokolliert.</div>'}</div></div>`)}
