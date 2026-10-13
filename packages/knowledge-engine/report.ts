export type AnswerRecord = {
  questionId: string;
  category: string;
  correct: boolean;
  explanation?: string;
};

export type KnowledgeReport = {
  attempted: number;
  correct: number;
  wrong: number;
  accuracyPercent: number;
  categories: Array<{ category: string; attempted: number; correct: number; accuracyPercent: number }>;
  strengths: string[];
  areasToImprove: string[];
  lifelinesUsed: number;
};

export function buildKnowledgeReport(answers: AnswerRecord[], lifelinesUsed = 0): KnowledgeReport {
  const attempted = answers.length;
  const correct = answers.filter(a => a.correct).length;
  const wrong = attempted - correct;
  const accuracyPercent = attempted ? Math.round((correct / attempted) * 100) : 0;
  const map = new Map<string, { attempted: number; correct: number }>();
  for (const a of answers) {
    const current = map.get(a.category) ?? { attempted: 0, correct: 0 };
    current.attempted++;
    if (a.correct) current.correct++;
    map.set(a.category, current);
  }
  const categories = [...map.entries()].map(([category, v]) => ({
    category,
    attempted: v.attempted,
    correct: v.correct,
    accuracyPercent: Math.round((v.correct / v.attempted) * 100)
  })).sort((a,b) => b.accuracyPercent - a.accuracyPercent);
  const strengths = categories.filter(c => c.accuracyPercent >= 70 && c.attempted >= 1).slice(0, 3).map(c => c.category);
  const areasToImprove = categories.filter(c => c.accuracyPercent < 60).sort((a,b) => a.accuracyPercent-b.accuracyPercent).slice(0, 3).map(c => c.category);
  return { attempted, correct, wrong, accuracyPercent, categories, strengths, areasToImprove, lifelinesUsed };
}
