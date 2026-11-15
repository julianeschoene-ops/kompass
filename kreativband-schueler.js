(() => {
  const client = window.supabase.createClient(Auth.cloud.url,Auth.cloud.anonKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const login = document.getElementById('kb-login');
  const booking = document.getElementById('kb-booking');
  const codeField = document.getElementById('kb-code');
  const week = document.getElementById('kb-week');
  const offers = document.getElementById('kb-offers');
  const status = document.getElementById('kb-status');
  const refresh = document.getElementById('kb-refresh');
  let code = '';
  let displayedWeek = '';
  let request = 0;
  let busy = false;
  week.value = KreativbandWahl.monday();

  function element(tag,text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function show(data) {
    offers.replaceChildren();
    if (!data.open) {
      offers.append(element('p','Die Online-Wahl ist für diese Woche geschlossen.'));
      return;
    }
    if (data.blocked) {
      offers.append(element('p','Für diese Woche ist deine Kreativband-Wahl gesperrt.'));
      if (data.location) offers.append(element('p','Dein Betreuungsort: ' + data.location));
      return;
    }

    offers.append(element('p','Sportangebote gebucht: ' + data.sportCount + ' von 4'));
    if (data.grade === 7) offers.append(element('p','Am Montag und Donnerstag teilen euch die Lehrkräfte ein.'));
    if (!data.offers.length) offers.append(element('p','Für diese Woche sind keine Angebote eingetragen.'));
    let date = '';
    let card;
    for (const offer of data.offers) {
      if (offer.day !== date) {
        date = offer.day;
        card = document.createElement('section');
        card.className = 'card';
        card.append(element('h2',KreativbandWahl.dateLabel(date)));
        offers.append(card);
      }
      const row = document.createElement('div');
      row.className = 'kb-slot';
      const description = document.createElement('div');
      description.append(element('strong',offer.title),element('div',KreativbandWahl.periodLabel(offer.period)));
      const reason = offer.cancelled ? 'Abgesagt · bitte neu wählen' : offer.booked ? 'Gebucht' :
        !offer.selectable ? 'Online-Wahl geschlossen' :
        offer.occupied ? 'Stunde bereits belegt' : offer.sport && data.sportCount >= 4 ? 'Sportlimit erreicht' :
        offer.free ? offer.free + (offer.free === 1 ? ' freier Platz' : ' freie Plätze') : 'Ausgebucht';
      description.append(element('div',reason));
      row.append(description);
      if (!offer.cancelled && offer.selectable && (offer.booked || (!offer.occupied && offer.free && !(offer.sport && data.sportCount >= 4)))) {
        const action = element('button',offer.booked ? 'Stornieren' : 'Buchen');
        action.className = 'chip dark';
        action.type = 'button';
        action.onclick = () => load(action,offer);
        row.append(action);
      }
      card.append(row);
    }
  }

  async function load(button, offer) {
    if (busy) return;
    if (!week.value || (offer && week.value !== displayedWeek)) return;
    const currentWeek = KreativbandWahl.monday(week.value);
    week.value = currentWeek;
    busy = true;
    const pending = ++request;
    const credentials = code || codeField.value.trim();
    const active = () => pending === request;
    if (button) button.disabled = true;
    week.disabled = true;
    status.textContent = 'Lädt …';
    try {
      const data = await KreativbandWahl.rpc('student',{
        p_code:credentials,p_monday:currentWeek,p_offer:offer?.id ?? null,p_cancel:!!offer?.booked
      },client);
      if (!active()) return;
      code = credentials;
      codeField.value = '';
      login.hidden = true;
      booking.hidden = false;
      displayedWeek = currentWeek;
      show(data);
      status.textContent = '';
    } catch (error) {
      if (active()) status.textContent = error.message || 'Die Woche konnte nicht geladen werden.';
    } finally {
      if (button) button.disabled = false;
      if (active()) { busy = false; week.disabled = false; }
    }
  }

  login.onsubmit = event => { event.preventDefault(); load(event.submitter); };
  refresh.onclick = () => load(refresh);
  week.onchange = () => { offers.replaceChildren(); displayedWeek = ''; load(refresh); };
  document.getElementById('kb-logout').onclick = () => {
    request++;
    busy = false;
    week.disabled = false;
    code = '';
    codeField.value = '';
    displayedWeek = '';
    offers.replaceChildren();
    status.textContent = '';
    booking.hidden = true;
    login.hidden = false;
    codeField.focus();
  };
})();
