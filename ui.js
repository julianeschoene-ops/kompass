const State = {
  view: 'dashboard',
  role: 'Stufenleitung',
  teacher: 'Juliane',
  sprint: 1,
  subject: 'WBS',
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

function setView(view){
  State.view = view;
  State.dialog = null;
  State.pupil = null;
  render();
}

function toast(){
  const t = document.createElement('div');
  t.className = 'toast show';
  t.textContent = 'Gespeichert';
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
        <div class="sub">Werkstatt · Version 3.2</div>
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
          ${navButton('workshop','Werkstatt')}
          ${navButton('students','Schüler')}
          ${navButton('admin','Verwaltung')}
        </div>
      </aside>
      <main>${content}</main>
    </div>
  `;
  renderDialog();
}

function statusLabel(value){
  if(value === 'green') return '<span class="statusPill status-green">sicher</span>';
  if(value === 'yellow') return '<span class="statusPill status-yellow">teilweise</span>';
  if(value === 'red') return '<span class="statusPill status-red">noch nicht</span>';
  return '<span class="statusPill status-empty">nicht bewertet</span>';
}

function render(){
  const views = {dashboard, workshop, students, admin};
  (views[State.view] || dashboard)();
}
