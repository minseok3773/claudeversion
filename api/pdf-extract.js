'use strict';
// v3.21.58: 과거 재활문서 PDF에서 글자만 뽑는다(접속코드 인증 필요). PDF와 뽑은 글은 저장하거나 로그에 남기지 않고, 외부 AI에도 보내지 않는다.
// 이미지로만 된 스캔 PDF, 암호가 걸린 PDF, 글자 층이 없는 양식은 지원하지 않는다.
const {send,postSameOrigin,sessionValid,allowRequest,jsonBody}=require('./_shared.cjs');
const MAX_BYTES=2*1024*1024,MAX_TEXT=45000,MAX_PAGES=30;
module.exports=async function pdfExtract(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST 요청만 허용합니다.'},{Allow:'POST'});
 if(!postSameOrigin(req)||req.headers['x-requested-with']!=='rehab-app')return send(res,403,{error:'허용되지 않은 요청입니다.'});
 if(!sessionValid(req))return send(res,401,{error:'먼저 기관 접속 인증을 해 주세요.'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
 if(!allowRequest('pdf-extract',ip,12,60*1000))return send(res,429,{error:'PDF 읽기 요청이 많습니다. 잠시 뒤 다시 해 주세요.'},{'Retry-After':'60'});
 const encoded=jsonBody(req)?.pdf;
 if(typeof encoded!=='string'||encoded.length<100||encoded.length>Math.ceil(MAX_BYTES*4/3)+8||!/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded))
  return send(res,400,{error:'PDF 자료가 올바르지 않거나 2MB를 넘습니다.'});
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length>MAX_BYTES||bytes.length<100||bytes.subarray(0,5).toString('latin1')!=='%PDF-')
  return send(res,400,{error:'지원하지 않는 파일입니다. 글자가 들어 있는 2MB 이하 PDF를 써 주세요.'});
 try{
  // pdf-parse의 index.js는 배포 환경에서 시험용 파일을 읽으려다 멈출 수 있어 본체(lib)를 바로 불러온다.
  // 배포 묶음에 pdf.js 본체가 꼭 들어가도록 이름을 그대로 적어 불러온다(pdf-parse는 이 파일을 계산된 경로로 불러옴).
  require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
  // 글자만 뽑으므로 글꼴 처리에 쓰이는 코드 실행(eval) 기능은 끈다(악성 PDF 대비).
  if(globalThis.PDFJS)globalThis.PDFJS.isEvalSupported=false;
  const pdf=require('pdf-parse/lib/pdf-parse.js');
  let parsed;
  try{parsed=await pdf(bytes,{max:MAX_PAGES})}
  catch(first){if(!/bad XRef entry/i.test(String(first?.message||'')))throw first;parsed=await pdf(Buffer.from(bytes),{max:MAX_PAGES})}
  const raw=String(parsed?.text||'').replace(/\0/g,''),text=raw.slice(0,MAX_TEXT);
  if(!text.trim()||text.replace(/\s/g,'').length<35)return send(res,422,{error:'뽑을 수 있는 글자가 부족합니다. 이미지로 스캔한 PDF는 자동 입력이 되지 않습니다. 글자 인식(OCR)을 한 PDF를 쓰거나 직접 입력해 주세요.'});
  const pages=Number(parsed?.numpages)||1;
  return send(res,200,{text,pages,truncated:raw.length>MAX_TEXT||pages>MAX_PAGES,warnings:[]});
 }catch(err){
  if(/password|encrypt/i.test(String(err?.message||'')))return send(res,422,{error:'암호가 걸린 PDF는 읽을 수 없습니다. 암호를 푼 파일을 써 주세요.'});
  return send(res,422,{error:'PDF에서 글자를 뽑지 못했습니다. 글자를 선택할 수 있는 PDF인지 확인해 주세요.'});
 }
};
