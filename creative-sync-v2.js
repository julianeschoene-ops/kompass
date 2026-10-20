/* KOMPASS creative sync v2 — isolated from legacy grade snapshot sync.
 * Explicit pending journal: never infer that localStorage means cloud saved.
 * V2 tables must be deployed/backfilled before this module is enabled.
 */
const CreativeSyncV2={
  journalKey:'kompass_creative_v2_pending',ackKey:'kompass_creative_v2_ack',busy:false,ready:false,lastError:null,
  acknowledgements(){try{return JSON.parse(localStorage.getItem(this.ackKey)||'{}')}catch(e){return {}}},
  saveAcknowledgements(a){localStorage.setItem(this.ackKey,JSON.stringify(a))},
  pending(){try{return JSON.parse(localStorage.getItem(this.journalKey)||'{}')}catch(e){throw new Error('Lokale Kreativband-Warteschlange beschädigt: '+e.message)}},
  persist(queue){localStorage.setItem(this.journalKey,JSON.stringify(queue))},
  gradeOf(p){return Number(p?.year||String(p?.className||'').charAt(0))||0},
  pupilGrade(id){const p=(Store.pupils||[]).find(p=>String(p.id)===String(id));return p?this.gradeOf(p):0},
  capture(){
    if(!Auth.cloudClient||Auth.session?.mode!=='cloud'||Auth.isLernatelier())return;
    const q=this.pending(),ack=this.acknowledgements(),now=new Date().toISOString();
    for(const [key,v] of Object.entries(Store.dailyCreativeVisits||{})){
      const grade=this.pupilGrade(v?.pupilId);
      if(!grade||!v?.activityId)continue;
      const id='visit:'+grade+':'+key;
      if(!q[id]&&ack[id]!==JSON.stringify(v))q[id]={kind:'visit',grade,key,pupilId:String(v.pupilId),activityId:String(v.activityId),value:clone(v),capturedAt:now};
    }
    const creativeIds=new Set((Store.activities||[]).filter(a=>a.type==='Kreativband').map(a=>String(a.id)));
    for(const [key,r] of Object.entries(Store.activityRecords||{})){
      if(!r?.creativeAssessment||!creativeIds.has(String(r.activityId)))continue;
      const grade=this.pupilGrade(r.pupilId);
      if(!grade||!r.activityId)continue;
      const id='assessment:'+grade+':'+key,prior=q[id];
      const incoming=Date.parse(r.creativeAssessment.assessedAt||'')||0;
      const previous=Date.parse(prior?.value?.assessedAt||'')||0;
      if(ack[id]!==JSON.stringify(r.creativeAssessment)&&(!prior||incoming>previous))q[id]={kind:'assessment',grade,key,pupilId:String(r.pupilId),activityId:String(r.activityId),value:clone(r.creativeAssessment),capturedAt:now};
    }
    this.persist(q);
  },
  hasPending(){return Object.keys(this.pending()).length>0},
  async readAll(){
    const client=Auth.cloudClient,years=Auth.allowedGrades();
    const fetchAll=async table=>{
      const out=[];let from=0;const limit=500;
      while(true){
        const {data,error}=await client.from(table).select('*').in('grade',years).range(from,from+limit-1);
        if(error)throw error;out.push(...(data||[]));
        if(!data||data.length<limit)return out;
        from+=limit;if(from>100000)throw new Error('Zu viele Datensätze für einen vollständigen Abgleich');
      }
    };
    const [visits,assessments]=await Promise.all([fetchAll('kompass_creative_visits_v2'),fetchAll('kompass_creative_assessments_v2')]);
    return {visits,assessments};
  },
  apply(snapshot){
    const pending=this.pending(),d=Store.data;
    d.dailyCreativeVisits=d.dailyCreativeVisits||{};d.activityRecords=d.activityRecords||{};
    for(const row of snapshot.visits){
      const id='visit:'+row.grade+':'+row.visit_key;
      if(!pending[id])d.dailyCreativeVisits[row.visit_key]=clone(row.visit);
    }
    for(const row of snapshot.assessments){
      const id='assessment:'+row.grade+':'+row.record_key;
      if(pending[id])continue;
      const key=row.record_key,old=d.activityRecords[key]||{activityId:row.activity_id,pupilId:row.pupil_id,active:true,count:0};
      const current=old.creativeAssessment,remote=row.assessment;
      if(!current||(Date.parse(remote?.assessedAt||'')||0)>=(Date.parse(current.assessedAt||'')||0)){
        d.activityRecords[key]={...old,creativeAssessment:clone(remote)};
      }
    }
    Store.saveLocalOnly();
  },
  async initialize(){
    const snapshot=await this.readAll();
    const ack=this.acknowledgements();
    for(const row of snapshot.visits){const id='visit:'+row.grade+':'+row.visit_key;if(!this.pending()[id])ack[id]=JSON.stringify(row.visit)}
    for(const row of snapshot.assessments){const id='assessment:'+row.grade+':'+row.record_key;if(!this.pending()[id])ack[id]=JSON.stringify(row.assessment)}
    this.saveAcknowledgements(ack);
    this.apply(snapshot);
    this.ready=true;
    await this.flush();
  },
  async flush(){
    if(this.busy||!Auth.cloudClient||Auth.session?.mode!=='cloud'||Auth.isLernatelier())return;
    this.busy=true;
    try{
      this.capture();
      const q=this.pending(),client=Auth.cloudClient;
      for(const [id,item] of Object.entries(q)){
        const table=item.kind==='visit'?'kompass_creative_visits_v2':'kompass_creative_assessments_v2';
        const row=item.kind==='visit'
          ?{grade:item.grade,visit_key:item.key,pupil_id:item.pupilId,activity_id:item.activityId,visit:item.value}
          :{grade:item.grade,record_key:item.key,pupil_id:item.pupilId,activity_id:item.activityId,assessment:item.value};
        const conflict=item.kind==='visit'?'grade,visit_key':'grade,record_key';
        // A conflict on a visit key is an idempotent retry, not a second attendance hour.
        const column=item.kind==='visit'?'visit_key':'record_key';
        const previous=await client.from(table).select('*').eq('grade',item.grade).eq(column,item.key).maybeSingle();
        if(previous.error)throw previous.error;
        if(item.kind==='assessment'&&previous.data){
          const cloudDate=Date.parse(previous.data.assessment?.assessedAt||'')||0;
          const localDate=Date.parse(item.value?.assessedAt||'')||0;
          if(cloudDate>localDate){
            const ack=this.acknowledgements();ack[id]=JSON.stringify(previous.data.assessment);this.saveAcknowledgements(ack);
            const queue=this.pending();if(JSON.stringify(queue[id])===JSON.stringify(item)){delete queue[id];this.persist(queue)}
            continue;
          }
        }
        const {error}=await client.from(table).upsert(row,{onConflict:conflict,ignoreDuplicates:item.kind==='visit'});
        if(error)throw error;
        const col=item.kind==='visit'?'visit_key':'record_key';
        const {data,error:readError}=await client.from(table).select('*').eq('grade',item.grade).eq(col,item.key).single();
        if(readError||!data)throw readError||new Error('Speicherung nicht lesbar');
        const stored=item.kind==='visit'?data.visit:data.assessment;
        if(JSON.stringify(stored)!==JSON.stringify(item.value)){
          if(item.kind==='visit'){
            // Existing cloud visit wins; retain the differing local entry for manual reconciliation.
            throw new Error('Besuchskonflikt: lokaler Eintrag bleibt in der Warteschlange');
          }
          throw new Error('Cloud-Bestätigung stimmt nicht mit lokalem Eintrag überein');
        }
        const latest=this.pending();
        if(JSON.stringify(latest[id])===JSON.stringify(item)){
          const ack=this.acknowledgements();ack[id]=JSON.stringify(item.value);
          this.saveAcknowledgements(ack);delete latest[id];this.persist(latest);
        }
      }
      const snapshot=await this.readAll();
      this.apply(snapshot);
      const ack=this.acknowledgements();
      for(const row of snapshot.visits)ack['visit:'+row.grade+':'+row.visit_key]=JSON.stringify(row.visit);
      for(const row of snapshot.assessments)ack['assessment:'+row.grade+':'+row.record_key]=JSON.stringify(row.assessment);
      this.saveAcknowledgements(ack);
      this.lastError=null;this.ready=true;
    }catch(e){this.lastError=e;console.error('Kreativband Cloud v2',e);throw e}
    finally{this.busy=false}
  },
  async refresh(){
    if(this.busy||!this.ready)return;
    this.capture();
    if(this.hasPending())return this.flush();
    this.apply(await this.readAll());
  }
};
