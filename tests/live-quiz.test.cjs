const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');const crypto=require('node:crypto').webcrypto;
function quiz(overrides={}){const c={crypto,...overrides};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../live-quiz.js','utf8')+';globalThis.quiz=LiveQuiz',c);return c.quiz}
const lists=JSON.parse(fs.readFileSync(__dirname+'/../quiz-vocabulary.json'));
test('question generation produces exactly 15 solvable questions for all sufficiently large lists',()=>{const q=quiz();for(const v of Object.values(lists).filter(v=>!v.assessmentOnly&&v.words.length>=15)){const questions=q.buildQuestions(v.words,'mixed');assert.equal(questions.length,15);assert.equal(new Set(questions.map(q=>q.prompt)).size,15);for(const item of questions){assert.equal(item.options.length,4);assert.ok(item.answer>=0&&item.answer<4)}}});
test('small lists can use both directions and reject insufficient pools',()=>{const q=quiz();assert.equal(q.buildQuestions(lists['18'].words,'mixed').length,15);assert.throws(()=>q.buildQuestions(lists['18'].words,'de'),/weitere Liste/)});
test('synonyms never become wrong choices for an ambiguous prompt',()=>{const q=quiz();for(let n=0;n<20;n++){const qs=q.buildQuestions(lists['17'].words,'mixed');for(const item of qs.filter(q=>q.prompt==='right')){const others=item.options.filter((_,i)=>i!==item.answer);assert.ok(!others.includes('rechts'));assert.ok(!others.includes('richtig; korrekt'));}}});

test('list entry links teachers to the matching list and preselects it',async()=>{
 const q=quiz({VOCAB:lists,EnglishPractice:{userKey:()=> 'teacher'},sessionStorage:{getItem:()=>null},fetch:async()=>({ok:true,json:async()=>lists})});let html='';q.close=()=>{};q.shell=s=>html=s;q.openList('15');assert.match(html,/quizList=15/);assert.match(html,/Live-Quiz beitreten/);await q.setup(true,'15');assert.match(html,/value="15" checked/);assert.ok(!html.includes('value="16" checked'));
});
test('teacher launch waits for authentication before opening the selected list',()=>{
 let callback,selection,removed=false;const q=quiz({location:{search:'?quizList=u5-2',href:'https://example.test/?quizList=u5-2'},URL,URLSearchParams,EnglishPractice:{userKey:()=> 'teacher'},Auth:{currentUser:()=>({id:'teacher'})},history:{replaceState:()=>removed=true},setInterval:f=>(callback=f,1),clearInterval:()=>{}});q.setup=(force,key)=>selection={force,key};q.teacherEntry();callback();assert.deepEqual(selection,{force:true,key:'u5-2'});assert.ok(removed);
});
