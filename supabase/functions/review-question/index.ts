import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async req=>{
  try{
    const body=await req.json();
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("Authorization")??""}}});
    const {data:{user}}=await supabase.auth.getUser(); if(!user) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401});
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(!profile||!["admin","reviewer"].includes(profile.role)) return new Response(JSON.stringify({error:"Staff access required"}),{status:403});
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if(body.action==="list"){
      const {data,error}=await admin.from("questions").select("id,question_text,category,difficulty,status,created_at").in("status",["draft","pending_review"]).order("created_at",{ascending:true});
      if(error) throw error; return new Response(JSON.stringify({questions:data}),{headers:{"Content-Type":"application/json"}});
    }
    if(body.action==="review"){
      const decisions=["approve","reject","request_changes"]; if(!decisions.includes(body.decision)) throw new Error("Invalid decision");
      const status=body.decision==="approve"?"approved":body.decision==="reject"?"rejected":"draft";
      const {error}=await admin.from("questions").update({status,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",body.questionId); if(error) throw error;
      await admin.from("question_reviews").insert({question_id:body.questionId,reviewer_id:user.id,decision:body.decision,notes:body.notes||null});
      return new Response(JSON.stringify({ok:true,status}),{headers:{"Content-Type":"application/json"}});
    }
    throw new Error("Unknown action");
  }catch(e){return new Response(JSON.stringify({error:String(e)}),{status:400});}
});
