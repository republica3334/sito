# ALPHADEK Instruments — sito

Sito statico: niente build, niente dipendenze, nessuna richiesta verso altri siti.

## Controllo prima del push

`scripts/check.mjs` verifica pagine, script, link e Content-Security-Policy. Parte da solo su GitHub a ogni push e pull request (workflow "Controllo sito").

Per farlo partire anche sul tuo computer prima di ogni `git push`, una volta sola:

```sh
git config core.hooksPath .githooks
```

Per lanciarlo a mano: `node scripts/check.mjs` (serve Node 18 o più recente).
