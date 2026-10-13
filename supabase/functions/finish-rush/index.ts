// Supabase Edge Function — server-authoritative result report.
// Wire to your existing Stage 4/7 schema. Do not expose correct_option to clients.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400 });

  // Server calculates the report from stored answers; client-submitted report data is never trusted.
  const { data: session, error: sessionError } = await supabase.from('game_sessions').select('id,player_id,money_reached,status').eq('id', sessionId).eq('player_id', user.id).single();
  if (sessionError || !session) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: answers, error } = await service.from('game_answers').select('question_id,is_correct').eq('session_id', sessionId).order('submitted_at');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Category/explanation enrichment should be performed by a trusted service-role worker once schema columns are wired.
  const report = { attempted: answers?.length ?? 0, correct: answers?.filter((a:any) => a.is_correct).length ?? 0, wrong: answers?.filter((a:any) => !a.is_correct).length ?? 0, amount: session.money_reached ?? 0, status: session.status };
  return new Response(JSON.stringify({ report }), { headers: { 'Content-Type': 'application/json' } });
});
