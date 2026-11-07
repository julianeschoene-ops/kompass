/* KOMPASS 8.5.61 — consolidated class and coaching workspace.
   Existing Supabase save/edit flows remain authoritative. Kreativband untouched. */
(function(){
 const previous=Coaching.render;
 const oldSelect=Coaching.selectPupil;
 Coaching.selectPupil=function(id){this.v2Mode='overview';this.v2Edit='';return oldSelect.call(this,id);};
 const oldSave=Coaching.saveLearningEntry;
 Coaching.switchV2Mode=function(mode){if(this.v2Mode==='new'&&mode!=='new'&&this.hasUnsavedEntry()&&!confirm('Ungespeicherte Gesprächsnotizen verwerfen?'))return;this.v2Mode=mode;this.v2Edit='';render();};
 Coaching.saveLearningEntry=async function(){this.newEntryOpen=true;const result=await oldSave.call(this);if(!this.error&&!this.newEntryOpen){this.v2Mode='overview';render();}return result;};
 const oldUpdate=Coaching.updateEntry;
 Coaching.updateEntry=async function(id){await oldUpdate.call(this,id);this.v2Edit='';render();};
 const oldUnsaved=Coaching.hasUnsavedEntry;
 Coaching.hasUnsavedEntry=function(){return oldUnsaved.call(this)||!!(this.v2Mode==='new'&&(document.getElementById('co_body')?.value.trim()||document.getElementById('co_followup')?.value.trim()||document.getElementById('co_next_task')?.value.trim()));};
 const h=x=>esc(String(x??''));
 const date=x=>x?new Date(x).toLocaleDateString('de-DE'):'—';
 const pupilRows=(c,id)=>(c.rows||[]).filter(r=>String(r.pupil_id)===String(id)&&!['checkliste','statusereignis'].includes(r.kind));
 const year=p=>Number(p.year||String(p.className||'').charAt(0));
 const subjects=p=>{
  const y=year(p),out=[];
  for(const name of ['Deutsch','Mathematik','Englisch']){
   const cs=(Store.competencies||[]).filter(c=>c.subject===name&&(Number(c.year)===y||Object.prototype.hasOwnProperty.call(Store.records||{},c.id+'|'+p.id)));
   const vals=cs.map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(v=>['green','yellow','red'].includes(v));
   out.push({name,all:cs.length,assessed:vals.length,green:vals.filter(v=>v==='green').length,yellow:vals.filter(v=>v==='yellow').length,red:vals.filter(v=>v==='red').length});
  }
  return out;
 };
 const evidence=p=>{
  const all=Store.competencies||[],records=Store.records||{},id=String(p.id);
  const relevant=all.filter(c=>Number(c.year)===year(p)||Object.prototype.hasOwnProperty.call(records,c.id+'|'+id));
  const rated=relevant.map(c=>({c,r:records[c.id+'|'+id]})).filter(x=>['red','yellow','green'].includes(x.r?.current));
  const concerns=rated.filter(x=>['red','yellow'].includes(x.r.current)).sort((a,b)=>(a.r.current==='red'?0:1)-(b.r.current==='red'?0:1));
  const strengths=rated.filter(x=>x.r.current==='green');
  const behaviour=Store.behaviour?.[p.id]||{};
  const rows=pupilRows(Coaching,p.id);
  const last=rows.filter(x=>x.kind==='gespraech').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  const overdue=rows.filter(x=>!x.done&&['vereinbarung','aufgabe'].includes(x.kind)&&x.due_date&&x.due_date<new Date().toISOString().slice(0,10));
  const observations=Array.isArray(behaviour.observations)?behaviour.observations:[];
  return {rated,concerns,strengths,last,overdue,observations,configured:relevant.length};
 };
 const evidenceHtml=(p,prep)=>{
  const e=evidence(p),items=[];
  if(e.concerns.length)items.push('<section class="coCard"><h3>Unterstützungsbedarf · Fachbewertungen</h3>'+e.concerns.slice(0,7).map(x=>'<p><strong>'+h(x.c.subject)+'</strong> · '+h(x.c.text||x.c.category||'Kompetenz')+' <span class="coTag">'+(x.r.current==='red'?'Noch nicht erreicht':'Teilweise erreicht')+'</span></p>').join('')+'</section>');
  if(e.strengths.length)items.push('<section class="coCard"><h3>Dokumentierte Stärken</h3>'+e.strengths.slice(0,5).map(x=>'<p><strong>'+h(x.c.subject)+'</strong> · '+h(x.c.text||x.c.category||'Kompetenz')+'</p>').join('')+'</section>');
  if(e.overdue.length)items.push('<section class="coCard"><h3>Fällige nächste Schritte</h3>'+e.overdue.map(x=>'<p>'+h(x.body)+' · '+h(x.due_date)+'</p>').join('')+'</section>');
  if(e.observations.length)items.push('<section class="coCard"><h3>Beobachtungen zum Arbeits- und Sozialverhalten</h3>'+e.observations.slice(-4).map(x=>'<p>'+h(typeof x==='string'?x:(x.text||x.note||''))+'</p>').join('')+'</section>');
  if(!e.configured)items.push('<section class="coCard"><h3>Fachbewertungen fehlen</h3><p class="coMuted">Für diesen Jahrgang sind keine Kernfach- oder Themenfeldkompetenzen hinterlegt. Deshalb kann KOMPASS daraus noch keine Entwicklung ableiten.</p></section>');
  else if(!e.rated.length)items.push('<section class="coCard"><h3>Fachbewertungen noch offen</h3><p class="coMuted">'+e.configured+' Kompetenzen sind hinterlegt, aber für dieses Kind noch nicht bewertet.</p></section>');
  if(!items.length)items.push('<section class="coCard"><h3>Keine auffälligen Einträge</h3><p class="coMuted">In den verfügbaren Bewertungen, Beobachtungen und Vereinbarungen liegen derzeit keine dokumentierten Hinweise vor. Das ist keine automatische Beurteilung.</p></section>');
  return '<h3>'+(prep?'Datengestützte Gesprächsvorbereitung':'Auswertung vorhandener Daten')+'</h3><div class="coGrid">'+items.join('')+'</div>';
 };
 const trendFor=p=>{
  const grade=year(p),results=[];
  for(const c of (Store.competencies||[]).filter(c=>Number(c.year)===grade&&['core','workshop'].includes(c.type))){
   const r=Store.records?.[c.id+'|'+p.id];if(!r)continue;
   const h=(r.history||[]).filter(x=>!x.removed&&x.source!=='english_practice'&&['red','yellow','green'].includes(x.value)).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
   if(['red','yellow','green'].includes(r.current)&&(!h.length||h[h.length-1].value!==r.current))h.push({value:r.current,date:r.updatedAt||''});
   if(h.length<2)continue;
   const first=h[0],last=h[h.length-1],scale={red:0,yellow:1,green:2},delta=scale[last.value]-scale[first.value];
   results.push({subject:c.subject,text:c.text||c.category||'Kompetenz',delta,from:first.value,to:last.value,date:last.date});
  }
  return results;
 };
 const trendHtml=p=>{
  const trends=trendFor(p),improved=trends.filter(x=>x.delta>0),declined=trends.filter(x=>x.delta<0),steady=trends.filter(x=>x.delta===0);
  const card=(title,rows)=>'<section class="coCard"><h3>'+title+'</h3>'+(rows.length?rows.slice(0,6).map(x=>'<p><strong>'+h(x.subject)+'</strong> · '+h(x.text)+' <span class="coMuted">('+({red:'rot',yellow:'gelb',green:'grün'}[x.from])+' → '+({red:'rot',yellow:'gelb',green:'grün'}[x.to])+')</span></p>').join(''):'<p class="coMuted">Keine belegten Veränderungen.</p>')+'</section>';
  return '<h3>Entwicklung im Bewertungsverlauf</h3><p class="coMuted">Vergleich der ersten und letzten dokumentierten Bewertung je Kompetenz; Übungsdaten zählen nicht als Fachbewertung.</p><div class="coGrid">'+card('Verbesserungen · '+improved.length,improved)+card('Erneuter Unterstützungsbedarf · '+declined.length,declined)+card('Unverändert · '+steady.length,steady)+'</div>';
 };
 Coaching.openSubject=function(subject){if(this.hasUnsavedEntry()&&!confirm('Ungespeicherte Gesprächsnotizen verwerfen?'))return;this.v2Subject=subject;this.v2Mode='subject';render();};
 const subjectDetail=p=>{
  const subject=Coaching.v2Subject||'Deutsch',grade=year(p);
  const cs=(Store.competencies||[]).filter(c=>c.subject===subject&&!c.sprint&&c.type!=='workshop'&&(Number(c.year)===grade||Object.prototype.hasOwnProperty.call(Store.records||{},c.id+'|'+p.id)));
  return '<section class="coCard"><h3>'+h(subject)+' · Kompetenzstand</h3><p class="coMuted">Gespeicherte Fachbewertungen mit Bewertungsverlauf. Zum Bewerten das Fachmodul öffnen.</p>'+(cs.length?cs.map(c=>{const rec=Store.records?.[c.id+'|'+p.id]||{},hist=(rec.history||[]).filter(x=>!x.removed&&x.source!=='english_practice');return '<div style="border-top:1px solid #e7eaf0;padding:12px 0"><strong>'+h(c.text||c.category||'Kompetenz')+'</strong><p class="coMuted">Stand: '+h(({green:'erreicht',yellow:'teilweise erreicht',red:'noch nicht erreicht'})[rec.current]||'noch nicht bewertet')+(rec.level?' · Niveau '+h(rec.level):'')+'</p>'+(hist.length?'<details><summary>Bewertungsverlauf ('+hist.length+')</summary>'+hist.map(x=>'<p>'+h(x.date||'')+' · '+h(x.value||'')+(x.note?' · '+h(x.note):'')+'</p>').join('')+'</details>':'')+'</div>';}).join(''):'<p class="coMuted">Keine Kompetenzen für dieses Kind vorhanden.</p>')+'</section>';
 };
 const coachingPriority=x=>{
  const e=evidence(x.p),trends=trendFor(x.p),now=new Date(),days=x.last?Math.floor((now-new Date(x.last.created_at))/86400000):null;
  const reasons=[];
  if(e.overdue.length)reasons.push({score:100,label:e.overdue.length+' überfällige Vereinbarung(en)'});
  const worsening=trends.filter(t=>t.delta<0);
  if(worsening.length)reasons.push({score:90,label:'Veränderung in '+[...new Set(worsening.map(t=>t.subject))].join(', ')+' besprechen'});
  const reds=e.concerns.filter(t=>t.r.current==='red');
  if(reds.length){const bySubject={};for(const x of reds){const name=x.c.subject||'Fach';bySubject[name]=(bySubject[name]||0)+1;}reasons.push({score:85,label:Object.entries(bySubject).map(([subject,n])=>subject+': '+n+' rot').join(' · ')});}
  const soon=x.pending.filter(t=>t.due_date&&t.due_date>=now.toISOString().slice(0,10)&&t.due_date<=new Date(now.getTime()+7*86400000).toISOString().slice(0,10));
  if(soon.length)reasons.push({score:65,label:soon.length+' Ziel(e) diese Woche fällig'});
  if(days!==null&&days>=28)reasons.push({score:50,label:'Letztes Gespräch vor '+days+' Tagen'});
  if(days===null)reasons.push({score:30,label:'Noch kein Coachinggespräch dokumentiert'});
  reasons.sort((a,b)=>b.score-a.score);
  return {score:reasons[0]?.score||0,reasons};
 };
 const style='<style>.coNew{--coBorder:#e1e5ed;--coText:#25314a;color:var(--coText);max-width:1220px}.coNew .coTop{background:#f2ecf8;border-radius:17px;padding:22px 25px;margin:12px 0 20px}.coNew .coTop h1{margin:0;font-size:25px;color:#3e594c}.coNew .coTop p{margin:4px 0 0;color:#68728a}.coNew .coGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px;margin:14px 0}.coNew .coCard{background:#fff;border:1px solid var(--coBorder);border-radius:14px;padding:18px}.coNew .coPupilGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.coNew .coPupil{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:5px;cursor:pointer;min-height:105px;padding:12px 14px;color:inherit}.coNew .coPupil strong{font-size:15px}.coNew .coPupilFoot{margin-top:auto;font-size:12px;font-weight:700;color:#65538d}.coNew .coPupil:hover{border-color:#a69bc3;background:#f8f5fd}.coNew .coSubjectLink{display:block;text-align:left;cursor:pointer;width:100%;color:inherit}.coNew .coSubjectLink:hover{border-color:#a69bc3;background:#f8f5fd}.coNew .coCard h3{margin:0 0 10px;font-size:16px}.coNew .coMetric{font-size:25px;font-weight:750}.coNew .coMuted{color:#68748a;font-size:13px}.coNew .coRow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 17px;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid var(--coBorder);cursor:pointer;color:inherit}.coNew .coRow:hover{background:#f7f7fc}.coNew .coTable{border:1px solid var(--coBorder);border-radius:14px;overflow:hidden}.coNew .coTabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.coNew .coTabs button{border:1px solid #dbe1eb;background:white;border-radius:24px;padding:9px 15px;cursor:pointer;color:#34435c}.coNew .coTabs button[aria-current=true]{background:#293752;color:white}.coNew .coSubject{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eef0f4}.coNew .coTag{border-radius:20px;background:#edf0f6;padding:4px 9px;font-size:12px}.coNew .coEmpty{color:#68748a;font-size:14px;padding:12px 0}.coNew .coActions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.coNew .coActions button{border:1px solid #dce1e9;background:#fff;border-radius:9px;padding:9px 13px;cursor:pointer}.coNew .coActions button.primary{background:#293752;color:white}</style>';
 Coaching.openWorkspace=function(section){if(this.hasUnsavedEntry?.()&&!confirm('Ungespeicherte Gesprächsnotizen verwerfen?'))return;this.section=section;this.pupil='';this.newEntryOpen=false;this.prepOpen=false;render();};
 Coaching.render=function(){
  if(!this.allowed())return previous.call(this);
  if((!this.loaded||this.grade!==State.year)&&!this.loading){this.loaded=false;this.load();}
  const section=this.section||'home';

  if(section==='coaching'&&this.pupil){
   const p=this.coachPupils().find(x=>String(x.id)===String(this.pupil));
   if(!p)return previous.call(this);
   const rows=pupilRows(this,p.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
   const goals=rows.filter(x=>['vereinbarung','aufgabe'].includes(x.kind)&&!x.done);
   const mode=this.v2Mode||'overview';
   const action=(label,fn,active=false)=>'<button '+(active?'class="primary"':'')+' onclick="'+fn+'">'+label+'</button>';
   let html=style+'<div class="coNew"><div class="coTop"><button class="chip" onclick="Coaching.backToCoaching()">← Alle Kinder</button><h1>'+h(p.first+' '+p.last)+'</h1><p>'+h(p.team||'')+' · Jahrgang '+year(p)+' · '+rows.filter(x=>x.kind==='gespraech').length+' Gespräche · '+goals.length+' offene Vereinbarungen</p></div>';
   html+='<div class="coActions">'+action('Übersicht',"Coaching.switchV2Mode('overview')",mode==='overview')+action('Gespräch vorbereiten',"Coaching.switchV2Mode('prep')",mode==='prep')+action('+ Gespräch dokumentieren',"Coaching.switchV2Mode('new')",mode==='new')+action('LEB',"Coaching.openPupilProfile("+JSON.stringify(String(p.id)).replace(/"/g,'&quot;')+")")+'</div>';
   const subj=subjects(p);
   const subjectsHtml='<div class="coGrid">'+subj.map(x=>'<button class="coCard coSubjectLink" onclick="Coaching.openSubject(\''+x.name+'\')"><h3>'+h(x.name)+' ↗</h3><div class="coMetric">'+(x.all?x.assessed+' <span class="coMuted">/ '+x.all+' Kompetenzen</span>':'<span class="coMuted">Keine Fachkompetenzen hinterlegt</span>')+'</div>'+(x.all?'<div class="coMuted">'+x.green+' erreicht · '+x.yellow+' teilweise · '+x.red+' noch offen</div>':'')+'</button>').join('')+'</div>';
   if(mode==='overview'||mode==='prep'){html+=subjectsHtml;html+=evidenceHtml(p,mode==='prep');html+=trendHtml(p);}if(mode==='subject'){html+='<div class="coActions"><button onclick="Coaching.switchV2Mode(\'overview\')">← Zur Übersicht</button></div>'+subjectDetail(p);}
   if(mode==='prep'){
    const last=rows.find(x=>x.kind==='gespraech');
    html+='<div class="coGrid"><section class="coCard"><h3>Letztes Gespräch</h3>'+(last?'<p>'+date(last.created_at)+'</p><p>'+h(last.body)+'</p>':'<p class="coEmpty">Noch kein Gespräch dokumentiert.</p>')+'</section><section class="coCard"><h3>Offene Vereinbarungen</h3>'+(goals.length?goals.map(x=>'<p><strong>'+h(x.title)+'</strong> '+h(x.body)+(x.due_date?' · bis '+h(x.due_date):'')+'</p>').join(''):'<p class="coEmpty">Keine offenen Vereinbarungen.</p>')+'</section><section class="coCard"><h3>LEB und weitere Entwicklung</h3><p>'+(Store.lebDrafts?.[p.id]?'LEB-Entwurf vorhanden':'Noch kein LEB-Entwurf')+'</p><p class="coMuted">Die Kompetenzbewertungen oben stammen aus den gespeicherten Fachbewertungen.</p></section></div>';
    html+='<div class="coCard"><h3>Gesprächsleitfaden</h3><p>Was ist seit dem letzten Gespräch gelungen? Welche Kompetenzen haben sich verändert? Was ist gerade schwierig? Welches konkrete Ziel vereinbaren wir bis wann?</p>'+action('Gespräch dokumentieren',"Coaching.switchV2Mode('new')",true)+'</div>';
   }else if(mode==='new'){
    html+='<section class="coCard" id="coachingEntryComposer"><h3>Gespräch dokumentieren</h3><input type="hidden" id="co_pupil" value="'+h(p.id)+'"><div class="coGrid"><label>Gesprächsdatum (auch rückwirkend)<input type="date" id="co_date" value="'+new Date().toISOString().slice(0,10)+'"></label><label>Art des Eintrags<select id="co_kind"><option value="gespraech">Coachinggespräch</option><option value="elternkontakt">Wohlbefinden / Soziales</option><option value="vereinbarung">Vereinbarung</option><option value="aufgabe">Aufgabe</option></select></label><label>Wiedervorlage<input type="date" id="co_due"></label></div><label>Gesprächsnotizen<textarea id="co_body" rows="5" style="width:100%" placeholder="Beobachtungen, Entwicklung, Gesprächsinhalte"></textarea></label><div class="coGrid"><label>Vereinbartes Ziel<textarea id="co_followup" rows="3" style="width:100%"></textarea></label><label>Nächster Schritt / Aufgabe<textarea id="co_next_task" rows="3" style="width:100%"></textarea></label></div><div class="coActions">'+action('Eintrag speichern','Coaching.saveLearningEntry()',true)+action('Abbrechen',"Coaching.switchV2Mode('overview')")+'</div></section>';
   }else if(mode==='overview'){
    html+='<h3>Verlauf und Vereinbarungen</h3><div class="coCard">'+(rows.length?rows.map(x=>'<article style="padding:13px 0;border-bottom:1px solid #e5e9ef"><div style="display:flex;justify-content:space-between;gap:12px"><strong>'+h(x.title)+'</strong><span class="coMuted">'+date(x.created_at)+'</span></div><p>'+h(x.body)+'</p>'+(x.due_date?'<p class="coMuted">Wiedervorlage: '+h(x.due_date)+'</p>':'')+'<div class="coActions">'+(['vereinbarung','aufgabe'].includes(x.kind)?action(x.done?'Wieder öffnen':'Als erledigt markieren',"Coaching.setEntryDone("+JSON.stringify(x.id)+","+(!x.done)+")"):'')+action('Bearbeiten',"Coaching.v2Edit="+JSON.stringify(x.id)+";render()")+'</div>'+(this.v2Edit===x.id?'<div class="coCard"><label>Datum<input type="date" id="co_edit_date_'+x.id+'" value="'+String(x.created_at).slice(0,10)+'"></label><label>Art<select id="co_edit_kind_'+x.id+'">'+[['gespraech','Gespräch'],['vereinbarung','Vereinbarung'],['aufgabe','Aufgabe'],['elternkontakt','Soziales']].map(z=>'<option value="'+z[0]+'" '+(z[0]===x.kind?'selected':'')+'>'+z[1]+'</option>').join('')+'</select></label><label>Wiedervorlage<input type="date" id="co_edit_due_'+x.id+'" value="'+h(x.due_date||'')+'"></label><label>Notiz<textarea id="co_edit_body_'+x.id+'" rows="4" style="width:100%">'+h(x.body)+'</textarea></label><div class="coActions">'+action('Änderungen speichern',"Coaching.updateEntry("+JSON.stringify(x.id)+")",true)+action('Schließen',"Coaching.v2Edit='';render()")+'</div></div>':'')+'</article>').join(''):'<p class="coEmpty">Noch keine Gespräche dokumentiert. Du kannst direkt ein Gespräch erfassen.</p>')+'</div>';
   }
   shell(html+'</div>');return;
  }
  if(!['home','coaching'].includes(section))return previous.call(this);
  const pupils=this.coachPupils(),today=Date.now();
  const summary=pupils.map(p=>{
   const rows=pupilRows(this,p.id),last=rows.filter(r=>r.kind==='gespraech').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
   const pending=rows.filter(r=>['vereinbarung','aufgabe'].includes(r.kind)&&!r.done);
   return {p,last,pending,due:!last||today-new Date(last.created_at).getTime()>28*86400000};
  });
  let html=style+'<div class="coNew"><div class="coTop"><h1>Meine Klassen</h1><p>'+h(this.classTeam()||this.classGroup())+' · Jahrgang '+State.year+'</p></div>';
  html+='<div class="coTabs">'+[['home','Übersicht'],['coaching','Coaching'],['listen','Listen'],['vereinbarung','Absprachen'],['aufgabe','Aufgaben']].map(([id,label])=>'<button aria-current="'+(section===id)+'" onclick="Coaching.openWorkspace(\''+id+'\')">'+label+'</button>').join('')+'</div>';
  html+='<div class="coGrid"><div class="coCard"><div class="coMetric">'+pupils.length+'</div><div class="coMuted">Coachingkinder</div></div><div class="coCard"><div class="coMetric">'+summary.filter(x=>x.due).length+'</div><div class="coMuted">Gespräche prüfen (28 Tage)</div></div><div class="coCard"><div class="coMetric">'+summary.reduce((n,x)=>n+x.pending.length,0)+'</div><div class="coMuted">Offene Vereinbarungen und Aufgaben</div></div></div>';
  html+='<h3>Coaching diese Woche</h3><p class="coMuted">Priorisiert nach fälligen Vereinbarungen, dokumentierten Kompetenzveränderungen und Gesprächsabstand. Hinweise sind Gesprächsanlässe, keine Bewertungen der Kinder.</p><div class="coPupilGrid">'+summary.map(x=>({...x,priority:coachingPriority(x)})).sort((a,b)=>b.priority.score-a.priority.score||String(a.p.last||'').localeCompare(String(b.p.last||''),'de')).map(x=>{const reasons=x.priority.reasons;return '<button class="coCard coPupil" onclick="Coaching.section=\'coaching\';Coaching.selectPupil('+JSON.stringify(String(x.p.id)).replace(/"/g,'&quot;')+')"><strong>'+h(x.p.first+' '+x.p.last)+'</strong><span class="coMuted">'+(x.last?'Letztes Gespräch '+date(x.last.created_at):'Noch kein Gespräch')+'</span><span class="coMuted">'+(reasons.length?reasons.slice(0,2).map(y=>h(y.label)).join(' · '):'Aktuell kein dringender Anlass dokumentiert')+'</span><span class="coPupilFoot">'+(x.priority.score>=65?'Diese Woche besprechen':x.priority.score>=30?'Gespräch einplanen':'Entwicklung ansehen')+' →</span></button>';}).join('')+'</div>';
  html+='</div>';
  if(this.error)html+='<p class="coMuted">'+h(this.error)+'</p>';
  shell(html);
 };
})();