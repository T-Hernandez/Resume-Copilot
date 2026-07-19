import * as fs from 'fs';
import * as path from 'path';
import { handleAnalyzeRequest, parseAnalyzeRequestBody, InvalidRequestError } from '../../api/analyze-handler';

// Same reasoning as specifications/infrastructure/extract-text.spec.ts: not
// a Scenario() (that DSL is domain-text-in/analysis-out only, with no
// notion of an HTTP request body or base64 payloads), but still wired into
// `npm run specs` so the API layer can't silently regress.
//
// Deliberately never sends `recommend: true` - that path calls the live
// Claude API and would make this suite depend on network access and
// credentials that don't exist in this environment. The recommend branch's
// own try/catch (verified manually via the CLI's --recommend flag) is
// already proven to degrade to recommendationError instead of throwing.
const PDF_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.pdf');
const DOCX_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.docx');

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

  await check('handleAnalyzeRequest resolves plain-text resume+job into an Analysis', async () => {
    const result = await handleAnalyzeRequest({
      resume: { text: 'Jamie Rivera\n\nSkills\nReact, TypeScript' },
      job: { text: JOB_TEXT }
    });
    if (typeof result.analysis.overall !== 'number') {
      throw new Error(`expected analysis.overall to be a number, got: ${JSON.stringify(result.analysis.overall)}`);
    }
    if (result.recommendations !== undefined) {
      throw new Error('expected no recommendations when recommend is omitted (defaults to false)');
    }
  });

  await check('handleAnalyzeRequest decodes a base64 PDF resume via the same extractor the CLI uses', async () => {
    const base64 = fs.readFileSync(PDF_FIXTURE).toString('base64');
    const result = await handleAnalyzeRequest({
      resume: { base64, format: 'pdf' },
      job: { text: JOB_TEXT }
    });
    if (!result.analysis.strengths?.some(s => s.includes('React'))) {
      throw new Error(`expected a React strength from the PDF fixture, got: ${JSON.stringify(result.analysis.strengths)}`);
    }
  });

  await check('handleAnalyzeRequest decodes a base64 DOCX resume via the same extractor the CLI uses', async () => {
    const base64 = fs.readFileSync(DOCX_FIXTURE).toString('base64');
    const result = await handleAnalyzeRequest({
      resume: { base64, format: 'docx' },
      job: { text: JOB_TEXT }
    });
    if (!result.analysis.strengths?.some(s => s.includes('React'))) {
      throw new Error(`expected a React strength from the DOCX fixture, got: ${JSON.stringify(result.analysis.strengths)}`);
    }
  });

  await check('parseAnalyzeRequestBody rejects a missing resume field', () => {
    let threw = false;
    try {
      parseAnalyzeRequestBody({ job: { text: JOB_TEXT } });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a missing resume field');
  });

  await check('parseAnalyzeRequestBody rejects a non-boolean recommend field', () => {
    let threw = false;
    try {
      parseAnalyzeRequestBody({ resume: { text: 'x' }, job: { text: 'y' }, recommend: 'yes' });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for a non-boolean recommend field');
  });

  await check('parseAnalyzeRequestBody rejects a document that is neither text nor a valid base64/format pair', () => {
    let threw = false;
    try {
      parseAnalyzeRequestBody({ resume: { base64: 'abc', format: 'exe' }, job: { text: JOB_TEXT } });
    } catch (err) {
      threw = err instanceof InvalidRequestError;
    }
    if (!threw) throw new Error('expected InvalidRequestError for an unsupported format');
  });

  console.log(`\nDone. ${failed} failed / 6 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
