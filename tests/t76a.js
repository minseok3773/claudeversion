// v3.24.0 — 레드팀 점검 후속: 가명 처리 보강, 요청문 조립, 근거 자료, 실무 흐름, 위험 기록 안내 (가상 자료만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const ON={rehab_gemini_oneshot_v1:'on'};
const splitAI=ai=>body=>{const p=String(body.prompt);if(!/===== \[step1\]/.test(p))return ai(body);const parts=p.split(/===== \[step\d\] [^=]+ =====\n/).slice(1);const out={};parts.forEach((x,i)=>{out['step'+(i+1)]=ai({prompt:x})});return out};
const N=(date,title,content)=>({date,title,content,included:true});
(async()=>{
 console.log('[1] 가명 처리: 호칭 없는 이름·가족 호칭 뒤 이름·두 글자 성·의료진·계좌·담당자가 적은 이름');
 {const t=boot(DIR,{stored:stored57()});t.ev("member().piiNames='김철수';state.piiGlobal='새희망둥지'");
  const M=x=>t.ev('maskPII('+JSON.stringify(x)+',"")');
  const cases=[['김철수가 늦게 옴.',/^가명[A-Z]가 늦게 옴\.$/],['고영희 회원과 통화함.',/^가명[A-Z] 회원/],['남궁민수 회원과 상담함.',/^가명[A-Z] 회원/],['어머니(박순자)께서 방문함.',/^어머니\(가명[A-Z]\)께서/],['아버지 김영호와 통화.',/^아버지 가명[A-Z]와/],['동생 김민지(32세)가 면회함.',/^동생 가명[A-Z]\(32세\)/],['박지훈 교수 진료',/^가명[A-Z] 교수/],['기업은행 123-456789-01-012',/^기업은행 \[계좌번호\]$/],['장소 : 새희망둥지 3층 강당',/^장소 : 기관[A-Z] 3층 강당$/]];
  for(const [x,re] of cases){const r=M(x);ok(re.test(r)&&!/김철수|고영희|남궁민수|박순자|김영호|김민지|박지훈|456789|새희망둥지/.test(r),x+' → '+r,r)}
  for(const x of ['모든 회원이 참여함','이번 회원 모임','기록은 회원이 할 수 있는 수준','복약 조정은 주치의와 상의','주 2회 이상 참여한다.','2025-09-25 사회적응훈련 2회기'])ok(M(x)===x,'오탐 없음: '+x,M(x));
  ok(t.ev(`unmaskPII(maskPII("새희망둥지에서 김철수가 참여함",""))`)==='새희망둥지에서 김철수가 참여함','AI 답의 가명·기관 표시를 원래 이름으로 되돌림');
  ok(t.ev('piiLeftovers("이영수가 왔음. 가명A가 웃음.")').join()==='이영수','가린 뒤 남은 이름 후보를 찾음');}
 console.log('[2] 보내기 전 확인: 남은 이름 후보가 있으면 묻고, 취소하면 보내지 않음');
 {const st=stored57();st.members[0].notes[0].content+=' 이영수가 함께 걸음.';
  const t=boot(DIR,{stored:st,storage:ON,ai:splitAI(makeAI()),confirmFn:m=>!/AI로 보내기 전 확인/.test(m)});
  await t.ev("runLocalAI('plan-eval')");
  ok(t.logs.some(l=>l[0]==='confirm'&&/이영수/.test(l[1])),'남은 이름을 보여 줌');ok(t.prompts.length===0,'취소하면 보내지 않음',t.prompts.length);}
 console.log('[3] 요청문 조립: 전문자료가 한 단계에 온전히 남고, 잘린 문장·빈 번호·실천모델 후보 목록이 없음');
 let P='';
 {const st=stored57();st.references=[{id:'r1',title:'DSM - 5',body:'산책 프로그램과 복약 관리 위생 금전관리 생활리듬 지원에 관한 일반 원칙. 일상생활 기능을 단계적으로 평가하고 회복 목표를 세운다.',level:'높음',status:'enabled'}];st.refInAI=true;st.refAuto60=true;
  const t=boot(DIR,{stored:st,storage:ON,ai:splitAI(makeAI())});await t.ev("runLocalAI('plan-eval')");P=t.prompts[0]?.prompt||'';
  ok((P.match(/\[문헌 1: DSM - 5/g)||[]).length===1&&/생활리듬 지원에 관한 일반 원칙/.test(P),'등록 전문자료 본문이 한 번 들어감');
  ok(/\[관련 전문자료 — [^\n]*\n- /.test(P),'관련 전문자료 본문이 들어감');
  ok(!P.split('\n').some(l=>/^\d+\.\s*$/.test(l)),'빈 번호 줄 없음');
  ok(!/^근거 없는 수치는 만들지 않는다\.\]$/m.test(P),'앞이 잘린 머리말 조각 없음');
  ok(!/실천모델 후보/.test(P),'낱말로 찾은 실천모델 후보 목록 없음');
  ok(/long에는 아래 문구를 그대로 쓴다\. 회원의 지금 상황과 맞지 않으면/.test(P),'장기목표 머리말: 그대로 쓰되 맞지 않으면 longRevise 제안');
  const s3=P.split('===== [step3]')[1]||'';ok(!/담당자가 고른 주 실천모델/.test(s3)&&/계획 단계에서 고른 주 실천모델/.test(s3),'평가 단계 모델은 계획 단계를 따름(예전 계획서 모델을 담당자가 고른 것처럼 쓰지 않음)');}
 console.log('[4] 실시 활동 횟수: 제목의 ‘활동 N회기’를 세고, 권유만 한 문장은 세지 않음');
 {const st=stored57();const m=st.members[0];m.periodStart='2025-09-01';m.periodEnd='2025-12-31';
  m.notes=[N('2025-09-25','미술학원 상담','외부활동을 좋아하는 회원에게 사회적응훈련에 참여하여 스트레스를 해소할 수 있도록 안내함.'),N('2025-09-26','사회적응훈련 2회기','매장에서 물품을 고름.'),N('2025-10-22','사회적응훈련 5회','서점을 둘러봄.'),N('2025-10-27','사회적응훈련 6회기','산책로를 걸음.'),N('2025-10-30','사회적응훈련 7회기','전시회를 관람함.')];
  const t=boot(DIR,{stored:st});const a=t.ev("extractActivities(member()).find(x=>/사회적응훈련/.test(x.name))");
  ok(a&&a.count===4&&a.src==='상담일지 2, 3, 4, 5','사회적응훈련 4회(상담일지 2~5), 권유 기록 1은 빠짐',a&&[a.count,a.src]);}
 console.log('[5] 논문: 동물 실험·약물 연구는 뺌');
 {const S=require(require('path').join(DIR,'api/_scholarly.cjs'));
  ok(S.offTopic({title:'Behavioral effects of receptor activation in the triple-hit rat model of schizophrenia'})&&S.offTopic({title:'Influence of antipsychotic classes on anhedonia'}),'쥐 실험·항정신병약물 논문 제외');
  ok(!S.offTopic({title:'Cognitive-behavioral therapy for negative symptoms of schizophrenia'})&&!S.offTopic({title:'Medication adherence intervention in schizophrenia'}),'심리사회 개입 논문은 남김');}
 console.log('[6] 실무 순서: 현재 계획서에 단기목표가 있으면 평가 먼저를 권하고, 고르면 평가 → 계획으로 한 번에 씀');
 {const fn=m=>true;fn.handlesOrder=true;const t=boot(DIR,{stored:stored57(),storage:ON,ai:splitAI(makeAI()),confirmFn:fn});
  await t.ev("runLocalAI('plan-eval')");const p=t.prompts[0]?.prompt||'';
  ok(t.logs.some(l=>l[0]==='confirm'&&/실무 순서대로/.test(l[1])),'평가 먼저 할지 물음');
  ok(t.prompts.length===1&&p.indexOf('===== [step1] 재활평가')>=0,'평가가 첫 단계로 한 번에 보냄',(p.match(/===== \[step\d\][^=]*=====/g)||[]));
  ok(t.logs.some(l=>l[0]==='alert'&&/과거 평가를 먼저 작성하고 차기 계획/.test(l[1])),'평가 먼저 작성 완료',t.logs.filter(l=>l[0]==='alert').map(l=>l[1].slice(0,120)));}
 console.log('[7] 평가기간이 비어 있으면 묻고, 취소하면 보내지 않음');
 {const st=stored57();st.members[0].periodStart='';st.members[0].periodEnd='';const t=boot(DIR,{stored:st,storage:ON,ai:splitAI(makeAI()),confirmFn:m=>!/평가기간\(시작·종료\)이 비어/.test(m)});
  await t.ev("runLocalAI('plan-eval')");ok(t.prompts.length===0&&t.logs.some(l=>l[0]==='confirm'&&/평가기간/.test(l[1])),'평가기간 확인 후 취소');}
 console.log('[8] 대화체: 기록에 없는 가족 말을 틀 문장으로 넣지 않음, 위험 진술은 대화체에 넣지 않고 안내');
 {const st=stored57();st.members[0].notes.push({date:'2026-09-25',topic:'개별상담',content:'회원이 “요즘 죽고 싶다는 생각이 든다”라고 말함. 직원이 주치의에게 알림.',result:'위기상담을 실시함.',included:true});
  const ai=makeAI();const t=boot(DIR,{stored:st,storage:ON,ai:splitAI(b=>{const o=ai(b);if(o&&'familyDialogue' in o)o.familyDialogue='';return o})});
  await t.ev("runLocalAI('plan-eval')");const p=t.ev('member().plan');
  ok(!/방에만 누워|씻고 옷 갈아입는|계획 없이 쓰지/.test(p.familyVoice),'가족 대화체에 틀 문장 없음',p.familyVoice);
  ok(!/죽고 싶/.test(p.memberVoice+p.familyVoice),'위험 진술은 대화체에 없음',p.memberVoice);
  ok(t.logs.some(l=>l[0]==='alert'&&/^⚠ 체크한 상담일지\(기록 7\)에 자살·자해·타해/.test(l[1])),'완료 창 맨 위에 안전 계획 확인 안내',t.logs.filter(l=>l[0]==='alert').map(l=>l[1].slice(0,80)));}
 done();
})();
