// arbore — clean-room clone of Unix `tree`.
// Spec is the golden fixtures in test/golden (captured with `LC_ALL=C tree -n`).
import fs from 'node:fs';
import path from 'node:path';

// ---- argument parsing --------------------------------------------------
export function parseArgs(argv) {
  const opts = {
    all: false,
    dirsOnly: false,
    maxDepth: null,
    ignore: [],
    filePat: [],
    dirsFirst: false,
    json: false,
  };
  const paths = [];
  let levelError = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dirsfirst') {
      opts.dirsFirst = true;
    } else if (a === '--') {
      for (i++; i < argv.length; i++) paths.push(argv[i]);
    } else if (a.startsWith('--')) {
      // unknown long option (e.g. --noreport); ignore for parity scope
    } else if (a.length > 1 && a.startsWith('-')) {
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (c === 'a') opts.all = true;
        else if (c === 'd') opts.dirsOnly = true;
        else if (c === 'J') opts.json = true;
        else if (c === 'n' || c === 'C') { /* color flags; arbore never colors */ }
        else if (c === 'L' || c === 'I' || c === 'P') {
          const inline = a.slice(j + 1);
          const val = inline || argv[++i];
          if (c === 'L') {
            const n = Number(val);
            // tree rejects non-integer / <1 levels (e.g. -L 0, -L abc, -L -1).
            if (!Number.isInteger(n) || n < 1) levelError = true;
            else opts.maxDepth = n;
          } else if (c === 'I') opts.ignore.push(...splitPatterns(val));
          else opts.filePat.push(...splitPatterns(val));
          break; // option consumed the rest of this token
        }
      }
    } else {
      paths.push(a);
    }
  }
  if (paths.length === 0) paths.push('.');
  return { opts, paths, levelError };
}

// ---- glob matching (tree-style: `|` alternation, `*` and `?`) ----------
function splitPatterns(str) {
  return (str ?? '').split('|').filter((p) => p.length > 0);
}

