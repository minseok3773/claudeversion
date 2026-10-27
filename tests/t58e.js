// v3.21.57 — 빈 계획서에 이전 장기목표 넣기, AI 작성 뒤 목록 갱신
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const F=a=>(a||[]).filter(g=>String(g.long||g.short||'').trim());const IDS=a=>F(a).map(g=>g.id).join();
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const rowOf=(t,re)=>t.$$('#carryLongList .carry-row').find(r=>re.test(r.textContent));
(async()=>{
 console.log('[1] 빈 계획서(빈 줄 2개)에 이전 장기목표 2개 넣기');
 {const st=stored57();const p=st.members[0].plan;p.goals=[{id:'e1'},{id:'e2'}];p.strength=['','',''];p.weakness=['','',''];p.swUses='';
  const t=boot(DIR,{stored:st});t.ev("state.view='plan';carryUI.open=true;paint()");
  ok(t.$$('#carryLongList input:checked').length===0,'처음엔 아무것도 체크 안 됨');
  t.change(rowOf(t,/생활리듬/).querySelector('input'),true);t.change(rowOf(t,/원만한 관계/).querySelector('input'),true);
  t.click(t.$$('#carryChips-strength .carry-chip').find(c=>/요리 프로그램에 관심/.test(c.textContent)));
  t.click('[data-act="carry-now"]');
  const conf=t.logs.filter(l=>l[0]==='confirm').pop()[1];ok(!/뺌:/.test(conf)&&(conf.match(/새로 넣음/g)||[]).length===2,'빈 줄은 ‘뺌’ 없이 채움',conf);
  const g=F(t.ev('member().plan.goals'));ok(g.length===2&&/생활리듬/.test(g[0].long)&&/원만한 관계/.test(g[1].long),'빈 줄 2개가 고른 장기목표로',g.map(x=>x.long));
  ok(g.every(x=>/^1\./.test(x.short)&&x.longSince),'단기목표 채우고 고정',g.map(x=>x.short));
  ok(t.ev('member().plan.strength[0]')==='요리 프로그램에 관심이 많음.','강점 넣음');
 }
 console.log('[2] AI 작성 뒤 불러오기 목록이 새 계획서 기준으로 바뀜');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});t.ev("state.view='plan';carryUI.open=true;paint()");
  t.change(rowOf(t,/원만한 관계/).querySelector('input'),false);
  await t.ev("runLocalAI('plan')");
  t.ev("state.view='plan';paint()");
  const chk=t.$$('#carryLongList input:checked').map(x=>x.closest('.carry-row').textContent);
  ok(chk.length===4&&chk.every(x=>/지금 목표/.test(x)),'새 계획서의 장기목표 4개(지금 2 + AI 2)가 체크됨',chk);
  const sw=t.$$('#carryChips-strength .carry-chip.on').map(c=>c.textContent);ok(sw.length===3&&sw.some(x=>/김밥/.test(x)),'강점도 새 계획서 기준(빈칸은 채워진 3개, v3.21.65)',sw);
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
