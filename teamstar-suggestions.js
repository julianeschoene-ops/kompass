// KOMPASS: Vorschlaege fuer Fach-Teamstars, ohne automatische Vergabe.
(function(){
function candidates(){
 const pupils=laPupils();
 const comps=(Store.competencies||[]).filter(c=>(Number(c.year)===Number(laGrade)||Number(c.year)===5)&&c.subject==='Englisch');
 return pupils.map(p=>{
  const values=comps.map(c=>Store.records?.[c.id+'|'+p.id]?.current).filter(x=>['green','yellow','red'].includes(x));
  const green=values.filter(x=>x==='green').length;
  return {p,green,total:values.length,ratio:values.length?green/values.length:0};
 }).filter(x=>x.total>=3&&x.ratio>=.75&&!laStars(x.p).includes('en')).sort((a,b)=>b.ratio-a.ratio||b.total-a.total);
}
function insert(){
 if(typeof Auth==='undefined'||typeof laGrade==='undefined'||typeof Store==='undefined'||typeof laStars!=='function'||typeof laPupils!=='function')return;
 if(Auth.isLernatelier?.()||!(Auth.canLead(laGrade)||Auth.isAdmin()))return;
 const table=document.querySelector('.studentTable');if(!table||document.getElementById('enStarSuggestions'))return;
 const found=candidates();const panel=document.createElement('div');panel.id='enStarSuggestions';panel.className='card';
 const title=document.createElement('h3');title.textContent='⭐ Vorschläge: Teamstar Englisch';panel.append(title);
 const note=document.createElement('p');note.textContent='Mindestens 3 bewertete Englisch-Kompetenzen und mindestens 75 % davon grün. Vorschläge werden nicht automatisch vergeben.';panel.append(note);
 if(!found.length){const p=document.createElement('p');p.textContent='Zurzeit keine neuen Vorschläge.';panel.append(p);}
 for(const x of found){const line=document.createElement('div');line.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0';const label=document.createElement('span');label.textContent=(x.p.short||x.p.first+' '+x.p.last)+' · '+x.green+'/'+x.total+' grün';const b=document.createElement('button');b.type='button';b.textContent='Als Teamstar Englisch übernehmen';b.onclick=()=>laToggleStar(x.p.id,'en');line.append(label,b);panel.append(line)}
 table.parentElement?.parentElement?.prepend(panel);
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;insert()},100)}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
