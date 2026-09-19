const Sync={
  timer:null,busy:false,dirty:false,lastPull:null,baseGrades:{},
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
  schedule(delay=0){if(!this.enabled())return;this.dirty=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),delay)},
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
      if(!hasCloud&&Auth.isAdmin()){
        if(!(Store.data.pupils||[]).length)throw new Error('In der Cloud wurde kein KOMPASS-Datenbestand gefunden. Zum Schutz wird kein leerer Stand hochgeladen.');
        this.busy=false;await this.push(true);return;
      }
      if(hasCloud){
        const emptyGrades=years.filter(grade=>{const row=(grades||[]).find(x=>Number(x.grade)===Number(grade));return !row||!Array.isArray(row?.payload?.pupils)||row.payload.pupils.length===0;});
        if(emptyGrades.length)throw new Error('Der Cloudbestand für Jahrgang '+emptyGrades.join(', ')+' enthält 0 Schüler*innen. Ein möglicherweise vorhandener lokaler Stand bleibt geschützt und wird nicht überschrieben.');
        const merged=this.blankFromShared(shared?.payload||{});this.baseGrades={};for(const row of (grades||[])){this.baseGrades[row.grade]=clone(row.payload||{});this.mergeGrade(merged,row.payload||{});}Store.data=merged;Store._rosterChanged=false;Store.migrate();if(Auth.isAdmin())await this.pullAudit();Store.saveLocalOnly();this.lastPull=new Date().toISOString();if(Auth.isAdmin()&&Store._rosterChanged){this.busy=false;await this.push(true);return;}
      }
    }catch(e){console.error('Cloud pull',e);throw e}finally{this.busy=false}
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
        const localPayload=this.gradePayload(grade),base=clone(this.baseGrades[grade]||localPayload);let done=false,error=null;
        for(let attempt=0;attempt<3&&!done;attempt++){
          const current=await Auth.cloudClient.from('kompass_grade_state').select('payload,updated_at').eq('grade',grade).maybeSingle();
          if(current.error){error=current.error;break;}
          if(!current.data){const inserted=await Auth.cloudClient.from('kompass_grade_state').insert({grade,payload:localPayload,updated_at:new Date().toISOString()}).select('grade');error=inserted.error;done=!error;break;}
          const merged=this.mergeConcurrent(base,localPayload,current.data.payload||{}),stamp=new Date().toISOString();
          const updated=await Auth.cloudClient.from('kompass_grade_state').update({payload:merged,updated_at:stamp}).eq('grade',grade).eq('updated_at',current.data.updated_at).select('grade');
          error=updated.error;if(!error&&updated.data?.length)done=true;
        }
        if(!done){error=error||new Error('Gleichzeitige Änderung konnte nach drei Versuchen nicht zusammengeführt werden.');failures.push({part:'grade',grade,error});console.warn('Cloud grade sync',grade,error);}else{this.baseGrades[grade]=clone(localPayload);saved++;}
      }
      if(Auth.isAdmin()){const {error}=await Auth.cloudClient.from('kompass_shared_state').upsert({id:'school',payload:this.sharedPayload(),updated_at:now});if(error){failures.push({part:'shared',error});console.warn('Cloud shared sync',error);}else saved++;}
      await this.pushAudit();
      if(failures.length){
        console.warn('Cloud partially synced; successful writes retained',failures);
        const f=failures[0], raw=f?.error?.message||f?.error?.details||f?.error?.hint||String(f?.error||'Unbekannter Fehler');
        const where=f.part==='grade'?'Jahrgang '+f.grade:(f.part==='shared'?'Schuldaten':'Cloud');
        toast('Cloud-Fehler ('+where+'): '+raw,7000);
        return;
      }
      this.lastPull=now;toast('In der Cloud gespeichert',1800);
    }catch(e){console.error('Cloud push',e);toast('Cloud-Fehler: '+(e?.message||String(e)),7000)}finally{this.busy=false;if(this.dirty)this.schedule(0)}
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
