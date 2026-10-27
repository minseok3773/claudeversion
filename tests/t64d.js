// v3.21.65 — 강점·약점을 3개보다 적게 고르면 남은 칸을 체크한 상담일지에서 채움 (가상 자료)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const chipOf=(t,kind,re)=>t.$$('#carryChips-'+kind+' .carry-chip').find(c=>re.test(c.textContent));
(async()=>{
 console.log('[1] 약점 2개만 있는 계획서 → ‘지금 계획서에 넣기’ → 3번째 약점을 상담일지에서');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.ev('carryUI.sel.weakness.length')===2,'고른 약점 2개(지금 계획서 그대로)');
  t.click('[data-act="carry-now"]');
  const conf=t.logs.filter(l=>l[0]==='confirm').pop()?.[1]||'';
  const w=t.ev('member().plan.weakness');
  ok(w[0]==='금전 관리에 어려움이 있음.'&&w[1]==='기분에 따라 활동 참여가 줄어듦.'&&w[2]==='산책 프로그램에 불참함.','고른 2개 + 상담일지에서 1개',w);
  ok(/\[약점\][^\n]*\n\s*\+ 체크한 상담일지에서 채움: ‘산책 프로그램에 불참함/.test(conf),'확인 창에 채울 내용',conf);
  ok(!/금전|용돈/.test(w[2]),'이미 고른 것과 같은 영역(금전)은 뒤로 미룸');
  const s=t.ev('member().plan.strength');ok(s[0]==='산책 프로그램에 꾸준히 참여함.'&&s[1]==='복약을 스스로 챙김.'&&s[2]==='','강점은 상담일지에 겹치지 않는 새 근거가 없으면 비워 둠(같은 뜻 문장은 넣지 않음)',s);
  ok(/\[강점\] 고른 2개 그대로 \(빈칸을 채울 내용을 체크한 상담일지에서 더 찾지 못함\)/.test(conf),'못 채운 칸은 확인 창에 알림',conf);
  t.click('[data-act="carry-now"]');ok(/바뀐 항목이 없습니다/.test(t.$('#carryMsg').textContent),'다시 누르면 바뀐 것 없음');
  ok(!t.errors.length,'오류 없음',t.errors)}
 console.log('[2] 약점 1개만 고름 → 2칸을 상담일지에서(같은 뜻·같은 영역 피함)');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click(chipOf(t,'weakness',/기분에 따라/));ok(t.ev('carryUI.sel.weakness.length')===1,'1개만 남김');
  t.click('[data-act="carry-now"]');const w=t.ev('member().plan.weakness');
  ok(w[0]==='금전 관리에 어려움이 있음.'&&w[1]&&w[2]&&w[1]!==w[2],'3칸 모두 채움',w);
  ok(!w.slice(1).some(x=>/거부함/.test(x)&&w.some(y=>/불참함/.test(y))),'같은 뜻(거부·불참)은 한 번만',w)}
 console.log('[3] ‘다음 계획서 작성 때 넣기’로 약점 2개 → AI가 약점을 비워 보내도 상담일지에서 채움');
 {const base=makeAI();const ai=b=>{const r=base(b);if(stepOf(String(b.prompt||''))==='A'&&r&&typeof r==='object')return{...r,weakness:['','',''],strength:['','','']};return r};
  const t=boot(DIR,{stored:stored57(),ai});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click(chipOf(t,'weakness',/기분에 따라/));t.click(chipOf(t,'weakness',/기분에 따라/)); // 한 번 빼고 다시 골라 ‘고른 약점 2개’로
  t.click('[data-act="carry-next"]');ok(t.ev('member().carry?.weakness?.length')===2,'다음 계획서에 넣을 약점 2개',t.ev('member().carry'));
  await t.ev("runLocalAI('plan')");
  const A=t.prompts.find(b=>stepOf(b.prompt)==='A');ok(/남은 칸\(강점 3칸 · 약점 1칸\)/.test(A?.prompt||''),'AI에게도 남은 칸을 채우라고 안내',(A?.prompt||'').match(/남은 칸[^)]*\)/)?.[0]);
  const w=t.ev('member().plan.weakness');ok(w[0]==='금전 관리에 어려움이 있음.'&&w[1]==='기분에 따라 활동 참여가 줄어듦.'&&!!w[2]&&!/금전|용돈/.test(w[2]),'AI가 비워도 3번째 약점은 상담일지에서',w);
  ok(!t.errors.length,'오류 없음',t.errors)}
 console.log('[4] AI가 새 약점을 써 주면 그것을 씀');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click('[data-act="carry-next"]');await t.ev("runLocalAI('plan')");
  const w=t.ev('member().plan.weakness');ok(w[2]==='산책 프로그램 참여를 거부한 날이 있음.','AI가 쓴 새 약점 사용(1년 주기로 이어 온 약점 2개 + AI 1개)',w)}
 console.log('[4b] 아무것도 고르지 않고 AI 작성 — 이어 온 약점이 2개뿐이고 AI도 비워 보내면 상담일지에서');
 {const base=makeAI();const ai=b=>{const r=base(b);if(stepOf(String(b.prompt||''))==='A'&&r&&typeof r==='object')return{...r,weakness:['','',''],strength:['','','']};return r};
  const t=boot(DIR,{stored:stored57(),ai});await t.ev("runLocalAI('plan')");const p=t.ev('member().plan');
  ok(p.weakness[0]==='금전 관리에 어려움이 있음.'&&!!p.weakness[2],'약점 3칸',p.weakness);ok(p.strength.filter(Boolean).length>=2,'강점은 있는 만큼',p.strength)}
 console.log('[5] 규칙 기반 작성(다음 계획서 작성 때 넣기)도 3칸');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click('[data-act="carry-next"]');t.ev('generateDraft(member(),true)');const w=t.ev('member().plan.weakness');
  ok(w.filter(Boolean).length===3&&w[0]==='금전 관리에 어려움이 있음.','3칸',w)}
 console.log('[6] 체크한 상담일지가 없으면 채우지 않음');
 {const st=stored57();st.members[0].notes.forEach(n=>n.included=false);const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click('[data-act="carry-now"]');ok(/바뀐 항목이 없습니다/.test(t.$('#carryMsg').textContent)&&t.ev('member().plan.weakness[2]')==='','근거가 없으면 그대로',t.ev('member().plan.weakness'))}
 console.log('[7] 다른 사람·직원 문장, 계획 문장, 인용은 쓰지 않음');
 {const st=stored57();st.members[0].notes.push({date:'2026-09-25',topic:'상담',content:'어머니가 회원이 늦잠을 잔다고 걱정함. 직원이 기상 시간을 확인함. 다음 달에는 금연 교육이 필요함. 회원은 “잠이 안 와요”라고 말함. 회원은 아침에 일어나기 어려워함.',result:'',counselorOpinion:'',included:true});
  const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");t.click('[data-act="carry-now"]');
  const w=t.ev('member().plan.weakness');ok(w[2]==='아침에 일어나기 어려워함.','회원 본인의 어려움 문장만(주어 ‘회원은’은 뺌)',w)}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
