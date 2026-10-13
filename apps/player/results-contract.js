// UI contract for the final results screen.
export function renderResults(result) {
  return {
    headline: result.status === 'won' ? 'BILLION RUSH COMPLETE' : 'RUSH COMPLETE',
    amount: result.amount,
    attempted: result.report?.attempted ?? 0,
    correct: result.report?.correct ?? 0,
    wrong: result.report?.wrong ?? 0,
    accuracyPercent: result.report?.attempted ? Math.round(result.report.correct / result.report.attempted * 100) : 0,
    shareText: `I reached ₦${Number(result.amount || 0).toLocaleString()} in Billion Rush! Can you beat me?`
  };
}
