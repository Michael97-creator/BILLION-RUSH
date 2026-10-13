import './style.css'
import { QUESTIONS } from './data/questions.js'
import { requestFreshQuestions, requestLifeline, questionGenerationConfigured } from './question-generator.js'
import * as audio from './audio.js'
import { isConfigured as isBackendConfigured, createSoloShare, getStorePlayerId, getStoreInventory, initializeStorePurchase, verifyStorePurchase, consumeStoreItem, submitCommunityScore, getCommunityLeaderboard, getLeaderboardPlayerId } from './backend.js'
import { makeScoreCardBlob } from './share-card.js'
import { MILESTONE_QUESTIONS, completedMilestoneCount, milestoneReward, fallbackPrize, runRegularLifelineCount, canUseSecondChance, canUseExtraTime, shouldInvalidateActiveSession, MAX_REGULAR_LIFELINE_USES_PER_GAME, MAX_EXTRA_TIME_USES_PER_GAME, MAX_SECOND_CHANCE_USES_PER_GAME, EXTRA_TIME_SECONDS } from './game-rules.js'

const PUBLIC_APP_URL = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
const getPublicAppUrl = () => PUBLIC_APP_URL || (window.Capacitor?.isNativePlatform?.() ? '' : window.location.origin)

const TOTAL_QUESTIONS = 50
const SECONDS_PER_QUESTION = 30
const MILESTONES = new Set(MILESTONE_QUESTIONS)
const SAVE_KEY = 'billionRush.activeRun.v1'
const PROFILE_KEY = 'billionRush.localStats.v1'
const PLAYER_PROFILE_KEY = 'billionRush.profile.v4'
const COUNTRY_KEY = 'billionRush.country.v1'
const SEEN_KEY = 'billionRush.seenQuestionIds.v1'
const GENERATED_KEY = 'billionRush.generatedQuestions.v1'
const PURCHASED_KEY = 'billionRush.lifelineWallet.v1'
const COUNTRIES = [
  'Nigeria','Ghana','Kenya','South Africa','Egypt','Ethiopia','United States','United Kingdom',
  'India','Canada','Australia','Brazil','France','Germany','Japan','Pakistan','Other'
]
const LIFELINE_PRODUCTS = {
  fifty_single: { label:'50/50', description:'1 additional use', amountNaira:200, grants:{fifty:1}, inventoryKey:'fifty' },
  fifty_triple: { label:'50/50', description:'3 additional uses', amountNaira:500, grants:{fifty:3}, inventoryKey:'fifty' },
  audience_single: { label:'AI Poll Audience', description:'1 additional use', amountNaira:200, grants:{audience:1}, inventoryKey:'audience' },
  audience_triple: { label:'AI Poll Audience', description:'3 additional uses', amountNaira:500, grants:{audience:3}, inventoryKey:'audience' },
  friend_single: { label:'Call-a-Friend', description:'1 additional use', amountNaira:200, grants:{friend:1}, inventoryKey:'friend' },
  friend_triple: { label:'Call-a-Friend', description:'3 additional uses', amountNaira:500, grants:{friend:3}, inventoryKey:'friend' },
  extra_time_single: { label:'Extra Time', description:'1 use · adds 10 seconds', amountNaira:200, grants:{extraTime:1}, inventoryKey:'extraTime' },
  extra_time_five: { label:'Extra Time', description:'5 uses · adds 10 seconds each', amountNaira:800, grants:{extraTime:5}, inventoryKey:'extraTime' },
  second_chance_single: { label:'Second Chance', description:'1 use · replacement question', amountNaira:300, grants:{secondChance:1}, inventoryKey:'secondChance' },
  second_chance_two: { label:'Second Chance', description:'2 uses · replacement questions', amountNaira:500, grants:{secondChance:2}, inventoryKey:'secondChance' },
  // Retained from the existing shop to avoid silently removing an established offer.
  complete_bundle: { label:'Complete Lifeline Bundle', description:'2 extra uses of each regular lifeline', amountNaira:2000, grants:{fifty:2,audience:2,friend:2}, inventoryKey:'bundle' }
}
const STORE_ITEM_KEYS = ['fifty','audience','friend','extraTime','secondChance']
const LADDER = [
  1000,2000,3000,5000,7500,10000,15000,20000,25000,35000,
  50000,75000,100000,150000,200000,250000,350000,500000,750000,1000000,
  1500000,2000000,2500000,3500000,5000000,7500000,10000000,15000000,20000000,25000000,
  35000000,50000000,75000000,100000000,125000000,150000000,200000000,250000000,300000000,350000000,
  400000000,450000000,500000000,600000000,700000000,800000000,900000000,950000000,975000000,1000000000
]
const SAFE = new Set([9,19,29,39,49])
const $ = id => document.getElementById(id)
const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
const shuffle = items => { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a }
const regionFor = country => ({Nigeria:'Africa',Ghana:'Africa',Kenya:'Africa','South Africa':'Africa',Egypt:'Africa',Ethiopia:'Africa','United States':'Americas',Canada:'Americas',Brazil:'Americas','United Kingdom':'Europe',France:'Europe',Germany:'Europe',India:'Asia',Japan:'Asia',Pakistan:'Asia',Australia:'Oceania'})[country] || 'Global'
const difficultyName = d => Number(d)<=1?'EASY':Number(d)===2?'MEDIUM':Number(d)===3?'HARD':'VERY HARD'
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }
let playerProfile = readJSON(PLAYER_PROFILE_KEY, null) || {
  displayName: String(localStorage.getItem('billionRush.displayName.v1') || '').trim().slice(0,24),
  country: localStorage.getItem(COUNTRY_KEY) || 'Nigeria',
  setupComplete: false,
  settings: {sound:true,music:true,vibration:true}
}
playerProfile.settings = {sound:true,music:true,vibration:true,...(playerProfile.settings || {})}
playerProfile.displayName = String(playerProfile.displayName || localStorage.getItem('billionRush.displayName.v1') || '').trim().slice(0,24)
playerProfile.country = COUNTRIES.includes(playerProfile.country) ? playerProfile.country : (localStorage.getItem(COUNTRY_KEY) || 'Nigeria')
let selectedCountry = playerProfile.country
let stats = readJSON(PROFILE_KEY, {best:0,runs:0,questions:0})
function savePlayerProfile() {
  playerProfile.displayName = String(playerProfile.displayName || '').trim().slice(0,24)
  playerProfile.country = COUNTRIES.includes(playerProfile.country) ? playerProfile.country : 'Nigeria'
  playerProfile.settings = {sound:true,music:true,vibration:true,...(playerProfile.settings || {})}
  selectedCountry = playerProfile.country
  localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(playerProfile))
  localStorage.setItem(COUNTRY_KEY, selectedCountry)
  localStorage.setItem('billionRush.displayName.v1', playerProfile.displayName)
}
let lifelineWallet = readJSON(PURCHASED_KEY, {fifty:0,audience:0,friend:0,extraTime:0,secondChance:0})
for (const type of STORE_ITEM_KEYS) lifelineWallet[type] = Math.max(0, Math.floor(Number(lifelineWallet[type]) || 0))
function saveLifelineWallet() { localStorage.setItem(PURCHASED_KEY, JSON.stringify(lifelineWallet)) }
function applyServerInventory(inventory = {}) {
  for (const type of STORE_ITEM_KEYS) lifelineWallet[type] = Math.max(0, Math.floor(Number(inventory[type]) || 0))
  saveLifelineWallet()
}
async function syncStoreInventory({quiet=false} = {}) {
  if (!isBackendConfigured()) return false
  try {
    getStorePlayerId()
    const pending = readJSON('billionRush.pendingPayment.v1', null)
    if (pending?.reference && pending?.playerId) {
      try { const verification = await verifyStorePurchase(pending); if (verification?.verified || verification?.final) localStorage.removeItem('billionRush.pendingPayment.v1') }
      catch (error) { if (!quiet) console.warn('Pending payment has not been verified yet:', error) }
    }
    const result = await getStoreInventory()
    if (!result?.inventory) throw new Error('Inventory response was incomplete.')
    applyServerInventory(result.inventory)
    if (!state && !quiet) render()
    return true
  } catch (error) {
    if (!quiet) console.warn('Could not sync store inventory:', error)
    return false
  }
}
async function consumePurchasedItem(type) {
  if (!isBackendConfigured()) throw new Error('Purchased inventory cannot be confirmed right now. Connect to the game store and try again.')
  const result = await consumeStoreItem(type)
  if (!result?.consumed || !result.inventory) throw new Error('No confirmed purchased uses remain for this item.')
  applyServerInventory(result.inventory)
  return true
}
async function consumeLifelineUse(type) {
  if (!state || state.status !== 'active' || state.lifelines[type] <= 0 || state.lifelinesUsed[type] >= MAX_REGULAR_LIFELINE_USES_PER_GAME) return false
  if (!state.freeLifelines) state.freeLifelines = {fifty:2,audience:2,friend:2}
  if (state.freeLifelines[type] > 0) {
    state.freeLifelines[type] -= 1
  } else {
    try { await consumePurchasedItem(type) }
    catch (error) { showModal('LIFELINE UNAVAILABLE', esc(error?.message || 'Your purchased inventory could not be confirmed.')); return false }
  }
  if (!state || state.status !== 'active') return false
  state.lifelines[type] = Math.max(0, Number(state.lifelines[type] || 0) - 1)
  state.lifelinesUsed[type] = Math.max(0, Number(state.lifelinesUsed[type] || 0)) + 1
  saveRun()
  return true
}
const generatedOnDevice = readJSON(GENERATED_KEY, [])
for (const q of generatedOnDevice) if (q?.id && !QUESTIONS.some(existing => existing.id === q.id)) QUESTIONS.push(q)
let state = null
let timer = null
let modalPausedTimer = false
let checkoutInProgress = false
let secondChancePending = false
const pendingLifelineUses = new Set()

