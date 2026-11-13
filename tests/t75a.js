// v3.23.9 — 프로그램이 AI 글을 임의로 바꾸거나 지우던 곳 고침 (가상 자료만 사용)
const {boot,ok,done}=require('./h.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
(async()=>{
 const t=boot(DIR);const ev=t.ev;
 console.log('[1] 전문 용어·정도 표현을 바꾸지 않음');
 {const r=ev(`plainKo("대인관계 증진하기. 방안을 모색함. 안정을 도모함. 일상생활을 영위함. 회원은 너무 많이 먹어 매우 힘들어함. 물건을 훔쳐 문제가 됨.")`);
  ok(/증진하기/.test(r)&&/모색함/.test(r)&&/도모함/.test(r)&&/영위함/.test(r),'증진·모색·도모·영위 유지',r);
  ok(/너무 많이/.test(r)&&/매우 힘들어함/.test(r),'정도 표현 유지',r);
  ok(/훔쳐/.test(r),'‘훔쳐’를 다른 말로 바꾸지 않음',r);
  ok(/참여함/.test(ev(`plainKo("참여하는 모습을 보임.")`)),'문체 정리(~하는 모습을 보임 → ~함)는 그대로');}
 console.log('[2] 판정을 다른 단기목표로 옮겨 붙이지 않음');
 {const r=ev(`distributeParts(["주 2회 산책","월 1회 장보기","하루 1회 약 복용"],["산책은 주 2회 하여 성과목표 달성함","장보기는 1번 함"],"res")`);
  ok(!/달성/.test(r[1])&&/판정 확인 필요/.test(r[1]),'판정 없는 항목은 ‘판정 확인 필요’',r[1]);}
 console.log('[3] ○가 든 문장: 상담일지에 같은 표현이 있으면 남김');
 ok(ev(`isForeign("○○병원 외래 진료에 월 1회 동행함.",{topic:"○○병원 외래 진료",keep:""})`)===false,'○○병원(상담일지에 있음) 유지');
 ok(ev(`isForeign("○○ 프로그램에 참여함.",{topic:"상담",keep:""})`)===true,'상담일지에 없는 ○○ 자리표시는 뺌');
 console.log('[4] 개인정보 가리기: 횟수 표현을 주소로 보지 않음, 가명은 되돌림');
 {const r=ev(`maskPII("앞으로 2, 3회로 늘림. 산책로 1. 중앙로 12 거주. 101동 202호. 김민수 회원과 상담함.","")`);
  ok(/앞으로 2, 3회/.test(r)&&/산책로 1\./.test(r),'앞으로 2, 3회·산책로 1 그대로',r);
  ok((r.match(/\[주소\]/g)||[]).length===2,'실제 주소 형식은 가림',r);
  ok(ev(`safeJson('{"a":"'+maskPII("김민수 회원","").replace(/"/g,'')+'이 참여함"}').a`)==='김민수 회원이 참여함','AI 답의 가명을 원래 이름으로 되돌림');}
 console.log('[5] 심리사회: 한 칸 어긋나 보여도 8칸 전부를 바꾸지 않음');
 {const keys=ev('PSYCHO_AREA_KEYS');const raw={};keys.forEach((k,i)=>raw[k]='▪ AI가 쓴 영역 '+(i+1)+' 내용임.');
  ok(ev(`psychoSafe(${JSON.stringify(raw)},state.members[0]||{notes:[]})`)===null,'8영역이 다 있으면 AI 글을 그대로 씀');}
 console.log('[6] 회원 달성·방해 요인 4줄 제한 없앰');
 ok(ev(`memberFactor("- 가\\n- 나\\n- 다\\n- 라\\n- 마")`).split('\n').length===5,'5줄 모두 유지');
 console.log('[7] 소스 확인');
 {const src=require('fs').readFileSync(require('path').join(DIR,'app.js'),'utf8');
  ok(!/참여율 80% 이상\(협의 후 확정\)/.test(src),'성과목표 틀 문장(80%·협의 후 확정) 없음');
  {const f=src.slice(src.indexOf('function improveAIGoals('),src.indexOf('\n}',src.indexOf('function improveAIGoals(')));ok(f.length>100&&!/월 1회 정기상담에서 실천 여부/.test(f)&&!/할 계획임/.test(f),'AI 재활계획에 정해진 문장 덧붙이기 없음(규칙 기반 작성은 그대로)')}
  ok(!/replace\(\/관찰됨\|관찰되었음\/g,'상담기록에 보고됨'\)/.test(src),'관찰됨 일괄 변경 없음');
  ok(/프로그램이 AI 글을 고치거나 채운 곳/.test(src),'완료 창에 프로그램 처리 안내를 보여 줌');}
 done();
})();
