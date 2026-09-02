const Sync={
  timer:null,busy:false,lastPull:null,
  enabled(){return Auth.session?.mode==='cloud'&&!!Auth.cloudClient},
  schedule(){if(!this.enabled()||this.busy)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.push(),700)},
  async pull(){if(!this.enabled())return;this.busy=true;try{const {data,error}=await Auth.cloudClient.from('kompass_state').select('payload,updated_at').eq('id','school').maybeSingle();if(error)throw error;if(data?.payload){Store.data=data.payload;Store.migrate();Store.saveLocalOnly();this.lastPull=data.updated_at||new Date().toISOString()}}catch(e){console.error('Cloud pull',e)}finally{this.busy=false}},
  async push(){if(!this.enabled())return;this.busy=true;try{const payload=Store.exportData();delete payload.exportedAt;const {error}=await Auth.cloudClient.from('kompass_state').upsert({id:'school',payload,updated_at:new Date().toISOString()});if(error)throw error;this.lastPull=new Date().toISOString()}catch(e){console.error('Cloud push',e);toast('Cloud-Speicherung fehlgeschlagen')}finally{this.busy=false}},
  async cloudProfiles(){if(!this.enabled())return[];const {data,error}=await Auth.cloudClient.from('kompass_profiles').select('id,display_name,role,active,created_at').order('display_name');if(error)throw error;return data||[]},
  async updateCloudProfile(id,patch){if(!this.enabled())return;const {error}=await Auth.cloudClient.from('kompass_profiles').update(patch).eq('id',id);if(error)throw error;Store.log('Cloud-Benutzer geändert',{target:id,...patch})}
};
