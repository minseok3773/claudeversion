// v3.21.64 시험용 가상 문서 — 한글(HWP)에서 복사했을 때 오는 두 가지 모양
//  1) 글자(text/plain): 표의 칸마다 한 줄씩, 칸 경계(탭) 없이 온다(사용자 화면으로 확인한 모양)
//  2) 표 모양 정보(text/html): <TABLE>·병합 칸(rowspan/colspan)·칸 안 여러 문단
// 모든 내용은 가상 자료입니다.
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const P=t=>`<P CLASS=HStyle0 STYLE='line-height:160%;'><SPAN STYLE='font-family:"맑은 고딕";font-size:10.0pt'>${esc(t)}</SPAN></P>`;
const ps=t=>String(t).split('\n').map(P).join('\n');
const TD=(t,a='')=>`<TD valign="middle" style='width:120px;border:solid #000000 0.4pt;padding:1.4pt 5.1pt'${a}>${ps(t)}</TD>`;
const TR=cells=>`<TR>${cells.join('')}</TR>`;
const TABLE=rows=>`<TABLE border="1" cellspacing="0" cellpadding="0" style='border-collapse:collapse;border:none;'>\n${rows.join('\n')}\n</TABLE>`;
const wrap=body=>`<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>P.HStyle0{margin:0;font-size:10pt}</style></head><body>\n<!--StartFragment-->\n${body}\n<!--EndFragment-->\n</body></html>`;

