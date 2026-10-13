import { activeSession, gemini, json, parseJson } from '../_shared.ts';

function fallback() {
  const letters=['A','B','C','D'];
  const raw=letters.map(()=>Math.random()); const total=raw.reduce((a,b)=>a+b,0);
  let values=raw.map(x=>Math.max(5,Math.round(x/total*100)));
  values[0]+=100-values.reduce((a,b)=>a+b,0);
  return Object.fromEntries(letters.map((l,i)=>[l,values[i]]));
}

Deno.serve(async req => { try {
  const { service, session, questionId, question } = await activeSession(req);
  const { data: existing } = await service.from('game_lifelines').select('id').eq('session_id',session.id).eq('question_id',questionId).eq('lifeline_type','audience').maybeSingle();
  if(existing) return json({error:'Lifeline already used for this question'},409);

  let percentages:any; let provider='free-gemini-audience';
  try {
    const prompt=`You are simulating a 100-person studio audience for a trivia game. Give a plausible vote split for this multiple-choice question. The audience can be wrong. Do not reveal the correct answer explicitly. Return JSON only: {"A":number,"B":number,"C":number,"D":number}. The four integers must total exactly 100 and each must be between 3 and 70.\nQuestion: ${question.question_text}\nA: ${question.option_a}\nB: ${question.option_b}\nC: ${question.option_c}\nD: ${question.option_d}`;
    percentages=parseJson(await gemini(prompt,{json:true,temperature:0.9}));
    const vals=['A','B','C','D'].map(k=>Math.max(0,Math.round(Number(percentages[k])||0)));
    if(vals.some(v=>v<3)||vals.reduce((a,b)=>a+b,0)!==100) throw new Error('Invalid audience distribution');
    percentages=Object.fromEntries(['A','B','C','D'].map((k,i)=>[k,vals[i]]));
  } catch { percentages=fallback(); provider='fallback-audience-engine'; }

  await service.from('game_lifelines').insert({session_id:session.id,question_id:questionId,lifeline_type:'audience',payload:{percentages,provider}});
  return json({percentages, note:'Audience opinion is not guaranteed to be correct.', deadline:session.current_deadline});
} catch(e){return json({error:e.message},400);} });
