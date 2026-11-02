#!/usr/bin/env bash
# Creează fixture determinist fx-tree/ (re-rulabil).
set -e; D=${1:-test/fx-tree}; rm -rf "$D"; mkdir -p "$D"/{alpha/beta/gamma,docs,node_modules/pkg,.hidden_dir,Zeta}
touch "$D"/README.md "$D"/b.txt "$D"/a.js "$D"/.env.example "$D"/alpha/one.js "$D"/alpha/beta/two.js "$D"/alpha/beta/gamma/three.md \
 "$D"/docs/guide.md "$D"/docs/api.json "$D"/node_modules/pkg/index.js "$D"/.hidden_dir/secret.txt "$D"/Zeta/z.txt "$D"/_under.txt "$D"/10.txt "$D"/9.txt
# Fixture 2 (R2): director necitibil, pentru erori pe subdirectoare.
L=$(dirname "$D")/fx-locked; [ -d "$L" ] && chmod -R u+rwx "$L"; rm -rf "$L"; mkdir -p "$L"/open "$L"/locked; touch "$L"/open/f.txt "$L"/locked/hidden.txt; chmod 000 "$L"/locked
# Fixture 3 (R3): director gol, eroare ca ultim copil, eroare imbricată.
E=$(dirname "$D")/fx-edge; [ -d "$E" ] && chmod -R u+rwx "$E"; rm -rf "$E"; mkdir -p "$E"/a_empty "$E"/b/inner_ok "$E"/b/zz_locked "$E"/c_file_dir "$E"/zz_last_locked
touch "$E"/a.txt "$E"/b/inner_ok/x.txt "$E"/c_file_dir/y.txt "$E"/zz_last_locked/q.txt "$E"/b/zz_locked/w.txt; chmod 000 "$E"/b/zz_locked "$E"/zz_last_locked
G=$(dirname "$D")/fx-empty; rm -rf "$G"; mkdir -p "$G"/emptydir "$G"/full; touch "$G"/full/f.txt
