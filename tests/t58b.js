// v3.21.57 — 지금 계획서에 넣기 · 다음 계획서 작성 때 넣기(규칙 기반 작성)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');
const F=a=>(a||[]).filter(g=>String(g.long||g.short||'').trim());const IDS=a=>F(a).map(g=>g.id).join();
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const today=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})();
const rowOf=(t,re)=>t.$$('#carryLongList .carry-row').find(r=>re.test(r.textContent));
const chipOf=(t,kind,re)=>t.$$('#carryChips-'+kind+' .carry-chip').find(c=>re.test(c.textContent));
(async()=>{
 console.log('[1] 지금 계획서에 넣기 — 장기목표 3을 이전 장기목표(금전)로 바꾸고 강점 하나 바꿈');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';paint()");t.ev('carryUI.open=true;paint()');
  const before=t.ev('JSON.parse(JSON.stringify(member().plan))');
  t.change(rowOf(t,/개인위생에 대한/).querySelector('input'),false);
  t.change(rowOf(t,/금전사용/).querySelector('input'),true);
  t.click(chipOf(t,'strength',/산책 프로그램에 꾸준히/));t.click(chipOf(t,'strength',/요리 프로그램에 관심/));
  t.click('[data-act="carry-now"]');
  const conf=t.logs.filter(l=>l[0]==='confirm').pop()?.[1]||'';
  ok(/새로 넣음: ‘합리적인 금전사용/.test(conf)&&/뺌: 목표 3/.test(conf)&&/그대로 둠: 목표 1, 2/.test(conf),'확인 창에 바뀌는 내용',conf);
  const p=t.ev('member().plan');
  ok(p.goals.length===4&&F(p.goals).length===3,'목표 4칸 중 3개 작성',p.goals.length);
  ok(p.goals[0].id==='g1'&&p.goals[1].id==='g2'&&p.goals[0].short===before.goals[0].short&&p.goals[1].plan===before.goals[1].plan,'목표 1·2는 그대로');
  const g=p.goals[2];
  ok(/금전사용/.test(g.long)&&g.id!=='g3'&&g.id!=='g0','목표 3 자리에 금전 장기목표(새 ID)',g);
  ok(g.longSince===today&&t.ev('longLocked(member(),member().plan.goals[2])'),'새 장기목표는 고정(오늘부터)',g.longSince);
  ok(/^1\.\s/.test(g.short)&&/\n2\.\s/.test(g.short)&&!/확인 필요/.test(g.short),'단기목표 1·2가 채워짐',g.short);
  ok(/금전|용돈|지출|소비/.test(g.short+g.plan),'단기목표·재활계획이 금전 영역',g.short+' / '+g.plan);
  ok(clean=(s=>String(s).trim()),'');
  ok(p.strength[0]==='복약을 스스로 챙김.'&&p.strength[1]==='요리 프로그램에 관심이 많음.'&&p.strength[2]==='산책 프로그램에 끝까지 참여함.','강점: 고른 대로(복약·요리) + 빈칸은 상담일지에서(v3.21.65)',p.strength);
  ok(p.weakness[0]===before.weakness[0]&&p.weakness[1]===before.weakness[1]&&p.weakness[2]==='산책 프로그램에 불참함.','약점: 고른 2개 그대로 + 빈칸은 상담일지에서(v3.21.65)',p.weakness);
  ok(p.swUses==='1'&&p.swSince===today,'강점·약점 주기 새로 시작',[p.swUses,p.swSince]);
  ok(/지금 계획서에 넣었습니다/.test(t.$('#carryMsg')?.textContent||''),'완료 안내',t.$('#carryMsg')?.textContent);
  const bank=t.ev('member().bank.long.map(x=>x.text)');ok(bank.some(x=>/개인위생에 대한/.test(x)),'뺀 장기목표도 보관함에 남음',bank);
  ok(t.$$('#carryLongList input:checked').length===3&&/지금 목표 3/.test(rowOf(t,/금전사용/).textContent),'다시 그린 목록에 반영',rowOf(t,/금전사용/).textContent);
  // 바뀐 것 없이 다시 누르면
  t.click('[data-act="carry-now"]');ok(/바뀐 항목이 없습니다/.test(t.$('#carryMsg').textContent),'바뀐 것 없으면 안내만');
  // 평가서 쪽 연결: 평가서를 열면 목표 3개
  t.ev("state.view='evaluation';syncPlanToEval(member());paint()");
  ok(t.errors.length===0,'오류 없음',t.errors);
 }
 console.log('[2] 확인 창에서 취소하면 그대로');
 {const t=boot(DIR,{stored:stored57(),confirmFn:m=>!/지금 재활계획서에/.test(m)});t.ev("state.view='plan';carryUI.open=true;paint()");
  const before=JSON.stringify(t.ev('member().plan'));
  t.change(rowOf(t,/개인위생에 대한/).querySelector('input'),false);t.click('[data-act="carry-now"]');
  ok(JSON.stringify(t.ev('member().plan'))===before,'계획서 안 바뀜');
 }
 console.log('[3] 다음 계획서 작성 때 넣기 → 규칙 기반 작성에 반영');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  const before=JSON.stringify(t.ev('member().plan'));
  t.change(rowOf(t,/개인위생에 대한/).querySelector('input'),false);
  t.change(rowOf(t,/원만한 관계/).querySelector('input'),true);
  t.click(chipOf(t,'weakness',/군것질/));
  t.click('[data-act="carry-next"]');
  ok(JSON.stringify(t.ev('member().plan'))===before,'지금 계획서는 그대로');
  const c=t.ev('member().carry');
  ok(c&&c.long.length===3&&/원만한 관계/.test(c.long[2])&&c.strength===null&&c.weakness.length===3,'다음 계획서에 넣을 항목 저장(장기목표 3 · 약점 3 · 강점은 안 건드림)',c);
  ok(/다음 계획서에 넣을 항목 있음/.test(t.$('#carryPanel summary').textContent)&&/장기목표 3개 · 약점 3개/.test(t.$('.carry-pend').textContent),'요약 줄·예정 표시',t.$('.carry-pend')?.textContent);
  t.flush();ok(t.saved().members[0].carry?.long?.length===3,'브라우저 저장에 들어감');
  t.ev("state.view='ai';paint()");ok(/다음 계획서에 넣을 항목: 장기목표 3개 · 약점 3개/.test(t.$('#content').textContent),'AI 작성 화면에도 표시');
  t.ev('generateDraft(member(),true)');
  const p=t.ev('member().plan');
  const longs=F(p.goals).map(g=>g.long);
  ok(longs.length===3&&/생활리듬/.test(longs[0])&&/정신과적/.test(longs[1])&&/원만한 관계/.test(longs[2]),'새 계획서 장기목표 = 고른 3개(순서대로)',longs);
  ok(p.goals[0].id==='g1'&&p.goals[1].id==='g2'&&!['g1','g2','g3'].includes(p.goals[2].id),'이어 쓴 목표는 ID 유지, 새 목표는 새 ID');
  ok(F(p.goals).every(g=>/^1\.\s/.test(g.short)),'모든 목표 단기목표 작성',p.goals.map(g=>g.short));
  ok(p.weakness[0]==='금전 관리에 어려움이 있음.'&&p.weakness[1]==='기분에 따라 활동 참여가 줄어듦.'&&p.weakness[2]==='군것질이 잦음.','약점 = 고른 3개',p.weakness);
  ok(p.strength[0]==='산책 프로그램에 꾸준히 참여함.'&&p.strength[1]==='복약을 스스로 챙김.','강점은 기본대로(1년 주기 안이라 그대로 이어짐)',p.strength);
  ok(t.ev('member().carry')===null,'쓰고 나면 예정 비움');
  ok(IDS(t.ev('member().planArchive[0].plan.goals'))==='g1,g2,g3','이전 계획은 보관');
  ok(t.ev('member().bank.long.length')===5,'보관함 유지',t.ev('member().bank.long.map(x=>x.text)'));
 }
 console.log('[4] 장기목표 체크를 모두 풀고 다음 계획서 → 새 장기목표로 작성');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  for(const cb of t.$$('#carryLongList input:checked'))t.change(cb,false);
  t.click('[data-act="carry-next"]');ok(JSON.stringify(t.ev('member().carry.long'))==='[]','장기목표 0개로 저장');
  t.ev('generateDraft(member(),true)');const p=t.ev('member().plan');
  ok(F(p.goals).length>=2&&p.goals.every(g=>!['g1','g2','g3'].includes(g.id)),'기존 장기목표를 잇지 않음',p.goals.map(g=>g.long));
 }
 console.log('[5] 예정 취소');
 {const t=boot(DIR,{stored:stored57({carry:{long:['타인과 원만한 관계를 형성하고 유지함.'],strength:null,weakness:null,at:'2026-10-25T00:00:00Z'}})});
  t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.$$('#carryLongList input:checked').length===1,'예정이 있으면 예정대로 체크되어 보임');
  t.click('[data-act="carry-cancel"]');ok(t.ev('member().carry')===null&&t.$$('#carryLongList input:checked').length===3,'취소 후 지금 계획서 기준으로 돌아감');
 }
 console.log('[6] 아무것도 안 고르고 ‘다음 계획서 작성 때 넣기’');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");t.click('[data-act="carry-next"]');
  ok(t.ev('member().carry')===null&&/그대로 이어집니다/.test(t.$('#carryMsg').textContent),'저장 안 하고 안내',t.$('#carryMsg').textContent);
 }
 console.log('[7] 강점 4개째는 막음');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.click(chipOf(t,'strength',/요리 프로그램에 관심/));t.click(chipOf(t,'strength',/동료에게 먼저/));
  ok(t.ev('carryUI.sel.strength.length')===3&&/3개까지/.test(t.$('#carryMsg').textContent),'3개까지',t.ev('carryUI.sel.strength'));
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
