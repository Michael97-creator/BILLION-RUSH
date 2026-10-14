import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../billion-rush/src/data/questions.js'

const englishQuestions = QUESTIONS.filter(question => question.category === 'English Language')

test('local question bank contains a substantial adult-level English spelling and grammar pool', () => {
  assert.ok(englishQuestions.length >= 35, `Expected at least 35 English questions, found ${englishQuestions.length}`)
  assert.ok(englishQuestions.every(question => question.difficulty >= 4), 'English pool should be hard or very hard')
})

test('English questions have four unique options and valid answer indexes', () => {
  for (const question of englishQuestions) {
    assert.equal(question.a.length, 4, `${question.id} should have four options`)
    assert.equal(new Set(question.a).size, 4, `${question.id} should have four unique options`)
    assert.ok(question.correct >= 0 && question.correct < 4, `${question.id} should have a valid answer index`)
    assert.ok(question.explanation, `${question.id} should include an explanation`)
  }
})
