/* Results are stored in normal competency records by the database. */
const EnglishPractice = {
  tasks: [], taskUser: null, taskBusy: false, taskError: '',
  userKey() { return Auth.session?.mode === 'cloud' && !Auth.isLernatelier() ? Auth.currentUser()?.id : null; },
  async loadTasks(force = false) {
    const user = this.userKey();
    if (!user || this.taskBusy || (!force && this.taskUser === user)) return;
    this.taskBusy = true;
    try {
      const r = await Auth.cloudClient.from('kompass_english_tasks').select('task_key,title,unit,competency_id').eq('is_assessment',true).order('title');
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
      ${canManageRoster() ? `<button class="chip dark" onclick="EnglishPractice.printCodes(null,true)">QR + PIN · ganzer Jahrgang (${all.length})</button>
      ${State.team !== 'alle' ? `<button class="chip" onclick="EnglishPractice.printCodes()">QR + PIN · ${esc(State.team)} (${selected.length})</button>` : ''}` : ''}
    </div>${comp ? this.mapping(comp) : ''}`;
  },
  mapping(comp) {
    const tasks = this.taskUser === this.userKey() ? this.tasks : [], assigned = tasks.filter(t => t.competency_id === comp.id);
    return `<details style="font-size:.85rem;margin:0 0 14px"><summary>English Practice · ${assigned.length} zugeordnete Vokabeltests</summary>
      ${this.taskError ? `<p>${esc(this.taskError)} <button class="chip" onclick="EnglishPractice.loadTasks(true)">Erneut laden</button></p>` : assigned.length ? `<ul>${assigned.map(t => `<li>${esc(t.title)}</li>`).join('')}</ul>` : '<p>Dieser Kompetenz ist bisher kein Vokabeltest zugeordnet.</p>'}
      ${canManageRoster() && tasks.length ? `<label for="ep-map-task">Test dieser Kompetenz zuordnen (gilt für künftige Versuche)</label><select id="ep-map-task"><option value="">Vokabeltest auswählen …</option>${tasks.map(t => `<option value="${esc(t.task_key)}">${esc(t.title)}</option>`).join('')}</select><button class="chip" onclick="EnglishPractice.mapTask()">Dieser Kompetenz zuordnen</button>` : ''}</details>`;
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
  evidence(record) {
    const entries = record?.practiceResults || [];
    if (!entries.length) return '';
    const latest = entries[entries.length - 1], score = latest.score || {};
    return `<details style="font-size:.8rem;margin-top:5px"><summary>English Practice · ${Number(score.points)}/${Number(score.max)} P. · ${esc(latest.date)} · ${entries.length} Versuch${entries.length === 1 ? '' : 'e'}</summary>${entries.slice().reverse().map(e => `<div class="mini" style="margin:5px 0">${esc(e.date)} · ${esc(e.topic)} · ${Number(e.score?.points)}/${Number(e.score?.max)} P. (${Number(e.score?.percent)} %)</div>`).join('')}</details>`;
  },
  access(p) {
    if (!this.userKey() || !canManageRoster()) return '';
    return `<details style="display:inline-block;margin:8px;font-size:.85rem"><summary>English Practice · Zugang</summary><button class="chip" onclick="EnglishPractice.printCodes('${esc(p.id)}')">QR + PIN drucken</button><button class="chip" onclick="EnglishPractice.printCodes('${esc(p.id)}',false,true)">Zugang erneuern</button><button class="chip" onclick="EnglishPractice.revoke('${esc(p.id)}')">Zugang sperren</button></details>`;
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
    if (rotate && !confirm('Einen neuen QR-Code und eine neue PIN erstellen? Der bisherige Zugang dieses Kindes wird ungültig.')) return;
    const w = window.open('', '_blank');
    if (!w) return alert('Bitte Pop-ups für KOMPASS erlauben und erneut versuchen.');
    w.opener = null;
    w.document.write('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>English Practice · QR + PIN</title><style>*{box-sizing:border-box}body{font:15px system-ui;margin:20px;color:#222}h1{font-size:24px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.code{border:1px solid #bbb;padding:12px;text-align:center;break-inside:avoid;overflow-wrap:anywhere}.code svg{width:145px;height:145px;max-width:100%}.code p{font-size:12px;margin:8px 0}.pin{font-size:22px;font-weight:700;letter-spacing:3px;margin:8px 0}.code a{color:#9b142a;font-size:12px}button{font:inherit;padding:10px;border:0;border-radius:8px}@media(max-width:700px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:440px){.cards{grid-template-columns:1fr}}@media print{@page{size:A4;margin:12mm}.actions{display:none}body{margin:0}.cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.code{page-break-inside:avoid}}</style></head><body><div class="actions"><h1>English Practice · QR + PIN</h1><p>Persönliche Zugangskarten fürs Lerntagebuch. Vorhandene Zugänge werden erneut gedruckt und bleiben gültig.</p><button onclick="window.print()">Drucken / als PDF sichern</button></div><p id="status" role="status">Zugänge werden für die gesamte Auswahl geladen …</p><div class="cards" id="cards"></div></body></html>');
    w.document.close();
    const user = this.userKey();
    try {
      const r = await Auth.cloudClient.rpc('kompass_english_batch_access', {p_grade:Number(State.year),p_pupil_ids:pupils.map(p => String(p.id)),p_rotate:rotate});
      if (r.error) throw r.error;
      if (w.closed || this.userKey() !== user) return;
      const codes = new Map((r.data || []).map(c => [c.pupil_id,c]));
      for (const p of pupils) {
        const c = codes.get(String(p.id));
        if (!c || !/^[a-f0-9]{64}$/.test(c.token) || !/^[0-9]{6}$/.test(c.pin)) throw new Error('Ein Zugang wurde nicht vollständig geliefert.');
        const url = 'https://julianeschoene-ops.github.io/Schedule/#code=' + c.token;
        const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
        const card = w.document.createElement('section'); card.className = 'code';
        card.innerHTML = `<b>${esc(p.first)} ${esc(p.last)}</b><p>${esc(p.className)} · English Practice</p>${qr.createSvgTag(4,16)}<p>Deine persönliche PIN</p><div class="pin">${esc(c.pin)}</div><p>1. Scannen · 2. PIN eingeben · 3. Üben</p><a href="${esc(url)}">Übungslink öffnen</a><p>Zum Schluss: End practice & reset</p>`;
        w.document.getElementById('cards').appendChild(card);
      }
      w.document.getElementById('status').textContent = pupils.length + ' Zugangskarten mit QR-Code und PIN. Jetzt drucken oder als PDF sichern.';
    } catch (e) {
      if (!w.closed) w.document.getElementById('status').textContent = 'Zugänge konnten nicht geladen werden: ' + (e.message || e);
    }
  }
};
