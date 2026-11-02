// Barrel: makes `node --test test/` resolve this dir to a module that
// imports every test file so the gate's directory argument discovers them.
import './r0.test.mjs';
import './parity.test.mjs';
import './json-structure.test.mjs';
import './large-output.test.mjs';
