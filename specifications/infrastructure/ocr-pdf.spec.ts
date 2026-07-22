import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromPdf } from '../../infrastructure/extract-text';
import { parseResumeDocument } from '../../01-domain/services/parse-resume-document';

// Regression coverage for infrastructure/ocr-pdf.ts: a scanned/photographed
// resume has no text layer at all (pdfjs's getTextContent() returns zero
// items), so no amount of column-aware reconstruction can recover anything
// - only reading pixels can. examples/resume-scanned-test.pdf is a small
// hand-built fixture (see the PDF generator referenced in this repo's
// history) with a single embedded JPEG of rendered text and NO text
// objects, synthetic-only content, mirroring the shape of a real scanned
// page.
//
// Slower than the rest of this suite by a wide margin (a few seconds, not
// milliseconds) - OCR itself takes real compute, and the first run on a
// machine with no cached tesseract.js language data also downloads it
// (requires network access once; cached under the OS temp dir after that,
// see ocr-pdf.ts). Accepted cost of covering a real code path rather than
// leaving it manually-verified-once, same standard as every other
// extraction fix in this repo.
const SCANNED_PDF_FIXTURE = path.resolve(__dirname, '../../examples/resume-scanned-test.pdf');
const NORMAL_PDF_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.pdf');

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

  await check('extractTextFromPdf falls back to OCR for a scanned page and recovers its text', async () => {
    const buffer = fs.readFileSync(SCANNED_PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    if (!/EXPERIENCE/i.test(text) || !/Nimbus Labs/i.test(text)) {
      throw new Error(`expected OCR to recover the scanned page's text, got: ${JSON.stringify(text)}`);
    }
  });

  await check('OCR fallback resolves a real experience entry from the scanned page, not just raw text', async () => {
    const buffer = fs.readFileSync(SCANNED_PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    const parsed = parseResumeDocument(text);
    if (parsed.experience.length !== 1 || parsed.experience[0].company !== 'Nimbus Labs') {
      throw new Error(`expected 1 experience entry (Nimbus Labs), got: ${JSON.stringify(parsed.experience)}`);
    }
  });

  await check('a normal PDF with a real text layer never triggers OCR (stays on the fast path)', async () => {
    const buffer = fs.readFileSync(NORMAL_PDF_FIXTURE);
    const start = Date.now();
    await extractTextFromPdf(buffer);
    const elapsedMs = Date.now() - start;
    // OCR alone takes at least ~1-2s just for worker init - a real text PDF
    // finishing in under 1s is strong evidence the OCR path was never
    // reached, without needing to mock/spy on extractTextViaOcr directly.
    if (elapsedMs > 1000) {
      throw new Error(`expected the fast (non-OCR) path for a normal PDF, took ${elapsedMs}ms - OCR fallback may have incorrectly triggered`);
    }
  });

  console.log(`\nDone. ${failed} failed / 3 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