const plan={
 voice:['“일을 해서 돈을 모으고 싶어요”','“혼자 살아 보고 싶어요”'],
 need:['-일을 통해 경제적 자립을 이루기를 희망함.','-독립 주거를 원함.'],
 fvoice:['“규칙적으로 생활했으면 좋겠어요”'],
 fneed:['- 가족은 회원이 규칙적인 생활을 하기를 희망함.'],
 manager:['1. 경제적 자립을 위한 근로 유지의 어려움','- 금전 관리 경험 부족'],
 psycho:[['일차적 지지집단과의','욕구 & 문제'],['사회적 환경과 관련된','욕구 & 문제'],['교육적 욕구 & 문제'],['직업적 욕구 & 문제'],['주거의 욕구 & 문제'],['경제적 욕구 & 문제'],['신체 건강상의 욕구 & 문제'],['기타 심리사회적 욕구 & 문제']],
 psychoText:['▪ 동생과 월 1회 통화함.','▪ 이웃과 교류가 적음.','▪ 기초학습 지원 필요.','▪ 보호작업장 근로 유지 중.','▪ 시설 공동생활 중.','▪ 용돈 계획 수립 필요.','▪ 체중 관리 필요.','▪ 충동 조절 어려움.'],
 strength:['성실하게 출근함.','요리를 좋아함.','동료와 잘 지냄.'],
 weakness:['금전 계획이 부족함.','기분 변화에 따라 충동적으로 행동함.','공동생활 규칙 위반이 잦음.'],
 goals:[
  {long:'자기관리 능력 향상.',short:'1. 하루 일과표를 작성하고 실천함.',plan:'- 주 1회 일과표 점검을 함께 할 계획임.',activity:'- 주 1회 일과표 점검을 함께 할 계획임.',target:'- 일과표 작성률 80% 이상'},
  {long:'자기관리 능력 향상.',short:'1. 용돈 기입장을 매주 작성함.',plan:'- 매주 기입장 확인을 지원할 계획임.',activity:'- 매주 기입장 확인을 지원할 계획임.',target:'- 기입장 작성 주 1회 이상'},
  {long:'직업 유지.',short:'1. 보호작업장에 주 5회 출근함.\n2. 지각 없이 출근함.',plan:'- 출근 기록을 월 1회 확인할 계획임.\n- 작업장 담당자와 분기 1회 협의할 계획임.',activity:'- 출근 기록을 월 1회 확인할 계획임.\n- 작업장 담당자와 분기 1회 협의할 계획임.',target:'- 출근율 90% 이상\n- 지각 월 1회 이하'}],
 services:[['사회심리재활','■ 일상생활 프로그램 주 2회','시설 프로그램실, 담당 직원'],['운동재활','■ 걷기 프로그램 주 1회','인근 공원']],
 opinion:'- 경제적 자립과 생활 리듬 회복을 위해 위 목표를 수립함.'
};
const planText=[
 '재활계획서 1','1. 회원 및 가족의 욕구 & 문제','1) 회원이 제시하는 욕구 & 문제','회원의 주관적 호소 (대화체)',...plan.voice,'욕구 기술 — 주관적 호소에 대한 객관적 기술',...plan.need,
 '2) 가족이 제시하는 욕구 & 문제','가족의 주관적 호소 (대화체)',...plan.fvoice,'욕구 기술 — 가족의 호소에 대한 객관적 기술',...plan.fneed,
 '3) 사례관리자가 보는 회원의 욕구 & 문제','개입이 필요한 영역 및 구체적인 이유',...plan.manager,
 '2. 심리사회적 욕구 & 문제','문제 & 욕구','내용',...plan.psycho.flatMap((c,i)=>[...c,plan.psychoText[i]]),
 '3. 강점 및 약점','강점','약점',...plan.strength.map((s,i)=>`${i+1}. ${s}`),...plan.weakness.map((s,i)=>`${i+1}. ${s}`),
 '4. 개입 목표 및 계획','1) 목표 및 계획','No','장기목표','단기목표 (6개월 이내)','재활 계획',
 // 2번 목표의 장기목표 칸은 1번과 합쳐진 칸이라 글자로는 한 번만 나온다
 '1',plan.goals[0].long,plan.goals[0].short,plan.goals[0].plan,'2',plan.goals[1].short,plan.goals[1].plan,'3',plan.goals[2].long,...plan.goals[2].short.split('\n'),...plan.goals[2].plan.split('\n'),
 '2) 재활 활동 계획','서비스 영역','제공 서비스','자원 활용 계획',...plan.services.flat(),
 '3) 평가 및 측정 도구','단기목표','세부활동','내용','성과목표',...plan.goals.flatMap(g=>[...g.short.split('\n'),...g.activity.split('\n'),...g.target.split('\n')]),
 '5. 사례관리자의 의견','현 상태를 근거로 재활목표와 계획을 수립한 이유',plan.opinion,'회원 서명: __________________(인)','사례관리자 서명: __________________(인)'
].join('\r\n');
const planHtml=wrap([
 P('재활계획서 1'),P('1. 회원 및 가족의 욕구 & 문제'),
 TABLE([TR([TD('1) 회원이 제시하는 욕구 & 문제',' colspan="2"')]),TR([TD('회원의 주관적 호소\n(대화체)'),TD(plan.voice.join('\n'))]),TR([TD('욕구 기술'),TD(plan.need.join('\n'))]),
  TR([TD('2) 가족이 제시하는 욕구 & 문제',' colspan="2"')]),TR([TD('가족의 주관적 호소 (대화체)'),TD(plan.fvoice.join('\n'))]),TR([TD('욕구 기술'),TD(plan.fneed.join('\n'))]),
  TR([TD('3) 사례관리자가 보는 회원의 욕구 & 문제',' colspan="2"')]),TR([TD('개입이 필요한 영역 및 구체적인 이유'),TD(plan.manager.join('\n'))])]),
 P('2. 심리사회적 욕구 & 문제'),
 TABLE([TR([TD('문제 & 욕구'),TD('내용')]),...plan.psycho.map((c,i)=>TR([TD(c.join('\n')),TD(plan.psychoText[i])]))]),
 P('3. 강점 및 약점'),
 TABLE([TR([TD('강점'),TD('약점')]),TR([TD(plan.strength.map((s,i)=>`${i+1}. ${s}`).join('\n')),TD(plan.weakness.map((s,i)=>`${i+1}. ${s}`).join('\n'))])]),
 P('4. 개입 목표 및 계획'),P('1) 목표 및 계획'),
 TABLE([TR([TD('No'),TD('장기목표'),TD('단기목표\n(6개월 이내)'),TD('재활 계획')]),
  TR([TD('1'),TD(plan.goals[0].long,' rowspan="2"'),TD(plan.goals[0].short),TD(plan.goals[0].plan)]),
  TR([TD('2'),TD(plan.goals[1].short),TD(plan.goals[1].plan)]),
  TR([TD('3'),TD(plan.goals[2].long),TD(plan.goals[2].short),TD(plan.goals[2].plan)])]),
 P('2) 재활 활동 계획'),
 TABLE([TR([TD('서비스 영역'),TD('제공 서비스'),TD('자원 활용 계획')]),...plan.services.map(s=>TR(s.map(x=>TD(x))))]),
 P('3) 평가 및 측정 도구'),
 TABLE([TR([TD('단기목표'),TD('세부활동\n내용'),TD('성과목표')]),...plan.goals.map(g=>TR([TD(g.short),TD(g.activity),TD(g.target)]))]),
 P('5. 사례관리자의 의견'),
 TABLE([TR([TD('현 상태를 근거로 재활목표와 계획을 수립한 이유')]),TR([TD(plan.opinion)])]),
 P('회원 서명: __________________(인)')
].join('\n'));

