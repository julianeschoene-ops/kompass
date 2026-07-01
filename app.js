function dashboard(){
  const h = header('Dashboard','Arbeitsoberfläche für Werkstattunterricht und Schüleransicht.');
  shell(h + `
    <div class="grid">
      <button class="tile" onclick="setView('workshop')"><b>Werkstatt erfassen</b><span>Ganze Stufe alphabetisch · Sprint → Fach → Kompetenz</span></button>
      <button class="tile" onclick="setView('students')"><b>Schüleransicht</b><span>Verlauf und Notizen pro Schüler*in</span></button>
      <button class="tile" onclick="setView('admin')"><b>Verwaltung</b><span>Kompetenzen bearbeiten</span></button>
    </div>
    <div class="section">Prinzip</div>
    <div class="card">
      <p>Im Werkstattunterricht wird zunächst die ganze Stufe angezeigt. Gefiltert wird nach Sprint, Fach, Team, Niveau oder Suche. Eine feste Sprintgruppen-Zuordnung ist nicht nötig.</p>
    </div>
  `);
}

render();
