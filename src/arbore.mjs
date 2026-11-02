// arbore — clean-room clone of Unix `tree` (R0 skeleton).
// Minimal: emit the root name and a report line. Full listing lands in R1.

export function main(argv) {
  const paths = argv.filter((a) => !a.startsWith('-'));
  const root = paths[0] ?? '.';
  const stdout = `${root}\n\n0 directories, 0 files\n`;
  return { stdout, stderr: '', code: 0 };
}
