export function LifelineController({apiBase, sessionId, getToken, onResult}) {
  async function call(path, body={}) {
    const token=await getToken(); const r=await fetch(`${apiBase}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sessionId,...body})});
    const data=await r.json(); if(!r.ok) throw new Error(data.error||'Lifeline failed'); onResult(path,data); return data;
  }
  return { fiftyFifty:()=>call('use-5050'), audience:()=>call('ask-audience'), friend:(friendId)=>call('call-friend',{friendId}) };
}
