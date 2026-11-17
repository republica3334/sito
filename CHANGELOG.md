# Changelog — ALPHADEK Instruments

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
