// v3.21.61 — 서버: 주제 이름만으로 구글 검색(Gemini Google 검색 연동) — 가상 응답만 사용
const {ok,done}=require('./h.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const path=require('path');
process.env.GEMINI_API_KEY='test-key-'+'x'.repeat(30);process.env.APP_ACCESS_CODE='access-code-123456';process.env.APP_SESSION_SECRET='s'.repeat(40);delete process.env.GEMINI_MODEL;delete process.env.GEMINI_SEARCH_MODEL;
const shared=require(path.join(DIR,'api/_shared.cjs'));
const cookie=shared.sessionCookie({headers:{},socket:{}}).split(';')[0];
function fresh(){for(const k of Object.keys(require.cache))if(k.includes(path.join(DIR,'api'))&&!k.endsWith('_shared.cjs'))delete require.cache[k];return require(path.join(DIR,'api/research.js'))}
function req(body,{headers={},method='POST'}={}){return{method,headers:{origin:'https://x.vercel.app',host:'x.vercel.app','x-requested-with':'rehab-app','sec-fetch-site':'same-origin',cookie,...headers},body,socket:{remoteAddress:'10.0.0.'+Math.floor(Math.random()*200)}}}
function res(){return{statusCode:0,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},end(s){this.body=s;this.json=JSON.parse(s)}}}
let calls=[];
const grounded=(over={})=>({candidates:[{content:{parts:[{text:'■ 환청·망상·피해사고\n1) 증상 대처 전략 훈련: 증상이 심해지는 때를 함께 찾고 대처 방법을 연습한다.\n2) 관찰 지표: 대처 방법 사용 횟수.'}]},groundingMetadata:{webSearchQueries:['조현병 환청 대처 전략 정신재활','negative symptoms behavioural activation'],
 searchEntryPoint:{renderedContent:'<style>.chip{color:#333}</style><div class="container"><a class="chip" href="https://www.google.com/search?q=%EC%A1%B0%ED%98%84%EB%B3%91" onclick="alert(1)">조현병 환청 대처</a><script>alert(2)</script><a href="javascript:alert(3)">x</a></div>'},
 groundingChunks:[{web:{uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA',title:'ncmh.go.kr'}},{web:{uri:'javascript:alert(1)',title:'bad'}},{web:{uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/BBB',title:'who.int'}}],...over}}]});
