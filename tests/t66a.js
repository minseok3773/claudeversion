// v3.21.66 — 서버: 구글 검색이 안 되면 무료 공개 논문 검색(Europe PMC·Crossref)으로 대신 찾기 — 가상 응답만 사용
const {ok,done,sleep}=require('./h.js');
const path=require('path');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
process.env.GEMINI_API_KEY='test-key-'+'x'.repeat(30);process.env.APP_ACCESS_CODE='access-code-123456';process.env.APP_SESSION_SECRET='s'.repeat(40);delete process.env.GEMINI_MODEL;delete process.env.GEMINI_SEARCH_MODEL;
const shared=require(path.join(DIR,'api/_shared.cjs'));
const cookie=shared.sessionCookie({headers:{},socket:{}}).split(';')[0];
function fresh(){for(const k of Object.keys(require.cache))if(k.includes(path.join(DIR,'api'))&&!k.endsWith('_shared.cjs'))delete require.cache[k];return require(path.join(DIR,'api/research.js'))}
const S=()=>{delete require.cache[require.resolve(path.join(DIR,'api/_scholarly.cjs'))];return require(path.join(DIR,'api/_scholarly.cjs'))};
function req(body,{headers={},method='POST'}={}){return{method,headers:{origin:'https://x.vercel.app',host:'x.vercel.app','x-requested-with':'rehab-app','sec-fetch-site':'same-origin',cookie,...headers},body,socket:{remoteAddress:'10.0.1.'+Math.floor(Math.random()*200)}}}
function res(){return{statusCode:0,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},end(s){this.body=s;this.json=JSON.parse(s)}}}
async function call(handler,body,o){const r=res();await handler(req(body,o),r);return r}
// 가상 응답(논문 제목·초록은 지어낸 것)
const json=(data,status=200,type='application/json;charset=UTF-8')=>{const text=typeof data==='string'?data:JSON.stringify(data);return{ok:status>=200&&status<300,status,headers:{get:k=>String(k).toLowerCase()==='content-type'?type:null},text:async()=>text,json:async()=>JSON.parse(text)}};
const EPMC=(n=2)=>({hitCount:n,resultList:{result:[
 {id:'40000001',source:'MED',pmid:'40000001',doi:'10.1000/fake.sst.2024.001',title:'Social skills training for people with schizophrenia: a <i>randomised</i> trial.',pubYear:'2024',journalInfo:{journal:{title:'Journal of Imaginary Rehabilitation'}},abstractText:'<h4>Background</h4>Social skills training (SST) is a <b>psychosocial</b> intervention. We tested a 12-week group programme &amp; found improved social functioning.'},
 {id:'PMC9000002',source:'PMC',title:'Daily living skills and community functioning in serious mental illness',pubYear:'2023',journalTitle:'Fictional Psychiatry Reports',abstractText:'A review of daily living skills programmes.'},
 {id:'1',source:'MED',title:'short',pubYear:'2022'},
 {id:'bad id/../x',source:'XYZ',title:'A record without a usable link should be dropped entirely',pubYear:'2022'}].slice(0,n+2)}});
const CROSSREF=()=>({status:'ok',message:{items:[
 {DOI:'10.1000/FAKE.SST.2024.001',type:'journal-article',title:['Social skills training for people with schizophrenia: a randomised trial'],published:{'date-parts':[[2024,3]]},'container-title':['Journal of Imaginary Rehabilitation'],abstract:'<jats:p>Duplicate of the Europe PMC record.</jats:p>'},
 {DOI:'10.1000/fake.peer.2025.7',type:'journal-article',title:['Peer support and social participation after psychosis'],published:{'date-parts':[[2025]]},'container-title':['Imaginary Journal of Recovery'],abstract:'<jats:title>Abstract</jats:title><jats:p>Peer support groups improved <jats:italic>social participation</jats:italic>.</jats:p>'},
 {DOI:'javascript:alert(1)',type:'journal-article',title:['A record with a dangerous identifier is dropped']},
 {DOI:'10.1000/fake.book',type:'book-chapter',title:['Not a journal article so it is dropped']}]}});
