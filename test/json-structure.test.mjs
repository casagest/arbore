// R4 (owner decision A, 2026-11-02): structural invariants of -J output on
// freshly-built temp trees — not byte parity. These generalize the error cases
// beyond the goldens: unreadable dir first / middle / last, nested, empty dirs.
// Invariants asserted for every tree:
//   * stdout is valid JSON (JSON.parse succeeds);
//   * the report counts equal the number of directory/file nodes actually
//     emitted (the root directory is counted, exactly as the goldens do);
//   * no "file" node carries a "contents" key;
//   * every unreadable directory carries EXACTLY [{"error":"error opening dir"}].
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runArbore } from './helper.mjs';

const tmpRoots = []; // temp trees to remove in after()
const locked = []; // chmod-000 dirs to restore before removal

function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
function mkdir(...p) {
  const dir = path.join(...p);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function writeFile(p, name) {
  fs.writeFileSync(path.join(p, name), 'x');
}
function lock(dir) {
  fs.chmodSync(dir, 0o000);
  locked.push(dir);
}

after(() => {
  for (const d of locked) {
    try {
      fs.chmodSync(d, 0o755);
    } catch {}
  }
  for (const r of tmpRoots) {
    try {
      fs.rmSync(r, { recursive: true, force: true });
    } catch {}
  }
});

// Walk the parsed node tree, enforcing per-node invariants and tallying counts.
function inspect(node, stats) {
  if (node.type === 'file') {
    stats.files++;
    assert.ok(!('contents' in node), `file node ${node.name} must not carry "contents"`);
    return;
  }
  assert.equal(node.type, 'directory', `unexpected node type ${node.type}`);
  stats.dirs++;
  if (!('contents' in node)) return; // empty readable / depth-limited dir
  assert.ok(Array.isArray(node.contents), `dir ${node.name} contents must be an array`);
  const errorEntry = node.contents.find((c) => c && typeof c.error === 'string');
  if (errorEntry) {
    // Unreadable dir: contents is EXACTLY the single error entry, nothing else.
    stats.errorDirs++;
    assert.deepEqual(
      node.contents,
      [{ error: 'error opening dir' }],
      `unreadable dir ${node.name} must carry exactly the error entry`,
    );
    return;
  }
  for (const child of node.contents) inspect(child, stats);
}

// Run `arbore -J <args> <root>` and assert the shared structural invariants.
function checkTree(root, extraArgs, { expectCode, expectErrorDirs }) {
  const got = runArbore([...extraArgs, '-J', root]);
  assert.equal(got.code, expectCode, 'exit code');
  const doc = JSON.parse(got.stdout); // throws on invalid JSON -> test fails
  assert.ok(Array.isArray(doc), 'top-level JSON must be an array');
  const report = doc[doc.length - 1];
  assert.equal(report.type, 'report', 'last element must be the report node');

  const stats = { dirs: 0, files: 0, errorDirs: 0 };
  inspect(doc[0], stats);

  assert.equal(report.directories, stats.dirs, 'report directories vs emitted dir nodes');
  if ('files' in report) {
    assert.equal(report.files, stats.files, 'report files vs emitted file nodes');
  }
  assert.equal(stats.errorDirs, expectErrorDirs, 'number of unreadable dirs');
  return stats;
}

test('json-structure: unreadable dir FIRST, among files and a readable subdir', () => {
  const root = mkTmp('arbore-json-first-');
  lock(mkdir(root, '00locked'));
  writeFile(root, 'a.txt');
  const mid = mkdir(root, 'mid');
  writeFile(mid, 'f.txt');
  writeFile(root, 'z.txt');
  // root + 00locked + mid = 3 dirs; a.txt, f.txt, z.txt = 3 files; 1 error dir.
  const s = checkTree(root, [], { expectCode: 2, expectErrorDirs: 1 });
  assert.equal(s.dirs, 3);
  assert.equal(s.files, 3);
});

test('json-structure: unreadable dir in the MIDDLE, with nested and empty dirs', () => {
  const root = mkTmp('arbore-json-mid-');
  writeFile(root, 'a.txt');
  mkdir(root, 'empty'); // empty readable dir -> no "contents"
  lock(mkdir(root, 'mlocked'));
  const deep = mkdir(root, 'nested', 'deep'); // nested chain
  writeFile(deep, 'leaf.txt');
  writeFile(root, 'z.txt');
  // dirs: root, empty, mlocked, nested, deep = 5; files: a.txt, leaf.txt, z.txt = 3.
  const s = checkTree(root, [], { expectCode: 2, expectErrorDirs: 1 });
  assert.equal(s.dirs, 5);
  assert.equal(s.files, 3);
});

test('json-structure: unreadable dir LAST', () => {
  const root = mkTmp('arbore-json-last-');
  writeFile(root, 'a.txt');
  const mid = mkdir(root, 'mid');
  writeFile(mid, 'f.txt');
  lock(mkdir(root, 'zzlocked'));
  // dirs: root, mid, zzlocked = 3; files: a.txt, f.txt = 2; 1 error dir.
  const s = checkTree(root, [], { expectCode: 2, expectErrorDirs: 1 });
  assert.equal(s.dirs, 3);
  assert.equal(s.files, 2);
});

test('json-structure: only empty dirs, no errors (clean exit, no padding)', () => {
  const root = mkTmp('arbore-json-empty-');
  mkdir(root, 'e1');
  mkdir(root, 'e2');
  const full = mkdir(root, 'full');
  writeFile(full, 'f.txt');
  // dirs: root, e1, e2, full = 4; files: f.txt = 1; no error dirs.
  const s = checkTree(root, [], { expectCode: 0, expectErrorDirs: 0 });
  assert.equal(s.dirs, 4);
  assert.equal(s.files, 1);
});

test('json-structure: -d (dirs only) with unreadable last dir omits files', () => {
  const root = mkTmp('arbore-json-d-');
  writeFile(root, 'a.txt'); // filtered out by -d
  const sub = mkdir(root, 'sub');
  writeFile(sub, 'inside.txt'); // filtered out by -d -> sub becomes empty dir
  lock(mkdir(root, 'zzlocked'));
  const got = runArbore(['-d', '-J', root]);
  assert.equal(got.code, 2, 'exit code');
  const doc = JSON.parse(got.stdout);
  const report = doc[doc.length - 1];
  assert.ok(!('files' in report), '-d report must omit the files count');
  const s = { dirs: 0, files: 0, errorDirs: 0 };
  inspect(doc[0], s);
  assert.equal(s.files, 0, 'no file nodes under -d');
  assert.equal(report.directories, s.dirs, 'report directories vs emitted dir nodes');
  // dirs: root, sub, zzlocked = 3; 1 error dir.
  assert.equal(s.dirs, 3);
  assert.equal(s.errorDirs, 1);
});
