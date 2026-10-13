// Supabase Edge Function — timeout-question
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { sessionId } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { data: session, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("player_id", user.id)
      .single();

    if (error) throw error;
    if (session.status !== "active") throw new Error("Game is no longer active.");

    if (Date.now() < new Date(session.current_deadline).getTime())
      throw new Error("Question has not timed out.");

    const questionId = session.question_sequence[session.current_index];
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await admin.from("game_answers").insert({
      session_id: sessionId,
      question_id: questionId,
      selected_option: null,
      server_elapsed_ms: 30000,
      is_correct: false,
      timed_out: true,
      money_before: session.money_reached,
      money_after: session.money_reached
    });

    await admin.from("game_sessions").update({
      status: "lost",
      finished_at: new Date().toISOString(),
      questions_attempted: session.current_index + 1
    }).eq("id", sessionId).eq("status", "active");

    return new Response(JSON.stringify({
      gameStatus: "lost",
      timedOut: true,
      moneyReached: session.money_reached
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
