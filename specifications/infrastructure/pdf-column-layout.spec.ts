import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromPdf } from '../../infrastructure/extract-text';
import { reconstructLines } from '../../infrastructure/pdf-column-layout';
import { parseResumeDocument } from '../../01-domain/services/parse-resume-document';

// Real-world regression coverage for infrastructure/pdf-column-layout.ts:
// a genuinely two-column PDF (narrow sidebar + wider main column, the shape
// that scrambled a real user's resume - contact info interleaved into
// Experience, certifications read as fake Education entries, "0 years of
// experience" despite two real jobs) was the actual bug this file exists to
// fix. examples/resume-two-column-test.pdf is a small hand-built fixture
// (see the PDF generator referenced in this repo's history) with the same
// column shape and synthetic-only data, so this can run in CI and catch a
// future pdfjs-dist/pdf-parse upgrade that silently breaks the fix, instead
// of only being caught by re-testing against a real, uncommittable resume.
//
// Its content-stream operators are deliberately written in shuffled,
// non-reading order (alternating between the two columns) - proving this
// reconstructs by each item's real (x, y) position, not by whatever order
// they happen to appear in the file.
const PDF_FIXTURE = path.resolve(__dirname, '../../examples/resume-two-column-test.pdf');

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

  await check('extractTextFromPdf reconstructs each column as its own contiguous block, not interleaved by row', async () => {
    const buffer = fs.readFileSync(PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    const mainIndex = text.indexOf('EXPERIENCE');
    const sidebarIndex = text.indexOf('CONTACT');
    if (mainIndex === -1 || sidebarIndex === -1) {
      throw new Error(`expected both EXPERIENCE and CONTACT in extracted text, got: ${JSON.stringify(text)}`);
    }
    // The two columns must not be interleaved line-by-line: everything
    // about the main column's content (its second job, its Education
    // section) must appear before the sidebar starts, not scattered
    // between sidebar lines.
    const educationIndex = text.indexOf('EDUCATION');
    if (!(mainIndex < educationIndex && educationIndex < sidebarIndex)) {
      throw new Error(`expected EXPERIENCE < EDUCATION < CONTACT in reading order, got indices ${mainIndex}, ${educationIndex}, ${sidebarIndex} in: ${JSON.stringify(text)}`);
    }
  });

  await check('parseResumeDocument resolves 2 real experience entries from the reconstructed text, not scrambled with sidebar content', async () => {
    const buffer = fs.readFileSync(PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    const parsed = parseResumeDocument(text);

    if (parsed.experience.length !== 2) {
      throw new Error(`expected 2 experience entries, got ${parsed.experience.length}: ${JSON.stringify(parsed.experience)}`);
    }
    const [first, second] = parsed.experience;
    if (first.company !== 'Nimbus Labs' || first.title !== 'Backend Engineer' || first.startDate !== '2023') {
      throw new Error(`expected first entry Nimbus Labs / Backend Engineer / 2023, got: ${JSON.stringify(first)}`);
    }
    if (second.company !== 'Vertex Systems' || second.title !== 'Support Engineer' || second.startDate !== '2020') {
      throw new Error(`expected second entry Vertex Systems / Support Engineer / 2020, got: ${JSON.stringify(second)}`);
    }
    const experienceText = JSON.stringify(parsed.experience);
    if (experienceText.includes('CONTACT') || experienceText.includes('CERTIFICATIONS') || experienceText.includes('taylor@example.com')) {
      throw new Error(`sidebar content leaked into experience entries: ${experienceText}`);
    }
  });

  await check('parseResumeDocument resolves the education entry cleanly, not merged with certifications', async () => {
    const buffer = fs.readFileSync(PDF_FIXTURE);
    const text = await extractTextFromPdf(buffer);
    const parsed = parseResumeDocument(text);

    if (parsed.education.length !== 1) {
      throw new Error(`expected 1 education entry, got ${parsed.education.length}: ${JSON.stringify(parsed.education)}`);
    }
    const [entry] = parsed.education;
    if (entry.institution !== 'State University' || entry.degree !== 'BSc Computer Science' || entry.endDate !== '2019') {
      throw new Error(`expected State University / BSc Computer Science / 2019, got: ${JSON.stringify(entry)}`);
    }
  });

  await check('reconstructLines splits a line into separate cells at a wide same-row gap, instead of joining unrelated content with one space', () => {
    // Reproduces a real skills "grid" measured on an actual resume: two
    // unrelated pieces of content (a skill list, and an unrelated note)
    // sitting on the same Y but ~30-57pt apart horizontally - far past any
    // genuine same-phrase word gap (~8pt at most, even for a leading-year
    // label). Left group mimics "Python, Go, Javascript"; right group
    // mimics an unrelated "Focus on data analysis" note placed well to the
    // right on the same row.
    const items = [
      { str: 'Python,', x: 285, y: 700, width: 43 },
      { str: 'Go,', x: 331, y: 700, width: 20 },
      { str: 'Javascript', x: 354, y: 700, width: 57 },
      { str: 'Focus', x: 441, y: 699, width: 33 }
    ];
    const lines = reconstructLines(items);
    if (!lines.includes('Python, Go, Javascript')) {
      throw new Error(`expected the left-hand cell "Python, Go, Javascript" as its own line, got: ${JSON.stringify(lines)}`);
    }
    if (!lines.includes('Focus')) {
      throw new Error(`expected "Focus" split into its own line, not joined onto the skills cell, got: ${JSON.stringify(lines)}`);
    }
    if (lines.some(line => line.includes('Javascript Focus'))) {
      throw new Error(`unrelated same-row content got joined into one line: ${JSON.stringify(lines)}`);
    }
  });

  console.log(`\nDone. ${failed} failed / 4 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
