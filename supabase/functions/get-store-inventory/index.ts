import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const {playerId}=await req.json();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(playerId||'')))return json({error:'Invalid installation identifier.'},400);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return json({error:'Store inventory is not configured.'},503);
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {error:insertError}=await admin.from('billion_rush_store_players').upsert({player_id:playerId},{onConflict:'player_id',ignoreDuplicates:true}); if(insertError)throw insertError;
  const {data,error}=await admin.from('billion_rush_store_players').select('fifty,audience,friend,extra_time,second_chance').eq('player_id',playerId).single();if(error)throw error;
  return json({inventory:{fifty:data.fifty,audience:data.audience,friend:data.friend,extraTime:data.extra_time,secondChance:data.second_chance}});
 }catch(error){console.error('get-store-inventory failed',error);return json({error:'Could not load purchased inventory.'},500)}
});
