'use strict';
// v3.25.0 일지 중심 작성 ④~⑦(log-steps.js) 시험 — 가상 회원 자료만 씀. 실제 AI에는 보내지 않음(가짜 답).
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;const ok=(c,msg)=>{if(c){pass++;console.log('✓ '+msg)}else{fail++;console.log('✗ '+msg)}};
const OLD_KEY='sehuim_rehab_offline_v1';
const notes=[];const add=(d,t,c)=>notes.push({date:d,topic:t,content:c});
add('2026-05-07','복약 점검','복약 점검표를 함께 확인함. "약 먹으면 졸려요"라고 말함.');
add('2026-05-14','산책 프로그램','산책 프로그램 참여를 거부함.');
add('2026-05-28','복약 점검','김철수 회원과 복약 점검표를 확인함. 어머니 박순자 씨와 통화함.');
add('2026-06-02','정서 상담','밤에 불안하다고 호소함. "죽고 싶다는 생각이 들어요"라고 말해 위기 상담을 실시함.');
add('2026-06-20','복약 교육','약 이름과 복용 시간을 교육함.');
add('2026-07-15','복약 점검','복약 점검표를 함께 확인함.');
add('2026-09-09','복약 점검','복약 점검표를 함께 확인함.');
const old={members:[{id:'m1',label:'회원 001',piiNames:'김철수, 박순자',periodStart:'2026-05-01',periodEnd:'2026-10-31',notes,plan:{goals:[{id:'old1',long:'옛 장기목표',short:'옛 단기목표'}],services:[{type:'x',service:'y',resource:'z'}]},evaluation:{},finalizedDocs:{}}],memberId:'m1',save:true,piiGlobal:'새희망둥지'};

