/* Read-only, shared competency matrix for core and workshop subjects. */
const CompetencyMatrix={
 mode:'class',category:'alle',unit:'alle',competencyYear:null,pupilId:null,practiceRows:[],practiceGrade:null,practiceLoading:false,practiceError:'',
 async loadPractice(force=false){
  if(subjectHubSubject!=='Englisch'||!Auth.cloudClient)return;
  const grade=Number(State.year);
  if(this.practiceLoading||(!force&&this.practiceGrade===grade))return;
  this.practiceLoading=true;this.practiceError='';
  try{
   const {data,error}=await Auth.cloudClient.from('kompass_english_results').select('id,pupil_id,competency_id,task_key,topic,points,max_points,submitted_at,assessment_level,assessment_detail').eq('grade',grade).order('submitted_at',{ascending:false}).limit(1000);
   if(error)throw error;
   this.practiceRows=data||[];this.practiceGrade=grade;
  }catch(e){this.practiceError='English-Practice-Ergebnisse konnten nicht geladen werden.';}
  finally{this.practiceLoading=false;if(subjectHubSubject==='Englisch')render();}
 },
 practiceFor(c,p){return this.practiceRows.filter(r=>r.pupil_id===p.id&&r.competency_id===c.id)},
 practiceEvidence(c,p){
  const rows=this.practiceFor(c,p);if(!rows.length)return '';
  return '<details class="mini"><summary>English Practice · '+rows.length+' Ergebnis(se)</summary>'+rows.map(r=>'<div style="margin:8px 0"><b>'+esc(r.topic)+'</b> · '+Number(r.points)+'/'+Number(r.max_points)+' Punkte · '+esc(r.assessment_level||r.assessment_detail?.outcome?.level||'ohne Niveau')+' · '+esc(new Date(r.submitted_at).toLocaleDateString('de-DE'))+(r.assessment_detail?.needs_review?' · Prüfung offen':'')+'</div>').join('')+'</details>';
 },
 group(c){const x=String(c.category||'').toLowerCase();if(/vokabel|wortschatz/.test(x))return 'Wortschatz / Vokabeln';if(/grammatik|grammar/.test(x))return 'Grammatik';if(/leseverstehen|reading/.test(x))return 'Leseverstehen';if(/hörverstehen|listening/.test(x))return 'Hörverstehen';if(/schreiben|writing/.test(x))return 'Schreiben';if(/sprechen|speaking/.test(x))return 'Sprechen';if(/sprachmittlung|mediation/.test(x))return 'Sprachmittlung';return c.category||'Weitere Kompetenzen'},
 short(c){const t=String(c.text||c.title||'').replace(/^\s*(U\s*\d+\s*[·:.–-]?\s*)?(Ich kann|I can)\s+/i,'').replace(/[.!]$/,'').trim();return t.length>58?t.slice(0,55).replace(/\s+\S*$/,'')+'…':t},
 open(){this.mode='class';this.category='alle';this.unit='alle';this.pupilId=null;this.competencyYear=State.year;subjectHubToolOpen('raster')},
 competencies(){
  const subject=subjectHubSubject,core=CORE_SUBJECTS.includes(subject);
  const all=Store.competencies.filter(c=>c.subject===subject&&(core?c.type==='core':c.type!=='core'));
  const years=[...new Set(all.map(c=>Number(c.year)))].sort((a,b)=>a-b);
  if(!years.includes(Number(this.competencyYear)))this.competencyYear=years.includes(State.year)?State.year:years[0];
  let list=all.filter(c=>Number(c.year)===Number(this.competencyYear));
  const cats=[...new Set(list.map(c=>this.group(c)))].sort((a,b)=>a.localeCompare(b,'de'));
  const units=[...new Set(list.map(c=>c.unit||(c.sprint?'Sprint '+c.sprint:'Allgemein')))].sort((a,b)=>a.localeCompare(b,'de',{numeric:true}));
  if(this.category!=='alle'&&!cats.includes(this.category))this.category='alle';
  if(this.unit!=='alle'&&!units.includes(this.unit))this.unit='alle';
  list=list.filter(c=>(this.category==='alle'||this.group(c)===this.category)&&(this.unit==='alle'||(c.unit||(c.sprint?'Sprint '+c.sprint:'Allgemein'))===this.unit));
  list.sort((a,b)=>String(a.unit||a.sprint||'').localeCompare(String(b.unit||b.sprint||''),'de',{numeric:true})||(a.order||0)-(b.order||0)||String(a.text).localeCompare(String(b.text),'de'));
  return {list,all,years,cats,units};
 },
 pupils(){
 const pupils=filteredPupils().slice().sort((a,b)=>String(a.last||a.short||'').localeCompare(String(b.last||b.short||''),'de')||String(a.first||'').localeCompare(String(b.first||''),'de'));
 if(this.mode==='pupil'&&subjectHubSubject==='Englisch'&&Number(State.year)===6){
  const id='ep_demo_juliane_2026';
  if(this.practiceRows.some(r=>r.pupil_id===id)||Object.keys(Store.records||{}).some(k=>k.endsWith('|'+id)))pupils.unshift({id,short:'Testkind · English Practice',team:'Testprofil',isDemo:true});
 }
 return pupils;
},
 status(c,p){const r=Store.records[recKey(c.id,p.id)]||{};if(['green','yellow','red'].includes(r.current))return r.current;const latest=[...(Array.isArray(r.history)?r.history:[]),...(Array.isArray(r.practiceResults)?r.practiceResults:[])].filter(h=>h&&!h.removed&&['green','yellow','red'].includes(h.value)).sort((a,b)=>String(b.at||b.date||'').localeCompare(String(a.at||a.date||'')))[0];const value=latest?.value||r.practiceLatest?.value;if(['green','yellow','red'].includes(value))return value;const evidence=this.practiceFor(c,p)[0];const outcome=evidence?.assessment_detail?.outcome?.status;return ['green','yellow','red'].includes(outcome)?outcome:'empty'},
 cell(c,p){const s=this.status(c,p),r=Store.records[recKey(c.id,p.id)]||{};const conflict=typeof sharedAssessmentState==='function'&&sharedAssessmentState(r).conflict&&!sharedAssessmentAgreementValid(r);const provisional=!r.current&&s!=='empty';
  return '<button class="matrixCell matrix-'+s+'" title="'+esc(p.short+' · '+c.text+' · '+statusPlain(s)+(conflict?' · Abstimmung offen':'')+(provisional?' · aus Bewertungsverlauf (noch nicht abschließend übernommen)':''))+'" onclick="CompetencyMatrix.edit('+JSON.stringify(c.id).replace(/"/g,'&quot;')+','+JSON.stringify(p.id).replace(/"/g,'&quot;')+')">'+(conflict?'!':s==='green'?'✓':s==='yellow'?'–':s==='red'?'×':'·')+(provisional?'*':'')+'</button>';
 },
 edit(cid,pid){State.competency=cid;openAssessment(cid,pid)},
 render(){
  if(subjectHubSubject==='Englisch'&&this.practiceGrade!==Number(State.year)&&!this.practiceLoading)void this.loadPractice();
  const data=this.competencies(),pupils=this.pupils(),list=data.list;
  const options=(arr,current)=>arr.map(v=>'<option value="'+esc(v)+'" '+(String(current)===String(v)?'selected':'')+'>'+esc(v==='alle'?'Alle':v)+'</option>').join('');
  const header='<div class="schoolPageHead"><div><button class="schoolBack" onclick="subjectHubBack()">← '+esc(subjectHubSubject)+'</button><h1>'+esc(subjectHubSubject)+' · Kompetenzraster</h1><p class="mini">Alle Bewertungen auf einen Blick · bestehende KOMPASS-Daten</p></div><button class="chip" onclick="window.print()">Drucken</button></div>';
  const filters='<div class="matrixFilters"><label>Stufe der Schüler*innen<select onchange="State.year=Number(this.value);State.team=\'alle\';CompetencyMatrix.pupilId=null;render()">'+options(visibleYears(),State.year)+'</select></label><label>Kompetenzen aus Stufe<select onchange="CompetencyMatrix.competencyYear=Number(this.value);CompetencyMatrix.category=\'alle\';CompetencyMatrix.unit=\'alle\';render()">'+options(data.years,this.competencyYear)+'</select></label><label>Team<select onchange="State.team=this.value;CompetencyMatrix.pupilId=null;render()">'+options(['alle',...TEAMS],State.team)+'</select></label><label>Bereich<select onchange="CompetencyMatrix.category=this.value;render()">'+options(['alle',...data.cats],this.category)+'</select></label><label>Unit / Sprint<select onchange="CompetencyMatrix.unit=this.value;render()">'+options(['alle',...data.units],this.unit)+'</select></label></div>';
  const mode='<div class="matrixModes"><button class="chip '+(this.mode==='class'?'dark':'')+'" onclick="CompetencyMatrix.mode=\'class\';render()">Klassenraster</button><button class="chip '+(this.mode==='pupil'?'dark':'')+'" onclick="CompetencyMatrix.mode=\'pupil\';render()">Schülerraster</button></div>';
  const legend='<div class="matrixLegend"><span>🟢 Erreicht</span><span>🟡 Teilweise erreicht</span><span>🔴 Noch nicht erreicht</span><span>⚪ Ohne Eintrag</span><span>! Abstimmung offen</span><span>* Bewertung im Verlauf, noch nicht abschließend übernommen</span></div>';
  if(!list.length)return header+filters+mode+'<div class="card empty">Für diese Auswahl sind keine Kompetenzen hinterlegt.</div>';
  let body='';
  if(this.mode==='pupil'){
   if(!pupils.some(p=>p.id===this.pupilId))this.pupilId=pupils[0]?.id||null;
   const pupil=pupils.find(p=>p.id===this.pupilId);
   body='<div class="matrixPupilSelect"><label>Schüler*in<select onchange="CompetencyMatrix.pupilId=this.value;render()">'+pupils.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===this.pupilId?'selected':'')+'>'+esc(p.short)+' · '+esc(p.team)+'</option>').join('')+'</select></label></div>';
   if(pupil&&pupil.isDemo)body+='<p class="mini">Testprofil: Ergebnisse aus English Practice. Keine abschließenden Lehrkraftbewertungen; nicht in der Klassenstatistik enthalten.</p>';
   if(pupil)body+='<div class="matrixPupilList">'+list.map(c=>'<div class="matrixPupilRow"><div><small>'+esc(c.category||'')+' · '+esc(c.unit||(c.sprint?'Sprint '+c.sprint:''))+'</small><div>'+esc(c.text)+'</div></div>'+this.cell(c,pupil)+this.practiceEvidence(c,pupil)+'</div>').join('')+'</div>';
  }else{
   body='<div class="matrixScroll"><table class="matrixTable"><thead><tr><th>Schüler*in</th>'+list.map((c,i)=>'<th class="matrixCompetencyHeader" title="'+esc(this.group(c)+' · '+c.text)+'"><span>'+esc(this.short(c))+'</span><small>'+esc(c.unit||(c.sprint?'Sprint '+c.sprint:''))+'</small></th>').join('')+'<th>Bewertet</th></tr></thead><tbody>'+pupils.map(p=>{const done=list.filter(c=>this.status(c,p)!=='empty').length;return '<tr><th>'+esc(p.short)+'<small>'+esc(p.team)+'</small></th>'+list.map(c=>'<td>'+this.cell(c,p)+'</td>').join('')+'<td>'+done+'/'+list.length+'</td></tr>'}).join('')+'</tbody></table></div>';
  }
  const realPupils=pupils.filter(p=>!p.isDemo);const done=realPupils.reduce((n,p)=>n+list.filter(c=>this.status(c,p)!=='empty').length,0);
  return header+filters+mode+(subjectHubSubject==='Englisch'?'<p class="mini">English Practice: '+(this.practiceLoading?'Ergebnisse werden geladen …':this.practiceError||this.practiceRows.length+' gespeicherte Ergebnisse geladen')+' <button class="chip" onclick="CompetencyMatrix.loadPractice(true)">↻ Aktualisieren</button></p>':'')+'<p class="mini">'+realPupils.length+' Schüler*innen · '+list.length+' Kompetenzen · '+done+' von '+(realPupils.length*list.length)+' Bewertungen eingetragen</p>'+legend+body;
 }
};
