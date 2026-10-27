// v3.21.60 — 체크한 상담일지의 증상·문제로 전문자료를 찾아 계획서·평가서·주치의편지에 반영
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const K=require(require('path').resolve(__dirname,'../pro-knowledge.js'));
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const isDoc=b=>/\[주치의편지\]/.test(b.prompt||'');
const okServer=b=>({status:200,data:{sources:[],topicSources:K.sourcesFor(b.topics||[]).map(k=>({key:k,checkedOnline:true,overview:''})),liveChecks:1}});
const REF={id:'ref1',title:'가상 금전관리 지침',author:'가상 기관',year:'2025',type:'실무지침',level:'중간',url:'',status:'enabled',body:'용돈 기입장과 지출 계획은 금전관리 훈련의 기본이다. 회원이 직접 지출을 기록하고 주 1회 함께 확인한다. 군것질 지출은 작은 목표로 줄여 나간다.',createdAt:'2025-01-01T00:00:00Z'};
(async()=>{
 console.log('[1] 체크한 상담일지에서 증상·문제 찾기');
 {const t=boot(DIR,{stored:stored57()});const ids=()=>t.ev("proTopics(noteSentences(member())).map(x=>x.id)");
  const a=ids();ok(a.includes('money')&&a.includes('negative')&&a.includes('meds')&&a.includes('hygiene'),'금전·활동 회피·복약·위생을 찾음',a);
  t.ev("member().notes[3].included=false");const b=ids();ok(!b.includes('money')||b.length<a.length,'체크를 빼면 그 상담일지 내용은 안 씀',b);
  ok(t.ev("proTopics([{i:0,s:'오늘은 날씨가 좋다고 말함.'}]).length")===0,'증상·문제가 없으면 찾지 않음');
 }
 console.log('[2] 계획서·평가서 AI 요청에 전문자료(서버에는 주제 이름만)');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:okServer});
  await t.ev("runLocalAI('plan-eval')");
  const A=t.prompts.find(b=>stepOf(b.prompt)==='A'),B=t.prompts.find(b=>stepOf(b.prompt)==='B'),C=t.prompts.find(b=>stepOf(b.prompt)==='C');
  for(const [n,P] of [['분석',A],['목표',B],['평가',C]])ok(/\[관련 전문자료 — 체크한 상담일지에 나온 증상·문제로 찾은 공개 자료 요약/.test(P.prompt)&&/\[전문자료 쓰는 법\]/.test(P.prompt),n+' 요청에 전문자료');
  ok(/- 금전관리 \(상담일지 4\): 한 달 수입·지출을 회원과 함께 파악하고/.test(B.prompt),'주제·상담일지 번호·요약',(B.prompt.match(/- 금전관리[^\n]*/)||[''])[0].slice(0,120));
  ok(/\[출처: SAMHSA 질병관리와 회복\(IMR\) 근거기반 실천 키트\(공식 페이지 확인\), 국가정신건강정보포털 조현병[^\]]*\(공식 페이지 확인\)/.test(B.prompt),'출처와 공식 페이지 확인 표시(국내 자료 포함)',(B.prompt.match(/\[출처: SAMHSA[^\]]*\]/)||[''])[0]);
  const g=t.guidanceCalls;ok(g.length===1&&JSON.stringify(g[0].categories)==='[]'&&g[0].topics.every(x=>K.byId[x])&&!/산책|용돈|복약/.test(JSON.stringify(g)),'서버에는 고정 목록의 주제 이름만',g);
  const al=t.logs.filter(l=>l[0]==='alert').pop()[1];ok(/전문자료 \d개 주제 참고\(.*공식 페이지 확인 \d+\/\d+곳, 회원 정보 전송 없음\)/.test(al),'완료 안내에 참고한 전문자료',al.slice(-160));
 }
 console.log('[3] 서버를 못 써도 내장 요약으로 계속');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:()=>({status:500,data:{error:'x'}})});
  await t.ev("runLocalAI('plan')");const B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(/\[관련 전문자료/.test(B.prompt)&&!/공식 페이지 확인\)/.test(B.prompt),'내장 요약(확인 표시 없음)');
  ok(t.ev('member().plan.goals.filter(g=>g.long).length')>=3,'작성은 그대로');
 }
 console.log('[4] 등록 전문자료(전문자료 학습관리)도 함께 — 기본 켬, 끌 수 있음');
 {const st=stored57();st.references=[REF];const t=boot(DIR,{stored:st,ai:makeAI(),guidance:okServer});
  await t.ev("runLocalAI('plan')");let B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(/\[문헌 1: 가상 금전관리 지침/.test(B.prompt),'관련 등록 자료 발췌가 들어감');
  t.ev("state.refInAI=false");t.prompts.length=0;await t.ev("runLocalAI('plan')");B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(!/가상 금전관리 지침/.test(B.prompt)&&/\[관련 전문자료/.test(B.prompt),'끄면 등록 자료만 빠지고 공개 요약은 그대로');
 }
 console.log('[5] 주치의편지 AI 요청에도');
 {const st=stored57();st.references=[REF];const base=makeAI();const t=boot(DIR,{stored:st,guidance:okServer,ai:b=>isDoc(b)?{programs:'산책 프로그램',sections:{},grades:{}}:base(b)});
  await t.ev('runDoctorLetterAI()');const D=t.prompts.find(isDoc);
  ok(/\[관련 전문자료 — /.test(D.prompt)&&/- 금전관리 \(상담일지 4\)/.test(D.prompt),'공개 전문자료 요약');
  ok(/\[문헌 1: 가상 금전관리 지침/.test(D.prompt),'등록 전문자료 발췌');
  ok(/전문자료 \d개 주제 참고/.test(t.logs.filter(l=>l[0]==='alert').pop()[1]),'완료 안내');
 }
 console.log('[6] 화면: AI 자동작성 · 주치의편지 · 전문자료 학습관리');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='ai';paint()");
  const box=t.$('.pro-box');ok(box&&/체크한 상담일지로 찾은 전문자료/.test(box.textContent)&&/금전관리/.test(box.textContent)&&/상담일지 4/.test(box.textContent),'AI 화면에 찾은 전문자료',box&&box.textContent.slice(0,120));
  ok(box.querySelector('a[href^="https://"][target="_blank"][rel*="noopener"]'),'출처 링크(새 창)');
  t.ev("state.view='doctor';paint()");ok(/체크한 상담일지로 찾은 전문자료/.test(t.$('#content').textContent),'주치의편지 화면에도');
  t.ev("state.view='references';paint()");const lib=[...t.w.document.querySelectorAll('.pro-box')].find(x=>/내장 공개 전문자료/.test(x.textContent));ok(lib&&lib.querySelectorAll('li').length===K.TOPICS.length,'전문자료 학습관리에 내장 자료 목록',lib&&lib.querySelectorAll('li').length);
  t.ev("member().notes.forEach(n=>{n.content='날씨 이야기를 나눔.';n.intervention='';n.result='';n.counselorOpinion='';n.topic='면담'});member().notes.forEach((n,i)=>updateNoteBody(member(),i));state.view='ai';paint()");
  ok(/증상·문제 낱말을 찾지 못했습니다/.test(t.$('.pro-box').textContent),'찾은 것이 없으면 안내');
 }
 console.log('[7] 준비 중(지침·전문자료 확인)에는 두 번 시작하지 않음');
 {let release;const gate=new Promise(r=>release=r);const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:async b=>{await gate;return okServer(b)}});
  const p1=t.ev("runLocalAI('plan')");await new Promise(r=>setTimeout(r,20));const p2=t.ev("runLocalAI('plan')");const p3=t.ev('runDoctorLetterAI()');release();await p1;await p2;await p3;
  ok(t.prompts.filter(b=>stepOf(b.prompt)==='A').length===1&&!t.prompts.some(isDoc),'한 번만 실행',t.prompts.map(b=>stepOf(b.prompt)));
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
