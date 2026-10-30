'use strict';
// v3.21.68: 문서 점검 — AI를 쓰지 않고 정해진 규칙으로 재활계획서·재활평가서·주치의편지를 훑어
// ‘확인해 볼 곳’을 알려 준다. 문서를 고치지 않고, 저장하거나 밖으로 보내지 않는다.
// 표시는 확인 제안일 뿐 정답 판정이 아니며, 표시가 없다고 내용이 정확하다는 뜻도 아니다.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DocumentCheck=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 const str=v=>typeof v==='string'?v:'';
 const clean=v=>str(v).trim();
 const MAX_ITEMS=60;
 // 아직 채우지 않은 칸이나 확인이 필요하다고 남긴 표시
 const MARK=/\(확인 필요\)|\[확인 필요|확인 필요\]|화자 미확인|화자가 명시된/;
 const PLACEHOLDER_LINE=/^(?:(?:평가\s*)?자료\s*(?:가\s*)?부족(?:함)?\.?|확인된 자료 없음\.?|자료 확인 필요\.?)$/;
 // 이미 한 일을 쓰는 칸에 들어간 ‘앞으로 할 일’ 표현(계획을 함께 세운 일 자체는 실시한 일이므로 잡지 않는다)
 const FUTURE=/(?:할|갈|볼|줄|올|낼|될|릴|킬|칠|을|를)\s*(?:계획|예정)(?:임|이다|입니다|이며|이고)|예정(?:임|이다|입니다)|하기로\s*(?:함|하였음|했음|하였다)|할\s*것(?:임|이다)|하겠(?:음|다|습니다)/;
 const sentences=v=>clean(v).split(/\n+|(?<=[.!?。])\s+/).map(x=>x.trim()).filter(Boolean);
 const placeholder=v=>{const t=clean(v);return !!t&&(MARK.test(t)||t.split(/\n+/).some(l=>PLACEHOLDER_LINE.test(l.replace(/^[-·•*\d.)\s]+/,'').trim())))};
 const measurable=v=>/\d|한\s*번|두\s*번|세\s*번|네\s*번|다섯\s*번|하루|한\s*달|두\s*달|매일|매주|매월|매회|이상|이하|미만|초과|%|퍼센트|개월/.test(clean(v));
 // ---------- 횟수·비율 ----------
 const RATIO=/(?:총\s*|전체\s*|예정(?:된)?\s*)?(\d{1,3})\s*회\s*중\s*(\d{1,3})\s*회/g;
 function ratios(text){const out=[];for(const s of sentences(text))for(const m of s.matchAll(RATIO))out.push({total:Number(m[1]),done:Number(m[2]),sentence:s,index:m.index,end:m.index+m[0].length});return out}
 function percentAfter(r){const rest=r.sentence.slice(r.end,r.end+40),m=/^[^.%\d]{0,25}?(\d{1,3}(?:\.\d+)?)\s*%(?!\s*(?:이상|이하|초과|미만))/.exec(rest);if(!m)return null;
  const before=rest.slice(0,m.index+m[0].length-m[1].length-1);if(/목표|기준|계획/.test(before))return null;return Number(m[1])}
 function targetPercent(indicator){const t=clean(indicator),all=[...t.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%\s*(이상|초과|이하|미만)/g)];if(all.length!==1)return null;const v=Number(all[0][1]);return v>=0&&v<=100?{value:v,op:all[0][2]}:null}
 function actualPercent(text){const vals=new Set();
  for(const r of ratios(text))if(r.total>0&&r.done<=r.total)vals.add(Math.round(r.done/r.total*1000)/10);
  for(const s of sentences(text)){if(/계획|예정|목표로|기준으로|이전\s*평가|지난\s*평가/.test(s))continue;
   for(const m of s.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%(?!\s*(?:이상|이하|초과|미만|p))/g)){const pre=s.slice(Math.max(0,m.index-12),m.index);if(/목표|기준/.test(pre))continue;const v=Number(m[1]);if(v<=100)vals.add(Math.round(v*10)/10)}}
  return vals.size===1?[...vals][0]:null}
 const meets=(a,t)=>t.op==='이상'?a>=t.value:t.op==='초과'?a>t.value:t.op==='이하'?a<=t.value:a<t.value;
 function verdict(text){const t=clean(text);if(/부분\s*달성/.test(t))return 'partial';if(/미달성|달성하지\s*못/.test(t))return 'none';if(/(?:목표를?\s*)?달성(?:함|하였음|했음|하였다)|기준을?\s*충족(?:함|하였음|했음)/.test(t))return 'full';return ''}
 // ---------- 참여 횟수와 상담일지 기록 ----------
 const POS=/참여|참석|출석|다녀오|다녀옴|다녀왔|함께\s*(?:함|했|하였)/;
 const NEG=/불참|거부|참여하지\s*않|참석하지\s*않|출석하지\s*않|빠졌|빠짐|결석|가지\s*않|안\s*갔|참여\s*못|참석\s*못|못\s*갔/;
 const STOP_KW=new Set(['참여','재활','정신','사회','집단','개별','기타','다양한','여러','각종','모든','해당','이번','지난','외부','내부','시설','기관','공동','일상','생활','기본','관련']);
 const ACT_WORDS=['산책','걷기','운동','요리','미술','음악','노래','체육','원예','텃밭','독서','명상','스트레칭','탁구','볼링','등산','수영','영화','공예','봉사','댄스','요가','바리스타','제과','제빵','컴퓨터','서예','배드민턴','게이트볼','장보기','외식','자조모임','사회기술'];
 function keyword(sentence,fallback){
  const pick=s=>{const m=[...clean(s).matchAll(/([가-힣A-Za-z]{2,10})\s?(?:프로그램|교실|모임|훈련|교육)/g)].map(x=>x[1]).filter(x=>!STOP_KW.has(x)).pop();if(m)return m;const w=ACT_WORDS.find(x=>clean(s).includes(x));return w||''};
  return pick(sentence)||pick(fallback)}
 function claims(text){const out=[];
  for(const s of sentences(text)){
   for(const m of s.matchAll(RATIO)){const after=s.slice(m.index+m[0].length,m.index+m[0].length+6);if(POS.test(after)&&!NEG.test(after))out.push({count:Number(m[2]),sentence:s,at:m.index})}
   for(const m of s.matchAll(/(\d{1,3})\s*회\s*(?:참여|참석|출석)(?!하지)/g)){const pre=s.slice(Math.max(0,m.index-8),m.index);
    if(/(?:주|월|일|매주|매월|매일|평균|하루|달에|주에|일주일에|중)\s*$/.test(pre))continue; // 빈도(주 2회 참여)·‘N회 중’은 총 횟수가 아니다
    if(out.some(c=>c.sentence===s&&c.count===Number(m[1])))continue;out.push({count:Number(m[1]),sentence:s,at:m.index})}}
  return out}
 function participationCheck(goal,notes){
  const out=[];if(!notes.length)return out;
  for(const field of ['result','activity','analysis']){
   for(const c of claims(goal[field])){
    const kw=keyword(c.sentence.slice(0,c.at),goal.short)||keyword(c.sentence,goal.short);if(!kw||kw.length<2)continue;
    const hits=[];let ambiguous=false;
    for(const n of notes){const ss=sentences(n.text).filter(s=>s.includes(kw));if(!ss.length)continue;
     if(ss.some(s=>/\d+\s*회/.test(s))){ambiguous=true;break} // 여러 회기를 묶어 적은 기록이 있으면 셀 수 없다
     if(ss.some(s=>POS.test(s)&&!NEG.test(s)))hits.push(n)}
    if(ambiguous||!hits.length||hits.length===c.count)continue;
    out.push({field,message:`‘${kw}’ 참여를 ${c.count}회로 적었는데, 체크한 상담일지(평가기간 안)에서 찾은 참여 기록은 ${hits.length}건입니다. 상담일지에 모든 회기가 적혀 있지 않을 수도 있으니 출석부 등과 대조해 확인하세요.`,
     refs:hits.slice(0,8).map(n=>({number:n.number,date:clean(n.date)}))});
    break}
  }
  return out}
 // ---------- 문서별 점검 ----------
 const activePlanGoal=g=>['long','short','plan','activity','target'].some(k=>clean(g?.[k]));
 const activeEvalGoal=g=>['short','activity','indicator','result','analysis'].some(k=>clean(g?.[k]));
 function plan(member){
  const p=member?.plan||{},items=[],add=(path,label,message,extra={})=>items.push({path,label,message,...extra});
  const goals=Array.isArray(p.goals)?p.goals:[];
  goals.forEach((g,i)=>{if(!activePlanGoal(g))return;const L=`목표 ${i+1} · `;
   for(const [k,name] of [['long','장기목표'],['short','단기목표'],['plan','재활 계획'],['activity','세부 활동 내용'],['target','성과목표']])
    if(!clean(g[k]))add(`plan.goals.${i}.${k}`,L+name,'비어 있습니다.');
   if(clean(g.target)&&!measurable(g.target))add(`plan.goals.${i}.target`,L+'성과목표','확인할 수 있는 기준(횟수·기간·비율 등)이 보이지 않습니다. 회원과 협의해 달성 기준을 정했는지 확인하세요.');
  });
  const marks=[['plan.memberVoice','회원의 주관적 호소'],['plan.memberNeed','회원 욕구 기술'],['plan.familyVoice','가족의 주관적 호소'],['plan.familyNeed','가족 욕구 기술'],['plan.managerNeed','사례관리자가 보는 욕구'],['plan.opinion','사례관리자 의견']];
  for(const [path,label] of marks)if(placeholder(p[path.split('.')[1]]))add(path,label,'‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.');
  (Array.isArray(p.psycho)?p.psycho:[]).forEach((v,i)=>{if(placeholder(v))add(`plan.psycho.${i}`,`심리사회적 욕구 ${i+1}`,'‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.')});
  goals.forEach((g,i)=>{if(!g||typeof g!=='object')return;for(const [k,name] of [['long','장기목표'],['short','단기목표'],['plan','재활 계획'],['activity','세부 활동 내용'],['target','성과목표']])if(clean(g[k])&&placeholder(g[k]))add(`plan.goals.${i}.${k}`,`목표 ${i+1} · ${name}`,'‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.')});
  return items}
 function evaluation(member,notes){
  const e=member?.evaluation||{},items=[],add=(path,label,message,extra={})=>items.push({path,label,message,...extra});
  const planGoals=Array.isArray(member?.plan?.goals)?member.plan.goals:[];
  (Array.isArray(e.participation)?e.participation:[]).forEach((r,i)=>{for(const [k,name] of [['service','제공 서비스'],['resource','자원 활용 내역']])
   if(FUTURE.test(clean(r?.[k])))add(`evaluation.participation.${i}.${k}`,`참여 재활 활동 ${i+1} · ${name}`,'실제로 한 일을 쓰는 칸에 앞으로 할 일 표현이 있습니다. 이미 한 일과 앞으로 할 일을 구분했는지 확인하세요.')});
  (Array.isArray(e.goals)?e.goals:[]).forEach((g,i)=>{if(!activeEvalGoal(g))return;const L=`목표 ${i+1} · `,base=`evaluation.goals.${i}.`;
   for(const [k,name] of [['short','평가 단기목표'],['activity','평가 세부활동'],['indicator','측정 지표 및 성과목표'],['result','성과목표 달성 내용'],['analysis','분석']])
    if(!clean(g[k]))add(base+k,L+name,'비어 있습니다.');
   if(!e.pastPlan&&!e.keepGoals&&(clean(g.goalId)||clean(g.short))&&!planGoals.some(p=>p&&p.id&&p.id===g.goalId))
    add(base+'short',L+'평가 단기목표','지금 재활계획서의 목표와 연결되어 있지 않습니다. 계획서를 새로 쓴 뒤 평가서를 다시 만들지 않았다면 ‘계획서 목표 가져오기’를 눌러 맞추세요.');
   for(const [k,name] of [['activity','평가 세부활동'],['result','성과목표 달성 내용']])
    if(FUTURE.test(clean(g[k])))add(base+k,L+name,'실제로 한 일을 쓰는 칸에 앞으로 할 일 표현이 있습니다. 이미 한 일과 앞으로 할 일을 구분했는지 확인하세요.');
   for(const [k,name] of [['result','성과목표 달성 내용'],['analysis','분석'],['activity','평가 세부활동']])
    for(const r of ratios(g[k])){
     if(r.done>r.total){add(base+k,L+name,`‘${r.total}회 중 ${r.done}회’는 참여 횟수가 전체 횟수보다 많습니다. 숫자를 확인하세요.`);continue}
     const p=percentAfter(r);if(p!=null&&r.total>0&&Math.abs(r.done/r.total*100-p)>1.5)add(base+k,L+name,`‘${r.total}회 중 ${r.done}회’는 약 ${Math.round(r.done/r.total*1000)/10}%인데 ${p}%로 적혀 있습니다. 비율을 확인하세요.`)}
   const target=targetPercent(g.indicator),actual=target?actualPercent(g.result):null,v=verdict(clean(g.result)+'\n'+clean(g.analysis));
   if(target&&actual!=null&&v){
    if(v==='full'&&!meets(actual,target))add(base+'result',L+'성과목표 달성 내용',`달성했다고 적었지만 적힌 실적 ${actual}%는 목표(${target.value}% ${target.op})에 못 미칩니다. 실적과 판정을 함께 확인하세요.`);
    if(v==='none'&&meets(actual,target))add(base+'result',L+'성과목표 달성 내용',`미달성으로 적었지만 적힌 실적 ${actual}%는 목표(${target.value}% ${target.op})를 충족합니다. 미달성 이유가 다른 기준에 있는지 확인하세요.`)}
   for(const c of participationCheck(g,notes))add(base+c.field,L+({result:'성과목표 달성 내용',activity:'평가 세부활동',analysis:'분석'}[c.field]),c.message,{refs:c.refs});
   for(const [k,name] of [['short','평가 단기목표'],['activity','평가 세부활동'],['indicator','측정 지표 및 성과목표'],['result','성과목표 달성 내용'],['analysis','분석']])
    if(clean(g[k])&&placeholder(g[k]))add(base+k,L+name,'‘확인 필요’·‘자료 부족’ 같은 표시가 남아 있습니다. 상담일지를 확인해 채우거나, 평가할 자료가 없다면 그 이유를 쓰세요.');
  });
  for(const [k,name] of [['overall','종합 평가'],['opinion','담당자 의견']])if(placeholder(e[k]))add('evaluation.'+k,name,'‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.');
  return items}
 const DOCTOR_ROWS=[['diet','식습관'],['sleep','수면'],['relationships','대인관계'],['internal','내과'],['otherMedicine','기타 진료과'],['obsessive','강박 행동'],['paranoid','피해 사고'],['negative','음성 증상'],['mood','불안·기분 변화'],['hygiene','위생 관리'],['health','건강 관리'],['programs','참여 프로그램']];
 function doctor(member){
  const d=member?.doctorLetter||{},sec=d.sections||{},items=[],add=(path,label,message)=>items.push({path,label,message,doctor:true});
  for(const [k,name] of DOCTOR_ROWS){const s=sec[k]||{};
   if(clean(s.intervention)&&!clean(s.status))add(`sections.${k}.status`,`${name} · 현 상황`,'개입 내용은 있는데 현 상황이 비어 있습니다.');
   if(FUTURE.test(clean(s.intervention)))add(`sections.${k}.intervention`,`${name} · 개입 내용`,'개입 내용에는 실제로 한 조치만 씁니다. 앞으로 할 일이 섞여 있는지 확인하세요.');
   for(const [f,fname] of [['status','현 상황'],['intervention','개입 내용']])if(placeholder(s[f]))add(`sections.${k}.${f}`,`${name} · ${fname}`,'‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.')}
  if(placeholder(d.opinion))add('opinion','담당자 의견','‘확인 필요’ 같은 표시가 남아 있습니다. 확인한 뒤 고치세요.');
  return items}
 // member: {plan, evaluation, doctorLetter, periodStart, periodEnd}
 // notes: 체크했고 평가기간 안에 있는 상담일지 [{number, date, text}]
 function run(member,kind,{notes=[]}={}){
  const k=['plan','evaluation','doctor'].includes(kind)?kind:'plan';
  const list=(Array.isArray(notes)?notes:[]).slice(0,400).filter(n=>n&&Number.isInteger(n.number)&&clean(n.text)).map(n=>({number:n.number,date:clean(n.date),text:str(n.text).slice(0,20000)}));
  let items=k==='plan'?plan(member):k==='evaluation'?evaluation(member,list):doctor(member);
  const seen=new Set();items=items.filter(x=>{const key=x.path+'|'+x.message;if(seen.has(key))return false;seen.add(key);return true}).slice(0,MAX_ITEMS);
  const notices=[];
  if(k==='evaluation'){const s=clean(member?.periodStart),e=clean(member?.periodEnd);
   if(!s||!e)notices.push('평가기간이 정해지지 않아 체크한 상담일지 전체를 기준으로 점검했습니다.');else if(s>e)notices.push('평가기간의 시작일이 종료일보다 늦습니다. 기간을 확인하세요.')}
  if(k!=='doctor'&&!list.length)notices.push('체크한 상담일지가 없어 상담일지와 대조하는 점검(참여 횟수 등)은 하지 못했습니다.');
  return{kind:k,items,notices,checkedNotes:list.length}}
 return Object.freeze({run,FUTURE,placeholder,measurable,ratios,targetPercent,actualPercent,verdict,claims,keyword});
});
