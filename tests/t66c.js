// v3.21.66 — ‘Gemini 연결 진단’ 버튼: 어느 단계에서 막혔는지 보여 줌 (가상 자료·가상 서버 응답만)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const resp=(data,status=200)=>{const text=JSON.stringify(data);return{ok:status>=200&&status<300,status,text:async()=>text,json:async()=>JSON.parse(text),headers:{get:()=>null}}};
const SCH=()=>({status:200,data:{searched:true,provider:'scholarly',model:'공개 논문 검색(Europe PMC·Crossref)',text:'1. A fictional paper title for testing (2025)',queries:['sleep severe mental illness intervention'],sources:[{title:'A fictional paper title for testing (2025) — Europe PMC',uri:'https://doi.org/10.1000/fake.sleep.1'},{title:'Another fictional paper (2024) — Crossref',uri:'https://doi.org/10.1000/fake.sleep.2'}],suggestions:'',at:'2026-10-25T05:00:00.000Z',fallback:{why:'tier',message:'구글 검색은 지금 쓰는 Gemini 무료 등급에서 안 되어'}}});
const GOOGLE=()=>({status:200,data:{searched:true,model:'gemini-3.1-flash-lite',text:'■ 수면\n1) 수면 위생 교육',queries:['수면 위생 정신재활'],sources:[{title:'ncmh.go.kr',uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA'}],suggestions:'',at:'2026-10-25T05:00:00.000Z'}});
const stepsOf=t=>t.ev('aiDiag.steps.map(s=>s.key+":"+s.state)').join(' ');
const memberWords=st=>[st.members[0].label,...st.members[0].notes.flatMap(n=>[n.content,n.topic].filter(Boolean).map(x=>String(x).slice(0,12)))];
async function diag(t,{wait=60}={}){t.click('[data-act="ai-diagnose"]');for(let i=0;i<40&&t.ev('aiDiag.busy');i++)await sleep(wait/4);}
(async()=>{
 console.log('[1] 모두 정상(구글 검색은 안 되어 공개 논문 검색으로 대신 찾음)');
 {const st=stored57();const t=boot(DIR,{stored:st,ai:()=>({status:'ok'}),research:SCH});t.ev("state.view='ai';paint()");
  const btn=t.$('#aiDiagBox [data-act="ai-diagnose"]');ok(btn&&/Gemini 연결 진단/.test(btn.textContent)&&!btn.disabled,'AI 자동작성 화면에 진단 버튼',btn&&btn.outerHTML);
  ok(/회원 정보는 보내지 않고 짧은 확인 문장만/.test(t.$('#aiDiagBox').textContent),'무엇을 보내는지 안내');
  await diag(t);
  ok(stepsOf(t)==='server:ok auth:ok gemini:ok research:warn','단계별 결과',stepsOf(t));
  const box=t.$('#aiDiagBox'),txt=box.textContent;
  ok(/① 사이트 서버 설정\s*정상/.test(txt)&&/② 기관 접속 인증\s*정상/.test(txt)&&/③ Gemini 응답\s*정상/.test(txt)&&/gemini-3\.1-flash-lite 모델이 \d+\.\d초 만에 답함/.test(txt),'화면에 단계·모델·응답 시간',txt);
  ok(/④ 최신 전문자료 찾기\s*대신 됨/.test(txt)&&/구글 검색은 지금 쓰는 Gemini 무료 등급에서 안 되어 무료 공개 논문 검색으로 논문 2건을 찾았습니다\(AI 작성에는 지장 없음\)/.test(txt),'구글 검색 대신 논문 검색',txt);
  ok(/AI 자동작성을 쓸 수 있는 상태입니다\./.test(txt)&&/\(\d\d:\d\d 확인\)/.test(txt),'요약과 확인 시각');
  ok(/다시 진단/.test(box.querySelector('[data-act="ai-diagnose"]').textContent),'버튼은 ‘다시 진단’으로');
  ok(t.prompts.length===1,'Gemini에는 한 번만',t.prompts.length);
  const P=t.prompts[0];ok(P.prompt==='연결 확인입니다. {"status":"ok"} 를 그대로 답하세요.'&&/연결 확인용 요청/.test(P.system)&&P.maxTokens===600,'짧은 확인 문장만 보냄',P);
  ok(!memberWords(st).some(w=>w&&(P.prompt+P.system).includes(w)),'회원 이름·상담일지 내용은 보내지 않음');
  ok(JSON.stringify(t.researchCalls)==='[{"topics":["sleep"],"categories":[],"force":true}]','자료 찾기는 고정 주제(수면) 하나로 새로 확인',t.researchCalls);
  ok(t.ev("member().plan.goals.filter(g=>g.long).length")===st.members[0].plan.goals.filter(g=>g.long).length,'문서는 바뀌지 않음');
  t.ev("state.view='notes';paint();state.view='ai';paint()");ok(/AI 자동작성을 쓸 수 있는 상태입니다/.test(t.$('#aiDiagBox').textContent),'다른 화면에 갔다 와도 결과가 남음');
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[2] 구글 검색까지 정상');
 {const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'}),research:GOOGLE});t.ev("state.view='ai';paint()");await diag(t);
  ok(stepsOf(t)==='server:ok auth:ok gemini:ok research:ok'&&/구글 검색 정상\(출처 1곳\)/.test(t.$('#aiDiagBox').textContent),'구글 검색 정상',stepsOf(t));
 }
 console.log('[3] Gemini API 키 문제 → ③에서 막힘, 고칠 방법 안내');
 {const KEY='Gemini API 키가 만료되었거나 올바르지 않습니다. Google AI Studio(aistudio.google.com)에서 새 API 키를 만든 뒤, Vercel 프로젝트 Settings → Environment Variables의 GEMINI_API_KEY 값을 새 키로 바꾸고 다시 배포(Redeploy)하세요.';
  const t=boot(DIR,{stored:stored57(),research:SCH,aiStatus:()=>({status:401,data:{error:{message:KEY,keyProblem:true,code:'KEY_PROBLEM'}}})});t.ev("state.view='ai';paint()");await diag(t);
  ok(stepsOf(t)==='server:ok auth:ok gemini:fail research:skip','③ 실패, ④는 건너뜀',stepsOf(t));
  const txt=t.$('#aiDiagBox').textContent;ok(txt.includes(KEY),'서버가 알려 준 원인과 고칠 방법 그대로',txt);
  ok(/③ Gemini 응답 단계에서 막혔습니다/.test(txt),'요약',txt);ok(t.researchCalls.length===0,'자료 찾기는 하지 않음');
 }
 console.log('[4] 무료 일일 한도 초과 → 언제 풀리는지 안내');
 {const t=boot(DIR,{stored:stored57(),aiStatus:()=>({status:429,data:{error:{message:'Gemini 무료 일일 사용 한도에 도달했습니다.',limitKind:'daily',code:'QUOTA_LIMIT'}}})});t.ev("state.view='ai';paint()");await diag(t);
  ok(/무료 일일 사용 한도 초과\. 태평양시간 다음 자정\(한국시간 오후 4~5시\)에 초기화됩니다/.test(t.$('#aiDiagBox').textContent),'한도 안내',t.$('#aiDiagBox').textContent);
 }
 console.log('[5] Vercel 환경변수가 빠진 경우 → ①에서 멈춤');
 {const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'})});const orig=t.w.fetch;t.w.fetch=async(u,o)=>String(u).endsWith('/api/status')?resp({configured:false,authenticated:false}):orig(u,o);
  t.ev("state.view='ai';paint()");await diag(t);
  ok(stepsOf(t)==='server:fail auth:skip gemini:skip research:skip','① 실패, 나머지 건너뜀',stepsOf(t));
  ok(/GEMINI_API_KEY·APP_ACCESS_CODE·APP_SESSION_SECRET/.test(t.$('#aiDiagBox').textContent)&&/Redeploy/.test(t.$('#aiDiagBox').textContent),'무엇을 넣어야 하는지 안내');
  ok(t.prompts.length===0&&t.researchCalls.length===0,'Gemini·자료 찾기는 요청하지 않음');
 }
 {const t=boot(DIR,{stored:stored57()});const orig=t.w.fetch;t.w.fetch=async(u,o)=>{if(String(u).endsWith('/api/status'))throw TypeError('Failed to fetch');return orig(u,o)};
  t.ev("state.view='ai';paint()");await diag(t);ok(/사이트 서버에 연결하지 못했습니다/.test(t.$('#aiDiagBox').textContent)&&stepsOf(t).startsWith('server:fail'),'서버에 닿지 않으면 연결 안내');
 }
 {const t=boot(DIR,{stored:stored57()});const orig=t.w.fetch;t.w.fetch=async(u,o)=>String(u).endsWith('/api/status')?resp({error:'x'},500):orig(u,o);
  t.ev("state.view='ai';paint()");await diag(t);ok(/사이트 서버가 응답하지 않습니다\(HTTP 500\)/.test(t.$('#aiDiagBox').textContent),'서버 오류 코드 안내');
 }
 console.log('[6] 기관 접속 인증이 필요한 경우: 코드 입력 → 계속 / 취소 → ②에서 멈춤');
 {const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'}),research:SCH});let authed=false;const orig=t.w.fetch;
  t.w.fetch=async(u,o)=>{if(String(u).endsWith('/api/status'))return resp({configured:true,authenticated:authed});if(String(u).endsWith('/api/auth')){authed=true}return orig(u,o)};
  t.ev("state.view='ai';paint()");t.click('[data-act="ai-diagnose"]');await sleep(30);
  ok(t.$('#dlg').open&&/기관 접속 확인/.test(t.$('#dlg').textContent),'접속 코드 입력 창');
  t.$('#dlgInput').value='code-1234';t.$('#dlg form').dispatchEvent(new t.w.Event('submit',{cancelable:true}));for(let i=0;i<40&&t.ev('aiDiag.busy');i++)await sleep(15);
  ok(stepsOf(t)==='server:ok auth:ok gemini:ok research:warn'&&/접속 코드 확인 완료/.test(t.$('#aiDiagBox').textContent),'코드를 넣으면 이어서 진단',stepsOf(t));
 }
 {const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'})});const orig=t.w.fetch;t.w.fetch=async(u,o)=>String(u).endsWith('/api/status')?resp({configured:true,authenticated:false}):orig(u,o);
  t.ev("institutionAuthOk=true;state.view='ai';paint()");t.click('[data-act="ai-diagnose"]');await sleep(30);
  ok(t.$('#dlg').open,'서버 인증이 끝났으면 화면이 인증된 줄 알아도 다시 확인');t.click('#dlgCancel');for(let i=0;i<40&&t.ev('aiDiag.busy');i++)await sleep(15);
  ok(stepsOf(t)==='server:ok auth:fail gemini:skip research:skip'&&/접속 코드 입력을 취소해 여기서 멈췄습니다/.test(t.$('#aiDiagBox').textContent),'취소하면 ②에서 멈춤',stepsOf(t));
  ok(t.prompts.length===0,'Gemini에는 보내지 않음');
 }
 console.log('[7] 최신 전문자료 찾기가 꺼져 있으면 ④는 건너뜀 · 둘 다 안 되면 안내');
 {const st=stored57();st.webSearch=false;st.webAuto66=true;const t=boot(DIR,{stored:st,ai:()=>({status:'ok'}),research:SCH});t.ev("state.view='ai';paint()");await diag(t);
  ok(stepsOf(t)==='server:ok auth:ok gemini:ok research:skip'&&/꺼져 있습니다\. ‘전문자료 학습관리’에서 켤 수 있습니다/.test(t.$('#aiDiagBox').textContent)&&t.researchCalls.length===0,'건너뜀',stepsOf(t));
  ok(/AI 자동작성을 쓸 수 있는 상태입니다\./.test(t.$('#aiDiagBox').textContent),'요약은 정상');
 }
 {const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'}),research:()=>({status:200,data:{searched:false,why:'tier',message:'지금 쓰는 Gemini 무료 등급에서는 구글 검색 연동을 쓸 수 없습니다. 공개 논문 검색도 지금은 되지 않았습니다.',tried:[]}})});t.ev("state.view='ai';paint()");await diag(t);
  const txt=t.$('#aiDiagBox').textContent;ok(stepsOf(t)==='server:ok auth:ok gemini:ok research:fail'&&/공개 논문 검색도 지금은 되지 않았습니다\. AI 작성은 내장 요약으로 계속됩니다/.test(txt),'④ 안 됨 안내',txt);
  ok(/AI 자동작성을 쓸 수 있는 상태입니다\. \(최신 전문자료 찾기는 안 되어 내장 요약으로 작성합니다\)/.test(txt),'요약: 작성은 가능',txt);
 }
 console.log('[8] 진단 중에는 AI 작성 버튼이 잠기고, AI 작성 중에는 진단 버튼이 잠김');
 {let release;const gate=new Promise(r=>release=r);const t=boot(DIR,{stored:stored57(),ai:()=>({status:'ok'}),research:SCH});const orig=t.w.fetch;t.w.fetch=async(u,o)=>{if(String(u).endsWith('/api/generate'))await gate;return orig(u,o)};
  t.ev("state.view='ai';paint()");t.click('[data-act="ai-diagnose"]');await sleep(20);
  ok(t.$('[data-act="ai-run-auto"]').disabled&&t.$('[data-act="ai-diagnose"]').disabled&&/진단 중…/.test(t.$('[data-act="ai-diagnose"]').textContent),'진단 중 표시·잠김');
  ok(/③ Gemini 응답\s*확인 중…/.test(t.$('#aiDiagBox').textContent),'지금 확인하는 단계 표시',t.$('#aiDiagBox').textContent);
  t.$('[data-act="ai-run-auto"]').disabled=false;t.click('[data-act="ai-run-auto"]');await sleep(10);ok(!t.ev('aiWorking'),'진단 중에는 AI 작성이 시작되지 않음');
  release();for(let i=0;i<40&&t.ev('aiDiag.busy');i++)await sleep(15);ok(!t.$('[data-act="ai-run-auto"]').disabled,'진단이 끝나면 다시 쓸 수 있음');
  t.ev("aiWorking=true;paint()");ok(t.$('[data-act="ai-diagnose"]').disabled,'AI 작성 중에는 진단 버튼 잠김');t.ev("aiWorking=false;paint()");
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[9] AI 작성이 모두 실패하면 진단 버튼을 안내');
 {const t=boot(DIR,{stored:stored57(),confirmFn:()=>false,aiStatus:()=>({status:502,data:{error:{message:'Gemini 서버가 일시적으로 응답하지 않습니다(구글 응답 503).',code:'UPSTREAM_SERVICE_ERROR',providerStatus:503}}})});
  const o=t.w.setTimeout.bind(t.w);t.w.setTimeout=(fn,ms,...r)=>o(fn,ms>900?0:ms,...r);await t.ev("runLocalAI('plan')");ok(/아래 ‘Gemini 연결 진단’을 누르면 어느 단계에서 막혔는지 바로 볼 수 있습니다/.test(t.ev('aiStatus')),'실패 안내에 진단 버튼',t.ev('aiStatus').slice(0,400));
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
