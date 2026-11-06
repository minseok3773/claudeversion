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
  ok(/항목마다 회원의 행동과 판정 기준/.test(B)&&/사례관리자가 앞으로 6개월 동안 할 구체적인 지원 방법을 ‘- ’ 줄로/.test(B)&&/같은 행동·같은 숫자 기준/.test(B)&&/목표도 그 개수만 쓴다/.test(B),'단기목표 측정 기준·재활계획=사례관리자 지원·성과목표=단기목표 기준·근거만큼 목표');}
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
  ok(g.long==='규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킨다.','장기목표 문구는 그대로(끝맺음만 ~한다)',g.long);}
 console.log('[6] 기존 장기목표의 오타만 고친 문구는 받아들이고, 다른 문구는 받아들이지 않음');
 ok(t0().ev("typoFixedLong('현재 생홒 방식을 유지함.','현재 생활 방식을 유지함.')")==='현재 생활 방식을 유지함.','오타 수정은 반영');
 ok(t0().ev("typoFixedLong('현재 생홒 방식을 유지함.','직업 능력을 크게 향상시킴.')")==='현재 생홒 방식을 유지함.','다른 문구는 반영하지 않음');
 console.log('[7] 심리사회 한 문장·평가 판정(한 번의 병결·성과목표 밖 행동) 지시');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('eval')");const C=t.prompts.find(p=>/\[실천모델 평가\]/.test(p.prompt))?.prompt||'';
  ok(/아파서 한 번 빠지거나/.test(C)&&/성과목표에 없는 다른 행동/.test(C),'한 번의 병결·성과목표 밖 행동으로 판정을 낮추지 않음');
  const t2=boot(DIR,{stored:stored57(),ai:makeAI()});await t2.ev("runLocalAI('plan')");const A=t2.prompts.find(p=>/상담일지의 진술·관찰·의사 소견을 종합하여/.test(p.prompt))?.prompt||'';
  ok(/평가어 한 문장으로만/.test(A)&&/학원·행사·물건 이름/.test(A),'심리사회는 영역마다 평가어 한 문장, 구체적 사건 내용 금지');}
 console.log('[8] v3.23.2 — 장기목표 4개면 4번째 AI 초안도 받음');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});t.ev("{const p=member().plan;p.goals.push({...p.goals[0],id:'g4',long:'용돈 지출을 스스로 관리함.',short:'1. 상담에서 확인된 건강 관련 생활습관을 스스로 조절함.',plan:'- 틀 문장',activity:'',target:''});persist()}");
  await t.ev("runLocalAI('plan')");const g=t.ev("member().plan.goals.find(x=>x.id==='g4')");
  ok(g&&/용돈 기입장/.test(g.short)&&!/틀 문장/.test(g.plan),'4번째 목표에 AI 초안이 들어감',g&&[g.short,g.plan]);}
 console.log('[9] v3.23.2 — 평가 후처리: 병결은 사건 아님, 문장 속 말은 옮기지 않음, 같은 서비스 합치기');
 {const t=t0();
  ok(t.ev("INCIDENT_SKIP.test('미술학원 등록을 위해 방문하였으나 복통을 호소하여 수업을 중단하고 귀가함.')"),'아파서 중단한 일은 판정을 낮추는 사건이 아님');
  const g=t.ev("(()=>{const g={achMember:'- 식사 시간 유지 권유에 동의함.',blockMember:'- 복장 안내에 “괜찮다”는 답을 반복함.'};fixFactorSides(g);return {a:g.achMember,b:memberFactor(g.blockMember)}})()");
  ok(!/괜찮다/.test(g.a)&&/복장 안내에 “괜찮다”는 답을 반복함/.test(g.b),'문장 속 “괜찮다”는 방해 요인 문장 그대로 둠',g);
  const g2=t.ev("(()=>{const g={achMember:'',blockMember:'“재미있어요”'};fixFactorSides(g);return g.achMember})()");
  ok(/재미있어요/.test(g2),'말만 있는 줄은 예전처럼 옮김',g2);
  const sv=t.ev("mergeSameHead('∎ 사회적응훈련(대형마트 이용, 대형문고 이용, 전시회 관람 등)\\n∎ 개별상담\\n∎ 사회적응훈련(대형마트 이용, 지역행사 참여, 산책)\\n∎ 생활지도(계절 복장, 식사습관)\\n∎ 생활지도(식사습관, 계절 복장)\\n∎ 개별상담')");
  ok((sv.match(/사회적응훈련/g)||[]).length===1&&/지역행사 참여/.test(sv)&&(sv.match(/생활지도/g)||[]).length===1&&(sv.match(/개별상담/g)||[]).length===1,'같은 이름의 서비스 줄을 하나로 합침',sv);}
 console.log('[10] v3.23.3 — 계획서 목표·계획 칸은 ‘~한다’, 욕구·강점·평가는 ‘~함’ 그대로');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('plan-eval')");const p=t.ev("member().plan"),e=t.ev("member().evaluation");
  const g=p.goals.find(x=>x.id==='g1');
  ok(/한다/.test(g.short)&&!/(?:참여함|표시함)\.?(?:\n|$)/.test(g.short),'단기목표가 ‘~한다’로 끝남',g.short);
  ok(/(?:한다|이다|된다)\.?(?:\(|\n|$)/m.test(g.plan)&&!/계획임/.test(g.plan),'재활계획이 ‘~한다’로 끝남',g.plan);
  ok(/함\.?$|임\.?$/.test(p.strength.filter(Boolean)[0]||'함'),'강점은 ‘~함/~임’ 그대로',p.strength);
  ok(/달성함|달성하지 못함/.test(e.goals.map(x=>x.result).join('\n')),'평가 결과는 ‘~함’ 그대로');
  ok(t.ev("futureText('- 회원을 도울 계획임.\\n1. 복장을 갖춰 입음.\\n2. 상담이 필요함.')")==='- 회원을 돕는다.\n1. 복장을 갖춰 입는다.\n2. 상담이 필요하다.','어미 바꾸기(불규칙·형용사 포함)');}
 console.log('[11] 지금 상황과 맞지 않는 기존 장기목표는 고친 문구를 제안하고 담당자가 고르면 바꿈(v3.23.4)');
 {const base=makeAI();const NEW='가구사업소 근무를 유지하며 직업생활에 안정적으로 적응한다.';
  const ai=body=>{const o=base(body);if(Array.isArray(o.goals)&&/\[현재 승인·작성된 장기목표/.test(String(body.prompt))){const g=o.goals.find(x=>x.goalId==='g1');if(g){g.longRevise=NEW;g.longReason='이미 근무 중이어서 구직 준비가 맞지 않음.'}}return o};
  for(const yes of [true,false]){const t=boot(DIR,{stored:stored57(),ai,confirmFn:m=>/장기목표 \d+개가 회원의 지금 상황과 맞지 않는다/.test(m)?yes:true});await t.ev("runLocalAI('plan')");
   const g=t.ev("member().plan.goals.find(x=>x.id==='g1')");const asked=t.logs.some(l=>l[0]==='confirm'&&/제안: 가구사업소 근무를 유지하며/.test(l[1])&&/이유: 이미 근무 중/.test(l[1]));
   const notes=JSON.stringify(t.ev("member().aiReviewNotes")||{});
   if(yes)ok(asked&&g.long===NEW&&/지금 상황에 맞게 바꿈/.test(notes)&&!('longRevise' in g),'확인하면 제안한 장기목표로 바꾸고 검토 의견에 남김',[g.long,notes]);
   else ok(/생활리듬/.test(g.long)&&/맞지 않을 수 있음/.test(notes),'취소하면 지금 장기목표를 두고 검토 의견에 남김',[g.long,notes]);}
  }
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('plan')");const B=t.prompts.find(p=>/\[현재 승인·작성된 장기목표/.test(p.prompt))?.prompt||'';
  ok(/"longRevise":""/.test(B)&&/이미 취업해 근무 중인데 ‘구직 준비’/.test(B),'요청문: 맞지 않는 장기목표는 longRevise로 제안');
  ok(/지금 수준\(기준선\)/.test(B)&&/이미 문제없이 하고 있는 일/.test(B),'요청문: 단기목표는 기준선에서 나아질 변화');
  ok(/상담일지의 지난 일\(날짜, 사건, 회원이 한 말의 인용\)은 재활계획에 옮겨 적지 않는다/.test(B)&&/단기목표 번호마다 그것을 돕는 지원이 한 줄 이상/.test(B),'요청문: 재활계획은 앞으로의 지원, 인용 금지');
  ok(/사례관리자가 본 문제: .+\(/.test(B),'요청문: 사례관리자가 본 문제를 이유까지 넘김');
  ok(!/할 계획임/.test(B.split('[근거]')[0]),'요청문에 ‘~할 계획임’ 지시가 남지 않음');}
 console.log('[12] AI로 보내기 전 개인정보 가명 처리(v3.23.4)');
 {const t=t0();const m=x=>t.ev('maskPII('+JSON.stringify(x)+')');
  ok(m('김철수 회원이 010-1234-5678로 연락함. 보호자 이영희 어머니가 방문함.')==='가명A 회원이 [연락처]로 연락함. 보호자 가명B 어머니가 방문함.','이름+호칭은 가명, 전화는 [연락처]');
  ok(m('주민번호 900101-1234567, a.b@x.com, 월드컵로 12에 거주, 101동 202호, 계좌 110-123-456789')==='주민번호 [주민번호], [이메일], [주소]에 거주, [주소], [계좌번호]','주민번호·이메일·주소·계좌');
  ok(m('산책로 2회 걸음. 학교로 3시에 감. [기록 15 / 2025-09-25 / 상담] ① 이번 회원 상담')==='산책로 2회 걸음. 학교로 3시에 감. [기록 15 / 2025-09-25 / 상담] ① 이번 회원 상담','횟수·시간·날짜·기록 번호는 그대로');
  ok(m('김철수 회원과 김철수씨')==='가명A 회원과 가명A씨','같은 이름은 같은 가명');}
 {const st=stored57();st.members[0].notes.forEach(n=>n.content+='\n박민수 회원 보호자 연락처 010-9876-5432, 주소 한강로 45.');
  const t=boot(DIR,{stored:st,ai:makeAI()});await t.ev("runLocalAI('plan')");const all=t.prompts.map(p=>p.system+'\n'+p.prompt).join('\n');
  ok(t.prompts.length&&!/010-9876-5432|박민수|한강로 45/.test(all)&&/\[연락처\]/.test(all)&&/가명[A-Z] 회원/.test(all),'Gemini로 보내는 요청문에 실명·연락처·주소가 없음');}
 {const st=stored57();st.members[0].notes.forEach(n=>n.content+='\n박민수 회원 보호자 연락처 010-9876-5432.');
  const t=boot(DIR,{stored:st,storage:ENGINE,ai:batchAI(makeAI())});const run=t.ev("runLocalAI('plan')");const d=await waitDlg(t);
  const txt=d?t.ev("(document.querySelector('#claudeDlg textarea')||{}).value||document.querySelector('#claudeDlg').textContent"):'';
  ok(d&&/\[연락처\]/.test(txt)&&!/010-9876-5432|박민수/.test(txt),'Claude 요청문(복사할 글)에도 가림',txt.length);t.ev("document.querySelector('#claudeDlg')?.close?.()");}
 console.log('[13] AI 답을 칸에 넣을 때 글자 수로 자르지 않음(v3.23.4)');
 {const base=makeAI();const LONG='회원은 '+'미술 활동에 대한 흥미가 높고 작품을 꾸준히 완성하며 '.repeat(40)+'성취감을 느낌.';const LS='1. '+'계획한 미술학원 수업에 빠지지 않고 참여한다 '.repeat(90)+'.\n2. 월 1회 보호자 상담에 참여한다.';
  const ai=body=>{const o=base(body);if(Array.isArray(o.goals)&&o.goals[0])o.goals[0].short=LS;return o};
  const t=boot(DIR,{stored:stored57(),ai});await t.ev("runLocalAI('plan')");const p=t.ev('member().plan');
  ok(p.goals.some(g=>String(g.short).length>1800),'긴 단기목표(1800자 넘음)도 그대로',p.goals.map(g=>String(g.short).length));
  ok(!p.goals.some(g=>/\(협의 후 확정\)/.test(g.target)),'성과목표에 ‘(협의 후 확정)’을 자동으로 붙이지 않음',p.goals.map(g=>g.target));}
 console.log('[14] 요청문 문제점 고치기(v3.23.5)');
 {const st=stored57();st.members[0].periodStart='';st.members[0].periodEnd='';const t=boot(DIR,{stored:st});
  const line=t.ev('periodLine(member())');ok(/^평가기간: 2026-\d\d-\d\d ~ 2026-\d\d-\d\d \(평가기간이 입력되지 않아 체크한 상담일지 날짜로 정함\)\.$/.test(line)&&!/미지정/.test(line),'평가기간이 비면 체크한 상담일지 날짜로',line);
  const own=t.ev("[...dxOwn({psychiatricConditions:['조현정동장애']})]");
  ok(t.ev("dxOffTopic('전환장애는 신경학적 원인 없이 운동 기능 증상이 나타난다.',dxOwn({psychiatricConditions:['조현정동장애']}))")===true&&t.ev("dxOffTopic('조현병 회원의 사회기술훈련은 효과가 있다.',dxOwn({psychiatricConditions:['조현정동장애']}))")===false&&t.ev("dxOffTopic('일과를 함께 짜고 쉬운 활동부터 늘린다.',dxOwn({psychiatricConditions:['조현정동장애']}))")===false,'회원 진단과 다른 장애(전환장애) 대목은 뺌',own);
  const ch=t.ev("referenceChunks('첫 문장은 이렇다. '.repeat(30)+'\\n'+'두 번째 단락의 문장이다. '.repeat(40)).map(x=>x.body)");
  ok(ch.length>1&&ch.every(x=>/[.]$/.test(x)&&x.length<=620),'전문자료는 문장 끝에서 나눔(중간에서 자르지 않음)',ch.map(x=>x.length));}
 {const st=stored57();const other=JSON.parse(JSON.stringify(st.members[0]));other.id='mem-b';other.label='회원 002';other.plan.strength=['시작부터 끝까지 조용한 태도로 프로그램에 임함.'];other.notes=[];st.members.push(other);
  st.members[0].plan.strength=['산책 프로그램에 꾸준히 참여함.','시작부터 끝까지 조용한 태도로 프로그램에 임함.'];
  const t=boot(DIR,{stored:st});const p=t.ev('evalSWPrompt(member())');
  ok(/산책 프로그램에 꾸준히 참여함/.test(p)&&!/조용한 태도/.test(p),'다른 회원 문서와 같고 이 회원 상담일지에 없는 강점은 보내지 않음',p);}
 {const t=boot(DIR,{stored:stored57(),storage:ENGINE,ai:batchAI(makeAI())});t.ev("runLocalAI('plan-eval')");const d=await waitDlg(t);
  const txt=d?t.ev("document.querySelector('#cdPrompt').value"):'';
  ok(d&&!/〔/.test(txt)&&/goals의 1번째 목표/.test(txt),'계획서+평가서 한 번에: 자리표시 없이 “앞 단계 N번째 목표”로 가리킴');
  ok((txt.match(/\[관련 전문자료 — /g)||[]).length<=1,'전문자료는 한 단계에만',(txt.match(/\[관련 전문자료 — /g)||[]).length);
  ok((txt.match(/^평가기간: /gm)||[]).length===1,'평가기간 줄은 한 번만',(txt.match(/^평가기간: /gm)||[]).length);
  t.ev("document.querySelector('#claudeDlg')?.close?.()");}
 done();
})();
