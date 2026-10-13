import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const { matchId } = await req.json();
    if (!matchId) return new Response(JSON.stringify({ error: 'matchId_required' }), { status: 400, headers: {'content-type':'application/json'} });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: rows, error } = await supabase
      .from('multiplayer_round_scores')
      .select('player_id,question_index,is_correct,timed_out,money_before,money_after')
      .eq('match_id', matchId);
    if (error) throw error;

    const players = [...new Set((rows ?? []).map((r: any) => r.player_id))];
    if (players.length !== 2) return new Response(JSON.stringify({ error: 'match_not_ready' }), { status: 409, headers: {'content-type':'application/json'} });

    const totals = players.map(playerId => {
      const mine = (rows ?? []).filter((r: any) => r.player_id === playerId);
      const last = mine.sort((a:any,b:any) => b.question_index - a.question_index)[0];
      return { playerId, money: Number(last?.money_after ?? 0), survived: mine.filter((r:any) => r.is_correct).length };
    });
    totals.sort((a,b) => b.money - a.money || b.survived - a.survived);
    const result = totals[0].money === totals[1].money && totals[0].survived === totals[1].survived ? 'tie' : 'winner';

    return new Response(JSON.stringify({ ok: true, matchId, result, players: totals }), { headers: {'content-type':'application/json'} });
  } catch {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: {'content-type':'application/json'} });
  }
});
