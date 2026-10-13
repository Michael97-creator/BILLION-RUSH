import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const ITEMS=new Set(['fifty','audience','friend','extraTime','secondChance']);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const {playerId,item}=await req.json();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(playerId||''))||!ITEMS.has(String(item)))return json({error:'Invalid inventory request.'},400);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'Store inventory is not configured.'},503);
  const admin=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await admin.rpc('br_consume_store_item',{p_player_id:playerId,p_item:item});if(error)throw error;
  if(!data?.consumed)return json({error:'No purchased uses remain for this item.'},409);
  return json({consumed:true,inventory:data.inventory});
 }catch(error){console.error('consume-store-item failed',error);return json({error:'Could not confirm inventory use.'},500)}
});
