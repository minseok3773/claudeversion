// v3.21.61 — AI 자동작성·주치의편지에 구글 검색으로 찾은 전문자료 반영(가상 자료·가상 검색 결과만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const K=require(require('path').resolve(__dirname,'../pro-knowledge.js'));
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const isDoc=b=>/\[주치의편지\]/.test(b.prompt||'');
const okServer=b=>({status:200,data:{sources:[],topicSources:K.sourcesFor(b.topics||[]).map(k=>({key:k,checkedOnline:true,overview:''})),liveChecks:1}});
const TEXT='■ 금전관리\n1) 용돈 기입장으로 주간 지출 계획을 세우고 함께 점검한다.\n2) 지표: 계획 대비 지출 차이.\n■ 무기력·의욕 저하·활동 회피\n1) 행동활성화: 쉬운 활동부터 단계적 활동 계획표를 만든다.';
const RES_OK=(over={})=>()=>({status:200,data:{searched:true,model:'gemini-3.1-flash-lite',text:TEXT,queries:['정신재활 금전관리 훈련 방법','행동활성화 조현병 음성증상'],
 sources:[{title:'ncmh.go.kr',uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA'},{title:'who.int',uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/BBB'}],
 suggestions:'<style>.chip{color:#333}</style><div class="container"><a class="chip" href="https://www.google.com/search?q=%EA%B8%88%EC%A0%84">정신재활 금전관리</a></div>',at:'2026-10-25T05:00:00.000Z',...over}});
