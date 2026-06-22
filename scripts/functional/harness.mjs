// Tiny zero-dependency test framework for the functional (integration) harness.
// Not Vitest — these tests hit a real HTTP server, so we want a single process,
// ordered execution, and a clean PASS/FAIL report with a non-zero exit on failure.

const suites = [];

export function suite(name, fn) {
  const cases = [];
  suites.push({ name, cases });
  const ctx = {
    test: (caseName, run) => cases.push({ name: caseName, run }),
  };
  fn(ctx);
}

class AssertionError extends Error {}

export function expect(actual) {
  const fail = (msg) => {
    throw new AssertionError(msg);
  };
  return {
    toBe(expected) {
      if (actual !== expected) fail(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        fail(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) fail(`expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) fail(`expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) fail(`expected null, got ${JSON.stringify(actual)}`);
    },
    toBeOneOf(list) {
      if (!list.includes(actual)) fail(`expected one of ${JSON.stringify(list)}, got ${JSON.stringify(actual)}`);
    },
    toContain(sub) {
      if (actual == null || !String(actual).includes(sub)) fail(`expected ${JSON.stringify(actual)} to contain ${JSON.stringify(sub)}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (!(actual >= n)) fail(`expected >= ${n}, got ${JSON.stringify(actual)}`);
    },
  };
}

const C = { green: "\x1b[32m", red: "\x1b[31m", dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m", yellow: "\x1b[33m" };

export async function runAll({ filter } = {}) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const s of suites) {
    if (filter && !s.name.toLowerCase().includes(filter.toLowerCase())) continue;
    console.log(`\n${C.bold}▶ ${s.name}${C.reset}`);
    for (const c of s.cases) {
      try {
        await c.run();
        passed += 1;
        console.log(`  ${C.green}✓${C.reset} ${c.name}`);
      } catch (err) {
        failed += 1;
        const msg = err instanceof AssertionError ? err.message : `${err?.message ?? err}`;
        failures.push({ suite: s.name, case: c.name, msg });
        console.log(`  ${C.red}✗ ${c.name}${C.reset}\n      ${C.red}${msg}${C.reset}`);
      }
    }
  }

  console.log(`\n${"=".repeat(56)}`);
  if (failed === 0) {
    console.log(`${C.green}${C.bold}Functional harness: ${passed}/${passed} passed${C.reset}`);
  } else {
    console.log(`${C.red}${C.bold}Functional harness: ${passed}/${passed + failed} passed, ${failed} failed${C.reset}`);
    for (const f of failures) console.log(`  ${C.red}✗${C.reset} ${f.suite} › ${f.case} — ${f.msg}`);
  }
  return failed === 0;
}
