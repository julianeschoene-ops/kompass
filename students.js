function students(){
  if(State.pupil) return studentProfile();

  const list = Store.pupils
    .filter(p => {
      const s = State.search.trim().toLowerCase();
      if(!s) return true;
      return (p.last+' '+p.first+' '+p.short).toLowerCase().includes(s);
    })
    .sort((a,b)=> a.last.localeCompare(b.last,'de') || a.first.localeCompare(b.first,'de'));

  let content = header('Schüler','Alphabetische Schüleransicht mit Coach, Team und Verlauf.');
  content += `<div class="toolbar"><label>Suche</label><input value="${State.search}" oninput="State.search=this.value;render()" placeholder="Name suchen..."></div>`;
  content += `<table class="studentTable"><thead><tr><th>Schüler*in</th><th>Team</th><th>Coach</th><th>Klasse</th><th>Niveau</th><th></th></tr></thead><tbody>`;
  content += list.map(p=>`<tr>
    <td><span class="dot ${p.color}"></span>${p.short}</td>
    <td>${p.team}</td>
    <td>Coach ${p.coach}</td>
    <td>${p.className}</td>
    <td>${p.level}</td>
    <td><button class="chip dark" onclick="State.pupil='${p.id}';render()">Profil</button></td>
  </tr>`).join('');
  content += `</tbody></table>`;
  shell(content);
}

function studentProfile(){
  const p = Store.pupils.find(x=>x.id===State.pupil);
  const entries = Object.entries(Store.records).filter(([key])=>key.endsWith('|'+p.id));
  let content = header(`${p.short} (${p.team})`,`Coach ${p.coach} · ${p.className} · Niveau ${p.level}`);
  content += `<button class="chip" onclick="State.pupil=null;render()">zurück</button>`;
  content += `<div class="section">Werkstattverlauf</div><div class="list">`;
  content += entries.length ? entries.map(([key,r])=>{
    const compId = key.split('|')[0];
    const comp = Store.competencies.find(c=>c.id===compId);
    return `<div class="card"><b>${comp ? comp.text : compId}</b><p>${comp ? comp.subject+' · Sprint '+comp.sprint+' · Niveau '+comp.level : ''}</p><p>${statusLabel(r.current)} · erstmals sicher: ${r.firstGreen || '—'}</p><div class="mini">${r.history.length} Bewertung(en), ${(r.notes||[]).length} Notiz(en)</div></div>`;
  }).join('') : '<div class="card"><p>Noch keine Werkstatteinträge.</p></div>';
  content += `</div>`;
  shell(content);
}
