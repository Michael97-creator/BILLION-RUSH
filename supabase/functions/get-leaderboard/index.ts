import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method!=='GET') return json({error:'GET required'},405);
 const auth=req.headers.get('Authorization'); if(!auth)return json({error:'Unauthorized'},401);
 const uc=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await uc.auth.getUser(); if(!user)return json({error:'Unauthorized'},401);
 const url=new URL(req.url); const period=url.searchParams.get('period')||'daily'; const key=url.searchParams.get('key');
 const p=periods(new Date()); const periodKey=key || (period==='daily'?p.day:period==='weekly'?p.week:period==='monthly'?p.month:'all');
 const {data,error}=await supabase.from('public_leaderboard').select('player_id,display_name,score,questions_survived,completed_at').eq('period_type',period).eq('period_key',periodKey).order('score',{ascending:false}).order('questions_survived',{ascending:false}).order('completed_at',{ascending:true}).limit(100);
 if(error)return json({error:error.message},500);
 return json({period,periodKey,entries:(data||[]).map((x,i)=>({...x,rank:i+1}))});
});
function periods(date:Date){const d=new Date(date), day=d.getUTCDay(), off=(day+6)%7,m=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-off));return {day:d.toISOString().slice(0,10),week:m.toISOString().slice(0,10),month:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`,all:'all'};}
