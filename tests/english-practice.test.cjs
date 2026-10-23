const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup() {
  let user='teacher1';let renderCount=0;
  const c={console,Date,Map,Number,window:{},document:{visibilityState:'visible'},setInterval(){},setTimeout(){},
    State:{year:6,view:'core',subject:'Englisch'},
    Auth:{session:{mode:'cloud'},isLernatelier:()=>false,isLoggedIn:()=>true,currentUser:()=>({id:user}),cloudClient:{}},
    filteredPupils:()=>[{id:'p1',short:'Alex <A>'}],Store:{pupils:[]},canManageRoster:()=>false,
    esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
    render:()=>renderCount++};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../english-practice.js'),'utf8')+'\nglobalThis.ep=EnglishPractice;',c);
  c.setUser=v=>user=v;c.renderCount=()=>renderCount;return c;
}
test('results follow the selected pupils and escape names and topics',()=>{
  const c=setup();c.ep.loadedAt=Date.now();
  c.ep.cache={user:'teacher1',grade:6,rows:[
    {id:'r2',pupil_id:'p1',task_key:'vocab:1',topic:'<img src=x>',points:8,max_points:10,submitted_at:'2026-10-23T10:00:00Z'},
    {id:'r1',pupil_id:'p1',task_key:'vocab:1',topic:'School',points:0,max_points:10,submitted_at:'2026-10-22T10:00:00Z'},
    {id:'r3',pupil_id:'other',task_key:'vocab:1',topic:'Hidden pupil',points:1,max_points:10,submitted_at:'2026-10-22T10:00:00Z'}]};
  const html=c.ep.panel();assert.ok(html.includes('&lt;img'));assert.ok(html.includes('Alex &lt;A&gt;'));
  assert.ok(!html.includes('Hidden pupil'));assert.ok(html.includes('0/10'));assert.ok(html.includes('<td>2</td>'));
  c.setUser('teacher2');assert.equal(c.ep.rows().length,0);
});
test('a response from a previous teacher is discarded',async()=>{
  const c=setup();let resolve;
  const chain={select(){return this},eq(){return this},order(){return this},range(){return new Promise(r=>resolve=r)}};
  c.Auth.cloudClient.from=()=>chain;
  const p=c.ep.refresh();c.setUser('teacher2');resolve({data:[{id:'private'}]});await p;
  assert.equal(c.ep.cache,null);assert.equal(c.renderCount(),0);
});
test('pagination loads every page of results',async()=>{
  const c=setup();const offsets=[];
  const chain={select(){return this},eq(){return this},order(){return this},range(start){offsets.push(start);return Promise.resolve({data:start===0?Array.from({length:500},(_,id)=>({id})): [{id:500}]})}};
  c.Auth.cloudClient.from=()=>chain;await c.ep.refresh();
  assert.deepEqual(offsets,[0,500]);assert.equal(c.ep.rows().length,501);
});
