const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
const DEVICE_KEY = 'billionRush.deviceId.v1'

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `br-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function questionGenerationConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

export async function requestFreshQuestions({ country, region, count = 10, excludeIds = [] }) {
  if (!questionGenerationConfigured()) return []
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-player-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ country, region, count: Math.max(1, Math.min(10, Number(count) || 10)), deviceId: deviceId(), excludeIds: excludeIds.slice(-1000) })
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Question generator returned HTTP ${response.status}`)
  return Array.isArray(body.questions) ? body.questions : []
}

export async function requestLifeline({ type, country, question, options, character }) {
  if (!questionGenerationConfigured()) return null
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-player-lifeline`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ type, country, question, options, character, deviceId: deviceId() })
  })
  const body = await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(body.error || `Lifeline service returned HTTP ${response.status}`)
  return body
}