async function boot(seed){
 const html=fs.readFileSync(path.join(ROOT,'logs.html'),'utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'https://example.test/logs.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.confirm=()=>true;w.print=()=>{};w.scrollTo=()=>{};
 for(const [k,v] of Object.entries(seed||{}))w.localStorage.setItem(k,v);
 if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 for(const f of ['pii-core.js','log-steps.js','log-first.js'])w.eval(fs.readFileSync(path.join(ROOT,f),'utf8'));
 return w;
}
const fire=(w,el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true}));
(async()=>{
 const w=await boot({[OLD_KEY]:JSON.stringify(old)});const d=w.document;const S=w.LogSteps,L=w.LogFirst;
 // 정리표 모두 확정 후 ④로
 d.querySelector('[data-act="confirm-all"]').click();
 d.querySelector('[data-step="4"]').click();
 ok(!d.querySelector('#lfViewX').hidden&&d.querySelector('#lfView3').hidden,'④ 화면으로 바뀜');
 ok(/목표 고르기/.test(d.querySelector('#lfViewX').textContent),'④ 제목');
 const pick=a=>{const c=d.querySelector(`[data-sact="pick"][data-area="${a}"]`);c.checked=true;fire(w,c,'change')};
 pick('med');pick('mental');
 ok(S.goals().length===2&&S.goals()[0].area==='med','목표 2개 고름(복약·정서)');
 ok(/기초선/.test(d.querySelector('#lfViewX').textContent),'기초선 안내 표시');
 ok(/위험 확인 기록이 있는 영역/.test(d.querySelector('#lfViewX').textContent),'위험 영역 경고');
 const setN=(i,v)=>{const el=d.querySelector(`[data-gi="${i}"] [data-gf="n"]`);el.value=v;fire(w,el,'change')};
 setN(0,'2');
 ok(S.targetOf(S.goals()[0])===S.goals()[0].behavior+' 월 2회','성과목표는 측정 기준을 그대로(월 2회)');
 ok(d.querySelector('[data-gi="0"] .lf-target').textContent.includes('월 2회'),'성과목표 자동 표시');
 // 최대 3개
 ['family','leisure','hygiene'].forEach(a=>{const c=d.querySelector(`[data-sact="pick"][data-area="${a}"]`);if(c&&!c.disabled){c.checked=true;fire(w,c,'change')}});
 ok(S.goals().length<=3,'목표는 최대 3개');
 while(S.goals().length>2){S.goals().pop()}L.saveSheet();L.render();

 // 평가 계산
 const g0=S.goals()[0];const c0=S.evaluate(g0);
 ok(c0.perf===5,'복약 실시 5회(점검 4 + 교육 1)');
 ok(c0.expected===12,'6개월 × 월 2회 = 12회');
 ok(c0.verdict==='miss'&&c0.pct===42,'5/12=42% → 미달성');
 g0.n=1;ok(S.evaluate(g0).verdict==='miss'||S.evaluate(g0).verdict==='partial','기준 바꾸면 다시 계산');
 g0.n=1;const c1=S.evaluate(g0);ok(c1.expected===6&&c1.verdict==='partial','월 1회 → 6회 중 5회 = 부분 달성(50% 이상)');
 g0.n=0;ok(S.evaluate(g0).verdict==='check','횟수 기준 없으면 기록 확인 필요');
 g0.n=2;
 const gx=S.normGoal({area:'work',n:1});ok(S.evaluate(gx).verdict==='check','관련 기록 0건 → 기록 확인 필요');
 ok(S.resultText(gx).includes('기록 확인 필요'),'결과 문장도 기록 확인 필요');
 // 판정 바꾸기는 이유가 있어야
 const ev=d.querySelector('[data-step="6"]');ev.click();
 const ov=d.querySelector('[data-gi="0"] [data-ev="override"]');ov.value='done';fire(w,ov,'change');
 ok(S.finalVerdict(S.goals()[0])==='miss','이유 없이 바꾼 판정은 쓰지 않음');
 const rs=d.querySelector('[data-gi="0"] [data-ev="reason"]');rs.value='외부 기관 기록으로 확인';fire(w,rs,'change');
 ok(S.finalVerdict(S.goals()[0])==='done','이유를 적으면 바꾼 판정을 씀');
 const ov2=d.querySelector('[data-gi="0"] [data-ev="override"]');ov2.value='';fire(w,ov2,'change');

 // ⑤ 요청문
 d.querySelector('[data-step="5"]').click();
 const mp=S.masked('plan');
 ok(!/김철수|박순자|새희망둥지/.test(mp.prompt),'요청문에 등록 이름·시설 이름 없음(가명 처리)');
 ok(/가명A|가명B/.test(mp.prompt),'가명으로 바뀜');
 ok(!/죽고 싶다/.test(mp.prompt),'위험 기록의 회원 말은 요청문에 넣지 않음');
 ok(!/점검표를 함께 확인함\. "약 먹으면/.test(mp.prompt)&&!/\[상담내용\]/.test(mp.prompt),'일지 원문은 보내지 않음(정리표 줄만)');
 ok(mp.system.length<4000&&/근거 줄 번호/.test(mp.system),'시스템 지시는 짧고 근거 번호 규칙 포함');
 ok(/\[목표 1 단기목표\]/.test(mp.prompt)&&/월 2회/.test(mp.prompt),'단기목표 칸에 측정 기준 전달');
 ok(!/\[가족 욕구\]/.test(mp.prompt)||/가족관계/.test(mp.prompt),'가족 기록이 있을 때만 가족 욕구 칸');
 // 가짜 답
 const f=S.facts();const medNo=f.find(x=>x.area==='med').no;
 const ans=`[회원 욕구]\n복약 후 졸림을 줄이고 싶어 함. (근거 ${medNo})\n가명A는 운동을 좋아함.\n[목표 1 장기목표]\n스스로 약을 복용한다. (근거 ${medNo})\n[목표 1 단기목표]\n복약 점검에 꾸준히 참여한다. (근거 ${medNo})\n[강점]\n복약 관리에 협조적임 (근거 ${medNo})\n협조적임 (근거 999)`;
 const r=S.applyAnswer('plan',ans);
 ok(r.filled===4,'답에서 4칸 채움');
 ok(S.getVal('memberNeed')==='복약 후 졸림을 줄이고 싶어 함. 김철수는 운동을 좋아함.','AI 글은 근거 표시만 떼고 그대로, 가명은 원래 이름으로');
 const info=S.sentenceInfo('memberNeed');
 ok(info[0].dates.includes('2026-05-07')&&!info[0].none,'근거 번호 → 일지 날짜');
 ok(info[1].none,'근거 없는 문장은 근거 없음 표시');
 ok(S.sentenceInfo('strength')[1].none,'없는 줄 번호는 근거 없음');
 ok(!S.shortHasMeasure(S.goals()[0]),'단기목표에 기준 숫자 없음 감지');
 L.render();ok(/측정 기준 숫자/.test(d.querySelector('#lfViewX').textContent),'단기목표 숫자 없음 화면 표시');
 // 직접 확인함
 const okBtn=[...d.querySelectorAll('[data-sact="self-ok"]')].find(b=>b.dataset.key==='memberNeed');okBtn.click();
 ok(!S.sentenceInfo('memberNeed')[1].none&&S.sentenceInfo('memberNeed')[1].self,'직접 확인함 누르면 근거 없음 풀림');
 // 담당자가 고친 문장은 다시 근거 확인
 const ta=d.querySelector('textarea[data-pf="g0.short"]');ta.value='복약 점검에 월 2회 참여한다.';fire(w,ta,'input');fire(w,ta,'change');
 ok(S.shortHasMeasure(S.goals()[0]),'고친 단기목표는 기준 숫자 통과');
 ok(S.sentenceInfo('g0.short')[0].none,'새로 쓴 문장은 근거 없음으로 다시 확인');

 // ⑥ 평가서 답: 숫자 대조
 d.querySelector('[data-step="6"]').click();
 const ans2=`[목표 1 달성도 분석]\n목표 12회 중 5회 참여함. (근거 ${medNo})\n월 4회 참여하여 달성함. (근거 ${medNo})\n[목표 1 달성 요인(직원)]\n해당사항 없음\n[종합 평가]\n복약 지원이 이어짐. (근거 ${medNo})`;
 S.applyAnswer('eval',ans2);
 const ei=S.sentenceInfo('e0.analysis');
 ok(!ei[0].nums.length,'프로그램 숫자와 같은 숫자는 통과');
 ok(ei[1].nums.includes(4),'프로그램이 센 적 없는 숫자는 숫자 다름 표시');
 ok(!S.sentenceInfo('e0.achStaff')[0].none,'해당사항 없음은 근거 없이도 통과');
 ok(S.resultText(S.goals()[0])==='목표 12회 중 5회 실시·참여함(42%). 미달성함.','결과 문장은 프로그램이 씀');

 // ⑦ 최종 검토와 양식 넣기
 d.querySelector('[data-step="7"]').click();
 const txt=d.querySelector('#lfViewX').textContent;
 ok(/근거 없음 문장/.test(txt)&&/숫자 다름 문장/.test(txt),'최종 검토에 근거 없음·숫자 다름');
 ok(/위험 확인 줄/.test(txt),'최종 검토에 위험 확인');
 ok(txt.includes(L.today()),'작성일은 오늘 날짜');
 d.querySelector('[data-sact="send"][data-which="both"]').click();
 const mo=JSON.parse(w.localStorage.getItem(OLD_KEY)).members[0];
 ok(mo.plan.memberNeed.startsWith('복약 후 졸림'),'계획서 양식 칸에 들어감');
 ok(mo.plan.goals.length===2&&mo.plan.goals[0].target===S.targetOf(S.goals()[0]),'목표·성과목표가 계획서 칸에');
 ok(mo.plan.services[0].service==='y','계획서의 다른 칸(서비스)은 그대로');
 ok(mo.planArchive?.[0]?.plan?.goals?.[0]?.long==='옛 장기목표','넣기 전 계획서 한 판 보관');
 ok(mo.evaluation.goals[0].goalId===mo.plan.goals[0].id,'평가서 목표가 계획서 목표와 연결');
 ok(mo.evaluation.goals[0].result.includes('미달성함'),'평가서 결과 칸에 프로그램 판정');
 ok(mo.evaluation.goals[0].indicator===mo.plan.goals[0].target,'평가서 지표 = 계획서 성과목표');
 ok(mo.evaluation.keepGoals===true,'이전 화면이 평가서 목표를 덮어쓰지 않게 표시');
 ok(mo.plan.needSrc.member==='manual','이전 화면이 회원 욕구를 자동으로 바꾸지 않게 표시');
 ok(mo.notes.length===notes.length,'상담일지는 그대로');
 // 확정된 문서는 넣지 않음
 const fin=JSON.parse(JSON.stringify(old));fin.members[0].finalizedDocs={plan:{at:'2026-11-01'}};
 const mo2=JSON.parse(JSON.stringify(fin.members[0]));const done=S.applyToMember(mo2,'both');
 ok(!done.includes('계획서')&&done.includes('평가서')&&mo2.plan.goals[0].long==='옛 장기목표','확정된 계획서는 넣지 않음');
 // 기존 계획서 목표 가져오기
 {const w2=await boot({[OLD_KEY]:JSON.stringify(old)});w2.document.querySelector('[data-step="4"]').click();
 w2.document.querySelector('[data-sact="import-old"]').click();const S2=w2.LogSteps;
 ok(S2.goals().length===1&&S2.goals()[0].src==='old'&&S2.goals()[0].long==='옛 장기목표','평가 먼저: 기존 계획서 목표 가져오기');}
 // 근거 날짜를 누르면 그 날 일지
 L.goStep(5);const chip=d.querySelector('[data-sact="show-note"]');ok(!!chip,'근거 날짜는 누를 수 있음');
 chip.click();const dlg=d.getElementById('lfNoteDlg');ok(dlg&&/복약 점검표를 함께 확인함/.test(dlg.textContent),'근거 날짜를 누르면 그 날 일지가 열림');
 // 일지끼리 맞지 않아 보이는 곳
 {const n2=JSON.parse(JSON.stringify(old));n2.members[0].notes=[{date:'2026-05-03',topic:'복약',content:'복약을 거부함.'},{date:'2026-05-06',topic:'복약',content:'복약을 스스로 잘 함. 점검표를 함께 확인함.'},{date:'2026-07-01',topic:'복약',content:'복약을 거부함.'}];
  const w3=await boot({[OLD_KEY]:JSON.stringify(n2)});w3.LogFirst.goStep(7);const cf=w3.LogSteps.conflicts();
  ok(cf.length===1&&cf[0].dates.join()==='2026-05-03,2026-05-06','7일 안의 거부↔잘 함을 맞지 않는 곳으로 보여 줌');
  ok(/일지끼리 맞지 않아 보임/.test(w3.document.querySelector('#lfViewX').textContent),'최종 검토에 표시')}
 // 번호 묶기
 ok(S.compactNos([1,2,3,5,7,8])==='1-3, 5, 7-8'&&S.parseNos('#1, 3-5').join()==='1,3,4,5','줄 번호 묶기·풀기');
 console.log(`결과: 통과 ${pass} / 실패 ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.log('✗ 시험 중 오류: '+(e.stack||e));console.log(`결과: 통과 ${pass} / 실패 ${fail+1}`);process.exit(1)});
