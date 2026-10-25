'use strict';
// v3.21.59 주치의편지(회원경과보고) — 서식, 자료 정리, 화면, 과거 편지 문체 규칙.
// 저장·AI 요청·규칙 기반 초안은 app.js가 맡는다. 계획서·평가서·과거 재활문서 자료에는 손대지 않는다.
(function(root){
 const FACILITY={name:'새희망둥지',phone:'031) 977-9780'};
 const ROWS=[
  ['diet','일상생활','식습관'],['sleep','일상생활','수면'],['relationships','일상생활','대인관계'],
  ['internal','건강','내과'],['otherMedicine','건강','기타 진료과'],
  ['obsessive','정신과 증상','강박 행동'],['paranoid','정신과 증상','피해 사고'],['negative','정신과 증상','음성 증상'],
  ['hygiene','재활활동','위생 관리'],['health','재활활동','건강 관리'],['programs','재활활동','참여 프로그램']
 ];
 const GRADES=[['rules','시설규칙 준수'],['relations','대인관계'],['daily','일상생활관리'],['impulse','충동 조절'],
  ['symptoms','증상 관리'],['meds','약물복용 및 순응도'],['community','지역사회 적응 능력'],['family','가족의 의사소통']];
 const ATTITUDES=['적극적','소극적','무관심','무단결석'],LEVELS=['상','중','하'];
 const MAX_HISTORY=20,MAX_HISTORY_TEXT=16000;
 // AI·규칙 초안이 쓰는 칸. 담당자 칸(인적사항·작성일·작성자)과 주치의 회신 칸은 절대 덮어쓰지 않는다.
 const AUTO_KEYS=['admissionDuration','attitude','programs','opinion','medMorning','medEvening','medOther'];
 const STAFF_KEYS=['recipient','name','sexAge','diagnosis','admission','writtenAt','author'];
 const DOCTOR_KEYS=['doctorReplyDate','doctorReplyName','doctorReply'];
 const str=v=>typeof v==='string'?v:(v==null?'':String(v));
 const trim=v=>str(v).trim();
 const esc=v=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(str(v));
 function empty(){
  const grades={},sections={};
  for(const [k] of GRADES)grades[k]='';
  for(const [k] of ROWS)sections[k]={status:'',intervention:''};
  return{recipient:'',name:'',sexAge:'',diagnosis:'',admission:'',admissionDuration:'',attitude:'',programs:'',grades,sections,
   opinion:'',medMorning:'',medEvening:'',medOther:'',writtenAt:'',author:'',doctorReplyDate:'',doctorReplyName:'',doctorReply:''};
 }
 function normalize(raw){
  const out=empty(),src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  for(const k of Object.keys(out))if(typeof out[k]==='string')out[k]=str(src[k]).slice(0,k==='opinion'||k==='doctorReply'?6500:1800);
  for(const k of ['admission','writtenAt','doctorReplyDate'])if(!isDate(out[k]))out[k]='';
  if(!ATTITUDES.includes(out.attitude))out.attitude='';
  for(const [k] of GRADES)out.grades[k]=LEVELS.includes(src.grades?.[k])?src.grades[k]:'';
  for(const [k] of ROWS)for(const f of ['status','intervention'])out.sections[k][f]=str(src.sections?.[k]?.[f]).slice(0,2700);
  return out;
 }
 const idOk=v=>/^[-_a-zA-Z0-9]{1,100}$/.test(str(v));
 function normalizeHistory(raw){
  return (Array.isArray(raw)?raw:[]).slice(0,MAX_HISTORY).map(d=>{
   if(!d||typeof d!=='object'||!trim(d.body))return null;
   return{id:idOk(d.id)?d.id:'dh-'+Math.random().toString(36).slice(2,12),title:str(d.title).slice(0,100),body:str(d.body).slice(0,MAX_HISTORY_TEXT),
    styleOwner:str(d.styleOwner).slice(0,100),updatedAt:str(d.updatedAt).slice(0,40)};
  }).filter(Boolean);
 }
 // AI·규칙 초안이 쓰는 칸에 내용이 있는지(덮어쓰기 전에 확인할 때 씀)
 function hasDraftContent(doc){const d=normalize(doc);
  return AUTO_KEYS.some(k=>trim(d[k]))||GRADES.some(([k])=>d.grades[k])||ROWS.some(([k])=>trim(d.sections[k].status)||trim(d.sections[k].intervention))}
 // 초안을 넣을 때: 초안 칸만 바꾸고 담당자 칸·주치의 회신 칸은 그대로 둔다.
 function applyDraft(old,draft){
  const d=normalize(old),r=draft&&typeof draft==='object'&&!Array.isArray(draft)?draft:{};
  for(const k of AUTO_KEYS)d[k]=typeof r[k]==='string'?r[k].slice(0,k==='opinion'?6500:1800):'';
  if(!ATTITUDES.includes(d.attitude))d.attitude='';
  for(const [k] of GRADES)d.grades[k]=LEVELS.includes(r.grades?.[k])?r.grades[k]:'';
  for(const [k] of ROWS)for(const f of ['status','intervention']){const v=r.sections?.[k]?.[f];d.sections[k][f]=typeof v==='string'?v.slice(0,2700):''}
  return d;
 }
 // 과거 주치의편지에서 뽑는 것은 문체·구성 규칙뿐이다(원문은 AI로 보내지 않음).
 function styleRules(docs){
  const text=(docs||[]).map(d=>str(d.body).slice(0,6000)).join('\n');
  const rules=['재활계획서·재활평가서와 같은 중립적인 문어체로 쓰고 끝맺음은 ~함·~임·~확인됨·~하였음으로 맞춘다.',
   '현 상황은 관찰한 사실과 회원의 진술을 나누어 쓰고, 개입 내용에는 실제로 한 조치만 쓴다.',
   '진료에 필요한 증상·행동·기능 변화를 간결하게 쓰고, 근거 없는 진단·수치·약물명은 쓰지 않는다.'];
  if(/위해|통해|따라/.test(text))rules.push('문제 → 개입 목적 → 실제 개입 → 회원의 반응이 이어지게 쓴다.');
  if(/(?:^|\n)\s*(?:- |• |▪ )/.test(text))rules.push('항목별 내용은 짧은 개조식 문어체로 정리한다.');
  if(/주\s*\d+\s*회|월\s*\d+\s*회/.test(text))rules.push('확인된 활동 빈도가 있을 때만 주기와 횟수를 쓴다.');
  if(/주치의|진료|소견|약물/.test(text))rules.push('담당자 의견은 관찰한 변화와 진료에 필요한 문의 중심으로 쓰고, 의사의 소견을 대신 쓰지 않는다.');
  return rules;
 }
 function toHistoryText(doc){
  const d=normalize(doc),out=[],add=(t,v)=>{if(trim(v))out.push('['+t+']\n'+trim(v))};
  add('프로그램 참여 태도',d.attitude);add('참여 프로그램',d.programs);
  for(const [k,label] of GRADES)add(label,d.grades[k]);
  add('입소기간',d.admissionDuration);
  for(const [k,cat,label] of ROWS){add(cat+' / '+label+' 현 상황',d.sections[k].status);add(cat+' / '+label+' 개입 내용',d.sections[k].intervention)}
  add('담당자 의견',d.opinion);add('정신과 약물 아침',d.medMorning);add('정신과 약물 저녁',d.medEvening);add('기타 약물',d.medOther);
  return out.join('\n\n').slice(0,MAX_HISTORY_TEXT);
 }
 // 화면 입력칸에서 바꾼 값을 넣는다(정해진 칸만).
 function fieldUpdate(m,path,value){
  if(!m||!/^[a-zA-Z][a-zA-Z0-9.]*$/.test(path))return false;
  if(!m.doctorLetter||typeof m.doctorLetter!=='object')m.doctorLetter=empty();
  const parts=path.split('.');let node=m.doctorLetter;
  for(let i=0;i<parts.length-1;i++){if(!node||!Object.prototype.hasOwnProperty.call(node,parts[i]))return false;node=node[parts[i]]}
  const key=parts[parts.length-1];if(!node||!Object.prototype.hasOwnProperty.call(node,key)||typeof node[key]!=='string')return false;
  node[key]=str(value).slice(0,key==='opinion'||key==='doctorReply'?6500:2700);return true;
 }
 // ---------- 화면 ----------
 const field=(path,value,kind='text',ph='')=>kind==='area'?`<textarea data-doctor-field="${esc(path)}" placeholder="${esc(ph)}" aria-label="${esc(ph||path)}">${esc(value)}</textarea>`
  :`<input type="${kind==='date'?'date':'text'}" data-doctor-field="${esc(path)}" value="${esc(value)}" placeholder="${esc(ph)}" aria-label="${esc(ph||path)}">`;
 const pick=(path,value,values,label)=>`<select data-doctor-field="${esc(path)}" aria-label="${esc(label)}"><option value="">미평가</option>${values.map(x=>`<option value="${esc(x)}"${x===value?' selected':''}>${esc(x)}</option>`).join('')}</select>`;
 const rowsHtml=(d,rows)=>rows.map(([k,cat,label])=>`<tr><td class="doctor-group">${esc(cat)}</td><th>${esc(label)}</th><td>${field('sections.'+k+'.status',d.sections[k].status,'area',label+' 현 상황')}</td><td>${field('sections.'+k+'.intervention',d.sections[k].intervention,'area',label+' 개입 내용')}</td></tr>`).join('');
 // ctx: {checked, busy, status, undo, conditions, styleCount, ownHistory, allHistory}
 function page(m,ctx={}){
  const d=normalize(m.doctorLetter),busy=!!ctx.busy,nm=esc(d.name)||'&nbsp;'.repeat(14);
  const condBtn=ctx.conditions&&ctx.conditions.length&&!trim(d.diagnosis)?`<button type="button" class="btn small" data-act="doctor-diagnosis-fill" title="상담일지 관리의 ‘정신과적 진단·증상’에서 고른 진단명을 넣습니다">진단·증상 필터에서 넣기</button>`:'';
  const hist=normalizeHistory(m.doctorHistory);
  return `<h2 class="noprint">주치의편지</h2>
 <div class="toolbar noprint doctor-toolbar"><b>${esc(m.label||'')}</b><span class="muted">체크한 상담일지 ${ctx.checked||0}건</span><span class="grow"></span>
  <button class="btn primary" data-act="doctor-generate" ${!ctx.checked||busy?'disabled':''}>체크한 상담일지로 AI 작성</button>
  <button class="btn" data-act="doctor-rule" ${!ctx.checked||busy?'disabled':''} title="AI 없이 체크한 상담일지에서 칸별 문장을 골라 초안을 만듭니다">규칙 기반 초안</button>
  ${ctx.undo?'<button class="btn small" data-act="doctor-undo">초안 넣기 전으로 되돌리기</button>':''}
  <button class="btn" data-act="doctor-save">저장</button><button class="btn" data-act="doctor-register-current" title="지금 편지의 작성 내용을 과거 주치의편지로 등록해 다음 편지의 문체 기준으로 씁니다">과거 편지로 등록</button><button class="btn primary" data-act="doctor-print">인쇄</button></div>
 ${busy?`<div class="ai-progress noprint" role="status"><strong>진행 상태</strong><p id="aiStatus" class="ai-status">${esc(ctx.status||'작성 중…')}</p><div class="toolbar"><button class="btn danger small" data-act="ai-cancel">작성 중단</button></div></div>`:''}
 <p class="muted noprint">상담일지 관리에서 <b>체크한 기록만</b> 근거로 씁니다. 재활계획서·재활평가서·과거 재활문서·다른 회원 자료는 쓰지 않고, 과거 주치의편지에서는 문체 규칙만 가져옵니다(지금 ${ctx.styleCount||0}건). 이름·진단명·입소일 같은 인적사항과 주치의 회신 칸은 AI가 쓰지 않습니다.</p>
 ${ctx.proHtml||''}
 <div class="paper doctor-paper">
  <section class="doctor-sheet"><h2>${esc(FACILITY.name)} 회원경과보고</h2><div class="doctor-approval">결 재 &nbsp; 담당 __________ &nbsp; 시설장 __________</div>
   <p>선생님께 진료 받을 ( ${nm} ) 회원의 사례관리 현황에 대해 알려드립니다. 지속적인 관심과 조언을 부탁드립니다. 감사합니다.</p>
   <table class="doctor-table doctor-head"><tbody>
    <tr><th>기관명</th><td>${esc(FACILITY.name)}</td><th>진료 의뢰</th><td>${field('recipient',d.recipient,'text','진료 의뢰처')}</td></tr>
    <tr><th>이름</th><td>${field('name',d.name,'text','이름')}</td><th>성별 / 나이</th><td>${field('sexAge',d.sexAge,'text','성별 / 나이')}</td></tr>
    <tr><th>진단명</th><td>${field('diagnosis',d.diagnosis,'text','진단명')}${condBtn}</td><th>입소일</th><td>${field('admission',d.admission,'date','입소일')}</td></tr></tbody></table>
   <h3>회 원 의 경 과 내 용</h3><table class="doctor-table"><colgroup><col style="width:17%"><col style="width:23%"><col><col></colgroup><tbody>
    <tr><th>프로그램</th><th>프로그램 참여 태도</th><td colspan="2">${pick('attitude',d.attitude,ATTITUDES,'프로그램 참여 태도')}</td></tr>
    <tr><th>프로그램</th><th>참여 프로그램</th><td colspan="2">${field('programs',d.programs,'area','참여 프로그램')}</td></tr>
    ${GRADES.map(([k,v])=>`<tr><th>전반적인 평가</th><th>${esc(v)}</th><td colspan="2">${pick('grades.'+k,d.grades[k],LEVELS,v)}</td></tr>`).join('')}
    <tr><th colspan="4" class="doctor-left">구체적 내용 — 1. 입소기간: ${field('admissionDuration',d.admissionDuration,'text','입소기간')}</th></tr>
    <tr><th colspan="2">영역</th><th>현 상황</th><th>개입 내용</th></tr>${rowsHtml(d,ROWS.slice(0,6))}
   </tbody></table><div class="doctor-page-label">1 / 3</div></section>
  <section class="doctor-sheet"><h2>회원의 경과 내용 (계속)</h2><table class="doctor-table"><colgroup><col style="width:17%"><col style="width:23%"><col><col></colgroup><tbody>
    <tr><th colspan="2">영역</th><th>현 상황</th><th>개입 내용</th></tr>${rowsHtml(d,ROWS.slice(6))}
    <tr><th colspan="2">3. 담당자 의견</th><td colspan="2">${field('opinion',d.opinion,'area','담당자 의견')}</td></tr>
    <tr><th rowspan="3" colspan="2">복용 약물</th><th>1. 정신과 약물 — 아침</th><td>${field('medMorning',d.medMorning,'area','정신과 약물 아침')}</td></tr>
    <tr><th>정신과 약물 — 저녁</th><td>${field('medEvening',d.medEvening,'area','정신과 약물 저녁')}</td></tr>
    <tr><th>2. 기타 약물</th><td>${field('medOther',d.medOther,'area','기타 약물')}</td></tr>
   </tbody></table>
   <table class="doctor-table doctor-foot"><tbody><tr><th>작성일</th><td>${field('writtenAt',d.writtenAt,'date','작성일')}</td><th>작성자</th><td>${field('author',d.author,'text','작성자')} (인)</td></tr><tr><th>연락처</th><td colspan="3">${esc(FACILITY.phone)}</td></tr></tbody></table>
   <div class="doctor-page-label">2 / 3</div></section>
  <section class="doctor-sheet doctor-reply"><h2>주치의 소견</h2><p>선생님께 진료 중인 ( ${nm} ) 회원에 대한 소견과 조언 부탁드립니다.<br>선생님의 의견을 회원이 가져간 봉투에 동봉하여 다시 보내 주시면 감사하겠습니다.</p>
   <table class="doctor-table"><tbody><tr><th>회신일</th><td>${field('doctorReplyDate',d.doctorReplyDate,'date','회신일')}</td><th>주치의 성명</th><td>${field('doctorReplyName',d.doctorReplyName,'text','주치의 성명')} (인)</td></tr>
    <tr><th>주치의 소견 및 조언</th><td colspan="3">${field('doctorReply',d.doctorReply,'area','주치의가 직접 작성하는 칸 — AI 작성 대상 아님')}</td></tr></tbody></table>
   <p class="doctor-bottom">정신재활시설 ${esc(FACILITY.name)}</p><div class="doctor-page-label">3 / 3</div></section>
 </div>
 <details class="doctor-history noprint"${ctx.historyOpen?' open':''}><summary><b>과거 주치의편지 관리</b><span class="muted"> · 이 회원 ${hist.length}/${MAX_HISTORY}건 · 같은 작성자 전체 ${ctx.allHistory||0}건이 문체 기준</span></summary>
  <p class="muted">과거 주치의편지 본문을 붙여 넣어 등록하면, 같은 작성자의 모든 회원 편지에 문어체·문장 구성 규칙만 적용합니다. 다른 회원의 원문·진단·약물은 AI에 보내지 않습니다.</p>
  <div class="field"><label for="doctorHistoryTitle">과거 편지 제목</label><input type="text" id="doctorHistoryTitle" maxlength="100" placeholder="예: 2025년 상반기 주치의편지"></div>
  <div class="field"><label for="doctorHistoryBody">과거 주치의편지 본문 붙여넣기</label><textarea id="doctorHistoryBody" class="big" maxlength="${MAX_HISTORY_TEXT}" placeholder="한글 등에서 기존 주치의편지 내용을 복사해 붙여 넣으세요."></textarea></div>
  <div class="toolbar"><button class="btn primary" data-act="doctor-history-add">과거 주치의편지 등록</button></div>
  ${hist.length?hist.map(h=>`<section class="evidence"><div class="toolbar"><b>${esc(h.title||'과거 주치의편지')}</b><span class="token">문체 기준</span><span class="grow"></span><button class="btn small danger" data-act="doctor-history-delete" data-id="${esc(h.id)}">삭제</button></div><p class="muted">${esc(h.body.slice(0,150))}${h.body.length>150?'…':''}</p></section>`).join(''):'<p class="muted">이 회원에게 등록된 과거 주치의편지가 없습니다.</p>'}
 </details>`;
 }
 const api={FACILITY,ROWS,GRADES,ATTITUDES,LEVELS,AUTO_KEYS,STAFF_KEYS,DOCTOR_KEYS,MAX_HISTORY,MAX_HISTORY_TEXT,empty,normalize,normalizeHistory,hasDraftContent,applyDraft,styleRules,toHistoryText,fieldUpdate,page};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.DoctorLetter=api;
})(typeof window!=='undefined'?window:globalThis);
