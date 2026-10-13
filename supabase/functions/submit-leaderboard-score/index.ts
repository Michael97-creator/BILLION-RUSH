import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
const countries = new Set(['Nigeria','Ghana','Kenya','South Africa','Egypt','Ethiopia','United States','United Kingdom','India','Canada','Australia','Brazil','France','Germany','Japan','Pakistan','Other']);
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return json({ok:true}); if(req.method!=='POST')return json({error:'POST required'},405);
 const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if(!url||!key)return json({error:'Leaderboard backend is not configured.'},503);
 let body:any; try{body=await req.json()}catch{return json({error:'Invalid JSON.'},400)}
 const runId=String(body?.runId||''); const playerId=String(body?.playerId||''); const displayName=String(body?.displayName||'Player').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,24)||'Player'; const country=String(body?.country||'Other'); const prize=Number(body?.prize); const correct=Number(body?.questionsCorrect);
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(runId.length<8||runId.length>100||!uuid.test(playerId))return json({error:'Invalid run or player identifier.'},400);
 if(!Number.isSafeInteger(prize)||prize<0||prize>1000000000||!Number.isInteger(correct)||correct<0||correct>50)return json({error:'Invalid score values.'},400);
 if(!countries.has(country))return json({error:'Unsupported country.'},400);
 // Use server time for period assignment; never trust a client-provided timestamp.
 const completedAt=new Date().toISOString();
 const db=createClient(url,key); const {error}=await db.from('community_leaderboard_runs').upsert({run_id:runId,player_id:playerId,display_name:displayName,country,prize,questions_correct:correct,completed_at:completedAt},{onConflict:'run_id'});
 if(error)return json({error:'Could not save leaderboard score.'},500); return json({ok:true,runId,updated:true});
});
