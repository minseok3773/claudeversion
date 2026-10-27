// v3.21.62 — 서버 공식 페이지 확인: 국내 공공 사이트도 허용 목록으로 확인(가상 응답)
const {ok,done}=require('./h.js');const path=require('path');const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
process.env.GEMINI_API_KEY='test-key-'+'x'.repeat(30);process.env.APP_ACCESS_CODE='access-code-123456';process.env.APP_SESSION_SECRET='s'.repeat(40);
const shared=require(path.join(DIR,'api/_shared.cjs'));const cookie=shared.sessionCookie({headers:{},socket:{}}).split(';')[0];
const h=require(path.join(DIR,'api/clinical-guidance.js'));const K=require(path.join(DIR,'pro-knowledge.js'));
const seen=[];global.fetch=async(url)=>{seen.push(String(url));const u=new URL(String(url));return{ok:true,status:200,url:String(url),headers:{get:k=>k.toLowerCase()==='content-type'?'text/html; charset=utf-8':null},text:async()=>`<html><head><meta name="description" content="${u.hostname} 공식 안내 페이지 설명입니다. 충분히 긴 설명 문장."></head></html>`}};
(async()=>{const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},end(s){this.json=JSON.parse(s)}};
 await h({method:'POST',headers:{origin:'https://x.vercel.app',host:'x.vercel.app','x-requested-with':'rehab-app','sec-fetch-site':'same-origin',cookie},body:{categories:[],topics:['meds','sleep','risk','work']},socket:{remoteAddress:'1.1.1.1'}},res);
 const ts=res.json.topicSources||[];const kr=ts.filter(x=>/\.(go|or)\.kr$|korea\.kr$/.test(new URL(x.url).hostname));
 ok(res.json&&ts.length>0&&ts.length<=8,'확인한 출처 수(최대 8곳)',ts.length);
 ok(kr.length>0&&kr.every(x=>x.checkedOnline===true),'국내 공공 사이트도 공식 페이지로 확인',kr.map(x=>x.key+':'+x.checkedOnline));
 ok(seen.every(u=>K.HOST_RE.test(new URL(u).hostname)),'허용 목록 주소만 열어 봄',seen);
 done()})().catch(e=>{console.error(e);process.exitCode=1});
