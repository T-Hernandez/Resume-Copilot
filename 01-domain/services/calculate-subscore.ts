import { MatchResult } from '../entities/match-result';

export interface SubscoreCalculator {
  calculate(matchResults: MatchResult[], category: string): number;
}
