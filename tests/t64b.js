// v3.21.64 — 재활계획서·재활평가서 화면에 한글 문서 붙여넣기(가상 자료)
const {boot,ok,done}=require('./h.js');const {stored57,member57}=require('./fix57.js');const F=require('./fix64.js');
const DIR=require('path').resolve(__dirname,'..');
const blank=(id='mem-n',label='회원 009')=>({id,label,notes:[],periodStart:'2026-04-01',periodEnd:'2026-09-30',plan:{},evaluation:{}});
const st=(...members)=>({members,memberId:members[0].id,save:true,references:[],activityDict:[],writerProfiles:[{id:'writer-default',name:'기본 작성자',planStyle:'',evaluationStyle:''}],writerId:'writer-default'});
const clip=(html,text)=>({getData:k=>k==='text/html'?html:k==='text/plain'?text:'',files:[]});
function paste(t,el,html,text){if(typeof el==='string')el=t.$(el);const e=new t.w.Event('paste',{bubbles:true,cancelable:true});e.clipboardData=clip(html,text);el.dispatchEvent(e);return e}
function drop(t,el,html,text){if(typeof el==='string')el=t.$(el);const e=new t.w.Event('drop',{bubbles:true,cancelable:true});e.dataTransfer=clip(html,text);el.dispatchEvent(e);return e}
const answers=[];const confirmFn=m=>answers.length?answers.shift():true;
const P=F.plan,E=F.evaluation;
(async()=>{
 console.log('[1] 빈 재활계획서에 한글 표(표 모양 정보) 붙여넣기 → 칸마다 들어감 · 되돌리기');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  ok(!!t.$('#hwpDocBox #hwpDocPaste')&&/한글 문서에서 붙여넣기/.test(t.$('#hwpDocBox').textContent),'붙여넣기 칸 보임');
  const e=paste(t,'#hwpDocPaste',F.planHtml,F.planText);ok(e.defaultPrevented,'붙여넣기 칸에는 글이 들어가지 않음');
  const p=t.ev('member().plan');
  ok(p.memberVoice===P.voice.join('\n')&&p.familyNeed===P.fneed.join('\n')&&p.managerNeed===P.manager.join('\n'),'욕구 칸');
  ok(P.psychoText.every((x,i)=>p.psycho[i]===x),'심리사회 8칸');
  ok(P.strength.every((x,i)=>p.strength[i]===x)&&P.weakness.every((x,i)=>p.weakness[i]===x),'강점 3·약점 3',[p.strength,p.weakness]);
  ok(P.goals.every((g,i)=>['long','short','plan','activity','target'].every(k=>p.goals[i][k]===g[k]))&&p.goals.length===4&&p.goals.every(g=>g.id),'목표 3개(4칸 유지, 목표 ID 있음)');
  ok(p.services.length===2&&p.services[1].resource==='인근 공원','재활 활동 계획 2줄');
  ok(p.opinion===P.opinion,'사례관리자 의견');
  ok(p.needSrc.member==='manual'&&p.needSrc.family==='manual','붙여 넣은 욕구 기술은 자동 작성으로 덮지 않음',p.needSrc);
  const msg=t.$('#hwpDocBox .hwp-doc-msg')?.textContent||'';ok(/41개 칸을 재활계획서에 넣었습니다\(표 모양 그대로 읽음\)/.test(msg)&&/강점 3칸 · 약점 3칸 · 목표 3개 · 재활 활동 2줄/.test(msg),'결과 안내',msg);
  t.flush();ok(t.saved().members[0].plan.strength[2]===P.strength[2],'저장됨');
  answers.push(true);t.click('[data-act="hwp-undo"]');const q=t.ev('member().plan');
  ok(!q.memberVoice&&!q.strength[0]&&!q.goals[0].long&&/되돌렸습니다/.test(t.$('#hwpDocBox').textContent),'되돌리기 → 붙여넣기 전 상태');
  ok(!t.$('[data-act="hwp-undo"]'),'되돌린 뒤 버튼 없음');
  ok(!t.errors.length,'화면 오류 없음',t.errors)}
 console.log('[2] 글자만 온 경우(칸마다 한 줄) — 예전에 비던 칸도 채움');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  paste(t,'#hwpDocPaste','',F.planText);const p=t.ev('member().plan');
  ok(p.psycho[0]===P.psychoText[0]&&p.psycho[1]===P.psychoText[1],'두 줄 영역 이름(일차적 지지집단과의 …)',p.psycho.slice(0,2));
  ok(P.strength.every((x,i)=>p.strength[i]===x)&&P.weakness.every((x,i)=>p.weakness[i]===x),'강점·약점이 한 칸에 몰리지 않음',[p.strength,p.weakness]);
  ok(p.goals[1].long===P.goals[1].long&&p.goals[2].plan===P.goals[2].plan&&p.goals[0].target===P.goals[0].target,'목표 표·측정 도구 표',p.goals.map(g=>[g.long,g.short]));
  const msg=t.$('#hwpDocBox .hwp-doc-msg')?.textContent||'';ok(/글자만 읽음/.test(msg)&&/칸을 나눴습니다/.test(msg),'읽은 방식·확인 안내',msg)}
 console.log('[3] 이미 쓴 계획서: [취소]면 빈 칸만, [확인]이면 바꿈');
 {const t=boot(DIR,{stored:stored57({withLegacy:false}),confirmFn});t.ev("state.view='plan';paint()");
  answers.push(false);paste(t,'#hwpDocPaste',F.planHtml,F.planText);
  const asked=t.logs.filter(l=>l[0]==='confirm').pop()?.[1]||'';ok(/이미 입력된 칸 \d+곳/.test(asked)&&/빈 칸만 채우기/.test(asked),'덮어쓰기 물음',asked);
  let p=t.ev('member().plan');ok(p.memberVoice==='“걸으니까 기분이 좋다”'&&p.familyVoice===P.fvoice.join('\n')&&p.strength[0]==='산책 프로그램에 꾸준히 참여함.'&&p.strength[2]===P.strength[2],'빈 칸만 채움',[p.memberVoice,p.familyVoice,p.strength]);
  ok(/그대로 두었습니다/.test(t.$('#hwpDocBox').textContent),'그대로 둔 칸 안내');
  answers.push(true);paste(t,'#hwpDocPaste',F.planHtml,F.planText);p=t.ev('member().plan');
  ok(p.memberVoice===P.voice.join('\n')&&p.strength[0]===P.strength[0]&&p.goals[0].long===P.goals[0].long&&p.goals[0].id==='g1','[확인]이면 바꿈(목표 ID는 그대로)',[p.memberVoice,p.goals[0].id]);
  ok(p.goals[0].longSince==='','바뀐 장기목표는 ‘이어 온 목표’ 표시를 지움')}
 console.log('[4] 계획서 화면에 평가서를 붙이면 물어보고 평가서로');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  answers.push(true);paste(t,'#hwpDocPaste',F.evalHtml,F.evalText);
  ok(/재활평가서로 보입니다/.test(t.logs.filter(l=>l[0]==='confirm')[0]?.[1]||''),'물음');
  const e=t.ev('member().evaluation');ok(t.ev('state.view')==='evaluation'&&e.goals[0].achStaff===E.goals[0].achStaff&&e.overall===E.overall,'평가서 화면으로 가서 넣음',t.ev('state.view'));
  ok(t.ev('member().plan.goals.every(g=>!g.short)'),'계획서는 그대로');
  ok(e.participation.length===2&&e.participation[1].type==='운동재활','참여 재활 활동(기본 줄 정리)',e.participation.map(x=>x.type))}
 console.log('[5] 계획서와 같은 목표의 평가서 → 계획서 목표에 연결, 자동 맞춤에서도 붙여 넣은 글 유지');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");paste(t,'#hwpDocPaste',F.planHtml,F.planText);
  // 평가서의 2번 목표 = 계획서 3번 목표(단기목표 두 줄)
  const html=F.evalHtml.replace(F.TD(E.goals[1].short,' colspan="2"'),F.TD(P.goals[2].short,' colspan="2"'));
  t.ev("state.view='evaluation';paint()");answers.length=0;paste(t,'#hwpDocPaste',html,'');
  ok(!t.logs.some(l=>l[0]==='confirm'&&/문구가 다릅니다/.test(l[1])),'목표 문구가 같으면 묻지 않음');
  const ids=t.ev('member().plan.goals.map(g=>g.id)'),e=t.ev('member().evaluation');
  // 계획서를 붙일 때 평가서 칸이 이미 계획 목표 순서대로 연결됨 → 붙인 2번 목표는 계획 3번 목표에 연결된 칸으로
  const g3=e.goals.find(g=>g.goalId===ids[2]);
  ok(e.goals[0].goalId===ids[0]&&g3&&g3.short===P.goals[2].short&&g3.achMember===E.goals[1].achMember&&e.goals[0].basis===P.goals[0].short,'평가 목표 1→계획 목표 1, 평가 목표 2→계획 목표 3의 칸',[e.goals.map(g=>g.goalId),ids]);
  ok(e.goals[0].src==='hwp'&&!e.keepGoals,'붙여 넣은 목표 표시');
  t.click('[data-act="navigate"][data-view="plan"]');t.click('[data-act="navigate"][data-view="evaluation"]');
  const e2=t.ev('member().evaluation'),g3b=e2.goals.find(g=>g.goalId===ids[2]);ok(e2.goals[0].activity===E.goals[0].activity&&e2.goals[0].result===E.goals[0].result&&g3b.activity===E.goals[1].activity&&g3b.achMember===E.goals[1].achMember,'평가서 화면을 다시 열어도(자동 맞춤) 붙여 넣은 세부활동·달성 내용 유지',[e2.goals[0].activity,e2.goals[0].result]);
  // 계획서의 단기목표를 고치면 평가서도 따라감(붙여 넣은 목표도 연결되어 있음)
  t.ev("member().plan.goals[0].short='1. 하루 일과표를 매일 작성함.';syncPlanToEval(member())");ok(t.ev('member().evaluation.goals[0].short')==='1. 하루 일과표를 매일 작성함.','연결된 목표는 계획서 수정이 반영됨')}
 console.log('[6] 계획서와 목표 문구가 다른 평가서 → 그대로 두기 / 계획서에 맞추기');
 {let t=boot(DIR,{stored:stored57({withLegacy:false}),confirmFn});t.ev("state.view='evaluation';paint()");
  answers.push(true);paste(t,'#hwpDocPaste',F.evalHtml,'');
  ok(/목표 2개가 지금 재활계획서의 목표와 문구가 다릅니다/.test(t.logs.filter(l=>l[0]==='confirm')[0]?.[1]||''),'물음',t.logs.filter(l=>l[0]==='confirm').map(l=>l[1].slice(0,40)));
  let e=t.ev('member().evaluation');ok(e.keepGoals===true&&e.goals[0].short===E.goals[0].short&&e.goals[0].goalId==='g1','[확인] 붙여 넣은 문구 그대로 + 계획서 목표에 연결',[e.keepGoals,e.goals[0].short,e.goals[0].goalId]);
  ok(/자동으로 바뀌지 않습니다/.test(t.$('#hwpDocBox').textContent),'유지 중 안내');
  ok(t.ev('syncDraftEvaluationFromPlan(member()).skipped')==='kept','자동 맞춤 건너뜀');
  answers.push(true);t.click('[data-act="sync-goals"]');ok(!t.ev('member().evaluation.keepGoals')&&t.ev('member().evaluation.goals[0].short')===t.ev('member().plan.goals[0].short'),'‘계획서 목표 가져오기’를 누르면 다시 맞춤');
  t=boot(DIR,{stored:stored57({withLegacy:false}),confirmFn});t.ev("state.view='evaluation';paint()");answers.length=0;
  answers.push(false);paste(t,'#hwpDocPaste',F.evalHtml,'');e=t.ev('member().evaluation');const pl=t.ev('member().plan');
  ok(!e.keepGoals&&e.goals[0].short===pl.goals[0].short&&e.goals[0].achMember===E.goals[0].achMember&&e.goals[0].result===E.goals[0].result,'[취소] 목표 문구는 계획서, 나머지는 붙여 넣은 평가 내용',[e.goals[0].short.slice(0,20),e.goals[0].achMember])}
 console.log('[7] 문서 칸에 바로 붙여넣기 · 끌어다 놓기');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  let e=paste(t,'[data-bind="plan.opinion"]',F.planHtml,F.planText);ok(e.defaultPrevented&&t.ev('member().plan.strength[1]')===P.strength[1]&&t.ev('member().plan.opinion')===P.opinion,'표를 칸에 붙이면 해당 칸마다 나눠 넣음');
  e=paste(t,'[data-bind="plan.familyVoice"]','','근거 한 줄');ok(!e.defaultPrevented,'한 줄 글은 보통 붙여넣기');
  e=paste(t,'[data-bind="plan.familyVoice"]','','첫 줄\n둘째 줄\n셋째 줄');ok(!e.defaultPrevented,'항목 이름 없는 여러 줄도 보통 붙여넣기');
  const t2=boot(DIR,{stored:st(blank()),confirmFn});t2.ev("state.view='evaluation';paint()");
  e=drop(t2,'#hwpDocPaste',F.evalHtml,F.evalText);ok(e.defaultPrevented&&t2.ev('member().evaluation.goals[1].blockStaff')===E.goals[1].blockStaff,'붙여넣기 칸에 끌어다 놓기');
  const t3=boot(DIR,{stored:st(blank()),confirmFn});t3.ev("state.view='plan';paint()");
  const ev=new t3.w.Event('drop',{bubbles:true,cancelable:true});ev.dataTransfer={getData:()=>'',files:[{name:'a.hwp'}]};t3.$('#hwpDocPaste').dispatchEvent(ev);
  ok(/한글 파일을 끌어 놓는 대신/.test(t3.logs.filter(l=>l[0]==='alert').pop()?.[1]||''),'한글 파일 자체를 끌어 놓으면 안내')}
 console.log('[8] 과거 재활문서 관리도 같은 해석기(표 모양 정보)');
 {const t=boot(DIR,{stored:stored57({withLegacy:false}),confirmFn});t.ev("state.view='legacy';paint()");
  paste(t,'#legacyHwpPaste',F.planHtml,F.planText);const d=t.ev('currentLegacyDraft(member())'),p=d.structured.plan;
  ok(P.strength.every((x,i)=>p.strength[i]===x)&&p.psycho[0]===P.psychoText[0]&&p.services[1].type==='운동재활','강점·약점·영역·재활 활동',[p.strength,p.psycho[0]]);
  ok(/표 모양 그대로 읽음/.test(t.$('#content').textContent),'읽은 방식 안내')}
 console.log('[9] AI 작성 중 · 다른 회원 문장 · 회원별 안내');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  t.ev('aiWorking=true;lockInputs()');ok(t.$('#hwpDocPaste').readOnly,'AI 작성 중에는 잠김');
  paste(t,'#hwpDocPaste',F.planHtml,'');ok(/AI 작성이 끝난 뒤/.test(t.logs.filter(l=>l[0]==='alert').pop()?.[1]||'')&&!t.ev('member().plan.strength[0]'),'AI 작성 중에는 넣지 않음');
  t.ev('aiWorking=false;lockInputs()');
  const other=blank('mem-o','회원 002');const long='회원은 보호작업장에 주 5회 출근하며 작업 속도가 눈에 띄게 빨라졌고 동료와 점심을 함께 먹으며 일상적인 대화를 나누는 모습이 관찰됨.';
  other.notes=[{date:'2026-05-01',topic:'작업',content:long,result:'',counselorOpinion:'',included:true}];
  const t2=boot(DIR,{stored:st(blank(),other),confirmFn});t2.ev("state.view='plan';paint()");
  answers.length=0;answers.push(false);paste(t2,'#hwpDocPaste','','5. 사례관리자의 의견\n현 상태를 근거로 재활목표와 계획을 수립한 이유\n'+long+'\n3. 강점 및 약점\n강점\n약점\n1. 가\n1. 나');
  ok(/다른 회원\(회원 002\)/.test(t2.logs.filter(l=>l[0]==='confirm')[0]?.[1]||'')&&!t2.ev('member().plan.opinion'),'다른 회원 상담일지 문장이면 묻고, [취소]면 넣지 않음');
  answers.push(true);paste(t,'#hwpDocPaste',F.planHtml,'');ok(/넣었습니다/.test(t.$('#hwpDocBox').textContent),'안내 표시');
  t.ev("state.members.push(normMember({id:'mem-z',label:'회원 010',notes:[],plan:{},evaluation:{}}));state.memberId='mem-z';paint()");
  ok(!/넣었습니다/.test(t.$('#hwpDocBox')?.textContent||''),'다른 회원 화면에는 안내 없음');
  ok(!t.errors.length&&!t2.errors.length,'화면 오류 없음',[...t.errors,...t2.errors])}
 console.log('[10] 알아본 항목이 없으면 안내만');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");
  paste(t,'#hwpDocPaste','','그냥 쓴 글입니다.\n다른 줄입니다.');ok(/항목을 알아보지 못했습니다/.test(t.$('#hwpDocBox').textContent)&&!t.$('[data-act="hwp-undo"]'),'안내');
  paste(t,'#hwpDocPaste','','');ok(/복사한 뒤 붙여 넣어/.test(t.logs.filter(l=>l[0]==='alert').pop()?.[1]||''),'빈 붙여넣기')}
 console.log('[11] 되돌리기 물음 · 같은 빈 칸에 항목 이름째 붙이기');
 {const t=boot(DIR,{stored:st(blank()),confirmFn});t.ev("state.view='plan';paint()");answers.length=0;
  paste(t,'#hwpDocPaste',F.planHtml,'');answers.push(false);t.click('[data-act="hwp-undo"]');
  ok(!/직접 고치거나 AI로/.test(t.logs.filter(l=>l[0]==='confirm').pop()?.[1]||'')&&t.ev('member().plan.strength[0]')===P.strength[0],'붙인 뒤 바뀐 것 없으면 짧은 물음, [취소]면 그대로');
  t.change('[data-bind="plan.opinion"]','직원이 고친 의견');answers.push(true);t.click('[data-act="hwp-undo"]');
  ok(/직접 고치거나 AI로 작성한 내용도 함께 되돌아갑니다/.test(t.logs.filter(l=>l[0]==='confirm').pop()?.[1]||'')&&!t.ev('member().plan.opinion'),'붙인 뒤 고친 것이 있으면 함께 되돌아간다고 알림');
  const t2=boot(DIR,{stored:st(blank()),confirmFn});t2.ev("state.view='plan';paint()");
  const e=paste(t2,'[data-bind="plan.memberVoice"]','','회원의 주관적 호소 (대화체)\t“밖에 나가고 싶어요.”');
  ok(e.defaultPrevented&&t2.ev('member().plan.memberVoice')==='“밖에 나가고 싶어요.”','항목 이름은 빼고 내용만',t2.ev('member().plan.memberVoice'));
  const e2=paste(t2,'[data-bind="plan.memberVoice"]','','회원의 주관적 호소 (대화체)\t“또 다른 말”');ok(!e2.defaultPrevented,'이미 쓴 칸이면 보통 붙여넣기')}
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
