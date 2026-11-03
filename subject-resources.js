/* Gemeinsame Fachmaterialien, Linkliste und Unterrichtsplanung.
 * Supabase RLS: nur freigegebene Jahrgänge, Änderungen nur durch Erstellende.
 */
const SubjectResources={
 cache:{}, loading:{}, errors:{},
 key(kind){return [State.year,subjectHubSubject,kind].join('|');},
 async load(kind,force=false){
  const key=this.key(kind);if(this.loading[key]||(!force&&this.cache[key]))return;
  if(Auth.session?.mode!=='cloud'||!Auth.cloudClient){this.errors[key]='Cloud-Anmeldung erforderlich.';this.cache[key]=[];return;}
  this.loading[key]=true;this.errors[key]='';
  try{
   const {data,error}=await Auth.cloudClient.from('kompass_subject_resources')
     .select('id,grade,subject,kind,title,description,url,planned_for,done,created_by,created_at')
     .eq('grade',State.year).eq('subject',subjectHubSubject).eq('kind',kind)
     .order('created_at',{ascending:false}).limit(300);
   if(error)throw error;
   this.cache[key]=data||[];
  }catch(e){this.errors[key]=e?.message||String(e);this.cache[key]=[];}
  finally{this.loading[key]=false;if(State.view==='core'&&subjectHubTool===kind)render();}
 },
 async save(kind){
  const title=document.getElementById('sr_title')?.value.trim();
  const description=document.getElementById('sr_description')?.value.trim()||'';
  const rawUrl=document.getElementById('sr_url')?.value.trim()||'';
  const date=document.getElementById('sr_date')?.value||null;
  if(!title){toast('Bitte einen Titel eintragen.');return;}
  if(rawUrl&&!/^https?:\/\/\S+$/i.test(rawUrl)){toast('Bitte einen vollständigen https://-Link eintragen.');return;}
  const button=document.getElementById('sr_save');if(button)button.disabled=true;
  const record={grade:State.year,subject:subjectHubSubject,kind,title,description,
   url:rawUrl||null,planned_for:kind==='planung'?date:null,created_by:Auth.currentUser()?.id};
  try{
   const {error}=await Auth.cloudClient.from('kompass_subject_resources').insert(record);
   if(error)throw error;
   await this.load(kind,true);toast('Gespeichert');
  }catch(e){alert('Nicht gespeichert: '+(e?.message||String(e)));}
  finally{if(button)button.disabled=false;}
 },
 async toggle(kind,id,done){
  const {error}=await Auth.cloudClient.from('kompass_subject_resources').update({done:!done}).eq('id',id);
  if(error){alert('Änderung nicht gespeichert: '+error.message);return;}
  await this.load(kind,true);
 },
 async remove(kind,id){
  if(!confirm('Diesen Eintrag löschen?'))return;
  const {error}=await Auth.cloudClient.from('kompass_subject_resources').delete().eq('id',id);
  if(error){alert('Nicht gelöscht: '+error.message);return;}
  await this.load(kind,true);
 },
 render(kind){
  const key=this.key(kind);
  if(!this.cache[key]&&!this.loading[key]&&!this.errors[key])this.load(kind);
  const rows=this.cache[key]||[],user=Auth.currentUser()?.id;
  const labels={material:'Material',planung:'Planung',uebungen:'Übungen & Links'};
  let html='<section class="subjectResourcePanel"><div class="subjectResourceHeader"><h2>'+labels[kind]+'</h2><button class="chip" onclick="SubjectResources.load(\''+kind+'\',true)">↻</button></div>';
  if(this.loading[key]&&!this.cache[key])html+='<p class="mini">Einträge werden geladen …</p>';
  if(this.errors[key])html+='<p class="mini">'+esc(this.errors[key])+'</p>';
  html+='<details class="subjectResourceNew"><summary>+ Eintrag hinzufügen</summary><div class="subjectResourceForm"><div class="formgrid"><div><label>Titel</label><input id="sr_title" maxlength="180" placeholder="'+(kind==='planung'?'Unterrichtsvorhaben':kind==='material'?'Material oder Lernwegeliste':'Website oder Übung')+'"></div>'+(kind==='planung'?'<div><label>Datum</label><input id="sr_date" type="date"></div>':'<div><label>Link (optional)</label><input id="sr_url" inputmode="url" placeholder="https://…"></div>')+'</div><label>Notiz</label><textarea id="sr_description" rows="3" maxlength="2500"></textarea><button id="sr_save" class="chip dark" onclick="SubjectResources.save(\''+kind+'\')">Speichern</button></div></details>';
  html+='<div class="subjectResourcesList">'+rows.map(row=>{
   const owner=String(row.created_by)===String(user);
   const link=row.url&&/^https?:\/\//i.test(row.url)?'<a href="'+esc(row.url)+'" target="_blank" rel="noopener noreferrer">Öffnen ↗</a>':'';
   const controls=owner?(kind==='planung'?'<button class="chip" onclick="SubjectResources.toggle(\'planung\',\''+row.id+'\','+!!row.done+')">'+(row.done?'✓ Erledigt':'Als erledigt markieren')+'</button>':'')+'<button class="chip" onclick="SubjectResources.remove(\''+kind+'\',\''+row.id+'\')">Löschen</button>':'';
   return '<article class="subjectResourceItem"><div class="subjectResourceItemTop"><strong>'+esc(row.title)+'</strong><span class="mini">'+(row.planned_for?esc(row.planned_for.split('-').reverse().join('.'))+' · ':'')+new Date(row.created_at).toLocaleDateString('de-DE')+'</span></div>'+(row.description?'<p>'+esc(row.description)+'</p>':'')+'<div class="subjectResourceActions">'+link+controls+'</div></article>';
  }).join('')+(rows.length?'':'<div class="schoolEmpty">Noch keine Einträge vorhanden.</div>')+'</div></section>';
  return html;
 }
};