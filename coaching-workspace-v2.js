/* KOMPASS 8.5.61 — consolidated class and coaching workspace.
   Existing Supabase save/edit flows remain authoritative. Kreativband untouched. */
(function(){
 const previous=Coaching.render;
 const h=x=>esc(String(x??''));
 const date=x=>x?new Date(x).toLocaleDateString('de-DE'):'—';
 const pupilRows=(c,id)=>(c.rows||[]).filter(r=>String(r.pupil_id)===String(id)&&!['checkliste','statusereignis'].includes(r.kind));
 const year=p=>Number(p.year||String(p.className||'').charAt(0));
 const subjects=p=>{
  const y=year(p),out=[];
  for(const name of ['Deutsch','Mathematik','Englisch']){
   const cs=(Store.competencies||[]).filter(c=>c.subject===name&&Number(c.year)===y);
   const vals=cs.map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(Boolean);
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
  // Retain the existing tested form and editing flows, but show the pupil's
  // actual competency and LEB overview in the same screen.
  if(section==='coaching'&&this.pupil){
   const p=this.coachPupils().find(x=>String(x.id)===String(this.pupil));
   if(!p)return previous.call(this);
   const originalShell=shell;
   try{
    shell=function(html){
     const details='<div class="coNew">'+style+'<div class="coGrid">'+subjects(p).map(s=>'<div class="coCard"><h3>'+h(s.name)+'</h3><div class="coMetric">'+s.assessed+' <span class="coMuted">/ '+s.all+' Kompetenzen</span></div><p class="coMuted">'+s.green+' grün · '+s.yellow+' gelb · '+s.red+' rot</p></div>').join('')+'<div class="coCard"><h3>Lernentwicklungsbericht</h3><p class="coMuted">'+(Store.lebDrafts?.[p.id]?'Entwurf vorhanden':'Noch kein Entwurf')+'</p><button class="chip" onclick="Coaching.openPupilProfile('+JSON.stringify(String(p.id)).replace(/"/g,'&quot;')+')">Schülerakte und LEB ansehen</button></div></div></div>';
     const at=html.indexOf('<nav aria-label="Coachingansicht"');
     originalShell(at>=0?html.slice(0,at)+details+html.slice(at):html+details);
    };
    return previous.call(this);
   }finally{shell=originalShell;}
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