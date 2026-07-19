import { handleCompareRequest, parseCompareRequestBody } from '../../api/compare-handler';
import { InvalidRequestError } from '../../api/analyze-handler';

// Same pattern as analyze-handler.spec.ts - standalone async script, not a
// Scenario(), wired into `npm run specs` as specs:api alongside it.
const JOB_TEXT = 'Required Skills: React, TypeScript\nMinExperienceYears: 1';

async function run(): Promise<void> {
  let failed = 0;

  async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
    process.stdout.write(`- ${name} ... `);
    try {
      await fn();
      console.log('OK');
    } catch (err) {
      failed++;
      console.log('FAILED');
      console.error(`    ${err instanceof Error ? err.message : err}`);
    }
  }

  await check('handleCompareRequest ranks candidates and preserves caller-supplied ids in the response', async () => {
    const result = await handleCompareRequest({
      job: { text: JOB_TEXT },
      resumes: [
        { id: 'candidate-a', document: { text: 'Skills: React, TypeScript\nExperience\nCompany A\nEngineer\n2018 - 2023' } },
        { id: 'candidate-b', document: { text: 'Skills: React\nExperience\nCompany B\nEngineer\n2022 - 2023' } }
      ]
    });
    if (result.results.length !== 2) {
      throw new Error(`expected 2 results, got ${result.results.length}`);
    }
    if (result.results[0].id !== 'candidate-a') {
      throw new Error(`expected candidate-a ranked first, got ${result.results[0].id}`);
    }
    if (result.results[0].rank !== 1 || result.results[1].rank !== 2) {
      throw new Error(`expected ranks 1,2, got ${result.results.map(r => r.rank).join(',')}`);
    }
  });

  await check('parseCompareRequestBody rejects fewer than 2 resumes', () => {
    let threw = false;
    try {
      parseCompareRequestBody({ job: { text: JOB_TEXT }, resumes: [{ id: 'only-one', document: { text: 'x' } }] });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for fewer than 2 resumes');
  });

  await check('parseCompareRequestBody rejects duplicate resume ids', () => {
    let threw = false;
    try {
      parseCompareRequestBody({
        job: { text: JOB_TEXT },
        resumes: [
          { id: 'dup', document: { text: 'x' } },
          { id: 'dup', document: { text: 'y' } }
        ]
      });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for duplicate ids');
  });

  await check('parseCompareRequestBody rejects a resume entry missing its document', () => {
    let threw = false;
    try {
      parseCompareRequestBody({
        job: { text: JOB_TEXT },
        resumes: [
          { id: 'a', document: { text: 'x' } },
          { id: 'b' }
        ]
      });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a resume entry missing document');
  });

  console.log(`\nDone. ${failed} failed / 4 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
