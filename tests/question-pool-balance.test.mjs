import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { QUESTIONS, CATEGORIES } from '../billion-rush/src/data/questions.js'

test('initial local question bank contains exactly 200 questions', () => {
  assert.equal(QUESTIONS.length, 200)
})

test('all question records have four unique options and a valid answer index', () => {
  for (const q of QUESTIONS) {
    assert.ok(q.id && q.category && q.q && q.explanation, `missing fields: ${q.id}`)
    assert.equal(q.a.length, 4, `four options required: ${q.id}`)
    assert.equal(new Set(q.a).size, 4, `duplicate options: ${q.id}`)
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `invalid answer index: ${q.id}`)
  }
})

test('question IDs and exact question text are unique', () => {
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length)
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  assert.equal(new Set(QUESTIONS.map(q => normalize(q.q))).size, QUESTIONS.length)
})

test('topic distribution is no longer one English category dominating the pool', () => {
  const counts = Object.fromEntries(CATEGORIES.map(c => [c, QUESTIONS.filter(q => q.category === c).length]))
  assert.equal(counts['English Spelling'], 14)
  assert.equal(counts['English Grammar'], 12)
  assert.equal(counts['English Vocabulary & Usage'], 4)
  for (const topic of ['Film & Television','Riddles & Logic','Art & Architecture','Business & Economics','Food & Cuisine','Mythology','Philosophy','Psychology','Inventions & Discoveries','Politics & Civics']) assert.equal(counts[topic], 4, `${topic} should have four questions`)
  assert.ok(Object.keys(counts).length >= 30, 'The pool should cover at least 30 distinct topics')
})

test('question selection includes category-round-robin fairness logic', () => {
  const main = readFileSync(new URL('../billion-rush/src/main.js', import.meta.url), 'utf8')
  assert.match(main, /const addFairly = \(pool, limit\)/)
  assert.match(main, /Round-robin across topic buckets/)
  assert.match(main, /categoryCount >= 4/)
  assert.match(main, /englishCount >= 8/)
})

test('startup sequence uses both local logo assets and reduced-motion support', () => {
  const main = readFileSync(new URL('../billion-rush/src/main.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../billion-rush/src/style.css', import.meta.url), 'utf8')
  assert.match(main, /\/jumi-tech-logo\.png/)
  assert.match(main, /\/billion-rush-logo\.png/)
  assert.match(main, /prefers-reduced-motion/)
  assert.match(css, /\.startup-sequence/)
  assert.match(css, /prefers-reduced-motion:reduce/)
})

test('AI generation prompt includes broad topics and explicit English balancing', () => {
  const generator = readFileSync(new URL('../supabase/functions/generate-player-questions/index.ts', import.meta.url), 'utf8')
  for (const topic of ['Film & Television','Riddles & Logic','Art & Architecture','Business & Economics','Food & Cuisine','Mythology','Philosophy','Psychology','Inventions & Discoveries','Politics & Civics']) assert.ok(generator.includes(topic), `AI prompt missing ${topic}`)
  assert.match(generator, /perCategoryBatchCap/)
  assert.match(generator, /englishBatchCap/)
  assert.match(generator, /fairByCategory/)
})