function countryPool(country, source = QUESTIONS) {
  const region = regionFor(country)
  const local = source.filter(q => q.country === country)
  const regional = source.filter(q => q.region === region && q.country !== country)
  const global = source.filter(q => !q.country && q.region !== region)
  const used = new Set()
  const picked = []
  const categoryCounts = new Map()
  const add = (pool, count) => {
    let added = 0
    const candidates = shuffle(pool)
    // First pass favours categories that have appeared less often in this run.
    for (const preferVariety of [true, false]) {
      for (const q of candidates) {
        if (picked.length >= TOTAL_QUESTIONS || added >= count) break
        if (used.has(q.id)) continue
        const category = q.category || 'General Knowledge'
        if (preferVariety && (categoryCounts.get(category) || 0) >= 4) continue
        used.add(q.id); picked.push(q); added += 1
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
      }
    }
  }
  // Aim for local, regional and global knowledge, but never repeat a question in a run.
  add(local, 10)
  add(regional, 10)
  add(global, TOTAL_QUESTIONS-picked.length)
  add(source.filter(q => !used.has(q.id)), TOTAL_QUESTIONS-picked.length)
  return picked.slice(0,TOTAL_QUESTIONS).map(q => ({...q, difficulty: Math.min(4, Number(q.difficulty) || 2)}))
}

function controlledDifficultyMix(items) {
  // Keep difficulty unpredictable while avoiding long, unfair streaks of the same tier.
  for (let attempt=0; attempt<80; attempt++) {
    const candidate=shuffle(items)
    let streak=1, fair=true
    for(let i=1;i<candidate.length;i++){
      const prev=Math.min(4,Number(candidate[i-1].difficulty)||2), now=Math.min(4,Number(candidate[i].difficulty)||2)
      streak=prev===now?streak+1:1
      if(streak>3){fair=false;break}
    }
    if(fair)return candidate
  }
  return shuffle(items)
}

