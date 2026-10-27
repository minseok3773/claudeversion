// 가짜 Gemini 응답(가상 자료) — 단계별 JSON
const AREA=[
 [/생활리듬|일상활동|산책/, {short:['산책 프로그램에 주 2회 참여함.','참여한 날을 점검표에 동그라미로 표시함.'],plan:['산책 프로그램 참여 일정을 회원과 함께 정할 계획임(과제중심모델)','점검표를 주 1회 함께 확인하고 칭찬할 계획임(행동주의모델)'],target:['산책 프로그램 주 2회 이상 참여','점검표 표시 월 4회 이상']}],
 [/정신과적|증상|복약/, {short:['처방대로 약을 복용함.','외래 진료에 빠짐없이 참여함.'],plan:['복약 점검을 주 1회 실시할 계획임(인지행동모델)','외래 진료에 동행할 계획임(임파워먼트모델)'],target:['복약 점검 월 4회','외래 진료 월 1회 참여']}],
 [/위생/, {short:['주 3회 샤워함.','위생교육에 월 1회 참여함.'],plan:['위생 점검을 주 1회 실시할 계획임(행동주의모델)','위생교육을 월 1회 실시할 계획임(과제중심모델)'],target:['샤워 주 3회 이상','위생교육 월 1회 참여']}],
 [/관계|대인/, {short:['사회기술훈련에 월 2회 참여함.','동료에게 먼저 인사함.'],plan:['사회기술훈련 참여를 도울 계획임(인지행동모델)','동료와 인사 나누기를 연습할 계획임(행동주의모델)'],target:['사회기술훈련 월 2회 참여','동료에게 먼저 인사 주 3회 이상']}],
 [/금전|용돈|지출/, {short:['용돈 기입장을 주 1회 함께 확인함.','군것질 지출을 주 2회 이하로 줄임.'],plan:['용돈 기입장을 주 1회 함께 확인할 계획임(과제중심모델)','군것질 지출을 함께 점검할 계획임(문제중심모델)'],target:['용돈 기입장 확인 주 1회','군것질 지출 주 2회 이하']}]];
function pickArea(long){for(const [re,v] of AREA)if(re.test(long))return v;return AREA[0][1]}
function stepOf(prompt){if(/\[실천모델 평가\]/.test(prompt))return 'C';if(/\[현재 승인·작성된 장기목표/.test(prompt))return 'B';if(/상담일지의 진술·관찰·의사 소견을 종합하여/.test(prompt))return 'A';return '?'}
function makeAI({newLongs=[]}={}){return body=>{const p=String(body.prompt||'');const st=stepOf(p);
 if(st==='A')return{memberDialogue:'“걸으니까 기분이 좋다”',familyDialogue:'“꾸준히 운동했으면 좋겠어요.”',memberNeed:'- 산책을 꾸준히 하기를 희망함.',familyNeed:'- 가족은 회원이 건강하게 지내기를 희망함.',
  managerItems:[{title:'생활리듬 유지',reason:'산책 프로그램 참여를 거부한 날이 있음.',src:[1,5]},{title:'금전관리',reason:'용돈 기입장 작성을 어려워함.',src:[4]}],
  psycho:{primarySupport:'',socialEnvironment:'',education:'',employment:'',housing:'',finance:'용돈 관리가 어려움.',physicalHealth:'',otherPsychosocial:''},
  strength:['요리 프로그램에서 동료와 함께 김밥을 만듦.','외래 진료에 빠짐없이 참여함.','샤워를 주 2회 함.'],weakness:['산책 프로그램 참여를 거부한 날이 있음.','용돈 기입장 작성을 어려워함.','군것질 지출이 많음.'],opinion:'- 생활리듬을 유지하도록 계획함.'};
 if(st==='B'){const sec=p.split('[현재 승인·작성된 장기목표 — 변경하지 말고 단기목표를 연결]')[1]||'';const lines=sec.split('\n').slice(1).filter(l=>/^\d+\. goalId=/.test(l));
  const goals=lines.map(l=>{const mt=/^\d+\. goalId=(\S+) \/ 장기목표=(.*)$/.exec(l);const v=pickArea(mt[2]);return{goalId:mt[1],long:mt[2],short:v.short,plan:v.plan,activity:v.plan,target:v.target,src:[1]}});
  for(const long of newLongs){const v=pickArea(long);goals.push({goalId:'',long,short:v.short,plan:v.plan,activity:v.plan,target:v.target,src:[4]})}
  if(!goals.length)for(const long of ['규칙적인 생활리듬을 유지함.','정신과적 증상을 스스로 관리함.','합리적으로 금전을 사용함.']){const v=pickArea(long);goals.push({goalId:'',long,short:v.short,plan:v.plan,activity:v.plan,target:v.target,src:[1]})}
  return{goals,services:[{type:'사회심리재활',service:'■ 프로그램(산책, 요리)',resource:'■ 내부자원'},{type:'건강관리',service:'■ 정신건강의학과 진료',resource:'■ 외래 진료 기관'}]}}
 if(st==='C'){const items=[...p.matchAll(/목표 \d+: goalId=(\S+) \/ 단기목표 원문/g)].map(x=>x[1]);
  return{participation:[{type:'사회심리재활',service:'∎ 프로그램(산책, 요리)',resource:'∎ 내부자원(사례관리자)'}],
   goals:items.map((id,i)=>({goalId:id,activity:['산책 프로그램에 참여하여 호수공원을 다녀옴.','점검표를 함께 확인함.'],result:['산책 프로그램에 참여함. 성과목표 부분 달성함.','점검표를 확인함. 성과목표 달성함.'],analysis:'- 참여가 이어짐.',achMember:i===0?'- 복약을 스스로 챙김.':'해당사항 없음',achStaff:'- 직원이 참여를 독려함.',blockMember:i===0?'“오늘은 힘들어서 안 갈래요”':'해당사항 없음',blockStaff:'해당사항 없음'})),
   overall:'- 목표 활동에 참여함.',opinion:'- 산책 참여를 이어 감.'}}
 return{}}}
module.exports={makeAI,stepOf};
