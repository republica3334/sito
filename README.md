# ALPHADEK Instruments — sito

Sito statico: nessuna build per pubblicarlo, nessuna richiesta verso altri siti. Il sito è nella cartella **`public/`**: è l'unica che va pubblicata.

## Pubblicazione
Il workflow "Pubblica su GitHub Pages" pubblica `public/` a ogni push su main, solo se il controllo passa. Va attivato una volta in Settings → Pages → Source: **GitHub Actions**. Indirizzo: https://republica3334.github.io/sito/

## Lingue e pagine
Il sito è in italiano (`public/*.html`) e in inglese (`public/en/`), con il selettore IT | EN nell'intestazione. Le pagine HTML **non si modificano a mano**: testi e struttura stanno in `scripts/build-pages.mjs`. Dopo una modifica:

```sh
node scripts/build-pages.mjs
```

poi committa le pagine generate. Il controllo su GitHub fallisce se le pagine non corrispondono al generatore.

## Sicurezza
- **Content-Security-Policy** nel meta tag di ogni pagina: consente solo file del sito, blocca script inline, `eval` e risorse esterne. Vale su qualsiasi hosting, GitHub Pages compreso.
- **`public/_headers`**: su Netlify e Cloudflare Pages aggiunge le stesse regole come intestazioni HTTP, più la protezione dal framing (`frame-ancestors`, `X-Frame-Options`), che nel meta tag non funziona. GitHub Pages ignora questo file: lì il sito resta incorniciabile in un iframe (rischio basso per un sito vetrina).

## Controllo prima del push
`scripts/check.mjs` verifica pagine, script, link, CSP e `_headers`. Parte da solo su GitHub a ogni push e pull request (workflow "Controllo sito").

Per farlo partire anche sul tuo computer prima di ogni `git push`, una volta sola:

```sh
git config core.hooksPath .githooks
```

A mano: `node scripts/check.mjs` (serve Node 18 o più recente; i workflow usano Node 24).

## Three.js
L'intro e gli ologrammi della pagina prodotti (`public/assets/products.js`) usano `public/assets/vendor/three-intro.min.js`: un pacchetto con solo le parti di Three.js che servono, generato da `scripts/three-entry.mjs`. Per aggiornarlo:

```sh
npm install
npm run vendor:three
```

poi committa il file generato. `package.json` serve solo a questo: il sito pubblicato non ha dipendenze.

## Modello 3D del Behemoth 2A1
L'ologramma del Behemoth nella pagina prodotti usa il modello vero del gioco: il placeholder **GameTank** del repo `fallenstar11/game1` (`SourceArt/GameTank`). È salvato in `public/assets/models/behemoth-2a1.holo`: solo le linee del wireframe, compresse (circa 400 KB). Se il file manca o non si carica, la pagina torna alla sagoma stilizzata.

Per rigenerarlo dopo aver modificato il modello nel gioco:

```sh
# nel repo del gioco: scarica gli FBX da Git LFS
git lfs pull --include="SourceArt/GameTank/*.fbx"
# nel repo del sito
npm install
npm run holo:behemoth -- <percorso game1>/SourceArt/GameTank public/assets/models/behemoth-2a1.holo
```

Lo script monta scafo, torretta, cannone, ruote e ruote motrici con i punti di `GameTank_points.json` e genera i cingoli lungo le ruote.
