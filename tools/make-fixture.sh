#!/usr/bin/env bash
# Creează fixture determinist fx-tree/ (re-rulabil).
set -e; D=${1:-test/fx-tree}; rm -rf "$D"; mkdir -p "$D"/{alpha/beta/gamma,docs,node_modules/pkg,.hidden_dir,Zeta}
touch "$D"/README.md "$D"/b.txt "$D"/a.js "$D"/.env.example "$D"/alpha/one.js "$D"/alpha/beta/two.js "$D"/alpha/beta/gamma/three.md \
 "$D"/docs/guide.md "$D"/docs/api.json "$D"/node_modules/pkg/index.js "$D"/.hidden_dir/secret.txt "$D"/Zeta/z.txt "$D"/_under.txt "$D"/10.txt "$D"/9.txt
# Fixture 2 (R2): director necitibil, pentru erori pe subdirectoare.
L=$(dirname "$D")/fx-locked; [ -d "$L" ] && chmod -R u+rwx "$L"; rm -rf "$L"; mkdir -p "$L"/open "$L"/locked; touch "$L"/open/f.txt "$L"/locked/hidden.txt; chmod 000 "$L"/locked
