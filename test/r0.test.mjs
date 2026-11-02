// R0 smoke tests: the CLI prints the root name and a report line.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, runArbore } from './helper.mjs';

before(() => makeFixture());

test('prints the root name as the first line', () => {
  const { stdout, code } = runArbore(['fx-tree']);
  assert.equal(code, 0);
  assert.equal(stdout.split('\n')[0], 'fx-tree');
});

test('ends with a directories/files report line', () => {
  const { stdout } = runArbore(['fx-tree']);
  const lines = stdout.split('\n').filter((l) => l.length > 0);
  const last = lines[lines.length - 1];
  assert.match(last, /^\d+ director(y|ies)(, \d+ files?)?$/);
});
