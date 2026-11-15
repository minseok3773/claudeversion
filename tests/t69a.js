// v3.21.69 — 화면 디자인(맑은 블루·짙은 남색 바탕): 화면에만 적용, 메뉴 묶음, 글꼴 파일 (가상 자료만 사용)
const {boot,ok,done}=require('./h.js');const {stored57}=require('./fix57.js');
const fs=require('fs'),path=require('path');
const DIR=process.argv[2]||path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(DIR,f),'utf8');
const VER=JSON.parse(read('package.json')).version;
(()=>{
 console.log('[1] 디자인 파일 연결과 페이지 보안 설정');
 {const html=read('index.html');
  const style=html.indexOf('</style>'),font=html.indexOf('<link rel="stylesheet" href="fonts/pretendard/pretendardvariable-dynamic-subset.css">'),theme=html.indexOf(`<link rel="stylesheet" href="theme.css?v=${VER}">`);
  ok(style>0&&font>style&&theme>font,'글꼴·디자인 파일을 기본 스타일 다음에 연결(디자인이 앞의 모양을 덮음)',[style,font,theme]);
  const csp=(html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)||[])[1]||'';
  ok(/style-src 'self' 'unsafe-inline'/.test(csp)&&/font-src 'self'/.test(csp)&&/script-src 'self'/.test(csp)&&!/https?:/.test(csp),'같은 사이트의 파일만 허용(외부 주소 없음)',csp);
  const v=JSON.parse(read('vercel.json'));const all=v.headers.find(h=>h.source==='/(.*)').headers.find(h=>h.key==='Content-Security-Policy').value;
  ok(/style-src 'self'/.test(all)&&/font-src 'self'/.test(all),'서버 보안 설정도 같은 사이트 글꼴·스타일 허용',all);
  const f=v.headers.find(h=>h.source==='/fonts/(.*)');ok(f&&/max-age=31536000, immutable/.test(f.headers[0].value),'글꼴 파일은 오래 저장(한 번 받으면 다시 받지 않음)');
 }
 console.log('[2] 인쇄되는 문서에는 적용하지 않음');
 {const css=read('theme.css').replace(/\/\*[\s\S]*?\*\//g,'');const top=[];let depth=0,start=0;
  for(let i=0;i<css.length;i++){if(css[i]==='{'){if(depth===0)top.push(css.slice(start,i).trim());depth++}else if(css[i]==='}'){depth--;if(depth===0)start=i+1}}
  ok(depth===0,'괄호 짝이 맞음');ok(JSON.stringify(top)===JSON.stringify([':root','@media screen']),'색 토큰(:root)과 화면 전용(@media screen) 규칙만 있음',top);
  ok(!/@media\s+print/.test(css),'인쇄용 규칙은 건드리지 않음');
  ok(/\.paper,\.paper textarea,\.paper input,\.paper select,\.doctor-paper/.test(css)&&/"Malgun Gothic","Apple SD Gothic Neo",sans-serif\}/.test(css),'화면에서도 문서 서식 안의 글꼴은 그대로');
 }
 console.log('[3] 글꼴 파일(Pretendard, OFL)');
 {const fcss=read('fonts/pretendard/pretendardvariable-dynamic-subset.css');const urls=[...fcss.matchAll(/url\(\.\/(woff2-dynamic-subset\/[^)]+\.woff2)\)/g)].map(m=>m[1]);
  ok(urls.length>=90&&urls.every(u=>fs.existsSync(path.join(DIR,'fonts/pretendard',u))),'글꼴 조각 파일이 모두 있음',urls.length);
  ok(!/https?:\/\//.test(fcss.replace(/\/\*[\s\S]*?\*\//g,'')),'외부 주소에서 글꼴을 받지 않음');
  ok(/SIL Open Font License/i.test(read('fonts/pretendard/LICENSE.txt')),'글꼴 사용 허가서(OFL) 함께 둠');
 }
 console.log('[4] 화면: 머리글·위쪽 조작 줄·메뉴 묶음');
 {const t=boot(DIR,{stored:stored57()});
  ok(t.$('.hero .brand-mark')&&/재활계획서 & 재활평가서/.test(t.$('.hero h1').textContent)&&/새희망둥지/.test(t.$('.hero .brand-sub').textContent),'머리글에 기관 이름과 표시');
  ok(t.$('#appVersion').textContent==='v'+VER&&!t.$('#appVersion').getAttribute('style'),'버전 표시(글자 색은 디자인 파일에서)');
  const who=t.$('.tb-who'),save=t.$('.tb-save');
  ok(who&&['#writerPicker','#memberPicker','[data-act="writer-add"]','[data-act="writer-rename"]','[data-act="add-member"]','[data-act="delete-member"]'].every(s=>who.querySelector(s)),'작성자·회원 조작을 한 묶음으로');
  ok(save&&['#savePill','#autosave','#undoImport','[data-act="export"]','[data-act="export-enc"]','[data-act="import"]'].every(s=>save.querySelector(s)),'저장·백업 조작을 한 묶음으로');
  const groups=t.$$('#nav .nav-group').map(g=>[g.querySelector('.nav-group-label').textContent,[...g.querySelectorAll('button')].map(b=>b.dataset.view)]);
  ok(JSON.stringify(groups)===JSON.stringify([['기록',['notes']],['작성',['ai','plan','evaluation','doctor']],['자료·학습',['legacy','analysis','learning','references']],['관리',['backup']]]),'메뉴 묶음: 기록 / 작성 / 자료·학습 / 관리',groups);
  for(const v of ['notes','ai','plan','evaluation','doctor','legacy','analysis','learning','references','backup']){t.click(`#nav [data-view="${v}"]`);
   const a=t.$('#nav button.active');ok(a&&a.dataset.view===v&&a.getAttribute('aria-current')==='page'&&t.$$('#nav [aria-current]').length===1&&!/화면 표시 중 오류/.test(t.$('#content').textContent),v+' 화면으로 이동')}
  ok(!t.errors.length,'오류 없음',t.errors);
 }
 done();
})();