function globToRegExp(glob) {
  let re = '^';
  for (const ch of glob) {
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(re + '$');
}

function matchesAny(name, patterns) {
  return patterns.some((p) => globToRegExp(p).test(name));
}

// ---- byte-order (C locale) comparison ----------------------------------
function byteCompare(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// ---- directory listing (filter + sort) ---------------------------------
// Returns a sorted Dirent[] or null when the directory cannot be opened.
function listDir(absDir, opts) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const kept = entries.filter((e) => {
    if (!opts.all && e.name.startsWith('.')) return false;
    if (opts.ignore.length && matchesAny(e.name, opts.ignore)) return false;
    const isDir = e.isDirectory();
    if (opts.dirsOnly && !isDir) return false;
    // -P filters files only; directories are always traversed/shown.
    if (opts.filePat.length && !isDir && !matchesAny(e.name, opts.filePat)) return false;
    return true;
  });
  kept.sort((a, b) => {
    if (opts.dirsFirst) {
      const ad = a.isDirectory();
      const bd = b.isDirectory();
      if (ad !== bd) return ad ? -1 : 1;
    }
    return byteCompare(a.name, b.name);
  });
  return kept;
}

// ---- text rendering (├── └── style, ASCII) -----------------------------
function renderText(rootName, absRoot, opts) {
  const counts = { dirs: 0, files: 0 };
  const lines = [];
  let exitCode = 0;

  const top = listDir(absRoot, opts);
  if (top === null) {
    lines.push(`${rootName}  [error opening dir]`);
    exitCode = 2;
  } else {
    lines.push(rootName);
    counts.dirs++; // the root itself counts as a directory
    walk(top, absRoot, '', 1);
  }

  function walk(entries, absDir, prefix, depth) {
    entries.forEach((e, i) => {
      const last = i === entries.length - 1;
      const isDir = e.isDirectory();
      const branch = prefix + (last ? '`-- ' : '|-- ') + e.name;
      if (isDir) counts.dirs++;
      else counts.files++;
      if (isDir && (opts.maxDepth === null || depth < opts.maxDepth)) {
        const childAbs = path.join(absDir, e.name);
        const children = listDir(childAbs, opts);
        if (children === null) {
          // Unreadable subdir: report it (don't silently skip) and fail.
          lines.push(branch + '  [error opening dir]');
          exitCode = 2;
        } else {
          lines.push(branch);
          walk(children, childAbs, prefix + (last ? '    ' : '|   '), depth + 1);
        }
      } else {
        lines.push(branch);
      }
    });
  }

  const report = opts.dirsOnly
    ? dirWord(counts.dirs)
    : `${dirWord(counts.dirs)}, ${fileWord(counts.files)}`;
  const stdout = [...lines, '', report].join('\n') + '\n';
  return { stdout, stderr: '', code: exitCode };
}

function dirWord(n) {
  return `${n} director${n === 1 ? 'y' : 'ies'}`;
}
function fileWord(n) {
  return `${n} file${n === 1 ? '' : 's'}`;
}

// ---- JSON rendering (-J) ------------------------------------------------
function renderJson(rootName, absRoot, opts) {
  const counts = { dirs: 0, files: 0 };
  let code = 0;

  function build(entries, absDir, depth) {
    const out = [];
    for (const e of entries) {
      if (e.isDirectory()) {
        counts.dirs++;
        if (opts.maxDepth === null || depth < opts.maxDepth) {
          const childAbs = path.join(absDir, e.name);
          const children = listDir(childAbs, opts);
          if (children === null) {
            // Unreadable subdir: carry the error field (don't silently skip).
            code = 2;
            out.push({ type: 'directory', name: e.name, contents: [], error: true });
          } else {
            out.push({ type: 'directory', name: e.name, contents: build(children, childAbs, depth + 1) });
          }
        } else {
          out.push({ type: 'directory', name: e.name, contents: [] });
        }
      } else {
        counts.files++;
        out.push({ type: 'file', name: e.name });
      }
    }
    return out;
  }

  const top = listDir(absRoot, opts);
  let rootNode;
  if (top === null) {
    rootNode = { type: 'directory', name: rootName, contents: [], error: true };
    code = 2;
  } else {
    counts.dirs++;
    rootNode = { type: 'directory', name: rootName, contents: build(top, absRoot, 1) };
  }

  // Rule derived from the -J goldens (J, Jempty, Jlocked, Jedge, Jedge_d):
  // when a run hits a read error (code 2), tree closes the stream by padding
  // the LAST leaf it emitted with an empty `"contents":[    ]`. "Leaf" = a file
  // or an empty readable directory; error dirs carry their own padded form and
  // never count. In a clean run (code 0) no node is padded. So the quirk is a
  // single marked node, not a global mode flag.
  const errTail = code === 2 ? lastLeaf(rootNode) : null;
  const stdout =
    '[\n' + serializeNode(rootNode, 4, errTail) + '\n,    ' + serializeReport(counts, opts) + '\n]\n';
  return { stdout, stderr: '', code };
}

// A leaf is a file or an empty readable directory (error dirs are not leaves).
function isLeaf(node) {
  return (
    node.type === 'file' ||
    (node.type === 'directory' && !node.error && (!node.contents || node.contents.length === 0))
  );
}

// Last leaf in document (pre-order) order — the node tree pads on error.
function lastLeaf(node) {
  let last = null;
  (function walk(n) {
    if (isLeaf(n)) last = n;
    if (n.contents) for (const c of n.contents) walk(c);
  })(node);
  return last;
}

function serializeNode(node, indent, errTail) {
  const pad = ' '.repeat(indent);
  const padded = node === errTail; // the single error-tail node, else never
  if (node.type === 'file') {
    const name = JSON.stringify(node.name);
    return padded
      ? `${pad}{"type":"file","name":${name},"contents":[    ]}`
      : `${pad}{"type":"file","name":${name}}`;
  }
  const head = `${pad}{"type":"directory","name":${JSON.stringify(node.name)}`;
  if (node.error) return head + ',"contents":[{"error": "error opening dir"}    ]}';
  if (!node.contents || node.contents.length === 0) {
    // Empty dir: contents omitted — unless it is the error-tail node.
    return padded ? head + ',"contents":[    ]}' : head + '}';
  }
  const body = node.contents.map((c) => serializeNode(c, indent + 4, errTail)).join(',\n');
  return head + ',"contents":[\n' + body + '\n' + pad + ']}';
}

// -d (dirs only) runs omit the files count (see Jedge_d golden).
function serializeReport(counts, opts) {
  return opts.dirsOnly
    ? `{"type":"report","directories":${counts.dirs}}`
    : `{"type":"report","directories":${counts.dirs},"files":${counts.files}}`;
}

// ---- entry point -------------------------------------------------------
export function main(argv, cwd = process.cwd()) {
  const { opts, paths, levelError } = parseArgs(argv);
  if (levelError) {
    return { stdout: '', stderr: 'tree: Invalid level, must be greater than 0.\n', code: 1 };
  }
  const rootName = paths[0];
  const absRoot = path.resolve(cwd, rootName);
  return opts.json
    ? renderJson(rootName, absRoot, opts)
    : renderText(rootName, absRoot, opts);
}
