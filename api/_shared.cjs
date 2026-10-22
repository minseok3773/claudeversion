'use strict';
const crypto = require('node:crypto');
const COOKIE_NAME = 'rehab_staff_session';
const SESSION_SECONDS = 8 * 60 * 60;
function send(res, status, data, extra={}) {
  res.statusCode=status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control','no-store, private, max-age=0');
  res.setHeader('x-content-type-options','nosniff');
  for(const [k,v] of Object.entries(extra))res.setHeader(k,v);
  res.end(JSON.stringify(data));
}
function envStatus() {
  return { configured: Boolean(
    (process.env.GEMINI_API_KEY||'').trim().length>=20 &&
    !(process.env.GEMINI_API_KEY||'').includes('여기에') &&
    (process.env.APP_ACCESS_CODE||'').length>=12 &&
    (process.env.APP_SESSION_SECRET||'').length>=32
  )};
}
function timingEqual(a,b) {
  const x=Buffer.from(String(a)),y=Buffer.from(String(b));
  return x.length===y.length && crypto.timingSafeEqual(x,y);
}
function postSameOrigin(req){
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().toLowerCase();
  const origin=req.headers.origin;
  const secSite=req.headers['sec-fetch-site'];
  if(secSite && !['same-origin','none'].includes(secSite))return false;
  if(!origin || !host)return false;
  try{return new URL(origin).host.toLowerCase()===host;}catch{return false}
}
function jsonBody(req){return req.body && typeof req.body==='object' && !Array.isArray(req.body)?req.body:null}
function isSecure(req){return req.socket?.encrypted===true || String(req.headers['x-forwarded-proto']||'').split(',')[0]==='https'}
function makeSession(){
  const exp=String(Math.floor(Date.now()/1000)+SESSION_SECONDS);
  const nonce=crypto.randomBytes(16).toString('base64url');
  const sig=crypto.createHmac('sha256',process.env.APP_SESSION_SECRET).update('rehab-v2.'+exp+'.'+nonce).digest('base64url');
  return 'v2.'+exp+'.'+nonce+'.'+sig;
}
function sessionValid(req){
  if(!envStatus().configured)return false;
  const raw=(String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+'='))||'').slice(COOKIE_NAME.length+1);
  const m=/^v2\.(\d{10})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(raw);
  if(!m)return false;
  const exp=Number(m[1]);if(exp<=Date.now()/1000 || exp>Date.now()/1000+SESSION_SECONDS+60)return false;
  const sig=crypto.createHmac('sha256',process.env.APP_SESSION_SECRET).update('rehab-v2.'+m[1]+'.'+m[2]).digest('base64url');
  return timingEqual(sig,m[3]);
}
function sessionCookie(req){return `${COOKIE_NAME}=${makeSession()}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}`+(isSecure(req)?'; Secure':'')}
// Best-effort instance-local request throttle; not a distributed/WAF rate limiter.
const limiter=new Map();
function allowRequest(bucket,identifier,max,windowMs){
 const now=Date.now();if(limiter.size>1200){for(const [k,v] of limiter){if(now>=v.until)limiter.delete(k)}if(limiter.size>1200)limiter.clear()}
 const key=bucket+':'+identifier;let info=limiter.get(key);
 if(!info||now>=info.until)info={until:now+windowMs,count:0};
 info.count++;limiter.set(key,info);return info.count<=max;
}
// 이미 제한에 걸린 상태인지 확인만 한다(횟수는 늘리지 않음).
function isLimited(bucket,identifier,max){const v=limiter.get(bucket+':'+identifier);return !!v&&Date.now()<v.until&&v.count>=max}
module.exports={send,envStatus,timingEqual,postSameOrigin,jsonBody,sessionValid,sessionCookie,allowRequest,isLimited};
