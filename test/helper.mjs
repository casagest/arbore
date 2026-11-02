// Shared test helpers: locate repo paths, (re)generate the fixture, run the CLI.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..');
export const testDir = here;
export const bin = path.join(repoRoot, 'bin', 'arbore.mjs');

// node_modules is gitignored, so the fixture must be regenerated before tests.
export function makeFixture() {
  const r = spawnSync('bash', [path.join(repoRoot, 'tools', 'make-fixture.sh'), 'fx-tree'], {
    cwd: testDir,
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error('make-fixture failed: ' + (r.stderr || r.stdout));
}

// Run the CLI from test/ (same cwd the goldens were captured from).
export function runArbore(args) {
  const r = spawnSync('node', [bin, ...args], { cwd: testDir, encoding: 'utf8' });
  return { stdout: r.stdout, stderr: r.stderr, code: r.status };
}
