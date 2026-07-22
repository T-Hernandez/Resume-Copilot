import { handleAnalyzeResumeRequest, parseAnalyzeResumeRequestBody } from '../../api/analyze-resume-handler';
import { InvalidRequestError } from '../../api/analyze-handler';

// Same reasoning as analyze-handler.spec.ts: not a Scenario() (that DSL has
// no notion of an HTTP request body), but wired into `npm run specs` so this
// route can't silently regress.

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

  await check('handleAnalyzeResumeRequest extracts skills/experience/education with no job involved', async () => {
    const result = await handleAnalyzeResumeRequest({
      resume: { text: 'Jamie Rivera\n\nSkills\nReact, TypeScript\n\nExperience\nCompany A\nEngineer\n2020 - 2022' }
    });
    if (!result.insight.skills.some(s => s.raw === 'React' || s.canonical === 'react')) {
      throw new Error(`expected React among extracted skills, got: ${JSON.stringify(result.insight.skills)}`);
    }
    if (result.insight.experience.length !== 1) {
      throw new Error(`expected 1 experience entry, got: ${JSON.stringify(result.insight.experience)}`);
    }
    if ((result.insight as any).analysis !== undefined || (result.insight as any).overall !== undefined) {
      throw new Error('resume-only insight must never carry a job-comparison score - there is no job to compare against');
    }
  });

  await check('handleAnalyzeResumeRequest passes a caller-supplied resumeId through instead of only a content hash', async () => {
    const result = await handleAnalyzeResumeRequest({
      resume: { text: 'Skills: React' },
      resumeId: 'candidate-42'
    });
    if (result.insight.resumeId !== 'candidate-42') {
      throw new Error(`expected resumeId to pass through unchanged, got: ${result.insight.resumeId}`);
    }
  });

  await check('parseAnalyzeResumeRequestBody rejects a missing resume field', () => {
    let threw = false;
    try {
      parseAnalyzeResumeRequestBody({});
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a missing resume field');
  });

  await check('parseAnalyzeResumeRequestBody rejects a non-string resumeId', () => {
    let threw = false;
    try {
      parseAnalyzeResumeRequestBody({ resume: { text: 'x' }, resumeId: 42 });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a non-string resumeId');
  });

  await check('handleAnalyzeResumeRequest rejects a corrupt/non-PDF upload with a clear InvalidRequestError, not a raw parser crash', async () => {
    const base64 = Buffer.from('this is not a real PDF, just plain text').toString('base64');
    let threw = false;
    let message = '';
    try {
      await handleAnalyzeResumeRequest({ resume: { base64, format: 'pdf' } });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
      message = err instanceof Error ? err.message : String(err);
    }
    if (!threw) throw new Error(`expected InvalidRequestError for a corrupt PDF upload, got: ${message}`);
    if (!/PDF/.test(message)) throw new Error(`expected the error message to mention PDF, got: ${message}`);
  });

  await check('handleAnalyzeResumeRequest rejects a corrupt/non-DOCX upload with a clear InvalidRequestError, not a raw parser crash', async () => {
    const base64 = Buffer.from('this is not a real DOCX, just plain text').toString('base64');
    let threw = false;
    try {
      await handleAnalyzeResumeRequest({ resume: { base64, format: 'docx' } });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a corrupt DOCX upload');
  });

  console.log(`\nDone. ${failed} failed / 6 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
