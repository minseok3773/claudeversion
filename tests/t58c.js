// v3.21.57 — AI 작성(가짜 Gemini)에 ‘다음 계획서에 넣을 항목’ 반영 + 평가서 강점·약점
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const F=a=>(a||[]).filter(g=>String(g.long||g.short||'').trim());const IDS=a=>F(a).map(g=>g.id).join();
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const REL='타인과 원만한 관계를 형성하고 유지함.';
(async()=>{
 console.log('[1] 계획서만 작성 — 고른 장기목표 2개(현재 1 + 과거 문서 1), 강점 1개');
 {const t=boot(DIR,{stored:stored57({carry:{long:['규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.',REL],strength:['요리 프로그램에 관심이 많음.'],weakness:null,at:'2026-10-25T00:00:00Z'}}),ai:makeAI()});
  await t.ev("runLocalAI('plan')");
  const fail=t.logs.find(l=>l[0]==='alert'&&/실패|오류/.test(l[1]));ok(!fail,'작성 성공',fail);
  const B=t.prompts.find(b=>stepOf(b.prompt)==='B');const sec=(B?.prompt||'').split('[현재 승인·작성된 장기목표 — 변경하지 말고 단기목표를 연결]')[1].split('[이전 평가')[0];
  ok(/goalId=g1 \/ 장기목표=규칙적인/.test(sec)&&new RegExp('goalId=\\S+ / 장기목표='+REL).test(sec)&&!/goalId=g2|goalId=g3/.test(sec),'AI에 고른 장기목표만 넘김',sec);
  const p=t.ev('member().plan');const longs=F(p.goals).map(g=>g.long);
  ok(longs.length>2&&longs.length<=4&&/생활리듬/.test(longs[0])&&longs[1]===REL&&F(p.goals).slice(2).every(g=>/^상담일지 \d/.test(g.src)),'새 계획서 장기목표 = 고른 2개 + 남은 칸은 상담일지 근거 영역(v3.21.62)',longs);
  ok(p.goals[0].id==='g1'&&p.goals[1].id!=='g2','이어 쓴 목표 ID 유지',p.goals.map(g=>g.id));
  ok(/사회기술훈련/.test(p.goals[1].short)&&/^1\./.test(p.goals[1].short),'새 장기목표에 AI가 쓴 단기목표 연결',p.goals[1].short);
  ok(p.goals.slice(0,2).every(g=>clean(g.longSince)),'고른 장기목표 고정 날짜',p.goals.map(g=>g.longSince));
  ok(p.strength[0]==='요리 프로그램에 관심이 많음.'&&p.strength[1]==='요리 프로그램에서 동료와 함께 김밥을 만듦.'&&p.strength[2]==='외래 진료에 빠짐없이 참여함.','강점: 고른 1개 + AI가 새로 쓴 것으로 채움',p.strength);
  ok(p.weakness[0]==='금전 관리에 어려움이 있음.'&&p.weakness[1]==='기분에 따라 활동 참여가 줄어듦.'&&p.weakness[2]==='산책 프로그램 참여를 거부한 날이 있음.','약점은 1년 주기대로 이어지고 빈칸은 AI가 새로 쓴 것으로(v3.21.65)',p.weakness);
  ok(p.swUses==='1','강점·약점 주기 새로 시작',p.swUses);
  ok(t.ev('member().carry')===null,'작성 후 예정 비움');
  ok(IDS(t.ev('member().planArchive[0].plan.goals'))==='g1,g2,g3','이전 계획 보관');
  ok(t.ev('member().bank.long.length')===5,'보관함 유지');
  ok(t.errors.length===0,'오류 없음',t.errors);
 }
 console.log('[2] 예정 없이 계획서만 작성 — 지금 장기목표 3개를 그대로 잇는다(예전과 같음)');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});
  await t.ev("runLocalAI('plan')");
  const B=t.prompts.find(b=>stepOf(b.prompt)==='B');ok(/goalId=g1/.test(B.prompt)&&/goalId=g2/.test(B.prompt)&&/goalId=g3/.test(B.prompt),'지금 장기목표 3개를 넘김');
  const p=t.ev('member().plan');ok(p.goals.slice(0,3).map(g=>g.id).join()==='g1,g2,g3'&&p.goals.length===4,'지금 목표 3개 + 근거 있는 영역 1칸',p.goals.map(g=>g.id+':'+g.long.slice(0,12)));
  ok(p.strength[0]==='산책 프로그램에 꾸준히 참여함.'&&p.strength[1]==='복약을 스스로 챙김.'&&p.strength[2]==='요리 프로그램에서 동료와 함께 김밥을 만듦.','강점은 1년 주기대로 이어지고 빈칸은 AI가 새로 쓴 것으로(v3.21.65)',p.strength);
 }
 console.log('[3] AI 자동작성(평가→차기 계획) — 평가서에 계획서 강점·약점 전달, 차기 계획에 고른 항목');
 {const t=boot(DIR,{stored:stored57({carry:{long:null,strength:null,weakness:['군것질이 잦음.'],at:'2026-10-25T00:00:00Z'}}),ai:makeAI()});
  await t.ev("runLocalAI('both')");
  const fail=t.logs.find(l=>l[0]==='alert'&&/실패|오류/.test(l[1]));ok(!fail,'작성 성공',fail);
  const C=t.prompts.find(b=>stepOf(b.prompt)==='C');
  ok(/\[회원의 강점·약점 — 계획서\] 강점: 산책 프로그램에 꾸준히 참여함\. \/ 복약을 스스로 챙김\. · 약점: 금전 관리에 어려움이 있음\. \/ 기분에 따라 활동 참여가 줄어듦\. \/ 군것질이 잦음\./.test(C.prompt),'평가 단계에 강점·약점(고른 약점 포함) 전달',(C.prompt.match(/\[회원의 강점·약점[^\n]*/)||[''])[0]);
  const e=t.ev('member().evaluation');
  ok(e.pastPlan===true&&e.goals.filter(g=>g.goalId).map(g=>g.goalId).join()==='g1,g2,g3'&&e.goals.length===4,'평가서(기존 계획 기준) 목표 3개 + 빈 칸',e.goals.map(g=>g.goalId));
  ok(/복약을 스스로 챙김/.test(e.goals[0].achMember),'달성 요인(회원)에 강점 반영',e.goals[0].achMember);
  const p=t.ev('member().plan');ok(p.weakness[0]==='군것질이 잦음.','차기 계획 약점 1번 = 고른 항목',p.weakness);
  ok(p.goals.slice(0,3).map(g=>g.id).join()==='g1,g2,g3','장기목표는 기본대로 이어짐',p.goals.map(g=>g.id));
  ok(t.ev('member().carry')===null,'예정 비움');
 }
 console.log('[4] 평가서만 작성 — 예정은 그대로 남음');
 {const t=boot(DIR,{stored:stored57({carry:{long:[REL],strength:null,weakness:null,at:'2026-10-25T00:00:00Z'}}),ai:makeAI()});
  await t.ev("runLocalAI('eval')");
  ok(t.ev('member().carry')?.long?.[0]===REL,'평가서만 쓰면 예정 유지');
  ok(IDS(t.ev('member().plan.goals'))==='g1,g2,g3','계획서 그대로');
 }
 console.log('[5] 평가서 화면 — 강점·약점 넣기 칩');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});
  await t.ev("runLocalAI('eval')");
  t.ev("state.view='evaluation';paint()");
  const chips=t.$$('.factor-chips');ok(chips.length===8,'목표 4칸 × (달성·방해) 칩 줄',chips.length);
  const first=chips[0];ok(/계획서 강점 넣기/.test(first.textContent)&&/산책 프로그램에 꾸준히 참여함/.test(first.textContent),'달성 요인 아래 강점 칩',first.textContent);
  ok(/계획서 약점 넣기/.test(chips[1].textContent)&&/금전 관리에 어려움/.test(chips[1].textContent),'방해 요인 아래 약점 칩',chips[1].textContent);
  const g1=()=>t.ev('member().evaluation.goals[1]');
  ok(/해당사항 없음/.test(g1().achMember),'목표 2 달성 요인 처음엔 해당사항 없음',g1().achMember);
  t.click(t.$$('.factor-chips')[2].querySelector('.carry-chip'));
  ok(g1().achMember==='- 산책 프로그램에 꾸준히 참여함.','누르면 ‘- 강점’ 줄로 들어감',g1().achMember);
  ok(t.$$('.factor-chips')[2].querySelector('.carry-chip').classList.contains('on'),'칩이 골라진 표시');
  t.click(t.$$('.factor-chips')[2].querySelectorAll('.carry-chip')[1]);
  ok(g1().achMember==='- 산책 프로그램에 꾸준히 참여함.\n- 복약을 스스로 챙김.','두 번째 강점 추가',g1().achMember);
  t.click(t.$$('.factor-chips')[2].querySelector('.carry-chip'));
  ok(g1().achMember==='- 복약을 스스로 챙김.','다시 누르면 뺌',g1().achMember);
  t.click(t.$$('.factor-chips')[2].querySelector('.carry-chip.on'));
  ok(g1().achMember==='해당사항 없음','다 빼면 해당사항 없음',g1().achMember);
  t.click(t.$$('.factor-chips')[3].querySelector('.carry-chip'));
  ok(g1().blockMember==='- 금전 관리에 어려움이 있음.','약점 → 방해 요인(회원)',g1().blockMember);
  // 인쇄 사본에는 칩이 없음
  t.ev('preparePrint()');
  const sheetChips=t.$$('#printSheet .factor-chips');ok(sheetChips.every(c=>c.classList.contains('noprint')),'인쇄 사본의 칩은 숨김 처리(noprint)');
  ok(t.errors.length===0,'오류 없음',t.errors);
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
function clean(s){return String(s??'').trim()}