const TIER_MSG='지금 쓰는 Gemini 무료 등급에서는 구글 검색 연동이 막혀 있습니다. Google AI Studio에서 결제 정보를 등록해 유료 등급으로 바꾸면 매달 구글 검색 5,000회까지 무료로 쓸 수 있습니다.';
const RES_TIER=()=>({status:200,data:{searched:false,why:'tier',message:TIER_MSG,tried:[]}});
const st61=()=>{const s=stored57();s.webSearch=true;return s}; // v3.21.62: 구글 검색은 켰을 때만
const lastAlert=t=>(t.logs.filter(l=>l[0]==='alert').pop()||['',''])[1];
(async()=>{
 console.log('[1] 구글 검색이 되면 계획서·평가서 요청에 검색 자료와 문서별 쓰는 법');
 {const t=boot(DIR,{stored:st61(),ai:makeAI(),guidance:okServer,research:RES_OK()});
  await t.ev("runLocalAI('plan-eval')");
  ok(t.researchCalls.length===1,'검색은 한 번',t.researchCalls.length);
  const body=t.researchCalls[0]||{};ok(JSON.stringify(Object.keys(body).sort())==='["categories","force","topics"]'&&body.topics.length&&body.topics.every(x=>K.byId[x])&&body.force===false,'서버에는 고정 목록의 주제 id만',body);
  ok(!/[가-힣]/.test(JSON.stringify(t.researchCalls)),'검색 요청에 한글(회원 정보·상담 문장)이 전혀 없음',JSON.stringify(t.researchCalls));
  const A=t.prompts.find(b=>stepOf(b.prompt)==='A'),B=t.prompts.find(b=>stepOf(b.prompt)==='B'),C=t.prompts.find(b=>stepOf(b.prompt)==='C');
  for(const [n,P] of [['분석',A],['목표',B],['평가',C]])ok(/\[구글 검색으로 찾은 최신 전문자료 — 2026-10-25 검색\. 일반 원칙이며 이 회원의 사실이 아니다\]/.test(P.prompt)&&/행동활성화: 쉬운 활동부터 단계적 활동 계획표/.test(P.prompt)&&/\[검색 출처\] ncmh\.go\.kr, who\.int/.test(P.prompt),n+' 요청에 구글 검색 자료');
  ok(/장기목표의 개입 방법\(서비스 내용\)과 단기목표의 실행 방법에 무엇을·어떻게·얼마나/.test(B.prompt)&&/성과 기준은 자료의 관찰·평가 지표/.test(B.prompt),'계획서: 개입 방법·성과 기준에 반영하라는 지시');
  ok(/목표 달성 여부는 상담일지의 사실로만 판단/.test(C.prompt)&&/다음 계획 제안에는 자료의 근거 기반 개입 방법/.test(C.prompt)&&!/장기목표의 개입 방법\(서비스 내용\)과/.test(C.prompt),'평가서: 판단 기준·다음 계획 지시');
  ok(/상담일지에 없는 회원의 말·행동·결과를 만들지 않는다/.test(B.prompt)&&/기관·자료 이름은 문서에 쓰지 않는다/.test(B.prompt),'회원 사실을 만들지 않게 하는 원칙 유지');
  ok(/\[관련 전문자료 — 체크한 상담일지에 나온 증상·문제로 찾은 공개 자료 요약/.test(B.prompt),'내장 요약도 함께');
  const al=lastAlert(t);ok(/구글 검색으로 최신 전문자료 2곳 참고\(검색어: ‘정신재활 금전관리 훈련 방법’, ‘행동활성화 조현병 음성증상’\)/.test(al),'완료 안내에 구글 검색 참고',al.slice(-260));
  t.ev("state.view='ai';paint()");const box=t.$('#proBox');
  ok(box&&/구글 검색 출처 2곳/.test(box.querySelector('summary').textContent),'요약 줄에 구글 검색',box&&box.querySelector('summary').textContent);
  const web=box.querySelector('.pro-web');ok(web&&/구글 검색으로 찾은 최신 전문자료/.test(web.textContent)&&/2026-10-25 검색/.test(web.textContent)&&/검색어: ‘정신재활 금전관리 훈련 방법’/.test(web.textContent),'검색 결과 칸',web&&web.textContent.slice(0,200));
  ok(web.querySelector('.pro-web-text').textContent===TEXT,'검색 요약은 고치지 않고 그대로');
  const links=[...web.querySelectorAll('a[href^="https://vertexaisearch"]')];ok(links.length===2&&links.every(a=>a.target==='_blank'&&/noopener/.test(a.rel)),'출처 링크(새 창)');
  const gs=web.querySelector('.pro-gs');ok(gs&&gs.shadowRoot&&/class="chip"/.test(gs.shadowRoot.innerHTML),'구글 검색 추천을 그대로 붙임(따로 떼어)',gs&&gs.outerHTML);
  const chip=gs.shadowRoot.querySelector('a.chip');chip.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true,composed:true,cancelable:true}));
  const op=t.logs.find(l=>l[0]==='open');ok(op&&/^https:\/\/www\.google\.com\/search\?q=/.test(op[1])&&op[2]==='_blank','검색 추천을 누르면 새 창',op);
  t.ev("paint()");ok(t.$('#proBox .pro-gs').shadowRoot,'다시 그려도 검색 추천 유지');
  t.prompts.length=0;await t.ev("runLocalAI('plan')");ok(t.researchCalls.length===1&&/\[구글 검색으로 찾은 최신 전문자료/.test(t.prompts.find(b=>stepOf(b.prompt)==='B').prompt),'다시 작성할 때는 찾아 둔 결과를 씀(검색 다시 안 함)',t.researchCalls.length);
 }
 console.log('[2] 구글 검색이 안 되면 이유를 보여 주고 내장 요약으로 계속');
 {const t=boot(DIR,{stored:st61(),ai:makeAI(),guidance:okServer,research:RES_TIER});
  await t.ev("runLocalAI('plan')");const B=t.prompts.find(b=>stepOf(b.prompt)==='B');
  ok(!/\[구글 검색으로 찾은/.test(B.prompt)&&/\[관련 전문자료 — /.test(B.prompt)&&/\[전문자료 쓰는 법\]/.test(B.prompt),'내장 요약과 쓰는 법은 그대로');
  ok(t.ev('member().plan.goals.filter(g=>g.long).length')>=3,'작성은 그대로 됨');
  const al=lastAlert(t);ok(/전문자료 \d개 주제 참고\(.*공식 페이지 확인 \d+\/\d+곳, 회원 정보 전송 없음\)/.test(al)&&/최신 자료 찾기 안 됨: 지금 쓰는 Gemini 무료 등급/.test(al),'완료 안내에 검색이 안 된 이유',al.slice(-300));
  t.ev("state.view='ai';paint()");const web=t.$('#proBox .pro-web');ok(web&&/최신 자료 찾기 안 됨:/.test(web.textContent)&&/결제 정보를 등록해 유료 등급/.test(web.textContent)&&/내장 요약으로 작성/.test(web.textContent),'화면에 이유와 조건',web&&web.textContent);
  ok(/다시 시도/.test(web.querySelector('[data-act="pro-search"]').textContent),'다시 시도 버튼');
 }
 {const t=boot(DIR,{stored:st61(),ai:makeAI(),guidance:okServer,research:()=>({status:500,data:{error:'x'}})});
  await t.ev("runLocalAI('plan')");ok(/최신 자료 찾기 안 됨: 자료 검색을 하지 못했습니다\(서버 응답 500\)/.test(lastAlert(t)),'서버 오류도 안내하고 계속',lastAlert(t).slice(-120));
 }
 console.log('[3] 주치의편지에도 구글 검색 자료(주치의편지용 쓰는 법)');
 {const base=makeAI();const t=boot(DIR,{stored:st61(),guidance:okServer,research:RES_OK(),ai:b=>isDoc(b)?{programs:'산책 프로그램',sections:{},grades:{}}:base(b)});
  await t.ev('runDoctorLetterAI()');const D=t.prompts.find(isDoc);
  ok(D&&/\[구글 검색으로 찾은 최신 전문자료/.test(D.prompt)&&/개입 내용은 상담일지에 있는 개입만 쓰되 자료의 용어로/.test(D.prompt)&&/약물 조정 같은 의학적 판단은 쓰지 않는다/.test(D.prompt),'주치의편지 요청에 검색 자료와 쓰는 법');
  ok(!/[가-힣]/.test(JSON.stringify(t.researchCalls))&&t.researchCalls.length===1,'검색 요청에는 회원 정보 없음');
  ok(/구글 검색으로 최신 전문자료 2곳 참고/.test(lastAlert(t)),'완료 안내');
  ok(t.$('#content .pro-web')&&/구글 검색으로 찾은 최신 전문자료/.test(t.$('#content .pro-web').textContent),'주치의편지 화면에도 검색 결과');
 }
 console.log('[4] ‘최신 전문자료 찾아보기’ 버튼');
 {let release;const gate=new Promise(r=>release=r);const t=boot(DIR,{stored:st61(),research:async b=>{await gate;return RES_OK()(b)}});
  t.ev("state.view='ai';paint()");const btn=t.$('#proBox [data-act="pro-search"]');ok(btn&&/최신 전문자료 찾아보기/.test(btn.textContent),'처음에는 찾아보기 버튼',btn&&btn.textContent);
  t.click(btn);await sleep(20);const b2=t.$('#proBox [data-act="pro-search"]');ok(b2&&b2.disabled&&/찾는 중/.test(b2.textContent)&&t.$('#proBox').open,'찾는 동안 버튼이 잠기고 칸이 열림',b2&&b2.outerHTML);
  t.click('#proBox [data-act="pro-search"]');await sleep(10);
  // 찾는 동안 AI 자동작성을 눌러도 같은 검색을 기다려 함께 씀(두 번 검색하지 않음)
  release();await sleep(30);ok(t.researchCalls.length===1,'두 번 누르지 않음',t.researchCalls.length);
  const web=t.$('#proBox .pro-web');ok(web&&/구글 검색으로 찾은 최신 전문자료/.test(web.textContent),'결과 표시');
  t.click('#proBox [data-act="pro-search"]');await sleep(30);ok(t.researchCalls.length===2&&t.researchCalls[1].force===true,'‘다시 검색’은 새로 찾기',t.researchCalls[1]);
 }
 {let release;const gate=new Promise(r=>release=r);const t=boot(DIR,{stored:st61(),ai:makeAI(),guidance:okServer,research:async b=>{await gate;return RES_OK()(b)}});
  t.ev("state.view='ai';paint()");t.click('#proBox [data-act="pro-search"]');await sleep(10);const run=t.ev("runLocalAI('plan')");await sleep(10);release();await run;
  ok(t.researchCalls.length===1&&/\[구글 검색으로 찾은 최신 전문자료/.test(t.prompts.find(b=>stepOf(b.prompt)==='B').prompt),'찾는 중에 AI 자동작성을 누르면 같은 검색을 기다려 씀',t.researchCalls.length);
 }
 console.log('[5] 증상 낱말이 없어도 진단 분류로 검색');
 {const t=boot(DIR,{stored:st61(),ai:makeAI(),guidance:okServer,research:RES_OK()});
  t.ev("member().notes.forEach(n=>{n.content='날씨 이야기를 나눔.';n.intervention='';n.result='';n.counselorOpinion='';n.topic='면담'});member().notes.forEach((n,i)=>updateNoteBody(member(),i));member().psychiatricConditions=['조현병'];state.view='ai';paint()");
  const box=t.$('#proBox');ok(box&&/진단 분류 조현병 계열/.test(box.textContent)&&/진단 분류로만 찾습니다/.test(box.textContent),'화면 안내',box&&box.textContent.slice(0,160));
  await t.ev("runLocalAI('plan')");ok(JSON.stringify(t.researchCalls[0])==='{"topics":[],"categories":["psychosis"],"force":false}','진단 분류만 보냄',t.researchCalls[0]);
  const B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(/\[구글 검색으로 찾은 최신 전문자료/.test(B.prompt)&&!/\[관련 전문자료 — /.test(B.prompt),'검색 자료만(내장 주제 요약은 없음)');
 }
 console.log('[6] 검색 결과의 글·주소는 안전하게');
 {const t=boot(DIR,{stored:st61(),research:RES_OK({text:'<b>굵게</b><img src=x onerror=alert(1)> 자료',sources:[{title:'bad',uri:'javascript:alert(1)'},{title:'<i>ok</i>',uri:'https://vertexaisearch.cloud.google.com/x'}],suggestions:''})});
  t.ev("state.view='ai';paint()");t.click('#proBox [data-act="pro-search"]');await sleep(30);
  const web=t.$('#proBox .pro-web');ok(web&&!web.querySelector('img,.pro-web-text b')&&/&lt;img/.test(web.querySelector('.pro-web-text').innerHTML),'요약 속 HTML은 글자로만 보임');
  ok(!web.querySelector('a[href^="javascript"]')&&web.querySelectorAll('a[href^="https://"]').length===1&&/<i>ok<\/i>/.test(web.querySelector('a[href^="https://"]').textContent),'https 출처만, 제목도 글자로');
  ok(!web.querySelector('.pro-gs'),'검색 추천이 없으면 칸도 없음');
 }
 console.log('[7] 화면 오류 없음');
 {const t=boot(DIR,{stored:st61(),research:RES_OK()});for(const v of ['ai','doctor','references','notes','plan','evaluation'])t.ev(`state.view='${v}';paint()`);ok(!t.errors.length&&!/화면 표시 중 오류/.test(t.$('#content').textContent),'여러 화면 그리기',t.errors);
  t.ev("state.view='references';paint()");ok(/공개 논문 검색으로 찾은 최근 논문도 더합니다/.test(t.$('#content').textContent)&&t.$('#webSearch')&&t.$('#webSearch').checked,'전문자료 학습관리 안내 문구와 켜기 칸');
 }
 console.log('[8] 접속 확인 취소·서버 설정 오류');
 {const t=boot(DIR,{stored:st61(),research:RES_OK()});t.ev("state.view='ai';paint();ensureInstitutionSession=async()=>{throw Error(CANCEL_MSG)}");
  t.click('#proBox [data-act="pro-search"]');await sleep(30);ok(t.researchCalls.length===0&&/최신 전문자료 찾아보기/.test(t.$('#proBox [data-act="pro-search"]').textContent),'취소하면 실패로 기억하지 않음(다시 누를 수 있음)',t.$('#proBox .pro-web').textContent);
  t.ev("ensureInstitutionSession=async()=>{throw Error('Gemini 서버 설정이 완료되지 않았습니다. 관리자에게 설정을 요청하세요.')}");t.click('#proBox [data-act="pro-search"]');await sleep(30);
  ok(/최신 자료 찾기 안 됨: Gemini 서버 설정이 완료되지 않았습니다/.test(t.$('#proBox .pro-web').textContent),'서버 설정 오류는 그 내용을 그대로 안내',t.$('#proBox .pro-web').textContent);
 }
 console.log('[9] 담당자가 끄면(v3.21.66부터 기본은 켬) 검색하지 않고, 끈 설정은 저장·백업에 남음');
 {const st=stored57();st.webSearch=false;st.webAuto66=true;const t=boot(DIR,{stored:st,ai:makeAI(),guidance:okServer,research:RES_OK()});
  ok(t.ev('state.webSearch')===false,'끈 설정(v3.21.66 이후 저장본)은 그대로 꺼져 있음');
  await t.ev("runLocalAI('plan-eval')");ok(t.researchCalls.length===0,'검색을 시도하지 않음',t.researchCalls.length);
  const B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(!/\[구글 검색으로 찾은|\[공개 논문 검색/.test(B.prompt)&&/\[관련 전문자료 — /.test(B.prompt)&&/국가정신건강정보포털|국립정신건강센터|보건복지부/.test(B.prompt),'내장 자료(국내 공공 자료 포함)로 작성',(B.prompt.match(/\[출처: [^\]]*\]/g)||[]).slice(0,2));
  const al=lastAlert(t);ok(!/구글|논문 검색|찾기 안 됨/.test(al)&&/전문자료 \d개 주제 참고/.test(al),'작성 기록에 검색 문구 없음',al.slice(-200));
  t.ev("state.view='ai';paint()");const web=t.$('#proBox .pro-web');ok(web&&/최신 전문자료 찾기:.*꺼져 있습니다/.test(web.textContent)&&!t.$('#proBox [data-act="pro-search"]'),'화면에 꺼져 있다는 안내(찾아보기 버튼 없음)',web&&web.textContent);
  t.ev("member().notes.forEach(n=>{n.content='날씨 이야기를 나눔.';n.intervention='';n.result='';n.counselorOpinion='';n.topic='면담'});member().notes.forEach((n,i)=>updateNoteBody(member(),i));member().psychiatricConditions=['조현병'];paint()");
  ok(/증상·문제 낱말을 찾지 못했습니다/.test(t.$('.pro-box').textContent),'꺼져 있으면 진단 분류만으로는 찾지 않음');
  t.ev("state.save=true;state.view='references';paint()");const cb=t.$('#webSearch');ok(cb&&!cb.checked,'전문자료 학습관리의 켜기 칸(꺼짐)');
  t.change(cb,true);t.flush();ok(t.ev('state.webSearch')===true&&t.saved()?.webSearch===true&&t.saved()?.webAuto66===true,'켜면 저장됨',t.saved()&&[t.saved().webSearch,t.saved().webAuto66]);
  t.change(t.$('#webSearch'),false);t.flush();ok(t.saved()?.webSearch===false,'다시 끄면 끈 채로 저장됨');
  ok(t.ev("JSON.parse(JSON.stringify(exportPayload())).webSearch")===false&&t.ev("exportPayload().webAuto66")===true,'백업에도 들어감');
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
