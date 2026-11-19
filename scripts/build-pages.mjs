#!/usr/bin/env node
/* ALPHADEK Instruments — genera le pagine del sito in italiano e inglese.
   Uso: node scripts/build-pages.mjs   (scrive in public/ e public/en/)
   Le pagine generate vanno committate: il sito pubblicato non ha build. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SITE_URL = 'https://republica3334.github.io/sito/'; /* indirizzo pubblico, per hreflang */
const BASE_PATH = '/sito/';                               /* percorso su GitHub Pages, per la 404 */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests";

/* Pagine: chiave → file per lingua */
const FILES = {
  home:    { it: 'index.html',    en: 'en/index.html' },
  products:{ it: 'prodotti.html', en: 'en/products.html' },
  systems: { it: 'sistemi.html',  en: 'en/systems.html' },
  company: { it: 'azienda.html',  en: 'en/company.html' },
  contact: { it: 'contatti.html', en: 'en/contact.html' },
};
const NAV_KEYS = ['home', 'products', 'systems', 'company', 'contact'];

const ICON = {
  reticle: '<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="3"/><path d="M20 1v10M20 29v10M1 20h10M29 20h10"/></svg>',
  optic:   '<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="12" width="24" height="16"/><path d="M27 16l10-5v18l-10-5"/><circle cx="15" cy="20" r="4"/></svg>',
  nav:     '<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="20" cy="20" r="17"/><path d="M20 7l5 13-5 13-5-13z"/><path d="M20 3v3M20 34v3M3 20h3M34 20h3"/></svg>',
  gauge:   '<svg class="icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 28a15 15 0 1 1 30 0"/><path d="M20 28l8-11"/><circle cx="20" cy="28" r="2.5"/><path d="M9 21l2 1M31 21l-2 1M20 13v2"/></svg>',
};

