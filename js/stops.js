/* The ten stops' instruments. Data comes from data/*.js (run records), never computed here except arithmetic. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const fmt = window.trebFmt;
  const css = window.trebCss;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
  const txt = (parent, x, y, s, attrs) => { const t = el('text', Object.assign({ x, y }, attrs || {}), parent); t.textContent = s; return t; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RUNS = window.TREB_RUNS, THROWS = window.TREB_THROWS;

  // ================= 1. guess first =================
  (function guess() {
    const sl = $('#guess'), val = $('#guess-val'), btn = $('#guess-btn'), out = $('#guess-out'), bar = $('#guessbar');
    if (!sl) return;
    sl.addEventListener('input', () => { val.innerHTML = sl.value + '<small>m</small>'; });
    btn.addEventListener('click', () => {
      out.hidden = false; sl.disabled = true; btn.disabled = true;
      const W = 620;
      const marks = [[370, 'Josephus: two stades, about 370 m', ''], [+sl.value, 'your guess', 'you']];
      bar.innerHTML = '';
      marks.forEach(([v, l, c]) => { const i = document.createElement('i'); i.className = c; i.style.left = (v / W * 100) + '%'; i.setAttribute('data-l', l); bar.append(i); });
      [100, 200, 300, 400, 500, 600].forEach((v) => { const b = document.createElement('b'); b.style.left = (v / W * 100) + '%'; b.title = v + ' m'; bar.append(b); });
      window.trebToast('You guessed ' + sl.value + ' m');
    });
  })();

  // ================= 2. Philo's rule =================
  (function philo() {
    const sl = $('#philo'); if (!sl) return;
    const mOut = $('#philo-m'), dOut = $('#philo-d'), draw = $('#philo-draw');
    const W = 520, H = 240;
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' }, draw);
    const g = el('g', {}, svg);
    function render() {
      const m = +sl.value; const D = 0.13 * Math.cbrt(m);
      mOut.innerHTML = m + '<small>kg' + (m === 26 ? ' (a talent)' : '') + '</small>';
      dOut.textContent = D.toFixed(2) + ' m';
      g.innerHTML = '';
      // Top view of a two-armed torsion stone-thrower, cocked. Everything is drawn as a multiple of the
      // spring hole D, so the whole engine grows and shrinks with the slider. 1 m = 44 px.
      const s = 44, d = D * s;
      const ink = css('--ink'), col = css('--ink-2'), mute = css('--muted'), wood = css('--wood'), line = css('--line');
      const cx = 165, top = 26;                       // engine centre line and the front of the frame
      const box = 1.7 * d, span = 4.2 * d;            // spring box side; distance between the two springs
      const lx = cx - span / 2, rx = cx + span / 2, cy = top + box / 2;
      // frame: two spring boxes joined by a front and a back bar
      [lx, rx].forEach((x) => el('rect', { x: x - box / 2, y: top, width: box, height: box, fill: 'none', stroke: col, 'stroke-width': 2, rx: 1.5 }, g));
      el('rect', { x: lx + box / 2, y: top + 2, width: span - box, height: box * 0.22, fill: wood, stroke: col, 'stroke-width': 1 }, g);
      el('rect', { x: lx + box / 2, y: top + box - 2 - box * 0.22, width: span - box, height: box * 0.22, fill: wood, stroke: col, 'stroke-width': 1 }, g);
      // the springs: a hole of diameter D seen from above, filled with twisted sinew
      [lx, rx].forEach((x) => {
        el('circle', { cx: x, cy: cy, r: d / 2, fill: wood, stroke: ink, 'stroke-width': 1.5 }, g);
        for (let i = -2; i <= 2; i++) { const o = i * d / 6, hh = Math.sqrt(Math.max(d * d / 4 - o * o, 0)); el('line', { x1: x + o - hh * 0.35, y1: cy - hh * 0.9, x2: x + o + hh * 0.35, y2: cy + hh * 0.9, stroke: ink, 'stroke-width': 0.8, opacity: 0.6 }, g); }
      });
      // stock (the slider the stone rides on), running back from the frame
      const stock = 6 * d, sw = Math.max(0.5 * d, 4);
      el('rect', { x: cx - sw / 2, y: top + box - 2, width: sw, height: stock, fill: 'none', stroke: col, 'stroke-width': 2 }, g);
      el('line', { x1: cx, y1: top + box, x2: cx, y2: top + box + stock - 4, stroke: line, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g);
      // arms, cocked: from each spring outward and back; the bowstring joins their tips through the pouch
      const arm = 3.4 * d, ang = 38 * Math.PI / 180;
      const ltx = lx - arm * Math.cos(ang), lty = cy + arm * Math.sin(ang);
      const rtx = rx + arm * Math.cos(ang), rty = cy + arm * Math.sin(ang);
      const pouchY = top + box + stock * 0.62;
      el('path', { d: 'M' + ltx + ' ' + lty + ' L' + cx + ' ' + pouchY + ' L' + rtx + ' ' + rty, fill: 'none', stroke: ink, 'stroke-width': 1.2 }, g);
      el('line', { x1: lx, y1: cy, x2: ltx, y2: lty, stroke: ink, 'stroke-width': Math.max(0.28 * d, 2.5), 'stroke-linecap': 'round' }, g);
      el('line', { x1: rx, y1: cy, x2: rtx, y2: rty, stroke: ink, 'stroke-width': Math.max(0.28 * d, 2.5), 'stroke-linecap': 'round' }, g);
      // the stone, to scale (a 2,600 kg/m³ sphere), in the pouch
      const r = Math.max(Math.cbrt(6 * m / (Math.PI * 2600)) / 2 * s, 2);
      el('circle', { cx: cx, cy: pouchY, r: r, fill: ink }, g);
      // direction of fire
      el('path', { d: 'M' + cx + ' ' + (top - 5) + ' l-4 7 h8 z', fill: mute }, g);
      txt(g, cx, top - 10, 'a two-armed stone-thrower (a ballista) from above, aimed up the page', { class: 'lbl', 'text-anchor': 'middle' });
      // labels in a column on the right, each with a leader line to its part
      const LX = 335;
      const rows = [
        ['frame', rx + box / 2, top + box * 0.3, 'Frame: two spring boxes and two bars'],
        ['spring', rx + d / 2, cy, 'Spring: a ' + D.toFixed(2) + ' m hole of twisted sinew'],
        ['arm', rx + arm * 0.55 * Math.cos(ang), cy + arm * 0.55 * Math.sin(ang), 'Arm, set in the spring'],
        ['string', (cx + rtx) / 2, (pouchY + rty) / 2, 'Bowstring, pulled back'],
        ['stone', cx + r, pouchY, 'The ' + m + ' kg stone in its pouch'],
        ['stock', cx + sw / 2, top + box + stock * 0.9, 'Stock: the stone slides along it'],
      ];
      rows.forEach((row, i) => {
        const y = 36 + i * 27;
        el('line', { x1: row[1], y1: row[2], x2: LX - 8, y2: y - 3, stroke: line, 'stroke-width': 1 }, g);
        el('circle', { cx: row[1], cy: row[2], r: 1.8, fill: mute }, g);
        txt(g, LX, y, row[3], { class: 'lbl' });
      });
      // scale bar, 1 m
      const bx = 20, by = H - 12;
      el('line', { x1: bx, y1: by, x2: bx + s, y2: by, stroke: mute, 'stroke-width': 2 }, g);
      [bx, bx + s].forEach((x) => el('line', { x1: x, y1: by - 4, x2: x, y2: by + 4, stroke: mute, 'stroke-width': 2 }, g));
      txt(g, bx + s + 6, by + 4, '1 m', { class: 'lbl' });
    }
    sl.addEventListener('input', render); render();
    window.addEventListener('treb-theme', render);
  })();

  // ================= 3. map =================
  (function map() {
    const svg = $('#map'); if (!svg || !window.TREB_MAP) return;
    const M = window.TREB_MAP;
    const H = 380; svg.setAttribute('viewBox', '0 0 1000 ' + H);
    const X = (lon) => (lon - M.lon0) / (M.lon1 - M.lon0) * M.w;
    const Y = (lat) => (M.lat1 - lat) / (M.lat1 - M.lat0) * M.h + 10;
    const main = el('g', { transform: 'translate(0,0)' }, svg);
    el('path', { d: M.path, class: 'land', transform: 'translate(0,10)' }, main);
    const pts = [
      { y: -400, lon: 15.29, lat: 37.08, k: 'ath', l: 'Syracuse: the torsion catapult is invented, about 400 BC', f: 'P2-F491 P2-F494' },
      { y: -300, lon: 112.5, lat: 34.8, k: 'oth', l: 'China: the traction trebuchet arises, fifth to third centuries BC', f: 'P1-F001 P1-F002' },
      { y: 586, lon: 22.94, lat: 40.64, k: 'oth', l: 'Thessalonica: a bishop describes the Avars’ traction trebuchets', f: 'P3-F134 P3-F136 P1-F006' },
      { y: 626, lon: 28.98, lat: 41.01, k: 'oth', l: 'Constantinople: Avar engines called manganikon, the root of “mangonel”', f: 'P3-F148', dy: 14 },
      { y: 1099, lon: 35.23, lat: 31.78, k: 'jer', l: 'Jerusalem: taken from the north by the First Crusade; engines on both sides', f: 'P2-F133 P2-F226', lev: true },
      { y: 1165, lon: 20.40, lat: 44.85, k: 'oth', l: 'Zevgminon: a winch, read by Dennis as the first clear counterweight reference', f: 'P1-F035' },
      { y: 1180, lon: 31.24, lat: 30.04, k: 'oth', l: 'Saladin’s court at Cairo: al-Ṭarsūsī draws the earliest known counterweight engine', f: 'P3-F035 P3-F038', lev: true },
      { y: 1187, lon: 35.23, lat: 31.78, k: 'jer', l: 'Jerusalem: Saladin’s mangonels at the north-east angle', f: 'P2-F274 P2-F275', lev: true, dy: 14 },
      { y: 1191, lon: 35.08, lat: 32.93, k: 'oth', l: 'Acre: Bad Neighbour, Bad Kinsman and the engine of God', f: 'P3-F022 P3-F023', lev: true },
      { y: 1273, lon: 112.12, lat: 32.01, k: 'oth', l: 'Xiangyang: a counterweight engine built by Muslim engineers for Kublai Khan', f: 'P4-F142 P3-F205', dy: 14 },
      { y: 1291, lon: 35.08, lat: 32.93, k: 'oth', l: 'Acre: a Mamluk engine arrives in a hundred carts', f: 'P3-F144', lev: true, dy: 14 },
      { y: 1304, lon: -3.94, lat: 56.12, k: 'oth', l: 'Stirling: Edward I waits for his War Wolf', f: 'P3-F054 P3-F059' },
      { y: 1453, lon: 28.98, lat: 41.01, k: 'oth', l: 'Constantinople: Orban’s gun breaches the land wall', f: 'P3-F216', dy: 28 },
      { y: 1687, lon: 23.73, lat: 37.97, k: 'ath', l: 'Athens: a Venetian bomb blows up the Parthenon', f: 'P2-F626 P2-F628', dy: 14 },
      { y: 1779, lon: -5.35, lat: 36.14, k: 'oth', l: 'Gibraltar: the last reported use of a trebuchet', f: 'P1-F051 P1-F053' },
    ];
    const arc = (a, b, bend) => { const x1 = X(a[0]), y1 = Y(a[1]), x2 = X(b[0]), y2 = Y(b[1]); return 'M' + x1 + ' ' + y1 + ' Q' + ((x1 + x2) / 2) + ' ' + (Math.min(y1, y2) - bend) + ' ' + x2 + ' ' + y2; };
    const r1 = el('path', { d: arc([112.5, 34.8], [22.94, 40.64], 90), class: 'route' }, main);
    const r2 = el('path', { d: arc([36.29, 33.51], [112.12, 32.01], 60), class: 'route' }, main);
    txt(main, X(68), Y(51), 'the traction trebuchet moves west, by the late 500s', { class: 'lbl', 'text-anchor': 'middle' });
    txt(main, X(74), Y(27), 'counterweight engines travel east, 1273', { class: 'lbl', 'text-anchor': 'middle' });
    // the Levant inset, bottom left: lon 29..38, lat 29..35.5
    const IB = { x: 12, y: 150, w: 250, h: 210, lon0: 29.3, lon1: 37.5, lat0: 29.2, lat1: 35.2 };
    const kx = IB.w / ((IB.lon1 - IB.lon0) / (M.lon1 - M.lon0) * M.w), ky = IB.h / ((IB.lat1 - IB.lat0) / (M.lat1 - M.lat0) * M.h);
    const IX = (lon) => IB.x + (lon - IB.lon0) / (IB.lon1 - IB.lon0) * IB.w, IY = (lat) => IB.y + (IB.lat1 - lat) / (IB.lat1 - IB.lat0) * IB.h;
    const clip = el('clipPath', { id: 'levclip' }, svg); el('rect', { x: IB.x, y: IB.y, width: IB.w, height: IB.h }, clip);
    const ins = el('g', { 'clip-path': 'url(#levclip)' }, svg);
    el('rect', { x: IB.x, y: IB.y, width: IB.w, height: IB.h, fill: css('--bg') }, ins);
    el('path', { d: M.path, class: 'land', transform: 'translate(' + (IB.x - X(IB.lon0) * kx) + ',' + (IB.y - (Y(IB.lat1) - 10) * ky) + ') scale(' + kx + ',' + ky + ')' }, ins);
    el('rect', { x: IB.x, y: IB.y, width: IB.w, height: IB.h, fill: 'none', stroke: css('--line'), 'stroke-width': 1 }, svg);
    txt(svg, IB.x + 6, IB.y + 14, 'The Levant, enlarged', { class: 'lbl' });
    // a frame on the main map showing the inset area
    el('rect', { x: X(IB.lon0), y: Y(IB.lat1), width: X(IB.lon1) - X(IB.lon0), height: Y(IB.lat0) - Y(IB.lat1), fill: 'none', stroke: css('--muted'), 'stroke-width': 0.8, 'stroke-dasharray': '3 2' }, main);
    const groups = pts.map((p) => {
      const g = el('g', { class: 'pt ' + p.k, 'data-y': p.y }, svg);
      const lab = (p.y < 0 ? Math.abs(p.y) + ' BC' : String(p.y));
      if (p.lev) { el('circle', { cx: IX(p.lon), cy: IY(p.lat), r: 4.5 }, g); txt(g, IX(p.lon) + 7, IY(p.lat) + (p.dy || 0) + 4, lab + ' ' + p.l.split(':')[0], {}); el('circle', { cx: X(p.lon), cy: Y(p.lat), r: 2.5 }, g); }
      else { el('circle', { cx: X(p.lon), cy: Y(p.lat), r: 4.5 }, g); txt(g, X(p.lon) + 7, Y(p.lat) + (p.dy || 0) + 4, lab, {}); }
      return g;
    });
    const list = $('#map-list'), sl = $('#map-year'), yv = $('#map-year-val'), note = $('#map-year-note');
    const rows = pts.map((p) => {
      const d = document.createElement('div');
      d.innerHTML = '<b>' + (p.y < 0 ? Math.abs(p.y) + ' BC' : p.y) + '</b><span>' + p.l + ' <i class="mark" data-f="' + p.f + '"></i></span>';
      d.addEventListener('click', (e) => { if (e.target.classList.contains('mark')) return; sl.value = p.y; render(); });
      list.append(d); return d;
    });
    function render() {
      const y = +sl.value; yv.textContent = y < 0 ? Math.abs(y) + ' BC' : y;
      pts.forEach((p, i) => { groups[i].classList.toggle('dim', p.y > y); rows[i].classList.toggle('dim', p.y > y); });
      r1.style.opacity = y >= 586 ? 1 : 0.15; r2.style.opacity = y >= 1273 ? 1 : 0.15;
      const shown = pts.filter((p) => p.y <= y); note.textContent = shown.length ? shown[shown.length - 1].l.split(':')[0] : '';
    }
    sl.addEventListener('input', render); render();
    $$('.mark', list).forEach((m) => { m.setAttribute('tabindex', '0'); m.setAttribute('role', 'button'); m.title = 'Source'; });
    window.addEventListener('treb-theme', () => { $$('rect', svg).forEach(() => {}); });
  })();

  // ================= 4. the throw =================
  (function thrower() {
    const cv = $('#throw-canvas'); if (!cv || !THROWS) return;
    const T = THROWS.jerusalem1187, mc = T.machine, res = T.result, F = T.frames, FL = T.flight;
    const sl = $('#throw-t'), play = $('#throw-play'), stageEl = $('#throw-stage'), ebar = $('#ebar');
    const ctx = cv.getContext('2d');
    const tEnd = F[F.length - 1].t, tRel = res.t_release, tFl = res.t_flight;
    // One clock for the whole throw: the machine swings, the stone leaves at tRel and lands at tRel + tFl.
    // The first SPLIT of the slider covers the action (to half a second after release), the rest the flight.
    const tA = tRel + 0.5, tTot = tRel + tFl, SPLIT = 0.62;
    const timeAt = (u) => (u <= SPLIT ? u / SPLIT * tA : tA + (u - SPLIT) / (1 - SPLIT) * (tTot - tA));
    let playing = false, raf = null, last = null;
    function frameAt(t) { // interpolate machine frames
      let i = 0; while (i < F.length - 2 && F[i + 1].t < t) i++;
      const a = F[i], b = F[Math.min(i + 1, F.length - 1)], f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
      const L = (u, v) => u + (v - u) * f;
      const P2 = (u, v) => [L(u[0], v[0]), L(u[1], v[1])];
      return { t, th: L(a.th, b.th), ps: L(a.ps, b.ps), P: P2(a.P, b.P), S: P2(a.S, b.S), K: P2(a.K, b.K), C: P2(a.C, b.C), p: (a.p && b.p) ? P2(a.p, b.p) : a.p, phase: a.phase, E: a.E, W: a.W };
    }
    // The canvas backing store is (re)sized only when its CSS size changes; doing it on every frame
    // reallocates a large bitmap sixty times a second on a high-DPI screen and stalls playback.
    let cvW = 0, cvH = 0, cvDpr = 1;
    function size() {
      const r = cv.getBoundingClientRect(); const d = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(r.width * d), H = Math.round(r.height * d);
      if (W !== cv.width || H !== cv.height) { cv.width = W; cv.height = H; }
      cvW = r.width; cvH = r.height; cvDpr = d;
    }
    function draw(u) { // u in 0..1 from the slider
      if (!cvW || !cvH) size();
      const w = cvW, h = cvH;
      ctx.setTransform(cvDpr, 0, 0, cvDpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = timeAt(u);
      const tM = Math.min(t, tEnd);          // the machine's own clock stops at its last frame
      const tF = t > tRel ? t - tRel : -1;   // flight clock, from release
      const fr = frameAt(tM);
      // machine view: world x -16..22 m, y -1..27 m into the top 68% of the canvas
      const mh = h * 0.7, pad = 10;
      const xr = [-12.5, 13.5], yr = [-0.6, 23.5];
      const sc = Math.min((w - 2 * pad) / (xr[1] - xr[0]), (mh - 2 * pad) / (yr[1] - yr[0]));
      const ox = pad + ((w - 2 * pad) - sc * (xr[1] - xr[0])) / 2;
      const X = (x) => ox + (x - xr[0]) * sc, Y = (y) => mh - pad - (y - yr[0]) * sc;
      const ink = css('--ink'), ink2 = css('--ink-2'), wood = css('--wood'), iron = css('--iron'), line = css('--line'), stone = css('--stone');
      // ground
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(xr[0]), Y(0) + 0.5); ctx.lineTo(X(xr[1]), Y(0) + 0.5); ctx.stroke();
      // frame: two A-legs to the axle P
      const P = fr.P, H = mc.H, bw = 0.42 * H;
      ctx.strokeStyle = stone; ctx.lineWidth = Math.max(2, 0.17 * sc); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(P[0] - bw), Y(0)); ctx.lineTo(X(P[0]), Y(H)); ctx.lineTo(X(P[0] + bw), Y(0)); ctx.stroke();
      ctx.lineWidth = Math.max(1.5, 0.12 * sc); ctx.beginPath(); ctx.moveTo(X(P[0] - bw * 0.5), Y(H / 2)); ctx.lineTo(X(P[0] + bw * 0.5), Y(H / 2)); ctx.stroke();
      // trough
      ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(-mc.L1 - 1), Y(mc.y_t) - 1); ctx.lineTo(X(P[0] + 0.5), Y(mc.y_t) - 1); ctx.stroke();
      // hanger and box
      const K = fr.K, C = fr.C, ps = fr.ps, side = 1.14;
      const ux = -Math.sin(ps), uy = -Math.cos(ps); const vx = -uy, vy = ux;
      ctx.strokeStyle = iron; ctx.lineWidth = Math.max(1.5, 0.08 * sc); ctx.beginPath(); ctx.moveTo(X(K[0]), Y(K[1])); ctx.lineTo(X(C[0] - ux * side / 2), Y(C[1] - uy * side / 2)); ctx.stroke();
      ctx.fillStyle = iron; ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => { const x = C[0] + vx * a * side / 2 + ux * b * side / 2, y = C[1] + vy * a * side / 2 + uy * b * side / 2; i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); });
      ctx.closePath(); ctx.fill();
      // beam, tapered: 0.275 m deep at the axle, 0.13 at the tip, 0.19 at the counterweight end
      const S = fr.S, dx = S[0] - K[0], dy = S[1] - K[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const t0 = mc.L2 / (mc.L1 + mc.L2);
      const half = (f) => (f <= t0 ? 0.096 + (0.1375 - 0.096) * f / t0 : 0.1375 + (0.066 - 0.1375) * (f - t0) / (1 - t0));
      const at = (f, s) => [K[0] + dx * f + nx * s, K[1] + dy * f + ny * s];
      const poly = [at(0, half(0)), at(t0, half(t0)), at(1, half(1)), at(1, -half(1)), at(t0, -half(t0)), at(0, -half(0))];
      ctx.fillStyle = wood; ctx.strokeStyle = ink2; ctx.lineWidth = 0.8; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath(); ctx.fill(); ctx.stroke();
      // axle
      ctx.fillStyle = iron; ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), Math.max(3, 0.12 * sc), 0, 2 * Math.PI); ctx.fill();
      // sling and stone
      let stonePos = null;
      if (fr.p && tM <= tRel + 1e-6) {
        ctx.strokeStyle = ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(S[0]), Y(S[1])); ctx.lineTo(X(fr.p[0]), Y(fr.p[1])); ctx.stroke();
        stonePos = fr.p;
      }
      if (!stonePos && tM > tRel) { // after release the stone follows its flight path out of the picture
        const tf = tM - tRel; let i = 0; while (i < FL.length - 2 && FL[i + 1][0] < tf) i++;
        const a = FL[i], b = FL[i + 1], f = b[0] > a[0] ? Math.min(1, Math.max(0, (tf - a[0]) / (b[0] - a[0]))) : 0;
        const q = [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        if (q[0] < xr[1] + 1 && q[1] < yr[1] + 1) stonePos = q;
      }
      if (stonePos) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(stonePos[0]), Y(stonePos[1]), Math.max(3, mc.d / 2 * sc), 0, 2 * Math.PI); ctx.fill(); }
      // scale bar
      ctx.strokeStyle = ink2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(3), Y(0.6)); ctx.lineTo(X(13), Y(0.6)); ctx.stroke();
      ctx.fillStyle = ink2; ctx.font = '11px ' + css('--sans'); ctx.textAlign = 'center'; ctx.fillText('10 m', X(8), Y(0.6) - 5);
      // flight strip in the bottom 32%
      const fy0 = mh + 6, fh = h - fy0 - 4;
      const fxr = [-10, 600], fyr = [0, 160];
      const fsc = Math.min((w - 2 * pad) / (fxr[1] - fxr[0]), (fh - 18) / (fyr[1] - fyr[0]));
      const FX = (x) => pad + (x - fxr[0]) * fsc, FY = (y) => fy0 + fh - 14 - (y - fyr[0]) * fsc;
      ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(FX(fxr[0]), FY(0) + 0.5); ctx.lineTo(FX(fxr[1]), FY(0) + 0.5); ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = '10px ' + css('--sans'); ctx.textAlign = 'left';
      [0, 100, 200, 300, 400, 500].forEach((x) => { ctx.fillText(x + ' m', FX(x) + 2, FY(0) + 11); ctx.beginPath(); ctx.moveTo(FX(x), FY(0)); ctx.lineTo(FX(x), FY(0) + 3); ctx.stroke(); });
      // path so far
      const tIdx = (tf) => { let i = 0; while (i < FL.length - 1 && FL[i + 1][0] <= tf) i++; return i; };
      ctx.strokeStyle = css('--jer'); ctx.lineWidth = 1.5; ctx.beginPath();
      const upto = tF < 0 ? -1 : tIdx(tF);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = line; ctx.beginPath(); FL.forEach((q, i) => (i ? ctx.lineTo(FX(q[1]), FY(q[2])) : ctx.moveTo(FX(q[1]), FY(q[2])))); ctx.stroke(); ctx.setLineDash([]);
      if (upto >= 0) { // path flown so far, with the stone interpolated between the stored points
        const a = FL[upto], b = FL[Math.min(upto + 1, FL.length - 1)], f = b[0] > a[0] ? Math.min(1, (tF - a[0]) / (b[0] - a[0])) : 0;
        const q = [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        ctx.strokeStyle = css('--jer'); ctx.beginPath(); for (let i = 0; i <= upto; i++) { const r = FL[i]; i ? ctx.lineTo(FX(r[1]), FY(r[2])) : ctx.moveTo(FX(r[1]), FY(r[2])); } ctx.lineTo(FX(q[0]), FY(q[1])); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(FX(q[0]), FY(q[1]), 3.5, 0, 2 * Math.PI); ctx.fill(); }
      ctx.fillStyle = ink2; ctx.textAlign = 'right'; ctx.fillText('flight: ' + fmt(res.R) + ' m in ' + res.t_flight.toFixed(1) + ' s, apex ' + fmt(res.apex) + ' m', w - pad - 2, fy0 + 10);
      // stage text and energy bar
      const stage = t < res.t_liftoff ? 'Trigger: the stone slides in the trough'
        : t < tRel ? 'Lift-off: the sling swings the stone round'
        : t < tRel + 0.5 ? 'Release: the ring slips off the prong'
        : t < tTot - 0.05 ? 'Flight' : 'Landing: ' + fmt(res.R) + ' m, ' + fmt(res.E_impact / 1000) + ' kJ';
      stageEl.innerHTML = '<b>' + stage + '</b><span class="num">' + t.toFixed(2) + ' s</span>';
      const E = fr.E, tot = res.E_available;
      const cw = Math.max(0, E.PE_cw - (F[F.length - 1].E.PE_cw)) ;
      // shares: counterweight potential energy still to give (relative to its lowest point), beam+box kinetic + box kinetic, stone KE+PE, losses
      const low = Math.min.apply(null, F.map((f) => f.E.PE_cw));
      const remain = Math.max(0, E.PE_cw - low);
      const stoneE = (tM <= tRel ? (E.KE_p + Math.max(0, E.PE_p)) : (res.KE_r + res.PE_r));
      const loss = fr.W;
      const beamE = Math.max(0, tot - remain - stoneE - loss);
      const pct = (v) => Math.max(0, Math.min(100, v / tot * 100)) + '%';
      $('.e-cw', ebar).style.width = pct(remain); $('.e-beam', ebar).style.width = pct(beamE); $('.e-stone', ebar).style.width = pct(stoneE); $('.e-loss', ebar).style.width = pct(loss);
      ebar.title = 'Counterweight ' + fmt(remain / 1000) + ' kJ, beam and box ' + fmt(beamE / 1000) + ' kJ, stone ' + fmt(stoneE / 1000) + ' kJ, lost ' + fmt(loss / 1000, 1) + ' kJ';
    }
    // Playback keeps its own position as a float. Reading it back from the slider (which only holds
    // whole thousandths) rounded away the progress on high-refresh screens, where a frame's step is
    // under half a slider unit, so the flight crawled or froze.
    let pos = 0;
    function step(ts) {
      if (!playing) return;
      if (last == null) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000); last = ts; // clamp: a hidden tab must not jump to the end
      // the action plays at 1/2.2 speed (slow motion), the flight at 1.8 times real speed
      const rate = pos <= SPLIT ? (SPLIT / tA) * dt / 2.2 : ((1 - SPLIT) / (tTot - tA)) * dt * 1.8;
      pos += rate; if (pos >= 1) { pos = 1; setPlaying(false); }
      sl.value = Math.round(pos * 1000); draw(pos); if (playing) raf = requestAnimationFrame(step);
    }
    function setPlaying(on) { playing = on; play.textContent = on ? 'Pause' : (pos >= 1 ? 'Replay' : 'Play'); last = null; if (on) { if (pos >= 1) { pos = 0; sl.value = 0; } raf = requestAnimationFrame(step); } else if (raf) cancelAnimationFrame(raf); }
    play.addEventListener('click', () => setPlaying(!playing));
    sl.addEventListener('input', () => { setPlaying(false); pos = +sl.value / 1000; draw(pos); });
    const redraw = () => draw(pos);
    if (window.ResizeObserver) new ResizeObserver(() => { size(); redraw(); }).observe(cv);
    else window.addEventListener('resize', () => { size(); redraw(); });
    window.addEventListener('treb-theme', redraw);
    size(); draw(0);
    if (!reduced) { const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && pos === 0) { setPlaying(true); io.disconnect(); } }, { threshold: 0.5 }); io.observe(cv); }
  })();

  // ================= 4b. scale =================
  (function scale() {
    const sl = $('#scale'); if (!sl || !RUNS) return;
    const V = RUNS.scale.vac, A = RUNS.scale.air, draw = $('#scale-draw');
    const svg = el('svg', { viewBox: '0 0 520 150', class: 'chart' }, draw);
    function render() {
      const i = +sl.value, v = V[i], a = A[i];
      $('#scale-k').textContent = '×' + v.k;
      $('#scale-L').textContent = v.L_b.toFixed(2) + ' m'; $('#scale-M').textContent = (v.M >= 1000 ? (v.M / 1000).toFixed(1) + ' t' : fmt(v.M) + ' kg'); $('#scale-m').textContent = (v.m >= 1 ? fmt(v.m, v.m < 10 ? 1 : 0) + ' kg' : fmt(v.m * 1000) + ' g');
      $('#scale-R').textContent = fmt(v.R) + ' m';
      $('#scale-R').title = 'In air: ' + fmt(a.R) + ' m, R* ' + a.R_star;
      svg.innerHTML = '';
      const s = 8.5, x0 = 60, y0 = 136; // 8.5 px per metre
      el('line', { x1: 0, y1: y0 + 0.5, x2: 520, y2: y0 + 0.5, stroke: css('--line') }, svg);
      const H = 5.3 * v.k, L1 = 6.48 * v.k, L2 = 0.86 * v.k;
      const ax = x0 + 2.5 * v.k * s + 20, ay = y0 - H * s;
      el('path', { d: 'M' + (ax - 0.42 * H * s) + ' ' + y0 + ' L' + ax + ' ' + ay + ' L' + (ax + 0.42 * H * s) + ' ' + y0, stroke: css('--stone'), 'stroke-width': Math.max(1.5, 0.3 * v.k * s), fill: 'none', 'stroke-linecap': 'round' }, svg);
      const th = 40 * Math.PI / 180;
      const sx = ax - L1 * Math.sin(th) * s, sy = ay + L1 * Math.cos(th) * s, kx = ax + L2 * Math.sin(th) * s, ky = ay - L2 * Math.cos(th) * s;
      el('line', { x1: kx, y1: ky, x2: sx, y2: sy, stroke: css('--wood'), 'stroke-width': Math.max(2, 0.5 * v.k * s), 'stroke-linecap': 'round' }, svg);
      const bs = Math.max(4, 1.6 * v.k * s);
      el('line', { x1: kx, y1: ky, x2: kx, y2: ky + 2.45 * v.k * s, stroke: css('--iron'), 'stroke-width': 1.5 }, svg);
      el('rect', { x: kx - bs / 2, y: ky + 2.45 * v.k * s, width: bs, height: bs, fill: css('--iron') }, svg);
      el('circle', { cx: ax, cy: ay, r: 2.5, fill: css('--ink') }, svg);
      // person
      const px = 480, ph = 1.75 * s;
      el('circle', { cx: px, cy: y0 - ph + 3, r: 3, fill: css('--muted') }, svg);
      el('path', { d: 'M' + px + ' ' + (y0 - ph + 6) + ' v' + (ph * 0.45) + ' l-4 ' + (ph * 0.5) + ' m4 -' + (ph * 0.5) + ' l4 ' + (ph * 0.5) + ' M' + (px - 4) + ' ' + (y0 - ph * 0.65) + ' h8', stroke: css('--muted'), 'stroke-width': 1.5, fill: 'none' }, svg);
      txt(svg, px, y0 + 12, 'a person', { class: 'lbl', 'text-anchor': 'middle' });
      txt(svg, x0, y0 + 12, 'beam ' + v.L_b.toFixed(1) + ' m, R* ' + v.R_star, { class: 'lbl' });
    }
    sl.addEventListener('input', render); render(); window.addEventListener('treb-theme', render);
  })();

  // ================= 5. machine cards =================
  (function machines() {
    const box = $('#machine-cards'); if (!box || !window.TREB_MACHINES) return;
    const strip = document.createElement('div'); strip.className = 'photo-strip';
    strip.innerHTML = [
      ['img/castelnaud-2.jpg', 'A reconstructed trebuchet on the ramparts of Castelnaud with hills behind', 'Château de Castelnaud, Dordogne. Photo Jebulon, CC0.'],
      ['img/baux.jpg', 'A large timber counterweight trebuchet reconstruction in a sunlit stone yard', 'Château des Baux-de-Provence. Photo Culturespaces / C. Recoura, CC BY-SA 3.0.'],
      ['img/traction-replica.jpg', 'Visitors hauling on the ropes of a reconstructed traction engine', 'A bricole worked by its crew, Les Baux. Photo EmDee, CC BY-SA 3.0.'],
      ['img/warwick.jpg', 'The treadwheels of the Warwick Castle trebuchet with the castle behind', 'Warwick Castle, treadwheels. Photo Pahcal123, CC BY-SA 4.0.'],
    ].map((p) => '<figure><img src="' + p[0] + '" alt="' + p[1] + '" loading="lazy"><figcaption>' + p[2] + '</figcaption></figure>').join('');
    box.before(strip);
    function glyph(m) {
      const s = el('svg', { viewBox: '0 0 240 180', 'aria-hidden': 'true' });
      const L1 = m.L1 || 5, L2 = m.L2 || 1, H = m.H || 0.45 * (L1 + L2), big = Math.max(L1 + L2, H * 1.4, 4);
      const k = 150 / big, x0 = 110, y0 = 160;
      el('line', { x1: 10, y1: y0, x2: 230, y2: y0, class: 'ground' }, s);
      el('path', { d: 'M' + (x0 - 0.4 * H * k) + ' ' + y0 + ' L' + x0 + ' ' + (y0 - H * k) + ' L' + (x0 + 0.4 * H * k) + ' ' + y0, class: 'timber' }, s);
      const th = (m.type || '').startsWith('Traction') ? 55 : 42, r = th * Math.PI / 180;
      const ax = x0, ay = y0 - H * k;
      const sx = ax - L1 * Math.sin(r) * k, sy = ay + L1 * Math.cos(r) * k, kx = ax + L2 * Math.sin(r) * k, ky = ay - L2 * Math.cos(r) * k;
      el('line', { x1: kx, y1: ky, x2: sx, y2: sy, class: 'beam' }, s);
      if ((m.type || '').startsWith('Traction')) { for (let i = 0; i < 4; i++) { const px = kx + 14 + i * 9; el('line', { x1: kx, y1: ky, x2: px, y2: y0, class: 'timber', 'stroke-width': 1 }, s); el('circle', { cx: px, cy: y0 - 8, r: 2.2, fill: css('--muted') }, s); } }
      else { const L3 = m.L3 == null ? 0.5 * L2 : m.L3; const bs = Math.max(6, Math.cbrt((m.M || 1000) / 2000) * 1.0 * k); el('line', { x1: kx, y1: ky, x2: kx, y2: ky + L3 * k, class: 'timber', 'stroke-width': 1.5 }, s); el('rect', { x: kx - bs / 2, y: ky + L3 * k, width: bs, height: bs, class: 'box' }, s); }
      el('line', { x1: sx, y1: sy, x2: sx - 8, y2: y0 - 3, class: 'timber', 'stroke-width': 1 }, s);
      el('circle', { cx: ax, cy: ay, r: 2.5, fill: css('--ink') }, s);
      const ph = 1.75 * k, px = 215;
      el('circle', { cx: px, cy: y0 - ph + 2.5, r: 2.5, class: 'person' }, s);
      el('path', { d: 'M' + px + ' ' + (y0 - ph + 5) + ' v' + (ph * 0.45) + ' l-3 ' + (ph * 0.5) + ' m3 -' + (ph * 0.5) + ' l3 ' + (ph * 0.5), class: 'person' }, s);
      txt(s, 12, 172, 'beam ' + (L1 + L2).toFixed(1) + ' m, axle ' + H.toFixed(1) + ' m' + (m.H ? '' : ' (assumed)'), {});
      return s;
    }
    window.TREB_MACHINES.forEach((m) => {
      const c = document.createElement('article'); c.className = 'card';
      let media;
      if (m.photo) { media = '<img src="' + m.photo + '" alt="' + (m.photoAlt || m.name) + '" loading="lazy">'; }
      c.innerHTML = (media || '<div class="glyph"></div>') +
        '<h4>' + m.name + '</h4><div class="meta">' + m.year + ' · ' + m.place + ' · ' + m.type + '</div>' +
        '<div class="nums">' + (m.M != null ? '<b>' + fmt(m.M) + ' kg</b><span>counterweight</span>' : '<b>' + (m.H ? m.H + ' m' : '–') + '</b><span>' + (m.H ? 'tall' : 'counterweight') + '</span>') +
        '<b>' + (m.m != null ? fmt(m.m, m.m < 10 ? 1 : 0) + ' kg' : '–') + '</b><span>stone</span>' +
        '<b>' + (m.R != null ? fmt(m.R, m.R < 50 ? 1 : 0) + ' m' : '–') + '</b><span>range</span>' +
        '<b>' + (m.Rstar != null ? m.Rstar.toFixed(1) : '–') + '</b><span>R*, range ÷ beam</span></div>' +
        '<div class="status">' + m.status + ' <i class="mark" ' + (m.facts ? 'data-f="' + m.facts + '"' : '') + (m.srcs ? ' data-s="' + m.srcs + '"' : '') + ' data-label="' + m.name.replace(/"/g, '') + '"></i></div>' +
        '<p class="note">' + m.note + (m.credit ? ' <span class="muted small">' + m.credit + '.</span>' : '') + '</p>' +
        '<div class="actions">' + (m.preset ? '<a class="btn" href="proving-ground.html#' + m.preset + '">Throw it</a>' : '') +
        (m.video ? '<a class="btn quiet" href="' + m.video.url + '" target="_blank" rel="noopener" title="' + m.video.title + ' (' + m.video.by + ')">Watch it fire</a>' : '') + '</div>';
      if (!media) $('.glyph', c).append(glyph(m));
      box.append(c);
    });
    $$('.mark', box).forEach((m) => { m.setAttribute('tabindex', '0'); m.setAttribute('role', 'button'); m.title = 'How we know'; });
  })();

  // ================= 5b. watch one fire (click-to-play embeds) =================
  (function watch() {
    $$('.watch-tile[data-yt]').forEach((tile) => {
      const thumb = $('.thumb', tile); if (!thumb) return;
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        const id = tile.dataset.yt;
        const box = document.createElement('div'); box.className = 'thumb playing';
        const f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        f.title = $('b', tile) ? $('b', tile).textContent : 'Video';
        f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        box.append(f);
        thumb.replaceWith(box);
      });
    });
  })();

  // ================= 7. the two designs =================
  (function designs() {
    const svg = $('#designs-svg'); if (!svg || !THROWS) return;
    const J = THROWS.jerusalem1187, O = THROWS.optimal, B = RUNS.beam;
    let beamMode = 'taper';
    function machine(T, x0, cls, beam) {
      const mc = T.machine, f = T.frames[0], g = el('g', {}, svg);
      const sc = 30; // px per m
      const X = (x) => x0 + x * sc, Y = (y) => 520 - y * sc;
      const P = f.P, S = f.S, K = f.K, C = f.C, p = f.p;
      const H = mc.H;
      if (T.arch === 'fat') {
        // guides and rail: a steel portal
        const gw = 1.2 * sc;
        el('path', { d: 'M' + (X(0) - gw) + ' ' + Y(0) + ' V' + Y(H + mc.L2 + 0.6) + ' M' + (X(0) + gw) + ' ' + Y(0) + ' V' + Y(H + mc.L2 + 0.6) + ' M' + (X(0) - 3.2 * sc) + ' ' + Y(H) + ' H' + (X(0) + 3.2 * sc) + ' M' + (X(0) - 3.2 * sc) + ' ' + Y(H) + ' V' + Y(0) + ' M' + (X(0) + 3.2 * sc) + ' ' + Y(H) + ' V' + Y(0), class: 'frame steel' }, g);
      } else {
        const bw = 0.42 * H;
        el('path', { d: 'M' + X(P[0] - bw) + ' ' + Y(0) + ' L' + X(P[0]) + ' ' + Y(H) + ' L' + X(P[0] + bw) + ' ' + Y(0) + ' M' + X(P[0] - bw * 0.5) + ' ' + Y(H / 2) + ' L' + X(P[0] + bw * 0.5) + ' ' + Y(H / 2), class: 'frame' }, g);
      }
      // box and hanger
      const side = T.arch === 'fat' ? 0.725 : 1.145;
      const ps = f.ps, ux = -Math.sin(ps), uy = -Math.cos(ps), vx = -uy, vy = ux;
      if (T.arch !== 'fat') el('line', { x1: X(K[0]), y1: Y(K[1]), x2: X(C[0] - ux * side / 2), y2: Y(C[1] - uy * side / 2), class: 'rope' }, g);
      el('polygon', { points: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => X(C[0] + vx * a * side / 2 + ux * b * side / 2) + ',' + Y(C[1] + vy * a * side / 2 + uy * b * side / 2)).join(' '), class: 'box-' + cls }, g);
      // beam polygon
      const dx = S[0] - K[0], dy = S[1] - K[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, t0 = mc.L2 / (mc.L1 + mc.L2);
      const d0 = beam.depth_root, tip = beam.tip;
      const half = (ff) => (beamMode === 'uniform' ? d0 / 2 : (ff <= t0 ? (d0 * 0.7 + (d0 - d0 * 0.7) * ff / t0) / 2 : (d0 + (d0 * tip - d0) * (ff - t0) / (1 - t0)) / 2));
      const at = (ff, s) => X(K[0] + dx * ff + nx * s) + ',' + Y(K[1] + dy * ff + ny * s);
      el('polygon', { points: [at(0, half(0)), at(t0, half(t0)), at(1, half(1)), at(1, -half(1)), at(t0, -half(t0)), at(0, -half(0))].join(' '), class: 'beam-' + cls }, g);
      el('circle', { cx: X(P[0]), cy: Y(P[1]), r: 3, fill: css('--ink') }, g);
      el('line', { x1: X(-mc.L1 - 1), y1: Y(0) - 1, x2: X(0.4), y2: Y(0) - 1, class: 'rope' }, g);
      if (p) { el('line', { x1: X(S[0]), y1: Y(S[1]), x2: X(p[0]), y2: Y(p[1]), class: 'rope' }, g); el('circle', { cx: X(p[0]), cy: Y(p[1]), r: mc.d / 2 * sc, class: 'stone' }, g); }
      // dimensions: axle height
      const dxm = T.arch === 'fat' ? -3.9 : -3.6;
      el('path', { d: 'M' + (X(P[0]) + dxm * sc) + ' ' + Y(0) + ' V' + Y(H), class: 'dim' }, g);
      txt(g, X(P[0]) + dxm * sc - 5, Y(H / 2), 'axle ' + H.toFixed(1) + ' m', { class: 'dim-t', 'text-anchor': 'end' });
      return g;
    }
    function render() {
      svg.innerHTML = '';
      el('line', { x1: 0, y1: 520.5, x2: 1000, y2: 520.5, class: 'ground' }, svg);
      const bo = B.optimal.tapers[beamMode === 'uniform' ? 0 : 2], bj = B.jerusalem1187.tapers[beamMode === 'uniform' ? 0 : 2];
      machine(O, 430, 'opt', bo); machine(J, 905, 'jer', bj);
      txt(svg, 30, 40, 'Optimal trebuchet', { class: 'ttl', fill: css('--opt-dark') });
      txt(svg, 30, 60, 'floating arm, carbon-fibre beam ' + bo.m_b + ' kg, rolling bearings, HMPE sling', { class: 'sub' });
      txt(svg, 30, 78, fmt(bo.R) + ' m · R* ' + (bo.R / 10).toFixed(1) + ' · η ' + O.result.eta.toFixed(2), { class: 'sub', fill: css('--ink') });
      txt(svg, 520, 40, 'Jerusalem 1187 trebuchet', { class: 'ttl', fill: css('--jer-dark') });
      txt(svg, 520, 60, 'hinged counterweight, oak frame, ash beam ' + bj.m_b + ' kg, iron journals, hemp sling', { class: 'sub' });
      txt(svg, 520, 78, fmt(bj.R) + ' m · R* ' + (bj.R / 10).toFixed(1) + ' · η ' + (beamMode === 'uniform' ? '' : J.result.eta.toFixed(2)), { class: 'sub', fill: css('--ink') });
      // scale bar
      el('line', { x1: 30, y1: 548, x2: 30 + 10 * 30, y2: 548, class: 'dim' }, svg); txt(svg, 30 + 150, 540, '10 m', { class: 'dim-t', 'text-anchor': 'middle' });
      txt(svg, 970, 548, 'both: 3,000 kg counterweight, 20 kg stone', { class: 'sub', 'text-anchor': 'end' });
      $('#designs-note').textContent = beamMode === 'uniform' ? 'Uniform beams sized to the same loads: ' + bo.m_b + ' kg of carbon fibre throws ' + fmt(bo.R) + ' m, ' + bj.m_b + ' kg of ash throws ' + fmt(bj.R) + ' m (run P7-R13).' : 'The optimiser’s beams: ' + bo.m_b + ' kg of carbon fibre, ' + bj.m_b + ' kg of ash, each tapered to about half its depth at the tip.';
    }
    $$('#designs .seg button').forEach((b) => b.addEventListener('click', () => { $$('#designs .seg button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); beamMode = b.dataset.beam; render(); }));
    render(); window.addEventListener('treb-theme', render);
  })();

  // ================= 7b. tournament =================
  (function tournament() {
    const box = $('#tourn-bars'); if (!box || !RUNS) return;
    const COL = { hcw: '--jer', fcw: '--fcw', whcw: '--whcw', wfcw: '--wfcw', fat: '--opt' };
    const all = ['fat', 'wfcw', 'hcw', 'whcw', 'fcw'];
    const names = {}; RUNS.tournament.modern.forEach((a) => { names[a.arch] = a.name; });
    all.forEach((a) => { const d = document.createElement('div'); d.className = 'bar'; d.dataset.arch = a; d.innerHTML = '<span class="lbl">' + names[a] + '</span><div class="trk"><i style="background:var(' + COL[a] + ')"></i></div><span class="val"></span>'; box.append(d); });
    function render(set) {
      const rows = RUNS.tournament[set];
      all.forEach((a) => { const r = rows.find((x) => x.arch === a); const d = $('[data-arch="' + a + '"]', box); if (!r) { d.classList.add('off'); $('i', d).style.width = '0'; $('.val', d).textContent = set === 'period' ? 'needs steel' : ''; } else { d.classList.remove('off'); $('i', d).style.width = (r.R / 900 * 100) + '%'; $('.val', d).textContent = fmt(r.R) + ' m'; } });
    }
    $$('#try-tourn .seg button').forEach((b) => b.addEventListener('click', () => { $$('#try-tourn .seg button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); render(b.dataset.set); }));
    render('period');
  })();

  // ================= 7c. heavier or farther =================
  (function massCurve() {
    const svg = $('#mass-chart'); if (!svg || !RUNS) return;
    const J = RUNS.mass.jerusalem1187, O = RUNS.mass.optimal, sl = $('#mass'), out = $('#mass-val');
    const W = 520, Hh = 230, ml = 44, mr = 44, mt = 14, mb = 30;
    const X = (m) => ml + (m - 4) / (80 - 4) * (W - ml - mr), YR = (r) => mt + (1 - r / 1200) * (Hh - mt - mb), YE = (e) => mt + (1 - e / 120) * (Hh - mt - mb);
    const g = el('g', {}, svg);
    function base() {
      g.innerHTML = '';
      [0, 300, 600, 900, 1200].forEach((r) => { el('line', { x1: ml, y1: YR(r), x2: W - mr, y2: YR(r), stroke: css('--line-2') }, g); txt(g, ml - 4, YR(r) + 4, r, { class: 'lbl', 'text-anchor': 'end' }); });
      [0, 40, 80, 120].forEach((e) => { txt(g, W - mr + 4, YE(e) + 4, e, { class: 'lbl' }); });
      [4, 20, 40, 60, 80].forEach((m) => { txt(g, X(m), Hh - 8, m + ' kg', { class: 'lbl', 'text-anchor': 'middle' }); });
      txt(g, ml + 4, 10, 'range, m', { class: 'lbl' }); txt(g, W - mr - 4, 10, 'kJ at impact', { class: 'lbl', 'text-anchor': 'end' });
      const line = (arr, key, Yf, cls) => el('path', { d: arr.map((p, i) => (i ? 'L' : 'M') + X(p.m) + ' ' + Yf(p[key])).join(' '), class: cls }, g);
      line(J, 'R', YR, 'l-jer'); line(O, 'R', YR, 'l-opt'); line(J, 'E', YE, 'e-jer'); line(O, 'E', YE, 'e-opt');
      txt(g, X(30) + 4, YR(O[8].R) - 6, 'Optimal, range', { class: 'lbl', fill: css('--opt-dark') });
      txt(g, X(30) + 4, YR(J[8].R) + 14, '1187, range', { class: 'lbl', fill: css('--jer-dark') });
      txt(g, X(60) + 4, YE(O[12].E) - 6, 'energy (dashed)', { class: 'lbl' });
    }
    const cur = el('g', {}, svg);
    function render() {
      const i = +sl.value, j = J[i], o = O[i];
      out.innerHTML = j.m + '<small>kg</small>';
      cur.innerHTML = '';
      el('line', { x1: X(j.m), y1: mt, x2: X(j.m), y2: Hh - mb, class: 'cursor' }, cur);
      [[j.R, YR, '--jer'], [o.R, YR, '--opt'], [j.E, YE, '--jer'], [o.E, YE, '--opt']].forEach(([v, Yf, c]) => el('circle', { cx: X(j.m), cy: Yf(v), r: 4, fill: css(c), stroke: css('--bg'), 'stroke-width': 1.5 }, cur));
      const t = el('g', {}, cur);
      const bx = Math.min(X(j.m) + 8, W - mr - 150);
      el('rect', { x: bx, y: mt + 2, width: 146, height: 44, fill: css('--bg'), stroke: css('--line'), rx: 3 }, t);
      txt(t, bx + 6, mt + 17, '1187: ' + fmt(j.R) + ' m, ' + fmt(j.E) + ' kJ', { class: 'lbl', fill: css('--jer-dark') });
      txt(t, bx + 6, mt + 33, 'Optimal: ' + fmt(o.R) + ' m, ' + fmt(o.E) + ' kJ', { class: 'lbl', fill: css('--opt-dark') });
    }
    base(); render();
    sl.addEventListener('input', render); window.addEventListener('treb-theme', () => { base(); render(); });
  })();

  // ================= 8. one fix at a time =================
  (function fixes() {
    const box = $('#fix-switches'), bar = $('#scorebar'); if (!box || !RUNS) return;
    const st = RUNS.gap.hansen.steps; // [label, value]
    const steps = [
      { l: 'Counterweight ratio to 150 (from 147)', v: st[1][1] }, { l: 'An ash beam sized to its loads, in place of the heavy one', v: st[2][1] },
      { l: 'Proportions re-optimised for its own frame', v: st[4][1] }, { l: 'Frame raised to 0.75 of the beam length', v: st[5][1] },
      { l: 'Free taper of the beam', v: st[6][1], note: 'the Jerusalem 1187 design' },
      { l: 'Modern materials, rolling bearings, an 8 t hinge', v: st[8][1] }, { l: 'Floating arm', v: st[9][1], note: 'the Optimal trebuchet' },
    ];
    const base = st[0][1];
    bar.innerHTML = '<div class="trk"><i></i></div><span class="zero">0</span><div class="tick jer" style="left:' + (58.01 / 90 * 100) + '%"><span>1187 design 58.0</span></div><div class="tick opt" style="left:' + (88.55 / 90 * 100) + '%"><span>Optimal 88.5</span></div><div class="now"></div>';
    const cbs = steps.map((s, i) => {
      const lab = document.createElement('label'); lab.className = 'switch';
      lab.innerHTML = '<input type="checkbox" data-i="' + i + '"><span class="sw-l">' + s.l + (s.note ? ' <span class="muted">(' + s.note + ')</span>' : '') + '</span><span class="sw-v">+' + s.v.toFixed(1) + '</span>';
      box.append(lab); return $('input', lab);
    });
    function render(changed) {
      if (changed != null) { const i = +changed.dataset.i; if (changed.checked) cbs.forEach((c, j) => { if (j < i) c.checked = true; }); else cbs.forEach((c, j) => { if (j > i) c.checked = false; }); }
      let score = base; cbs.forEach((c, i) => { $$('.sw-v', box)[i].classList.toggle('on', c.checked); if (c.checked) score += steps[i].v; });
      $('.trk i', bar).style.width = (score / 90 * 100) + '%';
      const now = $('.now', bar); now.style.left = (score / 90 * 100) + '%'; now.textContent = 'R* ' + score.toFixed(1);
    }
    cbs.forEach((c) => c.addEventListener('change', () => render(c)));
    render();
  })();

  // ================= 9. fire at the wall =================
  (function wall() {
    const svg = $('#wall-svg'); if (!svg || !RUNS) return;
    const Jz = RUNS.jerusalem, modes = Jz.modes, seg = $('#wall-modes'), read = $('#wall-read');
    const W = 1000, Hh = 440; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    // main view: x -12..620 m across the top 270 px at 1.55 px/m horizontally and vertically
    const sc = 1.55, X = (x) => 20 + (x + 12) * sc, Y = (y) => 290 - y * sc;
    function seeded(n, seed) { let s = seed; const out = []; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) % 4294967296; const u1 = (s + 1) / 4294967297; s = (s * 1664525 + 1013904223) % 4294967296; const u2 = (s + 1) / 4294967297; out.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)); } return out; }
    let active = 0;
    modes.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m.label; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); b.addEventListener('click', () => { active = i; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); render(); }); seg.append(b); });
    function render() {
      svg.innerHTML = '';
      const m = modes[active], xw = m.disp.x_wall;
      el('rect', { x: 0, y: Y(0), width: W, height: 8, class: 'ground' }, svg);
      modes.forEach((o, i) => { if (i !== active) el('path', { d: o.path.map((p, k) => (k ? 'L' : 'M') + X(p[0]) + ' ' + Y(Math.max(0, p[1]))).join(' '), class: 'path ghost' }, svg); });
      el('path', { d: 'M' + X(-3) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(7.5) + ' L' + X(3) + ' ' + Y(0) + ' M' + X(-8) + ' ' + Y(2) + ' L' + X(1.7) + ' ' + Y(9), class: 'engine' }, svg);
      el('line', { x1: X(421), y1: Y(0), x2: X(421), y2: Y(150), class: 'crossbow' }, svg);
      txt(svg, X(421) + 5, Y(145), '421 m: the longest crossbow shot', { class: 'lbl' });
      el('rect', { x: X(70), y: Y(0) - 3, width: (150 - 70) * sc, height: 3, fill: css('--muted') }, svg);
      txt(svg, X(110), Y(0) + 20, 'stand-off 70 to 150 m', { class: 'lbl', 'text-anchor': 'middle' });
      el('path', { d: m.path.map((p, k) => (k ? 'L' : 'M') + X(p[0]) + ' ' + Y(Math.max(0, p[1]))).join(' '), class: 'path' }, svg);
      el('rect', { x: X(xw), y: Y(11), width: Math.max(3, 2.5 * sc), height: 11 * sc, class: 'wall' }, svg);
      txt(svg, X(xw) + 8, Y(13), 'wall', { class: 'lbl' });
      if (m.apex > 30) txt(svg, X(m.R / 2 - 5), Y(m.apex) - 6, 'apex ' + fmt(m.apex) + ' m, ' + m.t_flight.toFixed(1) + ' s in the air', { class: 'lbl', 'text-anchor': 'middle' });
      txt(svg, 20, 22, m.label, { class: 'lbl b' });
      txt(svg, 20, 38, m.note, { class: 'lbl' });
      // the strip: ground section 75 m wide around the wall at 10 px/m, with the 200 landings
      const sy0 = 420, s2 = 10, x0m = xw - 52;
      const gx = (x) => 40 + (x - x0m) * s2, gy = (y) => sy0 - y * s2;
      el('line', { x1: 0, y1: 312, x2: W, y2: 312, stroke: css('--line-2') }, svg);
      el('rect', { x: 0, y: gy(0), width: W, height: 18, class: 'ground' }, svg);
      const moatW = 17, moatD = 9, foreT = 3.8, gap = 9, foreH = Jz.forewall_height, xMoat = xw - gap - foreT - moatW;
      el('rect', { x: gx(xMoat), y: gy(0), width: moatW * s2, height: moatD * s2 * 0.5, class: 'moat' }, svg);
      el('rect', { x: gx(xw - gap - foreT), y: gy(foreH), width: foreT * s2, height: foreH * s2, class: 'forewall' }, svg);
      el('rect', { x: gx(xw), y: gy(11), width: 2.5 * s2, height: 11 * s2, class: 'wall' }, svg);
      txt(svg, gx(xMoat + moatW / 2), gy(0) + 13, 'moat, 14 to 20 m wide', { class: 'lbl', 'text-anchor': 'middle' });
      txt(svg, gx(xw - gap - foreT / 2), gy(foreH) - 5, 'forewall', { class: 'lbl', 'text-anchor': 'middle' });
      txt(svg, gx(xw + 1.25), gy(11) - 5, 'main wall, 11 m', { class: 'lbl', 'text-anchor': 'middle' });
      el('line', { x1: gx(x0m + 2), y1: gy(0) + 14, x2: gx(x0m + 12), y2: gy(0) + 14, stroke: css('--ink-2'), 'stroke-width': 1.5 }, svg); txt(svg, gx(x0m + 7), gy(0) + 10, '10 m', { class: 'lbl', 'text-anchor': 'middle' });
      const n = Jz.n, z = seeded(n, 1187 + active).sort((a, b) => a - b);
      const nShort = Math.round(m.disp.frac_short * n), nFace = Math.round(m.disp.frac_face * n);
      const travel = 11 / Math.tan(m.angle * Math.PI / 180);
      z.forEach((zz, i) => {
        const cls = i < nShort ? 'short' : (i < nShort + nFace ? 'hit' : 'over');
        const xl = m.disp.R_mean + zz * m.disp.R_sd;
        let px, py;
        if (cls === 'short') { px = Math.min(xl, xw - 0.5); py = 0; }
        else if (cls === 'hit') { const f = (i - nShort) / Math.max(1, nFace - 1); px = xw - 0.3; py = 0.4 + f * 10.2; }
        else { px = Math.max(xw + 3, xl); py = 0; }
        el('circle', { cx: gx(px), cy: gy(py) - 2.2, r: 2.4, class: 'shot ' + (cls === 'hit' ? 'hit' : '') }, svg);
      });
      txt(svg, 40, 328, '200 shots, aimed 8 m up the face: ' + Math.round(m.disp.frac_short * 100) + '% fall short, ' + Math.round(m.disp.frac_face * 1000) / 10 + '% strike the face, ' + Math.round(m.disp.frac_over * 100) + '% fly over', { class: 'lbl b' });
      txt(svg, 40, 344, 'landings scatter by ±' + fmt(m.disp.R_sd, 0) + ' m (one standard deviation); coming down at ' + fmt(m.angle, 0) + '° the stone drops 11 m in ' + fmt(travel, 0) + ' m of travel', { class: 'lbl' });
      read.innerHTML = '<div><b>' + fmt(m.m) + ' kg</b>stone</div><div><b>' + fmt(m.R) + ' m</b>range</div><div><b>' + fmt(m.E) + ' kJ</b>at impact</div><div><b>' + Math.round(m.disp.frac_face * 1000) / 10 + '%</b>strike the face</div>';
    }
    render(); window.addEventListener('treb-theme', render);
  })();

  // ================= 10. energy ladder =================
  (function energy() {
    const svg = $('#energy-svg'); if (!svg || !RUNS) return;
    const E = RUNS.energy;
    const find = (s) => E.find((e) => e.label.startsWith(s));
    const rows = [
      { l: 'Traction engine, 4.7 kg to 78.5 m (Tarver, measured)', v: find('Tarver traction machine: 4.7').E_impact, c: '', f: 'P5-F251', w: 'energy-ladder' },
      { l: 'Roman ballista stone, 5 kg at an assumed 300 m', v: find('Roman ballista stone').E_impact, c: '', f: 'P2-F665', w: 'energy-ladder' },
      { l: 'Nykøbing, 15 kg to 168 m (measured)', v: find('Nykøbing').E_impact, c: '', f: 'P1-F185', w: 'energy-ladder' },
      { l: 'Josephus’s talent at two stades (reported)', v: find('Roman stone-thrower, AD 70').E_impact, c: '', f: 'P2-F096 P2-F097', w: 'josephus-talent' },
      { l: 'Jerusalem 1187 design, 20 kg', v: 47.1, c: 'jer', w: 'e-impact-1187' },
      { l: 'Optimal design, 20 kg', v: 63.4, c: 'opt', w: 'e-impact-opt' },
      { l: 'Cannon ball, 20 cm iron at 200 m/s', v: 660, c: 'gun', f: 'P2-F405 P2-F406', w: 'energy-ladder' },
    ];
    const W = 520, rh = 30, ml = 8, top = 22;
    const lx = (v) => ml + (Math.log10(v) - Math.log10(1)) / (Math.log10(1000) - Math.log10(1)) * (W - ml - 60);
    function render() {
      svg.innerHTML = '';
      [1, 10, 100, 1000].forEach((v) => { el('line', { x1: lx(v), y1: top - 8, x2: lx(v), y2: top + rows.length * rh, stroke: css('--line-2') }, svg); txt(svg, lx(v), top - 10, v + ' kJ', { class: 'lbl', 'text-anchor': 'middle' }); });
      rows.forEach((r, i) => {
        const y = top + i * rh;
        const b = el('rect', { x: ml, y: y + 4, width: lx(r.v) - ml, height: 12, class: 'bar ' + r.c, rx: 2 }, svg);
        b.classList.add('src'); if (r.f) b.dataset.f = r.f; if (r.w) b.dataset.w = r.w; b.dataset.r = 'P8-R07'; b.dataset.label = r.l; b.setAttribute('tabindex', '0'); b.setAttribute('role', 'button');
        const t = txt(svg, ml + 4, y + 14 + 12, r.l, { class: 'lbl' });
        txt(svg, lx(r.v) + 5, y + 14, fmt(r.v, r.v < 10 ? 1 : 0), { class: 'vl' });
      });
    }
    render(); window.addEventListener('treb-theme', render);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (top + rows.length * rh + 4));
  })();
})();
