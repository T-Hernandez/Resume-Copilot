import { compareResumesToJob } from '../../01-domain/services/compare-resumes';
import { rankByAnalysis } from '../../01-domain/services/rank-analyses';
import { Analysis } from '../../01-domain/entities/analysis';
import { PipelineConfig } from '../../01-domain/entities/pipeline-config';

// Not a Scenario() - the runner/executor DSL takes exactly one resume and
// one job (its `given` shape has no notion of "N candidates"), so
// compareResumesToJob/rankByAnalysis get their own standalone spec, same
// pattern as specifications/infrastructure and specifications/api.
const PIPELINE_CONFIG: PipelineConfig = {
  algorithmVersion: '2.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};

const JOB_TEXT = 'Required Skills: React, TypeScript, Node.js\nMinExperienceYears: 3';

function fakeAnalysis(overall: number, confidence: number | undefined): Analysis {
  return {
    id: 'a', resumeId: 'r', jobId: 'j', algorithmVersion: '2.0.0', timestamp: new Date().toISOString(),
    overall, breakdown: {}, matches: [], confidence
  };
}

async function run(): Promise<void> {
  let failed = 0;

  function check(name: string, fn: () => void): void {
    process.stdout.write(`- ${name} ... `);
    try {
      fn();
      console.log('OK');
    } catch (err) {
      failed++;
      console.log('FAILED');
      console.error(`    ${err instanceof Error ? err.message : err}`);
    }
  }

  check('rankByAnalysis orders strictly by overall score, descending', () => {
    const ranked = rankByAnalysis([
      { item: 'low', analysis: fakeAnalysis(40, 50) },
      { item: 'high', analysis: fakeAnalysis(90, 50) },
      { item: 'mid', analysis: fakeAnalysis(65, 50) }
    ]);
    const order = ranked.map(r => r.item);
    if (order.join(',') !== 'high,mid,low') {
      throw new Error(`expected high,mid,low, got ${order.join(',')}`);
    }
    if (ranked[0].rank !== 1 || ranked[2].rank !== 3) {
      throw new Error(`expected ranks 1..3, got ${ranked.map(r => r.rank).join(',')}`);
    }
  });

  check('rankByAnalysis breaks a tied overall score by confidence, descending', () => {
    const ranked = rankByAnalysis([
      { item: 'less-confident', analysis: fakeAnalysis(70, 30) },
      { item: 'more-confident', analysis: fakeAnalysis(70, 90) }
    ]);
    if (ranked.map(r => r.item).join(',') !== 'more-confident,less-confident') {
      throw new Error(`expected more-confident first, got ${ranked.map(r => r.item).join(',')}`);
    }
  });

  check('rankByAnalysis sorts an undefined confidence last among equal overall scores, not as a tie or a zero', () => {
    const ranked = rankByAnalysis([
      { item: 'untested', analysis: fakeAnalysis(70, undefined) },
      { item: 'real-low-confidence', analysis: fakeAnalysis(70, 1) }
    ]);
    if (ranked.map(r => r.item).join(',') !== 'real-low-confidence,untested') {
      throw new Error(`expected real-low-confidence first, got ${ranked.map(r => r.item).join(',')}`);
    }
  });

  check('compareResumesToJob runs the real pipeline per candidate and ranks the results, preserving caller-supplied ids', () => {
    const results = compareResumesToJob(
      [
        { id: 'strong-candidate', text: 'Skills: React, TypeScript, Node.js\nExperience\nCompany A\nEngineer\n2018 - 2023' },
        { id: 'weak-candidate', text: 'Skills: React\nExperience\nCompany B\nEngineer\n2022 - 2023' }
      ],
      JOB_TEXT,
      PIPELINE_CONFIG
    );

    if (results.length !== 2) throw new Error(`expected 2 results, got ${results.length}`);
    if (results[0].id !== 'strong-candidate') {
      throw new Error(`expected strong-candidate ranked first, got ${results[0].id} (overall=${results[0].analysis.overall})`);
    }
    if (results[0].rank !== 1 || results[1].rank !== 2) {
      throw new Error(`expected ranks 1,2, got ${results.map(r => r.rank).join(',')}`);
    }
    if (results[0].analysis.overall < results[1].analysis.overall) {
      throw new Error('ranked[0] must score at least as high as ranked[1]');
    }
  });

  console.log(`\nDone. ${failed} failed / 4 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
