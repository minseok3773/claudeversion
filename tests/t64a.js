// v3.21.64 — 한글 표 해석기: 표 모양(HTML)·칸마다 한 줄 글·문서 종류 고르기 (가상 자료)
const {ok,done}=require('./h.js');const {JSDOM}=require('jsdom');
const P=require(require('path').resolve(__dirname,'../hwp-paste.js'));
const F=require('./hwpfix64.js');
const DP=new JSDOM('').window.DOMParser;
const cats=['일차적 지지집단과의 욕구 & 문제','사회적 환경과 관련된 욕구 & 문제','교육적 욕구 & 문제','직업적 욕구 & 문제','주거의 욕구 & 문제','경제적 욕구 & 문제','신체 건강상의 욕구 & 문제','기타 심리사회적 욕구 & 문제'];
const opts={DOMParser:DP,maxLength:60000,fieldMax:6000};
console.log('[1] 한글 표 모양(HTML) → 표 한 줄 = 글 한 줄');
{const t=P.fromHtml(F.planHtml,DP);const L=t.split('\n');
 ok(L.some(l=>l.startsWith('1) 회원이 제시하는 욕구 & 문제\t욕구 기술')),'세로 병합 칸은 아래 줄에도 같은 글',L.find(l=>l.includes('욕구 기술')));
 ok(L.includes('1. 회원 및 가족의 욕구 & 문제'),'가로 병합 칸은 한 칸');
 ok(L.some(l=>/^1\. 성실하게 출근함\.\u20282\. 요리를 좋아함\.\u20283\. 도움을 청할 줄 앎\.\t1\. 금전관리/.test(l)),'칸 안 여러 줄은 한 칸에 유지');
 ok(L.some(l=>l==='4\t\t\t'),'빈 칸도 자리 유지',L.filter(l=>l.startsWith('4')));
 ok(!/StartFragment|HStyle0|font-size/.test(t),'서식 글자는 빼고 내용만');
}
console.log('[2] 재활계획서 전체(HTML)');
{const r=P.read({html:F.planHtml,text:'아무 글'},'plan',cats,opts),f=r.fields;
 ok(r.via==='table'&&r.type==='plan','표 모양으로 읽음',[r.via,r.type,r.matched]);
 ok(f['plan.memberVoice']==='“취업해서 돈 벌고 싶어요.”\n“퇴소해서 동생과 살고 싶어요.”','회원의 주관적 호소(두 줄)',f['plan.memberVoice']);
 ok(f['plan.memberNeed']==='- 취업으로 경제적 자립을 이루기를 희망함.\n- 퇴소 후 가족과 함께 살기를 원함.','회원 욕구 기술(제목 칸이 세로 병합)',f['plan.memberNeed']);
 ok(f['plan.familyVoice']==='“직장생활을 잘 했으면 좋겠어요.”'&&f['plan.familyNeed']==='- 가족은 회원이 안정적으로 일하기를 바람.','가족 칸',[f['plan.familyVoice'],f['plan.familyNeed']]);
 ok(f['plan.managerNeed']==='1. 경제적 자립을 위한 근로 유지의 어려움\n- 금전관리 경험이 부족함.','사례관리자 칸',f['plan.managerNeed']);
 ok(f['plan.psycho.0']==='▪ 동생과 월 1회 통화함.\n▪ 명절에 가족 방문을 희망함.'&&f['plan.psycho.1']==='▪ 동료와 갈등 없이 지냄.'&&!f['plan.psycho.4']&&f['plan.psycho.7']==='▪ 충동 조절 연습 필요.','심리사회 8칸(두 줄 제목·빈 칸 포함)',[f['plan.psycho.0'],f['plan.psycho.1'],f['plan.psycho.4']]);
 ok(f['plan.strength.0']==='성실하게 출근함.'&&f['plan.strength.2']==='도움을 청할 줄 앎.'&&f['plan.weakness.1']==='기분 변화에 따라 충동적으로 행동함.'&&f['plan.weakness.2']==='공동생활 규칙을 자주 어김.','강점·약점 한 칸 여러 줄 → 1·2·3번 칸',[f['plan.strength.0'],f['plan.weakness.1']]);
 ok(f['plan.goals.0.long']==='경제적 자립 능력을 향상시킴.'&&f['plan.goals.1.long']==='경제적 자립 능력을 향상시킴.'&&f['plan.goals.2.long']==='건강한 생활습관을 유지함.','장기목표(세로 병합 → 두 줄 모두)',[f['plan.goals.1.long']]);
 ok(f['plan.goals.0.short']==='1. 주 5일 근로를 유지함.\n2. 월급 사용 계획을 세움.'&&f['plan.goals.0.plan']==='- 직장 적응 상담을 월 1회 실시할 계획임.\n- 금전관리 교육을 월 1회 실시할 계획임.','단기목표·재활 계획 여러 줄',f['plan.goals.0.plan']);
 ok(!f['plan.goals.3.long']&&!f['plan.goals.3.short'],'빈 줄(4번)은 비워 둠');
 ok(f['plan.goals.1.activity']==='- 상환 일정 점검 기록'&&f['plan.goals.0.activity']==='- 출근 기록 확인\n- 월급 사용 계획서'&&f['plan.goals.2.target']==='- 주 3회 이상 참여','측정표는 단기목표 글로 찾아 넣음(순서가 달라도)',[f['plan.goals.1.activity'],f['plan.goals.0.activity']]);
 ok(f['plan.services.0.type']==='사회심리재활'&&f['plan.services.1.type']==='사회심리재활'&&f['plan.services.1.service']==='■ 사회기술훈련'&&f['plan.services.2.resource']==='- 근처 공원','재활 활동 계획(세로 병합 영역)',[f['plan.services.1.type'],f['plan.services.1.service']]);
 ok(f['plan.opinion']==='- 근로를 유지하며 금전관리 능력을 키우도록 계획함.\n- 건강관리를 함께 지원할 필요가 있음.','사례관리자의 의견(서명·바닥글은 붙지 않음)',f['plan.opinion']);
 ok(!Object.values(f).some(v=>/서명|새희망둥지|\u2028/.test(v)),'서명·바닥글·칸 표시 글자 없음');
 ok(!r.warnings.length,'안내 없음',r.warnings);
}
console.log('[3] 재활평가서 전체(HTML)');
{const r=P.read({html:F.evalHtml,text:''},'plan',cats,opts),f=r.fields;
 ok(r.type==='evaluation','제목으로 평가서로 알아봄',r.type);
 ok(f['evaluation.participation.0.service']==='■ 직업 적응 상담 6회\n■ 금전관리 교육 5회'&&f['evaluation.participation.1.type']==='운동재활','참여 재활 활동');
 ok(r.goalTitles[0]==='경제적 자립 능력을 향상시킴.','목표 1 제목 칸의 장기목표',r.goalTitles);
 ok(f['evaluation.goals.0.short']==='1. 주 5일 근로를 유지함.\n2. 월급 사용 계획을 세움.'&&/평균 주 4.8일/.test(f['evaluation.goals.0.activity']),'목표 1 단기목표·세부활동');
 ok(/출근율 96%/.test(f['evaluation.goals.0.result'])&&!f['evaluation.goals.0.analysis'],'성과목표 달성도 → 달성 내용',f['evaluation.goals.0.result']);
 ok(f['evaluation.goals.0.achMember']==='- 출근 의지가 강함.'&&f['evaluation.goals.0.achStaff']==='- 직장 적응 상담을 꾸준히 함.'&&f['evaluation.goals.0.blockMember']==='- 월말에 충동구매가 있음.'&&f['evaluation.goals.0.blockStaff']==='- 교육 일정이 두 번 밀림.','달성·방해 요인(회원/직원 세로 병합)');
 ok(f['evaluation.goals.1.indicator']==='- 주 3회 이상 참여'&&f['evaluation.goals.1.result']==='▪ 주 3회 운동함.\n- 평균 주 2회 참여하여 부분 달성함.'&&f['evaluation.goals.1.analysis']==='- 날씨가 나쁜 달에 참여가 줄었음.','달성도 칸 안 소제목으로 나눔',[f['evaluation.goals.1.indicator'],f['evaluation.goals.1.analysis']]);
 ok(f['evaluation.goals.1.achMember']==='- 운동을 좋아함.'&&f['evaluation.goals.1.achStaff']==='- 함께 걸었음.'&&f['evaluation.goals.1.blockMember']==='무릎 통증이 있음.'&&f['evaluation.goals.1.blockStaff']==='일정 조정이 늦었음.','요인 칸 안 ‘회원/직원’ 소제목',[f['evaluation.goals.1.blockMember']]);
 ok(f['evaluation.overall']==='- 근로 목표는 달성함.\n- 운동 목표는 부분 달성함.'&&f['evaluation.opinion']==='- 다음 계획에서 금전관리 목표를 이어감.','종합 평가·담당자 의견',[f['evaluation.overall'],f['evaluation.opinion']]);
}
console.log('[4] 글자로만 온 표(칸마다 한 줄) — 사용자 화면의 경우');
{const r=P.read({text:F.planFlat},'plan',cats,opts),f=r.fields;
 ok(r.via==='text','글자로 읽음');
 ok(f['plan.strength.0']==='성실하게 출근함.'&&f['plan.strength.2']==='도움을 청할 줄 앎.'&&f['plan.weakness.0']==='금전관리 경험이 부족함.'&&f['plan.weakness.2']==='공동생활 규칙을 자주 어김.','강점 3·약점 3 (번호가 1로 돌아가면 약점)',[f['plan.strength.0'],f['plan.weakness.0']]);
 ok(f['plan.goals.0.long']==='자기관리 능력을 향상시킴.'&&f['plan.goals.0.short']==='1. 매일 약을 챙겨 먹음.\n2. 방 정리를 주 2회 함.'&&f['plan.goals.0.plan']==='- 복약 확인을 매일 함께 할 계획임.\n- 방 정리 점검표를 쓸 계획임.','목표 1 (No 번호로 줄 나눔)',[f['plan.goals.0.long'],f['plan.goals.0.short'],f['plan.goals.0.plan']]);
 ok(f['plan.goals.1.long']==='자기관리 능력을 향상시킴.'&&f['plan.goals.1.short']==='1. 일정표를 스스로 씀.','목표 2 (병합된 장기목표는 위와 같게)',f['plan.goals.1.long']);
 ok(f['plan.goals.2.long']==='경제적 자립 능력을 향상시킴.'&&f['plan.goals.2.plan']==='- 금전관리 교육을 할 계획임.','목표 3');
 ok(f['plan.services.0.type']==='사회심리재활'&&f['plan.services.0.service']==='■ 자기관리 교육\n■ 주간활동계획&평가'&&f['plan.services.0.resource']==='- 내부 자원'&&f['plan.services.1.type']==='운동재활'&&f['plan.services.1.service']==='■ 걷기','재활 활동 계획(영역 이름·■ 줄로 나눔)',[f['plan.services.0.service'],f['plan.services.1.service']]);
 ok(f['plan.goals.0.activity']==='- 복약 기록'&&f['plan.goals.0.target']==='- 주 6일 이상'&&!f['plan.goals.1.activity'],'측정표(단기목표 글로 줄 찾기, 측정 기준 모양으로 나눔)',[f['plan.goals.0.activity'],f['plan.goals.0.target']]);
 ok(r.warnings.some(w=>/칸을 나눴습니다/.test(w))&&!r.warnings.some(w=>/넣지 않았습니다/.test(w)),'글자로 나눴다는 확인 안내',r.warnings);
 {const r2=P.parse('3. 강점 및 약점\n강점\n약점\n요리를 좋아함.\n늦잠을 잠.\n4. 개입 목표 및 계획','plan',cats);ok(!Object.keys(r2.fields).length&&r2.warnings.some(w=>/강점 및 약점/.test(w)&&/넣지 않았습니다/.test(w)),'번호 없는 글자 표는 넣지 않고 안내',[r2.fields,r2.warnings])}
 ok(f['plan.opinion']==='- 스스로 생활을 관리하도록 계획함.','의견(서명 줄은 빼고)',f['plan.opinion']);
 ok(!Object.values(f).some(v=>/세부활동|서비스 영역|^1$/.test(v)),'머리글·번호가 칸에 섞이지 않음');
}
console.log('[5] 줄마다 강점·약점이 번갈아 나오는 글');
{const f=P.parse(F.swRowWise,'plan',cats).fields;
 ok(f['plan.strength.1']==='요리를 잘함.'&&f['plan.weakness.1']==='규칙을 어김.'&&f['plan.weakness.2']==='늦잠을 잠.','1,1,2,2,3,3 → 번갈아',f);
}
console.log('[6] 평가서 — 칸마다 한 줄');
{const r=P.read({text:F.evalFlat},'evaluation',cats,opts),f=r.fields;
 ok(r.goalTitles[0]==='규칙적인 생활리듬을 유지함.'&&r.goalTitles[1]==='금전을 계획적으로 사용함.','목표 제목(장기목표) 기억',r.goalTitles);
 ok(f['evaluation.goals.0.short']==='1. 매일 같은 시간에 일어남.'&&f['evaluation.goals.0.result']==='▪ 주 5회 이상 → 평균 주 4회로 부분 달성함.','목표 1');
 ok(f['evaluation.goals.0.achMember']==='- 알람을 스스로 맞춤.'&&f['evaluation.goals.0.achStaff']==='- 아침 인사로 확인함.'&&f['evaluation.goals.0.blockStaff']==='- 주말 점검이 어려웠음.','요인 회원/직원 줄',[f['evaluation.goals.0.achMember'],f['evaluation.goals.0.blockStaff']]);
 ok(f['evaluation.goals.1.short']==='1. 용돈 계획을 세움.'&&f['evaluation.goals.1.result']==='- 6회 중 5회 작성함.'&&f['evaluation.overall']==='- 목표를 대체로 달성함.','목표 2·종합 평가');
}
console.log('[7] 제목 없이 표만 — 더 많이 맞는 문서 종류');
{const only=F.wrap(F.table(F.tr(F.td(F.P('강점')),F.td(F.P('약점'))),F.tr(F.td(F.ps('1. 성실함.','2. 웃음이 많음.')),F.td(F.ps('1. 늦잠.','2. 충동구매.')))));
 const r=P.read({html:only,text:'강점\n약점\n1. 성실함.\n2. 웃음이 많음.\n1. 늦잠.\n2. 충동구매.'},'evaluation',cats,opts);
 ok(r.type==='plan'&&r.fields['plan.strength.1']==='웃음이 많음.'&&r.fields['plan.weakness.1']==='충동구매.','평가서 화면에서 붙여도 계획서 표로 알아봄',[r.type,r.fields]);
 const g=F.wrap(F.table(F.tr(F.td(F.P('서비스 영역')),F.td(F.P('제공 서비스')),F.td(F.P('자원 활용 내역'))),F.tr(F.td(F.P('운동재활')),F.td(F.P('■ 걷기 12회')),F.td(F.P('- 공원')))));
 const r2=P.read({html:g},'evaluation',cats,opts);ok(r2.type==='evaluation'&&r2.fields['evaluation.participation.0.service']==='■ 걷기 12회','같으면 지금 화면 종류',[r2.type,r2.fields]);
 const r3=P.read({html:g},'plan',cats,opts);ok(r3.type==='plan'&&r3.fields['plan.services.0.resource']==='- 공원','계획서 화면이면 계획서',r3.type);
}
console.log('[8] 표 모양이 오히려 나쁘면 글자 쪽');
{const bad='<table><tr><td>아무</td><td>칸</td></tr></table>';const r=P.read({html:bad,text:'재활계획서\n회원의 주관적 호소\n“일하고 싶어요.”'},'plan',cats,opts);
 ok(r.via==='text'&&r.fields['plan.memberVoice']==='“일하고 싶어요.”','더 많이 알아본 쪽',[r.via,r.fields]);
 ok(P.read({html:'',text:'  '},'plan',cats,opts).error,'빈 내용');
}
console.log('[9] 본문의 ‘목표 1회’는 목표 제목이 아님');
{const r=P.parse('재활평가서\n2) 목표 및 평가\n재활 목표 1\n단기목표\n목표 1회 이상 참여함.\n세부활동 내용\n- 산책','evaluation',cats);
 ok(r.fields['evaluation.goals.0.short']==='목표 1회 이상 참여함.'&&r.fields['evaluation.goals.0.activity']==='- 산책','본문 유지',r.fields);
}
console.log('[10] 다른 표를 품은 바깥 표(쪽 틀) · 안쪽 요인 표');
{const T=F.table,R=F.tr,D=F.td,Pp=F.P,PS=F.ps;
 const inner=T(R(D(Pp('강점')),D(Pp('약점'))),R(D(PS('1. 성실함.','2. 웃음이 많음.')),D(PS('1. 늦잠.','2. 충동구매.'))));
 const html=F.wrap(T(R(D(Pp('재활계획서 1'))),R(D(Pp('3. 강점 및 약점')+inner)),R(D(Pp('5. 사례관리자의 의견')+Pp('- 생활 리듬 회복을 지원함.')))));
 const r=P.read({html},'plan',cats,opts),f=r.fields;
 ok(f['plan.strength.1']==='웃음이 많음.'&&f['plan.weakness.1']==='충동구매.'&&f['plan.opinion']==='- 생활 리듬 회복을 지원함.','바깥 틀 표 안의 강점·약점 표',f);
 const fac=T(R(D(Pp('회원')),D(Pp('- 꾸준히 걸음.'))),R(D(Pp('직원')),D(Pp('- 함께 걸음.'))));
 const eh=F.wrap(Pp('재활평가서')+T(R(D(Pp('재활 목표 1')),D(Pp('내용'))),R(D(Pp('단기목표')),D(Pp('1. 주 3회 걷기.'))),R(D(Pp('달성 요인')),D(fac))));
 const r2=P.read({html:eh},'evaluation',cats,opts),g=r2.fields;
 ok(g['evaluation.goals.0.short']==='1. 주 3회 걷기.'&&g['evaluation.goals.0.achMember']==='- 꾸준히 걸음.'&&g['evaluation.goals.0.achStaff']==='- 함께 걸음.','요인 칸 안의 회원·직원 표',g);
}
console.log('[11] 글자로만 온 강점·약점 표에서 한쪽 칸이 빈 경우');
{const r=P.parse('3. 강점 및 약점\n강점\n약점\n1. 기분 변화에 따라 충동적으로 행동함.\n2. 공동생활 규칙 위반 행동이 잦음.\n4. 개입 목표 및 계획','plan',cats);
 ok(r.fields['plan.weakness.0']==='기분 변화에 따라 충동적으로 행동함.'&&!r.fields['plan.strength.0']&&r.warnings.some(w=>/약점 칸에 넣었습니다/.test(w)),'내용이 약점이면 약점 칸',[r.fields,r.warnings]);
 const r2=P.parse('3. 강점 및 약점\n강점\n약점\n1. 요리를 좋아함.\n2. 성실하게 출근함.\n4. 개입 목표 및 계획','plan',cats);
 ok(r2.fields['plan.strength.1']==='성실하게 출근함.'&&!r2.fields['plan.weakness.0'],'내용이 강점이면 강점 칸',r2.fields);
}
done();
