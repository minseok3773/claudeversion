'use strict';
// v3.21.60 전문자료 — 체크한 상담일지에 나타난 증상·문제(낱말)로 찾는 공개 전문자료 요약.
// v3.21.62: 국내 공공 자료(국가정신건강정보포털·국립정신건강센터·보건복지부·정책브리핑·한국장애인고용공단·한국건강증진개발원)를 더했다.
// 요약 문장은 아래 공식·전문 사이트 자료를 바탕으로 정신재활 실무에 맞게 정리한 일반 원칙이다(회원 개별 사실 아님).
// 브라우저(app.js)와 서버(/api/clinical-guidance)가 같은 파일을 쓴다. 서버는 여기에 적힌 주소만 확인한다.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ProKnowledge=api})(typeof globalThis==='object'?globalThis:null,function(){
 const SOURCES=Object.freeze({
  'nice-qs80':{name:'NICE QS80 정신병·조현병 성인 질 기준',url:'https://www.nice.org.uk/guidance/qs80/chapter/Quality-statements'},
  'nice-cg185':{name:'NICE CG185 양극성장애',url:'https://www.nice.org.uk/guidance/cg185'},
  'nice-cg31':{name:'NICE CG31 강박장애',url:'https://www.nice.org.uk/guidance/cg31'},
  'nice-cg115':{name:'NICE CG115 알코올 사용장애',url:'https://www.nice.org.uk/guidance/cg115'},
  'samhsa-imr':{name:'SAMHSA 질병관리와 회복(IMR) 근거기반 실천 키트',url:'https://www.samhsa.gov/resource/ebp/illness-management-recovery-evidence-based-practices-ebp-kit'},
  'samhsa-se':{name:'SAMHSA 지원고용 근거기반 실천 키트',url:'https://www.peerta.acf.hhs.gov/content/supported-employment-evidence-based-practices-ebp-kit'},
  'medline-sleep':{name:'MedlinePlus 잠이 안 올 때 생활 수칙',url:'https://medlineplus.gov/ency/patientinstructions/000853.htm'},
  'nihr-ba':{name:'NIHR 행동활성화 근거 요약',url:'https://evidence.nihr.ac.uk/alert/simpler-cheaper-therapy-behavioural-activation-can-be-as-good-as-cbt-for-treating-depression/'},
  'sct-meta':{name:'사회인지 훈련 메타분석(Schizophrenia Bulletin)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3446217'},
  'who-mhgap':{name:'WHO mhGAP 개입 지침 2.0',url:'https://www.who.int/publications/i/item/9789241549790'},
  'kr-schizo':{name:'국가정신건강정보포털 조현병(국립정신건강센터·대한신경정신의학회 감수)',url:'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=26'},
  'kr-ncmh-schizo':{name:'국립정신건강센터 「조현병 치료의 중요한 점」',url:'https://www.ncmh.go.kr/ncmh/board/boardView.do?no=8531&fno=39&gubun_no=&menu_cd=02_06_01&bn=newsView&search_item=1&search_content=&pageIndex=3'},
  'kr-insomnia':{name:'국가정신건강정보포털 불면장애',url:'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=31&srCodeNm=%EB%B6%88%EB%A9%B4%EC%9E%A5%EC%95%A0'},
  'kr-bipolar':{name:'국가정신건강정보포털 1형 양극성장애',url:'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=25'},
  'kr-depression':{name:'국가정신건강정보포털 주요우울장애',url:'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=36&srCodeNm=%EC%A3%BC%EC%9A%94%EC%9A%B0%EC%9A%B8%EC%9E%A5%EC%95%A0'},
  'kr-ocd':{name:'국가정신건강정보포털 강박장애',url:'https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=18'},
  'kr-alcohol':{name:'국가정신건강정보포털 알코올 사용장애',url:'https://www.mentalhealth.go.kr/portal/bbs/bbsDetail.do?bbsId=BBSINIT_6&nttId=569'},
  'kr-mhcenter':{name:'보건복지부 정신건강복지센터·정신건강 위기상담전화',url:'https://www.mohw.go.kr/menu.es?mid=a10706040100'},
  'kr-109':{name:'정책브리핑 자살예방 상담전화 109',url:'https://www.korea.kr/news/policyNewsView.do?newsId=148954797'},
  'kr-kead-se':{name:'한국장애인고용공단 중증장애인 지원고용',url:'https://www.kead.or.kr/emplyspsvd/cntntsPage.do?menuId=MENU0174'},
  'kr-quitline':{name:'한국건강증진개발원 금연상담전화',url:'https://www.khepi.or.kr/menu?menuId=MENU01702'}
 });
 // 낱말은 상담일지 문장에서만 찾는다(진단명만으로는 넣지 않음). sources가 빈 주제는 정신재활 실무 원칙이다.
 const TOPICS=Object.freeze([
  {id:'positive',name:'환청·망상·피해사고',re:/환청|환시|목소리가\s*들|망상|피해\s*(?:사고|망상|의식)|의심(?:함|이|을|하)|감시|도청|쫓아|혼잣말/,sources:['nice-qs80','samhsa-imr','kr-schizo'],points:[
   '증상의 빈도·내용·괴로운 정도와 조기 경고 신호를 회원과 함께 기록하고 주치의와 공유한다.',
   '뚜렷한 정신병 증상이 없어도 짜증·불안·불면·대인관계 예민함이 심해지면 재발 초기 신호일 수 있으므로 가족·주치의와 공유한다.',
   '증상이 심해지는 상황(스트레스·수면 부족·복약 중단 등)을 함께 찾아, 쉬기·주의 돌리기·믿는 사람에게 말하기 같은 대처 계획을 세운다.',
   '정신병에 맞춘 인지행동치료와 가족 개입은 권고되는 치료이므로 필요하면 의료진과 연계를 검토한다.']},
  {id:'negative',name:'무기력·의욕 저하·활동 회피',re:/무기력|의욕|고립|은둔|누워\s*(?:있|지내|만)|방에(?:만)?\s*(?:있|머무)|거부(?:함|하|했)|불참|회피|흥미\s*(?:없|저하)|말수/,sources:['nihr-ba','kr-depression'],points:[
   '하루 일과를 함께 짜고 쉬운 활동부터 조금씩 늘리는 행동활성화 방식으로 계획한다.',
   '일상 계획표를 세워 작은 목표부터 달성하게 하고, 일주일에 몇 번의 산책 같은 가벼운 운동도 함께 계획한다.',
   '회원이 좋아하거나 가치 있게 여기는 활동을 고르게 하고, 해낸 것을 기록해 성공 경험을 쌓는다.',
   '참여하지 않은 날은 이유를 함께 살피고 다음 참여 방법(시간·동행·과제 크기)을 조정한다.']},
  {id:'meds',name:'복약·재발 예방',re:/복약|투약|약을|약\s*(?:복용|먹|챙)|처방|외래|진료|재발|재입원|입원/,sources:['samhsa-imr','kr-schizo','kr-ncmh-schizo','kr-mhcenter'],points:[
   '약의 효과와 불편감을 회원이 직접 주치의에게 말하도록 돕고, 복약 조정은 주치의와 상의하게 한다(직원이 약을 바꾸지 않음).',
   '증상이 좋아져도 약을 임의로 줄이거나 끊지 않도록 돕는다(유지치료를 하지 않으면 재발 위험이 크게 높아짐).',
   '음주·흡연·불규칙한 수면·과도한 스트레스는 재발을 부를 수 있으므로 생활습관 관리를 재발 예방 계획에 넣는다.',
   '약물치료와 함께 사례관리·사회기술훈련·직업재활 같은 정신사회재활을 이어 가고, 위기 때 정신건강 위기상담전화(1577-0199)와 지역 정신건강복지센터를 이용하는 방법을 회원·가족과 확인한다.',
   '복약 시간을 일과에 묶거나 약통·알림을 쓰는 등 회원이 스스로 챙기는 방법을 함께 정한다.',
   '재발 경고 신호와 그때 할 일을 적은 재발 예방 계획을 회원과 함께 만든다.']},
  {id:'sleep',name:'수면',re:/수면|잠을|잠이|불면|늦잠|낮잠|기상|취침|밤에\s*(?:깨|못\s*자)/,sources:['medline-sleep','kr-insomnia'],points:[
   '매일 같은 시간에 자고 일어나게 하고, 낮잠은 가급적 자지 않거나 15분 안쪽으로 줄인다.',
   '잠자기 4~6시간 전부터 카페인(커피·콜라·녹차 등)을 피하고, 잠들려고 술을 마시지 않으며, 담배는 끊도록 돕는다.',
   '낮에 땀이 날 정도의 운동과 복식호흡·점진적 근육이완 같은 이완 연습을 권한다.',
   '잠자리에 들어 20분 안에 잠이 오지 않으면 일어나 가벼운 활동을 하다가 졸릴 때 다시 눕게 하고, 수면제는 습관적으로 쓰지 않으며 복용은 주치의 지시를 따르게 한다. 수면 변화가 이어지면 주치의와 공유한다.']},
  {id:'alcohol',name:'음주·물질 사용',re:/음주|(?<![가-힣])술(?:을|은|이|만|도|에|과)?(?![가-힣])|소주|맥주|막걸리|단주|금주|재음주|만취/,sources:['nice-cg115','kr-alcohol'],points:[
   '음주량·횟수와 마시게 되는 상황을 함께 살피고, 회원이 바라는 변화를 스스로 말하게 하는 동기강화 방식으로 상담한다.',
   '마시고 싶을 때의 대처(대신 할 활동, 도움 요청)와 재음주 위험 상황을 미리 정한다.',
   '금단 증상이나 건강 문제가 의심되면 의료진과 연계한다.',
   '음주 문제가 이어지면 지역 중독관리통합지원센터(상담·교육·치료 연계)와 연계를 검토한다.']},
  {id:'physical',name:'신체건강·체중·식습관',re:/체중|비만|감량|혈압|혈당|당뇨|콜레스테롤|간식|군것질|과식|폭식|야식|식단|식습관|커피|카페인|탄산|흡연|담배|금연/,sources:['nice-qs80','kr-quitline'],points:[
   '체중·혈압·혈당 같은 신체건강 지표를 정기적으로 확인하도록 돕고 진료와 연계한다.',
   '건강한 식사와 신체활동을 함께 묶은 프로그램, 금연 지원을 권한다.',
   '간식·음료 줄이기, 걷기처럼 회원이 실천할 작은 목표를 정하고 기록한다.',
   '금연을 원하면 금연상담전화(1544-9030) 같은 국가 금연지원서비스와 연계한다.']},
  {id:'hygiene',name:'위생·일상생활 기술',re:/위생|샤워|목욕|세면|양치|환복|청결|머리\s*감|빨래|정리정돈|청소/,sources:['who-mhgap'],points:[
   '씻기·옷 갈아입기·정리 같은 일상 과제를 작은 단계로 나누어 연습하고 해낸 단계를 칭찬한다.',
   '과제를 일과표에 넣고 체크표 등으로 스스로 확인하게 한 뒤 직원의 도움을 차츰 줄인다.']},
  {id:'social',name:'대인관계·사회기술',re:/대인|동료|친구|갈등|다툼|언쟁|언성|관계\s*(?:형성|유지|어려|문제|갈등)|인사|분노|싸움/,sources:['sct-meta','kr-ncmh-schizo'],points:[
   '인사·부탁·거절처럼 필요한 대인기술을 시범 → 역할 연습 → 피드백 순서로 연습한다.',
   '다른 사람의 감정·의도를 알아차리는 연습(사회인지 훈련)은 지역사회 기능 향상에 도움이 된다.',
   '갈등 상황은 사실 중심으로 함께 돌아보고 다음에 쓸 말과 행동을 정한다.',
   '사회기술훈련·작업치료 같은 비약물 재활은 약물치료와 함께 꾸준히 받는 것이 권장된다.']},
  {id:'money',name:'금전관리',re:/금전|용돈|지출|소비|저축|생활비|채무|대출|상환|기입장|가계부/,sources:[],points:[
   '한 달 수입·지출을 회원과 함께 파악하고 회원이 고른 사용 계획을 세운다.',
   '기록은 회원이 할 수 있는 수준(영수증 모으기, 체크표)으로 정하고 정해진 날 함께 확인한다.',
   '충동 지출이 생기는 상황을 찾아 대처 방법을 정한다.']},
  {id:'work',name:'취업·직업재활',re:/취업|구직|직업|일자리|면접|이력서|근로|출근|직장|고용/,sources:['samhsa-se','nice-qs80','kr-kead-se'],points:[
   '일하고 싶어 하는 회원에게는 일자리를 먼저 구하고 현장에서 지원하는 지원고용 방식을 권한다.',
   '회원의 선호·강점에 맞춘 구직과 취업 뒤 지속 지원을 계획한다.',
   '국내에서는 한국장애인고용공단의 중증장애인 지원고용(사업체 현장훈련과 직무지도원 지원)을 검토할 수 있다. 대상 여부와 신청은 공단 지사에 확인한다.']},
  {id:'family',name:'가족 관계·보호자',re:/가족|어머니|아버지|부모|보호자|형제|자매|동생|누나|언니|오빠|면회|외박/,sources:['nice-qs80','kr-schizo','kr-ncmh-schizo'],points:[
   '가족 개입과 보호자 교육·지원은 권고되는 개입이므로, 회원의 동의 아래 가족 연락·면담을 계획에 넣는다.',
   '가족이 지나친 비판·간섭이나 거친 감정 표현 대신 지지하는 방식으로 대화하도록 돕는다(가족 교육·가족치료는 재발을 줄이는 데 도움이 됨).',
   '가족이 증상·재발 신호·대처 방법을 이해하도록 정보를 나눈다.']},
  {id:'mood',name:'우울·기분 변화',re:/우울|기분이\s*(?:처지|가라앉|들뜨|좋지)|들뜸|조증|짜증|불안|초조|눈물/,sources:['nice-cg185','nihr-ba','kr-bipolar','kr-depression'],points:[
   '기분·활동·수면 변화를 함께 기록해 재발 신호를 일찍 알아차리게 한다.',
   '우울할 때는 할 수 있는 활동부터 계획해 실천하는 행동활성화를 쓴다.',
   '기분이 지나치게 들뜨거나 잠이 크게 줄면 바로 주치의와 공유한다.',
   '수면 부족은 조증 삽화를 부를 수 있으므로 취침·기상·식사·복약 시간을 규칙적으로 유지하게 하고, 음주는 피하도록 돕는다.',
   '지나친 자신감, 잠이 줄어듦, 충동적인 결정, 잦은 다툼, 음주·도박 몰두 같은 변화를 재발 신호로 미리 함께 정해 둔다.']},
  {id:'ocd',name:'강박 행동',re:/강박|반복\s*(?:확인|행동|씻)|확인\s*행동|여러\s*번\s*확인|손을?\s*(?:자주|여러\s*번)\s*씻/,sources:['nice-cg31','kr-ocd'],points:[
   '강박 행동에 쓰는 시간과 일상에 주는 불편을 함께 기록하고, 노출·반응방지를 포함한 인지행동치료 등 전문 치료와 연계한다.',
   '안심시켜 주기·대신 확인해 주기는 늘리지 않도록 의료진과 방법을 맞추고, 일상 기능(위생·활동 참여) 유지를 돕는다.',
   '강박행동을 계속하는 한 나아지기 어렵다는 원칙에 따라, 의심이 들어도 행동을 미루고 생각에 거리를 두는 연습과 일상 활동 늘리기를 돕는다(치료 방법은 의료진과 맞춤).']},
  {id:'risk',name:'자해·자살 위험 표현',re:/자해|자살|죽고\s*싶|죽겠|사라지고\s*싶|극단적\s*선택/,sources:['who-mhgap','kr-109','kr-mhcenter'],points:[
   '자해·자살 관련 표현이 있으면 바로 안전을 확인하고 의료진·위기 대응 체계와 연계한다.',
   '위기 때 연락할 사람과 대처 순서를 적은 안전 계획을 회원과 함께 세운다.',
   '안전 계획에는 자살예방 상담전화 109(24시간)와 정신건강 위기상담전화 1577-0199, 지역 정신건강복지센터 연락처를 적어 둔다.']},
  {id:'housing',name:'주거·자립',re:/주거|자립|퇴소|입주|거주|이사|자립홈|체험홈/,sources:['kr-schizo'],points:[
   '회원이 바라는 주거 형태와 그에 필요한 생활기술(장보기·요리·공과금 관리)을 함께 정리한다.',
   '자립 준비는 지금 할 수 있는 과제부터 단계적으로 연습하게 한다.',
   '주거재활시설·직업재활시설 같은 지역 자원은 정신건강복지센터를 통해 안내받을 수 있다.']}
 ]);
 const byId=Object.fromEntries(TOPICS.map(t=>[t.id,t]));
 const HOST_RE=/(?:^|\.)(?:nice\.org\.uk|who\.int|samhsa\.gov|acf\.hhs\.gov|medlineplus\.gov|nihr\.ac\.uk|nih\.gov|mentalhealth\.go\.kr|ncmh\.go\.kr|mohw\.go\.kr|korea\.kr|kead\.or\.kr|khepi\.or\.kr)$/i;
 // sentences: [{i(상담일지 순번), s(문장)}] → 많이 나온 주제부터 최대 max개
 function detect(sentences,max=6){const out=[];
  for(const t of TOPICS){const hits=new Set();for(const x of sentences||[])if(t.re.test(String(x.s||'')))hits.add(x.i);if(hits.size)out.push({id:t.id,name:t.name,notes:[...hits].sort((a,b)=>a-b),count:hits.size})}
  return out.sort((a,b)=>b.count-a.count||TOPICS.findIndex(t=>t.id===a.id)-TOPICS.findIndex(t=>t.id===b.id)).slice(0,max)}
 function sourcesFor(ids){return [...new Set((ids||[]).flatMap(id=>byId[id]?.sources||[]))].filter(k=>SOURCES[k])}
 return{SOURCES,TOPICS,byId,HOST_RE,detect,sourcesFor};
});
