'use strict';
// 자동 검사 모두 실행 — 가상 자료·가상 서버 응답만 쓰고, 실제 Gemini·인터넷에는 접속하지 않는다.
// 사용법: npm test            (전부)
//         node tests/run-all.js t66 t64b   (이름에 들어간 글자로 골라서)
// 하나라도 실패하면 종료 코드 1로 끝난다(GitHub 자동 검사가 빨간색으로 표시됨).
const {spawnSync}=require('child_process');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const natural=(a,b)=>a.localeCompare(b,'en',{numeric:true});
const want=process.argv.slice(2);
const files=fs.readdirSync(__dirname).filter(f=>/^(?:smoke\d+|t\d+[a-z]*)\.js$/.test(f)).sort(natural).filter(f=>!want.length||want.some(w=>f.includes(w)));
if(!files.length){console.error('실행할 시험 파일이 없습니다.');process.exit(1)}
// 날짜 계산이 컴퓨터 시간대에 따라 달라지지 않게 한국 시간으로 맞춘다.
const env={...process.env,TZ:'Asia/Seoul',FORCE_COLOR:'0'};
function runOnce(f){const t0=Date.now();
 const r=spawnSync(process.execPath,[path.join(__dirname,f)],{cwd:ROOT,env,encoding:'utf8',timeout:10*60*1000,maxBuffer:64*1024*1024});
 const out=String(r.stdout||'')+String(r.stderr||'');const m=[...out.matchAll(/결과: 통과 (\d+) \/ 실패 (\d+)/g)].pop();
 const pass=m?Number(m[1]):0,fail=m?Number(m[2]):0;
 return{ok:r.status===0&&!!m&&fail===0&&pass>0,pass,fail,out,code:r.status,signal:r.signal,sec:(Date.now()-t0)/1000}}
const rows=[];let bad=0;
for(const f of files){let r=runOnce(f),retried=false;
 // 컴퓨터가 느려 기다리는 시간이 모자라 생기는 우연한 실패를 걸러 내려고 한 번만 다시 해 본다.
 if(!r.ok){retried=true;const again=runOnce(f);if(again.ok)again.flaky=true;r={...again,first:r}}
 const name=f.replace(/\.js$/,'');
 const note=r.ok?(r.flaky?' (처음에는 실패, 다시 해서 통과)':''):(r.signal?` (시간 초과로 멈춤: ${r.signal})`:r.code!==0&&!r.fail?` (종료 코드 ${r.code})`:'');
 console.log(`${r.ok?'통과':'실패'}  ${name.padEnd(8)} 통과 ${String(r.pass).padStart(3)} / 실패 ${r.fail}  ${r.sec.toFixed(1)}초${note}`);
 if(!r.ok){bad++;const lines=r.out.split('\n');const shown=lines.filter(l=>/✗|Error|error|오류/.test(l)).slice(0,12);
  for(const l of (shown.length?shown:lines.slice(-15)))console.log('      '+l.slice(0,400));
  if(process.env.GITHUB_ACTIONS)console.log(`::error title=${name} 시험 실패::${(shown[0]||lines.filter(Boolean).pop()||'').replace(/[\r\n%]/g,' ').slice(0,300)}`)}
 rows.push({name,ok:r.ok,pass:r.pass,fail:r.fail,sec:r.sec,flaky:!!r.flaky,retried})}
const total=rows.reduce((a,r)=>a+r.pass,0),fails=rows.reduce((a,r)=>a+r.fail,0);
console.log(`\n전체: 시험 파일 ${rows.length}개 · 확인 ${total}건 통과 · 실패한 파일 ${bad}개`);
if(process.env.GITHUB_STEP_SUMMARY){try{fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 `## 자동 검사 결과: ${bad?'❌ 실패한 파일 '+bad+'개':'✅ 모두 통과'}\n\n시험 파일 ${rows.length}개 · 확인 ${total}건 통과${fails?' · 실패 '+fails+'건':''}\n\n| 시험 | 결과 | 통과 | 실패 | 시간 |\n|---|---|---|---|---|\n`+
 rows.map(r=>`| ${r.name} | ${r.ok?(r.flaky?'통과(다시 해서)':'통과'):'실패'} | ${r.pass} | ${r.fail} | ${r.sec.toFixed(1)}초 |`).join('\n')+'\n')}catch{}}
process.exit(bad?1:0);
