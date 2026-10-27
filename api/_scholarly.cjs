'use strict';
// v3.21.66: 구글 검색 연동을 쓸 수 없을 때(Gemini 무료 등급 등) 공개 학술 검색(Europe PMC·Crossref)으로 최신 논문을 찾는다.
// 두 곳 모두 무료이고 API 키가 필요 없다. 보내는 검색어는 아래 고정 목록(영어)뿐이며,
// 회원 이름·상담일지 문장·진단 자유 입력·사용자가 넣은 주소는 받지도 보내지도 않는다.
const TOPIC_QUERY=Object.freeze({
 positive:'hallucinations delusions coping psychosocial intervention',
 negative:'negative symptoms schizophrenia behavioral activation',
 meds:'medication adherence schizophrenia intervention',
 sleep:'sleep severe mental illness intervention',
 alcohol:'alcohol use severe mental illness integrated treatment',
 physical:'lifestyle intervention weight serious mental illness',
 hygiene:'daily living skills training schizophrenia',
 social:'social skills training schizophrenia',
 money:'money management serious mental illness',
 work:'supported employment individual placement support',
 family:'family psychoeducation schizophrenia',
 mood:'depressive symptoms serious mental illness psychosocial intervention',
 ocd:'obsessive compulsive disorder exposure response prevention',
 risk:'suicide prevention safety planning intervention',
 housing:'supported housing serious mental illness'});
const CAT_QUERY=Object.freeze({
 psychosis:'schizophrenia psychosocial rehabilitation',
 bipolar:'bipolar disorder psychosocial intervention',
 ocd:'obsessive compulsive disorder psychosocial treatment'});
const DOI=/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;
const plain=(v,max=200)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+);/gi,' ').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const validDoi=v=>{const s=String(v||'').trim();return DOI.test(s)&&s.length<=190?s:''};
// 주제(최대 2개)와 진단 분류로 검색어 1~2개를 고른다(고정 목록에 있는 것만).
function queriesFor(topics=[],cats=[]){
 const own=(o,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k);
 const t=[...new Set(topics)].filter(k=>own(TOPIC_QUERY,k)).map(k=>TOPIC_QUERY[k]);
 const c=[...new Set(cats)].filter(k=>own(CAT_QUERY,k)).map(k=>CAT_QUERY[k]);
 return [...new Set([t[0],t[1]||c[0],c[0]].filter(Boolean))].slice(0,2)}
function fromEurope(data){const out=[];
 for(const p of (Array.isArray(data?.resultList?.result)?data.resultList.result:[]).slice(0,6)){
  if(!p||typeof p!=='object')continue;
  const title=plain(p.title,170).replace(/\.$/,''),doi=validDoi(p.doi),id=plain(p.id,40),src=plain(p.source,8);
  const url=doi?'https://doi.org/'+encodeURI(doi):(id&&/^[A-Za-z0-9_.-]+$/.test(id)&&/^(?:MED|PMC)$/.test(src)?'https://europepmc.org/article/'+src+'/'+encodeURIComponent(id):'');
  if(!url||title.length<12)continue;
  const year=(String(p.pubYear||'').match(/^(?:19|20)\d{2}$/)||[''])[0];
  out.push({title,url,year,journal:plain(p.journalTitle||p.journalInfo?.journal?.title,80),excerpt:plain(p.abstractText,320),provider:'Europe PMC'})}
 return out}
function fromCrossref(data){const out=[];
 for(const p of (Array.isArray(data?.message?.items)?data.message.items:[]).slice(0,6)){
  if(!p||p.type!=='journal-article')continue;
  const doi=validDoi(p.DOI),title=plain(Array.isArray(p.title)?p.title[0]:p.title,170).replace(/\.$/,'');
  if(!doi||title.length<12)continue;
  const y=Number(p.published?.['date-parts']?.[0]?.[0]||p['published-print']?.['date-parts']?.[0]?.[0]||p['published-online']?.['date-parts']?.[0]?.[0]);
  out.push({title,url:'https://doi.org/'+encodeURI(doi),year:Number.isInteger(y)&&y>1900&&y<2100?String(y):'',journal:plain(Array.isArray(p['container-title'])?p['container-title'][0]:'',80),excerpt:plain(p.abstract,320),provider:'Crossref'})}
 return out}
// 같은 논문(주소·제목)은 한 번만, 초록이 있는 논문을 앞에 둔다.
function merge(lists,max=6){const seen=new Set(),out=[];
 const key=r=>r.title.toLowerCase().replace(/[^a-z0-9]+/g,'');
 for(const r of lists.flat()){if(!r?.url||seen.has(r.url)||seen.has(key(r)))continue;seen.add(r.url);seen.add(key(r));out.push(r)}
 return out.sort((a,b)=>(b.excerpt?1:0)-(a.excerpt?1:0)).slice(0,max)}
// AI 작성에 함께 줄 글: 논문 제목·연도·학술지와 초록 일부(영어 원문 그대로)
function asText(records){return records.map((r,i)=>`${i+1}. ${r.title}${r.year||r.journal?' ('+[r.year,r.journal].filter(Boolean).join(', ')+')':''}`+(r.excerpt?`\n   초록 일부: ${r.excerpt}`:'\n   (초록 없음 — 제목만 참고하고 내용·효과를 짐작하지 않는다)')).join('\n').slice(0,2400)}
async function fetchJson(url,doFetch,timeoutMs){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{const r=await doFetch(url,{method:'GET',signal:ctl.signal,redirect:'error',headers:{accept:'application/json','user-agent':'rehab-plan-app (psychiatric rehabilitation documentation; public topics only)'}});
  if(!r?.ok)return null;const type=String(r.headers?.get?.('content-type')||'').toLowerCase();if(type&&!type.includes('json'))return null;
  const text=await r.text();if(text.length>400000)return null;return JSON.parse(text)}
 catch{return null}finally{clearTimeout(timer)}}
async function lookup(topics,cats,{fetcher=globalThis.fetch,timeoutMs=6500}={}){
 const queries=queriesFor(topics,cats);if(!queries.length||typeof fetcher!=='function')return{ok:false,reason:'empty'};
 const year=new Date().getFullYear(),from=year-8,jobs=[];
 for(const q of queries){
  const ep=new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
  ep.searchParams.set('query',`(${q}) AND HAS_ABSTRACT:y AND PUB_YEAR:[${from} TO ${year}]`);ep.searchParams.set('format','json');ep.searchParams.set('resultType','core');ep.searchParams.set('pageSize','4');
  const cr=new URL('https://api.crossref.org/works');
  cr.searchParams.set('query.bibliographic',q);cr.searchParams.set('rows','3');cr.searchParams.set('filter',`type:journal-article,from-pub-date:${from},has-abstract:true`);cr.searchParams.set('select','DOI,title,abstract,published,container-title,type');
  jobs.push(fetchJson(ep.href,fetcher,timeoutMs).then(fromEurope),fetchJson(cr.href,fetcher,timeoutMs).then(fromCrossref))}
 const records=merge(await Promise.all(jobs));
 if(!records.length)return{ok:false,reason:'unavailable',queries};
 return{ok:true,queries,records,text:asText(records),sources:records.map(r=>({title:`${r.title}${r.year?' ('+r.year+')':''} — ${r.provider}`,uri:r.url}))}}
module.exports={TOPIC_QUERY,CAT_QUERY,queriesFor,fromEurope,fromCrossref,merge,asText,lookup};
