// 가상 회원 자료(실제 인물·기관 아님)
const note=(date,topic,content,result,opinion='')=>({date,topic,content,result,counselorOpinion:opinion,included:true});
const notes=()=>[
 note('2026-04-10','산책 프로그램','산책 프로그램에 참여하여 호수공원을 다녀옴. 회원은 “걸으니까 기분이 좋다”라고 말함.','산책 프로그램에 끝까지 참여함.'),
 note('2026-05-08','복약 점검','회원이 스스로 약을 챙겨 먹고 있다고 함. 정신건강의학과 외래 진료에 동행함.','복약을 스스로 챙김.'),
 note('2026-06-12','위생 점검','샤워를 주 2회 하고 있음. 직원이 위생교육을 실시함.','위생교육에 참여함.'),
 note('2026-07-03','금전관리 상담','용돈 기입장 작성을 어려워함. 군것질 지출이 많음.','금전관리 상담을 실시함.'),
 note('2026-08-14','산책 프로그램','산책 프로그램 참여를 거부함. 회원은 “오늘은 힘들어서 안 갈래요”라고 말함.','산책 프로그램에 불참함.'),
 note('2026-09-18','요리 프로그램','요리 프로그램에 참여하여 동료와 함께 김밥을 만듦.','요리 프로그램에 참여함.')];
const goal=(id,long,short,plan,target,longSince='')=>({id,long,short,plan,activity:plan,target,src:'상담일지 1',longSince});
function member57({bank,carry,withArchive=true,withLegacy=true}={}){
 const m={id:'mem-a',label:'회원 001',notes:notes(),periodStart:'2026-04-01',periodEnd:'2026-09-30',abilityLevel:'보통',
  plan:{memberVoice:'“걸으니까 기분이 좋다”',memberNeed:'- 산책을 꾸준히 하기를 희망함.',familyVoice:'',familyNeed:'',managerNeed:'1. 생활리듬 유지',managerBasis:'',psycho:Array(8).fill('▪ 해당사항 없음.'),
   strength:['산책 프로그램에 꾸준히 참여함.','복약을 스스로 챙김.',''],weakness:['금전 관리에 어려움이 있음.','기분에 따라 활동 참여가 줄어듦.',''],swUses:'1',swSince:'2026-04-01',
   goals:[goal('g1','규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.','1. 산책 프로그램에 주 2회 참여함.\n2. 참여한 날을 점검표에 표시함.','- 산책 프로그램 참여를 지원할 계획임.\n- 월 1회 점검표를 함께 확인할 계획임.','- 산책 프로그램 주 2회 참여\n- 점검표 월 4회 표시','2025-04-01'),
    goal('g2','정신과적 증상에 대한 대처능력을 향상시키고 안정적인 일상생활을 유지함.','1. 처방대로 약을 복용함.\n2. 외래 진료에 빠짐없이 참여함.','- 복약 점검을 실시할 계획임.\n- 외래 진료에 동행할 계획임.','- 복약 점검 월 4회\n- 외래 진료 월 1회','2025-04-01'),
    goal('g3','개인위생에 대한 자기관리능력을 향상시켜 건강한 생활습관을 유지함.','1. 주 3회 샤워함.\n2. 위생교육에 참여함.','- 위생 점검을 실시할 계획임.\n- 위생교육을 실시할 계획임.','- 샤워 주 3회\n- 위생교육 월 1회','2026-04-01')],
   services:[{type:'사회심리재활',service:'■ 산책 프로그램',resource:'■ 내부자원'}],opinion:'- 생활리듬 유지를 위한 계획을 세움.',needSrc:{member:'manual',family:'auto'}},
  evaluation:{participation:[{type:'사회심리재활',service:'',resource:''}],goals:[],overall:'',opinion:''},
  planArchive:withArchive?[{savedAt:'2026-04-01T09:00:00.000Z',plan:{memberVoice:'',memberNeed:'',familyVoice:'',familyNeed:'',managerNeed:'',managerBasis:'',psycho:Array(8).fill(''),
   strength:['요리 프로그램에 관심이 많음.','직원의 안내를 잘 따름.',''],weakness:['금전 관리에 어려움이 있음.','군것질이 잦음.',''],swUses:'2',swSince:'2025-04-01',
   goals:[goal('g1','규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.','1. 산책 프로그램에 주 1회 참여함.','- 산책 프로그램 참여를 지원할 계획임.','- 주 1회 참여','2025-04-01'),
    goal('g2','정신과적 증상에 대한 대처능력을 향상시키고 안정적인 일상생활을 유지함.','1. 처방대로 약을 복용함.','- 복약 점검을 실시할 계획임.','- 복약 점검 월 4회','2025-04-01'),
    goal('g0','합리적인 금전사용 및 자립생활 관리 능력을 향상시킴.','1. 용돈 기입장을 함께 확인함.','- 금전관리 상담을 실시할 계획임.','- 월 1회 확인','2025-04-01')],
   services:[],opinion:''}}]:[],
  evalArchive:[],
  legacyDocs:withLegacy?[{id:'leg1',type:'plan',title:'2024 하반기 계획서',start:'2024-10-01',end:'2025-03-31',text:'x',useAI:false,entryMode:'structured',
   structured:{plan:{goals:[{id:'lg1',long:'타인과 원만한 관계를 형성하고 유지함.',short:'1. 사회기술훈련에 참여함.',plan:'',activity:'',target:''}],strength:['동료에게 먼저 인사함.','',''],weakness:['낯선 사람 앞에서 긴장함.','','']}},createdAt:'2025-04-02T00:00:00.000Z',updatedAt:'2025-04-02T00:00:00.000Z'}]:[]};
 if(bank!==undefined)m.bank=bank;if(carry!==undefined)m.carry=carry;
 return m}
function stored57(opts){return{members:[member57(opts)],memberId:'mem-a',save:true,references:[],activityDict:[],writerProfiles:[{id:'writer-default',name:'기본 작성자',planStyle:'',evaluationStyle:''}],writerId:'writer-default'}}
module.exports={member57,stored57,notes};
