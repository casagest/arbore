# arbore
Clean-room clone of the Unix `tree` command in Node 22, zero dependencies. MIT.
Written without reading `tree` source (GPL-2.0); parity is checked only against observed output (`test/golden/`, see PROVENANCE.txt).
Usage: `node bin/arbore.mjs [-a] [-d] [-L n] [-I pat] [-P pat] [--dirsfirst] [-J] [--noreport] [dir...]`
