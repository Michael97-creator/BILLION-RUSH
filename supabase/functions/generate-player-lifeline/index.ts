import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gemini, parseJson } from "../_shared.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const hash=async(value:string)=>{const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")};
const letters=["A","B","C","D"];
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"POST only"},405);
  try{
    const body=await req.json().catch(()=>({}));
    const deviceId=String(body.deviceId||"").slice(0,160);
    const type=String(body.type||"");
    const country=String(body.country||"Other").slice(0,60);
    const question=String(body.question||"").slice(0,500);
    const options=Array.isArray(body.options)?body.options.slice(0,4).map((x:any)=>String(x).slice(0,180)):[];
    const rawCharacter=body.character&&typeof body.character==="object"?body.character:{};
    const character={name:String(rawCharacter.name||"Friend").slice(0,40),style:String(rawCharacter.style||"thoughtful").slice(0,100),strength:String(rawCharacter.strength||"mixed knowledge").slice(0,100),voice:String(rawCharacter.voice||"That is my best guess").slice(0,120),bias:Array.isArray(rawCharacter.bias)?rawCharacter.bias.slice(0,8).map((x:any)=>String(x).slice(0,40)):[]};
    if(deviceId.length<12||!['audience','friend'].includes(type)||question.length<8||options.length!==4)return json({error:"Invalid lifeline request"},400);
    const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:allowed,error:quotaError}=await service.rpc("consume_player_lifeline_quota",{p_device_hash:await hash(deviceId),p_daily_limit:60});
    if(quotaError)throw quotaError;
    if(!allowed)return json({error:"AI lifeline limit reached for this device today."},429);
    const prompt=type==='audience'
      ? `Simulate an imperfect 100-person trivia audience for a player in ${country}. Vote percentages for A, B, C, D must be plausible and total exactly 100. The crowd can be wrong; do not make the correct answer always receive the highest vote. Return JSON only: {"A":number,"B":number,"C":number,"D":number}. Question: ${question}\nA: ${options[0]}\nB: ${options[1]}\nC: ${options[2]}\nD: ${options[3]}`
      : `You are ${character.name}, an imperfect simulated quiz friend. Personality: ${character.style}. Knowledge strength: ${character.strength}. Category interests: ${character.bias.join(", ")||"no special area"}. Speak in this style: ${character.voice}. Give a short plausible guess and one-sentence reason. Your guess may be wrong; do not act like an answer key or always be confident. Return JSON only: {"suggestion":"A|B|C|D","confidence":number,"reason":"one short sentence"}. Question: ${question}\nA: ${options[0]}\nB: ${options[1]}\nC: ${options[2]}\nD: ${options[3]}`;
    const parsed:any=parseJson(await gemini(prompt,{json:true,temperature:0.95}));
    if(type==='audience'){
      let vals=letters.map(k=>Math.max(3,Math.min(70,Math.round(Number(parsed[k])||3))));
      const total=vals.reduce((a,b)=>a+b,0); vals=vals.map(v=>Math.round(v*100/total)); vals[0]+=100-vals.reduce((a,b)=>a+b,0);
      return json({type,percentages:Object.fromEntries(letters.map((k,i)=>[k,vals[i]])),note:"The simulated audience can be wrong."});
    }
    let suggestion=String(parsed.suggestion||"").toUpperCase();
    if(!letters.includes(suggestion))suggestion=letters[Math.floor(Math.random()*4)];
    // Keep the phone-a-friend lifeline imperfect instead of presenting AI as an answer key.
    if(Math.random()<0.22)suggestion=letters.filter(k=>k!==suggestion)[Math.floor(Math.random()*3)];
    return json({type,name:character.name,specialty:character.strength,suggestion,confidence:Math.max(50,Math.min(90,Number(parsed.confidence)||62)),reason:String(parsed.reason||character.voice).slice(0,220),note:"This simulated friend is not guaranteed to be correct."});
  }catch(error){return json({error:error instanceof Error?error.message:String(error)},400)}
});
