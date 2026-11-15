'use strict';
// v3.25.0 일지 중심 작성 2·3단계: ④ 목표 고르기 ⑤ 계획서 ⑥ 평가서 ⑦ 최종 검토.
// 원칙
// - 계획서·평가서의 모든 글은 ③ 정리표에서만 나온다. AI에는 가명 처리한 정리표 줄만 보낸다(일지 원문은 보내지 않음).
// - 목표 숫자·성과목표·횟수·판정은 프로그램이 정한다. AI는 문장만 쓴다.
// - 프로그램은 AI 글을 고치지 않는다. 근거 없음·숫자 다름·기준 숫자 없음을 표시만 한다.
(function(){
const L=()=>window.LogFirst;
const MAX_GOALS=3;
const PER=[{id:'month',name:'월',word:'월'},{id:'week',name:'주',word:'주'},{id:'period',name:'기간 전체',word:'기간 중'}];
const PER_WORD=Object.fromEntries(PER.map(p=>[p.id,p.word]));
const PSYCHO_LABELS=['1차적 지지집단과의 욕구 & 문제','사회적 환경과 관련된 욕구 & 문제','교육적 욕구 & 문제','직업적 욕구 & 문제','주거의 욕구 & 문제','경제적 욕구 & 문제','신체 건강상의 욕구 & 문제','기타 심리사회적 욕구 & 문제'];
// 정리표 영역 → 심리사회 8칸
const PSYCHO_OF={family:0,relation:1,leisure:1,work:3,housing:4,money:5,health:6,med:6,sleep:6,mental:7,alcohol:7,hygiene:7};
const PARTIAL=0.5; // 부분 달성 기준(사용자 결정 2026-11-15: 50%)
const VERDICT_TEXT={done:'달성',partial:'부분 달성',miss:'미달성',check:'기록 확인 필요'};
const CLAUDE_URL='https://claude.ai/new',CLAUDE_Q_MAX=6000;

const esc=s=>L().esc(s),clean=s=>L().clean(s);
function ms(){const m=L().cur();return m?L().msheet(m.id):null}
function save(){L().saveSheet()}
function uid(){return 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}

// ---------- 정리표 줄(사실) ----------
// 번호는 화면에 보이는 순서(날짜순). 근거는 번호가 아니라 날짜로 저장해, 정리표가 바뀌어도 어긋나지 않게 한다.
function facts(){
 const out=[];let no=0;
 for(const e of (L()._state.ents||[]))e.rows.forEach((r,j)=>{no++;out.push({no,date:e.date,key:e.key,j,topic:clean(e.note?.topic||e.note?.title),area:r.area,kind:r.kind,act:r.act,voice:r.voice,risk:r.risk,sick:r.sick,confirmed:e.confirmed})});
 return out;
}
const isPerf=f=>L().COUNTS.has(f.kind);
function monthsBetween(s,e){if(!s||!e)return 0;const d=(Date.parse(e)-Date.parse(s))/86400000+1;return Math.max(d,0)/30.4375}
function weeksBetween(s,e){if(!s||!e)return 0;const d=(Date.parse(e)-Date.parse(s))/86400000+1;return Math.max(d,0)/7}
function baseline(area){const [s]=L().periodOf(L().cur());if(!s)return null;const until=L().addMonths(s,2);const n=facts().filter(f=>f.area===area&&isPerf(f)&&f.date<until).length;return{until,count:n,perMonth:n/2}}
function areaStats(){
 const by={};
 for(const f of facts()){const a=by[f.area]||(by[f.area]={area:f.area,total:0,perf:0,voice:0,risk:0,refuse:0});a.total++;if(isPerf(f))a.perf++;if(f.voice&&!f.risk)a.voice++;if(f.risk)a.risk++;if(f.kind==='refuse')a.refuse++}
 return Object.values(by).filter(a=>a.area!=='etc').sort((p,q)=>q.total-p.total);
}
// 측정할 행동 기본값: 실적 줄에서 가장 많은 상담주제(예: ‘복약 점검’). 없으면 ‘영역 지원 참여’.
function topAct(area){const c={};for(const f of facts())if(f.area===area&&isPerf(f)&&f.topic&&f.topic.length<=20)c[f.topic]=(c[f.topic]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||`${L().AREA_NAME[area]} 지원 참여`}

// ---------- 목표 ----------
function goals(){const x=ms();if(!x)return[];if(!Array.isArray(x.goals))x.goals=[];return x.goals}
function normGoal(g){return{id:g.id||uid(),area:g.area||'etc',behavior:String(g.behavior||''),per:PER_WORD[g.per]?g.per:'month',n:Math.max(0,Math.min(999,Math.round(Number(g.n)||0))),long:String(g.long||''),short:String(g.short||''),plan:String(g.plan||''),activity:String(g.activity||''),src:g.src==='old'?'old':'pick'}}
// 성과목표는 AI가 쓰지 않고 단기목표 기준을 그대로 옮긴다.
function targetOf(g){if(!g.n)return '';const b=clean(g.behavior)||L().AREA_NAME[g.area]+' 관련 활동';return g.per==='period'?`${b} 기간 중 ${g.n}회`:`${b} ${PER_WORD[g.per]} ${g.n}회`}
function shortHasMeasure(g){if(!g.n||!clean(g.short))return false;const s=g.short.replace(/\s+/g,'');return s.includes(String(g.n)+'회')&&(g.per==='period'||s.includes(PER_WORD[g.per]))}

// ---------- 평가 계산(프로그램이 함) ----------
function evaluate(g){
 const [s,e]=L().periodOf(L().cur());
 const rows=facts().filter(f=>f.area===g.area);
 const perf=rows.filter(isPerf).length,sick=rows.filter(f=>f.sick).length;
 const units=g.per==='month'?monthsBetween(s,e):g.per==='week'?weeksBetween(s,e):1;
 const expected=g.n?Math.max(0,Math.round(g.n*units)-sick):0;
 const pct=expected?Math.round(perf/expected*100):0;
 let verdict;
 if(!rows.length)verdict='check';
 else if(!g.n)verdict='check';
 else if(perf>=expected)verdict='done';
 else if(perf>=expected*PARTIAL)verdict='partial';
 else verdict='miss';
 const kinds={};rows.forEach(f=>{kinds[f.kind]=(kinds[f.kind]||0)+1});
 const months=monthsBetween(s,e);
 return{rows,perf,sick,expected,pct,verdict,kinds,units,months,perMonth:months?perf/months:0,unconfirmed:rows.filter(f=>!f.confirmed).length};
}
function evalOf(g){const x=ms();x.eval=x.eval||{goals:{},overall:'',opinion:''};x.eval.goals=x.eval.goals||{};return x.eval.goals[g.id]||(x.eval.goals[g.id]={override:'',reason:'',analysis:'',achMember:'',achStaff:'',blockMember:'',blockStaff:''})}
function finalVerdict(g){const ev=evalOf(g);const c=evaluate(g);return ev.override&&clean(ev.reason)?ev.override:c.verdict}
function resultText(g){const c=evaluate(g),v=finalVerdict(g);
 if(v==='check'&&!c.rows.length)return '평가기간 상담일지에서 관련 기록이 확인되지 않음. 기록 확인 필요.';
 if(!g.n)return '측정 기준 숫자가 정해지지 않음. 기록 확인 필요.';
 return `목표 ${c.expected}회 중 ${c.perf}회 실시·참여함(${c.pct}%).${c.sick?` 건강 사유 불참 ${c.sick}회는 목표 횟수에서 뺌.`:''} ${VERDICT_TEXT[v]}${v==='check'?'.':'함.'}`}
function beforeText(g){const b=baseline(g.area);return b?`기간 첫 2개월 월 평균 ${b.perMonth.toFixed(1)}회`:''}
function afterText(g){const c=evaluate(g);return `평가기간 ${c.perf}회(월 평균 ${c.perMonth.toFixed(1)}회)`}

// ---------- 계획서 칸 ----------
function planFields(){
 const f=facts(),gs=goals();const list=[];
 const voiceRows=f.filter(x=>x.voice&&!x.risk).map(x=>x.no);
 const fam=f.filter(x=>x.area==='family').map(x=>x.no);
 list.push({key:'memberNeed',label:'회원 욕구',ask:'회원이 바라는 것과 어려워하는 것을 회원 말과 행동 기록에서 평가어로 1~3문장. 사건을 늘어놓지 말 것.',refs:voiceRows.length?voiceRows:f.map(x=>x.no),tone:'fact'});
 if(fam.length)list.push({key:'familyNeed',label:'가족 욕구',ask:'가족 관련 기록에서 드러난 가족의 욕구나 가족관계의 문제를 1~2문장. 가족이 직접 말한 기록이 없으면 추측하지 말 것.',refs:fam,tone:'fact'});
 const goalRows=f.filter(x=>gs.some(g=>g.area===x.area)).map(x=>x.no);
 list.push({key:'managerNeed',label:'사례관리자 판단 욕구',ask:'고른 목표 영역에서 사례관리자가 보는 재활 욕구를 영역마다 1문장.',refs:goalRows.length?goalRows:f.map(x=>x.no),tone:'fact'});
 PSYCHO_LABELS.forEach((lab,i)=>{const r=f.filter(x=>PSYCHO_OF[x.area]===i).map(x=>x.no);if(r.length)list.push({key:'psycho'+i,label:lab,ask:'이 영역의 욕구와 문제를 평가어로 한 문장(예: "과거 보호자와의 잦은 충돌이 있었음"). 사건 나열 금지.',refs:r,tone:'fact'})});
 const stat=areaStats();
 const strong=f.filter(x=>isPerf(x)).map(x=>x.no),weak=f.filter(x=>x.kind==='refuse'||x.kind==='advise'||x.kind==='other').map(x=>x.no);
 list.push({key:'strength',label:'강점',ask:'실시·참여가 꾸준한 행동에서 강점을 평가어로 최대 3개, 한 줄에 하나(예: "복약 관리에 협조적임"). 행동을 풀어 쓰지 말 것.',refs:strong.length?strong:f.map(x=>x.no),tone:'fact',lines:3});
 list.push({key:'weakness',label:'약점',ask:'불참·거부나 권유에 그친 행동에서 약점을 평가어로 최대 3개, 한 줄에 하나.',refs:weak.length?weak:f.map(x=>x.no),tone:'fact',lines:3});
 gs.forEach((g,i)=>{const r=f.filter(x=>x.area===g.area).map(x=>x.no);const area=L().AREA_NAME[g.area];const tgt=targetOf(g);
  list.push({key:`g${i}.long`,goal:i,label:`목표 ${i+1} 장기목표`,ask:`${area} 영역의 장기목표 한 문장. "~한다"로 끝맺음.`,refs:r,tone:'plan'});
  list.push({key:`g${i}.short`,goal:i,label:`목표 ${i+1} 단기목표`,ask:`장기목표의 중간 단계인 단기목표 한 문장. 측정 기준 "${tgt||'(기준 미정)'}"의 숫자와 단위를 그대로 넣고 "~한다"로 끝맺음.`,refs:r,tone:'plan'});
  list.push({key:`g${i}.plan`,goal:i,label:`목표 ${i+1} 재활계획`,ask:'사례관리자가 할 구체적인 지원 방법 1~3문장. 이 영역에서 실제로 해 온 지원을 바탕으로 "~한다"로 끝맺음.',refs:r,tone:'plan'});
  list.push({key:`g${i}.activity`,goal:i,label:`목표 ${i+1} 세부활동`,ask:'회원이 참여할 세부활동을 짧게 나열(한 줄에 하나, 최대 3줄).',refs:r,tone:'plan',lines:3});
 });
 list.push({key:'opinion',label:'종합의견',ask:'회원의 현재 상태와 이번 계획의 방향을 2~3문장.',refs:f.map(x=>x.no),tone:'fact'});
 return list;
}
function evalFields(){
 const list=[];
 goals().forEach((g,i)=>{const c=evaluate(g);const r=c.rows.map(x=>x.no);
  list.push({key:`e${i}.analysis`,goal:i,label:`목표 ${i+1} 달성도 분석`,ask:`판정 "${VERDICT_TEXT[finalVerdict(g)]}"의 이유를 1~2문장. 숫자는 위에 준 숫자만 쓸 것.`,refs:r,tone:'fact'});
  list.push({key:`e${i}.achMember`,goal:i,label:`목표 ${i+1} 달성 요인(회원)`,ask:'회원 쪽 달성 요인 1문장. 없으면 "해당사항 없음".',refs:r,tone:'fact'});
  list.push({key:`e${i}.achStaff`,goal:i,label:`목표 ${i+1} 달성 요인(직원)`,ask:'직원 지원 쪽 달성 요인 1문장. 없으면 "해당사항 없음".',refs:r,tone:'fact'});
  list.push({key:`e${i}.blockMember`,goal:i,label:`목표 ${i+1} 방해 요인(회원)`,ask:'회원 쪽 방해 요인 1문장. 없으면 "해당사항 없음".',refs:r,tone:'fact'});
  list.push({key:`e${i}.blockStaff`,goal:i,label:`목표 ${i+1} 방해 요인(직원)`,ask:'직원 지원 쪽 방해 요인 1문장. 없으면 "해당사항 없음".',refs:r,tone:'fact'});
 });
 const all=facts().map(x=>x.no);
 list.push({key:'overall',label:'종합 평가',ask:'평가기간 전체를 2~3문장으로 종합.',refs:all,tone:'fact'});
 list.push({key:'eopinion',label:'의견',ask:'다음 기간 계획을 위한 의견 1~2문장. 앞으로 할 일은 "~한다".',refs:all,tone:'plan'});
 return list;
}
// 칸 값 읽기·쓰기(계획서는 ms.plan, 목표 칸은 goals, 평가서는 ms.eval)
function getVal(key){const x=ms();if(!x)return '';
 let m=/^g(\d)\.(long|short|plan|activity)$/.exec(key);if(m){const g=goals()[+m[1]];return g?g[m[2]]:''}
 m=/^e(\d)\.(analysis|achMember|achStaff|blockMember|blockStaff)$/.exec(key);if(m){const g=goals()[+m[1]];return g?evalOf(g)[m[2]]:''}
 if(key==='overall'||key==='eopinion'){x.eval=x.eval||{goals:{}};return x.eval[key==='overall'?'overall':'opinion']||''}
 x.plan=x.plan||{};return x.plan[key]||''}
function setVal(key,v){const x=ms();if(!x)return;
 let m=/^g(\d)\.(long|short|plan|activity)$/.exec(key);if(m){const g=goals()[+m[1]];if(g)g[m[2]]=v;return}
 m=/^e(\d)\.(analysis|achMember|achStaff|blockMember|blockStaff)$/.exec(key);if(m){const g=goals()[+m[1]];if(g)evalOf(g)[m[2]]=v;return}
 if(key==='overall'||key==='eopinion'){x.eval=x.eval||{goals:{}};x.eval[key==='overall'?'overall':'opinion']=v;return}
 x.plan=x.plan||{};x.plan[key]=v}

// ---------- 근거 ----------
function splitSentences(t){return String(t||'').split(/\n+|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean)}
const NA=/^해당\s*사항\s*없음\.?$/;
function refsMap(){const x=ms();x.refs=x.refs||{};return x.refs}
function okMap(){const x=ms();x.ok=x.ok||{};return x.ok}
function sentenceInfo(key){
 const text=getVal(key);const refs=refsMap()[key]||{};const ok=okMap()[key]||[];
 return splitSentences(text).map(s=>{const dates=refs[s]||[];const self=ok.includes(s);const na=NA.test(s);
  const nums=numberProblem(key,s);
  return{s,dates,self,na,none:!dates.length&&!self&&!na,nums};
 });
}
// 평가서 문장의 숫자는 프로그램이 센 숫자만 허용한다.
function allowedNumbers(goalIdx){const g=goals()[goalIdx];if(!g)return null;const c=evaluate(g);const b=baseline(g.area);
 const set=new Set([g.n,c.expected,c.perf,c.pct,c.sick,Math.round(c.months),Math.round(c.units),...Object.values(c.kinds),2]);
 if(b){set.add(b.count);set.add(Number(b.perMonth.toFixed(1)))}set.add(Number(c.perMonth.toFixed(1)));
 return set}
function numberProblem(key,s){const m=/^e(\d)\./.exec(key);if(!m)return [];const allow=allowedNumbers(+m[1]);if(!allow)return [];
 const nums=(s.replace(/\d{4}-\d{2}-\d{2}/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(Number);return nums.filter(n=>!allow.has(n))}
function shortProblem(key){const m=/^g(\d)\.short$/.exec(key);if(!m)return false;const g=goals()[+m[1]];return g&&clean(g.short)&&!shortHasMeasure(g)}

// ---------- 요청문 ----------
const STYLE=[
 '1. 앞으로 할 일(목표·계획)은 "~한다"로 끝맺는다.',
 '2. 있었던 사실·평가는 "~함/~임"으로 끝맺는다.',
 '3. 한 문장에 한 가지 내용만 쓴다.',
 '4. 사건을 늘어놓지 말고 평가어로 묶는다.',
 '5. 아래 정리표에 없는 내용은 쓰지 않는다. 각 문장 끝에 근거 줄 번호를 (근거 3, 7)처럼 붙인다. "해당사항 없음"에는 붙이지 않는다.'
];
function systemText(kind){return [`너는 정신재활시설의 경력 많은 정신건강사회복지사로서 회원의 재활${kind==='eval'?'평가서':'계획서'} 칸을 쓴다.`,'문체 규칙',...STYLE,'답은 칸마다 [칸 이름] 줄을 먼저 쓰고 그 아래에 문장만 쓴다. 칸 이름은 요청에 적힌 그대로 쓴다. 다른 설명, 인사말, 코드 블록은 쓰지 않는다.'].join('\n')}
function factLine(f){return `#${f.no} ${f.date.slice(0,7)} | ${L().AREA_NAME[f.area]} | ${L().KIND_NAME[f.kind]}${f.sick?'(건강 사유)':''} | ${clean(f.act)||'-'}${f.voice&&!f.risk?` | 회원 말 "${clean(f.voice)}"`:''}${f.risk?' | 위험 확인 기록(회원 말 인용 금지)':''}`}
function buildPrompt(kind){
 const m=L().cur();const [s,e]=L().periodOf(m);const f=facts();
 const fields=kind==='eval'?evalFields():planFields();
 const goalLines=goals().map((g,i)=>{const c=evaluate(g);const base=[`목표 ${i+1}: ${L().AREA_NAME[g.area]} 영역, 측정 기준 "${targetOf(g)||'미정'}"`];
  if(kind==='eval')base.push(`  기간 목표 ${c.expected}회 · 실시·참여 ${c.perf}회 · ${c.pct}% · 건강 사유 불참 ${c.sick}회 · 판정 "${VERDICT_TEXT[finalVerdict(g)]}"(프로그램이 정한 판정이므로 바꾸지 말 것)`);
  else{const b=baseline(g.area);if(b)base.push(`  기초선: 기간 첫 2개월 월 평균 ${b.perMonth.toFixed(1)}회`)}
  if(clean(g.long))base.push(`  장기목표: ${clean(g.long)}`);if(kind==='eval'&&clean(g.short))base.push(`  단기목표: ${clean(g.short)}`);
  return base.join('\n')});
 const sec=fields.map(x=>`[${x.label}]\n- 할 일: ${x.ask}\n- 참고 줄: ${compactNos(x.refs)}`);
 const prompt=[`평가기간: ${s||'-'} ~ ${e||'-'}`,'',`정리표(담당자가 상담일지에서 확인한 사실, ${f.length}줄)`,...f.map(factLine),'',goalLines.length?'목표':'',...goalLines,'','아래 칸을 차례대로 쓴다.',...sec].filter((x,i,a)=>!(x===''&&a[i-1]==='')).join('\n');
 return{system:systemText(kind),prompt,fields};
}
function compactNos(a){const s=[...new Set(a)].sort((x,y)=>x-y);if(!s.length)return '없음';const out=[];let st=s[0],pv=s[0];for(const n of s.slice(1)){if(n===pv+1){pv=n;continue}out.push(st===pv?`${st}`:`${st}-${pv}`);st=pv=n}out.push(st===pv?`${st}`:`${st}-${pv}`);return out.join(', ')}
// 가명 처리: 회원별·공통 가릴 이름 + 지금 프로그램과 같은 규칙
function masked(kind){const m=L().cur();const P=window.PiiCore;const b=buildPrompt(kind);
 if(!P)return{...b,text:null,left:['가명 처리 기능을 불러오지 못했습니다']};
 P.reset();P.setContext(m,L()._state.old?.piiGlobal||'');
 const prompt=P.mask(b.prompt,m?.label||'');return{...b,prompt,left:P.leftovers(prompt)}}

// ---------- 답 읽기 ----------
function parseAnswer(text,fields){
 const byLabel=new Map(fields.map(f=>[f.label.replace(/\s+/g,''),f]));
 const out={};let cur=null;
 for(const raw of String(text||'').replace(/```[a-z]*\n?|```/g,'').split('\n')){
  const line=raw.trim();if(!line)continue;
  const h=/^\[(.+?)\]\s*$/.exec(line)||/^#+\s*\[?(.+?)\]?\s*$/.exec(line);
  if(h){const f=byLabel.get(h[1].replace(/\s+/g,''));cur=f||null;if(f)out[f.key]=out[f.key]||[];continue}
  if(!cur)continue;
  out[cur.key].push(line.replace(/^[-•·*]\s*|^\d+[.)]\s+/,''));
 }
 const facts_=facts();const dateOf=new Map(facts_.map(f=>[f.no,f.date]));
 const res={};
 for(const [key,lines] of Object.entries(out)){
  const sents=[],refs={};
  for(const l of lines){
   // 한 줄에 문장이 여럿이면 문장마다 근거를 따로 읽는다.
   for(const part of l.split(/(?<=\))\s+(?=\S)|(?<=[.!?])\s+(?=[^(])/)){
    const mm=/\s*\(\s*근거\s*[:：]?\s*([#\d,\s~\-–]+)\)\s*\.?$/.exec(part);
    let s=part,nos=[];
    if(mm){s=part.slice(0,mm.index).trim();nos=parseNos(mm[1])}
    s=s.replace(/\s*\(\s*근거[^)]*\)/g,'').trim();if(!s)continue;
    if(mm&&/[.!?]$/.test(part)&&!/[.!?]$/.test(s))s+='.';
    const dates=[...new Set(nos.map(n=>dateOf.get(n)).filter(Boolean))].sort();
    sents.push(s);if(dates.length)refs[s]=dates;
   }
  }
  res[key]={text:sents.join(fieldLines(key,fields)?'\n':' '),refs};
 }
 return res;
}
function fieldLines(key,fields){return !!fields.find(f=>f.key===key)?.lines}
function parseNos(t){const out=[];for(const p of String(t).replace(/#/g,'').split(/[,\s]+/).filter(Boolean)){const r=/^(\d+)[~\-–](\d+)$/.exec(p);if(r){for(let i=+r[1];i<=+r[2]&&i-+r[1]<50;i++)out.push(i)}else if(/^\d+$/.test(p))out.push(+p)}return out}
function applyAnswer(kind,text){
 const P=window.PiiCore;const plain=P?P.unmask(text):text;
 const fields=kind==='eval'?evalFields():planFields();
 const parsed=parseAnswer(plain,fields);let n=0;
 for(const [key,v] of Object.entries(parsed)){if(!clean(v.text))continue;setVal(key,v.text);refsMap()[key]=v.refs;okMap()[key]=[];n++}
 save();return{filled:n,total:fields.length,missing:fields.filter(f=>!parsed[f.key]||!clean(parsed[f.key].text)).map(f=>f.label)};
}

// ---------- Gemini ----------
async function gemini(sys,prompt){
 const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'rehab-app'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({system:sys,prompt,maxTokens:16000})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(d?.error?.message||d?.error||'Gemini 요청이 실패했습니다.');e.code=d?.error?.code||'';throw e}
 return String(d.text||'');
}
async function geminiAuth(code){const r=await fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'rehab-app'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({code})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'접속 코드를 확인하세요.');return true}

// ---------- 화면 ----------
const UI={pending:{plan:null,eval:null}};
function view(){return document.getElementById('lfViewX')}
function stepNav(prev,next){return `<div class="lf-stepnav">${prev?`<button class="lf-btn" data-step="${prev}">← 이전 단계</button>`:'<span></span>'}${next?`<button class="lf-btn primary" data-step="${next}">다음 단계 →</button>`:''}</div>`}
function verdictBadge(v){return `<span class="lf-verdict v-${v}">${VERDICT_TEXT[v]}</span>`}

function render4(){
 const stat=areaStats(),gs=goals();const picked=new Set(gs.map(g=>g.area));
 const old=L().cur()?.plan?.goals?.filter(g=>clean(g.short)||clean(g.long))||[];
 const rows=stat.map(a=>{const b=baseline(a.area);return `<tr><td><input type="checkbox" data-sact="pick" data-area="${esc(a.area)}"${picked.has(a.area)?' checked':''}${!picked.has(a.area)&&gs.length>=MAX_GOALS?' disabled':''} aria-label="${esc(L().AREA_NAME[a.area])} 목표로 고르기"></td><th>${esc(L().AREA_NAME[a.area])}</th><td>${a.total}</td><td><b>${a.perf}</b></td><td>${b?b.perMonth.toFixed(1):''}</td><td>${a.voice||''}</td><td>${a.refuse||''}</td><td>${a.risk?'<span class="lf-warn">⚠ '+a.risk+'</span>':''}</td></tr>`}).join('');
 const cards=gs.map((g,i)=>{const b=baseline(g.area);const sug=b?Math.max(1,Math.ceil(b.perMonth+0.5)):1;
  return `<article class="lf-panel lf-goal" data-gi="${i}">
   <header><h3>목표 ${i+1} · ${esc(L().AREA_NAME[g.area])}</h3><button class="lf-link" data-sact="goal-del">빼기</button></header>
   ${g.src==='old'?`<p class="lf-help">기존 계획서에서 가져온 목표입니다. 영역과 측정 기준을 정해야 평가할 수 있습니다.</p>`:''}
   <div class="lf-grid">
    <label class="lf-f">영역<select data-gf="area">${[...L().AREAS,{id:'etc',name:'기타'}].map(a=>`<option value="${a.id}"${a.id===g.area?' selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
    <label class="lf-f lf-wide">측정할 행동<input data-gf="behavior" value="${esc(g.behavior)}" placeholder="예: 복약 점검 참여"></label>
    <label class="lf-f">기준<select data-gf="per">${PER.map(p=>`<option value="${p.id}"${p.id===g.per?' selected':''}>${p.name}</option>`).join('')}</select></label>
    <label class="lf-f">횟수<input type="number" min="0" max="999" data-gf="n" value="${g.n||''}" placeholder="${sug}"></label>
   </div>
   <p class="lf-help">${b?`기초선: 기간 첫 2개월 월 평균 <b>${b.perMonth.toFixed(1)}회</b>. 기초선보다 조금 높게(예: 월 ${sug}회) 정하기를 권합니다. `:''}상담일지에 남는 횟수로 정하세요. 일지에 남지 않는 행동(매일 하는 일)은 평가 때 셀 수 없습니다.</p>
   <p class="lf-target">성과목표(자동): <b>${esc(targetOf(g)||'횟수를 넣으면 만들어집니다')}</b></p>
  </article>`}).join('');
 view().innerHTML=`<section class="lf-panel"><h2>④ 목표 고르기</h2>
  <p class="lf-help">정리표에서 기록이 많은 영역부터 보여 줍니다. 최대 ${MAX_GOALS}개를 고르고, 목표마다 횟수 기준을 정하세요. 장기·단기목표는 고른 영역 안에서만 쓰이고, 성과목표는 이 기준을 그대로 씁니다.</p>
  <div class="lf-tablewrap"><table class="lf-table"><tr><th></th><th>영역</th><th>기록</th><th>실적</th><th>기초선<small>월평균</small></th><th>회원 말</th><th>불참</th><th>위험</th></tr>${rows||'<tr><td colspan="8">정리표에 영역이 있는 줄이 없습니다. ③에서 영역을 정해 주세요.</td></tr>'}</table></div>
  ${old.length?`<p class="lf-help">평가 먼저 방식: 지난 계획서 목표를 이번 기간 기록으로 평가하려면 <button class="lf-btn small" data-sact="import-old">기존 계획서 목표 가져오기 (${old.length}개)</button></p>`:''}
  ${stat.some(a=>a.risk)?`<p class="lf-warn lf-help">⚠ 위험 확인 기록이 있는 영역은 목표로 잡기 전에 위기 대응 기록이 있는지 먼저 확인하세요.</p>`:''}
 </section>${cards}${stepNav(3,5)}`;
}

function aiPanel(kind){
 const x=ms();const engine=L()._state.sheet.engine||'claude';const p=UI.pending[kind];
 const title=kind==='eval'?'평가서':'계획서';
 return `<section class="lf-panel lf-ai" data-kind="${kind}">
  <h3>AI로 ${title} 문장 쓰기</h3>
  <p class="lf-help">정리표 줄만 가명 처리해 보냅니다(상담일지 원문은 보내지 않음). AI 글은 그대로 넣고, 근거 없는 문장은 표시만 합니다. AI 없이 아래 칸에 직접 써도 됩니다.</p>
  <div class="lf-engine"><label><input type="radio" name="eng-${kind}" data-sact="engine" value="claude"${engine==='claude'?' checked':''}> Claude 채팅으로 보내기</label><label><input type="radio" name="eng-${kind}" data-sact="engine" value="gemini"${engine==='gemini'?' checked':''}> 무료 Gemini</label></div>
  <button class="lf-btn primary" data-sact="build" data-kind="${kind}">보낼 글 만들기</button>
  ${p?`<div class="lf-send">
   ${p.left.length?`<p class="lf-warn">가리지 못한 이름일 수 있는 말: <b>${esc(p.left.join(', '))}</b><br>이전 화면의 '가릴 이름' 칸에 적고 다시 만들거나, 이름이 아니면 그대로 보내도 됩니다.</p>`:'<p class="lf-help">가리지 못한 이름으로 보이는 말은 없습니다.</p>'}
   <details><summary>보낼 글 보기 (${p.prompt.length.toLocaleString()}자)</summary><pre>${esc(p.system+'\n\n'+p.prompt)}</pre></details>
   ${engine==='claude'?`<div class="lf-row2"><button class="lf-btn primary" data-sact="claude-open" data-kind="${kind}">복사하고 Claude 열기</button><span class="lf-help">Claude 창에 붙여 넣어 보내고, 받은 답 전체를 아래에 붙여 넣으세요.</span></div>
   <textarea class="lf-answer" data-answer="${kind}" rows="6" placeholder="Claude의 답을 여기에 붙여 넣기"></textarea>
   <button class="lf-btn" data-sact="answer-in" data-kind="${kind}">답 넣기</button>`
   :`<div class="lf-row2"><input type="password" class="lf-code" data-code="${kind}" placeholder="기관 접속 코드(처음 한 번)" autocomplete="off"><button class="lf-btn primary" data-sact="gemini-send" data-kind="${kind}">Gemini로 보내기</button></div>`}
  </div>`:''}
 </section>`;
}
function fieldBlock(f){
 const info=sentenceInfo(f.key);const v=getVal(f.key);const shortBad=shortProblem(f.key);
 const chips=info.map((x,j)=>`<li class="${x.none||x.nums.length?'bad':''}"><span class="lf-sent">${esc(x.s)}</span>
   ${x.dates.length?x.dates.map(d=>`<span class="lf-date-chip">${esc(d.slice(5))}</span>`).join(''):''}
   ${x.self?'<span class="lf-date-chip self">직접 확인함</span>':''}
   ${x.none?`<span class="lf-flag">근거 없음</span><button class="lf-link" data-sact="self-ok" data-key="${esc(f.key)}" data-s="${j}">직접 확인함</button>`:''}
   ${x.nums.length?`<span class="lf-flag">숫자 다름: ${esc(x.nums.join(', '))}</span>`:''}</li>`).join('');
 return `<div class="lf-field" data-key="${esc(f.key)}">
  <label class="lf-f"><span>${esc(f.label)}</span><textarea data-pf="${esc(f.key)}" rows="${f.lines?3:2}">${esc(v)}</textarea></label>
  ${shortBad?`<p class="lf-flag">단기목표에 측정 기준 숫자(${esc(targetOf(goals()[f.goal]))})가 없습니다.</p>`:''}
  ${info.length?`<ul class="lf-sents">${chips}</ul>`:''}
 </div>`;
}
function render5(){
 const gs=goals();const fields=planFields();const x=ms();x.plan=x.plan||{};
 const voices=facts().filter(f=>f.voice&&!f.risk);
 if(!clean(x.plan.memberVoice)&&voices.length){x.plan.memberVoice=voices.slice(0,3).map(f=>`“${clean(f.voice)}”`).join('\n');save()}
 const top=fields.filter(f=>f.goal==null&&f.key!=='opinion'),opn=fields.filter(f=>f.key==='opinion');
 const goalHtml=gs.map((g,i)=>`<section class="lf-panel"><h3>목표 ${i+1} · ${esc(L().AREA_NAME[g.area])}</h3>${fields.filter(f=>f.goal===i).map(fieldBlock).join('')}<p class="lf-target">성과목표(단기목표 기준을 그대로 씀): <b>${esc(targetOf(g)||'④에서 횟수를 정하세요')}</b></p></section>`).join('');
 view().innerHTML=`<section class="lf-panel"><h2>⑤ 계획서</h2>
  ${gs.length?'':'<p class="lf-warn">④에서 목표를 먼저 고르세요.</p>'}
  <div class="lf-field"><label class="lf-f"><span>회원의 주관적 호소 (정리표의 회원 말을 그대로 씀)</span><textarea data-pf="memberVoice" rows="2">${esc(x.plan.memberVoice||'')}</textarea></label></div>
  <div class="lf-field"><label class="lf-f"><span>가족의 주관적 호소 (가족이 한 말이 기록에 있을 때만 직접 적기)</span><textarea data-pf="familyVoice" rows="2">${esc(x.plan.familyVoice||'')}</textarea></label></div>
 </section>
 ${aiPanel('plan')}
 <section class="lf-panel"><h3>욕구·심리사회·강점·약점</h3>${top.map(fieldBlock).join('')}</section>
 ${goalHtml}
 <section class="lf-panel">${opn.map(fieldBlock).join('')}</section>
 ${stepNav(4,6)}`;
}
function render6(){
 const gs=goals();const fields=evalFields();
 const goalHtml=gs.map((g,i)=>{const c=evaluate(g);const ev=evalOf(g);const fv=finalVerdict(g);
  return `<section class="lf-panel" data-gi="${i}"><h3>목표 ${i+1} · ${esc(L().AREA_NAME[g.area])} ${verdictBadge(fv)}</h3>
   <p class="lf-help">단기목표: ${esc(g.short||'(⑤에서 작성)')}</p>
   <table class="lf-table lf-calc"><tr><th>측정 기준</th><td>${esc(targetOf(g)||'미정')}</td></tr>
    <tr><th>평가기간 목표 횟수</th><td>${g.n?`${c.expected}회`:'—'}${c.sick?` <small>(건강 사유 불참 ${c.sick}회 뺌)</small>`:''}</td></tr>
    <tr><th>실시·참여 기록</th><td><b>${c.perf}회</b> ${g.n?`(${c.pct}%)`:''}</td></tr>
    <tr><th>그 밖의 기록</th><td>${Object.entries(c.kinds).filter(([k])=>!L().COUNTS.has(k)).map(([k,n])=>`${esc(L().KIND_NAME[k])} ${n}`).join(' · ')||'없음'}</td></tr>
    <tr><th>프로그램 판정</th><td>${verdictBadge(c.verdict)} <small>달성 100% 이상 · 부분 달성 ${PARTIAL*100}% 이상 · 기록 없으면 기록 확인 필요</small></td></tr>
   </table>
   ${c.unconfirmed?`<p class="lf-warn lf-help">이 영역에 ③에서 확정하지 않은 줄이 ${c.unconfirmed}개 있습니다.</p>`:''}
   <div class="lf-grid"><label class="lf-f">판정 바꾸기<select data-ev="override"><option value="">프로그램 판정 그대로</option>${Object.entries(VERDICT_TEXT).map(([k,t])=>`<option value="${k}"${ev.override===k?' selected':''}>${t}</option>`).join('')}</select></label>
    <label class="lf-f lf-wide">바꾸는 이유(필수, 평가서에는 들어가지 않음)<input data-ev="reason" value="${esc(ev.reason)}"></label></div>
   ${ev.override&&!clean(ev.reason)?'<p class="lf-flag">이유를 적어야 바꾼 판정이 쓰입니다.</p>':''}
   <p class="lf-target">평가서에 들어갈 결과: <b>${esc(resultText(g))}</b></p>
   ${fields.filter(f=>f.goal===i).map(fieldBlock).join('')}
  </section>`}).join('');
 view().innerHTML=`<section class="lf-panel"><h2>⑥ 평가서</h2><p class="lf-help">판정은 ③ 정리표의 ‘실시’와 ‘참여’ 횟수로 프로그램이 정합니다. ‘안내·권유’는 실적이 아닙니다. AI는 판정을 바꾸지 않고 이유와 요인 문장만 씁니다.</p>${gs.length?'':'<p class="lf-warn">④에서 목표를 먼저 고르세요.</p>'}</section>
 ${aiPanel('eval')}${goalHtml}
 <section class="lf-panel">${fields.filter(f=>f.goal==null).map(fieldBlock).join('')}</section>${stepNav(5,7)}`;
}
function issues(){
 const out=[];const f=facts();const un=(L()._state.ents||[]).filter(e=>!e.confirmed).length;
 if(un)out.push({step:3,text:`정리표에서 확정하지 않은 일지 ${un}건`});
 const risk=f.filter(x=>x.risk);if(risk.length)out.push({step:3,text:`위험 확인 줄 ${risk.length}개 (${[...new Set(risk.map(x=>x.date))].join(', ')}): 위기 대응 기록이 있는지 확인하세요`,warn:true});
 const gs=goals();if(!gs.length)out.push({step:4,text:'목표를 고르지 않음'});
 gs.forEach((g,i)=>{if(!g.n)out.push({step:4,text:`목표 ${i+1}: 측정 기준 횟수 없음`});if(clean(g.short)&&!shortHasMeasure(g))out.push({step:5,text:`목표 ${i+1}: 단기목표에 기준 숫자 없음`});if(finalVerdict(g)==='check')out.push({step:6,text:`목표 ${i+1}: 기록 확인 필요`})});
 let none=0,nums=0,empty=0;
 for(const fl of [...planFields(),...evalFields()]){const info=sentenceInfo(fl.key);if(!info.length)empty++;none+=info.filter(x=>x.none).length;nums+=info.filter(x=>x.nums.length).length}
 if(none)out.push({step:5,text:`근거 없음 문장 ${none}개`});
 if(nums)out.push({step:6,text:`숫자 다름 문장 ${nums}개`});
 if(empty)out.push({step:5,text:`비어 있는 칸 ${empty}개`});
 return out;
}
function render7(){
 const x=ms();const m=L().cur();const [s,e]=L().periodOf(m);const list=issues();const fb=L()._state.fromBackup;
 const fin=m?.finalizedDocs||{};
 view().innerHTML=`<section class="lf-panel"><h2>⑦ 최종 검토</h2>
  <table class="lf-table lf-calc"><tr><th>회원</th><td>${esc(m?.label||'')}</td></tr><tr><th>평가기간·계획 근거 기간</th><td>${esc(s)} ~ ${esc(e)}</td></tr><tr><th>작성일</th><td><b>${esc(L().today())}</b> <small>(오늘 날짜로 고정)</small></td></tr>
  <tr><th>회원 설명·동의일</th><td><input type="date" data-sact="consent" value="${esc(x.consentDate||'')}"> <small>계획서는 회원에게 설명하고 동의받은 날을 따로 남깁니다.</small></td></tr></table>
  <h3>확인할 것 (${list.length})</h3>
  ${list.length?`<ul class="lf-issues">${list.map(it=>`<li class="${it.warn?'warn':''}">${esc(it.text)} <button class="lf-link" data-step="${it.step}">고치러 가기</button></li>`).join('')}</ul>`:'<p class="lf-ok">확인할 것이 없습니다.</p>'}
 </section>
 <section class="lf-panel"><h3>계획서·평가서 양식으로 보내기</h3>
  <p class="lf-help">지금 프로그램의 재활계획서·재활평가서 양식 칸에 그대로 넣습니다. 양식은 바꾸지 않습니다. 넣기 전 계획서·평가서는 한 판 보관되어, 이전 화면에서 되돌릴 수 있습니다.</p>
  ${fin.plan||fin.evaluation?`<p class="lf-warn">이 회원의 ${fin.plan?'계획서':''}${fin.plan&&fin.evaluation?'와 ':''}${fin.evaluation?'평가서':''}는 이전 화면에서 확정되어 있어 넣지 않습니다. 확정을 풀고 다시 하세요.</p>`:''}
  ${fb?`<p class="lf-help">지금은 백업 파일에서 읽은 기록이라 브라우저 저장 기록을 바꿀 수 없습니다. 계획서·평가서를 넣은 <b>새 백업 파일</b>을 내려받아 이전 화면의 '백업 불러오기'로 여세요.</p>
   <div class="lf-row2"><button class="lf-btn primary" data-sact="send" data-to="enc">암호화 백업으로 내려받기</button><button class="lf-btn" data-sact="send" data-to="plain">평문 백업으로 내려받기</button></div>`
   :`<div class="lf-row2"><button class="lf-btn primary" data-sact="send" data-to="local" data-which="both">계획서·평가서 모두 넣기</button><button class="lf-btn" data-sact="send" data-to="local" data-which="plan">계획서만</button><button class="lf-btn" data-sact="send" data-to="local" data-which="eval">평가서만</button></div>
   <p class="lf-help">넣은 뒤 이전 화면이 열려 있으면 그 창을 새로고침하세요.</p>`}
 </section>${stepNav(6,0)}`;
}
function render(step){if(!L().cur())return;({4:render4,5:render5,6:render6,7:render7}[step]||render4)()}
function printHtml(step){const m=L().cur();if(!m)return '';const [s,e]=L().periodOf(m);
 const fieldsP=planFields(),fieldsE=evalFields();
 const body=(step===6?fieldsE:fieldsP).map(f=>`<h3>${esc(f.label)}</h3><p>${esc(getVal(f.key)).replace(/\n/g,'<br>')}</p>`).join('');
 const goalsT=goals().map((g,i)=>`<tr><td>${i+1}</td><td>${esc(L().AREA_NAME[g.area])}</td><td>${esc(targetOf(g))}</td><td>${step>=6?esc(resultText(g)):''}</td></tr>`).join('');
 return `<h1>${step===6?'재활평가서':'재활계획서'} 검토용 초안</h1><p>회원: ${esc(m.label)} · 기간: ${esc(s)} ~ ${esc(e)} · 작성일: ${esc(L().today())}</p><p>정식 양식 인쇄는 이전 화면에서 합니다.</p><table class="lf-table"><tr><th>번호</th><th>영역</th><th>성과목표</th><th>결과</th></tr>${goalsT}</table>${body}`}

// ---------- 보내기(양식에 넣기) ----------
function planForOld(prev){const x=ms();const p=x.plan||{};const gs=goals();
 const lines=k=>splitSentences(p[k]||'').slice(0,3);const pad=(a,n)=>{const o=a.slice(0,n);while(o.length<n)o.push('');return o};
 const psycho=PSYCHO_LABELS.map((_,i)=>p['psycho'+i]||'');
 const f=facts();const basisDates=[...new Set(f.filter(r=>gs.some(g=>g.area===r.area)).map(r=>r.date))].slice(0,10);
 const oldGoals=(prev?.goals||[]);
 return{...(prev||{}),memberVoice:p.memberVoice||'',memberNeed:p.memberNeed||'',familyVoice:p.familyVoice||'',familyNeed:p.familyNeed||'',managerNeed:p.managerNeed||'',managerBasis:basisDates.length?`근거 상담기록: ${basisDates.join(', ')}`:(prev?.managerBasis||''),
  psycho,strength:pad(lines('strength'),3),weakness:pad(lines('weakness'),3),opinion:p.opinion||'',
  goals:gs.map(g=>{const o=oldGoals.find(z=>z.id===g.id)||{};return{...o,id:g.id,long:g.long,short:g.short,plan:g.plan,activity:g.activity,target:targetOf(g),src:'log-first'}}),
  needSrc:{...(prev?.needSrc||{}),member:'manual',family:'manual'}};
}
function evalForOld(prev){const x=ms();x.eval=x.eval||{goals:{}};
 return{...(prev||{}),keepGoals:true,overall:x.eval.overall||'',opinion:x.eval.opinion||'',
  goals:goals().map(g=>{const ev=evalOf(g);const c=evaluate(g);return{goalId:g.id,basis:g.short,short:g.short,activity:[...new Set(c.rows.filter(isPerf).map(r=>`${r.date.slice(5)} ${clean(r.act)}`))].slice(0,12).join('\n'),indicator:targetOf(g),before:beforeText(g),after:afterText(g),result:resultText(g),analysis:ev.analysis,achMember:ev.achMember||'해당사항 없음',achStaff:ev.achStaff||'해당사항 없음',blockMember:ev.blockMember||'해당사항 없음',blockStaff:ev.blockStaff||'해당사항 없음'}})};
}
function applyToMember(mo,which){
 const now=new Date().toISOString();const [s,e]=L().periodOf(L().cur());const fin=mo.finalizedDocs||{};const done=[];
 if((which==='both'||which==='plan')&&!fin.plan){if(mo.plan)mo.planArchive=[{savedAt:now,plan:mo.plan}];mo.plan=planForOld(mo.plan);done.push('계획서')}
 if((which==='both'||which==='eval')&&!fin.evaluation){if(mo.evaluation)mo.evalArchive=[{savedAt:now,evaluation:mo.evaluation}];mo.evaluation=evalForOld(mo.evaluation);if(s)mo.periodStart=s;if(e)mo.periodEnd=e;done.push('평가서')}
 return done;
}
async function send(to,which){
 const m=L().cur();if(!m)return;const list=issues();
 if(list.length&&!confirm(`확인할 것이 ${list.length}개 남아 있습니다.\n- ${list.slice(0,6).map(x=>x.text).join('\n- ')}\n\n그래도 양식에 넣을까요?`))return;
 if(to==='local'){
  const raw=L().store.read(L().OLD_KEY);let o;try{o=JSON.parse(raw)}catch{o=null}
  const mo=o?.members?.find(z=>z&&z.id===m.id);if(!mo){L().notice('이전 화면의 저장 기록에서 이 회원을 찾지 못했습니다.','warn');return}
  const done=applyToMember(mo,which||'both');if(!done.length){L().notice('확정된 문서라 넣지 않았습니다.','warn');return}
  if(!L().store.write(L().OLD_KEY,JSON.stringify(o))){L().notice('브라우저에 저장하지 못했습니다.','warn');return}
  L()._state.old=o;L().notice(`${done.join('·')}를 양식에 넣었습니다. 이전 화면에서 확인하고 인쇄하세요. 넣기 전 문서는 한 판 보관했습니다.`,'ok');return}
 const o=JSON.parse(JSON.stringify(L()._state.old));const mo=o.members.find(z=>z&&z.id===m.id);const done=applyToMember(mo,'both');
 if(!done.length){L().notice('확정된 문서라 넣지 않았습니다.','warn');return}
 let blob,name;
 if(to==='enc'){const pw=prompt('새 백업 파일 비밀번호(10자 이상)');if(pw==null)return;if(pw.length<10){L().notice('비밀번호는 10자 이상이어야 합니다.','warn');return}
  blob=new Blob([JSON.stringify(await encryptBackup(o,pw))],{type:'application/json'});name=`rehab_backup_${L().today()}_logfirst.enc.json`}
 else{blob=new Blob([JSON.stringify(o)],{type:'application/json'});name=`rehab_backup_${L().today()}_logfirst.json`}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
 L().notice(`${done.join('·')}를 넣은 백업 파일을 내려받았습니다. 이전 화면의 '백업 불러오기'로 여세요.`,'ok');
}
const toB64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
async function encryptBackup(obj,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),iter=250000;
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj)));return{format:'rehab-enc',version:1,kdf:'PBKDF2-SHA256',iter,salt:toB64(salt),iv:toB64(iv),data:toB64(new Uint8Array(ct))}}

// ---------- 동작 ----------
function rerender(){L().render()}
// 글 칸을 고친 뒤에는 그 칸의 근거 표시만 다시 그린다(화면 전체를 다시 그리면 바로 누른 단추가 눌리지 않음).
function refreshField(key){const all=[...planFields(),...evalFields()];const f=all.find(z=>z.key===key);const el=[...document.querySelectorAll('#lfViewX .lf-field[data-key]')].find(z=>z.dataset.key===key);
 if(!f||!el)return;const tmp=document.createElement('div');tmp.innerHTML=fieldBlock(f);const fresh=tmp.firstElementChild;
 const oldList=el.querySelector('.lf-sents'),newList=fresh.querySelector('.lf-sents');if(oldList)oldList.remove();if(newList)el.appendChild(newList);
 el.querySelectorAll(':scope > .lf-flag').forEach(z=>z.remove());fresh.querySelectorAll(':scope > .lf-flag').forEach(z=>el.insertBefore(z,el.querySelector('.lf-sents')))}
function inStep(el){return !!el.closest('#lfViewX')}
document.addEventListener('click',async ev=>{
 const b=ev.target.closest('[data-sact]');if(!b||!inStep(b))return;const act=b.dataset.sact;const x=ms();if(!x)return;
 if(act==='pick'||act==='engine'||act==='consent')return; // change에서 처리
 if(act==='goal-del'){const i=+b.closest('[data-gi]').dataset.gi;goals().splice(i,1);save();rerender();return}
 if(act==='import-old'){const old=L().cur().plan.goals.filter(g=>clean(g.short)||clean(g.long));for(const g of old){if(goals().length>=MAX_GOALS)break;if(goals().some(z=>z.id===g.id))continue;goals().push(normGoal({id:g.id,area:'etc',long:g.long,short:g.short,plan:g.plan,activity:g.activity,src:'old'}))}save();rerender();return}
 if(act==='self-ok'){const key=b.dataset.key;const s=sentenceInfo(key)[+b.dataset.s]?.s;if(!s)return;const ok=okMap();ok[key]=[...(ok[key]||[]),s];save();rerender();return}
 if(act==='build'){const kind=b.dataset.kind;UI.pending[kind]=masked(kind);rerender();return}
 if(act==='claude-open'){const p=UI.pending[b.dataset.kind];if(!p)return;const text=p.system+'\n\n'+p.prompt;try{await navigator.clipboard.writeText(text);L().notice('보낼 글을 복사했습니다. Claude 창에 붙여 넣으세요.','ok')}catch{L().notice('복사하지 못했습니다. ‘보낼 글 보기’에서 직접 복사하세요.','warn')}
  const q=encodeURIComponent(text);window.open(q.length<=CLAUDE_Q_MAX?CLAUDE_URL+'?q='+q:CLAUDE_URL,'_blank','noopener');return}
 if(act==='answer-in'){const kind=b.dataset.kind;const t=document.querySelector(`[data-answer="${kind}"]`)?.value||'';if(!clean(t)){L().notice('답을 붙여 넣어 주세요.','warn');return}
  const r=applyAnswer(kind,t);UI.pending[kind]=null;L().notice(`${r.filled}칸을 채웠습니다.${r.missing.length?` 답에 없던 칸: ${r.missing.join(', ')}`:''}`,r.missing.length?'warn':'ok');rerender();return}
 if(act==='gemini-send'){const kind=b.dataset.kind;const p=UI.pending[kind];if(!p)return;const code=document.querySelector(`[data-code="${kind}"]`)?.value||'';b.disabled=true;b.textContent='보내는 중…';
  try{let t;try{t=await gemini(p.system,p.prompt)}catch(e){if(e.code==='AUTH_REQUIRED'&&code){await geminiAuth(code);t=await gemini(p.system,p.prompt)}else throw e}
   const r=applyAnswer(kind,t);UI.pending[kind]=null;L().notice(`${r.filled}칸을 채웠습니다.${r.missing.length?` 답에 없던 칸: ${r.missing.join(', ')}`:''}`,r.missing.length?'warn':'ok');rerender()}
  catch(e){L().notice((e.code==='AUTH_REQUIRED'?'기관 접속 코드를 넣고 다시 누르세요. ':'')+(e.message||'Gemini 요청이 실패했습니다.'),'warn');b.disabled=false;b.textContent='Gemini로 보내기'}return}
 if(act==='send'){send(b.dataset.to,b.dataset.which);return}
});
document.addEventListener('change',ev=>{
 const t=ev.target;if(!inStep(t))return;const x=ms();if(!x)return;
 if(t.dataset.sact==='pick'){const area=t.dataset.area;if(t.checked){if(goals().length<MAX_GOALS&&!goals().some(g=>g.area===area))goals().push(normGoal({area,behavior:topAct(area),per:'month'}))}else{const i=goals().findIndex(g=>g.area===area);if(i>=0)goals().splice(i,1)}save();rerender();return}
 if(t.dataset.sact==='engine'){L()._state.sheet.engine=t.value;save();rerender();return}
 if(t.dataset.sact==='consent'){x.consentDate=t.value;save();return}
 if(t.dataset.gf){const i=+t.closest('[data-gi]').dataset.gi;const g=goals()[i];if(!g)return;g[t.dataset.gf]=t.dataset.gf==='n'?Math.max(0,Math.min(999,Math.round(Number(t.value)||0))):t.value;goals()[i]=normGoal(g);save();rerender();return}
 if(t.dataset.ev){const i=+t.closest('[data-gi]').dataset.gi;const g=goals()[i];if(!g)return;evalOf(g)[t.dataset.ev]=t.value;save();rerender();return}
 if(t.dataset.pf){setVal(t.dataset.pf,t.value);save();refreshField(t.dataset.pf);return}
});
document.addEventListener('input',ev=>{const t=ev.target;if(!inStep(t))return;
 if(t.dataset.pf){setVal(t.dataset.pf,t.value);save();return}
 if(t.dataset.gf==='behavior'){const g=goals()[+t.closest('[data-gi]').dataset.gi];if(g){g.behavior=t.value;save()}return}
 if(t.dataset.ev==='reason'){const g=goals()[+t.closest('[data-gi]').dataset.gi];if(g){evalOf(g).reason=t.value;save()}}
});

window.LogSteps={render,printHtml,facts,goals,normGoal,targetOf,shortHasMeasure,evaluate,finalVerdict,resultText,planFields,evalFields,buildPrompt,masked,parseAnswer,applyAnswer,sentenceInfo,issues,applyToMember,planForOld,evalForOld,compactNos,parseNos,setVal,getVal,PARTIAL,VERDICT_TEXT};
})();
