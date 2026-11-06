// v3.23.0 — 요청문 품질: 지시 충돌 정리, 근거 원칙, 한 번에 보내는 요청문 정리, 검토 의견(reviewNotes) (가상 자료·가짜 답만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const ENGINE={rehab_ai_engine_v1:'claude'};
async function waitDlg(t,ms=4000){const end=Date.now()+ms;while(Date.now()<end){const d=t.$('#claudeDlg');if(d&&d.open)return d;await sleep(10)}return null}
const batchAI=ai=>body=>{const p=String(body.prompt);const parts=p.split(/===== \[step\d\] [^=]+ =====\n/).slice(1);const out={};parts.forEach((x,i)=>{out['step'+(i+1)]=ai({prompt:x})});return out};
let _t0=null;const t0=()=>_t0||(_t0=boot(DIR,{stored:stored57()}));
(async()=>{
 console.log('[1] Gemini 요청문 — 서로 부딪치던 지시가 빠지고 프로젝트 기준이 들어감');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('plan')");
  const sys=t.prompts[0]?.system||'',A=t.prompts.find(p=>/상담일지의 진술·관찰·의사 소견을 종합하여/.test(p.prompt))?.prompt||'',B=t.prompts.find(p=>/\[현재 승인·작성된 장기목표/.test(p.prompt))?.prompt||'';
  ok(sys.length>500&&sys.length<=4000,'시스템 지시는 서버 한도(4000자) 안',sys.length);
  ok(!/폭넓게 추론해 충실히|‘확인 필요’ 같은 표시를 붙이지 않는다|가족이 했을 법한|한두 가지 내용|보도문 문체/.test(sys+A),'추론해 채우기·가족 말 지어내기·문체 충돌 지시가 없음');
  ok(/사례관리자가 할 구체적인 지원 방법/.test(sys)&&/reviewNotes/.test(sys)&&/평가어로 압축/.test(sys),'현장 기준(재활계획=사례관리자 지원, 불일치는 따로, 강점·약점 평가어)이 시스템 지시에 있음');
  ok(/재활계획에 필요한 욕구와 문제만 추론/.test(A)&&/familyDialogue는 빈 문자열/.test(A)&&/"reviewNotes":\[\]/.test(A),'회원 욕구는 재활계획에 필요한 것만 추론, 가족 말은 기록에 있을 때만, reviewNotes 칸');
  ok(/사건 나열 없이 평가어 한 문장으로 압축/.test(A)&&/잦은 충돌이 있었음/.test(A),'심리사회 영역은 사건 나열 없이 평가어로 압축');
  {const C=t.prompts.find(p=>/\[실천모델 평가\]/.test(p.prompt))?.prompt||'';ok(!C||/문제 기록이 없으면 횟수 기록이 없어도 ‘성과목표 달성함’/.test(C),'평가서: 문제 기록이 없으면 달성함')}
  ok(/오타·맞춤법·띄어쓰기/.test(sys)&&/오타·띄어쓰기·조사/.test(A),'오타 점검 지시가 있음');
  ok(!/측정 수치는 target에 쓴다|재활계획은 회원이 원하는 변화와 실천 행동의 관계를 우선|3개까지 채우되|월 1회 상담은 측정·점검을 돕는 보조 수단일 뿐/.test(B),'단기목표 숫자 빼기·회원 행동 우선·3개 채우기·점검 금지 지시가 없음');
  ok(/항목마다 회원의 행동과 판정 기준/.test(B)&&/사례관리자가 할 구체적인 지원 방법을 ‘- ’ 줄로/.test(B)&&/같은 행동·같은 숫자 기준/.test(B)&&/목표도 그 개수만 쓴다/.test(B),'단기목표 측정 기준·재활계획=사례관리자 지원·성과목표=단기목표 기준·근거만큼 목표');}
 console.log('[2] 한 번에 보내는 요청문 — 중복 안내 한 번만, 마지막 점검은 상담일지 뒤, 자리표시 정리');
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE});const run=t.ev("runLocalAI('plan-eval')");const d=await waitDlg(t);const full=t.$('#cdPrompt').value;
  const ev=full.indexOf('===== [상담일지 전문] ====='),chk=full.indexOf('[상담일지를 다 읽은 뒤 단계별 마지막 점검]');
  ok(d&&ev>0&&chk>ev,'마지막 점검이 상담일지 전문 뒤에 있음',[ev,chk]);
  ok(full.slice(0,ev).indexOf('[마지막 점검 — 답하기 전')<0,'상담일지 앞에는 마지막 점검이 없음');
  ok(/\(step1의 같은 안내를 그대로 따름\)/.test(full),'앞 단계와 같은 긴 안내는 한 번만 실음');
  ok(!/〔1번 답의 memberNeed〕|〔1번 답 강점〕/.test(full),'앞 단계 답 자리표시를 말로 바꿈');
  ok(full.length<62000,'요청문 길이가 줄어듦',full.length);
  // 가짜 답에 검토 의견을 넣으면 작성이 끝난 뒤 따로 보여 주고 저장한다.
  const ans=batchAI(makeAI())({prompt:full.split('\n[요청]\n')[1]});ans.step1.reviewNotes=['기록 2는 복약을 스스로 한다고 했으나 기록 5와 맞지 않음.'];ans.step2.reviewNotes=['- 기존 장기목표 2는 현재 기록과 맞지 않음.','없음'];
  t.$('#cdAnswer').value=JSON.stringify(ans);t.click('#cdOk');await run;
  const al=t.logs.filter(l=>l[0]==='alert').map(l=>l[1]).join('\n');
  ok(/\[검토 의견 — 상담 원문과 대조할 내용\]/.test(al)&&/기록 2는 복약을/.test(al)&&/기존 장기목표 2는/.test(al)&&!/- 없음/.test(al),'검토 의견을 작성 완료 알림에 따로 보여 줌',al.slice(-300));
  ok(t.ev('member().aiReviewNotes?.notes?.length')===2,'검토 의견을 회원 자료에 저장',t.ev('member().aiReviewNotes'));}
 console.log('[3] 강점 평가어 ‘수용성이 높음’을 바꾸지 않음');
 {const t=boot(DIR,{stored:stored57()});ok(t.ev("plainKo('상담 개입에 대한 수용성이 높음.')")==='상담 개입에 대한 수용성이 높음.','수용성이 높음 그대로',t.ev("plainKo('상담 개입에 대한 수용성이 높음.')"));}
 console.log('[4] 평가서 — 문제 기록이 없으면 횟수 기록이 없어도 달성함');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('eval')");const C=t.prompts.find(p=>/\[실천모델 평가\]/.test(p.prompt))?.prompt||'';
  ok(/\[판정 원칙 — 시설 기준\]/.test(C)&&/문제 기록이 없으면 횟수 기록이 없어도 ‘성과목표 달성함’/.test(C)&&!/달성했다는 기록 근거가 없으면/.test(C),'평가 요청문에 새 판정 원칙이 있고 옛 기준은 없음')}
 console.log('[5] 기존 장기목표와 ID·문구가 같은 AI 초안은 단기목표 낱말이 다른 영역처럼 보여도 그대로 씀(v3.23.1)');
 {const base=makeAI();const SH='1. 동료와 갈등이 있을 때 사과하는 대인관계 기술을 주 1회 연습함.\n2. 동료와 언쟁 0건을 유지함.';
  const ai=body=>{const o=base(body);if(Array.isArray(o.goals)&&/\[현재 승인·작성된 장기목표/.test(String(body.prompt))){const g=o.goals.find(x=>x.goalId==='g1');if(g){g.long='규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.';g.short=SH.split('\n');g.plan=['동료와 갈등이 생긴 날 당일 개별상담으로 상황을 함께 돌아봄.','주 1회 사과하는 말을 직원과 함께 연습함.','월 1회 언쟁 기록을 회원과 함께 확인함.']}}return o};
  const t=boot(DIR,{stored:stored57(),ai});await t.ev("runLocalAI('plan')");const g=t.ev("member().plan.goals.find(x=>x.id==='g1')");
  ok(/동료와 언쟁 0건/.test(g.short)&&/당일 개별상담/.test(g.plan),'AI가 쓴 단기목표·재활계획이 들어감',[g.short,g.plan]);
  ok(g.long==='규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.','장기목표 문구는 그대로',g.long);}
 console.log('[6] 기존 장기목표의 오타만 고친 문구는 받아들이고, 다른 문구는 받아들이지 않음');
 ok(t0().ev("typoFixedLong('현재 생홒 방식을 유지함.','현재 생활 방식을 유지함.')")==='현재 생활 방식을 유지함.','오타 수정은 반영');
 ok(t0().ev("typoFixedLong('현재 생홒 방식을 유지함.','직업 능력을 크게 향상시킴.')")==='현재 생홒 방식을 유지함.','다른 문구는 반영하지 않음');
 console.log('[7] 심리사회 한 문장·평가 판정(한 번의 병결·성과목표 밖 행동) 지시');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('eval')");const C=t.prompts.find(p=>/\[실천모델 평가\]/.test(p.prompt))?.prompt||'';
  ok(/아파서 한 번 빠지거나/.test(C)&&/성과목표에 없는 다른 행동/.test(C),'한 번의 병결·성과목표 밖 행동으로 판정을 낮추지 않음');
  const t2=boot(DIR,{stored:stored57(),ai:makeAI()});await t2.ev("runLocalAI('plan')");const A=t2.prompts.find(p=>/상담일지의 진술·관찰·의사 소견을 종합하여/.test(p.prompt))?.prompt||'';
  ok(/평가어 한 문장으로만/.test(A)&&/학원·행사·물건 이름/.test(A),'심리사회는 영역마다 평가어 한 문장, 구체적 사건 내용 금지');}
 done();
})();
