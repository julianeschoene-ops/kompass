// Run locally: node tests/creative-sync-v2.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('creative-sync-v2.js','utf8');
const cloud={visits:new Map(),assessments:new Map()};
const clone=x=>JSON.parse(JSON.stringify(x));
function device(){
  const memory=new Map(),localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const Store={data:{pupils:[{id:'p1',year:6}],dailyCreativeVisits:{},activityRecords:{}},saveLocalOnly(){}};
  for(const field of ['pupils','dailyCreativeVisits','activityRecords'])Object.defineProperty(Store,field,{get(){return Store.data[field]}});
  function from(table){
    const db=table.endsWith('visits_v2')?cloud.visits:cloud.assessments;
    let filters=[];
    const query={
      select(){return this},in(){return this},
      range(start,end){return Promise.resolve({data:[...db.values()].slice(start,end+1).map(clone),error:null})},
      eq(field,value){filters.push([field,value]);return this},
      maybeSingle(){return Promise.resolve({data:clone([...db.values()].find(row=>filters.every(([field,value])=>row[field]===value))||null),error:null})},
      single(){return this.maybeSingle()},
      upsert(row,{ignoreDuplicates}={}){const key=row.grade+'|'+(row.visit_key||row.record_key);if(!ignoreDuplicates||!db.has(key))db.set(key,clone(row));return Promise.resolve({error:null})}
    };
    return query;
  }
  const Auth={cloudClient:{from},session:{mode:'cloud'},isLernatelier:()=>false,allowedGrades:()=>[6]};
  const context=vm.createContext({Store,Auth,localStorage,clone,console,Promise,Date,JSON,Object,String,Number,Map});
  vm.runInContext(code+';this.instance=CreativeSyncV2',context);
  return {sync:context.instance,Store,memory};
}
(async()=>{
  const a=device(),b=device();
  await a.sync.initialize();await b.sync.initialize();
  assert.equal(cloud.visits.size,0);
  const visit={date:'2026-10-20',activityId:'garden',pupilId:'p1'};
  a.Store.dailyCreativeVisits['2026-10-20|garden|p1']=visit;
  a.Store.dailyCreativeVisits['2026-10-20|garden|p1|2']={...visit,createdAt:'hour2'};
  a.Store.activityRecords['garden|p1']={activityId:'garden',pupilId:'p1',count:2,creativeAssessment:{level:'E',assessedAt:'2026-10-20T09:00:00Z'}};
  a.sync.capture();
  assert.equal(Object.keys(a.sync.pending()).length,3,'offline entries are journaled');
  await a.sync.flush();await b.sync.refresh();
  assert.equal(cloud.visits.size,2,'both hours saved');
  assert.equal(cloud.assessments.size,1,'assessment saved');
  assert.equal(Object.keys(a.sync.pending()).length,0,'verified uploads clear queue');
  assert.equal(Object.keys(b.Store.dailyCreativeVisits).length,2,'other device receives both hours');
  assert.equal(b.Store.activityRecords['garden|p1'].creativeAssessment.level,'E','other device receives assessment');
  assert.equal(b.Store.activityRecords['garden|p1'].count,2,'visit counter reconciles');
  b.Store.data.dailyCreativeVisits={};b.Store.data.activityRecords={};
  b.sync.apply(b.sync.lastSnapshot);
  assert.equal(Object.keys(b.Store.dailyCreativeVisits).length,2,'legacy refresh can be repaired from cached snapshot');
  await a.sync.flush();
  assert.equal(cloud.visits.size,2,'retries do not duplicate visits');
  console.log('PASS: journal, 2 hours, assessment, second device, legacy recovery, idempotence');
})().catch(e=>{console.error(e);process.exitCode=1});
