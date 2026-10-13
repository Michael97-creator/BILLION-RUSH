import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QUESTIONS } from '../billion-rush/src/data/questions.js'

const root = new URL('..', import.meta.url).pathname
const required = [
  'README.md',
  'supabase/migrations/0001_core.sql',
  'supabase/migrations/0002_game_engine.sql',
  'supabase/migrations/0003_lifelines.sql',
  'supabase/migrations/0004_security.sql',
  'supabase/migrations/0005_leaderboard.sql',
  'supabase/migrations/0006_multiplayer.sql',
  'supabase/migrations/0007_realtime.sql',
  'supabase/migrations/0008_rooms.sql',
  'supabase/migrations/0009_multiplayer_flow.sql',
  'supabase/migrations/0016_player_question_generation.sql',
  'supabase/migrations/0017_anonymous_score_sharing.sql',
  'supabase/migrations/0018_billion_rush_store.sql',
  'supabase/functions/create-solo-share/index.ts',
  'supabase/functions/get-solo-share/index.ts',
  'supabase/functions/paystack-initialize/index.ts',
  'supabase/functions/paystack-verify/index.ts',
  'supabase/functions/get-store-inventory/index.ts',
  'supabase/functions/consume-store-item/index.ts',
  'docs/PAYMENT-INTEGRATION-CONTRACT.md',
  'apps/player/index.html',
  'apps/player/app.js',
  'apps/player/style.css',
  'apps/studio/index.html',
  'billion-rush/src/main.js',
  'billion-rush/src/game-rules.js',
  'tests/game-rules.test.mjs',
  'billion-rush/src/question-generator.js',
  'billion-rush/src/data/questions.js',
  'supabase/functions/generate-player-questions/index.ts',
  'supabase/functions/generate-player-lifeline/index.ts'
]
const missing = required.filter(path => !existsSync(join(root, path)))
if (missing.length) {
  console.error('Missing required files:', missing)
  process.exit(1)
}
const ids = new Set()
const invalid = []
for (const q of QUESTIONS) {
  if (ids.has(q.id)) invalid.push(`Duplicate question ID: ${q.id}`)
  ids.add(q.id)
  if (!q.q || !q.category || !Array.isArray(q.a) || q.a.length !== 4 || new Set(q.a).size !== 4 || !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
    invalid.push(`Invalid question structure: ${q.id}`)
  }
}
if (QUESTIONS.length < 50 || invalid.length) {
  console.error('Question bank validation failed:', { total: QUESTIONS.length, invalid })
  process.exit(1)
}
const main = readFileSync(join(root, 'billion-rush/src/main.js'), 'utf8')
const ladderMatch = main.match(/const LADDER = \[([\s\S]*?)\]/)
const ladder = ladderMatch ? ladderMatch[1].split(',').map(x => Number(x.trim())).filter(Number.isFinite) : []
const ladderAscending = ladder.every((value, index) => index === 0 || value > ladder[index-1])
const productPricingValid = [
  "fifty_single: { label:'50/50', description:'1 additional use', amountNaira:200", "fifty_triple: { label:'50/50', description:'3 additional uses', amountNaira:500",
  "audience_single: { label:'AI Poll Audience', description:'1 additional use', amountNaira:200", "audience_triple: { label:'AI Poll Audience', description:'3 additional uses', amountNaira:500",
  "friend_single: { label:'Call-a-Friend', description:'1 additional use', amountNaira:200", "friend_triple: { label:'Call-a-Friend', description:'3 additional uses', amountNaira:500",
  "extra_time_single: { label:'Extra Time', description:'1 use · adds 10 seconds', amountNaira:200", "extra_time_five: { label:'Extra Time', description:'5 uses · adds 10 seconds each', amountNaira:800",
  "second_chance_single: { label:'Second Chance', description:'1 use · replacement question', amountNaira:300", "second_chance_two: { label:'Second Chance', description:'2 uses · replacement questions', amountNaira:500"
].every(item => main.includes(item))
const rules = readFileSync(join(root, 'billion-rush/src/game-rules.js'), 'utf8')
if (!main.includes('const TOTAL_QUESTIONS = 50') || ladder.length !== 50 || ladder.at(-1) !== 1000000000 || !ladderAscending || !productPricingValid || !rules.includes('MILESTONE_QUESTIONS') || !main.includes('state.securedMoney') || !main.includes('id=\"walkBtn\"')) {
  console.error('Solo-game configuration failed:', { totalQuestions: main.includes('const TOTAL_QUESTIONS = 50'), ladderLength: ladder.length, topPrize: ladder.at(-1), ladderAscending })
  process.exit(1)
}
const funcs = readdirSync(join(root, 'supabase/functions')).filter(name => !name.startsWith('_') && existsSync(join(root, 'supabase/functions', name, 'index.ts')))
console.log(`Verified ${required.length} core files, ${funcs.length} Edge Functions, ${QUESTIONS.length} unique local questions, the 50-step ₦1B ladder, and the regular lifeline / Extra Time / Second Chance price table.`)
console.log('This is a static integrity check; run Vite build and Supabase staging tests before production.')
