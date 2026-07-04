const State = {
  view: 'dashboard',
  role: 'Stufenleitung',
  teacher: 'Juliane',
  year: 5,
  sprint: 2,
  subject: 'Geographie',
  competency: null,
  search: '',
  team: 'alle',
  level: 'alle',
  pupil: null,
  dialog: null
};

function today(){ return new Date().toLocaleDateString('de-DE'); }
function canEdit(){ return State.role === 'Stufenleitung' || State.role === 'Admin'; }
function recKey(competencyId,pupilId){ return competencyId + '|' + pupilId; }
function sprintName(n){ return (Store.sprints.find(s=>s.year===State.year && s.number===n)||{}).name || ('Sprint '+n); }

function setView(view){
  State.view = view;
  State.dialog = null;
  State.pupil = null;
  render();
}

function toast(msg='Gespeichert'){
  const t = document.createElement('div');
  t.className = 'toast show';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),900);
}

function header(title,hint){
  return `<h1>${title}</h1><div class="hint">${hint}</div>`;
}

function navButton(view,label){
  if(view === 'admin' && !canEdit()) return '';
  return `<button class="${State.view===view?'active':''}" onclick="setView('${view}')">${label}</button>`;
}

function shell(content){
  document.getElementById('app').innerHTML = `
    <div class="app">
      <aside>
        <div class="brand">KOMPASS</div>
        <div class="sub">Werkstatt + Kernfächer + LEB · Version 4.0</div>
        <div class="userbox">
          <label>Rolle</label>
          <select onchange="State.role=this.value;render()">
            <option ${State.role==='Lehrkraft'?'selected':''}>Lehrkraft</option>
            <option ${State.role==='Stufenleitung'?'selected':''}>Stufenleitung</option>
            <option ${State.role==='Admin'?'selected':''}>Admin</option>
          </select>
          <label>Lehrkraft</label>
          <select onchange="State.teacher=this.value;render()">
            <option ${State.teacher==='Juliane'?'selected':''}>Juliane</option>
            <option ${State.teacher==='Kollege Geo'?'selected':''}>Kollege Geo</option>
            <option ${State.teacher==='Nicole'?'selected':''}>Nicole</option>
          </select>
        </div>
        <div class="nav">
          ${navButton('dashboard','Dashboard')}
          ${navButton('workshop','Werkstattunterricht')}
          ${navButton('core','Kernfächer')}
          ${navButton('students','Schülerinnen & Schüler')}
          ${navButton('leb','Lernentwicklungsberichte')}
          ${navButton('admin','Kompetenzverwaltung')}
          ${navButton('settings','Einstellungen')}
        </div>
      </aside>
      <main>${content}</main>
    </div>
  `;
  renderDialog();
}

function statusLabel(value){
  if(value === 'green') return '<span class="statusPill status-green">erreicht</span>';
  if(value === 'yellow') return '<span class="statusPill status-yellow">teilweise erreicht</span>';
  if(value === 'red') return '<span class="statusPill status-red">noch nicht erreicht</span>';
  return '<span class="statusPill status-empty">nicht bewertet</span>';
}

function render(){
  const views = {dashboard, workshop, core: coreSubjects, students, leb, admin, settings};
  (views[State.view] || dashboard)();
}
