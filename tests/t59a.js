// v3.21.59 — 정신과적 진단·증상 · 공개 지침 · 주치의편지 · 공통 문서 목록
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');const {stored58}=require('./fix58.js');const {makeAI,stepOf}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const isDoc=b=>/\[주치의편지\]/.test(b.prompt||'');
const DOC={admissionDuration:'2년 3개월',attitude:'적극적',programs:'산책 프로그램, 요리 프로그램',grades:{rules:'상',relations:'중',daily:'최고',impulse:'',symptoms:'중',meds:'상',community:'',family:''},
 sections:{diet:{status:'- 군것질 지출이 많았습니다.',intervention:'- 금전관리 상담을 실시했습니다.'},sleep:{status:'',intervention:''},relationships:{status:'- 동료와 함께 김밥을 만듦.',intervention:''},programs:{status:'- 산책 프로그램 참여를 한 차례 거부함.',intervention:'- 다음 참여 일정을 함께 정함.'}},
 opinion:'- 생활리듬 유지를 위해 산책 참여를 이어 가도록 지원할 계획임.',medMorning:'',medEvening:'',medOther:'',name:'바꾸면 안 되는 이름',diagnosis:'AI가 쓴 진단명',doctorReply:'AI가 쓴 회신'};
const docAI=(extra)=>{const base=makeAI();return b=>{if(isDoc(b))return typeof extra==='function'?extra(b):JSON.parse(JSON.stringify(DOC));return base(b)}};
const fast=t=>{const o=t.w.setTimeout.bind(t.w);t.w.setTimeout=(fn,ms,...r)=>o(fn,ms>900?0:ms,...r)};
(async()=>{
 console.log('[1] 정신과적 진단·증상 — 상담일지 관리 화면');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='notes';paint()");
  const p=t.$('#psyPanel');ok(p&&p.tagName==='DETAILS'&&!p.open&&/입력 안 함/.test(p.querySelector('summary').textContent),'접힌 칸(입력 안 함)');
  t.change(t.$('[data-psy-condition="조현병"]'),true);ok(JSON.stringify(t.ev('member().psychiatricConditions'))==='["조현병"]','고르면 저장');
  ok(t.$('#psyPanel').open&&/조현병/.test(t.$('#psyPanel summary').textContent),'고른 뒤에도 펼친 채로 · 요약에 표시');
  t.$('#psyCustom').value='<b>환청</b> 호소';t.click('[data-act="psy-add"]');ok(t.ev('member().psychiatricConditions[1]')==='b환청/b 호소'||t.ev('member().psychiatricConditions[1]')==='b환청/b 호소','직접 입력(꺾쇠는 뺌)',t.ev('member().psychiatricConditions'));
  t.click('[data-act="psy-remove"]');ok(t.ev('member().psychiatricConditions.length')===1,'빼기');
  t.flush();ok(JSON.stringify(t.saved().members[0].psychiatricConditions)==='["조현병"]','브라우저 저장');
  t.ev("state.view='ai';paint()");ok(/정신과적 진단·증상: 조현병/.test(t.$('#content').textContent),'AI 화면에 표시');
  ok(t.ev("psyCategories(['조현병(편집형)','조울증','우울증'])").join()==='psychosis,bipolar','직접 입력 이름도 분류',t.ev("psyCategories(['조현병(편집형)','조울증','우울증'])"));
  ok(t.ev("psyCategories(['우울증'])").join()==='general','분류에 없으면 WHO 일반 원칙');
  ok(t.ev("normPsy(Array.from({length:20},(_,i)=>'항목'+i)).length")===12,'최대 12개');
 }
 console.log('[2] 공개 지침 — 분류 이름만 서버로, AI 요청에 요약');
 {let calls=0;const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:b=>{calls++;return{status:200,data:{sources:b.categories.length?[{key:'psychosis',name:'NICE CG178: 정신병적 장애·조현병',url:'https://www.nice.org.uk/guidance/cg178',summary:'요약 문장.',checkedOnline:true,overview:'Overview text'}]:[],topicSources:require(require('path').resolve(__dirname,'../pro-knowledge.js')).sourcesFor(b.topics||[]).map((k,i)=>({key:k,checkedOnline:i%2===0,overview:''})),liveChecks:1}}}});
  await t.ev("runLocalAI('plan')");ok(!t.guidanceCalls.some(g=>g.categories.length),'진단 없으면 진단 지침은 묻지 않음',t.guidanceCalls);
  ok(t.guidanceCalls.every(g=>JSON.stringify(g).length<200&&!/산책|복약|위생|용돈/.test(JSON.stringify(g))),'서버에는 주제 이름만(상담일지 문장 없음)',t.guidanceCalls);
  const A0=t.prompts.find(b=>stepOf(b.prompt||'')==='A');ok(!/진단·증상 분류/.test(A0.prompt),'진단 없으면 AI 요청에 안 넣음');
  t.ev("member().psychiatricConditions=['조현병','강박장애']");t.prompts.length=0;t.guidanceCalls.length=0;
  await t.ev("runLocalAI('plan')");const g=t.guidanceCalls.find(x=>x.categories.length);
  ok(g&&JSON.stringify(g)==='{"categories":["psychosis","ocd"]}','진단은 분류 이름만 보냄(회원 정보·상담 내용 없음)',t.guidanceCalls);
  const A=t.prompts.find(b=>stepOf(b.prompt||'')==='A');ok(/\[담당자가 확인한 진단·증상 분류[^\n]*\] 조현병 \/ 강박장애/.test(A.prompt)&&/NICE CG178: 정신병적 장애·조현병: 요약 문장\. \(공식 페이지 확인\)/.test(A.prompt)&&/공개 페이지 설명: Overview text/.test(A.prompt),'AI 요청에 분류·요약',(A.prompt.match(/\[담당자가[^\n]*/)||[''])[0]);
  const al=t.logs.filter(l=>l[0]==='alert').pop()[1];ok(/공개 지침 1개 참고\(공식 페이지 확인 1개/.test(al),'완료 안내에 표시',al.slice(-160));
  const before=calls;t.prompts.length=0;await t.ev("runLocalAI('eval')");ok(calls===before,'한 시간 안에는 다시 묻지 않음(기억)',[before,calls]);
 }
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),guidance:b=>({status:500,data:{error:'x'}})});t.ev("member().psychiatricConditions=['우울증']");
  await t.ev("runLocalAI('plan')");const A=t.prompts.find(b=>stepOf(b.prompt||'')==='A');
  ok(/WHO mhGAP 개입 지침 2\.0: .*\(기본 요약\)/.test(A.prompt),'서버 실패 → 기본 요약으로 계속',(A.prompt.match(/- WHO[^\n]*/)||[''])[0]);
  ok(t.ev('member().plan.goals.filter(g=>g.long).length')>=3,'작성은 그대로 됨');
 }
 console.log('[3] 주치의편지 화면');
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='doctor';paint()");
  ok(t.$$('#nav button').some(b=>b.textContent==='주치의편지'),'메뉴에 주치의편지');
  ok(t.$$('.doctor-sheet').length===3&&/새희망둥지 회원경과보고/.test(t.$('.doctor-sheet h2').textContent),'3쪽 서식');
  ok(/체크한 상담일지 6건/.test(t.$('.doctor-toolbar').textContent)&&!t.$('[data-act="doctor-generate"]').disabled,'체크한 상담일지 수 · AI 버튼 켜짐');
  t.change(t.$('[data-doctor-field="name"]'),'가상 회원');t.change(t.$('[data-doctor-field="grades.rules"]'),'상');t.change(t.$('[data-doctor-field="sections.sleep.status"]'),'- 밤에 자주 깸.');
  const d=t.ev('member().doctorLetter');ok(d.name==='가상 회원'&&d.grades.rules==='상'&&d.sections.sleep.status==='- 밤에 자주 깸.','입력칸 저장(이름·등급·현 상황)');
  t.flush();const back=boot(DIR,{storage:{sehuim_rehab_offline_v1:JSON.stringify(t.saved())}});ok(back.ev('member().doctorLetter.sections.sleep.status')==='- 밤에 자주 깸.','새로 열어도 유지');
  t.ev("member().notes.forEach(n=>n.included=false);paint()");ok(t.$('[data-act="doctor-generate"]').disabled&&t.$('[data-act="doctor-rule"]').disabled,'체크한 상담일지가 없으면 버튼 꺼짐');
 }
 console.log('[4] 주치의편지 AI 작성 — 체크한 상담일지만, 인적사항·회신 칸은 그대로');
 {const st=stored58();st.members[0].notes[3].included=false;const t=boot(DIR,{stored:st,ai:docAI()});
  t.ev("member().doctorLetter=DoctorLetter.normalize({name:'가상 회원',diagnosis:'조현병',doctorReply:'주치의가 쓴 회신',doctorReplyName:'가상 의사'});member().psychiatricConditions=['조현병'];state.view='doctor';paint()");
  t.click('[data-act="doctor-generate"]');for(let i=0;i<100&&!t.logs.some(l=>l[0]==='alert');i++)await new Promise(r=>setTimeout(r,10));
  const D=t.prompts.find(isDoc);ok(!!D,'주치의편지 요청');
  ok(/산책 프로그램 참여를 거부함/.test(D.prompt)&&!/용돈 기입장 작성을 어려워함/.test(D.prompt),'체크한 상담일지만(체크 안 한 4번은 빠짐)');
  ok(!/텃밭/.test(D.prompt+D.system)&&!/규칙적인 생활리듬과 자발적인/.test(D.prompt),'다른 회원·계획서 내용 없음');
  ok(!/가상 회원|주치의가 쓴 회신/.test(D.prompt),'이름·회신은 AI에 안 보냄');
  ok(/\[담당자가 확인한 진단·증상 분류[^\n]*\] 조현병/.test(D.prompt),'진단 분류는 배경 정보로');
  const d=t.ev('member().doctorLetter');
  ok(d.name==='가상 회원'&&d.diagnosis==='조현병'&&d.doctorReply==='주치의가 쓴 회신'&&d.doctorReplyName==='가상 의사','인적사항·주치의 회신 칸 그대로',[d.name,d.diagnosis,d.doctorReply]);
  ok(d.attitude==='적극적'&&d.grades.rules==='상'&&d.grades.daily===''&&d.admissionDuration==='2년 3개월','태도·등급(틀린 값은 비움)',d.grades);
  ok(d.sections.diet.status==='- 군것질 지출이 많았음.'&&d.sections.diet.intervention==='- 금전관리 상담을 실시하였음.','문어체로 정리',d.sections.diet);
  ok(t.ev('state.view')==='doctor'&&!!t.$('[data-act="doctor-undo"]'),'편지 화면 · 되돌리기 버튼');
  t.click('[data-act="doctor-undo"]');ok(t.ev('member().doctorLetter.attitude')===''&&t.ev('member().doctorLetter.name')==='가상 회원','되돌리기');
 }
 console.log('[5] 이미 쓴 칸이 있으면 확인 · 취소하면 그대로');
 {const t=boot(DIR,{stored:stored57(),ai:docAI(),confirmFn:m=>!/AI 초안으로 바꿀까요/.test(m)});t.ev("member().doctorLetter=DoctorLetter.normalize({opinion:'- 담당자가 쓴 의견.'});state.view='doctor';paint()");
  await t.ev('runDoctorLetterAI()');ok(t.ev('member().doctorLetter.opinion')==='- 담당자가 쓴 의견.'&&!t.prompts.some(isDoc),'취소하면 AI에 보내지 않고 그대로');
 }
 console.log('[6] 다른 회원의 문장이 섞이거나, 작성 중 상담일지가 바뀌면 넣지 않음');
 {const t=boot(DIR,{stored:stored58(),ai:docAI(b=>({...JSON.parse(JSON.stringify(DOC)),opinion:'- 텃밭 활동에 참여하여 상추와 방울토마토 모종을 심고 물을 주었으며 다음 주 화요일 오전에 다시 와서 자란 모습을 사진으로 찍어 동료들에게 보여 주겠다고 함.'}))});
  t.ev('state.members[1].notes.forEach((n,i)=>updateNoteBody(state.members[1],i))');await t.ev('runDoctorLetterAI()');
  ok(!t.ev('member().doctorLetter')&&/다른 회원\(회원 002\)/.test(t.ev('aiStatus')),'다른 회원 문장 → 넣지 않음',t.ev('aiStatus').slice(0,120));
 }
 {let T;const base=docAI();const t=boot(DIR,{stored:stored57(),ai:b=>{if(isDoc(b))T.ev("member().notes[0].included=false");return base(b)}});T=t;
  await t.ev('runDoctorLetterAI()');ok(!t.ev('member().doctorLetter')&&/바뀌어 주치의편지에 넣지 않았습니다/.test(t.ev('aiStatus')),'작성 중 체크 변경 → 넣지 않음');
 }
 console.log('[7] AI 실패 → 규칙 기반 초안 제안 · 규칙 기반 초안');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI(),aiStatus:b=>({status:502,data:{error:{message:'',code:'UPSTREAM_SERVICE_ERROR',providerStatus:503}}})});fast(t);
  await t.ev('runDoctorLetterAI()');const cf=t.logs.filter(l=>l[0]==='confirm').map(l=>l[1]).join('\n');ok(/규칙 기반 초안을 만들까요/.test(cf),'규칙 기반 제안');
  const d=t.ev('member().doctorLetter');ok(/산책 프로그램/.test(d.programs)&&/군것질/.test(d.sections.diet.status),'규칙 기반으로 채움',[d.programs,d.sections.diet]);
 }
 {const t=boot(DIR,{stored:stored57()});t.ev("state.view='doctor';paint()");t.click('[data-act="doctor-rule"]');const d=t.ev('member().doctorLetter');
  ok(/샤워를 주 2회/.test(d.sections.hygiene.status)&&/위생교육을 실시/.test(d.sections.hygiene.intervention),'관찰은 현 상황, 직원이 한 일은 개입 내용',d.sections.hygiene);
  ok(/정신건강의학과 외래 진료에 동행/.test(d.sections.health.intervention+d.sections.otherMedicine.intervention)||/복약/.test(d.sections.health.status),'건강 칸',d.sections.health);
  ok(d.attitude===''&&Object.values(d.grades).every(x=>x==='')&&d.opinion==='','판단이 필요한 칸은 비워 둠');
  ok(d.programs.split(', ').sort().join()==='산책 프로그램,요리 프로그램','참여 프로그램 목록',d.programs);
 }
 console.log('[8] 과거 주치의편지 — 문체 규칙만 AI에, 원문은 안 감');
 {const t=boot(DIR,{stored:stored58(),ai:docAI()});
  t.ev("state.memberId='mem-b';state.view='doctor';doctorUI.historyOpen=true;paint()");
  t.$('#doctorHistoryTitle').value='예전 편지';t.$('#doctorHistoryBody').value='- 주 2회 텃밭 활동을 통해 생활리듬을 유지함.\n- 주치의 진료 때 수면 변화를 문의할 계획임.';t.click('[data-act="doctor-history-add"]');
  ok(t.ev('member().doctorHistory.length')===1,'회원 002에 등록');
  t.ev("state.memberId='mem-a';paint()");await t.ev('runDoctorLetterAI()');const D=t.prompts.find(isDoc);
  ok(/문제 → 개입 목적 → 실제 개입/.test(D.prompt)&&/짧은 개조식/.test(D.prompt)&&/주기와 횟수/.test(D.prompt),'회원 001 편지에 같은 작성자 문체 규칙');
  ok(!/텃밭|수면 변화를 문의/.test(D.prompt),'원문은 안 감');
  t.ev("state.view='doctor';paint()");t.click('[data-act="doctor-register-current"]');ok(t.ev('member().doctorHistory.length')===1&&/\[담당자 의견\]/.test(t.ev('member().doctorHistory[0].body')),'지금 편지를 과거 편지로 등록');
  t.click('[data-act="doctor-history-delete"]');ok(t.ev('member().doctorHistory.length')===0,'삭제');
 }
 console.log('[9] 진단명 넣기 · 인쇄 사본 · 백업');
 {const t=boot(DIR,{stored:stored57()});t.ev("member().psychiatricConditions=['조현병','강박장애'];state.view='doctor';paint()");
  t.click('[data-act="doctor-diagnosis-fill"]');ok(t.ev('member().doctorLetter.diagnosis')==='조현병, 강박장애'&&!t.$('[data-act="doctor-diagnosis-fill"]'),'진단·증상 필터에서 넣기');
  t.change(t.$('[data-doctor-field="attitude"]'),'소극적');t.change(t.$('[data-doctor-field="opinion"]'),'- 의견 문장.');
  t.ev('preparePrint()');const ps=t.$('#printSheet');ok(ps&&ps.classList.contains('doctor-paper')&&!ps.querySelector('textarea,input,select'),'인쇄 사본: 입력칸 없이 글자만');
  ok(/소극적/.test(ps.textContent)&&/- 의견 문장\./.test(ps.textContent)&&/조현병, 강박장애/.test(ps.textContent),'고른 값·입력 값이 인쇄됨');
  const exp=t.ev('exportPayload()');ok(exp.members[0].doctorLetter.attitude==='소극적'&&JSON.stringify(exp.members[0].psychiatricConditions)==='["조현병","강박장애"]','백업에 들어감');
  t.ev(`safeImport(${JSON.stringify(exp)})`);ok(t.ev('member().doctorLetter.opinion')==='- 의견 문장.'&&t.ev('member().psychiatricConditions.length')===2,'불러오기 후 그대로');
  const old=stored57();const t2=boot(DIR,{stored:old});ok(t2.ev('member().doctorLetter')===undefined&&Array.isArray(t2.ev('member().doctorHistory'))&&t2.ev('member().psychiatricConditions.length')===0,'예전 자료도 그대로 열림');
 }
 console.log('[10] 공통 적용 문서 목록 — 다른 회원 화면에도');
 {const st=stored58();st.members[0].legacyDocs=[{id:'legA',type:'plan',title:'과거 계획',start:'2025-04-01',end:'2025-09-30',entryMode:'plain',useAI:false,autoApply:true,styleOwner:'writer-default',text:'[재활목표 1 재활 계획]\n- 회원이 산책 프로그램에 주 2회 참여하도록 지원할 계획임.\n- 월 1회 상담에서 실천 여부를 확인할 계획임.\n[사례관리자의 의견]\n- 생활리듬을 위해 산책 참여를 실천하도록 지원할 필요함.',createdAt:'2025-10-01T00:00:00Z',updatedAt:'2025-10-01T00:00:00Z'}];
  const t=boot(DIR,{stored:st});t.ev("state.memberId='mem-b';state.view='legacy';paint()");
  const sec=t.$('.shared-legacy');ok(sec&&/모든 회원 공통 적용 문서 \(1건\)/.test(sec.textContent)&&/등록: 회원 001/.test(sec.textContent)&&/공통 적용 중/.test(sec.textContent),'회원 002 화면에 회원 001 문서',sec&&sec.textContent.slice(0,160));
  ok(!/산책 프로그램에 주 2회/.test(sec.textContent),'목록에 문서 원문은 안 보임');
  t.ev("state.view='plan';paint()");ok(/모든 회원 공통 재활계획서 작성기준: 문서 1건/.test(t.$('#content').textContent),'계획서 화면에 한 줄');
  const t2=boot(DIR,{stored:stored57({withLegacy:false})});t2.ev("state.view='plan';paint()");ok(!/공통 재활계획서 작성기준/.test(t2.$('#content').textContent),'공통 문서가 없으면 줄도 없음');
 }
 done();
})().catch(e=>{console.error(e);process.exitCode=1});
