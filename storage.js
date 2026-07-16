const STORAGE_KEY = 'kompass41_data';
const LEGACY_KEYS = ['kompass33_sprints','kompass33_subjects','kompass33_pupils','kompass33_competencies','kompass33_records','kompass33_lebDrafts','kompass33_metadata'];

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function uid(prefix='id'){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }

const Store = {
  data: null,
  load(){
    const current = localStorage.getItem(STORAGE_KEY);
    if(current){ this.data = JSON.parse(current); this.migrate(); return; }
    const legacy = localStorage.getItem('kompass33_pupils');
    if(legacy){
      this.data = {
        version:'4.2',
        subjects: JSON.parse(localStorage.getItem('kompass33_subjects') || 'null') || clone(SEED.subjects),
        coreSubjects: clone(SEED.coreSubjects),
        sprints: JSON.parse(localStorage.getItem('kompass33_sprints') || 'null') || clone(SEED.sprints),
        pupils: JSON.parse(localStorage.getItem('kompass33_pupils') || 'null') || clone(SEED.pupils),
        competencies: JSON.parse(localStorage.getItem('kompass33_competencies') || 'null') || clone(SEED.competencies),
        records: JSON.parse(localStorage.getItem('kompass33_records') || '{}'),
        lebDrafts: JSON.parse(localStorage.getItem('kompass33_lebDrafts') || '{}'),
        settings: { scoreConfig:{...DEFAULT_SCORE_CONFIG} },
        activities:[], activityRecords:{}, behaviour:{}, coaching:{},
        metadata: JSON.parse(localStorage.getItem('kompass33_metadata') || '{}')
      };
      this.migrate(); this.save(); return;
    }
    this.data = {version:'4.2',subjects:clone(SEED.subjects),coreSubjects:clone(SEED.coreSubjects),sprints:clone(SEED.sprints),pupils:clone(SEED.pupils),competencies:clone(SEED.competencies),records:{},lebDrafts:{},activities:[],activityRecords:{},behaviour:{},coaching:{},settings:{scoreConfig:{...DEFAULT_SCORE_CONFIG}},metadata:{createdAt:new Date().toISOString(),version:'4.2'}};
    this.save();
  },
  migrate(){
    const d=this.data;
    d.version='4.2';
    d.subjects=d.subjects||clone(SEED.subjects);
    d.coreSubjects=d.coreSubjects||clone(SEED.coreSubjects);
    d.sprints=d.sprints||clone(SEED.sprints);
    d.pupils=d.pupils||[];
    d.competencies=d.competencies||[];
    d.records=d.records||{};
    d.lebDrafts=d.lebDrafts||{};
    d.activities=d.activities||[];
    d.activityRecords=d.activityRecords||{};
    d.behaviour=d.behaviour||{};
    d.coaching=d.coaching||{};
    d.settings=d.settings||{};
    d.settings.scoreConfig=d.settings.scoreConfig||{...DEFAULT_SCORE_CONFIG};
    d.metadata=d.metadata||{};
    d.metadata.version='4.2';
    d.sprints.forEach(s=>{ if(!s.id)s.id='s'+s.year+'_'+s.number; if(s.startDate===undefined)s.startDate=''; if(s.endDate===undefined)s.endDate=''; });
    d.competencies.forEach((c,i)=>{
      if(!c.id)c.id=uid('comp');
      if(!c.type)c.type=c.subject==='Prozess'||c.kind==='prozess'?'process':(CORE_SUBJECTS.includes(c.subject)?'core':'workshop');
      if(!c.category)c.category=c.area||'Allgemein';
      if(!c.area)c.area=c.category;
      if(c.includeInLeb===undefined)c.includeInLeb=true;
      if(c.order===undefined)c.order=i*10;
      if(c.maxPoints===undefined)c.maxPoints=null;
      if(!c.scoreConfig)c.scoreConfig={...DEFAULT_SCORE_CONFIG};
      if(c.note===undefined)c.note='';
    });
    SEED.competencies.forEach(c=>{ if(!d.competencies.some(x=>x.id===c.id)) d.competencies.push(clone(c)); });
    SEED.sprints.forEach(s=>{ if(!d.sprints.some(x=>x.year===s.year&&x.number===s.number)) d.sprints.push(clone(s)); });
  },
  save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },
  exportData(){ return {...this.data, exportedAt:new Date().toISOString()}; },
  importData(data){ if(!data || !Array.isArray(data.pupils) || !Array.isArray(data.competencies)){ alert('Diese Datei sieht nicht wie eine KOMPASS-Datensicherung aus.'); return false; } this.data=data; this.migrate(); this.save(); return true; }
};
Store.load();
Object.defineProperties(Store,{sprints:{get(){return this.data.sprints},set(v){this.data.sprints=v}},subjects:{get(){return this.data.subjects},set(v){this.data.subjects=v}},coreSubjects:{get(){return this.data.coreSubjects},set(v){this.data.coreSubjects=v}},pupils:{get(){return this.data.pupils},set(v){this.data.pupils=v}},competencies:{get(){return this.data.competencies},set(v){this.data.competencies=v}},records:{get(){return this.data.records},set(v){this.data.records=v}},lebDrafts:{get(){return this.data.lebDrafts},set(v){this.data.lebDrafts=v}},activities:{get(){return this.data.activities},set(v){this.data.activities=v}},activityRecords:{get(){return this.data.activityRecords},set(v){this.data.activityRecords=v}},behaviour:{get(){return this.data.behaviour},set(v){this.data.behaviour=v}},coaching:{get(){return this.data.coaching},set(v){this.data.coaching=v}},settings:{get(){return this.data.settings},set(v){this.data.settings=v}},metadata:{get(){return this.data.metadata},set(v){this.data.metadata=v}}});
