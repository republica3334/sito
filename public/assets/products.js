/* ALPHADEK Instruments — pagina prodotti.
   Ologrammi 3D wireframe (Three.js locale), etichette agganciate ai componenti,
   telemetria animata (contatori, barre corazza) e riga di "avvio di bordo". */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var HUD = (getComputedStyle(root).getPropertyValue('--hud') || '').trim() || '#8fe388';
  var AMBER = (getComputedStyle(root).getPropertyValue('--amber') || '').trim() || '#e0a526';

  /* ── Quando un elemento entra nello schermo ── */
  function onVisible(el, cb, threshold) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  }

  /* ── Riga di avvio scritta a macchina ── */
  document.querySelectorAll('[data-type]').forEach(function (el) {
    var txt = el.getAttribute('data-type'), i = 0;
    if (reduce) { el.textContent = txt; return; }
    el.textContent = '';
    el.classList.add('typing');
    onVisible(el, function () {
      var iv = setInterval(function () {
        el.textContent = txt.slice(0, ++i);
        if (i >= txt.length) { clearInterval(iv); el.classList.remove('typing'); el.classList.add('typed'); }
      }, 42);
    }, 0.6);
  });

  /* ── Contatori ── */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (reduce || !isFinite(to)) { el.textContent = el.getAttribute('data-count'); return; }
    el.textContent = '0';
    onVisible(el, function () {
      var t0 = performance.now(), dur = 1400;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e).toString();
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  });

  /* ── Barre della corazza ── */
  document.querySelectorAll('.px-armor').forEach(function (box) {
    var bars = box.querySelectorAll('[data-v]');
    function fill() {
      bars.forEach(function (b, i) {
        var v = parseFloat(b.getAttribute('data-v')), max = parseFloat(b.getAttribute('data-max')) || 1;
        setTimeout(function () { b.style.width = Math.round(v / max * 100) + '%'; }, reduce ? 0 : i * 90);
      });
    }
    if (reduce) fill(); else onVisible(box, fill);
  });

  /* ── Ologrammi ── */
  var T = window.THREE;
  var stages = document.querySelectorAll('.px-stage');
  if (!T || !T.WebGLRenderer) { stages.forEach(function (s) { s.classList.add('px-nogl'); }); return; }

  var MODELS = {
    behemoth: function (g, part) {
      /* scafo (profilo laterale estruso) */
      part(side([[-6.4, .7], [-6.4, 2.3], [4.4, 2.3], [6.6, 1.4], [6.6, 1], [5.6, .3], [-5.8, .3]], 4.6));
      /* cingoli e ruote */
      [-2.8, 2.8].forEach(function (z) {
        part(new T.BoxGeometry(13.2, 1.5, 1), [0, .85, z]);
        for (var i = 0; i < 9; i++) part(wheel(.5, .5), [-5.6 + i * 1.4, .6, z * 1.16]);
        part(wheel(.65, .5), [6.2, 1.05, z * 1.16]); part(wheel(.65, .5), [-6.3, 1.05, z * 1.16]);
      });
      /* griglie vano motori (2 generatori V12) */
      for (var k = 0; k < 5; k++) part(new T.BoxGeometry(.18, .08, 3.2), [-6 + k * .5, 2.34, 0]);
      /* torretta */
      part(side([[-3.4, 0], [-3.4, 1.5], [1.2, 1.5], [3, .7], [3, 0]], 3.8), [-.6, 2.3, 0]);
      /* cannone ETC 185 mm: mantelletto, canna, manicotti, freno di bocca */
      part(new T.BoxGeometry(1, 1.1, 1.5), [2.6, 3.1, 0]);
      part(barrel(.24, 9.5), [7.15, 3.15, 0]);
      [4.5, 6.6, 8.7].forEach(function (x) { part(barrel(.31, .5), [x, 3.15, 0]); });
      part(barrel(.38, .9), [11.5, 3.15, 0]);
      /* 2 torrette AA da 40 mm con canne binate */
      [-1.3, 1.3].forEach(function (z) {
        part(new T.BoxGeometry(1.1, .6, 1), [-2.8, 4.1, z]);
        part(barrel(.06, 1.8), [-1.4, 4.15, z - .16]); part(barrel(.06, 1.8), [-1.4, 4.15, z + .16]);
      });
      /* 4 pannelli radar AESA sui fianchi della torretta */
      [-1.5, .8].forEach(function (x) { [-1, 1].forEach(function (s) { part(new T.BoxGeometry(1.2, .9, .08), [x, 3.1, s * 1.95]); }); });
      /* 6 torrette APS laser */
      [[5, 2.2], [0, 2.4], [-5.8, 2.2]].forEach(function (p) {
        [-1, 1].forEach(function (s) {
          part(new T.CylinderGeometry(.32, .38, .3, 12), [p[0], 2.45, s * p[1]]);
          part(new T.SphereGeometry(.3, 10, 6), [p[0], 2.75, s * p[1]]);
        });
      });
      return {
        center: [2.7, 2, 0],
        anchors: { gun: [11.9, 3.15, 0], aps: [5, 2.85, 2.2], aa: [-2.8, 4.45, 1.3], radar: [.8, 3.1, 1.99], engine: [-5, 2.4, 0], tracks: [3.5, .55, 3.3] }
      };
    },
    ghepard: function (g, part) {
      part(side([[-3.2, .35], [-3.2, 1.05], [1.4, 1.15], [3.3, .65], [3.3, .45], [2.8, .15], [-2.9, .15]], 2.2));
      [-1.35, 1.35].forEach(function (z) {
        part(new T.BoxGeometry(6.8, .8, .55), [0, .45, z]);
        for (var i = 0; i < 5; i++) part(wheel(.3, .3), [-2.6 + i * 1.3, .32, z * 1.18]);
      });
      /* torretta bassa senza portelli: nessun equipaggio */
      part(side([[-1.2, 0], [-1.2, .45], [.6, .5], [1.4, .2], [1.4, 0]], 1.5), [-.4, 1.1, 0]);
      part(barrel(.08, 3.4), [2.7, 1.35, 0]);
      part(barrel(.12, .4), [4.2, 1.35, 0]);
      /* albero sensori dell'IA */
      part(new T.CylinderGeometry(.04, .04, .7, 6), [-1.2, 1.9, 0]);
      part(new T.SphereGeometry(.16, 12, 8), [-1.2, 2.3, 0]);
      /* sensori frontali e antenne */
      [-.9, .9].forEach(function (z) { part(new T.SphereGeometry(.12, 8, 6), [3.1, .7, z]); });
      [-.7, .7].forEach(function (z) { part(new T.CylinderGeometry(.015, .015, 1.4, 4), [-2.9, 1.7, z]); });
      return {
        center: [.55, .9, 0],
        anchors: { ai: [-1.2, 2.3, 0], hull: [1.4, 1.15, 1.1], tracks: [-.6, .35, 1.65], gun: [4.4, 1.35, 0] }
      };
    }
  };

  function side(pts, depth) {
    var s = new T.Shape();
    pts.forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
    s.closePath();
    var geo = new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }
  function wheel(r, w) { var c = new T.CylinderGeometry(r, r, w, 16); c.rotateX(Math.PI / 2); return c; }
  function barrel(r, len) { var c = new T.CylinderGeometry(r, r, len, 12); c.rotateZ(-Math.PI / 2); return c; }

  stages.forEach(function (stage) { try { buildStage(stage); } catch (e) { stage.classList.add('px-nogl'); } });

  function buildStage(stage) {
    var canvas = stage.querySelector('canvas');
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, .1, 400);
    var hud = new T.Color(HUD), amber = new T.Color(AMBER);
    var group = new T.Group(); scene.add(group);

    var faceMat = new T.MeshBasicMaterial({ color: hud, transparent: true, opacity: .07, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
    var edgeMat = new T.LineBasicMaterial({ color: hud, transparent: true, opacity: .85 });
    function part(geo, pos) {
      var m = new T.Mesh(geo, faceMat);
      var e = new T.LineSegments(new T.EdgesGeometry(geo, 25), edgeMat);
      if (pos) { m.position.set(pos[0], pos[1], pos[2]); e.position.copy(m.position); }
      group.add(m); group.add(e);
    }
    var info = MODELS[stage.getAttribute('data-model')](group, part);
    group.position.set(-info.center[0], 0, -info.center[2]);

    /* misura il modello per inquadrarlo */
    var min = new T.Vector3(1e9, 1e9, 1e9), max = new T.Vector3(-1e9, -1e9, -1e9);
    group.children.forEach(function (c) {
      if (!c.geometry) return; c.geometry.computeBoundingBox();
      var b = c.geometry.boundingBox;
      min.min(new T.Vector3().copy(b.min).add(c.position)); max.max(new T.Vector3().copy(b.max).add(c.position));
    });
    var size = new T.Vector3().subVectors(max, min), radius = Math.sqrt(size.x * size.x + size.z * size.z) / 2;
    var targetY = info.center[1];

    /* pavimento: anelli radar, tacche e griglia */
    var floor = new T.Group(); scene.add(floor);
    var lineMat = new T.LineBasicMaterial({ color: hud, transparent: true, opacity: .22 });
    [0.5, 0.75, 1].forEach(function (k) {
      var pts = [], r = radius * k;
      for (var i = 0; i < 96; i++) { var a = i / 96 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      floor.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), lineMat));
    });
    var ticks = [];
    for (var i = 0; i < 72; i++) {
      var a = i / 72 * Math.PI * 2, r1 = radius * 1.03, r2 = radius * (i % 6 ? 1.07 : 1.12);
      ticks.push(new T.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1), new T.Vector3(Math.cos(a) * r2, 0, Math.sin(a) * r2));
    }
    floor.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(ticks), lineMat));
    var gridPts = [], G = radius * .9, step = radius / 6;
    for (var x = -G; x <= G + .001; x += step) { gridPts.push(new T.Vector3(x, 0, -G), new T.Vector3(x, 0, G), new T.Vector3(-G, 0, x), new T.Vector3(G, 0, x)); }
    var grid = new T.LineSegments(new T.BufferGeometry().setFromPoints(gridPts), new T.LineBasicMaterial({ color: hud, transparent: true, opacity: .07 }));
    floor.add(grid);

    /* fascio di scansione che attraversa il mezzo */
    var scanGeo = new T.PlaneGeometry(size.z * 1.3, size.y * 1.4); scanGeo.rotateY(Math.PI / 2);
    var scan = new T.Mesh(scanGeo, new T.MeshBasicMaterial({ color: hud, transparent: true, opacity: .1, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    var scanEdge = new T.LineSegments(new T.EdgesGeometry(scanGeo), new T.LineBasicMaterial({ color: hud, transparent: true, opacity: .55 }));
    scan.add(scanEdge); scan.position.y = size.y * .55; scene.add(scan);

    /* particelle */
    var N = 140, pp = new Float32Array(N * 3), speed = [];
    for (var j = 0; j < N; j++) {
      pp[j * 3] = (Math.random() - .5) * radius * 2; pp[j * 3 + 1] = Math.random() * size.y * 1.6; pp[j * 3 + 2] = (Math.random() - .5) * radius * 2; speed.push(.15 + Math.random() * .35);
    }
    var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pp, 3));
    var dots = new T.Points(pg, new T.PointsMaterial({ color: hud, size: radius * .012, transparent: true, opacity: .5, depthWrite: false }));
    scene.add(dots);

    /* punti d'aggancio delle etichette (ambra) */
    var anchorPts = [], anchors = {};
    Object.keys(info.anchors).forEach(function (k) {
      var p = info.anchors[k]; anchors[k] = new T.Vector3(p[0], p[1], p[2]); anchorPts.push(anchors[k]);
    });

    var NS = 'http://www.w3.org/2000/svg', box = stage.querySelector('.px-callouts');
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'px-lines'); box.insertBefore(svg, box.firstChild);
    var callouts = [].map.call(stage.querySelectorAll('.px-callout'), function (el) {
      var path = document.createElementNS(NS, 'path'), dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '3.5'); svg.appendChild(path); svg.appendChild(dot);
      return { el: el, key: el.getAttribute('data-anchor'), path: path, dot: dot, w: 0, h: 0 };
    });
    function measure() { callouts.forEach(function (c) { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; }); }
    var azEl = stage.querySelector('[data-az]');

    /* camera orbitale: rotazione automatica + trascinamento */
    var yaw = .7, pitch = .32, dragging = false, lastX = 0, lastY = 0, lastMove = 0;
    stage.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * .008; pitch = Math.max(.08, Math.min(.85, pitch + (e.clientY - lastY) * .005));
      lastX = e.clientX; lastY = e.clientY; lastMove = performance.now(); if (!running) draw(0);
    });
    function endDrag() { dragging = false; stage.classList.remove('dragging'); }
    stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);

    var W = 1, H = 1, dist = 10;
    function resize() {
      W = stage.clientWidth || 1; H = stage.clientHeight || 1;
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
      var tanH = Math.tan(camera.fov * Math.PI / 360);
      var fitW = radius * 1.9 / (2 * tanH * camera.aspect), fitH = size.y * 2.1 / (2 * tanH);
      dist = Math.max(fitW, fitH);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
      measure();
      if (!running) draw(0);
    }

    var v = new T.Vector3();
    function draw(dt, t) {
      if (!dragging && !reduce && performance.now() - lastMove > 1500) yaw += dt * .25;
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, targetY + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, targetY, 0);
      if (t !== undefined) {
        var span = size.x * .62, ph = (t * .18) % 1;
        scan.position.x = -span + ph * span * 2; scan.material.opacity = .1 * Math.sin(ph * Math.PI); scanEdge.material.opacity = .55 * Math.sin(ph * Math.PI);
        floor.rotation.y = t * .05;
        var arr = pg.attributes.position.array;
        for (var j = 0; j < N; j++) { arr[j * 3 + 1] += speed[j] * dt; if (arr[j * 3 + 1] > size.y * 1.6) arr[j * 3 + 1] = 0; }
        pg.attributes.position.needsUpdate = true;
        edgeMat.opacity = .78 + Math.sin(t * 6) * .04 + (Math.random() < .01 ? -.4 : 0); /* sfarfallio da ologramma */
      }
      renderer.render(scene, camera);
      group.updateMatrixWorld();
      layoutCallouts();
      if (azEl) { var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360; azEl.textContent = 'AZ ' + ('00' + Math.round(deg)).slice(-3) + '°'; }
    }

    var PAD = W < 520 ? 10 : 18, TOP = 46, BOTTOM = 46;
    function layoutCallouts() {
      if (!callouts.length) return;
      if (!callouts[0].w) measure();
      PAD = W < 520 ? 10 : 18;
      var sides = { l: [], r: [] };
      callouts.forEach(function (c) {
        var a = anchors[c.key]; if (!a) return;
        v.copy(a).applyMatrix4(group.matrixWorld).project(camera);
        c.ax = (v.x + 1) / 2 * W; c.ay = (1 - v.y) / 2 * H; c.off = v.z > 1;
        (c.ax < W / 2 ? sides.l : sides.r).push(c);
      });
      ['l', 'r'].forEach(function (k) {
        var list = sides[k].sort(function (a, b) { return a.ay - b.ay; }), gap = 8, y = TOP;
        list.forEach(function (c) { c.ly = Math.max(c.ay - c.h / 2, y); y = c.ly + c.h + gap; });
        /* seconda passata dal basso: tutto dentro il riquadro */
        var lim = H - BOTTOM;
        for (var i = list.length - 1; i >= 0; i--) { var c = list[i]; c.ly = Math.min(c.ly, lim - c.h); lim = c.ly - gap; }
        list.forEach(function (c) {
          c.lx = k === 'l' ? PAD : W - PAD - c.w;
          var ex = k === 'l' ? c.lx + c.w : c.lx, ey = c.ly + c.h / 2, kx = ex + (k === 'l' ? 16 : -16);
          c.el.style.transform = 'translate(' + c.lx.toFixed(1) + 'px,' + c.ly.toFixed(1) + 'px)';
          c.el.classList.toggle('right', k === 'r'); c.el.classList.toggle('hidden', c.off);
          c.path.setAttribute('d', 'M' + c.ax.toFixed(1) + ' ' + c.ay.toFixed(1) + 'L' + kx.toFixed(1) + ' ' + ey.toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
          c.dot.setAttribute('cx', c.ax.toFixed(1)); c.dot.setAttribute('cy', c.ay.toFixed(1));
          c.path.setAttribute('visibility', c.off ? 'hidden' : 'visible'); c.dot.setAttribute('visibility', c.off ? 'hidden' : 'visible');
        });
      });
    }

    var running = false, prev = 0, t = 0, visible = false;
    function loop(now) {
      if (!running) return;
      var dt = Math.min(.05, (now - prev) / 1000); prev = now; t += dt;
      draw(dt, t);
      requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; prev = performance.now(); requestAnimationFrame(loop); }
    function stop() { running = false; }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);
    resize(); draw(0, 0);
    stage.classList.add('px-ready');

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); else stop(); }); }, { threshold: .05 }).observe(stage);
    } else start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    window['__pxRender_' + stage.getAttribute('data-model')] = function (time, yawAt) { yaw = yawAt; draw(0, time); }; /* controlli automatici */
  }
})();
