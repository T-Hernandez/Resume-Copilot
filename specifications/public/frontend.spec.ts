import * as fs from 'fs';
import * as path from 'path';
import { JSDOM, requestInterceptor } from 'jsdom';

// The frontend (public/*.js) had zero automated coverage before this file -
// everything about it was verified by hand each round (curl, manual API
// calls, reading the code). That already let one real bug through earlier
// this session: translateElement() applying textContent= to a <label> that
// also wrapped a <input type="file">, silently deleting the file input on
// every translation pass. This suite loads the actual public/index.html in
// jsdom, with the real <script src> tags executing in the same order the
// browser uses, so it exercises the real files - not reimplementations of
// their logic.

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

// Lets jsdom's runScripts:"dangerously" resolve <script src="/app.js">
// (and index.html's other relative URLs) against the real files on disk
// instead of making network requests - jsdom 29's resource-loading hook
// (requestInterceptor) replaced the older ResourceLoader class API.
const CONTENT_TYPES: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css' };

async function loadPage(): Promise<JSDOM> {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: {
      interceptors: [
        requestInterceptor(request => {
          const parsed = new URL(request.url);
          if (parsed.hostname !== 'localhost') return undefined;
          const filePath = path.join(PUBLIC_DIR, parsed.pathname);
          if (!fs.existsSync(filePath)) return undefined;
          const ext = path.extname(filePath);
          return new Response(fs.readFileSync(filePath), {
            headers: { 'Content-Type': CONTENT_TYPES[ext] || 'text/plain' }
          });
        })
      ]
    }
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('page load timed out')), 5000);
    dom.window.addEventListener('load', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  return dom;
}

