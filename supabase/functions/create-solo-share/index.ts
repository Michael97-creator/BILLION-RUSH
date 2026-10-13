import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const text = (value: unknown, max: number) => String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const questionsFaced = Number(body.questionsFaced);
    const correct = Number(body.correct);
    const totalQuestions = Number(body.totalQuestions);
    const displayName = text(body.displayName, 24) || 'CHALLENGER';
    const country = text(body.country, 60) || 'Global';
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000) return json({ error: 'Invalid score amount' }, 400);
    if (!Number.isInteger(questionsFaced) || questionsFaced < 1 || questionsFaced > 50) return json({ error: 'Invalid questions faced' }, 400);
    if (!Number.isInteger(correct) || correct < 0 || correct > questionsFaced) return json({ error: 'Invalid correct-answer count' }, 400);
    if (totalQuestions !== 50) return json({ error: 'Invalid game length' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ error: 'Score-sharing backend is not configured.' }, 503);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-client';
    const ipHash = await sha256(`${Deno.env.get('SHARE_RATE_SALT') || supabaseUrl}:${forwarded}`);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from('solo_share_requests').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if (countError) throw countError;
    if ((count || 0) >= 20) return json({ error: 'Too many score links from this connection. Please try again later.' }, 429);
    const { error: rateError } = await admin.from('solo_share_requests').insert({ ip_hash: ipHash });
    if (rateError) throw rateError;
    // Keep the rate-limit table bounded.
    await admin.from('solo_share_requests').delete().lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const token = crypto.randomUUID().replaceAll('-', '').toLowerCase();
    const { data, error } = await admin.from('solo_shared_results').insert({
      token, display_name: displayName, amount, questions_faced: questionsFaced,
      correct_count: correct, total_questions: 50, country,
    }).select('token,display_name,amount,questions_faced,correct_count,total_questions,country,created_at').single();
    if (error) throw error;
    return json({
      token: data.token, displayName: data.display_name, amount: Number(data.amount),
      questionsFaced: data.questions_faced, correct: data.correct_count,
      totalQuestions: data.total_questions, country: data.country, createdAt: data.created_at,
    }, 201);
  } catch (error) {
    console.error('create-solo-share failed', error);
    return json({ error: 'Could not create the score link. Please try again.' }, 500);
  }
});
