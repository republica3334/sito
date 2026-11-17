# Changelog — ALPHADEK Instruments

## [1.3.1] — Novembre 2026

### Aggiornato
- Workflow su Node 24 (Node 20 è a fine vita)
- `actions/upload-pages-artifact` v3 → v5 e `actions/deploy-pages` v4 → v5, aggiornate insieme

## [1.3.0] — Novembre 2026

### Aggiunto
- Versione inglese del sito in `public/en/` (Home, Systems, Company, Contact)
- Selettore lingua IT | EN nell'intestazione, che porta alla stessa pagina nell'altra lingua
- `hreflang` e `og:locale` per i motori di ricerca e le anteprime dei link
- Intro 3D in inglese ("ACQUIRING", "TARGET LOCKED", "Skip intro")
- Pagina 404 bilingue, funzionante anche per indirizzi dentro `/en/`
- `scripts/build-pages.mjs`: genera tutte le pagine nelle due lingue; il controllo verifica che siano allineate
- Menu a tendina **Prodotti** con Behemoth 2A1 e Ghepard 2 (desktop e telefono)
- Pagina prodotti (`prodotti.html`, `en/products.html`): ologrammi 3D wireframe trascinabili con etichette agganciate ai componenti, telemetria animata, barre della corazza, riga di avvio di bordo, confronto tra i due mezzi
- Behemoth 2A1: dati del TTKX-10 Mk2. Ghepard 2 (ULBT-7): solo le caratteristiche definite, nessun numero inventato
- Pacchetto Three.js ampliato con le forme per gli ologrammi

## [1.2.0] — Novembre 2026

### Modificato
- Il sito è ora nella cartella `public/`: si pubblica solo quella (niente `package.json`, script o `node_modules` online)
- `scripts/check.mjs` e `npm run vendor:three` adeguati alla nuova cartella

### Aggiunto
- Workflow "Pubblica su GitHub Pages": controllo del sito e pubblicazione di `public/` a ogni push su main

## [1.1.0] — Novembre 2026

### Sicurezza
- `_headers` per Netlify e Cloudflare Pages: CSP come intestazione HTTP, protezione dal framing (`frame-ancestors 'none'`, `X-Frame-Options: DENY`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS
- `scripts/check.mjs` verifica anche che la CSP di `_headers` resti allineata a quella delle pagine

### Aggiornato
- Three.js da r128 (2021) a 0.187: un unico pacchetto `assets/vendor/three-intro.min.js` con solo le parti usate dall'intro (597 KB contro 671 KB dei tre file precedenti)
- Intro adattata alle nuove API (spazio colore, luci fisicamente corrette): resa visiva invariata
- `package.json` (solo per rigenerare il pacchetto Three.js) e Dependabot anche per npm

## [1.0.2] — Novembre 2026

### Aggiunto
- `scripts/check.mjs`: controllo di pagine, script, link e Content-Security-Policy
- Workflow GitHub "Controllo sito" a ogni push e pull request (non pubblica nulla)
- Hook `pre-push` in `.githooks/` per bloccare il push se il controllo fallisce
- `.github/dependabot.yml`: Dependabot controlla solo le GitHub Actions (il sito non ha dipendenze npm)

## [1.0.1] — Novembre 2026

### Rimosso
- Firebase: `firebase.json`, `.firebaserc` e il workflow di pubblicazione automatica. Il sito non dipende più da nessun servizio esterno e può essere pubblicato su qualsiasi hosting statico.

### Modificato
- La Content-Security-Policy ora è dentro ogni pagina (meta tag) invece che nelle intestazioni di Firebase.

## [1.0.0] — Novembre 2026

Il sito diventa il sito aziendale di ALPHADEK Instruments. Il vecchio portale della United Republic of Stars resta solo nella cronologia git.

### Pagine
- `index.html`: intro 3D del logo (una volta per sessione, con il tasto "Salta intro"), presentazione, linee di prodotto, approccio
- `sistemi.html`: linee ADK-FC (controllo del tiro), ADK-EO (optronica), ADK-NAV (navigazione), ADK-CAL (prova e taratura)
- `azienda.html`: chi siamo, missione, valori, metodo di lavoro
- `contatti.html`: recapiti (da completare)
- `404.html`: pagina di errore

### Tecnica
- Sito statico: niente account, database, moduli o tracciamento
- Three.js r128, font (Barlow, Barlow Condensed, Share Tech Mono) e logo serviti dal sito stesso: nessuna richiesta verso altri siti
- Content-Security-Policy che consente solo file del sito stesso; nessuno script o stile inline
- L'intro viene saltata se il dispositivo non supporta WebGL o se è attiva l'opzione "riduci movimento"
- `assets/alphadek-logo.svg`, `assets/alphadek-mark.svg`, `assets/favicon.svg` ricavati dal logo originale
