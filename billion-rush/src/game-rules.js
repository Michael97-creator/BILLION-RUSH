// Core Billion Rush rules kept separate so the prize protection can be tested.
export const MILESTONE_QUESTIONS = Object.freeze([10, 20, 30, 40])

export function isMilestoneQuestion(questionCount) {
  return MILESTONE_QUESTIONS.includes(Number(questionCount))
}

export function milestoneReward(questionCount, ladder) {
  const count = Number(questionCount)
  if (!isMilestoneQuestion(count) || !Array.isArray(ladder)) return null
  const reward = Number(ladder[count - 1])
  return Number.isFinite(reward) && reward >= 0 ? reward : null
}

export function fallbackPrize(securedMoney) {
  const value = Number(securedMoney)
  return Number.isFinite(value) && value > 0 ? value : 0
}

// state.question is a zero-based index of the next/current question. For example,
// index 10 means the player has already completed RUSH 01–10 and is on RUSH 11.
export function completedMilestoneCount(questionIndex) {
  return Math.min(4, Math.floor(Math.max(0, Number(questionIndex) || 0) / 10))
}

export const REGULAR_LIFELINE_TYPES = Object.freeze(['fifty', 'audience', 'friend'])
export const MAX_REGULAR_LIFELINE_USES_PER_GAME = 5
export const MAX_EXTRA_TIME_USES_PER_GAME = 5
export const MAX_SECOND_CHANCE_USES_PER_GAME = 2
export const EXTRA_TIME_SECONDS = 10

export function runRegularLifelineCount(freeRemaining, purchasedRemaining) {
  const free = Math.max(0, Math.floor(Number(freeRemaining) || 0))
  const purchased = Math.max(0, Math.floor(Number(purchasedRemaining) || 0))
  return Math.min(MAX_REGULAR_LIFELINE_USES_PER_GAME, free + purchased)
}

export function canUseSecondChance(ownedRemaining, usedThisGame) {
  return Math.max(0, Math.floor(Number(ownedRemaining) || 0)) > 0
    && Math.max(0, Math.floor(Number(usedThisGame) || 0)) < MAX_SECOND_CHANCE_USES_PER_GAME
}

export function shouldInvalidateActiveSession(status, isHidden) {
  return status === 'active' && Boolean(isHidden)
}

export function canUseExtraTime(ownedRemaining, usedThisGame, alreadyUsedOnQuestion) {
  return Math.max(0, Math.floor(Number(ownedRemaining) || 0)) > 0
    && Math.max(0, Math.floor(Number(usedThisGame) || 0)) < MAX_EXTRA_TIME_USES_PER_GAME
    && !alreadyUsedOnQuestion
}
