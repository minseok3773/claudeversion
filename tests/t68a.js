// v3.21.68 — 문서 점검(AI 없이 규칙으로 확인해 볼 곳 찾기) 규칙 시험 (가상 자료만 사용)
const {ok,done}=require('./h.js');const path=require('path');
const C=require(path.resolve(__dirname,'../document-check.js'));
const labels=r=>r.items.map(x=>x.label+' | '+x.message);
const has=(r,label,re)=>r.items.some(x=>x.label===label&&re.test(x.message));
const note=(number,date,text)=>({number,date,text});
const goal=(o={})=>({id:'g1',long:'규칙적인 생활리듬을 유지함.',short:'산책 프로그램에 주 2회 참여함.',plan:'산책 일정을 회원과 정할 계획임.',activity:'산책 프로그램 참여 지원',target:'산책 프로그램 주 2회 참여',...o});
const egoal=(o={})=>({goalId:'g1',short:'산책 프로그램에 주 2회 참여함.',activity:'산책 프로그램 참여를 지원함.',indicator:'산책 프로그램 참여율 80% 이상',result:'산책 프로그램에 참여함.',analysis:'참여가 늘어남.',...o});
const member=(o={})=>({periodStart:'2026-04-01',periodEnd:'2026-09-30',plan:{goals:[goal()]},evaluation:{goals:[egoal()],participation:[{type:'일상생활',service:'산책 프로그램 제공',resource:'시설 차량'}]},doctorLetter:{sections:{}},...o});
const NOTES=[note(1,'2026-04-10','산책 프로그램에 참여하여 호수공원을 다녀옴.'),note(2,'2026-05-08','산책 프로그램에 참여함. 회원은 “걸으니 좋다”라고 말함.'),note(3,'2026-06-12','오늘 산책 프로그램에 참석함.'),note(4,'2026-08-14','산책 프로그램 참여를 거부함.'),note(5,'2026-09-01','요리 프로그램에 참여함.')];
(()=>{
 console.log('[1] 재활계획서: 빈 칸·측정 기준·확인 필요 표시');
 {let r=C.run(member(),'plan');ok(r.items.length===0,'잘 채운 계획서는 표시 없음',labels(r));
  r=C.run(member({plan:{goals:[goal({activity:'',target:''}),{id:'g2',long:'',short:'',plan:'',activity:'',target:''}]}}),'plan');
  ok(has(r,'목표 1 · 세부 활동 내용',/비어 있습니다/)&&has(r,'목표 1 · 성과목표',/비어 있습니다/),'쓰다 만 목표의 빈 칸',labels(r));
  ok(!r.items.some(x=>/목표 2/.test(x.label)),'아예 비어 있는 목표 줄(빈 칸)은 표시하지 않음');
  r=C.run(member({plan:{goals:[goal({target:'스스로 약을 챙겨 먹음.'})]}}),'plan');ok(has(r,'목표 1 · 성과목표',/확인할 수 있는 기준/),'횟수·기간이 없는 성과목표',labels(r));
  for(const t of ['산책 프로그램 주 2회 참여','매일 처방대로 복약함','한 달에 두 번 장보기','참여율 80% 이상','3개월 동안 외래 진료 빠짐없음'])ok(!C.run(member({plan:{goals:[goal({target:t})]}}),'plan').items.length,'측정 기준이 있으면 표시 없음: '+t);
  ok(C.run(member({plan:{goals:[goal({target:'회원이 스스로 복약함'})]}}),'plan').items.some(x=>/확인할 수 있는 기준/.test(x.message)),'‘회원’의 ‘회’를 횟수로 보지 않음');
  r=C.run(member({plan:{memberNeed:'산책을 꾸준히 하기를 희망함(확인 필요)',familyVoice:'“잘 지냈으면 좋겠다”(화자 미확인)',goals:[goal()]}}),'plan');
  ok(has(r,'회원 욕구 기술',/확인 필요/)&&has(r,'가족의 주관적 호소',/확인 필요/),'‘확인 필요’·‘화자 미확인’ 표시',labels(r));
  ok(r.items.every(x=>/^plan\./.test(x.path)),'해당 칸 주소',r.items.map(x=>x.path));
  ok(!C.run(member({plan:{goals:[goal({plan:'산책 일정을 함께 정할 계획임.',activity:'주 2회 동행할 예정임.'})]}}),'plan').items.length,'계획서의 앞으로 할 일 표현은 정상(표시 없음)');
 }
 console.log('[2] 재활평가서: 빈 칸·목표 연결·앞으로 할 일 표현');
 {let r=C.run(member(),'evaluation',{notes:NOTES});ok(r.items.length===0,'잘 채운 평가서는 표시 없음',labels(r));
  r=C.run(member({evaluation:{goals:[egoal({result:'',analysis:''}),{goalId:'',short:'',activity:'',indicator:'',result:'',analysis:''}],participation:[]}}),'evaluation',{notes:NOTES});
  ok(has(r,'목표 1 · 성과목표 달성 내용',/비어 있습니다/)&&has(r,'목표 1 · 분석',/비어 있습니다/)&&!r.items.some(x=>/목표 2/.test(x.label)),'쓰다 만 평가 목표만',labels(r));
  r=C.run(member({evaluation:{goals:[egoal({goalId:'old-1'})],participation:[]}}),'evaluation',{notes:NOTES});ok(has(r,'목표 1 · 평가 단기목표',/연결되어 있지 않습니다/),'지금 계획서와 연결되지 않은 평가 목표',labels(r));
  for(const flag of ['pastPlan','keepGoals'])ok(!C.run(member({evaluation:{goals:[egoal({goalId:'old-1'})],participation:[],[flag]:true}}),'evaluation',{notes:NOTES}).items.length,`이전 계획 평가·붙여 넣은 목표(${flag})는 연결 표시 안 함`);
  r=C.run(member({evaluation:{goals:[egoal({activity:'다음 기간에는 주 3회로 늘릴 계획임.'})],participation:[{type:'건강',service:'복약 점검을 실시할 예정임.',resource:''}]}}),'evaluation',{notes:NOTES});
  ok(has(r,'목표 1 · 평가 세부활동',/앞으로 할 일/)&&has(r,'참여 재활 활동 1 · 제공 서비스',/앞으로 할 일/),'실제 활동 칸의 앞으로 할 일 표현',labels(r));
  for(const a of ['회원과 산책 일정을 함께 정할 계획을 세움.','주 2회 참여할 계획이었으나 1회만 참여함.','외래 진료에 동행함.'])ok(!C.run(member({evaluation:{goals:[egoal({activity:a})],participation:[]}}),'evaluation',{notes:NOTES}).items.length,'실시한 일은 표시 없음: '+a);
 }
 console.log('[3] 횟수·비율 계산과 달성 판정');
 {const ev=o=>C.run(member({evaluation:{goals:[egoal(o)],participation:[]}}),'evaluation',{notes:[]});
  let r=ev({result:'산책 프로그램에 8회 중 9회 참여함.'});ok(has(r,'목표 1 · 성과목표 달성 내용',/전체 횟수보다 많습니다/),'참여 횟수가 전체보다 많음',labels(r));
  r=ev({result:'산책 프로그램에 8회 중 6회 참여함(80%).'});ok(has(r,'목표 1 · 성과목표 달성 내용',/약 75%인데 80%로/),'비율 계산이 맞지 않음',labels(r));
  ok(!ev({result:'산책 프로그램에 8회 중 6회 참여함(75%).'}).items.some(x=>/비율/.test(x.message)),'맞는 비율은 표시 없음');
  ok(!ev({result:'8회 중 6회 참여하여 목표 80%에 미치지 못함.'}).items.some(x=>/비율/.test(x.message)),'목표 수치는 실적 비율로 보지 않음');
  r=ev({result:'10회 중 6회 참여하여 목표를 달성함.'});ok(has(r,'목표 1 · 성과목표 달성 내용',/달성했다고 적었지만 적힌 실적 60%는 목표\(80% 이상\)에 못 미칩니다/),'달성이라 썼지만 목표 미만',labels(r));
  r=ev({result:'10회 중 9회 참여함.',analysis:'목표 미달성으로 판단함.'});ok(has(r,'목표 1 · 성과목표 달성 내용',/미달성으로 적었지만 적힌 실적 90%/),'미달성이라 썼지만 목표 충족',labels(r));
  ok(!ev({result:'10회 중 9회 참여하여 목표를 달성함.'}).items.length,'판정과 실적이 맞으면 표시 없음');
  ok(!ev({result:'10회 중 6회 참여하여 부분 달성함.'}).items.length,'부분 달성은 판정 비교 안 함');
  ok(!ev({indicator:'산책 주 2회 참여',result:'10회 중 6회 참여하여 목표를 달성함.'}).items.length,'목표에 %기준이 없으면 판정 비교 안 함');
 }
 console.log('[4] 참여 횟수와 체크한 상담일지의 참여 기록 수');
 {const ev=(o,notes=NOTES)=>C.run(member({evaluation:{goals:[egoal(o)],participation:[]}}),'evaluation',{notes});
  let r=ev({result:'산책 프로그램에 4회 참여함.'});const it=r.items.find(x=>/참여 기록은/.test(x.message));
  ok(it&&/‘산책’ 참여를 4회로 적었는데, 체크한 상담일지\(평가기간 안\)에서 찾은 참여 기록은 3건입니다/.test(it.message)&&/출석부 등과 대조/.test(it.message),'적은 횟수와 상담일지의 참여 기록 수가 다름',labels(r));
  ok(it&&JSON.stringify(it.refs)==='[{"number":1,"date":"2026-04-10"},{"number":2,"date":"2026-05-08"},{"number":3,"date":"2026-06-12"}]','찾은 기록 번호·날짜(거부한 날은 빼고)',it&&it.refs);
  ok(!ev({result:'산책 프로그램에 3회 참여함.'}).items.length,'같으면 표시 없음');
  ok(ev({result:'산책 프로그램에 총 8회 중 4회 참여함.'}).items.some(x=>/4회로 적었는데/.test(x.message)),'‘8회 중 4회 참여’도 참여 횟수(4회)로 비교');
  ok(!ev({result:'산책 프로그램에 주 2회 참여함.'}).items.some(x=>/참여 기록은/.test(x.message)),'‘주 2회’ 같은 빈도는 비교하지 않음');
  ok(!ev({result:'산책 프로그램에 4회 참여함.'},[...NOTES,note(6,'2026-09-20','이번 달 산책 프로그램에 4회 참여함.')]).items.some(x=>/참여 기록은/.test(x.message)),'여러 회기를 묶어 적은 상담일지가 있으면 세지 않음');
  ok(!ev({result:'볼링 프로그램에 4회 참여함.'}).items.some(x=>/참여 기록은/.test(x.message)),'상담일지에 그 활동 기록이 없으면 비교하지 않음');
  ok(!ev({result:'프로그램에 4회 참여함.',short:'일상 활동에 참여함.'}).items.some(x=>/참여 기록은/.test(x.message)),'무슨 활동인지 모르면 비교하지 않음');
  r=ev({result:'4회 참여함.'});ok(r.items.some(x=>/‘산책’ 참여를 4회로/.test(x.message)),'문장에 활동명이 없으면 단기목표의 활동명(산책)으로',labels(r));
  ok(!ev({result:'산책 프로그램에 4회 참여함.'},[]).items.some(x=>/참여 기록은/.test(x.message)),'체크한 상담일지가 없으면 비교하지 않음');
 }
 console.log('[5] 확인 필요·자료 부족 표시, 안내');
 {let r=C.run(member({evaluation:{goals:[egoal({result:'자료 부족.',analysis:'평가자료 부족으로 달성 여부를 판단하기 어려움.'})],participation:[]}}),'evaluation',{notes:NOTES});
  ok(has(r,'목표 1 · 성과목표 달성 내용',/자료 부족/)&&!r.items.some(x=>x.label==='목표 1 · 분석'),'‘자료 부족.’만 남은 칸은 표시, 평가 제한을 설명한 문장은 표시 안 함',labels(r));
  r=C.run(member({periodStart:'',periodEnd:''}),'evaluation',{notes:NOTES});ok(r.notices.some(x=>/평가기간이 정해지지 않아/.test(x)),'평가기간이 없을 때 안내');
  r=C.run(member({periodStart:'2026-10-01',periodEnd:'2026-04-01'}),'evaluation',{notes:NOTES});ok(r.notices.some(x=>/시작일이 종료일보다 늦습니다/.test(x)),'기간이 거꾸로일 때 안내');
  r=C.run(member(),'plan',{notes:[]});ok(r.notices.some(x=>/체크한 상담일지가 없어/.test(x)),'체크한 상담일지가 없을 때 안내');
 }
 console.log('[6] 주치의편지');
 {const doc=sections=>C.run(member({doctorLetter:{sections,opinion:''}}),'doctor');
  let r=doc({sleep:{status:'밤에 자주 깸.',intervention:'수면 위생 교육을 실시할 예정임.'},diet:{status:'',intervention:'간식 섭취를 함께 점검함.'},internal:{status:'이용 의료기관(확인 필요)',intervention:''}});
  ok(has(r,'수면 · 개입 내용',/실제로 한 조치만/),'개입 내용의 앞으로 할 일 표현',labels(r));
  ok(has(r,'식습관 · 현 상황',/현 상황이 비어 있습니다/),'개입은 있는데 현 상황이 빈 칸',labels(r));
  ok(has(r,'내과 · 현 상황',/확인 필요/),'‘확인 필요’ 표시',labels(r));
  ok(r.items.every(x=>x.doctor===true&&/^sections\./.test(x.path)),'주치의편지 칸 주소',r.items.map(x=>x.path));
  ok(!doc({sleep:{status:'밤에 자주 깸.',intervention:'수면 위생 교육을 실시함.'}}).items.length,'실제로 한 조치는 표시 없음');
 }
 console.log('[7] 이상한 자료에도 멈추지 않음');
 {let threw=false;try{for(const k of ['plan','evaluation','doctor','x']){C.run(null,k);C.run({},k,{notes:null});C.run({plan:{goals:[null,1,'x']},evaluation:{goals:[null],participation:[null]},doctorLetter:{sections:{sleep:null}}},k,{notes:[{number:'1',text:5},null]})}}catch(e){threw=e}
  ok(!threw,'빈 값·형식이 틀린 값',String(threw));
  const many={plan:{goals:Array.from({length:40},(_,i)=>goal({id:'g'+i,activity:'',target:'',plan:''}))}};ok(C.run(many,'plan').items.length===60,'표시는 60곳까지',C.run(many,'plan').items.length);
 }
 done();
})();
