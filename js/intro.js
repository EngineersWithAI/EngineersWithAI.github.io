/* Opening scene. A siege at dusk, drawn live with three.js: an army in the field (ranks of infantry,
   archers, horse, onagers and ballistae), four great counterweight trebuchets of the project's 1187
   design built on the pattern of the Les Baux reconstruction (squared timber A-frames, long raking
   struts, a planked rounded chest on long hangers, a tapered beam with a rope-wrapped tip), a layered,
   battered castle on the rise with a breach, a broken tower and fires inside, and the defenders
   answering with fire and arrows. Everything waits until the visitor clicks the big machine; then the
   crew fires it on the model's real throw (run P7-R12: beam, hangers, chest and sling follow the
   frames), the camera watches the whole launch, follows the fireball from the camp and swings in
   beside it like a drone, then whips across to a bowman on the front tower: he looses an arrow,
   glances up, and the ball takes him and the camera. Black, the title, the page.

   All textures are painted onto canvases at start (wood grain, stone, cloth, grass, clouds, flame,
   the burning stone); nothing is downloaded beyond the three.js library the Proving Ground uses.
   The other three machines, the onagers and the ballistae fire on their own cycles while the scene
   idles; their flights, like the hero's, are staged for the picture. Plays on every visit, is
   skippable (button or Esc), and index.html?nointro goes straight to the page. Set ENABLED to false,
   or remove the intro block and the script line in index.html, and the site is exactly as it was.
   Switches: SLOWMO (the slow-motion beat at the top of the flight) and WALL_ENDING (the earlier
   ending, the ball striking the outer wall) are kept but off; the bowman's ending is the one used. */
