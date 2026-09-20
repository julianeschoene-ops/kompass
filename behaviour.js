const BEHAVIOUR_GROUPS=[
 ['Lernatelier',['arbeitet selbstständig und motiviert','arbeitet überwiegend selbstständig','benötigt gelegentlich Unterstützung','muss häufig motiviert werden']],
 ['Konzentration',['nutzt die Arbeitszeit sinnvoll','arbeitet meist konzentriert','lässt sich leicht ablenken','beendet Aufgaben selten']],
 ['Organisation',['arbeitet strukturiert und organisiert','hält Materialien und Arbeitsplatz in Ordnung','verliert gelegentlich den Überblick','benötigt häufig Hilfe bei der Planung']],
 ['Zusammenarbeit',['arbeitet konstruktiv mit anderen zusammen','hilft anderen zuverlässig','nimmt Hilfe gut an','beteiligt sich wenig an der Zusammenarbeit']],
 ['Selbstkontrolle',['kontrolliert Ergebnisse sorgfältig','verbessert Fehler selbstständig','benötigt Erinnerungen zur Kontrolle']]
];
let behaviourPupil=null,behaviourDraft=null,behaviourDraftPupil=null;

function emptyBehaviour(){return {observations:[],teamStars:0,note:'',history:[]};}
function storedBehaviour(id){const b=Store.behaviour[id]||emptyBehaviour();return {...emptyBehaviour(),...b,observations:[...(b.observations||[])],history:[...(b.history||[])]};}
function resetBehaviourDraft(){behaviourDraft=null;behaviourDraftPupil=null;}
function selectBehaviourPupil(id){behaviourPupil=id;resetBehaviourDraft();render();}
function getBehaviourDraft(id){if(behaviourDraftPupil!==id||!behaviourDraft){behaviourDraft=storedBehaviour(id);behaviourDraftPupil=id;}return behaviourDraft;}
function behaviourHistoryTime(h){if(h?.at){const d=new Date(h.at);if(!Number.isNaN(d.getTime()))return d.toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});}return h?.date||'—';}
function behaviourHistoryHtml(history){if(!history?.length)return '<p class="mini">Noch kein Verlauf.</p>';return history.slice().reverse().map(h=>{const observations=(h.observations||[]).length?esc(h.observations.join(' · ')):'keine Auswahl';return `<div class="history"><b>${esc(behaviourHistoryTime(h))} · ${esc(h.teacher||'Unbekannt')}</b><br>Beobachtungen: ${observations}<br>TeamStar-Karten: ${Number(h.teamStars)||0}${h.note?'<br>Notiz: '+esc(h.note):''}</div>`;}).join('');}

function behaviour(){
 const pupils=filteredPupils();
 if(!behaviourPupil&&pupils[0])behaviourPupil=pupils[0].id;
 const p=(Store.pupils||[]).find(x=>x.id===behaviourPupil)||pupils[0];
 let content=header('Arbeits- & Sozialverhalten','Einträge werden erst mit „Speichern“ übernommen und bleiben mit Name und Zeitpunkt im Verlauf sichtbar.');
 content+=`<div class="toolbar formgrid"><div><label>Jahrgang</label><select onchange="State.year=Number(this.value);behaviourPupil=null;resetBehaviourDraft();render()">${visibleYears().map(y=>`<option value="${y}" ${State.year===y?'selected':''}>Jahrgang ${y}</option>`).join('')}</select></div><div><label>Team</label><select onchange="State.team=this.value;behaviourPupil=null;resetBehaviourDraft();render()"><option value="alle">alle Teams</option>${TEAMS.map(t=>`<option ${State.team===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label>Schüler*in</label><select onchange="selectBehaviourPupil(this.value)">${pupils.map(x=>`<option value="${x.id}" ${p&&p.id===x.id?'selected':''}>${esc(x.short)}</option>`).join('')}</select></div></div>`;
 if(!p){shell(content+'<div class="card empty">Keine Schüler*innen vorhanden.</div>');return;}
 const b=getBehaviourDraft(p.id),saved=storedBehaviour(p.id);
 content+=`<div class="card"><h2>${esc(p.short)}</h2>${BEHAVIOUR_GROUPS.map(([title,items])=>`<div class="observationGroup"><b>${title}</b><div class="observationChoices">${items.map(x=>`<button class="observationBtn ${(b.observations||[]).includes(x)?'selected':''}" onclick="toggleObservation('${p.id}','${esc(x)}')">${(b.observations||[]).includes(x)?'✓ ':''}${x}</button>`).join('')}</div></div>`).join('')}<div class="formgrid"><div><label>Volle TeamStar-Karten (0–3)</label><input type="number" min="0" max="3" value="${Number(b.teamStars)||0}" oninput="setBehaviourDraftMeta('${p.id}','teamStars',Math.max(0,Math.min(3,Number(this.value))))"></div><div><label>Notiz (optional)</label><textarea oninput="setBehaviourDraftMeta('${p.id}','note',this.value)">${esc(b.note||'')}</textarea></div></div><div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="chip dark" onclick="saveBehaviour('${p.id}')">Speichern</button><button class="chip" onclick="discardBehaviourChanges('${p.id}')">Änderungen verwerfen</button></div><div class="section">Verlauf</div>${behaviourHistoryHtml(saved.history)}</div>`;
 shell(content);
}

function toggleObservation(id,text){const b=getBehaviourDraft(id);b.observations=b.observations||[];b.observations.includes(text)?b.observations=b.observations.filter(x=>x!==text):b.observations.push(text);render();}
function setBehaviourDraftMeta(id,key,value){const b=getBehaviourDraft(id);b[key]=value;}
function discardBehaviourChanges(id){behaviourDraft=storedBehaviour(id);behaviourDraftPupil=id;toast('Nicht gespeicherte Änderungen verworfen');render();}
function saveBehaviour(id){
 const previous=storedBehaviour(id),draft=getBehaviourDraft(id),observations=[...(draft.observations||[])],teamStars=Math.max(0,Math.min(3,Number(draft.teamStars)||0)),note=String(draft.note||'').trim();
 const unchanged=JSON.stringify({observations:previous.observations||[],teamStars:Number(previous.teamStars)||0,note:String(previous.note||'').trim()})===JSON.stringify({observations,teamStars,note});
 if(unchanged){toast('Keine Änderungen zu speichern');return;}
 const user=Auth.currentUser()||{},entry={id:uid('beh'),at:new Date().toISOString(),date:today(),teacher:user.name||State.teacher||'Unbekannt',userId:user.id||null,observations:[...observations],teamStars,note};
 const saved={observations,teamStars,note,history:[...(previous.history||[]),entry]};
 Store.behaviour[id]=saved;
 Store.save('Sozialverhalten gespeichert',{pupilId:id,teacher:entry.teacher});
 behaviourDraft={...saved,observations:[...saved.observations],history:[...saved.history]};behaviourDraftPupil=id;
 toast('Sozialverhalten in der Cloud gespeichert');render();
}
