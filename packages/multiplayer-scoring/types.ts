export type RoundOutcome = 'correct' | 'wrong' | 'timeout' | 'unanswered';
export type MatchResult = 'player_a' | 'player_b' | 'tie';

export interface PlayerRoundScore {
  playerId: string;
  questionIndex: number;
  outcome: RoundOutcome;
  moneyAfterRound: number;
}

export interface MatchFinalResult {
  matchId: string;
  result: MatchResult;
  playerAMoney: number;
  playerBMoney: number;
  playerAQuestionsSurvived: number;
  playerBQuestionsSurvived: number;
}
