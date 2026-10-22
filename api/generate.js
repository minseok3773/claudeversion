'use strict';
// Gemini Developer API: 접속코드 인증 및 요청량 제한 적용.
// API 키는 서버 비공개 환경변수에만 저장하며, 외부 AI 입력/응답을 로그에 남기지 않는다.
const {send,envStatus,postSameOrigin,jsonBody,sessionValid,allowRequest}=require('./_shared.cjs');
const DEFAULT_MODEL='gemini-3.1-flash-lite';
const MODEL_RE=/^gemini-[a-z0-9.-]{4,90}$/;
// v3.21.49: 구글이 모델을 종료·교체해 설정된 모델을 쓸 수 없게 되면(404 등),
// 이 키로 쓸 수 있는 가장 최신 Flash-Lite(없으면 Flash) 정식 모델을 자동으로 찾아 이어서 쓴다.
// 찾은 모델은 서버가 켜져 있는 동안 기억하고, 관리자가 GEMINI_MODEL을 바꾸면 다시 찾는다.
let autoModel={from:'',to:''};
function modelGone(status,data){const msg=String(data?.error?.message||'');return status===404||(status===400&&/not\s*found|is not supported|no longer (?:available|supported)|deprecated|retired|shut\s*down/i.test(msg))}
async function findLatestModel(key,signal){
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':key},signal});
 if(!r.ok)return '';
 const d=await r.json().catch(()=>null);
 const names=(Array.isArray(d?.models)?d.models:[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>String(m.name||'').replace(/^models\//,''));
 const pick=re=>names.map(n=>{const mt=re.exec(n);return mt?{n,v:parseFloat(mt[1])}:null}).filter(Boolean).sort((a,b)=>b.v-a.v)[0]?.n||'';
 const best=pick(/^gemini-(\d+(?:\.\d+)?)-flash-lite$/)||pick(/^gemini-(\d+(?:\.\d+)?)-flash$/);
 return MODEL_RE.test(best)?best:'';
}
// 키 문제(만료·차단·잘못된 키)는 관리자가 할 일을 구체적으로 알려 준다.
const KEY_FIX='Google AI Studio(aistudio.google.com)에서 새 API 키를 만든 뒤, Vercel 프로젝트 Settings → Environment Variables의 GEMINI_API_KEY 값을 새 키로 바꾸고 다시 배포(Redeploy)하세요.';
function keyProblem(status,data){const t=JSON.stringify(data?.error||{});
 if(/API_KEY_INVALID|API key not valid|API_KEY_EXPIRED|expired/i.test(t))return 'Gemini API 키가 만료되었거나 올바르지 않습니다. '+KEY_FIX;
 if(/blocked|leaked|API_KEY_SERVICE_BLOCKED|unrestricted|standard (?:api )?key/i.test(t))return 'Gemini API 키가 구글에서 차단되었습니다(오래 쓰지 않았거나 제한이 없는 예전 방식의 키). '+KEY_FIX;
 if(status===401||status===403)return 'Gemini API 키에 이 서비스를 쓸 권한이 없습니다. '+KEY_FIX;
 return ''}
// 개인정보 형식에 따른 자동 차단은 사용하지 않습니다.
// 개인정보 자동 분류·가상 여부 검사 없음. 외부 AI 데이터 처리 조건을 기관에서 검토해야 합니다.

function quotaType(status, data){
 if(status!==429)return '';
 const violations=(data?.error?.details||[]).flatMap(x=>Array.isArray(x?.violations)?x.violations:[]);
 const hints=violations.map(x=>String(x.quotaId||'')+' '+String(x.quotaMetric||'')).join(' ')+' '+String(data?.error?.message||'');
 return /(?:per.day|per_day|PerDay|Daily|requests.per.day|RPD|daily)/i.test(hints)?'daily':
        /(?:per.minute|per_minute|PerMinute|RPM|TPM|minute)/i.test(hints)?'minute':'unknown';
}
function retryAfterSeconds(data,headers){
 const raw=Number(headers?.get?.('retry-after'));
 if(Number.isFinite(raw)&&raw>0)return Math.min(120,Math.ceil(raw));
 for(const x of data?.error?.details||[]){
  const d=String(x?.retryDelay||'');const m=/^(\d+(?:\.\d+)?)s$/.exec(d);
  if(m)return Math.min(120,Math.ceil(Number(m[1])));
 }
 return 0;
}
module.exports=async function(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST 요청만 허용합니다.'},{Allow:'POST'});
 if(!postSameOrigin(req)||req.headers['x-requested-with']!=='rehab-app')return send(res,403,{error:'허용되지 않은 요청입니다.'});
 if(!envStatus().configured)return send(res,503,{error:{message:'무료 Gemini AI 서버 설정이 완료되지 않았습니다.'}});
 if(!sessionValid(req))return send(res,401,{error:{message:'기관 접속 인증이 필요합니다.'}});
 const client=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
 if(!allowRequest('generate',client,30,60*1000))return send(res,429,{error:{message:'AI 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',limitKind:'minute'}},{'Retry-After':'60'});
 const b=jsonBody(req);
 const system=typeof b?.system==='string'?b.system:'';
 const prompt=typeof b?.prompt==='string'?b.prompt:'';
 const maxTokens=Number(b?.maxTokens);
 if(system.length<10||system.length>4000||prompt.length<10||prompt.length>110000||!Number.isInteger(maxTokens)||maxTokens<100||maxTokens>4500)
  return send(res,400,{error:{message:'AI 요청 자료의 길이 또는 형식이 올바르지 않습니다.'}});
 const configuredModel=(process.env.GEMINI_MODEL||DEFAULT_MODEL).trim();
 if(!MODEL_RE.test(configuredModel))return send(res,503,{error:{message:'Gemini 모델 설정이 올바르지 않습니다.'}});
 let model=autoModel.from===configuredModel&&autoModel.to?autoModel.to:configuredModel;
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),55000);
 try{
  const key=process.env.GEMINI_API_KEY;
  const call=m=>fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m)+':generateContent',{
   method:'POST',signal:ctrl.signal,
   headers:{'x-goog-api-key':key,'content-type':'application/json'},
   body:JSON.stringify({
    systemInstruction:{parts:[{text:system}]},
    contents:[{role:'user',parts:[{text:prompt}]}],
    generationConfig:{temperature:0.15,maxOutputTokens:maxTokens,responseMimeType:'application/json'}
   })
  });
  let up=await call(model);
  let data=await up.json().catch(()=>null);
  if(!up.ok&&modelGone(up.status,data)){
   const next=await findLatestModel(key,ctrl.signal).catch(()=>'');
   if(next&&next!==model){autoModel={from:configuredModel,to:next};model=next;up=await call(model);data=await up.json().catch(()=>null)}
  }
  if(!up.ok){
   const status=up.status;
   if(status===429){
    const kind=quotaType(status,data),delay=retryAfterSeconds(data,up.headers);
    const message=kind==='daily'
     ?'Gemini 무료 일일 사용 한도에 도달했습니다. 태평양시간 다음 자정(한국시간 오후 4~5시) 이후 다시 이용해 주세요.'
     :kind==='minute'
       ?'Gemini 분당 요청·토큰 한도에 도달했습니다. 잠시 뒤 재시도해 주세요.'
       :'Gemini 무료 사용량 또는 요청 속도 제한에 도달했습니다. 잠시 후 다시 시도하거나 일일 한도 초기화를 기다려 주세요.';
    const extra=delay?{'Retry-After':String(delay)}:{};
    return send(res,429,{error:{message,limitKind:kind}},extra);
   }
   const kp=keyProblem(status,data);
   if(kp)return send(res,401,{error:{message:kp,keyProblem:true}});
   const message=(status===401||status===403)?'관리자에게 Gemini API 키·프로젝트 이용 권한을 확인해 달라고 요청하세요.':
    status===404?'설정된 Gemini 모델에 접근할 수 없습니다. 관리자에게 모델명과 무료 등급 사용 가능 여부를 확인해 달라고 요청하세요.':
    status===400?'AI 모델 설정 또는 입력 형식을 확인해 주세요.':
    status>=500?'Gemini 서버가 일시적으로 응답하지 않습니다.':'AI 요청을 처리하지 못했습니다.';
   return send(res,status>=500?502:status,{error:{message}});
  }
  const parts=data?.candidates?.[0]?.content?.parts;
  const content=Array.isArray(parts)?parts.filter(x=>typeof x?.text==='string').map(x=>x.text).join(''):'';
  const finish=data?.candidates?.[0]?.finishReason;
  if(!content.trim())return send(res,502,{error:{message:'Gemini 응답이 비어 있거나 안전성 기준에 의해 생성되지 않았습니다.'}});
  const u=data?.usageMetadata||{};const usage=(Number.isFinite(u.totalTokenCount)&&u.totalTokenCount>=0)?{input:Number(u.promptTokenCount)||0,output:Number(u.candidatesTokenCount)||0,total:Number(u.totalTokenCount)}:null;
  return send(res,200,{text:content,truncated:finish==='MAX_TOKENS',usage,model});
 }catch(e){
  return send(res,e?.name==='AbortError'?504:502,{error:{message:e?.name==='AbortError'?'Gemini 응답 시간이 초과되었습니다.':'Gemini 서버에 접속할 수 없습니다.'}});
 }finally{clearTimeout(timeout)}
};