const reply=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
function mock(byModel){calls=[];global.fetch=async(url,opts)=>{const m=/models\/([^:]+):generateContent/.exec(String(url));const model=m?decodeURIComponent(m[1]):'?';const body=JSON.parse(opts.body);calls.push({model,body,headers:opts.headers});const f=byModel[model]||byModel['*'];if(!f)return reply(404,{error:{status:'NOT_FOUND',message:'models/'+model+' is not found'}});return f(body)}}
const tierErr=()=>reply(429,{error:{status:'RESOURCE_EXHAUSTED',message:'Quota exceeded for metric: generativelanguage.googleapis.com/search_grounding_request_count, limit: 0',details:[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:'generativelanguage.googleapis.com/search_grounding_request_count',quotaId:'SearchGroundingRequestsPerDayPerProjectPerModel-FreeTier',quotaValue:'0'}]}]}});
const goneErr=()=>reply(404,{error:{status:'NOT_FOUND',message:'This model models/gemini-2.5-flash is no longer available to new users.'}});
async function call(handler,body,o){const r=res();await handler(req(body,o),r);return r}
(async()=>{
 console.log('[1] 유료 등급처럼 문서 작성 모델로 검색되는 경우');
 {const h=fresh();mock({'gemini-3.1-flash-lite':()=>reply(200,grounded())});
  const r=await call(h,{topics:['positive','negative','zzz'],categories:['psychosis','general'],force:false});
  ok(r.statusCode===200&&r.json.searched===true&&r.json.model==='gemini-3.1-flash-lite','검색 성공',r.json);
  ok(calls.length===1&&JSON.stringify(calls[0].body.tools)==='[{"google_search":{}}]','구글 검색 연동을 켜서 요청',calls[0]&&calls[0].body.tools);
  const p=calls[0].body.contents[0].parts[0].text;
  ok(/환청·망상·피해사고/.test(p)&&/무기력/.test(p)&&/조현병 등 정신병적 장애/.test(p),'검색 요청 글은 고정 목록의 주제·진단 분류로만',p.slice(0,200));
  ok(!/zzz|general/.test(p),'모르는 주제·분류는 버림');
  ok(r.json.sources.length===2&&r.json.sources.every(s=>/^https:\/\//.test(s.uri)),'출처는 https 주소만',r.json.sources);
  ok(r.json.queries.length===2,'검색어 돌려줌');
  ok(/class="chip"/.test(r.json.suggestions)&&!/<script|onclick|javascript:/i.test(r.json.suggestions),'검색 추천 HTML은 그대로 두되 스크립트·이벤트·javascript: 링크만 막음',r.json.suggestions);
  ok(calls[0].headers['x-goog-api-key']===process.env.GEMINI_API_KEY&&!/x-goog-api-key/.test(r.body),'API 키는 서버에서만 씀(응답에 없음)');
  calls=[];const r2=await call(h,{topics:['negative','positive'],categories:['psychosis']});
  ok(r2.json.searched&&r2.json.cached===true&&calls.length===0,'같은 주제는 서버가 기억한 결과를 씀(구글에 다시 요청 안 함)');
  const r3=await call(h,{topics:['positive','negative'],categories:['psychosis'],force:true});ok(r3.json.searched&&!r3.json.cached&&calls.length===1,'‘다시 검색’은 새로 검색');
 }
 console.log('[2] 무료 등급: 문서 작성 모델은 막히고 2.5 Flash-Lite로 검색되는 경우');
 {const h=fresh();mock({'gemini-3.1-flash-lite':tierErr,'gemini-2.5-flash-lite':()=>reply(200,grounded())});
  const r=await call(h,{topics:['sleep']});ok(r.json.searched===true&&r.json.model==='gemini-2.5-flash-lite','다음 모델로 검색',r.json.model);
  ok(calls.map(c=>c.model).join()==='gemini-3.1-flash-lite,gemini-2.5-flash-lite','시도 순서',calls.map(c=>c.model));
 }
 console.log('[3] 검색을 쓸 수 없는 경우 — 이유와 조건을 알려 줌');
 {const h=fresh();mock({'gemini-3.1-flash-lite':tierErr,'gemini-2.5-flash-lite':goneErr,'gemini-2.5-flash':goneErr});
  const r=await call(h,{topics:['meds']});ok(r.statusCode===200&&r.json.searched===false&&r.json.why==='tier','무료 등급 때문이라고 판단',r.json);
  ok(/결제 정보를 등록해 유료 등급/.test(r.json.message)&&/5,000회/.test(r.json.message),'필요한 조건 안내',r.json.message);
  ok(r.json.tried.map(t=>t.reason).join()==='tier,model,model','모델별 이유',r.json.tried);
  calls=[];const r2=await call(h,{topics:['meds']});ok(r2.json.searched===false&&calls.length===0,'잠시 동안은 같은 실패로 다시 기다리지 않음');
  mock({'gemini-3.1-flash-lite':()=>reply(200,grounded())});const r3=await call(h,{topics:['meds'],force:true});ok(r3.json.searched===true,'결제 등록 뒤 ‘다시 검색’하면 바로 됨');
 }
 console.log('[4] 검색 없이 답하면 쓰지 않음 · 과부하');
 {const h=fresh();mock({'gemini-3.1-flash-lite':()=>reply(200,{candidates:[{content:{parts:[{text:'일반 원칙 답'}]}}]}),'gemini-2.5-flash-lite':()=>reply(503,{error:{status:'UNAVAILABLE',message:'overloaded'}}),'gemini-2.5-flash':()=>reply(200,grounded())});
  const r=await call(h,{topics:['work']});ok(r.json.searched===true&&r.json.model==='gemini-2.5-flash','검색 근거가 없는 답은 건너뛰고 다음 모델',r.json.model);
  const h2=fresh();mock({'*':()=>reply(503,{error:{status:'UNAVAILABLE',message:'overloaded'}})});const r2=await call(h2,{topics:['work']});ok(r2.json.searched===false&&r2.json.why==='busy'&&/바빠/.test(r2.json.message),'모두 과부하면 잠시 뒤 다시',r2.json);
 }
 console.log('[5] 요청 검사');
 {const h=fresh();mock({'*':()=>reply(200,grounded())});
  ok((await call(h,{topics:['sleep']},{headers:{cookie:''}})).statusCode===401,'접속 인증 없으면 거절');
  ok((await call(h,{topics:['sleep']},{headers:{origin:'https://evil.example'}})).statusCode===403,'다른 사이트에서 온 요청 거절');
  ok((await call(h,{topics:'sleep'})).statusCode===400,'형식이 틀리면 거절');
  ok((await call(h,{topics:new Array(16).fill('sleep')})).statusCode===400,'너무 많으면 거절');
  const e=await call(h,{topics:['회원 홍길동 환청'],categories:['x']});ok(e.json.searched===false&&e.json.why==='empty'&&calls.length===0,'목록에 없는 글은 검색하지 않음(자유 입력 불가)');
  ok((await call(h,{topics:['sleep']},{method:'GET'})).statusCode===405,'POST만');
 }
 console.log('[6] 무료 등급의 구글 검색 막힘(자세한 정보 없는 429)과 진짜 분당 한도 구별');
 {const h=fresh();mock({'gemini-3.1-flash-lite':()=>reply(429,{error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Resource has been exhausted (e.g. check quota).'}}),'gemini-2.5-flash-lite':goneErr,'gemini-2.5-flash':goneErr});
  const r=await call(h,{topics:['work']});ok(r.json.why==='tier'&&/기다려도 풀리지 않으니/.test(r.json.message)&&/유료 결제 등급 필요/.test(r.json.message),'자세한 정보 없는 429 + 2.5 모델 없음 → 무료 등급 때문(결제 필요)',r.json);
  const h2=fresh();mock({'gemini-3.1-flash-lite':()=>reply(429,{error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_requests, limit: 15',details:[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:'GenerateRequestsPerMinutePerProjectPerModel',quotaValue:'15'}]},{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'31s'}]}}),'gemini-2.5-flash-lite':goneErr,'gemini-2.5-flash':goneErr});
  const r2=await call(h2,{topics:['work']});ok(r2.json.why==='quota'&&/잠시 뒤 다시/.test(r2.json.message),'분당 한도가 적힌 429 → 잠시 뒤 다시',r2.json);
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
