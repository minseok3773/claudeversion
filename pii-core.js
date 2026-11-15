'use strict';
// v3.25.0 가명 처리 모음 — app.js(v3.24.1)의 가명 처리 부분(PII ~ piiLeftovers)을 그대로 옮겨 새 화면(일지 중심 작성)에서 함께 씀.
// 바꿀 때는 app.js와 이 파일을 같이 고칠 것. 이 파일만의 부분: 맨 아래 PiiCore(회원·공통 가릴 이름을 넣는 방법).
(function(){
const clean=s=>String(s??'').trim();
let __member=null,__global='';const member=()=>__member;const state={get piiGlobal(){return __global}};
const PII=[
 [/(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\s*[-_]?\s*[1-8](?:\d{6}|\*{6})(?!\d)/,'주민등록번호 형식'],
 [/(?<!\d)(?:\+?82[-.\s]?1[016-9]|01[016-9])[-.\s)]?\d{3,4}[-.\s_]?\d{4}(?!\d)/,'휴대전화 번호 형식'],
 [/(?<![\d-])(?:\(0(?:2|[3-6]\d)\)\s*|0(?:2|[3-6]\d)[-.\s)]|\+?82[-.\s]?(?:2|[3-6]\d)[-.\s])\d{3,4}[-.\s]\d{4}(?!\d)/,'일반전화 번호 형식'],
 [/(?<!\d)0(?:2|[3-6]\d)\d{7,8}(?!\d)/,'전화번호(구분 없음) 형식'],
 [/(?<![\d-])1[568]\d{2}-\d{4}(?![\d-])/,'대표전화 번호 형식'],
 [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,'이메일 주소'],
 [/[가-힣0-9]+(?:로|길)\s*\d+(?:-\d+)?(?:번길)?|\d+\s*동\s*\d+\s*호/,'주소 형식'],
 [/(?:계좌|통장|입금)[^\n]{0,8}?\d{2,6}-\d{2,6}-\d{2,8}|(?<![\d-])(?!01[016-9]-|0(?:2|[3-6]\d)-)\d{3,6}-\d{2,6}-\d{4,8}(?![\d-])/,'계좌번호 형식'],
 [/(?<!\d)\d{2}-\d{2}-\d{6}-\d{2}(?!\d)|여권\s*(?:번호)?\s*[A-Z]\d{8}/,'면허·여권 번호 형식']];
// 실명 휴리스틱(경고용): "김철수 회원", "홍길동님", "이영희씨"
const SURNAMES='김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경봉사부황보남궁제갈선우독고';
const NAME_RE=new RegExp(`(?:^|[^가-힣])([${SURNAMES}][가-힣]{1,2})(?:\\s?(?:회원|씨|님|어머니|아버지|보호자|선생님)(?:은|는|이|가|을|를|과|와|의|께서|에게)?(?![가-힣])|\\s?\\((?:남|여)\\s*[,)])`);
const piiNorm=t=>String(t||'').normalize('NFKC').replace(/[‐-―−－﹘﹣]/g,'-');
function piiText(text){const t=piiNorm(text);const out=[];for(const [re,name] of PII)if(re.test(t))out.push(name);return out}
const NAME_STOP=/^(?:이번|이전|이후|오늘|다른|모든|해당|동료|담당|신규|기존|전체|우리|주간|여성|남성|장기|정신|성인|노인|시설|방문|대상|같은|일반|본인|선배|후배|입소|퇴소|대표|차기|전임|후임|고령|외부|내부|지역|가족|부모|친구|여자|남자|저희|주변|소속|장애|재가|공동|공용|도움|함께|기타|다음|각각|모두|주로|반장|조장|회장|총무|간호|사회|직원|선생|강사|어머|아버|보호|이용|참여|정회|준회|유료|무료|명예|평회|일부|연장|최근)$/;
function nameHint(text){const re=new RegExp(NAME_RE.source,'g');for(const mt of piiNorm(text).matchAll(re))if(!NAME_STOP.test(mt[1])&&!NAME_STOP.test(mt[1].slice(0,2))&&!/(?:과|와|는|던|된|한|난|운|른|진다|있는|없는|같은|많은|적은)$/.test(mt[1]))return mt[1];return ''}
// v3.23.4: AI로 보내기 전(Gemini 전송·Claude 요청문 복사 모두) 개인정보를 가린다. 주민번호·연락처·이메일·주소·계좌·면허 번호는 [항목명]으로,
// (1577-0199 같은 기관 대표번호는 공개 정보라 그대로 둠) ‘김철수 회원’·‘이영희 어머니’처럼 이름+호칭은 가명A·가명B로 바꾼다(같은 이름은 늘 같은 가명). 회원 코드가 실명처럼 보이면 그 이름도 가명으로 바꾼다.
const NOT_ROAD=/(?:으로|대로|스스로|따로|새로|홀로|서로|절로|별로|날로|주로|산책로|등산로|경로|진로|통로|선로|활로|퇴로|미로|피로|과로|항로|수로|회로|산책길|출근길|퇴근길|등굣길|하굣길|귀갓길|오솔길|둘레길|골목길|지름길|올레길|밤길|눈길|빗길)$/;
const PII_MASK=[[PII[0][0],'[주민번호]'],[PII[1][0],'[연락처]'],[PII[2][0],'[연락처]'],[PII[3][0],'[연락처]'],[PII[5][0],'[이메일]'],
 [/([가-힣0-9]{2,}(?:로|길))\s*\d{1,4}(?:-\d{1,4})?(?:번길)?(?=[\s,.)에의은는이가]|$)|\d+\s*동\s*\d+\s*호/,(all,road,off,src)=>{
  // v3.23.9: ‘앞으로 2, 3회’·‘산책로 1.’처럼 주소가 아닌 말을 [주소]로 가리지 않는다.
  if(road&&(NOT_ROAD.test(road)||/^\s*,\s*\d/.test(String(src).slice(off+all.length))))return all;return '[주소]'}],[PII[7][0],'[계좌번호]'],[PII[8][0],'[번호]']].map(([re,to])=>[new RegExp(re.source,'g'),to]);
