// v3.22.0 — ‘Claude로 작성’(claude.ai 복사·붙여넣기): 상담일지 전문을 담은 요청문, 붙여 넣은 답으로 칸 채우기 (가상 자료·가짜 Claude 답만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const ENGINE={rehab_ai_engine_v1:'claude'};
const LONG='회원 001은 오늘 산책 프로그램에 참여함. '.repeat(40)+'마지막 문장으로 동생과 함께 사는 집으로 돌아가고 싶다고 말함.';
const reqOf=t=>{const v=t.$('#cdPrompt').value;return v.split('\n[요청]\n')[1].split('\n[답변 형식')[0]};
async function waitDlg(t,ms=4000){const end=Date.now()+ms;while(Date.now()<end){const d=t.$('#claudeDlg');if(d&&d.open)return d;await sleep(10)}return null}
// 열린 창마다 요청문을 가짜 Claude에 넣고 답을 붙여 넣는다.
async function answerAll(t,ai,{wrap=true,max=8}={}){const seen=[];for(let k=0;k<max;k++){const d=await waitDlg(t,k?1500:4000);if(!d)break;const req=reqOf(t);seen.push({prompt:req,full:t.$('#cdPrompt').value,note:(d.querySelector('[role=status]')||{}).textContent||''});
  const out=JSON.stringify(ai({prompt:req}));t.$('#cdAnswer').value=wrap?'네, 작성했습니다.\n```json\n'+out+'\n```':out;t.click('#cdOk');await sleep(20)}return seen}
(async()=>{
 console.log('[1] Claude로 작성 — 계획서+평가서: 서버(Gemini)에 보내지 않고 3번 주고받아 채움');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE,ai:()=>{throw Error('Gemini로 보내면 안 됨')}});
  t.ev(`member().notes[0].body+='\\n'+${JSON.stringify(LONG)};persist()`);
  t.ev("state.view='ai';paint()");
  ok(/Claude로 작성/.test(t.$('#content').textContent)&&t.$('input[name="aiEngine"][value="claude"]').checked,'화면에 작성 AI 선택이 보이고 Claude가 골라져 있음');
  const run=t.ev("runLocalAI('plan-eval')");const seen=await answerAll(t,makeAI());await run;
  const fail=t.logs.find(l=>l[0]==='alert'&&/실패|오류/.test(l[1]));ok(!fail,'작성 성공',fail);
  ok(t.prompts.length===0,'Gemini 서버로는 한 번도 보내지 않음',t.prompts.length);
  ok(seen.map(s=>stepOf(s.prompt)).join()==='A,B,C','욕구·강점 → 목표 → 평가 3번만 주고받음(문항 점검 요청은 건너뜀)',seen.map(s=>stepOf(s.prompt)));
  ok(!seen[0].note&&/1번째 답을 프로그램에 넣었습니다/.test(seen[1].note)&&/2번째 답을/.test(seen[2].note),'다음 요청 창에 앞 답을 넣었다는 표시와 새 요청 안내가 나옴(v3.22.3)',seen.map(s=>s.note.slice(0,20)));
  ok(seen.every(s=>s.full.includes(LONG)),'긴 상담일지 문단이 잘리지 않고 요청문마다 전문으로 들어감');
  ok(seen.every(s=>/\[작성 지침\]/.test(s.full)&&/JSON 객체 하나만/.test(s.full)),'요청문에 작성 지침과 답변 형식이 들어감');
  const p=t.ev('member().plan');ok(p.goals.filter(g=>String(g.short||'').trim()).length>=3,'계획서 목표 칸이 채워짐',p.goals.length);
  ok(t.ev('member().evaluation.goals.length')>=3,'평가서도 채워짐');
  ok(/Claude\(claude\.ai\)/.test(t.ev('aiMetaText')),'사용한 AI에 Claude 표시',t.ev('aiMetaText'));
  ok(t.errors.length===0,'오류 없음',t.errors);}
 console.log('[2] JSON이 아닌 답을 붙여 넣으면 창을 닫지 않고 다시 붙여 넣게 함');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});
  const run=t.ev("runLocalAI('plan')");const d=await waitDlg(t);
  t.$('#cdAnswer').value='죄송합니다, 다시 써 드릴게요.';t.click('#cdOk');
  ok(d.open&&/JSON을 찾지 못했습니다/.test(t.$('#cdErr').textContent),'안내를 보여 주고 창 유지');
  t.click('#cdCancel');await run;
  ok(!d.open&&!t.ev('aiWorking'),'중단을 누르면 창을 닫고 작업을 멈춤');
  ok(t.ev('member().plan.goals[0].id')==='g1','중단하면 기존 계획서는 그대로');}
 console.log('[3] 요청문 복사·claude.ai 열기');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});let copied='';t.w.document.execCommand=()=>{copied='y';return true};
  const run=t.ev("runLocalAI('plan')");await waitDlg(t);
  t.click('#cdOpen');ok(t.logs.some(l=>l[0]==='open'&&l[1]==='https://claude.ai/new'),'claude.ai 새 대화 열기');
  t.click('#cdCopy');await sleep(20);ok(copied==='y'&&/복사했습니다/.test(t.$('#cdCopyMsg').textContent),'요청문 복사',t.$('#cdCopyMsg').textContent);
  t.click('#cdSend');await sleep(20);const o=t.logs.filter(l=>l[0]==='open').pop();
  ok(o&&o[1]==='https://claude.ai/new'&&/복사하고 Claude 새 대화를 열었습니다/.test(t.$('#cdCopyMsg').textContent),'보내기 한 번에 복사+새 대화 열기(긴 요청은 주소에 넣지 않음)',o);
  ok(t.ev("claudeOpenUrl('짧은 요청')")==='https://claude.ai/new?q='+encodeURIComponent('짧은 요청')&&t.ev("claudeOpenUrl('가'.repeat(3000))")==='https://claude.ai/new','짧은 요청만 입력창에 미리 채움');
  t.click('#cdCancel');await run;}
 console.log('[3b] 창이 닫혀도(Esc 등) 다시 열어 이어서 작성(v3.22.2)');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});t.ev("state.view='ai';paint()");
  const run=t.ev("runLocalAI('plan')");const d=await waitDlg(t);
  d.open=false;d.dispatchEvent(new t.w.Event('close'));await sleep(10);
  const btn=t.$('#aiProgress .claude-reopen');ok(!!btn,'진행 상태에 ‘Claude 창 다시 열기’ 버튼이 나옴');
  t.click(btn);ok(d.open&&!t.$('.claude-reopen'),'누르면 같은 요청 창이 다시 열림');
  const seen=await answerAll(t,makeAI());await run;
  ok(seen.length>=2&&!t.ev('aiWorking')&&!t.logs.some(l=>l[0]==='alert'&&/실패|오류/.test(l[1])),'이어서 끝까지 작성됨',seen.length);}
 console.log('[4] Gemini 자동으로 바꾸면 예전처럼 서버로 보냄');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE,ai:makeAI()});t.ev("state.view='ai';paint()");
  t.change('input[name="aiEngine"][value="gemini"]',true);ok(t.ev('aiEngine')==='gemini'&&t.w.localStorage.getItem('rehab_ai_engine_v1')==='gemini','선택이 저장됨');
  await t.ev("runLocalAI('plan')");ok(t.prompts.length>=2&&!t.$('#claudeDlg')?.open,'Gemini 서버로 작성',t.prompts.length);}
 console.log('[5] 처음 쓰는 사람은 기존과 같이 Gemini');
 {const t=boot(DIR,{stored:stored57()});ok(t.ev('aiEngine')==='gemini','기본값 Gemini');}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
