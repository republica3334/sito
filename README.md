# ALPHADEK Instruments — sito

Sito statico: nessuna build per pubblicarlo, nessuna richiesta verso altri siti. Si pubblica la cartella così com'è.

## Sicurezza
- **Content-Security-Policy** nel meta tag di ogni pagina: consente solo file del sito, blocca script inline, `eval` e risorse esterne. Vale su qualsiasi hosting, GitHub Pages compreso.
- **`_headers`**: su Netlify e Cloudflare Pages aggiunge le stesse regole come intestazioni HTTP, più la protezione dal framing (`frame-ancestors`, `X-Frame-Options`), che nel meta tag non funziona. GitHub Pages ignora questo file.

## Controllo prima del push
`scripts/check.mjs` verifica pagine, script, link, CSP e `_headers`. Parte da solo su GitHub a ogni push e pull request (workflow "Controllo sito").

Per farlo partire anche sul tuo computer prima di ogni `git push`, una volta sola:

```sh
git config core.hooksPath .githooks
```

A mano: `node scripts/check.mjs` (serve Node 18 o più recente).

## Three.js
L'intro usa `assets/vendor/three-intro.min.js`: un pacchetto con solo le parti di Three.js che servono, generato da `scripts/three-entry.mjs`. Per aggiornarlo:

```sh
npm install
npm run vendor:three
```

poi committa il file generato. `package.json` serve solo a questo: il sito pubblicato non ha dipendenze.
