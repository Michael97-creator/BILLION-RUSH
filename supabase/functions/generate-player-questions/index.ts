import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gemini, parseJson } from "../_shared.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const countries = new Set(["Nigeria","Ghana","Kenya","South Africa","Egypt","Ethiopia","United States","United Kingdom","India","Canada","Australia","Brazil","France","Germany","Japan","Pakistan","Other"]);
const regions = new Set(["Africa","Americas","Europe","Asia","Oceania","Global"]);
const levels = ["easy","medium","hard","very_hard"] as const;
const letters = ["A","B","C","D"] as const;
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const toDifficultyNumber = (s: string) => ({easy:1,medium:2,hard:3,very_hard:4} as Record<string,number>)[s] || 2;
const hash = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const country = String(body.country || "Other").slice(0, 60);
    const region = String(body.region || "Global").slice(0, 20);
    const count = Math.max(1, Math.min(10, Number(body.count) || 10));
    const deviceId = String(body.deviceId || "").slice(0, 160);
    const excludeIds = Array.isArray(body.excludeIds) ? body.excludeIds.map((x:any)=>String(x)).slice(0,1000) : [];
    if (!countries.has(country) || !regions.has(region)) return json({ error: "Unsupported country or region." }, 400);
    if (deviceId.length < 12) return json({ error: "Missing device identifier." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const excluded = new Set(excludeIds);
    const countryTag = `country:${country}`;
    const regionTag = `region:${region}`;
    const { data: pooled, error: poolError } = await service.from("questions")
      .select("id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,category,difficulty,tags")
      .eq("status", "approved").contains("tags", ["pool:generated"]).order("created_at", { ascending: false }).limit(1000);
    if (poolError) throw poolError;
    const poolRows = (pooled || []).filter((q:any) => !excluded.has(String(q.id)) && Array.isArray(q.tags));
    const asPublic = (q:any) => {
      const tags:string[] = q.tags || [];
      const taggedCountry = tags.find(t=>t.startsWith("country:"))?.slice("country:".length);
      const taggedRegion = tags.find(t=>t.startsWith("region:"))?.slice("region:".length);
      const scope = tags.find(t=>t.startsWith("scope:"))?.slice("scope:".length) || (taggedCountry ? "local" : taggedRegion ? "regional" : "world");
      return { id:q.id, ...(scope==="local" ? {country:taggedCountry,region:taggedRegion} : scope==="regional" ? {region:taggedRegion} : {}), scope, category:q.category, difficulty:({easy:1,medium:2,hard:3,very_hard:4} as Record<string,number>)[q.difficulty]||2, q:q.question_text, a:[q.option_a,q.option_b,q.option_c,q.option_d], correct:["A","B","C","D"].indexOf(String(q.correct_option).trim()), explanation:q.explanation, generated:true };
    };
    const localRows = poolRows.filter((q:any)=>(q.tags as string[]).includes(countryTag));
    const regionalRows = poolRows.filter((q:any)=>(q.tags as string[]).includes(regionTag) && !(q.tags as string[]).includes(countryTag));
    const worldRows = poolRows.filter((q:any)=>(q.tags as string[]).includes("scope:world"));
    const existingPublic = [
      ...localRows.slice(0,Math.ceil(count*0.3)),
      ...regionalRows.slice(0,Math.ceil(count*0.3)),
      ...worldRows
    ].filter((q:any,i:number,a:any[])=>a.findIndex((x:any)=>x.id===q.id)===i).slice(0,count).map(asPublic);
    const out:any[] = [...existingPublic];
    if (out.length >= count) return json({ questions:out, generated:0, reused:out.length, requested:count, source:"existing validated question pools" });

    const deviceHash = await hash(deviceId);
    const { data: allowed, error: quotaError } = await service.rpc("consume_player_question_generation_quota", { p_device_hash: deviceHash, p_daily_limit: 4 });
    if (quotaError) throw quotaError;
    if (!allowed) return json({ questions:out, generated:0, reused:out.length, requested:count, note:"Fresh-question limit reached for this device today; returning available pool questions." }, out.length ? 200 : 429);

    const generateCount = count - out.length;
    const prompt = `Generate ${generateCount} original multiple-choice trivia questions for Billion Rush. Player country: ${country}. Player region: ${region}. Create a balanced mix of country-relevant, regional, and world knowledge; at least half should not depend on local knowledge. Category mix should cover science, technology, history, geography, culture, sports, entertainment, and general knowledge where appropriate. Difficulty must vary randomly across easy, medium, hard, very_hard. Questions must be factual, unambiguous, age-appropriate, self-contained, not about fast-changing current officeholders or statistics, and have exactly four distinct plausible options with exactly one defensible correct answer. Avoid trick wording and duplicates. Do not invent sources. Include a concise explanation and a credible source title or URL only if you know it reliably. For each item, set scope to local (specific to the player's country), regional (relevant to the player's region but not only one country), or world (globally relevant). Return JSON only: {"questions":[{"questionText":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctOption":"A|B|C|D","explanation":"...","category":"...","difficulty":"easy|medium|hard|very_hard","scope":"local|regional|world","sourceReference":"..."}]}`;
    const generated: any = parseJson(await gemini(prompt, { json: true, temperature: 0.85 }));
    if (!Array.isArray(generated.questions)) throw new Error("AI did not return a question array.");

    // Automatic second-pass review. This is a quality filter, not a guarantee of truth.
    const candidates = generated.questions.slice(0, generateCount).map((q:any) => ({
      questionText: String(q.questionText || "").trim(),
      options: [q.optionA,q.optionB,q.optionC,q.optionD].map((x:any)=>String(x || "").trim()),
      correctOption: String(q.correctOption || "").toUpperCase(),
      explanation: String(q.explanation || "").trim(),
      category: String(q.category || "General Knowledge").trim().slice(0,80),
      difficulty: levels.includes(q.difficulty) ? q.difficulty : "medium",
      scope: ["local","regional","world"].includes(q.scope) ? q.scope : "world",
      sourceReference: String(q.sourceReference || "").trim().slice(0,300)
    }));
    const reviewPrompt = `Review each multiple-choice question for factual reliability, ambiguity, exactly one correct option, plausible distractors, and whether the explanation supports the answer. Reject any uncertain, outdated, ambiguous, or unsupported item. Return JSON only: {"decisions":[{"index":0,"pass":true,"reason":"short"}]}. Questions: ${JSON.stringify(candidates)}`;
    let review: any;
    try {
      review = parseJson(await gemini(reviewPrompt, { json: true, temperature: 0.1 }));
      if (!Array.isArray(review.decisions)) throw new Error("AI reviewer returned no decisions.");
    } catch {
      return json({ questions:out.slice(0,count), generated:0, reused:existingPublic.length, requested:count, note:"The automatic question reviewer is unavailable; no new questions were approved." }, out.length ? 200 : 503);
    }
    const decisions = new Map((review.decisions as any[]).map((x:any)=>[Number(x.index),Boolean(x.pass)]));

    for (let i=0;i<candidates.length && out.length<count;i++) {
      const q=candidates[i];
      if (!q.questionText || q.questionText.length < 12 || q.questionText.length > 360) continue;
      if (q.options.some((x:string)=>!x || x.length>180) || new Set(q.options.map(normalize)).size!==4) continue;
      if (!letters.includes(q.correctOption as any) || !q.explanation || decisions.get(i) !== true) continue;
      const { data: dupes } = await service.rpc("find_question_duplicates", { p_text: q.questionText, p_threshold: 0.88 });
      if (dupes?.length) continue;
      const tags = ["pool:generated", `scope:${q.scope}`, `category:${q.category}`, ...(q.scope === "local" ? [`country:${country}`, `region:${region}`] : q.scope === "regional" ? [`region:${region}`] : [])];
      const row = {
        question_text:q.questionText, option_a:q.options[0], option_b:q.options[1], option_c:q.options[2], option_d:q.options[3],
        correct_option:q.correctOption, explanation:q.explanation, category:q.category, difficulty:q.difficulty,
        source_reference:q.sourceReference || null, tags, status:"approved"
      };
      const { data: inserted, error } = await service.from("questions").insert(row).select("id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,category,difficulty,tags").single();
      if (error || !inserted) continue;
      const correct = letters.indexOf(inserted.correct_option as any);
      out.push({
        id:inserted.id, ...(q.scope === "local" ? {country, region} : q.scope === "regional" ? {region} : {}), scope:q.scope, category:inserted.category, difficulty:toDifficultyNumber(inserted.difficulty),
        q:inserted.question_text, a:[inserted.option_a,inserted.option_b,inserted.option_c,inserted.option_d],
        correct, explanation:inserted.explanation, generated:true
      });
    }
    return json({ questions: out.slice(0,count), generated: Math.max(0,out.length-existingPublic.length), reused:existingPublic.length, requested: count, source: "existing pools plus AI-generated and automatically filtered questions", note: "Automated checks reduce risk but do not guarantee every fact is correct." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
