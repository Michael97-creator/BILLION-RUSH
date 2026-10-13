import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function periods(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset));
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  const week = monday.toISOString().slice(0,10);
  const dayKey = d.toISOString().slice(0,10);
  return { day: dayKey, week, month };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { sessionId } = await req.json();
  const { data: session, error } = await supabase.from('game_sessions').select('id,player_id,status,money_reached,finished_at,current_index').eq('id', sessionId).single();
  if (error || !session || session.player_id !== user.id) return json({ error: 'Game session not found' }, 404);
  if (!['won','lost','walked_away'].includes(session.status)) return json({ error: 'Only finished runs can enter leaderboards' }, 400);

  const completedAt = session.finished_at || new Date().toISOString();
  const p = periods(new Date(completedAt));
  const survived = Number(session.current_index ?? 0);
  const score = Number(session.money_reached ?? 0);
  const rows = [
    ['daily', p.day], ['weekly', p.week], ['monthly', p.month], ['all_time', 'all']
  ];
  for (const [period_type, period_key] of rows) {
    const { data: existing } = await supabase.from('leaderboard_entries').select('id,score,questions_survived,completed_at').eq('period_type', period_type).eq('period_key', period_key).eq('player_id', user.id).maybeSingle();
    const better = !existing || score > existing.score || (score === existing.score && survived > existing.questions_survived) || (score === existing.score && survived === existing.questions_survived && completedAt < existing.completed_at);
    if (better) {
      await supabase.from('leaderboard_entries').upsert({ period_type, period_key, player_id: user.id, game_session_id: session.id, score, questions_survived: survived, completed_at: completedAt }, { onConflict: 'period_type,period_key,player_id' });
    }
  }
  return json({ ok: true, score, periods: rows.map(([type,key]) => ({ type, key })) });
});
