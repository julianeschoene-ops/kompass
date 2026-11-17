/* Read-only, shared competency matrix for core and workshop subjects. */
const CompetencyMatrix={
 mode:'class',category:'alle',unit:'alle',competencyYear:null,pupilId:null,
 open(){this.mode='class';this.category='alle';this.unit='alle';this.pupilId=null;this.competencyYear=State.year;subjectHubToolOpen('raster')},
 competencies(){
  const subject=subjectHubSubject,core=CORE_SUBJECTS.includes(subject);
  const all=Store.competencies.filter(c=>c.subject===subject&&c.type===(core?'core':'workshop'));
  const years=[...new Set(all.map(c=>Number(c.year)))].sort((a,b)=>a-b);
  if(!years.includes(Number(this.competencyYear)))this.competencyYear=years.includes(State.year)?State.year:years[0];
  let list=all.filter(c=>Number(c.year)===Number(this.competencyYear));
  const cats=[...new Set(list.map(c=>c.category||'Ohne Bereich'))].sort((a,b)=>a.localeCompare(b,'de'));
  const units=[...new Set(list.map(c=>c.unit||(c.sprint?'Sprint '+c.sprint:'Allgemein')))].sort((a,b)=>a.localeCompare(b,'de',{numeric:true}));
  if(this.category!=='alle'&&!cats.includes(this.category))this.category='alle';
  if(this.unit!=='alle'&&!units.includes(this.unit))this.unit='alle';
  list=list.filter(c=>(this.category==='alle'||(c.category||'Ohne Bereich')===this.category)&&(this.unit==='alle'||(c.unit||(c.sprint?'Sprint '+c.sprint:'Allgemein'))===this.unit));
  list.sort((a,b)=>String(a.unit||a.sprint||'').localeCompare(String(b.unit||b.sprint||''),'de',{numeric:true})||(a.order||0)-(b.order||0)||String(a.text).localeCompare(String(b.text),'de'));
  return {list,all,years,cats,units};
 },
 pupils(){return filteredPupils()},
 status(c,p){const r=Store.records[recKey(c.id,p.id)]||{};return ['green','yellow','red'].includes(r.current)?r.current:'empty'},
 cell(c,p){const s=this.status(c,p),r=Store.records[recKey(c.id,p.id)]||{};const conflict=typeof sharedAssessmentState==='function'&&sharedAssessmentState(r).conflict&&!sharedAssessmentAgreementValid(r);
  return '<button class="matrixCell matrix-'+s+'" title="'+esc(p.short+' · '+c.text+' · '+statusPlain(s)+(conflict?' · Abstimmung offen':''))+'" onclick="CompetencyMatrix.edit('+JSON.stringify(c.id).replace(/"/g,'&quot;')+','+JSON.stringify(p.id).replace(/"/g,'&quot;')+')">'+(conflict?'!':s==='green'?'✓':s==='yellow'?'–':s==='red'?'×':'·')+'</button>';
 },
 edit(cid,pid){State.competency=cid;openAssessment(cid,pid)},
 render(){
  const data=this.competencies(),pupils=this.pupils(),list=data.list;
  const options=(arr,current)=>arr.map(v=>'<option value="'+esc(v)+'" '+(String(current)===String(v)?'selected':'')+'>'+esc(v)+'</option>').join('');
  const header='<div class="schoolPageHead"><div><button class="schoolBack" onclick="subjectHubBack()">← '+esc(subjectHubSubject)+'</button><h1>'+esc(subjectHubSubject)+' · Kompetenzraster</h1><p class="mini">Alle Bewertungen auf einen Blick · bestehende KOMPASS-Daten</p></div><button class="chip" onclick="window.print()">Drucken</button></div>';
  const filters='<div class="matrixFilters"><label>Stufe der Schüler*innen<select onchange="State.year=Number(this.value);State.team=\'alle\';CompetencyMatrix.pupilId=null;render()">'+options(visibleYears(),State.year)+'</select></label><label>Kompetenzen aus Stufe<select onchange="CompetencyMatrix.competencyYear=Number(this.value);CompetencyMatrix.category=\'alle\';CompetencyMatrix.unit=\'alle\';render()">'+options(data.years,this.competencyYear)+'</select></label><label>Team<select onchange="State.team=this.value;CompetencyMatrix.pupilId=null;render()">'+options(['alle',...TEAMS],State.team)+'</select></label><label>Bereich<select onchange="CompetencyMatrix.category=this.value;render()">'+options(['alle',...data.cats],this.category)+'</select></label><label>Unit / Sprint<select onchange="CompetencyMatrix.unit=this.value;render()">'+options(['alle',...data.units],this.unit)+'</select></label></div>';
  const mode='<div class="matrixModes"><button class="chip '+(this.mode==='class'?'dark':'')+'" onclick="CompetencyMatrix.mode=\'class\';render()">Klassenraster</button><button class="chip '+(this.mode==='pupil'?'dark':'')+'" onclick="CompetencyMatrix.mode=\'pupil\';render()">Schülerraster</button></div>';
  const legend='<div class="matrixLegend"><span>🟢 Erreicht</span><span>🟡 Teilweise erreicht</span><span>🔴 Noch nicht erreicht</span><span>⚪ Ohne Eintrag</span><span>! Abstimmung offen</span></div>';
  if(!list.length)return header+filters+mode+'<div class="card empty">Für diese Auswahl sind keine Kompetenzen hinterlegt.</div>';
  let body='';
  if(this.mode==='pupil'){
   if(!pupils.some(p=>p.id===this.pupilId))this.pupilId=pupils[0]?.id||null;
   const pupil=pupils.find(p=>p.id===this.pupilId);
   body='<div class="matrixPupilSelect"><label>Schüler*in<select onchange="CompetencyMatrix.pupilId=this.value;render()">'+pupils.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===this.pupilId?'selected':'')+'>'+esc(p.short)+' · '+esc(p.team)+'</option>').join('')+'</select></label></div>';
   if(pupil)body+='<div class="matrixPupilList">'+list.map(c=>'<div class="matrixPupilRow"><div><small>'+esc(c.category||'')+' · '+esc(c.unit||(c.sprint?'Sprint '+c.sprint:''))+'</small><div>'+esc(c.text)+'</div></div>'+this.cell(c,pupil)+'</div>').join('')+'</div>';
  }else{
   body='<div class="matrixScroll"><table class="matrixTable"><thead><tr><th>Schüler*in</th>'+list.map((c,i)=>'<th title="'+esc(c.text)+'"><span>'+esc(c.unit||(c.sprint?'S'+c.sprint:''))+'</span><small>'+String(i+1)+'</small></th>').join('')+'<th>Bewertet</th></tr></thead><tbody>'+pupils.map(p=>{const done=list.filter(c=>this.status(c,p)!=='empty').length;return '<tr><th>'+esc(p.short)+'<small>'+esc(p.team)+'</small></th>'+list.map(c=>'<td>'+this.cell(c,p)+'</td>').join('')+'<td>'+done+'/'+list.length+'</td></tr>'}).join('')+'</tbody></table></div><div class="matrixCompetencyKey"><h3>Kompetenzen</h3>'+list.map((c,i)=>'<div><b>'+(i+1)+'. '+esc(c.unit||(c.sprint?'Sprint '+c.sprint:''))+'</b> '+esc(c.text)+'</div>').join('')+'</div>';
  }
  const done=pupils.reduce((n,p)=>n+list.filter(c=>this.status(c,p)!=='empty').length,0);
  return header+filters+mode+'<p class="mini">'+pupils.length+' Schüler*innen · '+list.length+' Kompetenzen · '+done+' von '+(pupils.length*list.length)+' Bewertungen eingetragen</p>'+legend+body;
 }
};
