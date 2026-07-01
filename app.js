function dashboard(){
  const h = header('Dashboard','Arbeitsoberfläche für Kompetenzentwicklung, Werkstatt, Kreativband und Clubs.');
  shell(h + `
    <div class="grid">
      <button class="tile" onclick="setView('werkstatt')"><b>Werkstatt</b><span>5 Sprints · Fach · Niveau · Notizen</span></button>
      <button class="tile" onclick="setView('kreativ')"><b>Kreativband</b><span>Teilnahme, Engagement, optionale Kompetenzen</span></button>
      <button class="tile" onclick="setView('clubs')"><b>Clubs</b><span>War da, eingebracht, Hinweis</span></button>
    </div>
    <div class="section">Schnellzugriffe</div>
    <div class="grid">
      <button class="tile" onclick="setView('lernen')"><b>Lernen</b><span>Kernfächer</span></button>
      <button class="tile" onclick="setView('students')"><b>Schüler</b><span>Profile und Verlauf</span></button>
      <button class="tile" onclick="setView('admin')"><b>Verwaltung</b><span>Einträge bearbeiten</span></button>
    </div>
    <div class="section">Hinweis</div>
    <div class="card"><p>Krankmeldungen und Fehlzeiten bleiben in IServ. KOMPASS dokumentiert Lernentwicklung, Werkstatt, Kreativband, Clubs und Notizen.</p></div>
  `);
}

render();
