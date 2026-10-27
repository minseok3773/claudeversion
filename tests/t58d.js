// v3.21.57 — 경계 상황(백업, 이상한 자료, 중복 장기목표, 미완성 줄, 과거 메모장 문서, 복원, 화면 전체)
const {boot,ok,done,KEY}=require('./h.js');const {stored57,member57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const F=a=>(a||[]).filter(g=>String(g.long||g.short||'').trim());const IDS=a=>F(a).map(g=>g.id).join();
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const rowOf=(t,re)=>t.$$('#carryLongList .carry-row').find(r=>re.test(r.textContent));
(async()=>{
 console.log('[1] 백업 내려받기 → 불러오기: 보관함·예정 유지(다시 채우지 않음)');
 {const t=boot(DIR,{stored:stored57({carry:{long:['타인과 원만한 관계를 형성하고 유지함.'],strength:null,weakness:null,at:'2026-10-25T00:00:00Z'}})});
  t.ev("member().bank.long=member().bank.long.slice(0,2)");
  const obj=JSON.parse(t.ev("JSON.stringify({format:'x',members:state.members,memberId:state.memberId,references:[],activityDict:[],writerProfiles:state.writerProfiles,writerId:state.writerId})"));
  t.ev(`safeImport(${JSON.stringify(obj)})`);
  ok(t.ev('member().bank.long.length')===2,'보관함 그대로(2개)',t.ev('member().bank.long.length'));
  ok(t.ev('member().carry.long[0]')==='타인과 원만한 관계를 형성하고 유지함.','예정 그대로');
 }
 console.log('[2] 이상한 자료도 안전하게 정리');
 {const st=stored57({bank:{long:[{text:'<b>짧</b>'},{text:'확인 필요'},{text:'  규칙적인 생활리듬을 유지함.  ',since:'x',last:'2026-01-01'},{text:'규칙적인 생활리듬을 유지함'},null,7],strength:'abc',weakness:[{text:'해당사항 없음'}]},carry:{long:'abc',strength:[1,'',null],weakness:[]}});
  const t=boot(DIR,{stored:st});const b=t.ev('member().bank');
  ok(b.long.length===2&&b.long.some(x=>x.text==='<b>짧</b>')&&b.long.filter(x=>/생활리듬을 유지함/.test(x.text)).length===1,'형식이 틀린 항목·미완성·중복 정리',b.long);
  ok(Array.isArray(b.strength)&&b.strength.length===0&&b.weakness.length===0,'목록이 아니거나 해당사항 없음은 뺌',b);
  const c=t.ev('member().carry');ok(c&&c.long===null&&c.strength.length===0&&c.weakness.length===0,'예정 정리',c);
  t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.errors.length===0&&!!t.$('#carryPanel'),'화면 오류 없음',t.errors);
  ok(!t.$('#carryPanel b b')&&/&lt;b&gt;짧&lt;\/b&gt;/.test(t.$('#carryPanel').innerHTML),'글자 속 태그는 글자로만 보임(실행 안 됨)');
 }
 console.log('[3] 같은 장기목표를 두 줄에 쓴 계획서');
 {const st=stored57();const p=st.members[0].plan;p.goals.splice(1,0,{...p.goals[0],id:'g1b',short:'1. 요리 프로그램에 참여함.'});
  const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");
  const r=rowOf(t,/생활리듬/);ok(/지금 목표 1·2/.test(r.textContent),'한 줄로 보이고 목표 1·2 표시',r.textContent);
  t.click(t.$$('#carryChips-weakness .carry-chip').find(c=>/군것질/.test(c.textContent)));
  t.click('[data-act="carry-now"]');
  ok(IDS(t.ev("member().plan.goals"))==='g1,g1b,g2,g3','두 줄 모두 그대로',t.ev("member().plan.goals.map(g=>g.id).join()"));
  ok(t.ev("member().plan.weakness[2]")==='군것질이 잦음.','약점만 추가',t.ev('member().plan.weakness'));
  // 체크를 풀면 두 줄 다 빠짐(대신 넣을 것이 없을 때)
  t.ev('carryUI.sel=null;paint()');t.change(rowOf(t,/생활리듬/).querySelector('input'),false);t.click('[data-act="carry-now"]');
  const conf=t.logs.filter(l=>l[0]==='confirm').pop()[1];ok(/뺌: 목표 1/.test(conf)&&/뺌: 목표 2/.test(conf),'확인 창에 두 줄 모두',conf);
  ok(IDS(t.ev("member().plan.goals"))==='g2,g3'&&t.ev('member().plan.goals.length')===4,'두 줄 빠짐(4칸 유지)',t.ev("member().plan.goals.map(g=>g.id)"));
 }
 console.log('[4] ‘확인 필요’ 장기목표 줄과 장기목표 없는 줄은 건드리지 않음');
 {const st=stored57();const p=st.members[0].plan;p.goals.push({id:'gx',long:'장기목표 확인 필요',short:'1. 무엇인가 함.',plan:'',activity:'',target:'',src:'',longSince:''},{id:'gy',long:'',short:'1. 단기목표만 있음.',plan:'',activity:'',target:'',src:'',longSince:''});
  const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.$$('#carryLongList .carry-row').length===5,'미완성 장기목표는 목록에 안 나옴');
  t.change(rowOf(t,/개인위생에 대한/).querySelector('input'),false);t.change(rowOf(t,/원만한 관계/).querySelector('input'),true);t.click('[data-act="carry-now"]');
  const ids=t.ev("member().plan.goals.map(g=>g.id)");ok(ids[0]==='g1'&&ids[1]==='g2'&&!['g3','gx','gy'].includes(ids[2])&&ids[3]==='gx'&&ids[4]==='gy','바뀐 줄만 바뀜',ids);
 }
 console.log('[5] 과거 재활문서에 이 프로그램의 메모장 계획서를 붙여 넣은 경우');
 {const t=boot(DIR,{stored:stored57({withLegacy:false})});
  // 다른 계획서를 메모장 글로 만들어 과거 문서로 등록
  const txt=t.ev("(()=>{const x=JSON.parse(JSON.stringify(member()));x.plan.goals[0].long='스스로 하루 일과를 계획하고 지킴.';x.plan.strength[0]='아침에 스스로 일어남.';return blocksToTxt(buildDocument(x,'plan'))})()");
  t.ev(`(()=>{const m=member();legacyDraftMemberId=m.id;legacyDraft={...emptyLegacyDraft(),type:'plan',entryMode:'plain',title:'예전 계획',start:'2024-04-01',end:'2024-09-30',text:${JSON.stringify(txt)}};saveLegacy(m)})()`);
  const L=t.ev('member().bank.long.map(x=>x.text)'),S=t.ev('member().bank.strength.map(x=>x.text)');
  ok(L.includes('스스로 하루 일과를 계획하고 지킴.'),'메모장 글의 장기목표를 보관함에',L);
  ok(S.includes('아침에 스스로 일어남.'),'메모장 글의 강점도',S);
  const it=t.ev("member().bank.long.find(x=>x.text==='스스로 하루 일과를 계획하고 지킴.')");ok(it.since==='2024-09-30'||it.since==='2024-04-01','날짜 = 과거 문서 기간',it);
 }
 console.log('[6] 이전 계획 복원 — 지금 계획서도 보관함에 남음');
 {const t=boot(DIR,{stored:stored57()});t.ev("member().plan.goals[2].long='새로 써 본 장기목표 문구임.'");t.ev("state.view='plan';paint()");
  t.click('[data-act="restore-plan"]');
  ok(IDS(t.ev("member().plan.goals"))==='g1,g2,g0','이전 계획 복원');
  ok(t.ev("member().bank.long.some(x=>x.text==='새로 써 본 장기목표 문구임.')"),'복원 전 지금 계획서의 장기목표가 보관함에');
 }
 console.log('[7] 회원을 바꾸면 고르던 상태 초기화');
 {const st=stored57();const m2=member57();m2.id='mem-b';m2.label='회원 002';m2.planArchive=[];m2.legacyDocs=[];m2.plan.goals=m2.plan.goals.slice(0,1);st.members.push(m2);
  const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.change(rowOf(t,/원만한 관계/).querySelector('input'),true);ok(t.ev('carryUI.sel.long.length')===4||t.ev('carryUI.sel.long.length')===3,'회원1에서 고르는 중');
  t.change('#memberPicker','mem-b');ok(t.$$('#carryLongList .carry-row').length===1&&t.ev("carryUI.id")==='mem-b','회원2로 바꾸면 회원2 목록(1개)만',t.$$('#carryLongList .carry-row').length);
 }
 console.log('[8] 저장·확정 때 보관함에 남김');
 {const t=boot(DIR,{stored:stored57({bank:{long:[],strength:[],weakness:[]}})});
  ok(t.ev('member().bank.long.length')===0,'빈 보관함(다시 채우지 않음)');
  t.ev("state.view='plan';paint()");t.click('[data-act="save-document"]');
  ok(t.ev('member().bank.long.length')===3&&t.ev('member().bank.strength.length')===2,'저장하면 지금 계획서 항목이 들어감',t.ev('member().bank'));
  t.ev("member().plan.goals[0].long='확정 전에 고친 장기목표임.'");t.click('[data-act="finalize-doc"]');
  ok(t.ev("member().bank.long.some(x=>x.text==='확정 전에 고친 장기목표임.')"),'최종 확정해도 들어감');
 }
 console.log('[9] 보관함은 40개까지(오래된 것부터 지움)');
 {const t=boot(DIR,{stored:stored57()});t.ev("for(let i=0;i<60;i++)bankAdd(member(),'strength','시험 강점 '+i+'번 항목임.','2026-01-01','2026-'+String(1+(i%12)).padStart(2,'0')+'-'+String(1+(i%28)).padStart(2,'0'))");
  ok(t.ev("member().bank.strength.length")===40,'40개',t.ev("member().bank.strength.length"));
  t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.$$('#carryChips-strength .carry-chip').length===12&&/더 보기/.test(t.$('#carryChips-strength').textContent),'칩은 12개만 보이고 더 보기',t.$$('#carryChips-strength .carry-chip').length);
  t.click('[data-act="carry-more"][data-kind="strength"]');ok(t.$$('#carryChips-strength .carry-chip').length>=40&&/접기/.test(t.$('#carryChips-strength').textContent),'더 보기 누르면 모두(40개 이상) · 접기',t.$$('#carryChips-strength .carry-chip').length);
 }
 console.log('[10] 모든 메뉴 화면 오류 없음');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('both')");
  for(const v of ['notes','legacy','analysis','ai','plan','evaluation','learning','references','backup']){t.ev(`state.view='${v}';paint()`);ok(!/화면 표시 중 오류/.test(t.$('#content').textContent),v+' 화면',t.$('#content').textContent.slice(0,200))}
  ok(t.errors.length===0,'스크립트 오류 없음',t.errors);
 }
 console.log('[11] 새 회원(자료 없음)은 불러오기 칸이 안 보임');
 {const t=boot(DIR,{});t.ev("state.view='plan';paint()");ok(!!t.$('#carryPanel')&&/이전에 쓴 내용이 없습니다/.test(t.$('#carryPanel').textContent),'새 회원도 칸은 보이고(직접 입력용) 목록은 비어 있음');ok(JSON.stringify(t.ev('member().bank'))==='{"long":[],"strength":[],"weakness":[]}','빈 보관함');}
 console.log('[12] 메모장(.txt) 내려받기는 그대로');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='plan';paint()");t.click('[data-act="download-txt"]');ok(t.logs.some(l=>l[0]==='download'&&/\.txt$/.test(l[1])),'메모장 파일 내려받음',t.logs.filter(l=>l[0]==='download'));
  const txt=t.ev("blocksToTxt(buildDocument(member(),'plan'))");ok(!/이전 계획서 불러오기|다음 계획서/.test(txt),'메모장 글에 불러오기 칸 내용 없음')}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
