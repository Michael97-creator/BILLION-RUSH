export type RushShareResult = {
  moneyReached: number;
  questionsSurvived: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  displayName?: string;
  resultId?: string;
};

const naira = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
export function formatMoney(value: number) { return `₦${naira.format(Math.max(0, Math.floor(value)))}`; }

export function createSharePayload(result: RushShareResult) {
  const money = formatMoney(result.moneyReached);
  const survived = `${result.questionsSurvived}/${result.totalQuestions}`;
  const text = `I reached ${money} in Billion Rush! ${survived} questions survived. Can you beat me?`;
  return {
    title: 'Billion Rush',
    text,
    url: typeof window !== 'undefined' ? window.location.origin : '',
    hashtags: ['BillionRush', 'JumiTech', 'CanYouBeatMe']
  };
}

export function buildResultCardSvg(result: RushShareResult) {
  const money = formatMoney(result.moneyReached).replace(/&/g, '&amp;');
  const survived = `${result.questionsSurvived}/${result.totalQuestions}`;
  const safeName = (result.displayName || 'PLAYER').replace(/[<&>"']/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" rx="56" fill="#0b1020"/>
  <rect x="42" y="42" width="996" height="1266" rx="42" fill="#111a31" stroke="#2d3b63" stroke-width="3"/>
  <text x="80" y="150" fill="#8fa7d9" font-family="Arial,sans-serif" font-size="34" font-weight="700">A JUMI TECH GAME</text>
  <text x="80" y="245" fill="#ffffff" font-family="Arial,sans-serif" font-size="78" font-weight="900">BILLION RUSH</text>
  <text x="80" y="300" fill="#aab7d4" font-family="Arial,sans-serif" font-size="28">50 QUESTIONS → ₦1 BILLION</text>
  <text x="80" y="485" fill="#ffffff" font-family="Arial,sans-serif" font-size="32">${safeName}</text>
  <text x="80" y="600" fill="#ffffff" font-family="Arial,sans-serif" font-size="92" font-weight="900">${money}</text>
  <text x="80" y="670" fill="#9eacc8" font-family="Arial,sans-serif" font-size="30">reached in this run</text>
  <line x1="80" y1="760" x2="1000" y2="760" stroke="#2d3b63" stroke-width="3"/>
  <text x="80" y="850" fill="#ffffff" font-family="Arial,sans-serif" font-size="38" font-weight="800">${survived}</text>
  <text x="80" y="900" fill="#9eacc8" font-family="Arial,sans-serif" font-size="26">questions survived</text>
  <text x="530" y="850" fill="#ffffff" font-family="Arial,sans-serif" font-size="38" font-weight="800">${result.correct}/${result.totalQuestions}</text>
  <text x="530" y="900" fill="#9eacc8" font-family="Arial,sans-serif" font-size="26">correct answers</text>
  <text x="80" y="1120" fill="#d9e2f5" font-family="Arial,sans-serif" font-size="30">Can you beat me?</text>
  <text x="80" y="1190" fill="#8fa7d9" font-family="Arial,sans-serif" font-size="24">Billion Rush • Jumi Tech</text>
</svg>`;
}
