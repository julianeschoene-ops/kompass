const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup() {
  let user='teacher1';
  const pupils=[{id:'p1',first:'Alex',last:'A',short:'Alex A',year:6,team:'Violett'},{id:'p2',first:'Bea',last:'B',year:6,team:'Blau'},{id:'p3',year:5},{id:'p4',year:6,archived:true}];
  const c={console,Date,Map,Number,window:{},document:{},setTimeout(){},
    State:{year:6,team:'Violett',view:'core',subject:'Englisch'},
    Auth:{session:{mode:'cloud'},isLernatelier:()=>false,currentUser:()=>({id:user}),cloudClient:{}},
    filteredPupils:()=>[pupils[0]],Store:{pupils,competencies:[]},canManageRoster:()=>true,
    esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),render(){},confirm:()=>true};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../english-practice.js'),'utf8')+'\nglobalThis.ep=EnglishPractice;',c);
  c.setUser=v=>user=v;return c;
}
test('batch controls explicitly offer the whole grade and current team',()=>{
  const c=setup();const html=c.ep.tools({id:'eng5_1'});
  assert.ok(html.includes('ganzer Jahrgang (2)'));assert.ok(html.includes('Violett (1)'));
  assert.equal(c.ep.panel,undefined);assert.ok(!html.includes('Testergebnisse</h2>'));
});
test('competency evidence is compact, expandable and escaped',()=>{
  const c=setup();assert.equal(c.ep.evidence({}), '');
  const html=c.ep.evidence({practiceResults:[{date:'23.10.2026',topic:'<img src=x>',score:{points:0,max:10,percent:0}}]});
  assert.ok(html.startsWith('<details'));assert.ok(html.includes('0/10 P.'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<section'));
});
test('batch printing sends one request for every selected learner and includes PINs',async()=>{
  const c=setup(),calls=[],cards=[];
  const doc={write(){},close(){},createElement:()=>({}),getElementById:id=>id==='cards'?{appendChild:x=>cards.push(x)}:{textContent:''}};
  c.window.open=()=>({document:doc,closed:false});
  c.qrcode=()=>({addData(){},make(){},createSvgTag:()=>'<svg></svg>'});
  c.Auth.cloudClient.rpc=async(name,payload)=>{
    calls.push({name,payload});return {data:payload.p_pupil_ids.map(pupil_id=>({pupil_id,token:'a'.repeat(64),pin:'123456'}))};
  };
  await c.ep.printCodes(null,true);
  assert.equal(calls.length,1);assert.equal(calls[0].name,'kompass_english_batch_access');
  assert.deepEqual(Array.from(calls[0].payload.p_pupil_ids),['p1','p2']);assert.equal(calls[0].payload.p_rotate,false);
  assert.equal(cards.length,2);assert.ok(cards[0].innerHTML.includes('123456'));
});
test('task metadata from a previous account is discarded',async()=>{
  const c=setup();let resolve;
  c.Auth.cloudClient.from=()=>({select(){return this},eq(field,value){assert.equal(field,'is_assessment');assert.equal(value,true);return this},order(){return new Promise(r=>resolve=r)}});
  const p=c.ep.loadTasks();c.setUser('teacher2');resolve({data:[{task_key:'old'}]});await p;
  assert.equal(c.ep.taskUser,null);assert.equal(c.ep.tasks.length,0);
});

test('school closure controls are restricted to admins and preserve a restore action',async()=>{
 const c=setup();assert.equal(c.ep.calendarTools(),'');c.Auth.isAdmin=()=>true;
 assert.match(c.ep.calendarTools(),/Testzeiten & schulfreie Tage/);assert.match(c.ep.calendarTools(),/ganze Schule/);
 const target={innerHTML:''};c.document.getElementById=()=>target;
 c.Auth.cloudClient.from=()=>({select(){return this},eq(){return this},order:async()=>({data:[{id:'closure-1',starts_on:'2027-02-08',ends_on:'2027-02-12',label:'Fastnacht',active:false}]})});
 await c.ep.loadClosures();assert.match(target.innerHTML,/Wieder aktivieren/);assert.match(target.innerHTML,/Fastnacht/);
});

test('teacher preview shows answers and criteria without submitting a learner result',()=>{
 const c=setup();const html=c.ep.taskPreview({assessment_config:{kind:'reading',instructions:'Lies den Text.',questions:[{text:'<text>',q:'Worum geht es?',options:['A','B'],answer:1}]}});
 assert.match(html,/Lehrkraftvorschau/);assert.match(html,/Lösung:<\/b> B/);assert.match(html,/&lt;text&gt;/);assert.ok(!html.includes('finishTest'));
 const oral=c.ep.taskPreview({assessment_config:{kind:'teacher',prompt:'Describe a route.',criteria:['Understandable directions']}});assert.match(oral,/normale Kompetenzbewertung/);assert.match(oral,/Understandable directions/);
});
