import { createClient } from '@supabase/supabase-js'

const URL_KEY = 'BR_SUPABASE_URL'
const KEY_KEY = 'BR_SUPABASE_ANON_KEY'
const TOKEN_KEY = 'BR_ACCESS_TOKEN'
let client = null

export function config() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  }
}

export function isConfigured() {
  const c = config()
  return Boolean(c.url && c.anonKey)
}

export function isConnected() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export async function getSession() {
  const c = getClient()
  if (!c) return null
  const { data, error } = await c.auth.getSession()
  if (error) throw error
  const session = data?.session || null
  if (session?.access_token) localStorage.setItem(TOKEN_KEY, session.access_token)
  else localStorage.removeItem(TOKEN_KEY)
  return session
}

export async function getUser() {
  const session = await getSession()
  return session?.user || null
}

export async function resetPassword(email) {
  const c = getClient()
  if (!c) throw new Error('Connect your Supabase project first.')
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export function getStatus() {
  if (!isConfigured()) return 'Not configured'
  if (!isConnected()) return 'Configured — sign in required'
  return 'Live backend connected'
}

export function setup(url, anonKey) {
  if (!url || !anonKey) throw new Error('Supabase URL and anon key are required.')
  client = createClient(url.trim(), anonKey.trim())
  return client
}

export function getClient() {
  if (client) return client
  const c = config()
  if (!c.url || !c.anonKey) return null
  client = createClient(c.url, c.anonKey)
  return client
}

export async function signIn(email, password) {
  const c = getClient()
  if (!c) throw new Error('Connect your Supabase project first.')
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.session) localStorage.setItem(TOKEN_KEY, data.session.access_token)
  return data
}

export async function signUp(email, password) {
  const c = getClient()
  if (!c) throw new Error('Connect your Supabase project first.')
  const { data, error } = await c.auth.signUp({ email, password })
  if (error) throw error
  if (data.session) localStorage.setItem(TOKEN_KEY, data.session.access_token)
  return data
}

export async function signOut() {
  try { await getClient()?.auth.signOut() } finally { localStorage.removeItem(TOKEN_KEY) }
}

async function call(fn, body = {}) {
  const c = getClient()
  if (!c) throw new Error('Supabase is not configured.')
  const { data, error } = await c.functions.invoke(fn, { body })
  if (error) throw error
  return data
}

export async function startRush() { return call('start-rush', {}) }
export async function getQuestion(sessionId) { return call('get-question', { sessionId }) }
export async function submitAnswer(sessionId, selectedOption) { return call('submit-answer', { sessionId, selectedOption }) }
export async function walkAway(sessionId) { return call('walk-away', { sessionId }) }
export async function timeoutQuestion(sessionId) { return call('timeout-question', { sessionId }) }
export async function finalizeLeaderboard(sessionId) { return call('finalize-leaderboard', { sessionId }) }
export async function useLifeline(sessionId, type, extra = {}) {
  const map = { fifty: 'fifty_fifty', audience: 'audience', friend: 'friend' }
  const fn = type === 'fifty' ? 'use-5050' : type === 'audience' ? 'ask-audience' : 'call-friend'
  return call(fn, { sessionId, lifelineType: map[type], ...extra })
}
export async function askAudience(sessionId) { return useLifeline(sessionId, 'audience') }
export async function callFriend(sessionId, friendId) { return useLifeline(sessionId, 'friend', { friendId }) }

export async function createMatchRoom() { return call('create-match-room', {}) }
export async function joinMatchRoom(roomCode) { return call('join-match-room', { roomCode }) }
export async function findMatch() { return call('find-match', {}) }
export async function setMatchReady(matchId, ready=true) { return call('set-match-ready', { matchId, ready }) }
export async function createMatch(matchId) { return call('create-match', { match_id: matchId }) }
export async function getMatchState(matchId) { return call('get-match-state', { matchId }) }
export async function submitMatchAnswer(matchId, selectedOption) { return call('submit-match-answer', { matchId, selectedOption }) }
export async function advanceMatch(matchId) { return call('advance-round', { matchId }) }

// Anonymous solo-score sharing: no player account is required.
export async function createSoloShare(payload) { return call('create-solo-share', payload) }
export async function getSoloShare(token) { return call('get-solo-share', { token }) }

// Anonymous, durable store identity. This is not a player account; it is a random
// installation identifier used to restore server-verified purchases on this device.
const STORE_PLAYER_KEY = 'billionRush.storePlayerId.v1'
export function getStorePlayerId() {
  let id = localStorage.getItem(STORE_PLAYER_KEY)
  if (!id) {
    if (globalThis.crypto?.randomUUID) id = globalThis.crypto.randomUUID()
    else {
      const bytes = new Uint8Array(16)
      if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
      else for (let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256)
      bytes[6]=(bytes[6]&0x0f)|0x40; bytes[8]=(bytes[8]&0x3f)|0x80
      const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('')
      id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    }
    localStorage.setItem(STORE_PLAYER_KEY, id)
  }
  return id
}
export async function getStoreInventory(playerId = getStorePlayerId()) {
  return call('get-store-inventory', { playerId })
}
export async function initializeStorePurchase({ productId, email, playerId = getStorePlayerId() }) {
  return call('paystack-initialize', { productId, email, playerId })
}
export async function verifyStorePurchase({ reference, playerId = getStorePlayerId() }) {
  return call('paystack-verify', { reference, playerId })
}
export async function consumeStoreItem(item, playerId = getStorePlayerId()) {
  return call('consume-store-item', { item, playerId })
}

// Public community leaderboard; no player account is required. Scores are client-reported
// until the solo game flow is fully server-authoritative.
export async function submitCommunityScore(payload) {
  const c = getClient()
  if (!c) throw new Error('Online leaderboard is not configured.')
  const { data, error } = await c.functions.invoke('submit-leaderboard-score', { body: payload })
  if (error) throw error
  return data
}
export async function getCommunityLeaderboard(params = {}) {
  const c = getClient()
  if (!c) throw new Error('Online leaderboard is not configured.')
  const { data, error } = await c.functions.invoke('get-community-leaderboard', { body: params })
  if (error) throw error
  return data
}
export function getLeaderboardPlayerId() {
  const key = 'billionRush.leaderboardPlayerId.v1'
  let id = localStorage.getItem(key)
  if (!id) {
    if (globalThis.crypto?.randomUUID) id = globalThis.crypto.randomUUID()
    else { const bytes = new Uint8Array(16); if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes); else for (let i=0;i<16;i++) bytes[i]=Math.floor(Math.random()*256); bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128; const h=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join(''); id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}` }
    localStorage.setItem(key,id)
  }
  return id
}
