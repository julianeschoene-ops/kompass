const State = {
  view: 'dashboard',
  role: 'Stufenleitung',
  teacher: 'Juliane',
  learning: null,
  subject: null,
  area: null,
  entry: null,
  sprint: 1,
  year: null,
  pupil: null
};

function canEdit(){ return State.role === 'Stufenleitung' || State.role === 'Admin'; }
function today(){ return new Date().toLocaleDateString('de-DE'); }
function recKey(entryId,pupilId){ return entryId + '|' + pupilId; }

function setView(view){
  State.view = view;
  State.learning = null;
  State.subject = null;
  State.area = null;
  State.entry = null;
  State.year = null;
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

function header(title, hint){
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
        <div class="sub">Arbeitsoberfläche · Version 3.1</div>
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
          ${navButton('lernen','Lernen')}
          ${navButton('werkstatt','Werkstatt')}
          ${navButton('kreativ','Kreativband')}
          ${navButton('clubs','Clubs')}
          ${navButton('students','Schüler')}
          ${navButton('admin','Verwaltung')}
          ${navButton('development','Entwicklung')}
        </div>
      </aside>
      <main>${content}</main>
    </div>
  `;
}

function render(){
  const views = {dashboard, lernen, werkstatt, kreativ, clubs, students, admin, development};
  (views[State.view] || dashboard)();
}