// AI 답에 들어온 가명(가명A 등)은 원래 이름으로 되돌린다(이 브라우저 안에서만 알고 있는 짝).
function unmaskPII(text){const t=String(text??'');if(!piiNameMap.size||!/(?:가명|기관)[A-Z]/.test(t))return t;const back=new Map([...piiNameMap].map(([k,v])=>[v,k]));return t.replace(/(?:가명|기관)[A-Z]\d*/g,w=>back.get(w)??w)}
const piiNameMap=new Map();
function piiPseudo(name,kind='가명'){if(!piiNameMap.has(name)){const i=[...piiNameMap.values()].filter(v=>v.startsWith(kind)).length;piiNameMap.set(name,kind+String.fromCharCode(65+i%26)+(i>=26?String(Math.floor(i/26)):''))}return piiNameMap.get(name)}
// 요청문의 안내 문장(예: ‘방법을 회원과’, ‘현재 회원’)을 이름으로 잘못 보지 않도록, 흔한 성 20개로 시작하는 세 글자 이름만 가명으로 바꾼다.
const PII_SURNAME20='김이박최정강조윤장임한오서신권황안송류전홍';
const okName=n=>n.length===3&&PII_SURNAME20.includes(n[0])&&!NAME_STOP.test(n)&&!NAME_STOP.test(n.slice(0,2))&&!/(?:을|를|의|에|과|와|도|로|던|된|한|난|운|른|진|할|될|인|던|며|고|서|면|게|께|해|함|임|됨|음)$/.test(n);
// v3.24.0: 가릴 이름을 넓힘. ① 담당자가 적은 ‘가릴 이름’(회원별·공통)은 조사가 붙어도 늘 가명으로 ② 모든 성(두 글자 성 포함)+이름+호칭
// ③ 가족·의료진을 부르는 말 뒤의 이름(‘아버지 김영호와’, ‘어머니(박순자)께서’) ④ 이름(성별·나이)(‘김민지(32세)’) ⑤ 은행·계좌 뒤 번호.
const PII_SURNAME2='남궁|황보|제갈|선우|독고|사공|서문|동방';
const PII_JOSA='께서|에게|한테|이가|이는|이랑|아|야|와|과|가|이|은|는|을|를|의|도|님|씨|만|랑|하고|에서|로|으로';
const PII_SURNAME1=[...new Set(SURNAMES.replace(/남궁|황보|제갈|선우|독고/g,''))].join('');
const PII_REL='(?:어머니|어머님|아버지|아버님|엄마|아빠|모친|부친|보호자|친모|친부|계모|계부|양모|양부|할머니|할아버지|외할머니|외할아버지|형|누나|오빠|언니|남동생|여동생|동생|형제|자매|아들|딸|배우자|남편|아내|부인|이모|고모|삼촌|외삼촌|숙모|조카|사촌|친구|애인|여자친구|남자친구|주치의|담당의|담당\s*의사|교수|원장|간호사|사회복지사|복지사|팀장|과장|센터장|선생님|선생|담임|후견인)';
const PII_GIVEN_END=/(?:을|를|의|에|과|와|도|로|던|된|한|난|른|할|될|며|고|면|게|께|해|함|임|됨|음|히|는|가)$/;
const PII_NAME_ANY=`(?:${PII_SURNAME2})[가-힣]{1,2}|[${PII_SURNAME1}][가-힣]{2}`;
const PII_AFTER='(?=\\s*\\)|[\\s,.·)(]|$|(?:께서|에게|한테|와|과|가|이|은|는|을|를|의|도|님|씨|만)(?![가-힣]))';
const PII_HONOR='(?:\\s?(?:회원|씨|님|어머니|아버지|보호자|선생님|교수|원장|간호사|군|양)(?:은|는|이|가|을|를|과|와|의|께서|에게|도)?(?![가-힣]))';
const PII_NAME_RES=[
 new RegExp(`(^|[^가-힣])(${PII_NAME_ANY})(?=${PII_HONOR})`,'g'),
 new RegExp(`(${PII_REL}\\s*[:：]?\\s*\\(?\\s*)(${PII_NAME_ANY})${PII_AFTER}`,'g'),
 new RegExp(`(^|[^가-힣])(${PII_NAME_ANY})(?=\\s*[(,/]\\s*(?:남|여|\\d{1,3}\\s*세|만\\s*\\d{1,3}))`,'g'),
 // v3.24.1: ‘성명: 김철수’, ‘모 김영희와’, ‘부: 김영호’, ‘회원(김철수, 남’
 new RegExp(`((?:^|[^가-힣])(?:성명|이름|회원명|보호자명|대상자명|본인|모|부|母|父)\\s*[:：(]\\s*)(${PII_NAME_ANY})${PII_AFTER}`,'g'),
 new RegExp(`((?:^|[^가-힣])(?:모|부|母|父)\\s+)(${PII_NAME_ANY})(?=\\s*[(,)]|$|(?:께서|에게|한테|와|과|가|씨|님)(?![가-힣]))`,'g')];
