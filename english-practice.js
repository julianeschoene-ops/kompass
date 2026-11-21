/* Results are stored in normal competency records by the database. */
const EnglishPractice = {
  selectedPracticePupil: '',
  practiceCloudRecords: null, practiceCloudLoading: false, practiceCloudAt: 0, practiceCloudGrade: null,
  async refreshPracticeReports(){
    if(this.practiceCloudLoading||!Auth.cloudClient)return;
    this.practiceCloudLoading=true;
    try{
      const grade=Number(State.year);
      const {data,error}=await Auth.cloudClient.from('kompass_grade_state').select('payload').eq('grade',grade).single();
      if(error)throw error;
      const records=data?.payload?.records||{};
      this.practiceCloudRecords=Object.fromEntries(Object.entries(records).filter(([key])=>key.startsWith('english_practice_log|')));
      this.practiceCloudGrade=grade;
      this.practiceCloudAt=Date.now();
      if(State.view==='core')render();
    }catch(e){console.warn('English Practice reports could not be refreshed',e)}
    finally{this.practiceCloudLoading=false}
  },
  practiceOverview(){
    if((this.practiceCloudGrade!==Number(State.year)||Date.now()-this.practiceCloudAt>30000)&&!this.practiceCloudLoading)void this.refreshPracticeReports();
    const pupils=filteredPupils();
    const levels=[{name:'Starter',at:0},{name:'Explorer',at:15},{name:'Word Wizard',at:40},{name:'English Hero',at:80}];
    const levelFor=stars=>levels.reduce((n,l,i)=>stars>=l.at?i:n,0);
    const safePercent=(a,b)=>b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):0;
    const bar=(a,b)=>'<div style="height:9px;border-radius:20px;background:#e9edf2;overflow:hidden;margin:7px 0"><div style="height:100%;width:'+safePercent(a,b)+'%;background:'+(safePercent(a,b)>=80?'#36856c':safePercent(a,b)>=50?'#d39a42':'#bd6868')+';border-radius:20px"></div></div>';
    const info=p=>{
      const reports=(this.practiceCloudRecords?.['english_practice_log|'+p.id]||Store.records['english_practice_log|'+p.id])?.reports||[];
      const activities=reports.flatMap(r=>Array.isArray(r.grammar)?r.grammar:[]);
      const compared=reports.reduce((n,r)=>n+(r.controls||[]).filter(c=>c.compared).length,0);
      const points=activities.reduce((n,a)=>n+Number(a.points||0),0);
      const max=activities.reduce((n,a)=>n+Number(a.max||0),0);
      return {p,reports,activities,compared,points,max,stars:Math.max(0,...reports.map(r=>Number(r.starsTotal??r.stars??Math.round((Number(r.xp)||0)/10))||0))};
    };
    const rows=pupils.map(info),withReports=rows.filter(x=>x.reports.length).length;
    if(!pupils.some(p=>String(p.id)===String(this.selectedPracticePupil)))this.selectedPracticePupil='';
    const selected=rows.find(x=>String(x.p.id)===String(this.selectedPracticePupil));
    let html='<div class="card"><p><b>'+withReports+' von '+pupils.length+'</b> Kindern haben einen Übungsbericht gesendet.</p>'+
      '<div class="toolbar"><label>Team <select onchange="State.team=this.value;EnglishPractice.selectedPracticePupil=\'\';render()">'+['alle',...TEAMS].map(t=>'<option value="'+esc(t)+'" '+(State.team===t?'selected':'')+'>'+esc(t==='alle'?'Alle Teams':t)+'</option>').join('')+'</select></label>'+
      '<label>Kind <select onchange="EnglishPractice.selectedPracticePupil=this.value;render()"><option value="">Bitte auswählen</option>'+pupils.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===String(this.selectedPracticePupil)?'selected':'')+'>'+esc(p.short||p.first+' '+p.last)+'</option>').join('')+'</select></label></div></div>';
    if(!selected)return html;
    const levelIndex=levelFor(selected.stars),level=levels[levelIndex],next=levels[levelIndex+1];
    const byTopic=new Map();
    for(const a of selected.activities){
      const title=String(a.title||a.key||'Weitere Übung');
      const key=String(a.key||title);
      if(!byTopic.has(key))byTopic.set(key,{title,attempts:0,points:0,max:0,last:''});
      const t=byTopic.get(key);t.attempts++;t.points+=Number(a.points||0);t.max+=Number(a.max||0);if(String(a.at||'')>t.last)t.last=String(a.at||'');
    }
    const topics=[...byTopic.entries()].map(([key,t])=>({...t,key,rounds:selected.activities.filter(a=>String(a.key||a.title||'Weitere Übung')===key).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))})).sort((a,b)=>b.last.localeCompare(a.last));
    const tile=(label,value,detail)=>'<div style="border:1px solid #e1e5ec;border-radius:15px;padding:15px;background:#fafbfd;min-width:0"><div style="font-size:.84rem;color:#64748b">'+label+'</div><div style="font-size:1.55rem;font-weight:750;margin:5px 0">'+value+'</div><div class="mini">'+detail+'</div></div>';
    html+='<section class="card"><h2>'+esc(selected.p.first+' '+selected.p.last)+'</h2>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin:14px 0">'+
      tile('⭐ Sterne',selected.stars,'Gesammelte Übungssterne')+
      tile('🏅 Level',String(levelIndex+1)+' · '+esc(level.name),'Aktueller Lernstand')+
      tile('✏️ Geübt',selected.activities.length+' Runden',topics.length+' Themen')+
      tile('🎯 Richtig',selected.max?Math.round(selected.points/selected.max*100)+' %':'–','Digitale Übungen insgesamt')+'</div>'+
      '<div style="border:1px solid #e1e5ec;border-radius:15px;padding:15px;margin-bottom:17px"><b>Dein Weg zum nächsten Level</b>'+
      (next?'<p class="mini" style="margin:6px 0">'+esc(level.name)+' → '+esc(next.name)+' · noch '+(next.at-selected.stars)+' Sterne</p>'+bar(selected.stars-level.at,next.at-level.at):'<p class="mini">Höchstes Level erreicht</p>')+'</div>'+
      '<h3>Was wurde geübt?</h3>'+
      (topics.length?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0 20px">'+topics.map(t=>{
        const percent=safePercent(t.points,t.max);
        return '<details style="border:1px solid #e1e5ec;border-radius:14px;padding:15px;min-width:0"><summary style="cursor:pointer;list-style:none"><b>'+esc(t.title)+'</b><p style="margin:8px 0 4px"><strong>'+percent+' %</strong> richtig · '+t.attempts+' Runde'+(t.attempts===1?'':'n')+'</p>'+bar(t.points,t.max)+'<div class="mini">'+t.points+'/'+t.max+' Aufgabenpunkte · <span style="text-decoration:underline">Berichte ansehen</span></div></summary>'+
        '<div style="border-top:1px solid #e1e5ec;margin-top:12px;padding-top:8px">'+t.rounds.map((a,i)=>'<div style="padding:9px 0;border-bottom:1px solid #edf0f5"><b>Runde '+(t.rounds.length-i)+'</b> · '+(a.at?esc(new Date(a.at).toLocaleString('de-DE')):'Ohne Datum')+'<div>'+Number(a.points||0)+' / '+Number(a.max||0)+' Aufgabenpunkte · '+safePercent(Number(a.points||0),Number(a.max||0))+' % richtig</div></div>').join('')+'</div></details>';
      }).join('')+'</div>':'<p>Noch keine abgeschlossene digitale Übung übermittelt.</p>')+
      '<p class="mini" style="margin-top:14px">Übungsergebnisse sind keine Kompetenzbewertung.</p></section>';
    return html;
  },
  practiceReport(p){const reports=(this.practiceCloudRecords?.['english_practice_log|'+p.id]||Store.records['english_practice_log|'+p.id])?.reports||[];if(!reports.length)return '';return `<details class="card"><summary><b>Übungsberichte (${reports.length})</b></summary><p class="mini">Freiwillig übermittelte Übungsstände. Kontrollen sind Selbstauskünfte; keine Kompetenzbewertungen.</p>${reports.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(r=>`<details><summary>${esc(new Date(r.at).toLocaleString('de-DE'))} · ${Number(r.starsTotal ?? r.stars ?? Math.round((Number(r.xp)||0)/10))||0} Sterne · ${(r.controls||[]).filter(x=>x.compared).length} verglichen · ${(r.controls||[]).filter(x=>x.star).length} ★</summary><h4>LWL-Kontrollen</h4>${(r.controls||[]).map(c=>`<p>${esc(c.title)}: ${c.compared?'verglichen / verbessert':'begonnen'} · ${Number(c.correct)||0}/3 Zusatzfragen ${c.star?'★':''}</p>`).join('')}<h4>Abgeschlossene Übungen</h4>${(r.grammar||[]).map(g=>`<p>${esc(g.title)}: ${Number(g.points)||0}/${Number(g.max)||0} richtig</p>`).join('')||'<p>Noch keine abgeschlossene Übungsrunde.</p>'}</details>`).join('')}</details>`},
  symbols:{fox:['🦊','Fuchs'],panda:['🐼','Panda'],frog:['🐸','Frosch'],lion:['🦁','Löwe'],penguin:['🐧','Pinguin'],turtle:['🐢','Schildkröte'],dolphin:['🐬','Delfin'],butterfly:['🦋','Schmetterling'],bee:['🐝','Biene'],owl:['🦉','Eule'],rabbit:['🐰','Hase'],cat:['🐱','Katze'],dog:['🐶','Hund'],koala:['🐨','Koala'],octopus:['🐙','Oktopus'],unicorn:['🦄','Einhorn']},
  schoolClosures: [], calendarError: '', tasks: [], taskUser: null, taskBusy: false, taskError: '',
  userKey() { return Auth.session?.mode === 'cloud' && !Auth.isLernatelier() ? Auth.currentUser()?.id : null; },
  async loadTasks(force = false) {
    const user = this.userKey();
    if (!user || this.taskBusy || (!force && this.taskUser === user)) return;
    this.taskBusy = true;
    try {
      const r = await Auth.cloudClient.from('kompass_english_tasks').select('task_key,title,unit,competency_id,assessment_config,vocabulary_bank').eq('is_assessment',true).order('title');
      if (r.error) throw r.error;
      if (this.userKey() !== user) return;
      this.tasks = r.data || []; this.taskUser = user; this.taskError = '';
    } catch (e) {
      if (this.userKey() !== user) return;
      this.taskError = 'Die Testzuordnung konnte nicht geladen werden.'; this.taskUser = user;
    } finally { this.taskBusy = false; if (this.userKey() === user && State.view === 'core') render(); }
  },
  forGrade(all = false) {
    return all ? (Store.pupils || []).filter(p => !p.archived && Number(p.year || String(p.className).charAt(0)) === Number(State.year)) : filteredPupils();
  },
  tools(comp) {
    if (!this.userKey()) return '';
    if (this.taskUser !== this.userKey() && !this.taskBusy) setTimeout(() => this.loadTasks(), 0);
    const all = this.forGrade(true), selected = this.forGrade();
    return `<div class="toolbar" style="margin-bottom:12px;flex-wrap:wrap"><button class="chip dark" onclick="LiveQuiz.setup()">Live-Quiz · 15 Fragen</button><button class="chip" onclick="reloadTeacherCloudData()">↻ Ergebnisse aktualisieren</button>
      ${canManageRoster() ? `<button class="chip dark" onclick="EnglishPractice.printCodes(null,true)">Code + Symbol · ganzer Jahrgang (${all.length})</button>
      ${State.team !== 'alle' ? `<button class="chip" onclick="EnglishPractice.printCodes()">Code + Symbol · ${esc(State.team)} (${selected.length})</button>` : ''}` : ''}
    </div>`;
  },
  taskPreview(t) {
    const a=t.assessment_config;if(!a)return '';
    if(a.differentiated&&t.vocabulary_bank)return `<details><summary>Gemeinsamer Lernnachweis · Aufbau & Tiefenkriterien</summary><p>Alle: 15 gemischte Vokabelaufgaben Deutsch ↔ Englisch (G). Danach 5 englische Wortbeschreibungen: passenden Begriff finden (M/E). Zusätzlich 3 vollständige Sätze ins Englische (E). Keine Niveauwahl vor dem Test. Insgesamt höchstens 20 verschiedene Vokabelziele.</p><p>Niveau aus der höchsten nachgewiesenen fachlichen Tiefe. Die vorhandenen Prozentgrenzen werden verwendet; Gesamtpunkte und Erfüllung auf dem ermittelten Niveau werden getrennt angezeigt.</p><h4>Wortbeschreibungen M/E · Aufgabenpool</h4>${(t.vocabulary_bank.meanings||[]).map(q=>`<p>${esc(q.prompt)} → <b>${esc(q.accepted?.[0]||'')}</b></p>`).join('')}<h4>Satzaufgaben E · Aufgabenpool</h4>${(t.vocabulary_bank.sentences||[]).map(q=>`<div class="mini"><b>${esc(q.prompt)}</b><p>${(q.accepted||[]).map(v=>esc(v)).join('<br>')}</p></div>`).join('')}</details>`;
    if(a.kind==='teacher')return `<details><summary>Aufgabe & Bewertungskriterien · Lehrkraftvorschau</summary>${a.stimulus?`<blockquote>${esc(a.stimulus)}</blockquote>`:''}<p>${esc(a.prompt)}</p><ul>${(a.criteria||[]).map(c=>`<li>${esc(c)}</li>`).join('')}</ul><p>Ergebnis über die normale Kompetenzbewertung erfassen. Kein automatischer Punktwert.</p></details>`;
    if(Array.isArray(a.questions))return `<details><summary>Aufgaben & Lösungen · Lehrkraftvorschau</summary><p>${esc(a.instructions)}</p><p>Diese Vorschau ist nur in KOMPASS für Lehrkräfte verfügbar. Sie erzeugt keine Testergebnisse.</p>${a.questions.map((q,n)=>`<div class="mini"><b>Aufgabe ${n+1}${a.kind==='listening'?' · Hörtext':''}</b><blockquote>${esc(q.text)}</blockquote><p>${esc(q.q)}</p><ol>${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol><p><b>Lösung:</b> ${esc(q.options[q.answer])}</p></div>`).join('')}</details>`;
    return '';
  },
  calendarTools() {
    if (!Auth.isAdmin?.()) return '';
    return `<details style="font-size:.85rem;margin:0 0 14px" ontoggle="if(this.open)EnglishPractice.loadClosures()"><summary>English Practice · Testzeiten & schulfreie Tage</summary>
    <p>Montag–Freitag, 8:00–12:30 Uhr (Europe/Berlin). BW-Ferien und gesetzliche Feiertage sind bis einschließlich Sommerferien 2030 hinterlegt. Bewegliche Ferientage und schulinterne Schließtage bitte hier ergänzen. Sperrtage gelten für die ganze Schule.</p>
    <form onsubmit="event.preventDefault();EnglishPractice.addClosure()"><label>Von <input id="ep-closure-start" type="date" required></label> <label>Bis <input id="ep-closure-end" type="date" required></label> <label>Bezeichnung <input id="ep-closure-label" maxlength="120" required placeholder="z. B. beweglicher Ferientag"></label> <button class="chip" type="submit">Sperrzeit hinzufügen</button></form><div id="ep-closure-list" role="status">Schulische Sperrzeiten laden …</div></details>`;
  },
  async loadClosures() {
    const user=this.userKey();if(!user||!Auth.isAdmin?.())return;
    try {const r=await Auth.cloudClient.from('kompass_english_closures').select('id,starts_on,ends_on,label,active').eq('scope','school').order('starts_on');
      if(r.error)throw r.error;if(this.userKey()!==user)return;this.schoolClosures=r.data||[];this.calendarError='';
    } catch (_) {if(this.userKey()!==user)return;this.calendarError='Schulische Sperrzeiten konnten nicht geladen werden.';}
    const el=document.getElementById('ep-closure-list');if(!el)return;
    el.innerHTML=this.calendarError?esc(this.calendarError):this.schoolClosures.map(c=>`<p>${esc(c.starts_on)} – ${esc(c.ends_on)} · ${esc(c.label)} ${c.active?'':'(deaktiviert)'} <button class="chip" onclick="EnglishPractice.toggleClosure('${esc(c.id)}',${!c.active})">${c.active?'Deaktivieren':'Wieder aktivieren'}</button></p>`).join('')||'<p>Noch keine zusätzlichen schulischen Sperrzeiten hinterlegt.</p>';
  },
  async addClosure() {
    if(!Auth.isAdmin?.())return;const p_start=document.getElementById('ep-closure-start')?.value,p_end=document.getElementById('ep-closure-end')?.value,p_label=document.getElementById('ep-closure-label')?.value.trim();
    if(!p_start||!p_end||p_end<p_start||!p_label){alert('Bitte Zeitraum und Bezeichnung prüfen.');return}
    try{const r=await Auth.cloudClient.rpc('kompass_english_add_closure',{p_start,p_end,p_label});if(r.error)throw r.error;await this.loadClosures();toast('Schulische Testsperre gespeichert.');}
    catch(e){alert('Testsperre nicht gespeichert: '+(e.message||e));}
  },
  async toggleClosure(id,active) {
    if(!Auth.isAdmin?.())return;
    try{const r=await Auth.cloudClient.rpc('kompass_english_set_closure_active',{p_id:id,p_active:active});if(r.error)throw r.error;await this.loadClosures();toast(active?'Testsperre aktiviert.':'Testsperre deaktiviert.');}
    catch(e){alert('Testsperre nicht geändert: '+(e.message||e));}
  },
  mapping(comp) {
    const tasks = this.taskUser === this.userKey() ? this.tasks : [], assigned = tasks.filter(t => t.competency_id === comp.id);
    return `<details style="font-size:.85rem;margin:0 0 14px"><summary>English Practice · ${assigned.length} zugeordnete Tests</summary>
      ${this.taskError ? `<p>${esc(this.taskError)} <button class="chip" onclick="EnglishPractice.loadTasks(true)">Erneut laden</button></p>` : assigned.length ? `<ul>${assigned.map(t => `<li>${esc(t.title)}${this.taskPreview(t)}</li>`).join('')}</ul>` : '<p>Dieser Kompetenz ist bisher kein digitaler LWL-Test zugeordnet.</p>'}
      ${canManageRoster() && tasks.length ? `<label for="ep-map-task">Test dieser Kompetenz zuordnen (gilt für künftige Versuche)</label><select id="ep-map-task"><option value="">Test auswählen …</option>${tasks.map(t => `<option value="${esc(t.task_key)}">${esc(t.title)}</option>`).join('')}</select><button class="chip" onclick="EnglishPractice.mapTask()">Dieser Kompetenz zuordnen</button>` : ''}</details>`;
  },
  async mapTask() {
    const key = document.getElementById('ep-map-task')?.value, comp = Store.competencies.find(c => c.id === State.competency);
    if (!key || !comp || !canManageRoster()) return;
    try {
      const r = await Auth.cloudClient.rpc('kompass_english_map_task', {p_grade:Number(State.year),p_task_key:key,p_competency_id:comp.id});
      if (r.error) throw r.error;
      await this.loadTasks(true); toast('Test dieser Kompetenz zugeordnet.');
    } catch (e) { alert('Zuordnung nicht gespeichert: ' + (e.message || e)); }
  },
  point(n,max){return Number(n)/(Number(max)===60?2:1)},
  scoreDisplay(record) {
    const s=record.score;if(!s)return '';const o=record.assessmentSummary;
    if(o?.policy==='common_depth_v1')return `<div class="mini">Gesamt: ${this.point(o.totalScore.points,o.totalScore.max)}/${this.point(o.totalScore.max,o.totalScore.max)} P.<br>Erfüllung ${o.level?'auf Niveau '+esc(o.level):'im Basisteil'}: ${this.point(s.points,o.totalScore.max)}/${this.point(s.max,o.totalScore.max)} P. · ${Number(s.percent)}%${o.pendingReview?' · höhere Tiefe noch in Prüfung':''}</div>`;
    return `<div class="mini">${Number(s.points)}/${Number(s.max)} P. · ${Number(s.percent)}%</div>`;
  },
  interruptionNote(e){const d=e.interruptions||e.assessmentDetail?.interruptions,count=Number(d?.count||0);return count>0?`<p class="mini"><b>Testseite ${count}× verlassen</b>${d.policy==='first_warning_then_one'?` · 1. Wechsel: Warnung · ${this.point(d.deduction,e.score?.max)} P. Abzug · vor Abzug ${this.point(d.points_before,e.score?.max)} P.`:' · Unterbrechungen vermerkt (frühere Regel)'}</p>`:'';},
  depthBreakdown(o) {
    if(!o)return '';return `<div class="mini"><b>${o.level?'Automatisch ermitteltes Niveau '+esc(o.level):'Noch kein Niveau hinreichend nachgewiesen'}</b> · ${{green:'erreicht',yellow:'teilweise erreicht',red:'noch nicht erreicht'}[o.status]}<p>Gesamt ${this.point(o.totalScore.points,o.totalScore.max)}/${this.point(o.totalScore.max,o.totalScore.max)} P. · Erfüllung ${o.level?esc(o.level):'Basis'}: ${this.point(o.attainmentScore.points,o.totalScore.max)}/${this.point(o.attainmentScore.max,o.totalScore.max)} P. (${Number(o.attainmentScore.percent)}%)</p>${['G','M','E'].map(l=>`<span>${l==='G'?'G Vokabeln':l==='M'?'M/E Bedeutungen':'E Sätze'}: ${this.point(o.byLevel[l].points,o.totalScore.max)}/${this.point(o.byLevel[l].max,o.totalScore.max)} P.</span>`).join(' · ')}</div>`;
  },
  evidence(record) {
    const entries=record?.practiceResults||[];if(!entries.length)return '';const latest=entries[entries.length-1],score=latest.score||{};
    return `<details style="font-size:.8rem;margin-top:5px"><summary>English Practice · Tests · ${latest.needsReview?'vorläufig · ':''}${this.point(score.points,score.max)}/${this.point(score.max,score.max)} P. · ${esc(latest.date)}${Number((latest.interruptions||latest.assessmentDetail?.interruptions)?.count||0)>0?' · '+Number((latest.interruptions||latest.assessmentDetail?.interruptions).count)+' Unterbrechung(en)':''} · ${entries.length} Versuch${entries.length===1?'':'e'}</summary>${entries.slice().reverse().map(e=>`<div class="mini" style="margin:8px 0">${esc(e.date)} · ${esc(e.topic)}${e.outcome?.level?' · Niveau '+esc(e.outcome.level):e.testLevel?' · frühere Testversion '+esc(e.testLevel):''} · ${this.point(e.score?.points,e.score?.max)}/${this.point(e.score?.max,e.score?.max)} P. (${Number(e.score?.percent)} %) ${e.needsReview?'<b>· Satzprüfung offen</b>':e.reviewed?'· durch Lehrkraft geprüft':''}${this.interruptionNote(e)}${e.outcome?this.depthBreakdown(e.outcome):''}${e.assessmentDetail?this.answerDetails(e):''}</div>`).join('')}</details>`;
  },
  answerDetails(e) {
    const d=e.assessmentDetail,answers=d.answers||[],items=d.items||[];
    return `<details><summary>Einzelantworten & Punkte</summary>${answers.map((a,n)=>`<div style="border-bottom:1px solid #ddd;padding:8px 0"><b>${n+1}. ${esc(items[n]?.prompt||'')}</b><p>Antwort: ${esc(a.given||'—')} · ${this.point(a.points,e.score?.max)}/${this.point(items[n]?.max_points||2,e.score?.max)} P. · ${esc(({correct:'Richtig',spelling:'Kleiner Tippfehler',incorrect:'Nicht richtig',review:e.reviewed?'Von Lehrkraft geprüft; Gesamtpunktzahl maßgeblich':'Satzvariante prüfen'})[a.kind]||'')}</p><p>Beispiel: ${esc(items[n]?.accepted?.[0]||'')}</p></div>`).join('')}${e.needsReview&&this.userKey()?`<button class="chip" data-result="${esc(e.id)}" data-max="${Number(e.score.max)}" data-common="${e.outcome?'true':'false'}" onclick="this.dataset.common==='true'?EnglishPractice.reviewDepth(this.dataset.result):EnglishPractice.reviewVocab(this.dataset.result,Number(this.dataset.max))">Punkte nach Prüfung übernehmen</button><p>Geprüfte Teilpunkte bestimmen Niveau und Ampel erneut. Die automatische Vorbewertung bleibt nachvollziehbar.</p>`:''}${e.reviewed?`<p>Geprüft von ${esc(e.reviewedBy||'Lehrkraft')}: ${esc(e.reviewNote||'')}</p>`:''}</details>`;
  },
  async reviewDepth(id) {
    if(!this.userKey())return;const entry=Object.values(Store.records||{}).flatMap(r=>r.practiceResults||[]).find(e=>e.id===id),parts=entry?.outcome?.byLevel;if(!parts){alert('Bitte Ergebnisse neu laden.');return}
    const scores={},scale=entry.outcome.totalScore.max===60?2:1;for(const l of ['G','M','E']){const value=prompt('Geprüfte Punkte '+(l==='G'?'Basis G':l==='M'?'Wortbedeutungen M/E':'Sätze E')+' (0–'+this.point(parts[l].max,entry.outcome.totalScore.max)+'):',String(this.point(parts[l].points,entry.outcome.totalScore.max)));if(value===null)return;const n=Number(value);if(!value.trim()||!Number.isInteger(n*scale)||n<0||n>this.point(parts[l].max,entry.outcome.totalScore.max)){alert('Bitte gültige Teilpunkte eingeben.');return}scores[l]=n*scale}
    const note=prompt('Anmerkung zur Prüfung (optional):')||'';
    try{const r=await Auth.cloudClient.rpc('kompass_english_review_depth_vocab',{p_id:id,p_g:scores.G,p_m:scores.M,p_e:scores.E,p_note:note});if(r.error)throw r.error;await reloadTeacherCloudData();toast('Geprüfte Punkte, Niveau und Ampel gespeichert.');}catch(e){alert('Prüfung nicht gespeichert: '+(e.message||e));}
  },
  async reviewVocab(id,max) {
    if(!this.userKey())return;const value=prompt('Gesamtpunktzahl nach Prüfung (0–'+max+'):');if(value===null)return;const points=Number(value);if(!value.trim()||!Number.isInteger(points)||points<0||points>max){alert('Bitte eine ganze Punktzahl zwischen 0 und '+max+' eingeben.');return}const note=prompt('Anmerkung zur Prüfung (optional):')||'';
    try{const r=await Auth.cloudClient.rpc('kompass_english_review_vocab',{p_id:id,p_points:points,p_note:note});if(r.error)throw r.error;await reloadTeacherCloudData();toast('Geprüfte Punkte in der Kompetenz gespeichert.');}catch(e){alert('Bewertung nicht gespeichert: '+(e.message||e));}
  },
  access(p) { return ''; },
  async revoke(pupilId) {
    if (!canManageRoster() || !confirm('Diesen Übungszugang sperren? Vorhandene Kompetenzergebnisse bleiben erhalten.')) return;
    try {
      const r = await Auth.cloudClient.rpc('kompass_english_revoke_code', {p_grade:Number(State.year),p_pupil_id:pupilId});
      if (r.error) throw r.error;
      toast('Übungszugang gesperrt.');
    } catch (e) { alert('Zugang konnte nicht gesperrt werden: ' + (e.message || e)); }
  },
  async printCodes(pupilId = null, all = false, rotate = false) {
    if (!canManageRoster() || !this.userKey()) return;
    const pupils = pupilId ? (Store.pupils || []).filter(p => p.id === pupilId) : this.forGrade(all);
    if (!pupils.length) return toast('Für diese Auswahl sind keine Kinder vorhanden.');
    if (rotate && !confirm('Einen neuen Code mit Symbol erstellen? Der bisherige Zugang dieses Kindes wird ungültig.')) return;
    const w = window.open('', '_blank');
    if (!w) return alert('Bitte Pop-ups für KOMPASS erlauben und erneut versuchen.');
    w.opener = null;
    w.document.write('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>English Practice · Code + Symbol</title><style>*{box-sizing:border-box}body{font:15px system-ui;margin:20px;color:#222}h1{font-size:24px}.cards{display:block}.codePage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:20px}.code{border:1px solid #bbb;padding:12px;text-align:center;break-inside:avoid;overflow-wrap:anywhere}.code svg{width:145px;height:145px;max-width:100%}.code p{font-size:12px;margin:8px 0}.pin{font-size:22px;font-weight:700;letter-spacing:3px;margin:8px 0}.code a{color:#9b142a;font-size:12px}button{font:inherit;padding:10px;border:0;border-radius:8px}@media(max-width:700px){.codePage{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:440px){.codePage{grid-template-columns:1fr}}@media print{@page{size:A4 portrait;margin:12mm}html,body{margin:0!important;padding:0!important;width:180mm!important;font-size:11px;-webkit-text-size-adjust:100%;text-size-adjust:100%}.actions,#status{display:none!important}.cards{display:block!important;width:180mm!important}.codePage{display:block!important;width:180mm!important;height:216mm!important;margin:0!important;padding:0!important;font-size:0;line-height:0;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}.codePage:last-child{break-after:auto;page-break-after:auto}.code{display:inline-block!important;vertical-align:top;width:58mm!important;height:68mm!important;margin:1mm!important;padding:3mm 2mm!important;box-sizing:border-box!important;break-inside:avoid;page-break-inside:avoid;font-size:11px;line-height:1.25}.code b{display:block;font-size:12px}.code p{font-size:10px;margin:4px 0}.code a{font-size:10px}.pin{font-size:22px;margin:5px 0}}</style></head><body><div class="actions"><h1>English Practice · Code + Symbol</h1><p>Alle öffnen dieselbe Seite: julianeschoene-ops.github.io/Schedule/ · Persönliche Codes und Symbole fürs Lerntagebuch. Vorhandene Zugänge bleiben beim erneuten Drucken gültig.</p><button onclick="window.print()">Drucken / als PDF sichern</button></div><p id="status" role="status">Zugänge werden für die gesamte Auswahl geladen …</p><div class="cards" id="cards"></div></body></html>');
    w.document.close();
    const user = this.userKey();
    try {
      const r = await Auth.cloudClient.rpc('kompass_english_batch_logins', {p_grade:Number(State.year),p_pupil_ids:pupils.map(p => String(p.id)),p_rotate:rotate});
      if (r.error) throw r.error;
      if (w.closed || this.userKey() !== user) return;
      const codes = new Map((r.data || []).map(c => [c.pupil_id,c]));
      let page = null;
      for (const [index,p] of pupils.entries()) {
        if (index % 9 === 0) {
          page = w.document.createElement('div'); page.className = 'codePage';
          w.document.getElementById('cards').appendChild(page);
        }
        const c = codes.get(String(p.id));
        if (!c || !/^[0-9]{4}$/.test(c.code) || !this.symbols[c.symbol]) throw new Error('Ein Zugang wurde nicht vollständig geliefert.');
        const url = 'https://julianeschoene-ops.github.io/Schedule/';
        const card = w.document.createElement('section'); card.className = 'code';
        card.innerHTML = `<b>${esc(p.first)} ${esc(p.last)}</b><p>${esc(p.className)} · English Practice</p><p>Dein Code</p><div class="pin">${esc(c.code)}</div><div style="font-size:42px">${this.symbols[c.symbol][0]}</div><p>Dein Symbol: ${this.symbols[c.symbol][1]}</p><p>Code eingeben · Symbol wählen · Namen bestätigen</p><p>Zum Schluss: Abmelden</p>`;
        page.appendChild(card);
      }
      w.document.getElementById('status').textContent = pupils.length + ' Zugangskarten mit Code und Symbol. Jetzt drucken oder als PDF sichern.';
    } catch (e) {
      if (!w.closed) w.document.getElementById('status').textContent = 'Zugänge konnten nicht geladen werden: ' + (e.message || e);
    }
  }
};

