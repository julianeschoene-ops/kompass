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


function settings(){
  shell(header('Einstellungen','Datensicherung, Wiederherstellung und Schuljahreswechsel.') + `
    <div class="grid2">
      <div class="card">
        <h2>Datensicherung</h2>
        <p>Solange KOMPASS noch keine zentrale Datenbank hat, liegen Einträge im Browser. Sichere die Daten vor jedem Update.</p>
        <button class="chip dark" onclick="downloadBackup()">Datensicherung herunterladen</button>
        <label style="display:block;margin-top:16px">Datensicherung wiederherstellen</label>
        <input type="file" accept=".json" onchange="restoreBackup(this.files[0])">
      </div>
      <div class="card">
        <h2>Schuljahreswechsel</h2>
        <p>Verschiebt aktive Schülerinnen und Schüler automatisch in den nächsten Jahrgang. Bewertungen, Notizen und LEBs bleiben erhalten.</p>
        <button class="chip dark" onclick="schoolYearTransition()">Schuljahreswechsel starten</button>
        <p class="mini">Beispiel: 5a → 6a, 6d → 7d. Jahrgang 7 wird markiert, aber nicht gelöscht.</p>
      </div>
    </div>
  `);
}
function downloadBackup(){ const blob=new Blob([JSON.stringify(Store.exportData(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kompass_datensicherung_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(a.href); }
function restoreBackup(file){ if(!file)return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(Store.importData(data)){toast('Daten wiederhergestellt'); render();} }catch(e){ alert('Die Datei konnte nicht gelesen werden.'); } }; reader.readAsText(file); }
function schoolYearTransition(){ if(!confirm('Schuljahreswechsel durchführen?\\n\\n5a wird zu 6a, 6a zu 7a usw.\\nBewertungen, Notizen und LEB-Texte bleiben erhalten.\\n\\nBitte vorher eine Datensicherung herunterladen.')) return; Store.pupils=Store.pupils.map(p=>{ const m=String(p.className||'').match(/^([567])([a-e])$/); if(!m)return p; const year=Number(m[1]); const letter=m[2]; if(year<7)return {...p,className:String(year+1)+letter}; return {...p,archivedFromYear7:true}; }); Store.metadata.lastSchoolYearTransition=new Date().toISOString(); Store.save(); State.year=Math.min(7,State.year+1); toast('Schuljahreswechsel durchgeführt'); render(); }
