import { createServer } from '../../api/server';

// Unlike every other API spec (which calls handler functions directly,
// bypassing Express), this one starts the real server and makes real HTTP
// requests - the bug it protects against (malformed JSON leaking an HTML
// stack trace with local filesystem paths, an over-limit body returning a
// bare 500 instead of 413) lives in Express's own body-parser middleware,
// upstream of every handler function, so a handler-level test cannot see it.

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

  const server = createServer().listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected the test server to bind to a numeric port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  await check('malformed JSON returns a clean 400 JSON error, not an HTML stack trace with filesystem paths', async () => {
    const res = await fetch(`${baseUrl}/analyze-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json'
    });
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`expected a JSON error response, got Content-Type: ${contentType}`);
    }
    const body = await res.json();
    if (typeof body.error !== 'string' || /node_modules|\\Users\\|C:\\/.test(body.error)) {
      throw new Error(`expected a plain error message with no filesystem paths, got: ${JSON.stringify(body)}`);
    }
  });

  await check('a request body over the size limit returns 413, not a bare 500', async () => {
    const oversized = 'A'.repeat(11 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/analyze-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: { text: oversized } })
    });
    if (res.status !== 413) throw new Error(`expected 413, got ${res.status}`);
  });

  await check('a well-formed request still resolves normally through the real HTTP stack', async () => {
    const res = await fetch(`${baseUrl}/analyze-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: { text: 'Jamie Rivera\n\nSkills\nReact' } })
    });
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.insight) throw new Error(`expected an insight in the response, got: ${JSON.stringify(body)}`);
  });

  server.close();

  console.log(`\nDone. ${failed} failed / 3 total.`);
  if (failed > 0) process.exit(2);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
