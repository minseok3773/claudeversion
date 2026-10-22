'use strict';
const {send,envStatus,timingEqual,postSameOrigin,jsonBody,sessionCookie}=require('./_shared.cjs');
const {allowRequest,isLimited}=require('./_shared.cjs'); // 서버리스 인스턴스 내 제한. 운영용 WAF는 별도 구성 필요.
module.exports=async function(req,res){
 if(req.method!=='POST')return send(res,405,{error:'POST 요청만 허용합니다.'},{Allow:'POST'});
 if(!postSameOrigin(req)||req.headers['x-requested-with']!=='rehab-app')return send(res,403,{error:'허용되지 않은 요청입니다.'});
 if(!envStatus().configured)return send(res,503,{error:'기관 관리자 설정이 완료되지 않았습니다.'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];

 // 잠금 중에는 올바른 코드도 받지 않는다(추측 공격 차단).
 if(isLimited('auth-failed',ip,12))return send(res,429,{error:'접속 시도 횟수가 많습니다. 10분 뒤 다시 시도하세요.'});
 const b=jsonBody(req),code=typeof b?.code==='string'?b.code:'';
 if(code.length>256||!timingEqual(code,process.env.APP_ACCESS_CODE)){if(!allowRequest('auth-failed',ip,12,10*60*1000))return send(res,429,{error:'접속 시도 횟수가 많습니다. 잠시 뒤 다시 시도하세요.'});return send(res,401,{error:'기관 접속 코드를 확인하세요.'})}
 return send(res,200,{ok:true},{'Set-Cookie':sessionCookie(req)});
};
