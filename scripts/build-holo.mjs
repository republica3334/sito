/* Monta il GameTank (placeholder del Behemoth 2A1, repo del gioco fallenstar11/game1) e produce
   il file dell'ologramma: linee del wireframe per parte, quantizzate in int16 (formato "ADKH").
   Uso (dopo npm install):
     npm run holo:behemoth -- <game1>/SourceArt/GameTank public/assets/models/behemoth-2a1.holo
   La cartella deve contenere SM_GT_{Hull,Turret,Gun,RoadWheel,Sprocket,TrackLink}.fbx e GameTank_points.json
   (in game1 sono su Git LFS: git lfs pull --include="SourceArt/GameTank/*.fbx").
   Con FILL=1 aggiunge anche le superfici di scafo, torretta e cannone (file circa 3 volte più grande). */
import { NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const [GT, OUT] = process.argv.slice(2);
if (!GT || !OUT) { console.error('Uso: npm run holo:behemoth -- <cartella SourceArt/GameTank> <file .holo>'); process.exit(1); }
const P = JSON.parse(readFileSync(join(GT, 'GameTank_points.json'), 'utf8'));

/* FBX -> GLB con FBX2glTF (pacchetto npm "fbx2gltf") in una cartella temporanea */
const require = createRequire(import.meta.url);
const tool = join(dirname(require.resolve('fbx2gltf')), 'bin', process.platform === 'win32' ? 'Windows_NT' : process.platform === 'darwin' ? 'Darwin' : 'Linux', 'FBX2glTF' + (process.platform === 'win32' ? '.exe' : ''));
if (process.platform !== 'win32' && existsSync(tool)) chmodSync(tool, 0o755);
const convert = require('fbx2gltf');
const SRC = mkdtempSync(join(tmpdir(), 'adk-holo-'));
for (const part of ['Hull', 'Turret', 'Gun', 'RoadWheel', 'Sprocket', 'TrackLink']) {
  const fbx = join(GT, `SM_GT_${part}.fbx`);
  if (readFileSync(fbx).subarray(0, 7).toString() === 'version') { console.error(`${fbx} è un puntatore Git LFS: esegui prima git lfs pull`); process.exit(1); }
  await convert(fbx, join(SRC, `SM_GT_${part}.glb`), ['--binary']);
}
const io = new NodeIO();
const ue = (v) => new THREE.Vector3(v[0] / 100, v[2] / 100, -v[1] / 100); /* cm UE (X avanti, Z su) -> m glTF (Y su) */

async function load(name) {
  const doc = await io.read(`${SRC}/SM_GT_${name}.glb`); const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    for (const p of mesh.listPrimitives()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(p.getAttribute('POSITION').getArray()), 3));
      const idx = p.getIndices(); if (idx) g.setIndex(Array.from(idx.getArray()));
      g.applyMatrix4(m); out.push({ g, mat: p.getMaterial()?.getName() || '' });
    }
  }
  return out;
}
const at = (geoms, pos, scaleZ = 1) => geoms.map(({ g, mat }) => { const c = g.clone(); if (scaleZ !== 1) c.scale(1, 1, scaleZ); c.translate(pos.x, pos.y, pos.z); return { g: c, mat }; });

const hull = await load('Hull'), turret = await load('Turret'), gun = await load('Gun'), wheel = await load('RoadWheel'), sprocket = await load('Sprocket');
const tPiv = ue(P.turret_pivot_in_hull), gPiv = tPiv.clone().add(ue(P.gun_pivot_in_turret));
const parts = {
  hull: hull, turret: at(turret, tPiv), gun: at(gun, gPiv),
  wheels: P.wheels_in_hull_cm.flatMap((w) => at(wheel, ue(w))),
  sprockets: P.sprockets_idlers_in_hull_cm.flatMap((s) => { const v = ue(s); return at(sprocket, v, v.z < 0 ? -1 : 1); }),
};

