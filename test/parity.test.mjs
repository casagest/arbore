// Parity tests: one per golden case, comparing stdout/stderr/exit exactly.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeFixture, runArbore, testDir } from './helper.mjs';

const goldenDir = path.join(testDir, 'golden');

// Each case: the exact argv passed to arbore (cwd = test/, as goldens were captured).
const CASES = {
  default: ['fx-tree'],
  a: ['-a', 'fx-tree'],
  d: ['-d', 'fx-tree'],
  L1: ['-L', '1', 'fx-tree'],
  L2: ['-L', '2', 'fx-tree'],
  ad: ['-a', '-d', 'fx-tree'],
  missing: ['nu-exista'],
  I: ['-I', 'node_modules', 'fx-tree'],
  P: ['-P', '*.js', 'fx-tree'],
  dirsfirst: ['--dirsfirst', 'fx-tree'],
  J: ['-J', 'fx-tree'],
  IP: ['-I', 'node_modules|docs', 'fx-tree'],
  // R2: reject invalid -L levels (exit 1, message on stderr).
  L0: ['-L', '0', 'fx-tree'],
  Labc: ['-L', 'abc', 'fx-tree'],
  Lneg: ['-L', '-1', 'fx-tree'],
  // R2: unreadable subdir must be reported and affect the exit code.
  locked: ['fx-locked'],
  Jlocked: ['-J', 'fx-locked'],
  // R3: empty dirs + error-tail padding in JSON; derived from these goldens.
  edge: ['fx-edge'],
  Jedge: ['-J', 'fx-edge'],
  Jedge_d: ['-d', '-J', 'fx-edge'],
  empty: ['fx-empty'],
  Jempty: ['-J', 'fx-empty'],
};

function golden(name) {
  return {
    out: fs.readFileSync(path.join(goldenDir, name + '.out'), 'utf8'),
    err: fs.readFileSync(path.join(goldenDir, name + '.err'), 'utf8'),
    rc: Number(fs.readFileSync(path.join(goldenDir, name + '.rc'), 'utf8').trim()),
  };
}

before(() => makeFixture());

for (const [name, args] of Object.entries(CASES)) {
  test(`parity: ${name} (${args.join(' ')})`, () => {
    const got = runArbore(args);
    const want = golden(name);
    assert.equal(got.stdout, want.out, 'stdout mismatch');
    assert.equal(got.stderr, want.err, 'stderr mismatch');
    assert.equal(got.code, want.rc, 'exit code mismatch');
  });
}
