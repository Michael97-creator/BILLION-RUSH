import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOTAL = 20;
const SECONDS = 30;
const TARGET = { easy: 5, medium: 5, hard: 5, very_hard: 5 } as const;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } }
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: history } = await admin
      .from("player_question_history")
      .select("question_id,last_seen_at")
      .eq("player_id", user.id)
      .order("last_seen_at", { ascending: true });
    const seen = new Set((history ?? []).map((x: any) => x.question_id));
    const lastSeen = new Map((history ?? []).map((x: any) => [x.question_id, x.last_seen_at]));

    const { data: questions, error } = await admin
      .from("questions")
      .select("id,difficulty")
      .eq("status", "approved")
      .in("difficulty", ["easy", "medium", "hard", "very_hard"])
      .limit(5000);
    if (error) throw error;

    // Prefer unseen questions. If a mature player has exhausted an entire
    // difficulty tier, recycle the least-recently-seen approved questions
    // rather than making the game unavailable.
    const groups: Record<string, any[]> = { easy: [], medium: [], hard: [], very_hard: [] };
    for (const q of (questions ?? [])) groups[q.difficulty]?.push(q);
    for (const level of Object.keys(groups)) {
      groups[level].sort((a,b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) ||
        String(lastSeen.get(a.id) || '').localeCompare(String(lastSeen.get(b.id) || '')));
    }

    const shortages = Object.entries(TARGET)
      .filter(([level, count]) => (groups[level]?.length ?? 0) < count)
      .map(([level, count]) => `${level}: need ${count}, have ${groups[level]?.length ?? 0}`);
    if (shortages.length) {
      return new Response(JSON.stringify({
        error: "The approved question bank does not yet have enough questions for a balanced Rush.",
        shortages
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    const sequence = shuffle(
      Object.entries(TARGET).flatMap(([level, count]) => shuffle(groups[level]).slice(0, count))
    ).map((q: any) => q.id);

    const deadline = new Date(Date.now() + SECONDS * 1000).toISOString();
    const { data: session, error: insertError } = await admin
      .from("game_sessions")
      .insert({
        player_id: user.id,
        mode: "solo",
        status: "active",
        question_sequence: sequence,
        current_index: 0,
        current_deadline: deadline,
        money_reached: 0,
        questions_attempted: 0,
        correct_count: 0
      })
      .select("id,current_index,current_deadline")
      .single();
    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      sessionId: session.id,
      questionIndex: 0,
      deadline,
      timeLimitSeconds: SECONDS,
      questionId: sequence[0],
      composition: TARGET
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});
