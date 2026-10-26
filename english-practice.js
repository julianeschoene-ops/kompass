/* Results are stored in normal competency records by the database. */
const EnglishPractice = {
  practiceReport(p){const reports=Store.records['english_practice_log|'+p.id]?.reports||[];if(!reports.length)return '';return `<details class="card"><summary><b>Übungsberichte (${reports.length})</b></summary><p class="mini">Freiwillig übermittelte Übungsstände. Kontrollen sind Selbstauskünfte; keine Kompetenzbewertungen.</p>${reports.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(r=>`<details><summary>${esc(new Date(r.at).toLocaleString('de-DE'))} · ${Number(r.xp)||0} XP · ${(r.controls||[]).filter(x=>x.compared).length} verglichen · ${(r.controls||[]).filter(x=>x.star).length} ★</summary><h4>LWL-Kontrollen</h4>${(r.controls||[]).map(c=>`<p>${esc(c.title)}: ${c.compared?'verglichen / verbessert':'begonnen'} · ${Number(c.correct)||0}/3 Zusatzfragen ${c.star?'★':''}</p>`).join('')}<h4>Abgeschlossene Übungen</h4>${(r.grammar||[]).map(g=>`<p>${esc(g.title)}: ${Number(g.points)||0}/${Number(g.max)||0} richtig</p>`).join('')||'<p>Noch keine abgeschlossene Übungsrunde.</p>'}</details>`).join('')}</details>`},
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
    return `<div class="toolbar" style="margin-bottom:12px;flex-wrap:wrap"><button class="chip" onclick="reloadTeacherCloudData()">↻ Ergebnisse aktualisieren</button>
      ${canManageRoster() ? `<button class="chip dark" onclick="EnglishPractice.printCodes(null,true)">Code + Symbol · ganzer Jahrgang (${all.length})</button>
      ${State.team !== 'alle' ? `<button class="chip" onclick="EnglishPractice.printCodes()">Code + Symbol · ${esc(State.team)} (${selected.length})</button>` : ''}` : ''}
    </div>${comp ? this.mapping(comp) : ''}${this.calendarTools()}`;
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
  scoreDisplay(record) {
    const s=record.score;if(!s)return '';const o=record.assessmentSummary;
    if(o?.policy==='common_depth_v1')return `<div class="mini">Gesamt: ${Number(o.totalScore.points)}/${Number(o.totalScore.max)} P.<br>Erfüllung ${o.level?'auf Niveau '+esc(o.level):'im Basisteil'}: ${Number(s.points)}/${Number(s.max)} P. · ${Number(s.percent)}%${o.pendingReview?' · höhere Tiefe noch in Prüfung':''}</div>`;
    return `<div class="mini">${Number(s.points)}/${Number(s.max)} P. · ${Number(s.percent)}%</div>`;
  },
  interruptionNote(e){const d=e.interruptions||e.assessmentDetail?.interruptions,count=Number(d?.count||0);return count>0?`<p class="mini"><b>Testseite ${count}× verlassen</b>${d.policy==='first_warning_then_one'?` · 1. Wechsel: Warnung · ${Number(d.deduction)} P. Abzug · vor Abzug ${Number(d.points_before)} P.`:' · Unterbrechungen vermerkt (frühere Regel)'}</p>`:'';},
  depthBreakdown(o) {
    if(!o)return '';return `<div class="mini"><b>${o.level?'Automatisch ermitteltes Niveau '+esc(o.level):'Noch kein Niveau hinreichend nachgewiesen'}</b> · ${{green:'erreicht',yellow:'teilweise erreicht',red:'noch nicht erreicht'}[o.status]}<p>Gesamt ${Number(o.totalScore.points)}/${Number(o.totalScore.max)} P. · Erfüllung ${o.level?esc(o.level):'Basis'}: ${Number(o.attainmentScore.points)}/${Number(o.attainmentScore.max)} P. (${Number(o.attainmentScore.percent)}%)</p>${['G','M','E'].map(l=>`<span>${l==='G'?'G Vokabeln':l==='M'?'M/E Bedeutungen':'E Sätze'}: ${Number(o.byLevel[l].points)}/${Number(o.byLevel[l].max)} P.</span>`).join(' · ')}</div>`;
  },
  evidence(record) {
    const entries=record?.practiceResults||[];if(!entries.length)return '';const latest=entries[entries.length-1],score=latest.score||{};
    return `<details style="font-size:.8rem;margin-top:5px"><summary>English Practice · Tests · ${latest.needsReview?'vorläufig · ':''}${Number(score.points)}/${Number(score.max)} P. · ${esc(latest.date)}${Number((latest.interruptions||latest.assessmentDetail?.interruptions)?.count||0)>0?' · '+Number((latest.interruptions||latest.assessmentDetail?.interruptions).count)+' Unterbrechung(en)':''} · ${entries.length} Versuch${entries.length===1?'':'e'}</summary>${entries.slice().reverse().map(e=>`<div class="mini" style="margin:8px 0">${esc(e.date)} · ${esc(e.topic)}${e.outcome?.level?' · Niveau '+esc(e.outcome.level):e.testLevel?' · frühere Testversion '+esc(e.testLevel):''} · ${Number(e.score?.points)}/${Number(e.score?.max)} P. (${Number(e.score?.percent)} %) ${e.needsReview?'<b>· Satzprüfung offen</b>':e.reviewed?'· durch Lehrkraft geprüft':''}${this.interruptionNote(e)}${e.outcome?this.depthBreakdown(e.outcome):''}${e.assessmentDetail?this.answerDetails(e):''}</div>`).join('')}</details>`;
  },
  answerDetails(e) {
    const d=e.assessmentDetail,answers=d.answers||[],items=d.items||[];
    return `<details><summary>Einzelantworten & Punkte</summary>${answers.map((a,n)=>`<div style="border-bottom:1px solid #ddd;padding:8px 0"><b>${n+1}. ${esc(items[n]?.prompt||'')}</b><p>Antwort: ${esc(a.given||'—')} · ${a.points}/${items[n]?.max_points||2} P. · ${esc(({correct:'Richtig',spelling:'Kleiner Tippfehler',incorrect:'Nicht richtig',review:e.reviewed?'Von Lehrkraft geprüft; Gesamtpunktzahl maßgeblich':'Satzvariante prüfen'})[a.kind]||'')}</p><p>Beispiel: ${esc(items[n]?.accepted?.[0]||'')}</p></div>`).join('')}${e.needsReview&&this.userKey()?`<button class="chip" data-result="${esc(e.id)}" data-max="${Number(e.score.max)}" data-common="${e.outcome?'true':'false'}" onclick="this.dataset.common==='true'?EnglishPractice.reviewDepth(this.dataset.result):EnglishPractice.reviewVocab(this.dataset.result,Number(this.dataset.max))">Punkte nach Prüfung übernehmen</button><p>Geprüfte Teilpunkte bestimmen Niveau und Ampel erneut. Die automatische Vorbewertung bleibt nachvollziehbar.</p>`:''}${e.reviewed?`<p>Geprüft von ${esc(e.reviewedBy||'Lehrkraft')}: ${esc(e.reviewNote||'')}</p>`:''}</details>`;
  },
  async reviewDepth(id) {
    if(!this.userKey())return;const entry=Object.values(Store.records||{}).flatMap(r=>r.practiceResults||[]).find(e=>e.id===id),parts=entry?.outcome?.byLevel;if(!parts){alert('Bitte Ergebnisse neu laden.');return}
    const scores={};for(const l of ['G','M','E']){const value=prompt('Geprüfte Punkte '+(l==='G'?'Basis G':l==='M'?'Wortbedeutungen M/E':'Sätze E')+' (0–'+parts[l].max+'):',String(parts[l].points));if(value===null)return;const n=Number(value);if(!value.trim()||!Number.isInteger(n)||n<0||n>parts[l].max){alert('Bitte gültige Teilpunkte eingeben.');return}scores[l]=n}
    const note=prompt('Anmerkung zur Prüfung (optional):')||'';
    try{const r=await Auth.cloudClient.rpc('kompass_english_review_depth_vocab',{p_id:id,p_g:scores.G,p_m:scores.M,p_e:scores.E,p_note:note});if(r.error)throw r.error;await reloadTeacherCloudData();toast('Geprüfte Punkte, Niveau und Ampel gespeichert.');}catch(e){alert('Prüfung nicht gespeichert: '+(e.message||e));}
  },
  async reviewVocab(id,max) {
    if(!this.userKey())return;const value=prompt('Gesamtpunktzahl nach Prüfung (0–'+max+'):');if(value===null)return;const points=Number(value);if(!value.trim()||!Number.isInteger(points)||points<0||points>max){alert('Bitte eine ganze Punktzahl zwischen 0 und '+max+' eingeben.');return}const note=prompt('Anmerkung zur Prüfung (optional):')||'';
    try{const r=await Auth.cloudClient.rpc('kompass_english_review_vocab',{p_id:id,p_points:points,p_note:note});if(r.error)throw r.error;await reloadTeacherCloudData();toast('Geprüfte Punkte in der Kompetenz gespeichert.');}catch(e){alert('Bewertung nicht gespeichert: '+(e.message||e));}
  },
  access(p) {
    if (!this.userKey() || !canManageRoster()) return '';
    return `<details style="display:inline-block;margin:8px;font-size:.85rem"><summary>English Practice · Zugang</summary><button class="chip" onclick="EnglishPractice.printCodes('${esc(p.id)}')">Code + Symbol drucken</button><button class="chip" onclick="EnglishPractice.printCodes('${esc(p.id)}',false,true)">Zugang erneuern</button><button class="chip" onclick="EnglishPractice.revoke('${esc(p.id)}')">Zugang sperren</button></details>`;
  },
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

