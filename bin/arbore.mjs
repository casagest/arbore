#!/usr/bin/env node
// arbore CLI entry — thin wrapper around src/arbore.mjs.
import { main } from '../src/arbore.mjs';

const { stdout, stderr, code } = main(process.argv.slice(2));
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
// Set exitCode (don't call process.exit): process.exit() can truncate a
// still-draining stdout when it is a pipe. Letting Node exit naturally after
// the write buffers flush preserves the full output (Codex review on PR #1).
process.exitCode = code;
