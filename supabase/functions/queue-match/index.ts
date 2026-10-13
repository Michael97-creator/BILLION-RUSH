import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}}); const {data:{user}}=await auth.auth.getUser();if(!user)throw new Error('Unauthorized');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); await db.from('matchmaking_queue').upsert({user_id:user.id,status:'queued',queued_at:new Date().toISOString(),room_id:null});
 return new Response(JSON.stringify({status:'queued'}),{headers:{...cors,'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}});
