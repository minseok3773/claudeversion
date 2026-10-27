// v3.21.62 — 주치의편지 '불안·기분 변화' 줄·칸 구분 기준, 재활계획서 고른 항목 외 빈칸 채우기(가상 자료만 사용)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');const D=require(DIR+'/doctor-letter.js');
const isDoc=b=>/\[주치의편지\]/.test(b.prompt||'');
const G1='규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.',G2='정신과적 증상에 대한 대처능력을 향상시키고 안정적인 일상생활을 유지함.';
(async()=>{
 console.log('[1] 주치의편지: 불안·기분 변화 줄');
 ok(D.ROWS.some(([k,c,l])=>k==='mood'&&c==='정신과 증상'&&l==='불안·기분 변화')&&D.ROWS.length===12,'정신과 증상에 새 줄');
 ok(D.ROWS.every(([k])=>D.ROW_GUIDE[k]),'모든 줄에 쓰는 기준');
 const old={sections:{internal:{status:'혈압 약 복용 중',intervention:''}}};const n=D.normalize(old);ok(n.sections.mood&&n.sections.mood.status===''&&n.sections.internal.status==='혈압 약 복용 중','예전 편지도 그대로 열림(새 줄은 빈칸)');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='doctor';paint()");const sheets=t.$$('.doctor-sheet');
  ok(sheets.length===3&&/불안·기분 변화/.test(sheets[1].textContent)&&!/불안·기분 변화/.test(sheets[0].textContent),'2쪽 정신과 증상 묶음에 표시',sheets.length);
  ok(t.$('[data-doctor-field="sections.mood.status"]')&&t.$('[data-doctor-field="sections.mood.intervention"]'),'현 상황·개입 내용 칸');}
 console.log('[2] 주치의편지 AI 요청: 칸 구분 기준');
 {const base=makeAI();const t=boot(DIR,{stored:stored57(),ai:b=>isDoc(b)?{programs:'산책 프로그램',sections:{mood:{status:'- 극도의 불안감과 호흡 불편을 호소함.',intervention:''}},grades:{}}:base(b)});
  await t.ev('runDoctorLetterAI()');const P=(t.prompts.find(isDoc)||{}).prompt||'';
  ok(/\[칸 구분 기준\] sections의 각 칸은 아래 뜻대로만 쓴다\. 칸을 채우려고 내용을 끼워 맞추지 말고/.test(P)&&/맞는 칸이 없으면 opinion\(담당자 의견\)에 쓴다/.test(P),'끼워 맞추지 말고 맞는 칸이 없으면 담당자 의견');
  ok(/- internal\(건강 · 내과\): 진단되었거나 의심되는 신체 질환[^\n]*불안·긴장·기분 변화와 함께 나타난 가슴 답답함·호흡 불편/.test(P),'내과는 실제 신체 질환만, 불안 동반 신체 증상은 제외');
  ok(/- mood\(정신과 증상 · 불안·기분 변화\): 불안·초조·공황/.test(P)&&/"mood":\{"status":"","intervention":""\}/.test(P),'새 줄의 기준과 JSON 칸');
  ok(/극도의 불안감/.test(t.ev('member().doctorLetter.sections.mood.status')),'AI 초안이 새 줄에 들어감');}
 console.log('[3] 규칙 기반 초안: 증상의 성격으로 칸을 고름');
 {const t=boot(DIR,{stored:stored57()});
  t.ev("member().notes[0].content='오전에 전신 무기력감, 극도의 불안감, 호흡 불편을 호소함.';member().notes[1].content='혈압이 높아 내과 진료를 받음.';member().notes[2].content='하루 종일 방에만 누워 지내고 말수가 줄어듦.';member().notes.forEach((n,i)=>updateNoteBody(member(),i))");
  const d=t.ev('ruleDoctorDraft(member())');
  ok(/불안감/.test(d.sections.mood.status)&&!/불안감/.test(d.sections.internal.status)&&!/불안감/.test(d.sections.negative.status),'불안과 함께 나온 호흡 불편·무기력 → 불안·기분 변화',d.sections.mood);
  ok(/혈압/.test(d.sections.internal.status),'혈압·내과 진료 → 내과',d.sections.internal);
  ok(/누워/.test(d.sections.negative.status),'누워 지냄·말수 감소 → 음성 증상',d.sections.negative);}
 console.log('[4] 재활계획서: 고른 장기목표·강점·약점 외 빈칸을 상담일지로 채움');
 {const carry={long:[G1,G2],strength:['요리 프로그램에 관심이 많음.'],weakness:['금전 관리에 어려움이 있음.','군것질이 잦음.'],at:'2026-10-27T00:00:00Z'};
  const t=boot(DIR,{stored:stored57({carry}),ai:makeAI({newLongs:['합리적으로 금전을 사용함.','타인과 원만한 관계를 형성하고 유지함.']})});
  await t.ev("runLocalAI('plan')");
  const A=t.prompts.find(b=>stepOf(b.prompt)==='A'),B=t.prompts.find(b=>stepOf(b.prompt)==='B');
  ok(/남은 칸\(강점 2칸 · 약점 1칸\)은 체크한 상담일지에서 근거를 찾아 고른 항목과 겹치지 않는 새 내용으로 채운다/.test(A.prompt),'분석 요청: 강점·약점 남은 칸 채우기');
  ok(/\[빈칸 채우기 — 담당자가 장기목표 2개만 고름\] 고른 장기목표는 문구와 goalId를 그대로 쓰고, 남은 2칸은 체크한 상담일지에서 근거가 있고/.test(B.prompt),'목표 요청: 남은 2칸 채우기');
  const goals=t.ev('member().plan.goals.filter(g=>clean(g.long)).map(g=>g.long)');
  ok(goals.length===4&&goals[0]===G1&&goals[1]===G2&&goals.includes('합리적으로 금전을 사용함.'),'고른 2개 + 새 목표 2개 = 4칸',goals);
  ok(!t.logs.some(l=>l[0]==='confirm'&&/새 장기목표/.test(l[1])),'확인 창 없이 채움');
  const sw=t.ev('({s:member().plan.strength,w:member().plan.weakness})');
  ok(sw.s[0]==='요리 프로그램에 관심이 많음.'&&sw.s.filter(Boolean).length===3&&new Set(sw.s).size===3,'강점: 고른 1개 + 상담일지로 2개',sw.s);
  ok(sw.w[0]==='금전 관리에 어려움이 있음.'&&sw.w[1]==='군것질이 잦음.'&&sw.w.filter(Boolean).length===3,'약점: 고른 2개 + 상담일지로 1개',sw.w);}
 console.log('[5] 첫 작성에서 새 목표가 빠지면 보완 요청으로 남은 칸을 채움');
 {const carry={long:[G1],strength:null,weakness:null,at:'2026-10-27T00:00:00Z'};const base=makeAI();let supSeen='';
  const t=boot(DIR,{stored:stored57({carry}),ai:b=>{if(/\[보완 요청\]/.test(b.prompt)){supSeen=b.prompt;return{goals:[{goalId:'',long:'합리적으로 금전을 사용함.',short:['용돈 기입장을 주 1회 함께 확인함.','군것질 지출을 주 2회 이하로 줄임.'],plan:['용돈 기입장을 주 1회 함께 확인할 계획임','군것질 지출을 함께 점검할 계획임'],activity:['용돈 기입장 확인'],target:['용돈 기입장 확인 주 1회'],src:[4]}]}}return base(b)}});
  await t.ev("runLocalAI('plan')");
  ok(/남은 칸은 체크한 상담일지에서 근거가 있고 이미 쓴 목표와 영역이 겹치지 않는 새 장기목표로 채운다/.test(supSeen),'보완 요청이 남은 칸 채우기를 부탁함');
  const goals=t.ev('member().plan.goals.filter(g=>clean(g.long)).map(g=>g.long)');ok(goals[0]===G1&&goals.includes('합리적으로 금전을 사용함.'),'고른 목표 + 보완된 새 목표',goals);}
 console.log('[6] 고르지 않았을 때는 예전 방식 그대로(새 장기목표는 확인 후 추가)');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI({newLongs:['합리적으로 금전을 사용함.']}),confirmFn:m=>!/새 장기목표/.test(m)});
  await t.ev("runLocalAI('plan')");const goals=t.ev('member().plan.goals.filter(g=>clean(g.long)).map(g=>g.long)');
  ok(t.logs.some(l=>l[0]==='confirm'&&/새 장기목표/.test(l[1]))&&!goals.includes('합리적으로 금전을 사용함.'),'확인 창에서 취소하면 AI가 제안한 새 장기목표는 넣지 않음',goals);}
 console.log('[7] AI가 새 목표를 못 채워도 상담일지 근거 영역으로 남은 칸을 채움');
 {const carry={long:[G1,G2],strength:null,weakness:null,at:'2026-10-27T00:00:00Z'};const t=boot(DIR,{stored:stored57({carry}),ai:makeAI()});
  await t.ev("runLocalAI('plan')");const goals=t.ev('member().plan.goals.filter(g=>clean(g.long)).map(g=>({l:g.long,s:g.src}))');
  ok(goals.length>=3&&goals[0].l===G1&&goals[1].l===G2&&goals.slice(2).every(g=>/^상담일지 \d/.test(g.s)),'고른 2개 + 상담일지 근거 영역의 목표',goals);
  ok(/고른 장기목표 외 빈칸 \d개를 체크한 상담일지에 근거가 있는 영역의 목표로 채웠습니다/.test(t.ev('aiFormatNotes.join("|")')+'|'+t.logs.map(l=>l[1]).join('|')),'작성 안내에 표시');}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
