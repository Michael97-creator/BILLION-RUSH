import './result-page.css'
import { isConfigured, getSoloShare } from './backend.js'
import { makeScoreCardBlob } from './share-card.js'

const root = document.getElementById('result-app')
const money = value => `₦${Math.max(0, Math.floor(Number(value)||0)).toLocaleString('en-NG')}`
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
const params = new URLSearchParams(location.search)
const token = params.get('id') || ''
const encodedScore = params.get('score') || ''
let result = null

function renderError(title, message) {
  root.innerHTML = `<main class="share-page"><div class="brand"><span class="crown">♛</span><span>BILLION <b>RUSH</b><small>BY JUMI TECH</small></span></div><section class="share-panel"><p class="eyebrow">SHARED SCORE</p><h1>${esc(title)}</h1><p>${esc(message)}</p><a class="gold-button" href="/index.html">PLAY BILLION RUSH <span>↗</span></a></section><footer>50 QUESTIONS · 30 SECONDS · ₦1 BILLION GOAL</footer></main>`
}
function render(data) {
  const faced = Number(data.questionsFaced ?? data.questions_faced ?? data.questionsSurvived ?? 0)
  const correct = Number(data.correct ?? data.correct_count ?? 0)
  const name = data.displayName || data.display_name || 'CHALLENGER'
  root.innerHTML = `<main class="share-page"><div class="brand"><span class="crown">♛</span><span>BILLION <b>RUSH</b><small>BY JUMI TECH</small></span><span class="brand-tag">SCORE CARD</span></div><section class="share-panel"><p class="eyebrow"><i></i> A RUSH WORTH SHARING</p><p class="player-name">${esc(name)}</p><h1>THEIR RUSH.<br><span>YOUR CHALLENGE.</span></h1><div class="money-card"><small>PRIZE REACHED</small><strong>${money(data.amount)}</strong><span>OUT OF ₦1 BILLION</span></div><div class="score-grid"><div><small>QUESTIONS FACED</small><strong>${faced}/50</strong></div><div><small>CORRECT ANSWERS</small><strong>${correct}/50</strong></div><div><small>COUNTRY</small><strong>${esc(data.country || 'Global')}</strong></div></div><p class="challenge-copy">Think you can do better? Download Billion Rush, install it on your phone, and challenge this score.</p><div class="share-actions"><a class="gold-button" href="/download.html">DOWNLOAD BILLION RUSH <span>↓</span></a><button id="shareResult" class="outline-button">SHARE THIS RESULT</button><button id="downloadCard" class="quiet-button">DOWNLOAD SCORE CARD ↓</button></div><p class="fine-print">Player-shared result · Challenge your friends to beat this Rush.</p></section><footer>50 QUESTIONS · 30 SECONDS · ₦1 BILLION GOAL</footer></main>`
  document.getElementById('shareResult')?.addEventListener('click', shareResult)
  document.getElementById('downloadCard')?.addEventListener('click', downloadCard)
}
async function shareResult() {
  const url = location.href
  const downloadUrl = `${location.origin}/download.html`
  const text = `${result.displayName || result.display_name || 'A player'} reached ${money(result.amount)} in Billion Rush. Can you beat the score?\nDownload Billion Rush, install it, and challenge your friend!\n${downloadUrl}\n#BillionRush #JumiTech`
  try {
    const blob = await makeScoreCardBlob({displayName:result.displayName || result.display_name,amount:result.amount,questionsFaced:result.questionsFaced ?? result.questions_faced ?? result.questionsSurvived,correct:result.correct ?? result.correct_count,country:result.country})
    const imageFile = new File([blob], 'billion-rush-score.png', {type:'image/png'})
    if (window.Capacitor?.isNativePlatform?.()) {
      const [{Share},{Filesystem,Directory}] = await Promise.all([import('@capacitor/share'),import('@capacitor/filesystem')])
      const base64 = await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob)})
      const saved = await Filesystem.writeFile({path:'billion-rush-score.png',data:base64,directory:Directory.Cache,recursive:true})
      await Share.share({title:'Download Billion Rush and Beat My Score',text,url:downloadUrl,files:[saved.uri],dialogTitle:'Challenge your friends'}); return
    }
    if (navigator.canShare?.({files:[imageFile]}) && navigator.share) { await navigator.share({title:'Download Billion Rush and Beat My Score',text,url:downloadUrl,files:[imageFile]}); return }
    if (navigator.share) { await navigator.share({title:'Download Billion Rush and Beat My Score',text,url:downloadUrl}); return }
  } catch (e) { if (e?.name==='AbortError') return; console.warn('Share sheet unavailable',e) }
  const encodedUrl = encodeURIComponent(downloadUrl), encodedText = encodeURIComponent(text)
  root.querySelector('.share-actions')?.insertAdjacentHTML('beforeend', `<a class="outline-button" target="_blank" rel="noopener" href="https://wa.me/?text=${encodedText}">SHARE ON WHATSAPP ↗</a><a class="outline-button" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}">SHARE ON FACEBOOK ↗</a><a class="outline-button" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent('Can you beat this Billion Rush score?')}">SHARE ON TELEGRAM ↗</a>`)
}
async function downloadCard() {
  try {
    const blob = await makeScoreCardBlob({displayName:result.displayName || result.display_name,amount:result.amount,questionsFaced:result.questionsFaced ?? result.questions_faced ?? result.questionsSurvived,correct:result.correct ?? result.correct_count})
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='billion-rush-score.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500)
  } catch { alert('Could not generate the score card in this browser. Please try sharing the link instead.') }
}

if (encodedScore) {
  try {
    if (encodedScore.length > 6000) throw new Error('Score link too long')
    const base64 = encodedScore.replace(/-/g,'+').replace(/_/g,'/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    const parsed = JSON.parse(decodeURIComponent(escape(atob(padded))))
    result = {
      displayName: String(parsed.displayName || '').slice(0,24),
      amount: Math.max(0, Math.min(1000000000, Math.floor(Number(parsed.amount)||0))),
      questionsFaced: Math.max(0, Math.min(50, Math.floor(Number(parsed.questionsFaced)||0))),
      correct: Math.max(0, Math.min(50, Math.floor(Number(parsed.correct)||0))),
      country: String(parsed.country || 'Global').slice(0,60)
    }
    render(result)
  } catch { renderError('This score link could not be opened.', 'Ask your friend to share their Billion Rush result again.') }
} else if (!token || !/^[a-f0-9]{32}$/i.test(token)) renderError('That score link looks invalid.', 'Ask your friend to open the original Billion Rush sharing link.')
else if (!isConfigured()) renderError('This score is unavailable.', 'Ask your friend to share their result again.')
else {
  getSoloShare(token).then(data=>{ if(!data || data.error) throw new Error(data?.error || 'This score could not be found.'); result=data; render(data) })
    .catch(()=>renderError('Score not found.', 'This result may have expired or the link may be incorrect. You can still start your own Billion Rush.'))
}
