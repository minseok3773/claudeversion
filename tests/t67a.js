// v3.21.67 — 기본 모델 gemini-3.5-flash-lite, 3.5 이후 모델에는 temperature를 보내지 않음 (가짜 Gemini 응답만 사용)
const {ok,done}=require('./h.js');const path=require('path');
const ROOT=path.resolve(__dirname,'..');
process.env.GEMINI_API_KEY='k'.repeat(30);process.env.APP_ACCESS_CODE='x'.repeat(12);process.env.APP_SESSION_SECRET='s'.repeat(40);delete process.env.GEMINI_MODEL;
const shared=require(path.join(ROOT,'api/_shared.cjs'));
function fresh(){delete require.cache[require.resolve(path.join(ROOT,'api/generate.js'))];return require(path.join(ROOT,'api/generate.js'))}
const J=(status,data)=>Promise.resolve({ok:status<300,status,json:async()=>data,headers:{get:()=>null}});
const OK=()=>J(200,{candidates:[{content:{parts:[{text:'{"status":"ok"}'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}});
let calls=[];
function run(gen,fetchImpl,body={system:'시스템 안내 문장입니다.',prompt:'요청 본문 문장입니다.',maxTokens:800}){calls=[];
 global.fetch=async(u,o={})=>{const m=/models\/([^:?]+):generateContent/.exec(String(u));calls.push({url:String(u),model:m?decodeURIComponent(m[1]):'',body:o.body?JSON.parse(o.body):null});return fetchImpl(String(u),o)};
 return new Promise(resolve=>{const headers={host:'a.vercel.app',origin:'https://a.vercel.app','x-requested-with':'rehab-app','x-forwarded-proto':'https',cookie:shared.sessionCookie({headers:{},socket:{}}).split(';')[0]};
  const res={statusCode:200,h:{},setHeader(k,v){this.h[k]=v},end(t){resolve({status:this.statusCode,body:JSON.parse(t)})}};gen({method:'POST',headers,body,socket:{remoteAddress:'8.8.'+Math.floor(Math.random()*250)+'.'+Math.floor(Math.random()*250)}},res)})}
(async()=>{
 console.log('[1] 설정이 없으면 gemini-3.5-flash-lite로 작성');
 {const gen=fresh();const r=await run(gen,OK);
  ok(r.status===200&&r.body.model==='gemini-3.5-flash-lite','응답에 쓴 모델 이름(연결 진단 ③에 표시됨)',r.body);
  ok(calls.length===1&&calls[0].model==='gemini-3.5-flash-lite','구글에 보낸 모델',calls.map(c=>c.model));
  const g=calls[0].body.generationConfig;ok(!('temperature' in g)&&g.maxOutputTokens===800&&g.responseMimeType==='application/json','3.5에는 temperature를 보내지 않고, 길이 한도·JSON 형식은 그대로',g);
  ok(!('thinkingConfig' in g),'생각(thinking) 수준은 구글 기본값(최소)을 그대로 씀',g);
 }
 console.log('[2] Vercel에서 GEMINI_MODEL을 넣으면 그 모델 — 3.1에는 temperature를 그대로');
 {process.env.GEMINI_MODEL='gemini-3.1-flash-lite';const gen=fresh();const r=await run(gen,OK);
  ok(r.body.model==='gemini-3.1-flash-lite'&&calls[0].model==='gemini-3.1-flash-lite','설정한 모델로',calls.map(c=>c.model));
  ok(calls[0].body.generationConfig.temperature===0.15,'3.1에는 낮은 temperature(문장이 들쭉날쭉하지 않게)',calls[0].body.generationConfig);
  process.env.GEMINI_MODEL='gemini-3.8-flash';const r2=await run(fresh(),OK);ok(r2.body.model==='gemini-3.8-flash'&&!('temperature' in calls[0].body.generationConfig),'3.8 같은 더 새 모델에도 temperature를 보내지 않음',calls[0].body.generationConfig);
  delete process.env.GEMINI_MODEL;
 }
 console.log('[3] 3.5가 과부하면 다른 Flash-Lite(3.1)로 한 번 더 — 그 모델에 맞게 보냄');
 {const gen=fresh();const r=await run(gen,(u,o)=>{if(/models\?/.test(u))return J(200,{models:[{name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.1-flash-lite',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']}]});
   const m=/models\/([^:]+):generateContent/.exec(u)[1];return m==='gemini-3.5-flash-lite'?J(503,{error:{status:'UNAVAILABLE',message:'overloaded'}}):OK()});
  const gc=calls.filter(c=>c.model);ok(r.status===200&&r.body.model==='gemini-3.1-flash-lite'&&gc.map(c=>c.model).join()==='gemini-3.5-flash-lite,gemini-3.1-flash-lite','과부하면 3.1 Flash-Lite로 이어서 작성',[r.body.model,gc.map(c=>c.model)]);
  ok(!('temperature' in gc[0].body.generationConfig)&&gc[1].body.generationConfig.temperature===0.15,'모델마다 맞는 설정',gc.map(c=>c.body.generationConfig));
 }
 console.log('[4] 3.5가 없어진 경우(404) 쓸 수 있는 최신 Flash-Lite로 자동 전환');
 {const gen=fresh();const r=await run(gen,(u)=>{if(/models\?/.test(u))return J(200,{models:[{name:'models/gemini-3.1-flash-lite',supportedGenerationMethods:['generateContent']},{name:'models/gemini-4.0-flash-lite',supportedGenerationMethods:['generateContent']}]});
   const m=/models\/([^:]+):generateContent/.exec(u)[1];return m==='gemini-3.5-flash-lite'?J(404,{error:{status:'NOT_FOUND',message:'models/gemini-3.5-flash-lite is not found'}}):OK()});
  ok(r.status===200&&r.body.model==='gemini-4.0-flash-lite','가장 새 Flash-Lite로',r.body);
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
