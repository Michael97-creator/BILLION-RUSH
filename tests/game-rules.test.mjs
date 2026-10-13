import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MILESTONE_QUESTIONS, isMilestoneQuestion, milestoneReward, fallbackPrize, completedMilestoneCount,
  runRegularLifelineCount, canUseSecondChance, canUseExtraTime, shouldInvalidateActiveSession,
  MAX_REGULAR_LIFELINE_USES_PER_GAME, MAX_EXTRA_TIME_USES_PER_GAME, MAX_SECOND_CHANCE_USES_PER_GAME, EXTRA_TIME_SECONDS
} from '../billion-rush/src/game-rules.js'

const ladder = Array.from({ length: 50 }, (_, i) => (i + 1) * 10000)

test('only RUSH 10, 20, 30 and 40 are protected milestones', () => {
  assert.deepEqual(MILESTONE_QUESTIONS, [10, 20, 30, 40])
  for (const q of [10, 20, 30, 40]) assert.equal(isMilestoneQuestion(q), true)
  for (const q of [1, 9, 11, 19, 21, 39, 41, 50]) assert.equal(isMilestoneQuestion(q), false)
})

test('a reached milestone secures that ladder rung reward', () => {
  assert.equal(milestoneReward(10, ladder), 100000)
  assert.equal(milestoneReward(20, ladder), 200000)
  assert.equal(milestoneReward(30, ladder), 300000)
  assert.equal(milestoneReward(40, ladder), 400000)
  assert.equal(milestoneReward(11, ladder), null)
})

test('wrong answer falls back to the last secured milestone, or zero before the first', () => {
  assert.equal(fallbackPrize(0), 0)
  assert.equal(fallbackPrize(100000), 100000)
  assert.equal(fallbackPrize(-20), 0)
})

test('old local saves infer the last milestone from the next question index', () => {
  assert.equal(completedMilestoneCount(0), 0)
  assert.equal(completedMilestoneCount(9), 0)
  assert.equal(completedMilestoneCount(10), 1)
  assert.equal(completedMilestoneCount(20), 2)
  assert.equal(completedMilestoneCount(49), 4)
})

test('regular lifeline availability includes free and purchased uses but caps at five', () => {
  assert.equal(MAX_REGULAR_LIFELINE_USES_PER_GAME, 5)
  assert.equal(runRegularLifelineCount(2, 0), 2)
  assert.equal(runRegularLifelineCount(2, 1), 3)
  assert.equal(runRegularLifelineCount(2, 3), 5)
  assert.equal(runRegularLifelineCount(2, 20), 5)
  assert.equal(runRegularLifelineCount(0, 20), 5)
})

test('Second Chance has no free use implied and never exceeds two uses per game', () => {
  assert.equal(MAX_SECOND_CHANCE_USES_PER_GAME, 2)
  assert.equal(canUseSecondChance(0, 0), false)
  assert.equal(canUseSecondChance(1, 0), true)
  assert.equal(canUseSecondChance(1, 1), true)
  assert.equal(canUseSecondChance(1, 2), false)
  assert.equal(canUseSecondChance(0, 1), false)
})

test('Extra Time adds exactly ten seconds and is limited to five uses per game and one per question', () => {
  assert.equal(EXTRA_TIME_SECONDS, 10)
  assert.equal(MAX_EXTRA_TIME_USES_PER_GAME, 5)
  assert.equal(canUseExtraTime(1, 0, false), true)
  assert.equal(canUseExtraTime(0, 0, false), false)
  assert.equal(canUseExtraTime(1, 5, false), false)
  assert.equal(canUseExtraTime(1, 1, true), false)
})

test('only an active hidden session is invalidated by backgrounding', () => {
  assert.equal(shouldInvalidateActiveSession('active', true), true)
  assert.equal(shouldInvalidateActiveSession('active', false), false)
  assert.equal(shouldInvalidateActiveSession('lost', true), false)
  assert.equal(shouldInvalidateActiveSession('complete', true), false)
})
