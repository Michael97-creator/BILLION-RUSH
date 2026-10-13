import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}}); const {data:{user}}=await auth.auth.getUser();if(!user)throw new Error('Unauthorized'); const {roomId}=await req.json();
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); const {data:room}=await db.from('multiplayer_rooms').select('*').eq('id',roomId).single(); if(!room||room.host_user_id!==user.id)throw new Error('Only the host can cancel this room'); if(!['waiting','ready'].includes(room.status))throw new Error('Room cannot be cancelled now');
 await db.from('multiplayer_rooms').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',roomId); return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}});