(function () {
  'use strict';
  const ENABLED = true, SLOWMO = false, WALL_ENDING = false;
  const ov = document.getElementById('intro');
  if (!ov) return;
  const bail = () => { ov.remove(); document.documentElement.classList.remove('intro-on'); };
  const off = /[?&#]nointro\b/.test(location.search + location.hash);
  if (!ENABLED || off || !window.TREB_THROWS || !window.TREB_THROWS.jerusalem1187) { bail(); return; }
  document.documentElement.classList.add('intro-on');

  const canvas = ov.querySelector('canvas'), flash = ov.querySelector('.intro-flash'), skip = ov.querySelector('.intro-skip'), word = ov.querySelector('.intro-word'), title = ov.querySelector('.intro-title'), hint = ov.querySelector('.intro-hint');
  let state = 'loading', raf = 0, renderer = null;

  // ---------------------------------------------------------------- ending
  function dispose() { if (renderer) try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) {} }
  function end(fast, delay) {
    if (state === 'ending') return; state = 'ending';
    skip.hidden = true; if (hint) hint.classList.remove('show');
    const out = () => { ov.classList.add('intro-out'); setTimeout(() => { bail(); dispose(); }, 1800); };
    if (fast) { cancelAnimationFrame(raf); out(); return; }
    const d = delay || 0;
    setTimeout(() => flash.classList.add('white'), d);
    setTimeout(() => flash.classList.add('black'), d + 120);
    setTimeout(() => { cancelAnimationFrame(raf); title.classList.add('in'); }, d + 1300);
    setTimeout(() => title.classList.remove('in'), d + 3900);
    setTimeout(out, d + 5000);
  }
  skip.addEventListener('click', () => end(true));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state !== 'ending') end(true); });
  const guard = setTimeout(() => { if (state === 'loading') end(true); }, 15000);

  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
  (window.THREE ? Promise.resolve() : load('lib/three.min.js')).then(() => { try { run(); } catch (e) { console.error(e); end(true); } }).catch(() => end(true));

  // ---------------------------------------------------------------- helpers
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const ease = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  const easeOut = (u) => { u = clamp(u, 0, 1); return 1 - Math.pow(1 - u, 3); };
  function noiseCanvas(w, h, scale, octaves, seed) { // value noise painted into a canvas
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    const grid = 64, R = []; let s = seed || 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < grid * grid; i++) R.push(rnd());
    const val = (x, y) => { const xi = Math.floor(x) % grid, yi = Math.floor(y) % grid, fx = x - Math.floor(x), fy = y - Math.floor(y); const a = R[yi * grid + xi], b = R[yi * grid + (xi + 1) % grid], c2 = R[((yi + 1) % grid) * grid + xi], d2 = R[((yi + 1) % grid) * grid + (xi + 1) % grid]; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const top = a + (b - a) * sx; return top + ((c2 + (d2 - c2) * sx) - top) * sy; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0, amp = 1, f = scale, tot = 0; for (let o = 0; o < octaves; o++) { v += amp * val(x / w * grid * f, y / h * grid * f); tot += amp; amp *= 0.5; f *= 2; } v /= tot; const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.round(v * 255); d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  }
  // frame interpolation on the model's throw (same as the Proving Ground's view)
  function frameAt(F, t) {
    if (t <= F[0].t) return F[0];
    if (t >= F[F.length - 1].t) return F[F.length - 1];
    let lo = 0, hi = F.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F[mid].t <= t) lo = mid; else hi = mid; }
    const a = F[lo], b = F[hi], f = (t - a.t) / Math.max(1e-9, b.t - a.t), L = (u, v) => u + (v - u) * f, P2 = (u, v) => (u && v ? [L(u[0], v[0]), L(u[1], v[1])] : (u || v));
    return { t, phase: a.phase, th: L(a.th, b.th), ps: L(a.ps, b.ps), ph: L(a.ph, b.ph), x: L(a.x, b.x), P: P2(a.P, b.P), S: P2(a.S, b.S), K: P2(a.K, b.K), C: P2(a.C, b.C), p: (a.p && b.p) ? P2(a.p, b.p) : null };
  }

  // ---------------------------------------------------------------- the scene
  function run() {
    if (state !== 'loading') return;
    const DBG0 = /[?&#]introdbg\b/.test(location.search + location.hash); const stage = (n) => { if (DBG0) document.title = 'stage ' + n + ' ' + Math.round(performance.now()); };
    stage(0);
    const T = window.THREE, D = window.TREB_THROWS.jerusalem1187;
    const mc = D.machine, res = D.result, frames = D.frames;
    const tRel = res.t_release, tLast = frames[frames.length - 1].t, fr0 = frames[0], frEnd = frames[frames.length - 1];
    const H = mc.H, bw = 0.42 * H, zf = 1.55, SCALE = 1.9; // model units; the machines are drawn at SCALE
    const V = (x, y, z) => new T.Vector3(x, y, z);

    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
    const LOWFX = /[?&#]lowfx\b/.test(location.search + location.hash);
    renderer.shadowMap.enabled = !LOWFX; renderer.shadowMap.type = T.PCFShadowMap;
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(42, 1, 0.12, 5000);
    if (DBG0) { // where does the first frame go? count and time the GL calls that can stall
      const gl = renderer.getContext(); const acc = { link: 0, linkMs: 0, tex: 0, texMs: 0, buf: 0, bufMs: 0, draw: 0, drawMs: 0, get: 0, getMs: 0 };
      const wrap = (name, key) => { const f = gl[name]; gl[name] = function () { const t0 = performance.now(); const r = f.apply(gl, arguments); acc[key]++; acc[key + 'Ms'] += performance.now() - t0; return r; }; };
      wrap('linkProgram', 'link'); wrap('texImage2D', 'tex'); wrap('bufferData', 'buf'); wrap('drawElements', 'draw'); wrap('drawArrays', 'draw'); wrap('drawElementsInstanced', 'draw'); wrap('drawArraysInstanced', 'draw'); wrap('getProgramParameter', 'get'); wrap('getShaderParameter', 'get'); wrap('getError', 'get');
      let lastT = 0; const report = () => { document.title = Object.keys(acc).filter((k) => !/Ms$/.test(k)).map((k) => k + acc[k] + '/' + Math.round(acc[k + 'Ms'])).join(' ') + ' @' + Math.round(performance.now()); };
      ['linkProgram', 'texImage2D', 'bufferData', 'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'].forEach((name) => { const f = gl[name]; gl[name] = function () { const r = f.apply(gl, arguments); if (performance.now() - lastT > 250) { lastT = performance.now(); report(); } return r; }; });
      window.trebIntroGl = report; }

    // ---- light: the last of the day behind the castle, a cold sky, warm fires
    const SKY_TOP = new T.Color(0x0f1620), SKY_MID = new T.Color(0x2f3a46), SKY_HOR = new T.Color(0x7d5f4b), FOG = 0x3f4852;
    scene.background = SKY_MID.clone();
    scene.fog = new T.FogExp2(FOG, 0.0017);
    scene.add(new T.HemisphereLight(0x6b7b90, 0x22251e, 0.34));
    const sun = new T.DirectionalLight(0xd9a877, 0.4); sun.position.set(420, 110, -300); scene.add(sun);
    sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.near = 50; sun.shadow.camera.far = 900; sun.shadow.camera.left = -150; sun.shadow.camera.right = 150; sun.shadow.camera.top = 130; sun.shadow.camera.bottom = -130; sun.shadow.bias = -0.0008; sun.target.position.set(20, 0, 0); scene.add(sun.target);
    const fill = new T.DirectionalLight(0x5a6c85, 0.14); fill.position.set(-200, 160, 240); scene.add(fill);

    // ---- painted textures
    const tex = (c, rx, ry) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t; };
    function woodCanvas() {
      const w = 256, h = 1024, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const n = noiseCanvas(w, h, 2, 4, 11).getContext('2d').getImageData(0, 0, w, h).data;
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const nv = n[i] / 255; const grain = 0.5 + 0.5 * Math.sin((x * 0.9 + nv * 40 + Math.sin(y * 0.02) * 6) * 0.35); const v = 0.68 + 0.32 * grain * (0.7 + 0.3 * nv); d[i] = Math.round(122 * v); d[i + 1] = Math.round(88 * v); d[i + 2] = Math.round(52 * v); d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      for (let k = 0; k < 7; k++) { const x = rand(20, w - 20), y = rand(0, h); g.strokeStyle = 'rgba(40,24,10,0.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, rand(4, 9), rand(10, 24), 0, 0, Math.PI * 2); g.stroke(); }
      return c;
    }
    function plankCanvas() { // planking across the grain: boards with dark seams, for chests and decks
      const w = 256, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const n = noiseCanvas(w, h, 3, 3, 17).getContext('2d').getImageData(0, 0, w, h).data;
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const nv = n[i] / 255; const board = Math.floor(y / 32); const seam = (y % 32) < 2 ? 0.45 : 1; const grain = 0.75 + 0.25 * Math.sin(x * 0.25 + board * 3 + nv * 9); const v = seam * (0.62 + 0.38 * grain) * (0.82 + 0.25 * nv); d[i] = Math.round(118 * v); d[i + 1] = Math.round(84 * v); d[i + 2] = Math.round(50 * v); d[i + 3] = 255; }
      g.putImageData(img, 0, 0); return c;
    }
    function stoneCanvas(worn) {
      const w = 512, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.fillStyle = '#4b4b48'; g.fillRect(0, 0, w, h);
      const n = noiseCanvas(w, h, 3, 4, 23).getContext('2d').getImageData(0, 0, w, h).data;
      const bh = 30; let row = 0;
      for (let y = 0; y < h; y += bh, row++) { const off = (row % 2) * 44; for (let x = -off; x < w; x += 88) { const i = ((Math.min(h - 1, y + 8)) * w + clamp(x + 10, 0, w - 1)) * 4; const t = 0.8 + 0.24 * (n[i] / 255); const bl = Math.round(128 * t), gr = Math.round(124 * t), bb = Math.round(116 * t); g.fillStyle = 'rgb(' + bl + ',' + gr + ',' + bb + ')'; const miss = worn && Math.random() < 0.05; g.fillRect(x + 2, y + 2, 84, bh - 4); if (miss) { g.fillStyle = '#383836'; g.fillRect(x + 2, y + 2, 84, bh - 4); } } }
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const nv = 0.86 + 0.28 * (n[i] / 255); d[i] *= nv; d[i + 1] *= nv; d[i + 2] *= nv; }
      g.putImageData(img, 0, 0);
      if (worn) { for (let k = 0; k < 16; k++) { const x = rand(0, w); const gr2 = g.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, 'rgba(20,22,24,0.0)'); gr2.addColorStop(0.3, 'rgba(20,22,24,' + rand(0.15, 0.4) + ')'); gr2.addColorStop(1, 'rgba(10,12,14,0.5)'); g.fillStyle = gr2; g.fillRect(x, 0, rand(6, 26), h); } for (let k = 0; k < 28; k++) { g.fillStyle = 'rgba(60,74,48,' + rand(0.15, 0.4) + ')'; g.beginPath(); g.ellipse(rand(0, w), rand(h * 0.5, h), rand(8, 30), rand(4, 12), 0, 0, Math.PI * 2); g.fill(); } for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(12,10,8,' + rand(0.2, 0.45) + ')'; g.beginPath(); g.ellipse(rand(0, w), rand(0, h * 0.6), rand(20, 60), rand(30, 90), 0, 0, Math.PI * 2); g.fill(); } }
      return c;
    }
    function groundCanvas() {
      const w = 512, h = 512, c = noiseCanvas(w, h, 2, 5, 5); const g = c.getContext('2d'); const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255; const dry = Math.pow(v, 1.6); d[i] = Math.round(38 + 66 * dry); d[i + 1] = Math.round(46 + 60 * dry); d[i + 2] = Math.round(26 + 36 * dry); }
      g.putImageData(img, 0, 0); return c;
    }
    function clothCanvas(r, gg, b) {
      const w = 128, h = 128, c = noiseCanvas(w, h, 6, 3, 31); const g = c.getContext('2d'); const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = 0.78 + 0.28 * (d[i] / 255); d[i] = r * v; d[i + 1] = gg * v; d[i + 2] = b * v; }
      g.putImageData(img, 0, 0); return c;
    }
    function cloudCanvas() {
      const w = 1024, h = 1024, c = noiseCanvas(w, h, 1.5, 6, 41); const g = c.getContext('2d'); const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255; const a = clamp((v - 0.52) * 2.6, 0, 1); d[i] = 52; d[i + 1] = 58; d[i + 2] = 68; d[i + 3] = Math.round(255 * a * 0.85); }
      g.putImageData(img, 0, 0); return c;
    }
    function lavaCanvas() { // the burning stone: charred rock with a web of glowing cracks. Returns [colour, emissive]
      const w = 256, h = 256, a = document.createElement('canvas'), b = document.createElement('canvas'); a.width = b.width = w; a.height = b.height = h;
      const ga = a.getContext('2d'), gb = b.getContext('2d');
      const n1 = noiseCanvas(w, h, 2.5, 4, 53).getContext('2d').getImageData(0, 0, w, h).data, n2 = noiseCanvas(w, h, 5, 3, 67).getContext('2d').getImageData(0, 0, w, h).data;
      const ia = ga.createImageData(w, h), da = ia.data, ib = gb.createImageData(w, h), db = ib.data;
      for (let i = 0; i < da.length; i += 4) { const v = n1[i] / 255, v2 = n2[i] / 255; const crack = clamp(1 - Math.abs(v - 0.5) / 0.045, 0, 1); const hot = Math.pow(crack, 1.4) * (0.55 + 0.45 * v2); const rock = 0.16 + 0.22 * v2; da[i] = Math.round(255 * (rock * 0.9 + hot * 0.7)); da[i + 1] = Math.round(255 * (rock * 0.8 + hot * 0.3)); da[i + 2] = Math.round(255 * (rock * 0.7 + hot * 0.05)); da[i + 3] = 255; db[i] = Math.round(255 * Math.min(1, hot * 1.3)); db[i + 1] = Math.round(255 * hot * 0.55); db[i + 2] = Math.round(255 * hot * 0.1); db[i + 3] = 255; }
      ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0); return [a, b];
    }
    function glowCanvas(inner, mid, outer) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(0.3, mid); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; }
    function flameCanvas() { const c = document.createElement('canvas'); c.width = 128; c.height = 192; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 130, 4, 64, 110, 90); r.addColorStop(0, 'rgba(255,250,210,1)'); r.addColorStop(0.25, 'rgba(255,190,80,0.95)'); r.addColorStop(0.55, 'rgba(240,90,20,0.55)'); r.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(64, 0); g.bezierCurveTo(110, 70, 120, 150, 64, 190); g.bezierCurveTo(8, 150, 18, 70, 64, 0); g.fill(); return c; }
    const woodTex = tex(woodCanvas(), 1, 1), plankTex = tex(plankCanvas(), 1, 1), stoneTexA = tex(stoneCanvas(true), 1, 1), groundTex = tex(groundCanvas(), 110, 70);
    const lava = lavaCanvas(); const lavaTex = tex(lava[0], 2, 1), lavaEm = tex(lava[1], 2, 1);
    const glowTex = new T.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,200,110,0.85)', 'rgba(255,90,0,0)'));
    const whiteGlowTex = new T.CanvasTexture(glowCanvas('rgba(255,255,255,0.9)', 'rgba(230,236,255,0.35)', 'rgba(200,210,255,0)'));
    const emberTex = new T.CanvasTexture(glowCanvas('rgba(255,240,200,1)', 'rgba(255,140,40,0.8)', 'rgba(255,60,0,0)'));
    const smokeTex = new T.CanvasTexture(glowCanvas('rgba(40,40,44,0.75)', 'rgba(48,48,52,0.4)', 'rgba(60,60,64,0)'));
    const dustTex = new T.CanvasTexture(glowCanvas('rgba(150,135,112,0.85)', 'rgba(125,112,95,0.45)', 'rgba(100,90,80,0)'));
    const flameTex = new T.CanvasTexture(flameCanvas());
    const woodMat = new T.MeshStandardMaterial({ map: woodTex, color: 0xcdb08a, roughness: 0.86, metalness: 0 });
    const woodDark = new T.MeshStandardMaterial({ map: woodTex, color: 0x8a7050, roughness: 0.92, metalness: 0 });
    const woodGrey = new T.MeshStandardMaterial({ map: woodTex, color: 0x6a5e50, roughness: 0.95, metalness: 0 });
    const plankMat = new T.MeshStandardMaterial({ map: plankTex, color: 0xb59a78, roughness: 0.9, metalness: 0 });
    const ironMat = new T.MeshStandardMaterial({ color: 0x35373a, roughness: 0.5, metalness: 0.75 });
    const ropeMat = new T.MeshStandardMaterial({ color: 0xa08c6a, roughness: 1 });
    const lin = (hex) => new T.Color(hex).convertSRGBToLinear(); // plain colours are given as sRGB; the renderer wants them linear
    const skinMat = new T.MeshStandardMaterial({ color: lin(0x8e6d55), roughness: 0.85 });
    const stoneCache = {}; // one material (one texture upload) per repeat and tint: hundreds of merlons share a handful of materials
    const stoneMat = (rx, ry, tint) => { const k = rx.toFixed(2) + ':' + ry.toFixed(2) + ':' + (tint || 0); if (stoneCache[k]) return stoneCache[k]; const t = stoneTexA.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); t.offset.set(rand(0, 1), rand(0, 1)); return (stoneCache[k] = new T.MeshStandardMaterial({ map: t, color: tint || 0x8e8b86, roughness: 0.96, metalness: 0 })); };
    const clothMat = (r, g, b) => new T.MeshStandardMaterial({ map: tex(clothCanvas(r, g, b), 2, 2), roughness: 1, metalness: 0, side: T.DoubleSide });
    const sprite = (map, size, color, opacity, additive) => { const s = new T.Sprite(new T.SpriteMaterial({ map, color: color || 0xffffff, transparent: true, opacity: opacity == null ? 1 : opacity, blending: additive ? T.AdditiveBlending : T.NormalBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };
    const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const box = (w, h, d, mat) => shadowed(new T.Mesh(new T.BoxGeometry(w, h, d), mat));
    const UP = V(0, 1, 0);
    // a timber from a to b (Vector3): square section if sq, tapered r1 -> r2
    const unitG = {}; const unitGeo = (r1, r2, sq) => { const k = r1 + ':' + r2 + ':' + (sq ? 1 : 0); if (!unitG[k]) { const g = new T.CylinderGeometry(r1, r2, 1, sq ? 4 : 8); g.translate(0, 0.5, 0); if (sq) g.rotateY(Math.PI / 4); unitG[k] = g; } return unitG[k]; };
    function timber(a, b, r1, mat, r2, sq) { const m = shadowed(new T.Mesh(unitGeo(r1, r2 == null ? r1 : r2, sq !== false), mat)); m.userData.r = r1; place(m, a, b); return m; }
    function place(m, a, b) { const d = new T.Vector3().subVectors(b, a); const len = d.length(); m.position.copy(a); m.scale.set(1, Math.max(0.001, len), 1); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
    function prismGeo(w, h, l) { // a ridge roof: triangle (w wide, h high) extruded along z by l
      const g = new T.BufferGeometry(); const x = w / 2, z = l / 2;
      const v = [ -x, 0, -z, x, 0, -z, 0, h, -z, -x, 0, z, x, 0, z, 0, h, z ];
      const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(idx); const uv = []; for (let i = 0; i < 6; i++) uv.push((i % 3) / 2, i < 3 ? 0 : 1); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
    }
    function ridgeRoof(w, l, h, mat) { return shadowed(new T.Mesh(prismGeo(w, h, l), mat)); }

    stage(1);
    // ---- sky: gradient dome, two drifting cloud decks, a low moon, faint stars
    const skyG = new T.SphereGeometry(2200, 32, 16); const sc = new Float32Array(skyG.attributes.position.count * 3);
    for (let i = 0; i < skyG.attributes.position.count; i++) { const y = skyG.attributes.position.getY(i) / 2200; let c; if (y < 0.02) c = SKY_HOR.clone(); else if (y < 0.2) c = SKY_HOR.clone().lerp(SKY_MID, smooth(y / 0.2)); else c = SKY_MID.clone().lerp(SKY_TOP, smooth((y - 0.2) / 0.6)); sc[3 * i] = c.r; sc[3 * i + 1] = c.g; sc[3 * i + 2] = c.b; }
    skyG.setAttribute('color', new T.BufferAttribute(sc, 3));
    scene.add(new T.Mesh(skyG, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })));
    const cloudTex = tex(cloudCanvas(), 1.4, 1.4);
    const clouds = new T.Mesh(new T.PlaneGeometry(7000, 7000), new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.5 })); clouds.rotation.x = Math.PI / 2; clouds.position.set(600, 820, 0); scene.add(clouds);
    const clouds2 = clouds.clone(); clouds2.material = clouds.material.clone(); clouds2.material.opacity = 0.28; clouds2.position.y = 980; clouds2.rotation.z = 0.7; scene.add(clouds2);
    const moon = sprite(new T.CanvasTexture(glowCanvas('rgba(245,240,225,1)', 'rgba(230,222,200,0.5)', 'rgba(200,200,210,0)')), 80, 0xffffff, 0.6, true); moon.position.set(1300, 380, -900); moon.material.fog = false; scene.add(moon);
    { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), e = rand(0.12, 1.3); pos[3 * i] = 2000 * Math.cos(e) * Math.cos(a); pos[3 * i + 1] = 2000 * Math.sin(e); pos[3 * i + 2] = 2000 * Math.cos(e) * Math.sin(a); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xd4dbe6, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.3, fog: false }))); }

    // ---- terrain: rolling ground, the rise to the castle, a ditch before the outer wall, a trampled camp and field
    const ditchX = 224;
    const hill = (x, z) => {
      const ramp = clamp((x - 40) / 196, 0, 1);                      // the hill the castle stands on: steepening toward the walls, level under them
      const near = smooth((x - 120) / 95);                           // the ground smooths out toward the walls
      let rough = 5 * Math.sin(x * 0.021 + 1) * Math.cos(z * 0.017) + 3 * Math.cos(z * 0.031 - x * 0.012) + 1.2 * Math.sin(x * 0.045 + 1) * Math.cos(z * 0.03) + 0.5 * Math.sin(x * 0.13 + z * 0.09) + 0.3 * Math.sin(z * 0.21);
      const camp = smooth((Math.max(Math.abs(x - 20) / 190, Math.abs(z) / 130) - 0.55) / 0.45); // flat and trampled where the armies stand
      rough *= (0.2 + 0.8 * camp) * (1 - 0.9 * near);
      let y = 24 * Math.pow(ramp, 1.5) + rough;
      y -= 4 * Math.exp(-Math.pow((x - ditchX) / 6.5, 2)) * (1 - smooth((Math.abs(z) - 170) / 30));
      return y;
    };
    const terrG = new T.PlaneGeometry(3200, 2200, 220, 150); terrG.rotateX(-Math.PI / 2);
    const patch = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.045 + 2 * Math.sin(z * 0.03)) * Math.cos(z * 0.05 + 2 * Math.sin(x * 0.027)); // slow patches of darker and lighter ground
    { const p = terrG.attributes.position, col = new Float32Array(p.count * 3), cg = new T.Color(), grass = new T.Color(0.24, 0.31, 0.16), dirt = new T.Color(0.34, 0.28, 0.19), dark = new T.Color(0.15, 0.2, 0.11);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 700, z = p.getZ(i); p.setX(i, x); const y = hill(x, z); p.setY(i, y - 0.05); const camp = Math.exp(-((x - 30) * (x - 30) + z * z) / 14000); const field = smooth((x - 30) / 40) * (1 - smooth((x - 205) / 25)) * (1 - smooth((Math.abs(z) - 110) / 30)); const n = patch(x, z); cg.copy(grass).lerp(dirt, clamp(0.75 * camp + 0.55 * field, 0, 1)).lerp(dark, 0.45 * (1 - n)); const rise = smooth((x - 70) / 150); cg.multiplyScalar((0.8 + 0.3 * n) * (1 - 0.22 * rise)); col[3 * i] = cg.r; col[3 * i + 1] = cg.g; col[3 * i + 2] = cg.b; }
      terrG.setAttribute('color', new T.BufferAttribute(col, 3)); terrG.computeVertexNormals(); }
    const terrain = new T.Mesh(terrG, new T.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 1, metalness: 0 })); terrain.receiveShadow = true; scene.add(terrain);
    const gy = (x, z) => hill(x, z);
    { const n = 70, ridge = new T.InstancedMesh(new T.ConeGeometry(1, 1, 10), new T.MeshStandardMaterial({ color: 0x3e4852, roughness: 1 }), n); const M = new T.Matrix4(), q = new T.Quaternion(), s3 = new T.Vector3(), e = new T.Euler(); for (let i = 0; i < n; i++) { const a = rand(-1.2, 1.2); const dist = rand(1300, 1900); const x = dist * Math.cos(a) + 200, z = dist * Math.sin(a); const hgt = rand(50, 110), r = rand(320, 640); e.set(0, rand(0, 6), 0); q.setFromEuler(e); M.compose(new T.Vector3(x, hgt / 2 - 20, z), q, s3.set(r, hgt, r * rand(0.6, 1.2))); ridge.setMatrixAt(i, M); } ridge.instanceMatrix.needsUpdate = true; scene.add(ridge); }

    stage(2);
    // ---- woods and scattered trees
    const trunkG = new T.CylinderGeometry(0.28, 0.5, 5.5, 7), trunkM = new T.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1 });
    const leafG = new T.IcosahedronGeometry(3.2, 2), leafM = new T.MeshStandardMaterial({ color: 0x1b2419, roughness: 1, flatShading: true });
    { const p = leafG.attributes.position; for (let i = 0; i < p.count; i++) { const k = rand(0.9, 1.08); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } leafG.computeVertexNormals(); }
    const treeSpots = []; for (let i = 0; i < 160; i++) treeSpots.push([rand(-300, -175), rand(-260, 260)]); for (let i = 0; i < 80; i++) treeSpots.push([rand(-100, 190), rand(-300, -165)]); for (let i = 0; i < 80; i++) treeSpots.push([rand(-100, 190), rand(165, 300)]); for (let i = 0; i < 14; i++) treeSpots.push([rand(-180, -120), rand(-140, 140)]); for (let i = 0; i < 40; i++) treeSpots.push([rand(300, 500), rand(-300, 300)]);
    const trunks = new T.InstancedMesh(trunkG, trunkM, treeSpots.length), leaves = new T.InstancedMesh(leafG, leafM, treeSpots.length * 5);
    { const M = new T.Matrix4(), q = new T.Quaternion(), s3 = new T.Vector3(), c3 = new T.Color(); let li = 0;
      treeSpots.forEach(([x, z], i) => { const y = gy(x, z); const sc2 = rand(0.8, 1.6); M.compose(new T.Vector3(x, y + 2.7 * sc2, z), q, s3.set(sc2, sc2, sc2)); trunks.setMatrixAt(i, M); for (let k = 0; k < 5; k++) { const r = rand(0.5, 1.0) * sc2; const e2 = new T.Euler(rand(0, 3), rand(0, 3), 0); const q2 = new T.Quaternion().setFromEuler(e2); M.compose(new T.Vector3(x + rand(-1.9, 1.9) * sc2, y + (4.6 + rand(0, 3.4)) * sc2, z + rand(-1.9, 1.9) * sc2), q2, s3.set(r, r * rand(0.75, 1.1), r)); leaves.setMatrixAt(li, M); c3.setHSL(0.25 + rand(-0.03, 0.03), 0.28, 0.1 + rand(-0.03, 0.04)); leaves.setColorAt(li, c3); li++; } });
      trunks.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true; }
    trunks.castShadow = leaves.castShadow = true; scene.add(trunks); scene.add(leaves);
    { const bushG = new T.IcosahedronGeometry(1, 1); const bushM = new T.MeshStandardMaterial({ color: 0x1e2a1a, roughness: 1, flatShading: true }); const rockM = new T.MeshStandardMaterial({ color: 0x5a5852, roughness: 1, flatShading: true });
      const NB = 520, NR = 260; const bushes = new T.InstancedMesh(bushG, bushM, NB), rocks = new T.InstancedMesh(bushG, rockM, NR); const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s3 = new T.Vector3();
      const spot = () => { let x, z, k = 0; do { x = rand(-200, 300); z = rand(-320, 320); k++; } while (k < 10 && ((Math.abs(x) < 40 && Math.abs(z) < 30) || (x > 50 && x < 215 && Math.abs(z) < 125) || (x > 215 && x < 330 && Math.abs(z) < 175))); return [x, z]; };
      for (let i = 0; i < NB; i++) { const [x, z] = spot(); const s = rand(0.7, 2.2); e.set(0, rand(0, 6), 0); q.setFromEuler(e); M.compose(new T.Vector3(x, gy(x, z) + s * 0.35, z), q, s3.set(s * rand(0.8, 1.4), s * 0.6, s)); bushes.setMatrixAt(i, M); }
      for (let i = 0; i < NR; i++) { const [x, z] = spot(); const s = rand(0.4, 1.6); e.set(rand(0, 3), rand(0, 6), rand(0, 3)); q.setFromEuler(e); M.compose(new T.Vector3(x, gy(x, z) + s * 0.3, z), q, s3.set(s * rand(0.8, 1.5), s * rand(0.5, 0.9), s)); rocks.setMatrixAt(i, M); }
      bushes.instanceMatrix.needsUpdate = true; rocks.instanceMatrix.needsUpdate = true; bushes.castShadow = rocks.castShadow = true; scene.add(bushes); scene.add(rocks); }

    // ---- particle pools: embers, smoke and dust puffs, stone chips, and fires that burn where they are put
    const embers = []; for (let i = 0; i < 420; i++) { const s = sprite(emberTex, 1, 0xffffff, 0, true); s.userData = { life: 0 }; s.visible = false; scene.add(s); embers.push(s); } let emberI = 0;
    const emit = (p, spread, size, n, vmul, vdir) => { for (let k = 0; k < n; k++) { const s = embers[emberI++ % embers.length]; s.position.set(p.x + rand(-spread, spread), p.y + rand(-spread, spread), p.z + rand(-spread, spread)); const vm = vmul || 1; s.userData = { life: 1, vx: rand(-2, 2) * vm + (vdir ? vdir.x : 0), vy: (0.6 + rand(0, 1.6)) * vm + (vdir ? vdir.y : 0), vz: rand(-2, 2) * vm + (vdir ? vdir.z : 0) }; s.scale.set(size, size, 1); s.material.opacity = 1; s.visible = true; } };
    const puffs = []; for (let i = 0; i < 170; i++) { const s = sprite(smokeTex, 3, 0xffffff, 0); s.userData = { life: 0 }; s.visible = false; scene.add(s); puffs.push(s); } let puffI = 0;
    const puff = (p, size, n, dusty, rise) => { for (let k = 0; k < n; k++) { const s = puffs[puffI++ % puffs.length]; s.position.copy(p).add(V(rand(-1, 1), rand(-1, 1), rand(-1, 1))); s.userData = { life: 1, g: (rise == null ? 1 : rise) * rand(0.6, 1.4), vx: rand(-1.5, 1.5), vz: rand(-1.5, 1.5) }; s.scale.set(size, size, 1); s.material.map = dusty ? dustTex : smokeTex; s.material.opacity = 0.55; s.visible = true; } };
    const chipM = new T.MeshStandardMaterial({ color: 0x8d8a84, roughness: 1 });
    const chips = []; for (let i = 0; i < 120; i++) { const m = new T.Mesh(new T.BoxGeometry(rand(0.25, 0.8), rand(0.2, 0.6), rand(0.25, 0.7)), chipM); m.visible = false; m.userData = { life: 0 }; scene.add(m); chips.push(m); } let chipI = 0;
    const chip = (p, n, vmul, vdir) => { for (let k = 0; k < n; k++) { const m = chips[chipI++ % chips.length]; m.position.copy(p); const vm = vmul || 1; m.userData = { life: 1, v: V(rand(-6, 6) * vm + (vdir ? vdir.x : 0), rand(2, 9) * vm, rand(-6, 6) * vm + (vdir ? vdir.z : 0)), r: rand(2, 9) }; m.visible = true; } };
    const fireSpots = [];
    const tmpLights = []; for (let i = 0; i < 2; i++) { const L = new T.PointLight(0xff7a2a, 0, 40, 1.5); L.userData.free = true; scene.add(L); tmpLights.push(L); }
    function makeFire(p, size, n, light, range, ttl) { // flames, a light (its own if permanent, from a small pool if not) and a smoke column at p
      let L = null;
      if (light > 0 && !ttl) { L = new T.PointLight(0xff7a2a, light, range, 1.5); scene.add(L); }
      else if (light > 0) { L = tmpLights.find((l) => l.userData.free) || null; if (L) { L.userData.free = false; L.distance = range; } }
      if (L) L.position.copy(p).add(V(0, size * 0.4, 0));
      const fl = []; for (let i = 0; i < n; i++) { const f = sprite(flameTex, size, 0xffffff, 0.95, true); f.userData = { ph: rand(0, 6), r: rand(0.15, 0.4) * size, s: size * rand(0.8, 1.2) }; f.position.copy(p); scene.add(f); fl.push(f); }
      const g = sprite(glowTex, size * 1.6, 0xff9a40, 0.35, true); g.position.copy(p).add(V(0, size * 0.1, 0)); scene.add(g);
      const sm = []; const ns = Math.max(3, Math.round(n * 1.4)); for (let i = 0; i < ns; i++) { const s = sprite(smokeTex, size * 1.5, 0xffffff, 0.5); s.userData = { a: i / ns, dx: rand(-0.5, 0.5) * size, dz: rand(-0.5, 0.5) * size }; scene.add(s); sm.push(s); }
      const f = { p: p.clone(), size, fl, L, g, sm, base: light, ttl: ttl || 0, age: 0, k: 1 }; fireSpots.push(f); return f;
    }
    function makeFireAt(p, size) { return makeFire(p, size, 3, 1.4, 28, rand(5, 9)); }
    function tickFires(t, dt) {
      for (let i = fireSpots.length - 1; i >= 0; i--) { const f = fireSpots[i]; f.age += dt; let k = 1;
        if (f.ttl) { k = f.age < 0.5 ? f.age / 0.5 : clamp(1 - (f.age - f.ttl + 2) / 2, 0, 1); if (f.age > f.ttl) { if (f.L) { f.L.intensity = 0; f.L.userData.free = true; } f.fl.forEach((s) => scene.remove(s)); f.sm.forEach((s) => scene.remove(s)); scene.remove(f.g); fireSpots.splice(i, 1); continue; } }
        f.k = k; if (f.L) f.L.intensity = f.base * k * (0.82 + 0.2 * Math.sin(t * 17 + i) + 0.12 * Math.sin(t * 31 + i * 2));
        f.fl.forEach((s, j) => { const sc2 = s.userData.s * k * (0.8 + 0.3 * Math.sin(t * 13 + s.userData.ph)); s.scale.set(sc2, sc2 * 1.5, 1); s.position.set(f.p.x + s.userData.r * Math.cos(t * 2 + j), f.p.y + sc2 * 0.35 + 0.1 * f.size * Math.sin(t * 7 + j), f.p.z + s.userData.r * Math.sin(t * 2 + j)); s.material.rotation = 0.2 * Math.sin(t * 9 + j); });
        f.g.material.opacity = 0.35 * k; f.g.scale.setScalar(f.size * 1.6 * (0.9 + 0.1 * Math.sin(t * 23 + i)));
        f.sm.forEach((s) => { const a = (s.userData.a + t * 0.05) % 1; const rise = f.size * 9; s.position.set(f.p.x + f.size * 0.9 * a + s.userData.dx, f.p.y + f.size * 0.3 + rise * a, f.p.z + f.size * 0.6 * a + s.userData.dz); const sc2 = f.size * (1.2 + 5 * a); s.scale.set(sc2, sc2, 1); s.material.opacity = 0.5 * k * (1 - a) * Math.min(1, a * 8); });
        if (Math.random() < 0.35 * k) emit(V(f.p.x, f.p.y + f.size * 0.5, f.p.z), f.size * 0.3, rand(0.25, 0.6), 1, 0.7); }
    }

    stage(3);
    // ---- the castle: a battered outer wall with towers and a gatehouse, a breach, an inner wall, halls, the keep
    const CX = 236, CZ = 0;
    const castle = new T.Group(); scene.add(castle);
    const windowMat = new T.MeshBasicMaterial({ color: 0xffb860 });
    const slit = (g, x, y, z, ry) => { const w = new T.Mesh(new T.PlaneGeometry(0.5, 1.6), new T.MeshBasicMaterial({ color: 0x0b0d10 })); w.position.set(x, y, z); w.rotation.y = ry || 0; g.add(w); };
    const lit = (g, x, y, z, ry) => { const w = new T.Mesh(new T.PlaneGeometry(0.9, 1.4), windowMat); w.position.set(x, y, z); w.rotation.y = ry || 0; g.add(w); return w; };
    const rubbleG = new T.DodecahedronGeometry(0.7, 0); const rubbleM = new T.MeshStandardMaterial({ color: 0x7c7a75, roughness: 1 });
    const rubble = new T.InstancedMesh(rubbleG, rubbleM, 900); let rubI = 0; const rubM4 = new T.Matrix4(), rubQ = new T.Quaternion(), rubS = new T.Vector3(), rubE = new T.Euler();
    const dropRubble = (x, z, y, n, spread, big) => { for (let i = 0; i < n && rubI < 900; i++) { const s = rand(0.4, big ? 2.4 : 1.3); rubE.set(rand(0, 3), rand(0, 3), rand(0, 3)); rubQ.setFromEuler(rubE); rubM4.compose(new T.Vector3(x + rand(-spread, spread), y + s * 0.4, z + rand(-spread, spread)), rubQ, rubS.set(s, s * 0.7, s)); rubble.setMatrixAt(rubI++, rubM4); } };
    const merlonMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), stoneMat(0.5, 0.4), 2600); let merI = 0; const merM = new T.Matrix4(), merQ = new T.Quaternion(), merE = new T.Euler(), merS = new T.Vector3();
    const addMerlon = (x, y, z, sx, sy, sz, ry) => { if (merI >= 2600) return; merE.set(0, ry || 0, rand(-0.03, 0.03)); merQ.setFromEuler(merE); merM.compose(new T.Vector3(x, y, z), merQ, merS.set(sx, sy, sz)); merlonMesh.setMatrixAt(merI++, merM); };
    const merlons = (g, x, y, z1, z2, t) => { for (let s = z1 + 1; s < z2; s += 3.2) { if (Math.random() < 0.14) continue; addMerlon(x, y + 0.85, s, t, 1.7, 2, 0); } };
    function wallRun(x, z1, z2, h, t, yBase) { const len = z2 - z1; const m = shadowed(new T.Mesh(new T.BoxGeometry(t, h + 3, len), stoneMat(len / 9, (h + 3) / 9))); m.position.set(x, yBase + h / 2 - 1.5, (z1 + z2) / 2); castle.add(m); merlons(castle, x, yBase + h, z1, z2, t); const walk = new T.Mesh(new T.BoxGeometry(t + 0.6, 0.5, len), woodGrey); walk.position.set(x, yBase + h - 0.3, (z1 + z2) / 2); castle.add(walk); for (let s = z1 + 6; s < z2 - 4; s += rand(9, 16)) dropRubble(x - t / 2 - 1.5, s, yBase - 0.3, 3, 1.5); return m; }
    const blocks = []; // stretches of the outer wall built stone by stone, so hits can bring them down
    function blockWall(x, z1, z2, h, t, yBase) { const cw = 2.8, rh = 2.5; const cols = Math.round((z2 - z1) / cw), rows = Math.round(h / rh); const mat = stoneMat(cw / 9, rh / 9);
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const m = shadowed(new T.Mesh(new T.BoxGeometry(t, rh, cw), mat)); m.position.set(x, yBase + rh * (r + 0.5) - 0.2, z1 + cw * (c + 0.5)); m.userData = { home: m.position.clone(), v: null, w: null, down: false }; castle.add(m); blocks.push(m); }
      merlons(castle, x, yBase + h - 0.2, z1, z2, t); const walk = new T.Mesh(new T.BoxGeometry(t + 0.6, 0.5, z2 - z1), woodGrey); walk.position.set(x, yBase + h - 0.5, (z1 + z2) / 2); castle.add(walk); }
    function tower(x, z, r, h, yBase, broken) { const g = new T.Group(); const hh = broken ? h * 0.55 : h; const body = shadowed(new T.Mesh(new T.CylinderGeometry(r, r * 1.1, hh + 3, 22), stoneMat(r * 1.2, (hh + 3) / 9))); body.position.set(x, yBase + hh / 2 - 1.5, z); g.add(body);
      if (!broken) { const cap = new T.Mesh(new T.CylinderGeometry(r + 0.7, r + 0.2, 1.3, 22), stoneMat(1, 1, 0x7d7b78)); cap.position.set(x, yBase + h + 0.4, z); g.add(cap);
        const n = 12; for (let i = 0; i < n; i++) { if (Math.random() < 0.1) continue; const a = i / n * Math.PI * 2; const rr = r + 0.3; addMerlon(x + rr * Math.cos(a), yBase + h + 1.85, z + rr * Math.sin(a), 1.4, 1.6, 1.4, -a); } }
      else { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rand(-0.2, 0.2); const m = shadowed(new T.Mesh(new T.BoxGeometry(rand(1.2, 2.4), rand(1.5, 4.5), rand(1.2, 2.2)), stoneMat(0.4, 0.6))); m.position.set(x + (r - 0.6) * Math.cos(a), yBase + hh + rand(0, 1.5), z + (r - 0.6) * Math.sin(a)); m.rotation.set(rand(-0.3, 0.3), -a, rand(-0.3, 0.3)); g.add(m); } dropRubble(x - r - 2, z, yBase - 0.2, 60, 6, true); const sc = sprite(smokeTex, r * 3.2, 0x000000, 0.8); sc.position.set(x - r - 0.3, yBase + hh * 0.7, z); g.add(sc); }
      for (let k = 0; k < 3; k++) slit(g, x - r - 0.05, yBase + Math.min(hh - 2, h * (0.3 + 0.22 * k)), z + (k - 1) * r * 0.55, Math.PI / 2);
      if (!broken && Math.random() < 0.7) lit(g, x - r - 0.06, yBase + h * 0.62, z + rand(-r * 0.5, r * 0.5), Math.PI / 2);
      castle.add(g); return { g, x, z, r, h: hh, yBase, deck: yBase + (broken ? hh : h + 1.05) }; }
    const yOuter = gy(CX, CZ) + 0.5, OUT_H = 12, OUT_T = 4.8;
    wallRun(CX, -160, -118, 7, OUT_T, yOuter); dropRubble(CX - 4, -118, yOuter - 0.3, 50, 7, true); // a stretch brought down in an earlier siege
    wallRun(CX, -112, -70, OUT_H, OUT_T, yOuter); blockWall(CX, -70, -52, OUT_H, OUT_T, yOuter); wallRun(CX, -52, -34, OUT_H, OUT_T, yOuter);
    wallRun(CX, -22, 22, OUT_H + 2, OUT_T + 1, yOuter);
    blockWall(CX, 34, 46, OUT_H, OUT_T, yOuter);
    // the breach: the wall between 46 and 78 is down to stubs and a slope of rubble
    { const BZ1 = 46, BZ2 = 78; [[BZ1 + 1.5, 7.5, 3], [BZ2 - 1.5, 5.5, 3]].forEach(([z, h, w]) => { const stub = shadowed(new T.Mesh(new T.BoxGeometry(OUT_T, h + 3, w), stoneMat(0.4, h / 6))); stub.position.set(CX, yOuter + h / 2 - 1.5, z); stub.rotation.x = rand(-0.08, 0.08); castle.add(stub); for (let i = 0; i < 5; i++) { const m = shadowed(new T.Mesh(new T.BoxGeometry(rand(1, 2.4), rand(1, 2.8), rand(1, 2.2)), stoneMat(0.4, 0.4))); m.position.set(CX + rand(-1.5, 1.5), yOuter + h + rand(0, 1.2), z + rand(-1.2, 1.2)); m.rotation.set(rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3)); castle.add(m); } });
      for (let i = 0; i < 14; i++) { const w = rand(2, 5), h = rand(1.2, 3.2), d = rand(2, 5); const m = shadowed(new T.Mesh(new T.BoxGeometry(w, h, d), stoneMat(w / 6, h / 6, 0x7a7772))); const dx = rand(-14, 2), dz = rand(BZ1 + 3, BZ2 - 3); m.position.set(CX + dx, yOuter + (dx > -3 ? rand(0.5, 4) : rand(-0.6, 1.2)) + h * 0.3, dz); m.rotation.set(rand(-0.5, 0.5), rand(0, 3), rand(-0.5, 0.5)); castle.add(m); }
      const low = shadowed(new T.Mesh(new T.BoxGeometry(OUT_T + 2, 4, BZ2 - BZ1 - 6), stoneMat(0.6, 0.6, 0x7a7772))); low.position.set(CX, yOuter + 0.6, (BZ1 + BZ2) / 2); low.rotation.x = 0.06; castle.add(low);
      dropRubble(CX - 6, (BZ1 + BZ2) / 2, yOuter - 0.2, 140, 12, true); dropRubble(CX - 14, (BZ1 + BZ2) / 2, yOuter - 1.5, 60, 9, false); }
    wallRun(CX, 78, 160, OUT_H, OUT_T, yOuter);
    function wallRunX(x1, x2, z, h, t, yBase) { const len = x2 - x1; const m = shadowed(new T.Mesh(new T.BoxGeometry(len, h + 3, t), stoneMat(len / 9, (h + 3) / 9))); m.position.set((x1 + x2) / 2, yBase + h / 2 - 1.5, z); castle.add(m); for (let s = x1 + 1; s < x2; s += 3.2) { if (Math.random() < 0.14) continue; addMerlon(s, yBase + h + 0.85, z, 2, 1.7, t, 0); } const walk = new T.Mesh(new T.BoxGeometry(len, 0.5, t + 0.6), woodGrey); walk.position.set((x1 + x2) / 2, yBase + h - 0.3, z); castle.add(walk); }
    const BACK = CX + 128;
    wallRunX(CX, BACK, -160, OUT_H, OUT_T, yOuter); wallRunX(CX, BACK, 160, OUT_H, OUT_T, yOuter); wallRun(BACK, -160, 160, OUT_H, OUT_T, yOuter);
    [[BACK, -160], [BACK, 160], [BACK, -60], [BACK, 60], [CX + 64, -160], [CX + 64, 160]].forEach(([x, z]) => tower(x, z, 5.6, 17, yOuter, false));
    const towers = {};
    [-160, -112, -72, 72, 160].forEach((z) => { towers[z] = tower(CX, CZ + z, 5.6, 17, yOuter, false); });
    towers[112] = tower(CX, CZ + 112, 5.6, 17, yOuter, true);
    towers[-28] = tower(CX, CZ - 28, 6.8, 22, yOuter, false); towers[28] = tower(CX, CZ + 28, 6.8, 22, yOuter, false);
    const povTower = towers[-28];
    { const gate = new T.Mesh(new T.BoxGeometry(OUT_T + 1.4, 8.5, 7), new T.MeshBasicMaterial({ color: 0x0a0b0d })); gate.position.set(CX - 0.4, yOuter + 4.2, CZ); castle.add(gate);
      const port = new T.Mesh(new T.BoxGeometry(0.3, 8, 6.4), ironMat); port.position.set(CX - 3, yOuter + 4, CZ); castle.add(port);
      const arch = shadowed(new T.Mesh(new T.BoxGeometry(OUT_T + 2.4, 3, 11), stoneMat(1.2, 0.4, 0x85827c))); arch.position.set(CX - 0.4, yOuter + 10, CZ); castle.add(arch); }
    const IX = CX + 36, yInner = gy(IX, CZ) + 0.5, IN_H = 18, IN_T = 5.8;
    wallRun(IX, -118, 118, IN_H, IN_T, yInner);
    [-118, -64, -14, 36, 86, 118].forEach((z) => tower(IX, CZ + z, 7.4, 28, yInner, false));
    wallRunX(IX, CX + 104, -118, IN_H, IN_T, yInner); wallRunX(IX, CX + 104, 118, IN_H, IN_T, yInner); wallRun(CX + 104, -118, 118, IN_H, IN_T, yInner);
    [[CX + 104, -118], [CX + 104, 118], [CX + 104, 0]].forEach(([x, z]) => tower(x, z, 7.4, 28, yInner, false));
    const KX = CX + 72, KZ = 14, yKeep = gy(KX, KZ) + 0.5;
    const keep = shadowed(new T.Mesh(new T.BoxGeometry(32, 44, 32), stoneMat(3.6, 5, 0x8e8c88))); keep.position.set(KX, yKeep + 20.5, KZ); castle.add(keep);
    [[-16, -16], [16, -16], [16, 16], [-16, 16]].forEach(([dx, dz]) => tower(KX + dx, KZ + dz, 4, 50, yKeep, false));
    const litWindows = [];
    for (let k = 0; k < 8; k++) litWindows.push(lit(castle, KX - 16.05, yKeep + rand(8, 38), KZ + rand(-12, 12), Math.PI / 2));
    for (let k = 0; k < 5; k++) litWindows.push(lit(castle, KX + rand(-12, 12), yKeep + rand(8, 38), KZ - 16.05, 0));
    castle.traverse((o) => { if (o.material === windowMat && litWindows.indexOf(o) < 0) litWindows.push(o); });
    { const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 10, 6), ironMat); pole.position.set(KX, yKeep + 49, KZ); castle.add(pole); const flag = new T.Mesh(new T.PlaneGeometry(5.5, 3.2, 8, 1), clothMat(170, 40, 30)); flag.position.set(KX + 2.75, yKeep + 52.5, KZ); castle.add(flag); castle.userData.flag = flag; }
    const halls = [[CX + 52, -46, 24, 12, 11, true], [CX + 58, 44, 20, 10, 15, false], [CX + 50, 74, 16, 8, 10, false], [CX + 54, -90, 18, 9, 9, false]];
    halls.forEach(([x, z, l, h, w, burnt]) => { const hall = shadowed(new T.Mesh(new T.BoxGeometry(w, h, l), stoneMat(w / 6, h / 6, burnt ? 0x6a6662 : null))); hall.position.set(x, gy(x, z) + h / 2, z); castle.add(hall); if (!burnt) { const roof = ridgeRoof(w + 1.2, l + 1, h * 0.5, woodDark); roof.position.set(x, gy(x, z) + h, z); castle.add(roof); } else { for (let i = 0; i < 6; i++) { const rafter = timber(V(x - w / 2 + rand(-0.5, 0.5), gy(x, z) + h, z - l / 2 + i * l / 5), V(x + rand(-1, 1), gy(x, z) + h + h * 0.45, z - l / 2 + i * l / 5 + rand(-1, 1)), 0.18, woodGrey); castle.add(rafter); } } });
    rubble.instanceMatrix.needsUpdate = true; rubble.count = rubI; scene.add(rubble);
    merlonMesh.count = merI; merlonMesh.instanceMatrix.needsUpdate = true; merlonMesh.castShadow = merlonMesh.receiveShadow = true; scene.add(merlonMesh);
    // fires inside: the hall by the gate burning through its roof, the tower at +72 alight, the broken tower smouldering, the breach rubble, a brazier on each gate tower
    makeFire(V(CX + 52, gy(CX + 52, -46) + 12.5, -46), 12, 9, 4.2, 260);
    makeFire(V(CX, yOuter + 19, CZ + 72), 10, 7, 3.2, 220);
    makeFire(V(CX - 1, yOuter + 17 * 0.55 + 0.5, CZ + 112), 6, 4, 0, 120);
    makeFire(V(CX - 8, yOuter + 2.2, CZ + 60), 3.5, 3, 0, 60);
    makeFire(V(CX + 44, yOuter + 7, CZ - 92), 4, 3, 0, 70);
    { const tw = towers[28]; const br = new T.Mesh(new T.CylinderGeometry(0.5, 0.35, 0.8, 8), ironMat); br.position.set(tw.x + 2.5, tw.deck + 0.4, tw.z - 2.5); castle.add(br); makeFire(V(br.position.x, br.position.y + 0.5, br.position.z), 1.3, 2, 0, 18); } // (no brazier on the bowman's tower: its smoke would fill his view)
    [[CX - OUT_T / 2 - 0.3, yOuter + 7, -44, 12], [CX - OUT_T / 2 - 0.3, yOuter + 5, 96, 10], [CX - OUT_T / 2 - 0.3, yOuter + 8, -98, 9]].forEach(([x, y, z, s]) => { const sc = sprite(smokeTex, s, 0x000000, 0.75); sc.position.set(x, y, z); scene.add(sc); });
    // the gate towers' crews, and the bowman's place on the front tower
    const POV_A = Math.PI + Math.PI / 12; // the crenel he shoots through
    const E = (() => { const tw = povTower; const rr = tw.r - 2.4; return V(tw.x + rr * Math.cos(POV_A), tw.deck + 1.75, tw.z + rr * Math.sin(POV_A)); })();
    function hitBlocks(p, radius, strength, dir) { // bring down stones of the outer wall near p
      blocks.forEach((b) => { if (b.userData.down) return; const d = b.position.distanceTo(p); if (d > radius) return; const k = 1 - d / radius; b.userData.down = true; b.userData.delay = d * 0.04; b.userData.v = V((dir ? dir.x : 1) * rand(4, 12) * strength * k + rand(-2, 2), rand(1, 6) * strength * k, (dir ? dir.z : 0) * rand(2, 6) * strength * k + rand(-3, 3)); b.userData.w = V(rand(-3, 3), rand(-1, 1), rand(-3, 3)); }); }
    function tickBlocks(dt) { blocks.forEach((b) => { const u = b.userData; if (!u.down || !u.v) return; if (u.delay > 0) { u.delay -= dt; return; } u.v.y -= 20 * dt; b.position.addScaledVector(u.v, dt); b.rotation.x += u.w.x * dt; b.rotation.y += u.w.y * dt; b.rotation.z += u.w.z * dt; const g = gy(b.position.x, b.position.z) + 0.9; if (b.position.y < g) { b.position.y = g; u.v.multiplyScalar(0.35); u.v.y = Math.abs(u.v.y) * 0.3; u.w.multiplyScalar(0.5); if (u.v.length() < 0.6) u.v = null; if (Math.random() < 0.5) puff(b.position, rand(3, 6), 1, true, 0.6); } }); }

    stage(4);
    // ---- the camp behind the lines: pavilions, ridge tents, banners, torches, fires, shot, wagons, and the field already burning in places
    const camp = new T.Group(); scene.add(camp);
    const canvasA = clothMat(178, 168, 142), canvasB = clothMat(150, 120, 90), canvasC = clothMat(118, 58, 48), canvasD = clothMat(90, 100, 120);
    const bannerMats = [clothMat(160, 36, 30), clothMat(200, 160, 40), clothMat(40, 60, 130), clothMat(90, 40, 110)];
    function pavilion(x, z, r, mat) { const y = gy(x, z); const wallm = shadowed(new T.Mesh(new T.CylinderGeometry(r, r, 2.3, 14, 1, true), mat)); wallm.position.set(x, y + 1.15, z); camp.add(wallm); const roof = shadowed(new T.Mesh(new T.ConeGeometry(r + 0.45, 2.8, 14), mat)); roof.position.set(x, y + 3.7, z); camp.add(roof); const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.8, 5), woodDark); pole.position.set(x, y + 5.6, z); camp.add(pole); const pen = new T.Mesh(new T.PlaneGeometry(1.2, 0.5), bannerMats[0]); pen.position.set(x + 0.6, y + 6.2, z); camp.add(pen); const door = new T.Mesh(new T.PlaneGeometry(1.0, 1.9), new T.MeshBasicMaterial({ color: 0x15130f })); door.position.set(x - r - 0.02, y + 1.0, z); door.rotation.y = -Math.PI / 2; camp.add(door); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const rope = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 2.4, 3), ropeMat); rope.position.set(x + (r + 0.9) * Math.cos(a), y + 1.0, z + (r + 0.9) * Math.sin(a)); rope.rotation.z = 0.9 * Math.cos(a); rope.rotation.x = -0.9 * Math.sin(a); camp.add(rope); } }
    function ridgeTent(x, z, len, mat, ry) { const y = gy(x, z); const m = ridgeRoof(4.2, len, 2.3, mat); m.rotation.y = ry || 0; m.position.set(x, y, z); camp.add(m); }
    for (let i = 0; i < 48; i++) { const x = rand(-180, -44), z = rand(-130, 130); if (Math.abs(z) < 18) continue; if (i % 3 === 0) pavilion(x, z, rand(2.4, 3.6), [canvasA, canvasB, canvasD][i % 3]); else ridgeTent(x, z, rand(4.5, 7), i % 2 ? canvasA : canvasC, rand(-0.5, 0.5)); }
    [[-64, 32], [-78, -38], [-100, 64], [-132, -80]].forEach(([x, z]) => pavilion(x, z, 4.4, canvasC));
    const banners = [];
    [[-24, 24], [-20, -24], [-72, -62], [8, 50], [-38, 2], [-92, 14], [-122, -32], [-150, 70], [30, -12], [60, -40], [66, 30], [100, -70], [96, 62], [150, -20], [140, 36], [172, -12], [176, 50], [-120, 50]].forEach(([x, z], i) => { const y = gy(x, z); const p = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 7.5, 6), woodDark); p.position.set(x, y + 3.75, z); camp.add(p); const b = new T.Mesh(new T.PlaneGeometry(1.6, 3.4, 8, 1), bannerMats[i % bannerMats.length]); b.position.set(x + 0.85, y + 5.6, z); b.userData = { ph: rand(0, 6) }; camp.add(b); banners.push(b); });
    const torches = [];
    for (let i = 0; i < 40; i++) { const x = rand(-170, 60), z = rand(-130, 130); if (Math.abs(x) < 30 && Math.abs(z) < 24) continue; const y = gy(x, z); const p = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 2.8, 5), woodDark); p.position.set(x, y + 1.4, z); camp.add(p); const f = sprite(flameTex, 1.5, 0xffffff, 0.95, true); f.position.set(x, y + 3.1, z); f.userData = { ph: rand(0, 6) }; scene.add(f); torches.push(f); }
    const fires = [];
    [[-12, 16], [-48, -44], [-88, 44], [-126, -74], [-142, 92], [24, 62], [-70, 100], [-150, -20]].forEach(([x, z], i) => { const y = gy(x, z); const f = makeFire(V(x, y + 0.9, z), i ? 2.6 : 3.2, 4, i < 2 ? (i ? 1.1 : 1.5) : 0, i ? 40 : 60); for (let k = 0; k < 8; k++) { const log = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.6, 5), woodDark); log.position.set(x + rand(-0.4, 0.4), y + 0.15, z + rand(-0.4, 0.4)); log.rotation.set(0, rand(0, 3), Math.PI / 2 + rand(-0.2, 0.2)); camp.add(log); } fires.push({ x, z, y, f }); });
    { const shot = new T.InstancedMesh(new T.SphereGeometry(0.42, 10, 8), new T.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 }), 200); const M = new T.Matrix4(); let k = 0; [[-18, 14], [-36, 52], [-6, -56], [-82, 88], [-60, -70]].forEach(([ox, oz]) => { for (let i = 0; i < 40; i++) { const c = i % 8, r = Math.floor(i / 8); const lvl = (c > 1 && c < 6 && r > 0 && r < 4) ? 0.72 : 0; const px = ox + c * 0.9, pz = oz + r * 0.9; M.makeTranslation(px, gy(px, pz) + 0.42 + lvl, pz); shot.setMatrixAt(k++, M); } }); shot.instanceMatrix.needsUpdate = true; shot.castShadow = true; scene.add(shot); }
    [[-34, -16, 0.5], [-30, 30, -0.6], [-98, -20, 1.2], [-64, 76, 0.2], [40, -90, 0.9]].forEach(([x, z, ry]) => { const y = gy(x, z); const bed = box(4.6, 0.7, 2.2, woodDark); bed.position.set(x, y + 1.15, z); bed.rotation.y = ry; camp.add(bed); [[-1.6, 1.25], [1.6, 1.25], [-1.6, -1.25], [1.6, -1.25]].forEach(([dx, dz]) => { const w = new T.Mesh(new T.CylinderGeometry(0.78, 0.78, 0.22, 14), woodDark); w.rotation.x = Math.PI / 2; w.position.set(x + dx * Math.cos(ry) - dz * Math.sin(ry), y + 0.78, z + dx * Math.sin(ry) + dz * Math.cos(ry)); w.rotation.y = ry; camp.add(w); }); });
    [[88, -34], [122, 58], [156, -96], [172, 24], [64, 104], [198, -60]].forEach(([x, z]) => { makeFire(V(x, gy(x, z) + 0.6, z), rand(2.2, 3.6), 3, 0, 40); const sc = sprite(smokeTex, rand(8, 14), 0x000000, 0.7); sc.position.set(x, gy(x, z) + 0.3, z); sc.material.rotation = 0; scene.add(sc); });

    // ---- the burning stone: a charred sphere webbed with glowing cracks, flames streaming behind it, a halo and a light
    const fbPool = [];
    function makeFireball(big) {
      const g = new T.Group(); const r = big ? 0.78 : 0.52;
      const rock = new T.Mesh(new T.SphereGeometry(r, 28, 20), new T.MeshStandardMaterial({ map: lavaTex, emissiveMap: lavaEm, emissive: new T.Color(0xff6a1a), emissiveIntensity: 1.2, color: 0xffffff, roughness: 0.95, metalness: 0 }));
      { const p = rock.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.06 * Math.sin(p.getX(i) * 9 + p.getY(i) * 7) * Math.cos(p.getZ(i) * 11); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } rock.geometry.computeVertexNormals(); }
      rock.castShadow = true; g.add(rock);
      const fl = []; for (let k = 0; k < (big ? 9 : 6); k++) { const f = sprite(flameTex, 2.4, 0xffffff, 0.9, true); f.userData = { ph: rand(0, 6), k }; g.add(f); fl.push(f); }
      const halo = sprite(glowTex, 6, 0xff8a30, 0.45, true); g.add(halo);
      const core = sprite(glowTex, 2.2, 0xffd090, 0.6, true); g.add(core);
      const L = big ? new T.PointLight(0xffa040, 0, 90, 1.4) : { position: new T.Vector3(), intensity: 0, distance: 0, userData: {} }; if (big) scene.add(L); // lights stay in the scene at zero intensity: toggling them would recompile every material; the lesser fireballs carry none
      g.userData = { rock, fl, halo, core, L, r, axis: V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), spin: rand(5, 8), big }; g.visible = false; scene.add(g); return g;
    }
    function animateFireball(fb, t, dt, vel, idle, boost) {
      const u = fb.userData; const speed = vel ? vel.length() : 0; const b = boost || 1; const R = u.r;
      if (speed > 0.5) u.rock.rotateOnAxis(u.axis, u.spin * dt); else u.rock.rotateOnAxis(u.axis, 0.15 * dt);
      u.rock.material.emissiveIntensity = (idle ? 0.7 : 2.4) * (0.85 + 0.3 * Math.sin(t * 29 + u.spin)) * b;
      const back = vel && speed > 0.5 ? vel.clone().normalize().multiplyScalar(-1) : V(0, 1, 0);
      const n = u.fl.length;
      u.fl.forEach((f, j) => { const on = idle ? j < 2 : true; f.visible = on; if (!on) return; const k = j / (n - 1);
        if (idle) { const s = R * (1.3 + 0.5 * Math.sin(t * 21 + f.userData.ph)); f.position.set(rand(-0.1, 0.1) * R, R * (0.5 + 0.3 * j), rand(-0.1, 0.1) * R); f.scale.set(s, s * 1.5, 1); f.material.opacity = 0.7; }
        else { const along = R * (0.6 + 5.2 * k) * (0.85 + 0.15 * Math.sin(t * 15 + j)); const s = R * (2.4 - 1.7 * k) * (0.8 + 0.3 * Math.sin(t * 23 + f.userData.ph)) * b; f.position.copy(back).multiplyScalar(along).add(V(rand(-0.2, 0.2) * R * (0.5 + k), rand(-0.2, 0.2) * R * (0.5 + k), rand(-0.2, 0.2) * R * (0.5 + k))); f.scale.set(s, s * 1.25, 1); f.material.opacity = (0.85 - 0.6 * k); }
        f.material.rotation = 0.3 * Math.sin(t * 9 + j); });
      u.halo.material.opacity = (idle ? 0.08 : 0.26) * b; u.halo.scale.setScalar(R * (idle ? 3.2 : 4.6) * (0.9 + 0.15 * Math.sin(t * 23 + u.spin)) * b);
      u.core.material.opacity = (idle ? 0.12 : 0.45) * b; u.core.scale.setScalar(R * (idle ? 1.6 : 2.3) * b);
      u.L.position.copy(fb.position); u.L.intensity = (idle ? 0.7 : u.big ? 3.6 : 2.2) * (0.85 + 0.3 * Math.sin(t * 37 + u.spin)) * b; u.L.distance = idle ? 30 : 100;
    }
    const hideFb = (fb) => { fb.visible = false; fb.userData.L.intensity = 0; };

    stage(5);
    // ---- the trebuchets, on the pattern of the Les Baux reconstruction: heavy squared A-frames with long raking
    //      struts on both axes, sills and cross sills, side decks, a windlass, a trough through the frame, a tapered
    //      beam with iron bands and a rope-wrapped tip, two hangers and a planked chest with a rounded belly.
    //      The moving parts are posed each frame from the model's P, K, S, C, psi and stone position.
    const L1 = mc.L1, L2 = mc.L2, L3 = mc.L3;
    const CW = 2.2, CT = 1.1, CD = 2.6, CR = 0.85; // chest: width (x), top box height, depth (z), belly radius
    function buildTreb(x, z, yaw) {
      const g = new T.Group(); g.position.set(x, gy(x, z) - 0.05, z); g.rotation.y = yaw; g.scale.setScalar(SCALE); scene.add(g);
      const st = []; const add = (m) => { g.add(m); st.push(m); return m; };
      const legR = 0.26, strutR = 0.2, tieR = 0.17, sillR = 0.25;
      [-1, 1].forEach((s) => { const zz = s * zf;
        add(timber(V(-bw, 0, zz), V(0, H, zz), legR, woodDark, legR * 0.85)); add(timber(V(bw, 0, zz), V(0, H, zz), legR, woodDark, legR * 0.85));
        add(timber(V(-2.3 * bw, 0.15, zz), V(-0.28 * bw, 0.72 * H, zz), strutR, woodGrey, strutR * 0.8)); add(timber(V(2.3 * bw, 0.15, zz), V(0.28 * bw, 0.72 * H, zz), strutR, woodGrey, strutR * 0.8));
        add(timber(V(-0.66 * bw, 0.34 * H, zz), V(0.66 * bw, 0.34 * H, zz), tieR, woodDark)); add(timber(V(-0.32 * bw, 0.68 * H, zz), V(0.32 * bw, 0.68 * H, zz), tieR, woodDark));
        add(timber(V(-0.4 * bw, 0.34 * H, zz), V(-0.5 * bw, 0.5 * H, zz), 0.12, woodDark)); add(timber(V(0.4 * bw, 0.34 * H, zz), V(0.5 * bw, 0.5 * H, zz), 0.12, woodDark));
        add(timber(V(-2.45 * bw, 0.2, zz), V(2.45 * bw, 0.2, zz), sillR, woodDark));
        const blk = add(box(0.95, 0.75, 0.75, woodDark)); blk.position.set(0, H + 0.02, zz); const cap = add(box(0.55, 0.12, 0.85, ironMat)); cap.position.set(0, H + 0.45, zz);
        [-2.3 * bw, 2.3 * bw].forEach((sx) => { const stk = add(timber(V(sx + 0.3, 0.9, zz + 0.3), V(sx - 0.2, -0.3, zz + 0.3), 0.07, ironMat, 0.03)); void stk; });
        // raking struts across the frames (in z), from outside the decks up to the legs
        add(timber(V(0.25 * bw, 0.1, s * 2.6 * zf), V(0.12 * bw, 0.7 * H, zz), strutR * 0.85, woodDark, strutR * 0.7)); add(timber(V(-0.25 * bw, 0.1, s * 2.6 * zf), V(-0.12 * bw, 0.7 * H, zz), strutR * 0.85, woodDark, strutR * 0.7));
        add(timber(V(0.25 * bw, 0.1, s * 2.6 * zf), V(-0.25 * bw, 0.1, s * 2.6 * zf), 0.15, woodDark));
        // side deck of planks and its bearers
        const deck = add(box(3.8 * bw, 0.1, 1.15, plankMat)); deck.position.set(0, 0.36, s * (zf + 0.62));
        [-1.5, -0.5, 0.5, 1.5].forEach((f) => { const br = add(box(0.2, 0.2, 1.25, woodDark)); br.position.set(f * bw, 0.24, s * (zf + 0.62)); });
      });
      [-2.2 * bw, -1.1 * bw, 1.1 * bw, 2.2 * bw].forEach((sx) => add(timber(V(sx, 0.2, -2.7 * zf), V(sx, 0.2, 2.7 * zf), sillR * 0.9, woodDark)));
      // windlass at the camp end: posts, drum, handspikes, a rope to the trough rail
      { const wx = -2.0 * bw; [-1, 1].forEach((s) => add(timber(V(wx, 0, s * (zf + 0.3)), V(wx, 1.4, s * (zf + 0.3)), 0.14, woodMat))); const drum = add(new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 2 * zf + 0.4, 10), woodDark)); drum.rotation.x = Math.PI / 2; drum.position.set(wx, 1.3, 0); shadowed(drum); for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const hs = add(timber(V(wx + 0.3 * Math.cos(a), 1.3 + 0.3 * Math.sin(a), zf + 0.5), V(wx + 1.3 * Math.cos(a), 1.3 + 1.3 * Math.sin(a), zf + 0.5), 0.05, woodMat)); void hs; } }
      // the trough through the frame: two rails and a floor the sling runs along
      [-0.36, 0.36].forEach((zz) => add(timber(V(-(L1 + 1.2), 0.12, zz), V(5.9, 0.12, zz), 0.12, woodDark)));
      { const fl = add(box(L1 + 7.1, 0.05, 0.62, plankMat)); fl.position.set((5.9 - (L1 + 1.2)) / 2, -0.03, 0); }
      // moving parts
      const axle = add(new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 2 * zf + 0.9, 14), ironMat)); axle.rotation.x = Math.PI / 2; shadowed(axle);
      const armL = add(timber(V(0, 0, 0), V(0, 1, 0), 0.36, woodMat, 0.17)); const armS = add(timber(V(0, 0, 0), V(0, 1, 0), 0.36, woodMat, 0.3));
      const Llen = L1; [0.12, 0.42, 0.72].forEach((f) => { const band = new T.Mesh(new T.TorusGeometry(0.36 - 0.19 * f + 0.05, 0.04, 6, 18), ironMat); band.rotation.x = Math.PI / 2; band.position.y = f; band.scale.set(1, 1 / Llen, 1); armL.add(band); });
      for (let k = 0; k < 8; k++) { const f = 0.9 + k * 0.012; const wrap = new T.Mesh(new T.TorusGeometry(0.21, 0.035, 5, 14), ropeMat); wrap.rotation.x = Math.PI / 2; wrap.position.y = f; wrap.scale.set(1, 1 / Llen, 1); armL.add(wrap); }
      { const prong = new T.Mesh(new T.CylinderGeometry(0.05, 0.015, 0.7, 6), ironMat); prong.position.set(0.12, 1, 0); prong.rotation.z = -0.55; prong.scale.y = 1 / Llen; armL.add(prong); }
      { const splice = new T.Mesh(new T.BoxGeometry(0.6, 0.5, 0.95), woodDark); splice.position.y = 0.55; splice.scale.y = 1 / L2; armS.add(splice); const b2 = new T.Mesh(new T.TorusGeometry(0.42, 0.045, 6, 18), ironMat); b2.rotation.x = Math.PI / 2; b2.position.y = 0.3; b2.scale.set(1, 1 / L2, 1); armS.add(b2); }
      const hang = [-1, 1].map((s) => { const h = add(timber(V(0, 0, s * 0.35 * CD), V(0, 1, s * 0.35 * CD), 0.07, ironMat, 0.07, false)); h.userData.zo = s * 0.35 * CD; return h; });
      const chest = new T.Group(); add(chest);
      { const top = box(CW, CT, CD, plankMat); top.position.y = 0.25; chest.add(top); const belly = shadowed(new T.Mesh(new T.CylinderGeometry(CR, CR, CD, 18), plankMat)); belly.rotation.x = Math.PI / 2; belly.position.y = 0.25 - CT / 2; chest.add(belly);
        [0.25 + CT / 2 - 0.08, 0.25 - CT / 2 + 0.05].forEach((y) => { const strap = new T.Mesh(new T.BoxGeometry(CW + 0.08, 0.12, CD + 0.08), ironMat); strap.position.y = y; chest.add(strap); });
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const bar = new T.Mesh(new T.BoxGeometry(0.1, CT + 0.1, 0.1), ironMat); bar.position.set(sx * CW / 2, 0.25, sz * CD / 2); chest.add(bar); }));
        [-1, 1].forEach((s) => { const ring = new T.Mesh(new T.TorusGeometry(0.16, 0.035, 6, 12), ironMat); ring.position.set(0, 0.25 + CT / 2 + 0.1, s * 0.35 * CD); chest.add(ring); });
        for (let k = 0; k < 16; k++) { const stn = new T.Mesh(new T.DodecahedronGeometry(rand(0.12, 0.26), 0), rubbleM); stn.position.set(rand(-0.42, 0.42) * CW, 0.25 + CT / 2 + 0.06, rand(-0.42, 0.42) * CD); chest.add(stn); } }
      const ropes = [-1, 1].map((s) => add(timber(V(0, 0, s * 0.12), V(0, 1, s * 0.12), 0.055, ropeMat, 0.055, false)));
      const pouch = add(box(0.7, 0.2, 0.5, new T.MeshStandardMaterial({ color: 0x3a2d22, roughness: 1 })));
      const m = { g, axle, armL, armS, hang, chest, ropes, pouch, statics: st, fb: makeFireball(true) };
      return m;
    }
    function poseTreb(m, fr, stoneVis) {
      const P = V(fr.P[0], fr.P[1], 0), S = V(fr.S[0], fr.S[1], 0), K = V(fr.K[0], fr.K[1], 0);
      m.axle.position.copy(P); place(m.armL, P, S); place(m.armS, P, K);
      const ux = -Math.sin(fr.ps), uy = -Math.cos(fr.ps);
      const cp = V(K.x + ux * (L3 - 0.4), K.y + uy * (L3 - 0.4), 0); m.chest.position.copy(cp); m.chest.rotation.z = -fr.ps;
      const top = V(cp.x - ux * (0.25 + CT / 2 + 0.1), cp.y - uy * (0.25 + CT / 2 + 0.1), 0);
      m.hang.forEach((h) => { const zo = h.userData.zo; place(h, V(K.x, K.y, zo), V(top.x, top.y, zo)); });
      let stone = null;
      if (stoneVis && fr.p) { stone = V(fr.p[0], fr.p[1] + 0.32, 0); m.ropes.forEach((r, i) => { const s = i ? 1 : -1; place(r, V(S.x, S.y, s * 0.12), V(stone.x, stone.y, s * 0.1)); r.visible = true; }); m.pouch.position.set(stone.x, stone.y - 0.2, 0); m.pouch.visible = true; m.pouch.rotation.z = 0; }
      else if (fr.free) { const e2 = fr.free; m.ropes.forEach((r, i) => { const s = i ? 1 : -1; place(r, V(S.x, S.y, s * 0.12), V(e2.x, e2.y, s * 0.1)); r.visible = true; }); m.pouch.position.set(e2.x, e2.y, 0); m.pouch.rotation.z = Math.atan2(e2.y - S.y, e2.x - S.x); m.pouch.visible = true; }
      else { m.ropes.forEach((r) => { r.visible = false; }); m.pouch.visible = false; }
      m.g.updateMatrixWorld(true);
      return stone ? m.g.localToWorld(stone) : null;
    }
    const synthFrame = (k) => { const th = frEnd.th + (fr0.th - frEnd.th) * k, ps = frEnd.ps * (1 - k); const P = fr0.P; return { th, ps, P, K: [P[0] + L2 * Math.sin(th), P[1] + L2 * Math.cos(th)], S: [P[0] - L1 * Math.sin(th), P[1] - L1 * Math.cos(th)], C: null, p: null }; };
    const HOLD = 3.2, REWIND = 5.5, LOADT = 1.6;
    function trebFrame(m, t) { // where in its cycle a machine is at time t: [frame, stone visible, machine time]
      let tm = m.hero ? (clickT < 0 ? -1 : t - clickT - FIRE_DELAY) : t - m.next;
      if (tm < 0) return [fr0, true, tm];
      if (tm <= tLast) { const fr = frameAt(frames, tm); if (tm > tRel) { const a = frameAt(frames, tm - 0.02), b = frameAt(frames, Math.min(tLast, tm + 0.02)); const vS = V(b.S[0] - a.S[0], b.S[1] - a.S[1], 0).multiplyScalar(25); const k = Math.exp(-(tm - tRel) * 1.6); const d = vS.multiplyScalar(-k).add(V(0, -9.8 * (1 - k), 0)).normalize(); const swing = 0.5 * Math.sin((tm - tRel) * 4) * (1 - k); const dx = d.x * Math.cos(swing) - d.y * Math.sin(swing), dy = d.x * Math.sin(swing) + d.y * Math.cos(swing); return [Object.assign({}, fr, { free: V(fr.S[0] + mc.L4 * dx, fr.S[1] + mc.L4 * dy, 0) }), false, tm]; } return [fr, true, tm]; }
      { const k = Math.exp(-(tm - tLast) * 0.8); const sw = 0.4 * Math.sin((tm - tLast) * 3.2) * k; const hang = { free: V(frEnd.S[0] + mc.L4 * Math.sin(sw) * 0.3, frEnd.S[1] - mc.L4 * Math.cos(sw * 0.3), 0) };
        if (m.hero || tm < tLast + HOLD) return [Object.assign({}, frEnd, hang), false, tm]; }
      if (tm < tLast + HOLD + REWIND) return [synthFrame(smooth((tm - tLast - HOLD) / REWIND)), false, tm];
      if (tm < tLast + HOLD + REWIND + LOADT) return [fr0, true, -1];
      m.next += m.period; m.landed = false; return [fr0, true, -1];
    }
    const machineSpots = [[0, 0, 0.12], [-6, -74, 0.3], [-58, 72, -0.02], [-92, 108, -0.08]];
    const machines = machineSpots.map(([x, z, yaw], i) => { const m = buildTreb(x, z, yaw); if (i > 1) { scene.remove(m.fb.userData.L); m.fb.userData.L = { position: new T.Vector3(), intensity: 0, distance: 0, userData: {} }; } m.hero = i === 0; m.period = [0, 19, 23, 27][i]; m.next = [0, 1.0, 9, 15][i]; m.fly = i ? 7.0 : 7.6; m.apex = i ? 55 : 46; m.landed = false; m.P0 = null; return m; });
    machines[0].target = E.clone(); machines[1].target = V(CX - OUT_T / 2 - 0.5, yOuter + 7, -61); machines[2].target = V(CX - OUT_T / 2 - 0.5, yOuter + 8, 40); machines[3].target = V(CX - OUT_T / 2 - 0.5, yOuter + 9, 100);
    { const relP = frameAt(frames, tRel - 0.02).p; machines.forEach((m) => { m.g.updateMatrixWorld(true); m.P0 = m.g.localToWorld(V(relP[0], relP[1] + 0.32, 0)); }); }
    const flightPos = (m, u) => V(m.P0.x + (m.target.x - m.P0.x) * u, m.P0.y + (m.target.y - m.P0.y) * u + 4 * m.apex * u * (1 - u), m.P0.z + (m.target.z - m.P0.z) * u);
    const flightVel = (m, u) => flightPos(m, Math.min(1, u + 0.004)).sub(flightPos(m, Math.max(0, u - 0.004))).multiplyScalar(1 / (0.008 * m.fly));
    const hero = machines[0];
    { const L = new T.PointLight(0xffb070, 1.3, 46, 1.4); L.position.set(-4, 7, 9); scene.add(L); }
    // the hero machine's glow while it waits for the click: a white outline round every timber, and a soft halo
    const outlineMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: T.BackSide, depthWrite: false, fog: false });
    const outlines = [];
    hero.g.traverse((o) => { if (!o.isMesh || o.material === outlineMat) return; const sh = new T.Mesh(o.geometry, outlineMat); const r = o.userData && o.userData.r ? o.userData.r : 0; if (r) { const k = Math.min(1.6, 1 + 0.08 / r); sh.scale.set(k, 1.004, k); } else sh.scale.setScalar(1.05); o.add(sh); outlines.push(sh); });
    const halos = [V(0, H * 0.55 * SCALE, 0), V(0, H * 1.0 * SCALE, 0), V(-bw * 1.2 * SCALE, H * 0.3 * SCALE, 0), V(bw * 1.2 * SCALE, H * 0.3 * SCALE, 0)].map((p) => { const s = sprite(whiteGlowTex, 26, 0xffffff, 0.09, true); s.position.copy(p).add(hero.g.position); scene.add(s); return s; });
    function setGlow(k) { outlineMat.opacity = 0.3 * k; outlines.forEach((o) => { o.visible = k > 0.01; }); halos.forEach((h, i) => { h.material.opacity = (i < 2 ? 0.1 : 0.06) * k; h.visible = k > 0.01; }); }

    stage(6);
    // ---- the lesser engines: onagers that lob stones into the wall from close in, and ballistae
    const shots = [];
    const stonePool = []; const stoneG = new T.SphereGeometry(0.42, 12, 10), stoneDark = new T.MeshStandardMaterial({ color: 0x3b3936, roughness: 1 });
    const boltPool = []; const boltG = new T.CylinderGeometry(0.035, 0.05, 2.4, 6); boltG.rotateX(Math.PI / 2);
    const getStone = () => { let s = stonePool.find((m) => !m.visible); if (!s) { s = shadowed(new T.Mesh(stoneG, stoneDark)); scene.add(s); stonePool.push(s); } s.visible = true; return s; };
    const getBolt = () => { let s = boltPool.find((m) => !m.visible); if (!s) { s = new T.Mesh(boltG, woodDark); scene.add(s); boltPool.push(s); } s.visible = true; return s; };
    for (let i = 0; i < 3; i++) fbPool.push(makeFireball(false));
    const getFire = () => { const s = fbPool.find((m) => !m.visible); if (s) s.visible = true; return s || null; };
    function launch(kind, p0, p1, dur, apex) { if (kind === 'fire' && !getFire()) kind = 'stone'; const mesh = kind === 'stone' ? getStone() : kind === 'bolt' ? getBolt() : fbPool.find((m) => m.visible && !shots.some((s) => s.mesh === m)); if (!mesh) return; mesh.position.copy(p0); shots.push({ kind, mesh, p0: p0.clone(), p1: p1.clone(), t0: simT, dur, apex }); }
    function impact(s) { const dir = s.p1.clone().sub(s.p0); dir.y = 0; dir.normalize();
      if (s.kind === 'stone') { chip(s.p1, 9, 1, dir.clone().multiplyScalar(-4)); puff(s.p1, rand(4, 6), 4, true, 0.8); hitBlocks(s.p1, 4.5, 0.6, dir.clone().multiplyScalar(-1)); emit(s.p1, 1.5, 0.5, 6, 1.2); }
      else if (s.kind === 'bolt') { chip(s.p1, 3, 0.5, dir.clone().multiplyScalar(-3)); puff(s.p1, 2, 1, true, 0.8); }
      else { makeFireAt(V(s.p1.x, s.p1.y + 0.3, s.p1.z), rand(2.4, 3.8)); emit(s.p1, 2, rand(1, 1.6), 30, 2.2); puff(s.p1, rand(5, 8), 4, false, 1.4); } }
    function tickShots(t, dt) {
      for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; const u = (t - s.t0) / s.dur;
        if (u >= 1) { if (s.kind === 'fire') hideFb(s.mesh); else s.mesh.visible = false; impact(s); shots.splice(i, 1); continue; }
        const p = V(s.p0.x + (s.p1.x - s.p0.x) * u, s.p0.y + (s.p1.y - s.p0.y) * u + 4 * s.apex * u * (1 - u), s.p0.z + (s.p1.z - s.p0.z) * u);
        const v = V((s.p1.x - s.p0.x) / s.dur, ((s.p1.y - s.p0.y) + 4 * s.apex * (1 - 2 * u)) / s.dur, (s.p1.z - s.p0.z) / s.dur);
        s.mesh.position.copy(p);
        if (s.kind === 'bolt') s.mesh.quaternion.setFromUnitVectors(V(0, 0, 1), v.clone().normalize());
        else if (s.kind === 'fire') { animateFireball(s.mesh, t, dt, v, false); if (Math.random() < 0.6) emit(p, 0.6, rand(0.5, 1.1), 1, 0.8); if (Math.random() < 0.25) puff(p, rand(1.5, 2.5), 1, false, 0.8); }
        else { s.mesh.rotation.x += 4 * dt; s.mesh.rotation.z += 3 * dt; } }
    }
    const onagers = [];
    function buildOnager(x, z, yaw, period, next, target) {
      const g = new T.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = yaw; scene.add(g);
      [-0.95, 0.95].forEach((zz) => { const b = box(5.2, 0.42, 0.42, woodDark); b.position.set(0, 0.5, zz); g.add(b); }); [-2.2, 0.6, 2.2].forEach((xx) => { const b = box(0.4, 0.4, 2.3, woodDark); b.position.set(xx, 0.5, 0); g.add(b); });
      [-0.95, 0.95].forEach((zz) => { g.add(timber(V(0.9, 0.7, zz), V(0.6, 3.5, zz), 0.16, woodMat)); g.add(timber(V(2.2, 0.7, zz), V(0.65, 3.3, zz), 0.12, woodDark)); });
      const bar = box(0.5, 0.5, 2.6, woodDark); bar.position.set(0.6, 3.5, 0); g.add(bar); const pad = box(0.6, 0.3, 1.2, clothMat(120, 90, 60)); pad.position.set(0.58, 3.5, 0); g.add(pad);
      const skein = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 2.4, 10), ropeMat); skein.rotation.x = Math.PI / 2; skein.position.set(-0.6, 0.75, 0); g.add(skein);
      const armG = new T.Group(); armG.position.set(-0.6, 0.75, 0); g.add(armG);
      armG.add(timber(V(0, 0, 0), V(0, 3.3, 0), 0.17, woodMat, 0.1)); const cup = new T.Mesh(new T.CylinderGeometry(0.42, 0.3, 0.35, 10, 1, true), ironMat); cup.position.set(0, 3.3, 0); armG.add(cup);
      const stone = shadowed(new T.Mesh(stoneG, stoneDark)); stone.position.set(0, 3.45, 0); armG.add(stone);
      { const wx = -2.6; [-1, 1].forEach((s) => g.add(timber(V(wx, 0.5, s * 1.1), V(wx, 1.6, s * 1.1), 0.1, woodMat))); const drum = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 2.4, 8), woodDark); drum.rotation.x = Math.PI / 2; drum.position.set(wx, 1.5, 0); g.add(drum); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; g.add(timber(V(wx + 0.2 * Math.cos(a), 1.5 + 0.2 * Math.sin(a), 1.2), V(wx + 0.9 * Math.cos(a), 1.5 + 0.9 * Math.sin(a), 1.2), 0.04, woodMat)); } }
      const o = { g, armG, stone, period, next, target, fired: false, cocked: 1.25, fwd: -0.35 }; armG.rotation.z = o.cocked; onagers.push(o); return o;
    }
    function tickOnagers(t) {
      onagers.forEach((o) => { const tm = t - o.next; let rot = o.cocked;
        if (tm < 0) { rot = o.cocked; o.stone.visible = true; }
        else if (tm < 0.22) { rot = o.cocked + (o.fwd - o.cocked) * easeOut(tm / 0.2); if (tm > 0.17 && !o.fired) { o.fired = true; o.stone.visible = false; o.g.updateMatrixWorld(true); const p0 = o.armG.localToWorld(V(0, 3.4, 0)); launch('stone', p0, o.target.clone().add(V(0, rand(-1.5, 2.5), rand(-4, 4))), rand(2.2, 2.8), rand(14, 22)); } }
        else if (tm < 1.2) rot = o.fwd + 0.1 * Math.sin((tm - 0.22) * 50) * Math.exp(-(tm - 0.22) * 6);
        else if (tm < o.period - 3.6) rot = o.fwd;
        else if (tm < o.period - 0.6) rot = o.fwd + (o.cocked - o.fwd) * smooth((tm - (o.period - 3.6)) / 3);
        else if (tm < o.period) { rot = o.cocked; o.stone.visible = true; }
        else { o.next += o.period; o.fired = false; rot = o.cocked; }
        o.armG.rotation.z = rot; });
    }
    [[118, -30, 0.1, 13, 1.0, -92], [152, 26, -0.05, 15, 4.5, 40], [138, 72, -0.2, 14, 7.5, 62], [168, -84, 0.15, 16, 11, -70]].forEach(([x, z, yaw, period, next, tz]) => buildOnager(x, z, yaw, period, next, V(CX - OUT_T / 2 - 0.3, yOuter + rand(5, 10), tz)));
    const ballistae = [];
    function buildBallista(x, z, yaw, period, next, target) {
      const g = new T.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = yaw; scene.add(g);
      const stock = box(3.4, 0.3, 0.4, woodDark); stock.position.set(0.2, 1.35, 0); g.add(stock);
      [[0.6, 0.8], [-0.5, 0.8], [0, -0.9]].forEach(([dx, dz]) => g.add(timber(V(dx, 0, dz), V(0, 1.25, 0), 0.1, woodMat)));
      [-1, 1].forEach((s) => { const post = box(0.45, 1.5, 0.45, woodMat); post.position.set(1.6, 1.4, s * 0.75); g.add(post); const sk = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 1.3, 8), ropeMat); sk.position.set(1.6, 1.4, s * 0.75); g.add(sk); });
      const arms = [-1, 1].map((s) => { const a = new T.Group(); a.position.set(1.6, 1.4, s * 0.75); g.add(a); a.add(timber(V(0, 0, 0), V(0, 0, s * 1.5), 0.08, woodMat, 0.05)); a.userData.s = s; return a; });
      const bolt = new T.Mesh(boltG, woodDark); bolt.position.set(0.9, 1.55, 0); g.add(bolt);
      const b = { g, arms, bolt, period, next, target, fired: false }; ballistae.push(b); return b;
    }
    function tickBallistae(t) {
      ballistae.forEach((b) => { const tm = t - b.next; let k = 0; // 0 drawn back, 1 released
        if (tm < 0) { k = 0; b.bolt.visible = true; }
        else if (tm < 0.12) { k = easeOut(tm / 0.1); if (!b.fired && tm > 0.06) { b.fired = true; b.bolt.visible = false; b.g.updateMatrixWorld(true); const p0 = b.g.localToWorld(V(2.2, 1.55, 0)); launch('bolt', p0, b.target.clone().add(V(0, rand(-1, 2), rand(-3, 3))), rand(1.3, 1.6), rand(2, 5)); } }
        else if (tm < b.period - 3) k = 1;
        else if (tm < b.period - 0.5) k = 1 - smooth((tm - (b.period - 3)) / 2.5);
        else if (tm < b.period) { k = 0; b.bolt.visible = true; }
        else { b.next += b.period; b.fired = false; }
        b.arms.forEach((a) => { a.rotation.y = a.userData.s * (-0.75 + 0.75 * k); }); });
    }
    [[104, -48, 0.2, 9, 2.5, -98], [126, 48, -0.1, 11, 5, 36], [98, 10, 0.05, 10, 8, 10], [142, -104, 0.2, 12, 3.5, 100]].forEach(([x, z, yaw, period, next, tz]) => buildBallista(x, z, yaw, period, next, V(CX - OUT_T / 2 - 0.3, yOuter + rand(6, 13), tz)));

    // ---- arrows, both ways, and fire lobbed back from the walls
    const N_ARR = 800; const arrowMesh = new T.InstancedMesh(new T.BoxGeometry(0.05, 0.05, 0.95), new T.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }), N_ARR); arrowMesh.frustumCulled = false; scene.add(arrowMesh);
    const arrows = []; for (let i = 0; i < N_ARR; i++) arrows.push({ on: false }); let arrI = 0;
    { const M = new T.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < N_ARR; i++) arrowMesh.setMatrixAt(i, M); arrowMesh.instanceMatrix.needsUpdate = true; }
    const Z1 = V(0, 0, 1);
    function volley(fx, fz, fy, tx, tz, ty, n, sf, st, dur) { for (let k = 0; k < n; k++) { const a = arrows[arrI++ % N_ARR]; a.on = true; a.p0 = V(fx + rand(-sf, sf), fy, fz + rand(-sf, sf)); a.p1 = V(tx + rand(-st, st), 0, tz + rand(-st, st)); a.p1.y = ty == null ? gy(a.p1.x, a.p1.z) + 1 : ty; a.t0 = simT + rand(0, 0.35); a.dur = dur * rand(0.9, 1.1); a.apex = rand(10, 18); } }
    function tickArrows(t) { const M = new T.Matrix4(), q = new T.Quaternion(), s3 = V(1, 1, 1), p = new T.Vector3(), v = new T.Vector3();
      arrows.forEach((a, i) => { if (!a.on) return; const u = (t - a.t0) / a.dur; if (u < 0) return; if (u >= 1) { a.on = false; M.makeScale(0, 0, 0); arrowMesh.setMatrixAt(i, M); return; }
        p.set(a.p0.x + (a.p1.x - a.p0.x) * u, a.p0.y + (a.p1.y - a.p0.y) * u + 4 * a.apex * u * (1 - u), a.p0.z + (a.p1.z - a.p0.z) * u);
        v.set(a.p1.x - a.p0.x, (a.p1.y - a.p0.y) + 4 * a.apex * (1 - 2 * u), a.p1.z - a.p0.z).normalize(); q.setFromUnitVectors(Z1, v); M.compose(p, q, s3); arrowMesh.setMatrixAt(i, M); });
      arrowMesh.instanceMatrix.needsUpdate = true; }
    let nextVolleyA = 0.6, nextVolleyD = 1.1, nextWallFire = 0.9;
    function tickDefenders(t) {
      if (t > nextVolleyA) { nextVolleyA = t + rand(1.1, 1.9); const z = rand(-100, 100); volley(rand(130, 165), z, 1.6, CX - 1, z + rand(-10, 10), yOuter + OUT_H + 1.5, Math.round(rand(35, 70)), 14, 9, rand(2.0, 2.4)); }
      if (t > nextVolleyD) { nextVolleyD = t + rand(0.9, 1.6); const z = rand(-100, 100); volley(CX - 2, z, yOuter + OUT_H + 1.6, rand(140, 200), z + rand(-20, 20), null, Math.round(rand(22, 45)), 12, 14, rand(1.8, 2.3)); }
      if (t > nextWallFire) { nextWallFire = t + rand(0.55, 1.2); let z; do { z = rand(-105, 105); } while ((z > 42 && z < 82) || Math.abs(z) < 24 || Math.abs(z + 28) < 36); /* never from the bowman's tower: his view must stay clear */ const p0 = V(CX - 3, yOuter + OUT_H + 2.5, z); const p1 = V(rand(40, 205), 0, rand(-115, 115)); p1.y = gy(p1.x, p1.z) + 0.2; launch(Math.random() < 0.75 ? 'fire' : 'stone', p0, p1, rand(2.8, 3.6), rand(24, 36)); }
    }

    stage(7);
    // ---- the armies: instanced soldiers in ranks, crews, archers, a shield wall at the breach with the defenders
    //      meeting it, men on the walls, riders on their horses, the fallen before the walls, and a few hundred walking the camp
    const N_SOLD = 1500, N_HORSE = 90;
    const bodyG = new T.CylinderGeometry(0.27, 0.33, 1.25, 8), headG = new T.SphereGeometry(0.17, 8, 7), helmG = new T.ConeGeometry(0.21, 0.32, 8), spearG = new T.CylinderGeometry(0.03, 0.03, 2.7, 4), shieldG = new T.CylinderGeometry(0.44, 0.44, 0.06, 12), cloakG = new T.ConeGeometry(0.42, 1.0, 8, 1, true), bowG = new T.TorusGeometry(0.62, 0.025, 5, 12, Math.PI);
    const bodyM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), helmM = new T.MeshStandardMaterial({ color: 0x4e5257, roughness: 0.55, metalness: 0.6 }), shieldM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), cloakM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: T.DoubleSide });
    const bodies = new T.InstancedMesh(bodyG, bodyM, N_SOLD), heads = new T.InstancedMesh(headG, skinMat, N_SOLD), helms = new T.InstancedMesh(helmG, helmM, N_SOLD), spears = new T.InstancedMesh(spearG, ironMat, N_SOLD), shields = new T.InstancedMesh(shieldG, shieldM, N_SOLD), cloaks = new T.InstancedMesh(cloakG, cloakM, N_SOLD), bows = new T.InstancedMesh(bowG, woodDark, N_SOLD);
    const soldiers = []; const c3 = new T.Color();
    const clothA = [0x3e3328, 0x2a2830, 0x4a2820, 0x33404a, 0x4d4330, 0x202a34, 0x5a2420, 0x44463a], clothD = [0x2a3450, 0x3a3a44, 0x27324a, 0x40303a];
    function addSoldier(x, z, ry, o) { if (soldiers.length >= N_SOLD) return null; o = o || {}; const s = { x, z, y: o.y != null ? o.y : gy(x, z) + (o.dy || 0), ry, ph: rand(0, 6), h: rand(0.9, 1.1), spear: o.spear != null ? o.spear : Math.random() < 0.6, shield: o.shield != null ? o.shield : Math.random() < 0.45, cloak: o.cloak != null ? o.cloak : Math.random() < 0.3, bow: !!o.bow, walker: !!o.walker, fallen: !!o.fallen, mounted: !!o.mounted, fight: !!o.fight, tx: x, tz: z, wait: rand(0, 4), speed: rand(0.8, 1.3), live: !!(o.walker || o.fight || o.mounted) };
      if (s.bow) { s.spear = false; s.shield = false; } soldiers.push(s); const j = soldiers.length - 1; const pal = o.defender ? clothD : clothA; c3.setHex(pal[j % pal.length]).offsetHSL(0, 0, rand(-0.06, 0.06)); bodies.setColorAt(j, c3.clone().convertSRGBToLinear()); shields.setColorAt(j, (Math.random() < 0.45 ? c3.clone().setHex(o.defender ? 0x2a3550 : 0x6a2a22).offsetHSL(0, 0, rand(-0.05, 0.05)) : c3.clone().offsetHSL(rand(-0.06, 0.06), 0.05, -0.03)).convertSRGBToLinear()); cloaks.setColorAt(j, c3.clone().offsetHSL(rand(-0.1, 0.1), 0, -0.06).convertSRGBToLinear()); return s; }
    const FACE_CASTLE = Math.PI / 2, FACE_CAMP = -Math.PI / 2;
    function block(x0, z0, cols, rows, ry, o) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const dx = r * 1.4 + rand(-0.15, 0.15), dz = c * 1.15 + rand(-0.15, 0.15); const a = ry - Math.PI / 2; addSoldier(x0 + dx * Math.cos(a) - dz * Math.sin(a), z0 + dx * Math.sin(a) + dz * Math.cos(a), ry + rand(-0.08, 0.08), o); } }
    // crews at the machines, on the decks and round them
    machines.forEach((m) => { m.g.updateMatrixWorld(true); for (let i = 0; i < 15; i++) { const a = rand(0.5, 2 * Math.PI - 0.5), r = rand(5.5, 8.5) * SCALE; const p = m.g.localToWorld(V(-1.5 + r * Math.cos(a) / SCALE, 0, r * Math.sin(a) / SCALE)); if (Math.abs(p.z - m.g.position.z) < 2.2 && p.x > m.g.position.x) continue; addSoldier(p.x, p.z, a + Math.PI - m.g.rotation.y, { spear: false, shield: false }); } [[-1.8 * bw, zf + 0.6], [-0.6 * bw, zf + 0.6], [0.8 * bw, -zf - 0.6], [-1.4 * bw, -zf - 0.6]].forEach(([lx, lz]) => { const p = m.g.localToWorld(V(lx, 0, lz)); addSoldier(p.x, p.z, rand(0, 6), { y: p.y + 0.42 * SCALE, spear: false, shield: false, cloak: false }); }); });
    // the camp: men round the fires and walking the lines
    fires.forEach((f, i) => { for (let k = 0; k < (i ? 7 : 11); k++) { const a = rand(0, Math.PI * 2), r = rand(2.5, 5); addSoldier(f.x + r * Math.cos(a), f.z + r * Math.sin(a), a + Math.PI, { spear: false }); } });
    for (let i = 0; i < 110; i++) { const x = rand(-165, 45), z = rand(-125, 125); if (Math.abs(x) < 16 && Math.abs(z) < 9) continue; addSoldier(x, z, rand(0, 6.3), { walker: true }); }
    // the field: ranks of infantry in the middle ground, archers behind, the force at the breach and the defenders in it, the fallen
    [[58, -70, 16, 5], [60, -28, 16, 5], [62, 16, 16, 5], [66, 64, 14, 4], [98, -96, 12, 4], [102, -48, 14, 5], [104, 6, 14, 5], [108, 52, 12, 4], [150, -66, 12, 4], [150, -8, 12, 4], [152, 36, 12, 4], [178, -36, 10, 3], [182, 8, 10, 3]].forEach(([x, z, c, r]) => block(x, z, c, r, FACE_CASTLE + rand(-0.1, 0.1), { spear: true }));
    [[133, -80, 14, 3], [138, 16, 14, 3], [136, 70, 12, 3], [120, -20, 12, 2]].forEach(([x, z, c, r]) => block(x, z, c, r, FACE_CASTLE, { bow: true, cloak: true }));
    block(196, 48, 10, 3, FACE_CASTLE + 0.1, { spear: true, shield: true, fight: true }); block(200, 62, 9, 3, FACE_CASTLE, { spear: true, shield: true, fight: true }); block(208, 56, 6, 2, FACE_CASTLE + 0.2, { spear: true, fight: true });
    block(224, 52, 6, 3, FACE_CAMP, { spear: true, shield: true, fight: true, defender: true }); block(226, 66, 5, 3, FACE_CAMP - 0.2, { spear: true, fight: true, defender: true });
    for (let i = 0; i < 70; i++) { const x = rand(165, 228), z = rand(-120, 120); if (z > 44 && z < 80 && x > 200) continue; addSoldier(x, z, rand(0, 6.3), { fallen: true, spear: Math.random() < 0.4, shield: Math.random() < 0.5 }); }
    for (let i = 0; i < 24; i++) addSoldier(rand(150, 215), rand(-110, 110), rand(0, 6.3), { fallen: true, defender: true });
    // on the walls: defenders on the outer and inner wall walks and the tower tops, two beside the bowman's place
    for (let z = -108; z < 158; z += 5.5) { if ((z > 42 && z < 82) || Math.abs(z) < 24) continue; addSoldier(CX - 0.6, z + rand(-1, 1), FACE_CAMP + rand(-0.2, 0.2), { y: yOuter + OUT_H - 0.05, bow: Math.random() < 0.6, defender: true }); }
    for (let z = -110; z < 112; z += 9) addSoldier(IX - 0.4, z + rand(-1, 1), FACE_CAMP, { y: yInner + IN_H - 0.05, bow: Math.random() < 0.5, defender: true });
    [-160, -112, -72, 72, 160, 28].forEach((z) => { const tw = towers[z]; for (let k = 0; k < 3; k++) { const a = Math.PI + rand(-0.8, 0.8), rr = tw.r - 1.2; addSoldier(tw.x + rr * Math.cos(a), tw.z + rr * Math.sin(a), FACE_CAMP + rand(-0.3, 0.3), { y: tw.deck, bow: true, defender: true }); } });
    [Math.PI - 0.52, Math.PI + 0.62].forEach((a) => { const tw = povTower, rr = tw.r - 1.2; addSoldier(tw.x + rr * Math.cos(a), tw.z + rr * Math.sin(a), FACE_CAMP + (a - Math.PI) * 0.6, { y: tw.deck, bow: true, defender: true }); });
    // horse: body, neck, head and legs, each instanced; a rider on each
    const hBodyG = new T.BoxGeometry(1.9, 0.95, 0.72), hNeckG = new T.BoxGeometry(0.55, 1.0, 0.42), hHeadG = new T.BoxGeometry(0.7, 0.32, 0.3), hLegG = new T.CylinderGeometry(0.07, 0.09, 1.1, 6);
    { const p = hBodyG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * (1 - 0.12 * Math.abs(p.getX(i)) / 0.95)); } hBodyG.computeVertexNormals(); }
    const hM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const hBodies = new T.InstancedMesh(hBodyG, hM, N_HORSE), hNecks = new T.InstancedMesh(hNeckG, hM, N_HORSE), hHeads = new T.InstancedMesh(hHeadG, hM, N_HORSE), hLegs = new T.InstancedMesh(hLegG, hM, N_HORSE * 4);
    const horses = []; const coats = [0x4a3424, 0x2a211b, 0x6b4a32, 0x8a7a6a, 0x3b2d22, 0x5a4030];
    function addHorse(x, z, ry) { if (horses.length >= N_HORSE) return; const h = { x, z, y: gy(x, z), ry, ph: rand(0, 6) }; horses.push(h); const j = horses.length - 1; c3.setHex(coats[j % coats.length]).offsetHSL(0, 0, rand(-0.05, 0.05)).convertSRGBToLinear(); hBodies.setColorAt(j, c3); hNecks.setColorAt(j, c3); hHeads.setColorAt(j, c3); for (let k = 0; k < 4; k++) hLegs.setColorAt(4 * j + k, c3); addSoldier(x, z, ry, { mounted: true, dy: 1.42, spear: true, shield: Math.random() < 0.5, cloak: true }); }
    [[80, -108, 18], [78, 114, 18], [34, -96, 12], [30, 102, 12], [124, -118, 10], [120, 120, 10], [172, 100, 8]].forEach(([x0, z0, n]) => { for (let i = 0; i < n; i++) { const c = i % 6, r = Math.floor(i / 6); addHorse(x0 + r * 3.2 + rand(-0.4, 0.4), z0 + c * 2.4 + rand(-0.3, 0.3), FACE_CASTLE + rand(-0.15, 0.15)); } });
    [bodies, heads, helms, spears, shields, cloaks, bows].forEach((m) => { m.count = soldiers.length; m.frustumCulled = false; m.castShadow = true; scene.add(m); });
    [hBodies, hNecks, hHeads].forEach((m) => { m.count = horses.length; m.frustumCulled = false; m.castShadow = true; scene.add(m); }); hLegs.count = horses.length * 4; hLegs.frustumCulled = false; scene.add(hLegs);
    const ZERO = new T.Matrix4().makeScale(0, 0, 0);
    function poseHorses(t) { const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s3 = V(1, 1, 1), p = new T.Vector3();
      horses.forEach((h, i) => { const a = h.ry - Math.PI / 2; const ca = Math.cos(a), sa = Math.sin(a); const loc = (lx, ly, lz) => p.set(h.x + lx * ca + lz * sa, h.y + ly, h.z - lx * sa + lz * ca);
        e.set(0, a, 0.02 * Math.sin(t * 0.8 + h.ph)); q.setFromEuler(e); M.compose(loc(0, 1.35, 0), q, s3); hBodies.setMatrixAt(i, M);
        e.set(0, a, -0.75 + 0.04 * Math.sin(t * 1.1 + h.ph)); q.setFromEuler(e); M.compose(loc(1.05, 1.95, 0), q, s3); hNecks.setMatrixAt(i, M);
        e.set(0, a, -0.1 + 0.05 * Math.sin(t * 1.1 + h.ph)); q.setFromEuler(e); M.compose(loc(1.55, 2.3, 0), q, s3); hHeads.setMatrixAt(i, M);
        e.set(0, a, 0); q.setFromEuler(e); [[0.7, 0.28], [0.7, -0.28], [-0.7, 0.28], [-0.7, -0.28]].forEach(([lx, lz], k) => { M.compose(loc(lx, 0.55, lz), q, s3); hLegs.setMatrixAt(4 * i + k, M); }); });
      [hBodies, hNecks, hHeads, hLegs].forEach((m) => { m.instanceMatrix.needsUpdate = true; }); }
    function poseSoldiers(t, dt, all) {
      const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s3 = new T.Vector3(), p = new T.Vector3();
      soldiers.forEach((s, i) => {
        if (!all && !s.live) return;
        let bob = 0;
        if (s.walker) { if (s.wait > 0) s.wait -= dt; else { const dx = s.tx - s.x, dz = s.tz - s.z, dd = Math.hypot(dx, dz); if (dd < 0.6) { let nx, nz, tries = 0; do { nx = s.x + rand(-25, 25); nz = s.z + rand(-25, 25); tries++; } while (tries < 8 && ((Math.abs(nx) < 18 && Math.abs(nz) < 10) || nx > 55 || nx < -175 || Math.abs(nz) > 130)); s.tx = nx; s.tz = nz; s.wait = rand(0.5, 5); } else { const st = s.speed * dt; s.x += dx / dd * st; s.z += dz / dd * st; s.y = gy(s.x, s.z); s.ry = Math.atan2(-dz, dx) + Math.PI / 2; bob = 0.06 * Math.abs(Math.sin(t * 7 + s.ph)); } } }
        if (s.fallen) { e.set(Math.PI / 2, 0, s.ry); q.setFromEuler(e); const hx = -Math.sin(s.ry), hz = Math.cos(s.ry); M.compose(p.set(s.x, s.y + 0.3, s.z), q, s3.set(1, s.h, 1)); bodies.setMatrixAt(i, M); M.compose(p.set(s.x + 0.78 * hx, s.y + 0.17, s.z + 0.78 * hz), q, s3.set(1, 1, 1)); heads.setMatrixAt(i, M); helms.setMatrixAt(i, ZERO); cloaks.setMatrixAt(i, ZERO); bows.setMatrixAt(i, ZERO); if (s.spear) { e.set(Math.PI / 2, 0, s.ry + 0.7); q.setFromEuler(e); M.compose(p.set(s.x + 0.6 * hz, s.y + 0.05, s.z - 0.6 * hx), q, s3.set(1, 1, 1)); spears.setMatrixAt(i, M); } else spears.setMatrixAt(i, ZERO); if (s.shield) { e.set(0.15, s.ry, 0); q.setFromEuler(e); M.compose(p.set(s.x - 0.7 * hz, s.y + 0.08, s.z + 0.7 * hx), q, s3.set(1, 1, 1)); shields.setMatrixAt(i, M); } else shields.setMatrixAt(i, ZERO); return; }
        const fight = s.fight ? Math.max(0, Math.sin(t * 5.5 + s.ph)) : 0;
        const sway = 0.03 * Math.sin(t * 1.3 + s.ph) + 0.18 * fight; const yaw = s.ry + (s.walker || s.mounted ? 0 : 0.08 * Math.sin(t * 0.7 + s.ph)) + 0.15 * fight * Math.sin(t * 3 + s.ph);
        const lunge = 0.35 * fight; const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw); const bx = s.x + lunge * fx, bz = s.z + lunge * fz;
        e.set(sway, yaw, 0); q.setFromEuler(e);
        M.compose(p.set(bx, s.y + 0.62 * s.h + bob, bz), q, s3.set(1, s.h, 1)); bodies.setMatrixAt(i, M);
        M.compose(p.set(bx, s.y + 1.42 * s.h + bob, bz), q, s3.set(1, 1, 1)); heads.setMatrixAt(i, M);
        M.compose(p.set(bx, s.y + 1.62 * s.h + bob, bz), q, s3.set(1, 1, 1)); helms.setMatrixAt(i, M);
        if (s.cloak) { M.compose(p.set(bx, s.y + 0.85 * s.h + bob, bz), q, s3.set(1, 1, 1)); cloaks.setMatrixAt(i, M); } else cloaks.setMatrixAt(i, ZERO);
        if (s.spear) { const thrust = s.fight ? 0.6 * fight : 0; if (s.fight) { e.set(Math.PI / 2 - 0.2, 0, -yaw); q.setFromEuler(e); } M.compose(p.set(bx + (0.3 + thrust) * fx + 0.25 * rx, s.y + (s.fight ? 1.15 : 1.35) + bob, bz + (0.3 + thrust) * fz + 0.25 * rz), q, s3.set(1, 1, 1)); spears.setMatrixAt(i, M); if (s.fight) { e.set(sway, yaw, 0); q.setFromEuler(e); } } else spears.setMatrixAt(i, ZERO);
        if (s.shield) { e.set(Math.PI / 2, 0, -yaw); q.setFromEuler(e); M.compose(p.set(bx + 0.4 * fx - 0.12 * rx, s.y + 0.9 + bob, bz + 0.4 * fz - 0.12 * rz), q, s3.set(1, 1, 1)); shields.setMatrixAt(i, M); } else shields.setMatrixAt(i, ZERO);
        if (s.bow) { e.set(0, yaw - Math.PI / 2, Math.PI / 2); q.setFromEuler(e); M.compose(p.set(bx + 0.45 * fx, s.y + 1.2 + bob, bz + 0.45 * fz), q, s3.set(1, 1, 1)); bows.setMatrixAt(i, M); } else bows.setMatrixAt(i, ZERO); });
      [bodies, heads, helms, spears, shields, cloaks, bows].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    }

    stage(8);
    // ---- the bowman's view: a drawn bow, the arrow and his hands, carried in front of the camera
    const pov = new T.Group(); pov.visible = false; scene.add(pov);
    const bowMat = new T.MeshStandardMaterial({ color: lin(0x3a2a1c), roughness: 0.8 }), stringMat = new T.MeshBasicMaterial({ color: lin(0xd8d0b8) }), sleeveMat = new T.MeshStandardMaterial({ color: lin(0x3b3a44), roughness: 1 });
    const povParts = {};
    { // the bow: stave in a vertical plane ahead of the left hand, string drawn back to the right hand at the cheek, the arrow resting over the hand
      const curve = new T.QuadraticBezierCurve3(V(-0.05, -0.62, -0.46), V(-0.05, -0.08, -0.72), V(-0.05, 0.5, -0.46)); const stave = new T.Mesh(new T.TubeGeometry(curve, 24, 0.014, 7, false), bowMat); pov.add(stave);
      const grip = new T.Mesh(new T.CylinderGeometry(0.026, 0.026, 0.15, 8), new T.MeshStandardMaterial({ color: lin(0x2a1c12), roughness: 1 })); grip.position.set(-0.05, -0.07, -0.68); pov.add(grip);
      const nock = V(0.075, -0.035, -0.19), tipU = V(-0.05, 0.5, -0.46), tipL = V(-0.05, -0.62, -0.46), rest = V(-0.05, -0.06, -0.52);
      povParts.strU = timber(tipU, nock, 0.0022, stringMat, 0.0022, false); povParts.strL = timber(tipL, nock, 0.0022, stringMat, 0.0022, false); pov.add(povParts.strU, povParts.strL);
      povParts.nock = nock; povParts.tipU = tipU; povParts.tipL = tipL; povParts.rest = rest;
      const dir = V(-0.02 - nock.x, -0.015 - nock.y, -0.66 - nock.z).normalize(); const head = nock.clone().addScaledVector(dir, 0.8);
      povParts.arrow = new T.Group(); pov.add(povParts.arrow);
      const shaft = timber(nock, head, 0.0055, new T.MeshStandardMaterial({ color: lin(0x8a7450), roughness: 0.9 }), 0.0055, false); const pt = new T.Mesh(new T.ConeGeometry(0.012, 0.05, 6), ironMat); pt.position.copy(head); pt.quaternion.setFromUnitVectors(UP, dir); povParts.arrow.add(shaft, pt);
      for (let k = 0; k < 3; k++) { const f = new T.Mesh(new T.PlaneGeometry(0.06, 0.018), new T.MeshStandardMaterial({ color: lin(0xcfc6b4), side: T.DoubleSide })); f.position.copy(nock).addScaledVector(dir, 0.05); f.quaternion.setFromUnitVectors(V(1, 0, 0), dir); f.rotateX(k * 2.09); f.translateY(0.01); povParts.arrow.add(f); }
      // left hand round the grip, the arrow riding over the knuckle; the forearm runs down and left to an elbow out of frame, a leather bracer at the wrist
      const handL = new T.Mesh(new T.SphereGeometry(0.046, 10, 8), skinMat); handL.position.set(-0.055, -0.075, -0.665); handL.scale.set(1.1, 1.25, 0.95); pov.add(handL);
      const thumb = new T.Mesh(new T.CylinderGeometry(0.011, 0.01, 0.06, 6), skinMat); thumb.position.set(-0.025, -0.035, -0.655); thumb.rotation.z = -0.9; thumb.rotation.x = 0.4; pov.add(thumb);
      pov.add(timber(V(-0.065, -0.095, -0.655), V(-0.3, -0.4, -0.22), 0.036, sleeveMat, 0.046, false));
      pov.add(timber(V(-0.08, -0.115, -0.63), V(-0.15, -0.2, -0.52), 0.04, new T.MeshStandardMaterial({ color: lin(0x4a3222), roughness: 0.9 }), 0.042, false));
      // right hand at the string, by the cheek, mostly below the frame
      const handR = new T.Mesh(new T.SphereGeometry(0.044, 10, 8), skinMat); handR.position.set(0.1, -0.115, -0.2); pov.add(handR);
      pov.add(timber(V(0.1, -0.13, -0.2), V(0.38, -0.46, 0.02), 0.04, sleeveMat, 0.05, false)); }
    const closeIn0 = (u) => ease((u - 0.1) / 0.3);
    const capPitch = (pos, lk, maxDeg) => { const dy = lk.y - pos.y, hz = Math.hypot(lk.x - pos.x, lk.z - pos.z); const maxY = hz * Math.tan(maxDeg * Math.PI / 180); if (dy > maxY) lk.y = pos.y + maxY; };
    const lookQuat = (() => { const m = new T.Matrix4(); return (pos, target, q) => { m.lookAt(pos, target, UP); return (q || new T.Quaternion()).setFromRotationMatrix(m); }; })();
    const aimPoint = V(E.x + 60 * Math.cos(POV_A), E.y - 10.5, E.z + 60 * Math.sin(POV_A)); // out through the crenel, down at the ranks before the wall

    // ---- the shot: clocks, the click, the camera's path
    const camIdleA = V(-24, 6, 52), lookIdleA = V(30, 15, -8);
    const camIdleB = V(-19, 5.5, 45), lookIdleB = V(28, 16, -9);
    const camLaunch = V(-21, 7, 48), lookLaunch = V(30, 19, -8);
    const camPos = camIdleA.clone(), look = lookIdleA.clone(), camQ = new T.Quaternion();
    cam.position.copy(camPos); cam.lookAt(look); camQ.copy(cam.quaternion);
    const FIRE_DELAY = 2.2; // the beat between the click and the release of the trigger
    let simT = 0, clickT = -1, impactAt = -1, last = 0, shake = 0, clickPos = null, clickLook = null, loosed = false, glow = 1;
    const hitBox = new T.Mesh(new T.BoxGeometry(2 * bw * 2.8 * SCALE, H * 1.6 * SCALE, 2 * zf * 3.4 * SCALE), new T.MeshBasicMaterial({ visible: false })); hitBox.position.set(-1, H * 0.75 * SCALE, 0); scene.add(hitBox);
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const overMachine = (ev) => { const r = canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObject(hitBox).length > 0; };
    function fire() { if (state !== 'idle') return; state = 'playing'; clickT = simT; clickPos = camPos.clone(); clickLook = look.clone(); if (hint) hint.classList.remove('show'); ov.classList.remove('hover'); }
    canvas.addEventListener('mousemove', (ev) => { if (state === 'idle') ov.classList.toggle('hover', overMachine(ev)); });
    canvas.addEventListener('click', (ev) => { if (state === 'idle' && overMachine(ev)) fire(); });
    window.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && state === 'idle') { e.preventDefault(); fire(); } });
    window.trebIntroFire = fire;
    state = 'idle'; clearTimeout(guard); if (word) word.classList.add('off'); ov.classList.add('playing');
    setTimeout(() => { if (state === 'idle' && hint) hint.classList.add('show'); }, 2500);
    window.trebIntroSeek = (sec) => { if (clickT < 0) fire(); simT = clickT + sec; };
    poseSoldiers(0, 0, true); poseHorses(0); stage(9);
    if (LOWFX) { const keep = [hero.fb.userData.L]; scene.traverse((o) => { if (o.isPointLight && keep.indexOf(o) < 0) o.userData.dead = true; }); scene.children.filter((o) => o.isPointLight && o.userData.dead).forEach((o) => scene.remove(o)); }
    const tmpQ = new T.Quaternion(), tmpQ2 = new T.Quaternion();

    let frN = 0, frAcc = 0; const DBG = /[?&#]introdbg\b/.test(location.search + location.hash);
    function frame(now) {
      const T0 = performance.now(); const tm0 = {};
      const dtReal = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      // the shot clock (the slow-motion beat at the top of the flight is kept behind SLOWMO)
      let rate = 1;
      if (SLOWMO && clickT >= 0) { const tm = simT - clickT - FIRE_DELAY; const u = (tm - tRel) / hero.fly; if (u > 0.4 && u < 0.6) rate = 0.2 + 0.8 * smooth((Math.abs(u - 0.5) - 0.035) / 0.03); }
      const dt = dtReal * rate; simT += dt; const t = simT;
      // machines: pose on the model's frames, the burning stones waiting, flying, landing
      let heroBall = null, heroVel = null;
      machines.forEach((m) => {
        const [fr, stoneVis, tm] = trebFrame(m, t);
        const stoneP = poseTreb(m, fr, stoneVis && !(tm > tRel));
        const released = tm > tRel; const u = released ? (tm - tRel) / m.fly : 0;
        if (!released) { if (stoneP) { m.fb.position.copy(stoneP); m.fb.visible = true; const lit2 = tm > -0.2; animateFireball(m.fb, t, dt, null, !lit2, lit2 ? 0.6 + 0.4 * clamp(tm / 0.4, 0, 1) : 1); if (Math.random() < (lit2 ? 0.5 : 0.12)) emit(m.fb.position, 0.4, rand(0.3, 0.6), 1, 0.5); } else hideFb(m.fb); }
        else if (u < 1) { const p = flightPos(m, u), v = flightVel(m, u); m.fb.position.copy(p); m.fb.visible = true; animateFireball(m.fb, t, dt, v, false, m.hero ? 1.15 : 1); if (Math.random() < 0.95) emit(p, 0.9, rand(0.8, 1.6), m.hero ? 3 : 1, 1, v.clone().multiplyScalar(-0.05)); if (Math.random() < 0.5) puff(p, rand(2, 3.5), 1, false, 0.8); if (m.hero) { heroBall = p; heroVel = v; } }
        else { hideFb(m.fb); if (!m.landed) { m.landed = true; const dir = m.target.clone().sub(m.P0); dir.y = 0; dir.normalize();
            if (m.hero) { impactAt = t; shake = 1; makeFire(V(E.x, E.y - 1.2, E.z), 5, 4, 3, 60, 8); emit(E, 2, 1.5, 60, 3); end(false, 0); }
            else { emit(m.target, 4, rand(1.5, 3), 40, 2.5); puff(m.target, 9, 7, true, 0.9); chip(m.target, 14, 1.3, dir.clone().multiplyScalar(-6)); hitBlocks(m.target, 9, 1.0, dir.clone().multiplyScalar(-1)); makeFireAt(V(m.target.x - 1, m.target.y + 1, m.target.z), rand(2.5, 4)); } } }
      });
      tm0.machines = performance.now() - T0;
      // the lesser engines, the defenders' fire and arrows, everything in flight
      tickOnagers(t); tickBallistae(t); tickDefenders(t); tickShots(t, dt); tickArrows(t); tickBlocks(dt);
      tm0.engines = performance.now() - T0;
      // the hero machine's glow
      if (clickT < 0) glow = 0.5 + 0.3 * Math.sin(t * 2.2); else glow = Math.max(0, glow - dtReal * 3.5); setGlow(glow);
      // camera
      let fov = 48, kw = 0;
      if (clickT < 0) {
        const w = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 46);
        camPos.lerpVectors(camIdleA, camIdleB, w); look.lerpVectors(lookIdleA, lookIdleB, w);
        camPos.x += 0.1 * Math.sin(t * 0.9); camPos.y += 0.06 * Math.sin(t * 1.3);
        lookQuat(camPos, look, camQ);
      } else {
        const ts = t - clickT, tRelease = FIRE_DELAY + tRel;
        if (ts < tRelease - 1.0) { const k = smooth(ts / 1.6); camPos.lerpVectors(clickPos, camLaunch, k); look.lerpVectors(clickLook, lookLaunch, k); camPos.x += 0.06 * Math.sin(t * 0.9); lookQuat(camPos, look, camQ); }
        else {
          const u = (ts - tRelease) / hero.fly;
          const ball = heroBall || (hero.fb.visible ? hero.fb.position.clone() : flightPos(hero, clamp(u, 0, 1)));
          const vel = heroVel || flightVel(hero, clamp(u, 0, 1));
          const dir = vel.clone().normalize(); const side = V(-dir.z, 0, dir.x).normalize();
          // lifting off from the camp, a second before the release, so the move is already under way when the beam goes
          const uf = smooth((ts - (tRelease - 1.0)) / 2.6);
          const far = camLaunch.clone().add(V(26 * uf, 30 * uf, 8 * uf));
          const farLook = lookLaunch.clone().lerp(ball.clone().addScaledVector(dir, 6), uf); capPitch(far, farLook, 16 + 10 * closeIn0(u));
          // the drone's seat off the ball's flank, drifting closer
          const closeIn = ease((u - 0.1) / 0.3);
          const back = 12 - 6 * closeIn, sideD = 26 - 18 * closeIn, up = 7 - 5 * closeIn;
          const drone = ball.clone().addScaledVector(dir, -back).addScaledVector(side, sideD).add(V(0, up, 0));
          const posA = far.lerp(drone, closeIn); const lookA = farLook.lerp(ball.clone().addScaledVector(dir, 10).add(V(0, -2, 0)), closeIn);
          const jitter = 0.012 + 0.04 * closeIn; posA.x += rand(-jitter, jitter); posA.y += rand(-jitter, jitter);
          const qA = lookQuat(posA, lookA, tmpQ); const roll = new T.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.07 * Math.sin(clamp(u, 0, 1) * Math.PI) * closeIn); qA.multiply(roll);
          // the whip across to the bowman on the front tower, his aim, his glance up at what is coming
          kw = smooth((u - 0.44) / 0.13);
          const breathe = V(0.004 * Math.sin(t * 1.7), 0.006 * Math.sin(t * 1.1), 0.004 * Math.cos(t * 1.3));
          const posP = E.clone().add(breathe);
          const swayAim = aimPoint.clone().add(V(0, 0.35 * Math.sin(t * 1.2), 0.5 * Math.sin(t * 0.8)));
          const qAim = lookQuat(posP, swayAim, tmpQ2);
          const tGlance = tRelease + 0.78 * hero.fly; const kg = smooth((ts - tGlance) / 0.55);
          let qP = qAim.clone(); if (kg > 0) { const qB = lookQuat(posP, ball); qP.slerp(qB, kg); }
          camPos.lerpVectors(posA, posP, kw); camQ.copy(qA).slerp(qP, kw);
          fov = 48 + 8 * uf * (1 - closeIn) + 4 * kw * (1 - 0.3 * kg);
          // the rig: his bow stays on his aim while his head turns; he looses an arrow before he looks up
          pov.visible = kw > 0.55; pov.position.copy(posP).add(V(0, -0.16 * kg, 0)); pov.quaternion.copy(qAim); if (kg > 0) pov.rotateX(-0.25 * kg);
          hero.fb.scale.setScalar(1 + 0.7 * kw); if (kw > 0.5 && heroBall) { const dn = clamp(heroBall.distanceTo(posP) / 14, 0.22, 1); const fu = hero.fb.userData; fu.halo.scale.multiplyScalar(dn); fu.core.scale.multiplyScalar(dn); fu.halo.material.opacity *= dn; fu.core.material.opacity *= dn; fu.L.intensity *= dn; }
          const tLoose = tRelease + 0.66 * hero.fly;
          if (ts > tLoose && !loosed) { loosed = true; povParts.arrow.visible = false; const a = arrows[arrI++ % N_ARR]; a.on = true; a.p0 = E.clone().add(V(-1, -0.2, 0)); a.p1 = V(aimPoint.x - 80, gy(aimPoint.x - 80, aimPoint.z) + 1, aimPoint.z); a.t0 = t; a.dur = 1.6; a.apex = 3; }
          if (loosed) { const k = 1 - Math.exp(-(ts - tLoose) * 6); const mid = povParts.nock.clone().lerp(povParts.rest, k); mid.z += 0.01 * Math.sin((ts - tLoose) * 70) * Math.exp(-(ts - tLoose) * 5); place(povParts.strU, povParts.tipU, mid); place(povParts.strL, povParts.tipL, mid); }
        }
      }
      if (shake > 0) { shake = Math.max(0, shake - dtReal * 2.2); camPos.x += rand(-1, 1) * shake * 0.6; camPos.y += rand(-1, 1) * shake * 0.6; }
      cam.position.copy(camPos); cam.quaternion.copy(camQ); cam.fov = fov; cam.near = kw > 0.5 ? 0.08 : 0.3; cam.updateProjectionMatrix();
      tm0.camera = performance.now() - T0;
      // life in the frame
      poseSoldiers(t, dt, (Math.floor(now / 16) % 3) === 0); poseHorses(t);
      tm0.soldiers = performance.now() - T0;
      banners.forEach((b) => { const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.2 * (x + 0.8) * Math.sin(t * 3 + b.userData.ph + x * 2)); } p.needsUpdate = true; });
      { const f = castle.userData.flag, p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.32 * (x + 2.75) * Math.sin(t * 2.5 + x)); } p.needsUpdate = true; }
      torches.forEach((f, i) => { const s = 1.3 + 0.45 * Math.sin(t * 19 + f.userData.ph); f.scale.set(s, s * 1.4, 1); f.material.rotation = 0.25 * Math.sin(t * 11 + i); });
      tickFires(t, dt);
      litWindows.forEach((w, i) => { const k = 0.75 + 0.25 * Math.sin(t * (5 + (i % 5)) + i); w.scale.set(1, k, 1); });
      clouds.material.map.offset.x = t * 0.0022; clouds2.material.map.offset.x = -t * 0.0016;
      embers.forEach((s) => { const d = s.userData; if (d.life > 0) { d.life -= dt * 1.2; s.position.x += d.vx * dt; s.position.y += d.vy * dt; s.position.z += d.vz * dt; d.vy -= 3 * dt; s.material.opacity = Math.max(0, d.life); s.material.color.setHSL(0.08 * d.life, 1, 0.45 + 0.3 * d.life); if (d.life <= 0) s.visible = false; } });
      puffs.forEach((s) => { const d = s.userData; if (d.life > 0) { d.life -= dt * 0.45; s.position.x += d.vx * dt; s.position.y += d.g * dt; s.position.z += d.vz * dt; if (s.scale.x < 28) s.scale.multiplyScalar(1 + 0.9 * dt); s.material.opacity = 0.5 * Math.max(0, d.life); if (d.life <= 0) s.visible = false; } });
      chips.forEach((m) => { const d = m.userData; if (d.life > 0) { d.life -= dt * 0.35; d.v.y -= 22 * dt; m.position.addScaledVector(d.v, dt); m.rotation.x += d.r * dt; m.rotation.z += d.r * dt; const g = gy(m.position.x, m.position.z) + 0.2; if (m.position.y < g) { m.position.y = g; d.v.multiplyScalar(0.3); d.v.y = Math.abs(d.v.y) * 0.2; } if (d.life <= 0) m.visible = false; } });
      // in the bowman's view only his own fate lights him: other fires and flying shot near the tower are held back so the rig keeps its colour
      if (kw > 0.5) { const heroL = hero.fb.userData.L; scene.traverse((o) => { if (o.isPointLight && o !== heroL && o.intensity > 0) { const d = o.position.distanceTo(camPos); if (d < 45) o.intensity *= clamp((d - 12) / 33, 0, 1); } }); }
      tm0.particles = performance.now() - T0;
      renderer.render(scene, cam);
      tm0.render = performance.now() - T0;
      if (DBG) { frN++; frAcc += tm0.render; document.title = 'f' + frN + ' ' + tm0.render.toFixed(0) + 'ms r' + (tm0.render - tm0.particles).toFixed(0) + ' s' + (tm0.soldiers - tm0.camera).toFixed(0) + ' p' + renderer.info.programs.length + ' c' + renderer.info.render.calls + ' t' + t.toFixed(1); if (tm0.render > 400 || frN % 120 === 0) { console.log('[intro] frame', frN, 'ms', JSON.stringify(tm0), 'avg', (frAcc / frN).toFixed(1), 'simT', t.toFixed(1), 'calls', renderer.info.render.calls, 'tri', renderer.info.render.triangles, 'tex', renderer.info.memory.textures, 'geo', renderer.info.memory.geometries, 'prog', renderer.info.programs.length); } }
      if (state !== 'ending' || (impactAt >= 0 && t - impactAt < 0.4)) raf = requestAnimationFrame(frame);
    }
    const onResize = () => { const r = canvas.getBoundingClientRect(); const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize); onResize();
    raf = requestAnimationFrame(frame);
  }
})();