/* ───────────── Testi ───────────── */
const T = {
  it: {
    htmlLang: 'it', ogLocale: 'it_IT',
    nav: { home: 'Home', products: 'Prodotti', systems: 'Sistemi', company: 'Azienda', contact: 'Contatti' },
    navLabel: 'Principale', skipToContent: 'Vai al contenuto', skipIntro: 'Salta intro', menu: 'Menu',
    langLabel: 'Lingua',
    footerText: 'Strumenti di puntamento, misura e controllo per sistemi di difesa terrestri, navali e aerei.',
    footerSite: 'Sito', footerInfo: 'Info', footerDatasheet: 'Richiedi una scheda tecnica', footerReplay: 'Rivedi l\'intro',
    footerTag: 'Strumentazione per la difesa',
    lines: [
      ['ADK-FC', 'reticle', 'Controllo del tiro', 'Calcolatori e interfacce di controllo del tiro, integrabili su piattaforme nuove ed esistenti.'],
      ['ADK-EO', 'optic', 'Optronica', 'Visori e sensori elettro-ottici, diurni e termici, per osservazione e puntamento.'],
      ['ADK-NAV', 'nav', 'Navigazione', 'Riferimento di posizione e assetto per veicoli e sistemi, anche senza segnale satellitare.'],
      ['ADK-CAL', 'gauge', 'Prova e taratura', 'Banchi e strumenti per verificare, tarare e mantenere i sistemi in servizio.'],
    ],
    home: {
      title: 'ALPHADEK Instruments — Strumentazione per la difesa',
      desc: 'ALPHADEK Instruments progetta e produce strumenti di puntamento, misura e controllo per sistemi di difesa terrestri, navali e aerei.',
      eyebrow: 'Strumentazione per sistemi di difesa',
      h1: 'Precisione che <em>tiene</em> sul campo.',
      lead: 'ALPHADEK Instruments progetta e produce strumenti di puntamento, misura e controllo per sistemi di difesa terrestri, navali e aerei. Elettronica robusta, pensata per funzionare dove serve davvero.',
      ctaSystems: 'Scopri i sistemi', ctaContact: 'Contattaci', tagTop: 'ADK // SYS-01', tagBottom: 'STATO: OPERATIVO',
      linesEyebrow: 'Linee di prodotto', linesH2: 'Cosa facciamo',
      linesP: 'Quattro famiglie di sistemi, progettate per lavorare insieme o integrarsi con quello che è già a bordo.',
      allSystems: 'Tutti i sistemi',
      approachEyebrow: 'Approccio', approachH2: 'Come li progettiamo',
      approach: [
        ['Costruiti per l\'ambiente reale', 'Vibrazioni, polvere, temperature estreme: progettiamo per le condizioni d’impiego, non per il laboratorio.'],
        ['Integrazione aperta', 'Interfacce documentate e moduli sostituibili, per adattarci alle piattaforme e ai sistemi del cliente.'],
        ['Supporto per tutto il ciclo di vita', 'Dalla definizione dei requisiti alla manutenzione e all’aggiornamento dei sistemi in servizio.'],
      ],
      ctaEyebrow: 'Contatto', ctaH2: 'Hai un requisito da discutere?',
      ctaP: 'Raccontaci la piattaforma e l’obiettivo: ti rispondiamo con una proposta tecnica.',
    },
    products: {
      title: 'Prodotti', desc: 'I mezzi ALPHADEK Instruments: Behemoth 2A1, carro superpesante, Ghepard 2 (ULBT-7), carro ultraleggero autonomo, e Spearhead 3, carro armato da battaglia principale di sesta generazione.',
      eyebrow: 'Prodotti', h1: 'La flotta <em>ALPHADEK</em>',
      lead: 'Tre carri e una famiglia di mezzi in sviluppo: il superpesante che regge l’urto, l’ultraleggero autonomo che non si fa trovare e il carro da battaglia principale di sesta generazione. Tutti con la strumentazione ALPHADEK a bordo.',
      boot: 'ALPHADEK instruments, welcome aboard, commander.',
      dragHint: 'Trascina per ruotare', live: 'Ologramma · live', noGl: 'Il 3D non è disponibile su questo dispositivo',
      armorTitle: 'Protezione (mm equivalenti)', ke: 'KE · cinetica', ce: 'CE · chimica', quoteLabel: 'Messaggio all’avvio dei sistemi',
      behemoth: {
        code: 'ADK-BH · 2A1', name: 'Behemoth 2A1', cls: 'Carro superpesante', tileMeta: '635 t · ETC 185 mm · APS laser',
        lead: 'Il Behemoth 2A1 è il nostro carro superpesante: un’unità da sfondamento costruita per assorbire il colpo e restare operativa dove nessun altro mezzo può farlo. Scafo e torretta di nuova generazione, cannone ETC raffreddato e una difesa attiva a laser che intercetta le minacce prima che arrivino.',
        stats: [['635', 't', 'Peso'], ['185', 'mm', 'Cannone ETC'], ['125', 'kW', 'Laser APS ×6'], ['670', 'km', 'Autonomia']],
        callouts: { gun: 'Cannone ETC 185 mm', aps: 'APS laser 125 kW ×6', aa: 'Torrette AA 40 mm ×2', radar: '4 radar AESA', engine: '2× V12 · 31 CV/t', tracks: '670 km · immersione completa' },
        specs: [
          ['Armamento', [
            ['Cannone principale', '185 mm ETC, raffreddato a perfluorometano'],
            ['Autocaricatore', '12 colpi al minuto a fuoco costante'],
            ['Munizioni', 'APFSDS-T, APFSDS, HE, HE smart a stabilizzazione alare'],
            ['Antiaerea', '2 torrette da 40 mm con missili a doppio ruolo, aria e superficie; proiettili programmabili'],
            ['Secondario', '2 mitragliatrici coassiali .50 BMG, 4 lanciagranate da 40 mm']]],
          ['Difesa attiva e sensori', [
            ['APS', '6 torrette, ciascuna con laser da 125 kW e 8 cariche fisiche ricaricabili'],
            ['Radar', '48 radar APS e 4 radar AESA a lungo raggio'],
            ['Contromisure', 'IRCM; firma termica ridotta con sfiato dal basso']]],
          ['Mobilità', [
            ['Propulsione', '2 generatori industriali V12 di produzione nazionale, 31 CV/t'],
            ['Autonomia', '670 km'],
            ['Terreno', 'Immersione completa con espulsione di acqua e detriti; pendenze ripide']]],
        ],
        armor: [['Frontale', 1400, '1400', 2800, '2800+'], ['Laterale', 1200, '900–1200', 1800, '1800'], ['Posteriore', 340, '280–340', 900, '900']],
      },
      ghepard: {
        code: 'ADK-GH · 2', name: 'Ghepard 2', cls: 'ULBT-7 · Carro ultraleggero autonomo', tileMeta: 'Autonomo · nessun equipaggio',
        lead: 'Il Ghepard 2 (ULBT-7, Ultra Light Battle Tank) ribalta la logica del Behemoth: nessun equipaggio, corazza ridotta al minimo e tutto puntato su velocità e tempo di reazione. Sopravvive non assorbendo il colpo, ma non facendosi colpire.',
        stats: [['0', '', 'Equipaggio'], ['IA', '', 'Guida autonoma'], ['MIN', '', 'Corazza'], ['MAX', '', 'Reattività']],
        callouts: { ai: 'IA autonoma · 0 equipaggio', hull: 'Corazza minima', tracks: 'Reazione molto rapida', gun: 'Ricognizione armata' },
        specs: [
          ['Profilo', [
            ['Classe', 'ULBT-7 — Ultra Light Battle Tank'],
            ['Equipaggio', 'Nessuno: completamente autonomo'],
            ['Protezione', 'Minima: la sopravvivenza è affidata a velocità e reazione']]],
          ['Impiego', [
            ['Mobilità', 'Velocità e tempo di reazione molto elevati'],
            ['Ruolo', 'Ricognizione armata, aggiramento rapido, interventi dove serve arrivare per primi'],
            ['In flotta', 'Complementare al Behemoth 2A1']]],
        ],
        note: 'Le specifiche dettagliate sono disponibili su richiesta.',
      },
      spearhead: {
        code: 'ADK-SH · 3', name: 'Spearhead 3', cls: 'Carro armato da battaglia principale', tileMeta: '6ª generazione · convenzionale',
        lead: 'Lo Spearhead 3 è il carro armato da battaglia principale (MBT) convenzionale di sesta generazione di ALPHADEK Instruments: il carro di linea della flotta, accanto al superpesante Behemoth 2A1 e all’ultraleggero autonomo Ghepard 2.',
        stats: [['6ª', '', 'Generazione'], ['MBT', '', 'Classe'], ['CONV', '', 'Configurazione']],
        callouts: { gun: 'Armamento principale', gen: '6ª generazione', hull: 'MBT convenzionale' },
        specs: [
          ['Profilo', [
            ['Classe', 'Carro armato da battaglia principale (MBT)'],
            ['Generazione', 'Sesta'],
            ['Configurazione', 'Convenzionale'],
            ['In flotta', 'Carro di linea, accanto al Behemoth 2A1 e al Ghepard 2']]],
        ],
        note: 'Le specifiche tecniche non sono ancora pubbliche: disponibili su richiesta.',
      },
      pipeEyebrow: 'In sviluppo', pipeH2: 'Prossimi mezzi', pipeName: 'Nome da definire', pipeTxt: 'Scheda in arrivo', pipeBadge: 'In sviluppo',
      pipeline: [['IFV', 'Veicolo da combattimento della fanteria'], ['SPG', 'Artiglieria semovente'], ['APC', 'Trasporto truppe corazzato'], ['LOG', 'Camion logistico'], ['ARV', 'Veicolo da recupero']],
      vsEyebrow: 'Due filosofie', vsH2: 'Assorbire o evitare',
      vs: [['Behemoth 2A1', 'Assorbire il colpo', 'Massa, corazza e difesa attiva a laser: resta in campo sotto il fuoco e apre la strada.'],
           ['Ghepard 2', 'Non farsi colpire', 'Nessun equipaggio e reazione immediata: arriva prima, vede prima e se ne va prima.']],
      ctaEyebrow: 'Presentazione riservata', ctaH2: 'Vuoi vederli da vicino?', ctaP: 'Le schede complete sono disponibili su richiesta: scrivici indicando ente e impiego previsto.',
    },
    systems: {
      title: 'Sistemi', desc: 'Le linee di prodotto di ALPHADEK Instruments: controllo del tiro, optronica, navigazione, prova e taratura.',
      eyebrow: 'Sistemi', h1: 'Linee di prodotto',
      lead: 'Quattro famiglie di sistemi per puntamento, osservazione, navigazione e manutenzione. Ogni linea può essere fornita da sola o integrata con le altre.',
      linePrefix: 'LINEA',
      list: [
        ['ADK-FC', 'FC', 'Controllo del tiro', 'Calcolatori e interfacce che raccolgono i dati dei sensori di bordo e li presentano all’equipaggio in modo chiaro e immediato. Pensati sia per piattaforme nuove sia per l’ammodernamento di quelle esistenti.',
          ['Elaborazione in tempo reale dei dati dei sensori', 'Interfacce standard verso i sistemi di bordo', 'Display e comandi per l’equipaggio', 'Architettura modulare e aggiornabile']],
        ['ADK-EO', 'EO', 'Optronica', 'Visori e sensori elettro-ottici per osservazione, sorveglianza e puntamento, con canali diurno e termico e uscite video verso i sistemi di bordo.',
          ['Canale diurno e canale termico', 'Stabilizzazione dell’immagine', 'Telemetro laser integrabile', 'Uscite video standard']],
        ['ADK-NAV', 'NAV', 'Navigazione', 'Unità di riferimento che forniscono posizione e assetto a veicoli e sistemi, mantenendo l’orientamento anche quando il segnale satellitare non è disponibile.',
          ['Riferimento inerziale di posizione e assetto', 'Funzionamento anche senza segnale satellitare', 'Allineamento rapido all’avvio', 'Uscite verso sistemi di puntamento e navigazione']],
        ['ADK-CAL', 'CAL', 'Prova e taratura', 'Banchi e strumenti per verificare e tarare i sistemi durante la manutenzione, con procedure guidate e registrazione dei risultati.',
          ['Banchi di prova per manutenzione di 1° e 2° livello', 'Procedure di taratura guidate', 'Registrazione dei risultati di prova', 'Versioni da laboratorio e da campo']],
      ],
      notice: (contact) => `Le schede tecniche dettagliate sono disponibili su richiesta. <a href="${contact}">Contattaci</a> indicando piattaforma e impiego previsto.`,
    },
    company: {
      title: 'Azienda', desc: 'Chi è ALPHADEK Instruments: missione, valori e metodo di lavoro.',
      eyebrow: 'Azienda', h1: 'Chi siamo',
      lead: 'ALPHADEK Instruments è un’azienda che progetta e produce strumentazione per sistemi di difesa. Il nome viene dal nostro simbolo: due stelle e una scintilla, il punto preciso che un buon strumento sa trovare.',
      missionEyebrow: 'Missione', missionH2: 'Strumenti di cui fidarsi',
      missionP: 'Chi usa i nostri sistemi deve poter contare su di loro nelle condizioni più difficili. Per questo progettiamo partendo dall’impiego reale e verifichiamo ogni strumento prima che lasci il nostro banco.',
      values: [
        ['Precisione', 'Misure affidabili e ripetibili, verificate con procedure di prova documentate.'],
        ['Affidabilità', 'Componenti scelti e qualificati per durare, con manutenzione semplice e prevedibile.'],
        ['Responsabilità', 'Operiamo nel rispetto delle normative sull’esportazione e dei controlli previsti per i materiali della difesa.'],
      ],
      methodEyebrow: 'Metodo', methodH2: 'Come lavoriamo',
      steps: [
        ['Requisiti', 'Definiamo con il cliente impiego, piattaforma e vincoli.'],
        ['Progetto', 'Architettura, elettronica e meccanica, con revisioni a ogni fase.'],
        ['Qualifica', 'Prove ambientali e funzionali prima della produzione.'],
        ['Produzione', 'Assemblaggio e collaudo di ogni unità.'],
        ['Supporto', 'Formazione, ricambi, taratura e aggiornamenti.'],
      ],
    },
    contact: {
      title: 'Contatti', desc: 'Come contattare ALPHADEK Instruments per richieste commerciali e tecniche.',
      eyebrow: 'Contatti', h1: 'Parliamone',
      lead: 'Per richieste commerciali, schede tecniche o supporto sui sistemi in servizio, scrivici: indica piattaforma, impiego previsto e tempi.',
      cards: [
        ['Email', 'Email da inserire', 'Richieste commerciali e tecniche'],
        ['Telefono', 'Numero da inserire', 'Lun–Ven, orario d’ufficio'],
        ['Sede', 'Indirizzo da inserire', 'Visite solo su appuntamento'],
      ],
      notice: 'Questo sito non raccoglie dati: non ci sono moduli, account o sistemi di tracciamento.',
    },
  },

  en: {
    htmlLang: 'en', ogLocale: 'en_GB',
    nav: { home: 'Home', products: 'Products', systems: 'Systems', company: 'Company', contact: 'Contact' },
    navLabel: 'Main', skipToContent: 'Skip to content', skipIntro: 'Skip intro', menu: 'Menu',
    langLabel: 'Language',
    footerText: 'Targeting, measurement and control instruments for land, naval and air defence systems.',
    footerSite: 'Site', footerInfo: 'Info', footerDatasheet: 'Request a datasheet', footerReplay: 'Replay the intro',
    footerTag: 'Defence instrumentation',
    lines: [
      ['ADK-FC', 'reticle', 'Fire control', 'Fire-control computers and interfaces, for new platforms and for upgrading existing ones.'],
      ['ADK-EO', 'optic', 'Optronics', 'Day and thermal electro-optical sights and sensors for observation and targeting.'],
      ['ADK-NAV', 'nav', 'Navigation', 'Position and attitude reference for vehicles and systems, even without a satellite signal.'],
      ['ADK-CAL', 'gauge', 'Test and calibration', 'Benches and instruments to test, calibrate and maintain systems in service.'],
    ],
    home: {
      title: 'ALPHADEK Instruments — Defence instrumentation',
      desc: 'ALPHADEK Instruments designs and manufactures targeting, measurement and control instruments for land, naval and air defence systems.',
      eyebrow: 'Instrumentation for defence systems',
      h1: 'Precision that <em>holds</em> in the field.',
      lead: 'ALPHADEK Instruments designs and manufactures targeting, measurement and control instruments for land, naval and air defence systems. Rugged electronics, built to work where it really matters.',
      ctaSystems: 'Explore our systems', ctaContact: 'Contact us', tagTop: 'ADK // SYS-01', tagBottom: 'STATUS: OPERATIONAL',
      linesEyebrow: 'Product lines', linesH2: 'What we do',
      linesP: 'Four families of systems, designed to work together or to integrate with what is already on board.',
      allSystems: 'All systems',
      approachEyebrow: 'Approach', approachH2: 'How we design them',
      approach: [
        ['Built for the real world', 'Vibration, dust, extreme temperatures: we design for the conditions of use, not for the lab.'],
        ['Open integration', 'Documented interfaces and replaceable modules, so we fit the customer’s platforms and systems.'],
        ['Support for the whole life cycle', 'From defining the requirements to maintaining and upgrading systems in service.'],
      ],
      ctaEyebrow: 'Contact', ctaH2: 'Have a requirement to discuss?',
      ctaP: 'Tell us about the platform and the goal: we will come back to you with a technical proposal.',
    },
    products: {
      title: 'Products', desc: 'ALPHADEK Instruments vehicles: Behemoth 2A1, superheavy tank, Ghepard 2 (ULBT-7), autonomous ultra-light tank, and Spearhead 3, sixth-generation main battle tank.',
      eyebrow: 'Products', h1: 'The <em>ALPHADEK</em> fleet',
      lead: 'Three tanks and a family of vehicles in development: the superheavy that takes the hit, the autonomous ultra-light that is never where you expect it and the sixth-generation main battle tank. All with ALPHADEK instrumentation on board.',
      boot: 'ALPHADEK instruments, welcome aboard, commander.',
      dragHint: 'Drag to rotate', live: 'Hologram · live', noGl: '3D is not available on this device',
      armorTitle: 'Protection (mm equivalent)', ke: 'KE · kinetic', ce: 'CE · chemical', quoteLabel: 'Message at system start-up',
      behemoth: {
        code: 'ADK-BH · 2A1', name: 'Behemoth 2A1', cls: 'Superheavy tank', tileMeta: '635 t · 185 mm ETC · laser APS',
        lead: 'The Behemoth 2A1 is our superheavy tank: a breakthrough unit built to take the hit and stay in the fight where no other vehicle can. A new-generation hull and turret, a cooled ETC gun and a laser active protection system that intercepts threats before they arrive.',
        stats: [['635', 't', 'Weight'], ['185', 'mm', 'ETC gun'], ['125', 'kW', 'Laser APS ×6'], ['670', 'km', 'Range']],
        callouts: { gun: '185 mm ETC gun', aps: '125 kW laser APS ×6', aa: '40 mm AA turrets ×2', radar: '4 AESA radars', engine: '2× V12 · 31 hp/t', tracks: '670 km · full submersion' },
        specs: [
          ['Armament', [
            ['Main gun', '185 mm ETC, perfluoromethane-cooled'],
            ['Autoloader', '12 rounds per minute, sustained fire'],
            ['Ammunition', 'APFSDS-T, APFSDS, HE, fin-stabilised smart HE'],
            ['Air defence', '2 × 40 mm turrets with dual-role air and surface missiles; programmable rounds'],
            ['Secondary', '2 × .50 BMG coaxial machine guns, 4 × 40 mm grenade launchers']]],
          ['Active protection and sensors', [
            ['APS', '6 turrets, each with a 125 kW laser and 8 reloadable hard-kill charges'],
            ['Radar', '48 APS radars and 4 long-range AESA radars'],
            ['Countermeasures', 'IRCM; reduced thermal signature with bottom venting']]],
          ['Mobility', [
            ['Propulsion', '2 domestically built industrial V12 generators, 31 hp/t'],
            ['Range', '670 km'],
            ['Terrain', 'Full submersion with water and debris purge mode; steep gradients']]],
        ],
        armor: [['Front', 1400, '1400', 2800, '2800+'], ['Side', 1200, '900–1200', 1800, '1800'], ['Rear', 340, '280–340', 900, '900']],
      },
      ghepard: {
        code: 'ADK-GH · 2', name: 'Ghepard 2', cls: 'ULBT-7 · Autonomous ultra-light tank', tileMeta: 'Autonomous · no crew',
        lead: 'The Ghepard 2 (ULBT-7, Ultra Light Battle Tank) turns the Behemoth’s logic upside down: no crew, armour kept to a minimum and everything focused on speed and reaction time. It survives not by taking the hit, but by not getting hit.',
        stats: [['0', '', 'Crew'], ['AI', '', 'Autonomous'], ['MIN', '', 'Armour'], ['MAX', '', 'Reactivity']],
        callouts: { ai: 'Autonomous AI · 0 crew', hull: 'Minimal armour', tracks: 'Very fast reaction', gun: 'Armed reconnaissance' },
        specs: [
          ['Profile', [
            ['Class', 'ULBT-7 — Ultra Light Battle Tank'],
            ['Crew', 'None: fully autonomous'],
            ['Protection', 'Minimal: survival relies on speed and reaction']]],
          ['Employment', [
            ['Mobility', 'Very high speed and reaction time'],
            ['Role', 'Armed reconnaissance, fast flanking, missions where arriving first matters'],
            ['In the fleet', 'Complements the Behemoth 2A1']]],
        ],
        note: 'Detailed specifications are available on request.',
      },
      spearhead: {
        code: 'ADK-SH · 3', name: 'Spearhead 3', cls: 'Main battle tank', tileMeta: '6th generation · conventional',
        lead: 'The Spearhead 3 is ALPHADEK Instruments’ sixth-generation conventional main battle tank (MBT): the fleet’s line tank, alongside the superheavy Behemoth 2A1 and the autonomous ultra-light Ghepard 2.',
        stats: [['6th', '', 'Generation'], ['MBT', '', 'Class'], ['CONV', '', 'Layout']],
        callouts: { gun: 'Main armament', gen: '6th generation', hull: 'Conventional MBT' },
        specs: [
          ['Profile', [
            ['Class', 'Main battle tank (MBT)'],
            ['Generation', 'Sixth'],
            ['Layout', 'Conventional'],
            ['In the fleet', 'Line tank, alongside the Behemoth 2A1 and the Ghepard 2']]],
        ],
        note: 'Technical specifications are not public yet: available on request.',
      },
      pipeEyebrow: 'In development', pipeH2: 'Upcoming vehicles', pipeName: 'Name to be announced', pipeTxt: 'Datasheet coming soon', pipeBadge: 'In development',
      pipeline: [['IFV', 'Infantry fighting vehicle'], ['SPG', 'Self-propelled artillery'], ['APC', 'Armoured personnel carrier'], ['LOG', 'Logistics truck'], ['ARV', 'Recovery vehicle']],
      vsEyebrow: 'Two philosophies', vsH2: 'Absorb or avoid',
      vs: [['Behemoth 2A1', 'Take the hit', 'Mass, armour and laser active protection: it stays in the fight under fire and opens the way.'],
           ['Ghepard 2', 'Don’t get hit', 'No crew and instant reaction: it gets there first, sees first and leaves first.']],
      ctaEyebrow: 'Private presentation', ctaH2: 'Want a closer look?', ctaP: 'Full datasheets are available on request: write to us stating your organisation and intended use.',
    },
    systems: {
      title: 'Systems', desc: 'ALPHADEK Instruments product lines: fire control, optronics, navigation, test and calibration.',
      eyebrow: 'Systems', h1: 'Product lines',
      lead: 'Four families of systems for targeting, observation, navigation and maintenance. Each line can be supplied on its own or integrated with the others.',
      linePrefix: 'LINE',
      list: [
        ['ADK-FC', 'FC', 'Fire control', 'Computers and interfaces that collect data from on-board sensors and present it to the crew clearly and immediately. Designed both for new platforms and for upgrading existing ones.',
          ['Real-time processing of sensor data', 'Standard interfaces to on-board systems', 'Crew displays and controls', 'Modular, upgradable architecture']],
        ['ADK-EO', 'EO', 'Optronics', 'Electro-optical sights and sensors for observation, surveillance and targeting, with day and thermal channels and video outputs to on-board systems.',
          ['Day channel and thermal channel', 'Image stabilisation', 'Optional laser rangefinder', 'Standard video outputs']],
        ['ADK-NAV', 'NAV', 'Navigation', 'Reference units that provide position and attitude to vehicles and systems, keeping their orientation even when no satellite signal is available.',
          ['Inertial position and attitude reference', 'Operation without a satellite signal', 'Fast alignment at start-up', 'Outputs to targeting and navigation systems']],
        ['ADK-CAL', 'CAL', 'Test and calibration', 'Benches and instruments to test and calibrate systems during maintenance, with guided procedures and recording of the results.',
          ['Test benches for 1st and 2nd level maintenance', 'Guided calibration procedures', 'Recording of test results', 'Laboratory and field versions']],
      ],
      notice: (contact) => `Detailed datasheets are available on request. <a href="${contact}">Contact us</a> stating the platform and intended use.`,
    },
    company: {
      title: 'Company', desc: 'Who ALPHADEK Instruments is: mission, values and way of working.',
      eyebrow: 'Company', h1: 'About us',
      lead: 'ALPHADEK Instruments designs and manufactures instrumentation for defence systems. Our name comes from our symbol: two stars and a spark, the precise point a good instrument knows how to find.',
      missionEyebrow: 'Mission', missionH2: 'Instruments you can trust',
      missionP: 'Whoever uses our systems must be able to rely on them in the toughest conditions. That is why we design from real-world use and test every instrument before it leaves our bench.',
      values: [
        ['Precision', 'Reliable, repeatable measurements, verified with documented test procedures.'],
        ['Reliability', 'Components selected and qualified to last, with simple and predictable maintenance.'],
        ['Responsibility', 'We operate in compliance with export regulations and the controls that apply to defence materiel.'],
      ],
      methodEyebrow: 'Method', methodH2: 'How we work',
      steps: [
        ['Requirements', 'We define use, platform and constraints together with the customer.'],
        ['Design', 'Architecture, electronics and mechanics, reviewed at every stage.'],
        ['Qualification', 'Environmental and functional testing before production.'],
        ['Production', 'Assembly and acceptance testing of every unit.'],
        ['Support', 'Training, spare parts, calibration and upgrades.'],
      ],
    },
    contact: {
      title: 'Contact', desc: 'How to contact ALPHADEK Instruments for sales and technical enquiries.',
      eyebrow: 'Contact', h1: 'Let’s talk',
      lead: 'For sales enquiries, datasheets or support for systems in service, write to us: tell us the platform, intended use and timeline.',
      cards: [
        ['Email', 'Email to be added', 'Sales and technical enquiries'],
        ['Phone', 'Number to be added', 'Mon–Fri, office hours'],
        ['Office', 'Address to be added', 'Visits by appointment only'],
      ],
      notice: 'This site does not collect any data: there are no forms, accounts or tracking.',
    },
  },
};