function newRunId() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(36).slice(2,12)}` }
const LEADERBOARD_PENDING_KEY = 'billionRush.leaderboardPending.v1'
function queueLeaderboardPayload(payload) {
  const queue = readJSON(LEADERBOARD_PENDING_KEY, [])
  const index = queue.findIndex(item => item.runId === payload.runId)
  if (index >= 0) queue[index] = payload
  else queue.push(payload)
  localStorage.setItem(LEADERBOARD_PENDING_KEY, JSON.stringify(queue.slice(-100)))
}
function removeQueuedLeaderboardPayload(runId) {
  const queue = readJSON(LEADERBOARD_PENDING_KEY, []).filter(item => item.runId !== runId)
  localStorage.setItem(LEADERBOARD_PENDING_KEY, JSON.stringify(queue))
}
async function syncPendingLeaderboardScores() {
  if (!isBackendConfigured()) return
  const queue = readJSON(LEADERBOARD_PENDING_KEY, [])
  for (const payload of queue) {
    try { await submitCommunityScore(payload); removeQueuedLeaderboardPayload(payload.runId) }
    catch (error) { console.warn('Pending leaderboard score is waiting for a connection:', error); break }
  }
}
async function submitLeaderboardRun() {
  const run = state
  if (!run || !['lost','complete'].includes(run.status) || run.leaderboardSubmitted) return
  const payload = {
    runId: run.runId || (run.runId = newRunId()),
    playerId: getLeaderboardPlayerId(),
    displayName: String(playerProfile.displayName || 'Player').trim().slice(0,24) || 'Player',
    country: String(run.country || selectedCountry || 'Other').slice(0,50),
    prize: Math.max(0, Math.min(1000000000, Math.floor(Number(run.money) || 0))),
    questionsCorrect: Math.max(0, Math.min(TOTAL_QUESTIONS, Math.floor(Number(run.sessionCorrect) || 0))),
    completedAt: new Date().toISOString()
  }
  if (!isBackendConfigured()) { queueLeaderboardPayload(payload); run.leaderboardPending = true; if (state===run) saveRun(); return }
  try {
    await submitCommunityScore(payload); removeQueuedLeaderboardPayload(payload.runId)
    run.leaderboardSubmitted = true; run.leaderboardPending = false; if (state===run) saveRun()
  } catch (error) {
    queueLeaderboardPayload(payload); run.leaderboardPending = true; if (state===run) saveRun()
    console.warn('Leaderboard score queued for retry:', error)
  }
}

async function createRun() {
  try {
    await syncStoreInventory({quiet:true})
    const seen = new Set(readJSON(SEEN_KEY, []))
    let unseen = QUESTIONS.filter(q => !seen.has(q.id))
    const excludedIds = new Set([...seen, ...QUESTIONS.map(q=>q.id)])
    if (unseen.length < TOTAL_QUESTIONS && questionGenerationConfigured()) {
      const requestsNeeded = Math.min(4, Math.ceil((TOTAL_QUESTIONS-unseen.length)/10))
      for (let i=0; i<requestsNeeded && unseen.length<TOTAL_QUESTIONS; i++) {
        try {
          const fresh = await requestFreshQuestions({country:selectedCountry,region:regionFor(selectedCountry),count:Math.min(10,TOTAL_QUESTIONS-unseen.length),excludeIds:[...excludedIds].slice(-1000)})
          const known = new Set(QUESTIONS.map(q=>q.id))
          const novel = fresh.filter(q=>q?.id && !known.has(q.id))
          if (!novel.length) break
          QUESTIONS.push(...novel); generatedOnDevice.push(...novel); novel.forEach(q=>excludedIds.add(q.id))
          localStorage.setItem(GENERATED_KEY,JSON.stringify(generatedOnDevice.slice(-300)))
          unseen = QUESTIONS.filter(q => !seen.has(q.id))
        } catch (error) { console.warn('Question pool replenishment unavailable:',error); break }
      }
    }
    const source = unseen.length >= TOTAL_QUESTIONS ? unseen : QUESTIONS
    const questions = countryPool(selectedCountry, source)
    if (questions.length < TOTAL_QUESTIONS) throw new Error(`Question pool has only ${questions.length} unique questions; ${TOTAL_QUESTIONS} are required.`)
    const region=regionFor(selectedCountry)
    const shuffled = controlledDifficultyMix(questions).slice(0,TOTAL_QUESTIONS).map(q=>({...q, relevance:q.country===selectedCountry?'LOCAL':q.region===region?'REGIONAL':'WORLD'}))
  state = {
    runId:newRunId(), status:'active', country:selectedCountry, questions:shuffled, question:0, money:0, securedMoney:0, lossMoney:0,
    time:SECONDS_PER_QUESTION, deadline:Date.now()+SECONDS_PER_QUESTION*1000,
    lifelines:{fifty:runRegularLifelineCount(2,lifelineWallet.fifty),audience:runRegularLifelineCount(2,lifelineWallet.audience),friend:runRegularLifelineCount(2,lifelineWallet.friend)},
    freeLifelines:{fifty:2,audience:2,friend:2}, lifelinesUsed:{fifty:0,audience:0,friend:0}, usedThisQuestion:[],
    extraTimeRemaining:Math.min(MAX_EXTRA_TIME_USES_PER_GAME,lifelineWallet.extraTime), extraTimeUsed:0,
    secondChanceUses:Math.min(MAX_SECOND_CHANCE_USES_PER_GAME,lifelineWallet.secondChance), secondChanceUsed:0,
    locked:false, possible:[0,1,2,3], feedback:null, reason:'', sessionCorrect:0,
    startedAt:new Date().toISOString(), lastQuestionExplanation:'', lastSelected:null
  }
  saveRun()
    audio.init(); audio.startMusic('game')
    render()
    startTimer()
  } catch (error) { showModal('RUSH UNAVAILABLE',esc(error?.message || 'Unable to prepare a question set. Please try again.')) }
}

function rememberCurrentQuestion() {
  const q=current(); if(!q?.id)return
  const seen=new Set(readJSON(SEEN_KEY,[])); seen.delete(q.id); seen.add(q.id)
  localStorage.setItem(SEEN_KEY,JSON.stringify([...seen].slice(-1000)))
}

function saveRun() {
  // Only a completed loss/results state may be restored. Active sessions are never persisted.
  if (state?.status === 'lost') localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  else if (localStorage.getItem(SAVE_KEY) !== null) localStorage.removeItem(SAVE_KEY)
}
function savedRun() {
  const saved = readJSON(SAVE_KEY, null)
  if (saved?.status === 'active') { localStorage.removeItem(SAVE_KEY); return null }
  if (!saved || saved.status !== 'lost' || !Array.isArray(saved.questions) || saved.questions.length !== TOTAL_QUESTIONS) return null
  return saved
}
async function resumeRun() {
  await syncStoreInventory({quiet:true})
  const saved = savedRun()
  if (!saved) return showModal('NO SAVED RUSH','There is no unfinished game on this device.')
  state = saved
  // Migrate older local saves to the secured-milestone model.
  if (!Number.isFinite(Number(state.securedMoney))) {
    const completedMilestones = completedMilestoneCount(state.question)
    state.securedMoney = completedMilestones > 0 ? (milestoneReward(completedMilestones * 10, LADDER) ?? 0) : 0
  }
  if (!Number.isFinite(Number(state.lossMoney))) state.lossMoney = Number(state.money) || 0
  delete state.continueUsed
  if (!state.freeLifelines) state.freeLifelines = Object.fromEntries(['fifty','audience','friend'].map(type=>[type,Math.max(0,Math.min(2,Number(state.lifelines?.[type] ?? 2)))]))
  if (!state.lifelinesUsed) state.lifelinesUsed = {fifty:0,audience:0,friend:0}
  for (const type of ['fifty','audience','friend']) {
    state.freeLifelines[type] = Math.max(0, Math.min(2, Number(state.freeLifelines[type] ?? 0)))
    state.lifelines[type] = Math.min(Math.max(0,MAX_REGULAR_LIFELINE_USES_PER_GAME-Number(state.lifelinesUsed[type]||0)), state.freeLifelines[type] + lifelineWallet[type])
  }
  state.secondChanceUsed = Math.max(0, Number(state.secondChanceUsed) || 0)
  state.secondChanceUses = Math.min(Math.max(0, MAX_SECOND_CHANCE_USES_PER_GAME - state.secondChanceUsed), lifelineWallet.secondChance)
  selectedCountry = state.country || selectedCountry
  localStorage.setItem(COUNTRY_KEY, selectedCountry)
  if (state.status === 'lost') { render(); return }
  state.time = Math.max(0, Math.min(SECONDS_PER_QUESTION, Number(state.time) || SECONDS_PER_QUESTION))
  if (state.time <= 0) { lose('Time ran out.'); return }
  state.deadline = Date.now() + state.time*1000
  state.locked = false
  render(); startTimer()
}
function current() { return state?.questions?.[state.question] }
function render() {
  document.title = 'Billion Rush — Jumi Tech'
  if(state?.status==='active') rememberCurrentQuestion()
  const q = current()
  const saved = savedRun()
  const screen = !playerProfile.setupComplete ? 'profile-setup' : state?.status === 'active' ? 'game' : state?.status === 'lost' ? 'lost' : state?.status === 'complete' ? 'result' : 'home'
  $('app').innerHTML = `<div class="app-shell"><div class="aurora aurora-a"></div><div class="aurora aurora-b"></div><div class="grid-glow"></div><div class="particle-layer"></div>
    <header class="topbar"><button class="brand" id="homeBtn"><span class="brand-mark">♛</span><span><b>BILLION</b><em>RUSH</em><small>BY JUMI TECH</small></span></button><div class="season-chip"><i></i> 50-QUESTION RUSH <b>•</b> ₦1B GOAL</div><div class="top-actions"><span class="country-pill">🌍 ${esc(state?.country || selectedCountry)}</span>${screen!=='profile-setup'&&screen!=='game'?'<button class="settings-top-btn" id="settingsBtn" aria-label="Open settings">⚙ SETTINGS</button>':''}</div></header>
    <main class="stage">${screen==='profile-setup'?profileSetup():screen==='home'?home(saved):screen==='game'?game(q):screen==='lost'?lost():result()}</main>
    <footer><span><b>JUMI TECH</b> • BUILDING TECHNOLOGY THAT MOVES BUSINESS FORWARD</span><span>50 QUESTIONS • 30 SEC • ₦1B TOP PRIZE</span></footer>
    <div class="modal hidden" id="modal"><div class="modal-backdrop" id="modalBackdrop"></div><div class="modal-card"><button class="modal-close" id="closeModal">×</button><div id="modalContent"></div></div></div></div>`
  bind()
}
function profileSetup() {
  const countryOptions = COUNTRIES.map(c=>`<option value="${esc(c)}" ${c===playerProfile.country?'selected':''}>${esc(c)}</option>`).join('')
  return `<section class="profile-setup-screen"><div class="profile-setup-card"><div class="profile-setup-crown">♛</div><div class="eyebrow"><span>WELCOME TO BILLION RUSH</span><i></i><span>BY JUMI TECH</span></div><h1>CREATE YOUR <span>PLAYER PROFILE</span></h1><p>Choose the name your friends will see and your country for a more personal Rush. No email or password required.</p><form id="profileSetupForm" class="profile-form"><label for="profileDisplayName">DISPLAY NAME<input id="profileDisplayName" name="displayName" maxlength="24" autocomplete="nickname" placeholder="e.g. Rush King" value="${esc(playerProfile.displayName)}" required /></label><label for="profileCountry">SELECT YOUR COUNTRY<select id="profileCountry" name="country" required>${countryOptions}</select></label><button class="cta mega" type="submit"><span>CREATE PROFILE & CONTINUE</span><b>↗</b></button></form><small class="profile-local-note">Your profile is saved on this device. You can edit it later in Settings.</small></div></section>`
}

function home(saved) {
  return `<section class="home-screen"><div class="hero-copy"><div class="eyebrow"><span>THE KNOWLEDGE GAME OF NERVE</span><i></i><span>ONE BILLION GOAL</span></div><div class="hero-logo"><div class="crown-orb">♛</div><div><div class="hero-title"><span>BILLION</span><strong>RUSH</strong></div><div class="hero-sub">50 QUESTIONS <b>×</b> 30 SECONDS <b>×</b> ₦1 BILLION</div></div></div><h1>How far can your mind <span>take you?</span></h1><p>Fifty questions. Unpredictable difficulty. A mix of local, regional and world knowledge. Use your lifelines wisely and chase the ₦1 billion top prize.</p>
    <div class="profile-summary"><span class="profile-summary-avatar">♛</span><div><small>PLAYER PROFILE</small><strong>${esc(playerProfile.displayName)}</strong><span>🌍 ${esc(selectedCountry)}</span></div><button class="text-btn" id="editProfileBtn">EDIT PROFILE</button></div>
    <div class="hero-actions"><button class="cta mega" id="startBtn"><span>START A NEW RUSH</span><b>↗</b></button>${saved?'<button class="ghost-cta" id="continueBtn">VIEW LAST RESULT <span>▶</span></button>':''}<button class="ghost-cta" id="leaderboardBtn">🏆 LEADERBOARD <span>↗</span></button><button class="ghost-cta" id="shopBtn">LIFELINE SHOP <span>₦</span></button><button class="ghost-cta" id="howBtn">HOW TO PLAY <span>▶</span></button></div>
    <div class="stat-strip"><div><b>50</b><span>QUESTIONS</span></div><div><b>30s</b><span>PER QUESTION</span></div><div><b>6</b><span>FREE LIFELINES</span></div><div><b>₦1B</b><span>TOP PRIZE</span></div></div></div>
    <aside class="home-rail"><div class="player-card"><div class="player-top"><div class="avatar big">♛</div><div><small>YOUR LOCAL RECORD</small><h3>RUSH HISTORY</h3><span>No account needed • saved on this device</span></div></div><div class="best-line"><span>PERSONAL BEST</span><b>${money(stats.best)}</b></div><div class="best-line"><span>GAMES PLAYED</span><b>${Number(stats.runs||0)}</b></div><div class="best-line"><span>QUESTIONS ANSWERED</span><b>${Number(stats.questions||0)}</b></div></div>
    <div class="challenge-card"><div><span class="live-badge"><i></i> YOUR CHALLENGE</span><h3>THE DAILY RUSH</h3><p>Country-aware questions, global knowledge and a random difficulty mix.</p></div><button id="dailyBtn">PLAY<br><b>→</b></button></div>
    <div class="lifeline-info"><b>YOUR STARTING LIFELINES</b><div>🌓 50/50 <strong>×2</strong></div><div>👥 AI Poll <strong>×2</strong></div><div>📞 Call-a-Friend <strong>×2</strong></div><small>Purchased uses carry over between games. Shop before your next Rush for Extra Time and Second Chance too.</small><div class="inventory-mini"><span>EXTRA TIME <b>×${lifelineWallet.extraTime}</b></span><span>SECOND CHANCE <b>×${lifelineWallet.secondChance}</b></span></div></div></aside></section>`
}
function game(q) {
  if (!q) return `<section class="empty-state"><h1>No question found</h1><button class="cta" id="backHome">BACK HOME</button></section>`
  const ladder = `<aside class="prize-ladder reveal-ladder"><div class="ladder-head"><span>THE LADDER</span><b>₦1B</b></div><div class="ladder-scroll">${LADDER.map((n,i)=>`<div class="rung ${i===state.question?'active':''} ${i<state.question?'passed':''} ${SAFE.has(i)?'safe':''}"><span>${i+1}</span><b>${money(n)}</b>${SAFE.has(i)?'<i>◆</i>':''}</div>`).reverse().join('')}</div></aside>`
  const options = q.a.map((a,i)=>`<button class="answer ${state.possible.includes(i)?'':'eliminated'} ${state.feedback?.type==='correct'&&i===state.feedback.selected?'feedback-correct':''} ${state.feedback?.type==='wrong'&&i===state.feedback.selected?'feedback-wrong':''} ${state.feedback?.type==='wrong'&&i===q.correct?'correct-answer':''}" data-answer="${i}" ${(!state.possible.includes(i)||state.locked)?'disabled':''}><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${esc(a)}</span><b>↗</b></button>`).join('')
  return `<section class="game-screen focused-game"><div class="game-top"><div class="question-count"><small>QUESTION</small><strong>${String(state.question+1).padStart(2,'0')} <em>/ ${TOTAL_QUESTIONS}</em></strong><span>${esc(q.category||'GENERAL')} • ${esc(q.relevance||'WORLD')}</span></div><div class="timer-wrap"><div class="timer-ring ${state.time<=7?'danger':''}" style="--progress:${(state.time/SECONDS_PER_QUESTION)*360}deg"><div><strong>${state.time}</strong><small>SEC</small></div></div></div></div><div class="focus-progress"><i style="width:${(state.question/TOTAL_QUESTIONS)*100}%"></i></div><div class="game-body focused-body">${ladder}<div class="question-zone"><div class="question-card"><div class="question-kicker"><span>RUSH ${String(state.question+1).padStart(2,'0')}</span><span>${esc(q.relevance||'WORLD')}</span></div><h2>${esc(q.q)}</h2><div class="answers">${options}</div>${state.feedback?`<p class="answer-explanation">${esc(q.explanation||'Keep going.')}</p>`:''}</div><div class="game-controls"><div class="lifelines"><button class="life" data-life="fifty" ${state.lifelines.fifty<=0||state.lifelinesUsed.fifty>=MAX_REGULAR_LIFELINE_USES_PER_GAME||state.locked||state.usedThisQuestion.includes('fifty')?'disabled':''}><span class="life-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4h10M7 20h10M8 4c0 5 8 5 8 8s-8 3-8 8M16 4c0 5-8 5-8 8s8 3 8 8"/></svg></span><b>50/50</b><small>×${state.lifelines.fifty}</small></button><button class="life" data-life="audience" ${state.lifelines.audience<=0||state.lifelinesUsed.audience>=MAX_REGULAR_LIFELINE_USES_PER_GAME||state.locked||state.usedThisQuestion.includes('audience')?'disabled':''}><span class="life-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 16v-4M12 16V7M16 16v-7M20 16V3"/></svg></span><b>AI POLL</b><small>×${state.lifelines.audience}</small></button><button class="life" data-life="friend" ${state.lifelines.friend<=0||state.lifelinesUsed.friend>=MAX_REGULAR_LIFELINE_USES_PER_GAME||state.locked||state.usedThisQuestion.includes('friend')?'disabled':''}><span class="life-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h3l2 5-2 2a15 15 0 0 0 4 4l2-2 5 2v3c0 1-1 2-2 2C10 19 5 14 5 5c0-1 1-2 2-2Z"/></svg></span><b>CALL A FRIEND</b><small>×${state.lifelines.friend}</small></button><button class="life" data-life="extraTime" ${!canUseExtraTime(state.extraTimeRemaining,state.extraTimeUsed,state.usedThisQuestion.includes('extraTime'))||state.locked?'disabled':''}><span class="life-icon" aria-hidden="true">＋10s</span><b>EXTRA TIME</b><small>×${state.extraTimeRemaining}</small></button><button class="life walk-life" id="walkBtn" ${state.locked?'disabled':''}><span class="life-icon" aria-hidden="true">↗</span><b>WALK AWAY</b><small>KEEP PRIZE</small></button></div><div class="game-bottom"><div><small>ACCUMULATED THIS RUSH</small><b>${money(state.money)}</b><small class="secured-label">LAST SECURED MILESTONE: ${money(state.securedMoney||0)}</small></div></div></div></div></div></section>`
}
function lost() {
  const q = current()
  const canSecondChance = canUseSecondChance(state.secondChanceUses, state.secondChanceUsed) && Boolean(findReplacementQuestion())
  return `<section class="result-screen"><div class="result-halo"><span>✦</span></div><div class="eyebrow"><span>RUSH INTERRUPTED</span><i></i><span>QUESTION ${state.question+1} OF ${TOTAL_QUESTIONS}</span></div><h1>RUSH <span>OVER</span></h1><div class="result-money">${money(state.money)}</div><p>${esc(state.reason)}</p>${q?`<div class="answer-explanation loss-answer"><b>Correct answer: ${String.fromCharCode(65+q.correct)}. ${esc(q.a[q.correct])}</b><br>${esc(q.explanation||'') }</div>`:''}<div class="result-grid"><div><small>LADDER POSITION</small><b>${state.question+1}/${TOTAL_QUESTIONS}</b></div><div><small>COUNTRY</small><b>${esc(state.country)}</b></div><div><small>CORRECT</small><b>${Number(state.sessionCorrect||0)}</b></div><div><small>SECOND CHANCES LEFT</small><b>${Math.max(0,Number(state.secondChanceUses||0))}</b></div></div><div class="result-actions">${canSecondChance?'<button class="cta" id="secondChanceBtn"><span>USE SECOND CHANCE</span><b>↻</b></button>':''}<button class="cta" id="againBtn"><span>START A NEW RUSH</span><b>↗</b></button><button class="ghost-cta" id="endRunBtn">END RUSH</button><button class="ghost-cta" id="shareBtn">SHARE MY SCORE ↗</button><button class="ghost-cta" id="downloadCardBtn">DOWNLOAD SCORE CARD ↓</button><button class="text-btn" id="viewStatsBtn">VIEW MY STATS</button></div><div class="result-nudge">${canSecondChance?'Use a purchased Second Chance to face a different question at this same ladder position.':'Start a new Rush for free whenever you are ready.'} Share your result and challenge friends to beat your Rush.</div></section>`
}
function result() {
  const won = state?.money >= 1000000000
  return `<section class="result-screen ${won?'winner':''}"><div class="result-halo"><span>${won?'♛':'✦'}</span></div><div class="eyebrow"><span>${won?'THE CROWN IS YOURS':'RUSH COMPLETE'}</span><i></i><span>${state.question+1} QUESTIONS FACED</span></div><h1>${won?'YOU MADE IT.':'YOUR RUSH'} <span>${won?'₦1 BILLION':'IS COMPLETE'}</span></h1><div class="result-money">${money(state.money)}</div><p>${esc(state.reason||'Every run makes you sharper. The ladder is waiting.')}</p><div class="result-grid"><div><small>QUESTIONS REACHED</small><b>${state.question+1}/${TOTAL_QUESTIONS}</b></div><div><small>PERSONAL BEST</small><b>${money(stats.best)}</b></div><div><small>COUNTRY</small><b>${esc(state.country)}</b></div></div><div class="result-actions"><button class="cta" id="againBtn"><span>RUN IT BACK</span><b>↗</b></button><button class="ghost-cta" id="shareBtn">SHARE MY SCORE <span>↗</span></button><button class="ghost-cta" id="downloadCardBtn">DOWNLOAD SCORE CARD ↓</button><button class="text-btn" id="viewStatsBtn">VIEW MY STATS</button></div>${won?'<div class="winner-message">Fifty questions. One billion naira. You took the crown. 👑</div>':'<div class="result-nudge">The ladder is still waiting. Start a fresh run whenever you are ready.</div>'}</section>`
}
function startTimer() {
  clearInterval(timer)
  let lastShown = state?.time
  timer = setInterval(() => {
    if (!state || state.status !== 'active') return clearInterval(timer)
    const next = Math.max(0, Math.ceil((state.deadline-Date.now())/1000))
    state.time = next
    if (next !== lastShown) {
      lastShown = next
      const ring = document.querySelector('.timer-ring')
      const label = ring?.querySelector('strong')
      if (label) label.textContent = String(next)
      if (ring) { ring.classList.toggle('danger', next <= 7); ring.style.setProperty('--progress', `${(next/SECONDS_PER_QUESTION)*360}deg`) }
      saveRun()
    }
    if (next <= 0) { clearInterval(timer); lose('Time ran out.'); return }
  }, 200)
}
function nextQuestion() {
  if (state.question >= TOTAL_QUESTIONS-1) { complete(); return }
  state.question += 1
  state.time = SECONDS_PER_QUESTION
  state.deadline = Date.now()+SECONDS_PER_QUESTION*1000
  state.locked = false
  state.possible = [0,1,2,3]
  state.usedThisQuestion = []
  state.feedback = null
  saveRun(); render(); startTimer()
}
function answer(index) {
  if (!state || state.status!=='active' || state.locked || !state.possible.includes(index)) return
  state.locked = true; clearInterval(timer); state.lastSelected=index
  const q=current(); const correct=index===q.correct
  state.feedback={type:correct?'correct':'wrong',selected:index,correct:q.correct}
  if(playerProfile.settings.vibration && navigator.vibrate)navigator.vibrate(25)
  if(correct) {
    audio.correct()
    state.money=LADDER[state.question]; state.sessionCorrect += 1
    state.reason='Correct answer. You climbed another rung.'
    const reached=state.question+1
    const milestoneReached=MILESTONES.has(reached)
    if(milestoneReached) {
      audio.ladder()
      state.securedMoney=milestoneReward(reached,LADDER) ?? state.money
      state.lastMilestoneQuestion=reached
      state.reason=`Milestone ${reached} secured. Your protected prize is ${money(state.securedMoney)}.`
    }
    saveRun(); render()
    setTimeout(async()=>{
      if(!state || state.status!=='active')return
      if(state.question===TOTAL_QUESTIONS-1){complete();return}
      if(milestoneReached) {
        showChoiceModal(`RUSH ${reached} MILESTONE SECURED`, `<p>You answered ${reached} questions correctly.</p><div class="milestone-reward"><small>YOUR PROTECTED PRIZE</small><strong>${money(state.securedMoney)}</strong></div><p>Your milestone is safe. Continue climbing toward ₦1 billion.</p>`, [
          {label:'CONTINUE THE RUSH →',run:()=>{ $('modal')?.classList.add('hidden'); modalPausedTimer=false; if(state?.status==='active') nextQuestion() }}
        ])
        // A milestone is a required transition: don't let the close button/backdrop
        // dismiss the celebration and leave the locked question stranded.
        $('closeModal').style.display='none'; $('modalBackdrop').style.pointerEvents='none'
        return
      }
      nextQuestion()
    },850)
  } else {
    audio.wrong()
    state.lastQuestionExplanation=q.explanation||''
    state.lossMoney=Number(state.money)||0
    state.reason='That answer was incorrect. Your Rush falls back to your last secured milestone.'
    saveRun(); render()
    setTimeout(()=>lose('That answer was incorrect.'),850)
  }
}
function recordLostRunStats() {
  if(!state || state.statsRecorded) return
  stats.best=Math.max(Number(stats.best||0),Number(state.money||0))
  stats.runs=Number(stats.runs||0)+1
  stats.questions=Number(stats.questions||0)+Math.min(TOTAL_QUESTIONS,Math.max(1,Number(state.question||0)+1))
  state.statsRecorded=true
  localStorage.setItem(PROFILE_KEY,JSON.stringify(stats))
}
function lose(reason) {
  if(!state || state.status!=='active') return
  clearInterval(timer)
  state.lossMoney=Number(state.money)||Number(state.lossMoney)||0
  state.money=fallbackPrize(state.securedMoney)
  state.status='lost'; state.reason=reason; state.locked=true
  audio.gameOver()
  saveRun(); render()
  if (!canUseSecondChance(state.secondChanceUses, state.secondChanceUsed) || !findReplacementQuestion()) submitLeaderboardRun()
}
function complete() {
  clearInterval(timer); state.status='complete'; state.question=TOTAL_QUESTIONS-1; state.money=1000000000; state.securedMoney=1000000000; state.reason='You answered all 50 questions correctly and reached the top of the ladder.'
  stats.best=Math.max(Number(stats.best||0),state.money); stats.runs=Number(stats.runs||0)+1; stats.questions=Number(stats.questions||0)+TOTAL_QUESTIONS
  localStorage.setItem(PROFILE_KEY,JSON.stringify(stats)); saveRun(); audio.stopMusic(); audio.victory(); render(); submitLeaderboardRun()
}
function endRun() {
  if(!state)return
  clearInterval(timer)
  if(String(state.reason||'').includes('Walk Away')) audio.walk()
  if(state.status==='lost') recordLostRunStats()
  else {
    stats.best=Math.max(Number(stats.best||0),Number(state.money||0))
    stats.runs=Number(stats.runs||0)+1
    const answeredThisRun = Number(state.question||0)
    stats.questions=Number(stats.questions||0)+answeredThisRun
    localStorage.setItem(PROFILE_KEY,JSON.stringify(stats))
  }
  state.status='complete'; state.reason=state.reason||'You walked away from the Rush with your accumulated prize.'; saveRun(); audio.stopMusic(); render(); submitLeaderboardRun()
}
const lifeLabel = type => ({fifty:'50/50',audience:'AI Poll Audience',friend:'Call-a-Friend',extraTime:'Extra Time',secondChance:'Second Chance'})[type]||type
function openLifelineShop() {
  if (state && ['active','lost'].includes(state.status)) return showModal('SHOP BEFORE YOUR NEXT RUSH','Purchases are only available before a new game starts.')
  const modal=$('modal')
  if(!modal)return
  modal.querySelector('.modal-card')?.classList.remove('friend-picker-card')
  const items=Object.entries(LIFELINE_PRODUCTS)
  $('modalContent').innerHTML=`<div class="modal-symbol">✦</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>POWER UP YOUR NEXT RUSH</span></div><h2>LIFELINE SHOP</h2><p>Every new Rush starts with two free uses of each regular lifeline. Purchased uses carry over between games. All purchases must be completed before gameplay begins.</p><label class="payment-email-label">EMAIL FOR PAYMENT RECEIPT<input id="paymentEmail" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(localStorage.getItem('billionRush.paymentEmail.v1')||'')}" /></label><div class="shop-products">${items.map(([id,item])=>`<article class="shop-product ${id==='complete_bundle'?'featured':''}"><div><b>${esc(item.label)}</b><small>${esc(item.description)}${item.inventoryKey!=='bundle'?` · Owned: ${Number(lifelineWallet[item.inventoryKey]||0)}`:''}</small></div><strong>₦${item.amountNaira.toLocaleString('en-NG')}</strong><button class="${id==='complete_bundle'?'cta':'ghost-cta'}" data-buy-product="${id}">BUY ↗</button></article>`).join('')}</div><p class="shop-footnote">Secure Paystack checkout · Purchased items are added only after server verification.</p><button class="ghost-cta" id="shopCloseBtn">CLOSE SHOP</button>`
  modal.classList.remove('hidden')
  modal.querySelectorAll('[data-buy-product]').forEach(button=>button.addEventListener('click',async()=>purchaseShopPack(button.dataset.buyProduct)))
  $('shopCloseBtn').onclick=closeModal
}
async function purchaseShopPack(packId) {
  if(checkoutInProgress) return false
  const product=LIFELINE_PRODUCTS[packId]
  if(!product)return false
  if(state && ['active','lost'].includes(state.status)) { showModal('SHOP BEFORE YOUR NEXT RUSH','Purchases are only available before a new game starts. No checkout was opened.'); return false }
  if(!isBackendConfigured()) { showModal('SHOP TEMPORARILY UNAVAILABLE','The secure store connection has not been configured yet. No items have been added.'); return false }
  const email=String($('paymentEmail')?.value||'').trim().toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showModal('EMAIL REQUIRED','Enter a valid email address so Paystack can process the payment and send its receipt. No items have been added.'); return false }
  localStorage.setItem('billionRush.paymentEmail.v1',email)
  checkoutInProgress=true
  try {
    const playerId=getStorePlayerId()
    const result=await initializeStorePurchase({productId:packId,email,playerId})
    if(!result?.authorizationUrl||!result?.reference) throw new Error('Paystack did not return a checkout link.')
    localStorage.setItem('billionRush.pendingPayment.v1',JSON.stringify({reference:result.reference,playerId}))
    if(window.Capacitor?.isNativePlatform?.()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({url:result.authorizationUrl,presentationStyle:'popover'})
      showModal('COMPLETE YOUR PAYMENT','Paystack checkout opened securely. Complete or cancel the payment there, then return to Billion Rush. Your inventory changes only after the server verifies payment.')
    } else {
      window.location.assign(result.authorizationUrl)
    }
    return true
  } catch(error) {
    console.error('Paystack checkout could not start:',error)
    showModal('PURCHASE NOT COMPLETED',esc(error?.message||'Checkout could not be started. No items were added. Please try again later.'))
    return false
  } finally { checkoutInProgress=false }
}
async function useExtraTime() {
  if(!state||state.status!=='active'||state.locked||pendingLifelineUses.has('extraTime')) return
  if(!canUseExtraTime(state.extraTimeRemaining,state.extraTimeUsed,state.usedThisQuestion.includes('extraTime'))) return
  pendingLifelineUses.add('extraTime')
  pauseTimerForModal()
  try { await consumePurchasedItem('extraTime') }
  catch(error) { showModal('EXTRA TIME UNAVAILABLE',esc(error?.message||'Your purchased Extra Time could not be confirmed.')); pendingLifelineUses.delete('extraTime'); return }
  if(!state||state.status!=='active') { pendingLifelineUses.delete('extraTime'); return }
  state.extraTimeRemaining=Math.max(0,state.extraTimeRemaining-1)
  state.extraTimeUsed=Math.max(0,state.extraTimeUsed)+1
  state.usedThisQuestion.push('extraTime')
  state.time=Math.max(0,Number(state.time)||0)+EXTRA_TIME_SECONDS
  state.deadline=Date.now()+state.time*1000
  modalPausedTimer=false; pendingLifelineUses.delete('extraTime')
  audio.lifeline(); saveRun(); render(); startTimer()
}
function findReplacementQuestion() {
  if(!state?.questions?.length) return null
  const usedIds=new Set(state.questions.map(q=>q?.id).filter(Boolean))
  const candidates=QUESTIONS.filter(q=>q?.id&&!usedIds.has(q.id))
  if(!candidates.length) return null
  const difficulty=Number(current()?.difficulty)||2
  return shuffle(candidates.filter(q=>(Number(q.difficulty)||2)===difficulty).length?candidates.filter(q=>(Number(q.difficulty)||2)===difficulty):candidates)[0] || null
}
async function useSecondChance() {
  if(secondChancePending||!state||state.status!=='lost'||!canUseSecondChance(state.secondChanceUses,state.secondChanceUsed)) return
  const replacement=findReplacementQuestion()
  if(!replacement) { showModal('NO REPLACEMENT QUESTION','There is no unused replacement question available right now. Your owned Second Chance has not been used.'); return }
  secondChancePending=true
  const button=$('secondChanceBtn'); if(button)button.disabled=true
  const lostState=state
  // From the moment the player chooses to resume, backgrounding must void the Rush.
  state.status='active'
  localStorage.removeItem(SAVE_KEY)
  try { await consumePurchasedItem('secondChance') }
  catch(error) {
    secondChancePending=false
    if(state===lostState && state.status==='active') { state.status='lost'; saveRun(); showModal('SECOND CHANCE UNAVAILABLE',esc(error?.message||'Your purchased Second Chance could not be confirmed.')) }
    return
  }
  if(state!==lostState || state.status!=='active') { secondChancePending=false; return }
  state.secondChanceUses=Math.max(0,state.secondChanceUses-1)
  state.secondChanceUsed=Math.max(0,state.secondChanceUsed)+1
  state.questions[state.question]=replacement
  state.status='active'; state.time=SECONDS_PER_QUESTION; state.deadline=Date.now()+SECONDS_PER_QUESTION*1000
  state.locked=false; state.possible=[0,1,2,3]; state.usedThisQuestion=[]; state.feedback=null
  state.reason=''; state.lossMoney=0; state.lastQuestionExplanation=''; state.lastSelected=null
  secondChancePending=false
  saveRun(); audio.init(); audio.startMusic('game'); render(); startTimer()
}
async function useLife(type) {
  if(!state || state.status!=='active' || state.locked) return
  if(type==='extraTime') { await useExtraTime(); return }
  if(state.usedThisQuestion.includes(type)) return
  if(!['fifty','audience','friend'].includes(type)) return
  if(state.lifelines[type]<=0 || state.lifelinesUsed[type]>=MAX_REGULAR_LIFELINE_USES_PER_GAME) {
    showModal('NO USES LEFT',`You have no ${lifeLabel(type)} uses left for this Rush. Visit the Lifeline Shop before starting your next game to buy more.`); return
  }
  if(type==='friend') { showFriendPicker(); return }
  if(pendingLifelineUses.has(type)) return
  pendingLifelineUses.add(type)
  const consumed=await consumeLifelineUse(type)
  if(!consumed || !state || state.status!=='active') { pendingLifelineUses.delete(type); return }
  state.usedThisQuestion.push(type); audio.lifeline()
  const q=current()
  if(type==='fifty') {
    const wrong=shuffle([0,1,2,3].filter(i=>i!==q.correct)).slice(0,2)
    state.possible=[q.correct,...[0,1,2,3].filter(i=>i!==q.correct&&!wrong.includes(i))]
    saveRun(); render(); pendingLifelineUses.delete(type); return
  }
  if(type==='audience') {
    pauseTimerForModal()
    let response=null
    try { response=await requestLifeline({type:'audience',country:state.country,question:q.q,options:q.a}) }
    catch(error) { console.warn('AI audience unavailable; using local simulation:',error) }
    let percentages=response?.percentages
    if(!percentages || !['A','B','C','D'].every(k=>Number.isFinite(Number(percentages[k])))) {
      const raw=[0,1,2,3].map(()=>Math.random()**0.75+0.08); const sum=raw.reduce((a,b)=>a+b,0)
      const values=raw.map(x=>Math.round(x/sum*100)); values[0]+=100-values.reduce((a,b)=>a+b,0)
      percentages=Object.fromEntries(['A','B','C','D'].map((k,i)=>[k,values[i]]))
    }
    if(!state||state.status!=='active') { pendingLifelineUses.delete(type); return }
    saveRun(); render(); showAudience(percentages,response?.note); pendingLifelineUses.delete(type); return
  }
  // Call-a-Friend is handled by the selectable character picker above.
  pendingLifelineUses.delete(type)
}
const FRIENDS = [
  {id:'professor',name:'Professor',avatar:'🧠',strength:'Science & general knowledge',style:'careful, analytical and measured',bias:['Science','Technology','General Knowledge','Mathematics'],voice:'Let me think this through carefully.'},
  {id:'detective',name:'Detective',avatar:'🕵️',strength:'Logic & reasoning',style:'observant, logical and concise',bias:['Logic','General Knowledge','Mathematics','History'],voice:'The clues point me toward…'},
  {id:'grandma',name:'Grandma',avatar:'👵',strength:'Culture & history',style:'warm, wise and traditional',bias:['Culture','History','Religion','Food'],voice:'My dear, I would say…'},
  {id:'funny-friend',name:'Funny Friend',avatar:'😂',strength:'Playful wild guesses',style:'playful, humorous and unpredictable',bias:[],voice:'Omo, no laugh if I miss this…'},
  {id:'tech-expert',name:'Tech Expert',avatar:'💻',strength:'Technology & computers',style:'precise, technical and direct',bias:['Technology','Science','Computers'],voice:'From a technical point of view…'},
  {id:'football-fan',name:'Football Fan',avatar:'⚽',strength:'Football & sports',style:'energetic and competitive',bias:['Sports','Football'],voice:'I watch my sports, so I think…'},
  {id:'music-lover',name:'Music Lover',avatar:'🎤',strength:'Music & pop culture',style:'expressive and upbeat',bias:['Music','Entertainment','Pop Culture'],voice:'This one sounds familiar…'},
  {id:'bookworm',name:'Bookworm',avatar:'📚',strength:'Literature & history',style:'thoughtful and articulate',bias:['Literature','History','Books','Language'],voice:'Based on what I have read…'},
  {id:'lucky-gambler',name:'Lucky Gambler',avatar:'🎲',strength:'Bold, risky guesses',style:'bold, dramatic and risk-taking',bias:[],voice:'I am taking a chance on…'},
  {id:'dr-know',name:'Dr. Know',avatar:'🧑‍⚕️',strength:'Health & biology',style:'calm and evidence-minded',bias:['Health','Biology','Medicine','Science'],voice:'My best informed guess is…'},
  {id:'world-traveller',name:'World Traveller',avatar:'🧳',strength:'Geography & landmarks',style:'curious, worldly and observant',bias:['Geography','Travel','Landmarks','World'],voice:'I remember seeing or learning that…'},
  {id:'street-smart',name:'Street Smart',avatar:'🧑‍🍳',strength:'Everyday knowledge & common sense',style:'practical, quick and down-to-earth',bias:['Everyday Knowledge','Food','Business','General Knowledge'],voice:'Think about it in real life…'}
]
function showFriendPicker() {
  pauseTimerForModal()
  const modal=$('modal')
  $('modalContent').innerHTML=`<div class="modal-symbol">☎</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>CHOOSE YOUR FRIEND</span></div><h2>Who are you calling?</h2><p>Choose carefully. Once you place the call and receive a response, this lifeline is spent—even if your friend is wrong.</p><div class="friend-grid">${FRIENDS.map(f=>`<button class="friend-card" data-friend="${f.id}"><span>${f.avatar}</span><b>${f.name}</b><small>${f.strength}</small><em>CALL FRIEND ↗</em></button>`).join('')}</div><button class="ghost-cta friend-cancel" id="friendCancel">CANCEL — KEEP MY LIFELINE</button>`
  modal.querySelector('.modal-card')?.classList.add('friend-picker-card')
  modal.classList.remove('hidden')
  modal.querySelectorAll('[data-friend]').forEach(button=>button.addEventListener('click',()=>{
    const friend=FRIENDS.find(f=>f.id===button.dataset.friend)
    if(!friend || !state || state.status!=='active' || state.lifelines.friend<=0 || state.usedThisQuestion.includes('friend')) { closeModal(); return }
    // Selecting a character commits the call. Lock the picker while the response is prepared;
    // the lifeline is deducted when the response is ready, and the player cannot shop around.
    state.friendCallPending=true
    state.pendingFriendId=friend.id
    $('modalContent').innerHTML=`<div class="modal-symbol">☎</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>CALL IN PROGRESS</span></div><h2>Calling ${esc(friend.name)}…</h2><p>Your friend is thinking. Once the response arrives, this lifeline will be used.</p><div class="friend-call-loading">${friend.avatar}<span>Preparing response…</span></div>`
    modal.querySelectorAll('[data-friend]').forEach(b=>b.disabled=true)
    const cancel=$('friendCancel'); if(cancel) cancel.disabled=true
    callFriend(friend)
  }))
  $('friendCancel').onclick=closeModal
}
async function callFriend(friend) {
  const q=current()
  let response=null
  try { response=await requestLifeline({type:'friend',country:state.country,question:q.q,options:q.a,character:{name:friend.name,style:friend.style,strength:friend.strength,bias:friend.bias,voice:friend.voice}}) }
  catch(error) { console.warn('AI friend unavailable; using local simulation:',error) }
  // Offline fallback: a friend's category strengths gently influence a guess, but never guarantee correctness.
  let suggestion=response?.suggestion
  if(!['A','B','C','D'].includes(String(suggestion).toUpperCase())) {
    const category=String(q.category||'').toLowerCase()
    const specialist=friend.bias.some(term=>category.includes(term.toLowerCase()))
    const chance=specialist ? 0.67 : ((friend.id==='funny-friend'||friend.id==='lucky-gambler') ? 0.25 : 0.43)
    const correct=Math.random()<chance
    const index=correct?q.correct:shuffle([0,1,2,3].filter(i=>i!==q.correct))[0]
    suggestion=['A','B','C','D'][index]
  }
  suggestion=String(suggestion).toUpperCase()
  const confidence=Number(response?.confidence)|| (friend.id==='lucky-gambler'?78:friend.id==='funny-friend'?55:58+Math.floor(Math.random()*28))
  // The selected character commits the call; do not allow cycling through friends.
  if(!state || state.status!=='active' || !state.friendCallPending) return
  const consumed=await consumeLifelineUse('friend')
  if(!consumed || !state || state.status!=='active') return
  if(!state.usedThisQuestion.includes('friend')) state.usedThisQuestion.push('friend')
  state.friendCallPending=false; state.pendingFriendId=null
  audio.lifeline(); saveRun(); render()
  showModal(`${friend.avatar} ${esc(friend.name.toUpperCase())} IS ON THE LINE`,`<div class="friend-result"><div class="friend-avatar">${friend.avatar}</div><div class="eyebrow"><span>${esc(friend.strength)}</span></div><h2>“I'd go with ${esc(suggestion)}.”</h2><div class="confidence"><span>CONFIDENCE</span><b>${Math.max(50,Math.min(90,confidence))}%</b></div><p>${esc(q.a['ABCD'.indexOf(suggestion)] || '')}</p></div>`)
}
function showAudience(p) {
  const max=Math.max(...Object.values(p))
  showModal('AI POLL RESULTS',`<div class="audience-poll"><div class="poll-head"><span>THE ROOM HAS VOTED</span><b>100 VOTES</b></div>${['A','B','C','D'].map(l=>`<div class="poll-row"><span>${l}</span><div><i style="width:${p[l]}%"></i></div><b>${p[l]}%</b></div>`).join('')}</div><p class="modal-muted">Most votes went to <strong>${Object.keys(p).find(k=>p[k]===max)}</strong>.</p>`)
}
function pauseTimerForModal() {
  if(state?.status!=='active' || modalPausedTimer) return
  state.time=Math.max(1,Math.ceil((state.deadline-Date.now())/1000))
  clearInterval(timer); timer=null; state.deadline=Date.now()+state.time*1000; modalPausedTimer=true; saveRun()
}
function resumeTimerFromModal() {
  if(!modalPausedTimer) return
  modalPausedTimer=false
  if(state?.status==='active') { state.deadline=Date.now()+Math.max(1,state.time)*1000; saveRun(); startTimer() }
}
function showModal(title,body) {
  pauseTimerForModal()
  const modal=$('modal'); if(!modal)return
  modal.querySelector('.modal-card')?.classList.remove('friend-picker-card')
  $('modalContent').innerHTML=`<div class="modal-symbol">✦</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>PLAY SMART</span></div><h2>${title}</h2><div class="modal-copy">${body}</div><button class="cta" id="modalOk"><span>BACK TO THE RUSH</span><b>→</b></button>`
  modal.classList.remove('hidden'); $('modalOk').onclick=closeModal
}
function showChoiceModal(title,body,choices) {
  pauseTimerForModal()
  const modal=$('modal'); if(!modal)return
  modal.querySelector('.modal-card')?.classList.remove('friend-picker-card')
  $('modalContent').innerHTML=`<div class="modal-symbol">✦</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>LIFELINE SHOP</span></div><h2>${title}</h2><p>${body}</p><div class="choice-buttons">${choices.map((c,i)=>`<button class="${i===0?'cta':'ghost-cta'}" data-choice="${i}">${c.label}</button>`).join('')}</div>`
  modal.classList.remove('hidden'); modal.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choices[Number(b.dataset.choice)].run())
}
function closeModal(){ if(state?.friendCallPending) return; $('modal')?.classList.add('hidden'); resumeTimerFromModal() }
function how() { showModal('HOW TO PLAY',`Face 50 questions, with 30 seconds for each answer. Every correct answer moves you up the prize ladder toward ₦1 billion. Secure milestones protect your winnings. Walk Away whenever you want to keep the prize you have reached. Each new Rush starts with two 50/50s, two AI Polls and two Calls-a-Friend. 50/50 removes two incorrect options. Your personal records and purchased inventory stay saved on this device. Leaving an active Rush ends that session. There are no ads or entry fees.`) }
async function share() {
  if (!state) return
  const publicAppUrl = getPublicAppUrl()
  const resultData = {
    displayName: playerProfile.displayName,
    amount: Math.max(0, Math.floor(Number(state.money)||0)),
    questionsFaced: Math.min(TOTAL_QUESTIONS, Math.max(0, Number(state.question||0)+1)),
    correct: Math.min(TOTAL_QUESTIONS, Math.max(0, Number(state.sessionCorrect||0))),
    totalQuestions: TOTAL_QUESTIONS,
    country: String(state.country || selectedCountry).slice(0,60),
    appUrl: publicAppUrl
  }
  const makeText = url => `${resultData.displayName ? resultData.displayName + ' ' : '🏆 I '}reached ${money(resultData.amount)} in BILLION RUSH!\n\n💰 Prize reached: ${money(resultData.amount)}\n🎯 Questions faced: ${resultData.questionsFaced}/50\n✅ Correct answers: ${resultData.correct}\n🌍 Country: ${resultData.country}\n\nThink you can beat me? Download Billion Rush, install it, and challenge my score!\nTake your own 50-question Rush toward ₦1 BILLION.${url ? `\n👇 DOWNLOAD THE GAME AND CHALLENGE ME:\n${url}` : ''}\n#BillionRush #JumiTech #CanYouBeatMe`
  let shareUrl = ''
  if (publicAppUrl) {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(resultData)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
    shareUrl = `${publicAppUrl}/download.html?score=${encodeURIComponent(payload)}`
  }
  const text = makeText(shareUrl)

  // Attach the generated image in Android's native share sheet. Web Share attaches it where supported.
  try {
    const cardBlob = await makeScoreCardBlob(resultData)
    const cardFile = new File([cardBlob], 'billion-rush-score.png', { type: 'image/png' })
    if (window.Capacitor?.isNativePlatform?.()) {
      const [{ Share }, { Filesystem, Directory }] = await Promise.all([import('@capacitor/share'), import('@capacitor/filesystem')])
      const base64 = await new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]); reader.onerror=reject; reader.readAsDataURL(cardBlob) })
      const saved = await Filesystem.writeFile({ path:'billion-rush-score.png', data:base64, directory:Directory.Cache, recursive:true })
      await Share.share({ title:'Can You Beat My Billion Rush Score?', text, ...(shareUrl ? {url:shareUrl} : {}), files:[saved.uri], dialogTitle:'Share your Billion Rush score' })
      return
    }
    if (navigator.canShare?.({files:[cardFile]}) && navigator.share) {
      await navigator.share({title:'Can You Beat My Billion Rush Score?',text,...(shareUrl ? {url:shareUrl} : {}),files:[cardFile]}); return
    }
    if (navigator.share) { await navigator.share({title:'Can You Beat My Billion Rush Score?',text,...(shareUrl ? {url:shareUrl} : {})}); return }
  } catch (error) { if (error?.name === 'AbortError') return; console.warn('Image sharing unavailable; showing social options.', error) }

  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(shareUrl)
  const socialLinks = shareUrl ? `<a class="ghost-cta" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener">SHARE ON FACEBOOK ↗</a><a class="ghost-cta" href="https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent('Can you beat my Billion Rush score?')}" target="_blank" rel="noopener">SHARE ON TELEGRAM ↗</a>` : `<p class="stats-note">Your score image and invitation can be shared now. The invitation link should open the Billion Rush download page so friends can install the game and challenge your score.</p>`
  showModal('CHALLENGE YOUR FRIENDS', `Your score card is ready. Share it with friends and invite them to download Billion Rush, install it, and challenge your score.${shareUrl ? `<div class="share-link-box">${esc(shareUrl)}</div>` : ''}<div class="share-modal-actions"><a class="ghost-cta" href="https://wa.me/?text=${encodedText}" target="_blank" rel="noopener">SHARE ON WHATSAPP ↗</a>${socialLinks}<button class="ghost-cta" id="copyChallengeLinkBtn">COPY INVITATION${shareUrl ? ' & LINK' : ''}</button><button class="ghost-cta" id="downloadScoreCardBtn">DOWNLOAD SCORE CARD IMAGE ↓</button></div>`)
  $('copyChallengeLinkBtn')?.addEventListener('click', async()=>{
    try { await navigator.clipboard.writeText(text); showModal('INVITATION COPIED','Your invitation is ready to paste into a message or social post.') }
    catch { showModal('YOUR INVITATION',`<textarea class="share-copy-text" readonly>${esc(text)}</textarea>`) }
  })
  $('downloadScoreCardBtn')?.addEventListener('click',()=>downloadScoreCard(resultData))
}
async function downloadScoreCard(resultData) {
  try {
    const blob = await makeScoreCardBlob(resultData)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='billion-rush-score.png'; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(()=>URL.revokeObjectURL(url),1500)
    return true
  } catch (error) { console.error(error); showModal('CARD UNAVAILABLE','This browser could not generate the score card. You can still share the result text.'); return false }
}
async function openLeaderboard(initial = {}) {
  let period = initial.period || 'daily'
  let scope = initial.scope || 'global'
  let metric = initial.metric || 'best'
  const periodLabels = {daily:'DAILY',weekly:'WEEKLY',monthly:'MONTHLY',yearly:'YEARLY'}
  const renderBoard = async () => {
    const content = $('modalContent')
    if (!content) return
    content.innerHTML = `<div class="modal-symbol">🏆</div><div class="eyebrow"><span>BILLION RUSH</span><i></i><span>COMPETE WORLDWIDE</span></div><h2>LEADERBOARD</h2><div class="leaderboard-controls"><div class="leaderboard-tabs">${Object.entries(periodLabels).map(([key,label])=>`<button class="leader-tab ${period===key?'active':''}" data-period="${key}">${label}</button>`).join('')}</div><div class="leaderboard-tabs"><button class="leader-tab ${scope==='global'?'active':''}" data-scope="global">🌍 GLOBAL</button><button class="leader-tab ${scope==='country'?'active':''}" data-scope="country">🇺🇳 ${esc(selectedCountry.toUpperCase())}</button></div><div class="leaderboard-tabs metric-tabs"><button class="leader-tab ${metric==='best'?'active':''}" data-metric="best">HIGHEST SCORE</button><button class="leader-tab ${metric==='total'?'active':''}" data-metric="total">TOTAL WINNINGS</button></div></div><div id="leaderboardRows" class="leaderboard-rows"><div class="leaderboard-loading"><span class="leader-spinner"></span><b>LOADING RANKINGS</b><small>Connecting to the Billion Rush community…</small></div></div><p class="leaderboard-footnote">Periods reset on UTC boundaries. Best score ranks one player's highest prize; total winnings adds their completed Rush prizes. Community scores are currently player-reported and are not yet cheat-proof.</p><button class="ghost-cta" id="leaderboardClose">CLOSE LEADERBOARD</button>`
    content.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;renderBoard()})
    content.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;renderBoard()})
    content.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>{metric=b.dataset.metric;renderBoard()})
    $('leaderboardClose')?.addEventListener('click',closeModal)
    const rows = $('leaderboardRows')
    if (!isBackendConfigured()) { rows.innerHTML = `<div class="leaderboard-empty"><b>ONLINE RANKINGS NOT CONNECTED</b><p>Leaderboard data will appear after the Supabase migration and Edge Functions are deployed and the app's Supabase settings are configured.</p></div>`; return }
    try {
      const result = await getCommunityLeaderboard({period,scope,country:selectedCountry,metric,playerId:getLeaderboardPlayerId()})
      const entries = Array.isArray(result?.entries) ? result.entries : []
      if (!entries.length) { rows.innerHTML = `<div class="leaderboard-empty"><b>THE BOARD IS OPEN</b><p>No completed Rush scores have been posted for this ${period} period yet. Play a Rush and claim a place.</p></div>`; return }
      rows.innerHTML = entries.map((entry,index)=>`<article class="leaderboard-entry ${entry.playerId===getLeaderboardPlayerId()?'is-you':''}"><span class="leader-rank ${index<3?'top-rank':''}">${index===0?'♛':String(entry.rank||index+1).padStart(2,'0')}</span><span class="leader-player"><b>${esc(entry.displayName||'Player')}${entry.playerId===getLeaderboardPlayerId()?'<em>YOU</em>':''}</b><small>🌍 ${esc(entry.country||'Other')} · ${Number(entry.games||0)} ${Number(entry.games||0)===1?'RUSH':'RUSHES'}</small></span><strong>${money(metric==='total'?entry.totalWinnings:entry.bestScore)}</strong></article>`).join('') + (result?.selfRank && result.selfRank>entries.length?`<div class="leader-self-rank">YOUR RANK: #${result.selfRank}</div>`:'')
    } catch (error) { rows.innerHTML = `<div class="leaderboard-empty"><b>COULD NOT LOAD RANKINGS</b><p>${esc(error?.message||'Please try again in a moment.')}</p><button class="ghost-cta" id="leaderboardRetry">TRY AGAIN</button></div>`; $('leaderboardRetry')?.addEventListener('click',renderBoard) }
  }
  pauseTimerForModal()
  const modal=$('modal'); if(!modal)return
  modal.querySelector('.modal-card')?.classList.remove('friend-picker-card')
  modal.classList.remove('hidden')
  await renderBoard()
}

