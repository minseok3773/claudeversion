// v3.22.0 — ‘Claude로 작성’(claude.ai 복사·붙여넣기): 상담일지 전문을 담은 요청문, 붙여 넣은 답으로 칸 채우기 (가상 자료·가짜 Claude 답만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const ENGINE={rehab_ai_engine_v1:'claude'};
const LONG='회원 001은 오늘 산책 프로그램에 참여함. '.repeat(40)+'마지막 문장으로 동생과 함께 사는 집으로 돌아가고 싶다고 말함.';
const reqOf=t=>{const v=t.$('#cdPrompt').value;return v.split('\n[요청]\n')[1].split('\n[답변 형식')[0]};
async function waitDlg(t,ms=4000){const end=Date.now()+ms;while(Date.now()<end){const d=t.$('#claudeDlg');if(d&&d.open)return d;await sleep(10)}return null}
// 열린 창마다 요청문을 가짜 Claude에 넣고 답을 붙여 넣는다.
// 한 번에 묶은 요청문을 단계별로 나누어 가짜 Claude 답을 만든다.
const batchAI=ai=>body=>{const p=String(body.prompt);if(!/===== \[step1\]/.test(p))return ai(body);const parts=p.split(/===== \[step\d\] [^=]+ =====\n/).slice(1);const out={};parts.forEach((x,i)=>{out['step'+(i+1)]=ai({prompt:x})});return out};
async function answerAll(t,ai,{wrap=true,max=8}={}){const seen=[];for(let k=0;k<max;k++){const d=await waitDlg(t,k?1500:4000);if(!d)break;const req=reqOf(t);seen.push({prompt:req,full:t.$('#cdPrompt').value,note:(d.querySelector('[role=status]')||{}).textContent||''});
  const out=JSON.stringify(ai({prompt:req}));t.$('#cdAnswer').value=wrap?'네, 작성했습니다.\n```json\n'+out+'\n```':out;t.click('#cdOk');await sleep(20)}return seen}
