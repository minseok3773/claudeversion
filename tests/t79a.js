'use strict';
// v3.26.0 간단히 보기(한 화면 자동 작성) 시험 — 가상 회원 자료만 씀. 실제 AI에는 보내지 않음(가짜 답).
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;const ok=(c,msg)=>{if(c){pass++;console.log('✓ '+msg)}else{fail++;console.log('✗ '+msg)}};
const OLD_KEY='sehuim_rehab_offline_v1',SHEET_KEY='rehab_logsheet_v1';
const notes=[];const add=(d,t,c)=>notes.push({date:d,topic:t,content:c});
add('2026-05-07','복약 점검','김철수 회원과 복약 점검표를 함께 확인함.');
add('2026-05-14','산책 프로그램','산책 프로그램 참여를 거부함.');
add('2026-06-02','정서 상담','밤에 불안하다고 호소함. "죽고 싶다는 생각이 들어요"라고 말해 위기 상담을 실시함.');
add('2026-07-15','복약 점검','복약 점검표를 함께 확인함.');
add('2026-09-09','복약 점검','복약 점검표를 함께 확인함.');
const old={members:[{id:'m1',label:'회원 001',piiNames:'김철수',periodStart:'2026-05-01',periodEnd:'2026-10-31',notes,plan:{goals:[]},evaluation:{},finalizedDocs:{}}],memberId:'m1',save:true};
async function boot(seed,fetchFn){
 const html=fs.readFileSync(path.join(ROOT,'tests','fixtures','standalone.html'),'utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.confirm=()=>true;w.print=()=>{};w.scrollTo=()=>{};w.open=()=>null;
 if(fetchFn)w.fetch=fetchFn;
 for(const [k,v] of Object.entries(seed||{}))w.localStorage.setItem(k,v);
 if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 for(const f of ['pii-core.js','log-steps.js','log-first.js'])w.eval(fs.readFileSync(path.join(ROOT,f),'utf8'));
 return w;
}
const fire=(w,el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true}));
const tick=()=>new Promise(r=>setTimeout(r,30));
function fakeAnswer(S,noRefKey){
 return [...S.planFields(),...S.evalFields()].map(f=>`[${f.label}]\n${f.key===noRefKey?'근거 없이 지어낸 문장임.':'복약 점검표를 함께 확인함. (근거 1, 4)'}`).join('\n\n');
}
(async()=>{
 // 1. 첫 화면은 간단히 보기
 const w=await boot({[OLD_KEY]:JSON.stringify(old)});const d=w.document;const S=w.LogSteps;
 ok(d.body.classList.contains('lf-simple'),'처음 열면 간단히 보기');
 const qs=d.querySelectorAll('#lfViewX .lf-q');ok(qs.length===2,'처음엔 ① 회원·기간 ② 자동 작성 두 칸만');
 ok(/상담일지 5건/.test(qs[0].textContent),'① 칸에 일지 건수');
 ok(d.querySelectorAll('[data-sact="quick-auto"]').length===1,'단추는 자동 작성 하나');
 ok(d.querySelector('.lf-steps').classList.contains('lf-adv')&&d.querySelector('[data-act="sheet-export"]').classList.contains('lf-adv'),'단계 단추·정리표 단추는 간단히 보기에서 숨김');
 ok(d.querySelector('#lfGuide').hidden,'긴 안내 글 숨김');
 ok(d.querySelector('[data-sact="engine"][value="gemini"]').checked,'기본은 무료 Gemini');
 // 2. Claude 채팅으로 자동 작성
 const r=d.querySelector('[data-sact="engine"][value="claude"]');r.checked=true;fire(w,r,'change');
 d.querySelector('[data-sact="quick-auto"]').click();
 const sh=JSON.parse(w.localStorage.getItem(SHEET_KEY));const ms=sh.members.m1;
 ok(Object.values(ms.notes).length===5&&Object.values(ms.notes).every(n=>n.confirmed),'일지 구분을 모두 자동 확정');
 ok(S.goals().length>=1&&S.goals()[0].area==='med','실적 많은 영역(복약)을 목표로 자동 선택');
 ok(S.goals().every(g=>S.shortHasMeasure(g)||g.n>0),'자동 목표에 횟수 기준');
 const p=S.masked('both');ok(!/김철수/.test(p.prompt)&&/\[장기목표|\[/.test(p.prompt),'요청문에 실명 없음(가명 처리)');
 ok(d.querySelector('[data-answer="both"]'),'답 붙여 넣는 칸');
 const noRefKey=S.planFields()[0].key;
 d.querySelector('[data-answer="both"]').value=fakeAnswer(S,noRefKey);d.querySelector('[data-sact="answer-in"][data-kind="both"]').click();
 const q3=d.querySelector('.lf-q3');ok(q3,'답을 넣으면 ③ 확인하고 양식에 넣기');
 const list=S.mustCheck();
 ok(list[0].kind==='risk'&&/2026-06-02/.test(list[0].text),'위험 기록을 맨 위에');
 const none=list.find(x=>x.kind==='none');ok(none&&none.key===noRefKey,'근거 없는 문장을 꼭 확인할 곳에');
 ok(!list.some(x=>x.kind==='none'&&x.key!==noRefKey),'근거 있는 문장은 확인 목록에 없음');
 ok(/꼭 확인할 곳 \d+개/.test(q3.textContent),'확인할 곳 개수 표시');
 // 맞음
 d.querySelector(`[data-sact="q-ok"][data-key="${noRefKey}"]`).click();
 ok(!S.mustCheck().some(x=>x.kind==='none'),'‘맞음’ 누르면 목록에서 빠짐');
 // 지우기
 S.setVal(noRefKey,'복약 점검표를 함께 확인함. 근거 없는 둘째 문장임.'); w.LogFirst.render();
 const del=[...d.querySelectorAll('[data-sact="q-del"]')].find(b=>b.dataset.key===noRefKey&&/둘째/.test(b.closest('li').textContent));ok(del,'근거 없는 문장에 지우기 단추');
 if(del)del.click();ok(S.getVal(noRefKey)==='복약 점검표를 함께 확인함.','‘지우기’는 그 문장만 지움');
 ok(d.querySelector('.lf-qgoals')&&/달성|기록 확인 필요/.test(d.querySelector('.lf-qgoals').textContent),'목표별 판정 표');
 ok(d.querySelector('.lf-preview'),'글 전체 보기는 접혀 있음');
 // 양식에 넣기
 d.querySelector('[data-sact="send"][data-to="local"]').click();
 const o=JSON.parse(w.localStorage.getItem(OLD_KEY));const m=o.members[0];
 ok(m.plan&&m.plan.goals&&m.plan.goals.length===S.goals().length,'양식에 넣으면 재활계획서 목표가 들어감');
 ok(m.notes.length===5,'상담일지는 그대로');
 // 자세히 고치기
 d.querySelector('.lf-detail-link [data-step="3"]').click();
 ok(!d.body.classList.contains('lf-simple')&&!d.querySelector('#lfView3').hidden,'자세히 고치기 → 일지 정리표');
 d.querySelector('.lf-back[data-step="1"]').click();ok(d.body.classList.contains('lf-simple'),'← 간단히 보기로 돌아옴');

 // 3. Gemini는 버튼 한 번에 보내고 답을 넣음
 let sent=null;const fakeFetch=async(url,opt)=>{sent={url,body:JSON.parse(opt.body)};return{ok:true,json:async()=>({text:fakeAnswer(w2.LogSteps,null)})}};
 const w2=await boot({[OLD_KEY]:JSON.stringify(old)},fakeFetch);
 w2.document.querySelector('[data-sact="quick-auto"]').click();await tick();await tick();
 ok(sent&&sent.url==='/api/generate'&&!/김철수/.test(sent.body.prompt),'Gemini에 가명 처리한 요청 한 번');
 ok(w2.document.querySelector('.lf-q3'),'Gemini 답이 오면 바로 ③ 확인 칸');
 // 4. 일지 없음
 const empty={members:[{id:'z',label:'회원 009',periodStart:'2026-01-01',periodEnd:'2026-06-30',notes:[]}],memberId:'z'};
 const w3=await boot({[OLD_KEY]:JSON.stringify(empty)});
 ok(w3.document.querySelector('[data-sact="quick-auto"]').disabled&&/상담일지가 없습니다/.test(w3.document.querySelector('.lf-q1').textContent),'일지 없으면 단추 꺼지고 안내');
 console.log(`결과: 통과 ${pass} / 실패 ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.log('✗ 시험 중 오류: '+e.stack);console.log(`결과: 통과 ${pass} / 실패 ${fail+1}`);process.exit(1)});
