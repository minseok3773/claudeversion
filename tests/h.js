// jsdom 시험 도구 — 가상 자료만 사용
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const KEY='sehuim_rehab_offline_v1';
function fakeResponse(data,status=200){const text=typeof data==='string'?data:JSON.stringify(data);return{ok:status>=200&&status<300,status,text:async()=>text,json:async()=>JSON.parse(text),headers:{get:()=>null}}}
function boot(dir,{stored,confirmFn,ai,storage,pdf,aiStatus,guidance,research}={}){
 let html=fs.readFileSync(path.join(dir,'index.html'),'utf8').replace('<script src="app.js" defer></script>','');
 const dom=new JSDOM(html,{url:'https://claude-rehab-plan.vercel.app/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;const logs=[];const prompts=[];const guidanceCalls=[];const researchCalls=[];
 w.alert=m=>logs.push(['alert',String(m)]);
 w.confirm=m=>{logs.push(['confirm',String(m)]);return confirmFn?confirmFn(String(m)):true};
 w.print=()=>logs.push(['print']);
 w.open=(...a)=>{logs.push(['open',...a]);return null};
 w.scrollTo=()=>{};
 if(w.HTMLDialogElement){w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false}}
 w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){logs.push(['download',this.download||''])};
 w.fetch=async(url,opts={})=>{const u=String(url);
  if(u.endsWith('/api/status'))return fakeResponse({configured:true,authenticated:true});
  if(u.endsWith('/api/auth'))return fakeResponse({ok:true});
  if(u.endsWith('/api/clinical-guidance')){const body=JSON.parse(opts.body||'{}');guidanceCalls.push(body);const r=typeof guidance==='function'?await guidance(body):{status:404,data:{error:'x'}};return fakeResponse(r.data,r.status||200)}
  if(u.endsWith('/api/research')){const body=JSON.parse(opts.body||'{}');researchCalls.push(body);const r=typeof research==='function'?await research(body):{status:404,data:{error:'not found'}};return fakeResponse(r.data,r.status||200)}
  if(u.endsWith('/api/pdf-extract')){const body=JSON.parse(opts.body||'{}');const r=pdf?await pdf(body):{status:404,data:{error:'no pdf'}};return fakeResponse(r.data,r.status||200)}
  if(u.endsWith('/api/generate')){const body=JSON.parse(opts.body||'{}');prompts.push(body);if(aiStatus){const st=aiStatus(body);if(st)return fakeResponse(st.data,st.status)}const out=ai?ai(body):{};return fakeResponse({text:typeof out==='string'?out:JSON.stringify(out),usage:{input:100,output:100,total:200},model:'gemini-3.1-flash-lite'})}
  return fakeResponse({error:'not found'},404)};
 const errors=[];w.addEventListener('error',e=>errors.push(String(e.message||e.error)));
 if(storage)for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
 if(stored)w.localStorage.setItem(KEY,JSON.stringify(stored));
 for(const f of ['hwp-paste.js','doctor-letter.js','pro-knowledge.js','document-check.js']){const hp=path.join(dir,f);if(fs.existsSync(hp))w.eval(fs.readFileSync(hp,'utf8'))}
 if(guidance!==undefined)w.__guidance=guidance;
 const src=fs.readFileSync(path.join(dir,'app.js'),'utf8')+'\n;window.__ev=(s)=>eval(s);';
 w.eval(src);
 const ev=s=>w.__ev(s);
 return {w,dom,logs,prompts,guidanceCalls,researchCalls,errors,ev,$:s=>w.document.querySelector(s),$$:s=>[...w.document.querySelectorAll(s)],
  click(sel){const el=typeof sel==='string'?w.document.querySelector(sel):sel;if(!el)throw Error('no element '+sel);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));return el},
  change(el,value){if(typeof el==='string')el=w.document.querySelector(el);if(!el)throw Error('no element');if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));return el},
  saved(){return JSON.parse(w.localStorage.getItem(KEY)||'null')},
  flush(){ev('flushPersist()')}};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0,passes=0;
function ok(cond,name,extra){if(cond){passes++;console.log('  ✓ '+name)}else{fails++;console.log('  ✗ '+name+(extra!==undefined?' — '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,600):''))}}
function done(){console.log(`\n결과: 통과 ${passes} / 실패 ${fails}`);process.exitCode=fails?1:0}
module.exports={boot,ok,done,sleep,KEY};
