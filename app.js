const State={view:'dashboard',year:6,sprint:1,subject:'Englisch',competency:null,pupil:null,search:'',team:'alle',teacher:'',role:'teacher',dialog:null,cloudLoadError:null};
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function today(){return new Date().toLocaleDateString('de-DE');}
function recKey(c,p){return c+'|'+p;} function visibleYears(){const y=Auth.allowedGrades();return y.length?y:[State.year];} function canEdit(){return Auth.canLead(State.year);} function canManageRoster(){return Auth.isAdmin()||Auth.canLead(State.year);}
function scoreToStatus(p,r=24,y=74){return p<=r?'red':p<=y?'yellow':'green';}
function statusPlain(s){return s==='green'?'erreicht':s==='yellow'?'teilweise erreicht':s==='red'?'noch nicht erreicht':'ohne Eintrag';}
function statusLabel(s){return `<span class="statusPill status-${s||'empty'}">${statusPlain(s)}</span>`;}
function teamColor(t){const x=String(t||'').toLowerCase();if(x.includes('blau'))return'blue';if(x.includes('rot')||x.includes('pink'))return'rose';if(x.includes('gelb'))return'amber';if(x.includes('lila')||x.includes('violett'))return'violet';return'mint';}
function filteredPupils(){return (Store.pupils||[]).filter(p=>!p.archived&&Number(p.year||String(p.className).charAt(0))===State.year).filter(p=>State.team==='alle'||p.team===State.team).filter(p=>!State.search||`${p.first} ${p.last} ${p.short}`.toLowerCase().includes(State.search.toLowerCase())).sort((a,b)=>a.last.localeCompare(b.last,'de')||a.first.localeCompare(b.first,'de'));}
function sprintObj(){return Store.sprints.find(s=>s.year===State.year&&s.number===State.sprint)} function sprintName(n){return Store.sprints.find(s=>s.year===State.year&&s.number===n)?.name||`Sprint ${n}`;}
function toast(msg=(typeof Sync!=='undefined'&&Sync.enabled&&Sync.enabled()?'Wird in der Cloud gespeichert …':'Lokal gespeichert'),duration=1800){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>t.classList.remove('show'),duration)}
function header(title,hint=''){return `<div class="pageHead"><div><h1>${esc(title)}</h1>${hint?`<div class="hint">${esc(hint)}</div>`:''}</div><span class="badge">KOMPASS 8.5.58</span></div>`;}
const NAV=[['dashboard','⌂','Übersicht'],['students','👥','Schüler*innen'],['core','📚','Fächer'],['activities','🎨','Angebote'],['leb','📝','LEB'],['learningAtelier','🏫','Lernatelier'],['coaching','✎','Meine Klassen'],['teams','◉','Teams & Coaching'],['planner','⇄','Einteilungsassistent'],['calendar','◫','Kalender'],['timetable','📅','Stundenplanung'],['noiseStandalone','🚦','Lärmampel'],['roomOccupancy','🏫','Raum- & Wochenpläne'],['organization','▦','Organisation'],['admin','⚙️','Verwaltung'],['logs','≡','Protokoll'],['backup','⬇️','Datensicherung']];
const NAV_GROUPS=[['Start',['dashboard']],['Unterricht',['core','learningAtelier','activities']],['Schüler & Klassen',['students','coaching','leb']],['Organisation',['calendar','noiseStandalone','roomOccupancy','timetable','planner','teams']],['Verwaltung',['admin','logs','backup']]];
function navOpen(group){try{const v=JSON.parse(sessionStorage.getItem('kompass-nav-groups-v2')||'null');return v===null?['Start','Unterricht','Schüler & Klassen','Organisation','Verwaltung'].includes(group):v.includes(group)}catch(e){return true}}
function toggleNavGroup(group){let a;try{a=JSON.parse(sessionStorage.getItem('kompass-nav-groups-v2')||'null')}catch(e){}if(!Array.isArray(a))a=NAV_GROUPS.map(x=>x[0]);a=a.includes(group)?a.filter(x=>x!==group):[...a,group];sessionStorage.setItem('kompass-nav-groups-v2',JSON.stringify(a));render()}
function shell(content){
 const u=Auth.currentUser();State.teacher=u?.name||'';State.role=u?.role||'teacher';
 const nav=NAV.filter(([v])=>{if(['timetable','logs','backup','admin'].includes(v))return Auth.isAdmin();if(['teams','planner'].includes(v))return Auth.isAdmin()||Auth.canLead(State.year);return true;});
 const menu=NAV_GROUPS.map(([group,ids])=>{const links=ids.map(id=>nav.find(x=>x[0]===id)).filter(Boolean);return links.length?'<div class="globalMenuGroup"><div class="globalMenuLabel">'+esc(group)+'</div>'+links.map(([id,icon,label])=>'<button type="button" class="'+(State.view===id?'isCurrent':'')+'" onclick="KompassNav.go(\''+id+'\')">'+esc(label)+'</button>').join('')+'</div>':'';}).join('');
 const year='<select aria-label="Jahrgang" class="globalYear" onchange="State.year=Number(this.value);State.team=\'alle\';render()">'+visibleYears().map(y=>'<option value="'+y+'" '+(State.year===y?'selected':'')+'>Jahrgang '+y+'</option>').join('')+'</select>';
 const sidebar='<aside class="persistentNav"><button type="button" class="sidebarLogo" onclick="KompassNav.go(\'dashboard\')">KOMPASS</button><nav class="sidebarMenu" aria-label="Bereiche">'+menu+'</nav><div class="sidebarAccount"><div class="sidebarAccountName">'+esc(u?.name||'')+'</div><div class="sidebarAccountRole">'+esc(u?.role==='admin'?'Administration':u?.role==='leitung'?'Stufenleitung':'Lehrkraft')+'</div><button type="button" onclick="openPasswordDialog()">Passwort ändern</button><button type="button" onclick="Auth.logout()">Konto wechseln</button></div></aside>';
 const bar='<header class="globalBar"><div class="globalBarLeft"><button type="button" class="globalBack" onclick="KompassNav.back()" aria-label="Zurück">← <span>Zurück</span></button><button type="button" class="globalLogo mobileLogo" onclick="KompassNav.go(\'dashboard\')">KOMPASS</button></div><div class="globalBarActions">'+year+'<details class="globalMenu mobileMenu"><summary>☰ <span class="menuText">Bereiche</span></summary><div class="globalMenuPanel">'+menu+'</div></details></div></header>';
 document.getElementById('app').innerHTML='<div class="app section-'+esc(State.view)+'">'+sidebar+'<div class="appWorkspace">'+bar+'<main>'+content+'</main></div></div>';
 renderDialog();
}
function loginScreen(){
  const localUsers=Auth.localUsers();const needsAdmin=!Auth.cloudConfigured()&&localUsers.length===0;document.getElementById('app').innerHTML=`<div class="loginPage"><div class="loginCard"><div class="brand">KOMPASS</div><div class="sub">Version 8.5.58 · ${Auth.cloudConfigured()?'gemeinsame Cloud-Speicherung':'lokale Einrichtung'}</div>${needsAdmin?`<h1>Ersten Admin anlegen</h1><p>Dieser Schritt richtet den ersten Zugang auf diesem Gerät ein.</p><label>Name</label><input id="login_name" placeholder="z. B. J. Schöne"><label>Benutzername</label><input id="login_user" autocomplete="username"><label>Passwort</label><input id="login_pass" type="password" autocomplete="new-password"><button class="chip dark wide" onclick="firstAdminLogin()">Admin anlegen</button>`:`<h1>Mit dem eigenen Konto anmelden</h1><label>${Auth.cloudConfigured()?'Schul-E-Mail':'Benutzername'}</label><input id="login_user" type="email" inputmode="email" autocapitalize="none" autocomplete="username"><label>Passwort</label><input id="login_pass" type="password" autocomplete="current-password"><label class="loginPasswordCheck"><input type="checkbox" onchange="togglePasswordVisibility(['login_pass'],this.checked)"> Passwort anzeigen</label><label class="loginRemember"><input type="checkbox" id="login_remember"> 7 Tage angemeldet bleiben</label><p class="mini">Nur auf dem eigenen Gerät auswählen. Lernatelier-Geräte bleiben automatisch angemeldet.</p><button class="chip dark wide" onclick="doLogin()">Anmelden</button>${Auth.cloudConfigured()?`<p class="mini">Auf gemeinsam genutzten Geräten anschließend immer „Konto wechseln“ wählen.</p>`:''}`}<div id="login_error" class="loginError"></div>${!Auth.cloudConfigured()?`<details class="setupDetails"><summary>Gemeinsame Speicherung einrichten</summary><p class="mini">Für mehrere Geräte wird Supabase benötigt. URL und öffentlicher Anon-Key werden nur auf diesem Gerät gespeichert.</p><label>Supabase URL</label><input id="cloud_url"><label>Anon Key</label><textarea id="cloud_key"></textarea><button class="chip" onclick="saveCloudSetup()">Cloud verbinden</button></details>`:''}</div></div>`;
}
function togglePasswordVisibility(ids,visible){for(const id of ids){const field=document.getElementById(id);if(field)field.type=visible?'text':'password'}}
function openPasswordDialog(){State.dialog={mode:'password'};renderDialog()}
function renderPasswordDialog(target){target.innerHTML=`<div class="dialogBackdrop"><div class="dialog"><div class="dialogHead"><h2>Passwort sicher ändern</h2><button class="iconBtn" onclick="State.dialog=null;renderDialog()">×</button></div><p>Das bisherige Passwort wird zuerst geprüft. Das neue Passwort wird erst als erfolgreich gemeldet, wenn auch eine neue Anmeldung damit bestätigt wurde.</p><label>Bisheriges Passwort</label><input id="own_password_current" type="password" autocomplete="current-password"><label>Neues Passwort</label><input id="own_password_1" type="password" autocomplete="new-password" minlength="10"><label>Neues Passwort wiederholen</label><input id="own_password_2" type="password" autocomplete="new-password" minlength="10"><label class="check"><input type="checkbox" onchange="togglePasswordVisibility(['own_password_current','own_password_1','own_password_2'],this.checked)"> Passwörter anzeigen</label><p class="mini">Mindestens 10 Zeichen. Verwende kein Passwort, das du bereits für ein anderes Konto nutzt.</p><button class="chip dark" onclick="saveOwnPassword()">Ändern und Anmeldung prüfen</button><button class="chip" onclick="State.dialog=null;renderDialog()">Abbrechen</button><div id="own_password_error" class="loginError"></div></div></div>`}
async function saveOwnPassword(){const err=document.getElementById('own_password_error'),current=document.getElementById('own_password_current').value,a=document.getElementById('own_password_1').value,b=document.getElementById('own_password_2').value;try{if(a!==b)throw new Error('Die beiden neuen Eingaben stimmen nicht überein.');if(err)err.textContent='Bisheriges Passwort und neue Anmeldung werden geprüft …';await Auth.changeOwnPassword(current,a);State.dialog=null;toast('Passwort geändert und neue Anmeldung geprüft',5000);render()}catch(e){if(err)err.textContent=e?.message||String(e)}}
function cloudLoadErrorScreen(){const localCount=(Store.data?.pupils||[]).length;document.getElementById('app').innerHTML=`<div class="loginPage"><div class="loginCard"><div class="brand">KOMPASS</div><div class="sub">Version 8.5.13 · Cloud-Verbindung</div><h1>Daten konnten nicht sicher geladen werden</h1><p>KOMPASS zeigt zum Schutz keinen leeren Ersatzbestand an und überschreibt keine möglicherweise vorhandenen lokalen Daten.</p><div class="loginError">${esc(State.cloudLoadError||'Unbekannter Cloud-Fehler')}</div>${localCount?`<p><b>${localCount} lokale Schülerdatensätze gefunden.</b></p><button class="chip dark wide" onclick="downloadEmergencyBackup()">Lokalen Notfall-Backup herunterladen</button>`:''}${Auth.isAdmin()?`<div class="section">Geprüften Bestand wiederherstellen</div><p class="mini">Wiederherstellungsdatei auswählen. Die drei Jahrgänge werden gemeinsam gespeichert und anschließend kontrolliert.</p><input id="recovery_file" type="file" accept="application/json,.json" onchange="restoreEmergencyFile(this.files[0])"><div id="recovery_status" class="mini"></div>`:''}<button class="chip wide" onclick="retryCloudLoad()">Erneut laden</button><button class="chip wide" onclick="Auth.logout()">Abmelden</button></div></div>`;}
function downloadEmergencyBackup(){const b=new Blob([JSON.stringify(Store.exportData(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`KOMPASS_NOTFALL_BACKUP_${new Date().toISOString().slice(0,10)}.json`;a.click();}
async function retryCloudLoad(){State.cloudLoadError=null;try{await Sync.pull();render()}catch(e){State.cloudLoadError=e?.message||String(e);render()}}
async function restoreEmergencyFile(file){if(!file)return;const status=document.getElementById('recovery_status');if(status)status.textContent='Wiederherstellung und Kontrollprüfung laufen …';try{const data=JSON.parse(await file.text()),counts=await Sync.restoreBackupData(data);State.cloudLoadError=null;toast('Cloudbestand vollständig wiederhergestellt',4000);render();alert(`Wiederherstellung erfolgreich: Jahrgang 5: ${counts[5]}, Jahrgang 6: ${counts[6]}, Jahrgang 7: ${counts[7]}.`)}catch(e){State.cloudLoadError='Wiederherstellung fehlgeschlagen: '+(e?.message||String(e));render()}}
function loginErr(e){const x=document.getElementById('login_error');if(x)x.textContent=e?.message||String(e)}
async function firstAdminLogin(){try{await Auth.createFirstAdmin(document.getElementById('login_name').value,document.getElementById('login_user').value,document.getElementById('login_pass').value);render()}catch(e){loginErr(e)}}
async function doLogin(){try{if(Auth.cloudConfigured()){Auth.setRemember(document.getElementById('login_remember')?.checked?7:0);if(!Auth.cloudClient)await Auth.initCloud();await Auth.cloudLogin(document.getElementById('login_user').value,document.getElementById('login_pass').value)}else await Auth.localLogin(document.getElementById('login_user').value,document.getElementById('login_pass').value);if(typeof laKioskLocked==='function'&&!laKioskLocked()){State.view='dashboard';laViewMode='teacher';}render()}catch(e){loginErr(e)}}
function showSignup(){loginErr(new Error('Neue Kollegiumskonten werden durch einen Admin in Verwaltung → Benutzer angelegt.'));}
async function doSignup(){loginErr(new Error('Neue Kollegiumskonten werden durch einen Admin angelegt.'));}
async function saveCloudSetup(){try{await Auth.saveCloudConfig(document.getElementById('cloud_url').value,document.getElementById('cloud_key').value)}catch(e){loginErr(e)}}
/* Unified monochrome line icons for dashboard and subject tiles only. */
function schoolTileIcon(name){
 const paths={
 book:'<path d="M4 5.5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0z"/><path d="M12 5.5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0z"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/>',
 clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/>',
 school:'<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-8h6v8M3 10h18"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1.5-3.4A2 2 0 0 1 17 14h1a4 4 0 0 0 4-4A9 9 0 0 0 12 3z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="16" cy="7" r="1"/>',
 file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h2m3 0h2"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
 text:'<path d="M4 6h16M9 6v13m6-13v13M6 19h6m0 0h6"/>',
 message:'<path d="M4 5h16v12H9l-5 4z"/><path d="M8 10h8m-8 3h5"/>',
 calculator:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v4H8zM8 14h1m3 0h1m3 0h1m-9 4h1m3 0h1m3 0h1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
 landmark:'<path d="m3 9 9-6 9 6M5 10h14M6 19V11m4 8v-8m4 8v-8m4 8v-8M3 21h18"/>',
 chart:'<path d="M4 20V4m0 16h16M8 16l4-5 3 2 5-7"/>',
 leaf:'<path d="M20 4C9 4 4 9 4 15a5 5 0 0 0 5 5c6 0 11-5 11-16zM4 20l11-11"/>',
 atom:'<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>',
 monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-3-13-2 2 2 2m6-4 2 2-2 2"/>',
 brush:'<path d="m14 4 6 6-8 8-6-6zM5 15c-3 0-3 4-3 6 4 0 7-1 7-4"/>',
 music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 activity:'<circle cx="12" cy="12" r="9"/><path d="m12 3 3 6-3 4-6-1-2 4m8-3 5 2 1 5"/>',
 candle:'<path d="M8 21h8m-7-2h6v-8H9zM12 9c-3-3 1-5 0-7 4 3 4 5 0 7z"/>',
 scale:'<path d="M12 3v18M5 7h14M7 7l-4 7h8zM17 7l-4 7h8zM8 21h8"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 wrench:'<path d="M20 6a6 6 0 0 1-8 7l-7 7a2 2 0 0 1-3-3l7-7a6 6 0 0 1 7-8l-4 4 4 4z"/>'
 };
 return '<svg class="schoolLineIcon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.book)+'</svg>';
}
function dashboard(){
 const tiles=[['core','book','Fächer'],['students','users','Schüler*innen'],['coaching','clipboard','Meine Klassen'],['learningAtelier','school','Lernatelier'],['activities','palette','Angebote'],['leb','file','LEB'],['organization','calendar','Organisation']];
 if(Auth.isAdmin())tiles.push(['admin','settings','Verwaltung']);
 const heading='<div class="schoolHomeTop"><div><h1>Mein Schulalltag</h1><span class="mini">Alles Wichtige auf einen Blick</span></div></div>';
 const cards='<div class="schoolHomeGrid">'+tiles.map(([id,icon,label])=>'<button class="schoolHomeTile tone-'+id+'" onclick="State.view=\''+id+'\';if(\''+id+'\'===\'core\')subjectHubMode=\'home\';if(\''+id+'\'===\'coaching\')Coaching.section=\'home\';render()"><span class="schoolTileIcon">'+schoolTileIcon(icon)+'</span><strong>'+label+'</strong></button>').join('')+'</div>';
 shell('<div class="homeDashboard">'+heading+'<section class="homeAgenda">'+coachReminderHtml(State.year)+'</section><div class="homeTilesHeading">Meine Bereiche</div>'+cards+'</div>');
}
function organization(){
 const options=[['calendar','Kalender','◫'],['roomOccupancy','Raum- & Wochenpläne','▦'],['timetable','Stundenplanung','▤'],['planner','Einteilungsassistent','⇄'],['teams','Teams & Coaching','◉']].filter(([id])=>!['timetable','planner','teams'].includes(id)||Auth.isAdmin()||(['planner','teams'].includes(id)&&Auth.canLead(State.year)));
 shell(header('Organisation')+'<div class="subjectTools">'+options.map(([id,name,icon])=>'<button class="subjectToolTile" onclick="State.view=\''+id+'\';render()"><span>'+icon+'</span><strong>'+esc(name)+'</strong></button>').join('')+'</div>');
}
async function reloadTeacherCloudData(){
 if(typeof Sync==='undefined'||!Sync.enabled()){toast('Cloud-Verbindung derzeit nicht verfügbar.');return;}
 try{
  await Sync.pull();
  State.cloudLoadError=null;
  render();
  const count=(Store.data?.pupils||[]).length;
  toast('Cloud neu geladen: '+count+' Schüler*innen',5000);
 }catch(e){
  State.cloudLoadError=e?.message||String(e);
  render();
 }
}
function backup(){shell(header('Datensicherung','Daten sichern oder eine bestehende Sicherung einspielen.')+`<div class="grid2"><div class="card"><h2>Sicherung herunterladen</h2><p>Enthält alle Schülerdaten, Bewertungen, Historien und Einteilungen.</p><button class="chip dark" onclick="downloadBackup()">Datensicherung herunterladen</button></div><div class="card"><h2>Sicherung einspielen</h2><input type="file" accept="application/json" onchange="restoreBackup(this.files[0])"></div></div>${Auth.isAdmin()?`<div class="card" style="margin-top:18px"><h2>Notfall-Wiederherstellung</h2><p>Geprüften Schülerbestand direkt und kontrolliert in der Cloud wiederherstellen.</p><input id="recovery_file" type="file" accept="application/json,.json" onchange="restoreEmergencyFile(this.files[0])"><div id="recovery_status" class="mini"></div></div>`:''}`)}
function downloadBackup(){const b=new Blob([JSON.stringify(Store.exportData(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`KOMPASS_8_3_5_${new Date().toISOString().slice(0,10)}.json`;a.click();}
function restoreBackup(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{if(Store.importData(JSON.parse(r.result))){toast('Sicherung eingespielt');render()}}catch(e){alert('Datei konnte nicht gelesen werden.')}};r.readAsText(f);}

function renderKeepingFocus(id){
  const old=document.getElementById(id),start=old?.selectionStart,end=old?.selectionEnd;
  render();
  const next=document.getElementById(id);
  if(next){next.focus({preventScroll:true});try{next.setSelectionRange(start??next.value.length,end??next.value.length)}catch(_e){}}
}
let creativeAutoRefreshBusy=false;
let creativeAutoRefreshAt=0;
async function creativeAutoRefresh(force=false){
 if(creativeAutoRefreshBusy||!Auth.isLoggedIn()||Auth.isLernatelier()||Auth.session?.mode!=='cloud'||typeof CreativeSyncV2==='undefined'||!CreativeSyncV2.ready)return;
 if(typeof Sync!=='undefined'&&(Sync.busy||Sync.dirty))return;
 if(!force&&Date.now()-creativeAutoRefreshAt<5000)return;
 creativeAutoRefreshBusy=true;creativeAutoRefreshAt=Date.now();
 try{
  await CreativeSyncV2.refresh();
  if(State.view==='activities'&&typeof render==='function')render();
 }catch(e){console.warn('Kreativband automatischer Cloud-Abruf',e)}
 finally{creativeAutoRefreshBusy=false}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')creativeAutoRefresh(true)});
window.addEventListener('pageshow',()=>creativeAutoRefresh(true));
function render(){if(!Auth.isLoggedIn())return loginScreen();if(Auth.isLernatelier()){State.view='learningAtelier';return laLimitedView();}if(typeof laKioskLocked==='function'&&laKioskLocked()){laViewMode='student';State.view='learningAtelier';return learningAtelier();}if(State.cloudLoadError)return cloudLoadErrorScreen();if(State.view==='dashboard')return dashboard();if(State.view==='calendar')return calendar();if(State.view==='organization')return organization();if(State.view==='students')return students();if(State.view==='learningAtelier')return learningAtelier();if(State.view==='teams')return teamManagement();if(State.view==='coaching')return coaching();if(State.view==='planner')return planner();if(State.view==='timetable')return timetable();if(State.view==='workshop')return workshop();if(State.view==='core')return subjectHub();if(State.view==='activities')return activities();if(State.view==='behaviour')return behaviour();if(State.view==='leb')return leb();if(State.view==='admin')return admin();if(State.view==='roomOccupancy')return roomOccupancy();if(State.view==='noiseStandalone')return noiseStandalonePage();if(State.view==='logs')return logs();if(State.view==='backup')return backup();dashboard();}
