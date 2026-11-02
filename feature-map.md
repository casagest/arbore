# Feature map — arbore (paritate cu `tree`, clean-room)
Stack propus: Node 22, zero dependențe, teste `node --test` prin evidence-gate.
| id | funcție | prio | test de paritate (fixture fx-tree/ + output așteptat) |
|---|---|---|---|
| F1 | listare recursivă, linii ASCII (|-- `-- |) în locale C, ca `tree -n` | P0 | output identic cu golden default |
| F14 | linii Unicode (├── └──) în locale UTF-8 | P2 | amânat (R-ulterior) |
| F2 | sumar „N directories, M files” | P0 | ultimul rând identic |
| F3 | sortare alfabetică (ca `tree` implicit, locale C) | P0 | ordine identică |
| F4 | `-a` fișiere ascunse | P0 | cu/fără .ascuns |
| F5 | `-d` doar directoare | P0 | |
| F6 | `-L N` adâncime maximă | P0 | L=1,2 |
| F7 | `-I pattern` ignoră | P1 | `-I node_modules` |
| F8 | `-P pattern` doar potriviri | P1 | |
| F9 | `--dirsfirst` | P1 | |
| F10 | `-J` ieșire JSON | P1 | JSON: semantic parity (owner decision A); byte-exact only for error-free runs |
| F11 | `--gitignore` | P2 | |
| F12 | `-s`/`-h` mărimi | P2 | |
| F13 | eroare pe cale inexistentă (exit≠0, mesaj) | P0 | |
Gata înseamnă: P0 toți verzi în gate, toate P1 F7–F10 verzi, checker 5/5.
