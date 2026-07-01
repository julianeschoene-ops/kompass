function students(){
  const h = header('Schüler','Schülerdatenbank für Jahrgänge 5–7.');
  shell(h + `
    <div class="grid">
      ${[5,6,7].map(y=>`<button class="tile" onclick="State.year=${y};renderStudentsList()"><b>Jahrgang ${y}</b><span>anzeigen</span></button>`).join('')}
    </div>
    <div class="section">Alle Schüler*innen</div>
    <div class="students">${Store.pupils.map(studentCard).join('')}</div>
  `);
}

function renderStudentsList(){
  const list = Store.pupils.filter(p=>p.className.startsWith(String(State.year)));
  shell(header('Jahrgang '+State.year,'Schüler*innen anzeigen und Profile öffnen.')+
    `<button class="chip" onclick="setView('students')">zurück</button><div class="students">${list.map(studentCard).join('')}</div>`);
}

function studentCard(p){
  return `<div class="card"><span class="dot ${p.color}"></span><b>${p.short}</b><p>${p.className} · Coach: ${p.coach} · Niveau: ${p.level}</p></div>`;
}
