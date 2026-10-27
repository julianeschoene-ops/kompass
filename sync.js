const Sync={
  timer:null,busy:false,dirty:false,lastPull:null,baseGrades:{},refreshTimer:null,
  enabled(){return Auth.session?.mode==='cloud'&&!Auth.isLernatelier()&&!!Auth.cloudClient},
  gradeOf(p){return Number(p?.year||String(p?.className||'').charAt(0))||0},
  filterObject(obj,pred){return Object.fromEntries(Object.entries(obj||{}).filter(([k,v])=>pred(k,v)))},
  sharedPayload(){const d=Store.data;return {version:d.version,subjects:d.subjects,coreSubjects:d.coreSubjects,competencies:d.competencies,settings:d.settings,projectTemplates:d.projectTemplates,creativeRooms:d.creativeRooms,timetable:d.timetable,roomOccupancy:d.roomOccupancy||ROOM_SEED,calendarEvents:(d.calendarEvents||[]).filter(e=>!e.grade||e.grade==='all'),metadata:d.metadata,activities:(d.activities||[]).filter(a=>a.type==='Kreativband')};},
  gradePayload(grade){
    const d=Store.data,pupils=(d.pupils||[]).filter(p=>this.gradeOf(p)===Number(grade)),ids=new Set(pupils.map(p=>String(p.id)));
    // IDs may be numeric in the roster and strings in record keys.
    // Always compare normalized IDs or valid attendance can silently disappear.
    const belongs=id=>id!=null&&ids.has(String(id));
    const hasPupil=(k,v)=>belongs(v?.pupilId)||belongs(String(k).split('|').pop())||belongs(String(k).split('|')[0]);
    return {grade:Number(grade),sprints:(d.sprints||[]).filter(s=>Number(s.year)===Number(grade)),pupils,activities:(d.activities||[]).filter(a=>a.type!=='Kreativband'&&Number(a.year)===Number(grade)),records:this.filterObject(d.records,(k)=>belongs(String(k).split('|').pop())),lebDrafts:this.filterObject(d.lebDrafts,(k)=>belongs(k)),activityRecords:this.filterObject(d.activityRecords,hasPupil),behaviour:this.filterObject(d.behaviour,(k)=>belongs(k)),coaching:this.filterObject(d.coaching,(k,v)=>hasPupil(k,v)),workshopPaths:this.filterObject(d.workshopPaths,(k)=>belongs(String(k).split('|')[0])),clubMemberships:this.filterObject(d.clubMemberships,hasPupil),assignments:(d.assignments||[]).filter(a=>Number(a.year)===Number(grade)),choiceImports:(d.choiceImports||[]).filter(a=>!a.year||Number(a.year)===Number(grade)),sprintHistory:this.filterObject(d.sprintHistory,(k)=>belongs(k)),clubHistory:this.filterObject(d.clubHistory,(k)=>belongs(k)),dailyCreativeVisits:this.filterObject(d.dailyCreativeVisits,hasPupil),calendarEvents:(d.calendarEvents||[]).filter(e=>Number(e.grade)===Number(grade)),teamConfig:(d.teamConfig||{})[grade]||{}};
  },
  mergeGrade(base,g){if(!g)return;base.sprints.push(...(g.sprints||[]));base.pupils.push(...(g.pupils||[]).map(p=>({...p,year:Number(g.grade)})));base.activities.push(...(g.activities||[]));for(const key of ['records','lebDrafts','activityRecords','behaviour','coaching','workshopPaths','clubMemberships','sprintHistory','clubHistory','dailyCreativeVisits'])Object.assign(base[key],g[key]||{});base.assignments.push(...(g.assignments||[]));base.choiceImports.push(...(g.choiceImports||[]));base.calendarEvents.push(...(g.calendarEvents||[]));base.teamConfig=base.teamConfig||{};base.teamConfig[g.grade]=g.teamConfig||{};},
  blankFromShared(shared={}){const d=clone(Store.data);Object.assign(d,shared||{});d.sprints=[];d.pupils=[];d.activities=[...((shared||{}).activities||[])];d.records={};d.lebDrafts={};d.activityRecords={};d.behaviour={};d.coaching={};d.workshopPaths={};d.clubMemberships={};d.assignments=[];d.choiceImports=[];d.sprintHistory={};d.clubHistory={};d.dailyCreativeVisits={};d.calendarEvents=[...((shared||{}).calendarEvents||[])];d.auditLog=[];d.teamConfig={};return d;},
  same(a,b){return JSON.stringify(a)===JSON.stringify(b)},
  mergeConcurrent(base,local,remote){
    if(this.same(local,base))return clone(remote);
    if(this.same(remote,base))return clone(local);
    if(Array.isArray(local)&&Array.isArray(base)&&Array.isArray(remote)){
      const keyed=x=>x.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.id!=null);
      if(keyed(local)&&keyed(base)&&keyed(remote)){
        const b=new Map(base.map(x=>[String(x.id),x])),l=new Map(local.map(x=>[String(x.id),x])),r=new Map(remote.map(x=>[String(x.id),x])),out=[];
        for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){
          if(b.has(id)&&!l.has(id))continue;
          if(!l.has(id)){out.push(clone(r.get(id)));continue;}
          if(!b.has(id)){out.push(clone(l.get(id)));continue;}
          out.push(this.mergeConcurrent(b.get(id),l.get(id),r.get(id)??b.get(id)));
        }
        return out;
      }
      const signature=v=>JSON.stringify(v),baseSet=new Set(base.map(signature)),localSet=new Set(local.map(signature));
      const out=remote.filter(v=>!baseSet.has(signature(v))||localSet.has(signature(v))).map(clone);
      const outSet=new Set(out.map(signature));
      for(const value of local)if(!baseSet.has(signature(value))&&!outSet.has(signature(value))){out.push(clone(value));outSet.add(signature(value));}
      return out;
    }
    if(local&&base&&remote&&typeof local==='object'&&typeof base==='object'&&typeof remote==='object'){
      const out=clone(remote);
      for(const key of new Set([...Object.keys(base),...Object.keys(local)])){
        if(Object.prototype.hasOwnProperty.call(base,key)&&!Object.prototype.hasOwnProperty.call(local,key)){delete out[key];continue;}
        if(!Object.prototype.hasOwnProperty.call(local,key))continue;
        out[key]=this.mergeConcurrent(base[key],local[key],remote[key]);
      }
      return out;
    }
    return clone(local);
  },
  // Preserve referenced competencies and block destructive shared-state uploads.
  referencedCompetencyIds(){const ids=new Set();for(const record of Object.values(Store.records||{})){}for(const key of Object.keys(Store.records||{}))ids.add(String(key).split('|')[0]);return ids;},
  async safeSharedPush(now){
    const current=await Auth.cloudClient.from('kompass_shared_state').select('payload,updated_at').eq('id','school').maybeSingle();
    if(current.error)throw current.error;
    const remote=current.data?.payload||{},local=this.sharedPayload();
    const oldComps=Array.isArray(remote.competencies)?remote.competencies:[];
    const newComps=Array.isArray(local.competencies)?local.competencies:[];
    const ids=new Set(newComps.map(x=>String(x.id)));
    const recovered=oldComps.filter(x=>!ids.has(String(x.id)));
    // Never infer deletion from an incomplete browser cache.
    local.competencies=[...newComps,...recovered.map(clone)];
    const oldProjects=Array.isArray(remote.projectTemplates)?remote.projectTemplates:[];
    const projectIds=new Set((local.projectTemplates||[]).map(x=>String(x.id)));
    local.projectTemplates=[...(local.projectTemplates||[]),...oldProjects.filter(x=>!projectIds.has(String(x.id))).map(clone)];
    const stamp=new Date().toISOString();
    const saved=await Auth.cloudClient.from('kompass_shared_state').upsert({id:'school',payload:local,updated_at:stamp},{onConflict:'id'}).select('payload');
    if(saved.error)throw saved.error;
    const verified=saved.data?.[0]?.payload?.competencies||[];
    if(local.competencies.some(x=>!verified.some(y=>String(y.id)===String(x.id))))throw new Error('Kompetenz-Sicherung konnte nicht bestätigt werden.');
    // Retain all remote definitions in the local state, preventing next sync from hiding them.
    Store.data.competencies=clone(local.competencies);
    Store.saveLocalOnly();
  },
  // Isolated LA data read: never request general grade_state for shared LA accounts.
  // Returns a reduced roster only; does not overwrite the existing pupil database.
  async pullLernatelierRoster(grade){
    if(!this.enabled()||!Auth.canAccessGrade(grade))throw new Error('Kein Cloud-Zugriff auf diesen Jahrgang.');
    const {data,error}=await Auth.cloudClient.from('kompass_lernatelier_state')
      .select('grade,payload,updated_at').eq('grade',Number(grade)).maybeSingle();
    if(error)throw error;
    if(!data||!Array.isArray(data.payload?.pupils))throw new Error('Lernatelier-Daten fehlen für Stufe '+grade+'.');
    return {grade:Number(grade),pupils:data.payload.pupils,updatedAt:data.updated_at};
  },
  schedule(delay=0){if(!this.enabled())return;this.dirty=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),delay)},
  startAutoRefresh(){
    clearInterval(this.refreshTimer);
    this.refreshTimer=setInterval(async()=>{
      if(!this.enabled()||this.busy||this.dirty||document.visibilityState==='hidden')return;
      try{await this.pull();if(typeof CreativeSyncV2!=='undefined'&&CreativeSyncV2.ready)await CreativeSyncV2.refresh();if(typeof render==='function')render();}
      catch(e){console.warn('KOMPASS Hintergrundabgleich',e);}
    },15000);
  },
  async overlayLernatelier(years,merged){
    if(!years.length)return;
    const {data,error}=await Auth.cloudClient.from('kompass_lernatelier_state')
      .select('grade,payload').in('grade',years);
    if(error)throw error;
    const index=new Map((merged.pupils||[]).map(p=>[String(p.id),p]));
    for(const row of data||[]){
      for(const lp of row.payload?.pupils||[]){
        const p=index.get(String(lp.id));
        if(!p)continue;
        for(const key of ['learningPlace','laNeedsHelp','laRequest','laDuties']){
          if(Object.prototype.hasOwnProperty.call(lp,key))p[key]=clone(lp[key]);
        }
      }
    }
  },
  async pull(){
    if(!this.enabled())return;
    // Never replace unsent local edits with a cloud snapshot.
    if(typeof CreativeSyncV2!=='undefined'&&CreativeSyncV2.ready)CreativeSyncV2.capture();
    if(this.dirty)throw new Error('Lokale Änderungen warten noch auf Cloud-Speicherung.');
    this.busy=true;
    try{
      const years=Auth.allowedGrades();
      const [{data:shared,error:se},{data:grades,error:ge}]=await Promise.all([
        Auth.cloudClient.from('kompass_shared_state').select('payload,updated_at').eq('id','school').maybeSingle(),
        years.length?Auth.cloudClient.from('kompass_grade_state').select('grade,payload,updated_at').in('grade',years):Promise.resolve({data:[],error:null})
      ]);
      if(se)throw se;if(ge)throw ge;
      const hasCloud=!!shared?.payload||(grades||[]).length>0;
      if(!hasCloud&&Auth.isAdmin()){
        if(!(Store.data.pupils||[]).length)throw new Error('In der Cloud wurde kein KOMPASS-Datenbestand gefunden. Zum Schutz wird kein leerer Stand hochgeladen.');
        this.busy=false;await this.push(true);return;
      }
      if(hasCloud){
        const completeGrades=[...(grades||[])];
        // Recheck each missing grade independently: never replace the full roster with a partial response.
        for(const grade of years){
          if(completeGrades.some(row=>Number(row.grade)===Number(grade)&&Array.isArray(row?.payload?.pupils)&&row.payload.pupils.length))continue;
          const retry=await Auth.cloudClient.from('kompass_grade_state').select('grade,payload,updated_at').eq('grade',grade).maybeSingle();
          if(retry.error)throw retry.error;
          if(retry.data){const i=completeGrades.findIndex(row=>Number(row.grade)===Number(grade));if(i>=0)completeGrades[i]=retry.data;else completeGrades.push(retry.data);}
        }
        const emptyGrades=years.filter(grade=>{const row=completeGrades.find(x=>Number(x.grade)===Number(grade));return !row||!Array.isArray(row?.payload?.pupils)||row.payload.pupils.length===0;});
        // Missing cloud grade rows must not abort the whole school sync.
        // Keep the existing local data for those grades, without ever writing
        // an empty or partial roster back to Supabase.
        const localMissing=Object.fromEntries(emptyGrades.map(grade=>[grade,this.gradePayload(grade)]));
        const merged=this.blankFromShared(shared?.payload||{});this.baseGrades={};
        for(const row of completeGrades){
          if(!Array.isArray(row?.payload?.pupils)||!row.payload.pupils.length)continue;
          this.baseGrades[row.grade]=clone(row.payload);this.mergeGrade(merged,row.payload);
        }
        for(const grade of emptyGrades){
          if(localMissing[grade]?.pupils?.length)this.mergeGrade(merged,localMissing[grade]);
        }
        if(emptyGrades.length)console.warn('Cloud-Jahrgänge ohne vollständige Schülerliste; lokale Daten geschützt:',emptyGrades);
        await this.overlayLernatelier(years.filter(g=>!emptyGrades.includes(g)),merged).catch(e=>console.warn('Optional LA overlay failed',e));
        // Recover locally recorded creative visits that are missing from the
        // cloud snapshot. Never replace newer cloud assessments with old ones.
        // These are append-only attendance records; keep them until a verified push.
        const localBeforePull=Store.data;
        let needsCreativeUpload=false;
        const mergedPupilIds=new Set((merged.pupils||[]).map(p=>String(p.id)));
        for(const [key,visit] of Object.entries(localBeforePull.dailyCreativeVisits||{})){
          if(!visit||!mergedPupilIds.has(String(visit.pupilId)))continue;
          if(!Object.prototype.hasOwnProperty.call(merged.dailyCreativeVisits||{},key)){
            merged.dailyCreativeVisits[key]=clone(visit);
            needsCreativeUpload=true;
          }
        }
        // Recover teacher competency assessments that were saved on this device
        // but were not uploaded by older KOMPASS versions. Never overwrite a
        // cloud assessment already present for the same pupil and competency.
        for(const [key,record] of Object.entries(localBeforePull.records||{})){
          const pupilId=String(key).split('|').pop();
          if(!record||!mergedPupilIds.has(pupilId))continue;
          if(!Object.prototype.hasOwnProperty.call(merged.records||{},key)){
            merged.records[key]=clone(record);
            needsCreativeUpload=true;
          }
        }
        const creativeActivityIds=new Set((merged.activities||[]).filter(a=>a.type==='Kreativband').map(a=>String(a.id)));
        for(const [key,record] of Object.entries(localBeforePull.activityRecords||{})){
          if(!record||!mergedPupilIds.has(String(record.pupilId))||!creativeActivityIds.has(String(record.activityId)))continue;
          const remoteRecord=merged.activityRecords?.[key];
          if(!remoteRecord){
            merged.activityRecords[key]=clone(record);
            needsCreativeUpload=true;
            continue;
          }
          const localAssessment=record.creativeAssessment;
          const cloudAssessment=remoteRecord.creativeAssessment;
          if(localAssessment&&(!cloudAssessment||
            (Date.parse(localAssessment.assessedAt||'')||0)>(Date.parse(cloudAssessment.assessedAt||'')||0))){
            merged.activityRecords[key]={...remoteRecord,creativeAssessment:clone(localAssessment)};
            needsCreativeUpload=true;
          }
        }
        // A user can save while the asynchronous pull is in flight.
        // In that case NEVER overwrite the new local entry with the old cloud snapshot.
        if(this.dirty)return;
        Store.data=merged;
        // Restore verified v2 rows immediately: legacy pulls must never hide them.
        if(typeof CreativeSyncV2!=='undefined'&&CreativeSyncV2.ready&&CreativeSyncV2.lastSnapshot){
          CreativeSyncV2.apply(CreativeSyncV2.lastSnapshot);
        }
        // V2 is authoritative for creative data after a successful bootstrap.
        // Keep any device-only entries from the pending journal visible.
        if(typeof CreativeSyncV2!=='undefined'&&CreativeSyncV2.ready){
          for(const item of Object.values(CreativeSyncV2.pending())){
            if(item.kind==='visit')Store.data.dailyCreativeVisits[item.key]=clone(item.value);
            if(item.kind==='assessment'){
              const old=Store.data.activityRecords[item.key]||{activityId:item.activityId,pupilId:item.pupilId,active:true,count:0};
              Store.data.activityRecords[item.key]={...old,creativeAssessment:clone(item.value)};
            }
          }
        }
        Store._rosterChanged=false;Store.migrate();if(Auth.isAdmin())await this.pullAudit();Store.saveLocalOnly();this.lastPull=new Date().toISOString();if(needsCreativeUpload)this.schedule(0);if(Auth.isAdmin()&&Store._rosterChanged){this.busy=false;await this.push(true);return;}
      }
    }catch(e){console.error('Cloud pull',e);throw e}finally{this.busy=false;if(this.dirty)this.schedule(0)}
  },
  async restoreBackupData(data){
    if(!this.enabled()||!Auth.isAdmin())throw new Error('Die Wiederherstellung ist nur mit dem angemeldeten Admin-Konto möglich.');
    if(!data||!Array.isArray(data.pupils))throw new Error('Die ausgewählte Datei ist keine KOMPASS-Wiederherstellung.');
    const oldData=clone(Store.data),expected={};
    for(const grade of [5,6,7])expected[grade]=data.pupils.filter(p=>this.gradeOf(p)===grade).length;
    if(Object.values(expected).some(n=>n===0))throw new Error('Die Wiederherstellungsdatei enthält nicht alle drei Jahrgänge.');
    this.busy=true;this.dirty=false;clearTimeout(this.timer);
    try{
      Store.data=clone(data);Store._rosterChanged=false;Store.migrate();
      const now=new Date().toISOString(),rows=[5,6,7].map(grade=>({grade,payload:this.gradePayload(grade),updated_at:now}));
      const saved=await Auth.cloudClient.from('kompass_grade_state').upsert(rows,{onConflict:'grade'}).select('grade,payload');
      if(saved.error)throw saved.error;
      const actual={};for(const row of (saved.data||[]))actual[row.grade]=Array.isArray(row?.payload?.pupils)?row.payload.pupils.length:0;
      for(const grade of [5,6,7])if(actual[grade]!==expected[grade])throw new Error('Kontrollprüfung für Jahrgang '+grade+' fehlgeschlagen. Erwartet: '+expected[grade]+', gespeichert: '+(actual[grade]??0)+'.');
      this.baseGrades=Object.fromEntries(rows.map(row=>[row.grade,clone(row.payload)]));
      Store.saveLocalOnly();this.lastPull=now;
    }catch(e){Store.data=oldData;Store.saveLocalOnly();throw e}finally{this.busy=false}
    await this.pull();
    return expected;
  },
  async push(force=false){
    if(!this.enabled())return;if(this.busy){this.dirty=true;return;}this.busy=true;this.dirty=false;
    try{
      const now=new Date().toISOString(),years=Auth.allowedGrades(),failures=[];let saved=0;
      for(const grade of years){
        const localPayload=this.gradePayload(grade);
        // A missing local roster must never block saving another grade.
        // Do not attempt a cloud write for an empty grade.
        if(!Array.isArray(localPayload.pupils)||localPayload.pupils.length===0)continue;
        // A restored browser session may contain local changes but no verified
        // baseline. Read the grade directly before attempting any write.
        if(!this.baseGrades[grade]){
          const recovery=await Auth.cloudClient.from('kompass_grade_state').select('payload').eq('grade',grade).maybeSingle();
          if(recovery.error){failures.push({part:'grade',grade,error:recovery.error});continue;}
          if(!Array.isArray(recovery.data?.payload?.pupils)||!recovery.data.payload.pupils.length){
            failures.push({part:'grade',grade,error:new Error('Kein vollständiger Cloud-Datenbestand vorhanden; lokale Einträge bleiben erhalten')});continue;
          }
          this.baseGrades[grade]=clone(recovery.data.payload);
        }
        const baseline=this.baseGrades[grade],base=clone(baseline);let done=false,error=null,persistedPayload=null;
        if(this.same(localPayload,baseline))continue;
        // Never allow a damaged or freshly emptied browser state to erase a
        // complete grade in the cloud. Deliberate roster changes remain possible
        // as long as at least one pupil is present.
        if(!Array.isArray(localPayload.pupils)||localPayload.pupils.length===0){
          // Never upload an empty roster. A missing unrelated grade must not
          // block writes for grades that are fully loaded.
          const pending=Object.values(Store.dailyCreativeVisits||{}).some(v=>Number(v?.grade)===Number(grade));
          if(pending)failures.push({part:'grade',grade,error:new Error('Schülerliste fehlt; lokale Besuche für diesen Jahrgang können noch nicht zugeordnet werden')});
          continue;
        }
        for(let attempt=0;attempt<3&&!done;attempt++){
          const current=await Auth.cloudClient.from('kompass_grade_state').select('payload,updated_at').eq('grade',grade).maybeSingle();
          if(current.error){error=current.error;break;}
          if(!current.data){const inserted=await Auth.cloudClient.from('kompass_grade_state').insert({grade,payload:localPayload,updated_at:new Date().toISOString()}).select('grade');error=inserted.error;done=!error;if(done)persistedPayload=localPayload;break;}
          const remotePayload=current.data.payload||{};
          const merged=this.mergeConcurrent(base,localPayload,remotePayload),stamp=new Date().toISOString();
          // A stale/empty browser cache must never erase saved allocation rounds.
          // Explicit edits to a saved assignment remain possible, but deletion of
          // whole assignments is not inferred from a missing local copy.
          const savedAssignments=Array.isArray(remotePayload.assignments)?remotePayload.assignments:[];
          const mergedAssignments=Array.isArray(merged.assignments)?merged.assignments:[];
          const mergedIds=new Set(mergedAssignments.map(a=>String(a.id)));
          for(const a of savedAssignments)if(!mergedIds.has(String(a.id))){mergedAssignments.push(clone(a));mergedIds.add(String(a.id));}
          merged.assignments=mergedAssignments;
          // Keep cloud workshop allocations if the local browser lacks them.
          merged.workshopPaths={...(remotePayload.workshopPaths||{}),...(merged.workshopPaths||{})};
          for(const [key,path] of Object.entries(remotePayload.workshopPaths||{})){
            if(!merged.workshopPaths[key]?.lab&&path?.lab)merged.workshopPaths[key]=clone(path);
          }

          // Never let stale devices erase cloud rosters or previously recorded visits.
          if(!Array.isArray(merged.pupils)||merged.pupils.length<(remotePayload.pupils||[]).length||!Auth.canLead(grade))merged.pupils=clone(remotePayload.pupils||[]);
          const remoteVisits=remotePayload.dailyCreativeVisits||{},localVisits=localPayload.dailyCreativeVisits||{},baseVisits=base.dailyCreativeVisits||{};
          merged.dailyCreativeVisits={...remoteVisits};
          for(const [key,value] of Object.entries(localVisits)){
            if(!Object.prototype.hasOwnProperty.call(remoteVisits,key))merged.dailyCreativeVisits[key]=clone(value);
          }
          // Creative visits are append-only during normal synchronization.
          // Never interpret a stale or incomplete device as a deletion request.
          // Deletions require a separate, explicit cloud operation with a backup.
          const remoteRecords=remotePayload.activityRecords||{},localRecords=localPayload.activityRecords||{},baseRecords=base.activityRecords||{};
          merged.activityRecords={...remoteRecords};
          for(const [key,record] of Object.entries(localRecords)){
            const old=baseRecords[key],remote=remoteRecords[key];
            if(!remote||!old||!this.same(record,old)){
              const updated=clone(record);
              if(remote&&old&&Number(record?.count)!==Number(old?.count)){
                updated.count=Math.max(0,Number(remote.count||0)+Number(record.count||0)-Number(old.count||0));
              }else if(remote)updated.count=Math.max(Number(remote.count||0),Number(record.count||0));
              merged.activityRecords[key]={...(remote||{}),...updated};
            }
          }
          // Competency assessments are shared teaching records: authorized teachers
          // may write them even without grade-lead permissions. Merge only locally
          // changed records against the cloud baseline, preserving colleagues' work.
          const cloudCompetencyRecords=remotePayload.records||{};
          const localCompetencyRecords=localPayload.records||{};
          const baseCompetencyRecords=base.records||{};
          merged.records=clone(cloudCompetencyRecords);
          for(const [key,localRecord] of Object.entries(localCompetencyRecords)){
            const oldRecord=baseCompetencyRecords[key];
            if(oldRecord&&this.same(localRecord,oldRecord))continue;
            const cloudRecord=cloudCompetencyRecords[key];
            merged.records[key]=oldRecord&&cloudRecord
              ?this.mergeConcurrent(oldRecord,localRecord,cloudRecord)
              :clone(localRecord);
          }
          // Non-leaders may change competency assessments, creative visits and
          // creative counters, but never overwrite protected grade administration.
          if(!Auth.canLead(grade)){
            for(const key of Object.keys(remotePayload)){
              if(!['records','dailyCreativeVisits','activityRecords'].includes(key))merged[key]=clone(remotePayload[key]);
            }
          }
          const updated=await Auth.cloudClient.from('kompass_grade_state').update({payload:merged,updated_at:stamp}).eq('grade',grade).eq('updated_at',current.data.updated_at).select('grade,payload');
          error=updated.error;
          if(!error&&updated.data?.length){
            const written=updated.data[0]?.payload||{};
            const visitsOk=Object.entries(localPayload.dailyCreativeVisits||{}).every(([key,value])=>Object.prototype.hasOwnProperty.call(written.dailyCreativeVisits||{},key));
            const recordsOk=Object.entries(localPayload.activityRecords||{}).every(([key,value])=>{
              const got=(written.activityRecords||{})[key];
              return !!got&&(!value?.creativeAssessment||this.same(got.creativeAssessment,value.creativeAssessment));
            });
            if(!visitsOk||!recordsOk){error=new Error('Cloud hat Kreativband-Einträge oder Bewertungen nicht vollständig bestätigt');break;}
            done=true;persistedPayload=written;
          }
        }
        // A successful UPDATE response is not enough: verify a separate read
        // sees the same creative records that were just written.
        if(done){
          const check=await Auth.cloudClient.from('kompass_grade_state').select('payload').eq('grade',grade).maybeSingle();
          if(check.error||!check.data?.payload){
            done=false;error=check.error||new Error('Cloud-Kontrolllesung fehlgeschlagen');
          }else{
            const confirmed=check.data.payload;
            const visitsOk=Object.keys(localPayload.dailyCreativeVisits||{}).every(k=>Object.prototype.hasOwnProperty.call(confirmed.dailyCreativeVisits||{},k));
            const assessmentsOk=Object.entries(localPayload.activityRecords||{}).every(([k,v])=>!v?.creativeAssessment||this.same(confirmed.activityRecords?.[k]?.creativeAssessment,v.creativeAssessment));
            if(!visitsOk||!assessmentsOk){done=false;error=new Error('Kreativband-Daten sind nach dem Speichern nicht vollständig aus der Cloud lesbar');}
            else persistedPayload=confirmed;
          }
        }
        if(!done){error=error||new Error('Gleichzeitige Änderung konnte nach drei Versuchen nicht zusammengeführt werden.');failures.push({part:'grade',grade,error});console.warn('Cloud grade sync',grade,error);}else{this.baseGrades[grade]=clone(persistedPayload||localPayload);saved++;}
      }
      if(Auth.isAdmin()){try{await this.safeSharedPush(now);saved++;}catch(error){failures.push({part:'shared',error});console.warn('Cloud shared sync',error);}}
      await this.pushAudit();
      if(failures.length){
        this.dirty=true;
        console.warn('Cloud partially synced; successful writes retained',failures);
        const f=failures[0], raw=f?.error?.message||f?.error?.details||f?.error?.hint||String(f?.error||'Unbekannter Fehler');
        const where=f.part==='grade'?'Jahrgang '+f.grade:(f.part==='shared'?'Schuldaten':'Cloud');
        toast('Cloud-Fehler ('+where+'): '+raw,7000);
        return;
      }
      this.lastPull=now;if(saved>0)toast('Cloud-Speicherung bestätigt',2500);
    }catch(e){this.dirty=true;console.error('Cloud push',e);toast('Cloud-Fehler: '+(e?.message||String(e)),7000)}finally{this.busy=false;if(this.dirty)this.schedule(10000)}
  },
  async pushAudit(){const u=Auth.currentUser();const rows=(Store.auditLog||[]).slice(-40).map(l=>({id:l.id,at:l.at,user_id:u?.id||null,user_name:l.user||u?.name||'',action:l.action||'Änderung gespeichert',details:l.details||{},sections:l.sections||[]}));if(!rows.length)return;const {error}=await Auth.cloudClient.from('kompass_audit_log').upsert(rows,{onConflict:'id',ignoreDuplicates:true});if(error&&error.code!=='42501')console.warn('Audit sync',error)},
  async pullAudit(){const {data,error}=await Auth.cloudClient.from('kompass_audit_log').select('id,at,user_id,user_name,action,details,sections').order('at',{ascending:false}).limit(500);if(error)throw error;Store.data.auditLog=(data||[]).reverse().map(x=>({id:x.id,at:x.at,userId:x.user_id,user:x.user_name,action:x.action,details:x.details||{},sections:x.sections||[]}));},
  async cloudProfiles(){if(!this.enabled())return[];const data=await this.adminAccountAction({action:'listAccounts'});return Array.isArray(data?.accounts)?data.accounts:[];},
  accountApiChecked:false,
  async adminAccountAction(payload,{skipPreflight=false}={}){
    if(!this.enabled()||!Auth.isAdmin())throw new Error('Nur ein angemeldeter Admin kann Konten verwalten.');
    const {data:sessionData,error:sessionErr}=await Auth.cloudClient.auth.getSession();
    if(sessionErr)throw new Error('Admin-Sitzung konnte nicht gelesen werden: '+(sessionErr.message||String(sessionErr)));
    const token=sessionData?.session?.access_token;
    if(!token)throw new Error('Keine aktive Supabase-Anmeldung gefunden. Bitte einmal neu anmelden.');

    const call=async(body)=>{
      let response;
      try{
        response=await fetch(Auth.cloud.url+'/functions/v1/create-kompass-user',{
          method:'POST',
          headers:{'Authorization':'Bearer '+token,'apikey':Auth.cloud.anonKey,'Content-Type':'application/json'},
          body:JSON.stringify(body)
        });
      }catch(e){throw new Error('Die Kontofunktion konnte nicht erreicht werden: '+(e?.message||String(e)));}
      const raw=await response.text();
      let data=null;
      try{data=raw?JSON.parse(raw):null}catch(_e){}
      if(!response.ok||data?.error){
        const detail=data?.error||data?.message||raw||('HTTP '+response.status);
        throw new Error(detail+' (HTTP '+response.status+')');
      }
      return data||{};
    };

    // 8.5.0: Versionscheck IMMER vor einer schreibenden Aktion. Eine alte Function darf nichts mehr verändern,
    // nur damit der Browser anschließend merkt, dass sie alt war.
    if(!skipPreflight&&!this.accountApiChecked&&payload?.action!=='ping'){
      const ping=await call({action:'ping'});
      if(ping?.apiVersion!=='8.5.2'||ping?.mutation!==false){
        throw new Error('Die Supabase-Kontofunktion ist nicht auf KOMPASS 8.5.2 aktualisiert. Es wurde nichts verändert.');
      }
      this.accountApiChecked=true;
    }

    const data=await call(payload);
    if(data?.apiVersion!=='8.5.2')throw new Error('Versionskonflikt der Kontofunktion. Es wurde keine weitere Aktion ausgeführt.');
    return data;
  },
  async createCloudUser({name,email,password,role='teacher',gradeAccess={},coachTeams={},coachingGroups={}}){
    const data=await this.adminAccountAction({action:'create',name,email,password,role,gradeAccess,coachTeams,coachingGroups});
    if(!data?.user?.id||data?.verified!==true)throw new Error('Das Konto wurde serverseitig nicht vollständig bestätigt.');
    if(role==='lernatelier'){
      const accounts=await this.cloudProfiles();
      const created=accounts.find(a=>a.id===data.user.id);
      if(!created||created.role!=='lernatelier')throw new Error('Das Konto wurde angelegt, aber die eingeschränkte Lernatelier-Rolle wurde nicht bestätigt. Bitte nicht für Schüler-iPads verwenden.');
    }
    Store.log(data.repairedExisting?'Cloud-Benutzer repariert':'Cloud-Benutzer angelegt',{target:name,email,role,gradeAccess,coachTeams,coachingGroups});
    return data;
  },
  async saveCloudAccount({userId,name,role='teacher',active=false,gradeAccess={},coachTeams={},coachingGroups={}}){
    const data=await this.adminAccountAction({action:'saveAccount',userId,name,role,active,gradeAccess,coachTeams,coachingGroups});
    if(data?.verified!==true)throw new Error('Die Kontoänderungen wurden serverseitig nicht bestätigt.');
    if(role==='lernatelier'){
      const accounts=await this.cloudProfiles();
      const saved=accounts.find(a=>a.id===userId);
      if(!saved||saved.role!=='lernatelier')throw new Error('Die eingeschränkte Lernatelier-Rolle wurde nicht bestätigt. Konto bitte nicht auf Schüler-iPads verwenden.');
    }
    Store.log('Cloud-Benutzer gespeichert',{target:userId,name,role,active,gradeAccess,coachTeams,coachingGroups});
    return data;
  },
  async resetCloudAccountPassword({account,password}){
    if(!account?.id)throw new Error('Das Konto wurde nicht gefunden.');
    if(account.id===Auth.currentUser()?.id)throw new Error('Das eigene Passwort wird links im Kontobereich über „Passwort ändern“ geändert.');
    if(String(password||'').length<10)throw new Error('Das neue Startpasswort muss mindestens 10 Zeichen lang sein.');
    const snapshot={
      userId:account.id,
      name:account.display_name||account.email,
      role:account.role||'teacher',
      active:Boolean(account.active),
      gradeAccess:account.gradeAccess||{},
      coachTeams:account.coach_teams||{},
      coachingGroups:account.coaching_groups||{}
    };
    let temporarilyLocked=false;
    try{
      if(snapshot.active){await this.saveCloudAccount({...snapshot,active:false});temporarilyLocked=true;}
      const repaired=await this.adminAccountAction({action:'create',name:snapshot.name,email:account.email,password,role:snapshot.role,gradeAccess:snapshot.gradeAccess,coachTeams:snapshot.coachTeams,coachingGroups:snapshot.coachingGroups});
      if(repaired?.verified!==true||repaired?.user?.id!==account.id)throw new Error('Die Passwortänderung wurde serverseitig nicht bestätigt.');
      if(snapshot.active)await this.saveCloudAccount(snapshot);
      Store.log('Cloud-Passwort durch Admin zurückgesetzt',{target:account.id,name:snapshot.name});
      return true;
    }catch(e){
      if(temporarilyLocked){
        try{await this.saveCloudAccount(snapshot)}catch(restoreError){throw new Error((e?.message||String(e))+' Das Konto konnte danach nicht automatisch wieder aktiviert werden: '+(restoreError?.message||String(restoreError)));}
      }
      throw e;
    }
  },
  async deleteCloudAccount({userId}){
    const data=await this.adminAccountAction({action:'deleteAccount',userId});
    if(data?.verified!==true||data?.deleted!==true)throw new Error('Das Löschen wurde serverseitig nicht vollständig bestätigt.');
    Store.log('Cloud-Benutzer gelöscht',{target:userId});
    return data;
  }

};
