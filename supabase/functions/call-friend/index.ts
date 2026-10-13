import { activeSession, gemini, json, parseJson } from '../_shared.ts';
const friends={amara:['Amara','History & Culture'],tunde:['Tunde','Business & Logic'],david:['David','Science & Technology'],zainab:['Zainab','Geography & Culture'],marcus:['Marcus','Mathematics & Logic'],chioma:['Chioma','Language & Arts'],kola:['Kola','Sports & Pop Culture'],maya:['Maya','Mixed Knowledge']} as const;
Deno.serve(async req=>{try{
 const {service,session,body,questionId,question}=await activeSession(req); const friend=body.friendId as keyof typeof friends;
 if(!friends[friend]) return json({error:'Invalid friend'},400);
 const {data:existing}=await service.from('game_lifelines').select('id').eq('session_id',session.id).eq('question_id',questionId).eq('lifeline_type','friend').maybeSingle();
 if(existing)return json({error:'Lifeline already used for this question'},409);
 const [name,specialty]=friends[friend];
 let payload:any; let provider='free-gemini-friend';
 try {
   const prompt=`You are ${name}, a ${specialty} specialist helping a contestant on a high-pressure trivia game. Give your best answer, but you can be wrong. Be concise and natural. Return JSON only: {"suggestion":"A|B|C|D","confidence":number,"reason":"short reason"}. Confidence must be 50-95.\nQuestion: ${question.question_text}\nA: ${question.option_a}\nB: ${question.option_b}\nC: ${question.option_c}\nD: ${question.option_d}`;
   const ai=parseJson(await gemini(prompt,{json:true,temperature:0.75}));
   const suggestion=String(ai.suggestion||'').toUpperCase();
   if(!['A','B','C','D'].includes(suggestion)) throw new Error('Invalid AI answer');
   payload={friendId:friend,name,specialty,suggestion,confidence:Math.min(95,Math.max(50,Number(ai.confidence)||60)),reason:String(ai.reason||'That is my best read of the question.')};
 } catch {
   const options=['A','B','C','D'];
   payload={friendId:friend,name,specialty,suggestion:options[Math.floor(Math.random()*4)],confidence:55+Math.floor(Math.random()*31),reason:'I cannot be completely certain, but that is my best guess.'};
   provider='fallback-friend-engine';
 }
 payload.provider=provider;
 await service.from('game_lifelines').insert({session_id:session.id,question_id:questionId,lifeline_type:'friend',payload});
 return json({...payload,deadline:session.current_deadline});
}catch(e){return json({error:e.message},400)}});
