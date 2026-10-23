/* English Practice results remain separate from teacher competency assessments. */
const EnglishPractice = {
  cache: null, busy: false, error: '', loadedAt: 0,
  userKey() { return Auth.session?.mode === 'cloud' && !Auth.isLernatelier() ? Auth.currentUser()?.id : null; },
  async refresh(force = false) {
    const user = this.userKey(), grade = Number(State.year);
    if (!user || !Auth.cloudClient || this.busy) return;
    if (!force && this.cache?.user === user && this.cache.grade === grade && Date.now() - this.loadedAt < 15000) return;
    this.busy = true;
    try {
      // Paginate to avoid silently hiding results after Supabase's row limit.
      let rows = [], offset = 0;
      while (true) {
        const result = await Auth.cloudClient.from('kompass_english_results')
          .select('id,pupil_id,task_key,topic,points,max_points,submitted_at,attempt_id')
          .eq('grade', grade).order('submitted_at', {ascending: false}).order('id')
          .range(offset, offset + 499);
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 500) break;
        offset += 500;
      }
      if (this.userKey() !== user || Number(State.year) !== grade) return;
      this.cache = {user, grade, rows}; this.error = ''; this.loadedAt = Date.now();
    } catch (e) {
      if (this.userKey() !== user || Number(State.year) !== grade) return;
      this.cache = {user, grade, rows: []};
      this.error = /PGRST205|42P01|PGRST202/.test(e?.code || '')
        ? 'Die Datenbank-Verbindung für English Practice ist noch nicht eingerichtet.'
        : 'Testergebnisse konnten nicht geladen werden. Bitte erneut versuchen.';
      this.loadedAt = Date.now();
    } finally {
      this.busy = false;
      if (this.userKey() === user && Number(State.year) === grade &&
          (State.view === 'core' || State.view === 'students')) render();
    }
  },
  rows() {
    return this.cache?.user === this.userKey() && this.cache?.grade === Number(State.year)
      ? this.cache.rows : [];
  },
  panel(pupil = null) {
    if (!this.userKey()) return '';
    const fresh = this.cache?.user === this.userKey() && this.cache?.grade === Number(State.year);
    if (!fresh || Date.now() - this.loadedAt >= 15000) setTimeout(() => this.refresh(), 0);
    const pupils = pupil ? [pupil] : filteredPupils();
    const allowed = new Map(pupils.map(p => [p.id, p]));
    const rows = this.rows().filter(r => allowed.has(r.pupil_id));
    const counts = new Map();
    // Number attempts per pupil and task, in chronological order.
    const attempts = new Map();
    for (const r of [...this.rows()].reverse()) {
      const key = r.pupil_id + '|' + r.task_key;
      counts.set(key, (counts.get(key) || 0) + 1); attempts.set(r.id, counts.get(key));
    }
    return `<section class="card ep-results"><h2>English Practice · Testergebnisse</h2>
      <p class="mini">Automatisch übertragene Selbsttests. Die Kompetenzbewertungen werden weiterhin von der Lehrkraft vergeben.</p>
      <div class="toolbar"><button class="chip" onclick="EnglishPractice.refresh(true)">↻ Ergebnisse laden</button>
      ${canManageRoster() ? `<button class="chip dark" onclick="EnglishPractice.printCodes(${pupil ? `'${esc(pupil.id)}'` : ''})">${pupil ? 'Persönlichen QR-Code' : 'QR-Codes für die Auswahl'} erstellen</button>${pupil ? `<button class="chip" onclick="EnglishPractice.revoke('${esc(pupil.id)}')">Code sperren</button>` : ''}` : ''}</div>
      ${fresh && this.error ? `<p role="status">${esc(this.error)}</p>` : ''}
      ${!fresh ? '<p role="status">Testergebnisse werden geladen …</p>' : rows.length ?
      `<div style="overflow-x:auto"><table style="width:100%"><thead><tr>${pupil ? '' : '<th>Kind</th>'}<th>Thema</th><th>Datum</th><th>Ergebnis</th><th>Versuch</th></tr></thead><tbody>${rows.map(r => `<tr>
        ${pupil ? '' : `<td>${esc(allowed.get(r.pupil_id)?.short)}</td>`}<td>${esc(r.topic)}</td>
        <td>${esc(new Date(r.submitted_at).toLocaleString('de-DE', {dateStyle:'short',timeStyle:'short'}))}</td>
        <td>${Number(r.points)}/${Number(r.max_points)} P. · ${Math.round(r.points/r.max_points*100)} %</td>
        <td>${attempts.get(r.id) || 1}</td></tr>`).join('')}</tbody></table></div>` :
      !this.error ? '<p class="mini">Noch keine übertragenen Tests für diese Auswahl.</p>' : ''}</section>`;
  },
  async revoke(pupilId) {
    if (!canManageRoster() || !confirm('Diesen Übungscode sperren? Die vorhandenen Testergebnisse bleiben erhalten.')) return;
    try {
      const r = await Auth.cloudClient.rpc('kompass_english_revoke_code', {p_grade:Number(State.year),p_pupil_id:pupilId});
      if (r.error) throw r.error;
      toast('Übungscode gesperrt.');
    } catch (e) { alert('Code konnte nicht gesperrt werden: ' + (e.message || e)); }
  },
  async printCodes(pupilId = null) {
    if (!canManageRoster() || !this.userKey()) return;
    const pupils = pupilId ? (Store.pupils || []).filter(p => p.id === pupilId) : filteredPupils();
    if (!pupils.length) return toast('Bitte zuerst Kinder auswählen.');
    if (!confirm(`Für ${pupils.length} Kind(er) neue persönliche Codes erstellen? Bereits verteilte Codes dieser Kinder werden dadurch ungültig. Bitte die neue Druckansicht sichern oder ausdrucken.`)) return;
    // Open synchronously so iPad popup blocking does not discard the print window.
    const w = window.open('', '_blank');
    if (!w) return alert('Bitte Pop-ups für KOMPASS erlauben und erneut versuchen.');
    w.opener = null;
    w.document.write('<!doctype html><html lang="de"><head><meta charset="utf-8"><title>English Practice · persönliche QR-Codes</title><style>body{font:15px system-ui;margin:24px;color:#222} .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.code{border:1px solid #bbb;padding:14px;text-align:center;break-inside:avoid}.code svg{width:150px;height:150px;max-width:100%}.code p{font-size:12px}.code a{color:#9b142a}button{font:inherit;padding:10px} @media print{.actions{display:none}body{margin:0}.code{page-break-inside:avoid}}</style></head><body><div class="actions"><h1>English Practice</h1><p>Persönliche QR-Codes · bitte ins Lerntagebuch kleben und nicht weitergeben.</p><button onclick="window.print()">Drucken / als PDF sichern</button></div><p id="status">Codes werden erstellt … Bitte das Fenster offen lassen.</p><div class="cards" id="cards"></div></body></html>');
    w.document.close();
    const grade = Number(State.year), user = this.userKey();
    let count = 0;
    try {
      for (const p of pupils) {
        if (w.closed || this.userKey() !== user) throw new Error('Abgebrochen.');
        const r = await Auth.cloudClient.rpc('kompass_english_issue_code', {p_grade:grade,p_pupil_id:p.id});
        if (r.error) throw r.error;
        const url = 'https://julianeschoene-ops.github.io/Schedule/#code=' + r.data;
        const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
        const card = w.document.createElement('section'); card.className = 'code';
        card.innerHTML = `<b>${esc(p.first)} ${esc(p.last)}</b><p>${esc(p.className)} · English Practice</p>${qr.createSvgTag(4, 16)}<p>Scannen · Namen prüfen · üben</p><a href="${esc(url)}">Persönlichen Übungslink öffnen</a><p>Beenden: „End practice & reset“</p>`;
        w.document.getElementById('cards').appendChild(card); count++;
      }
      w.document.getElementById('status').textContent = count + ' Codes erstellt. Jetzt drucken oder als PDF sichern.';
    } catch (e) {
      if (!w.closed) w.document.getElementById('status').textContent = `${count} Codes erstellt. Weitere Codes konnten nicht erstellt werden: ${e.message || e}. Bereits erstellte Codes bitte sichern.`;
    }
  }
};
// No browser-wide result cache: a shared iPad must not retain another teacher's results.
setInterval(() => {
  if (document.visibilityState === 'visible' && Auth.isLoggedIn() &&
      ((State.view === 'core' && State.subject === 'Englisch') || (State.view === 'students' && State.pupil)))
    EnglishPractice.refresh();
}, 15000);
