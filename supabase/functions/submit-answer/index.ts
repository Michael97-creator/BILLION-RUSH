// Supabase Edge Function — submit-answer
// Correctness and timing must be resolved server-side.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { sessionId, selectedOption } = body;

    if (!sessionId || !["A","B","C","D"].includes(selectedOption))
      return new Response(JSON.stringify({ error: "Invalid submission" }), { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("player_id", user.id)
      .single();

    if (sessionError) throw sessionError;
    if (session.status !== "active") throw new Error("Game is no longer active.");

    const now = Date.now();
    const deadline = new Date(session.current_deadline).getTime();

    if (now > deadline) {
      throw new Error("Question timed out. Use timeout-question.");
    }

    const questionId = session.question_sequence[session.current_index];

    // SECURITY NOTE:
    // In the final deployed function, this lookup must use a privileged
    // server-only client because correct_option is never exposed to players.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: question, error: questionError } = await admin
      .from("questions")
      .select("id, correct_option")
      .eq("id", questionId)
      .eq("status", "approved")
      .single();

    if (questionError) throw questionError;

    const correct = selectedOption === question.correct_option;
    const index = session.current_index;
    const moneyBefore = session.money_reached;
    const ladder = [
      1000,5000,10000,25000,50000,100000,250000,500000,1000000,2500000,
      5000000,10000000,25000000,50000000,100000000,150000000,250000000,
      400000000,700000000,1000000000
    ];

    const moneyAfter = correct ? ladder[index] : moneyBefore;
    const final = index === 19;
    const newStatus = correct ? (final ? "won" : "active") : "lost";

    await admin.from("game_answers").insert({
      session_id: sessionId,
      question_id: questionId,
      selected_option: selectedOption,
      server_elapsed_ms: Math.max(0, now - new Date(session.started_at).getTime()),
      is_correct: correct,
      timed_out: false,
      money_before: moneyBefore,
      money_after: moneyAfter
    });

    const { data: priorHistory } = await admin.from('player_question_history').select('times_seen').eq('player_id', user.id).eq('question_id', questionId).maybeSingle();
    await admin.from('player_question_history').upsert({
      player_id: user.id,
      question_id: questionId,
      last_seen_at: new Date().toISOString(),
      times_seen: Number(priorHistory?.times_seen || 0) + 1
    }, { onConflict: 'player_id,question_id', ignoreDuplicates: false });

    if (!correct) {
      await admin.from("game_sessions").update({
        status: "lost",
        finished_at: new Date().toISOString(),
        questions_attempted: index + 1,
        correct_count: session.correct_count
      }).eq("id", sessionId);
    } else if (final) {
      await admin.from("game_sessions").update({
        status: "won",
        finished_at: new Date().toISOString(),
        money_reached: moneyAfter,
        questions_attempted: 20,
        correct_count: session.correct_count + 1
      }).eq("id", sessionId);
    } else {
      const nextDeadline = new Date(now + 30000).toISOString();
      await admin.from("game_sessions").update({
        current_index: index + 1,
        current_deadline: nextDeadline,
        money_reached: moneyAfter,
        questions_attempted: index + 1,
        correct_count: session.correct_count + 1
      }).eq("id", sessionId);
    }

    return new Response(JSON.stringify({
      correct,
      moneyAfter,
      gameStatus: newStatus,
      correctOption: question.correct_option,
      nextQuestionIndex: correct && !final ? index + 1 : null
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }
});
