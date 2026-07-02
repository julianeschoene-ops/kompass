function dashboard(){
  const h = header('Dashboard','Arbeitsoberfläche für Werkstattunterricht, Schüleransicht und LEB-Entwürfe.');
  shell(h + `
    <div class="grid">
      <button class="tile" onclick="setView('workshop')"><b>Werkstatt erfassen</b><span>Ganze Stufe alphabetisch · Sprint → Fach → Kompetenz</span></button>
      <button class="tile" onclick="setView('students')"><b>Schüleransicht</b><span>Verlauf und Notizen pro Schüler*in</span></button>
      <button class="tile" onclick="setView('leb')"><b>LEB-Entwurf</b><span>Text entsteht aus Ampelbewertung, Kompetenztyp und Notizen</span></button>
    </div>
    <div class="section">Grundprinzip</div>
    <div class="card">
      <p>Bewertet wird weiterhin nur mit rot, gelb und grün. Für LEB-Texte nutzt KOMPASS passende Formulierungen aus einem Formulierungskatalog.</p>
    </div>
  `);
}
render();
