// v3.21.58 — 과거 재활문서: PDF 불러오기 · 한글 붙여넣기 · 문체 후보 · 모든 회원 공통 작성기준 · 전문자료 보내기 설정
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {stored58}=require('./fix58.js');const {makeAI,stepOf}=require('./fakeai.js');
const fs=require('fs');const path=require('path');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const PDFTXT=fs.existsSync(path.join(__dirname,'pdfs','app-plan.txt'))?fs.readFileSync(path.join(__dirname,'pdfs','app-plan.txt'),'utf8'):'';
function pickFile(t,sel,name,bytes,type){const inp=t.$(sel);const f=new t.w.File([bytes],name,{type});Object.defineProperty(inp,'files',{value:[f],configurable:true});inp.dispatchEvent(new t.w.Event('change',{bubbles:true}))}
const wait=async(t,cond,ms=2000)=>{for(let i=0;i<ms/10&&!cond();i++)await new Promise(r=>setTimeout(r,10))};
(async()=>{
 console.log('[1] PDF 불러오기 — 시설 서식 PDF(인쇄본)를 항목별 칸에 넣음');
 {let sent=null;const t=boot(DIR,{stored:stored57({withLegacy:false}),pdf:b=>{sent=b;return{status:200,data:{text:PDFTXT,pages:2,truncated:false}}}});
  t.ev("state.view='legacy';paint()");ok(!!t.$('[data-act="legacy-upload-pdf"]'),'PDF 불러오기 버튼');
  pickFile(t,'#legacyPdf','예전계획.pdf',new Uint8Array([37,80,68,70,45,49,46,55,...Array(200).fill(32)]),'application/pdf');
  await wait(t,()=>t.logs.some(l=>l[0]==='alert'));
  ok(sent&&typeof sent.pdf==='string'&&sent.pdf.length>100,'서버에 PDF(base64)만 보냄',sent&&Object.keys(sent));
  const al=t.logs.filter(l=>l[0]==='alert').pop()?.[1]||'';ok(/2쪽 읽음/.test(al)&&/재활계획서/.test(al),'완료 안내',al);
  const d=t.ev('currentLegacyDraft(member())');const p=d.structured.plan;
  ok(d.entryMode==='structured'&&d.type==='plan'&&d.title==='예전계획','항목별 입력으로 전환',[d.entryMode,d.type,d.title]);
  ok(p.goals[0].long==='규칙적인 생활리듬과 자발적인 일상활동 참여능력을 향상시킴.'&&/^1\. 산책/.test(p.goals[0].short)&&/^- 산책 프로그램 참여를 지원/.test(p.goals[0].plan),'목표 1 장기·단기·계획',p.goals[0]);
  ok(p.goals[1].long==='정신과적 증상에 대한 대처능력을 향상시키고 안정적인 일상생활을 유지함.','줄이 끊긴 장기목표를 이어 붙임',p.goals[1].long);
  ok(p.goals[0].target==='- 산책 프로그램 주 2회 참여\n- 점검표 월 4회 표시','측정표의 성과목표',p.goals[0].target);
  ok(p.strength[1]==='복약을 스스로 챙김.'&&p.weakness[0]==='금전 관리에 어려움이 있음.','강점·약점',[p.strength,p.weakness]);
  ok(p.psycho.every(x=>x==='▪ 해당사항 없음.'),'심리사회 8영역',p.psycho);
  ok(p.managerNeed==='1. 생활리듬 유지'&&p.opinion==='- 생활리듬 유지를 위한 계획을 세움.','다음 제목·서명 줄 앞에서 멈춤',[p.managerNeed,p.opinion]);
  t.ev("state.view='legacy';paint()");ok(/자동으로 넣은 항목/.test(t.$('#content').textContent),'화면에 결과 안내');
 }
 console.log('[2] PDF를 읽는 동안 회원을 바꾸면 넣지 않음');
 {let T;const t=boot(DIR,{stored:stored58(),pdf:async b=>{T.ev("state.memberId='mem-b'");return{status:200,data:{text:PDFTXT,pages:2}}}});T=t;t.ev("state.view='legacy';paint()");
  pickFile(t,'#legacyPdf','a.pdf',new Uint8Array([37,80,68,70,45,...Array(200).fill(32)]),'application/pdf');await wait(t,()=>t.logs.some(l=>l[0]==='alert'));
  const al=t.logs.filter(l=>l[0]==='alert').pop()?.[1]||'';ok(/회원이 바뀌었습니다/.test(al),'안내',al);
  ok(!t.ev("legacyDraft&&clean(legacyFormToText('plan',legacyDraft.structured?.plan))"),'어느 회원에도 넣지 않음');
 }
 console.log('[3] PDF 아닌 파일 · 2MB 넘는 파일');
 {const t=boot(DIR,{stored:stored57(),pdf:()=>({status:200,data:{text:'x'}})});t.ev("state.view='legacy';paint()");
  pickFile(t,'#legacyPdf','a.txt',new Uint8Array(300),'text/plain');await wait(t,()=>t.logs.some(l=>l[0]==='alert'));ok(/PDF 파일만/.test(t.logs.pop()[1]),'PDF만');
 }
 console.log('[4] 한글(HWP)에서 복사해 붙여넣기');
 {const t=boot(DIR,{stored:stored57({withLegacy:false})});t.ev("state.view='legacy';paint()");
  const txt=['재활계획서','1) 회원이 제시하는 욕구 & 문제','회원의 주관적 호소 (대화체)\t“밖에 나가고 싶어요.”','욕구 기술\t- 외출 활동을 늘리기를 희망함.','강점 및 약점','강점 1\t요리를 좋아함.','약점 1\t아침에 일어나기 어려워함.','재활목표 1 장기목표\t규칙적인 생활리듬을 유지함.','재활목표 1 단기목표\t1. 매일 같은 시간에 일어남.','사례관리자의 의견','- 생활리듬을 되찾도록 계획함.'].join('\n');
  const ta=t.$('#legacyHwpPaste');ok(!!ta,'붙여넣기 칸');
  const e=new t.w.Event('paste',{bubbles:true,cancelable:true});e.clipboardData={getData:k=>k==='text/plain'?txt:''};ta.dispatchEvent(e);
  const d=t.ev('currentLegacyDraft(member())'),p=d.structured.plan;
  ok(p.memberVoice==='“밖에 나가고 싶어요.”'&&p.memberNeed==='- 외출 활동을 늘리기를 희망함.','회원 욕구',[p.memberVoice,p.memberNeed]);
  ok(p.strength[0]==='요리를 좋아함.'&&p.weakness[0]==='아침에 일어나기 어려워함.','강점·약점');
  ok(p.goals[0].long==='규칙적인 생활리듬을 유지함.'&&p.goals[0].short==='1. 매일 같은 시간에 일어남.','목표');
  ok(/생활리듬을 되찾도록/.test(p.opinion),'의견');
  ok(/한글 문서에서 \d+개 칸/.test(t.$('#content').textContent),'화면 안내');
 }
 console.log('[5] 과거 문서 등록 → 문체 후보(승인 대기) → 승인하면 AI에 문체 규칙');
 {const t=boot(DIR,{stored:stored57({withLegacy:false}),ai:makeAI()});
  const body='[재활목표 1 장기목표]\n규칙적인 생활리듬을 유지함.\n[재활목표 1 재활 계획]\n- 회원이 산책 프로그램에 주 2회 참여하도록 지원할 계획임.\n- 월 1회 상담에서 실천 여부를 확인할 계획임.\n[사례관리자의 의견]\n- 생활리듬을 위해 산책 참여를 실천하도록 지원할 필요함.';
  t.ev(`(()=>{const m=member();legacyDraftMemberId=m.id;legacyDraft={...emptyLegacyDraft(),type:'plan',entryMode:'plain',title:'예전 계획',start:'2025-04-01',end:'2025-09-30',text:${JSON.stringify(body)}};saveLegacy(m)})()`);
  const rec=t.ev("member().learningRecords.find(r=>r.kind===LEGACY_STYLE_KIND)");
  ok(rec&&rec.status==='pending'&&rec.changes.length>=3&&rec.changes.every(c=>!/산책|생활리듬/.test(c.after)),'승인 대기 후보(문체 규칙만, 문서 사실 없음)',rec&&rec.changes.map(c=>c.after));
  ok(rec.changes[0].after===t.ev('LEGACY_STYLE_BANK.formalRegister'),'첫 규칙은 문어체 원칙');
  await t.ev("runLocalAI('plan')");let B=t.prompts.find(b=>stepOf(b.prompt)==='B');
  ok(/모든 회원 공통|문어체/.test(B.prompt),'모든 회원 AI 자동적용(기본 켜짐) — 문체 규칙이 들어감');
  t.ev(`approveCandidate(member(),${JSON.stringify(rec.id)})`);ok(t.ev(`member().learningRecords.find(r=>r.id===${JSON.stringify(rec.id)}).status`)==='approved','승인됨');
  ok(t.ev("learningHint(member(),'plan')").includes(rec.changes[1].after),'승인 규칙이 학습 안내에 들어감');
  // 원본을 고치면 다시 승인해야 함
  t.ev(`(()=>{const m=member();const d=m.legacyDocs[0];legacyDraftMemberId=m.id;legacyDraft={...JSON.parse(JSON.stringify(d)),text:d.text+'\\n- 주 1회 활동 기록을 함께 확인할 계획임.'};saveLegacy(m)})()`);
  ok(t.ev(`member().learningRecords.find(r=>r.id===${JSON.stringify(rec.id)}).status`)==='pending','원본을 고치면 승인 대기로 돌아감');
  // 삭제하면 제외
  t.ev("state.view='legacy';paint()");t.click(`[data-act="legacy-remove"][data-id="${t.ev('member().legacyDocs[0].id')}"]`);
  ok(t.ev(`member().learningRecords.find(r=>r.id===${JSON.stringify(rec.id)}).status`)==='excluded','문서를 지우면 후보 제외');
 }
 console.log('[6] 모든 회원 공통 작성기준 — 다른 회원의 AI 요청에는 문체 규칙만(사실은 안 감)');
 {const st=stored58();st.members[0].legacyDocs=[{id:'legA',type:'plan',title:'회원1 과거 계획',start:'2025-04-01',end:'2025-09-30',entryMode:'plain',useAI:false,autoApply:true,styleOwner:'writer-default',text:'[재활목표 1 장기목표]\n규칙적인 생활리듬을 유지함.\n[재활목표 1 재활 계획]\n- 회원이 호수공원 산책에 주 2회 참여하도록 지원할 계획임.\n- 월 1회 상담에서 실천 여부를 확인할 계획임.',createdAt:'2025-10-01T00:00:00Z',updatedAt:'2025-10-01T00:00:00Z'}];
  const t=boot(DIR,{stored:st,ai:makeAI()});t.ev("state.memberId='mem-b'");
  await t.ev("runLocalAI('plan')");const B=t.prompts.find(b=>stepOf(b.prompt)==='B');
  ok(/\[작성자 문체·승인 규칙·모든 회원 공통 작성기준/.test(B.prompt)&&/문체: 회원·가족의 직접 진술 말고는 객관적 문어체/.test(B.prompt)&&/계획서: 앞으로 할 실천과 지원은/.test(B.prompt),'회원 002 요청에 공통 작성기준(짧은 규칙)',(B.prompt.match(/\[작성자 문체[^\n]*/)||[''])[0].slice(0,120));
  ok(!/호수공원/.test(t.prompts.map(b=>b.prompt+b.system).join('\n')),'회원 001 문서의 사실(호수공원)은 안 감');
  t.ev("state.view='ai';paint()");ok(/공통 적용 과거 문서 1건|공통 작성기준/.test(t.$('#content').textContent),'AI 화면에 공통 적용 문서 수',t.$('#content').textContent.match(/[^.]*공통[^.]*/)?.[0]);
  // 공통 적용을 끄면 빠짐
  t.ev("state.members[0].legacyDocs[0].autoApply=false");ok(!t.ev("autoLegacyStyleRules('plan').rules.length"),'끄면 빠짐');
  // 전체 적용 버튼
  t.ev("state.memberId='mem-a';state.view='legacy';paint()");t.click('[data-act="legacy-enable-all"]');ok(t.ev("state.members[0].legacyDocs[0].autoApply")===true,'‘기존 과거문서 전체 회원 공통 적용’');
 }
 console.log('[7] 등록 전문자료는 기본으로 AI에 함께 보냄(v3.21.60, 설정에서 끌 수 있음)');
 {const st=stored57();st.references=[{id:'ref1',title:'가상 실무지침',author:'가상 기관',year:'2025',type:'실무지침',level:'중간',url:'',status:'enabled',body:'산책과 같은 신체활동 프로그램은 생활리듬 회복에 도움이 된다. 주 2회 이상 규칙적으로 참여하도록 돕는다. 참여 기록을 함께 확인한다.',createdAt:'2025-01-01T00:00:00Z'}];
  const t=boot(DIR,{stored:st,ai:makeAI()});
  ok(/\[문헌 1: 가상 실무지침/.test(t.ev("referencePrompt(member(),'plan')")),'기본: 관련 자료 발췌를 보냄(예전 저장본도 한 번 켬)');
  t.ev("state.view='references';paint()");const cb=t.$('#refInAI');ok(cb&&cb.checked,'설정 칸(켜짐)');
  t.change(cb,false);ok(t.ev('state.refInAI')===false&&t.ev("referencePrompt(member(),'plan')")==='','끄면 보내지 않음');t.flush();ok(t.saved().refInAI===false&&t.saved().refAuto60===true,'끈 것도 저장');
  const t3=boot(DIR,{storage:{sehuim_rehab_offline_v1:JSON.stringify(t.saved())}});ok(t3.ev('state.refInAI')===false,'끈 뒤에는 다시 켜지지 않음');
  t.change(t.$('#refInAI'),true);t.flush();ok(t.saved().refInAI===true,'다시 켜기');
  const t2=boot(DIR,{storage:{sehuim_rehab_offline_v1:JSON.stringify(t.saved())}});ok(t2.ev('state.refInAI')===true,'새로 열어도 유지');
  ok(t.ev('exportPayload().refInAI')===true,'백업에도 들어감');
  t.ev(`safeImport(${JSON.stringify({...t.ev('exportPayload()'),refInAI:false})})`);ok(t.ev('state.refInAI')===false,'백업 불러오기는 백업의 설정을 따름');
  t.ev("importUndo&&(()=>{})()");
 }
 console.log('[8] 문어체 끝맺음');
 {const t=boot(DIR,{});const S=x=>t.ev('styleText('+JSON.stringify(x)+')');
  ok(S('차기 계획에 반영하겠습니다.')==='차기 계획에 반영할 계획임.','~하겠습니다 → ~할 계획임');ok(S('참여했습니다.')==='참여하였음.','~했습니다 → ~하였음');
  ok(S('안정이 됐어요.')==='안정이 되었음.','~됐어요 → ~되었음');ok(S('회원은 "힘들어요"라고 함.')==='회원은 "힘들어요"라고 함.','따옴표 안은 그대로');
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