(async()=>{
 console.log('[1] Claude로 작성 — 계획서+평가서를 한 번만 주고받고 나머지는 자동으로 진행(v3.22.4)');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE,ai:()=>{throw Error('Gemini로 보내면 안 됨')}});
  t.ev(`member().notes[0].body+='\\n'+${JSON.stringify(LONG)};persist()`);
  t.ev("state.view='ai';paint()");
  ok(/Claude로 작성/.test(t.$('#content').textContent)&&t.$('input[name="aiEngine"][value="claude"]').checked,'화면에 작성 AI 선택이 보이고 Claude가 골라져 있음');
  const run=t.ev("runLocalAI('plan-eval')");const seen=await answerAll(t,batchAI(makeAI()),{max:3});await run;
  const fail=t.logs.find(l=>l[0]==='alert'&&/실패|오류/.test(l[1]));ok(!fail,'작성 성공',fail||t.ev('aiStatus'));
  ok(t.prompts.length===0,'Gemini 서버로는 한 번도 보내지 않음',t.prompts.length);
  ok(seen.length===1,'Claude와 한 번만 주고받음',seen.length);
  const full=seen[0]?.full||'';const steps=[...full.matchAll(/===== \[step(\d)\] ([^=]+) =====/g)].map(x=>x[2].trim());
  ok(steps.length===3&&/욕구/.test(steps[0])&&/재활목표/.test(steps[1])&&/재활평가/.test(steps[2]),'한 요청문에 욕구·강점 → 목표 → 평가 3단계가 들어감',steps);
  ok(full.split(LONG).length===2,'긴 상담일지 문단이 잘리지 않고 전문으로 한 번만 들어감',full.split(LONG).length-1);
  ok(/\[작성 지침\]/.test(full)&&/"step3"/.test(full),'작성 지침과 전체 답 형식이 들어감');
  const p=t.ev('member().plan');ok(p.goals.filter(g=>String(g.short||'').trim()).length>=3&&!/〔/.test(JSON.stringify(p)),'계획서 목표 칸이 채워지고 자리표시가 남지 않음',p.goals.map(g=>g.short));
  const e=t.ev('member().evaluation');ok(e.goals.length>=3&&!/〔/.test(JSON.stringify(e)),'평가서도 채워지고 자리표시가 남지 않음');
  ok(/Claude\(claude\.ai\)/.test(t.ev('aiMetaText')),'사용한 AI에 Claude 표시',t.ev('aiMetaText'));
  ok(t.errors.length===0,'오류 없음',t.errors);}
 console.log('[1c] 평가만 / 이전 계획 평가 후 차기 계획도 한 번에');
 for(const mode of ['eval','both','plan']){const t=boot(DIR,{stored:stored57(),storage:ENGINE});const run=t.ev(`runLocalAI('${mode}')`);const seen=await answerAll(t,batchAI(makeAI()),{max:3});await run;
  const fail=t.logs.find(l=>l[0]==='alert'&&/실패|오류/.test(l[1]));const e=t.ev('member().evaluation'),p=t.ev('member().plan');
  ok(seen.length===1&&!fail&&!/〔/.test(JSON.stringify([e,p]))&&(mode==='plan'||e.goals.filter(g=>g.goalId).map(g=>g.goalId).join()==='g1,g2,g3'),mode+': 한 번 주고받아 완성, 평가는 기존 목표와 연결',[seen.length,fail,t.ev('aiStatus')]);}
 console.log('[1b] 한 번에 받은 답이 일부 빠지면 알려 줌');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});const run=t.ev("runLocalAI('plan-eval')");const d=await waitDlg(t);
  const full=t.$('#cdPrompt').value;const ans=batchAI(makeAI())({prompt:full.split('\n[요청]\n')[1]});delete ans.step3;t.$('#cdAnswer').value=JSON.stringify(ans);t.click('#cdOk');
  ok(d.open&&/step3의 답이 빠졌습니다/.test(t.$('#cdErr').textContent),'빠진 단계를 알려 주고 창 유지',t.$('#cdErr').textContent);
  t.$('#cdAnswer').value=JSON.stringify(ans.step1);t.click('#cdOk');ok(d.open&&/step1, step2/.test(t.$('#cdErr').textContent),'한 단계 답만 붙이면 전체 형식으로 다시 받게 안내');
  t.click('#cdCancel');await run;ok(!t.ev('aiWorking')&&t.ev('member().plan.goals[0].id')==='g1','중단하면 기존 계획서 그대로');}
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
 console.log('[2b] 따로 묻는 창(예비)에서도 이번 요청의 답이 아니면 알려 주고, 한 겹 감싼 답은 받아 줌');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});const chk=t.ev('claudeCheckAnswer'),kind=t.ev('claudeStepKind');
  const A='상담일지의 진술·관찰·의사 소견을 종합하여 …',B='[목표별 재활 계획 문장 기준] …';
  ok(kind(A)==='assess'&&kind(B)==='goals'&&kind('[실천모델 평가] …')==='eval','요청 종류 알아봄');
  const r=chk(B,{strength:['a'],memberNeed:'- b'},2);ok(/재활목표\(goals\)이 없습니다/.test(r.err)&&/1번째 요청의 답/.test(r.err),'목표 요청에 1번째 답을 붙이면 알려 줌',r.err);
  const w=chk(B,{재활계획서:{goals:[{long:'x'}]}},2);ok(!w.err&&Array.isArray(w.obj.goals),'한 겹 감싼 답은 안쪽을 씀');}
 console.log('[3b] 창이 닫혀도(Esc 등) 다시 열어 이어서 작성(v3.22.2)');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});t.ev("state.view='ai';paint()");
  const run=t.ev("runLocalAI('plan')");const d=await waitDlg(t);
  d.open=false;d.dispatchEvent(new t.w.Event('close'));await sleep(10);
  const btn=t.$('#aiProgress .claude-reopen');ok(!!btn,'진행 상태에 ‘Claude 창 다시 열기’ 버튼이 나옴');
  t.click(btn);ok(d.open&&!t.$('.claude-reopen'),'누르면 같은 요청 창이 다시 열림');
  const seen=await answerAll(t,batchAI(makeAI()));await run;
  ok(seen.length>=1&&!t.ev('aiWorking')&&!t.logs.some(l=>l[0]==='alert'&&/실패|오류/.test(l[1])),'이어서 끝까지 작성됨',seen.length);}
 console.log('[4] Gemini 자동으로 바꾸면 예전처럼 서버로 보냄');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE,ai:makeAI()});t.ev("state.view='ai';paint()");
  t.change('input[name="aiEngine"][value="gemini"]',true);ok(t.ev('aiEngine')==='gemini'&&t.w.localStorage.getItem('rehab_ai_engine_v1')==='gemini','선택이 저장됨');
  await t.ev("runLocalAI('plan')");ok(t.prompts.length>=2&&!t.$('#claudeDlg')?.open,'Gemini 서버로 작성',t.prompts.length);}
 console.log('[5] 처음 쓰는 사람은 기존과 같이 Gemini');
 {const t=boot(DIR,{stored:stored57()});ok(t.ev('aiEngine')==='gemini','기본값 Gemini');}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