let calls=[];
const tierErr=()=>json({error:{status:'RESOURCE_EXHAUSTED',message:'Quota exceeded for metric: generativelanguage.googleapis.com/search_grounding_request_count, limit: 0'}},429);
const grounded=()=>json({candidates:[{content:{parts:[{text:'■ 사회기술\n1) 사회기술훈련을 한다.'}]},groundingMetadata:{webSearchQueries:['사회기술훈련 조현병'],groundingChunks:[{web:{uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA',title:'ncmh.go.kr'}}]}}]});
function mock({gemini=tierErr,epmc=()=>json(EPMC()),crossref=()=>json(CROSSREF())}={}){calls=[];
 global.fetch=async(url,opts={})=>{const u=new URL(String(url));calls.push({host:u.host,url:String(url),opts});
  if(u.host==='generativelanguage.googleapis.com')return gemini(u,opts);
  if(u.host==='www.ebi.ac.uk')return epmc(u,opts);
  if(u.host==='api.crossref.org')return crossref(u,opts);
  throw Error('unexpected host '+u.host)}}
(async()=>{
 console.log('[1] 검색어는 정해 둔 영어 목록에서만');
 {const s=S();
  ok(JSON.stringify(s.queriesFor(['social'],[]))==='["social skills training schizophrenia"]','주제 1개 → 검색어 1개',s.queriesFor(['social'],[]));
  ok(s.queriesFor(['social','hygiene','work'],['psychosis']).length===2,'검색어는 2개까지');
  ok(JSON.stringify(s.queriesFor([],['bipolar']))==='["bipolar disorder psychosocial intervention"]','진단 분류만 있어도 검색',s.queriesFor([],['bipolar']));
  ok(s.queriesFor(['홍길동 환청','__proto__','constructor','toString'],['x','general']).length===0,'목록에 없는 글·특수 이름은 버림');
  const all=[...Object.values(s.TOPIC_QUERY),...Object.values(s.CAT_QUERY)];ok(all.every(q=>/^[a-z ]+$/.test(q)),'모든 검색어는 영어 소문자 낱말뿐(회원 정보가 들어갈 자리 없음)');
  const PRO=require(path.join(DIR,'pro-knowledge.js'));const ids=Object.keys(PRO.byId);ok(ids.every(id=>s.TOPIC_QUERY[id]),'내장 자료의 모든 주제에 검색어가 있음',ids.filter(id=>!s.TOPIC_QUERY[id]));
 }
 console.log('[2] 결과 정리: 안전한 주소만, 같은 논문은 한 번, 초록이 있는 것 먼저');
 {const s=S();const e=s.fromEurope(EPMC()),c=s.fromCrossref(CROSSREF());
  ok(e.length===2&&e[0].url==='https://doi.org/10.1000/fake.sst.2024.001'&&e[1].url==='https://europepmc.org/article/PMC/PMC9000002','Europe PMC: DOI 주소, 없으면 Europe PMC 주소',e.map(x=>x.url));
  ok(!/<|&amp;/.test(e[0].title+e[0].excerpt)&&/randomised trial$/.test(e[0].title)&&/& found|found/.test(e[0].excerpt),'제목·초록의 HTML 태그 제거',e[0]);
  ok(e[0].year==='2024'&&e[0].journal==='Journal of Imaginary Rehabilitation'&&e[1].journal==='Fictional Psychiatry Reports','연도·학술지');
  ok(c.length===2&&c.every(x=>/^https:\/\/doi\.org\/10\.1000\//.test(x.url)),'Crossref: 학술지 논문·올바른 DOI만',c.map(x=>x.url));
  ok(c[1].excerpt==='Abstract Peer support groups improved social participation .'||/Peer support groups improved social participation/.test(c[1].excerpt),'JATS 초록 태그 제거',c[1].excerpt);
  const m=s.merge([e,c]);ok(m.length===3,'제목이 같은 논문은 한 번만',m.map(x=>x.title));
  ok(m.every(x=>x.excerpt),'초록 있는 논문만 남음(이번 자료)');
  const t=s.asText(m);ok(/^1\. Social skills training for people with schizophrenia: a randomised trial \(2024, Journal of Imaginary Rehabilitation\)\n   초록 일부: /.test(t)&&t.length<=2400,'AI에 줄 글 형식',t.slice(0,160));
  ok(/초록 없음 — 제목만 참고/.test(s.asText([{title:'A title long enough here',url:'https://doi.org/10.1/x',year:'',journal:'',excerpt:''}])),'초록이 없으면 내용을 짐작하지 말라고 표시');
  const long=Array.from({length:6},(_,i)=>({title:'Long fictional paper title number '+i+' '+'x'.repeat(150),url:'https://doi.org/10.1000/long.'+i,year:'2025',journal:'Imaginary Journal',excerpt:'y'.repeat(320)}));
  const f=s.fit(long),txt=s.asText(f);ok(f.length>=3&&f.length<6&&txt.length<=2400&&/y$/.test(txt)&&txt.split('\n').filter(l=>/^\d+\. /.test(l)).length===f.length,'글이 길면 2,400자 안에 다 들어가는 논문까지만(중간에서 자르지 않음)',[f.length,txt.length]);
 }
 console.log('[3] lookup: 두 곳에 영어 검색어만 보내고, 이메일·회원 정보 없음');
 {const s=S();mock();const r=await s.lookup(['social','zzz'],['psychosis']);
  ok(r.ok&&r.records.length===3&&r.sources.length===3,'논문 3건',r);
  ok(calls.length===4&&calls.filter(c=>c.host==='www.ebi.ac.uk').length===2&&calls.filter(c=>c.host==='api.crossref.org').length===2,'검색어 2개 × 두 곳',calls.map(c=>c.host));
  const qs=calls.map(c=>{const u=new URL(c.url);return u.searchParams.get('query')||u.searchParams.get('query.bibliographic')});
  ok(qs.every(q=>/^(\()?(social skills training schizophrenia|schizophrenia psychosocial rehabilitation)(\) AND FIRST_PDATE:\[\d{4}-01-01 TO \d{4}-12-31\])?$/.test(q)),'검색어는 목록의 영어 낱말뿐',qs);
  ok(!calls.some(c=>/[가-힣]|@|zzz/.test(decodeURIComponent(c.url)+JSON.stringify(c.opts.headers||{}))),'주소·머리글에 한글·이메일·모르는 값 없음',calls.map(c=>c.url));
  ok(calls.every(c=>c.opts.method==='GET'&&c.opts.redirect==='error'&&c.opts.signal&&!c.opts.body),'GET만, 다른 곳으로 넘겨지지 않게, 시간 제한');
  const cr=new URL(calls.find(c=>c.host==='api.crossref.org').url);ok(/type:journal-article/.test(cr.searchParams.get('filter'))&&/has-abstract:true/.test(cr.searchParams.get('filter')),'Crossref는 초록 있는 학술지 논문만',cr.searchParams.get('filter'));
  ok(r.sources.every(x=>/^https:\/\//.test(x.uri)&&/— (Europe PMC|Crossref)$/.test(x.title)),'출처 제목에 어디서 찾았는지',r.sources.map(x=>x.title));
 }
 console.log('[4] lookup: 한 곳이 안 되거나 이상한 응답이어도 견딤');
 {const s=S();
  mock({epmc:()=>json('<html>maintenance</html>',200,'text/html')});let r=await s.lookup(['social'],[]);ok(r.ok&&r.records.every(x=>x.provider==='Crossref'),'Europe PMC가 HTML을 주면 Crossref 결과만',r.records&&r.records.map(x=>x.provider));
  mock({epmc:()=>json({},500),crossref:()=>json({},503)});r=await s.lookup(['social'],[]);ok(!r.ok&&r.reason==='unavailable','둘 다 안 되면 실패로',r);
  mock({epmc:()=>json('x'.repeat(400001)),crossref:()=>{throw Error('network down')}});r=await s.lookup(['social'],[]);ok(!r.ok,'너무 큰 응답·연결 실패는 버림');
  mock({epmc:(u,o)=>new Promise((_,rej)=>o.signal.addEventListener('abort',()=>rej(Object.assign(Error('aborted'),{name:'AbortError'})))),crossref:()=>json(CROSSREF())});
  const t0=Date.now();r=await s.lookup(['social'],[],{timeoutMs:80});ok(r.ok&&Date.now()-t0<1000&&r.records.every(x=>x.provider==='Crossref'),'응답이 없는 곳은 시간 제한으로 끊고 나머지로',Date.now()-t0);
  r=await s.lookup([],[]);ok(!r.ok&&r.reason==='empty','검색어가 없으면 요청하지 않음');
 }
 console.log('[5] research API: 무료 등급(구글 검색 막힘) → 공개 논문 검색 결과');
 {const h=fresh();mock();const r=await call(h,{topics:['social'],categories:['psychosis']});
  ok(r.statusCode===200&&r.json.searched===true&&r.json.provider==='scholarly','공개 논문 검색으로 대신 찾음',r.json);
  ok(r.json.fallback?.why==='tier'&&/무료 등급/.test(r.json.fallback.message),'구글 검색이 안 된 이유도 함께',r.json.fallback);
  ok(/^1\. Social skills training/.test(r.json.text)&&r.json.sources.length===3&&r.json.suggestions==='','글·출처(검색 추천 없음)',r.json.sources);
  ok(calls.filter(c=>c.host==='generativelanguage.googleapis.com').length===3,'구글 검색은 모델 3개를 먼저 시도',calls.map(c=>c.host));
  ok(!/x-goog-api-key|test-key/.test(r.body)&&!calls.filter(c=>c.host!=='generativelanguage.googleapis.com').some(c=>JSON.stringify(c.opts.headers||{}).includes('test-key')),'API 키는 구글에만, 응답·논문 검색에는 없음');
  calls=[];const r2=await call(h,{topics:['social'],categories:['psychosis']});ok(r2.json.searched&&r2.json.cached===true&&calls.length===0,'같은 주제는 한 시간 동안 기억한 결과',calls.length);
  calls=[];const r3=await call(h,{topics:['work']});ok(r3.json.provider==='scholarly'&&calls.every(c=>c.host!=='generativelanguage.googleapis.com'),'구글 검색이 막힌 모델은 잠시 건너뛰고 바로 논문 검색',calls.map(c=>c.host));
  mock({gemini:grounded});const r4=await call(h,{topics:['social'],categories:['psychosis'],force:true});ok(r4.json.searched&&!r4.json.provider&&r4.json.model==='gemini-3.5-flash-lite','‘다시 검색’ 때 구글 검색이 되면 구글 결과',r4.json);
 }
 console.log('[6] 둘 다 안 되면 이유를 알려 줌');
 {const h=fresh();mock({epmc:()=>json({},503),crossref:()=>json({},503)});const r=await call(h,{topics:['meds']});
  ok(r.json.searched===false&&r.json.why==='tier'&&/결제 정보를 등록해 유료 등급/.test(r.json.message)&&/공개 논문 검색도 지금은 되지 않았습니다/.test(r.json.message),'구글·논문 검색 모두 안 됨',r.json.message);
 }
 console.log('[7] 구글 검색이 되면 논문 검색은 하지 않음');
 {const h=fresh();mock({gemini:grounded});const r=await call(h,{topics:['social']});
  ok(r.json.searched===true&&!r.json.provider&&calls.every(c=>c.host==='generativelanguage.googleapis.com'),'구글 검색 결과만',calls.map(c=>c.host));
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
