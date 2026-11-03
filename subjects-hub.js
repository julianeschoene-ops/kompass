/* Unified subject entry: keeps existing competency and assessment data paths intact. */
let subjectHubMode='home',subjectHubSubject='',subjectHubType='core',subjectHubTool='bewertungen';
function subjectNames(){const core=typeof CORE_SUBJECTS!=='undefined'?CORE_SUBJECTS:[];const work=typeof WORKSHOP_SUBJECTS!=='undefined'?WORKSHOP_SUBJECTS:[];return [...new Set([...core,...work])].sort((a,b)=>a.localeCompare(b,'de'));}
function subjectHubOpen(subject){subjectHubSubject=subject;subjectHubMode='subject';subjectHubTool='bewertungen';State.subject=subject;State.competency=null;State.team='alle';render();}
function subjectHubToolOpen(tool){subjectHubTool=tool;subjectHubMode='tool';render();}
function subjectHubBack(){subjectHubMode=subjectHubMode==='tool'?'subject':'home';render();}
function subjectHub(){if(subjectHubMode==='home'||!subjectHubSubject)return subjectHubHome();if(subjectHubMode==='subject')return subjectHubSubjectPage();return subjectHubToolPage();}
/* Fachgliederung nach der Kontingentstundentafel GMS BW (Pflicht-/Wahlpflichtbereich).
   Nur Fächer anzeigen, die KOMPASS tatsächlich angelegt hat. */
const SUBJECT_FIELDS=[
 ['Sprachen',['Deutsch','Englisch'],'language'],
 ['Mathematik',['Mathematik'],'math'],
 ['Gesellschaftswissenschaften',['Geschichte','Geographie','Gemeinschaftskunde','WBS'],'society'],
 ['Naturwissenschaften',['Biologie','Chemie','Physik','Biologie, Naturphänomene und Technik (BNT)','BNT'],'science'],
 ['Informatik & Medienbildung',['Informatik & Medienbildung'],'informatics'],
 ['Kunst & Musik',['Bildende Kunst','Musik'],'creative'],
 ['Sport',['Sport'],'sport'],
 ['Religion & Ethik',['Religion','Ethik'],'values'],
 ['Wahlpflichtfächer',['Französisch','AES','Technik'],'elective']
];
function subjectTone(subject){
 const field=SUBJECT_FIELDS.find(([,names])=>names.includes(subject));
 return field?field[2]:'neutral';
}
function subjectHubHome(){
 const names=subjectNames(),shown=new Set();
 const sections=SUBJECT_FIELDS.map(([heading,members,tone])=>{
  const entries=members.filter(n=>names.includes(n));
  entries.forEach(n=>shown.add(n));
  if(!entries.length)return '';
  return '<section class="subjectField"><h2 class="subjectFieldHeading">'+esc(heading)+'</h2><div class="subjectGrid">'+entries.map(n=>'<button class="subjectTile subjectTone-'+tone+'" onclick="subjectHubOpen('+JSON.stringify(n).replace(/"/g,'&quot;')+')"><strong>'+esc(n)+'</strong></button>').join('')+'</div></section>';
 }).join('');
 const remaining=names.filter(n=>!shown.has(n));
 const other=remaining.length?'<section class="subjectField"><h2 class="subjectFieldHeading">Weitere Fächer</h2><div class="subjectGrid">'+remaining.map(n=>'<button class="subjectTile subjectTone-neutral" onclick="subjectHubOpen('+JSON.stringify(n).replace(/"/g,'&quot;')+')"><strong>'+esc(n)+'</strong></button>').join('')+'</div></section>':'';
 shell('<div class="schoolPageHead"><h1>Fächer</h1><span class="mini">Jahrgang '+State.year+'</span></div><div class="subjectFields">'+sections+other+'</div>');
}
function subjectHubSubjectPage(){const s=subjectHubSubject;const work=WORKSHOP_SUBJECTS.includes(s);const items=[['bewertungen','Bewertungen','▤'],['material','Material','▣'],['uebungen','Übungen & Links','↗'],['planung','Planung','▦']];if(['Deutsch','Mathematik','Englisch'].includes(s))items.push(['teamstars','TeamStars','☆']);shell('<div class="schoolPageHead subjectPageTitle subjectTone-'+subjectTone(s)+'"><div><button class="schoolBack" onclick="subjectHubBack()">← Fächer</button><h1>'+esc(s)+'</h1></div><span class="mini">Jahrgang '+State.year+(work?' · Werkstatt / Themenfeldunterricht':'')+'</span></div><div class="subjectTools">'+items.map(([id,label,icon])=>'<button class="subjectToolTile subjectTone-'+subjectTone(s)+'" onclick="subjectHubToolOpen(\''+id+'\')"><span>'+icon+'</span><strong>'+label+'</strong></button>').join('')+'</div>');}
function subjectHubToolPage(){const s=subjectHubSubject,tool=subjectHubTool,core=CORE_SUBJECTS.includes(s),work=WORKSHOP_SUBJECTS.includes(s);State.subject=s;
 if(tool==='bewertungen'||tool==='werkstatt'){const workshopMode=tool==='werkstatt'||!core;if(workshopMode&&!work){subjectHubMode='subject';return subjectHubSubjectPage();}const prev=shell;shell=function(content){prev('<div class="subjectContext"><button class="schoolBack" onclick="subjectHubBack()">← '+esc(s)+'</button><span>'+esc(workshopMode?'Werkstatt / Themenfeldunterricht':'Bewertungen')+'</span></div>'+content);};try{if(workshopMode)workshop();else coreSubjects();}finally{shell=prev;}return;}
 const head='<div class="schoolPageHead"><div><button class="schoolBack" onclick="subjectHubBack()">← '+esc(s)+'</button><h1>'+esc(tool==='uebungen'?'Übungen & Links':tool==='teamstars'?'TeamStars':tool==='material'?'Material':'Planung')+'</h1></div></div>';
 let body='';
 if(['material','planung','uebungen'].includes(tool))body=(tool==='uebungen'&&s==='Englisch'?'<div class="englishToolsBar"><h2>English Practice</h2>'+EnglishPractice.tools(null)+'</div>':'')+SubjectResources.render(tool);
 else if(tool==='teamstars'&&typeof studentTeamstarOverview==='function')body=studentTeamstarOverview(filteredPupils(),s);
 else body='<div class="schoolEmpty">Noch keine Inhalte hinterlegt.</div>';
 shell(head+body);
}