const evaluation={
 part:[['사회심리재활','일상생활 프로그램 20회 참여','시설 프로그램실'],['운동재활','걷기 프로그램 15회 참여','인근 공원']],
 goals:[
  {long:'자기관리 능력 향상.',short:'1. 하루 일과표를 작성하고 실천함.',activity:'▪ 하루 일과표를 작성하고 실천함.\n- 3월~8월 주 1회 일과표 점검 (총 22회)',result:'▪ 일과표 작성률 80% 이상\n- 작성률 85%로 목표를 달성함.',achMember:'- 스스로 일과표를 챙김.',achStaff:'- 주 1회 점검을 꾸준히 함.',blockMember:'- 주말에 일과가 흐트러짐.',blockStaff:'- 주말 점검이 어려움.'},
  {long:'직업 유지.',short:'1. 보호작업장에 주 5회 출근함.',activity:'▪ 보호작업장에 주 5회 출근함.\n- 출근 기록 월 1회 확인 (6회)',result:'▪ 출근율 90% 이상\n- 출근율 82%로 부분 달성함.',achMember:'- 출근 의지가 높음.',achStaff:'- 작업장 담당자와 협의함.',blockMember:'- 기분 변화로 결근함.',blockStaff:'- 결근 사유 확인이 늦음.'}],
 overall:'- 목표 1은 달성, 목표 2는 부분 달성함.',
 opinion:'- 주말 일과 관리와 출근 유지 지원을 차기 계획에 반영함.'
};
const evalText=[
 '재활평가서','◈ 개입 목표 및 계획','1) 참여 재활 활동','서비스 영역','제공 서비스','자원 활용 내역',...evaluation.part.flat(),
 '2) 목표 및 평가',
 ...evaluation.goals.flatMap((g,i)=>[`재활 목표 ${i+1}`,'내용','단기목표',...g.short.split('\n'),'세부활동 내용',...g.activity.split('\n'),'성과목표 달성도',...g.result.split('\n'),'달성 요인','회원',g.achMember,'직원',g.achStaff,'방해 요인','회원',g.blockMember,'직원',g.blockStaff]),
 '종합 평가','목표 달성 여부 및 미달성 원인에 대한 객관적 서술',evaluation.overall,
 '◈ 담당자의 의견 및 특이사항','종합평가에 근거한 추후 신규 재활계획 반영사항',evaluation.opinion,'회원 서명: __________________(인)'
].join('\r\n');
const evalHtml=wrap([
 P('재활평가서'),P('◈ 개입 목표 및 계획'),P('1) 참여 재활 활동'),
 TABLE([TR([TD('서비스 영역'),TD('제공 서비스'),TD('자원 활용 내역')]),...evaluation.part.map(s=>TR(s.map(x=>TD(x))))]),
 P('2) 목표 및 평가'),
 ...evaluation.goals.map((g,i)=>TABLE([
  TR([TD(`재활 목표 ${i+1}\n${g.long}`),TD('내용',' colspan="2"')]),
  TR([TD('단기목표'),TD(g.short,' colspan="2"')]),
  TR([TD('세부활동 내용'),TD(g.activity,' colspan="2"')]),
  TR([TD('성과목표 달성도'),TD(g.result,' colspan="2"')]),
  TR([TD('달성 요인',' rowspan="2"'),TD('회원'),TD(g.achMember)]),TR([TD('직원'),TD(g.achStaff)]),
  TR([TD('방해 요인',' rowspan="2"'),TD('회원'),TD(g.blockMember)]),TR([TD('직원'),TD(g.blockStaff)])])),
 P('종합 평가'),TABLE([TR([TD('목표 달성 여부 및 미달성 원인에 대한 객관적 서술'),TD(evaluation.overall)])]),
 P('◈ 담당자의 의견 및 특이사항'),TABLE([TR([TD('종합평가에 근거한 추후 신규 재활계획 반영사항'),TD(evaluation.opinion)])])
].join('\n'));
module.exports={plan,planText,planHtml,evaluation,evalText,evalHtml,wrap,P,TD,TR,TABLE};
