// Run with linkedom installed: node --test tests/kids-news.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync('daily-kids-news.js','utf8'),news=JSON.parse(fs.readFileSync('daily-kids-news.json','utf8'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('old and new placeholders, rerender, manual news and retry after fetch failure',async()=>{
 const {window}=parseHTML('<html><body><div id="app"><div class="laWorldNews"><p data-kids-news-placeholder>Lädt</p></div></div></body></html>');
 const {document,MutationObserver}=window;let fail=true;const events={};
 const context={document,MutationObserver,URL,Date,console,setInterval:()=>{},window:{addEventListener:(type,fn)=>events[type]=fn},fetch:async()=>({ok:!fail,status:fail?503:200,json:async()=>news})};
 vm.runInNewContext(script,context);
 await tick();
 assert.equal(document.querySelector('[data-kids-news] a').getAttribute('href'),'https://www.logo.de/');
 fail=false;events.online();await tick();
 assert.equal(document.querySelectorAll('.laTodayItem a').length,3);
 for(const p of ['<p class="mini">Noch keine geprüfte Nachricht veröffentlicht.</p>','<p class="mini" data-kids-news-placeholder>Aktuelle Kindernachrichten werden geladen …</p>']){
  document.getElementById('app').innerHTML='<div class="laWorldNews"><h3>Neues aus der Welt</h3>'+p+'</div>';await tick();
  assert.equal(document.querySelectorAll('.laTodayItem a').length,3);
  assert.equal(document.querySelector('.laWorldNews h3').textContent,'Neues aus der Welt');
  assert.equal(document.querySelectorAll('[data-kids-news]').length,1);
 }
 document.getElementById('app').innerHTML='<div class="laWorldNews"><p>Manuell ausgewählte Nachricht</p></div>';await tick();
 assert.equal(document.querySelector('.laWorldNews').textContent,'Manuell ausgewählte Nachricht');
});
