// v3.21.58 — AI 자동작성: 계획서→평가서, 실천모델 선택, 보완 요청, 회원 분리 검사, 오류 코드
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {stored58}=require('./fix58.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const F=a=>(a||[]).filter(g=>String(g.long||g.short||'').trim());
const fast=t=>{const o=t.w.setTimeout.bind(t.w);t.w.setTimeout=(fn,ms,...r)=>o(fn,ms>900?0:ms,...r)};
(async()=>{
 console.log('[1] ‘AI 자동작성 시작’ = 계획서 → 그 계획서의 평가서');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});t.ev("state.view='ai';paint()");
  const main=t.$('[data-act="ai-run-auto"]');ok(!!main&&/AI 자동작성 시작/.test(main.textContent),'주 버튼 있음',main?.textContent);
  ok(t.$('[data-act="ai-run-plan"]')&&t.$('[data-act="ai-run-eval"]')&&t.$('[data-act="ai-run-both"]'),'고급: 계획서만 / 현재 계획서 평가 / 이전 계획 평가 후 차기 계획');
  const before=t.ev('JSON.parse(JSON.stringify(member().plan))');
  t.click(main);for(let i=0;i<60&&t.ev('aiWorking');i++)await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,30));
  const steps=t.prompts.map(b=>stepOf(b.prompt));ok(steps.indexOf('A')<steps.indexOf('B')&&steps.indexOf('B')<steps.indexOf('C'),'순서: 분석 → 목표 → 평가',steps);
  const p=t.ev('member().plan'),e=t.ev('member().evaluation');
  const pIds=F(p.goals).map(g=>g.id),eIds=e.goals.filter(g=>g.goalId).map(g=>g.goalId);
  ok(pIds.length>=3&&eIds.length===pIds.length&&eIds.every(id=>pIds.includes(id)),'평가서 목표 = 새 계획서 목표',{pIds,eIds});
  ok(e.pastPlan!==true,'새 계획서 기준 평가(이전 계획 평가 아님)');
  ok(t.ev('member().planArchive[0].plan.goals.map(g=>g.id).slice(0,3).join()')===before.goals.slice(0,3).map(g=>g.id).join(),'이전 계획서 보관');
  ok(p.goals.length===4&&e.goals.length===4,'계획서·평가서 모두 4칸',[p.goals.length,e.goals.length]);
  const al=t.logs.filter(l=>l[0]==='alert').pop()?.[1]||'';ok(/재활계획서/.test(al)&&/평가서/.test(al)&&!/실패|오류/.test(al),'완료 안내',al.slice(0,200));
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[2] 평가서 화면: 체크한 상담일지로 AI 평가 작성');
 {let T;const views=[];const ai0=makeAI();const t=boot(DIR,{stored:stored57(),ai:b=>{views.push(T.ev('state.view'));return ai0(b)}});T=t;t.ev("state.view='evaluation';paint()");
  const b=t.$('[data-act="ai-run-eval"]');ok(b&&!b.disabled,'버튼 켜짐');
  ok(!t.$('[data-act="download-rtf"]')&&!t.$('[data-act="upload-txt"]'),'지난번에 뺀 버튼(한글용 문서·메모장 수정본 올리기)은 그대로 빠져 있음');
  t.click(b);for(let i=0;i<100&&!views.length;i++)await new Promise(r=>setTimeout(r,5));ok(views[0]==='ai','작성하는 동안 AI 화면(진행 상태·중단 버튼)이 보임',views);
  for(let i=0;i<100&&t.ev('aiWorking');i++)await new Promise(r=>setTimeout(r,20));
  ok(t.ev('state.view')==='evaluation','끝나면 평가서 화면');
  const e=t.ev('member().evaluation');ok(e.goals.filter(g=>g.goalId).map(g=>g.goalId).join()==='g1,g2,g3','현재 계획서(g1~g3) 평가',e.goals.map(g=>g.goalId));
  ok(t.ev('member().plan.goals.slice(0,3).map(g=>g.id).join()')==='g1,g2,g3','계획서는 그대로');
 }
 console.log('[3] 실천모델 선택(인지행동모델)');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});t.ev("state.view='ai';paint()");
  const sel=t.$('#rehabModelChoice');ok(sel&&[...sel.options].length===8,'선택칸: 자동 + 7개 모델',sel&&[...sel.options].map(o=>o.textContent));
  t.change(sel,'cbt');ok(t.ev('member().modelPreference')==='cbt','회원별로 저장');t.flush();ok(t.saved().members[0].modelPreference==='cbt','브라우저 저장에 들어감');
  await t.ev("runLocalAI('plan')");
  const A=t.prompts.find(b=>stepOf(b.prompt)==='A'),B=t.prompts.find(b=>stepOf(b.prompt)==='B');
  ok(/인지행동모델/.test(A.prompt)&&/인지행동모델/.test(B.prompt),'분석·목표 요청에 고른 모델 안내');
  const p=t.ev('member().plan');ok(p.appliedModel==='cbt','계획서에 적용 모델 저장',p.appliedModel);
  ok(F(p.goals).every(g=>g.models[0]==='인지행동모델'),'목표마다 주 모델이 첫째',F(p.goals).map(g=>g.models));
  t.ev("state.view='plan';paint()");ok(/AI 작성 때 적용한 주 실천모델: 인지행동모델/.test(t.$('#content').textContent),'계획서 화면에 표시');
  await t.ev("runLocalAI('eval')");const C=t.prompts.find(b=>stepOf(b.prompt)==='C');ok(/인지행동모델/.test(C.prompt),'평가 요청에도 같은 모델');
  ok(t.ev('member().evaluation.appliedModel')==='cbt','평가서에 적용 모델 저장');
 }
 console.log('[4] 자동 선택이면 AI가 고른 모델');
 {const ai=makeAI();const t=boot(DIR,{stored:stored57(),ai:b=>{const r=ai(b);if(stepOf(b.prompt)==='A')r.appliedModel='empowerment';return r}});
  await t.ev("runLocalAI('plan')");ok(t.ev('member().plan.appliedModel')==='empowerment','AI가 고른 임파워먼트모델',t.ev('member().plan.appliedModel'));
 }
 console.log('[5] 근거 있는 영역이 빠지면 한 번 더 요청 — AI가 쓴 목표를 씀');
 {const ai=makeAI();const t=boot(DIR,{stored:stored57(),ai:b=>{const st=stepOf(b.prompt);if(st==='?'&&/금전/.test(b.prompt))return{goals:[{goalId:'',long:'용돈을 계획적으로 사용함.',short:['한 달 용돈 계획을 세움.','계획 안에서 군것질 지출을 줄임.'],plan:['용돈 계획 세우기를 도울 계획임.','군것질 지출을 함께 돌아볼 계획임.'],activity:['용돈 계획 세우기','지출 돌아보기'],target:['월 1회 계획','군것질 주 2회 이하'],src:[4]}]};return ai(b)}});
  await t.ev("runLocalAI('plan')");const sup=t.prompts.filter(b=>stepOf(b.prompt)==='?');ok(sup.length===1,'보완 요청 1번',sup.length);
  const p=t.ev('member().plan');ok(F(p.goals).length===4&&/용돈을 계획적으로/.test(p.goals[3].long),'4번째 목표 = AI 보완 목표',F(p.goals).map(g=>g.long));
 }
 console.log('[6] 고른 장기목표는 엄격 연결, 남은 칸은 상담일지 근거로 채움(v3.21.62 담당자 요청)');
 {const t=boot(DIR,{stored:stored57({carry:{long:['개인위생에 대한 자기관리능력을 향상시켜 건강한 생활습관을 유지함.'],strength:null,weakness:null,at:'2026-10-25T00:00:00Z'}}),ai:makeAI()});
  await t.ev("runLocalAI('plan')");const p=t.ev('member().plan');ok(F(p.goals).length>1&&p.goals[0].id==='g3'&&F(p.goals).filter(g=>g.id==='g3').length===1,'고른 1개(g3 유지) + 남은 칸 채움',F(p.goals).map(g=>g.id+':'+g.long.slice(0,10)));

  ok((t.prompts.find(b=>stepOf(b.prompt)==='?')||{prompt:''}).prompt.includes('남은 칸은 체크한 상담일지에서 근거가 있고'),'고른 목표가 4칸보다 적으면 남은 칸 보완 요청');
 }
 {const ai=makeAI();const t=boot(DIR,{stored:stored57({carry:{long:['개인위생에 대한 자기관리능력을 향상시켜 건강한 생활습관을 유지함.','규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.'],strength:null,weakness:null,at:'2026-10-25T00:00:00Z'}}),ai:b=>{const r=ai(b);if(stepOf(b.prompt)==='B')r.goals=r.goals.filter(g=>g.goalId!=='g1');return r}});
  await t.ev("runLocalAI('plan')");const sup=t.prompts.find(b=>stepOf(b.prompt)==='?');ok(sup&&/초안이 없는 goalId의 단기목표·재활계획·세부활동·성과목표를 먼저 쓰고/.test(sup.prompt)&&/남은 칸은 체크한 상담일지에서 근거가 있고/.test(sup.prompt),'초안이 빠진 고른 목표를 먼저, 그다음 남은 칸 보완 요청',sup&&sup.prompt.slice(0,80));
  const p=t.ev('member().plan');ok(['g1','g3'].every(id=>F(p.goals).some(g=>g.id===id&&/^1\./.test(g.short)))&&F(p.goals).length<=4,'고른 2개 모두 단기목표 있음(빠진 것은 규칙 기반) + 남은 칸 채움',F(p.goals).map(g=>g.id+':'+g.short.slice(0,15)));
 }
 console.log('[7] 작성 중 회원을 바꾸면 결과를 넣지 않음');
 {let T;const ai=makeAI();const t=boot(DIR,{stored:stored58(),ai:b=>{if(stepOf(b.prompt)==='B')T.ev("state.memberId='mem-b'");return ai(b)}});T=t;
  const beforeA=JSON.stringify(t.ev("state.members[0].plan")),beforeB=JSON.stringify(t.ev("state.members[1].plan"));
  await t.ev("runLocalAI('plan')");
  ok(JSON.stringify(t.ev("state.members[0].plan"))===beforeA&&JSON.stringify(t.ev("state.members[1].plan"))===beforeB,'두 회원 모두 그대로');
  const st=t.ev('aiStatus');ok(/회원이 바뀌었습니다/.test(st)&&/변경되지 않았습니다/.test(st),'진행 상태에 안내',st.slice(0,300));
 }
 console.log('[8] 작성 중 상담일지가 바뀌면 넣지 않음');
 {let T;const ai=makeAI();const t=boot(DIR,{stored:stored57(),ai:b=>{if(stepOf(b.prompt)==='B')T.ev("member().notes[0].content+=' 추가 기록.';updateNoteBody(member(),0)");return ai(b)}});T=t;
  const before=JSON.stringify(t.ev("member().plan"));await t.ev("runLocalAI('plan')");
  ok(JSON.stringify(t.ev("member().plan"))===before,'계획서 그대로');
 }
 console.log('[9] 다른 회원과 똑같은 상담일지 → 확인 창');
 {const st=stored58();st.members[1].notes.push(JSON.parse(JSON.stringify(st.members[0].notes[0])));st.members[0].notes[0].content+=' 동료들과 함께 걸으며 대화를 나누었고 돌아오는 길에 벤치에 앉아 쉬는 시간을 가졌음. 다음 산책 일정과 준비물도 함께 정하였고 회원이 물병을 직접 챙기기로 함. 직원은 다음 주 같은 시간에 다시 확인하기로 함.';st.members[1].notes[2]=JSON.parse(JSON.stringify(st.members[0].notes[0]));
  const t=boot(DIR,{stored:st,ai:makeAI(),confirmFn:m=>!/다른 회원/.test(m)});
  t.ev('member().notes.forEach((n,i)=>updateNoteBody(member(),i));state.members[1].notes.forEach((n,i)=>updateNoteBody(state.members[1],i))');
  const before=JSON.stringify(t.ev("member().plan"));await t.ev("runLocalAI('plan')");
  const cf=t.logs.filter(l=>l[0]==='confirm').map(l=>l[1]).join('\n');ok(/회원 002/.test(cf)&&/똑같습니다/.test(cf),'확인 창에 회원 이름',cf.slice(0,200));
  ok(JSON.stringify(t.ev("member().plan"))===before&&!t.prompts.length,'취소하면 AI에 보내지 않음');
 }
 console.log('[10] AI 결과에 다른 회원의 문장이 섞이면 넣지 않음');
 {const ai=makeAI();const t=boot(DIR,{stored:stored58(),ai:b=>{const r=ai(b);if(stepOf(b.prompt)==='A')r.opinion='- 텃밭 활동에 참여하여 상추와 방울토마토 모종을 심고 물을 주었으며 다음 주 화요일 오전에 다시 와서 자란 모습을 사진으로 찍어 동료들에게 보여 주겠다고 함.';return r}});
  t.ev('state.members[1].notes.forEach((n,i)=>updateNoteBody(state.members[1],i))');
  const before=JSON.stringify(t.ev("member().plan"));await t.ev("runLocalAI('plan')");
  ok(JSON.stringify(t.ev("member().plan"))===before,'계획서 그대로');
  const st=t.ev('aiStatus');ok(/다른 회원\(회원 002\)/.test(st),'어느 회원 문장인지 진행 상태에 안내',st.slice(0,300));
 }
 console.log('[11] 오류 코드: 서버 설정 문제는 다시 보내지 않음 · 구글 일시 오류는 분량을 줄여 다시');
 {let n=0;const t=boot(DIR,{stored:stored57(),ai:makeAI(),confirmFn:m=>!/규칙 기반으로 대신/.test(m),aiStatus:b=>{n++;return{status:503,data:{error:{message:'',code:'SERVER_UNCONFIGURED'}}}}});
  fast(t);await t.ev("runLocalAI('plan')");ok(n===1,'1번만 보냄',n);
  const st=t.ev('aiStatus');ok(/GEMINI_API_KEY/.test(st),'설정 안내(진행 상태)',st.slice(0,400));const cf=t.logs.filter(l=>l[0]==='confirm').map(l=>l[1]).join('\n');ok(/GEMINI_API_KEY/.test(cf),'규칙 기반 대신 작성 확인 창에도 원인',cf.slice(0,300));
 }
 {let n=0;const ai=makeAI();const sizes=[];const t=boot(DIR,{stored:stored57(),ai,aiStatus:b=>{n++;sizes.push(b.prompt.length);if(n<=2)return{status:502,data:{error:{message:'',code:'UPSTREAM_SERVICE_ERROR',providerStatus:503}}};return null}});
  fast(t);await t.ev("runLocalAI('plan')");ok(n>=3&&t.ev("member().plan.goals.filter(g=>g.long).length")>=3,'다시 보내서 작성됨',n);
  ok(sizes[2]<=sizes[1],'세 번째 요청은 분량을 줄임',sizes.slice(0,3));
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
