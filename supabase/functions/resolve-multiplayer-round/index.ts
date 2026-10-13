// Stage 18 trusted server boundary.
// Wire this function to the existing Stage 17 match/session schema.
// The service-role client must be used only on the server.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ladder = [1000,5000,10000,25000,50000,100000,250000,500000,1000000,2500000,5000000,10000000,25000000,50000000,100000000,150000000,250000000,400000000,700000000,1000000000];

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { matchId, questionIndex, outcomes, idempotencyKey } = body;
    if (!matchId || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 19 || !Array.isArray(outcomes) || outcomes.length !== 2 || !idempotencyKey) {
      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: {'content-type':'application/json'} });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, key);

    // TODO: Replace with an atomic RPC once the Stage 17 match schema is finalized.
    // Never trust a client-supplied outcome in production; derive each outcome from
    // the stored answer/deadline records here.
    const scores = outcomes.map((o: any) => ({
      match_id: matchId,
      player_id: o.playerId,
      question_index: questionIndex,
      is_correct: o.outcome === 'correct',
      timed_out: o.outcome === 'timeout',
      money_before: Number(o.moneyBefore ?? 0),
      money_after: o.outcome === 'correct' ? ladder[questionIndex] : Number(o.moneyBefore ?? 0),
    }));

    const { error } = await supabase.from('multiplayer_round_scores').upsert(scores, { onConflict: 'match_id,player_id,question_index', ignoreDuplicates: true });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, matchId, questionIndex, idempotencyKey }), { headers: {'content-type':'application/json'} });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: {'content-type':'application/json'} });
  }
});
