// /api/pdf-extract 서버 함수를 실제 pdf-parse로 시험(가상 PDF)
const fs=require('fs');const path=require('path');
process.env.APP_ACCESS_CODE='x'.repeat(12);process.env.APP_SESSION_SECRET='s'.repeat(40);process.env.GEMINI_API_KEY='k'.repeat(30);
const shared=require(require('path').resolve(__dirname,'../api/_shared.cjs'));
const handler=require(require('path').resolve(__dirname,'../api/pdf-extract.js'));
function call(body,{cookie=true,method='POST',xrw='rehab-app'}={}){return new Promise(resolve=>{
 const headers={host:'claude-rehab-plan.vercel.app',origin:'https://claude-rehab-plan.vercel.app','x-requested-with':xrw,'x-forwarded-proto':'https','content-type':'application/json'};
 if(cookie)headers.cookie=shared.sessionCookie({headers:{},socket:{}}).split(';')[0];
 const req={method,headers,body,socket:{remoteAddress:'1.2.3.'+Math.floor(Math.random()*200)}};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},getHeader(k){return this.headers[k.toLowerCase()]},end(t){resolve({status:this.statusCode,body:JSON.parse(t||'{}')})},status(c){this.statusCode=c;return this},send(t){this.end(typeof t==='string'?t:JSON.stringify(t))},json(o){this.end(JSON.stringify(o))}};
 handler(req,res)})}
module.exports={call};
if(require.main===module)(async()=>{
 console.log(Object.keys(shared));
 for(const f of ['label-plan.pdf','app-plan.pdf']){const b64=fs.readFileSync(path.join(__dirname,'pdfs',f)).toString('base64');
  const r=await call({pdf:b64});console.log('=====',f,r.status,r.body.pages,r.body.truncated,r.body.error||'');console.log(String(r.body.text||'').slice(0,1500))}
})();
