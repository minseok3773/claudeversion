// 가상 회원 2명(실제 인물·기관 아님)
const {member57,stored57}=require('./fix57.js');
const noteB=(date,topic,content,result)=>({date,topic,content,result,counselorOpinion:'',included:true});
function memberB(){const m=member57({withArchive:false,withLegacy:false});m.id='mem-b';m.label='회원 002';
 m.notes=[noteB('2026-04-15','텃밭 활동','텃밭 활동에 참여하여 상추와 방울토마토 모종을 심고 물을 주었으며 다음 주 화요일 오전에 다시 와서 자란 모습을 사진으로 찍어 동료들에게 보여 주겠다고 함. 회원은 “흙을 만지니 마음이 편하다”라고 말함.','텃밭 활동에 끝까지 참여함.'),
  noteB('2026-06-20','구직 상담','이력서 작성을 직원과 함께 연습함. 고용센터 방문 일정을 정함.','이력서 초안을 완성함.')];
 m.plan.goals=[{id:'b1',long:'직업적 자립을 위한 구직 준비 능력을 향상시킴.',short:'1. 이력서를 직접 작성함.',plan:'- 이력서 작성을 도울 계획임.',activity:'- 이력서 작성',target:'- 이력서 1부 완성',src:'상담일지 2',longSince:'2026-04-01'}];
 m.plan.strength=['텃밭 활동에 성실히 참여함.','',''];m.plan.weakness=['면접 상황에서 긴장함.','',''];return m}
function stored58(opts={}){const st=stored57(opts);st.members.push(memberB());return st}
module.exports={stored58,memberB};
