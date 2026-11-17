#!/usr/bin/env node
/* ALPHADEK Instruments — controllo del sito prima di ogni push.
   Nessuna dipendenza: richiede solo Node 18+.
   Uso: node scripts/check.mjs   (esce con codice 1 se trova problemi) */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(REPO, 'public'); /* cartella pubblicata */
const errors = [];
const fail = (file, msg) => errors.push(`${relative(REPO, file) || file}: ${msg}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
if (!existsSync(ROOT)) { console.error('✗ manca la cartella public/'); process.exit(1); }
const files = walk(ROOT);
const html = files.filter(f => f.endsWith('.html'));
const js = files.filter(f => f.endsWith('.js') && !f.includes(`${'assets'}/vendor/`));

if (!html.length) fail(ROOT, 'nessuna pagina HTML trovata');

let cspRef = null;
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  if (!/^<!DOCTYPE html>/i.test(s)) fail(f, 'manca <!DOCTYPE html>');
  if (!/<html[^>]*\blang="[a-z]{2}"/.test(s)) fail(f, 'manca lang su <html>');
  if (!/<title>[^<]+<\/title>/.test(s)) fail(f, 'manca <title>');

  // Content-Security-Policy: presente, uguale in tutte le pagine, solo 'self'
  const m = s.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if (!m) fail(f, 'manca la Content-Security-Policy');
  else {
    if (cspRef === null) cspRef = m[1];
    else if (m[1] !== cspRef) fail(f, 'Content-Security-Policy diversa dalle altre pagine');
    if (/https?:\/\//.test(m[1])) fail(f, 'la Content-Security-Policy consente siti esterni');
    if (/unsafe-(inline|eval)/.test(m[1])) fail(f, "la Content-Security-Policy contiene 'unsafe-inline' o 'unsafe-eval'");
  }

  // Niente codice o stili inline (la CSP li bloccherebbe)
  for (const tag of s.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) || []) {
    if (!/\bsrc="/.test(tag)) fail(f, 'script inline non consentito');
    else if (!/>\s*<\/script>$/.test(tag)) fail(f, 'script con src non deve avere contenuto');
  }
  if (/<style\b/i.test(s)) fail(f, 'blocco <style> inline non consentito');
  if (/\sstyle="/i.test(s)) fail(f, 'attributo style="" non consentito');
  if (/\son[a-z]+="/i.test(s)) fail(f, 'gestore di eventi inline (onclick, onload…) non consentito');

  // Risorse caricate dalla pagina: solo file del sito (i normali link <a> verso altri siti sono ammessi)
  for (const [whole, tag, url] of s.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*\s(?:src|href|data)="((?:https?:)?\/\/[^"]*)"[^>]*>/gi)) {
    if (tag.toLowerCase() === 'link' && /\brel="(alternate|canonical)"/.test(whole)) continue; /* indirizzi, non risorse caricate */
    fail(f, `risorsa esterna caricata da <${tag}>: ${url}`);
  }

  // Riferimenti locali: i file devono esistere.
  // Con <base href="/sito/"> (pagina 404) i percorsi relativi partono dalla cartella public/.
  const hasBase = /<base\s+href="[^"]+">/.test(s);
  const sNoBase = s.replace(/<base\s+href="[^"]+">/g, '');
  for (const [, , url] of sNoBase.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (url === '' || /^(mailto:|tel:|#|data:|(https?:)?\/\/)/.test(url)) continue;
    const clean = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/') ? join(ROOT, clean) : normalize(join(hasBase ? ROOT : dirname(f), clean));
    if (!existsSync(target)) fail(f, `collegamento rotto: ${url}`);
  }

  // Residui del vecchio sistema account / Firebase
  if (/firebase|gstatic\.com|googleapis\.com|emailjs|\/auth\/|\/portal\//i.test(s)) fail(f, 'riferimento a Firebase, servizi esterni o al vecchio sistema account');
}

// _headers (Netlify / Cloudflare Pages): CSP allineata alle pagine + anti-framing
const headersFile = join(ROOT, '_headers');
if (!existsSync(headersFile)) fail(headersFile, 'manca il file _headers (intestazioni di sicurezza)');
else {
  const h = readFileSync(headersFile, 'utf8');
  const hc = (h.match(/^\s+Content-Security-Policy:\s*(.+)$/m) || [])[1];
  if (!hc) fail(headersFile, 'manca Content-Security-Policy');
  else {
    if (cspRef && hc.trim() !== `${cspRef}; frame-ancestors 'none'`) fail(headersFile, "la CSP non coincide con quella delle pagine + frame-ancestors 'none'");
  }
  if (!/^\s+X-Frame-Options:\s*DENY\s*$/m.test(h)) fail(headersFile, 'manca X-Frame-Options: DENY');
  if (!/^\s+X-Content-Type-Options:\s*nosniff\s*$/m.test(h)) fail(headersFile, 'manca X-Content-Type-Options: nosniff');
}

// Sintassi degli script del sito
for (const f of js) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(f, 'errore di sintassi JavaScript\n' + String(e.stderr || e.message).trim().split('\n').slice(0, 4).join('\n')); }
  const s = readFileSync(f, 'utf8');
  if (/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\/(?!www\.w3\.org)/.test(s)) fail(f, 'possibile richiesta verso l\'esterno');
}

// File che non devono tornare nel repo
for (const p of ['firebase.json', '.firebaserc', 'functions', 'firestore.rules', 'auth', 'portal', 'public/node_modules', 'public/package.json']) {
  if (existsSync(join(REPO, p))) fail(join(REPO, p), 'non deve esistere (Firebase e account rimossi; dipendenze fuori da public/)');
}

if (errors.length) {
  console.error(`\n✗ Controllo fallito: ${errors.length} problema/i\n`);
  for (const e of errors) console.error('  - ' + e);
  console.error('');
  process.exit(1);
}
console.log(`✓ Controllo superato: ${html.length} pagine, ${js.length} script, CSP uguale ovunque, nessuna risorsa esterna, nessun link rotto.`);