/* ───────────── Modelli ───────────── */
const card = (code, icon, title, text) =>
  `<article class="card">${icon ? ICON[icon] : ''}<span class="code">${code}</span><h3>${title}</h3><p>${text}</p></article>`;

/* percorso relativo da un file della lingua `from` a un file `to` (entrambi relativi a public/) */
function rel(fromFile, toFile) {
  const depth = fromFile.split('/').length - 1;
  return '../'.repeat(depth) + toFile;
}

function bodyFor(key, lang, file) {
  const t = T[lang], P = (f) => rel(file, f), L = (k) => P(FILES[k][lang]);
  if (key === 'home') {
    const h = t.home;
    return `<section class="hero grid-bg">
  <div class="wrap">
    <div>
      <span class="mono eyebrow">${h.eyebrow}</span>
      <h1>${h.h1}</h1>
      <p class="lead">${h.lead}</p>
      <div class="actions">
        <a class="btn" href="${L('systems')}">${h.ctaSystems}</a>
        <a class="btn ghost" href="${L('contact')}">${h.ctaContact}</a>
      </div>
    </div>
    <div class="hero-logo brackets"><span class="br-b"></span>
      <span class="tag tl">${h.tagTop}</span>
      <img src="${P('assets/alphadek-logo.svg')}" alt="ALPHADEK Instruments" width="480" height="466">
      <span class="tag br">${h.tagBottom}</span>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div><span class="mono eyebrow">${h.linesEyebrow}</span><h2>${h.linesH2}</h2></div>
      <p>${h.linesP}</p>
    </div>
    <div class="cards">${t.lines.map((l) => card(...l)).join('')}</div>
    <div class="actions"><a class="btn ghost" href="${L('systems')}">${h.allSystems}</a></div>
  </div>
</section>
<section class="section alt">
  <div class="wrap">
    <div class="section-head">
      <div><span class="mono eyebrow">${h.approachEyebrow}</span><h2>${h.approachH2}</h2></div>
    </div>
    <div class="cards three">
      ${h.approach.map(([a, b], i) => card('0' + (i + 1), '', a, b)).join('\n      ')}
    </div>
  </div>
</section>
<section class="cta grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">${h.ctaEyebrow}</span>
    <h2>${h.ctaH2}</h2>
    <p>${h.ctaP}</p>
    <div class="actions"><a class="btn" href="${L('contact')}">${h.ctaContact}</a></div>
  </div>
</section>`;
  }
  if (key === 'products') {
    const x = t.products;
    const stats = (arr) => `<div class="px-stats">${arr.map(([v, u, l]) => `<div class="px-stat"><b>${/^\d+$/.test(v) ? `<span data-count="${v}">${v}</span>` : v}${u ? `<small>${u}</small>` : ''}</b><span class="px-lbl">${l}</span></div>`).join('')}</div>`;
    const specs = (groups) => `<div class="px-specs">${groups.map(([h, rows]) => `<div><h3>${h}</h3><dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>`).join('')}</div>`;
    const stage = (model, d, idTag, asset) => `<div class="px-stage" data-model="${model}"${asset ? ` data-asset="${P(asset)}"` : ''}>
        <canvas aria-hidden="true"></canvas>
        <div class="px-callouts" aria-hidden="true">${Object.entries(d.callouts).map(([k, v]) => `<span class="px-callout" data-anchor="${k}"><em>${v}</em></span>`).join('')}</div>
        <span class="px-corner tl">${idTag}</span><span class="px-corner tr">${x.live}</span>
        <span class="px-corner bl">${x.dragHint}</span><span class="px-corner br" data-az>AZ 000°</span>
        <div class="px-fallback"><div><img src="${P('assets/alphadek-mark.svg')}" alt="" width="120" height="110"><p>${x.noGl}</p></div></div>
      </div>`;
    const armor = (rows) => `<div class="px-armor"><h3>${x.armorTitle}</h3>${rows.map(([l, ke, keTxt, ce, ceTxt]) => `<div class="px-arow"><span>${l}</span>
        <div class="px-track"><b class="px-fill" data-v="${ke}" data-max="2800"></b><i>${keTxt}</i></div>
        <div class="px-track"><b class="px-fill ce" data-v="${ce}" data-max="2800"></b><i>${ceTxt}</i></div></div>`).join('')}
        <div class="px-legend"><span>${x.ke}</span><span class="ce">${x.ce}</span></div></div>`;
    const b = x.behemoth, g = x.ghepard, sh = x.spearhead;
    return `<section class="px-hero">
  <div class="px-radar" aria-hidden="true"></div>
  <div class="wrap">
    <span class="mono eyebrow">${x.eyebrow}</span>
    <h1>${x.h1}</h1>
    <p class="lead">${x.lead}</p>
    <p class="px-boot mono" data-type="${x.boot}">${x.boot}</p>
    <div class="px-pick">
      <a class="px-tile" href="#behemoth"><span class="code">${b.code}</span><b>${b.name}</b><small>${b.cls}</small><small>${b.tileMeta}</small></a>
      <a class="px-tile" href="#ghepard"><span class="code">${g.code}</span><b>${g.name}</b><small>${g.cls}</small><small>${g.tileMeta}</small></a>
      <a class="px-tile" href="#spearhead"><span class="code">${sh.code}</span><b>${sh.name}</b><small>${sh.cls}</small><small>${sh.tileMeta}</small></a>
    </div>
    <a class="px-more mono" href="#pipeline">+ ${x.pipeline.length} · ${x.pipeEyebrow}</a>
  </div>
</section>
<section class="px-product" id="behemoth">
  <div class="wrap px-grid">
    ${stage('behemoth', b, 'ADK // BH-2A1', 'assets/models/behemoth-2a1.holo')}
    <div class="px-info">
      <span class="mono eyebrow">${b.cls}</span>
      <h2>${b.name}</h2>
      <p class="lead">${b.lead}</p>
      ${stats(b.stats)}
      ${specs(b.specs)}
      ${armor(b.armor)}
      <p class="px-quote">${x.quoteLabel}: “${x.boot}”</p>
    </div>
  </div>
</section>
<section class="px-product alt" id="ghepard">
  <div class="wrap px-grid">
    ${stage('ghepard', g, 'ADK // GH-2 · ULBT-7')}
    <div class="px-info">
      <span class="mono eyebrow">${g.cls}</span>
      <h2>${g.name}</h2>
      <p class="lead">${g.lead}</p>
      ${stats(g.stats)}
      ${specs(g.specs)}
      <p class="notice">${g.note} <a href="${L('contact')}">${t.nav.contact}</a></p>
    </div>
  </div>
</section>
<section class="px-product" id="spearhead">
  <div class="wrap px-grid">
    ${stage('spearhead', sh, 'ADK // SH-3 · MBT')}
    <div class="px-info">
      <span class="mono eyebrow">${sh.cls}</span>
      <h2>${sh.name}</h2>
      <p class="lead">${sh.lead}</p>
      ${stats(sh.stats)}
      ${specs(sh.specs)}
      <p class="notice">${sh.note} <a href="${L('contact')}">${t.nav.contact}</a></p>
    </div>
  </div>
</section>
<section class="section alt" id="pipeline">
  <div class="wrap">
    <div class="section-head"><div><span class="mono eyebrow">${x.pipeEyebrow}</span><h2>${x.pipeH2}</h2></div></div>
    <div class="px-soon">${x.pipeline.map(([c, n]) => `<div class="px-soon-card"><span class="code">ADK-${c} · —</span><b>${n}</b><small>${x.pipeName}</small><em>${x.pipeBadge}</em><p>${x.pipeTxt}</p></div>`).join('')}</div>
  </div>
</section>
<section class="px-compare grid-bg">
  <div class="wrap">
    <div class="section-head"><div><span class="mono eyebrow">${x.vsEyebrow}</span><h2>${x.vsH2}</h2></div></div>
    <div class="px-vs">
      <div><span class="code">${x.vs[0][0]}</span><h3>${x.vs[0][1]}</h3><p>${x.vs[0][2]}</p></div>
      <b>VS</b>
      <div><span class="code">${x.vs[1][0]}</span><h3>${x.vs[1][1]}</h3><p>${x.vs[1][2]}</p></div>
    </div>
  </div>
</section>
<section class="cta grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">${x.ctaEyebrow}</span>
    <h2>${x.ctaH2}</h2>
    <p>${x.ctaP}</p>
    <div class="actions"><a class="btn" href="${L('contact')}">${t.home.ctaContact}</a></div>
  </div>
</section>`;
  }
  if (key === 'systems') {
    const s = t.systems;
    const items = s.list.map(([c, short, title, d, fs]) => `<article class="system" id="${c.toLowerCase()}">
      <div class="id">${s.linePrefix} ${c}<b>${short}</b></div>
      <div><h2>${title}</h2><p class="lead">${d}</p><ul>${fs.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    </article>`).join('');
    return `<section class="page-hero grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">${s.eyebrow}</span>
    <h1>${s.h1}</h1>
    <p class="lead">${s.lead}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    ${items}
    <p class="notice">${s.notice(L('contact'))}</p>
  </div>
</section>`;
  }
  if (key === 'company') {
    const c = t.company;
    return `<section class="page-hero grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">${c.eyebrow}</span>
    <h1>${c.h1}</h1>
    <p class="lead">${c.lead}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><div><span class="mono eyebrow">${c.missionEyebrow}</span><h2>${c.missionH2}</h2></div>
    <p>${c.missionP}</p></div>
    <div class="cards three">
      ${c.values.map(([a, b], i) => card('0' + (i + 1), '', a, b)).join('\n      ')}
    </div>
  </div>
</section>
<section class="section alt">
  <div class="wrap">
    <div class="section-head"><div><span class="mono eyebrow">${c.methodEyebrow}</span><h2>${c.methodH2}</h2></div></div>
    <ol class="steps">
      ${c.steps.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('\n      ')}
    </ol>
  </div>
</section>`;
  }
  if (key === 'contact') {
    const c = t.contact;
    return `<section class="page-hero grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">${c.eyebrow}</span>
    <h1>${c.h1}</h1>
    <p class="lead">${c.lead}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="contact-grid">
      ${c.cards.map(([k, v, s]) => `<div><span class="mono">${k}</span><p class="todo">${v}</p><small>${s}</small></div>`).join('\n      ')}
    </div>
    <p class="notice">${c.notice}</p>
  </div>
</section>`;
  }
  throw new Error('pagina sconosciuta ' + key);
}

