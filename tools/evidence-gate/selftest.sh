#!/usr/bin/env bash
# Selftest fail-closed: fiecare caz trebuie să dea exact exit-ul așteptat.
cd "$(dirname "$0")/../.."; G=tools/evidence-gate/gate.mjs; T=$(mktemp -d); ok=0; bad=0
chk(){ exp=$1; shift; node $G --out $T/$RANDOM "$@" >/dev/null 2>&1; got=$?; if [ $got -eq $exp ]; then ok=$((ok+1)); echo "OK   exp=$exp $*"; else bad=$((bad+1)); echo "FAIL exp=$exp got=$got $*"; fi; }
chk 0  -- node --test tools/evidence-gate-fx/pass.test.mjs
chk 12 -- node --test tools/evidence-gate-fx/fail.test.mjs
chk 7  -- node --test tools/evidence-gate-fx/skip.test.mjs
chk 0  --max-skip 1 -- node --test tools/evidence-gate-fx/skip.test.mjs
chk 7  -- node --test tools/evidence-gate-fx/empty.test.mjs
chk 7  --min-tests 3 -- node --test tools/evidence-gate-fx/pass.test.mjs
chk 9  -- true
chk 9  -- bash -c 'echo "# tests 5"; echo "# pass 5"'
chk 14 -- bash -c 'printf "# tests 1\n# pass 1\n# fail 0\n"; exit 3'
chk 2  -- 
chk 9  -- /nu/exista
echo "SELFTEST ok=$ok bad=$bad"; [ $bad -eq 0 ]
