import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedDifficulty = new Set(["easy","medium","hard","very_hard"]);
const allowedOptions = new Set(["A","B","C","D"]);
Deno.serve(async req => {
  try {
    const body=await req.json();
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("Authorization")??""}}});
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(!profile||!["admin","reviewer"].includes(profile.role)) return new Response(JSON.stringify({error:"Staff access required"}),{status:403});
    for(const f of ["questionText","optionA","optionB","optionC","optionD","correctOption","explanation","category","difficulty"]) if(!String(body[f]??"").trim()) throw new Error(`${f} is required`);
    const opts=[body.optionA,body.optionB,body.optionC,body.optionD].map((x:string)=>x.trim().toLowerCase());
    if(new Set(opts).size!==4) throw new Error("Options must be unique");
    if(!allowedOptions.has(body.correctOption)||!allowedDifficulty.has(body.difficulty)) throw new Error("Invalid question fields");
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:dupes}=await admin.rpc("find_question_duplicates",{p_text:body.questionText,p_threshold:0.85});
    if(dupes?.length) return new Response(JSON.stringify({status:"duplicate_warning",matches:dupes}),{headers:{"Content-Type":"application/json"}});
    const {data,error}=await admin.from("questions").insert({question_text:body.questionText.trim(),option_a:body.optionA.trim(),option_b:body.optionB.trim(),option_c:body.optionC.trim(),option_d:body.optionD.trim(),correct_option:body.correctOption,explanation:body.explanation.trim(),category:body.category.trim(),difficulty:body.difficulty,tags:Array.isArray(body.tags)?body.tags:[],source_reference:body.sourceReference?.trim()||null,status:"draft",created_by:user.id}).select("id,status").single();
    if(error) throw error;
    return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});
  } catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400});}
});