function viewStats() {
  const faced = Math.min(TOTAL_QUESTIONS, Number(state?.question||0)+1)
  const correct = Number(state?.sessionCorrect||0)
  const accuracy = faced ? Math.round(correct/faced*100) : 0
  showModal('YOUR RUSH STATS', `<div class="share-stats-grid"><div><small>THIS RUSH</small><b>${money(state?.money||0)}</b></div><div><small>CORRECT</small><b>${correct}/${faced}</b></div><div><small>ACCURACY</small><b>${accuracy}%</b></div><div><small>PERSONAL BEST</small><b>${money(stats.best||0)}</b></div><div><small>GAMES PLAYED</small><b>${Number(stats.runs||0)}</b></div><div><small>QUESTIONS ANSWERED</small><b>${Number(stats.questions||0)}</b></div></div><p class="stats-note">Your personal record stays saved on this device. Keep playing and beat your best.</p>`)
}

function openSettings() {
  const countries = COUNTRIES.map(c=>`<option value="${esc(c)}" ${c===playerProfile.country?'selected':''}>${esc(c)}</option>`).join('')
  const toggle = (id,label,key) => `<label class="setting-row" for="${id}"><span><b>${label}</b><small>${key==='sound'?'Button and gameplay sound effects':key==='music'?'Background music during the game':'Vibration on supported devices'}</small></span><input id="${id}" type="checkbox" ${playerProfile.settings[key]?'checked':''}></label>`
  showModal('SETTINGS', `<form id="settingsForm" class="settings-form"><div class="settings-section-title">PLAYER PROFILE</div><label class="settings-field" for="settingsDisplayName">DISPLAY NAME<input id="settingsDisplayName" maxlength="24" value="${esc(playerProfile.displayName)}" required></label><label class="settings-field" for="settingsCountry">COUNTRY<select id="settingsCountry">${countries}</select></label><div class="settings-section-title">AUDIO & PLAY</div>${toggle('soundSetting','Sound effects','sound')}${toggle('musicSetting','Background music','music')}${toggle('vibrationSetting','Vibration','vibration')}<div class="settings-buttons"><button class="cta" type="submit"><span>SAVE SETTINGS</span><b>✓</b></button><button class="ghost-cta" type="button" id="privacyBtn">PRIVACY INFORMATION</button><button class="ghost-cta danger-setting" type="button" id="resetStatsBtn">RESET PERSONAL STATISTICS</button></div><p class="settings-footnote">Resetting statistics will not delete purchased inventory or payment records.</p></form>`)
  $('modalOk')?.remove()
  $('settingsForm')?.addEventListener('submit',e=>{
    e.preventDefault()
    const name=String($('settingsDisplayName')?.value||'').trim().slice(0,24)
    if(!name){$('settingsDisplayName')?.focus();return}
    playerProfile.displayName=name
    playerProfile.country=$('settingsCountry')?.value||'Nigeria'
    playerProfile.settings={sound:Boolean($('soundSetting')?.checked),music:Boolean($('musicSetting')?.checked),vibration:Boolean($('vibrationSetting')?.checked)}
    playerProfile.setupComplete=true; savePlayerProfile(); audio.applySettings('home'); render()
  })
  ;[['soundSetting','sound'],['musicSetting','music'],['vibrationSetting','vibration']].forEach(([id,key])=>$(id)?.addEventListener('change',()=>{
    playerProfile.settings[key]=Boolean($(id).checked); savePlayerProfile(); if(key==='music')audio.applySettings('home')
  }))
  $('privacyBtn')?.addEventListener('click',()=>showModal('PRIVACY INFORMATION', 'Your display name, country, sound preferences and personal statistics are stored locally on this device. No email or password is required for a local player profile. Purchased inventory is handled separately by the game store when the backend is configured. Shared score cards may include your display name, country and score, so share them only when you are comfortable doing so.'))
  $('resetStatsBtn')?.addEventListener('click',()=>{
    if(!confirm('Reset personal statistics on this device? Purchased inventory and payment records will not be deleted.'))return
    stats={best:0,runs:0,questions:0}; localStorage.setItem(PROFILE_KEY,JSON.stringify(stats)); render()
  })
}

