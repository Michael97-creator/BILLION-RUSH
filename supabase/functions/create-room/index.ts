import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{if(req.method==='OPTIONS') return new Response('ok',{headers:cors}); try{
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data:{user}}=await auth.auth.getUser(); if(!user) throw new Error('Unauthorized');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:room,error}=await db.from('multiplayer_rooms').insert({room_code:(await db.rpc('generate_room_code')).data,room_type:'private',host_user_id:user.id}).select().single(); if(error) throw error;
 await db.from('multiplayer_room_members').insert({room_id:room.id,user_id:user.id,is_host:true,is_ready:false});
 return new Response(JSON.stringify({room}),{headers:{...cors,'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}});