// v3.24.1: 성과 이름 사이에 칸을 둔 경우(‘김 철수 회원’, ‘어머니 김 영희 씨’) — 회원·씨·님 같은 뚜렷한 호칭 앞에서만
const PII_SPACED_RE=new RegExp(`(^|[^가-힣])([${PII_SURNAME20}])\\s([가-힣]{2})(?=\\s?(?:회원|씨|님)(?:은|는|이|가|을|를|과|와|의|께서|에게|도)?(?![가-힣]))`,'g');
const PII_SPACED_STOP=/^(?:선생|사장|대리|과장|부장|차장|팀장|실장|원장|기사|여사|박사|교수|주임|반장|친구|사람|편성|정회|준회|신규|기존|모든|여러|다른|같은|어떤|해당|담당|우리)$/;
// v3.24.1: 지번 주소(‘강남구 역삼동 123-45’)와 생년월일
const PII_JIBUN=/((?:[가-힣]{1,10}(?:시|군|구)\s+)(?!(?:[가-힣]*(?:활동|운동|행동|이동|자동|노동|감동|충동|변동|연동|출동|작동|가동|소동|발동|진동|난동|공동|협동|아동))(?:\s|\d))[가-힣]{1,10}(?:동|리|읍|면|가))\s*\d{1,5}(?:-\d{1,5})?(?:\s*번지)?(?!\s*(?:회|번|명|개|시간|분|일|주|달|차|층|세|%|원))/g;
const PII_BIRTH=/(?:생년월일|생일|출생일?)\s*[:：]?\s*\d{2,4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}\s*일?|\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일\s*생(?![가-힣])/g;
const PII_BANK=/((?:은행|뱅크|농협|수협|신협|우체국|새마을금고|카카오뱅크|토스뱅크|계좌|통장|입금|송금)(?:\s*번호)?\s*[:：]?\s*)\d[\d\s-]{6,24}\d/g;
const okName2=n=>!(/[은이]$/.test(n)&&!PII_SURNAME20.includes(n[0]))&&!NAME_STOP.test(n)&&!NAME_STOP.test(n.slice(0,2))&&!PII_GIVEN_END.test(n)&&!/^(?:이번|이후|이전|이상|이하|정도|정말|조금|주로|주변|전체|전혀|한번|오늘|어제|내일|모두|다시|계속|기본|지원|지난|지금|시간|사실|성과|안내|안정|기분|정신|진료|진단|신체|연락|방문|우선|최근|최소|최대|강당|여러|전화|문자|하루|동안|식사|임시|임의|장기|단기|공부|노력|변화|유지|조절|조용|조금|장소|송년|소감|소식|표정|표현|방법|방안|방에|현재|현상|상담|상황|상태|선택|설명|교육|유튜|용돈|인사|인지|인정|인터|오후|오전|주말|주간|주의|주치|간단|간호|권유|권장|고민|고려|공기|공원)/.test(n);
function piiCustomNames(label=''){const list=[];let m=null;try{m=member()}catch{}
 const add=(src,kind)=>{for(const x of String(src||'').split(/[,，、;\n]+/)){const v=clean(x);if(v.length>=2&&v.length<=40)list.push({name:v,kind})}};
 add(m?.piiNames,'가명');add(state?.piiGlobal,'기관');
 const lb=clean(label);if(/^[가-힣]{2,4}$/.test(lb)&&!/\d|○|O|0/.test(lb))list.push({name:lb,kind:'가명'});
 const seen=new Set();return list.filter(x=>!seen.has(x.name)&&seen.add(x.name)).sort((a,b)=>b.name.length-a.name.length)}