async function waitFor(fn: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

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
      console.error(`    ${err instanceof Error ? err.stack : err}`);
    }
  }

  await check('escapeHtml neutralizes markup instead of injecting it', async () => {
    const dom = await loadPage();
    const result = (dom.window as any).escapeHtml('<script>alert(1)</script>');
    if (result.includes('<script>')) throw new Error(`expected escaped output, got: ${result}`);
    dom.window.close();
  });

  await check('isEmptyDocument treats a file-backed document as non-empty', async () => {
    const dom = await loadPage();
    const isEmptyDocument = (dom.window as any).isEmptyDocument;
    if (!isEmptyDocument({ text: '   ' })) throw new Error('whitespace-only text should be empty');
    if (isEmptyDocument({ base64: 'abc', format: 'pdf' })) throw new Error('a file document should never be empty');
    dom.window.close();
  });

  await check('formatFromFilename recognizes supported extensions only', async () => {
    const dom = await loadPage();
    const formatFromFilename = (dom.window as any).formatFromFilename;
    if (formatFromFilename('resume.PDF') !== 'pdf') throw new Error('expected case-insensitive .pdf match');
    if (formatFromFilename('resume.docx') !== 'docx') throw new Error('expected .docx match');
    if (formatFromFilename('resume.txt') !== null) throw new Error('.txt should resolve to null (sent as plain text)');
    dom.window.close();
  });

  await check('translateElement re-translates text without deleting sibling form controls', async () => {
    // Regression test for the exact bug this session found by inspection:
    // data-i18n applied to a <label> that also wraps an <input type="file">
    // used to wipe the input via textContent=.
    const dom = await loadPage();
    const { document } = dom.window;
    (dom.window as any).setLang('es');
    const fileInput = document.getElementById('analyze-resume-file');
    if (!fileInput) throw new Error('file input was removed by translateElement()');
    if (fileInput.tagName !== 'INPUT') throw new Error('expected the file input to survive translation');
    dom.window.close();
  });

  await check('setLang updates translated text and persists the choice', async () => {
    const dom = await loadPage();
    const { document } = dom.window;
    (dom.window as any).setLang('es');
    const tagline = document.querySelector('.tagline');
    if (!tagline || !tagline.textContent!.includes('Pega un CV')) {
      throw new Error(`expected Spanish tagline, got: ${tagline && tagline.textContent}`);
    }
    if (document.documentElement.lang !== 'es') throw new Error('documentElement.lang was not updated');
    dom.window.close();
  });

  await check('"Try with example data" fills the analyze form from SAMPLE_DATA', async () => {
    const dom = await loadPage();
    const { document } = dom.window;
    const sample = (dom.window as any).SAMPLE_DATA;
    document.getElementById('analyze-example')!.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    const resumeText = (document.getElementById('analyze-resume-text') as HTMLTextAreaElement).value;
    const jobText = (document.getElementById('analyze-job-text') as HTMLTextAreaElement).value;
    if (resumeText !== sample.analyze.resume) throw new Error('resume textarea was not filled from SAMPLE_DATA');
    if (jobText !== sample.analyze.job) throw new Error('job textarea was not filled from SAMPLE_DATA');
    dom.window.close();
  });

  await check('"Try with example data" fills the compare form with 2 differentiated candidates', async () => {
    const dom = await loadPage();
    const { document } = dom.window;
    document.getElementById('compare-example')!.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    const rows = Array.from(document.querySelectorAll('#candidate-list .candidate'));
    if (rows.length !== 2) throw new Error(`expected 2 candidate rows, got ${rows.length}`);
    const ids = rows.map(row => ((row as Element).querySelector('.candidate-id') as HTMLInputElement).value);
    if (new Set(ids).size !== ids.length) throw new Error('example candidates should have distinct ids');
    dom.window.close();
  });

  await check('submitting the analyze form renders the API response instead of crashing', async () => {
    const dom = await loadPage();
    const { document } = dom.window;
    (document.getElementById('analyze-resume-text') as HTMLTextAreaElement).value = 'Skills: React';
    (document.getElementById('analyze-job-text') as HTMLTextAreaElement).value = 'Required Skills: React';

    (dom.window as any).fetch = async () => ({
      ok: true,
      json: async () => ({
        analysis: { overall: 42, confidence: 80, warnings: [] },
        explanation: [{ category: 'skills', score: 100, matched: ['React'], missing: [] }],
        recommendations: [{ id: 'r1', text: 'Keep it up', severity: 'low' }]
      })
    });

    document.getElementById('analyze-form')!.dispatchEvent(new dom.window.Event('submit', { cancelable: true, bubbles: true }));
    await waitFor(() => document.getElementById('analyze-results')!.innerHTML.length > 0);
    const resultsHtml = document.getElementById('analyze-results')!.innerHTML;
    if (!resultsHtml.includes('42')) throw new Error(`expected the overall score in rendered output, got: ${resultsHtml}`);
    dom.window.close();
  });

  await check('checking "no specific job posting" disables the job field and posts to /analyze-resume', async () => {
    const dom = await loadPage();
    const { document } = dom.window;
    (document.getElementById('analyze-resume-text') as HTMLTextAreaElement).value = 'Skills: React';

    const noJobCheckbox = document.getElementById('analyze-no-job') as HTMLInputElement;
    noJobCheckbox.checked = true;
    noJobCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const jobText = document.getElementById('analyze-job-text') as HTMLTextAreaElement;
    if (!jobText.disabled) throw new Error('expected the job textarea to be disabled once "no job" is checked');

    let requestedUrl = '';
    (dom.window as any).fetch = async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          insight: {
            resumeId: 'r1',
            skills: [{ raw: 'React', canonical: 'react' }],
            experience: [],
            education: [],
            totalExperienceYears: 0,
            warnings: []
          }
        })
      };
    };

    document.getElementById('analyze-form')!.dispatchEvent(new dom.window.Event('submit', { cancelable: true, bubbles: true }));
    await waitFor(() => document.getElementById('analyze-results')!.innerHTML.length > 0);
    if (requestedUrl !== '/analyze-resume') throw new Error(`expected a POST to /analyze-resume, got: ${requestedUrl}`);
    const resultsHtml = document.getElementById('analyze-results')!.innerHTML;
    if (!resultsHtml.toLowerCase().includes('react')) throw new Error(`expected the extracted skill in rendered output, got: ${resultsHtml}`);
    if (resultsHtml.includes('undefined') || resultsHtml.includes('NaN')) {
      throw new Error(`resume-only render leaked an undefined/NaN field: ${resultsHtml}`);
    }
    dom.window.close();
  });

  console.log(failed === 0 ? '\nAll frontend checks passed.' : `\n${failed} frontend check(s) failed.`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
