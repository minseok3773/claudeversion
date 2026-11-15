'use strict';
// v3.27.0 기존 화면 'AI 자동작성' 안의 새 자동 작성 시험 — 가상 회원 자료만 씀. 실제 AI에는 보내지 않음(가짜 답).
const path=require('path');const {boot,ok,done,sleep}=require('./h.js');
const ROOT=path.resolve(__dirname,'..');
const notes=[['2026-05-07','복약 점검','김철수 회원과 복약 점검표를 함께 확인함.'],['2026-05-14','산책 프로그램','산책 프로그램 참여를 거부함.'],['2026-06-02','정서 상담','"죽고 싶다는 생각이 들어요"라고 말해 위기 상담을 실시함.'],['2026-07-15','복약 점검','복약 점검표를 함께 확인함.'],['2026-09-09','복약 점검','복약 점검표를 함께 확인함.']].map(([date,topic,content],i)=>({id:'n'+i,date,topic,content,checked:true}));
const stored={members:[{id:'m1',label:'회원 001',piiNames:'김철수',periodStart:'2026-05-01',periodEnd:'2026-10-31',notes,plan:{goals:[{id:'g0',long:'옛 장기목표',short:'옛 단기목표'}]}},{id:'m2',label:'회원 002',notes:[]}],memberId:'m1',save:true};
const answer=fields=>fields.map((f,i)=>`[${f.label}]\n${i===1?'근거 없는 문장임.':'복약 점검표를 함께 확인한다. (근거 1, 4)'}`).join('\n\n');
(async()=>{
 // 1. 화면
 const t=boot(ROOT,{stored,embed:true,ai:()=>answer([...t.w.LogSteps.planFields(),...t.w.LogSteps.evalFields()])});const d=t.w.document;
 await sleep(20);
 t.click('#nav [data-view="ai"]');
 ok(t.$('#lfEmbed'),'AI 자동작성 안에 새 자동 작성');
 ok(t.$$('#lfEmbed .lf-q').length===2,'처음엔 ① 회원·기간 ② 자동 작성');
 ok(/상담일지 5건/.test(t.$('#lfEmbed .lf-q1').textContent)&&/평가기간에서 바꿉니다/.test(t.$('#lfEmbed .lf-q1').textContent),'회원 평가기간의 일지 수와 기간 바꾸는 곳 안내');
 const cl=t.$('#aiClassic');ok(cl&&!cl.open&&cl.querySelector('[data-act="ai-run-auto"]'),'예전 방식은 접어서 그대로 남김');
 ok(t.$('#appVersion').textContent==='v3.27.0','버전 표시',t.$('#appVersion').textContent);
 // 2. Gemini 한 번
 t.click('#lfEmbed [data-sact="quick-auto"]');await sleep(80);
 ok(t.prompts.length===1&&!/김철수/.test(t.prompts[0].prompt),'Gemini에 가명 처리한 요청 한 번',t.prompts.length);
 ok(t.$('#lfEmbed .lf-q3'),'답이 오면 ③ 확인하고 넣기');
 const list=t.w.LogSteps.mustCheck();ok(list[0]?.kind==='risk'&&list.some(x=>x.kind==='none'),'위험 기록·근거 없는 문장 표시');
 ok(t.$('#lfEmbed button[data-act="navigate"][data-view="plan"]')&&!t.$('#lfEmbed a[href="forms.html"]'),'양식 보기 링크는 재활계획서 메뉴로');
 // 3. 넣기 → 같은 화면의 재활계획서에 바로 들어감, 다른 창 충돌 경고 없음
 t.click('#lfEmbed [data-sact="send"][data-to="local"]');await sleep(10);t.flush();
 const m=t.saved().members[0];
 ok(m.plan.goals.some(g=>/복약 점검표를 함께 확인한다/.test(g.short)),'계획서 목표가 회원 기록에 저장');
 ok(m.planArchive?.[0]?.plan?.goals?.[0]?.short==='옛 단기목표','넣기 전 계획서는 한 판 보관');
 ok(m.notes.length===5,'상담일지는 그대로');
 ok(!/다른 창이나 탭/.test(d.body.textContent),'저장 충돌 경고 없음');
 t.click('#nav [data-view="plan"]');ok(/복약 점검표를 함께 확인한다/.test(t.$('#content').innerHTML),'재활계획서 화면에서 바로 보임');
 // 4. 다른 회원으로 바꾸면 그 회원 기준
 t.click('#nav [data-view="ai"]');t.change('#memberPicker','m2');await sleep(10);
 ok(t.$('#lfEmbed [data-sact="quick-auto"]')?.disabled&&/상담일지가 없습니다/.test(t.$('#lfEmbed .lf-q1').textContent),'일지 없는 회원은 단추 꺼짐');
 // 5. 앱 단추와 겹치지 않음: 인쇄는 한 번만
 t.click('#nav [data-view="plan"]');const before=t.logs.filter(x=>x[0]==='print').length;const pb=t.$('[data-act="print"]');
 if(pb){t.click(pb);ok(t.logs.filter(x=>x[0]==='print').length===before+1,'인쇄 단추는 한 번만 동작')}else ok(true,'인쇄 단추 없음');
 // 6. 저장 꺼짐이면 정리표도 브라우저에 남기지 않음
 const t2=boot(ROOT,{stored,embed:true,storage:{rehab_logsheet_v1:'{"version":1,"members":{}}'}});await sleep(20);t2.change('#autosave',false);await sleep(10);
 ok(!t2.w.localStorage.getItem('rehab_logsheet_v1'),'저장을 끄면 정리표도 브라우저에서 지움');
 t2.click('#nav [data-view="ai"]');
 const r=t2.$('#lfEmbed [data-sact="engine"][value="claude"]');r.checked=true;r.dispatchEvent(new t2.w.Event('change',{bubbles:true}));t2.click('#lfEmbed [data-sact="quick-auto"]');
 ok(t2.$('#lfEmbed [data-answer="both"]'),'Claude 채팅 방식도 같은 화면에서');
 ok(!t2.w.localStorage.getItem('rehab_logsheet_v1'),'저장 꺼짐이면 정리표를 브라우저에 저장하지 않음');
 // 7. 새 스크립트가 없으면 예전 화면 그대로
 const t3=boot(ROOT,{stored});await sleep(20);t3.click('#nav [data-view="ai"]');ok(!t3.$('#lfEmbed')&&t3.$('[data-act="ai-run-auto"]'),'스크립트 없으면 예전 AI 자동작성 그대로');
 ok(!t.errors.length&&!t2.errors.length,'오류 없음',[...t.errors,...t2.errors]);
 done();
})().catch(e=>{console.log('  ✗ 시험 중 오류: '+e.stack);process.exitCode=1;done()});
