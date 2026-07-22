import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromPdf, extractTextFromDocx } from '../../infrastructure/extract-text';

// Not a Scenario (specifications/runner) - that harness is text-in/text-out
// over the deterministic domain pipeline and has no notion of binary file
// IO. This is a small standalone async check that infrastructure/
// extract-text.ts still reads real PDF/DOCX bytes correctly, run via the
// same npm run specs entry point so it can't be skipped.
//
// The fixtures are the exact hand-built files used to manually verify
// ingestion when it was first built (examples/resume-test.pdf,
// examples/resume-test.docx) - kept as permanent fixtures specifically so a
// future pdf-parse/mammoth upgrade that silently breaks extraction fails
// here instead of only being caught by another manual test.
const PDF_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.pdf');
const DOCX_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.docx');

async function run(): Promise<void> {
  let failed = 0;

  async function check(name: string, fn: () => Promise<void>): Promise<void> {
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

  await check('extractTextFromPdf reads real PDF bytes and finds known content', async () => {
    const buffer = fs.readFileSync(PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    if (!text.includes('React')) {
      throw new Error(`expected extracted PDF text to contain "React", got: ${JSON.stringify(text)}`);
    }
  });

  await check('extractTextFromPdf does not leak pdf-parse\'s page-boundary marker into the text', async () => {
    const buffer = fs.readFileSync(PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    if (/--\s*\d+\s+of\s+\d+\s*--/.test(text)) {
      throw new Error(`expected no "-- N of M --" page-joiner artifact in extracted text, got: ${JSON.stringify(text)}`);
    }
  });

  await check('extractTextFromDocx reads real DOCX bytes and finds known content', async () => {
    const buffer = fs.readFileSync(DOCX_FIXTURE);
    const text = await extractTextFromDocx(buffer);
    if (!text.includes('React')) {
      throw new Error(`expected extracted DOCX text to contain "React", got: ${JSON.stringify(text)}`);
    }
  });

  console.log(`\nDone. ${failed} failed / 3 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
