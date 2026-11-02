// Parity tests: one per golden case, comparing stdout/stderr/exit exactly
// (error JSON cases compare semantically — see JSON_SEMANTIC_CASES below).
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
  // R3: empty dirs + unreadable dirs in JSON; derived from these goldens.
  edge: ['fx-edge'],
  Jedge: ['-J', 'fx-edge'],
  Jedge_d: ['-d', '-J', 'fx-edge'],
  empty: ['fx-empty'],
  Jempty: ['-J', 'fx-empty'],
  // Codex P2 (PR #1): multiple root paths render consecutively under one
  // combined report; exit 2 if any root/subdir errored.
  multi: ['fx-empty', 'fx-locked'],
  multimiss: ['fx-empty', 'nu-exista'],
  Jmulti: ['-J', 'fx-empty', 'nu-exista'],
};

function golden(name) {
  return {
    out: fs.readFileSync(path.join(goldenDir, name + '.out'), 'utf8'),
    err: fs.readFileSync(path.join(goldenDir, name + '.err'), 'utf8'),
    rc: Number(fs.readFileSync(path.join(goldenDir, name + '.rc'), 'utf8').trim()),
  };
}

// owner decision A, 2026-11-02: for -J runs that hit a read error (exit 2),
// arbore emits structurally-correct JSON and does NOT reproduce upstream tree's
// quirk of padding the last emitted leaf (and, under -d, empty dirs) with an
// empty `"contents":[]` (checker R3, evidence/round-3-checker). For these cases
// we assert exact exit code + stderr and SEMANTIC JSON equality instead of
// byte-for-byte. normalize() strips empty-array "contents" from any node, so an
// empty-contents node means the same as one with no children. Error dirs keep
// their non-empty [{error:...}] contents, so error semantics are fully preserved.
// Error-free runs (J, Jempty) stay byte-exact (they are NOT in this set).
const JSON_SEMANTIC_CASES = new Set(['Jlocked', 'Jedge', 'Jedge_d', 'Jmulti']);

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'contents' && Array.isArray(v) && v.length === 0) continue;
      out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

before(() => makeFixture());

for (const [name, args] of Object.entries(CASES)) {
  test(`parity: ${name} (${args.join(' ')})`, () => {
    const got = runArbore(args);
    const want = golden(name);
    if (JSON_SEMANTIC_CASES.has(name)) {
      assert.equal(got.code, want.rc, 'exit code mismatch');
      assert.equal(got.stderr, want.err, 'stderr mismatch');
      assert.deepEqual(
        normalize(JSON.parse(got.stdout)),
        normalize(JSON.parse(want.out)),
        'JSON semantic mismatch',
      );
    } else {
      assert.equal(got.stdout, want.out, 'stdout mismatch');
      assert.equal(got.stderr, want.err, 'stderr mismatch');
      assert.equal(got.code, want.rc, 'exit code mismatch');
    }
  });
}
