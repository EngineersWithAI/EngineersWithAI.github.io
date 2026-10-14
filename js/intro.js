/* Opening scene. A siege camp at dusk, drawn live with three.js: tents, fires, torches, hundreds of
   soldiers (some walking the lines), four trebuchets of the project's 1187 design with treadwheels,
   woods, a layered and weathered castle on the rise with a tower already burning, hills and a far
   ridge in the fog. The scene idles until the visitor clicks the big machine; then the crew fires it
   on the model's real throw (run P7-R12: beam, hanger, box and sling follow the frames), the camera
   watches the whole launch, follows the fireball from the camp, and swings in beside it like a drone,
   with a moment of slow motion, until it strikes the outer wall. Flash, black, the title, the page.

   All textures are painted onto canvases at start (wood grain, stone, cloth, grass, clouds, flame);
   nothing is downloaded beyond the three.js library the Proving Ground uses. The other three
   machines fire on their own cycles while the scene idles; their flights, like the hero's, are staged
   for the picture. Plays once per visitor, is skippable (button or Esc), stays off with reduced
   motion, and index.html?intro replays it. Set ENABLED to false, or remove the intro block and the
   script line in index.html, and the site is exactly as it was. */
(function () {
  'use strict';
  const ENABLED = true;
  const ov = document.getElementById('intro');
  if (!ov) return;
  const bail = () => { ov.remove(); document.documentElement.classList.remove('intro-on'); };
  const force = /[?&#]intro\b/.test(location.search + location.hash);
  let seen = false; try { seen = localStorage.getItem('treb-intro') === 'seen'; } catch (e) {}
  if (!ENABLED || (!force && (seen || matchMedia('(prefers-reduced-motion: reduce)').matches)) || !window.TREB_THROWS || !window.TREB_THROWS.jerusalem1187) { bail(); return; }
  try { localStorage.setItem('treb-intro', 'seen'); } catch (e) {}
  document.documentElement.classList.add('intro-on');

  const canvas = ov.querySelector('canvas'), flash = ov.querySelector('.intro-flash'), skip = ov.querySelector('.intro-skip'), word = ov.querySelector('.intro-word'), title = ov.querySelector('.intro-title'), hint = ov.querySelector('.intro-hint');
  let state = 'loading', raf = 0, view = null, extraViews = [];

  // ---------------------------------------------------------------- ending
  function dispose() { [view].concat(extraViews).forEach((v) => { if (v) try { v.renderer.dispose(); v.renderer.forceContextLoss && v.renderer.forceContextLoss(); } catch (e) {} }); }
  function end(fast) {
    if (state === 'ending') return; state = 'ending';
    skip.hidden = true; hint.classList.remove('show');
    const out = () => { ov.classList.add('intro-out'); setTimeout(() => { bail(); dispose(); }, 1800); };
    if (fast) { cancelAnimationFrame(raf); out(); return; }
    flash.classList.add('white');
    setTimeout(() => flash.classList.add('black'), 110);
    setTimeout(() => { cancelAnimationFrame(raf); title.classList.add('in'); }, 1100);
    setTimeout(() => title.classList.remove('in'), 3600);
    setTimeout(out, 4700);
  }
  skip.addEventListener('click', () => end(true));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state !== 'ending') end(true); });
  const guard = setTimeout(() => { if (state === 'loading') end(true); }, 12000);

  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
  (window.THREE ? Promise.resolve() : load('lib/three.min.js')).then(() => (window.TrebView3D ? null : load('js/pg-3d.js'))).then(run).catch(() => end(true));

  // ---------------------------------------------------------------- helpers
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const ease = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
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

  // ---------------------------------------------------------------- the scene
  function run() {
    if (state !== 'loading') return;
    const T = window.THREE, D = window.TREB_THROWS.jerusalem1187;
    const mc = Object.assign({ arch: 'hcw', mu_a: 0.2, sling: true, r_a: 0.07 }, D.machine), res = D.result, frames = D.frames;
    const tRel = res.t_release, tLast = frames[frames.length - 1].t;
    const Lb = mc.L1 + mc.L2, H = mc.H, bw = 0.42 * H, zf = 0.5 + 0.09 * Lb;

    view = new window.TrebView3D(canvas);
    const renderer = view.renderer;
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    view.updateCamera = function () {}; view.render = function () {};
    const scene = view.scene, cam = view.camera;
    cam.fov = 40; cam.near = 0.3; cam.far = 5000;

    // ---- light: the last of the day behind the castle, a cold sky, warm fires
    const SKY_TOP = new T.Color(0x141c27), SKY_MID = new T.Color(0x3b4858), SKY_HOR = new T.Color(0x8c705c), FOG = 0x4b5661;
    scene.background = SKY_MID.clone();
    scene.fog = new T.FogExp2(FOG, 0.0019);
    scene.children.filter((c) => c.isLight).forEach((c) => scene.remove(c));
    scene.add(new T.HemisphereLight(0x6f7f93, 0x23261f, 0.32));
    const sun = new T.DirectionalLight(0xd9a877, 0.42); sun.position.set(420, 110, -300); scene.add(sun);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 50; sun.shadow.camera.far = 900; sun.shadow.camera.left = -140; sun.shadow.camera.right = 140; sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120; sun.shadow.bias = -0.0008; sun.target.position.set(0, 0, 0); scene.add(sun.target);
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
    function stoneCanvas(worn) {
      const w = 512, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.fillStyle = '#4b4b48'; g.fillRect(0, 0, w, h);
      const n = noiseCanvas(w, h, 3, 4, 23).getContext('2d').getImageData(0, 0, w, h).data;
      const bh = 30; let row = 0;
      for (let y = 0; y < h; y += bh, row++) { const off = (row % 2) * 44; for (let x = -off; x < w; x += 88) { const i = ((Math.min(h - 1, y + 8)) * w + clamp(x + 10, 0, w - 1)) * 4; const t = 0.8 + 0.24 * (n[i] / 255); const bl = Math.round(128 * t), gr = Math.round(124 * t), bb = Math.round(116 * t); g.fillStyle = 'rgb(' + bl + ',' + gr + ',' + bb + ')'; const miss = worn && Math.random() < 0.04; g.fillRect(x + 2, y + 2, 84, bh - 4); if (miss) { g.fillStyle = '#3a3a37'; g.fillRect(x + 2, y + 2, 84, bh - 4); } } }
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const nv = 0.86 + 0.28 * (n[i] / 255); d[i] *= nv; d[i + 1] *= nv; d[i + 2] *= nv; }
      g.putImageData(img, 0, 0);
      if (worn) { for (let k = 0; k < 14; k++) { const x = rand(0, w); const gr2 = g.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, 'rgba(20,22,24,0.0)'); gr2.addColorStop(0.3, 'rgba(20,22,24,' + rand(0.15, 0.4) + ')'); gr2.addColorStop(1, 'rgba(10,12,14,0.5)'); g.fillStyle = gr2; g.fillRect(x, 0, rand(6, 26), h); } for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(60,74,48,' + rand(0.15, 0.4) + ')'; g.beginPath(); g.ellipse(rand(0, w), rand(h * 0.5, h), rand(8, 30), rand(4, 12), 0, 0, Math.PI * 2); g.fill(); } }
      return c;
    }
    function groundCanvas() {
      const w = 512, h = 512, c = noiseCanvas(w, h, 2, 5, 5); const g = c.getContext('2d'); const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255; const dry = Math.pow(v, 1.6); d[i] = Math.round(48 + 72 * dry); d[i + 1] = Math.round(58 + 62 * dry); d[i + 2] = Math.round(30 + 40 * dry); }
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
    function glowCanvas(inner, mid, outer) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(0.3, mid); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; }
    function flameCanvas() { const c = document.createElement('canvas'); c.width = 128; c.height = 192; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 130, 4, 64, 110, 90); r.addColorStop(0, 'rgba(255,250,210,1)'); r.addColorStop(0.25, 'rgba(255,190,80,0.95)'); r.addColorStop(0.55, 'rgba(240,90,20,0.55)'); r.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(64, 0); g.bezierCurveTo(110, 70, 120, 150, 64, 190); g.bezierCurveTo(8, 150, 18, 70, 64, 0); g.fill(); return c; }
    const woodTex = tex(woodCanvas(), 1, 1), stoneTexA = tex(stoneCanvas(true), 1, 1), groundTex = tex(groundCanvas(), 110, 70);
    const glowTex = new T.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,200,110,0.85)', 'rgba(255,90,0,0)'));
    const emberTex = new T.CanvasTexture(glowCanvas('rgba(255,240,200,1)', 'rgba(255,140,40,0.8)', 'rgba(255,60,0,0)'));
    const smokeTex = new T.CanvasTexture(glowCanvas('rgba(40,40,44,0.75)', 'rgba(48,48,52,0.4)', 'rgba(60,60,64,0)'));
    const dustTex = new T.CanvasTexture(glowCanvas('rgba(150,135,112,0.85)', 'rgba(125,112,95,0.45)', 'rgba(100,90,80,0)'));
    const flameTex = new T.CanvasTexture(flameCanvas());
    const woodMat = new T.MeshStandardMaterial({ map: woodTex, color: 0xd2b48f, roughness: 0.85, metalness: 0 });
    const woodDark = new T.MeshStandardMaterial({ map: woodTex, color: 0x8c7355, roughness: 0.92, metalness: 0 });
    const woodGrey = new T.MeshStandardMaterial({ map: woodTex, color: 0x6a5e50, roughness: 0.95, metalness: 0 });
    const ironMat = new T.MeshStandardMaterial({ color: 0x35373a, roughness: 0.5, metalness: 0.75 });
    const ropeMat = new T.MeshStandardMaterial({ color: 0xa08c6a, roughness: 1 });
    const stoneMat = (rx, ry, tint) => { const t = stoneTexA.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); t.offset.set(rand(0, 1), rand(0, 1)); return new T.MeshStandardMaterial({ map: t, color: tint || 0x8e8b86, roughness: 0.96, metalness: 0 }); };
    const clothMat = (r, g, b) => new T.MeshStandardMaterial({ map: tex(clothCanvas(r, g, b), 2, 2), roughness: 1, metalness: 0, side: T.DoubleSide });
    const sprite = (map, size, color, opacity, additive) => { const s = new T.Sprite(new T.SpriteMaterial({ map, color: color || 0xffffff, transparent: true, opacity: opacity == null ? 1 : opacity, blending: additive ? T.AdditiveBlending : T.NormalBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };
    const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---- sky: gradient dome, two drifting cloud decks, a low moon, faint stars
    const skyG = new T.SphereGeometry(2200, 32, 16); const sc = new Float32Array(skyG.attributes.position.count * 3);
    for (let i = 0; i < skyG.attributes.position.count; i++) { const y = skyG.attributes.position.getY(i) / 2200; let c; if (y < 0.02) c = SKY_HOR.clone(); else if (y < 0.2) c = SKY_HOR.clone().lerp(SKY_MID, smooth(y / 0.2)); else c = SKY_MID.clone().lerp(SKY_TOP, smooth((y - 0.2) / 0.6)); sc[3 * i] = c.r; sc[3 * i + 1] = c.g; sc[3 * i + 2] = c.b; }
    skyG.setAttribute('color', new T.BufferAttribute(sc, 3));
    scene.add(new T.Mesh(skyG, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })));
    const cloudTex = tex(cloudCanvas(), 1.4, 1.4);
    const clouds = new T.Mesh(new T.PlaneGeometry(7000, 7000), new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.55 })); clouds.rotation.x = Math.PI / 2; clouds.position.set(600, 820, 0); scene.add(clouds);
    const clouds2 = clouds.clone(); clouds2.material = clouds.material.clone(); clouds2.material.opacity = 0.3; clouds2.position.y = 980; clouds2.rotation.z = 0.7; scene.add(clouds2);
    const moon = sprite(new T.CanvasTexture(glowCanvas('rgba(245,240,225,1)', 'rgba(230,222,200,0.5)', 'rgba(200,200,210,0)')), 80, 0xffffff, 0.65, true); moon.position.set(1300, 380, -900); moon.material.fog = false; scene.add(moon);
    { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), e = rand(0.12, 1.3); pos[3 * i] = 2000 * Math.cos(e) * Math.cos(a); pos[3 * i + 1] = 2000 * Math.sin(e); pos[3 * i + 2] = 2000 * Math.cos(e) * Math.sin(a); } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xd4dbe6, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.35, fog: false }))); }

    // ---- terrain: rolling ground, the rise to the castle, a ditch before the outer wall, a trampled camp
    const ditchX = 226;
    const hill = (x, z) => {
      const rise = smooth((x - 70) / 150);
      let y = 24 * rise + 5 * Math.sin(x * 0.021 + 1) * Math.cos(z * 0.017) + 3 * Math.cos(z * 0.031 - x * 0.012) + 1.2 * Math.sin(x * 0.045 + 1) * Math.cos(z * 0.03) + 0.5 * Math.sin(x * 0.13 + z * 0.09) + 0.3 * Math.sin(z * 0.21);
      y -= 5 * Math.exp(-Math.pow((x - ditchX) / 6.5, 2));
      const camp = smooth((Math.max(Math.abs(x + 20) / 110, Math.abs(z) / 110) - 0.55) / 0.45); // flat and trampled where the army sits
      return y * (0.15 + 0.85 * camp);
    };
    const terrG = new T.PlaneGeometry(3200, 2200, 200, 140); terrG.rotateX(-Math.PI / 2);
    { const p = terrG.attributes.position, col = new Float32Array(p.count * 3), cg = new T.Color();
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 700, z = p.getZ(i); p.setX(i, x); const y = hill(x, z); p.setY(i, y - 0.05); const camp = Math.exp(-((x + 20) * (x + 20) + z * z) / 7000); const h = clamp(y / 30, 0, 1); cg.setRGB(0.36 + 0.28 * camp - 0.06 * h, 0.40 - 0.06 * camp - 0.08 * h, 0.25 + 0.06 * camp - 0.06 * h); col[3 * i] = cg.r; col[3 * i + 1] = cg.g; col[3 * i + 2] = cg.b; }
      terrG.setAttribute('color', new T.BufferAttribute(col, 3)); terrG.computeVertexNormals(); }
    const terrain = new T.Mesh(terrG, new T.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 1, metalness: 0 })); terrain.receiveShadow = true; scene.add(terrain);
    const gy = (x, z) => hill(x, z);
    // far ridge in the fog
    { const n = 60, ridge = new T.InstancedMesh(new T.ConeGeometry(1, 1, 6), new T.MeshStandardMaterial({ color: 0x3e4852, roughness: 1 }), n); const M = new T.Matrix4(), q = new T.Quaternion(), s3 = new T.Vector3(), e = new T.Euler(); for (let i = 0; i < n; i++) { const a = rand(-1.2, 1.2); const dist = rand(1300, 1900); const x = dist * Math.cos(a) + 200, z = dist * Math.sin(a); const hgt = rand(60, 150), r = rand(180, 420); e.set(0, rand(0, 6), 0); q.setFromEuler(e); M.compose(new T.Vector3(x, hgt / 2 - 25, z), q, s3.set(r, hgt, r * rand(0.6, 1.2))); ridge.setMatrixAt(i, M); } ridge.instanceMatrix.needsUpdate = true; scene.add(ridge); }

    // ---- the castle: weathered outer wall with towers, a gatehouse and hoardings; inner wall; halls; the keep
    const CX = 236, CZ = 0;
    const merlons = (g, x, y, z1, z2, t) => { for (let s = z1 + 1; s < z2; s += 3.2) { if (Math.random() < 0.12) continue; const m = shadowed(new T.Mesh(new T.BoxGeometry(t, 1.7, 2), stoneMat(0.5, 0.4))); m.position.set(x, y + 0.85, s); m.rotation.z = rand(-0.03, 0.03); g.add(m); } };
    const windowMat = new T.MeshBasicMaterial({ color: 0xffb860 });
    const slit = (g, x, y, z, ry) => { const w = new T.Mesh(new T.PlaneGeometry(0.5, 1.6), new T.MeshBasicMaterial({ color: 0x0b0d10 })); w.position.set(x, y, z); w.rotation.y = ry || 0; g.add(w); };
    const lit = (g, x, y, z, ry) => { const w = new T.Mesh(new T.PlaneGeometry(0.9, 1.4), windowMat); w.position.set(x, y, z); w.rotation.y = ry || 0; g.add(w); return w; };
    const castle = new T.Group(); scene.add(castle);
    const rubbleG = new T.DodecahedronGeometry(0.7, 0); const rubbleM = new T.MeshStandardMaterial({ color: 0x7c7a75, roughness: 1 });
    const rubble = new T.InstancedMesh(rubbleG, rubbleM, 400); let rubI = 0; const rubM4 = new T.Matrix4(), rubQ = new T.Quaternion(), rubS = new T.Vector3(), rubE = new T.Euler();
    const dropRubble = (x, z, y, n, spread) => { for (let i = 0; i < n && rubI < 400; i++) { const s = rand(0.4, 1.3); rubE.set(rand(0, 3), rand(0, 3), rand(0, 3)); rubQ.setFromEuler(rubE); rubM4.compose(new T.Vector3(x + rand(-spread, spread), y + s * 0.4, z + rand(-spread, spread)), rubQ, rubS.set(s, s * 0.7, s)); rubble.setMatrixAt(rubI++, rubM4); } };
    function wallRun(x, z1, z2, h, t, yBase) { const len = z2 - z1; const m = shadowed(new T.Mesh(new T.BoxGeometry(t, h + 3, len), stoneMat(len / 9, (h + 3) / 9))); m.position.set(x, yBase + h / 2 - 1.5, (z1 + z2) / 2); castle.add(m); merlons(castle, x, yBase + h, z1, z2, t); const walk = new T.Mesh(new T.BoxGeometry(t + 0.6, 0.5, len), woodGrey); walk.position.set(x, yBase + h - 0.3, (z1 + z2) / 2); castle.add(walk); for (let s = z1 + 6; s < z2 - 4; s += rand(9, 16)) dropRubble(x - t / 2 - 1.5, s, yBase - 0.3, 3, 1.5); return m; }
    function tower(x, z, r, h, yBase) { const g = new T.Group(); const body = shadowed(new T.Mesh(new T.CylinderGeometry(r, r * 1.1, h + 3, 20), stoneMat(r * 1.2, (h + 3) / 9))); body.position.set(x, yBase + h / 2 - 1.5, z); g.add(body);
      const cap = new T.Mesh(new T.CylinderGeometry(r + 0.7, r + 0.2, 1.3, 20), stoneMat(1, 1, 0x7d7b78)); cap.position.set(x, yBase + h + 0.4, z); g.add(cap);
      const n = 12; for (let i = 0; i < n; i++) { if (Math.random() < 0.1) continue; const a = i / n * Math.PI * 2; const m = new T.Mesh(new T.BoxGeometry(1.4, 1.6, 1.4), stoneMat(0.3, 0.3)); const rr = r + 0.3; m.position.set(x + rr * Math.cos(a), yBase + h + 1.6, z + rr * Math.sin(a)); m.rotation.y = -a; g.add(m); }
      for (let k = 0; k < 3; k++) slit(g, x - r - 0.05, yBase + h * (0.3 + 0.22 * k), z + (k - 1) * r * 0.55, Math.PI / 2);
      if (Math.random() < 0.7) lit(g, x - r - 0.06, yBase + h * 0.62, z + rand(-r * 0.5, r * 0.5), Math.PI / 2);
      castle.add(g); return g; }
    const yOuter = gy(CX, CZ) + 0.5, OUT_H = 12, OUT_T = 4.8;
    wallRun(CX, -160, -118, 7, OUT_T, yOuter); dropRubble(CX - 4, -118, yOuter - 0.3, 40, 7); // a stretch brought down in an earlier siege
    wallRun(CX, -112, -34, OUT_H, OUT_T, yOuter); wallRun(CX, 34, 160, OUT_H, OUT_T, yOuter); wallRun(CX, -22, 22, OUT_H + 2, OUT_T + 1, yOuter);
    [-160, -112, -72, 72, 112, 160].forEach((z) => tower(CX, CZ + z, 5.6, 17, yOuter));
    tower(CX, CZ - 28, 6.8, 22, yOuter); tower(CX, CZ + 28, 6.8, 22, yOuter);
    { const gate = new T.Mesh(new T.BoxGeometry(OUT_T + 1.4, 8.5, 7), new T.MeshBasicMaterial({ color: 0x0a0b0d })); gate.position.set(CX - 0.4, yOuter + 4.2, CZ); castle.add(gate);
      const port = new T.Mesh(new T.BoxGeometry(0.3, 8, 6.4), ironMat); port.position.set(CX - 3, yOuter + 4, CZ); castle.add(port);
      [[-44, 44], [60, 110], [-110, -60]].forEach(([a, b]) => { const hoard = shadowed(new T.Mesh(new T.BoxGeometry(OUT_T + 3.2, 3, b - a), woodGrey)); hoard.position.set(CX - 0.9, yOuter + OUT_H + 3.8, CZ + (a + b) / 2); castle.add(hoard); const roof = new T.Mesh(new T.CylinderGeometry(0.01, OUT_T + 3.8, 2.4, 4, 1), woodGrey); roof.scale.set(1, 1, (b - a) / (OUT_T + 3.8) / 1.41); roof.rotation.y = Math.PI / 4; roof.position.set(CX - 0.9, yOuter + OUT_H + 6.5, CZ + (a + b) / 2); castle.add(roof); }); }
    const IX = CX + 36, yInner = gy(IX, CZ) + 0.5, IN_H = 18, IN_T = 5.8;
    wallRun(IX, -118, 118, IN_H, IN_T, yInner);
    [-118, -64, -14, 36, 86, 118].forEach((z) => tower(IX, CZ + z, 7.4, 28, yInner));
    const KX = CX + 72, KZ = 14, yKeep = gy(KX, KZ) + 0.5;
    const keep = shadowed(new T.Mesh(new T.BoxGeometry(32, 44, 32), stoneMat(3.6, 5, 0x8e8c88))); keep.position.set(KX, yKeep + 20.5, KZ); castle.add(keep);
    [[-16, -16], [16, -16], [16, 16], [-16, 16]].forEach(([dx, dz]) => tower(KX + dx, KZ + dz, 4, 50, yKeep));
    const litWindows = [];
    for (let k = 0; k < 8; k++) litWindows.push(lit(castle, KX - 16.05, yKeep + rand(8, 38), KZ + rand(-12, 12), Math.PI / 2));
    for (let k = 0; k < 5; k++) litWindows.push(lit(castle, KX + rand(-12, 12), yKeep + rand(8, 38), KZ - 16.05, 0));
    castle.traverse((o) => { if (o.material === windowMat && litWindows.indexOf(o) < 0) litWindows.push(o); });
    { const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 10, 6), ironMat); pole.position.set(KX, yKeep + 49, KZ); castle.add(pole); const flag = new T.Mesh(new T.PlaneGeometry(5.5, 3.2, 8, 1), clothMat(170, 40, 30)); flag.position.set(KX + 2.75, yKeep + 52.5, KZ); castle.add(flag); castle.userData.flag = flag; }
    [[CX + 52, -46, 24, 12, 11], [CX + 58, 44, 20, 10, 15], [CX + 50, 74, 16, 8, 10], [CX + 54, -90, 18, 9, 9]].forEach(([x, z, l, h, w]) => { const hall = shadowed(new T.Mesh(new T.BoxGeometry(w, h, l), stoneMat(w / 6, h / 6))); hall.position.set(x, gy(x, z) + h / 2, z); castle.add(hall); const roof = new T.Mesh(new T.CylinderGeometry(0.01, w * 0.75, h * 0.55, 4, 1), woodDark); roof.scale.set(1, 1, l / w / 1.05); roof.rotation.y = Math.PI / 4; roof.position.set(x, gy(x, z) + h + h * 0.27, z); castle.add(roof); });
    rubble.instanceMatrix.needsUpdate = true; rubble.count = rubI; scene.add(rubble);
    // a tower already burning
    const fireAt = new T.Vector3(CX, yOuter + 20, CZ + 72);
    const fireL = new T.PointLight(0xff7a2a, 3.2, 240, 1.5); fireL.position.copy(fireAt); scene.add(fireL);
    const flames = []; for (let i = 0; i < 8; i++) { const f = sprite(flameTex, 12, 0xffffff, 0.95, true); f.userData = { ph: rand(0, 6), r: rand(1.5, 4.5), s: rand(10, 18) }; f.position.copy(fireAt); scene.add(f); flames.push(f); }
    const smokes = []; for (let i = 0; i < 18; i++) { const s = sprite(smokeTex, 24, 0xffffff, 0.5); s.userData = { a: i / 18, dx: rand(-5, 5), dz: rand(-5, 5) }; scene.add(s); smokes.push(s); }
    const HIT = new T.Vector3(CX - OUT_T / 2 - 0.4, yOuter + 6, CZ - 9);
    const scorch = sprite(smokeTex, 14, 0x000000, 0); scorch.position.copy(HIT).add(new T.Vector3(-0.3, 0, 0)); scene.add(scorch);

    // ---- the camp: pavilions, ridge tents, banners, torches, fires, shot, wagons
    const camp = new T.Group(); scene.add(camp);
    const canvasA = clothMat(178, 168, 142), canvasB = clothMat(150, 120, 90), canvasC = clothMat(118, 58, 48), canvasD = clothMat(90, 100, 120);
    function pavilion(x, z, r, mat) { const y = gy(x, z); const wallm = shadowed(new T.Mesh(new T.CylinderGeometry(r, r, 2.3, 14, 1, true), mat)); wallm.position.set(x, y + 1.15, z); camp.add(wallm); const roof = shadowed(new T.Mesh(new T.ConeGeometry(r + 0.45, 2.8, 14), mat)); roof.position.set(x, y + 3.7, z); camp.add(roof); const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.8, 5), woodDark); pole.position.set(x, y + 5.6, z); camp.add(pole); const pen = new T.Mesh(new T.PlaneGeometry(1.2, 0.5), clothMat(170, 40, 30)); pen.position.set(x + 0.6, y + 6.2, z); camp.add(pen); const door = new T.Mesh(new T.PlaneGeometry(1.0, 1.9), new T.MeshBasicMaterial({ color: 0x15130f })); door.position.set(x - r - 0.02, y + 1.0, z); door.rotation.y = -Math.PI / 2; camp.add(door); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const rope = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 2.4, 3), ropeMat); rope.position.set(x + (r + 0.9) * Math.cos(a), y + 1.0, z + (r + 0.9) * Math.sin(a)); rope.rotation.z = 0.9 * Math.cos(a); rope.rotation.x = -0.9 * Math.sin(a); camp.add(rope); } }
    function ridgeTent(x, z, len, mat, ry) { const y = gy(x, z); const geo = new T.CylinderGeometry(2.1, 2.1, len, 3, 1); geo.rotateY(Math.PI); geo.rotateX(Math.PI / 2); const m = shadowed(new T.Mesh(geo, mat)); m.rotation.y = ry || 0; m.position.set(x, y + 1.05, z); camp.add(m); }
    for (let i = 0; i < 44; i++) { const x = rand(-170, -42), z = rand(-130, 130); if (Math.abs(z) < 18) continue; if (i % 3 === 0) pavilion(x, z, rand(2.4, 3.6), [canvasA, canvasB, canvasD][i % 3]); else ridgeTent(x, z, rand(4.5, 7), i % 2 ? canvasA : canvasC, rand(-0.5, 0.5)); }
    [[-62, 32], [-76, -38], [-98, 64], [-130, -80]].forEach(([x, z]) => pavilion(x, z, 4.4, canvasC));
    const banners = [];
    [[-24, 20], [-20, -24], [-50, 50], [-72, -62], [8, 48], [-38, 2], [-92, 14], [-122, -32], [-150, 70], [30, -12]].forEach(([x, z], i) => { const y = gy(x, z); const p = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 7.5, 6), woodDark); p.position.set(x, y + 3.75, z); camp.add(p); const b = new T.Mesh(new T.PlaneGeometry(1.6, 3.4, 8, 1), i % 3 ? clothMat(160, 36, 30) : clothMat(220, 200, 170)); b.position.set(x + 0.85, y + 5.6, z); b.userData = { ph: rand(0, 6) }; camp.add(b); banners.push(b); });
    const torches = [];
    for (let i = 0; i < 34; i++) { const x = rand(-160, 34), z = rand(-130, 130); if (Math.abs(x) < 30 && Math.abs(z) < 24) continue; const y = gy(x, z); const p = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 2.8, 5), woodDark); p.position.set(x, y + 1.4, z); camp.add(p); const f = sprite(flameTex, 1.5, 0xffffff, 0.95, true); f.position.set(x, y + 3.1, z); f.userData = { ph: rand(0, 6) }; scene.add(f); torches.push(f); }
    const fires = [];
    [[-10, 14], [-46, -42], [-86, 42], [-124, -72], [-140, 90], [22, 60]].forEach(([x, z], i) => { const y = gy(x, z); const L = new T.PointLight(0xffa24a, i ? 1.5 : 2.4, i ? 48 : 80, 1.6); L.position.set(x, y + 1.6, z); scene.add(L); const fl = []; for (let k = 0; k < 4; k++) { const f = sprite(flameTex, rand(2.2, 3.4), 0xffffff, 0.95, true); f.position.set(x + rand(-0.5, 0.5), y + 1.4, z + rand(-0.5, 0.5)); f.userData = { ph: rand(0, 6) }; scene.add(f); fl.push(f); } const g = sprite(glowTex, 8, 0xff9a40, 0.5, true); g.position.set(x, y + 0.8, z); scene.add(g); for (let k = 0; k < 8; k++) { const log = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.6, 5), woodDark); log.position.set(x + rand(-0.4, 0.4), y + 0.15, z + rand(-0.4, 0.4)); log.rotation.set(0, rand(0, 3), Math.PI / 2 + rand(-0.2, 0.2)); camp.add(log); } fires.push({ L, fl, base: L.intensity, x, z, y }); });
    { const shot = new T.InstancedMesh(new T.SphereGeometry(0.42, 10, 8), new T.MeshStandardMaterial({ color: 0x4f4d49, roughness: 1 }), 160); const M = new T.Matrix4(); let k = 0; [[-16, 12], [-34, 50], [-4, -54], [-80, 86]].forEach(([ox, oz]) => { for (let i = 0; i < 40; i++) { const c = i % 8, r = Math.floor(i / 8); const lvl = (c > 1 && c < 6 && r > 0 && r < 4) ? 0.72 : 0; const px = ox + c * 0.9, pz = oz + r * 0.9; M.makeTranslation(px, gy(px, pz) + 0.42 + lvl, pz); shot.setMatrixAt(k++, M); } }); shot.instanceMatrix.needsUpdate = true; shot.castShadow = true; scene.add(shot); }
    [[-32, -16, 0.5], [-28, 28, -0.6], [-96, -20, 1.2]].forEach(([x, z, ry]) => { const y = gy(x, z); const bed = shadowed(new T.Mesh(new T.BoxGeometry(4.6, 0.7, 2.2), woodDark)); bed.position.set(x, y + 1.15, z); bed.rotation.y = ry; camp.add(bed); [[-1.6, 1.25], [1.6, 1.25], [-1.6, -1.25], [1.6, -1.25]].forEach(([dx, dz]) => { const w = new T.Mesh(new T.CylinderGeometry(0.78, 0.78, 0.22, 14), woodDark); w.rotation.x = Math.PI / 2; w.position.set(x + dx * Math.cos(ry) - dz * Math.sin(ry), y + 0.78, z + dx * Math.sin(ry) + dz * Math.cos(ry)); w.rotation.y = ry; camp.add(w); }); });

    // ---- woods and scattered trees
    const trunkG = new T.CylinderGeometry(0.28, 0.5, 5.5, 7), trunkM = new T.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1 });
    const leafG = new T.IcosahedronGeometry(3.2, 2), leafM = new T.MeshStandardMaterial({ color: 0x1b2419, roughness: 1, flatShading: true });
    { const p = leafG.attributes.position; for (let i = 0; i < p.count; i++) { const k = rand(0.9, 1.08); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } leafG.computeVertexNormals(); }
    const treeSpots = []; for (let i = 0; i < 160; i++) treeSpots.push([rand(-300, -175), rand(-260, 260)]); for (let i = 0; i < 70; i++) treeSpots.push([rand(-100, 170), rand(-280, -150)]); for (let i = 0; i < 70; i++) treeSpots.push([rand(-100, 170), rand(150, 280)]); for (let i = 0; i < 14; i++) treeSpots.push([rand(-180, -120), rand(-140, 140)]); for (let i = 0; i < 10; i++) treeSpots.push([rand(-60, 40), (Math.random() < 0.5 ? -1 : 1) * rand(105, 140)]); for (let i = 0; i < 40; i++) treeSpots.push([rand(300, 500), rand(-300, 300)]);
    const trunks = new T.InstancedMesh(trunkG, trunkM, treeSpots.length), leaves = new T.InstancedMesh(leafG, leafM, treeSpots.length * 5);
    { const M = new T.Matrix4(), q = new T.Quaternion(), s3 = new T.Vector3(), c3 = new T.Color(); let li = 0;
      treeSpots.forEach(([x, z], i) => { const y = gy(x, z); const sc2 = rand(0.8, 1.6); M.compose(new T.Vector3(x, y + 2.7 * sc2, z), q, s3.set(sc2, sc2, sc2)); trunks.setMatrixAt(i, M); for (let k = 0; k < 5; k++) { const r = rand(0.5, 1.0) * sc2; const e2 = new T.Euler(rand(0, 3), rand(0, 3), 0); const q2 = new T.Quaternion().setFromEuler(e2); M.compose(new T.Vector3(x + rand(-1.9, 1.9) * sc2, y + (4.6 + rand(0, 3.4)) * sc2, z + rand(-1.9, 1.9) * sc2), q2, s3.set(r, r * rand(0.75, 1.1), r)); leaves.setMatrixAt(li, M); c3.setHSL(0.25 + rand(-0.03, 0.03), 0.28, 0.1 + rand(-0.03, 0.04)); leaves.setColorAt(li, c3); li++; } });
      trunks.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true; }
    trunks.castShadow = leaves.castShadow = true; scene.add(trunks); scene.add(leaves);

    // ---- the army: instanced soldiers, some standing in ranks and crews, some walking the lines
    const N_SOLD = 520;
    const bodyG = new T.CylinderGeometry(0.27, 0.33, 1.25, 8), headG = new T.SphereGeometry(0.17, 8, 7), helmG = new T.ConeGeometry(0.21, 0.32, 8), spearG = new T.CylinderGeometry(0.03, 0.03, 2.7, 4), shieldG = new T.CylinderGeometry(0.44, 0.44, 0.06, 12), cloakG = new T.ConeGeometry(0.42, 1.0, 8, 1, true);
    const bodyM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), headM = new T.MeshStandardMaterial({ color: 0x8e6d55, roughness: 0.85 }), helmM = new T.MeshStandardMaterial({ color: 0x4e5257, roughness: 0.55, metalness: 0.6 }), shieldM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), cloakM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: T.DoubleSide });
    const bodies = new T.InstancedMesh(bodyG, bodyM, N_SOLD), heads = new T.InstancedMesh(headG, headM, N_SOLD), helms = new T.InstancedMesh(helmG, helmM, N_SOLD), spears = new T.InstancedMesh(spearG, ironMat, N_SOLD), shields = new T.InstancedMesh(shieldG, shieldM, N_SOLD), cloaks = new T.InstancedMesh(cloakG, cloakM, N_SOLD);
    const soldiers = [];
    const machineSpots = [[0, 0, 0], [-46, 84, -0.1], [14, -58, 0.08], [-88, 104, -0.14]];
    { const spots = [];
      machineSpots.forEach(([mx, mz]) => { for (let i = 0; i < 16; i++) { const a = rand(0, Math.PI * 2), r = rand(8, 14); spots.push([mx - 6 + r * Math.cos(a), mz + r * Math.sin(a), a + Math.PI, 0]); } });
      const block = (x0, z0, cols, rows, ry) => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const dx = c * 1.1 + rand(-0.15, 0.15), dz = r * 1.3 + rand(-0.15, 0.15); spots.push([x0 + dx * Math.cos(ry) - dz * Math.sin(ry), z0 + dx * Math.sin(ry) + dz * Math.cos(ry), ry, 0]); } };
      block(22, -34, 12, 6, 0.2); block(26, 8, 10, 5, -0.1); block(-44, -80, 9, 6, 0.9); block(-12, 72, 11, 5, -0.5); block(44, 64, 8, 4, 0.1); block(46, -74, 8, 5, -0.2); block(-110, 20, 10, 4, 0.6);
      fires.forEach((f, i) => { for (let k = 0; k < (i ? 7 : 12); k++) { const a = rand(0, Math.PI * 2), r = rand(2.5, 5); spots.push([f.x + r * Math.cos(a), f.z + r * Math.sin(a), a + Math.PI, 0]); } });
      for (let i = 0; i < 110; i++) spots.push([rand(-150, 50), rand(-120, 120), rand(0, 6.3), 1]); // walkers
      const c3 = new T.Color(); const cloth = [0x3e3328, 0x2a2830, 0x4a2820, 0x33404a, 0x4d4330, 0x202a34, 0x5a2420, 0x44463a];
      for (let i = 0; i < N_SOLD; i++) { const sp = spots[i % spots.length]; const x = sp[0] + (i >= spots.length ? rand(-3, 3) : 0), z = sp[1] + (i >= spots.length ? rand(-3, 3) : 0); if (Math.abs(x) < 9 && Math.abs(z) < 5) continue; const y = gy(x, z); const walker = sp[3] === 1; soldiers.push({ x, y, z, ry: sp[2], ph: rand(0, 6), spear: Math.random() < 0.6, shield: Math.random() < 0.45, cloak: Math.random() < 0.35, h: rand(0.9, 1.1), walker, tx: x, tz: z, wait: rand(0, 4), speed: rand(0.8, 1.3) }); const j = soldiers.length - 1; c3.setHex(cloth[i % cloth.length]).offsetHSL(0, 0, rand(-0.06, 0.06)); bodies.setColorAt(j, c3); shields.setColorAt(j, c3.clone().offsetHSL(rand(-0.3, 0.3), 0.15, 0.02)); cloaks.setColorAt(j, c3.clone().offsetHSL(rand(-0.1, 0.1), 0, -0.06)); } }
    [bodies, heads, helms, spears, shields, cloaks].forEach((m) => { m.count = soldiers.length; m.frustumCulled = false; m.castShadow = true; scene.add(m); });
    function poseSoldiers(t, dt) {
      const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s3 = new T.Vector3(), p = new T.Vector3();
      soldiers.forEach((s, i) => {
        let bob = 0;
        if (s.walker) { if (s.wait > 0) s.wait -= dt; else { const dx = s.tx - s.x, dz = s.tz - s.z, dd = Math.hypot(dx, dz); if (dd < 0.6) { let nx, nz, tries = 0; do { nx = s.x + rand(-25, 25); nz = s.z + rand(-25, 25); tries++; } while (tries < 8 && ((Math.abs(nx) < 11 && Math.abs(nz) < 7) || nx > 60 || nx < -170 || Math.abs(nz) > 130)); s.tx = nx; s.tz = nz; s.wait = rand(0.5, 5); } else { const st = s.speed * dt; s.x += dx / dd * st; s.z += dz / dd * st; s.y = gy(s.x, s.z); s.ry = Math.atan2(-dz, dx) + Math.PI / 2; bob = 0.06 * Math.abs(Math.sin(t * 7 + s.ph)); } } }
        const sway = 0.03 * Math.sin(t * 1.3 + s.ph); const yaw = s.ry + (s.walker ? 0 : 0.08 * Math.sin(t * 0.7 + s.ph));
        e.set(sway, yaw, 0); q.setFromEuler(e);
        M.compose(p.set(s.x, s.y + 0.62 * s.h + bob, s.z), q, s3.set(1, s.h, 1)); bodies.setMatrixAt(i, M);
        M.compose(p.set(s.x, s.y + 1.42 * s.h + bob, s.z), q, s3.set(1, 1, 1)); heads.setMatrixAt(i, M);
        M.compose(p.set(s.x, s.y + 1.62 * s.h + bob, s.z), q, s3.set(1, 1, 1)); helms.setMatrixAt(i, M);
        if (s.cloak) { M.compose(p.set(s.x, s.y + 0.85 * s.h + bob, s.z), q, s3.set(1, 1, 1)); cloaks.setMatrixAt(i, M); } else { M.makeScale(0, 0, 0); cloaks.setMatrixAt(i, M); }
        if (s.spear) { M.compose(p.set(s.x + 0.35 * Math.cos(yaw), s.y + 1.35 + bob, s.z - 0.35 * Math.sin(yaw)), q, s3.set(1, 1, 1)); spears.setMatrixAt(i, M); } else { M.makeScale(0, 0, 0); spears.setMatrixAt(i, M); }
        if (s.shield) { e.set(Math.PI / 2 + sway, yaw, 0); q.setFromEuler(e); M.compose(p.set(s.x - 0.42 * Math.cos(yaw), s.y + 0.9 + bob, s.z + 0.42 * Math.sin(yaw)), q, s3.set(1, 1, 1)); shields.setMatrixAt(i, M); } else { M.makeScale(0, 0, 0); shields.setMatrixAt(i, M); } });
      [bodies, heads, helms, spears, shields, cloaks].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    }

    // ---- the machines. The Proving Ground's view supplies the moving parts on the model's frames;
    //      the rest of a working engine is added here: treadwheels, bracing, bearing blocks, the box's
    //      planking and straps, the trough's rails, a prong at the tip, platform and stakes.
    function dressMachine(v, g) {
      g.traverse((o) => { if (!o.isMesh) return; const c = o.material && o.material.color ? o.material.color.getHex() : 0;
        if (c === 0xb08a55) o.material = woodMat; else if (c === 0x8f6d42) o.material = woodDark; else if (c === 0x4a4947 || c === 0x6f7378) o.material = ironMat; else if (c === 0x6d6a66) o.material = woodDark; else if (c === 0x2e2c29) o.material = new T.MeshBasicMaterial({ color: 0xffd080 });
        if (o.geometry && o.geometry.type === 'PlaneGeometry') o.visible = false; else { o.castShadow = true; o.receiveShadow = true; } });
      const P = v.parts;
      if (P && P.beamL) { for (let k = 1; k <= 6; k++) { const band = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 6, 16), ironMat); band.rotation.x = Math.PI / 2; band.position.y = k / 7; band.scale.set(1, 1 / Math.max(0.001, P.beamL.scale.y), 1); P.beamL.add(band); } const prong = new T.Mesh(new T.CylinderGeometry(0.04, 0.02, 0.6, 6), ironMat); prong.position.set(0, 1, 0); prong.rotation.z = -0.8; prong.scale.y = 1 / Math.max(0.001, P.beamL.scale.y); P.beamL.add(prong); }
      if (P && P.beamS) { const splice = new T.Mesh(new T.BoxGeometry(0.5, 0.38, 0.5), woodDark); splice.position.y = 0.3; splice.scale.y = 1 / Math.max(0.001, P.beamS.scale.y); P.beamS.add(splice); }
      if (P && P.box) { const side = P.box.geometry.parameters.width; [-0.3, 0, 0.3].forEach((f) => { const strap = new T.Mesh(new T.BoxGeometry(side + 0.06, 0.12, side + 0.06), ironMat); strap.position.y = f * side; P.box.add(strap); }); for (let k = 0; k < 14; k++) { const st = new T.Mesh(new T.DodecahedronGeometry(rand(0.12, 0.26), 0), rubbleM); st.position.set(rand(-0.4, 0.4) * side, side / 2 + 0.05, rand(-0.4, 0.4) * side); P.box.add(st); } }
      const dress = new T.Group(); g.add(dress);
      // treadwheels on the throw side, with their windlass axle, spokes and treads
      const wr = 2.7, ww = 1.3, wx = -bw * 0.55, wy = wr + 0.15;
      [-1, 1].forEach((s) => { const cz = s * (zf + 0.4 + ww / 2); [-ww / 2, ww / 2].forEach((d) => { const rim = new T.Mesh(new T.TorusGeometry(wr, 0.12, 8, 40), woodMat); rim.position.set(wx, wy, cz + d); dress.add(rim); }); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; [-ww / 2, ww / 2].forEach((d) => { const sp = new T.Mesh(new T.BoxGeometry(0.1, wr - 0.2, 0.08), woodDark); sp.position.set(wx + (wr / 2) * Math.cos(a), wy + (wr / 2) * Math.sin(a), cz + d); sp.rotation.z = a - Math.PI / 2; dress.add(sp); }); const tread = new T.Mesh(new T.BoxGeometry(0.28, 0.06, ww), woodMat); tread.position.set(wx + wr * Math.cos(a + 0.13), wy + wr * Math.sin(a + 0.13), cz); tread.rotation.z = a + 0.13; dress.add(tread); } const hub = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, ww + 0.2, 10), woodDark); hub.rotation.x = Math.PI / 2; hub.position.set(wx, wy, cz); dress.add(hub); });
      const windlass = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 2 * (zf + 0.4 + ww) + 0.6, 10), ironMat); windlass.rotation.x = Math.PI / 2; windlass.position.set(wx, wy, 0); dress.add(windlass);
      const drum = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 1.6, 12), woodDark); drum.rotation.x = Math.PI / 2; drum.position.set(wx, wy, 0); dress.add(drum);
      [-1, 1].forEach((s) => { const post = new T.Mesh(new T.BoxGeometry(0.3, wy, 0.3), woodMat); post.position.set(wx, wy / 2, s * (zf + 0.2)); dress.add(post); const brace = new T.Mesh(new T.BoxGeometry(0.22, 0.22, 1), woodDark); brace.position.set(wx + 1.1, wy * 0.45, s * (zf + 0.2)); brace.rotation.z = 0.9; brace.scale.z = 1; brace.scale.y = 1; dress.add(brace); });
      // the A-frames: bearing blocks at the top, doubled legs, diagonal and horizontal bracing, sill plates, stakes
      [-1, 1].forEach((s) => { const block = new T.Mesh(new T.BoxGeometry(0.9, 0.7, 0.6), woodDark); block.position.set(0, H + 0.1, s * zf); dress.add(block); const cap = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.7), ironMat); cap.position.set(0, H + 0.5, s * zf); dress.add(cap);
        [[-bw * 0.8, 0.2, -bw * 0.35, H * 0.5], [bw * 0.8, 0.2, bw * 0.35, H * 0.5], [-bw * 0.5, H * 0.5, 0, H * 0.92], [bw * 0.5, H * 0.5, 0, H * 0.92]].forEach(([x1, y1, x2, y2]) => { const L = Math.hypot(x2 - x1, y2 - y1); const b = new T.Mesh(new T.BoxGeometry(0.2, L, 0.2), woodDark); b.position.set((x1 + x2) / 2, (y1 + y2) / 2, s * (zf - 0.25)); b.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2; dress.add(b); });
        const sill = new T.Mesh(new T.BoxGeometry(2 * bw * 1.3, 0.35, 0.5), woodDark); sill.position.set(0, 0.17, s * zf); dress.add(sill);
        [-bw * 1.15, bw * 1.15].forEach((x) => { const st = new T.Mesh(new T.CylinderGeometry(0.06, 0.03, 1.2, 5), ironMat); st.position.set(x, 0.3, s * (zf + 0.4)); st.rotation.z = 0.3; dress.add(st); }); });
      [0.3, 0.75].forEach((f) => { const tie = new T.Mesh(new T.BoxGeometry(0.25, 0.25, 2 * zf), woodDark); tie.position.set(bw * (1 - f) * 0.9, H * f, 0); dress.add(tie); const tie2 = tie.clone(); tie2.position.x = -bw * (1 - f) * 0.9; dress.add(tie2); });
      const deck = new T.Mesh(new T.BoxGeometry(2 * bw * 1.2, 0.12, 2 * zf - 0.3), woodDark); deck.position.set(0.3, 0.42, 0); dress.add(deck);
      [-1, 1].forEach((s) => { const rail = new T.Mesh(new T.BoxGeometry(mc.L1 + 1.4, 0.3, 0.08), woodDark); rail.position.set(-(mc.L1 + 1.2) / 2 + 0.3, 0.16, s * 0.3); dress.add(rail); });
      const ladder = new T.Group(); [-0.3, 0.3].forEach((z) => { const r = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, H + 1, 5), woodDark); r.position.set(0, (H + 1) / 2, z); ladder.add(r); }); for (let k = 0; k < 10; k++) { const r = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.6, 4), woodDark); r.rotation.x = Math.PI / 2; r.position.set(0, 0.6 + k * (H / 10), 0); ladder.add(r); } ladder.position.set(bw * 0.9, 0, zf + 0.9); ladder.rotation.z = -0.28; dress.add(ladder);
      dress.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    view.setMachine(mc, { H: mc.H, d: mc.d }, frames, null, null, res);
    if (view.ground) { scene.remove(view.ground); view.ground = null; }
    dressMachine(view, view.machineG);
    const machines = [{ view, g: view.machineG, holder: null, fireAt: -1, target: HIT, fly: 6.6, hero: true, period: 0, phase: 0 }];
    const otherTargets = [new T.Vector3(CX - OUT_T / 2 - 0.4, yOuter + 9, CZ + 48), new T.Vector3(CX - OUT_T / 2 - 0.4, yOuter + 6, CZ - 62), new T.Vector3(CX - OUT_T / 2 - 0.4, yOuter + 13, CZ + 104)];
    machineSpots.slice(1).forEach(([x, z, yaw], i) => { const dc = document.createElement('canvas'); dc.width = dc.height = 8; const v2 = new window.TrebView3D(dc); v2.updateCamera = function () {}; v2.render = function () {}; extraViews.push(v2); v2.setMachine(mc, { H: mc.H, d: mc.d }, frames, null, null, res); const g = v2.machineG; v2.scene.remove(g); const holder = new T.Group(); holder.position.set(x, gy(x, z), z); holder.rotation.y = yaw; holder.add(g); scene.add(holder); dressMachine(v2, g); machines.push({ view: v2, g, holder, fireAt: -1, target: otherTargets[i], fly: 6.4 + i * 0.5, hero: false, period: 15 + 4 * i, phase: 4 + 5 * i }); });
    machines.forEach((m) => { const ball = new T.Group(); ball.add(new T.Mesh(new T.SphereGeometry(mc.d * 0.6, 12, 10), new T.MeshBasicMaterial({ color: 0xfff0c0 }))); ball.add(sprite(glowTex, 2.0, 0xffc060, 1, true)); ball.add(sprite(glowTex, 4.2, 0xff7a20, 0.45, true)); const fl = []; for (let k = 0; k < 4; k++) { const f = sprite(flameTex, 2.4, 0xffffff, 0.9, true); f.userData = { ph: rand(0, 6) }; ball.add(f); fl.push(f); } const L = new T.PointLight(0xffa040, m.hero ? 3.4 : 1.6, 80, 1.4); ball.add(L); scene.add(ball); m.ball = ball; m.ballL = L; m.ballFl = fl; const relFr = m.view.frameAt(tRel - 0.02); m.P0 = new T.Vector3(relFr.p ? relFr.p[0] : -5.8, relFr.p ? relFr.p[1] : 21.6, 0); if (m.holder) m.P0.applyEuler(m.holder.rotation).add(m.holder.position); m.apex = (m.hero ? 34 : 44) + rand(-5, 5); m.landed = false; });
    const flightPos = (m, u) => new T.Vector3(m.P0.x + (m.target.x - m.P0.x) * u, m.P0.y + (m.target.y - m.P0.y) * u + 4 * m.apex * u * (1 - u), m.P0.z + (m.target.z - m.P0.z) * u);
    // particle pools: embers, smoke puffs, debris, the dust cloud and the shock ring at the wall
    const embers = []; for (let i = 0; i < 220; i++) { const s = sprite(emberTex, 1, 0xffffff, 0, true); s.userData = { life: 0 }; scene.add(s); embers.push(s); } let emberI = 0;
    const emit = (p, spread, size, n, vmul) => { for (let k = 0; k < n; k++) { const s = embers[emberI++ % embers.length]; s.position.set(p.x + rand(-spread, spread), p.y + rand(-spread, spread), p.z + rand(-spread, spread)); s.userData = { life: 1, vx: rand(-2, 2) * (vmul || 1), vy: (0.6 + rand(0, 1.6)) * (vmul || 1), vz: rand(-2, 2) * (vmul || 1) }; s.scale.set(size, size, 1); s.material.opacity = 1; } };
    const puffs = []; for (let i = 0; i < 90; i++) { const s = sprite(smokeTex, 3, 0xffffff, 0); s.userData = { life: 0 }; scene.add(s); puffs.push(s); } let puffI = 0;
    const puff = (p, size, n, dusty) => { for (let k = 0; k < n; k++) { const s = puffs[puffI++ % puffs.length]; s.position.copy(p).add(new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))); s.userData = { life: 1, g: rand(0.6, 1.4), vx: rand(-1.5, 1.5), vz: rand(-1.5, 1.5) }; s.scale.set(size, size, 1); s.material.map = dusty ? dustTex : smokeTex; s.material.opacity = 0.55; } };
    const debris = []; for (let i = 0; i < 80; i++) { const m = new T.Mesh(new T.BoxGeometry(rand(0.4, 1.3), rand(0.4, 1.1), rand(0.4, 1.2)), stoneMat(0.3, 0.3, 0x8d8a84)); m.visible = false; scene.add(m); debris.push(m); }
    const dust = sprite(dustTex, 30, 0xffffff, 0); dust.position.copy(HIT).add(new T.Vector3(-4, 2, 0)); scene.add(dust);
    const ring = new T.Mesh(new T.RingGeometry(0.5, 1.2, 40), new T.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); ring.position.copy(HIT).add(new T.Vector3(-0.6, 0, 0)); ring.rotation.y = Math.PI / 2; scene.add(ring);

    // ---- the shot
    const hero = machines[0];
    const camIdleA = new T.Vector3(-27, 5.5, 35), lookIdleA = new T.Vector3(40, 12, -14);
    const camIdleB = new T.Vector3(-21, 5, 27), lookIdleB = new T.Vector3(36, 14, -16);
    const camLaunch = new T.Vector3(-24, 6.5, 31), lookLaunch = new T.Vector3(32, 15, -13);
    const camPos = camIdleA.clone(), look = lookIdleA.clone();
    cam.position.copy(camPos); cam.lookAt(look);
    const FIRE_DELAY = 1.6; // the beat between the click and the release of the trigger
    let simT = 0, clickT = -1, impactAt = -1, last = 0, shake = 0, clickPos = null, clickLook = null;
    // a hit box round the hero machine for the click
    const hitBox = new T.Mesh(new T.BoxGeometry(2 * bw * 2.6, H * 2.4, 2 * zf * 3.2), new T.MeshBasicMaterial({ visible: false })); hitBox.position.set(-1, H * 1.1, 0); scene.add(hitBox);
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const overMachine = (ev) => { const r = canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObject(hitBox).length > 0; };
    function fire() { if (state !== 'idle') return; state = 'playing'; clickT = simT; clickPos = camPos.clone(); clickLook = look.clone(); hint.classList.remove('show'); canvas.style.cursor = ''; }
    canvas.addEventListener('mousemove', (ev) => { if (state === 'idle') canvas.style.cursor = overMachine(ev) ? 'pointer' : ''; });
    canvas.addEventListener('click', (ev) => { if (state === 'idle' && overMachine(ev)) fire(); });
    hint.addEventListener('click', fire);
    window.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && state === 'idle') { e.preventDefault(); fire(); } });
    window.trebIntroFire = fire;
    state = 'idle'; clearTimeout(guard); word.classList.add('off'); ov.classList.add('playing');
    setTimeout(() => { if (state === 'idle') hint.classList.add('show'); }, 2500);
    window.trebIntroSeek = (sec) => { if (clickT < 0) fire(); simT = clickT + sec; };
    poseSoldiers(0, 0);

    function frame(now) {
      const dtReal = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      // the shot clock: slows for a moment while the ball is over the ditch
      let rate = 1;
      if (clickT >= 0) { const tm = simT - clickT - FIRE_DELAY; const u = (tm - tRel) / hero.fly; if (u > 0.56 && u < 0.72) rate = 0.16 + 0.84 * smooth(Math.abs(u - 0.64) / 0.08); }
      const dt = dtReal * rate; simT += dt; const t = simT;
      // machines and fireballs
      machines.forEach((m) => {
        let tm;
        if (m.hero) tm = clickT < 0 ? 0 : t - clickT - FIRE_DELAY;
        else { const cyc = (t + m.phase) % m.period; tm = cyc; if (cyc < 0.05) m.landed = false; }
        m.view.setTime(clamp(tm, 0, tLast));
        const released = tm > tRel; const u = released ? (tm - tRel) / m.fly : 0;
        if (!released) { const s = m.view.lastStone; if (s) { const p = new T.Vector3(s[0], s[1], 0); if (m.holder) p.applyEuler(m.holder.rotation).add(m.holder.position); m.ball.position.copy(p); m.ball.visible = true; if (Math.random() < 0.25) emit(m.ball.position, 0.4, rand(0.3, 0.7), 1, 0.5); } }
        else if (u < 1) { m.ball.position.copy(flightPos(m, u)); m.ball.visible = true; if (Math.random() < 0.95) emit(m.ball.position, 0.9, rand(0.8, 1.6), m.hero ? 3 : 1); if (Math.random() < 0.4) puff(m.ball.position, rand(2, 3.5), 1); }
        else { m.ball.visible = false; if (!m.landed) { m.landed = true; emit(m.target, 4, rand(1.5, 3), m.hero ? 60 : 25, 2.5); puff(m.target, 9, m.hero ? 12 : 5, true); if (m.hero) { impactAt = t; shake = 1; dust.material.opacity = 0.9; ring.material.opacity = 0.9; scorch.material.opacity = 0.85; debris.forEach((d) => { d.visible = true; d.position.copy(HIT); d.userData = { v: new T.Vector3(rand(-24, -4), rand(2, 15), rand(-10, 10)), r: rand(2, 9) }; }); end(false); } } }
        m.ballL.intensity = (m.hero ? 3.4 : 1.6) * (0.85 + 0.3 * Math.sin(t * 37 + m.phase));
        m.ballFl.forEach((f, k) => { const s = 1.7 + 0.8 * Math.sin(t * 21 + f.userData.ph); f.scale.set(s, s * 1.3, 1); f.position.set(0.2 * Math.sin(t * 17 + k), 0.6 + 0.3 * Math.sin(t * 13 + k * 2), 0); f.material.rotation = 0.3 * Math.sin(t * 9 + k); });
      });
      // camera
      if (clickT < 0) {
        const w = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 46);
        camPos.lerpVectors(camIdleA, camIdleB, w); look.lerpVectors(lookIdleA, lookIdleB, w);
        camPos.x += 0.1 * Math.sin(t * 0.9); camPos.y += 0.06 * Math.sin(t * 1.3);
        cam.fov = 44;
      } else {
        const ts = t - clickT, tRelease = FIRE_DELAY + tRel;
        if (ts < tRelease) { const k = smooth(ts / 1.4); camPos.lerpVectors(clickPos, camLaunch, k); look.lerpVectors(clickLook, lookLaunch, k); camPos.x += 0.06 * Math.sin(t * 0.9); cam.fov = 44; }
        else {
          const hp = hero.ball.position, u = clamp((ts - tRelease) / hero.fly, 0, 1);
          const dir = flightPos(hero, Math.min(1, u + 0.01)).sub(flightPos(hero, u)).normalize();
          const side = new T.Vector3(-dir.z, 0, dir.x).normalize();          // to the camp's side of the flight
          const closeIn = ease(clamp((u - 0.22) / 0.62, 0, 1));
          // from afar: the camera lifts off from the camp and pans with the ball, keeping the field in view
          const far = camLaunch.clone().add(new T.Vector3(16 * u, 10 * u, 6 * u));
          // beside it: a drone's seat off the ball's flank, drifting in until the wall fills the frame
          const back = 12 - 9 * closeIn, sideD = 26 - 20 * closeIn, up = 7 - 5.8 * closeIn;
          const near = hp.clone().addScaledVector(dir, -back).addScaledVector(side, sideD).add(new T.Vector3(0, up, 0));
          const want = far.lerp(near, closeIn);
          camPos.lerp(want, Math.min(1, (0.05 + 0.3 * closeIn) * 60 * dtReal));
          const wantLook = hp.clone().addScaledVector(dir, 10 * (1 - closeIn) + 1.5); wantLook.y -= (1 - closeIn) * 0.4 * hp.y;
          look.lerp(wantLook, Math.min(1, (0.08 + 0.45 * closeIn) * 60 * dtReal));
          const jitter = 0.01 + 0.05 * closeIn; camPos.x += rand(-jitter, jitter); camPos.y += rand(-jitter, jitter);
          cam.fov = 44 + 10 * closeIn * (1 - 0.5 * (rate < 0.9 ? 1 : 0));
        }
      }
      if (shake > 0) { shake = Math.max(0, shake - dtReal * 2.2); camPos.x += rand(-1, 1) * shake * 0.6; camPos.y += rand(-1, 1) * shake * 0.6; }
      cam.position.copy(camPos); cam.lookAt(look); cam.updateProjectionMatrix();
      if (clickT >= 0 && simT - clickT > FIRE_DELAY + tRel) { const roll = -0.1 * Math.sin(clamp((simT - clickT - FIRE_DELAY - tRel) / hero.fly, 0, 1) * Math.PI); cam.rotateZ(roll); }
      // life in the frame
      poseSoldiers(t, dt);
      banners.forEach((b) => { const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.2 * (x + 0.8) * Math.sin(t * 3 + b.userData.ph + x * 2)); } p.needsUpdate = true; });
      { const f = castle.userData.flag, p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.32 * (x + 2.75) * Math.sin(t * 2.5 + x)); } p.needsUpdate = true; }
      torches.forEach((f, i) => { const s = 1.3 + 0.45 * Math.sin(t * 19 + f.userData.ph); f.scale.set(s, s * 1.4, 1); f.material.rotation = 0.25 * Math.sin(t * 11 + i); });
      fires.forEach((f, i) => { f.L.intensity = f.base * (0.85 + 0.2 * Math.sin(t * 17 + i) + 0.12 * Math.sin(t * 31 + i * 2)); f.fl.forEach((s, k) => { const sc2 = 2.4 + 0.9 * Math.sin(t * 15 + s.userData.ph + k); s.scale.set(sc2, sc2 * 1.4, 1); s.material.rotation = 0.2 * Math.sin(t * 9 + k); }); if (Math.random() < 0.3) emit(new T.Vector3(f.x, f.y + 1.5, f.z), 0.4, rand(0.25, 0.5), 1, 0.6); });
      litWindows.forEach((w, i) => { const k = 0.75 + 0.25 * Math.sin(t * (5 + (i % 5)) + i); w.scale.set(1, k, 1); });
      flames.forEach((f, i) => { const s = f.userData.s * (0.8 + 0.3 * Math.sin(t * 13 + f.userData.ph)); f.scale.set(s, s * 1.5, 1); f.position.set(fireAt.x + f.userData.r * Math.cos(t * 2 + i), fireAt.y + 2 + 2 * Math.sin(t * 7 + i), fireAt.z + f.userData.r * Math.sin(t * 2 + i)); });
      fireL.intensity = 2.8 + 0.6 * Math.sin(t * 23) + 0.3 * Math.sin(t * 41);
      smokes.forEach((s) => { const a = (s.userData.a + t * 0.045) % 1; s.position.set(fireAt.x + 12 * a + s.userData.dx, fireAt.y + 4 + 130 * a, fireAt.z + 8 * a + s.userData.dz); const k = 14 + 80 * a; s.scale.set(k, k, 1); s.material.opacity = 0.55 * (1 - a) * Math.min(1, a * 8); });
      clouds.material.map.offset.x = t * 0.0022; clouds2.material.map.offset.x = -t * 0.0016;
      embers.forEach((s) => { const d = s.userData; if (d.life > 0) { d.life -= dt * 1.2; s.position.x += d.vx * dt; s.position.y += d.vy * dt; s.position.z += d.vz * dt; d.vy -= 3 * dt; s.material.opacity = Math.max(0, d.life); s.material.color.setHSL(0.08 * d.life, 1, 0.45 + 0.3 * d.life); } });
      puffs.forEach((s) => { const d = s.userData; if (d.life > 0) { d.life -= dt * 0.45; s.position.x += d.vx * dt; s.position.y += d.g * dt; s.position.z += d.vz * dt; s.scale.multiplyScalar(1 + 0.9 * dt); s.material.opacity = 0.5 * Math.max(0, d.life); } });
      if (impactAt >= 0) { const a = t - impactAt; debris.forEach((m) => { const v = m.userData.v; v.y -= 22 * dt; m.position.addScaledVector(v, dt); m.rotation.x += m.userData.r * dt; m.rotation.z += m.userData.r * dt; }); dust.scale.setScalar(30 + 40 * a); dust.material.opacity = Math.max(0, 0.9 - a * 0.9); ring.scale.setScalar(1 + 40 * a); ring.material.opacity = Math.max(0, 0.9 - a * 2.5); }
      renderer.render(scene, cam);
      if (state !== 'ending' || (impactAt >= 0 && t - impactAt < 1.2)) raf = requestAnimationFrame(frame);
    }
    const onResize = () => { view.resize(); cam.aspect = canvas.clientWidth / canvas.clientHeight; cam.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize); onResize();
    raf = requestAnimationFrame(frame);
  }
})();
