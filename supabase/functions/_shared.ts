import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function clients(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  return { service, userClient };
}

export async function activeSession(req: Request) {
  const { service, userClient } = clients(req);
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  const body = await req.json();
  const { data: session, error: sessionError } = await service.from('game_sessions').select('*').eq('id', body.sessionId).eq('player_id', user.id).maybeSingle();
  if (sessionError || !session) throw new Error('Game session not found');
  if (session.status !== 'active') throw new Error('Game is not active');
  const questionId = session.question_sequence?.[session.current_index];
  if (!questionId) throw new Error('No active question');
  if (!session.current_deadline || new Date(session.current_deadline).getTime() <= Date.now()) throw new Error('Question time has expired');
  const { data: question, error: questionError } = await service.from('questions')
    .select('id,question_text,option_a,option_b,option_c,option_d,correct_option,category,difficulty,explanation')
    .eq('id', questionId).single();
  if (questionError || !question) throw new Error('Question not found');
  return { service, user, session, body, questionId, question };
}

export function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type':'application/json' } });
}

function extractText(data: any): string {
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('')?.trim() || '';
}

export async function gemini(prompt: string, opts: { json?: boolean; temperature?: number } = {}) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Free AI is not configured yet. Add GEMINI_API_KEY to Supabase Edge Function secrets.');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { responseMimeType: 'application/json' } : {})
    }
  };
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}: ${data?.error?.message || 'AI request failed'}`);
  const text = extractText(data);
  if (!text) throw new Error('Gemini returned no text.');
  return text;
}

export function parseJson<T = any>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced?.[1] ?? text).trim()) as T;
}
