// v3.21.58 — 한글 붙여넣기 해석기 · PDF 서버 함수(실제 pdf-parse) · Gemini 서버 오류 코드
const {ok,done}=require('./h.js');const fs=require('fs');const path=require('path');
const P=require(require('path').resolve(__dirname,'../hwp-paste.js'));
const cats=['일차적 지지집단과의 욕구 & 문제','사회적 환경과 관련된 욕구 & 문제','교육적 욕구 & 문제','직업적 욕구 & 문제','주거의 욕구 & 문제','경제적 욕구 & 문제','신체 건강상의 욕구 & 문제','기타 심리사회적 욕구 & 문제'];
(async()=>{
 console.log('[1] 한글 서식 그대로 복사한 계획서');
 {const txt=['재활계획서 1','1) 회원이 제시하는 욕구 & 문제','회원의 주관적 호소 (대화체)','“밖에 나가고 싶어요.”','욕구 기술 — 주관적 호소에 대한 객관적 기술','- 외출 활동을 늘리기를 희망함.','2) 가족이 제시하는 욕구 & 문제','가족의 주관적 호소 (대화체)','“규칙적으로 지냈으면 좋겠어요.”','욕구 기술 — 가족의 호소에 대한 객관적 기술','- 가족은 회원이 규칙적으로 생활하기를 바람.','2. 심리사회적 욕구 & 문제','문제 & 욕구\t내용','경제적 욕구 & 문제\t▪ 용돈 관리가 어려움.','3. 강점 및 약점','강점\t약점','1. 요리를 좋아함.\t1. 아침에 일어나기 어려워함.','2. 동료와 잘 지냄.\t2. 군것질이 잦음.','4. 개입 목표 및 계획','1) 목표 및 계획','No\t장기목표\t단기목표 (6개월 이내)\t재활 계획','1\t규칙적인 생활리듬을 유지함.\t1. 매일 같은 시간에 일어남.\t- 기상 시간을 함께 정할 계획임.','2\t금전을 계획적으로 사용함.\t1. 한 달 용돈 계획을 세움.\t- 용돈 계획 세우기를 도울 계획임.','3) 평가 및 측정 도구','단기목표\t세부 활동 내용\t성과목표','1. 매일 같은 시간에 일어남.\t- 기상 시간 기록\t- 주 5회 이상'].join('\n');
  const r=P.parse(txt,'plan',cats),f=r.fields;
  ok(f['plan.memberVoice']==='“밖에 나가고 싶어요.”'&&f['plan.memberNeed']==='- 외출 활동을 늘리기를 희망함.','회원 욕구(괄호 붙은 제목)',[f['plan.memberVoice'],f['plan.memberNeed']]);
  ok(f['plan.familyNeed']==='- 가족은 회원이 규칙적으로 생활하기를 바람.','가족 욕구');
  ok(f['plan.psycho.5']==='▪ 용돈 관리가 어려움.','심리사회 영역');
  ok(f['plan.strength.1']==='동료와 잘 지냄.'&&f['plan.weakness.1']==='군것질이 잦음.','강점·약점 표 2번째 줄(번호 뺌)',[f['plan.strength.1'],f['plan.weakness.1']]);
  ok(f['plan.goals.1.long']==='금전을 계획적으로 사용함.'&&f['plan.goals.1.plan']==='- 용돈 계획 세우기를 도울 계획임.','번호 칸이 있는 목표 표',f['plan.goals.1.long']);
  ok(f['plan.goals.0.target']==='- 주 5회 이상'&&!f['plan.goals.2.short'],'측정 표는 목표 1부터 다시',f['plan.goals.0.target']);
 }
 console.log('[2] 예전 방식(항목 이름 + 탭)도 그대로');
 {const r=P.parse(['재활평가서','재활목표 1 단기목표\t1. 산책함.','재활목표 1 달성 요인 회원\t- 꾸준히 참여함.','종합평가\t- 목표를 일부 달성함.'].join('\n'),'evaluation',cats);
  ok(r.type==='evaluation'&&r.fields['evaluation.goals.0.short']==='1. 산책함.'&&r.fields['evaluation.goals.0.achMember']==='- 꾸준히 참여함.'&&r.fields['evaluation.overall']==='- 목표를 일부 달성함.','평가서 항목',r.fields)}
 console.log('[3] PDF 서버 함수 — 실제 pdf-parse');
 {let call;try{({call}=require('./pdfapi.js'))}catch(e){console.log('  (pdf-parse 없음: NODE_PATH 필요)')}
  if(call){const b64=fs.readFileSync(path.join(__dirname,'pdfs','app-plan.pdf')).toString('base64');
   const r=await call({pdf:b64});ok(r.status===200&&r.body.pages===2&&/재활계획서 1/.test(r.body.text),'글자 뽑기',[r.status,r.body.pages]);
   const r2=await call({pdf:b64},{cookie:false});ok(r2.status===401,'접속 인증 없으면 막음',r2.status);
   const r3=await call({pdf:b64},{xrw:'x'});ok(r3.status===403,'다른 곳에서 보낸 요청은 막음',r3.status);
   const r4=await call({pdf:Buffer.from('%PDF-'+'x'.repeat(200)).toString('base64')});ok(r4.status===422,'깨진 PDF는 안내',r4.body);
   const r5=await call({pdf:Buffer.from('hello'.repeat(50)).toString('base64')});ok(r5.status===400,'PDF가 아니면 막음',r5.status);
   const r6=await call({pdf:'A'.repeat(Math.ceil(2*1024*1024*4/3)+40)});ok(r6.status===400,'2MB 넘으면 막음',r6.status);
   const scan=fs.readFileSync(path.join(__dirname,'pdfs','label-plan.pdf')).toString('base64');const r7=await call({pdf:scan});ok(r7.status===200&&/\[강점 1\]/.test(r7.body.text),'항목 이름 방식 PDF',r7.status)}
 }
 console.log('[4] Gemini 서버 함수 — 오류마다 code');
 {process.env.GEMINI_API_KEY='k'.repeat(30);process.env.APP_ACCESS_CODE='x'.repeat(12);process.env.APP_SESSION_SECRET='s'.repeat(40);
  const shared=require(require('path').resolve(__dirname,'../api/_shared.cjs'));delete require.cache[require.resolve(require('path').resolve(__dirname,'../api/generate.js'))];const gen=require(require('path').resolve(__dirname,'../api/generate.js'));
  const run=(fetchImpl,body={system:'시스템 안내 문장입니다.',prompt:'요청 본문 문장입니다.',maxTokens:800})=>new Promise(resolve=>{global.fetch=fetchImpl;const headers={host:'a.vercel.app',origin:'https://a.vercel.app','x-requested-with':'rehab-app','x-forwarded-proto':'https',cookie:shared.sessionCookie({headers:{},socket:{}}).split(';')[0]};
   const res={statusCode:200,h:{},setHeader(k,v){this.h[k]=v},end(t){resolve({status:this.statusCode,body:JSON.parse(t)})}};gen({method:'POST',headers,body,socket:{remoteAddress:'9.9.9.'+Math.floor(Math.random()*250)}},res)});
  const J=(status,data)=>Promise.resolve({ok:status<300,status,json:async()=>data,headers:{get:()=>null}});
  let r=await run(()=>J(200,{candidates:[{content:{parts:[{text:'{"a":1}'}]},finishReason:'STOP'}]}));ok(r.status===200&&r.body.text==='{"a":1}','정상 응답');
  r=await run(u=>/models\?/.test(u)?J(200,{models:[]}):J(503,{error:{status:'UNAVAILABLE'}}));ok(r.status===502&&r.body.error.code==='UPSTREAM_SERVICE_ERROR'&&r.body.error.providerStatus===503,'구글 과부하',r.body.error);
  r=await run(()=>J(429,{error:{message:'quota per day',details:[]}}));ok(r.status===429&&r.body.error.code==='QUOTA_LIMIT'&&r.body.error.limitKind==='daily','하루 한도',r.body.error);
  r=await run(()=>J(400,{error:{message:'API key not valid'}}));ok(r.body.error.code==='KEY_PROBLEM','키 문제',r.body.error);
  r=await run(()=>J(200,{candidates:[{content:{parts:[]},finishReason:'SAFETY'}]}));ok(r.status===422&&r.body.error.code==='SAFETY_BLOCKED','안전 기준',r.body.error);
  r=await run(()=>J(200,{candidates:[{content:{parts:[]},finishReason:'OTHER'}]}));ok(r.status===502&&r.body.error.code==='EMPTY_RESPONSE','빈 응답',r.body.error);
  r=await run(()=>Promise.reject(Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}})));ok(r.status===502&&r.body.error.code==='NETWORK_FAILURE','연결 실패',r.body.error);
  r=await run(()=>Promise.reject(Object.assign(new Error('aborted'),{name:'AbortError'})));ok(r.status===504&&r.body.error.code==='TIMEOUT','시간 초과',r.body.error);
  r=await run(()=>J(200,{}),{system:'x',prompt:'y',maxTokens:1});ok(r.status===400&&r.body.error.code==='BAD_INPUT','잘못된 요청',r.body.error);
  const k0=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='';r=await run(()=>J(200,{}));ok(r.status===503&&r.body.error.code==='SERVER_UNCONFIGURED','설정 안 됨',r.body.error);process.env.GEMINI_API_KEY=k0;
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
