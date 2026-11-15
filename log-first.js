'use strict';
// v3.25.0 일지 중심 작성 1단계: 상담일지 정리표.
// - 이전 화면의 회원 기록(브라우저 저장)은 읽기만 하고 절대 고치지 않는다.
// - 정리표(영역·구분·회원 말·위험·건강 사유·확정)는 따로 저장한다(SHEET_KEY).
// - AI를 쓰지 않는다. 영역·구분은 낱말 규칙으로 추천만 하고, 확정은 담당자가 한다.
(function(){
const OLD_KEY='sehuim_rehab_offline_v1';
const SHEET_KEY='rehab_logsheet_v1';
const RELEASE='3.25.0';

// 이전 화면(app.js NEED_AREAS)과 같은 12개 영역. 거주환경의 '시설·방에'는 일지마다 나와 뺐다.
const AREAS=[
 {id:'housing',name:'거주환경',re:/집|퇴소|자립|(?<!특)이사(?!항)|거주|살고|살래|기숙/},
 {id:'family',name:'가족관계',re:/엄마|어머니|아빠|아버지|부모|가족|동생|자녀|아들|딸|할머니|할아버지|남편|아내|보호자|(?<![는던은]\s?)(?:형|누나|언니|오빠)(?!식|태|편|성)/},
 {id:'sleep',name:'수면',re:/잠을|잠이|잠은|잠도|수면|불면|못\s*자|잘\s*자|깨요|깨서|졸려|졸리/},
 {id:'med',name:'복약',re:/(?:^|[^가-힣]|먹는\s?)약(?:을|이|은|도|\s|먹|$)|복약|복용|부작용|투약/},
 {id:'health',name:'신체 건강',re:/아프|아파|통증|병원|몸이|몸은|건강|체중|몸무게|다이어트|피곤|식사|혈당|당뇨|군것질|진료/},
 {id:'mental',name:'정서',re:/환청|목소리|무서|불안|우울|짜증|화가|화나|답답|힘들|외롭|슬퍼|죽고|걱정|스트레스|기분|정서/},
 {id:'work',name:'취업·일',re:/일하|일을|취업|직장|알바|돈 벌|돈을 벌|일자리|출근|회사|직업/},
 {id:'money',name:'금전',re:/돈(?!을?\s*벌)|용돈|담배값|저축|빚|통장|월급|생활비|만원|금전/},
 {id:'relation',name:'대인관계',re:/친구|사람들|동료|싸우|싸워|관계|연락|무시|놀려|다른 회원|대인/},
 {id:'leisure',name:'여가·일상활동',re:/운동|산책|심심|할 게|할게 없|취미|외출|나가고|놀러|여행|게임|노래|여가/},
 {id:'alcohol',name:'음주',re:/술|음주|금주|단주|맥주|소주/},
 {id:'hygiene',name:'개인위생·생활관리',re:/씻|샤워|목욕|빨래|청소|정리정돈|위생|세탁|요리|장보기|식사\s*준비/}
];
const ETC={id:'etc',name:'기타'};
const AREA_NAME=Object.fromEntries([...AREAS,ETC].map(a=>[a.id,a.name]));
const KINDS=[
 {id:'do',name:'실시',short:'실시',count:true},
 {id:'join',name:'참여',short:'참여',count:true},
 {id:'advise',name:'안내·권유',short:'권유',count:false},
 {id:'refuse',name:'불참·거부',short:'불참',count:false},
 {id:'other',name:'기타(관찰·호소)',short:'기타',count:false}
];
const KIND_NAME=Object.fromEntries(KINDS.map(k=>[k.id,k.name]));
const COUNTS=new Set(KINDS.filter(k=>k.count).map(k=>k.id));

// 이전 화면(app.js RISK_RE)과 같은 위험 낱말.
const RISK_RE=/살기\s*싫|그만\s*살|없어지고\s*싶|죽을\s*만큼|다\s*끝내고\s*싶|손목에?\s*(?:상처|자국)|때리고\s*싶|죽이겠|해치겠|죽고\s*싶|죽어\s*버리|죽을\s*(?:까|래|거)|살고\s*싶지\s*않|사라지고\s*싶|자살|자해|극단적\s*(?:선택|시도)|목숨을|목을\s*매|손목을\s*(?:긋|그)|약을\s*(?:모아|한꺼번에|많이\s*먹)|뛰어내리|해치고\s*싶|죽이고\s*싶|죽여\s*버리|타해|흉기|칼로\s*(?:위협|찌르)/;
const ADVISE_ONLY=/(?:하도록|도록|할\s*것을|하기를|을|를)\s*(?:다시\s*)?(?:안내|권유|권함|권하|격려|제안|독려|당부)/;
const RE_REFUSE=/거부|불참|참여하지\s*않|참석하지\s*않|안\s*하겠|하지\s*않겠|결석|빠짐|빠졌|미참여|거절|안\s*나옴|나오지\s*않/;
const RE_JOIN=/참여함|참여하였|참여하여|참여했|참석함|참석하였|참석하여|참석했|\d+\s*회기/;
const RE_DO=/실시|진행함|진행하였|점검함|점검하였|확인함|확인하였|교육함|교육하였|지도함|동행|연계함|상담함|상담하였|지원함|지원하였|훈련함|연습함|함께\s*\S*함|도움을\s*줌|살펴봄|모니터링함/;
const RE_ADVISE=/안내함|안내하였|권유|권함|격려|제안|독려|당부/;
const RE_SICK=/아파서|아프다며|몸살|감기|입원|병원\s*진료|통증으로|컨디션\s*저하|발열/;

const NOTE_FIELDS=['topic','purpose','overview','reason','content','counselorOpinion','intervention','result'];
const clean=s=>String(s??'').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
function noteText(n){const parts=NOTE_FIELDS.map(k=>clean(n?.[k])).filter(Boolean);return parts.length?parts.join('\n'):clean(n?.body)}
function noteKey(n){return clean(n?.date)+'#'+fnv(clean(n?.date)+'\n'+noteText(n))}
function sentences(t){return String(t||'').split(/\n+|(?<=[.!?。])\s+|(?<=(?:함|임|음|됨|요|다))\s+(?=[가-힣A-Za-z"“‘'(])/).map(clean).filter(Boolean)}
function quotes(t){const out=[];const re=/["“]([^"”\n]{2,120})["”]|[‘']([^’'\n]{2,120})[’']/g;let m;while((m=re.exec(String(t||''))))out.push(clean(m[1]||m[2]));return [...new Set(out)]}
function kindOf(list,topic){
 // 한 줄(영역)의 문장들로 구분을 추천한다. 거부 > 참여 > 실시 > 안내·권유 > 기타.
 const advised=[],real=[];
 for(const s of list){if(ADVISE_ONLY.test(s)&&!RE_REFUSE.test(s))advised.push(s);else real.push(s)}
 const all=real.join(' ');
 if(RE_REFUSE.test(all))return 'refuse';
 if(RE_JOIN.test(all)||RE_JOIN.test(String(topic||'')))return 'join';
 if(RE_DO.test(all))return 'do';
 if(advised.length||RE_ADVISE.test(all))return 'advise';
 return 'other';
}
// 한 일: 일지에서 실제로 한 일을 적은 첫 문장(따옴표 말은 뺌). 없으면 상담주제.
function shortAct(topic,list){const strip=x=>clean(String(x||'').replace(/["“][^"”\n]*["”]\s*(?:라고|이라고)?\s*(?:말함|말했음|호소함|함)?\.?/g,''));
 const pick=list.map(strip).find(x=>x.length>4&&(RE_DO.test(x)||RE_JOIN.test(x)||RE_REFUSE.test(x)||RE_ADVISE.test(x)))||'';
 const t=clean(topic);const s=pick||(t?'':strip(list[0]||''));const out=s||t;return out.length>80?out.slice(0,78)+'…':out}

// 상담일지 한 건 → 추천 줄 목록(최대 3줄).
function recommend(n){
 const topic=clean(n?.topic||n?.title);
 const text=noteText(n);
 const sents=sentences(text);
 const hits=AREAS.map(a=>({a,list:sents.filter(s=>a.re.test(s))})).filter(x=>x.list.length);
 // 제목에도 영역 낱말이 있으면 우선.
 hits.forEach(x=>{x.score=x.list.length+(x.a.re.test(topic)?2:0)});
 hits.sort((p,q)=>q.score-p.score);
 // 회원 말(따옴표)만 있는 문장은 따로 줄을 만들지 않는다. 두 번째 줄부터는 실제 지원·참여·거부가 있는 영역만.
 const qs=quotes(text);
 const noQuote=s=>clean(s.replace(/["“][^"”\n]*["”]|[‘'][^’'\n]*[’']/g,''));
 const deeds=sents.filter(s=>noQuote(s).length>6);
 const picked=hits.filter((x,i)=>i===0||kindOf(x.list.filter(s=>noQuote(s).length>6),'')!=='other').slice(0,3);
 const rows=picked.length?picked.map(x=>({area:x.a.id,list:x.list})):[{area:'etc',list:sents}];
 const used=new Set();
 const out=rows.map((r,i)=>{
  const mine=qs.filter(q=>!used.has(q)&&r.area!=='etc'&&AREAS.find(a=>a.id===r.area).re.test(q));mine.forEach(q=>used.add(q));
  // 첫 줄(주된 영역)의 구분은 그 일지의 지원 문장 전체로 정한다(예: ‘이완 호흡을 함께 연습함’은 정서 낱말이 없어도 정서 상담의 실시).
  const kind=kindOf(i===0?deeds:r.list,topic);
  return{area:r.area,kind,act:shortAct(topic,i===0?[...r.list,...deeds]:r.list),voice:mine.join(' / '),risk:r.list.some(s=>RISK_RE.test(s)),sick:kind==='refuse'&&RE_SICK.test(text)};
 });
 const rest=qs.filter(q=>!used.has(q));if(rest.length)out[0].voice=[out[0].voice,...rest].filter(Boolean).join(' / ');
 if(RISK_RE.test(text)&&!out.some(r=>r.risk))out[0].risk=true;
 return out;
}

// ---------- 저장 ----------
const store={
 read(key){try{return localStorage.getItem(key)}catch{return null}},
 write(key,v){try{localStorage.setItem(key,v);return true}catch{return false}}
};
function readOld(){
 const raw=store.read(OLD_KEY);if(!raw)return null;
 try{const o=JSON.parse(raw);return Array.isArray(o?.members)?o:null}catch{return null}
}
function emptySheet(){return{version:1,members:{}}}
function readSheet(){const raw=store.read(SHEET_KEY);if(!raw)return emptySheet();try{const o=JSON.parse(raw);return o&&typeof o.members==='object'&&o.members?o:emptySheet()}catch{return emptySheet()}}
const ROW_KEYS=['area','kind','act','voice','risk','sick'];
function normRow(r){r=r||{};return{area:AREA_NAME[r.area]?r.area:'etc',kind:KIND_NAME[r.kind]?r.kind:'other',act:String(r.act??'').slice(0,200),voice:String(r.voice??'').slice(0,400),risk:r.risk===true,sick:r.sick===true}}

// ---------- 집계 ----------
function inPeriod(d,s,e){return isDate(d)&&(!s||d>=s)&&(!e||d<=e)}
function addMonths(d,k){const [y,m,dd]=d.split('-').map(Number);const t=new Date(Date.UTC(y,m-1+k,dd));return t.toISOString().slice(0,10)}
function summarize(entries,start){
 // entries: [{date, rows, confirmed}]
 const by={};const base=start?addMonths(start,2):'';
 let confirmed=0,risk=0;
 for(const e of entries){if(e.confirmed)confirmed++;
  for(const r of e.rows){const a=by[r.area]||(by[r.area]={area:r.area,kinds:{},total:0,perf:0,base:0,sick:0,risk:0});
   a.total++;a.kinds[r.kind]=(a.kinds[r.kind]||0)+1;
   if(COUNTS.has(r.kind)){a.perf++;if(base&&e.date<base)a.base++}
   if(r.sick)a.sick++;if(r.risk){a.risk++;risk++}}}
 const areas=Object.values(by).sort((p,q)=>q.total-p.total||p.area.localeCompare(q.area));
 return{areas,confirmed,total:entries.length,risk,baseUntil:base};
}

// ---------- 화면 ----------
const S={old:null,fromBackup:false,sheet:emptySheet(),memberId:'',saveOk:true,step:3};
const $=s=>document.querySelector(s);
function members(){return (S.old?.members||[]).filter(m=>m&&m.id)}
function cur(){return members().find(m=>m.id===S.memberId)||members()[0]||null}
function msheet(id){return S.sheet.members[id]||(S.sheet.members[id]={periodStart:'',periodEnd:'',notes:{}})}
function saveSheet(){S.saveOk=store.write(SHEET_KEY,JSON.stringify(S.sheet));if(!S.saveOk)notice('정리표를 이 브라우저에 저장하지 못했습니다. ‘정리표 백업’으로 파일을 내려받아 두세요.','warn')}
function notice(msg,kind){const el=$('#lfNotice');if(!el)return;el.textContent=msg||'';el.className='lf-notice'+(msg?' show '+(kind||''):'')}
function defaultPeriod(m){
 if(isDate(m.periodStart)&&isDate(m.periodEnd))return[m.periodStart,m.periodEnd];
 const ds=(m.notes||[]).map(n=>n.date).filter(isDate).sort();if(!ds.length)return['',''];
 const end=ds[ds.length-1];return[addMonths(end,-6),end];
}
function periodOf(m){const ms=msheet(m.id);if(!ms.periodStart&&!ms.periodEnd){const [s,e]=defaultPeriod(m);ms.periodStart=s;ms.periodEnd=e}return[ms.periodStart,ms.periodEnd]}
function entriesOf(m){
 const [s,e]=periodOf(m);const ms=msheet(m.id);
 return (m.notes||[]).map((n,i)=>({n,i,date:clean(n.date)})).filter(x=>inPeriod(x.date,s,e)).sort((p,q)=>p.date.localeCompare(q.date)||p.i-q.i).map(x=>{
  const key=noteKey(x.n);const saved=ms.notes[key];
  const rows=saved?.rows?.length?saved.rows.map(normRow):recommend(x.n).map(normRow);
  return{key,date:x.date,note:x.n,rows,confirmed:saved?.confirmed===true,saved:!!saved};
 });
}
function persistEntry(m,ent){const ms=msheet(m.id);ms.notes[ent.key]={rows:ent.rows.map(normRow),confirmed:ent.confirmed,updatedAt:new Date().toISOString()};saveSheet()}

function optionList(list,sel){return list.map(x=>`<option value="${esc(x.id)}"${x.id===sel?' selected':''}>${esc(x.name)}</option>`).join('')}
function renderMembers(){
 const sel=$('#lfMember');const ms=members();
 sel.innerHTML=ms.map(m=>`<option value="${esc(m.id)}"${m.id===S.memberId?' selected':''}>${esc(m.label||'회원')}</option>`).join('');
}
function goalChip(area){const m=cur();const gs=(m&&S.sheet.members[m.id]?.goals)||[];const i=gs.findIndex(g=>g.area===area);return i>=0?`<span class="lf-goalchip">목표 ${i+1} 연결</span>`:''}
function noteCard(ent,idx){
 const t=clean(ent.note.topic||ent.note.title)||'(상담주제 없음)';
 const rows=ent.rows.map((r,j)=>`
  <div class="lf-row${r.risk?' risk':''}" data-row="${j}">
   <label class="lf-f lf-area">영역<select data-f="area">${optionList([...AREAS,ETC],r.area)}</select></label>
   <label class="lf-f lf-kind">구분<select data-f="kind">${optionList(KINDS,r.kind)}</select></label>
   <label class="lf-f lf-act">한 일<input data-f="act" value="${esc(r.act)}" maxlength="200"></label>
   <label class="lf-f lf-voice">회원 말<input data-f="voice" value="${esc(r.voice)}" maxlength="400" placeholder="일지에 따옴표로 적힌 말만"></label>
   <div class="lf-flags">
    ${goalChip(r.area)}
    <label class="lf-check"><input type="checkbox" data-f="sick"${r.sick?' checked':''}> 건강 사유</label>
    <label class="lf-check${r.risk?' on':''}"><input type="checkbox" data-f="risk"${r.risk?' checked':''}> 위험 확인</label>
    ${ent.rows.length>1?`<button class="lf-link" data-act="row-del">줄 삭제</button>`:''}
   </div>
  </div>`).join('');
 return `<article class="lf-card${ent.confirmed?' confirmed':''}" data-idx="${idx}">
  <header class="lf-card-head">
   <div><b class="lf-date">${esc(ent.date)}</b> <span class="lf-topic">${esc(t)}</span></div>
   <div class="lf-card-btns">
    <span class="lf-badge ${ent.confirmed?'ok':'wait'}">${ent.confirmed?'확정':ent.saved?'수정 중':'추천'}</span>
    <button class="lf-btn small${ent.confirmed?'':' primary'}" data-act="confirm">${ent.confirmed?'확정 풀기':'확정'}</button>
   </div>
  </header>
  <details class="lf-src"><summary>일지 보기</summary><pre>${esc(noteText(ent.note))}</pre></details>
  ${rows}
  <div class="lf-card-foot"><button class="lf-link" data-act="row-add">+ 줄 추가</button>${ent.saved?`<button class="lf-link" data-act="reset">추천으로 되돌리기</button>`:''}</div>
 </article>`;
}
function summaryHtml(sum,ents,forPrint){
 const head=`<tr><th>영역</th><th>기록</th>${KINDS.map(k=>`<th>${esc(forPrint?k.name:k.short)}</th>`).join('')}<th>실적<small>실시+참여</small></th><th>기초선<small>첫 2개월<br>월평균</small></th></tr>`;
 const body=sum.areas.map(a=>`<tr><th>${esc(AREA_NAME[a.area])}${a.risk?' <span class="lf-warn">⚠</span>':''}</th><td>${a.total}</td>${KINDS.map(k=>`<td>${a.kinds[k.id]||''}</td>`).join('')}<td><b>${a.perf}</b>${a.sick?`<small> (건강 사유 불참 ${a.sick})</small>`:''}</td><td>${sum.baseUntil?(a.base/2).toFixed(1):''}</td></tr>`).join('');
 const un=sum.total-sum.confirmed;
 return `${forPrint?'':`<h2>영역별 기록</h2>`}
  <p class="lf-meta">일지 ${sum.total}건 · 확정 ${sum.confirmed}건${un?` · <b class="lf-warn">미확정 ${un}건</b>`:''}${sum.risk?` · <b class="lf-warn">위험 확인 ${sum.risk}줄</b>`:''}</p>
  <div class="lf-tablewrap"><table class="lf-table">${head}${body||`<tr><td colspan="${KINDS.length+4}">이 기간 일지가 없습니다.</td></tr>`}</table></div>
  ${forPrint?'':`<p class="lf-help">실적은 ‘실시’와 ‘참여’만 셉니다. ‘안내·권유’만 한 일지는 실적에 들어가지 않습니다. 첫 2개월 월 평균은 ${esc(sum.baseUntil?'기간 시작부터 '+sum.baseUntil+' 전까지':'')} 기록으로, 다음 단계에서 목표 숫자를 정할 때 기준(기초선)으로 씁니다.</p>
  ${un?`<button class="lf-btn" data-act="confirm-all">추천 그대로 모두 확정</button>`:''}`}`;
}
function render(){
 const m=cur();
 // ④~⑦ 단계 화면은 log-steps.js가 그린다.
 document.querySelectorAll('[data-step]').forEach(b=>{const on=Number(b.dataset.step)===S.step;b.classList.toggle('now',on);if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 const v3=$('#lfView3'),vx=$('#lfViewX');
 if(S.step!==3&&m&&window.LogSteps){S.memberId=m.id;renderMembers();const [s,e]=periodOf(m);$('#lfStart').value=s;$('#lfEnd').value=e;S.ents=entriesOf(m);v3.hidden=true;vx.hidden=false;window.LogSteps.render(S.step);$('#lfPrint').innerHTML=window.LogSteps.printHtml?window.LogSteps.printHtml(S.step):'';return}
 v3.hidden=false;vx.hidden=true;vx.innerHTML='';
 if(!m){$('#lfNotes').innerHTML=`<div class="lf-empty"><h2>회원 기록을 찾지 못했습니다</h2><p>이전 화면에서 ‘이 브라우저에 저장’을 켜 두었다면 여기서 바로 읽습니다. 꺼져 있거나 다른 컴퓨터라면 ‘백업 파일 불러오기’로 백업 파일(평문 또는 암호화)을 여세요.</p><p>이 화면은 이전 화면의 기록을 읽기만 하고 바꾸지 않습니다.</p></div>`;$('#lfSummary').innerHTML='';renderMembers();return}
 S.memberId=m.id;renderMembers();
 const [s,e]=periodOf(m);$('#lfStart').value=s;$('#lfEnd').value=e;
 const ents=entriesOf(m);S.ents=ents;
 $('#lfNotes').innerHTML=ents.length?ents.map(noteCard).join(''):`<div class="lf-empty"><p>이 기간(${esc(s||'처음')} ~ ${esc(e||'끝')})에 날짜가 있는 상담일지가 없습니다. 기간을 바꾸거나 이전 화면에서 일지 날짜를 확인하세요.</p></div>`;
 const sum=summarize(ents,s);
 $('#lfSummary').innerHTML=summaryHtml(sum,ents,false);
 $('#lfPrint').innerHTML=printHtml(m,s,e,ents,sum);
}
function today(){const d=new Date();const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
function printHtml(m,s,e,ents,sum){
 const rows=ents.flatMap(ent=>ent.rows.map((r,j)=>`<tr${ent.confirmed?'':' class="un"'}><td>${j?'':esc(ent.date)}</td><td>${esc(AREA_NAME[r.area])}</td><td>${esc(r.act)}</td><td>${esc(KIND_NAME[r.kind])}${r.sick?' (건강 사유)':''}</td><td>${esc(r.voice)}</td><td>${r.risk?'위험 확인':''}${ent.confirmed?'':' 미확정'}</td></tr>`)).join('');
 return `<h1>기간별 상담 요약표</h1>
 <p>회원: ${esc(m.label||'')} · 기간: ${esc(s)} ~ ${esc(e)} · 작성일: ${esc(today())}</p>
 <h2>영역별 기록</h2>${summaryHtml(sum,ents,true)}
 <h2>일지별 정리</h2>
 <table class="lf-table"><tr><th>날짜</th><th>영역</th><th>한 일</th><th>구분</th><th>회원 말</th><th>표시</th></tr>${rows}</table>`;
}

// ---------- 동작 ----------
function entFrom(el){const card=el.closest('.lf-card');if(!card)return null;return S.ents?.[Number(card.dataset.idx)]||null}
function onChange(ev){
 const t=ev.target;
 if(t.id==='lfMember'){S.memberId=t.value;render();return}
 if(t.id==='lfStart'||t.id==='lfEnd'){const m=cur();if(!m)return;const ms=msheet(m.id);ms.periodStart=$('#lfStart').value;ms.periodEnd=$('#lfEnd').value;
  if(ms.periodStart&&ms.periodEnd&&ms.periodStart>ms.periodEnd){notice('기간 시작이 끝보다 늦습니다.','warn');return}notice('');saveSheet();render();return}
 if(t.id==='lfBackupFile'){const f=t.files?.[0];t.value='';if(f)loadBackup(f);return}
 if(t.id==='lfSheetFile'){const f=t.files?.[0];t.value='';if(f)importSheet(f);return}
 const f=t.dataset?.f;if(!f)return;
 if(t.tagName==='INPUT'&&t.type!=='checkbox')return; // 글 칸은 입력하는 대로 onInput에서 저장한다.
 const ent=entFrom(t);const row=t.closest('.lf-row');if(!ent||!row)return;
 const r=ent.rows[Number(row.dataset.row)];if(!r)return;
 r[f]=t.type==='checkbox'?t.checked:t.value;
 if(ent.confirmed)ent.confirmed=false; // 확정한 뒤 고치면 다시 확정받는다.
 persistEntry(cur(),ent);
 refreshCard(ent);
}
function refreshCard(ent){const m=cur();const idx=S.ents.indexOf(ent);const card=document.querySelector(`.lf-card[data-idx="${idx}"]`);
 const active=document.activeElement;const keep=active&&card&&card.contains(active)?{row:active.closest('.lf-row')?.dataset.row,f:active.dataset.f,pos:active.selectionStart}:null;
 ent.saved=true;if(card)card.outerHTML=noteCard(ent,idx);
 if(keep?.f){const el=document.querySelector(`.lf-card[data-idx="${idx}"] .lf-row[data-row="${keep.row}"] [data-f="${keep.f}"]`);if(el){el.focus();try{if(keep.pos!=null)el.setSelectionRange(keep.pos,keep.pos)}catch{}}}
 const [s,e]=periodOf(m);const sum=summarize(S.ents,s);$('#lfSummary').innerHTML=summaryHtml(sum,S.ents,false);$('#lfPrint').innerHTML=printHtml(m,s,e,S.ents,sum)}
function onClick(ev){
 const st=ev.target.closest('[data-step]');if(st){S.step=Number(st.dataset.step);try{sessionStorage.setItem('lf_step',String(S.step))}catch{}render();window.scrollTo(0,0);return}
 const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;const m=cur();
 if(act==='print'){window.print();return}
 if(act==='load-backup'){$('#lfBackupFile').click();return}
 if(act==='sheet-import'){$('#lfSheetFile').click();return}
 if(act==='sheet-export'){exportSheet();return}
 if(!m)return;
 if(act==='confirm-all'){const un=S.ents.filter(x=>!x.confirmed);if(!un.length)return;
  if(!confirm(`미확정 일지 ${un.length}건을 추천 그대로 확정합니다. 영역과 구분을 하나씩 확인하지 않은 채 확정하는 것입니다. 계속할까요?`))return;
  un.forEach(x=>{x.confirmed=true;persistEntry(m,x)});render();return}
 const ent=entFrom(b);if(!ent)return;
 if(act==='confirm'){ent.confirmed=!ent.confirmed;persistEntry(m,ent);refreshCard(ent);return}
 if(act==='row-add'){ent.rows.push(normRow({area:'etc',kind:'other',act:ent.rows[0]?.act||''}));ent.confirmed=false;persistEntry(m,ent);refreshCard(ent);return}
 if(act==='row-del'){const j=Number(b.closest('.lf-row')?.dataset.row);if(ent.rows.length>1&&Number.isInteger(j)){ent.rows.splice(j,1);ent.confirmed=false;persistEntry(m,ent);refreshCard(ent)}return}
 if(act==='reset'){delete msheet(m.id).notes[ent.key];saveSheet();render();return}
}
function onInput(ev){const t=ev.target;if(t.tagName==='INPUT'&&(t.dataset.f==='act'||t.dataset.f==='voice')){const ent=entFrom(t);const row=t.closest('.lf-row');if(!ent||!row)return;const r=ent.rows[Number(row.dataset.row)];if(!r)return;r[t.dataset.f]=t.value;
 if(ent.confirmed){ent.confirmed=false;persistEntry(cur(),ent);refreshCard(ent);return}persistEntry(cur(),ent)}}

async function readFileText(f){if(f.text)return f.text();return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=()=>rej(r.error);r.readAsText(f)})}
const fromB64=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
async function decryptBackup(env,pw){const salt=fromB64(String(env.salt)),iv=fromB64(String(env.iv)),data=fromB64(String(env.data));const iter=Number(env.iter);if(!Number.isInteger(iter)||iter<100000||iter>5000000)throw Error('암호화 백업 파일의 설정값이 올바르지 않습니다.');
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
 try{const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);return JSON.parse(new TextDecoder().decode(pt))}catch{throw Error('비밀번호가 맞지 않거나 파일이 손상되었습니다.')}}
function askPassword(){const d=$('#lfPw');const inp=$('#lfPwInput');inp.value='';return new Promise(res=>{d.addEventListener('close',()=>res(d.returnValue==='ok'?inp.value:null),{once:true});d.showModal();inp.focus()})}
async function loadBackup(f){
 try{let o=JSON.parse(await readFileText(f));
  if(o?.format==='rehab-enc'){if(!(crypto.subtle&&window.isSecureContext))throw Error('이 환경에서는 암호화 백업을 열 수 없습니다.');const pw=await askPassword();if(pw==null)return;o=await decryptBackup(o,pw)}
  if(!Array.isArray(o?.members)||!o.members.length)throw Error('백업 파일에 회원 기록이 없습니다.');
  S.old=o;S.fromBackup=true;S.memberId=members()[0]?.id||'';
  notice(`백업 파일에서 회원 ${members().length}명을 읽었습니다. 이 기록은 이 창에서만 보이고 저장되지 않습니다. 정리표 확정 내용은 저장됩니다.`,'ok');render();
 }catch(e){notice(e.message||'백업 파일을 읽지 못했습니다.','warn')}
}
function exportSheet(){const blob=new Blob([JSON.stringify({format:'rehab-logsheet',release:RELEASE,exportedAt:new Date().toISOString(),...S.sheet})],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`logsheet_${today()}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
async function importSheet(f){
 try{const o=JSON.parse(await readFileText(f));if(o?.format!=='rehab-logsheet'||typeof o.members!=='object')throw Error('정리표 백업 파일이 아닙니다.');
  let n=0;for(const [id,v] of Object.entries(o.members||{})){if(!v||typeof v!=='object')continue;const ms=msheet(id);if(isDate(v.periodStart))ms.periodStart=v.periodStart;if(isDate(v.periodEnd))ms.periodEnd=v.periodEnd;
   for(const [k,e] of Object.entries(v.notes||{})){if(!e||!Array.isArray(e.rows))continue;ms.notes[k]={rows:e.rows.slice(0,10).map(normRow),confirmed:e.confirmed===true,updatedAt:String(e.updatedAt||'')};n++}}
  saveSheet();notice(`정리표 ${n}건을 불러왔습니다.`,'ok');render();
 }catch(e){notice(e.message||'정리표 백업을 읽지 못했습니다.','warn')}
}
function init(){
 S.old=readOld();S.sheet=readSheet();S.memberId=S.old?.memberId||'';
 try{const v=Number(sessionStorage.getItem('lf_step'));if(v>=3&&v<=7)S.step=v}catch{}
 if(!S.old)notice('');
 document.addEventListener('change',onChange);document.addEventListener('click',onClick);document.addEventListener('input',onInput);
 window.addEventListener('storage',ev=>{if(ev.key===OLD_KEY&&!S.fromBackup){S.old=readOld();render()}if(ev.key===SHEET_KEY){S.sheet=readSheet();render()}});
 render();
}
window.LogFirst={AREAS,KINDS,AREA_NAME,KIND_NAME,COUNTS,RISK_RE,recommend,kindOf,quotes,sentences,noteKey,noteText,summarize,addMonths,normRow,RELEASE,_state:S,
 cur,members,msheet,saveSheet,notice,esc,clean,isDate,today,periodOf,entriesOf,render,readOld,OLD_KEY,store,goStep(n){S.step=n;try{sessionStorage.setItem('lf_step',String(n))}catch{}render();try{window.scrollTo(0,0)}catch{}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
