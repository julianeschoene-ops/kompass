/* Klassenleitungs-Dashboard: getrennt vom individuellen Coaching. */
(function(){
 if(typeof Coaching==='undefined')return;
 const previousRender=Coaching.render;
 const safe=v=>esc(String(v??''));
 const date=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('de-DE');};
 Coaching.render=function(){
  if(this.section!=='home'||!this.allowed())return previousRender.call(this);
  if((!this.loaded||this.grade!==State.year)&&!this.loading){this.loaded=false;this.load();}
  const team=this.classTeam()||this.classGroup()||'';
  const pupils=this.classPupils();
  const ids=new Set(pupils.map(p=>String(p.id)));
  const classKey=this.classKey();
  const all=(this.rows||[]).filter(r=>r.group_key===classKey||(r.pupil_id&&ids.has(String(r.pupil_id))));
  const tasks=all.filter(r=>!r.done&&['aufgabe','vereinbarung'].includes(r.kind)).sort((a,b)=>String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')));
  const today=new Date().toISOString().slice(0,10);
  const due=tasks.filter(r=>r.due_date&&r.due_date<=today);
  const listRows=this.listRecords();
  const open=listRows.filter(r=>!r.done);
  const titles=[...new Set(open.map(r=>String(r.title||'').replace(/^Liste: /,'')))];
  const btn=(label,target)=>'<button class="chip" onclick="Coaching.openWorkspace(&quot;'+target+'&quot;)">'+label+'</button>';
  const card=(title,count,detail,target)=>'<button class="coCard" style="text-align:left;cursor:pointer;color:inherit" onclick="Coaching.openWorkspace(&quot;'+target+'&quot;)"><h3>'+title+'</h3><div class="coMetric">'+count+'</div><p class="coMuted">'+detail+'</p></button>';
  const style='<style>.classHome{max-width:1220px;color:#25314a}.classHome .coGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:13px;margin:16px 0}.classHome .coCard{background:#fff;border:1px solid #e1e5ed;border-radius:14px;padding:18px}.classHome .coCard h3{margin:0 0 10px;font-size:16px}.classHome .coMetric{font-size:25px;font-weight:750}.classHome .coMuted{color:#68748a;font-size:13px}.classHome .coTabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.classHome .coTabs button{border:1px solid #dbe1eb;background:#fff;border-radius:24px;padding:9px 15px;cursor:pointer;color:#34435c}.classHome .coTabs button[aria-current=true]{background:#735b9c;border-color:#735b9c;color:#fff}.classHome .coTop{background:#f2ecf8;border-radius:17px;padding:22px 25px}.classHome .coTop h1{margin:0;font-size:25px;color:#3e594c}.classHome .coTop p{margin:5px 0 0;color:#68728a}.classHome .coCard p{margin:8px 0}.classHome .coCard button{margin-top:12px}@media(max-width:650px){.classHome .coGrid{grid-template-columns:1fr}}</style>';
  let html=style+'<div class="classHome"><div class="coTop"><h1>Meine Klassen</h1><p>'+safe(team)+' · Jahrgang '+State.year+'</p></div>';
  html+='<div class="coTabs">'+[['home','Übersicht'],['coaching','Coaching'],['listen','Listen'],['vereinbarung','Absprachen'],['aufgabe','Aufgaben']].map(([id,label])=>'<button aria-current="'+(id==='home')+'" onclick="Coaching.openWorkspace(&quot;'+id+'&quot;)">'+label+'</button>').join('')+'</div>';
  html+='<div class="coGrid">'+card('Aktuell wichtig',due.length,'Fällige Aufgaben und Absprachen','aufgabe')+card('Noch zu erledigen',tasks.length,'Offene Aufgaben und Vereinbarungen','aufgabe')+card('Unsere Klasse',pupils.length,'Kinder · '+safe(team),'coaching')+card('Einsammeln & Rücklauf',open.length,'Offene Rückmeldungen in '+titles.length+' Listen','listen')+'</div>';
  html+='<h2>Das steht jetzt an</h2><div class="coGrid"><section class="coCard"><h3>Aufgaben & Fristen</h3>'+(tasks.length?tasks.slice(0,7).map(r=>'<p><strong>'+safe(r.title)+'</strong>'+(r.due_date?' · '+safe(date(r.due_date)):'')+'</p>').join(''):'<p class="coMuted">Noch keine offenen Aufgaben dokumentiert.</p>')+btn('Aufgaben öffnen','aufgabe')+'</section><section class="coCard"><h3>Rücklauf & Listen</h3>'+(titles.length?titles.slice(0,7).map(t=>'<p><strong>'+safe(t)+'</strong> · '+open.filter(r=>String(r.title||'').replace(/^Liste: /,'')===t).length+' offen</p>').join(''):'<p class="coMuted">Keine offenen Rückgaben dokumentiert.</p>')+btn('Listen öffnen','listen')+'</section></div>';
  html+='<section class="coCard"><h3>Gemeinsam den Überblick behalten</h3><p class="coMuted">Aufgaben, Absprachen und Klassenlisten werden aus den vorhandenen KOMPASS-Einträgen übernommen. Was noch nicht dokumentiert ist, erscheint hier nicht automatisch.</p>'+btn('Absprachen öffnen','vereinbarung')+' '+btn('Coaching öffnen','coaching')+'</section>';
  if(this.error)html+='<p class="coMuted">'+safe(this.error)+'</p>';
  shell(html+'</div>');
 };
})();
