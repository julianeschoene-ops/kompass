const AUTH_KEY='kompass81_auth';
const SESSION_KEY='kompass81_session';
const CLOUD_KEY='kompass81_cloud_config';
const Auth={
  session:null,cloud:null,cloudClient:null,
  load(){
    // KOMPASS ist fest mit der gemeinsamen Schul-Cloud verbunden.
    // Dadurch landen neue Geräte/Browser direkt beim Login statt bei "Ersten Admin anlegen".
    this.cloud={
      url:'https://gexhcpyzwzybrpuygqmf.supabase.co',
      anonKey:'sb_publishable_U7Dp3SXHADswPjg4Vj7mzw_kG27owvK'
    };
    try{this.session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(e){this.session=null}
  },
  cloudConfigured(){return !!(this.cloud?.url&&this.cloud?.anonKey&&window.supabase)},
  ensureLocalBootstrap(){let db;try{db=JSON.parse(localStorage.getItem(AUTH_KEY)||'null')}catch(e){db=null}if(!db||!Array.isArray(db.users)){db={users:[],createdAt:new Date().toISOString()};localStorage.setItem(AUTH_KEY,JSON.stringify(db));}},
  localDb(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'{"users":[]}')}catch(e){return {users:[]}}},
  saveLocalDb(db){localStorage.setItem(AUTH_KEY,JSON.stringify(db))},
  currentUser(){return this.session?.user||null},isLoggedIn(){return !!this.currentUser()},isAdmin(){return this.currentUser()?.role==='admin'},
  allowedGrades(){if(this.isAdmin())return [5,6,7];if(this.session?.mode==='cloud')return Object.keys(this.currentUser()?.gradeAccess||{}).map(Number).filter(x=>[5,6,7].includes(x)).sort();return [5,6,7]},
  canAccessGrade(grade){return this.isAdmin()||this.session?.mode!=='cloud'||!!this.currentUser()?.gradeAccess?.[grade]},
  canLead(grade=State?.year){if(this.isAdmin())return true;if(this.session?.mode==='cloud')return this.currentUser()?.gradeAccess?.[grade]==='leitung';return this.currentUser()?.role==='leitung'},
  async hash(v){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v)));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')},
  async createFirstAdmin(name,username,password){const db=this.localDb();if(db.users.length)throw new Error('Es existiert bereits ein Konto.');const u={id:uid('user'),name:name.trim(),username:username.trim().toLowerCase(),passwordHash:await this.hash(password),role:'admin',active:true,createdAt:new Date().toISOString()};db.users.push(u);this.saveLocalDb(db);await this.localLogin(username,password);return u;},
  async createLocalUser({name,username,password,role}){const db=this.localDb();username=username.trim().toLowerCase();if(db.users.some(u=>u.username===username))throw new Error('Benutzername existiert bereits.');const u={id:uid('user'),name:name.trim(),username,passwordHash:await this.hash(password),role:role||'teacher',active:true,createdAt:new Date().toISOString()};db.users.push(u);this.saveLocalDb(db);Store.log('Benutzerkonto angelegt',{target:u.name,role:u.role});return u;},
  async localLogin(username,password){const db=this.localDb(),hash=await this.hash(password);const u=db.users.find(x=>x.active!==false&&x.username===username.trim().toLowerCase()&&x.passwordHash===hash);if(!u)throw new Error('Benutzername oder Passwort ist nicht korrekt.');this.session={mode:'local',user:{id:u.id,name:u.name,username:u.username,role:u.role,gradeAccess:{5:u.role==='leitung'?'leitung':'teacher',6:u.role==='leitung'?'leitung':'teacher',7:u.role==='leitung'?'leitung':'teacher'},coachTeams:u.coachTeams||{}}};sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.session));return this.session.user;},
  async logout(){const client=this.cloudClient;this.session=null;sessionStorage.removeItem(SESSION_KEY);render();if(client){try{await client.auth.signOut({scope:'local'})}catch(e){console.warn('Lokale Abmeldung',e)}}},
  async handleCloudAuthChange(s){
    if(s?.user?.id){
      // signInWithPassword applies the profile itself. The auth event must not
      // start a second simultaneous pull for the same account.
      if(this.session?.mode==='cloud'&&this.currentUser()?.id===s.user.id)return;
      await this.applyCloudSession(s);return;
    }
    this.session=null;sessionStorage.removeItem(SESSION_KEY);render();
  },
  async initCloud(){
    if(!this.cloudConfigured())return false;
    // Older releases stored the Supabase refresh token browser-wide. That made
    // a shared iPad reopen the account of the person who used it before.
    localStorage.removeItem('sb-gexhcpyzwzybrpuygqmf-auth-token');
    this.cloudClient=window.supabase.createClient(this.cloud.url,this.cloud.anonKey,{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await this.cloudClient.auth.getSession();if(error)throw error;
    if(data?.session)await this.applyCloudSession(data.session);else if(this.session?.mode==='cloud'){this.session=null;sessionStorage.removeItem(SESSION_KEY);}
    this.cloudClient.auth.onAuthStateChange((_e,s)=>setTimeout(()=>this.handleCloudAuthChange(s).catch(e=>{console.error('Cloud-Authentifizierung',e);loginErr?.(e)}),0));
    return true;
  },
  async applyCloudSession(s){
    const {data,error}=await this.cloudClient.from('kompass_profiles').select('id,display_name,role,active,coach_teams,coaching_groups').eq('id',s.user.id).single();
    if(error){await this.cloudClient.auth.signOut();throw new Error('KOMPASS-Profil konnte nicht geladen werden: '+(error.message||String(error)));}if(!data){await this.cloudClient.auth.signOut();throw new Error('Für dieses Konto wurde kein KOMPASS-Profil gefunden.');}if(data.active===false){await this.cloudClient.auth.signOut();throw new Error('Dieses KOMPASS-Konto ist noch nicht freigeschaltet.');}
    let gradeAccess={};
    if(data.role!=='admin'){
      const {data:ga,error:gaErr}=await this.cloudClient.from('kompass_grade_access').select('grade,access_level').eq('user_id',s.user.id);
      if(gaErr)throw gaErr;(ga||[]).forEach(x=>gradeAccess[x.grade]=x.access_level);
    }else{gradeAccess={5:'leitung',6:'leitung',7:'leitung'};}
    this.session={mode:'cloud',user:{id:data.id,name:data.display_name||s.user.email,username:s.user.email,role:data.role||'teacher',gradeAccess,coachTeams:data.coach_teams||{},coachingGroups:data.coaching_groups||{}}};
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.session));State.teacher=this.session.user.name;State.role=this.session.user.role;
    const years=this.allowedGrades();if(years.length&&!years.includes(State.year))State.year=years[0];
    State.cloudLoadError=null;
    if(window.Sync){try{await Sync.pull()}catch(e){State.cloudLoadError=e?.message||String(e);render();return;}}render();
  },
  async cloudLogin(email,password){const {data,error}=await this.cloudClient.auth.signInWithPassword({email:String(email||'').trim().toLowerCase(),password});if(error){if(String(error.message||'').toLowerCase().includes('invalid login credentials'))throw new Error('E-Mail oder Passwort ist nicht korrekt.');throw error;}await this.applyCloudSession(data.session)},
  async cloudSignup(name,email,password){const {data,error}=await this.cloudClient.auth.signUp({email,password,options:{data:{display_name:name}}});if(error)throw error;return data},
  async saveCloudConfig(url,anonKey){this.cloud={url:url.trim().replace(/\/$/,''),anonKey:anonKey.trim()};localStorage.setItem(CLOUD_KEY,JSON.stringify(this.cloud));location.reload()},
  localUsers(){return this.localDb().users.map(({passwordHash,...u})=>u)},
  updateLocalUser(id,patch){const db=this.localDb(),u=db.users.find(x=>x.id===id);if(!u)return;Object.assign(u,patch);this.saveLocalDb(db);Store.log('Benutzerkonto geändert',{target:u.name,role:u.role,active:u.active});render()},
  async resetLocalPassword(id,password){const db=this.localDb(),u=db.users.find(x=>x.id===id);if(!u)return;u.passwordHash=await this.hash(password);this.saveLocalDb(db);Store.log('Passwort zurückgesetzt',{target:u.name});toast('Passwort gesetzt')}
};
Auth.load();
