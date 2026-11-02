# PLAN — arbore v1 (DRAFT, așteaptă ACCEPT Marin)
- Goal: vezi goal.md. Gata = feature-map.md „Gata înseamnă”.
- Out of scope: HTML/XML output, culori, Windows-specific.
- Items: R0 schelet repo + evidence-gate copiat + LICENSE MIT | R1 F1–F6,F13 | R2 F7–F10 | R3 fix findings.
- Fixture: director fx-tree/ generat de script, output-uri așteptate capturate rulând `tree` 2.x ca black box (comanda și versiunea în evidence).
- Dovezi: `node pilot/evidence-gate/gate.mjs --out evidence/round-R --min-tests <nr P0> -- node --test` ; 0 skip.
- Buget: 15 $ | 2 zile | 4 runde. Breaker: 2 runde fără creștere de scor ⇒ STOP.
- Riscuri: copiere cod GPL (checker caută explicit); verde fals (gate); scope creep (checker P1).
- Fără: push/CI/merge fără OK. Nimic în medicalcor-core.
