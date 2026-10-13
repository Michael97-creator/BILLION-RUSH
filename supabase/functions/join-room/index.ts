import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}}); const {data:{user}}=await auth.auth.getUser(); if(!user)throw new Error('Unauthorized');
 const {roomCode}=await req.json(); if(!/^[A-Z0-9]{6}$/.test(String(roomCode||'').toUpperCase()))throw new Error('Invalid room code');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); const {data:room}=await db.from('multiplayer_rooms').select('*').eq('room_code',String(roomCode).toUpperCase()).single(); if(!room)throw new Error('Room not found');
 if(room.expires_at<new Date().toISOString()||room.status!=='waiting')throw new Error('Room is no longer joinable');
 const {count}=await db.from('multiplayer_room_members').select('*',{count:'exact',head:true}).eq('room_id',room.id).is('left_at',null); if((count??0)>=2)throw new Error('Room is full');
 const {error}=await db.from('multiplayer_room_members').upsert({room_id:room.id,user_id:user.id,is_host:false,is_ready:false}); if(error)throw error;
 return new Response(JSON.stringify({room}),{headers:{...cors,'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}});
