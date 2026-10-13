import { activeSession, json } from '../_shared.ts';
Deno.serve(async req => {
  try {
    const { service, session, questionId } = await activeSession(req);
    const { data: q, error } = await service.from('questions').select('id,question_text,option_a,option_b,option_c,option_d,category,difficulty').eq('id',questionId).eq('status','approved').single();
    if(error || !q) return json({error:'Question unavailable'},404);
    const { data: used } = await service.from('game_lifelines').select('lifeline_type').eq('session_id',session.id).eq('question_id',q.id);
    return json({question:q,deadline:session.current_deadline,lifelinesUsed:(used??[]).map((x:any)=>x.lifeline_type),questionNumber:session.current_index+1,money:session.money_reached});
  } catch(e) { return json({error:e.message},400); }
});