function page({ key, lang, file, title, desc, body, intro = false, base = null, scripts = [] }) {
  const t = T[lang], P = (f) => base ? f : rel(file, f), L = (k) => P(FILES[k][lang]);
  const fullTitle = key === 'home' ? title : `${title} — ALPHADEK Instruments`;
  const nav = NAV_KEYS.map((k) => {
    const cur = k === key ? ' aria-current="page"' : '';
    if (k !== 'products') return `<a href="${L(k)}"${cur}>${t.nav[k]}</a>`;
    const pr = t.products;
    return `<div class="nav-drop"><a class="nav-drop-btn" href="${L(k)}"${cur}>${t.nav[k]}</a><div class="nav-menu">` +
      `<a href="${L(k)}#behemoth"><b>${pr.behemoth.name}</b><span>${pr.behemoth.cls}</span></a>` +
      `<a href="${L(k)}#ghepard"><b>${pr.ghepard.name}</b><span>${pr.ghepard.cls}</span></a>` +
      `<a href="${L(k)}#spearhead"><b>${pr.spearhead.name}</b><span>${pr.spearhead.cls}</span></a>` +
      `<a class="nav-soon" href="${L(k)}#pipeline"><b>${pr.pipeEyebrow}</b><span>${pr.pipeline.map((p) => p[0]).join(' · ')}</span></a></div></div>`;
  }).join('');
  /* selettore lingua: porta alla stessa pagina nell'altra lingua */
  const other = lang === 'it' ? 'en' : 'it';
  const switchTo = (lg) => FILES[key] ? P(FILES[key][lg]) : P(FILES.home[lg]);
  const langSwitch = `<div class="lang-switch" role="group" aria-label="${t.langLabel}">${['it', 'en'].map((lg) =>
    lg === lang ? `<a href="${switchTo(lg)}" hreflang="${lg}" lang="${lg}" aria-current="true">${lg.toUpperCase()}</a>`
                : `<a href="${switchTo(lg)}" hreflang="${lg}" lang="${lg}">${lg.toUpperCase()}</a>`).join('')}</div>`;
  const alternates = FILES[key]
    ? ['it', 'en'].map((lg) => `\n<link rel="alternate" hreflang="${lg}" href="${SITE_URL}${FILES[key][lg].replace(/(^|\/)index\.html$/, '$1')}">`).join('') +
      `\n<link rel="alternate" hreflang="x-default" href="${SITE_URL}${FILES[key].it.replace(/(^|\/)index\.html$/, '$1')}">`
    : '';
  const headIntro = intro ? `\n<script src="${P('assets/intro-gate.js')}"></script>` : '';
  const introHtml = intro ? `<div class="intro" id="intro" aria-hidden="true">
  <div class="intro-grid"></div>
  <button class="intro-skip" type="button">${t.skipIntro}</button>
</div>
` : '';
  const introJs = intro ? `
<script src="${P('assets/vendor/three-intro.min.js')}"></script>
<script src="${P('assets/logo-data.js')}"></script>
<script src="${P('assets/intro.js')}"></script>` : '';
  return `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#070a08">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">${base ? `\n<base href="${base}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="ALPHADEK Instruments">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:locale:alternate" content="${T[other].ogLocale}">${alternates}
<link rel="icon" href="${P('assets/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${P('assets/fonts/barlow-condensed-latin-700-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${P('assets/site.css')}">${headIntro}
</head>
<body>
${introHtml}${base ? '' : `<a class="skip" href="#main">${t.skipToContent}</a>\n`}<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${L('home')}" aria-label="ALPHADEK Instruments — Home">
      <img src="${P('assets/alphadek-mark.svg')}" alt="" width="44" height="40">
      <span class="brand-name"><b>ALPHADEK</b><span>INSTRUMENTS</span></span>
    </a>
    <nav class="nav" id="nav" aria-label="${t.navLabel}">${nav}</nav>
    ${langSwitch}
    <button class="nav-toggle" type="button" aria-label="${t.menu}" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div>
      <img src="${P('assets/alphadek-logo.svg')}" alt="ALPHADEK Instruments" width="150" height="146">
      <p>${t.footerText}</p>
    </div>
    <div>
      <h4>${t.footerSite}</h4>
      <ul>${NAV_KEYS.map((k) => `<li><a href="${L(k)}">${t.nav[k]}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h4>${t.footerInfo}</h4>
      <ul>
        <li><a href="${L('contact')}">${t.footerDatasheet}</a></li>
        <li><button class="linklike" type="button" data-replay-intro="${L('home')}">${t.footerReplay}</button></li>
      </ul>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span id="year">2026</span> ALPHADEK Instruments</span>
      <span>${t.footerTag}</span>
    </div>
  </div>
</footer>
<script src="${P('assets/site.js')}"></script>${introJs}${scripts.map((f) => `\n<script src="${P(f)}"></script>`).join('')}
</body>
</html>
`;
}

/* ───────────── Generazione ───────────── */
const out = [];
for (const lang of ['it', 'en']) {
  for (const key of NAV_KEYS) {
    const file = FILES[key][lang], d = T[lang][key];
    const html = page({ key, lang, file, title: d.title, desc: d.desc, body: bodyFor(key, lang, file), intro: key === 'home',
      scripts: key === 'products' ? ['assets/vendor/three-intro.min.js', 'assets/products.js'] : [] });
    mkdirSync(dirname(join(PUBLIC, file)), { recursive: true });
    writeFileSync(join(PUBLIC, file), html);
    out.push(file);
  }
}

/* 404 unica e bilingue (GitHub Pages ne usa una sola per tutto il sito).
   <base> fa funzionare i percorsi anche per indirizzi sbagliati dentro /en/. */
const notFound = `<section class="page-hero grid-bg">
  <div class="wrap">
    <span class="mono eyebrow">Errore 404 · Error 404</span>
    <h1>Bersaglio non trovato</h1>
    <p class="lead">La pagina che cerchi non esiste o è stata spostata.</p>
    <p class="lead" lang="en"><strong>Target not found.</strong> The page you are looking for does not exist or has been moved.</p>
    <div class="actions">
      <a class="btn" href="index.html">Torna alla home</a>
      <a class="btn ghost" href="en/index.html" lang="en">English home</a>
    </div>
  </div>
</section>`;
writeFileSync(join(PUBLIC, '404.html'), page({ key: '404', lang: 'it', file: '404.html', title: 'Pagina non trovata', desc: 'Pagina non trovata.', body: notFound, base: BASE_PATH }));
out.push('404.html');
console.log('Pagine generate: ' + out.join(', '));
