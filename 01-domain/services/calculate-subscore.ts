import { Match } from '../value-objects/match';

// Score Engine, part 1: turns a batch of Match<T> for ONE category (e.g.
// every SkillMatch for the job's required skills) into a single 0..100
// subscore. Operates purely on Match<T> - it never sees resume/job text,
// which is the point of the Evidence -> Match -> Score layering: this
// function cannot "cheat" by reading the raw CV, only what Matching already
// decided.
//
// Unmatched items score 0 rather than being dropped, and a matched item's
// own confidence carries through rather than being flattened to 100 - a
// skill matched only via a summary mention (lower confidence) should pull
// the subscore down less than one backed by the Skills section itself.
// An empty category (nothing was required) scores 100 rather than 0 -
// "no requirements" should never read as "candidate failed everything".
export function calculateSubscore<T>(matches: Array<Match<T>>): number {
  if (!matches.length) return 100;
  const total = matches.reduce((sum, match) => sum + (match.matched ? match.confidence : 0), 0);
  return Math.round(total / matches.length);
}
