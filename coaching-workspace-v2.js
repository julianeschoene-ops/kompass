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
  const y=year(p),records=Store.records||{},id=String(p.id);
  const all=(Store.competencies||[]).filter(c=>Number(c.year)===y||Object.prototype.hasOwnProperty.call(records,c.id+'|'+id));
  const names=[...new Set(all.map(c=>c.subject).filter(Boolean))];
  const preferred=['Deutsch','Mathematik','Englisch'];
  const ordered=[...preferred,...names.filter(n=>!preferred.includes(n)).sort((a,b)=>a.localeCompare(b,'de'))];
  return ordered.map(name=>{
   const cs=all.filter(c=>c.subject===name),vals=cs.map(c=>records[c.id+'|'+id]?.current).filter(v=>['green','yellow','red'].includes(v));
   return {name,all:cs.length,assessed:vals.length,green:vals.filter(v=>v==='green').length,yellow:vals.filter(v=>v==='yellow').length,red:vals.filter(v=>v==='red').length};
  }).filter(x=>x.all||preferred.includes(x.name));
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
  const la={room:String(p.learningAtelier||''),place:String(p.learningPlace||''),level:String(p.graduation||'')};
  return {rated,concerns,strengths,last,overdue,observations,la,configured:relevant.length};
 };
 const crossDomain=p=>{
  const id=String(p.id),activityById=new Map((Store.activities||[]).map(a=>[String(a.id),a]));
  const visits=Object.values(Store.dailyCreativeVisits||{}).filter(v=>v&&String(v.pupilId)===id&&v.date&&!v.cancelledAt&&activityById.get(String(v.activityId))?.type==='Kreativband');
  const attended=[...new Set(visits.map(v=>activityById.get(String(v.activityId))?.name).filter(Boolean))];
  const notes=Object.values(Store.activityRecords||{}).filter(v=>v&&String(v.pupilId)===id&&v.note&&activityById.get(String(v.activityId))?.type==='Kreativband').map(v=>({name:activityById.get(String(v.activityId))?.name||'Kreativband',note:String(v.note)}));
  const lab=Object.entries(Store.workshopPaths||{}).filter(([key])=>key.startsWith(id+'|')).map(([_,v])=>v?.lab).filter(Boolean);
  const leb=Object.entries(Store.lebDrafts||{}).filter(([key,value])=>key.startsWith(id+'|')&&typeof value==='string'&&value.trim()).map(([key,value])=>({subject:key.slice(id.length+1),text:value.trim()}));
  return {visits:visits.length,attended,notes,lab:[...new Set(lab)],leb};
 };
 const crossDomainHtml=p=>{
  const x=crossDomain(p),sections=[];
  if(x.notes.length)sections.push('<div><strong>Kreativband · dokumentierte Rückmeldungen</strong>'+x.notes.slice(0,3).map(n=>'<p>'+h(n.name)+': '+h(n.note)+'</p>').join('')+'</div>');
  if(x.visits)sections.push('<div><strong>Kreativband · Teilnahme</strong><p>'+x.visits+' erfasste Besuche'+(x.attended.length?' · '+h(x.attended.slice(0,4).join(', ')):'')+'</p></div>');
  if(x.lab.length)sections.push('<div><strong>Themenfeldunterricht · Labs</strong><p>'+h(x.lab.join(', '))+'</p></div>');
  if(x.leb.length)sections.push('<div><strong>LEB · vorhandene Fachtexte</strong><p>'+h(x.leb.map(z=>z.subject).join(', '))+'</p></div>');
  return sections.length?'<section class="coCard"><h3>Weitere Lernbereiche</h3><p class="coMuted">Dokumentierte Informationen aus KOMPASS. Eine Teilnahme allein ist kein Coachingproblem.</p>'+sections.join('')+'</section>':'';
 };
 const evidenceHtml=(p,prep)=>{
  const e=evidence(p),items=[],grouped={};
  for(const x of e.concerns){const subject=x.c.subject||'Weitere Fächer';(grouped[subject]??=[]).push(x);}
  if(e.concerns.length)items.push('<section class="coCard"><h3>Kompetenzen für das Coaching</h3>'+Object.entries(grouped).map(([subject,rows])=>'<div style="margin:12px 0"><strong>'+h(subject)+'</strong><span class="coMuted"> · '+rows.filter(x=>x.r.current==='red').length+' rot · '+rows.filter(x=>x.r.current==='yellow').length+' gelb</span>'+rows.filter(x=>x.r.current==='red').slice(0,2).map(x=>'<p style="margin:5px 0">Noch nicht erreicht: '+h(x.c.text||x.c.category||'Kompetenz')+'</p>').join('')+(rows.length>2?'<p class="coMuted">Weitere Bewertungen über die Fachkachel ansehen</p>':'')+'</div>').join('')+'</section>');
  if(e.strengths.length)items.push('<section class="coCard"><h3>Stärken</h3>'+Object.entries(e.strengths.reduce((a,x)=>{(a[x.c.subject||'Weitere Fächer']??=[]).push(x);return a;},{})).map(([subject,rows])=>'<p><strong>'+h(subject)+'</strong> · '+rows.length+' erreichte Kompetenzen</p>').join('')+'</section>');
  if(e.overdue.length)items.push('<section class="coCard"><h3>Überfällige Vereinbarungen</h3>'+e.overdue.map(x=>'<p>'+h(x.body)+' · '+h(x.due_date)+'</p>').join('')+'</section>');
  if(e.observations.length)items.push('<section class="coCard"><h3>Arbeits- und Sozialverhalten</h3>'+e.observations.slice(-3).map(x=>'<p>'+h(typeof x==='string'?x:(x.text||x.note||''))+'</p>').join('')+'</section>');
  if(e.la.room||e.la.level||e.la.place)items.push('<section class="coCard"><h3>Lernatelier · aktueller Stand</h3><p>'+[e.la.room?'Zuordnung: '+h(e.la.room):'',e.la.level?'Lernstufe: '+h(e.la.level):'',e.la.place?'Aktueller Lernort: '+h(e.la.place):''].filter(Boolean).join(' · ')+'</p><p class="coMuted">Standort und Lernstufe sind Kontextinformationen, keine Auffälligkeiten. Individuelle LA-Beobachtungen erscheinen nur, wenn sie dokumentiert wurden.</p></section>');
  if(!e.rated.length)items.push('<section class="coCard"><h3>Fachbewertungen</h3><p class="coMuted">Für dieses Kind liegen hier noch keine auswertbaren Bewertungen vor.</p></section>');
  if(!items.length)items.push('<section class="coCard"><h3>Keine aktuellen Hinweise</h3><p class="coMuted">Keine dokumentierten Auffälligkeiten in den verfügbaren Daten.</p></section>');
  return '<h3>'+(prep?'Gesprächsvorbereitung':'Wichtige Informationen')+'</h3><div class="coGrid">'+items.join('')+'</div>';
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
  if(e.observations.length){const latest=e.observations.slice(-2).map(o=>typeof o==='string'?o:String(o.text||o.note||'')).filter(Boolean);if(latest.length)reasons.push({score:60,label:'Beobachtung: '+latest[latest.length-1].slice(0,105)});}
  const subjectsWithConcerns=[...new Set(e.concerns.map(v=>v.c.subject).filter(Boolean))];
  if(subjectsWithConcerns.length>=2)reasons.push({score:88,label:'Unterstützungsbedarf in mehreren Fächern: '+subjectsWithConcerns.join(', ')});
  if(e.overdue.length&&e.concerns.length)reasons.push({score:105,label:'Offenes Ziel und Kompetenzbedarf: bisherigen Förderweg gemeinsam überprüfen'});
  if(e.concerns.length&&days!==null&&days>=21)reasons.push({score:92,label:'Kompetenzbedarf und längerer Gesprächsabstand: Entwicklung gemeinsam prüfen'});
  if(days===null)reasons.push({score:75,label:'Erstgespräch noch nicht dokumentiert'});
  reasons.sort((a,b)=>b.score-a.score);
  const brief=coachingBrief(x.p);if(brief[0]?.score>=80)reasons.unshift({score:brief[0].score,label:brief[0].title});return {score:Math.max(reasons[0]?.score||0,brief[0]?.score||0),reasons:reasons.filter((v,i,a)=>a.findIndex(z=>z.label===v.label)===i)};
 };
 const coachingBrief=p=>{
  const e=evidence(p),x=crossDomain(p),trends=trendFor(p),rows=pupilRows(Coaching,p.id);
  const proposals=[],add=(score,title,detail,question,sources)=>proposals.push({score,title,detail,question,source:sources.join(' · ')});
  const grouped={};
  for(const item of e.concerns){const key=item.c.subject||'Fach';(grouped[key]??=[]).push(item);}
  const subjects=Object.keys(grouped),red=e.concerns.filter(z=>z.r.current==='red');
  const open=rows.filter(z=>['vereinbarung','aufgabe'].includes(z.kind)&&!z.done);
  if(e.overdue.length&&e.concerns.length)add(110,'Vereinbarung und Lernstand gemeinsam prüfen','Offene Vereinbarung: '+String(e.overdue[0].body||e.overdue[0].title||'')+' · '+red.length+' nicht erreichte Kompetenzen','Was hat bei der Umsetzung geholfen, was nicht? Welchen nächsten Schritt vereinbaren wir?',['Coaching','Fachbewertungen']);
  if(subjects.length>=2)add(95,'Lernen fachübergreifend betrachten','Teilweise oder noch nicht erreichte Kompetenzen in '+subjects.slice(0,4).join(', '),'Gibt es eine Schwierigkeit, die dir in mehreren Fächern begegnet?',['Fachbewertungen aus '+subjects.length+' Fächern']);
  const decline=trends.filter(z=>z.delta<0);
  if(decline.length)add(93,'Veränderung im Lernstand klären',decline.slice(0,2).map(z=>z.subject+': '+z.text).join(' · '),'Was war bei diesen Aufgaben früher anders? Welche Unterstützung brauchst du jetzt?',['Dokumentierter Bewertungsverlauf']);
  if(e.overdue.length&&!e.concerns.length)add(90,'Vereinbartes Ziel überprüfen',String(e.overdue[0].body||e.overdue[0].title||''),'Ist das Ziel noch passend? Was brauchst du für den nächsten Schritt?',['Coachingvereinbarung']);
  if(red.length){const first=red[0];add(83,(first.c.subject||'Fach')+' · Lernhindernis klären','Noch nicht erreicht: '+String(first.c.text||first.c.category||'Kompetenz'),'Welcher Teil fällt dir schwer? Welche Hilfe möchtest du ausprobieren?',['Fachbewertung']);}
  if(!red.length&&e.concerns.length){const first=e.concerns[0];add(65,(first.c.subject||'Fach')+' · nächsten Schritt planen','Teilweise erreicht: '+String(first.c.text||first.c.category||'Kompetenz'),'Was klappt bereits? Was möchtest du als Nächstes selbstständig schaffen?',['Fachbewertung']);}
  const observations=e.observations.map(o=>typeof o==='string'?o:String(o.text||o.note||'')).filter(Boolean);
  if(observations.length)add(70,'Dokumentierte Beobachtung besprechen',observations[observations.length-1].slice(0,220),'Wie hast du die Situation erlebt? Was würde dir helfen?',['Arbeits- und Sozialverhalten']);
  if(x.notes.length)add(57,'Rückmeldung aus dem Kreativband aufgreifen',x.notes[0].name+': '+x.notes[0].note.slice(0,220),'Wie hast du das Angebot erlebt? Was möchtest du daraus mitnehmen?',['Kreativband · dokumentierte Rückmeldung']);
  if(e.strengths.length&&e.concerns.length){const strong=e.strengths[0];add(52,'Erfolgreiche Lernstrategie übertragen',(strong.c.subject||'Fach')+': '+String(strong.c.text||strong.c.category||'erreicht'),'Was hilft dir dabei? Könnte diese Strategie auch bei einer schwierigen Aufgabe helfen?',['Erreichte und offene Fachkompetenzen']);}
  if(!proposals.length&&open.length)add(48,'Offene Vereinbarung besprechen',String(open[0].body||open[0].title||''),'Wie weit bist du mit deinem Ziel gekommen?',['Coaching']);
  if(!proposals.length)add(10,'Offenes Standortgespräch','Keine ausreichend belegten Auffälligkeiten in den verfügbaren individuellen Daten.','Was gelingt dir gerade gut, und wobei möchtest du Unterstützung?',['Datenlage']);
  proposals.sort((a,b)=>b.score-a.score);
  return proposals.slice(0,3);
 };
 const coachingBriefHtml=p=>'<section class="coCard"><h3>Deine drei wichtigsten Coachingimpulse</h3><p class="coMuted">Aus vorhandenen individuellen Einträgen abgeleitet · keine Diagnose · jede Aussage mit Datengrundlage.</p>'+coachingBrief(p).map(q=>'<div style="border-top:1px solid #e7eaf0;padding:12px 0"><strong>'+h(q.title)+'</strong><p style="margin:6px 0">'+h(q.detail)+'</p><p><strong>Gesprächsfrage:</strong> '+h(q.question)+'</p><span class="coMuted">Grundlage: '+h(q.source)+'</span></div>').join('')+'</section>';
 const teamPalette=p=>{const t=String(p?.team||'').toLowerCase();if(/blau/.test(t))return ['#243d67','#506b96','#e6edf7'];if(/grün|gruen/.test(t))return ['#285646','#648b79','#e6f0e9'];if(/rot/.test(t))return ['#783e50','#aa7383','#f6e8ed'];if(/gelb/.test(t))return ['#756026','#a99457','#f7f1dd'];return ['#503a6c','#937bad','#eee8f4'];};
 const coachingTone=(p,score)=>{const c=teamPalette(p);return score>=65?'background:'+c[0]+';color:white;border-color:'+c[0]:score>=30?'background:'+c[1]+';color:white;border-color:'+c[1]:'background:'+c[2]+';color:#302a39;border-color:'+c[2];};
 const style='<style>.coNew .coPupil[style] .coMuted,.coNew .coPupil[style] .coPupilFoot{color:inherit;opacity:.92}.coNew .coPupil[style]:hover{filter:brightness(.96)}.coNew .coGrid>label,.coNew .coGrid>label input{min-width:0;box-sizing:border-box}.coNew input[type=date]{max-width:100%;min-width:0;box-sizing:border-box}.coNew .coGrid>label{display:flex;flex-direction:column;gap:6px}.coNew .coGrid>label select{width:100%;min-width:0}.coNew{--coBorder:#e1e5ed;--coText:#25314a;color:var(--coText);max-width:1220px}.coNew .coTop{background:#f2ecf8;border-radius:17px;padding:22px 25px;margin:12px 0 20px}.coNew .coTop h1{margin:0;font-size:25px;color:#3e594c}.coNew .coTop p{margin:4px 0 0;color:#68728a}.coNew .coGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px;margin:14px 0}.coNew .coCard{background:#fff;border:1px solid var(--coBorder);border-radius:14px;padding:18px}.coNew .coPupilGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.coNew .coPupil{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:5px;cursor:pointer;min-height:105px;padding:12px 14px;color:inherit}.coNew .coPupil strong{font-size:15px}.coNew .coPupilFoot{margin-top:auto;font-size:12px;font-weight:700;color:#65538d}.coNew .coPupil:hover{border-color:#a69bc3;background:#f8f5fd}.coNew .coSubjectLink{display:block;text-align:left;cursor:pointer;width:100%;color:inherit}.coNew .coSubjectLink:hover{border-color:#a69bc3;background:#f8f5fd}.coNew .coCard h3{margin:0 0 10px;font-size:16px}.coNew .coMetric{font-size:25px;font-weight:750}.coNew .coMuted{color:#68748a;font-size:13px}.coNew .coRow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 17px;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid var(--coBorder);cursor:pointer;color:inherit}.coNew .coRow:hover{background:#f7f7fc}.coNew .coTable{border:1px solid var(--coBorder);border-radius:14px;overflow:hidden}.coNew .coTabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.coNew .coTabs button{border:1px solid #dbe1eb;background:white;border-radius:24px;padding:9px 15px;cursor:pointer;color:#34435c}.coNew .coTabs button[aria-current=true]{background:#293752;color:white}.coNew .coSubject{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eef0f4}.coNew .coTag{border-radius:20px;background:#edf0f6;padding:4px 9px;font-size:12px}.coNew .coEmpty{color:#68748a;font-size:14px;padding:12px 0}.coNew .coActions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.coNew .coActions button{border:1px solid #dce1e9;background:#fff;border-radius:9px;padding:9px 13px;cursor:pointer}.coNew .coActions button.primary{background:#293752;color:white}</style>';
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
   const subjectsHtml='<div class="coGrid">'+subj.filter(x=>x.assessed>0||['Deutsch','Mathematik','Englisch'].includes(x.name)).map(x=>'<button class="coCard coSubjectLink" onclick="Coaching.openSubject(\''+x.name+'\')"><h3>'+h(x.name)+' ↗</h3><div class="coMetric">'+(x.all?x.assessed+' <span class="coMuted">bewertet</span>':'<span class="coMuted">Keine Fachkompetenzen hinterlegt</span>')+'</div>'+(x.all?'<div class="coMuted">'+x.green+' erreicht · '+x.yellow+' teilweise · '+x.red+' noch offen</div>':'')+'</button>').join('')+'</div>';
   if(mode==='overview'||mode==='prep'){html+=subjectsHtml;html+=coachingBriefHtml(p);html+=evidenceHtml(p,mode==='prep');if(mode==='prep')html+=crossDomainHtml(p);if(trendFor(p).length)html+=trendHtml(p);}if(mode==='subject'){html+='<div class="coActions"><button onclick="Coaching.switchV2Mode(\'overview\')">← Zur Übersicht</button></div>'+subjectDetail(p);}
   if(mode==='prep'){
    const last=rows.find(x=>x.kind==='gespraech');
    html+='<div class="coGrid"><section class="coCard"><h3>Letztes Gespräch</h3>'+(last?'<p>'+date(last.created_at)+'</p><p>'+h(last.body)+'</p>':'<p class="coEmpty">Noch kein Gespräch dokumentiert.</p>')+'</section><section class="coCard"><h3>Offene Vereinbarungen</h3>'+(goals.length?goals.map(x=>'<p><strong>'+h(x.title)+'</strong> '+h(x.body)+(x.due_date?' · bis '+h(x.due_date):'')+'</p>').join(''):'<p class="coEmpty">Keine offenen Vereinbarungen.</p>')+'</section><section class="coCard"><h3>LEB und weitere Entwicklung</h3><p>'+(Store.lebDrafts?.[p.id]?'LEB-Entwurf vorhanden':'Noch kein LEB-Entwurf')+'</p><p class="coMuted">Die Kompetenzbewertungen oben stammen aus den gespeicherten Fachbewertungen.</p></section></div>';
    html+='<div class="coCard"><h3>Gesprächsleitfaden</h3><p>Was ist seit dem letzten Gespräch gelungen? Welche Kompetenzen haben sich verändert? Was ist gerade schwierig? Welches konkrete Ziel vereinbaren wir bis wann?</p>'+action('Gespräch dokumentieren',"Coaching.switchV2Mode('new')",true)+'</div>';
   }else if(mode==='new'){
    html+='<section class="coCard" id="coachingEntryComposer"><h3>Gespräch dokumentieren</h3><input type="hidden" id="co_pupil" value="'+h(p.id)+'"><div class="coGrid"><label>Gesprächsdatum (auch rückwirkend)<input type="date" id="co_date" value="'+new Date().toISOString().slice(0,10)+'"></label><label>Art des Eintrags<select id="co_kind"><option value="gespraech">Coachinggespräch</option><option value="elternkontakt">Wohlbefinden / Soziales</option><option value="vereinbarung">Vereinbarung</option><option value="aufgabe">Aufgabe</option></select></label><label>Wiedervorlage<input type="date" id="co_due"></label></div><label>Gesprächsnotizen<textarea id="co_body" rows="5" style="width:100%" placeholder="Beobachtungen, Entwicklung, Gesprächsinhalte"></textarea></label><div class="coGrid"><label>Vereinbartes Ziel<textarea id="co_followup" rows="3" style="width:100%"></textarea></label><label>Nächster Schritt / Aufgabe<textarea id="co_next_task" rows="3" style="width:100%"></textarea></label></div><div class="coActions">'+action('Eintrag speichern','Coaching.saveLearningEntry()',true)+action('Abbrechen',"Coaching.switchV2Mode('overview')")+'</div></section>';
   }else if(mode==='overview'){
    html+=KreativbandWahl.coachPanel(p);
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
  html+='<h3>Coaching diese Woche</h3><p class="coMuted">Priorisiert nach fälligen Vereinbarungen, dokumentierten Kompetenzveränderungen und Gesprächsabstand. Hinweise sind Gesprächsanlässe, keine Bewertungen der Kinder.</p><div class="coPupilGrid">'+summary.map(x=>({...x,priority:coachingPriority(x)})).sort((a,b)=>b.priority.score-a.priority.score||String(a.p.last||'').localeCompare(String(b.p.last||''),'de')).map(x=>{const reasons=x.priority.reasons;return '<button class="coCard coPupil" style="'+coachingTone(x.p,x.priority.score)+'" onclick="Coaching.section=\'coaching\';Coaching.selectPupil('+JSON.stringify(String(x.p.id)).replace(/"/g,'&quot;')+')"><strong>'+h(x.p.first+' '+x.p.last)+'</strong><span class="coMuted">'+(x.last?'Letztes Gespräch '+date(x.last.created_at):'Noch kein Gespräch')+'</span><span class="coMuted">'+(reasons.length?reasons.slice(0,3).map(y=>h(y.label)).join(' · '):'Aktuell kein dringender Anlass dokumentiert')+'</span><span class="coPupilFoot">'+(x.priority.score>=65?'Diese Woche besprechen':x.priority.score>=30?'Gespräch einplanen':'Entwicklung ansehen')+' →</span></button>';}).join('')+'</div>';
  html+='</div>';
  if(this.error)html+='<p class="coMuted">'+h(this.error)+'</p>';
  shell(html);
 };
})();