function saveNewProfile(event) {
  event?.preventDefault()
  const name=String($('profileDisplayName')?.value||'').trim().slice(0,24)
  const country=$('profileCountry')?.value
  if(!name){$('profileDisplayName')?.focus();return}
  if(!COUNTRIES.includes(country))return
  playerProfile.displayName=name; playerProfile.country=country; playerProfile.setupComplete=true
  savePlayerProfile(); audio.init(); audio.applySettings('home'); render()
}

function bind() {
  document.querySelectorAll('button:not(.answer):not([data-life])').forEach(button=>button.addEventListener('click',()=>audio.click()))
  $('profileSetupForm')?.addEventListener('submit',saveNewProfile)
  $('settingsBtn')?.addEventListener('click',openSettings)
  $('editProfileBtn')?.addEventListener('click',openSettings)
  const startNewRun=()=>{const saved=savedRun();if(saved&&!confirm('Start a new Rush? Your last result will be closed.'))return;if(state?.status==='lost'){recordLostRunStats();submitLeaderboardRun();}else if(saved&&!saved.statsRecorded){state=saved;recordLostRunStats();submitLeaderboardRun();state=null}createRun()}
  $('startBtn')?.addEventListener('click',startNewRun)
  $('dailyBtn')?.addEventListener('click',startNewRun)
  $('continueBtn')?.addEventListener('click',resumeRun)
  $('againBtn')?.addEventListener('click',startNewRun)
  $('endRunBtn')?.addEventListener('click',endRun)
  $('secondChanceBtn')?.addEventListener('click',useSecondChance)
  $('howBtn')?.addEventListener('click',how)
  $('shopBtn')?.addEventListener('click',openLifelineShop)
  $('leaderboardBtn')?.addEventListener('click',openLeaderboard)
  $('shareBtn')?.addEventListener('click',share)
  $('downloadCardBtn')?.addEventListener('click',()=>downloadScoreCard({displayName:playerProfile.displayName,amount:state?.money||0,questionsFaced:Math.min(TOTAL_QUESTIONS,Number(state?.question||0)+1),correct:Number(state?.sessionCorrect||0),totalQuestions:TOTAL_QUESTIONS,country:state?.country||selectedCountry}))
  $('viewStatsBtn')?.addEventListener('click',viewStats)
  $('homeBtn')?.addEventListener('click',()=>{if(state?.status==='active'){invalidateActiveRun();return}if(state?.status==='lost')submitLeaderboardRun();clearInterval(timer);state=null;render();audio.applySettings('home')})
  $('walkBtn')?.addEventListener('click',()=>{if(confirm(`Walk away and end this Rush at ${money(state.money)}?`)){state.reason='You chose Walk Away and kept your accumulated prize.';endRun()}})
  $('closeModal')?.addEventListener('click',closeModal); $('modalBackdrop')?.addEventListener('click',closeModal)
  document.querySelectorAll('.answer').forEach(b=>b.addEventListener('click',()=>answer(Number(b.dataset.answer))))
  document.querySelectorAll('[data-life]').forEach(b=>b.addEventListener('click',()=>useLife(b.dataset.life)))
  audio.init()
}

