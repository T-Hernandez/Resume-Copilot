type Given = { resumePath?: string; jobPath?: string; resumeText?: string; jobText?: string; pipelineConfig?: any };
type Expect = Record<string, any>;

export type ScenarioDef = {
  name: string;
  given: Given;
  expect: Expect;
  rationale?: string[];
};

const scenarios: ScenarioDef[] = [];

export function Scenario(s: ScenarioDef) {
  scenarios.push(s);
}

function evaluateExpectation(actual: any, expected: any): { ok: boolean; message?: string } {
  if (expected === undefined) return { ok: true };

  if (typeof expected === 'string') {
    const m = expected.match(/^(>=|<=|>|<|==)\s*(\d+(?:\.\d+)?)$/);
    if (m) {
      const op = m[1];
      const val = parseFloat(m[2]);
      if (typeof actual !== 'number') return { ok: false, message: `actual not number (${actual})` };
      switch (op) {
        case '>=': return { ok: actual >= val, message: `${actual} >= ${val}` };
        case '<=': return { ok: actual <= val, message: `${actual} <= ${val}` };
        case '>': return { ok: actual > val, message: `${actual} > ${val}` };
        case '<': return { ok: actual < val, message: `${actual} < ${val}` };
        case '==': return { ok: actual === val, message: `${actual} == ${val}` };
      }
    }

    if (expected.startsWith('contains:')) {
      const token = expected.slice('contains:'.length).trim();
      if (Array.isArray(actual)) return { ok: actual.includes(token), message: `array contains ${token}` };
      if (typeof actual === 'string') return { ok: actual.includes(token), message: `string contains ${token}` };
      return { ok: false, message: `unsupported actual type for contains` };
    }

    if (expected.startsWith('greaterThan:')) {
      const target = parseFloat(expected.slice('greaterThan:'.length).trim());
      if (typeof actual !== 'number' || Number.isNaN(target)) return { ok: false, message: `invalid greaterThan expectation` };
      return { ok: actual > target, message: `${actual} > ${target}` };
    }

    if (expected.startsWith('lessThan:')) {
      const target = parseFloat(expected.slice('lessThan:'.length).trim());
      if (typeof actual !== 'number' || Number.isNaN(target)) return { ok: false, message: `invalid lessThan expectation` };
      return { ok: actual < target, message: `${actual} < ${target}` };
    }
  }

  if (expected === actual) return { ok: true };
  return { ok: false, message: `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}` };
}

import { runScenario } from './executor';

export async function runAll() {
  console.log(`Running ${scenarios.length} scenarios...`);
  const startedAt = Date.now();
  let failed = 0;
  let passed = 0;
  let totalScore = 0;
  let totalConfidence = 0;
  for (const s of scenarios) {
    process.stdout.write(`- ${s.name} ... `);
    try {
      const analysis = await runScenario(s.given);
      // evaluate expectations
      let okAll = true;
      for (const key of Object.keys(s.expect)) {
        const expected = s.expect[key];
        // support nested keys like 'breakdown.skills' or 'gaps'
        const parts = key.split('.');
        let actual: any = analysis;
        for (const p of parts) {
          actual = actual?.[p];
        }
        const res = evaluateExpectation(actual, expected);
        if (!res.ok) {
          okAll = false;
          console.log(`FAILED`);
          console.log(`    - ${key}: ${res.message}`);
          break;
        }
      }
      if (okAll) {
        passed++;
        totalScore += typeof analysis?.overall === 'number' ? analysis.overall : 0;
        totalConfidence += typeof analysis?.confidence === 'number' ? analysis.confidence : 0;
        if (s.rationale?.length) {
          console.log(`OK (${s.rationale.join(' | ')})`);
        } else {
          console.log('OK');
        }
      }
      if (!okAll) failed++;
    } catch (err) {
      failed++;
      console.log('ERROR');
      console.error(err);
    }
  }
  const durationMs = Date.now() - startedAt;
  const avgScore = scenarios.length === 0 ? 0 : Math.round(totalScore / Math.max(1, passed));
  const avgConfidence = scenarios.length === 0 ? 0 : Math.round(totalConfidence / Math.max(1, passed));
  console.log(`\nDone. ${failed} failed / ${scenarios.length} total.`);
  console.log(`Average score: ${avgScore}`);
  console.log(`Average confidence: ${avgConfidence}`);
  console.log(`Execution time: ${durationMs} ms`);
  if (failed > 0) process.exit(2);
}