function maskPII(text,label=''){let t=String(text??'');if(!t)return t;
 // 담당자가 적은 이름을 먼저 가린다(긴 이름부터, 조사가 붙어도 같은 가명).
 // v3.24.1: 두 글자 이하로 적은 이름(‘철수’)은 다른 낱말 속(‘철수세미’)을 가리지 않도록 낱말 경계에서만 바꾼다.
 for(const {name,kind} of piiCustomNames(label))if(t.includes(name)){if(name.length>=3)t=t.split(name).join(piiPseudo(name,kind));else{const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');t=t.replace(new RegExp(`(?<![가-힣])${esc}(?=$|[^가-힣]|(?:${PII_JOSA})(?![가-힣]))`,'g'),()=>piiPseudo(name,kind))}}
 for(const [re,to] of PII_MASK)t=t.replace(re,to);
 t=t.replace(PII_BANK,(all,head)=>head+'[계좌번호]').replace(PII_JIBUN,(all,head)=>head+' [번지]').replace(PII_BIRTH,'[생년월일]');
 t=t.replace(PII_SPACED_RE,(all,pre,a,b)=>okName2(a+b)&&!PII_SPACED_STOP.test(b)?pre+piiPseudo(a+b):all);
 for(const re of PII_NAME_RES)t=t.replace(re,(all,pre,name)=>okName2(name)?pre+piiPseudo(name):all);
 return t}
// v3.24.0: 가린 뒤에도 남은 ‘이름처럼 보이는 말’(흔한 성+두 글자+조사, 호칭 없이)을 찾아 보내기 전에 보여 준다.
const PII_LEFT_RE=new RegExp(`(?:^|[^가-힣])([${PII_SURNAME20}][가-힣]{2})(?=(?:가|는|이가|이는|씨|님|에게|한테|께서|와|과|랑|하고)(?![가-힣]))`,'g');
function piiLeftovers(text){const out=new Map();for(const mt of String(text||'').matchAll(PII_LEFT_RE)){const n=mt[1];if(!okName2(n)||/가명/.test(n))continue;out.set(n,(out.get(n)||0)+1)}return [...out.keys()].slice(0,15)}
window.PiiCore={setContext(m,g){__member=m||null;__global=String(g||'')},reset(){piiNameMap.clear()},mask:maskPII,unmask:unmaskPII,leftovers:piiLeftovers,map:()=>new Map(piiNameMap)};
})();
