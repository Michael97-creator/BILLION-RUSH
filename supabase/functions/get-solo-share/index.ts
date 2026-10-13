import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' },
});
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { token } = await req.json();
    if (typeof token !== 'string' || !/^[a-f0-9]{32}$/i.test(token)) return json({ error: 'Invalid score link' }, 400);
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Score-sharing backend is not configured.' }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await admin.from('solo_shared_results')
      .select('token,display_name,amount,questions_faced,correct_count,total_questions,country,created_at')
      .eq('token', token.toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'Score not found' }, 404);
    return json({
      token: data.token, displayName: data.display_name, amount: Number(data.amount),
      questionsFaced: data.questions_faced, correct: data.correct_count,
      totalQuestions: data.total_questions, country: data.country, createdAt: data.created_at,
    });
  } catch (error) {
    console.error('get-solo-share failed', error);
    return json({ error: 'Could not load this score.' }, 500);
  }
});
