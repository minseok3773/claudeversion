// v3.21.70 — 상담일지 내용 빠짐 개선: 긴 문단 자르지 않음, 답 길이 한도 확대, 생각 깊이 선택 설정, 누락 대조 합치기 (가상 자료·가짜 Gemini 응답만 사용)
const {ok,done}=require('./h.js');const path=require('path');const fs=require('fs');
const ROOT=path.resolve(__dirname,'..');
process.env.GEMINI_API_KEY='k'.repeat(30);process.env.APP_ACCESS_CODE='x'.repeat(12);process.env.APP_SESSION_SECRET='s'.repeat(40);delete process.env.GEMINI_MODEL;delete process.env.GEMINI_THINKING_LEVEL;
const shared=require(path.join(ROOT,'api/_shared.cjs'));
function fresh(){delete require.cache[require.resolve(path.join(ROOT,'api/generate.js'))];return require(path.join(ROOT,'api/generate.js'))}
const J=(status,data)=>Promise.resolve({ok:status<300,status,json:async()=>data,headers:{get:()=>null}});
const OK=()=>J(200,{candidates:[{content:{parts:[{text:'{"status":"ok"}'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,thoughtsTokenCount:7,totalTokenCount:22}});
let calls=[];
function run(gen,fetchImpl,body){calls=[];
 global.fetch=async(u,o={})=>{calls.push({url:String(u),body:o.body?JSON.parse(o.body):null});return fetchImpl(String(u),o)};
 return new Promise(resolve=>{const headers={host:'a.vercel.app',origin:'https://a.vercel.app','x-requested-with':'rehab-app','x-forwarded-proto':'https',cookie:shared.sessionCookie({headers:{},socket:{}}).split(';')[0]};
  const res={statusCode:200,h:{},setHeader(k,v){this.h[k]=v},end(t){resolve({status:this.statusCode,body:JSON.parse(t)})}};gen({method:'POST',headers,body,socket:{remoteAddress:'9.9.'+Math.floor(Math.random()*250)+'.'+Math.floor(Math.random()*250)}},res)})}
const B=n=>({system:'시스템 안내 문장입니다.',prompt:'요청 본문 문장입니다.',maxTokens:n});
// app.js에서 순수 함수만 꺼내 시험한다.
const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const grab=(start,end)=>{const i=src.indexOf(start);const j=src.indexOf(end,i);if(i<0||j<0)throw Error('함수를 찾지 못함: '+start);return src.slice(i,j+end.length)};
const lib=new Function(`const BULLET=/^[-•▪■∎·*]\\s*/;const clean=s=>String(s||'');const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const PSYCHO_AREA_KEYS=['primarySupport','socialEnvironment','education','employment','housing','finance','physicalHealth','otherPsychosocial'];
${grab('function evidenceLines(','\n return out}')}
${grab('const PSY_NONE=',';\n')}
${grab('function mergeAssessment(','\n return out}')}
return {evidenceLines,mergeAssessment};`)();
(async()=>{
 console.log('[1] 답 길이 한도: 10,000토큰 요청을 받고, 16,000을 넘으면 거절');
 {const r=await run(fresh(),OK,B(10000));ok(r.status===200&&calls[0].body.generationConfig.maxOutputTokens===10000,'10,000토큰 그대로 구글에 보냄',r.body);
  ok(r.body.usage&&r.body.usage.thinking===7,'생각에 쓴 토큰도 사용량에 표시',r.body.usage);
  const r2=await run(fresh(),OK,B(16001));ok(r2.status===400&&r2.body.error.code==='BAD_INPUT','16,000 초과는 거절',r2.body);}
 console.log('[2] GEMINI_THINKING_LEVEL을 넣으면 3 이후 모델에만 생각 깊이를 보냄');
 {process.env.GEMINI_THINKING_LEVEL='low';await run(fresh(),OK,B(800));ok(calls[0].body.generationConfig.thinkingConfig?.thinkingLevel==='low','low로 보냄',calls[0].body.generationConfig);
  process.env.GEMINI_THINKING_LEVEL='aaa';await run(fresh(),OK,B(800));ok(!('thinkingConfig' in calls[0].body.generationConfig),'잘못된 값은 보내지 않음');
  process.env.GEMINI_THINKING_LEVEL='low';const r=await run(fresh(),(u,o)=>{const b=JSON.parse(o.body);return b.generationConfig.thinkingConfig?J(400,{error:{message:'thinking_level is not supported for this model'}}):OK()},B(800));
  ok(r.status===200&&calls.length===2&&!('thinkingConfig' in calls[1].body.generationConfig),'모델이 받지 않으면 빼고 다시 보냄',calls.length);
  delete process.env.GEMINI_THINKING_LEVEL;}
 console.log('[3] 상담일지 긴 문단을 240자에서 자르지 않고 문장 단위로 나눔');
 {const long='회원 001은 오늘 산책 프로그램에 참여함. '.repeat(25)+'끝 부분에 가족 면회를 원한다고 말함.';const L=lib.evidenceLines('복약 거부함\n'+long);
  ok(L[0]==='복약 거부함','12자 미만 짧은 줄도 남김',L[0]);
  ok(L.join(' ').includes('가족 면회를 원한다고 말함.'),'문단 끝 문장도 빠지지 않음');
  ok(L.every(x=>x.length<=320),'나눈 조각은 300자 안팎',L.map(x=>x.length));}
 console.log('[4] 누락 대조 결과 합치기(v3.21.71): 빈칸만 채우고 욕구·개입영역·있던 내용은 바꾸지 않음');
 {const draft={memberNeed:'- 산책을 희망함.',managerItems:[{title:'금전관리',reason:'a',sources:[1]}],psycho:{primarySupport:'',finance:'▪ 용돈 관리 어려움.',housing:'▪ 해당사항 없음.',employment:'▪ 해당사항 없음.'},strength:['참여에 적극적임.','',''],weakness:['금전관리 능력이 부족함.','','']};
  const rev={memberNeed:'- 취업을 희망함.',managerItems:[{title:'취업',reason:'b'},{title:'건강',reason:'c'}],psycho:{primarySupport:'▪ 가족 면회 요청 있음.',finance:'▪ 채무 있음.',housing:'▪ 퇴소 후 거주지 미정.',employment:'▪ 해당사항 없음.'},strength:['참여에 적극적임.','진료 참여 양호함.','참여에 적극적임.'],weakness:['금전관리 능력이 부족함.','','']};
  const m=lib.mergeAssessment(draft,rev);
  ok(m.memberNeed==='- 산책을 희망함.'&&m.managerItems.length===1&&m.managerItems[0].title==='금전관리','욕구·개입영역은 첫 초안 그대로',[m.memberNeed,m.managerItems]);
  ok(m.psycho.primarySupport==='▪ 가족 면회 요청 있음.'&&m.psycho.housing==='▪ 퇴소 후 거주지 미정.','빈 영역·해당사항 없음 영역만 채움',m.psycho);
  ok(m.psycho.finance==='▪ 용돈 관리 어려움.'&&m.psycho.employment==='▪ 해당사항 없음.','있던 내용은 바꾸지 않음',m.psycho);
  ok(m.strength[0]==='참여에 적극적임.'&&m.strength[1]==='진료 참여 양호함.'&&m.strength[2]==='','강점 빈칸만, 겹치지 않게 채움',m.strength);
  ok(JSON.stringify(lib.mergeAssessment(draft,{}))===JSON.stringify({...draft,}),'빈 답이면 첫 초안 그대로');}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
