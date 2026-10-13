import { activeSession, json } from '../_shared.ts';
Deno.serve(async req => { try {
  const { service, session, body } = await activeSession(req);
  const { data: existing } = await service.from('game_lifelines').select('id').eq('session_id', session.id).eq('question_id', session.current_question_id).eq('lifeline_type','fifty_fifty').maybeSingle();
  if (existing) return json({ error:'Lifeline already used for this question' },409);
  const { data:q } = await service.from('questions').select('id,option_a,option_b,option_c,option_d,correct_option').eq('id',session.current_question_id).single();
  if (!q) return json({error:'Question unavailable'},404);
  const wrong = (['A','B','C','D'] as const).filter(x=>x!==q.correct_option);
  const shuffled = wrong.sort(()=>Math.random()-0.5).slice(0,2);
  await service.from('game_lifelines').insert({session_id:session.id,question_id:q.id,lifeline_type:'fifty_fifty',payload:{removedOptions:shuffled}});
  return json({ removedOptions: shuffled, deadline: session.current_deadline });
} catch(e) { return json({error:e.message},400); } });
