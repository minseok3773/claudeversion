'use strict';
// v3.25.0 일지 정리표(logs.html + log-first.js) 시험 — 가상 회원 자료만 씀.
const fs=require('fs');const path=require('path');const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;const ok=(c,msg)=>{if(c){pass++;console.log('✓ '+msg)}else{fail++;console.log('✗ '+msg)}};

const OLD_KEY='sehuim_rehab_offline_v1',SHEET_KEY='rehab_logsheet_v1';
const notes=[
 {date:'2026-05-07',topic:'복약 점검',content:'복약 점검표를 함께 확인함. "약 먹으면 졸려요"라고 말함.',intervention:'',result:''},
 {date:'2026-05-14',topic:'산책 프로그램',content:'산책 프로그램 참여를 거부함. 다리가 아파서 못 나간다고 함.'},
 {date:'2026-05-21',topic:'',content:'샤워를 주 2회 하도록 안내함.'},
 {date:'2026-06-02',topic:'정서 상담',content:'밤에 불안하다고 호소함. "죽고 싶다는 생각이 들어요"라고 말해 위기 상담을 실시함.'},
 {date:'2026-06-10',topic:'사회적응훈련 3회기',content:'요리 활동에 참여하여 재료를 손질함.'},
 {date:'2026-09-01',topic:'복약 교육',content:'약 이름과 복용 시간을 교육함.'},
 {date:'2025-12-01',topic:'기간 밖',content:'복약 점검함.'}
];
const old={members:[{id:'m1',label:'회원 001',periodStart:'2026-05-01',periodEnd:'2026-10-31',notes},{id:'m2',label:'회원 002',notes:[]}],memberId:'m1',save:true};
const oldRaw=JSON.stringify(old);

async function boot(seed){
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'https://example.test/logs.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.confirm=()=>true;w.print=()=>{};
 for(const [k,v] of Object.entries(seed||{}))w.localStorage.setItem(k,v);
 if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 w.eval(fs.readFileSync(path.join(ROOT,'log-first.js'),'utf8'));
 return w;
}
const fire=(w,el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true}));

