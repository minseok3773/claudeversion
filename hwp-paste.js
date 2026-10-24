'use strict';
// Browser-only HWP/HWPX selected-text clipboard parser. No file upload or persistent state.
// Output contains only identified field paths; ambiguous fields are excluded.
(function(root,factory){
 const parser=factory();
 if(typeof module==='object'&&module.exports)module.exports=parser;
 if(root)root.RehabHwpPaste=parser;
})(typeof globalThis==='object'?globalThis:null,function(){
 const blank=v=>String(v||'').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/\u00a0/g,' ').trim();
 const label=v=>blank(v).replace(/^[#◈◇▣▢■▶※·•\s]+/,'').replace(/[：:]\s*$/,'').replace(/\s+/g,' ');
 // v3.21.58: 괄호·줄표도 빼고 비교한다(‘회원의 주관적 호소 (대화체)’, ‘욕구 기술 — 주관적 호소에 대한 객관적 기술’).
 const compact=v=>label(v).replace(/^[1-9]\s*[).]\s*/,'').replace(/[\s＆&/／()（）[\]—–-]+/g,'');
 function parse(text,requested='plan',categories=[]){
  const source=String(text||'').replace(/\r\n?/g,'\n').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/\u00a0/g,' ');
  if(!source.trim())return{error:'붙여넣은 문서 내용이 비어 있습니다.'};
  if(source.length>16000)return{error:'문서 본문은 16,000자 이하로 복사해 주세요. 긴 문서는 구간을 나누어 등록할 수 있습니다.'};
  const first=source.slice(0,1500);
  const type=/재활\s*평가서/.test(first)?'evaluation':/재활\s*계획서/.test(first)?'plan':requested==='evaluation'?'evaluation':'plan';
  const fields=new Map(),ambiguous=new Set(),warnings=[];
  let active='',buffer=[],section='',person='',goal=0,service=0,rows=null,recognized=false;
  const store=()=>{
   if(active&&buffer.length){
    const value=buffer.join('\n').trim().slice(0,2700);
    if(value){
     if(fields.has(active)&&fields.get(active)!==value)ambiguous.add(active);
     else fields.set(active,value);
    }
   }
   active='';buffer=[];
  };
  const select=(path,initial='')=>{store();active=path;if(initial)buffer.push(initial)};
  const indexedGoal=(i,key)=>type+'.goals.'+i+'.'+key;
  const indexedService=(i,key)=>type+'.'+(type==='plan'?'services':'participation')+'.'+i+'.'+key;
  const catPath=value=>{
   if(type!=='plan')return'';
   const key=compact(value);
   const idx=categories.findIndex(c=>key===compact(c)||key===compact(String(c).replace(/\s*&\s*문제/g,'')));
   return idx>=0?'plan.psycho.'+idx:'';
  };
  const resolve=(heading,contextual=false)=>{
   const raw=label(heading).replace(/^[1-9]\s*[).]\s*/,'').trim();
   // 괄호 안 설명(‘(대화체)’, ‘(6개월 이내)’)은 빼고 항목 이름만 비교한다.
   const k=compact(raw.replace(/[(（][^)）]*[)）]/g,''));
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
    const sw=/^(강점|약점)([1-3])$/.exec(k);
    if(sw)return'plan.'+(sw[1]==='강점'?'strength':'weakness')+'.'+(Number(sw[2])-1);
    if(contextual&&section==='strength'&&(k==='강점'||k==='약점'))return'plan.'+(k==='강점'?'strength':'weakness')+'.0';
    const c=catPath(raw);if(c)return c;
   }else{
    if(k==='종합평가'||k==='목표달성여부및미달성원인에대한객관적서술')return'evaluation.overall';
    if(k==='담당자의의견및특이사항'||k==='담당자의견및특이사항'||k==='담당자의의견'||k==='종합평가에근거한추후신규재활계획반영사항')return'evaluation.opinion';
   }
   const goalTitle=/^재활목표(\d{1,2})(장기목표|단기목표|재활계획|세부활동내용|성과목표달성도분석|성과목표달성도|성과목표|측정지표및성과목표|사전측정값|사후측정값|달성요인회원|달성요인직원|방해요인회원|방해요인직원)$/.exec(k);
   const key=goalTitle?goalTitle[2]:k,i=goalTitle?Number(goalTitle[1])-1:goal;
   if(i<0||i>=40)return'';
   const g=type==='plan'?
     {장기목표:'long',단기목표:'short',재활계획:'plan',세부활동내용:'activity',성과목표:'target'}:
     {단기목표:'short',세부활동내용:'activity',성과목표:'indicator',측정지표및성과목표:'indicator',사전측정값:'before',사후측정값:'after',성과목표달성도:'analysis',성과목표달성도분석:'analysis',달성요인회원:'achMember',달성요인직원:'achStaff',방해요인회원:'blockMember',방해요인직원:'blockStaff'};
   if(g[key]&&(goalTitle||(contextual&&section==='goals')))return indexedGoal(i,g[key]);
   const serviceTitle=/^(?:재활활동|참여재활활동)(\d{1,2})(서비스영역|제공서비스|자원활용계획|자원활용내역)$/.exec(k);
   const serviceKey=serviceTitle?serviceTitle[2]:k;
   const sv={서비스영역:'type',제공서비스:'service',자원활용계획:'resource',자원활용내역:'resource'};
   if(sv[serviceKey]&&(serviceTitle||(contextual&&section==='services'))){
    const n=serviceTitle?Number(serviceTitle[1])-1:service;
    return n>=0&&n<40?indexedService(n,sv[serviceKey]):'';
   }
   return'';
  };
  const lines=source.split('\n').map(s=>s.trim()).filter(Boolean);
  for(const line of lines){
   const header=label(line),simple=compact(line);
   if(/^(?:회원및가족의욕구(?:문제)?|심리사회적욕구(?:문제)?|강점및약점|개입목표및계획|재활활동계획|평가및측정도구|참여재활활동|목표및평가|목표및계획)$/.test(simple)){
    store();rows=null;recognized=true;goal=0;service=0;
    if(simple.startsWith('심리사회적'))section='psycho';
    else if(simple.startsWith('강점'))section='strength';
    else if(simple.startsWith('개입목표')||simple.startsWith('목표및'))section='goals';
    else if(simple.startsWith('평가및'))section='goals';
    else if(simple.startsWith('참여재활')||simple.startsWith('재활활동'))section='services';
    else section='';continue;
   }
   if(/^(?:[1-9][)]\s*)?회원(?:이)?\s*제시하는\s*욕구/.test(header)){
    person='member';section='voice';rows=null;recognized=true;select('plan.memberVoice');continue;
   }
   if(/^(?:[1-9][)]\s*)?가족(?:이)?\s*제시하는\s*욕구/.test(header)){
    person='family';section='voice';rows=null;recognized=true;select('plan.familyVoice');continue;
   }
   if(/^(?:[1-9][)]\s*)?사례관리자(?:가)?\s*보는\s*회원(?:의)?\s*욕구/.test(header)){
    section='manager';rows=null;recognized=true;select('plan.managerNeed');continue;
   }
   if(/^욕구\s*기술$/.test(header)&&person&&section==='voice'){
    recognized=true;select('plan.'+(person==='member'?'memberNeed':'familyNeed'));continue;
   }
   const goalHead=/^(?:재활\s*)?목표\s*(\d{1,2})$/.exec(header);
   if(goalHead&&Number(goalHead[1])>=1&&Number(goalHead[1])<=40){
    store();goal=Number(goalHead[1])-1;section='goals';rows=null;recognized=true;continue;
   }
   if(/^(?:사례관리자의\s*의견|종합\s*평가|담당자(?:의)?\s*의견(?:\s*및\s*특이사항)?)$/.test(header)){
    section='summary';rows=null;recognized=true;
    select(type==='plan'?'plan.opinion':/종합\s*평가/.test(header)?'evaluation.overall':'evaluation.opinion');continue;
   }
   const bracket=/^\[([^\]\n]{2,110})\]\s*(.*)$/.exec(line);
   const cells=line.split(/\t+/).map(blank);
   let head=bracket?bracket[1]:'',initial=bracket?bracket[2]:'';
   if(!head&&cells.length>=2){head=cells[0];initial=cells.slice(1).join('\n')}
   if(!head){const colon=/^(.{2,90}?)\s*[:：]\s*(.+)$/.exec(header);
    if(colon){head=colon[1];initial=colon[2]}
   }
   // HWP 표 머리글을 일반 단일 필드보다 먼저 검사하여 열 이름을 본문으로 잘못 넣지 않는다.
   if(cells.length>=2){
    // ‘No | 장기목표 | 단기목표 | 재활 계획’처럼 맨 앞이 번호 칸인 표도 알아본다(번호 칸은 건너뜀).
    const noCol=/^(?:no|번호|순번|연번)$/i.test(compact(cells[0]));
    const headings=cells.map((h,i)=>i===0&&noCol?'#':resolve(h,true));
    const firstField=headings.find(h=>h&&h!=='#')||'';
    if(firstField&&headings.every(Boolean)&&new Set(headings).size===headings.length){
     store();rows={headings};section=firstField.includes('.goals.')?'goals':/\.(?:strength|weakness)\./.test(firstField)?'strength':'services';recognized=true;continue;
    }
    if(rows&&cells.length===rows.headings.length){
     store();
     // v3.21.58: ‘강점 | 약점’ 표는 줄마다 1·2·3번째 칸으로 넣는다(앞의 ‘1.’ 번호는 뺌).
     const first=rows.headings.find(h=>h!=='#')||'';
     const swRow=/\.(?:strength|weakness)\.\d+$/.test(first);
     rows.headings.forEach((field,i)=>{
      if(field==='#')return;
      const value=swRow?cells[i].replace(/^[1-3]\s*[.)]\s*/,''):cells[i];
      if(swRow&&!/\.[0-2]$/.test(field))return;
      if(fields.has(field)&&fields.get(field)!==value)ambiguous.add(field);
      else if(value)fields.set(field,value);
     });
     if(first.includes('.goals.')){
      goal++;rows.headings=rows.headings.map(h=>h.replace(/\.goals\.\d+\./,'.goals.'+goal+'.'));
     }else if(swRow){
      rows.headings=rows.headings.map(h=>h.replace(/\.(strength|weakness)\.(\d+)$/,(_,k,n)=>'.'+k+'.'+(Number(n)+1)));
     }else{
      service++;rows.headings=rows.headings.map(h=>h.replace(/\.(services|participation)\.\d+\./,'.$1.'+service+'.'));
     }
     continue;
    }
   }
   let path=head?resolve(head,true):'';
   if(!path){path=resolve(header,true);if(path)initial=''}
   if(path){
    recognized=true;rows=null;
    const gi=/\.goals\.(\d+)\./.exec(path);if(gi)goal=Number(gi[1]);
    const si=/\.(?:services|participation)\.(\d+)\./.exec(path);if(si)service=Number(si[1]);
    select(path,initial);continue;
   }
   if(type==='plan'&&section==='psycho'){
    const idx=categories.findIndex(c=>header.startsWith(c)||header.startsWith(String(c).replace(/\s*&\s*문제/,'')));
    if(idx>=0){
     const remaining=header.startsWith(categories[idx])?header.slice(categories[idx].length).trim():'';
     select('plan.psycho.'+idx,remaining);recognized=true;continue;
    }
   }
   if(/^(?:재활\s*계획서|재활\s*평가서|구분|내용|작성일|서명|결재)$/.test(header)){store();rows=null;continue}
   if(active&&buffer.join('').length<2650)buffer.push(line);
  }
  store();for(const item of ambiguous)fields.delete(item);
  if(ambiguous.size)warnings.push('중복되거나 구분이 모호한 '+ambiguous.size+'개 항목은 제외했습니다.');
  if(!fields.size)warnings.push('확실하게 구분되는 항목이 없습니다. 제목과 내용을 함께 복사해 주세요.');
  return{type,fields:Object.fromEntries(fields),matched:fields.size,paths:[...fields.keys()],
   recognized,warnings};
 }
 return{parse};
});
