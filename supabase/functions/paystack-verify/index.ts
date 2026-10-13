import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
function inventoryShape(v:any){return {fifty:Number(v?.fifty||0),audience:Number(v?.audience||0),friend:Number(v?.friend||0),extraTime:Number(v?.extra_time??v?.extraTime??0),secondChance:Number(v?.second_chance??v?.secondChance??0)}}
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try {
    const body=await req.json(); const reference=String(body.reference||''); const playerId=String(body.playerId||'');
    if(!/^BR-[0-9a-f-]{36}$/i.test(reference)) return json({error:'Invalid payment reference.'},400);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playerId)) return json({error:'Invalid installation identifier.'},400);
    const secret=Deno.env.get('PAYSTACK_SECRET_KEY'); const url=Deno.env.get('SUPABASE_URL'); const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!secret||!url||!serviceKey) return json({error:'Payment verification is not configured yet.'},503);
    const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
    const {data:purchase,error:purchaseError}=await admin.from('billion_rush_store_purchases').select('*').eq('reference',reference).maybeSingle();
    if(purchaseError) throw purchaseError;
    if(!purchase||purchase.player_id!==playerId) return json({error:'This payment does not belong to this installation.'},403);
    if(purchase.status==='paid'){
      const {data:owned,error:ownedError}=await admin.from('billion_rush_store_players').select('*').eq('player_id',playerId).single();
      if(ownedError) throw ownedError;
      return json({verified:true,alreadyGranted:true,inventory:inventoryShape(owned)});
    }
    if(purchase.status!=='pending') return json({verified:false,final:true,error:'This payment was not completed. No items were added.'});
    const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});
    const verified=await response.json();
    if(!response.ok||verified.status!==true||!verified.data){return json({error:'Paystack could not verify this payment yet.'},502)}
    const tx=verified.data;
    const matches=tx.status==='success'&&String(tx.reference)===reference&&Number(tx.amount)===Number(purchase.amount_kobo)&&String(tx.currency)==='NGN';
    if(!matches){
      const finalFailure=tx.status==='failed'||tx.status==='abandoned'||Number(tx.amount)!==Number(purchase.amount_kobo)||String(tx.currency)!=='NGN'||String(tx.reference)!==reference;
      if(finalFailure) await admin.from('billion_rush_store_purchases').update({status:'failed',provider_payload:tx}).eq('reference',reference).eq('status','pending');
      return json({verified:false,final:finalFailure,error:finalFailure?'Payment failed or did not match the expected amount. No items were added.':'Payment is still processing. No items have been added yet.'});
    }
    const {data:completion,error:grantError}=await admin.rpc('br_complete_store_purchase',{p_reference:reference,p_provider_payload:tx});
    if(grantError) throw grantError;
    return json({verified:true,alreadyGranted:!completion?.granted,inventory:completion?.inventory||{}});
  } catch(error) {
    console.error('paystack-verify failed',error);
    return json({error:'Could not verify this payment. No new items were added.'},500);
  }
});
