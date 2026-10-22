'use strict';
const {send,envStatus,sessionValid}=require('./_shared.cjs');
module.exports=async function(req,res){
 if(req.method!=='GET')return send(res,405,{error:'GET 요청만 허용합니다.'},{Allow:'GET'});
 const {configured}=envStatus();
 return send(res,200,{configured,authenticated:configured&&sessionValid(req)});
};
