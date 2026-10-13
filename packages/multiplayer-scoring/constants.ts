export const MONEY_LADDER = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000,
  1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000,
  100_000_000, 150_000_000, 250_000_000, 400_000_000, 700_000_000, 1_000_000_000,
] as const;

export function moneyForQuestion(questionIndex: number): number {
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= MONEY_LADDER.length) return 0;
  return MONEY_LADDER[questionIndex];
}
