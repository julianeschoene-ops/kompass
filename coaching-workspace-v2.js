/* KOMPASS 8.5.61 — consolidated class and coaching workspace.
   Existing Supabase save/edit flows remain authoritative. Kreativband untouched. */
(function(){
 const previous=Coaching.render;
 const oldSelect=Coaching.selectPupil;
 Coaching.selectPupil=function(id){this.v2Mode='overview';this.v2Edit='';return oldSelect.call(this,id);};
 const oldSave=Coaching.saveLearningEntry;
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
   const cs=(Store.competencies||[]).filter(c=>c.type==='core'&&c.subject===name&&Number(c.year)===y);
   const vals=cs.map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(v=>['green','yellow','red'].includes(v));
   out.push({name,all:cs.length,assessed:vals.length,green:vals.filter(v=>v==='green').length,yellow:vals.filter(v=>v==='yellow').length,red:vals.filter(v=>v==='red').length});
  }
  return out;
 };
 const style='<style>.coNew{--coBorder:#e1e5ed;--coText:#25314a;color:var(--coText);max-width:1220px}.coNew .coTop{background:#f2ecf8;border-radius:17px;padding:22px 25px;margin:12px 0 20px}.coNew .coTop h1{margin:0;font-size:25px;color:#3e594c}.coNew .coTop p{margin:4px 0 0;color:#68728a}.coNew .coGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px;margin:14px 0}.coNew .coCard{background:#fff;border:1px solid var(--coBorder);border-radius:14px;padding:18px}.coNew .coCard h3{margin:0 0 10px;font-size:16px}.coNew .coMetric{font-size:25px;font-weight:750}.coNew .coMuted{color:#68748a;font-size:13px}.coNew .coRow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 17px;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid var(--coBorder);cursor:pointer;color:inherit}.coNew .coRow:hover{background:#f7f7fc}.coNew .coTable{border:1px solid var(--coBorder);border-radius:14px;overflow:hidden}.coNew .coTabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.coNew .coTabs button{border:1px solid #dbe1eb;background:white;border-radius:24px;padding:9px 15px;cursor:pointer;color:#34435c}.coNew .coTabs button[aria-current=true]{background:#293752;color:white}.coNew .coSubject{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eef0f4}.coNew .coTag{border-radius:20px;background:#edf0f6;padding:4px 9px;font-size:12px}.coNew .coEmpty{color:#68748a;font-size:14px;padding:12px 0}.coNew .coActions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.coNew .coActions button{border:1px solid #dce1e9;background:#fff;border-radius:9px;padding:9px 13px;cursor:pointer}.coNew .coActions button.primary{background:#293752;color:white}</style>';
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
   html+='<div class="coActions">'+action('Übersicht',"Coaching.v2Mode='overview';render()",mode==='overview')+action('Gespräch vorbereiten',"Coaching.v2Mode='prep';render()",mode==='prep')+action('+ Gespräch dokumentieren',"Coaching.v2Mode='new';render()",mode==='new')+action('Schülerakte / LEB',"Coaching.openPupilProfile("+JSON.stringify(String(p.id)).replace(/"/g,'&quot;')+")")+'</div>';
   const subj=subjects(p);
   const subjectsHtml='<div class="coGrid">'+subj.map(x=>'<div class="coCard"><h3>'+h(x.name)+'</h3><div class="coMetric">'+x.assessed+' <span class="coMuted">/ '+x.all+' Kompetenzen</span></div><div class="coMuted">'+x.green+' grün · '+x.yellow+' gelb · '+x.red+' rot</div></div>').join('')+'</div>';
   if(mode==='overview'||mode==='prep')html+=subjectsHtml;
   if(mode==='prep'){
    const last=rows.find(x=>x.kind==='gespraech');
    html+='<div class="coGrid"><section class="coCard"><h3>Letztes Gespräch</h3>'+(last?'<p>'+date(last.created_at)+'</p><p>'+h(last.body)+'</p>':'<p class="coEmpty">Noch kein Gespräch dokumentiert.</p>')+'</section><section class="coCard"><h3>Offene Vereinbarungen</h3>'+(goals.length?goals.map(x=>'<p><strong>'+h(x.title)+'</strong> '+h(x.body)+(x.due_date?' · bis '+h(x.due_date):'')+'</p>').join(''):'<p class="coEmpty">Keine offenen Vereinbarungen.</p>')+'</section><section class="coCard"><h3>LEB und weitere Entwicklung</h3><p>'+(Store.lebDrafts?.[p.id]?'LEB-Entwurf vorhanden':'Noch kein LEB-Entwurf')+'</p><p class="coMuted">Die Kompetenzbewertungen oben stammen aus den gespeicherten Fachbewertungen.</p></section></div>';
    html+='<div class="coCard"><h3>Gesprächsleitfaden</h3><p>Was ist seit dem letzten Gespräch gelungen? Welche Kompetenzen haben sich verändert? Was ist gerade schwierig? Welches konkrete Ziel vereinbaren wir bis wann?</p>'+action('Gespräch dokumentieren',"Coaching.v2Mode='new';render()",true)+'</div>';
   }else if(mode==='new'){
    html+='<section class="coCard" id="coachingEntryComposer"><h3>Gespräch dokumentieren</h3><input type="hidden" id="co_pupil" value="'+h(p.id)+'"><div class="coGrid"><label>Gesprächsdatum (auch rückwirkend)<input type="date" id="co_date" value="'+new Date().toISOString().slice(0,10)+'"></label><label>Art des Eintrags<select id="co_kind"><option value="gespraech">Coachinggespräch</option><option value="elternkontakt">Wohlbefinden / Soziales</option><option value="vereinbarung">Vereinbarung</option><option value="aufgabe">Aufgabe</option></select></label><label>Wiedervorlage<input type="date" id="co_due"></label></div><label>Gesprächsnotizen<textarea id="co_body" rows="5" style="width:100%" placeholder="Beobachtungen, Entwicklung, Gesprächsinhalte"></textarea></label><div class="coGrid"><label>Vereinbartes Ziel<textarea id="co_followup" rows="3" style="width:100%"></textarea></label><label>Nächster Schritt / Aufgabe<textarea id="co_next_task" rows="3" style="width:100%"></textarea></label></div><div class="coActions">'+action('Eintrag speichern','Coaching.saveLearningEntry()',true)+action('Abbrechen',"Coaching.v2Mode='overview';render()")+'</div></section>';
   }else{
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
  html+='<div class="coCard" style="padding:0"><div style="padding:18px 17px 8px"><h3>Schülerinnen und Schüler</h3><p class="coMuted">Schülerakte, Leistungen, LEB und Coaching an einem Ort</p></div><div class="coTable" style="border:0;border-radius:0">'+summary.sort((a,b)=>String(a.p.last||'').localeCompare(String(b.p.last||''),'de')).map(x=>'<button class="coRow" onclick="Coaching.section=\'coaching\';Coaching.selectPupil('+JSON.stringify(String(x.p.id)).replace(/"/g,'&quot;')+')"><span><strong>'+h(x.p.first+' '+x.p.last)+'</strong><span class="coMuted" style="display:block">'+(x.last?'Gespräch am '+date(x.last.created_at):'Noch kein Gespräch dokumentiert')+'</span></span><span class="coMuted">'+(x.pending.length?x.pending.length+' offene Punkte · ':'')+(x.due?'Gespräch prüfen':'')+' ›</span></button>').join('')+'</div></div>';
  html+='</div>';
  if(this.error)html+='<p class="coMuted">'+h(this.error)+'</p>';
  shell(html);
 };
})();