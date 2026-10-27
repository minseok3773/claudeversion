// v3.21.66 — 화면: 구글 검색 대신 공개 논문 검색으로 찾은 최신 논문 표시·AI 반영, ‘최신 전문자료 찾기’ 기본 켬 (가상 자료·가상 검색 결과만)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const K=require(require('path').join(DIR,'pro-knowledge.js'));
const isDoc=b=>/\[주치의편지\]/.test(b.prompt||'');
const okServer=b=>({status:200,data:{sources:[],topicSources:K.sourcesFor(b.topics||[]).map(k=>({key:k,checkedOnline:true,overview:''})),liveChecks:1}});
const TEXT='1. Social skills training for people with schizophrenia: a randomised trial (2024, Journal of Imaginary Rehabilitation)\n   초록 일부: Social skills training is a psychosocial intervention.\n2. Peer support and social participation after psychosis (2025, Imaginary Journal of Recovery)\n   초록 일부: Peer support groups improved social participation.';
const RES_SCH=(over={})=>()=>({status:200,data:{searched:true,provider:'scholarly',model:'공개 논문 검색(Europe PMC·Crossref)',text:TEXT,queries:['social skills training schizophrenia'],
 sources:[{title:'Social skills training for people with schizophrenia: a randomised trial (2024) — Europe PMC',uri:'https://doi.org/10.1000/fake.sst.2024.001'},{title:'Peer support and social participation after psychosis (2025) — Crossref',uri:'https://doi.org/10.1000/fake.peer.2025.7'}],
 suggestions:'<div class="chip">should not be shown</div>',at:'2026-10-25T05:00:00.000Z',fallback:{why:'tier',message:'구글 검색은 지금 쓰는 Gemini 무료 등급에서 안 되어'},...over}});
