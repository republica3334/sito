/* ALPHADEK Instruments — 3D intro (Three.js r128, served locally).
   Extruded metal logo, HUD reticle and camera move; fades into the home page. */
(function () {
  var root = document.documentElement;
  var overlay = document.getElementById('intro');
  if (!overlay) return;
  if (!root.classList.contains('intro-pending')) { overlay.hidden = true; return; }

  var finished = false, running = false, renderer = null;
  function markSeen() { try { sessionStorage.setItem('adk_intro_seen', '1'); } catch (e) {} }
  function finish() {
    if (finished) return;
    finished = true; running = false; markSeen();
    root.classList.add('intro-leaving');
    root.classList.remove('intro-pending');
    overlay.classList.add('hide');
    if (history.replaceState && /[?&]intro\b/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(function () {
      overlay.hidden = true;
      root.classList.remove('intro-leaving');
      if (renderer) { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); }
      var c = overlay.querySelector('canvas'); if (c) c.remove();
    }, 750);
  }
  overlay.querySelector('.intro-skip').addEventListener('click', finish);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });
  setTimeout(finish, 12000); /* safety net: never block the site */

  if (!window.THREE || !THREE.SVGLoader || !THREE.RoomEnvironment || !window.ALPHADEK_LOGO) { finish(); return; }
  var LOGO = window.ALPHADEK_LOGO;

  var DUR = 5.6, HOLD = 0.7;
  var cl = function (x) { return Math.min(1, Math.max(0, x)); };
  var p = function (t, s, d) { return cl((t - s) / d); };
  var eOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var eOutQuart = function (x) { return 1 - Math.pow(1 - x, 4); };
  var eOutExpo = function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  var eInOut = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var lerp = function (a, b, x) { return a + (b - a) * x; };
  var D2R = Math.PI / 180;

  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { finish(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  overlay.insertBefore(renderer.domElement, overlay.firstChild);

  var scene = new THREE.Scene();
  var pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  var rim = new THREE.DirectionalLight(0xbfe8c0, .8); rim.position.set(8, -3, -6); scene.add(rim);
  var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-9, 7, 6); scene.add(key);
  var glint = new THREE.PointLight(0xffffff, 0, 14, 2); scene.add(glint);

  var hudColor = new THREE.Color((getComputedStyle(root).getPropertyValue('--hud') || '').trim() || '#8fe388');
  var K = 0.01;
  var group = new THREE.Group(); group.scale.set(K, -K, K); group.position.set(-630 * K, 591 * K, 0); scene.add(group);

  var loader = new THREE.SVGLoader();
  function shapes(d) {
    var data = loader.parse('<svg xmlns="http://www.w3.org/2000/svg"><path d="' + d + '"/></svg>');
    var out = []; data.paths.forEach(function (pp) { out.push.apply(out, THREE.SVGLoader.createShapes(pp)); }); return out;
  }
  function metal() { return new THREE.MeshStandardMaterial({ color: 0xe8ece4, metalness: .9, roughness: .24, transparent: true, opacity: 0 }); }
  function mk(d, depth, bs, ox, oy) {
    var g = new THREE.ExtrudeGeometry(shapes(d), { depth: depth, bevelEnabled: true, bevelThickness: bs * 1.6, bevelSize: bs, bevelSegments: 2, curveSegments: 6 });
    g.computeBoundingBox(); var c = new THREE.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, -c.z);
    var m = new THREE.Mesh(g, metal()); m.position.set((ox || 0) + c.x, (oy || 0) + c.y, 0); m.userData.home = m.position.clone(); group.add(m); return m;
  }
  var mainM = mk(LOGO.main, 90, 4), midM = mk(LOGO.mid, 70, 3), smallM = mk(LOGO.small, 70, 3);
  var letters = LOGO.letters.map(function (l, i) {
    var m = mk(l.d, i < 8 ? 50 : 30, i < 8 ? 2.5 : 1.2, l.x, l.y); m.userData.row = i < 8 ? 1 : 2; m.userData.i = i < 8 ? i : i - 8; return m;
  });

  /* comet trail */
  function gradTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 4; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 4); return new THREE.CanvasTexture(c);
  }
  var trailG = new THREE.PlaneGeometry(700, 12); trailG.translate(-350, 0, 0);
  var trail = new THREE.Mesh(trailG, new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  group.add(trail);

  /* HUD projected in 3D */
  var hudMats = [];
  function hm() { var m = new THREE.MeshBasicMaterial({ color: hudColor, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); hudMats.push(m); return m; }
  function lm(dashed) {
    var m = dashed ? new THREE.LineDashedMaterial({ color: hudColor, dashSize: 14, gapSize: 10, transparent: true, opacity: 0, toneMapped: false })
                   : new THREE.LineBasicMaterial({ color: hudColor, transparent: true, opacity: 0, toneMapped: false });
    hudMats.push(m); return m;
  }
  var HZ = 30, CX = 630, CY = 445;
  var xh = new THREE.Group(); xh.position.set(CX, CY, HZ); group.add(xh);
  [[[-2030, -5], [2030, -5]], [[-40, -645], [-40, 515]]].forEach(function (ab) {
    var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ab[0][0], ab[0][1], 0), new THREE.Vector3(ab[1][0], ab[1][1], 0)]);
    var l = new THREE.Line(g, lm(true)); l.computeLineDistances(); xh.add(l);
  });
  var xhMat = xh.children.map(function (c) { return c.material; });
  var rulerPts = [];
  for (var i = 0; i < 31; i++) { var rx = 135 + i * 33; rulerPts.push(new THREE.Vector3(rx, -40, HZ), new THREE.Vector3(rx, -40 + (i % 5 === 0 ? 22 : 10), HZ)); }
  var ruler = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rulerPts), lm(false)); group.add(ruler);
  var br = new THREE.Group(); br.position.set(CX, CY, HZ); group.add(br); var brMat = hm();
  [[105, -20, 1, 1], [1154, -20, -1, 1], [105, 910, 1, -1], [1154, 910, -1, -1]].forEach(function (q) {
    var h = new THREE.Mesh(new THREE.PlaneGeometry(70, 7), brMat); h.position.set(q[0] - CX + q[2] * 35, q[1] - CY, 0); br.add(h);
    var v = new THREE.Mesh(new THREE.PlaneGeometry(7, 70), brMat); v.position.set(q[0] - CX, q[1] - CY + q[3] * 35, 0); br.add(v);
  });
  function label(txt, size, x, y, align) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 64; var g = c.getContext('2d');
    g.font = '48px "Share Tech Mono", ui-monospace, monospace'; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = align;
    g.fillText(txt, align === 'left' ? 4 : 1020, 48);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var H = size * 64 / 48, W = H * 16;
    var m = new THREE.MeshBasicMaterial({ map: t, color: hudColor, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); hudMats.push(m);
    var geo = new THREE.PlaneGeometry(W, H); geo.scale(1, -1, 1);
    var me = new THREE.Mesh(geo, m); me.position.set(align === 'left' ? x + W / 2 - 4 * H / 64 : x - W / 2 + 4 * H / 64, y - (48 - 32) * H / 64, HZ); group.add(me); return m;
  }
  var acq, lck, rng;

  var dist = 1;
  function frame() {
    var w = overlay.clientWidth || innerWidth, h = overlay.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    var f = 2 * Math.tan(camera.fov * D2R / 2);
    dist = Math.max(12.4 / (0.62 * f), 13.6 / (0.62 * f * camera.aspect));
  }
  frame();
  addEventListener('resize', function () { if (!finished) frame(); });

  var gridEl = overlay.querySelector('.intro-grid');
  function setOp(m, o) { m.material.opacity = o; m.material.transparent = o < 1; m.visible = o > 0.001; }
  function renderAt(t) {
    var hudA = 1 - p(t, 3.3, .8);
    var cf = eOutQuart(p(t, 0, .9));
    smallM.position.x = smallM.userData.home.x - 1100 * (1 - cf); smallM.rotation.z = -3 * Math.PI * (1 - cf);
    setOp(smallM, p(t, 0, .13));
    var tp = p(t, 0, 1.3); trail.position.set(smallM.position.x, 667, 0);
    trail.scale.x = Math.max(.001, 1 - eOutCubic(cl((tp - .6) / .4))) * (tp < .6 ? 1 : lerp(.8, 0, cl((tp - .6) / .4)));
    trail.material.opacity = t < 1.3 ? (tp < .6 ? .9 : lerp(.9, 0, (tp - .6) / .4)) : 0;
    var q = eOutExpo(p(t, .8, .8)); midM.scale.setScalar(.15 + .85 * q); midM.rotation.z = (1 - q) * Math.PI / 4; setOp(midM, q);
    var mo = 0; if (t >= 1.7) { var k = Math.floor((t - 1.7) / .1); mo = t >= 2.2 ? 1 : ([1, .15, 1, .3, 1][k] !== undefined ? [1, .15, 1, .3, 1][k] : 1); }
    setOp(mainM, mo); mainM.position.z = lerp(120, 0, eOutCubic(p(t, 1.7, .5)));
    var glow = t < 1.7 ? 0 : (t < 2.2 ? .9 : lerp(.9, 0, p(t, 2.2, .8))); mainM.material.emissive = hudColor; mainM.material.emissiveIntensity = glow;
    letters.forEach(function (m) {
      var u = m.userData, h = u.home, x;
      if (u.row === 1) { x = eOutCubic(p(t, 2.1 + u.i * .065, .6)); m.position.set(h.x, h.y + 40 * (1 - x), 150 * (1 - x)); setOp(m, x); }
      else { x = eOutCubic(p(t, 2.75 + u.i * .045, .9)); m.position.set(h.x + (5 - u.i) * 14 * (1 - x), h.y, 0); setOp(m, x); }
    });
    var xo = eOutCubic(p(t, .1, .7)); xh.scale.setScalar(lerp(1.6, 1, xo)); xh.rotation.z = lerp(8, 0, xo) * D2R;
    var xa = (t < 2 ? .55 * xo : lerp(.55, .12, p(t, 2, .4))) * hudA; xhMat.forEach(function (m) { m.opacity = xa; });
    ruler.material.opacity = p(t, .3, .4) * hudA * .9;
    var c = p(t, .8, .9), ce = eInOut(c); var bs = c < .7 ? lerp(1.55, .97, ce / eInOut(.7)) : lerp(.97, 1, (c - .7) / .3);
    br.scale.setScalar(bs); br.rotation.z = lerp(-12, 0, ce) * D2R;
    var bo = cl(c / .15); if (t > 1.7 && t < 2.3 && Math.floor((t - 1.7) / .15) % 2 === 0) bo = .2; brMat.opacity = bo * hudA;
    if (acq) { acq.opacity = (t >= .8 && t < 1.8 && Math.floor((t - .8) / .1) % 2 === 0) ? hudA : 0; lck.opacity = t >= 1.8 ? hudA : 0; rng.opacity = p(t, 1, .3) * hudA; }
    gridEl.style.opacity = (.07 * p(t, 0, 1.2) * hudA).toFixed(3);
    var g = p(t, 3.5, 1.2); glint.intensity = g > 0 && g < 1 ? Math.sin(g * Math.PI) * 2.2 : 0; glint.position.set(lerp(-9, 9, eInOut(g)), lerp(3, -1, g), 3);
    var a = eInOut(p(t, 0, 2.4)), b = eInOut(p(t, 2.4, 3.2));
    var yaw = (t < 2.4 ? lerp(38, 14, a) : lerp(14, -10, b)) * D2R, pitch = (t < 2.4 ? lerp(14, 6, a) : 6) * D2R;
    var r = dist * (t < 2.4 ? lerp(1.25, 1.04, a) : lerp(1.04, 1, b));
    camera.position.set(r * Math.sin(yaw) * Math.cos(pitch), r * Math.sin(pitch), r * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  window.__adkRenderAt = renderAt; /* used by automated checks */

  var start = 0;
  function loop(now) {
    if (!running) return;
    var t = (now - start) / 1000;
    renderAt(Math.min(t, DUR));
    if (t < DUR + HOLD) requestAnimationFrame(loop); else finish();
  }
  function play() { running = true; start = performance.now(); requestAnimationFrame(loop); }

  var fontReady = Promise.race([
    document.fonts && document.fonts.load ? document.fonts.load('48px "Share Tech Mono"') : Promise.resolve(),
    new Promise(function (r) { setTimeout(r, 1200); })
  ]);
  fontReady.then(function () {
    acq = label('ACQUISIZIONE', 34, 105, -62, 'left');
    lck = label('BERSAGLIO AGGANCIATO', 34, 105, -62, 'left');
    rng = label('ADK-01', 28, 1154, 955, 'right');
    if (!finished && !window.__adkManual) play();
  });
})();
