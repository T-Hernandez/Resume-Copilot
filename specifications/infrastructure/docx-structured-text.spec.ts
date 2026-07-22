import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromDocx } from '../../infrastructure/extract-text';
import { htmlToLines } from '../../infrastructure/docx-structured-text';
import { parseResumeDocument } from '../../01-domain/services/parse-resume-document';

// Real-world regression coverage for infrastructure/docx-structured-text.ts:
// mammoth's own extractRawText() joins every paragraph with a blank line
// unconditionally, which turned a real bulleted job description (title
// paragraph, then several bullet paragraphs - the normal way to write one)
// into one broken "entry" per bullet, since a blank line is exactly the
// signal splitEntryBlocks/parseResumeSections use to start a new
// experience/education entry. examples/resume-docx-bullets-test.docx is a
// small hand-built fixture (see the DOCX generator referenced in this
// repo's history) with a real Word bulleted list under the first job and a
// genuine blank paragraph before the second - both signals this fix must
// read correctly, with synthetic-only data.
const DOCX_FIXTURE = path.resolve(__dirname, '../../examples/resume-docx-bullets-test.docx');
const EXISTING_SINGLE_PARAGRAPH_FIXTURE = path.resolve(__dirname, '../../examples/resume-test.docx');

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

  await check('extractTextFromDocx keeps a real Word bulleted list attached to its job title, not split into orphaned entries', async () => {
    const buffer = fs.readFileSync(DOCX_FIXTURE);
    const text = await extractTextFromDocx(buffer);
    const parsed = parseResumeDocument(text);

    if (parsed.experience.length !== 2) {
      throw new Error(`expected 2 experience entries, got ${parsed.experience.length}: ${JSON.stringify(parsed.experience)}`);
    }
    const [first, second] = parsed.experience;
    if (first.company !== 'Nimbus Labs' || first.title !== 'Backend Engineer') {
      throw new Error(`expected first entry Nimbus Labs / Backend Engineer, got: ${JSON.stringify(first)}`);
    }
    if (!first.bullets || first.bullets.length !== 2) {
      throw new Error(`expected the first entry's 2 bullets to stay attached to it, got: ${JSON.stringify(first.bullets)}`);
    }
    if (second.company !== 'Vertex Systems' || second.title !== 'Support Engineer') {
      throw new Error(`expected second entry Vertex Systems / Support Engineer (split at the real blank paragraph), got: ${JSON.stringify(second)}`);
    }
  });

  await check('extractTextFromDocx still parses a plain single-paragraph-per-entry resume unchanged', async () => {
    const buffer = fs.readFileSync(EXISTING_SINGLE_PARAGRAPH_FIXTURE);
    const text = await extractTextFromDocx(buffer);
    const parsed = parseResumeDocument(text);

    if (parsed.experience.length !== 1) {
      throw new Error(`expected 1 experience entry, got ${parsed.experience.length}: ${JSON.stringify(parsed.experience)}`);
    }
    if (parsed.experience[0].company !== 'Acme Corp' || parsed.experience[0].title !== 'Frontend Developer') {
      throw new Error(`expected Acme Corp / Frontend Developer, got: ${JSON.stringify(parsed.experience[0])}`);
    }
  });

  await check('htmlToLines joins list items with a single newline, not a blank line', () => {
    const html = '<p>Title</p><ul><li>First bullet</li><li>Second bullet</li></ul>';
    const lines = htmlToLines(html);
    if (lines.includes('')) {
      throw new Error(`expected no blank-line marker between bullets of the same list, got: ${JSON.stringify(lines)}`);
    }
    if (!lines.includes('- First bullet') || !lines.includes('- Second bullet')) {
      throw new Error(`expected bullet-prefixed lines, got: ${JSON.stringify(lines)}`);
    }
  });

  await check('htmlToLines treats a genuinely empty paragraph as a real break, and two adjacent non-empty ones as one', () => {
    const html = '<p>First</p><p>Second</p><p></p><p>Third</p>';
    const lines = htmlToLines(html);
    if (lines.join('|') !== 'First|Second||Third') {
      throw new Error(`expected First,Second joined (no source break) then a blank marker before Third, got: ${JSON.stringify(lines)}`);
    }
  });

  console.log(`\nDone. ${failed} failed / 4 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
