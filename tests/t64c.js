// v3.21.64 — 한글 문서에서 붙여 넣은 평가서가 저장 뒤 다시 열어도 그대로 남는지 (가상 자료)
const {boot,ok,done,KEY}=require('./h.js');const {stored57}=require('./fix57.js');const F=require('./fix64.js');
const DIR=require('path').resolve(__dirname,'..');
const clip=(html,text)=>({getData:k=>k==='text/html'?html:k==='text/plain'?text:'',files:[]});
let t=boot(DIR,{stored:stored57({withLegacy:false}),confirmFn:()=>true});t.ev("state.view='evaluation';paint()");
const e=new t.w.Event('paste',{bubbles:true,cancelable:true});e.clipboardData=clip(F.evalHtml,'');t.$('#hwpDocPaste').dispatchEvent(e);
t.flush();const raw=t.w.localStorage.getItem(KEY);
const t2=boot(DIR,{storage:{[KEY]:raw}});const ev=t2.ev('member().evaluation');
ok(ev.keepGoals===true&&ev.goals[0].src==='hwp'&&ev.goals[0].short===F.evaluation.goals[0].short,'다시 열어도 붙여 넣은 목표 표시·문구 유지 설정이 남음',[ev.keepGoals,ev.goals[0].src]);
ok(!('src' in ev.goals[3]),'붙여 넣지 않은 칸에는 표시 없음');
const bk=t2.ev('JSON.parse(JSON.stringify(exportPayload?exportPayload():{}))');ok(true,'백업 만들기 오류 없음');
ok(!t.errors.length&&!t2.errors.length,'오류 없음',[...t.errors,...t2.errors]);
done();
