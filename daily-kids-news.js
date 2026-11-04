// Public logo! headlines; independent of the signed-in account and cloud data.
(function(){
 let data=null,busy=false,nextAttempt=0;
 function berlinDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
 function selectStory(feed){
  const today=berlinDate();
  if(feed.updated===today&&feed.leadUrl)return feed.items.find(item=>item.url===feed.leadUrl)||feed.items[0];
  const day=Math.floor(Date.parse(today+'T12:00:00Z')/86400000);
  const alternatives=feed.items.filter(item=>item.url!==feed.leadUrl);const choices=alternatives.length?alternatives:feed.items;return choices[((day%choices.length)+choices.length)%choices.length];
 }
 function valid(item){try{const u=new URL(item.url);return u.protocol==='https:'&&u.hostname==='www.logo.de'&&typeof item.summary==='string'&&item.summary.trim().length>=35&&typeof item.title==='string'&&item.title.trim()&&!item.title.startsWith('Thema:')}catch(_){return false}}
 function show(){
  document.querySelectorAll('.laWorldNews').forEach(box=>{
   const placeholder=box.querySelector('[data-kids-news-placeholder]')||Array.from(box.querySelectorAll('p.mini')).find(p=>/Kindernachrichten|Noch keine geprüfte Nachricht veröffentlicht/.test(p.textContent));
   let wrap=box.querySelector('[data-kids-news]');
   if(!wrap&&!placeholder)return; // Preserve manually published news.
   const version=berlinDate()+':'+(data?JSON.stringify(data):'unavailable');
   if(wrap?.dataset.version===version)return;
   if(!wrap){wrap=document.createElement('div');wrap.className='laTodayItems';wrap.dataset.kidsNews='';placeholder.replaceWith(wrap)}
   wrap.replaceChildren();wrap.dataset.version=version;
   const head=document.createElement('p');head.className='mini';
   if(data){
    const date=new Date(data.updated+'T12:00:00');
    head.textContent='Kindernachrichten · ZDF logo! · Stand: '+(isNaN(date)?data.updated:date.toLocaleDateString('de-DE'));
    wrap.append(head);
    for(const item of [selectStory(data)]){
     const el=document.createElement('div');el.className='laTodayItem';
     const title=document.createElement('b');title.textContent=item.title;
     const summary=document.createElement('p');summary.textContent=item.summary;summary.style.margin='0.5em 0';
     const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Quelle: ZDF logo! ↗';a.className='mini';
     el.append(title,summary,a);wrap.append(el);
    }
   }else{
    head.textContent='Die Kindernachrichten konnten gerade nicht geladen werden.';wrap.append(head);
    const a=document.createElement('a');a.href='https://www.logo.de/';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Aktuelle Kindernachrichten bei logo! öffnen ↗';wrap.append(a);
   }
  });
 }
 async function load(){
  if(busy||Date.now()<nextAttempt)return;
  busy=true;
  try{
   // Scheduled bot commits do not trigger a GitHub Pages rebuild. Read the
   // current public data directly; keep the deployed file as a fallback.
   let fresh=null;
   for(const url of ['https://raw.githubusercontent.com/julianeschoene-ops/kompass/main/daily-kids-news.json','daily-kids-news.json']){
    try{
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
     let r;try{r=await fetch(url+'?ts='+Date.now(),{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
     if(!r.ok)throw Error(r.status);
     const j=await r.json();const items=Array.isArray(j.items)?j.items.filter(valid):[];
     const age=Date.parse(berlinDate()+'T12:00:00Z')-Date.parse(j.updated+'T12:00:00Z');
     if(!items.length||!/^\d{4}-\d{2}-\d{2}$/.test(j.updated)||!Number.isFinite(age)||age<0||age>86400000)throw Error('Keine aktuellen Nachrichten');
     fresh={updated:j.updated,leadUrl:j.leadUrl,items};break;
    }catch(e){console.warn('Nachrichtenquelle nicht verfügbar',e)}
   }
   if(!fresh)throw Error('Keine aktuellen Kindernachrichten geladen');
   data=fresh;nextAttempt=Date.now()+300000;
  }catch(e){if(data&&data.updated!==berlinDate())data=null;nextAttempt=Date.now()+30000;console.warn('Kindernachrichten nicht verfügbar',e)}
  finally{busy=false;show()}
 }
 new MutationObserver(()=>{if(data)show();if(document.querySelector('.laWorldNews'))load()}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
 window.addEventListener('online',()=>{nextAttempt=0;load()});
 setInterval(()=>{if(!document.hidden&&document.querySelector('.laWorldNews'))load()},30000);
 load();
})();

