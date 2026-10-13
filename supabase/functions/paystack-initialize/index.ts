import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const PRODUCTS: Record<string,{amount:number;label:string}> = {
  fifty_single:{amount:200,label:'50/50 — 1 use'}, fifty_triple:{amount:500,label:'50/50 — 3 uses'},
  audience_single:{amount:200,label:'AI Poll Audience — 1 use'}, audience_triple:{amount:500,label:'AI Poll Audience — 3 uses'},
  friend_single:{amount:200,label:'Call-a-Friend — 1 use'}, friend_triple:{amount:500,label:'Call-a-Friend — 3 uses'},
  extra_time_single:{amount:200,label:'Extra Time — 1 use'}, extra_time_five:{amount:800,label:'Extra Time — 5 uses'},
  second_chance_single:{amount:300,label:'Second Chance — 1 use'}, second_chance_two:{amount:500,label:'Second Chance — 2 uses'},
  complete_bundle:{amount:2000,label:'Complete Lifeline Bundle'}
};
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try {
    const body=await req.json();
    const productId=String(body.productId||'');
    const email=String(body.email||'').trim().toLowerCase();
    const playerId=String(body.playerId||'');
    const product=PRODUCTS[productId];
    if(!product) return json({error:'Unknown store item.'},400);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playerId)) return json({error:'Invalid installation identifier.'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Enter a valid email address for the payment receipt.'},400);
    const secret=Deno.env.get('PAYSTACK_SECRET_KEY');
    const supabaseUrl=Deno.env.get('SUPABASE_URL');
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const publicUrl=(Deno.env.get('BR_PUBLIC_APP_URL')||'').trim().replace(/\/$/,'');
    if(!secret||!supabaseUrl||!serviceKey||!publicUrl) return json({error:'Secure checkout is not configured yet.'},503);
    const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
    const {error:playerError}=await admin.from('billion_rush_store_players').upsert({player_id:playerId},{onConflict:'player_id',ignoreDuplicates:true});
    if(playerError) throw playerError;
    const reference=`BR-${crypto.randomUUID()}`;
    const {error:insertError}=await admin.from('billion_rush_store_purchases').insert({reference,player_id:playerId,product_id:productId,amount_kobo:product.amount*100,currency:'NGN',status:'pending'});
    if(insertError) throw insertError;
    const callbackUrl=`${publicUrl}/purchase-return.html?playerId=${encodeURIComponent(playerId)}`;
    const response=await fetch('https://api.paystack.co/transaction/initialize',{
      method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
      body:JSON.stringify({email,amount:product.amount*100,currency:'NGN',reference,callback_url:callbackUrl,metadata:{player_id:playerId,product_id:productId,product_name:product.label}})
    });
    const result=await response.json();
    if(!response.ok||result.status!==true||!result.data?.authorization_url){
      await admin.from('billion_rush_store_purchases').update({status:'failed',provider_payload:result}).eq('reference',reference).eq('status','pending');
      return json({error:'Paystack could not start checkout. No items were added.'},502);
    }
    return json({reference,authorizationUrl:result.data.authorization_url,amountNaira:product.amount,currency:'NGN'});
  } catch(error) {
    console.error('paystack-initialize failed',error);
    return json({error:'Could not start checkout. No items were added.'},500);
  }
});
