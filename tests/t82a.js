'use strict';
// v3.26.3 — 프로그램이 AI(Claude) 답을 임의로 바꾸지 않는지 (가상 자료·가짜 답만 사용)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const splitAI=ai=>body=>{const p=String(body.prompt);if(!/===== \[step1\]/.test(p))return ai(body);const parts=p.split(/===== \[step\d\] [^=]+ =====\n/).slice(1);const out={};parts.forEach((x,i)=>{out['step'+(i+1)]=ai({prompt:x})});return out};
(async()=>{
 console.log('[1] 끝맺음 바꾸기: 받침 ㅁ 명사를 ‘~ㄴ다’로 바꾸지 않음');
 {const t=boot(DIR,{stored:stored57()});const f=x=>t.ev(`futureText(${JSON.stringify(x)})`);
  for(const [a,b] of [['개별상담(보호자 관련 의견 정리)','개별상담(보호자 관련 의견 정리)'],['월 1회 근무 상담','월 1회 근무 상담'],['주 1회 복약 점검','주 1회 복약 점검'],['사회기술훈련 프로그램','사회기술훈련 프로그램'],['식사일지를 매일 작성함.','식사일지를 매일 작성한다.'],['산책 기록을 남김.','산책 기록을 남긴다.'],['회원의 상태를 살핌.','회원의 상태를 살핀다.']])ok(f(a)===b,`‘${a}’ → ‘${b}’`,f(a));
  const doc={plan:{goals:[{long:'',short:'',plan:'',target:'',activity:'- 개별상담 진행함\n- 월 1회 근무 상담'}]},evaluation:{goals:[]}};
  const out=t.ev(`futurePlanDoc(${JSON.stringify(doc)})`);ok(out.plan.goals[0].activity===doc.plan.goals[0].activity,'세부활동 칸은 끝맺음을 바꾸지 않음',out.plan.goals[0].activity);}
 console.log('[2] 회원·가족 대화체: AI 줄을 그대로 씀');
 {const t=boot(DIR,{stored:stored57()});
  const ai={memberDialogue:'저녁에 미술학원에 다니고 싶어요.\n보호자 송년회는 부담돼요.\n아직은 힘들어서 더 쉬고 싶어요.',familyDialogue:'',memberNeed:'- x',familyNeed:'',opinion:'',managerItems:[],psycho:{},strength:['','',''],weakness:['','','']};
  const voice={memberVoice:'괜찮아요.',memberVoiceSrc:'direct',memberSource:true,familyVoice:'',familyVoiceSrc:''};
  const uq=x=>String(x).replace(/[“”]/g,'');const p=t.ev(`compileAIPlan(${JSON.stringify(ai)},{goals:[{goalId:'',long:'일상생활을 유지한다.',short:['주 1회 상담에 참여한다.'],plan:['- 주 1회 상담한다.'],activity:['- 상담'],target:['- 주 1회 상담 참여'],src:[1]}],services:[]},${JSON.stringify(voice)},3,null,null)`);
  ok(uq(p.memberVoice)===ai.memberDialogue,'프로그램이 뽑은 인용을 끼워 넣거나 줄을 자르지 않음',p.memberVoice);
  const p2=t.ev(`compileAIPlan(${JSON.stringify({...ai,memberDialogue:''})},{goals:[{goalId:'',long:'일상생활을 유지한다.',short:['주 1회 상담에 참여한다.'],plan:['- 주 1회 상담한다.'],activity:['- 상담'],target:['- 주 1회 상담 참여'],src:[1]}],services:[]},${JSON.stringify(voice)},3,null,null)`);
  ok(uq(p2.memberVoice)==='괜찮아요.','AI가 비워 두면 그때만 상담일지 인용을 씀',p2.memberVoice);
  const p3=t.ev(`compileAIPlan(${JSON.stringify({...ai,memberDialogue:'미술 수업이 좋아요.\n죽고 싶어요.'})},{goals:[{goalId:'',long:'일상생활을 유지한다.',short:['주 1회 상담에 참여한다.'],plan:['- 주 1회 상담한다.'],activity:['- 상담'],target:['- 주 1회 상담 참여'],src:[1]}],services:[]},${JSON.stringify(voice)},3,null,null)`);
  ok(uq(p3.memberVoice)==='미술 수업이 좋아요.','위험 관련 말은 전처럼 대화체에 넣지 않음',p3.memberVoice);}
 console.log('[3] 평가기간이 비어 있으면 상담일지 날짜로 채우고 알림');
 {const st=stored57();st.members[0].periodStart='';st.members[0].periodEnd='';
  const t=boot(DIR,{stored:st,storage:{rehab_gemini_oneshot_v1:'on'},ai:splitAI(makeAI())});
  await t.ev("runLocalAI('plan-eval')");const m=t.ev('member()');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(m.periodStart)&&/^\d{4}-\d{2}-\d{2}$/.test(m.periodEnd),'평가기간이 채워짐',[m.periodStart,m.periodEnd]);
  ok(t.logs.some(l=>l[0]==='alert'&&/평가기간이 비어 있어 체크한 상담일지 날짜/.test(l[1])),'채운 사실을 완료 창에 알림');}
 done();setTimeout(()=>process.exit(process.exitCode||0),50);
})();
