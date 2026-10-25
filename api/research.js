'use strict';
// v3.21.61: 체크한 상담일지에서 찾은 증상·문제 '주제'(고정 목록 id)와 진단 분류만으로 구글 검색을 해서
// 정신재활 실천에 참고할 최신 전문자료 요약·검색어·출처를 돌려준다(Gemini의 Google 검색 연동).
// 회원 이름·상담일지 문장은 받지도, 구글에 보내지도 않는다. 검색을 부탁하는 글은 서버가 고정 목록으로만 만든다.
const {send,envStatus,postSameOrigin,jsonBody,sessionValid,allowRequest}=require('./_shared.cjs');
const PRO=require('../pro-knowledge.js');
const MODEL_RE=/^gemini-[a-z0-9.-]{4,90}$/;
const PSY=Object.freeze({psychosis:'조현병 등 정신병적 장애',bipolar:'양극성장애',ocd:'강박장애'});
// 구글 검색 연동이 되는 모델을 차례로 시도한다.
// 1) 관리자가 따로 정한 검색용 모델(GEMINI_SEARCH_MODEL) 2) 문서 작성 모델(유료 등급이면 매달 검색 5,000회 무료)
// 3) Gemini 2.5 Flash-Lite·Flash(무료 등급에서도 하루 500회까지 검색되지만, 예전에 이 모델을 써 본 키만 쓸 수 있음)
function models(){const v=x=>String(x||'').trim();
 return [...new Set([v(process.env.GEMINI_SEARCH_MODEL),v(process.env.GEMINI_MODEL)||'gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-2.5-flash'].filter(x=>MODEL_RE.test(x)))]}
const RESULT_TTL=24*60*60*1000,results=new Map(),down=new Map();
// 실패한 모델은 잠시 건너뛴다(같은 실패로 매번 기다리지 않게). ‘다시 검색’은 이 기억을 무시하고 다시 시도한다.
const DOWN_TTL={tier:30*60*1000,model:6*60*60*1000,key:30*60*1000,quota:10*60*1000,busy:5*60*1000,nosearch:30*60*1000,other:10*60*1000};
const MESSAGES={
 tier:'지금 쓰는 Gemini 무료 등급에서는 구글 검색 연동이 막혀 있습니다. Google AI Studio에서 결제 정보를 등록해 유료 등급으로 바꾸면 매달 구글 검색 5,000회까지 무료로 쓸 수 있습니다.',
 model:'이 API 키로는 구글 검색을 지원하는 Gemini 모델을 쓸 수 없습니다. Google AI Studio에서 결제 정보를 등록해 유료 등급으로 바꾸면 쓸 수 있습니다.',
 quota:'구글 검색 사용 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.',
 busy:'구글 서버가 바빠 검색하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
 key:'Gemini API 키에 구글 검색 권한이 없습니다. Google AI Studio에서 키와 결제 상태를 확인해 주세요.',
 nosearch:'AI가 구글 검색을 하지 않고 답해서 그 답은 쓰지 않았습니다. 잠시 뒤 다시 시도해 주세요.',
 other:'구글 검색을 하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'};
function promptFor(topics,cats){
 return ['[자료 조사 요청] 한국 정신재활시설의 정신건강사회복지사가 성인 회원의 재활계획서·재활평가서·주치의 경과보고를 쓸 때 참고할 최신 전문자료를 구글 검색으로 찾아 정리하라.',
  '[진단 분류] '+(cats.length?cats.map(c=>PSY[c]).join(', '):'정하지 않음'),
  '[상담에서 확인된 주제] '+(topics.length?topics.map(id=>PRO.byId[id].name).join(' / '):'정하지 않음(진단 분류에 맞는 정신재활 일반 원칙)'),
  '[찾을 자료] 국내 공공·전문기관(보건복지부, 국립정신건강센터, 국가정신건강정보포털, 정신건강복지센터, 관련 학회·학술지)과 해외 공공·전문기관(WHO, NICE, SAMHSA, 학술 논문)의 자료를 먼저 찾는다. 개인 블로그·광고·커뮤니티 글·병원 홍보 글은 쓰지 않는다.',
  '[정리 방식]',
  '- 주제마다 ‘■ 주제 이름’으로 시작한다.',
  '- 1) 시설에서 할 수 있는 근거 기반 개입 방법 2~3가지 2) 변화를 확인할 관찰·평가 지표 1~2가지 3) 주치의와 협력할 점이나 주의할 점 1가지를 짧은 문장으로 쓴다.',
  '- 특정 회원의 이야기는 쓰지 않고 일반 원칙만 쓴다. 약 이름·용량 같은 의학적 지시는 쓰지 않는다.',
  '- 전체 2,000자 안쪽 한국어로 쓴다.'].join('\n')}
function reasonOf(status,data){const e=data?.error||{};let t='';try{t=(String(e.status||'')+' '+String(e.message||'')+' '+JSON.stringify(e.details||[])).slice(0,4000)}catch{}
 if(status===429)return /search|grounding|limit:\s*0\b|"quotaValue"\s*:\s*"0"/i.test(t)?'tier':'quota';
 if(status===404||/no longer available|is not found|not found for api version|deprecated|retired|shut\s*down/i.test(t))return 'model';
 if(/billing|paid tier|free tier|upgrade|grounding|google[_ ]?search|search tool|not available (?:on|in|for) (?:the )?free/i.test(t))return 'tier';
 if(status===401||status===403)return 'key';
 if(status>=500)return 'busy';
 return 'other'}