document.addEventListener('pointerdown',()=>{
  if(playerProfile.setupComplete && state?.status!=='active') audio.applySettings('home')
},{once:true})

function invalidateActiveRun() {
  if(!state || state.status!=='active') return
  clearInterval(timer); timer=null; modalPausedTimer=false
  localStorage.removeItem(SAVE_KEY)
  state=null
  render()
  showModal('RUSH VOIDED','Your active Rush was ended because the game was left. Start a new Rush to play again. Completed results are not affected.')
}

document.addEventListener('visibilitychange',()=>{
  if(shouldInvalidateActiveSession(state?.status,document.hidden)) invalidateActiveRun()
})
window.addEventListener('pagehide',()=>{
  if(state?.status==='active') invalidateActiveRun()
})

// Capacitor reports native background/lock transitions more reliably than DOM visibility alone.
if(window.Capacitor?.isNativePlatform?.()) {
  import('@capacitor/app').then(({App})=>App.addListener('appStateChange',({isActive})=>{
    if(!isActive && state?.status==='active') invalidateActiveRun()
    else if(isActive) syncStoreInventory({quiet:true}).then(()=>{if(!state && $('modal')?.classList.contains('hidden'))render()})
  })).catch(error=>console.warn('Native lifecycle listener unavailable:',error))
}

// No sign-up or login is required. Only loss/results can be restored; active Rushes cannot.
const existing = savedRun()
if (existing) state = null
render()
syncPendingLeaderboardScores()
syncStoreInventory({quiet:true}).then(()=>{if(!state)render()})
