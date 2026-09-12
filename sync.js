const Sync={
  timer:null,busy:false,lastPull:null,
  enabled(){return Auth.session?.mode==='cloud'&&!!Auth.cloudClient},
  gradeOf(p){return Number(p?.year||String(p?.className||'').charAt(0))||0},
  filterObject(obj,pred){return Object.fromEntries(Object.entries(obj||{}).filter(([k,v])=>pred(k,v)))},
  sharedPayload(){const d=Store.data;return {version:d.version,subjects:d.subjects,coreSubjects:d.coreSubjects,competencies:d.competencies,settings:d.settings,projectTemplates:d.projectTemplates,creativeRooms:d.creativeRooms,timetable:d.timetable,calendarEvents:(d.calendarEvents||[]).filter(e=>!e.grade||e.grade==='all'),metadata:d.metadata,activities:(d.activities||[]).filter(a=>a.type==='Kreativband')};},
  gradePayload(grade){
    const d=Store.data,pupils=(d.pupils||[]).filter(p=>this.gradeOf(p)===Number(grade)),ids=new Set(pupils.map(p=>p.id));
    const hasPupil=(k,v)=>ids.has(v?.pupilId)||ids.has(String(k).split('|').pop())||ids.has(String(k).split('|')[0]);
    return {grade:Number(grade),sprints:(d.sprints||[]).filter(s=>Number(s.year)===Number(grade)),pupils,activities:(d.activities||[]).filter(a=>a.type!=='Kreativband'&&Number(a.year)===Number(grade)),records:this.filterObject(d.records,(k)=>ids.has(String(k).split('|').pop())),lebDrafts:this.filterObject(d.lebDrafts,(k)=>ids.has(k)),activityRecords:this.filterObject(d.activityRecords,hasPupil),behaviour:this.filterObject(d.behaviour,(k)=>ids.has(k)),coaching:this.filterObject(d.coaching,(k,v)=>hasPupil(k,v)),workshopPaths:this.filterObject(d.workshopPaths,(k)=>ids.has(String(k).split('|')[0])),clubMemberships:this.filterObject(d.clubMemberships,hasPupil),assignments:(d.assignments||[]).filter(a=>Number(a.year)===Number(grade)),choiceImports:(d.choiceImports||[]).filter(a=>!a.year||Number(a.year)===Number(grade)),sprintHistory:this.filterObject(d.sprintHistory,(k)=>ids.has(k)),clubHistory:this.filterObject(d.clubHistory,(k)=>ids.has(k)),dailyCreativeVisits:this.filterObject(d.dailyCreativeVisits,hasPupil),calendarEvents:(d.calendarEvents||[]).filter(e=>Number(e.grade)===Number(grade)),teamConfig:(d.teamConfig||{})[grade]||{}};
  },
  mergeGrade(base,g){if(!g)return;base.sprints.push(...(g.sprints||[]));base.pupils.push(...(g.pupils||[]));base.activities.push(...(g.activities||[]));for(const key of ['records','lebDrafts','activityRecords','behaviour','coaching','workshopPaths','clubMemberships','sprintHistory','clubHistory','dailyCreativeVisits'])Object.assign(base[key],g[key]||{});base.assignments.push(...(g.assignments||[]));base.choiceImports.push(...(g.choiceImports||[]));base.calendarEvents.push(...(g.calendarEvents||[]));base.teamConfig=base.teamConfig||{};base.teamConfig[g.grade]=g.teamConfig||{};},
  blankFromShared(shared={}){const d=clone(Store.data);Object.assign(d,shared||{});d.sprints=[];d.pupils=[];d.activities=[...((shared||{}).activities||[])];d.records={};d.lebDrafts={};d.activityRecords={};d.behaviour={};d.coaching={};d.workshopPaths={};d.clubMemberships={};d.assignments=[];d.choiceImports=[];d.sprintHistory={};d.clubHistory={};d.dailyCreativeVisits={};d.calendarEvents=[...((shared||{}).calendarEvents||[])];d.auditLog=[];d.teamConfig={};return d;},
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
      if(hasCloud){const merged=this.blankFromShared(shared?.payload||{});for(const row of (grades||[]))this.mergeGrade(merged,row.payload||{});Store.data=merged;Store._rosterChanged=false;Store.migrate();if(Auth.isAdmin())await this.pullAudit();Store.saveLocalOnly();this.lastPull=new Date().toISOString();if(Auth.isAdmin()&&Store._rosterChanged){this.busy=false;await this.push(true);return;}}
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
    Store.log(data.repairedExisting?'Cloud-Benutzer repariert':'Cloud-Benutzer angelegt',{target:name,email,role,gradeAccess,coachTeams,coachingGroups});
    return data;
  },
  async saveCloudAccount({userId,name,role='teacher',active=false,gradeAccess={},coachTeams={},coachingGroups={}}){
    const data=await this.adminAccountAction({action:'saveAccount',userId,name,role,active,gradeAccess,coachTeams,coachingGroups});
    if(data?.verified!==true)throw new Error('Die Kontoänderungen wurden serverseitig nicht bestätigt.');
    Store.log('Cloud-Benutzer gespeichert',{target:userId,name,role,active,gradeAccess,coachTeams,coachingGroups});
    return data;
  },
  async deleteCloudAccount({userId}){
    const data=await this.adminAccountAction({action:'deleteAccount',userId});
    if(data?.verified!==true||data?.deleted!==true)throw new Error('Das Löschen wurde serverseitig nicht vollständig bestätigt.');
    Store.log('Cloud-Benutzer gelöscht',{target:userId});
    return data;
  }

};
