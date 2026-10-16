/* Three-dimensional view of a throw, driven by frames from the physics core (no physics here).
   World axes: x along the throw, y up, z sideways. Units are meters. */
(function (root) {
  'use strict';
  const T = root.THREE;
  function View3D(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(38, 1, 0.1, 5000);
    this.orbit = { az: 0.95, pol: 1.25, dist: 30, target: new T.Vector3(0, 4, 0), user: false };
    this.mode = 'machine';
    this.theme();
    this.lights();
    this.ground = null; this.parts = null; this.machineG = new T.Group(); this.scene.add(this.machineG);
    this.stoneTrail = null;
    this.bindOrbit();
    this.resize();
  }
  View3D.prototype.theme = function () {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    this.dark = dark;
    this.scene.background = new T.Color(dark ? 0x1b1c1e : 0xe9eef3);
    this.scene.fog = new T.Fog(this.scene.background, 400, 2600);
    this.col = { timber: 0xb08a55, timber2: 0x8f6d42, iron: 0x4a4947, steel: 0x6f7378, rope: dark ? 0xd9d3c6 : 0x5a5651, stone: 0x2e2c29, box: 0x6d6a66, cfrp: 0x3b3b3b, wall: 0xc9c2b2, ground: dark ? 0x262927 : 0xd3d9cc, grid: dark ? 0x3d423f : 0xaab3a7, person: 0x7a7871 };
    if (this.ground) this.buildGround();
    if (this.parts) this.parts.ground && this.buildGround();
  };
  View3D.prototype.lights = function () {
    this.scene.add(new T.HemisphereLight(0xffffff, 0x556655, 0.85));
    const d = new T.DirectionalLight(0xffffff, 0.75); d.position.set(-40, 80, 60); this.scene.add(d);
  };
  View3D.prototype.buildGround = function () {
    if (this.ground) { this.scene.remove(this.ground); }
    const g = new T.Group();
    const plane = new T.Mesh(new T.PlaneGeometry(4000, 1200), new T.MeshBasicMaterial({ color: this.col.ground }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(1200, -0.02, 0); g.add(plane);
    const grid = new T.GridHelper(2000, 200, this.col.grid, this.col.grid); grid.position.set(800, 0, 0); grid.material.opacity = 0.5; grid.material.transparent = true; g.add(grid);
    this.ground = g; this.scene.add(g);
  };
  View3D.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.render();
  };
  // ---------- helpers ----------
  function cyl(r1, r2, len, seg, mat) { const g = new T.CylinderGeometry(r1, r2, len, seg); g.translate(0, len / 2, 0); return new T.Mesh(g, mat); }
  const UP = new T.Vector3(0, 1, 0);
  function place(mesh, a, b) { // a, b: [x,y] in the xy plane (z given by mesh.userData.z)
    const z = mesh.userData.z || 0;
    const A = new T.Vector3(a[0], a[1], z), B = new T.Vector3(b[0], b[1], z);
    const d = new T.Vector3().subVectors(B, A); const len = d.length();
    mesh.position.copy(A); mesh.scale.set(1, len / (mesh.userData.len || 1), 1);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  function segMesh(r1, r2, len, seg, mat, z) { const m = cyl(r1, r2, len, seg, mat); m.userData.len = len; m.userData.z = z || 0; return m; }
  // ---------- machine ----------
  View3D.prototype.setMachine = function (mc, d, frames, flight, scene, res) {
    this.mc = mc; this.d = d; this.frames = frames || []; this.flight = flight || null; this.res = res || null; this.sceneSpec = scene || null;
    if (!this.ground) this.buildGround();
    while (this.machineG.children.length) this.machineG.remove(this.machineG.children[0]);
    const arch = mc.arch, Lb = mc.L1 + mc.L2, H = d.H;
    const timber = new T.MeshLambertMaterial({ color: this.col.timber }), timber2 = new T.MeshLambertMaterial({ color: this.col.timber2 });
    const iron = new T.MeshLambertMaterial({ color: this.col.iron }), steel = new T.MeshLambertMaterial({ color: this.col.steel });
    const boxMat = new T.MeshLambertMaterial({ color: this.col.box }), stoneMat = new T.MeshLambertMaterial({ color: this.col.stone });
    const ropeMat = new T.LineBasicMaterial({ color: this.col.rope });
    const modern = mc.mu_a < 0.01 && mc.arch !== 'trac';
    const zf = 0.5 + 0.09 * Lb; // half spacing of the frames
    const P = this.parts = {};
    const legR = Math.max(0.06, 0.016 * Lb), beamR = Math.max(0.05, (mc.D_b > 0 ? mc.D_b : 0.0275 * Lb) / 2);
    // frame
    P.frame = new T.Group(); this.machineG.add(P.frame);
    if (arch === 'fat') {
      const post = Math.max(0.05, 0.012 * Lb);
      [-1, 1].forEach((s) => {
        const g1 = cyl(post, post, H + mc.L2 + 1.2, 10, steel); g1.position.set(-1.1 * s * (0.4 + 0.05 * Lb) * 0 - 0.9 * (0.3 + 0.04 * Lb), 0, s * zf * 0.6); P.frame.add(g1);
        const g2 = cyl(post, post, H + mc.L2 + 1.2, 10, steel); g2.position.set(0.9 * (0.3 + 0.04 * Lb), 0, s * zf * 0.6); P.frame.add(g2);
        const leg1 = segMesh(post, post, 1, 10, steel, s * zf); place(leg1, [-0.32 * Lb, 0], [-0.32 * Lb, H]); leg1.userData.len = 1; P.frame.add(leg1);
        const leg2 = segMesh(post, post, 1, 10, steel, s * zf); place(leg2, [0.32 * Lb, 0], [0.32 * Lb, H]); P.frame.add(leg2);
        const rail = segMesh(post * 0.8, post * 0.8, 1, 8, steel, s * zf); place(rail, [-0.34 * Lb, H], [0.34 * Lb, H]); P.frame.add(rail);
      });
    } else {
      const bw = 0.42 * H;
      const wheeled = arch === 'wfcw' || arch === 'whcw';
      const rw = wheeled ? Math.max(0.3, 0.06 * H) : 0;
      [-1, 1].forEach((s) => {
        const l1 = segMesh(legR, legR * 0.8, 1, 8, timber, s * zf); place(l1, [-bw, rw * 2 * 0.0], [0, H]); P.frame.add(l1);
        const l2 = segMesh(legR, legR * 0.8, 1, 8, timber, s * zf); place(l2, [bw, 0], [0, H]); P.frame.add(l2);
        const l3 = segMesh(legR * 0.7, legR * 0.7, 1, 8, timber2, s * zf); place(l3, [-bw * 0.52, H / 2], [bw * 0.52, H / 2]); P.frame.add(l3);
        const sill = segMesh(legR * 0.8, legR * 0.8, 1, 8, timber2, s * zf); place(sill, [-bw * 1.08, legR * 0.8], [bw * 1.08, legR * 0.8]); P.frame.add(sill);
        if (wheeled) [-0.85, 0.85].forEach((f) => { const w = new T.Mesh(new T.CylinderGeometry(rw, rw, 0.25, 18), timber2); w.rotation.x = Math.PI / 2; w.position.set(f * bw, rw, s * (zf + 0.25)); P.frame.add(w); });
      });
      // cross ties between the frames
      const tie = new T.Mesh(new T.CylinderGeometry(legR * 0.6, legR * 0.6, 2 * zf, 8, 1), timber2); tie.rotation.x = Math.PI / 2; tie.position.set(0, H * 0.5, 0); P.frame.add(tie); P.tie = tie;
      const tie2 = tie.clone(); tie2.position.set(bw * 0.9, legR, 0); P.frame.add(tie2); P.tie2 = tie2; P.bw = bw;
    }
    // axle
    P.axle = new T.Mesh(new T.CylinderGeometry(Math.max(0.05, mc.r_a || 0.07), Math.max(0.05, mc.r_a || 0.07), 2 * zf + 0.6, 12), modern ? steel : iron); P.axle.rotation.x = Math.PI / 2; this.machineG.add(P.axle);
    // beam: short arm K→P and long arm P→S, tapered, thick at the axle
    const bseg = modern ? 20 : 8, bmat = modern ? new T.MeshLambertMaterial({ color: this.col.cfrp }) : timber;
    P.beamS = segMesh(beamR, beamR * 0.7, 1, bseg, bmat, 0); this.machineG.add(P.beamS);
    P.beamL = segMesh(beamR, beamR * 0.48, 1, bseg, bmat, 0); this.machineG.add(P.beamL);
    // counterweight
    if (arch !== 'trac') {
      const side = Math.cbrt(mc.M / (modern ? 7874 : 2000));
      P.side = side;
      P.box = new T.Mesh(new T.BoxGeometry(side, side, side), modern ? steel : boxMat); this.machineG.add(P.box);
      if (arch === 'hcw' || arch === 'whcw') { P.hang = [-1, 1].map((s) => { const h = segMesh(0.035, 0.035, 1, 6, iron, s * side * 0.35); this.machineG.add(h); return h; }); }
      else if (arch === 'fat') { P.hang = [-1, 1].map((s) => { const h = segMesh(0.05, 0.05, 1, 6, steel, s * side * 0.35); this.machineG.add(h); return h; }); }
    } else {
      P.crew = []; const n = Math.min(12, Math.max(2, mc.N_p || 8));
      for (let i = 0; i < n; i++) { const g = new T.Group(); const body = cyl(0.16, 0.14, 1.3, 8, new T.MeshLambertMaterial({ color: this.col.person })); const head = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshLambertMaterial({ color: this.col.person })); head.position.y = 1.5; g.add(body, head); this.machineG.add(g); P.crew.push(g); }
      P.ropes = P.crew.map(() => { const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]); const l = new T.Line(geo, ropeMat); this.machineG.add(l); return l; });
    }
    // trough
    const trough = new T.Mesh(new T.BoxGeometry(mc.L1 + 1.2, 0.08, 0.5), timber2); trough.position.set(-(mc.L1 + 1.2) / 2 + 0.3, mc.y_t - 0.04, 0); this.machineG.add(trough); P.trough = trough;
    // sling, pouch and stone
    if (mc.sling) {
      P.sling = [-1, 1].map((s) => { const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]); const l = new T.Line(geo, ropeMat); this.machineG.add(l); return l; });
    }
    const rs = Math.max(0.08, d.d / 2);
    P.stone = new T.Mesh(new T.SphereGeometry(rs, 16, 12), stoneMat); this.machineG.add(P.stone);
    // trail of the flight
    if (this.stoneTrail) { this.scene.remove(this.stoneTrail); this.stoneTrail = null; }
    if (flight && flight.length) {
      const pts = flight.map((q) => new T.Vector3(q[1], Math.max(0, q[2]), 0));
      this.stoneTrail = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({ color: this.col.rope, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.6 }));
      this.stoneTrail.computeLineDistances(); this.scene.add(this.stoneTrail);
    }
    // the wall
    if (P.wallG) { this.scene.remove(P.wallG); }
    if (scene && scene.wall) {
      const w = scene.wall, g = new T.Group();
      const wallMat = new T.MeshLambertMaterial({ color: this.col.wall });
      const main = new T.Mesh(new T.BoxGeometry(w.t || 2.5, w.h, 80), wallMat); main.position.set(w.x + (w.t || 2.5) / 2, w.h / 2, 0); g.add(main);
      // crenellations
      for (let i = -38; i <= 38; i += 4) { const c = new T.Mesh(new T.BoxGeometry(w.t || 2.5, 1.2, 2), wallMat); c.position.set(w.x + (w.t || 2.5) / 2, w.h + 0.6, i); g.add(c); }
      if (w.forewall !== false && w.x > 40) {
        const fw = new T.Mesh(new T.BoxGeometry(3.8, 3.5, 80), wallMat); fw.position.set(w.x - 9 - 1.9, 1.75, 0); g.add(fw);
        const moat = new T.Mesh(new T.BoxGeometry(17, 0.3, 80), new T.MeshLambertMaterial({ color: this.dark ? 0x101211 : 0x9aa39c })); moat.position.set(w.x - 9 - 3.8 - 8.5, 0.05, 0); g.add(moat);
      }
      P.wallG = g; this.scene.add(g);
    }
    // a person for scale, by the trough
    const person = new T.Group(); const pb = cyl(0.17, 0.15, 1.45, 8, new T.MeshLambertMaterial({ color: this.col.person })); const ph = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), new T.MeshLambertMaterial({ color: this.col.person })); ph.position.y = 1.62; person.add(pb, ph); person.position.set(-(mc.L1 + 2.5), 0, zf + 1.2); this.machineG.add(person);
    const shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
    const disc = new T.Mesh(new T.CircleGeometry(0.35, 16), shadowMat); disc.rotation.x = -Math.PI / 2; disc.position.set(person.position.x, 0.01, person.position.z); this.machineG.add(disc);
    const pad = new T.Mesh(new T.PlaneGeometry(Math.max(2, 0.42 * H) * 2.3 + 1, 2 * zf + 1.0), shadowMat); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.005, 0); P.pad = pad; this.machineG.add(pad);
    this.orbit.user = false;
    this.setTime(0);
  };
  View3D.prototype.frameAt = function (t) {
    const F = this.frames; if (!F.length) return null;
    if (t <= F[0].t) return F[0];
    if (t >= F[F.length - 1].t) return F[F.length - 1];
    let lo = 0, hi = F.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F[mid].t <= t) lo = mid; else hi = mid; }
    const a = F[lo], b = F[hi], f = (t - a.t) / Math.max(1e-9, b.t - a.t), L = (u, v) => u + (v - u) * f, P2 = (u, v) => (u && v ? [L(u[0], v[0]), L(u[1], v[1])] : (u || v));
    return { t, phase: a.phase, th: L(a.th, b.th), ps: L(a.ps, b.ps), ph: L(a.ph, b.ph), x: L(a.x, b.x), P: P2(a.P, b.P), S: P2(a.S, b.S), K: P2(a.K, b.K), C: P2(a.C, b.C), p: (a.p && b.p) ? P2(a.p, b.p) : null };
  };
  View3D.prototype.flightAt = function (tf) {
    const FL = this.flight; if (!FL || !FL.length) return null;
    if (tf <= 0) return FL[0]; if (tf >= FL[FL.length - 1][0]) return FL[FL.length - 1];
    let lo = 0, hi = FL.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (FL[mid][0] <= tf) lo = mid; else hi = mid; }
    const a = FL[lo], b = FL[hi], f = (tf - a[0]) / Math.max(1e-9, b[0] - a[0]);
    return [tf, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  // t: machine time; flight time runs from t_release
  View3D.prototype.setTime = function (t) {
    const P = this.parts, mc = this.mc; if (!P) return;
    const fr = this.frameAt(t); if (!fr) return;
    const tRel = this.res && Number.isFinite(this.res.t_release) ? this.res.t_release : Infinity;
    const released = t > tRel + 1e-6;
    // frame follows the axle in x for rolling machines; floating arm: portal fixed, axle slides
    if (mc.arch === 'fat') { P.frame.position.set(0, 0, 0); } else { P.frame.position.set(fr.P[0], 0, 0); if (P.pad) P.pad.position.x = fr.P[0]; }
    P.axle.position.set(fr.P[0], fr.P[1], 0);
    place(P.beamS, fr.P, fr.K); place(P.beamL, fr.P, fr.S);
    if (P.box) {
      const side = P.side;
      if (mc.arch === 'hcw' || mc.arch === 'whcw') {
        const ux = -Math.sin(fr.ps), uy = -Math.cos(fr.ps);
        P.box.position.set(fr.C[0], fr.C[1], 0); P.box.rotation.z = -fr.ps;
        P.hang.forEach((h) => place(h, fr.K, [fr.C[0] - ux * side * 0.5, fr.C[1] - uy * side * 0.5]));
      } else if (mc.arch === 'fat') {
        P.box.position.set(fr.C[0], fr.C[1] - side * 0.55, 0); P.box.rotation.z = 0;
        P.hang.forEach((h) => place(h, fr.K, [fr.C[0], fr.C[1] - side * 0.05]));
      } else {
        const a = fr.th - Math.PI / 2; const ux = -Math.sin(a), uy = -Math.cos(a);
        P.box.position.set(fr.C[0], fr.C[1], 0); P.box.rotation.z = fr.th - Math.PI / 2 + Math.PI / 2;
        void ux; void uy;
      }
    }
    if (P.crew) {
      const ep = [Math.sin(mc.alpha_p || 0), -Math.cos(mc.alpha_p || 0)];
      P.crew.forEach((g, i) => { const dx = (i - (P.crew.length - 1) / 2) * 0.55; const px = fr.K[0] + ep[0] * Math.max(0.3, (fr.K[1] - 1.0) / Math.max(0.05, -ep[1])) + dx; g.position.set(px, 0, (i % 2 ? 1 : -1) * 0.5);
        const l = P.ropes[i]; const pos = l.geometry.attributes.position; pos.setXYZ(0, fr.K[0], fr.K[1], 0); pos.setXYZ(1, px, 1.3, (i % 2 ? 1 : -1) * 0.5); pos.needsUpdate = true; });
    }
    P.trough.position.x = -(mc.L1 + 1.2) / 2 + 0.3 + (mc.arch === 'fat' ? 0 : fr.P[0]);
    let stone = null, inFlight = false;
    if (!released && fr.p) stone = fr.p;
    else if (released) { const q = this.flightAt(t - tRel); if (q) { stone = [q[1], Math.max(this.mc.y_target || 0, q[2])]; inFlight = true; } }
    if (P.sling) {
      const a = fr.S, b = (!released && fr.p) ? fr.p : null;
      P.sling.forEach((l, i) => { const pos = l.geometry.attributes.position; if (b) { pos.setXYZ(0, a[0], a[1], (i ? 0.12 : -0.12)); pos.setXYZ(1, b[0], b[1], (i ? 0.1 : -0.1)); l.visible = true; } else { l.visible = false; } pos.needsUpdate = true; });
    }
    if (stone) { P.stone.visible = true; P.stone.position.set(stone[0], stone[1], 0); } else P.stone.visible = false;
    if (this.stoneTrail) this.stoneTrail.visible = inFlight;
    this.lastStone = stone; this.lastFr = fr; this.inFlight = inFlight;
    this.updateCamera();
    this.render();
  };
  View3D.prototype.updateCamera = function () {
    const o = this.orbit, mc = this.mc, d = this.d; if (!mc) return;
    const Lb = mc.L1 + mc.L2;
    let target, dist;
    if (this.mode === 'stone' && this.inFlight && this.lastStone) { target = new T.Vector3(this.lastStone[0], this.lastStone[1], 0); dist = Math.max(12, 3.2 * Lb); }
    else if (this.mode === 'whole' && this.res && Number.isFinite(this.res.R)) { const R = Math.max(this.res.R, 2 * Lb); target = new T.Vector3(R * 0.45, Math.max(this.res.apex || 0, d.H) * 0.35, 0); dist = Math.max(R * 0.95, 20); }
    else { target = new T.Vector3((this.lastFr ? this.lastFr.P[0] : 0), Math.max(0.85 * d.H, 0.4 * Lb), 0); dist = Math.max(8, 3.4 * Lb); }
    if (!o.user) { o.target.lerp(target, 0.25); o.dist += (dist - o.dist) * 0.2; }
    else { o.target.lerp(target, 0.15); }
    const x = o.target.x + o.dist * Math.sin(o.pol) * Math.sin(o.az), y = o.target.y + o.dist * Math.cos(o.pol), z = o.target.z + o.dist * Math.sin(o.pol) * Math.cos(o.az);
    this.camera.position.set(x, Math.max(0.6, y), z); this.camera.lookAt(o.target);
  };
  View3D.prototype.setMode = function (m) { this.mode = m; this.orbit.user = false; this.updateCamera(); this.render(); };
  View3D.prototype.render = function () { this.renderer.render(this.scene, this.camera); };
  View3D.prototype.bindOrbit = function () {
    const c = this.canvas, o = this.orbit; let drag = null, pinch = null;
    const down = (x, y) => { drag = { x, y, az: o.az, pol: o.pol }; };
    const move = (x, y) => { if (!drag) return; o.az = drag.az - (x - drag.x) * 0.008; o.pol = Math.min(1.5, Math.max(0.25, drag.pol - (y - drag.y) * 0.006)); o.user = true; this.updateCamera(); this.render(); };
    c.addEventListener('mousedown', (e) => { down(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => { drag = null; });
    c.addEventListener('wheel', (e) => { o.dist = Math.min(3000, Math.max(3, o.dist * (1 + Math.sign(e.deltaY) * 0.12))); o.user = true; this.updateCamera(); this.render(); e.preventDefault(); }, { passive: false });
    c.addEventListener('touchstart', (e) => { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), dist: o.dist }; }, { passive: true });
    c.addEventListener('touchmove', (e) => { if (e.touches.length === 1 && drag) { move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } else if (e.touches.length === 2 && pinch) { const dd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); o.dist = Math.min(3000, Math.max(3, pinch.dist * pinch.d / dd)); o.user = true; this.updateCamera(); this.render(); e.preventDefault(); } }, { passive: false });
    c.addEventListener('touchend', () => { drag = null; pinch = null; });
    c.addEventListener('dblclick', () => { o.user = false; this.updateCamera(); this.render(); });
  };
  root.TrebView3D = View3D;
})(typeof self !== 'undefined' ? self : this);
