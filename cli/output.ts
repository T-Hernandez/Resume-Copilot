import { Analysis } from '../01-domain/entities/analysis';
import { Recommendation } from '../01-domain/value-objects/recommendation';

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

export function printAnalysis(analysis: Analysis): void {
  console.log('Resume Copilot - Analysis');
  console.log('='.repeat(40));
  console.log(`Overall score: ${formatOverall(analysis.overall, analysis.confidence)}`);
  console.log(`Confidence: ${formatConfidence(analysis.confidence)}`);
  if (analysis.confidence === undefined) {
    console.log('Reason: the job description contains no evaluable requirements.');
  }

  console.log('\nBreakdown:');
  for (const [category, score] of Object.entries(analysis.breakdown)) {
    console.log(`  ${category}: ${score}%`);
  }

  printSection('Strengths', analysis.strengths);
  printSection('Weaknesses', analysis.weaknesses);
  printSection('Gaps', analysis.gaps);

  if (analysis.warnings && analysis.warnings.length) {
    printSection('Warnings', analysis.warnings);
  }
}

export function printRecommendations(recommendations: Recommendation[]): void {
  console.log('\nRecommendations:');
  if (!recommendations.length) {
    console.log('  (none)');
    return;
  }
  for (const recommendation of recommendations) {
    console.log(`  [${recommendation.severity}] ${recommendation.text}`);
  }
}
