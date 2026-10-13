import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gemini, json, parseJson } from "../_shared.ts";

const LEVELS = ["easy", "medium", "hard", "very_hard"] as const;
const OPTIONS = ["A", "B", "C", "D"] as const;

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "reviewer"].includes(profile.role)) return json({ error: "Staff access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const count = Math.min(20, Math.max(1, Number(body.count ?? 20)));
    const category = String(body.category ?? "mixed general knowledge").slice(0, 100);
    const language = String(body.language ?? "English").slice(0, 30);
    const perLevel = Math.floor(count / 4), remainder = count % 4;
    const distribution = LEVELS.map((level, i) => ({ level, count: perLevel + (i < remainder ? 1 : 0) }));
    const prompt = `Create ${count} original multiple-choice trivia questions for Billion Rush, a skill-and-knowledge game. Difficulty distribution: ${distribution.map(x=>`${x.level}=${x.count}`).join(', ')}. Category: ${category}. Language: ${language}. Exactly four distinct options, exactly one correct answer, no ambiguity, no duplicates, no unsafe content. Very hard must be genuinely advanced rather than obscure. Include explanation and sourceReference for human review. Return JSON only: {"questions":[{"questionText":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctOption":"A","explanation":"...","category":"...","difficulty":"easy|medium|hard|very_hard","sourceReference":"...","tags":["..."]}]}`;
    const parsed:any = parseJson(await gemini(prompt,{json:true,temperature:0.8}));
    if (!Array.isArray(parsed.questions)) throw new Error("AI response did not contain a questions array.");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let inserted = 0;
    for (const q of parsed.questions.slice(0,count)) {
      const row:any = {
        question_text:String(q.questionText??'').trim(), option_a:String(q.optionA??'').trim(), option_b:String(q.optionB??'').trim(),
        option_c:String(q.optionC??'').trim(), option_d:String(q.optionD??'').trim(), correct_option:String(q.correctOption??'').trim().toUpperCase(),
        explanation:String(q.explanation??'').trim(), category:String(q.category??category).trim(), difficulty:LEVELS.includes(q.difficulty)?q.difficulty:'medium',
        source_reference:String(q.sourceReference??'').trim()||null, tags:Array.isArray(q.tags)?q.tags.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,10):[], status:'draft', created_by:user.id
      };
      if(!row.question_text || !OPTIONS.includes(row.correct_option as any) || new Set([row.option_a,row.option_b,row.option_c,row.option_d]).size!==4) continue;
      const {data:dupes}=await admin.rpc('find_question_duplicates',{p_text:row.question_text,p_threshold:0.85});
      if(dupes?.length) continue;
      const {error}=await admin.from('questions').insert(row);
      if(!error) inserted++;
    }
    return json({ok:true,generated:inserted,status:'draft',provider:'gemini-free-tier',message:'AI questions were generated as drafts. Nothing enters the live game until an authorized reviewer approves it.'});
  } catch(e){return json({error:String(e)},400)}
});