const tidy=(s,max)=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);
// 구글이 주는 검색 추천(Search Suggestions) HTML은 그대로 보여 줘야 한다. 혹시 모를 스크립트·이벤트 속성만 막는다.
function safeSuggestions(html){let h=String(html||'');if(!h||h.length>40000)return '';
 return h.replace(/<script\b[\s\S]*?<\/script\s*>/gi,'').replace(/<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|link|meta|base)\b[^>]*>/gi,'')
  .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\b(href|src)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi,'$1="#"')}
async function ask(key,model,prompt,signal){
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',signal,
  headers:{'x-goog-api-key':key,'content-type':'application/json'},
  // 온도는 기본값(구글 권장)을 쓰고, 생각(thinking)에 쓰는 몫을 고려해 출력 한도를 넉넉히 둔다.
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{maxOutputTokens:6000}})});
 const data=await r.json().catch(()=>null);
 if(!r.ok)return{ok:false,reason:reasonOf(r.status,data),status:r.status};
 const c=data?.candidates?.[0];
 const text=tidy((Array.isArray(c?.content?.parts)?c.content.parts:[]).filter(p=>typeof p?.text==='string'&&!p.thought).map(p=>p.text).join(''),3200);
 const g=c?.groundingMetadata||{};
 const queries=[...new Set((Array.isArray(g.webSearchQueries)?g.webSearchQueries:[]).filter(q=>typeof q==='string').map(q=>tidy(q,120)).filter(Boolean))].slice(0,8);
 const seen=new Set(),sources=[];
 for(const ch of Array.isArray(g.groundingChunks)?g.groundingChunks:[]){const w=ch?.web,uri=typeof w?.uri==='string'?w.uri.trim():'';
  if(!/^https:\/\/[^\s"'<>]+$/i.test(uri)||uri.length>2048)continue;const title=tidy(w.title,140)||'출처',k=title+'|'+uri;if(seen.has(k))continue;seen.add(k);sources.push({title,uri});if(sources.length>=12)break}
 if(!text)return{ok:false,reason:'other',status:200};
 if(!queries.length&&!sources.length)return{ok:false,reason:'nosearch',status:200};
 return{ok:true,text,queries,sources,suggestions:safeSuggestions(g.searchEntryPoint?.renderedContent)}}
module.exports=async function research(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST 요청만 허용합니다.'},{Allow:'POST'});
 if(!postSameOrigin(req)||req.headers['x-requested-with']!=='rehab-app')return send(res,403,{error:'허용되지 않은 요청입니다.'});
 if(!envStatus().configured)return send(res,503,{error:'AI 서버 설정이 완료되지 않았습니다.',code:'SERVER_UNCONFIGURED'});
 if(!sessionValid(req))return send(res,401,{error:'먼저 기관 접속 인증을 해 주세요.',code:'AUTH_REQUIRED'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].slice(0,80);
 if(!allowRequest('research',ip,20,10*60*1000))return send(res,429,{error:'검색 요청이 많습니다. 잠시 뒤 다시 해 주세요.',code:'APP_RATE_LIMIT'},{'Retry-After':'60'});
 const b=jsonBody(req);
 if(!b||(b.topics!==undefined&&(!Array.isArray(b.topics)||b.topics.length>15))||(b.categories!==undefined&&(!Array.isArray(b.categories)||b.categories.length>4)))
  return send(res,400,{error:'검색 주제 값이 올바르지 않습니다.',code:'BAD_INPUT'});
 const has=(o,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k);
 const topics=[...new Set(b.topics||[])].filter(x=>has(PRO.byId,x)).slice(0,6);
 const cats=[...new Set(b.categories||[])].filter(x=>has(PSY,x)).slice(0,3);
 if(!topics.length&&!cats.length)return send(res,200,{searched:false,why:'empty',message:'검색할 증상·문제 주제가 없습니다.'});
 const force=b.force===true,ck=[...topics].sort().join(',')+'|'+[...cats].sort().join(','),hit=results.get(ck);
 if(!force&&hit&&Date.now()-hit.at<RESULT_TTL)return send(res,200,{...hit.value,cached:true});
 const key=String(process.env.GEMINI_API_KEY||'').replace(/[^\x21-\x7E]/g,''),prompt=promptFor(topics,cats),tried=[],t0=Date.now();
 for(const model of models()){
  const d=down.get(model);if(!force&&d&&Date.now()<d.until){tried.push({model,reason:d.reason});continue}
  if(Date.now()-t0>32000)break;
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),24000);let r;
  try{r=await ask(key,model,prompt,ctl.signal)}catch(e){r={ok:false,reason:e?.name==='AbortError'?'busy':'other',status:0}}finally{clearTimeout(timer)}
  if(r.ok){down.delete(model);
   const value={searched:true,model,topics:topics.map(id=>PRO.byId[id].name),categories:cats.map(c=>PSY[c]),text:r.text,queries:r.queries,sources:r.sources,suggestions:r.suggestions,at:new Date().toISOString(),privacy:'검색에는 고정 목록의 주제 이름·진단 분류만 씀(회원 정보 없음)'};
   if(results.size>200)results.clear();results.set(ck,{at:Date.now(),value});return send(res,200,value)}
  down.set(model,{until:Date.now()+(DOWN_TTL[r.reason]||DOWN_TTL.other),reason:r.reason});tried.push({model,reason:r.reason});
  try{console.error('[research]',JSON.stringify({model,reason:r.reason,status:r.status}))}catch{}
 }
 const why=['tier','quota','busy','key','model','nosearch','other'].find(x=>tried.some(t=>t.reason===x))||'other';
 return send(res,200,{searched:false,why,message:MESSAGES[why],tried});
};