/* cingoli: un anello di maglie per ogni fila di ruote, attorno a ruote, ruota motrice e tendicingolo */
const linkLen = P.link_pitch_cm / 100, [lw, ll, lt] = P.link_dims_cm.map((x) => x / 100), half = lt / 2;
const rows = [...new Set(P.wheels_in_hull_cm.map((w) => w[1]))];
const trackSegs = [];
for (const y of rows) {
  const z = -y / 100, ws = P.wheels_in_hull_cm.filter((w) => w[1] === y).map((w) => [w[0] / 100, w[2] / 100]);
  const side = P.sprockets_idlers_in_hull_cm.filter((s) => Math.sign(s[1]) === Math.sign(y)).map((s) => [s[0] / 100, s[2] / 100]);
  const R = P.wheel_radius_cm / 100 + half, RS = 1.27 + half, pts = [];
  ws.forEach(([x, h]) => { for (let a = 0; a < 64; a++) pts.push([x + Math.cos(a / 64 * 6.283) * R, h + Math.sin(a / 64 * 6.283) * R]); });
  side.forEach(([x, h]) => { for (let a = 0; a < 64; a++) pts.push([x + Math.cos(a / 64 * 6.283) * RS, h + Math.sin(a / 64 * 6.283) * RS]); });
  /* inviluppo convesso (monotone chain) */
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hullPts = lo.slice(0, -1).concat(up.slice(0, -1)); hullPts.push(hullPts[0]);
  /* maglie a passo costante lungo il perimetro */
  let carry = 0;
  for (let i = 0; i < hullPts.length - 1; i++) {
    const [ax, ay] = hullPts[i], [bx, by] = hullPts[i + 1], L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    for (let d = carry; d < L; d += linkLen) {
      const box = new THREE.BoxGeometry(ll, lt, lw); box.rotateZ(ang); box.translate(ax + (bx - ax) * d / L, ay + (by - ay) * d / L, z);
      trackSegs.push(box);
    }
    carry = ((carry - L) % linkLen + linkLen) % linkLen;
  }
}

function merge(list) { /* unisce geometrie non indicizzate */
  const arrs = list.map((g) => (g.index ? g.toNonIndexed() : g).attributes.position.array);
  const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); return g;
}
const groups = [];
const ANG = { hull: 28, turret: 28, gun: 20, wheels: 40, sprockets: 40 };
for (const [k, list] of Object.entries(parts)) {
  const geo = merge(list.map((x) => x.g));
  groups.push({ name: k, kind: 'lines', pos: new THREE.EdgesGeometry(geo, ANG[k]).attributes.position.array });
  if (process.env.FILL && ['hull', 'turret', 'gun'].includes(k)) groups.push({ name: k + '_fill', kind: 'tris', pos: geo.attributes.position.array });
}
groups.push({ name: 'tracks', kind: 'lines', pos: new THREE.EdgesGeometry(merge(trackSegs), 30).attributes.position.array });

/* quantizzazione int16 sull'ingombro totale */
const box = new THREE.Box3(); groups.forEach((g) => { for (let i = 0; i < g.pos.length; i += 3) box.expandByPoint(new THREE.Vector3(g.pos[i], g.pos[i + 1], g.pos[i + 2])); });
const names = ['hull', 'turret', 'gun', 'wheels', 'sprockets', 'tracks', 'hull_fill', 'turret_fill', 'gun_fill'];
let size = 4 + 4 + 24 + 4; groups.forEach((g) => { size += 1 + 1 + 4 + g.pos.length * 2; size += (4 - size % 4) % 4; });
const buf = Buffer.alloc(size); let o = 0;
buf.write('ADKH', o); o += 4; buf.writeUInt32LE(1, o); o += 4;
[box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].forEach((v) => { buf.writeFloatLE(v, o); o += 4; });
buf.writeUInt32LE(groups.length, o); o += 4;
const span = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z], mn = [box.min.x, box.min.y, box.min.z];
for (const g of groups) {
  buf.writeUInt8(names.indexOf(g.name), o++); buf.writeUInt8(g.kind === 'lines' ? 0 : 1, o++); buf.writeUInt32LE(g.pos.length / 3, o); o += 4;
  for (let i = 0; i < g.pos.length; i++) { const k = i % 3; buf.writeInt16LE(Math.round(((g.pos[i] - mn[k]) / span[k]) * 65535 - 32768), o); o += 2; }
  o += (4 - o % 4) % 4;
}
writeFileSync(OUT, buf);
rmSync(SRC, { recursive: true, force: true });
const muzzle = gPiv.clone().add(new THREE.Vector3(18.69, 0, 0));
console.log('file:', OUT, (size / 1024).toFixed(0) + ' KB');
groups.forEach((g) => console.log(`  ${g.name.padEnd(12)} ${g.kind.padEnd(5)} ${(g.pos.length / (g.kind === 'lines' ? 6 : 9)).toFixed(0)} ${g.kind === 'lines' ? 'segmenti' : 'triangoli'}`));
console.log('ingombro min', box.min.toArray().map((v) => +v.toFixed(2)), 'max', box.max.toArray().map((v) => +v.toFixed(2)));
console.log('perno torretta', tPiv.toArray(), '| perno cannone', gPiv.toArray().map((v) => +v.toFixed(2)), '| volata', muzzle.toArray().map((v) => +v.toFixed(2)));
console.log('maglie cingolo:', trackSegs.length);
