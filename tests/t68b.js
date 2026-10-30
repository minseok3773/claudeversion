// v3.21.68 — 화면: 재활계획서·재활평가서·주치의편지의 ‘문서 점검’ 칸 (가상 자료만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const summary=(t,k)=>(t.$('#docCheck-'+k)?.querySelector('summary')?.textContent||'').replace(/\s+/g,' ').trim();
(async()=>{
 console.log('[1] 계획서 화면: 접힌 ‘문서 점검’ 칸, 표시할 곳이 없을 때');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';paint()");const box=t.$('#docCheck-plan');
  ok(box&&box.tagName==='DETAILS'&&!box.open&&box.classList.contains('noprint'),'접혀 있고 인쇄되지 않는 칸',box&&box.outerHTML.slice(0,160));
  ok(summary(t,'plan')==='문서 점검 표시할 곳 없음','요약 줄',summary(t,'plan'));
  ok(/AI를 쓰지 않고 정해진 규칙으로/.test(box.textContent)&&/문서를 바꾸지 않으며/.test(box.textContent),'무엇을 하는 칸인지 안내');
  ok(!t.logs.some(l=>l[0]==='alert'||l[0]==='confirm'),'팝업 없음');
  for(const v of ['notes','ai','legacy','references','backup']){t.ev(`state.view='${v}';paint()`);ok(!t.$('[id^="docCheck-"]'),v+' 화면에는 없음')}
 }
 console.log('[2] 확인해 볼 곳이 있으면 개수와 목록, ‘해당 칸으로’');
 {const t=boot(DIR,{stored:stored57()});t.ev("member().plan.goals[0].target='스스로 꾸준히 참여함.';member().plan.goals[1].activity='';state.view='plan';paint()");
  ok(summary(t,'plan')==='문서 점검 확인해 볼 곳 2곳','개수',summary(t,'plan'));
  const items=t.$$('#docCheck-plan .doc-check-list li').map(li=>li.textContent);
  ok(items.length===2&&items.some(x=>/목표 1 · 성과목표 — 확인할 수 있는 기준/.test(x))&&items.some(x=>/목표 2 · 세부 활동 내용 — 비어 있습니다/.test(x)),'목록',items);
  t.$('#docCheck-plan').open=true;t.$('#docCheck-plan').dispatchEvent(new t.w.Event('toggle'));
  const go=t.$$('#docCheck-plan [data-act="doc-check-go"]').find(b=>b.dataset.path==='plan.goals.0.target');t.click(go);
  const el=t.w.document.activeElement;ok(el&&el.dataset.bind==='plan.goals.0.target'&&el.classList.contains('doc-check-flash'),'누르면 그 칸으로 이동해 잠시 표시',el&&el.outerHTML.slice(0,120));
  await sleep(10);t.ev("paint()");ok(t.$('#docCheck-plan').open,'열어 둔 칸은 화면을 다시 그려도 열린 채');
  const ta=t.$('[data-bind="plan.goals.0.target"]');t.change(ta,'산책 프로그램 주 2회 참여');t.click('#docCheck-plan [data-act="doc-check-refresh"]');
  ok(summary(t,'plan')==='문서 점검 확인해 볼 곳 1곳'&&t.$('#docCheck-plan').open,'고친 뒤 ‘다시 점검’을 누르면 갱신',summary(t,'plan'));
  ok(t.ev('member().plan.goals[0].target')==='산책 프로그램 주 2회 참여'&&t.ev('member().plan.goals[1].activity')==='','점검은 문서를 바꾸지 않음');
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[3] 평가서 화면: 참여 횟수와 상담일지 기록 수, 찾은 기록 표시');
 {const st=stored57();const m=st.members[0];m.evaluation={goals:[{goalId:'g1',basis:'',short:'산책 프로그램에 주 2회 참여함.',activity:'산책 프로그램 참여를 지원함.',indicator:'산책 프로그램 참여율 80% 이상',result:'산책 프로그램에 3회 참여함.',analysis:'참여 의욕이 늘어남.',before:'',after:'',achMember:'',achStaff:'',blockMember:'',blockStaff:''}],participation:[{type:'일상생활',service:'산책 프로그램 제공',resource:'공원'}],overall:'',opinion:''};
  const t=boot(DIR,{stored:st});t.ev("state.view='evaluation';paint()");
  const li=t.$$('#docCheck-evaluation .doc-check-list li').map(x=>x.textContent);
  ok(li.some(x=>/‘산책’ 참여를 3회로 적었는데, 체크한 상담일지\(평가기간 안\)에서 찾은 참여 기록은 1건입니다/.test(x)&&/찾은 기록: 상담일지 1 \(2026-04-10\)/.test(x)),'참여 횟수가 다르면 찾은 기록과 함께 표시(거부한 날은 세지 않음)',li);
  t.ev("member().evaluation.goals[0].result='산책 프로그램에 1회 참여함.';paint()");ok(!t.$$('#docCheck-evaluation .doc-check-list li').some(x=>/참여 기록은/.test(x.textContent)),'같으면 표시 없음');
  t.ev("member().notes.forEach(n=>n.included=false);paint()");ok(/체크한 상담일지가 없어/.test(t.$('#docCheck-evaluation').textContent),'체크한 상담일지가 없으면 안내');
  const go=t.$$('#docCheck-evaluation [data-act="doc-check-go"]')[0];ok(!go||go.dataset.path.startsWith('evaluation.'),'평가서 칸 주소');
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[4] 주치의편지 화면');
 {const t=boot(DIR,{stored:stored57()});t.ev("member().doctorLetter={...DoctorLetter.normalize(member().doctorLetter)};member().doctorLetter.sections.sleep={status:'밤에 자주 깸.',intervention:'수면 위생 교육을 실시할 예정임.'};state.view='doctor';paint()");
  const box=t.$('#docCheck-doctor');ok(box&&/확인해 볼 곳 1곳/.test(summary(t,'doctor')),'주치의편지에도 칸',summary(t,'doctor'));
  ok(/수면 · 개입 내용 — 개입 내용에는 실제로 한 조치만/.test(box.textContent),'개입 내용의 앞으로 할 일 표현');
  ok(t.$('#docCheck-doctor').compareDocumentPosition(t.$('.doctor-paper'))&t.w.Node.DOCUMENT_POSITION_FOLLOWING,'편지 서식 위에 있음');
  t.click('#docCheck-doctor [data-act="doc-check-go"]');const el=t.w.document.activeElement;ok(el&&el.dataset.doctorField==='sections.sleep.intervention','해당 칸으로 이동',el&&el.outerHTML.slice(0,100));
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[5] 점검 모듈이 없을 때도 화면은 그대로');
 {const t=boot(DIR,{stored:stored57()});t.ev("delete window.DocumentCheck");for(const v of ['plan','evaluation','doctor']){t.ev(`state.view='${v}';paint()`);ok(!t.$('[id^="docCheck-"]')&&!/화면 표시 중 오류/.test(t.$('#content').textContent),v+' 화면 정상')}
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 console.log('[6] 이상한 주소는 무시');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';paint()");const b=t.w.document.createElement('button');b.dataset.act='doc-check-go';b.dataset.path='"] , body, [x="';t.$('#content').append(b);t.click(b);
  ok(!t.errors.length,'선택자 문자가 든 주소는 무시',t.errors);
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
