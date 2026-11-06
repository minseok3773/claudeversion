// v3.23.8 — Gemini도 Claude와 똑같은 요청문 1회로 계획서·평가서 작성 (가상 자료·가짜 답만 사용)
const {boot,ok,done,sleep}=require('./h.js');const {stored57}=require('./fix57.js');const {makeAI}=require('./fakeai.js');
const DIR=process.argv[2]||require('path').resolve(__dirname,'..');
const ON={rehab_gemini_oneshot_v1:'on'};
const splitAI=ai=>body=>{const p=String(body.prompt);if(!/===== \[step1\]/.test(p))return ai(body);const parts=p.split(/===== \[step\d\] [^=]+ =====\n/).slice(1);const out={};parts.forEach((x,i)=>{out['step'+(i+1)]=ai({prompt:x})});return out};
async function waitDlg(t,ms=4000){const end=Date.now()+ms;while(Date.now()<end){const d=t.$('#claudeDlg');if(d&&d.open)return d;await sleep(10)}return null}
(async()=>{
 console.log('[1] Gemini — Claude와 같은 요청문을 서버에 한 번 보내고 답으로 계획서·평가서를 채움');
 let gemPrompt='';
 {const t=boot(DIR,{stored:stored57(),storage:ON,ai:splitAI(makeAI())});
  await t.ev("runLocalAI('plan-eval')");
  ok(t.prompts.length===1,'Gemini 서버로 한 번만 보냄',t.prompts.length);
  const b=t.prompts[0]||{};gemPrompt=b.prompt||'';
  ok(/\[작성 지침\]/.test(gemPrompt)&&/===== \[step3\] 재활평가 =====/.test(gemPrompt)&&/===== \[상담일지 전문\] =====/.test(gemPrompt)&&/\[이번 답의 전체 형식\]/.test(gemPrompt),'요청문에 작성 지침·3단계·상담일지 전문·전체 형식이 들어감');
  ok(b.maxTokens===65536&&b.system.length<=4000&&/\[이번 답의 전체 형식\]대로 JSON 객체 하나로만/.test(b.system),'답 길이 한도 65,536·짧은 시스템 지시',[b.maxTokens,b.system.length]);
  const fail=t.logs.find(l=>l[0]==='alert'&&/작성하지 못했습니다|실행 실패|오류/.test(l[1]));ok(!fail,'작성 성공',fail);
  const p=t.ev('member().plan'),e=t.ev('member().evaluation');
  ok(p.goals.filter(g=>String(g.short||'').trim()).length>=3&&!/〔/.test(JSON.stringify(p)),'계획서 목표가 채워지고 자리표시가 없음');
  ok(e.goals.length>=3&&!/〔/.test(JSON.stringify(e)),'평가서도 채워짐');
  ok(/Claude와 같은 요청문 1회/.test(t.ev('aiMetaText'))&&/Gemini/.test(t.ev('aiMetaText')),'사용한 AI에 Gemini·같은 요청문 1회 표시',t.ev('aiMetaText'));
  ok(!t.$('#claudeDlg')?.open,'Claude 붙여넣기 창은 열지 않음');
  ok(t.errors.length===0,'오류 없음',t.errors);}
 console.log('[2] Claude 모드 요청문과 글자 하나까지 같음');
 {const t=boot(DIR,{stored:stored57(),storage:{rehab_ai_engine_v1:'claude'}});const run=t.ev("runLocalAI('plan-eval')");await waitDlg(t);const cl=t.$('#cdPrompt').value;
  ok(cl.length>1000&&cl===gemPrompt,'Claude 요청문 = Gemini 요청문',[cl.length,gemPrompt.length]);t.click('#cdCancel');await run.catch(()=>{});}
 console.log('[3] 답이 모자라면 문서를 바꾸지 않고 알림, 단계별 추가 요청을 하지 않음');
 {const t=boot(DIR,{stored:stored57(),storage:ON,ai:body=>({step1:makeAI()({prompt:String(body.prompt).split(/===== \[step2\]/)[0]})})});
  const before=JSON.stringify(t.ev('member().plan'));await t.ev("runLocalAI('plan-eval')");
  ok(t.logs.some(l=>l[0]==='alert'&&/작성하지 못했습니다/.test(l[1])&&/step2/.test(l[1])),'빠진 단계를 알려 줌',t.logs.filter(l=>l[0]==='alert').map(l=>l[1]));
  ok(JSON.stringify(t.ev('member().plan'))===before&&t.prompts.length===1,'기존 문서 그대로·추가 요청 없음',t.prompts.length);}
 console.log('[4] 계획서만·평가서만도 같은 방식');
 for(const mode of ['plan','eval']){const t=boot(DIR,{stored:stored57(),storage:ON,ai:splitAI(makeAI())});await t.ev(`runLocalAI('${mode}')`);
  ok(t.prompts.length===1&&!t.logs.some(l=>l[0]==='alert'&&/작성하지 못했습니다|실행 실패/.test(l[1])),mode+': 한 번 보내고 작성 성공',[t.prompts.length,t.logs.filter(l=>l[0]==='alert').map(l=>l[1].slice(0,80))]);}
 console.log('[5] 끄면 예전처럼 단계별로 보냄, 화면에 선택이 보임');
 {const t=boot(DIR,{stored:stored57(),ai:makeAI()});await t.ev("runLocalAI('plan')");ok(t.prompts.length>=2,'단계별 여러 번',t.prompts.length);
  const t2=boot(DIR,{stored:stored57(),storage:ON});t2.ev("state.view='ai';paint()");ok(t2.$('#geminiOneShot')?.checked&&/Claude와 똑같은 요청문/.test(t2.$('#content').textContent),'Gemini 화면에 ‘Claude와 같은 요청문 1회’ 선택(기본 켜짐)');}
 console.log('[6] 서버 한도: 긴 요청문·긴 답·긴 시간 허용');
 {const fs=require('fs'),path=require('path');const g=fs.readFileSync(path.join(DIR,'api/generate.js'),'utf8'),v=JSON.parse(fs.readFileSync(path.join(DIR,'vercel.json'),'utf8'));
  ok(/const MAX_OUT=65536;/.test(g)&&/prompt\.length>600000/.test(g)&&/ctrl\.abort\(\),290000/.test(g)&&v.functions['api/generate.js'].maxDuration===300,'출력 65,536·입력 60만 자·290초·maxDuration 300');}
 done();
})();
