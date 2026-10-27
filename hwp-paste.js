'use strict';
// Browser-only HWP/HWPX selected-text clipboard parser. No file upload or persistent state.
// Output contains only identified field paths; ambiguous fields are excluded.
// v3.21.64: 한글이 복사할 때 함께 보내는 표 모양(HTML)을 읽어 칸 경계를 지킨다(병합 칸·칸 안 여러 줄 포함).
//           글자로만 온 표(칸마다 줄바꿈)는 강점·약점과 목표 표만 번호로 나누고, 나눌 수 없는 표는 넣지 않는다.
(function(root,factory){
 const parser=factory();
 if(typeof module==='object'&&module.exports)module.exports=parser;
 if(root)root.RehabHwpPaste=parser;
})(typeof globalThis==='object'?globalThis:null,function(){
 const NL='\u2028'; // 표 칸 안의 줄바꿈 표시: 표 한 줄을 글 한 줄로 유지하려고 따로 둔다.
 const blank=v=>String(v||'').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/\u00a0/g,' ').trim();
 const label=v=>blank(v).replace(/^[#◈◇▣▢■▶※·•\s]+/,'').replace(/[：:]\s*$/,'').replace(/\s+/g,' ');
 // v3.21.58: 괄호·줄표도 빼고 비교한다(‘회원의 주관적 호소 (대화체)’, ‘욕구 기술 — 주관적 호소에 대한 객관적 기술’).
 const compact=v=>label(v).replace(/^[1-9]\s*[).]\s*/,'').replace(/[\s＆&/／()（）[\]—–-]+/g,'');
 // 칸 값: 칸 안 줄바꿈 표시를 실제 줄바꿈으로 돌리고, 줄 끝 공백과 지나친 빈 줄을 정리한다.
 const toValue=v=>String(v||'').split(/\n|\u2028/).map(x=>x.replace(/[ \t\u3000]+$/,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 // 같은 문장인지 비교할 때: 번호·기호·띄어쓰기를 뺀 글자만 본다.
 const textKey=v=>String(v||'').split(/\n|\u2028/).map(x=>x.replace(/^\s*(?:\d{1,2}\s*[.)．]|[-–•·▪■○◦※])\s*/,'')).join('').replace(/[\s.,·。()（）[\]'"‘’“”!?~:;]/g,'');

 // ---------- 한글 HTML → 글 줄 (표 한 줄 = 글 한 줄, 칸은 탭, 칸 안 줄바꿈은 NL) ----------
 const BLOCK=/^(?:p|div|li|ul|ol|h[1-6]|blockquote|pre|section|article|header|footer|dl|dt|dd|center|caption|address)$/;
 const squash=s=>String(s||'').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/[\s\u00a0]+/g,' ').trim();
 function fromHtml(html,DP){
  const Parser=DP||(typeof DOMParser!=='undefined'?DOMParser:null);
  if(!Parser||!html)return '';
  let doc;try{doc=new Parser().parseFromString(String(html),'text/html')}catch(e){return ''}
  if(!doc||!doc.body)return '';
  doc.querySelectorAll('script,style,svg,iframe,object,embed,head,title,meta,link,template,noscript').forEach(x=>x.remove());
  const SKIP={}; // 가로로 병합된 칸이 차지한 자리
  const cellText=cell=>{const parts=[];let cur='';
   const cut=()=>{const t=squash(cur);if(t)parts.push(t);cur=''};
   const walk=n=>{
    if(n.nodeType===3){cur+=n.nodeValue;return}
    if(n.nodeType!==1)return;
    const tag=n.tagName.toLowerCase();
    if(tag==='br'){cut();return}
    if(tag==='table'){cut();for(const row of grid(n)){const t=row.filter(c=>typeof c==='string'&&c).map(c=>c.split(NL).join(' ')).join(' ');if(t)parts.push(t)}return}
    const block=BLOCK.test(tag);if(block)cut();
    for(const c of n.childNodes)walk(c);
    if(block)cut();
   };
   for(const c of cell.childNodes)walk(c);cut();
   return parts.join(NL);
  };
  // 병합 칸 풀기: 세로 병합은 아래 줄에도 같은 글자를 넣고, 가로 병합은 한 칸으로 둔다.
  const grid=table=>{const out=[],down=[];
   for(const tr of [...(table.rows||[])]){const row=[];let col=0;
    const fill=()=>{while(down[col]&&down[col].left>0){row[col]=down[col].text;down[col].left--;col++}};
    for(const td of [...(tr.cells||[])]){fill();
     const text=cellText(td);
     const rs=Math.min(60,Math.max(1,parseInt(td.getAttribute('rowspan'),10)||1)),cs=Math.min(30,Math.max(1,parseInt(td.getAttribute('colspan'),10)||1));
     for(let k=0;k<cs;k++){row[col+k]=k?SKIP:text;if(rs>1)down[col+k]={text:k?SKIP:text,left:rs-1}}
     col+=cs}
    fill();
    for(let c=col;c<down.length;c++)if(down[c]&&down[c].left>0&&row[c]===undefined){row[c]=down[c].text;down[c].left--}
    out.push(Array.from(row,c=>c===undefined?'':c))}
   return out};
  const lines=[];let cur='';
  const cut=()=>{const t=squash(cur);if(t)lines.push(t);cur=''};
  const walk=n=>{
   if(n.nodeType===3){cur+=n.nodeValue;return}
   if(n.nodeType!==1)return;
   const tag=n.tagName.toLowerCase();
   if(tag==='br'){cut();return}
   if(tag==='table'){cut();
    // 다른 표를 품은 바깥 표(쪽 테두리·틀)는 칸마다 글을 차례로 읽고, 안쪽 표는 표로 읽는다.
    if(n.querySelector('table')){for(const tr of [...(n.rows||[])])for(const td of [...(tr.cells||[])]){for(const c of td.childNodes)walk(c);cut()}return}
    for(const row of grid(n)){const cells=row.filter(c=>c!==SKIP).map(c=>typeof c==='string'?c:'');if(cells.some(Boolean))lines.push(cells.join('\t'))}return}
   const block=BLOCK.test(tag);if(block)cut();
   for(const c of n.childNodes)walk(c);
   if(block)cut();
  };
  walk(doc.body);cut();
  return lines.join('\n');
 }

 // ---------- 제목·항목 이름 ----------
 const SECTION_RE=/^(?:회원및가족의욕구(?:문제)?|심리사회적욕구(?:문제)?|강점및약점|개입목표및계획|재활활동계획|평가및측정도구|참여재활활동|목표및평가|목표및계획)$/;
 const sectionOf=k=>k.startsWith('심리사회적')?'psycho':k.startsWith('강점')?'strength':(k.startsWith('개입목표')||k.startsWith('목표및')||k.startsWith('평가및'))?'goals':(k.startsWith('참여재활')||k.startsWith('재활활동'))?'services':'';
 const MEMBER_RE=/^(?:[1-9][)]\s*)?회원(?:이)?\s*제시하는\s*욕구/,FAMILY_RE=/^(?:[1-9][)]\s*)?가족(?:이)?\s*제시하는\s*욕구/,MANAGER_RE=/^(?:[1-9][)]\s*)?사례관리자(?:가)?\s*보는\s*회원(?:의)?\s*욕구/;
 const SUMMARY_RE=/^(?:사례관리자의\s*의견|종합\s*평가|담당자(?:의)?\s*의견(?:\s*및\s*특이사항)?)$/;
 const SKIP_RE=/^(?:재활계획서\d?|재활평가서|구분|내용|작성일|서명|결재|문제욕구|욕구문제|문제및욕구|평가항목|항목)$/;
 // 서명·바닥글·별첨: 앞 칸에 이어 붙이지 않는다.
 const STOP_RE=/^(?:회원\s*서명|사례관리자\s*서명|담당자\s*서명|작성자\s*[:：]|작성일\s*[:：]|※\s*별첨|별첨\s*[:：]|정신재활시설\s*새희망둥지$|-\s*\d{1,3}\s*-$)|\(인\)\s*$/;
 // 재활 활동 계획의 서비스 영역 이름(글자로만 온 표에서 줄을 나눌 때)
 const AREA_RE=/^(?:사회심리재활|일상생활(?:점검)?(?:및교육)?|건강관리|금전관리|주거자립|직업재활|운동재활|여가(?:활동)?|사회기술훈련|가족(?:지원|교육)?|지역사회(?:적응|통합)?|정신건강교육|교육재활|자립지원|증상관리|약물관리|위기관리)$/;
 // 한쪽 칸만 있는 강점·약점 글을 가를 때 쓰는 말
 const NEG_RE=/어려|부족|못하|못함|않음|않는|않고|잦음|잦고|잦은|문제|저하|충동|위반|갈등|미흡|낮음|낮고|없음|떨어|약함|불안|거부|회피|의존|소극|지각|결석|과음|폭식|불규칙|어김|어기|다툼|싸움|무기력|고립|미숙|서툼|서툴/;
 const POS_RE=/잘함|잘하|좋아|성실|꾸준|적극|원만|협조|우수|능숙|밝음|밝고|친절|책임감|의지가|관심이|긍정|즐김|즐겨|도움을 청|부지런|규칙적/;
 const GOAL_KEYS=/^(?:장기목표|단기목표|재활계획|세부활동(?:내용)?|성과목표(?:달성도(?:분석)?|달성내용(?:서술)?)?|측정지표(?:및성과목표)?|사전측정값|사후측정값|(?:달성|방해)요인(?:회원|직원)?|분석.*)$/;
 // ‘재활 목표 1’ (+ 같은 칸의 장기목표 글). ‘목표 1회 이상’ 같은 본문은 제목이 아니다.
 function goalHeader(text,inRow=false){
  const t=blank(text).replace(/^[#◈◇▣▢■▶※·•\s]+/,'');
  const mt=/^(재활\s*)?목표\s*(\d{1,2})([\s\S]*)$/.exec(t);if(!mt)return null;
  const n=Number(mt[2]);if(n<1||n>40)return null;
  let rest=mt[3];
  if(rest&&!/^(?:\s*[:：.)\]\-–—]|\s*\u2028|\s)/.test(rest))return null;
  rest=rest.replace(/^[\s:：.)\]\-–—\u2028]+/,'').trim();
  if(rest&&!mt[1]&&!inRow)return null;
  if(rest&&GOAL_KEYS.test(compact(rest.split(NL)[0])))return null; // ‘재활목표 1 단기목표’는 항목 이름
  return{i:n-1,title:rest.split(NL).map(s=>s.trim()).filter(Boolean).join(' ')};
 }
 // 칸 안 소제목으로 나누기(‘회원’/‘직원’, ‘측정 지표 및 성과목표’/‘성과목표 달성 내용’/‘분석’)
 function splitSubs(text,defs,fallback){
  const out={};let key=fallback,found=false;
  for(const raw of String(text||'').split(/\n|\u2028/)){const line=raw.trim();if(!line)continue;
   const hit=defs.find(([re])=>re.test(compact(line)));
   if(hit&&compact(line).length<=24){key=hit[1];found=true;continue}
   const mt=/^(.{1,30}?)\s*[:：]\s*(.+)$/.exec(line);const hit2=mt&&defs.find(([re])=>re.test(compact(mt[1])));
   if(hit2){key=hit2[1];found=true;(out[key]=out[key]||[]).push(mt[2].trim());continue}
   (out[key]=out[key]||[]).push(raw)}
  if(!found)return null;
  const res={};for(const [k,v] of Object.entries(out)){const t=toValue(v.join('\n'));if(t)res[k]=t}
  return res;
 }
 const FACTOR_SUBS=[[/^회원(?:요인)?$/,'Member'],[/^(?:직원|담당자)(?:요인)?$/,'Staff']];
 const RESULT_SUBS=[[/^측정지표(?:및성과목표)?$/,'indicator'],[/^성과목표달성내용(?:서술)?$/,'result'],[/^달성내용(?:서술)?$/,'result'],[/^분석(?:변화근거및달성도판단)?$/,'analysis'],[/^(?:성과목표)?달성도분석$/,'analysis']];
 // 강점·약점 칸: ‘1. ~ 2. ~ 3. ~’ 번호로 나눈다. 번호가 없으면 줄마다 한 항목.
 function swItems(cell){
  const lines=String(cell||'').split(/\n|\u2028/).map(s=>s.trim()).filter(Boolean);
  const numRe=/^([1-9])\s*[.)．](?!\d)\s*(.*)$/;
  const numbered=lines.some(s=>numRe.test(s));const out=[];
  for(const s of lines){const mt=numRe.exec(s);
   if(numbered&&mt)out.push({n:Number(mt[1])-1,t:mt[2].trim()});
   else if(numbered&&out.length){const last=out[out.length-1];last.t+=(last.t?'\n':'')+s}
   else out.push({n:null,t:s.replace(/^[-–•·▪■○◦]\s*/,'')})}
  return out;
 }

 function parse(text,requested='plan',categories=[],opts={}){
  const max=Number(opts.maxLength)||16000,fieldMax=Number(opts.fieldMax)||2700;
  const source=String(text||'').replace(/\r\n?/g,'\n').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/\u00a0/g,' ');
  if(!source.replace(/[\s\u2028]/g,''))return{error:'붙여넣은 문서 내용이 비어 있습니다.'};
  if(source.length>max)return{error:'문서 본문은 '+max.toLocaleString('en-US')+'자 이하로 복사해 주세요. 긴 문서는 구간을 나누어 붙여 넣을 수 있습니다.'};
  const first=source.slice(0,1500);
  const titled=/재활\s*평가서/.test(first)?'evaluation':/재활\s*계획서/.test(first)?'plan':'';
  const type=titled||(requested==='evaluation'?'evaluation':'plan');
  const fields=new Map(),ambiguous=new Set(),warnings=[],goalTitles={},skipped=[];
  let active='',buffer=[],section='',person='',goal=0,service=0,rows=null,recognized=false,measure=false,factor='',titleWanted=-1,cut=0,overflow=0,guessed=0,oneSide='';
  const sw={strength:0,weakness:0};
  const put=(path,value,{append=false,soft=false}={})=>{let v=toValue(value);if(!v)return;
   if(v.length>fieldMax){v=v.slice(0,fieldMax);cut++}
   if(fields.has(path)){const old=fields.get(path);if(old===v)return;
    if(append){fields.set(path,(old+'\n'+v).slice(0,fieldMax));return}
    if(soft)return;ambiguous.add(path);return}
   fields.set(path,v)};
  const store=()=>{if(active&&buffer.length)put(active,buffer.join('\n'));active='';buffer=[]};
  const select=(path,initial='')=>{store();active=path;if(blank(initial))buffer.push(initial)};
  const indexedGoal=(i,key)=>type+'.goals.'+i+'.'+key;
  const indexedService=(i,key)=>type+'.'+(type==='plan'?'services':'participation')+'.'+i+'.'+key;
  const catPath=value=>{
   if(type!=='plan')return'';
   const key=compact(value);
   const idx=categories.findIndex(c=>key===compact(c)||key===compact(String(c).replace(/\s*&\s*문제/g,'')));
   return idx>=0?'plan.psycho.'+idx:'';
  };
  const resolve=(heading,contextual=false,sec=section)=>{
   const raw=label(heading).replace(/^[1-9]\s*[).]\s*/,'').trim();
   // 괄호 안 설명(‘(대화체)’, ‘(6개월 이내)’, ‘(서술)’)은 빼고 항목 이름만 비교한다.
   const k=compact(raw.replace(/[(（][^)）]*[)）]/g,''));
   if(!k)return'';
   if(type==='plan'){
    const basics={
     회원의주관적호소:'memberVoice',회원의주관적호소대화체:'memberVoice',회원욕구기술:'memberNeed',
     가족의주관적호소:'familyVoice',가족의주관적호소대화체:'familyVoice',가족욕구기술:'familyNeed',
     사례관리자개입필요영역:'managerNeed',사례관리자판단근거:'managerBasis',근거상담기록:'managerBasis',
     사례관리자의의견:'opinion',
     욕구기술주관적호소에대한객관적기술:'memberNeed',욕구기술가족의호소에대한객관적기술:'familyNeed',
     개입이필요한영역및구체적인이유:'managerNeed',현상태를근거로재활목표와계획을수립한이유:'opinion'
    };
    if(basics[k])return 'plan.'+basics[k];
    if(k==='욕구기술'&&person)return 'plan.'+(person==='member'?'memberNeed':'familyNeed');
    const s=/^(강점|약점)([1-3])$/.exec(k);
    if(s)return'plan.'+(s[1]==='강점'?'strength':'weakness')+'.'+(Number(s[2])-1);
    if(contextual&&sec==='strength'&&(k==='강점'||k==='약점'))return'plan.'+(k==='강점'?'strength':'weakness')+'.0';
    const c=catPath(raw);if(c)return c;
   }else{
    if(k==='종합평가'||k==='목표달성여부및미달성원인에대한객관적서술')return'evaluation.overall';
    if(k==='담당자의의견및특이사항'||k==='담당자의견및특이사항'||k==='담당자의의견'||k==='종합평가에근거한추후신규재활계획반영사항')return'evaluation.opinion';
   }
   const goalTitle=/^재활목표(\d{1,2})(장기목표|단기목표|재활계획|세부활동내용|성과목표달성도분석|성과목표달성도|성과목표달성내용서술|성과목표달성내용|성과목표|측정지표및성과목표|사전측정값|사후측정값|달성요인회원|달성요인직원|방해요인회원|방해요인직원)$/.exec(k);
   const key=goalTitle?goalTitle[2]:k,i=goalTitle?Number(goalTitle[1])-1:goal;
   if(i<0||i>=40)return'';
   const g=type==='plan'?
     {장기목표:'long',단기목표:'short',재활계획:'plan',세부활동내용:'activity',세부활동:'activity',성과목표:'target'}:
     {단기목표:'short',세부활동내용:'activity',세부활동:'activity',성과목표:'indicator',측정지표및성과목표:'indicator',측정지표:'indicator',사전측정값:'before',사후측정값:'after',
      // v3.21.64: ‘성과목표 달성도’ 칸의 글은 달성 내용(서술)으로 넣고, ‘분석’은 따로 쓴 경우에만 분석 칸에 넣는다.
      성과목표달성도:'result',성과목표달성내용:'result',성과목표달성내용서술:'result',달성내용:'result',성과목표달성도분석:'analysis',분석변화근거및달성도판단:'analysis',분석:'analysis',
      달성요인회원:'achMember',달성요인직원:'achStaff',방해요인회원:'blockMember',방해요인직원:'blockStaff'};
   if(g[key]&&(goalTitle||(contextual&&sec==='goals')))return indexedGoal(i,g[key]);
   const serviceTitle=/^(?:재활활동|참여재활활동)(\d{1,2})(서비스영역|제공서비스|자원활용계획|자원활용내역)$/.exec(k);
   const serviceKey=serviceTitle?serviceTitle[2]:k;
   const sv={서비스영역:'type',제공서비스:'service',자원활용계획:'resource',자원활용내역:'resource'};
   if(sv[serviceKey]&&(serviceTitle||(contextual&&sec==='services'))){
    const n=serviceTitle?Number(serviceTitle[1])-1:service;
    return n>=0&&n<40?indexedService(n,sv[serviceKey]):'';
   }
   return'';
  };
  // 표 머리글 → 칸마다 {종류, 항목}. ‘No’ 칸은 번호로만 쓴다.
  const colOf=path=>{let m=/\.goals\.\d+\.(\w+)$/.exec(path);if(m)return{g:'goals',key:m[1]};
   m=/\.(?:services|participation)\.\d+\.(\w+)$/.exec(path);if(m)return{g:'services',key:m[1]};
   m=/^plan\.(strength|weakness)\.\d+$/.exec(path);if(m)return{g:'sw',key:m[1]};return null};
  const headerCols=cells=>{
   const noCol=/^(?:no|번호|순번|연번)$/i.test(compact(cells[0]));
   for(const sec of [section,'goals','services','strength']){
    const hs=cells.map((h,i)=>i===0&&noCol?'#':resolve(h,true,sec));
    if(!hs.every(Boolean)||hs.every(h=>h==='#')||new Set(hs).size!==hs.length)continue;
    const cols=hs.map(h=>h==='#'?{g:'#'}:colOf(h));if(cols.some(c=>!c))continue;
    const kinds=new Set(cols.filter(c=>c.g!=='#').map(c=>c.g));if(kinds.size!==1)continue;
    return cols}
   return null};
  const goalByShort=v=>{const key=textKey(v);if(key.length<2)return -1;
   for(const [p,x] of fields){const mt=/\.goals\.(\d+)\.short$/.exec(p);if(mt&&textKey(x)===key)return Number(mt[1])}
   if(key.length>=6)for(const [p,x] of fields){const mt=/\.goals\.(\d+)\.short$/.exec(p);if(mt&&textKey(x).includes(key))return Number(mt[1])}
   return -1};
  const putSW=(kind,cell)=>{for(const it of swItems(cell)){const i=it.n!=null?it.n:sw[kind];sw[kind]=Math.max(sw[kind],i+1);if(!it.t)continue;
    if(i>2){put('plan.'+kind+'.2',it.t,{append:true});overflow++}else put('plan.'+kind+'.'+i,it.t)}};
  // 표의 한 줄(칸 수가 머리글과 같음)
  const tableRow=cells=>{const cols=rows.cols,kind=cols.find(c=>c.g!=='#').g;
   if(kind==='sw'){cols.forEach((c,i)=>{if(c.g==='sw'&&type==='plan')putSW(c.key,cells[i])});return}
   if(kind==='services'){const idx=rows.next++;if(idx>=40)return;cols.forEach((c,i)=>{if(c.g==='services')put(indexedService(idx,c.key),cells[i])});service=idx;return}
   let idx=-1;const no=cols.findIndex(c=>c.g==='#');
   if(no>=0){const n=parseInt(blank(cells[no]),10);if(n>=1&&n<=40)idx=n-1}
   const si=cols.findIndex(c=>c.key==='short');
   if(idx<0&&rows.measure&&si>=0)idx=goalByShort(cells[si]);
   if(idx<0)idx=rows.next;
   if(idx>=40)return;
   const again=rows.used.has(idx);rows.used.add(idx);rows.next=Math.max(rows.next,idx+1);goal=idx;
   cols.forEach((c,i)=>{if(c.g!=='goals')return;
    if(c.key==='short'&&rows.measure)put(indexedGoal(idx,'short'),cells[i],{soft:true});
    else put(indexedGoal(idx,c.key),cells[i],{append:again})})};
  // ---------- 글자로만 온 표: 머리글 칸이 한 줄씩 이어진 경우 ----------
  const FLAT=[
   {kind:'sw',cols:['강점','약점'],plan:true},
   {kind:'goals',cols:['장기목표','단기목표','재활계획'],no:true,plan:true},
   {kind:'measure',cols:['단기목표','세부활동내용','성과목표'],plan:true,name:'평가 및 측정 도구'},
   {kind:'services',cols:['서비스영역','제공서비스','자원활용계획'],name:'재활 활동 계획'},
   {kind:'services',cols:['서비스영역','제공서비스','자원활용내역'],name:'참여 재활 활동'}];
  const headKey=s=>compact(String(s).replace(/[(（][^)）]*[)）]/g,''));
  const flatAt=(lines,at)=>{
   for(const f of FLAT){if(f.plan&&type!=='plan')continue;let j=at,hasNo=false;
    if(f.no&&/^(?:no|번호|순번|연번)$/i.test(headKey(lines[j]))){hasNo=true;j++}
    let ok=true;for(const c of f.cols){const k=headKey(lines[j]||'');if(k!==c&&!(c==='세부활동내용'&&k==='세부활동'&&headKey(lines[j+1]||'')==='내용')){ok=false;break}j+=(k==='세부활동'&&c==='세부활동내용')?2:1}
    if(ok)return{...f,hasNo,end:j}}
   return null};
  const isStop=s=>{const k=compact(s),h=label(s),h2=h.replace(/^[1-9]\s*[).]\s*/,'');
   return SECTION_RE.test(k)||MEMBER_RE.test(h)||FAMILY_RE.test(h)||MANAGER_RE.test(h)||SUMMARY_RE.test(h2)||!!goalHeader(s)||STOP_RE.test(blank(s))||!!resolve(s,false)};
  const flatTable=(f,body)=>{
   if(f.kind==='sw'){
    const items=[];for(const s of body){const mt=/^([1-9])\s*[.)．](?!\d)\s*(.*)$/.exec(s);if(mt)items.push({n:Number(mt[1]),t:mt[2].trim()});else if(items.length){const l=items[items.length-1];l.t+=(l.t?'\n':'')+s}else return false}
    if(!items.length)return false;
    const ns=items.map(x=>x.n);let S=[],W=[];
    const pairs=ns.length%2===0&&ns.every((n,i)=>n===Math.floor(i/2)+1);
    if(pairs)items.forEach((x,i)=>(i%2?W:S).push(x));
    else{const r=ns.findIndex((n,i)=>i>0&&n<=ns[i-1]);
     if(r<0){ // 번호가 한 번만 이어짐 = 한쪽 칸이 비어 있음: 글 내용으로 강점·약점을 고른다
      const neg=items.filter(x=>NEG_RE.test(x.t)).length,pos=items.filter(x=>POS_RE.test(x.t)).length;
      if(neg>pos)W=items;else S=items;oneSide=W.length?'약점':'강점'}
     else{S=items.slice(0,r);W=items.slice(r);if(W.some((x,i)=>i>0&&x.n<=W[i-1].n))return false}}
    for(const [kind,list] of [['strength',S],['weakness',W]])for(const x of list){if(!x.t)continue;const i=x.n-1;if(i>2){put('plan.'+kind+'.2',x.t,{append:true});overflow++}else put('plan.'+kind+'.'+i,x.t)}
    return true}
   if(f.kind==='goals'){
    const out=[];let cur=null,expect=1;
    const fresh=n=>{cur={n,long:[],short:[],plan:[],phase:'long'};out.push(cur)};
    for(const s of body){
     if(f.hasNo&&/^\d{1,2}$/.test(s)&&Number(s)===expect){fresh(expect);expect++;continue}
     if(!cur){if(f.hasNo)continue;fresh(1)}
     const isNum=/^\d{1,2}\s*[.)．](?!\d)/.test(s),isDash=/^[-–•·▪■○◦※]/.test(s);
     if(!f.hasNo&&cur.phase==='plan'&&!isNum&&!isDash)fresh(out.length+1);
     if(isNum&&cur.phase!=='plan')cur.phase='short';else if(isDash)cur.phase='plan';
     cur[cur.phase].push(s)}
    if(!out.length)return false;
    let prevLong='';
    for(const r of out){if(!r.short.length&&r.long.length>1){r.short=r.long.slice(1);r.long=r.long.slice(0,1)}
     const i=r.n-1;if(i<0||i>=40)continue;
     const lg=r.long.join('\n')||(r.short.length?prevLong:'');if(r.long.length)prevLong=r.long.join('\n');
     put(indexedGoal(i,'long'),lg);put(indexedGoal(i,'short'),r.short.join('\n'));put(indexedGoal(i,'plan'),r.plan.join('\n'))}
    return true}
   if(f.kind==='measure'){
    // 앞의 목표 표에서 읽은 단기목표 글로 줄을 나눈다(없으면 ‘1.’ 번호 줄에서 새 줄).
    const known=[];for(const [p,x] of fields){const mt=/^plan\.goals\.(\d+)\.short$/.exec(p);if(mt){const ls=x.split('\n').map(textKey).filter(Boolean);if(ls.length)known.push({i:Number(mt[1]),set:new Set(ls)})}}
    const out=[];let cur=null,j=0;
    const isNum=s=>/^\d{1,2}\s*[.)．](?!\d)/.test(s);
    while(j<body.length){
     const key=textKey(body[j]),hit=key?known.find(k=>k.set.has(key)):null;
     if(hit){if(!cur||cur.i!==hit.i||cur.rest.length){cur={i:hit.i,rest:[]};out.push(cur)}j++;continue}
     if(!known.length&&isNum(body[j])&&(!cur||cur.rest.length)){const sh=[];while(j<body.length&&isNum(body[j]))sh.push(body[j++]);cur={i:out.length,short:sh,rest:[]};out.push(cur);continue}
     if(!cur)return false;
     cur.rest.push(body[j++])}
    if(!out.length)return false;
    const isT=s=>/\d\s*(?:%|％|회|번|점|개|명|일|시간|분)|이상|이하|미만|초과|여부|달성률|비율/.test(s);
    let n=0;const seen=new Set();
    for(const r of out){const rest=r.rest;if(!rest.length)continue;let act=null,tgt=null;const again=seen.has(r.i);seen.add(r.i);
     const plan=(fields.get(indexedGoal(r.i,'plan'))||'').split('\n').map(textKey).filter(Boolean);
     if(plan.length&&plan.length<rest.length&&plan.every((t,q)=>textKey(rest[q])===t)){act=rest.slice(0,plan.length);tgt=rest.slice(plan.length)}
     else if(rest.length===1){if(isT(rest[0]))tgt=rest;else act=rest}
     else{for(let s=1;s<rest.length&&!act;s++)if(rest.slice(s).every(isT)&&!rest.slice(0,s).some(isT)){act=rest.slice(0,s);tgt=rest.slice(s)}
      if(!act&&rest.length%2===0){act=rest.slice(0,rest.length/2);tgt=rest.slice(rest.length/2)}}
     if(!act&&!tgt)continue;
     if(r.short)put(indexedGoal(r.i,'short'),r.short.join('\n'),{soft:true});
     if(act)put(indexedGoal(r.i,'activity'),act.join('\n'),{append:again});if(tgt)put(indexedGoal(r.i,'target'),tgt.join('\n'),{append:again});n++}
    return n>0}
   if(f.kind==='services'){
    // 영역 이름 줄(사회심리재활·운동재활 …)에서 새 줄, ‘■’ 줄은 제공 서비스, 나머지는 자원
    const bullet=/^[■□▪▫●○◆◇•◦∎※]/;
    const area=s=>!bullet.test(s)&&!/^[-–\d]/.test(s)&&s.length<=16&&!/[.。,]$/.test(s)&&(AREA_RE.test(s.replace(/\s+/g,''))||/(?:재활|관리|교육|훈련|자립|지원|활동|생활)$/.test(s));
    const out=[];let cur=null;
    for(const s of body){if(area(s)){cur={type:s,service:[],resource:[]};out.push(cur);continue}if(!cur)return false;
     if(bullet.test(s)&&!cur.resource.length)cur.service.push(s);else cur.resource.push(s)}
    if(!out.length)return false;
    for(const r of out)if(!r.service.length&&r.resource.length){r.service=r.resource.slice(0,Math.max(1,r.resource.length-1));r.resource=r.resource.slice(r.service.length)}
    out.forEach((r,i)=>{if(i>=40)return;put(indexedService(service+i,'type'),r.type);put(indexedService(service+i,'service'),r.service.join('\n'));put(indexedService(service+i,'resource'),r.resource.join('\n'))});
    return true}
   return false};

  const lines=source.split('\n').map(s=>s.replace(/^[ \u3000]+|[ \u3000]+$/g,'')).filter(s=>s.replace(/[\s\u2028]/g,''));
  for(let li=0;li<lines.length;li++){
   const line=lines[li];
   let raw=line.split('\t').map(blank),cells=raw.filter(Boolean);
   if(!cells.length)continue;
   if(STOP_RE.test(blank(cells.join(' ')))){store();rows=null;titleWanted=-1;continue}
   // 줄 맨 앞 칸이 제목(‘1) 회원이 제시하는 욕구’, ‘재활 목표 1’, ‘3. 강점 및 약점’)이면 그 뜻만 적용하고 나머지 칸을 읽는다.
   for(let guard=0;guard<4&&cells.length>=2;guard++){
    const c0=cells[0],k0=compact(c0),h0=label(c0);let used=true;
    if(SECTION_RE.test(k0)){const s=sectionOf(k0);if(s!==section){store();rows=null;section=s;goal=0;service=0;factor='';measure=k0.startsWith('평가및')}}
    else if(MEMBER_RE.test(h0)||FAMILY_RE.test(h0)){const p=MEMBER_RE.test(h0)?'member':'family';if(p!==person||section!=='voice'){store();rows=null}person=p;section='voice'}
    else if(MANAGER_RE.test(h0)){if(section!=='manager'){store();rows=null}section='manager'}
    else{const gh=goalHeader(c0,true);if(gh){if(gh.i!==goal||section!=='goals'){store();rows=null;factor=''}goal=gh.i;section='goals';if(gh.title&&!goalTitles[gh.i])goalTitles[gh.i]=gh.title}else used=false}
    if(!used)break;
    recognized=true;raw=raw.slice(raw.indexOf(c0)+1);cells=cells.slice(1)}
   if(!cells.length)continue;
   // 표 몸통 한 줄: 머리글과 칸 수가 같으면 칸 위치대로 넣는다(빈 칸 포함).
   if(rows&&raw.length>1&&raw.length===rows.cols.length){tableRow(raw);recognized=true;continue}
   if(rows&&cells.length>1&&cells.length===rows.cols.length){tableRow(cells);recognized=true;continue}
   if(cells.length>=2){
    // 달성/방해 요인 표: ‘구분 | 회원 | 직원’ 머리글 + ‘달성 요인 | … | …’
    if(type==='evaluation'&&cells.length<=3&&compact(cells[cells.length-2])==='회원'&&compact(cells[cells.length-1])==='직원'&&(cells.length===2||/^(?:달성방해요인|달성및방해요인|요인|구분)$/.test(compact(cells[0])))){
     store();rows={factor:true,cols:[]};recognized=true;continue}
    const fk=/^(달성|방해)요인$/.exec(compact(cells[0]));
    if(type==='evaluation'&&fk&&rows?.factor&&cells.length>=2){const k=fk[1]==='달성'?'ach':'block';const v=raw.length===3?raw.slice(1):cells.slice(1);
     put(indexedGoal(goal,k+'Member'),v[0]||'');put(indexedGoal(goal,k+'Staff'),v[1]||'');recognized=true;continue}
    if(type==='evaluation'&&fk&&cells.length>=3&&/^(?:회원|직원)$/.test(compact(cells[1]))){
     recognized=true;rows=null;select(indexedGoal(goal,(fk[1]==='달성'?'ach':'block')+(compact(cells[1])==='회원'?'Member':'Staff')),cells.slice(2).join('\n'));continue}
    if(type==='evaluation'&&fk){const parts=splitSubs(cells.slice(1).join('\n'),FACTOR_SUBS,'Member')||{Member:toValue(cells.slice(1).join('\n'))};
     store();rows=null;recognized=true;const k=fk[1]==='달성'?'ach':'block';for(const [s,v] of Object.entries(parts))put(indexedGoal(goal,k+s),v);continue}
    if(type==='evaluation'&&factor&&section==='goals'&&/^(?:회원|직원)$/.test(compact(cells[0]))){
     recognized=true;rows=null;select(indexedGoal(goal,factor+(compact(cells[0])==='회원'?'Member':'Staff')),cells.slice(1).join('\n'));continue}
    // 표 머리글(‘No | 장기목표 | 단기목표 | 재활 계획’, ‘강점 | 약점’, ‘서비스 영역 | …’)
    const cols=headerCols(cells);
    if(cols){store();const kind=cols.find(c=>c.g!=='#').g;
     const meas=kind==='goals'&&(measure||(cols.some(c=>c.key==='short')&&!cols.some(c=>c.key==='long'||c.key==='plan')));
     rows={cols,next:kind==='services'?service:meas?0:goal,used:new Set(),measure:meas};
     if(kind==='goals')section='goals';else if(kind==='services')section='services';else section='strength';
     recognized=true;titleWanted=-1;continue}
    // 항목 이름 | 내용
    const head=cells[0],initial=cells.slice(1).join('\n');
    let path=resolve(head,true);
    if(path){recognized=true;rows=null;titleWanted=-1;
     const gi=/\.goals\.(\d+)\./.exec(path);if(gi)goal=Number(gi[1]);
     const si=/\.(?:services|participation)\.(\d+)\./.exec(path);if(si)service=Number(si[1]);
     if(type==='evaluation'&&/\.goals\.\d+\.(?:result|indicator|analysis)$/.test(path)){const parts=splitSubs(initial,RESULT_SUBS,path.split('.').pop());
      if(parts){store();for(const [k,v] of Object.entries(parts))put(indexedGoal(goal,k),v);continue}}
     select(path,initial);continue}
    path=resolve(cells.join(' '),true);
    if(path){recognized=true;rows=null;select(path);continue}
    if(cells.every(c=>SKIP_RE.test(compact(c)))){store();rows=null;continue}
    if(rows)continue; // 표 안의 칸 수가 다른 줄은 어느 칸인지 알 수 없어 넣지 않는다
    if(active&&buffer.join('').length<fieldMax-50)buffer.push(cells.join('\n'));
    continue;
   }
   // ---------- 칸 하나(한 줄) ----------
   const one=cells[0],header=label(one),simple=compact(one);
   const flat=flatAt(lines,li);
   if(flat){store();rows=null;recognized=true;titleWanted=-1;
    let j=flat.end;const body=[];while(j<lines.length&&!isStop(lines[j])&&!flatAt(lines,j)){body.push(...lines[j].split('\t').map(blank).filter(Boolean));j++}
    if(flat.kind==='sw')section='strength';else if(flat.kind==='goals'||flat.kind==='measure')section='goals';else section='services';
    if(flatTable(flat,body))guessed++;else if(body.length)skipped.push(flat.name||(flat.kind==='sw'?'강점 및 약점':'목표 및 계획'));
    li=j-1;continue}
   if(SECTION_RE.test(simple)){
    store();rows=null;recognized=true;goal=0;service=0;factor='';titleWanted=-1;measure=simple.startsWith('평가및');section=sectionOf(simple);continue}
   if(MEMBER_RE.test(header)){person='member';section='voice';rows=null;recognized=true;select('plan.memberVoice');continue}
   if(FAMILY_RE.test(header)){person='family';section='voice';rows=null;recognized=true;select('plan.familyVoice');continue}
   if(MANAGER_RE.test(header)){section='manager';rows=null;recognized=true;select('plan.managerNeed');continue}
   if(/^욕구\s*기술$/.test(header)&&person&&section==='voice'){recognized=true;select('plan.'+(person==='member'?'memberNeed':'familyNeed'));continue}
   const gh=goalHeader(one,false);
   if(gh){store();goal=gh.i;section='goals';rows=null;factor='';recognized=true;
    if(gh.title){if(!goalTitles[gh.i])goalTitles[gh.i]=gh.title;titleWanted=-1}else titleWanted=type==='evaluation'?gh.i:-1;continue}
   if(SUMMARY_RE.test(header.replace(/^[1-9]\s*[).]\s*/,''))){
    section='summary';rows=null;recognized=true;titleWanted=-1;
    select(type==='plan'?'plan.opinion':/종합\s*평가/.test(header)?'evaluation.overall':'evaluation.opinion');continue}
   if(type==='evaluation'&&section==='goals'){
    const fk=/^(달성|방해)요인$/.exec(simple);
    if(fk){store();rows=null;recognized=true;titleWanted=-1;factor=fk[1]==='달성'?'ach':'block';continue}
    if(factor&&/^(?:회원|직원)$/.test(simple)){recognized=true;select(indexedGoal(goal,factor+(simple==='회원'?'Member':'Staff')));continue}
   }
   const bracket=/^\[([^\]\n]{2,110})\]\s*(.*)$/.exec(one);
   let head=bracket?bracket[1]:'',initial=bracket?bracket[2]:'';
   if(!head){const colon=/^(.{2,90}?)\s*[:：]\s*(.+)$/.exec(header);if(colon){head=colon[1];initial=colon[2]}}
   let path=head?resolve(head,true):'';
   if(!path){path=resolve(header,true);if(path)initial=''}
   if(path){
    recognized=true;rows=null;titleWanted=-1;
    if(!/\.(?:achMember|achStaff|blockMember|blockStaff)$/.test(path))factor='';
    const gi=/\.goals\.(\d+)\./.exec(path);if(gi)goal=Number(gi[1]);
    const si=/\.(?:services|participation)\.(\d+)\./.exec(path);if(si)service=Number(si[1]);
    select(path,initial);continue;
   }
   // 칸 안에서 두세 줄로 나뉜 항목 이름(‘일차적 지지집단과의’ + ‘욕구 & 문제’)
   {let jp='',take=0;
    for(let k=1;k<=2&&li+k<lines.length&&!jp;k++){const nx=lines.slice(li+1,li+1+k);if(nx.some(s=>s.includes('\t')||s.length>40))break;
     const p=resolve([one,...nx].join(' '),true);if(p){jp=p;take=k}}
    if(jp){recognized=true;rows=null;titleWanted=-1;const gi=/\.goals\.(\d+)\./.exec(jp);if(gi)goal=Number(gi[1]);select(jp);li+=take;continue}}
   if(type==='plan'&&section==='psycho'){
    const idx=categories.findIndex(c=>header.startsWith(c)||header.startsWith(String(c).replace(/\s*&\s*문제/,'')));
    if(idx>=0){
     const remaining=header.startsWith(categories[idx])?header.slice(categories[idx].length).trim():'';
     select('plan.psycho.'+idx,remaining);recognized=true;continue;
    }
   }
   if(SKIP_RE.test(simple)||/^(?:재활\s*계획서|재활\s*평가서)\s*\d?$/.test(header)){store();rows=null;continue}
   if(titleWanted>=0&&!active){if(!goalTitles[titleWanted])goalTitles[titleWanted]=header;titleWanted=-1;continue}
   titleWanted=-1;
   if(rows&&!active)continue;
   if(active&&buffer.join('').length<fieldMax-50)buffer.push(one);
  }
  store();for(const item of ambiguous)fields.delete(item);
  if(ambiguous.size)warnings.push('중복되거나 구분이 모호한 '+ambiguous.size+'개 항목은 제외했습니다.');
  if(oneSide)warnings.push('강점·약점 표에서 한쪽 칸만 글이 있어, 내용을 보고 '+oneSide+' 칸에 넣었습니다. 맞는지 확인해 주세요.');
  if(guessed)warnings.push('한글이 표 모양 없이 글자만 보내서, 번호와 순서로 표의 칸을 나눴습니다. 칸마다 맞게 들어갔는지 확인해 주세요.');
  if(skipped.length)warnings.push('글자로만 복사된 표('+[...new Set(skipped)].join(', ')+')는 칸을 나눌 수 없어 넣지 않았습니다.');
  if(overflow)warnings.push('강점·약점이 3개를 넘는 부분은 3번째 칸에 이어 붙였습니다.');
  if(cut)warnings.push('너무 긴 칸 '+cut+'곳은 '+fieldMax.toLocaleString('en-US')+'자까지만 넣었습니다.');
  if(!fields.size)warnings.push('확실하게 구분되는 항목이 없습니다. 제목과 내용을 함께 복사해 주세요.');
  return{type,titled:!!titled,fields:Object.fromEntries(fields),matched:fields.size,paths:[...fields.keys()],titles:goalTitles,guessed,
   recognized,warnings,goalTitles,skipped:[...new Set(skipped)]};
 }

 // 클립보드(또는 끌어다 놓은 글)에서 표 모양(HTML)과 글자를 모두 읽어, 칸을 더 많이 알아본 쪽을 쓴다.
 // 제목(재활계획서/재활평가서)이 없으면 두 문서 종류로 모두 읽어 더 많이 맞는 쪽을 고른다.
 function read(input,requested='plan',categories=[],opts={}){
  const html=String(input?.html||''),text=String(input?.text||'');const cands=[];
  if(/<t[dh][\s>]/i.test(html)){const t=fromHtml(html,opts.DOMParser);if(t.replace(/[\s\u2028]/g,''))cands.push({text:t,via:'table'})}
  if(text.trim())cands.push({text,via:'text'});
  else if(html&&!cands.length){const t=fromHtml(html,opts.DOMParser);if(t.replace(/[\s\u2028]/g,''))cands.push({text:t,via:'html'})}
  if(!cands.length)return{error:'붙여넣은 문서 내용이 비어 있습니다.'};
  const want=requested==='evaluation'?'evaluation':'plan',other=want==='plan'?'evaluation':'plan';let best=null,err=null;
  for(const c of cands)for(const t of [want,other]){const r=parse(c.text,t,categories,opts);if(r.error){err=err||r;continue}
   const score=r.matched*10+(r.recognized?1:0)+(c.via==='table'?0.5:0)+(r.type===want?0.2:0);
   if(!best||score>best.score)best={...r,via:c.via,mode:c.via==='text'?'text':'html',score}}
  return best||err;
 }
 // app.js에서 쓰는 이름: 클립보드({html,text}) 읽기 · 표 모양(HTML)만 읽기
 const parseClipboard=(clip,requested,categories,opts={})=>read(typeof clip==='string'?{text:clip}:clip,requested,categories,{maxLength:60000,...opts});
 const parseHtml=(html,requested,categories,opts={})=>{const t=fromHtml(html,opts.DOMParser);if(!t)return{error:'붙여넣은 문서 내용이 비어 있습니다.'};const r=parse(t,requested,categories,{maxLength:60000,...opts});return r.error?r:{...r,via:'table',mode:'html'}};
 return{parse,read,fromHtml,parseClipboard,parseHtml};
});
