let ctx=null, master=null, musicGain=null, musicTimer=null, step=0
const NOTES={C4:261.63,D4:293.66,E4:329.63,G4:392,A4:440,C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880}
function ensure(){if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC();master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);musicGain=ctx.createGain();musicGain.gain.value=.045;musicGain.connect(master)}if(ctx.state==='suspended')ctx.resume();return ctx}
function settings(){try{return {sound:true,music:true,vibration:true,...(JSON.parse(localStorage.getItem('billionRush.profile.v4')||'{}').settings||{})}}catch{return {sound:true,music:true,vibration:true}}}
function beep(freq=440,duration=.09,type='sine',gain=.05,when=0){const c=ensure();if(!c||!settings().sound)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,c.currentTime+when);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+when+duration);o.connect(g);g.connect(master);o.start(c.currentTime+when);o.stop(c.currentTime+when+duration)}
function chord(notes,d=.22,g=.045){notes.forEach((n,i)=>beep(NOTES[n]||n,d,'triangle',g,i*.025))}
export function init(){ensure()}
export function startMusic(mode='home'){const c=ensure();if(!c||!settings().music)return;stopMusic();const patterns={home:['C4','G4','A4','E4','D4','G4','C5','A4'],game:['C4','E4','G4','D4','A4','G4','E4','D4'],late:['C4','D4','G4','A4','G5','E5','D5','A4']};const p=patterns[mode]||patterns.game;step=0;musicTimer=setInterval(()=>{if(!settings().music)return;const n=NOTES[p[step%p.length]],o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=n;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.linearRampToValueAtTime(.04,c.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.55);o.connect(g);g.connect(musicGain);o.start();o.stop(c.currentTime+.58);step++},650)}
export function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
export function applySettings(mode='home'){if(!settings().music){stopMusic();return}if(!musicTimer)startMusic(mode)}
export function click(){beep(620,.055,'square',.035)}
export function start(){chord(['C5','E5','G5'],.24,.055);setTimeout(()=>beep(783.99,.12,'triangle',.055),130)}
export function select(){beep(520,.07,'sine',.04)}
export function tick(urgent=false){beep(urgent?880:660,.045,'square',urgent?.045:.025)}
export function correct(){chord(['C5','E5','G5'],.22,.065);setTimeout(()=>chord(['E5','G5','A5'],.2,.055),190)}
export function wrong(){beep(180,.24,'sawtooth',.07);setTimeout(()=>beep(120,.18,'sawtooth',.05),130)}
export function ladder(){chord(['E5','G5','C5'],.16,.045);setTimeout(()=>beep(1046.5,.13,'triangle',.045),120)}
export function lifeline(){beep(740,.08,'triangle',.045);setTimeout(()=>beep(988,.1,'triangle',.04),85)}
export function phone(){[0,1,2,3].forEach(i=>{beep(660,.12,'sine',.04,i*.22);beep(520,.12,'sine',.035,i*.22+.11)})}
export function reveal(){chord(['A4','C5','E5'],.18,.04)}
export function walk(){chord(['G4','C5','E5'],.3,.05)}
export function victory(){[0,1,2,3,4].forEach(i=>setTimeout(()=>chord(['C5','E5','G5','A5'].slice(0,3),.22,.065),i*130))}
export function gameOver(){beep(220,.32,'sawtooth',.06);setTimeout(()=>beep(155,.38,'triangle',.05),180)}
