// Codex P1 (PR #1): the CLI must not call process.exit() right after writing to
// stdout — when stdout is a pipe, exit can terminate the process before the
// buffered write drains, truncating the output (reproduced: 5000 files yielded
// only ~146KB of ~455KB). These tests build a 5000-file tree, run the CLI with
// stdout piped, and assert the ENTIRE output survives and the exit code is 0.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bin } from './helper.mjs';

const N = 5000;
const tmpRoots = []; // temp trees to remove in after()

function makeBigTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arbore-large-'));
  tmpRoots.push(root);
  // Zero-padded names so byte-order == numeric order (not relied on, but tidy).
  for (let i = 0; i < N; i++) {
    fs.writeFileSync(path.join(root, 'f' + String(i).padStart(5, '0') + '.txt'), '');
  }
  return root;
}

// Spawn with stdout as a pipe (the condition that triggered the truncation).
// maxBuffer is raised well past the full output so a short read is a real bug,
// not a capture limit.
function run(args) {
  const r = spawnSync('node', [bin, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return { stdout: r.stdout, stderr: r.stderr, code: r.status };
}

after(() => {
  for (const r of tmpRoots) {
    try {
      fs.rmSync(r, { recursive: true, force: true });
    } catch {}
  }
});

test('large text output is not truncated when stdout is a pipe', () => {
  const root = makeBigTree();
  const { stdout, code } = run([root]);
  assert.equal(code, 0, 'exit code');
  const lines = stdout.split('\n');
  // Output ends with a trailing newline, so the final split element is empty.
  assert.equal(lines.pop(), '', 'output must end with a trailing newline');
  // root(1) + N file lines + blank(1) + report(1).
  assert.equal(lines.length, N + 3, 'every file line plus root/blank/report present');
  assert.equal(lines[lines.length - 1], `1 directory, ${N} files`, 'full report line present');
});

test('large -J output is not truncated and parses with all file nodes', () => {
  const root = makeBigTree();
  const { stdout, code } = run(['-J', root]);
  assert.equal(code, 0, 'exit code');
  const doc = JSON.parse(stdout); // throws (test fails) if output was truncated
  assert.ok(Array.isArray(doc), 'top-level JSON is an array');
  const rootNode = doc[0];
  assert.equal(rootNode.type, 'directory');
  assert.equal(rootNode.contents.length, N, 'every file node present');
  const files = rootNode.contents.filter((c) => c.type === 'file').length;
  assert.equal(files, N, 'all contents are file nodes');
  const report = doc[doc.length - 1];
  assert.equal(report.type, 'report');
  assert.equal(report.directories, 1);
  assert.equal(report.files, N);
});
