// v3.21.58 — 모든 화면이 오류 없이 그려지는지 · 버전 표시가 모두 같은지(v3.21.66)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const VER=JSON.parse(require('fs').readFileSync(require('path').join(DIR,'package.json'),'utf8')).version;
(async()=>{
 for(const [name,st] of [['빈 시작',undefined],['자료 있음',stored57({withArchive:true,withLegacy:true})]]){
  console.log('['+name+']');const t=boot(DIR,{stored:st,ai:makeAI()});
  for(const v of ['notes','doctor','legacy','analysis','ai','plan','evaluation','learning','references','backup']){t.ev(`state.view='${v}';paint()`);const bad=t.$('#content')?.textContent.includes('화면 표시 중 오류');ok(!bad,v+' 화면',bad?t.$('#content').textContent.slice(0,300):'')}
  ok(!t.errors.length,'스크립트 오류 없음',t.errors);
  ok(t.$('#appVersion')?.textContent==='v'+VER,'머리글 버전 표시',[t.$('#appVersion')?.textContent,VER]);
 }
 console.log('[버전 표시가 모두 같은지]');
 {const fs=require('fs'),path=require('path'),read=f=>fs.readFileSync(path.join(DIR,f),'utf8');const html=read('index.html'),lock=JSON.parse(read('package-lock.json'));
  ok(html.includes('<title>재활계획서&재활평가서 — v'+VER+'</title>'),'index.html 제목',html.match(/<title>[^<]*<\/title>/)?.[0]);
  const vs=[...html.matchAll(/<script src="[^"?]+\?v=([^"]+)"/g)].map(m=>m[1]);ok(vs.length>=4&&vs.every(v=>v===VER),'스크립트 주소의 ?v= (새 버전을 바로 받게)',vs);
  ok(new RegExp("const APP_RELEASE='"+VER.replace(/\./g,'\\.')+"-").test(read('app.js')),'app.js APP_RELEASE');
  ok(lock.version===VER&&lock.packages?.['']?.version===VER,'package-lock.json',[lock.version,lock.packages?.['']?.version])}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
