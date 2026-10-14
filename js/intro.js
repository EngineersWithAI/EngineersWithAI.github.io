/* Opening shot: the 1187 machine throws a fireball at a castle, the camera rides the ball into the
   wall, and the page fades in. Drawn live with three.js on the machine's real throw (run P7-R12);
   the flight to the wall is staged for the shot. Plays once per visitor, never with reduced motion,
   and index.html?intro replays it. Set ENABLED to false (or remove the two intro lines in
   index.html) and the site is as it was. */
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

  const canvas = ov.querySelector('canvas'), flash = ov.querySelector('.intro-flash'), skip = ov.querySelector('.intro-skip'), word = ov.querySelector('.intro-word');
  let state = 'loading', raf = 0, view = null, startedAt = 0;

  // ---- ending: flash, black, then the page fades in ----
  function end(fast) {
    if (state === 'ending') return; state = 'ending';
    cancelAnimationFrame(raf);
    const go = () => { ov.classList.add('intro-out'); setTimeout(() => { bail(); if (view) try { view.renderer.dispose(); } catch (e) {} }, fast ? 700 : 1600); };
    skip.hidden = true;
    if (fast) { go(); return; }
    flash.classList.add('white');
    setTimeout(() => { flash.classList.add('black'); }, 90);
    setTimeout(go, 750);
  }
  skip.addEventListener('click', () => end(true));
  ov.addEventListener('click', (e) => { if (e.target === skip) return; if (state === 'playing') end(true); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state !== 'ending') end(true); });
  // if the scene has not started within a few seconds, let the page through
  const guard = setTimeout(() => { if (state === 'loading') end(true); }, 7000);

  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
  const needThree = !window.THREE, needView = !window.TrebView3D;
  (needThree ? load('lib/three.min.js') : Promise.resolve()).then(() => (needView ? load('js/pg-3d.js') : null)).then(run).catch(() => end(true));

  // ---- the scene ----
  function run() {
    if (state !== 'loading') return;
    const T = window.THREE, D = window.TREB_THROWS.jerusalem1187;
    const mc = Object.assign({ arch: 'hcw', mu_a: 0.2, sling: true, r_a: 0.07 }, D.machine), res = D.result, frames = D.frames;
    view = new window.TrebView3D(canvas);
    view.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    view.updateCamera = function () {}; view.render = function () {}; // the camera is scripted here
    const scene = view.scene, cam = view.camera;
    cam.fov = 42; cam.near = 0.2; cam.far = 3000;

    // dusk palette, after the painting: teal-grey sky, olive ground, warm fire
    const SKY_TOP = 0x34424f, SKY_HOR = 0x8a9499, FOG = 0x6b767e, GROUND = 0x30372a;
    scene.background = new T.Color(SKY_HOR);
    scene.fog = new T.Fog(FOG, 80, 1100);
    scene.children.filter((c) => c.isLight).forEach((c) => scene.remove(c));
    scene.add(new T.HemisphereLight(0x8d9aa6, 0x2a2f24, 0.6));
    const rim = new T.DirectionalLight(0xb9c3cc, 0.35); rim.position.set(300, 120, -150); scene.add(rim);

    // sky dome with a vertical gradient (not fogged)
    const skyG = new T.SphereGeometry(1400, 24, 12); const sc = new Float32Array(skyG.attributes.position.count * 3);
    const cTop = new T.Color(SKY_TOP), cHor = new T.Color(SKY_HOR);
    for (let i = 0; i < skyG.attributes.position.count; i++) { const y = skyG.attributes.position.getY(i) / 1400; const f = Math.max(0, Math.min(1, (y + 0.05) / 0.5)); const c = cHor.clone().lerp(cTop, Math.pow(f, 0.8)); sc[3 * i] = c.r; sc[3 * i + 1] = c.g; sc[3 * i + 2] = c.b; }
    skyG.setAttribute('color', new T.BufferAttribute(sc, 3));
    scene.add(new T.Mesh(skyG, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })));

    // the machine (built by the Proving Ground's view), then its flat ground replaced by terrain
    view.setMachine(mc, { H: mc.H, d: mc.d }, frames, null, null, res);
    if (view.ground) { scene.remove(view.ground); view.ground = null; }
    view.machineG.traverse((o) => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.72); } });
    const hill = (x, z) => { const u = Math.max(0, Math.min(1, (x - 80) / 125)); const s = u * u * (3 - 2 * u); return 16 * s + 0.6 * Math.sin(x * 0.11) * Math.cos(z * 0.07) + 0.25 * Math.sin(x * 0.37 + z * 0.23); };
    const terrG = new T.PlaneGeometry(1600, 900, 80, 45); terrG.rotateX(-Math.PI / 2);
    const tp = terrG.attributes.position;
    for (let i = 0; i < tp.count; i++) { const x = tp.getX(i) + 300, z = tp.getZ(i); tp.setX(i, x); tp.setY(i, (x > -40 && x < 40 && Math.abs(z) < 40) ? -0.05 : hill(x, z) - 0.05); }
    const terrF = terrG.toNonIndexed(); terrF.computeVertexNormals();
    scene.add(new T.Mesh(terrF, new T.MeshLambertMaterial({ color: GROUND })));

    // glow texture for fire, drawn in code
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,210,120,0.9)'); r.addColorStop(0.6, 'rgba(255,120,30,0.35)'); r.addColorStop(1, 'rgba(255,80,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; })();
    const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(40,40,44,0.8)'); r.addColorStop(0.5, 'rgba(50,50,54,0.4)'); r.addColorStop(1, 'rgba(60,60,64,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const glow = (size, color, opacity) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };

    // the castle on the hill
    const CX = 214, CZ = 0, base = hill(CX, CZ);
    const stoneMat = new T.MeshLambertMaterial({ color: 0x4e565e }), darkMat = new T.MeshLambertMaterial({ color: 0x3c4249 });
    const castle = new T.Group(); scene.add(castle);
    const wallH = 15, wallT = 5, wallLen = 160;
    const wall = new T.Mesh(new T.BoxGeometry(wallT, wallH + 2, wallLen), stoneMat); wall.position.set(CX, base + wallH / 2 - 1, CZ); castle.add(wall);
    for (let z = -wallLen / 2 + 2; z <= wallLen / 2 - 2; z += 4) { const m = new T.Mesh(new T.BoxGeometry(wallT, 1.6, 2.2), stoneMat); m.position.set(CX, base + wallH + 0.8, CZ + z); castle.add(m); }
    const towers = [[-wallLen / 2, 24], [-30, 27], [34, 29], [wallLen / 2, 24]];
    towers.forEach(([z, h]) => { const t = new T.Mesh(new T.CylinderGeometry(6, 6.6, h, 12), stoneMat); t.position.set(CX, base + h / 2, CZ + z); castle.add(t); const cap = new T.Mesh(new T.CylinderGeometry(6.8, 6.8, 1.4, 12), darkMat); cap.position.set(CX, base + h + 0.7, CZ + z); castle.add(cap); });
    const keep = new T.Mesh(new T.BoxGeometry(24, 36, 22), darkMat); keep.position.set(CX + 28, hill(CX + 28, 8) + 18, CZ + 8); castle.add(keep);
    const pole = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 9, 6), darkMat); pole.position.set(CX + 28, hill(CX + 28, 8) + 40, CZ + 8); castle.add(pole);
    const flag = new T.Mesh(new T.PlaneGeometry(4, 2.4), new T.MeshBasicMaterial({ color: 0xb8402a, side: T.DoubleSide })); flag.position.set(CX + 30, hill(CX + 28, 8) + 43.5, CZ + 8); castle.add(flag);
    // a tower already burning, with smoke rising
    const fireAt = new T.Vector3(CX, base + 30, CZ + 34);
    const fireL = new T.PointLight(0xff7a2a, 2.2, 140, 1.6); fireL.position.copy(fireAt); scene.add(fireL);
    const fireS = glow(26, 0xffa040, 0.95); fireS.position.copy(fireAt); scene.add(fireS);
    const smokes = []; for (let i = 0; i < 9; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.55, depthWrite: false })); s.scale.set(16, 16, 1); s.userData = { a: i / 9 }; scene.add(s); smokes.push(s); }

    // the camp beside the machine
    const tentMat = new T.MeshLambertMaterial({ color: 0x8a8070 });
    [[-26, 18], [-30, 9], [-24, -14], [-34, -6], [-18, 26], [14, 30], [20, -28], [-12, -30]].forEach(([x, z]) => { const t = new T.Mesh(new T.ConeGeometry(2.6, 3.4, 7), tentMat); t.position.set(x, 1.65, z); t.rotation.y = x; scene.add(t); });
    const campAt = new T.Vector3(-8, 0.3, 11);
    const campL = new T.PointLight(0xffa24a, 1.4, 40, 1.5); campL.position.set(campAt.x, 1.2, campAt.z); scene.add(campL);
    const campS = glow(5, 0xffb060, 0.9); campS.position.copy(campAt); scene.add(campS);
    const bannerMat = new T.MeshBasicMaterial({ color: 0xa83a2c, side: T.DoubleSide });
    [[-8, -24], [18, 22]].forEach(([x, z]) => { const p = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 5, 5), darkMat); p.position.set(x, 2.5, z); scene.add(p); const b = new T.Mesh(new T.PlaneGeometry(1.2, 2.0), bannerMat); b.position.set(x + 0.6, 4.0, z); scene.add(b); });

    // the fireball: glow and light that ride the stone, plus a trail of embers
    const ball = new T.Group(); scene.add(ball);
    const ballCore = new T.Mesh(new T.SphereGeometry(mc.d * 0.55, 12, 10), new T.MeshBasicMaterial({ color: 0xffe9b0 })); ball.add(ballCore);
    ball.add(glow(2.2, 0xffc060, 1)); ball.add(glow(4.5, 0xff7a20, 0.45));
    const ballL = new T.PointLight(0xffa040, 2.5, 60, 1.4); ball.add(ballL);
    const embers = []; for (let i = 0; i < 90; i++) { const s = glow(1.2, 0xff9a40, 0); s.userData = { life: 0 }; scene.add(s); embers.push(s); }
    let emberI = 0;
    const emit = (p, spread, size, n) => { for (let k = 0; k < n; k++) { const s = embers[emberI++ % embers.length]; s.position.set(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * spread, p.z + (Math.random() - 0.5) * spread); s.userData = { life: 1, vy: 0.4 + Math.random() * 1.2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2 }; s.scale.set(size, size, 1); s.material.opacity = 1; } };
    // debris for the impact
    const debris = []; for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.BoxGeometry(0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random()), stoneMat); m.visible = false; scene.add(m); debris.push(m); }

    // ---- the shot ----
    const tRel = res.t_release;
    const PRE = 0.9;                   // hold on the wide shot
    const FLY = 2.9;                   // staged flight to the wall
    const relFr = view.frameAt(tRel - 0.02); const P0 = new T.Vector3(relFr.p ? relFr.p[0] : -5.8, relFr.p ? relFr.p[1] : 21.6, 0);
    const HIT = new T.Vector3(CX - wallT / 2 - 0.3, base + 8, CZ - 4);
    const APEX = 48;
    const flightPos = (u) => new T.Vector3(P0.x + (HIT.x - P0.x) * u, P0.y + (HIT.y - P0.y) * u + 4 * APEX * u * (1 - u), P0.z + (HIT.z - P0.z) * u);
    const camWide = new T.Vector3(-36, 6, 46), lookWide = new T.Vector3(36, 12, -12);
    const camPos = new T.Vector3().copy(camWide), look = new T.Vector3().copy(lookWide);
    cam.position.copy(camPos); cam.lookAt(look);
    let impactAt = -1, last = 0;
    state = 'playing'; clearTimeout(guard); word.classList.add('off');
    startedAt = performance.now();
    window.trebIntroSeek = (sec) => { startedAt = performance.now() - sec * 1000; };

    function frame(now) {
      const t = (now - startedAt) / 1000, dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const tm = Math.max(0, t - PRE);                        // machine time
      view.setTime(Math.min(tm, frames[frames.length - 1].t));
      const released = tm > tRel;
      const u = released ? Math.min(1, (tm - tRel) / FLY) : 0;
      // fireball position
      let bp;
      if (!released) { const s = view.lastStone || [P0.x, P0.y]; bp = new T.Vector3(s[0], s[1], 0); }
      else bp = flightPos(u);
      ball.position.copy(bp);
      ballL.intensity = 2.5 + 0.6 * Math.sin(t * 37);
      if (released && u < 1) emit(bp, 1.2, 1.2 + Math.random(), 3);
      // camera: wide, then a slow push in, then the ride
      if (!released) {
        const k = Math.min(1, t / (PRE + tRel)); camPos.lerpVectors(camWide, new T.Vector3(-28, 6.5, 38), k * k); look.copy(lookWide);
      } else {
        const ahead = flightPos(Math.min(1, u + 0.02)); const dir = ahead.clone().sub(bp).normalize();
        const back = 16 - 12.5 * u, up = 4.5 - 3.4 * u;                      // closing in like a drone
        const want = bp.clone().addScaledVector(dir, -back).add(new T.Vector3(0, up, 0));
        const blend = Math.min(1, (tm - tRel) / 0.7);
        camPos.lerp(want, 0.06 + 0.5 * blend);
        const wantLook = bp.clone().addScaledVector(dir, 6 * (1 - u));
        look.lerp(wantLook, 0.12 + 0.6 * blend);
        const jitter = 0.03 + 0.12 * u; camPos.x += (Math.random() - 0.5) * jitter; camPos.y += (Math.random() - 0.5) * jitter;
      }
      cam.position.copy(camPos); cam.lookAt(look);
      cam.fov = 42 + (released ? 14 * u : 0); cam.updateProjectionMatrix();
      // embers and smoke
      embers.forEach((s) => { const d = s.userData; if (d.life > 0) { d.life -= dt * 1.4; s.position.x += d.vx * dt; s.position.y += d.vy * dt; s.position.z += d.vz * dt; s.material.opacity = Math.max(0, d.life); s.material.color.setHSL(0.07 * d.life, 1, 0.4 + 0.3 * d.life); } });
      smokes.forEach((s) => { const a = (s.userData.a + t * 0.07) % 1; s.position.set(fireAt.x + 6 * a + 3 * Math.sin(a * 9), fireAt.y + 2 + 70 * a, fireAt.z + 4 * Math.sin(a * 5)); const k = 10 + 40 * a; s.scale.set(k, k, 1); s.material.opacity = 0.5 * (1 - a) * Math.min(1, a * 8); });
      fireL.intensity = 2.0 + 0.5 * Math.sin(t * 23) + 0.3 * Math.sin(t * 41); fireS.material.opacity = 0.8 + 0.15 * Math.sin(t * 29);
      campL.intensity = 1.3 + 0.3 * Math.sin(t * 19);
      // impact
      if (released && u >= 1 && impactAt < 0) {
        impactAt = t; ball.visible = false; emit(HIT, 6, 4, 60);
        debris.forEach((m) => { m.visible = true; m.position.copy(HIT); m.userData = { v: new T.Vector3((Math.random() - 1.2) * 14, Math.random() * 12, (Math.random() - 0.5) * 16), r: Math.random() * 6 }; });
        end(false);
      }
      if (impactAt >= 0) debris.forEach((m) => { const v = m.userData.v; v.y -= 20 * dt; m.position.addScaledVector(v, dt); m.rotation.x += m.userData.r * dt; m.rotation.z += m.userData.r * dt; });
      view.renderer.render(scene, cam);
      if (state !== 'ending' || (impactAt >= 0 && t - impactAt < 0.3)) raf = requestAnimationFrame(frame);
    }
    const onResize = () => { view.resize(); cam.aspect = canvas.clientWidth / canvas.clientHeight; cam.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize); onResize();
    raf = requestAnimationFrame(frame);
  }
})();