(async()=>{
// 1. 추천 규칙
{const w=await boot({});const L=w.LogFirst;
 const r1=L.recommend(notes[0]);ok(r1[0].area==='med'&&r1[0].kind==='do','복약 점검표 확인 → 복약·실시');
 ok(r1[0].voice.includes('약 먹으면 졸려요'),'따옴표 속 회원 말을 가져옴');
 const r2=L.recommend(notes[1]);const walk=r2.find(r=>r.area==='leisure');ok(walk&&walk.kind==='refuse','산책 거부 → 여가·불참거부');
 ok(walk&&walk.sick,'아파서 빠짐 → 건강 사유 추천');
 const r3=L.recommend(notes[2]);ok(r3[0].area==='hygiene'&&r3[0].kind==='advise','‘하도록 안내함’만 있음 → 안내·권유(실적 아님)');
 const r4=L.recommend(notes[3]);ok(r4.some(r=>r.risk),'죽고 싶다 → 위험 확인');
 ok(r4.some(r=>r.area==='mental'),'불안 호소 → 정서');
 const r5=L.recommend(notes[4]);ok(r5[0].kind==='join','제목 ‘사회적응훈련 3회기’ → 참여');
 ok(L.recommend({date:'2026-01-01',content:'특이사항 없음.'})[0].area==='etc','영역 낱말 없음 → 기타');
 ok(L.recommend({content:'활동 참여하도록 권유함.'})[0].kind==='advise','‘참여하도록 권유함’은 참여로 세지 않음');
 ok(L.noteKey(notes[0])!==L.noteKey({...notes[0],content:notes[0].content+' 추가'}),'일지 내용이 바뀌면 다른 열쇠');
 ok(L.addMonths('2026-05-01',2)==='2026-07-01','두 달 뒤 날짜 계산');
}

// 2. 화면: 이전 기록 읽기, 기간, 집계
{const w=await boot({[OLD_KEY]:oldRaw});const d=w.document;
 ok(d.querySelector('#lfMember').options.length===2,'회원 2명 목록');
 const cards=d.querySelectorAll('.lf-card');ok(cards.length===6,'기간 안 일지 6건만 표시(기간 밖 1건 제외)');
 ok(d.querySelector('#lfStart').value==='2026-05-01'&&d.querySelector('#lfEnd').value==='2026-10-31','회원 평가기간을 기본 기간으로');
 const sum=d.querySelector('#lfSummary').textContent;ok(/미확정 6건/.test(sum),'처음에는 모두 미확정');
 ok(/위험 확인 1줄/.test(sum),'위험 확인 줄 수 표시');
 const medRow=[...d.querySelectorAll('#lfSummary tr')].find(tr=>/^복약/.test(tr.querySelector('th')?.textContent||''));
 ok(medRow&&medRow.children[7].textContent.trim()==='2','복약 실적 2(실시 2)');
 ok(medRow&&medRow.children[8].textContent.trim()==='0.5','복약 첫 2개월 월 평균 0.5');
 const hyg=[...d.querySelectorAll('#lfSummary tr')].find(tr=>/^개인위생/.test(tr.querySelector('th')?.textContent||''));
 ok(hyg&&hyg.children[7].textContent.trim()==='1'&&hyg.children[4].textContent.trim()==='1','위생: 안내 1건은 실적에서 빠지고 요리 참여 1건만 실적');
 ok(w.localStorage.getItem(OLD_KEY)===oldRaw,'이전 화면 기록은 바뀌지 않음');
 const g=d.querySelector('#lfGuide');ok(g&&!g.hidden&&/지금 할 일/.test(g.textContent)&&/일지 6건을 확인하고 확정하기/.test(g.textContent),'첫 화면에 쓰는 순서와 지금 할 일');
 ok(/확정 0\/6/.test(d.querySelector('[data-step="3"]').textContent),'단계 단추에 진행 상황');
 ok(d.querySelector('a[href="forms.html"]'),'양식 보기·인쇄(이전 화면)로 가는 길');

 // 구분 바꾸기 → 저장·집계 반영
 const c3=d.querySelectorAll('.lf-card')[2];const sel=c3.querySelector('select[data-f="kind"]');sel.value='do';fire(w,sel,'change');
 const sheet=JSON.parse(w.localStorage.getItem(SHEET_KEY));const saved=Object.values(sheet.members.m1.notes);ok(saved.length===1&&saved[0].rows[0].kind==='do','구분 바꾼 줄을 정리표에 저장');
 const hyg2=[...d.querySelectorAll('#lfSummary tr')].find(tr=>/^개인위생/.test(tr.querySelector('th')?.textContent||''));ok(hyg2&&hyg2.children[7].textContent.trim()==='2','바꾼 구분이 실적에 바로 반영');

 // 확정
 d.querySelectorAll('.lf-card')[0].querySelector('[data-act="confirm"]').click();
 ok(d.querySelectorAll('.lf-card')[0].classList.contains('confirmed'),'확정 누르면 확정 표시');
 ok(/미확정 5건/.test(d.querySelector('#lfSummary').textContent),'미확정 수 줄어듦');
 // 확정 뒤 고치면 확정 풀림
 const inp=d.querySelectorAll('.lf-card')[0].querySelector('input[data-f="act"]');inp.value='복약 점검표 확인';fire(w,inp,'input');
 ok(!d.querySelectorAll('.lf-card')[0].classList.contains('confirmed'),'확정 뒤 고치면 다시 미확정');
 // 줄 추가·삭제
 d.querySelectorAll('.lf-card')[1].querySelector('[data-act="row-add"]').click();
 const n2=d.querySelectorAll('.lf-card')[1].querySelectorAll('.lf-row').length;ok(n2>=2,'줄 추가');
 d.querySelectorAll('.lf-card')[1].querySelectorAll('[data-act="row-del"]')[n2-1].click();
 ok(d.querySelectorAll('.lf-card')[1].querySelectorAll('.lf-row').length===n2-1,'줄 삭제');
 // 모두 확정
 d.querySelector('[data-act="confirm-all"]').click();ok(/목표 영역 고르고/.test(d.querySelector('#lfGuide').textContent),'모두 확정하면 지금 할 일이 ④로');ok(!/미확정/.test(d.querySelector('#lfSummary').textContent),'추천 그대로 모두 확정');
 // 인쇄 요약표
 const pr=d.querySelector('#lfPrint').textContent;ok(/기간별 상담 요약표/.test(pr)&&/2026-05-01 ~ 2026-10-31/.test(pr)&&/작성일/.test(pr),'인쇄용 요약표에 기간·작성일');
 // 기간 바꾸기
 const s=d.querySelector('#lfStart');s.value='2026-06-01';fire(w,s,'change');ok(d.querySelectorAll('.lf-card').length===3,'기간 바꾸면 그 기간 일지만');
 ok(JSON.parse(w.localStorage.getItem(SHEET_KEY)).members.m1.periodStart==='2026-06-01','바꾼 기간 저장');
 ok(w.localStorage.getItem(OLD_KEY)===oldRaw,'끝까지 이전 화면 기록은 그대로');

 // 다시 열면 확정 내용 유지
 const w2=await boot({[OLD_KEY]:oldRaw,[SHEET_KEY]:w.localStorage.getItem(SHEET_KEY)});
 ok(w2.document.querySelectorAll('.lf-card.confirmed').length===3,'다시 열어도 확정 유지');
 // 이전 화면에서 일지를 고치면 그 일지만 다시 추천
 const changed=JSON.parse(oldRaw);changed.members[0].notes[3].content+=' 추가 기록.';
 const w3=await boot({[OLD_KEY]:JSON.stringify(changed),[SHEET_KEY]:w.localStorage.getItem(SHEET_KEY)});
 ok(w3.document.querySelectorAll('.lf-card.confirmed').length===2,'내용이 바뀐 일지는 다시 확인 받음');
}

// 3. 기록 없음, 글자 이스케이프
{const w=await boot({});ok(/회원 기록을 찾지 못했습니다/.test(w.document.querySelector('#lfNotes').textContent),'기록 없으면 백업 불러오기 안내');
 const evil={members:[{id:'x',label:'<img src=x onerror=alert(1)>',periodStart:'2026-01-01',periodEnd:'2026-12-31',notes:[{date:'2026-02-01',topic:'<b>t</b>',content:'"<script>x</script>"라고 함'}]}]};
 const w2=await boot({[OLD_KEY]:JSON.stringify(evil)});ok(!w2.document.querySelector('#lfNotes img,#lfNotes script,#lfMember img')&&w2.document.querySelector('.lf-topic').textContent==='<b>t</b>','일지 글자는 그대로 글자로만 표시');
}

console.log(`결과: 통과 ${pass} / 실패 ${fail}`);process.exit(fail?1:0);
})();
