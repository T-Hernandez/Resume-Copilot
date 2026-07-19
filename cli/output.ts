import { Analysis } from '../01-domain/entities/analysis';
import { Recommendation } from '../01-domain/value-objects/recommendation';
import { CategoryExplanation } from '../01-domain/services/build-score-explanation';

// confidence is `undefined` (not 0) when nothing was actually evaluated -
// see generate-analysis-v2.ts. The CLI reflects that distinction rather
// than collapsing it back into a misleading "0%".
function formatConfidence(confidence: number | undefined): string {
  return typeof confidence === 'number' ? `${confidence}%` : 'n/a (nothing was evaluated)';
}

// UX-only caveat, not a change to the number itself: when confidence is
// undefined, `overall` is still a correct answer (calculateSubscore([])
// deliberately scores an empty category 100 - "nothing required" is not
// "candidate failed", and that rule is real, tested domain logic that
// should not be touched here). The long inline caveat this used to print
// buried the actual explanation after the number a reader sees first - kept
// short here ("empty checklist") and moved the full explanation to its own
// "Reason:" line in printAnalysis, so "100%" is never the last word.
function formatOverall(overall: number, confidence: number | undefined): string {
  return confidence === undefined ? `${overall}% (empty checklist)` : `${overall}%`;
}

function printSection(title: string, items: string[] | undefined): void {
  console.log(`\n${title}:`);
  if (!items || !items.length) {
    console.log('  (none)');
    return;
  }
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

// 10-cell bar, floor()'d rather than round()'d so e.g. 75 reads as 7 filled
// cells, not 8 - a partial cell would misleadingly round a score up.
function formatBar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.floor(score / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// Per-category visual breakdown, replacing the old flat "Breakdown:"
// percentage list plus the separate Strengths/Weaknesses/Gaps sections -
// explanation already carries the same matched/missing facts those three
// sections did, just grouped by category instead of flattened, so printing
// both would only repeat the same facts in two shapes. See
// 01-domain/services/build-score-explanation.ts.
function printExplanation(explanation: CategoryExplanation[]): void {
  console.log('\nBreakdown:');
  for (const category of explanation) {
    const label = category.category.charAt(0).toUpperCase() + category.category.slice(1);
    console.log(`\n${label}`);
    console.log(`${formatBar(category.score)} ${category.score}`);
    for (const item of category.matched) {
      console.log(`  + ${item}`);
    }
    for (const item of category.missing) {
      console.log(`  - ${item} (missing)`);
    }
  }
}

export function printAnalysis(analysis: Analysis, explanation: CategoryExplanation[]): void {
  console.log('Resume Copilot - Analysis');
  console.log('='.repeat(40));
  console.log(`Overall score: ${formatOverall(analysis.overall, analysis.confidence)}`);
  console.log(`Confidence: ${formatConfidence(analysis.confidence)}`);
  if (analysis.confidence === undefined) {
    console.log('Reason: the job description contains no evaluable requirements.');
  }

  printExplanation(explanation);

  if (analysis.warnings && analysis.warnings.length) {
    printSection('Warnings', analysis.warnings);
  }
}

export function printRecommendations(recommendations: Recommendation[], title = 'Recommendations'): void {
  console.log(`\n${title}:`);
  if (!recommendations.length) {
    console.log('  (none)');
    return;
  }
  for (const recommendation of recommendations) {
    console.log(`  [${recommendation.severity}] ${recommendation.text}`);
  }
}
