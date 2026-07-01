function admin(){
  if(!canEdit()){ shell(header('Kein Zugriff','Nur Stufenleitung und Admin.')); return; }
  shell(header('Verwaltung','Einträge für Lernen, Werkstatt, Kreativband und Clubs.')+
    `<div class="list">${Store.entries.map(e=>`
      <div class="row">
        <div><b>${e.text}</b><div class="mini">${e.learning} · ${e.subject} · ${e.area} · Niveau ${e.level} · ${e.type}</div></div>
      </div>`).join('')}</div>`);
}

function development(){
  const rows = Object.entries(Store.records);
  shell(header('Entwicklung','Gespeicherte Bewertungen und Verläufe.')+
    `<div class="list">${rows.length ? rows.map(([k,r])=>`<div class="card"><p>${k}: aktuell ${r.current}, ${r.history.length} Veränderung(en)</p></div>`).join('') : '<div class="card"><p>Noch keine Einträge.</p></div>'}</div>`);
}
