const formatMoney = value => `₦${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-NG')}`

export async function makeScoreCardBlob(result) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')

  const bg = ctx.createLinearGradient(0, 0, 1080, 1350)
  bg.addColorStop(0, '#0b1221'); bg.addColorStop(.55, '#111a2d'); bg.addColorStop(1, '#080d17')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350)
  const glow = ctx.createRadialGradient(860, 160, 10, 860, 160, 600)
  glow.addColorStop(0, 'rgba(243,207,120,.22)'); glow.addColorStop(1, 'rgba(243,207,120,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 800)

  const rounded = (x,y,w,h,r,fill,stroke) => {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill()
    if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke() }
  }
  rounded(38,38,1004,1274,40,'rgba(16,25,43,.72)','rgba(210,222,243,.18)')
  ctx.fillStyle='#f3cf78'; ctx.font='800 28px system-ui, sans-serif'; ctx.letterSpacing='5px'; ctx.fillText('A JUMI TECH GAME',82,126)
  ctx.letterSpacing='0px'; ctx.fillStyle='#f7f8fc'; ctx.font='900 76px system-ui, sans-serif'; ctx.fillText('BILLION RUSH',78,225)
  ctx.fillStyle='#9eacc2'; ctx.font='600 25px system-ui, sans-serif'; ctx.fillText('50 QUESTIONS  ·  ₦1 BILLION GOAL',82,274)

  ctx.fillStyle='#9eacc2'; ctx.font='700 22px system-ui, sans-serif'; ctx.fillText('PLAYER',82,375)
  ctx.fillStyle='#f7f8fc'; ctx.font='700 36px system-ui, sans-serif'; ctx.fillText(String(result.displayName || 'CHALLENGER').slice(0,24).toUpperCase(),82,425)
  rounded(72,480,936,250,28,'rgba(243,207,120,.075)','rgba(243,207,120,.25)')
  ctx.fillStyle='#f3cf78'; ctx.font='900 28px system-ui, sans-serif'; ctx.fillText('PRIZE REACHED',108,535)
  let amountText = formatMoney(result.amount)
  ctx.fillStyle='#fff0c5'; ctx.font='900 82px system-ui, sans-serif'
  while (ctx.measureText(amountText).width > 830 && ctx.font.match(/(\d+)px/)) ctx.font=`900 ${Math.max(48,Number(ctx.font.match(/(\d+)px/)[1])-4)}px system-ui, sans-serif`
  ctx.fillText(amountText,108,640)

  const faced = Number(result.questionsFaced ?? result.questions_faced ?? result.questionsSurvived ?? 0)
  const correct = Number(result.correct ?? result.correct_count ?? 0)
  rounded(72,775,448,170,24,'rgba(255,255,255,.035)','rgba(210,222,243,.12)')
  rounded(540,775,468,170,24,'rgba(255,255,255,.035)','rgba(210,222,243,.12)')
  ctx.fillStyle='#f7f8fc'; ctx.font='800 44px system-ui, sans-serif'; ctx.fillText(`${faced}/50`,108,845); ctx.fillText(`${correct}/50`,576,845)
  ctx.fillStyle='#9eacc2'; ctx.font='600 22px system-ui, sans-serif'; ctx.fillText('QUESTIONS FACED',108,895); ctx.fillText('CORRECT ANSWERS',576,895)
  ctx.strokeStyle='rgba(210,222,243,.16)'; ctx.beginPath(); ctx.moveTo(82,1010); ctx.lineTo(998,1010); ctx.stroke()
  ctx.fillStyle='#f7f8fc'; ctx.font='800 35px system-ui, sans-serif'; ctx.fillText('CAN YOU BEAT ME?',82,1090)
  ctx.fillStyle='#9eacc2'; ctx.font='600 23px system-ui, sans-serif'; ctx.fillText('Take the challenge. Reach ₦1 BILLION.',82,1140)
  ctx.fillStyle='#f3cf78'; ctx.font='800 24px system-ui, sans-serif'; ctx.fillText('BILLION RUSH  ·  JUMI TECH',82,1220)

  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create score card image')),'image/png'))
}
