#!/usr/bin/env node
// arbore CLI entry — thin wrapper around src/arbore.mjs.
import { main } from '../src/arbore.mjs';

const { stdout, stderr, code } = main(process.argv.slice(2));
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exit(code);
