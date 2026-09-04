const Sync={
  timer:null,busy:false,lastPull:null,
  enabled(){return Auth.session?.mode==='cloud'&&!!Auth.cloudClient},
  gradeOf(p){return Number(p?.year||String(p?.className||'').charAt(0))||0},
  filterObject(obj,pred){return Object.fromEntries(Object.entries(obj||{}).filter(([k,v])=>pred(k,v)))},
  sharedPayload(){const d=Store.data;return {version:d.version,subjects:d.subjects,coreSubjects:d.coreSubjects,competencies:d.competencies,settings:d.settings,projectTemplates:d.projectTemplates,creativeRooms:d.creativeRooms,timetable:d.timetable,calendarEvents:d.calendarEvents,metadata:d.metadata,activities:(d.activities||[]).filter(a=>a.type==='Kreativband')};},
  gradePayload(grade){
    const d=Store.data,pupils=(d.pupils||[]).filter(p=>this.gradeOf(p)===Number(grade)),ids=new Set(pupils.map(p=>p.id));
    const hasPupil=(k,v)=>ids.has(v?.pupilId)||ids.has(String(k).split('|').pop())||ids.has(String(k).split('|')[0]);
    return {grade:Number(grade),sprints:(d.sprints||[]).filter(s=>Number(s.year)===Number(grade)),pupils,activities:(d.activities||[]).filter(a=>a.type!=='Kreativband'&&Number(a.year)===Number(grade)),records:this.filterObject(d.records,(k)=>ids.has(String(k).split('|').pop())),lebDrafts:this.filterObject(d.lebDrafts,(k)=>ids.has(k)),activityRecords:this.filterObject(d.activityRecords,hasPupil),behaviour:this.filterObject(d.behaviour,(k)=>ids.has(k)),coaching:this.filterObject(d.coaching,(k,v)=>hasPupil(k,v)),workshopPaths:this.filterObject(d.workshopPaths,(k)=>ids.has(String(k).split('|')[0])),clubMemberships:this.filterObject(d.clubMemberships,hasPupil),assignments:(d.assignments||[]).filter(a=>Number(a.year)===Number(grade)),choiceImports:(d.choiceImports||[]).filter(a=>!a.year||Number(a.year)===Number(grade)),sprintHistory:this.filterObject(d.sprintHistory,(k)=>ids.has(k)),clubHistory:this.filterObject(d.clubHistory,(k)=>ids.has(k)),dailyCreativeVisits:this.filterObject(d.dailyCreativeVisits,hasPupil)};
  },
  mergeGrade(base,g){if(!g)return;base.sprints.push(...(g.sprints||[]));base.pupils.push(...(g.pupils||[]));base.activities.push(...(g.activities||[]));for(const key of ['records','lebDrafts','activityRecords','behaviour','coaching','workshopPaths','clubMemberships','sprintHistory','clubHistory','dailyCreativeVisits'])Object.assign(base[key],g[key]||{});base.assignments.push(...(g.assignments||[]));base.choiceImports.push(...(g.choiceImports||[]));},
  blankFromShared(shared={}){const d=clone(Store.data);Object.assign(d,shared||{});d.sprints=[];d.pupils=[];d.activities=[...((shared||{}).activities||[])];d.records={};d.lebDrafts={};d.activityRecords={};d.behaviour={};d.coaching={};d.workshopPaths={};d.clubMemberships={};d.assignments=[];d.choiceImports=[];d.sprintHistory={};d.clubHistory={};d.dailyCreativeVisits={};d.auditLog=[];return d;},
  schedule(){if(!this.enabled()||this.busy)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),700)},
  async pull(){
    if(!this.enabled())return;this.busy=true;
    try{
      const years=Auth.allowedGrades();
      const [{data:shared,error:se},{data:grades,error:ge}]=await Promise.all([
        Auth.cloudClient.from('kompass_shared_state').select('payload,updated_at').eq('id','school').maybeSingle(),
        years.length?Auth.cloudClient.from('kompass_grade_state').select('grade,payload,updated_at').in('grade',years):Promise.resolve({data:[],error:null})
      ]);
      if(se)throw se;if(ge)throw ge;
      const hasCloud=!!shared?.payload||(grades||[]).length>0;
      if(!hasCloud&&Auth.isAdmin()){this.busy=false;await this.push(true);return;}
      if(hasCloud){const merged=this.blankFromShared(shared?.payload||{});for(const row of (grades||[]))this.mergeGrade(merged,row.payload||{});Store.data=merged;Store.migrate();if(Auth.isAdmin())await this.pullAudit();Store.saveLocalOnly();this.lastPull=new Date().toISOString();}
    }catch(e){console.error('Cloud pull',e);throw e}finally{this.busy=false}
  },
  async push(force=false){
    if(!this.enabled())return;this.busy=true;
    try{
      const now=new Date().toISOString(),years=Auth.allowedGrades();
      for(const grade of years){const {error}=await Auth.cloudClient.from('kompass_grade_state').upsert({grade,payload:this.gradePayload(grade),updated_at:now});if(error)throw error;}
      if(Auth.isAdmin()){const {error}=await Auth.cloudClient.from('kompass_shared_state').upsert({id:'school',payload:this.sharedPayload(),updated_at:now});if(error)throw error;}
      await this.pushAudit();this.lastPull=now;
    }catch(e){console.error('Cloud push',e);toast('Cloud-Speicherung fehlgeschlagen')}finally{this.busy=false}
  },
  async pushAudit(){const u=Auth.currentUser();const rows=(Store.auditLog||[]).slice(-40).map(l=>({id:l.id,at:l.at,user_id:u?.id||null,user_name:l.user||u?.name||'',action:l.action||'Änderung gespeichert',details:l.details||{},sections:l.sections||[]}));if(!rows.length)return;const {error}=await Auth.cloudClient.from('kompass_audit_log').upsert(rows,{onConflict:'id',ignoreDuplicates:true});if(error&&error.code!=='42501')console.warn('Audit sync',error)},
  async pullAudit(){const {data,error}=await Auth.cloudClient.from('kompass_audit_log').select('id,at,user_id,user_name,action,details,sections').order('at',{ascending:false}).limit(500);if(error)throw error;Store.data.auditLog=(data||[]).reverse().map(x=>({id:x.id,at:x.at,userId:x.user_id,user:x.user_name,action:x.action,details:x.details||{},sections:x.sections||[]}));},
  async cloudProfiles(){if(!this.enabled())return[];const [{data:profiles,error:pErr},{data:access,error:aErr}]=await Promise.all([Auth.cloudClient.from('kompass_profiles').select('id,display_name,role,active,created_at').order('display_name'),Auth.cloudClient.from('kompass_grade_access').select('user_id,grade,access_level')]);if(pErr)throw pErr;if(aErr)throw aErr;return (profiles||[]).map(p=>({...p,gradeAccess:Object.fromEntries((access||[]).filter(a=>a.user_id===p.id).map(a=>[a.grade,a.access_level]))}));},
  async updateCloudProfile(id,patch){if(!this.enabled())return;const {error}=await Auth.cloudClient.from('kompass_profiles').update(patch).eq('id',id);if(error)throw error;Store.log('Cloud-Benutzer geändert',{target:id,...patch})},
  async updateCloudGradeAccess(userId,grade,level){if(!this.enabled())return;if(!level){const {error}=await Auth.cloudClient.from('kompass_grade_access').delete().eq('user_id',userId).eq('grade',grade);if(error)throw error;}else{const {error}=await Auth.cloudClient.from('kompass_grade_access').upsert({user_id:userId,grade:Number(grade),access_level:level});if(error)throw error;}Store.log('Stufenrecht geändert',{target:userId,grade:Number(grade),level:level||'kein Zugriff'});}
};
