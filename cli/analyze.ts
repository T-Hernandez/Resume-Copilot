import * as fs from 'fs';
import * as path from 'path';
import { generateAnalysis } from '../01-domain/services/generate-analysis';
import { PipelineConfig } from '../01-domain/entities/pipeline-config';

// First public interface consuming the domain (Ubiquitous-Language.md's
// "Aplicación / Presentación (externo a dominio)" layer) - not 01-domain
// work, deliberately: this only ever calls generateAnalysis() and formats
// what comes back, same boundary the spec harness's executor.ts has
// respected all along. No new domain logic lives here.
const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  algorithmVersion: '2.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};

function readFile(filePath: string): string {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function formatConfidence(confidence: number | undefined): string {
  // confidence is `undefined` (not 0) when nothing was actually evaluated -
  // see generate-analysis-v2.ts. The CLI reflects that distinction rather
  // than collapsing it back into a misleading "0%".
  return typeof confidence === 'number' ? `${confidence}%` : 'n/a (nothing was evaluated)';
}

// UX-only caveat, not a change to the number itself: when confidence is
// undefined, `overall` is still a correct answer (calculateSubscore([])
// deliberately scores an empty category 100 - "nothing required" is not
// "candidate failed", and that rule is real, tested domain logic that
// should not be touched here). What's misleading is showing "100%" with no
// context right next to "confidence: n/a" - a reader sees a strong match,
// not an empty checklist. This adds the missing context without hiding or
// altering the real, honestly-computed value.
function formatOverall(overall: number, confidence: number | undefined): string {
  if (confidence === undefined) {
    return `${overall}% (no requirements were stated for this job - this reflects an empty checklist, not a strong match)`;
  }
  return `${overall}%`;
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

function main(): void {
  const [, , resumePath, jobPath] = process.argv;

  if (!resumePath || !jobPath) {
    console.error('Usage: npm run analyze -- <resume.txt> <job.txt>');
    process.exit(1);
  }

  const resumeText = readFile(resumePath);
  const jobText = readFile(jobPath);

  const { analysis } = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG
  });

  console.log('Resume Copilot - Analysis');
  console.log('='.repeat(40));
  console.log(`Overall score: ${formatOverall(analysis.overall, analysis.confidence)}`);
  console.log(`Confidence: ${formatConfidence(analysis.confidence)}`);

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

  console.log('');
}

main();
