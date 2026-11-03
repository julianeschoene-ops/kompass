/* Browser navigation for the KOMPASS single-page app.
   Only page/section changes create history entries; filters and scores do not. */
const KompassNav={
  index:0, initialized:false, restoring:false, lastKey:'',
  route(){
    return {
      view:State.view,year:State.year,pupil:State.pupil||null,
      hubMode:typeof subjectHubMode==='string'?subjectHubMode:'home',
      hubSubject:typeof subjectHubSubject==='string'?subjectHubSubject:'',
      hubTool:typeof subjectHubTool==='string'?subjectHubTool:'',
      classSection:typeof Coaching!=='undefined'?Coaching.section||'home':'home',
      classGroup:typeof Coaching!=='undefined'?Coaching.group||'':'',
      profileSection:typeof profileSection==='string'?profileSection:'overview'
    };
  },
  key(r){
    return JSON.stringify([r.view,r.year,r.pupil,r.view==='core'?r.hubMode:null,r.view==='core'?r.hubSubject:null,r.view==='core'?r.hubTool:null,r.view==='coaching'?r.classSection:null,r.view==='coaching'?r.classGroup:null,r.view==='students'&&r.pupil?r.profileSection:null]);
  },
  record(){
    if(this.restoring||!Auth.isLoggedIn()||Auth.isLernatelier())return;
    const route=this.route(),key=this.key(route);
    if(!this.initialized){
      this.initialized=true;this.index=Number(history.state?.kompassIndex)||0;
      history.replaceState({kompassRoute:route,kompassIndex:this.index},'',location.href);
      this.lastKey=key;return;
    }
    if(key===this.lastKey)return;
    this.index+=1;
    history.pushState({kompassRoute:route,kompassIndex:this.index},'',location.href);
    this.lastKey=key;
  },
  go(view){
    const allowed=['dashboard','core','students','coaching','learningAtelier','activities','leb','organization','calendar','roomOccupancy','timetable','planner','teams','admin','logs','backup'];
    if(!allowed.includes(view))return;
    State.view=view;State.pupil=null;
    if(view==='core'&&typeof subjectHubMode!=='undefined')subjectHubMode='home';
    if(view==='coaching'&&typeof Coaching!=='undefined')Coaching.section='home';
    if(view==='activities'&&typeof creativeAutoRefresh==='function')creativeAutoRefresh(true);
    render();
    window.scrollTo({top:0,behavior:'instant'});
  },
  back(){
    if(this.initialized&&this.index>0&&history.state?.kompassRoute){history.back();return;}
    this.go('dashboard');
  },
  restore(route,index){
    if(!route||!Auth.isLoggedIn())return;
    this.restoring=true;
    State.view=route.view||'dashboard';State.year=Number(route.year)||State.year;State.pupil=route.pupil||null;
    if(typeof subjectHubMode!=='undefined'){subjectHubMode=route.hubMode||'home';subjectHubSubject=route.hubSubject||'';subjectHubTool=route.hubTool||'bewertungen';}
    if(typeof Coaching!=='undefined'){Coaching.section=route.classSection||'home';Coaching.group=route.classGroup||'';}
    if(typeof profileSection!=='undefined'){profileSection=route.profileSection||'overview';profileSectionPupil=route.pupil||null;}
    this.index=Number(index)||0;
    this.lastKey=this.key(route);
    try{render();}finally{this.restoring=false;}
    window.scrollTo({top:0,behavior:'instant'});
  }
};
(function(){
 const originalRender=render;
 render=function(){const result=originalRender.apply(this,arguments);KompassNav.record();return result;};
 window.addEventListener('popstate',event=>{
   if(event.state?.kompassRoute)KompassNav.restore(event.state.kompassRoute,event.state.kompassIndex);
 });
})();