const lastAlert=t=>(t.logs.filter(l=>l[0]==='alert').pop()||['',''])[1];
(async()=>{
 console.log('[1] 예전 저장본도 ‘최신 전문자료 찾기’가 한 번 켜짐(기본 켬)');
 {const st=stored57();delete st.webSearch;delete st.webAuto66;const t=boot(DIR,{stored:st});ok(t.ev('state.webSearch')===true,'설정이 없던 저장본 → 켬');
  t.flush();ok(t.saved()?.webSearch===true&&t.saved()?.webAuto66===true,'켠 상태와 표시를 저장',t.saved()&&[t.saved().webSearch,t.saved().webAuto66]);
  const st2=stored57();st2.webSearch=false;const t2=boot(DIR,{stored:st2});ok(t2.ev('state.webSearch')===true,'v3.21.65까지 기본으로 꺼져 있던 저장본도 한 번 켬');
  const st3=stored57();st3.webSearch=false;st3.webAuto66=true;const t3=boot(DIR,{stored:st3});ok(t3.ev('state.webSearch')===false,'v3.21.66 이후 담당자가 끈 것은 그대로');
  const t4=boot(DIR,{});ok(t4.ev('state.webSearch')===true,'처음 쓰는 브라우저도 켬');
  t3.ev("state.view='references';paint()");const txt=t3.$('#content').textContent;
  ok(/AI 자동작성 때 최신 전문자료도 찾아보기/.test(txt)&&/최신 전문자료도 찾아보기 \(구글 검색, 안 되면 무료 공개 논문 검색\)/.test(txt)&&/기본으로 켜져 있습니다/.test(txt)&&/Europe PMC·Crossref/.test(txt),'전문자료 학습관리 안내',txt.match(/AI 자동작성 때 최신[^.]*\./)?.[0]);
  ok(!/켜도 ‘구글 검색 안 됨’만 나옵니다/.test(txt),'예전 안내(켜도 안 됨) 없음');
 }
 console.log('[2] 백업 불러오기: 예전 백업은 켬, 새 백업은 담당자 설정 그대로');
 {const t=boot(DIR,{stored:stored57()});
  ok(t.ev("(()=>{const d=JSON.parse(JSON.stringify(exportPayload()));delete d.webAuto66;d.webSearch=false;safeImport(d);return state.webSearch})()")===true,'예전 백업(표시 없음) → 켬');
  ok(t.ev("(()=>{const d=JSON.parse(JSON.stringify(exportPayload()));d.webAuto66=true;d.webSearch=false;safeImport(d);return state.webSearch})()")===false,'새 백업에서 끈 설정 → 끔');
 }
 console.log('[3] 공개 논문 검색 결과가 오면 AI 요청에 ‘단정하지 말라’는 안내와 함께');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:okServer,research:RES_SCH()});
  await t.ev("runLocalAI('plan-eval')");ok(t.researchCalls.length===1,'검색은 한 번',t.researchCalls.length);
  ok(!/[가-힣]/.test(JSON.stringify(t.researchCalls)),'검색 요청에 한글(회원 정보·상담 문장) 없음',JSON.stringify(t.researchCalls));
  const B=t.prompts.find(b=>stepOf(b.prompt)==='B'),C=t.prompts.find(b=>stepOf(b.prompt)==='C');
  for(const [n,P] of [['목표',B],['평가',C]])ok(/\[공개 논문 검색\(Europe PMC·Crossref\)으로 찾은 최신 논문 — 2026-10-25 검색\. 논문 제목과 초록 일부\(영어\)이며 원문은 확인하지 않았다\. 효과·근거 수준·수치를 단정하지 말고 일반적인 지원 방향의 참고로만 쓴다\. 이 회원의 사실이 아니다\]/.test(P.prompt)&&P.prompt.includes('Peer support groups improved social participation.'),n+' 요청에 논문 자료',P&&P.prompt.slice(0,100));
  ok(!/\[구글 검색으로 찾은/.test(B.prompt)&&/\[관련 전문자료 — /.test(B.prompt)&&/\[전문자료 쓰는 법\]/.test(B.prompt),'구글 검색 머리말은 없고 내장 요약·쓰는 법은 그대로');
  ok(/상담일지에 없는 회원의 말·행동·결과를 만들지 않는다/.test(B.prompt),'회원 사실을 만들지 않게 하는 원칙 유지');
  const al=lastAlert(t);ok(/공개 논문 검색으로 최신 논문 2건 참고\(구글 검색 대신\)/.test(al),'완료 안내',al.slice(-220));
  t.ev("state.view='ai';paint()");const box=t.$('#proBox');
  ok(box&&/공개 논문 2건/.test(box.querySelector('summary').textContent)&&!/구글 검색 출처/.test(box.querySelector('summary').textContent),'요약 줄',box&&box.querySelector('summary').textContent);
  const web=box.querySelector('.pro-web');
  ok(web&&/공개 논문 검색으로 찾은 최신 논문/.test(web.textContent)&&/2026-10-25 검색/.test(web.textContent)&&/논문 2건/.test(web.textContent),'결과 칸 제목',web&&web.textContent.slice(0,120));
  ok(/구글 검색은 지금 쓰는 Gemini 무료 등급에서 안 되어 무료 공개 논문 검색\(Europe PMC·Crossref\)으로 대신 찾았습니다/.test(web.textContent),'구글 대신 찾은 이유',web.textContent);
  ok(web.querySelector('.pro-web-text').textContent===TEXT,'논문 목록은 고치지 않고 그대로');
  const links=[...web.querySelectorAll('a[href^="https://doi.org/"]')];ok(links.length===2&&links.every(a=>a.target==='_blank'&&/noopener/.test(a.rel)),'논문 링크(새 창)');
  ok(!web.querySelector('.pro-gs')&&!/should not be shown/.test(web.innerHTML),'구글 검색 추천 칸은 없음');
  ok(/회원 이름·상담일지 문장은 보내지 않았습니다/.test(web.textContent),'보낸 것 안내');
  ok(/다시 검색/.test(web.querySelector('[data-act="pro-search"]').textContent),'다시 검색 버튼');
 }
 console.log('[4] 주치의편지에도 같은 논문 자료');
 {const base=makeAI();const t=boot(DIR,{stored:stored57(),guidance:okServer,research:RES_SCH(),ai:b=>isDoc(b)?{programs:'산책 프로그램',sections:{},grades:{}}:base(b)});
  await t.ev('runDoctorLetterAI()');const D=t.prompts.find(isDoc);
  ok(D&&/\[공개 논문 검색\(Europe PMC·Crossref\)으로 찾은 최신 논문/.test(D.prompt)&&/약물 조정 같은 의학적 판단은 쓰지 않는다/.test(D.prompt),'주치의편지 요청에 논문 자료와 쓰는 법');
  ok(/공개 논문 검색으로 최신 논문 2건 참고/.test(lastAlert(t)),'완료 안내');
 }
 console.log('[5] 미리 찾아보기 버튼 · 검색 중 표시');
 {let release;const gate=new Promise(r=>release=r);const t=boot(DIR,{stored:stored57(),research:async b=>{await gate;return RES_SCH()(b)}});
  t.ev("state.view='ai';paint()");const btn=t.$('#proBox [data-act="pro-search"]');ok(btn&&/최신 전문자료 찾아보기/.test(btn.textContent),'처음에는 찾아보기 버튼',btn&&btn.textContent);
  ok(/구글 검색, 안 되면 무료 공개 논문 검색/.test(t.$('#proBox .pro-web').textContent),'무엇으로 찾는지 안내',t.$('#proBox .pro-web').textContent);
  t.click(btn);await sleep(20);const b2=t.$('#proBox [data-act="pro-search"]');ok(b2&&b2.disabled&&/찾는 중/.test(b2.textContent),'찾는 동안 잠김',b2&&b2.outerHTML);
  release();await sleep(30);ok(/공개 논문 검색으로 찾은 최신 논문/.test(t.$('#proBox .pro-web').textContent),'결과 표시');
 }
 console.log('[6] 둘 다 안 되면 이유와 함께 내장 요약으로 계속');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:okServer,research:()=>({status:200,data:{searched:false,why:'tier',message:'지금 쓰는 Gemini 무료 등급에서는 구글 검색 연동을 쓸 수 없습니다. 공개 논문 검색도 지금은 되지 않았습니다.',tried:[]}})});
  await t.ev("runLocalAI('plan')");ok(t.ev('member().plan.goals.filter(g=>g.long).length')>=3,'작성은 그대로 됨');
  ok(/최신 자료 찾기 안 됨: .*공개 논문 검색도 지금은 되지 않았습니다/.test(lastAlert(t)),'완료 안내에 이유',lastAlert(t).slice(-200));
  t.ev("state.view='ai';paint()");ok(/최신 자료 찾기 안 됨:/.test(t.$('#proBox .pro-web').textContent)&&/내장 요약으로 작성/.test(t.$('#proBox .pro-web').textContent),'화면 안내');
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[7] 논문 결과의 글·주소도 안전하게');
 {const t=boot(DIR,{stored:stored57(),research:RES_SCH({text:'<img src=x onerror=alert(1)> paper',sources:[{title:'bad',uri:'javascript:alert(1)'},{title:'<b>x</b>',uri:'https://doi.org/10.1000/ok'}]})});
  t.ev("state.view='ai';paint()");t.click('#proBox [data-act="pro-search"]');await sleep(30);const web=t.$('#proBox .pro-web');
  ok(web&&!web.querySelector('img,.pro-web-text b')&&web.querySelectorAll('a[href^="https://"]').length===1&&!web.querySelector('a[href^="javascript"]'),'HTML은 글자로, https 주소만');
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
