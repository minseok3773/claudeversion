'use strict';
// v3.21.59: 진단 분류별 공개 지침(NICE·WHO) 요약을 돌려준다(접속코드 인증 필요).
// 정해진 공식 주소만 확인하고(사용자가 준 주소는 쓰지 않음), 회원 정보·상담 내용은 어디에도 보내지 않는다.
const {send,postSameOrigin,jsonBody,sessionValid,allowRequest}=require('./_shared.cjs');
// v3.21.60: 상담일지 증상·문제 주제별 공개 전문자료(브라우저와 같은 목록). 주제 이름(고정 id)만 받는다.
const PRO=require('../pro-knowledge.js');
const SOURCES=Object.freeze({
 psychosis:{name:'NICE CG178: 정신병적 장애·조현병',url:'https://www.nice.org.uk/guidance/cg178',summary:'정신 증상과 일상 기능, 신체건강, 사회 관계, 가족 지원을 함께 평가하고 회복 목표와 신체건강 관리를 개인별로 세운다.'},
 bipolar:{name:'NICE CG185: 양극성장애',url:'https://www.nice.org.uk/guidance/cg185',summary:'기분과 활동 변화, 재발 요인, 일상·사회적 기능, 신체건강을 확인하고 회원의 회복 목표와 예방 계획을 함께 세운다.'},
 ocd:{name:'NICE CG31: 강박장애',url:'https://www.nice.org.uk/guidance/cg31',summary:'강박사고와 행동이 일상과 사회적 기능에 미치는 영향을 확인하고 전문 치료와 연계하며 기능 회복을 위한 개별 지원을 한다.'},
 general:{name:'WHO mhGAP 개입 지침 2.0',url:'https://www.who.int/publications/i/item/9789241549790',summary:'증상과 기능을 함께 살피고 회원의 권리와 회복, 사회적 지지체계를 고려한 근거 기반 지원과 알맞은 전문 의뢰를 한다.'}
});
const ALLOWED_HOSTS=/(?:^|\.)(?:nice\.org\.uk|who\.int)$/i;
const hostOk=h=>ALLOWED_HOSTS.test(h)||PRO.HOST_RE.test(h);
// 공식 페이지 확인 결과는 서버가 켜져 있는 동안 12시간 기억한다(작성할 때마다 다시 확인하지 않음).
const TTL=12*60*60*1000,cache=new Map();
function metadata(html){const m=/<meta\b(?=[^>]*\b(?:name|property)=["'](?:description|og:description)["'])[^>]*\bcontent=["']([^"']{20,600})["']/i.exec(html.slice(0,90000));
 return m?m[1].replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,230):''}
async function check(key,s=SOURCES[key]){const ck=s.url,hit=cache.get(ck);if(hit&&Date.now()-hit.at<TTL)return{key,...hit.value};
 let checkedOnline=false,overview='';
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),3800);
 try{const r=await fetch(s.url,{redirect:'follow',signal:ctl.signal,headers:{accept:'text/html','user-agent':'rehab-docs-guideline-check'}});
  let host='';try{host=new URL(r.url||s.url).hostname}catch{}
  if(r.ok&&hostOk(host)&&String(r.headers.get('content-type')||'').includes('text/html')){checkedOnline=true;overview=metadata((await r.text()).slice(0,300000))}
 }catch{}finally{clearTimeout(timer)}
 const value={...s,checkedOnline,overview};if(checkedOnline)cache.set(ck,{at:Date.now(),value});return{key,...value}}
module.exports=async function clinicalGuidance(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST 요청만 허용합니다.'},{Allow:'POST'});
 if(!postSameOrigin(req)||req.headers['x-requested-with']!=='rehab-app')return send(res,403,{error:'허용되지 않은 요청입니다.'});
 if(!sessionValid(req))return send(res,401,{error:'먼저 기관 접속 인증을 해 주세요.'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].slice(0,80);
 if(!allowRequest('clinical-guidance',ip,20,10*60*1000))return send(res,429,{error:'요청이 많습니다. 잠시 뒤 다시 해 주세요.'},{'Retry-After':'60'});
 const body=jsonBody(req);
 if(!body||!Array.isArray(body.categories)||body.categories.length>4)return send(res,400,{error:'분류 값이 올바르지 않습니다.'});
 if(body.topics!==undefined&&(!Array.isArray(body.topics)||body.topics.length>15))return send(res,400,{error:'주제 값이 올바르지 않습니다.'});
 const chosen=[...new Set(body.categories)].filter(x=>typeof x==='string'&&Object.prototype.hasOwnProperty.call(SOURCES,x)).slice(0,3);
 const topics=[...new Set(body.topics||[])].filter(x=>typeof x==='string'&&Object.prototype.hasOwnProperty.call(PRO.byId,x)).slice(0,8);
 const topicKeys=PRO.sourcesFor(topics).slice(0,8);
 const catKeys=chosen.length?chosen:(topicKeys.length?[]:['general']);
 const [sources,topicSources]=await Promise.all([Promise.all(catKeys.map(k=>check(k))),Promise.all(topicKeys.map(k=>check(k,PRO.SOURCES[k])))]);
 const all=[...sources,...topicSources];
 return send(res,200,{sources,topicSources,liveChecks:all.filter(x=>x.checkedOnline).length,refreshedAt:new Date().toISOString(),privacy:'회원 정보는 공식 사이트로 보내지 않음'});
};
