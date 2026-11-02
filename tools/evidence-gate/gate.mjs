// gate.mjs — poartă de dovezi fail-closed (pattern w0-tools irun/count/xrun), pentru node --test (TAP).
// Usage: node gate.mjs --out DIR [--min-tests N] [--max-skip N] -- <cmd> [args...]
// v2: fișier de test gol (node raportează fișierul ca 1 test trecut) => exit 7.
// Exit: 0 GREEN | 2 usage | 7 prea puține teste / prea multe skip | 9 output ilizibil (fără sumar TAP) | 12 FAILED | 14 cmd exit≠0 fără fail raportat
import {spawnSync} from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const a=process.argv.slice(2); const sep=a.indexOf('--'); const o=sep<0?a:a.slice(0,sep); const cmd=sep<0?[]:a.slice(sep+1);
const opt=(k,d)=>{const i=o.indexOf(k);return i<0?d:o[i+1]};
const out=opt('--out',''), minT=Number(opt('--min-tests','1')), maxS=Number(opt('--max-skip','0'));
const stop=(c,m)=>{const v='VERDICT\tSTOP\t'+m; console.log(v); if(out){try{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'verdict.txt'),v+'\n')}catch{}} process.exit(c)};
if(!out||!cmd.length||!(minT>=1)||!(maxS>=0)) stop(2,'usage: gate.mjs --out DIR [--min-tests N>=1] [--max-skip N] -- cmd');
fs.mkdirSync(out,{recursive:true});
const t0=Date.now(); const r=spawnSync(cmd[0],cmd.slice(1),{encoding:'utf8',maxBuffer:64<<20});
const log=(r.stdout||'')+(r.stderr||''); fs.writeFileSync(path.join(out,'output.log'),log);
const meta={cmd:cmd.join(' '),exit:r.status,signal:r.signal,ms:Date.now()-t0,sha256:crypto.createHash('sha256').update(log).digest('hex'),at:new Date().toISOString()};
fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(meta,null,1));
const n=k=>{const m=log.match(new RegExp('^# '+k+' (\\d+)$','m'));return m?Number(m[1]):null};
const T=n('tests'),P=n('pass'),F=n('fail'),S=(n('skipped')??0)+(n('todo')??0),C=n('cancelled')??0;
if(r.error) stop(9,'nu pot rula: '+r.error.message);
if(T===null||P===null||F===null) stop(9,'fără sumar TAP (# tests/# pass/# fail) — nu accept verde fără numărătoare');
console.log(`TOTAL\tTESTS=${T}\tPASS=${P}\tFAIL=${F}\tSKIP=${S}\tCANCELLED=${C}\tEXIT=${r.status}`);
if(F>0||C>0) stop(12,`FAIL=${F} CANCELLED=${C}`);
if(r.status!==0) stop(14,'exit='+r.status+' dar FAIL=0 — suspect, nu e verde');
if(P<minT) stop(7,`PASS=${P} < MIN=${minT}`);
if(S>maxS) stop(7,`SKIP=${S} > MAX=${maxS}`);
const ghost=[...log.matchAll(/^ok \d+ - (\S+\.(?:[cm]?[jt]s))$/gm)].map(m=>m[1]); if(ghost.length) stop(7,'fișier fără niciun test (verde fals node --test): '+ghost.join(','));
if(P+S!==T) stop(9,`numărătoare inconsistentă T=${T} P=${P} S=${S}`);
const v=`VERDICT\tGREEN\tPASS=${P}\tsha256=${meta.sha256.slice(0,12)}`; console.log(v); fs.writeFileSync(path.join(out,'verdict.txt'),v+'\n');
