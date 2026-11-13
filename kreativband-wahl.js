/* Optional Kreativband booking. Legacy attendance remains available on the offer page. */
const KreativbandWahl = {
  monday(date = new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Berlin'})) {
    const day = new Date(date + 'T12:00:00Z');
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    return day.toISOString().slice(0, 10);
  },

  dateLabel(date) {
    return new Intl.DateTimeFormat('de-DE', {weekday:'short', day:'2-digit', month:'2-digit', timeZone:'UTC'})
      .format(new Date(date + 'T12:00:00Z'));
  },

  periodLabel(period) {
    return Number(period) === 56 ? '5. + 6. Stunde' : period + '. Stunde';
  },

  async rpc(name, params, client = Auth.cloudClient) {
    const {data,error} = await client.rpc('kompass_kb_' + name,params);
    if (error) {
      if (['PGRST202','PGRST205'].includes(error.code)) throw new Error('Die Online-Wahl ist in KOMPASS noch nicht eingerichtet.');
      throw error;
    }
    return data;
  },

  async run(button, status, action) {
    if (button?.disabled) return false;
    if (button) button.disabled = true;
    status.textContent = 'Lädt …';
    try {
      await action();
      status.textContent = '';
      return true;
    } catch (error) {
      status.textContent = error.message || 'Die Änderung konnte nicht gespeichert werden.';
      return false;
    } finally {
      if (button) button.disabled = false;
    }
  },

  cloudStaff() {
    return Auth.session?.mode === 'cloud' && ['admin','teacher'].includes(Auth.currentUser()?.role);
  },

  planner() {
    if (!this.cloudStaff() || ![5,6,7].some(grade => Auth.canLead(grade))) return '';
    return `<details class="card kb-choice" ontoggle="if(this.open && !this.dataset.ready) KreativbandWahl.openPlan(this)">
      <summary><strong>Kreativband-Wahl vorbereiten</strong></summary>
      <p>Wähle eine Woche. Für Kinder öffnen sich die Buchungen, sobald du ihren Jahrgang freigibst.</p>
      <p><a href="kreativband.html" target="_blank" rel="noopener">Schüleransicht öffnen</a></p>
      <label>Woche ab <input type="date" data-week value="${this.monday()}" required></label>
      <button class="chip" type="button" onclick="KreativbandWahl.plan(this,'read')">Woche laden</button>
      <p role="status"></p><div data-plan></div>
    </details>`;
  },

  async openPlan(panel) {
    panel.dataset.ready = '1';
    await this.plan(panel.querySelector('button'),'read');
  },

  async plan(button, action, data = {}) {
    const panel = button.closest('details.kb-choice');
    const monday = panel.querySelector('[data-week]').value;
    const status = panel.querySelector('[role=status]');
    const output = panel.querySelector('[data-plan]');
    if (action !== 'read' && output.dataset.week !== monday) {
      status.textContent = 'Bitte zuerst die ausgewählte Woche laden.';
      return;
    }
    if (action === 'release') data.grades = [...panel.querySelectorAll('[name=kb-grade]:checked')].map(input => Number(input.value));
    if (action === 'cancel' && !confirm('Angebot für diesen Termin absagen? Die betroffenen Kinder können neu wählen.')) return;
    if (action === 'capacity') data.capacity = Number(button.parentElement.querySelector('input').value);
    if (action === 'add') {
      const fields = new FormData(button.form);
      const offer = Store.activities.find(a => String(a.id) === fields.get('activity') && a.type === 'Kreativband');
      if (!offer) return;
      data = {activity: String(offer.id), title: offer.name, day: fields.get('day'),
        period: Number(fields.get('period')), capacity: Number(fields.get('capacity')), sport: fields.has('sport')};
    }
    await this.run(button,status,async () => {
      const week = await this.rpc('plan',{p_action:action,p_monday:monday,p_data:data});
      output.dataset.week = monday;
      output.innerHTML = this.planBody(week,monday);
    });
  },

  planBody(week,monday) {
    const offers = Store.activities.filter(a => a.type === 'Kreativband').slice().sort((a,b) => a.name.localeCompare(b.name,'de'));
    const last = new Date(monday + 'T12:00:00Z');
    last.setUTCDate(last.getUTCDate() + 4);
    return `<div class="toolbar"><button class="chip" type="button" onclick="KreativbandWahl.plan(this,'copy')">Vorwoche kopieren</button></div>
      <fieldset><legend>Online-Wahl für diese Woche</legend>
      ${[5,6,7].map(grade => `<label><input type="checkbox" name="kb-grade" value="${grade}" ${week.grades.includes(grade) ? 'checked':''}> Jahrgang ${grade}</label>`).join(' ')}
      <button class="chip" type="button" onclick="KreativbandWahl.plan(this,'release')">Freigabe speichern</button>
      <p class="mini">${week.grades.length ? 'Freigegeben für Jahrgang ' + week.grades.join(', ') : 'Entwurf · Online-Wahl geschlossen'}</p></fieldset>
      <ul>${week.offers.map(o => `<li><p><strong>${esc(o.title)}</strong> · ${this.dateLabel(o.day)} · ${this.periodLabel(o.period)} ${o.sport ? ' · Sport':''}
      ${o.cancelled ? ' · abgesagt' : ' · ' + o.booked + ' gebucht'}</p>
      ${o.cancelled ? '' : `<div class="toolbar"><label>Plätze <input type="number" min="1" max="500" value="${o.capacity}"></label>
        <button class="chip" type="button" onclick="KreativbandWahl.plan(this,'capacity',{id:'${o.id}'})">Platzzahl speichern</button>
        <button class="chip" type="button" onclick="KreativbandWahl.plan(this,'cancel',{id:'${o.id}'})">Termin absagen</button></div>`}</li>`).join('') || '<li>Für diese Woche sind noch keine Angebote geplant.</li>'}</ul>
      <form onsubmit="event.preventDefault();KreativbandWahl.plan(event.submitter,'add')">
      <h3>Termin hinzufügen</h3>
      <div class="formgrid">
      <label>Angebot <select name="activity" required onchange="KreativbandWahl.defaults(this.form)">
      <option value="">Bitte wählen</option>${offers.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label>
      <label>Tag <input name="day" type="date" min="${monday}" max="${last.toISOString().slice(0,10)}" value="${monday}" required></label>
      <label>Stunde <select name="period"><option value="5">5. Stunde</option><option value="6">6. Stunde</option><option value="56">5. + 6. Stunde</option></select></label>
      <label>Plätze <input name="capacity" type="number" min="1" max="500" value="24" required></label>
      <label><input name="sport" type="checkbox"> Sportangebot</label></div>
      <button class="chip dark" type="submit">In die Wochenplanung aufnehmen</button></form>`;
  },

  defaults(form) {
    const chosen = form.elements.activity.selectedOptions[0];
    if (chosen.value === 'creative_heimbacher_hof') form.elements.period.value = '56';
    form.elements.sport.checked = /sport|heimbacher/i.test(chosen.textContent);
  },

  attendance(offer,date) {
    if (!this.cloudStaff() || offer.type !== 'Kreativband') return '';
    return `<details class="card kb-attendance" ontoggle="if(this.open) KreativbandWahl.loadAttendance(this)"
      data-activity="${esc(offer.id)}" data-day="${esc(date)}">
      <summary><strong>Online gebuchte Plätze</strong></summary>
      <p role="status"></p><div data-list></div>
    </details>`;
  },

  attendanceDateChanged(date) {
    const panel = document.querySelector('.kb-attendance');
    if (!panel) return;
    panel.dataset.day = date;
    panel.querySelector('[data-list]').replaceChildren();
    panel.querySelector('[role=status]').textContent = '';
    if (date && panel.open) this.loadAttendance(panel);
  },

  async loadAttendance(panel, button = null) {
    const status = panel.querySelector('[role=status]');
    const list = panel.querySelector('[data-list]');
    const params = {p_day:panel.dataset.day,p_activity:panel.dataset.activity};
    if (!params.p_day || panel.dataset.saving) return;
    if (button) panel.dataset.saving = '1';
    await this.run(button,status,async () => {
      if (button) {
        const row = button.closest('[data-pupil]').dataset;
        const syncReady = typeof CreativeSyncV2 !== 'undefined' && CreativeSyncV2.ready;
        if (syncReady) {
          await CreativeSyncV2.flush();
          if (Object.values(CreativeSyncV2.pending()).some(v => v.kind === 'visit' &&
            v.pupilId === row.pupil && v.value.date === params.p_day && v.activityId === params.p_activity)) {
            throw new Error('Bitte warte auf die Cloud-Bestätigung der manuellen Einträge.');
          }
        }
        Object.assign(params,{p_offer:row.offer,p_pupil:row.pupil,p_period:Number(row.period),p_status:button.dataset.status});
      }
      const rows = await this.rpc('attendance',params);
      if (button && typeof CreativeSyncV2 !== 'undefined' && CreativeSyncV2.ready) {
        try { await CreativeSyncV2.refresh(); }
        catch (error) { toast('Anwesenheit gespeichert. Die Besuchszahlen werden beim nächsten Abgleich aktualisiert.'); }
      }
      if (!panel.isConnected || panel.dataset.day !== params.p_day) return;
      list.innerHTML = rows.length ? rows.map(row => `<div class="toolbar" data-offer="${row.offer}"
        data-pupil="${esc(row.pupil)}" data-period="${row.period}">
        <strong>${esc(row.name)}</strong><span>${this.periodLabel(row.period)}</span>
        <span>${({present:'Anwesend',missing:'Nicht erschienen',excused:'Entschuldigt'})[row.status] || 'Offen'}</span>
        ${row.status === 'present' || params.p_day > new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'}) ? '' :
          [['present','Anwesend'],['missing','Nicht erschienen'],['excused','Entschuldigt'],['clear','Offen']].filter(([id]) =>
            id !== row.status && (id !== 'clear' || row.status)).map(([id,label]) => `<button type="button" class="chip"
            data-status="${id}" onclick="KreativbandWahl.loadAttendance(this.closest('details'),this)">${label}</button>`).join('')}
        </div>`).join('') : '<p>Für diesen Termin liegen keine Online-Buchungen vor.</p>';
    });
    delete panel.dataset.saving;
    if (panel.isConnected && panel.open && panel.dataset.day && panel.dataset.day !== params.p_day) {
      this.loadAttendance(panel);
    }
  },

  visits(pupil) {
    const activityNames = new Map(Store.activities.filter(a => a.type === 'Kreativband')
      .map(a => [String(a.id), a.name]));
    return Object.values(Store.dailyCreativeVisits || {})
      .filter(v => v && String(v.pupilId) === String(pupil) && !v.cancelledAt && creativeDateKey(v.date)
        && activityNames.has(String(v.activityId)))
      .map(v => ({name: activityNames.get(String(v.activityId)),date:creativeDateKey(v.date),period:v.period}))
      .sort((a,b) => b.date.localeCompare(a.date) || (b.period || 0) - (a.period || 0));
  },

  coachPanel(pupil) {
    return `<details class="card kb-coach" data-pupil="${esc(pupil.id)}" ontoggle="if(this.open) KreativbandWahl.loadCoach(this)">
      <summary><strong>Kreativband</strong></summary>
      <label>Besuche ab <input type="date" data-since onchange="KreativbandWahl.showVisits(this.closest('details'))"></label>
      <div data-visits></div>
      ${this.cloudStaff() ? '<h3>Buchung und Rückmeldungen</h3><p role="status"></p><div data-coaching></div>':''}
    </details>`;
  },

  showVisits(panel) {
    const since = panel.querySelector('[data-since]').value;
    const grouped = new Map();
    for (const visit of this.visits(panel.dataset.pupil)) {
      if (since && visit.date < since) continue;
      if (!grouped.has(visit.name)) grouped.set(visit.name,[]);
      grouped.get(visit.name).push(visit);
    }
    panel.querySelector('[data-visits]').innerHTML = [...grouped].sort(([a],[b]) => a.localeCompare(b,'de'))
      .map(([name,visits]) => `<details><summary>${esc(name)} · ${visits.length} ${visits.length === 1 ? 'Besuch':'Besuche'}</summary>
        <ul>${visits.map(v => `<li>${esc(v.date.split('-').reverse().join('.'))}${v.period ? ' · ' + this.periodLabel(v.period):''}</li>`).join('')}</ul>
        </details>`).join('') || '<p>In diesem Zeitraum sind keine Besuche erfasst.</p>';
  },

  async loadCoach(panel, button = null, action = 'read') {
    this.showVisits(panel);
    const status = panel.querySelector('[role=status]');
    if (!status) return;
    const pupil = panel.dataset.pupil;
    const params = {p_pupil:pupil,p_action:action};
    if (action === 'block') {
      if (!confirm('Kreativband für diese Woche sperren und offene Buchungen freigeben?')) return;
      params.p_monday = button.form.elements.week.value;
      params.p_data = {location:button.form.elements.location.value};
    }
    if (action === 'unblock') params.p_monday = button.dataset.week;
    if (action === 'note') {
      params.p_data = {offer:button.dataset.offer,period:Number(button.dataset.period),note:button.parentElement.querySelector('textarea').value};
    }
    if (action === 'code') {
      if (!confirm('Persönlichen KOMPASS-Code ausstellen? Ein bisheriger Code wird dadurch ungültig.')) return;
      await this.run(button,status,async () => {
        const code = await this.rpc('issue_code',{p_pupil:pupil});
        const field = panel.querySelector('[data-code]');
        field.value = code.match(/.{1,8}/g).join('-');
        field.hidden = false;
        field.focus();
        field.select();
      });
      return;
    }
    await this.run(button,status,async () => {
      const info = await this.rpc('coaching',params);
      panel.querySelector('[data-coaching]').innerHTML = `
        <button class="chip" type="button" onclick="KreativbandWahl.loadCoach(this.closest('details'),this,'code')">KOMPASS-Code ausstellen</button>
        <input data-code hidden readonly aria-label="Persönlicher KOMPASS-Code">
        <form onsubmit="event.preventDefault();KreativbandWahl.loadCoach(this.closest('details'),event.submitter,'block')">
          <div class="formgrid"><label>Woche ab <input type="date" name="week" value="${this.monday()}" required></label>
          <label>Betreuungsort <input name="location" maxlength="160"></label></div>
          <button class="chip" type="submit">Für eine Woche sperren</button>
        </form>
        ${info.blocks.map(b => `<p><strong>Gesperrt ab ${esc(b.monday.split('-').reverse().join('.'))}</strong>
          ${b.location ? ' · ' + esc(b.location) : ''} <button type="button" class="chip" data-week="${b.monday}"
          onclick="KreativbandWahl.loadCoach(this.closest('details'),this,'unblock')">Sperre aufheben</button></p>`).join('')}
        ${info.absences.map(a => `<article class="classNote"><strong>${esc(a.day.split('-').reverse().join('.'))} · ${this.periodLabel(a.period)}
          · ${esc(a.title)} · ${a.status === 'excused' ? 'entschuldigt':'nicht erschienen'}</strong>
          <div><label>Gesprächsnotiz <textarea maxlength="1200">${esc(a.note)}</textarea></label>
          <button class="chip" type="button" data-offer="${a.offer}" data-period="${a.period}"
            onclick="KreativbandWahl.loadCoach(this.closest('details'),this,'note')">Notiz speichern</button></div></article>`).join('')
          || '<p>Keine Rückmeldungen zu versäumten Buchungen.</p>'}`;
    });
  }
};
