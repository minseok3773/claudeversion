'use strict';
// v3.26.2 — Claude로 보내는 요청문이 상담일지를 근거로 가는지 (가상 자료·가짜 답만 사용)
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const H=require('./h.js');const {stored57}=require('./fix57.js');
const ROOT=path.resolve(__dirname,'..');const {ok,sleep}=H;
const notes=[];const add=(d,t,c)=>notes.push({date:d,topic:t,content:c});
add('2026-05-07','개별상담','김철수 회원이 어머니와 용돈 문제로 크게 다투었다고 함. "엄마가 맨날 잔소리해서 집에 가기 싫어요"라고 말함. 갈등 상황을 탐색함.');
add('2026-05-21','개별상담','미술학원에 다니고 싶다고 함. "미술학원 다니고 싶어요"라고 말함. 지역 내 미술학원 정보를 함께 찾아봄.');
add('2026-06-04','건강관리','야식을 자주 먹는다고 함. 식사일지 작성 방법을 교육함.');
add('2026-06-18','건강관리','식사일지를 1주일 작성해 옴. 아침을 거르는 일이 많음을 함께 확인함.');
add('2026-07-02','가족상담','보호자 상담 실시함. 회원과 어머니의 대화 방법을 안내함.');
add('2026-08-06','사회적응훈련 3회기','요리 프로그램에 참여함. 건강한 간식 만들기를 함께 함.');
add('2026-08-20','정서 상담','"죽고 싶다는 생각이 들어요"라고 말해 위기 상담을 실시함.');
add('2026-09-03','건강관리','식사일지를 꾸준히 작성함. 야식 횟수가 주 2회로 줄었음.');
const old={members:[{id:'m1',label:'회원 001',piiNames:'김철수',periodStart:'2026-05-01',periodEnd:'2026-10-31',notes,plan:{goals:[]},evaluation:{},finalizedDocs:{}}],memberId:'m1',save:true};
async function bootNew(){
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.confirm=()=>true;w.scrollTo=()=>{};w.open=()=>null;
 w.localStorage.setItem('sehuim_rehab_offline_v1',JSON.stringify(old));
 if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 for(const f of ['pii-core.js','log-steps.js','log-first.js'])w.eval(fs.readFileSync(path.join(ROOT,f),'utf8'));
 return w}
(async()=>{
 console.log('[1] 첫 화면(간단히 보기) Claude 요청문에 상담일지 원문이 들어감');
 {const w=await bootNew();const d=w.document;const r=d.querySelector('[data-sact="engine"][value="claude"]');r.checked=true;r.dispatchEvent(new w.Event('change',{bubbles:true}));await sleep(30);
  let copied='';w.navigator.clipboard={writeText:async t=>{copied=t}};
  d.querySelector('[data-sact="quick-auto"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await sleep(50);
  d.querySelector('[data-sact="claude-open"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await sleep(50);
  ok(/\[상담일지 원문\]/.test(copied)&&/야식 횟수가 주 2회로 줄었음/.test(copied)&&/어머니와 용돈 문제로 크게 다투었다/.test(copied),'일지 본문(첫 문장 뒤 내용까지)이 들어감');
  ok(copied.indexOf('[상담일지 원문]')<copied.indexOf('[정리표]'),'원문이 정리표보다 먼저');
  ok(!/김철수/.test(copied),'원문도 가명 처리됨');
  ok(!/죽고 싶다/.test(copied)&&/위험 관련 발언 — 인용 금지/.test(copied)&&/위기 상담을 실시함/.test(copied),'위험 발언은 따옴표 안만 가리고 위기 상담 사실은 남김');
  const S=w.LogSteps;const rows=S.facts();
  ok(!rows.some(x=>x.area==='alcohol'),'미술학원을 음주로 나누지 않음',rows.map(x=>x.area));
  ok(rows.some(x=>x.area==='leisure'&&/2026-05-21/.test(x.date)),'미술학원은 여가·일상활동');
  const areas=S.goals().map(g=>g.area);
  ok(!(areas.includes('health')&&areas.includes('hygiene')),'같은 요리 프로그램 하루로 신체 건강·생활관리 목표를 겹쳐 잡지 않음',areas);
  ok(!S.goals().some(g=>/회기/.test(g.behavior)),'측정 행동에 ‘3회기’ 같은 회차를 넣지 않음',S.goals().map(g=>g.behavior));}
 console.log('[2] 양식 화면 Claude 요청문: 상담일지 전문이 맨 앞');
 {const t=H.boot(ROOT,{stored:stored57(),storage:{rehab_ai_engine_v1:'claude'}});const run=t.ev("runLocalAI('plan-eval')");
  for(let i=0;i<400;i++){const d=t.$('#claudeDlg');if(d&&d.open)break;await sleep(10)}
  const p=t.$('#cdPrompt').value;const ev=p.indexOf('===== [상담일지 전문] =====');
  ok(ev>0&&ev<p.indexOf('===== [step1]'),'상담일지 전문이 step1보다 먼저',[ev,p.indexOf('===== [step1]')]);
  ok(/\[가장 먼저 지킬 원칙\]/.test(p)&&/전문자료나 형식 예 때문에/.test(p),'상담일지 우선 원칙이 들어감');
  ok(!/맨 아래 \[상담일지 전문\]/.test(p),'‘맨 아래 상담일지’ 같은 옛 안내가 남지 않음');
  ok(!/주제 미상/.test(p.slice(ev,ev+400)),'기록 머리줄에 상담주제가 들어감');
  t.click('#cdCancel');await run.catch(()=>{});}
 console.log('[3] 최신 전문자료 검색: 기다리는 시간 표시와 건너뛰기');
 {const t=H.boot(ROOT,{stored:stored57(),research:()=>new Promise(()=>{})});
  t.ev("state.webSearch=true");const topics=t.ev("proTopics(noteSentences(member()))");
  const pr=t.ev("proEvidence(noteSentences(member()),{m:member()})");
  await sleep(1300);
  ok(/초 \/ 최대 25초/.test(t.ev('aiStatus')),'지난 시간과 최대 시간을 보여 줌',t.ev('aiStatus'));
  ok(t.ev('PRO_WEB_WAIT')===25000,'최대 25초만 기다림');
  const btn=t.$('.pro-skip');ok(!!btn||!t.$('#aiProgress'),'건너뛰기 단추(진행 칸이 있을 때)');
  t.ev("proWebSkipped=true;proWebCtl&&proWebCtl.abort()");
  const r=await Promise.race([pr,sleep(3000).then(()=>'timeout')]);
  ok(r!=='timeout'&&r.web&&r.web.ok===false&&/건너뛰었습니다/.test(r.web.message),'건너뛰면 바로 내장 자료로 계속',r==='timeout'?r:r.web);
  ok(!t.ev("proWeb.size"),'건너뛴 결과는 기억하지 않아 다음에 다시 찾을 수 있음');}
 H.done();setTimeout(()=>process.exit(process.exitCode||0),50);
})();
