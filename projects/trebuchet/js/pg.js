/* The Proving Ground controller: presets, controls, the throw, playback, readouts, charts, sweeps, comparison, challenges. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const fmt = window.trebFmt, css = window.trebCss;
  const S = window.TrebSim, PR = window.TrebPresets, PG = window.TrebPG;
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
  const fin = Number.isFinite;

  // ---------- running the physics (worker if possible) ----------
  let worker = null, wid = 0; const pending = {};
  try {
    worker = new Worker('js/pg-worker.js');
    worker.onmessage = (e) => { const m = e.data, p = pending[m.id]; if (!p) return; if (m.progress != null && !('ok' in m)) { p.prog && p.prog(m.progress); return; } delete pending[m.id]; m.ok ? p.res(m.result) : p.rej(new Error(m.error)); };
    worker.onerror = () => { worker = null; };
  } catch (e) { worker = null; }
  function post(msg, prog) {
    if (worker) return new Promise((res, rej) => { const id = ++wid; pending[id] = { res, rej, prog }; try { worker.postMessage(Object.assign({ id }, msg)); } catch (e) { delete pending[id]; worker = null; res(local(msg, prog)); } });
    return new Promise((res) => setTimeout(() => res(local(msg, prog)), 10));
  }
  function local(msg, prog) {
    if (msg.cmd === 'throw') return PG.run(msg.mc, msg.opts);
    if (msg.cmd === 'sweepList') return msg.machines.map((mc, i) => { const r = PG.run(mc, { history: false }); prog && prog((i + 1) / msg.machines.length); return { R: r.R, R_star: r.R_star, eta: r.eta, E_impact: r.E_impact, v_r: r.v_r, alpha_r_deg: r.alpha_r_deg, status: r.status, loads: r.loads, notes: r.notes }; });
    return null;
  }
  const plain = (mc) => { const o = {}; for (const k in mc) { const v = mc[k]; if (typeof v !== 'function' && k[0] !== '_') o[k] = v; } return o; };

  // ---------- state ----------
  const st = { mc: null, presetId: null, res: null, t: 0, playing: false, speed: 0.25, view: '3d', cam: 'machine', scene: null, cmp: [], mode: 'simple' };
  const view3d = new window.TrebView3D($('#v3d'));
  const v2d = $('#v2d'), ctx2 = v2d.getContext('2d');
  const COLS = ['--jer', '--opt', '--whcw'];

  // ---------- presets ----------
  const sel = $('#preset');
  (function fillPresets() {
    const groups = {};
    PR.LIST.forEach((it) => { (groups[it.group] = groups[it.group] || []).push(it); });
    Object.keys(groups).forEach((g) => { const og = document.createElement('optgroup'); og.label = g; groups[g].forEach((it) => { const o = document.createElement('option'); o.value = it.id; o.textContent = it.label; og.append(o); }); sel.append(og); });
    const og = document.createElement('optgroup'); og.label = 'Your machine'; const o = document.createElement('option'); o.value = '__custom'; o.textContent = 'Edited machine'; og.append(o); sel.append(og);
  })();
  function loadPreset(id, andThrow) {
    const it = PR.LIST.find((x) => x.id === id); if (!it) return;
    st.presetId = id; st.mc = plain(S.machine(it.build())); st.scene = it.scene || null; sel.value = id;
    $('#preset-note').textContent = it.note || '';
    syncControls();
    if (andThrow !== false) doThrow();
  }
  sel.addEventListener('change', () => { if (sel.value !== '__custom') loadPreset(sel.value); });
  function markCustom() { if (sel.value !== '__custom') { sel.value = '__custom'; $('#preset-note').textContent = 'Edited from ' + (PR.LIST.find((x) => x.id === st.presetId) || {}).label + '.'; } }

  // ---------- simple controls ----------
  const simple = $('#simple');
  const SIMPLE = [
    { k: 'M', l: 'Counterweight', u: 'kg', min: Math.log10(100), max: Math.log10(40000), step: 0.005, log: true, sub: 'the mass that falls' , get: (m) => m.M, set: (m, v) => { m.M = v; } },
    { k: 'm', l: 'Stone', u: 'kg', min: Math.log10(0.3), max: Math.log10(500), step: 0.005, log: true, sub: 'heavier flies shorter', get: (m) => m.m, set: (m, v) => { m.m = v; m.d = null; } },
    { k: 'ratio', l: 'Arm ratio L₁/L₂', u: '', min: 1.5, max: 9, step: 0.05, sub: 'long arm to short arm, beam length kept', get: (m) => m.L1 / m.L2, set: (m, v) => { const Lb = m.L1 + m.L2; m.L2 = Lb / (1 + v); m.L1 = Lb - m.L2; m.I_b = null; m.L_CM = null; } },
    { k: 'sling', l: 'Sling L₄/L₁', u: '', min: 0.3, max: 1.6, step: 0.01, sub: 'sling length as a share of the long arm', get: (m) => m.L4 / m.L1, set: (m, v) => { m.L4 = v * m.L1; } },
    { k: 'height', l: 'Axle height', u: 'm', min: 0.25, max: 0.95, step: 0.005, frac: true, sub: 'as a share of the beam length; the beam starts with its tip at the trough', get: (m) => S.H_eff(m) / (m.L1 + m.L2), set: (m, v) => { const H = v * (m.L1 + m.L2); m.H = H; m.th0 = Math.acos(Math.max(-1, Math.min(1, (H - m.y_t) / m.L1))); } },
    { k: 'beta', l: 'Release prong', u: '°', min: 5, max: 95, step: 0.5, sub: 'the angle of the hook that lets the sling go', get: (m) => deg(m.beta), set: (m, v) => { m.beta = rad(v); } },
  ];
  function buildSimple() {
    simple.innerHTML = '';
    SIMPLE.forEach((c) => {
      const d = document.createElement('div'); d.className = 'ctl'; d.dataset.k = c.k;
      d.innerHTML = '<div class="ctl-h"><span>' + c.l + '</span><b></b></div><input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" aria-label="' + c.l + '"><div class="ctl-sub">' + c.sub + '</div>';
      const inp = $('input', d);
      inp.addEventListener('input', () => { const v = c.log ? Math.pow(10, +inp.value) : +inp.value; c.set(st.mc, v); if (c.k === 'beta') { st.mc.release = 'prong'; $('#best').checked = false; } showSimpleVal(c, d); markCustom(); });
      inp.addEventListener('change', () => doThrow());
      simple.append(d);
    });
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<label class="chk"><input type="checkbox" id="best"> Let the crew find the best release</label>';
    simple.append(row);
    $('#best').addEventListener('change', (e) => { st.mc.release = e.target.checked ? 'ideal' : 'prong'; markCustom(); doThrow(); });
    const note = document.createElement('p'); note.className = 'pg-note'; note.textContent = 'The simple mode changes six things on whatever machine is loaded. The beam’s mass stays as it is, so a longer arm or a heavier weight is not re-sized for strength.'; simple.append(note);
  }
  function showSimpleVal(c, d) {
    const v = c.get(st.mc); const b = $('b', d);
    if (c.k === 'height') b.textContent = fmt(S.H_eff(st.mc), 2) + ' m (' + fmt(v, 2) + ' of the beam)';
    else if (c.k === 'M') b.textContent = fmt(v) + ' kg' + (st.mc.m > 0 ? ' (' + fmt(v / st.mc.m) + '× the stone)' : '');
    else if (c.k === 'm') b.textContent = fmt(v, v < 10 ? 2 : 0) + ' kg';
    else b.textContent = fmt(v, c.k === 'beta' ? 1 : 2) + (c.u ? ' ' + c.u : '');
  }
  function syncControls() {
    const m = st.mc;
    $$('.ctl', simple).forEach((d) => { const c = SIMPLE.find((x) => x.k === d.dataset.k); const v = c.get(m); const inp = $('input', d); inp.value = c.log ? Math.log10(Math.max(1e-6, v)) : v; inp.disabled = (c.k === 'beta' && m.release !== 'prong' && m.release !== 'ideal') || (m.arch === 'trac' && c.k === 'M'); showSimpleVal(c, d); });
    const best = $('#best'); if (best) best.checked = m.release === 'ideal' || m.release === 'ideal_vacuum';
    syncEngineer();
  }

  // ---------- engineer controls ----------
  const ENG = [
    ['Layout', [
      { k: 'arch', l: 'Layout', type: 'select', opts: [['hcw', 'Hinged counterweight'], ['fcw', 'Fixed counterweight'], ['whcw', 'Hinged counterweight on wheels'], ['wfcw', 'Fixed counterweight on wheels'], ['fat', 'Floating arm'], ['trac', 'Traction']] },
      { k: 'sling', l: 'Sling (off: a cup at the tip)', type: 'bool' }, { k: 'start', l: 'Start', type: 'select', opts: [['trough', 'stone in the trough'], ['hang', 'stone hanging in the sling']] },
    ]],
    ['Geometry (m, degrees from the downward vertical)', [
      { k: 'L1', l: 'Long arm L₁', min: 0.2, max: 30, step: 0.01 }, { k: 'L2', l: 'Short arm L₂', min: 0.05, max: 10, step: 0.01 }, { k: 'L3', l: 'Hanger L₃ (0 = fixed)', min: 0, max: 15, step: 0.01 },
      { k: 'L4', l: 'Sling L₄', min: 0.05, max: 30, step: 0.01 }, { k: 'H', l: 'Axle height H (blank = tip at the trough)', min: 0, max: 30, step: 0.01, nullable: true }, { k: 'y_t', l: 'Trough height y_t', min: -5, max: 10, step: 0.01 },
      { k: 'th0', l: 'Start angle θ₀', min: 0, max: 90, step: 0.1, deg: true }, { k: 'ps0', l: 'Hanger start ψ₀', min: -90, max: 90, step: 0.1, deg: true },
    ]],
    ['Masses (kg, kg·m², m)', [
      { k: 'M', l: 'Counterweight M', min: 0, max: 100000, step: 1 }, { k: 'm', l: 'Stone m', min: 0.01, max: 2000, step: 0.01 }, { k: 'm_b', l: 'Beam m_b', min: 0, max: 20000, step: 0.1 },
      { k: 'I_b', l: 'Beam inertia I_b (blank = uniform)', min: 0, max: 1e6, step: 0.1, nullable: true }, { k: 'L_CM', l: 'Beam centre of mass from the axle (blank = uniform)', min: -30, max: 30, step: 0.01, nullable: true },
      { k: 'I_c', l: 'Counterweight inertia I_c', min: 0, max: 1e6, step: 0.1 }, { k: 'm_f', l: 'Rolling frame mass m_f', min: 0, max: 100000, step: 1 },
    ]],
    ['Stone and air', [
      { k: 'd', l: 'Stone diameter (blank = from density)', min: 0.01, max: 2, step: 0.001, nullable: true }, { k: 'rho_s', l: 'Stone density kg/m³', min: 100, max: 20000, step: 1 }, { k: 'C_d', l: 'Drag coefficient C_d', min: 0, max: 2, step: 0.01 },
      { k: 'rho_a', l: 'Air density kg/m³', min: 0, max: 2, step: 0.001 }, { k: 'drag_flight', l: 'Air drag in flight', type: 'bool' }, { k: 'drag_sling', l: 'Air drag in the sling', type: 'bool' }, { k: 'alpha_s', l: 'Pouch drag area factor', min: 0, max: 5, step: 0.1 },
      { k: 'y_target', l: 'Landing height (m below = negative)', min: -200, max: 200, step: 0.1 },
    ]],
    ['Friction', [
      { k: 'mu_a', l: 'Axle μ', min: 0, max: 1, step: 0.001 }, { k: 'r_a', l: 'Axle radius m', min: 0, max: 0.5, step: 0.001 }, { k: 'mu_h', l: 'Hinge μ', min: 0, max: 1, step: 0.001 }, { k: 'r_h', l: 'Hinge radius m', min: 0, max: 0.5, step: 0.001 },
      { k: 'mu_t', l: 'Trough μ', min: 0, max: 1, step: 0.001 }, { k: 'C_rr', l: 'Rolling resistance', min: 0, max: 0.2, step: 0.001 }, { k: 'mu_g', l: 'Guide μ (floating arm)', min: 0, max: 1, step: 0.001 }, { k: 'mu_static_factor', l: 'Static friction factor', min: 1, max: 2, step: 0.01 },
    ]],
    ['Release', [
      { k: 'release', l: 'Mode', type: 'select', opts: [['prong', 'ring slips off a prong at angle β'], ['ideal', 'best moment for range (crew-tuned)'], ['ideal_vacuum', 'best moment, ignoring air'], ['angle', 'when the stone climbs at angle α'], ['theta', 'when the beam reaches an angle'], ['time', 'at a set time']] },
      { k: 'beta', l: 'Prong angle β', min: 0, max: 180, step: 0.1, deg: true }, { k: 'mu_p', l: 'Ring on prong μ', min: 0, max: 1, step: 0.01 }, { k: 'alpha_r', l: 'Climb angle α', min: -30, max: 89, step: 0.1, deg: true },
      { k: 'theta_rel', l: 'Beam angle for release', min: 0, max: 270, step: 0.1, deg: true }, { k: 't_r', l: 'Release time s', min: 0, max: 10, step: 0.001, nullable: true },
    ]],
    ['Crew (traction)', [
      { k: 'N_p', l: 'Pullers', min: 0, max: 300, step: 1 }, { k: 'f_p0', l: 'Force per puller N', min: 0, max: 2000, step: 1 }, { k: 'v_p0', l: 'Puller speed m/s', min: 0.1, max: 20, step: 0.1 }, { k: 'alpha_p', l: 'Rope angle', min: -60, max: 60, step: 0.1, deg: true },
    ]],
    ['Scene', [
      { k: '_wall', l: 'Wall at (m, blank = none)', min: 1, max: 2000, step: 1, nullable: true, scene: 'x' }, { k: '_wallh', l: 'Wall height m', min: 0.5, max: 60, step: 0.1, scene: 'h' },
    ]],
  ];
  const eng = $('#engineer');
  function buildEngineer() {
    eng.innerHTML = '';
    ENG.forEach(([title, items], gi) => {
      const det = document.createElement('details'); if (gi < 3) det.open = true;
      det.innerHTML = '<summary>' + title + '</summary><div class="grp"></div>';
      const grp = $('.grp', det);
      items.forEach((it) => {
        if (it.type === 'bool') { const lab = document.createElement('label'); lab.className = 'sw'; lab.innerHTML = '<input type="checkbox" data-k="' + it.k + '"> ' + it.l; grp.append(lab); return; }
        const lab = document.createElement('label'); lab.textContent = it.l; lab.htmlFor = 'eng-' + it.k;
        let inp;
        if (it.type === 'select') { inp = document.createElement('select'); it.opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; inp.append(o); }); }
        else { inp = document.createElement('input'); inp.type = 'number'; inp.step = it.step; if (it.min != null) inp.min = it.min; if (it.max != null) inp.max = it.max; }
        inp.id = 'eng-' + it.k; inp.dataset.k = it.k;
        grp.append(lab, inp);
      });
      eng.append(det);
    });
    const row = document.createElement('div'); row.className = 'row'; row.innerHTML = '<button class="btn" id="eng-throw" type="button">Throw with these inputs</button>';
    eng.append(row);
    const note = document.createElement('p'); note.className = 'pg-note'; note.textContent = 'Symbols follow the paper. Angles are from the downward vertical in the throwing sense, as in the model. Blank fields take the model’s default.'; eng.append(note);
    eng.addEventListener('change', (e) => { const t = e.target; if (!t.dataset.k) return; readEngineer(); markCustom(); if (t.tagName === 'SELECT' || t.type === 'checkbox') { syncControls(); doThrow(); } });
    $('#eng-throw').addEventListener('click', () => { readEngineer(); syncControls(); doThrow(); });
  }
  function engItems() { const out = []; ENG.forEach(([, items]) => items.forEach((it) => out.push(it))); return out; }
  function syncEngineer() {
    const m = st.mc;
    engItems().forEach((it) => {
      const inp = $('[data-k="' + it.k + '"]', eng); if (!inp) return;
      if (it.scene) { const w = st.scene && st.scene.wall; inp.value = w ? (it.scene === 'x' ? w.x : w.h) : (it.scene === 'h' ? 11 : ''); return; }
      let v = m[it.k];
      if (it.type === 'bool') { inp.checked = !!v; return; }
      if (it.type === 'select') { inp.value = v; return; }
      if (v == null) { inp.value = ''; return; }
      if (it.deg) v = deg(v);
      inp.value = Number.isInteger(v) ? v : +(+v).toPrecision(5);
    });
  }
  function readEngineer() {
    const m = st.mc;
    engItems().forEach((it) => {
      const inp = $('[data-k="' + it.k + '"]', eng); if (!inp) return;
      if (it.scene) { const x = +$('[data-k="_wall"]', eng).value, h = +$('[data-k="_wallh"]', eng).value || 11; st.scene = (fin(x) && x > 0 && $('[data-k="_wall"]', eng).value !== '') ? { wall: { x, h, t: 2.5, label: 'Wall at ' + x + ' m' } } : null; return; }
      if (it.type === 'bool') { m[it.k] = inp.checked; return; }
      if (it.type === 'select') { m[it.k] = inp.value; return; }
      if (inp.value === '') { if (it.nullable) m[it.k] = null; return; }
      let v = +inp.value; if (!fin(v)) return; if (it.deg) v = rad(v);
      m[it.k] = v;
      if (it.k === 'm') m.d = m.d; if (it.k === 'L1' || it.k === 'L2') { m.I_b = m.I_b; }
    });
    if (m.arch === 'fcw' || m.arch === 'wfcw') m.L3 = 0;
    if ((m.arch === 'hcw' || m.arch === 'whcw') && !(m.L3 > 0)) m.L3 = 0.5 * m.L2;
  }

  // ---------- the throw ----------
  let throwing = false, queued = false;
  async function doThrow() {
    if (throwing) { queued = true; return; }
    throwing = true; $('#busy').hidden = false; setPlaying(false);
    try {
      const r = await post({ cmd: 'throw', mc: st.mc, opts: {} });
      st.res = r;
      const d = S.derived(S.machine(st.mc));
      view3d.setMachine(S.machine(st.mc), d, r.frames, r.flight, st.scene, r);
      st.t = 0; $('#scrub').value = 0;
      showReadouts(r); drawSide(0); drawCharts(); checkChallenges(r);
      if (r.status === 'ok' && !matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
    } catch (e) { $('#status').textContent = 'The throw could not be computed: ' + e.message; $('#status').classList.add('bad'); }
    throwing = false; $('#busy').hidden = true;
    if (queued) { queued = false; doThrow(); }
  }
  const totalTime = () => { const r = st.res; if (!r) return 1; const tm = r.frames.length ? r.frames[r.frames.length - 1].t : 1; return Math.max(tm, fin(r.t_release) && fin(r.t_flight) ? r.t_release + r.t_flight + 0.3 : tm); };
  function showReadouts(r) {
    const box = $('#readouts'); const cells = [];
    const cell = (l, v, opts) => cells.push('<div class="' + (opts && opts.cls || '') + '" ' + (opts && opts.w ? 'data-w="' + opts.w + '"' : '') + '><b>' + v + '</b>' + l + '</div>');
    const ok = r.status === 'ok';
    cell('range', ok ? fmt(r.R) + ' m' : '–', { cls: 'src', w: 'q-range' });
    cell('R*, range ÷ beam', ok ? fmt(r.R_star, 1) : '–', { cls: 'src', w: 'q-rstar' });
    cell('efficiency η', ok && fin(r.eta) ? fmt(r.eta, 2) : '–', { cls: 'src', w: 'q-eta' });
    cell('release', ok ? fmt(r.v_r, 1) + ' m/s at ' + fmt(r.alpha_r_deg, 0) + '°' : '–', { cls: 'src', w: 'q-release' });
    cell('at impact', ok ? fmt(r.E_impact / 1000, r.E_impact < 10000 ? 1 : 0) + ' kJ' : '–', { cls: 'src', w: 'q-impact' });
    cell('apex · flight', ok ? fmt(r.apex) + ' m · ' + fmt(r.t_flight, 1) + ' s' : '–');
    const L = r.loads || {};
    cell('peak axle load', fin(L.F_R_max_Mg) ? fmt(L.F_R_max_Mg, 2) + ' Mg' : '–', { cls: 'src' + (L.F_R_max_Mg > 8 ? ' warn' : ''), w: 'q-loads' });
    if (fin(L.F_H_max_Mg) && st.mc.arch !== 'fcw' && st.mc.arch !== 'wfcw' && st.mc.arch !== 'trac') cell('peak hinge load', fmt(L.F_H_max_Mg, 2) + ' Mg', { cls: 'src' + (L.F_H_max_Mg > 8 ? ' warn' : ''), w: 'q-loads' });
    if (fin(L.T_s_max_mg)) cell('peak sling pull', fmt(L.T_s_max_mg, 0) + ' × stone', { cls: 'src', w: 'q-loads' });
    cell('energy check', fin(r.energy_error) ? (r.energy_error < 1e-6 ? 'balanced' : fmt(r.energy_error * 100, 3) + '%') : '–', { cls: 'src', w: 'q-energy' });
    box.innerHTML = cells.join('');
    $$('.src', box).forEach((d) => { d.setAttribute('tabindex', '0'); d.setAttribute('role', 'button'); d.title = 'What this means'; });
    const stEl = $('#status');
    const msgs = {
      ok: '', no_liftoff: 'The stone never left the trough: the beam does not swing hard enough to lift it.', no_release: 'No release: with this prong the sling never lets go. Try a smaller prong angle or the best-moment release.',
      slack: 'The sling went slack before release: the stone was outrunning the beam. Shorten the sling or raise the counterweight.', ground_strike: 'The stone hit the ground before release. Raise the axle, shorten the sling or start the beam more upright.',
      bad_start: 'The machine cannot start from this position.', no_landing: 'The stone never landed.', bad_release: 'That release mode does not fit this machine.',
    };
    let msg = msgs[r.status] != null ? msgs[r.status] : ('Status: ' + r.status);
    if (r.starts === false) msg = 'Static friction holds the beam: the machine would not start. ' + msg;
    if (r.notes && r.notes.length) msg += (msg ? ' ' : '') + r.notes.join('. ') + '.';
    if (ok && st.presetId && !msg) { const it = PR.LIST.find((x) => x.id === st.presetId); if (sel.value !== '__custom' && it && it.status) msg = { design: 'A design from the project (run P7-R12 or P8-R05).', validated: 'A published case the model reproduces.', reconstruction: 'A real machine, with the inputs nobody published assumed as the note says.', illustrative: 'A demonstration machine, not optimised.' }[it.status] || ''; }
    stEl.textContent = msg; stEl.classList.toggle('bad', !ok);
  }
  window.TREB_WORKING = Object.assign(window.TREB_WORKING || {}, {
    'q-range': { title: 'Range', lines: ['Measured along the ground from the point under the axle at the trigger to where the stone lands, in the model.'], note: 'Model ranges run about 10 to 15% long against measured throws, because beam, frame and sling are treated as rigid.' },
    'q-rstar': { title: 'R*, the size-free score', lines: ['<i>R</i>* = range ÷ (<i>L</i><sub>1</sub> + <i>L</i><sub>2</sub>)'], note: 'Machines of different sizes built to the same proportions, with the counterweight the same multiple of the stone, score the same R*. Compare R* only at equal counterweight ratio.' },
    'q-eta': { title: 'Efficiency η', lines: ['<i>η</i> = ½ <i>m v</i><sup>2</sup> at release ÷ <i>M g</i> Δ<i>h</i>'], note: 'The share of the counterweight’s available drop that leaves with the stone. For a traction engine the crew’s work replaces the drop.' },
    'q-release': { title: 'Release', lines: ['The stone’s speed and climb angle at the instant the sling lets go.'], note: 'The best climb angle through air is below 45°, usually 38 to 42°, because a lower, faster path loses less to drag.' },
    'q-impact': { title: 'Energy at impact', lines: ['<i>E</i> = ½ <i>m v</i><sup>2</sup> with <i>v</i> the speed at landing'], note: 'Air takes some of the release energy on the way; a heavier stone keeps more of its speed.' },
    'q-loads': { title: 'Peak loads', lines: ['Axle and hinge loads are given as multiples of the counterweight’s weight (Mg); the sling pull as a multiple of the stone’s weight (mg).'], note: 'The design study held the hinge to 5 Mg for a timber box on iron straps and 8 Mg for a steel yoke. The page reports loads but sizes no parts.' },
    'q-energy': { title: 'Energy check', lines: ['Kinetic + potential energy + work lost to friction and air, compared with the start, over the whole throw.'], note: 'A balanced book means the integrator conserved energy to better than one part in a million.' },
  });

  // ---------- playback ----------
  let raf = null, lastTs = null;
  function setPlaying(on) { st.playing = on; $('#play').textContent = on ? 'Pause' : (st.t >= totalTime() - 1e-6 ? 'Replay' : 'Play'); lastTs = null; if (on) { if (st.t >= totalTime() - 1e-6) st.t = 0; raf = requestAnimationFrame(tick); } else if (raf) cancelAnimationFrame(raf); }
  function tick(ts) {
    if (!st.playing) return;
    if (lastTs == null) lastTs = ts;
    const dt = (ts - lastTs) / 1000; lastTs = ts;
    const r = st.res, tRel = r && fin(r.t_release) ? r.t_release : Infinity;
    const sp = st.t > tRel + 0.3 ? Math.max(st.speed, 1) : st.speed; // the flight plays at full speed at least
    st.t = Math.min(totalTime(), st.t + dt * sp);
    setTime(st.t);
    if (st.t >= totalTime() - 1e-6) { setPlaying(false); return; }
    raf = requestAnimationFrame(tick);
  }
  function setTime(t) {
    st.t = t; $('#scrub').value = Math.round(t / totalTime() * 1000); $('#tnow').textContent = t.toFixed(2) + ' s';
    if (st.view !== 'side') view3d.setTime(t);
    if (st.view !== '3d') drawSide(t);
  }
  $('#play').addEventListener('click', () => setPlaying(!st.playing));
  $('#throw').addEventListener('click', () => { readEngineer(); doThrow(); });
  $('#scrub').addEventListener('input', () => { setPlaying(false); setTime(+$('#scrub').value / 1000 * totalTime()); });
  $('#speed').addEventListener('change', (e) => { st.speed = +e.target.value; });
  $$('.pg-viewctl [data-view]').forEach((b) => b.addEventListener('click', () => { $$('.pg-viewctl [data-view]').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); st.view = b.dataset.view; $('#views').dataset.view = st.view; onResize(); }));
  $$('.pg-viewctl [data-cam]').forEach((b) => b.addEventListener('click', () => { $$('.pg-viewctl [data-cam]').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); st.cam = b.dataset.cam; view3d.setMode(st.cam); }));
  $$('.pg-modeseg button').forEach((b) => b.addEventListener('click', () => { $$('.pg-modeseg button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); st.mode = b.dataset.mode; $('#simple').hidden = st.mode !== 'simple'; $('#engineer').hidden = st.mode !== 'engineer'; $('#challenge').hidden = st.mode !== 'challenge'; }));
  function onResize() { view3d.resize(); fit2d(); drawSide(st.t); drawCharts(); }
  window.addEventListener('resize', onResize);
  window.addEventListener('treb-theme', () => { view3d.theme(); view3d.setMachine && st.res && view3d.setMachine(S.machine(st.mc), S.derived(S.machine(st.mc)), st.res.frames, st.res.flight, st.scene, st.res); view3d.setTime(st.t); drawSide(st.t); drawCharts(); });

  // ---------- side view ----------
  function fit2d() { const r = v2d.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); v2d.width = Math.round(r.width * dpr); v2d.height = Math.round(r.height * dpr); ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); v2d._w = r.width; v2d._h = r.height; }
  function frameOf(res, t) { return view3d.frameAt.call({ frames: res.frames }, t); }
  function stoneOf(res, t) { const tRel = fin(res.t_release) ? res.t_release : Infinity; if (t <= tRel) { const f = frameOf(res, t); return f && f.p ? [f.p[0], f.p[1], false] : null; } const q = view3d.flightAt.call({ flight: res.flight }, t - tRel); return q ? [q[1], Math.max(q[2], res.mc.y_target || 0), true] : null; }
  function drawSide(t) {
    if (!v2d._w) fit2d();
    const w = v2d._w, h = v2d._h; ctx2.clearRect(0, 0, w, h);
    const slots = [{ mc: S.machine(st.mc), res: st.res, col: css(COLS[0]) }].concat(st.cmp.map((c, i) => ({ mc: S.machine(c.mc), res: c.res, col: css(COLS[(i + 1) % 3]) })));
    if (!st.res) return;
    // bounds: whole throw if the stone is flying or the camera says so, else the machine
    let xr, yr;
    const whole = st.cam === 'whole' || (st.cam === 'stone' && t > (st.res.t_release || 0));
    if (whole) { let R = 0, A = 0; slots.forEach((s) => { if (s.res && fin(s.res.R)) { R = Math.max(R, s.res.R); A = Math.max(A, s.res.apex || 0); } }); const Lb = st.mc.L1 + st.mc.L2; xr = [-1.6 * Lb, Math.max(R, 3 * Lb) * 1.05 + 5]; yr = [Math.min(0, st.mc.y_target || 0) - 2, Math.max(A, 2.2 * Lb) * 1.1 + 2]; }
    else { const Lb = st.mc.L1 + st.mc.L2, d = S.derived(S.machine(st.mc)); xr = [-1.45 * Lb - 2, 1.0 * Lb + 2]; yr = [-1, Math.max(d.H + st.mc.L2 + 2, 1.15 * Lb) + 1]; }
    const pad = 10, sc = Math.min((w - 2 * pad) / (xr[1] - xr[0]), (h - 2 * pad) / (yr[1] - yr[0]));
    const ox = pad + ((w - 2 * pad) - sc * (xr[1] - xr[0])) / 2, oy = pad + ((h - 2 * pad) - sc * (yr[1] - yr[0])) / 2;
    const X = (x) => ox + (x - xr[0]) * sc, Y = (y) => h - oy - (y - yr[0]) * sc;
    const line = css('--line'), ink2 = css('--ink-2'), ink = css('--ink'), wood = css('--wood'), iron = css('--iron'), stone = css('--stone');
    ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
    ctx2.strokeStyle = line; ctx2.lineWidth = 1; ctx2.beginPath(); ctx2.moveTo(0, Y(0) + 0.5); ctx2.lineTo(w, Y(0) + 0.5); ctx2.stroke();
    // wall
    if (st.scene && st.scene.wall) { const wl = st.scene.wall; ctx2.fillStyle = stone; ctx2.fillRect(X(wl.x), Y(wl.h), Math.max(2, (wl.t || 2.5) * sc), wl.h * sc); ctx2.fillStyle = ink2; ctx2.font = '11px ' + css('--sans'); ctx2.textAlign = 'left'; ctx2.fillText(wl.label || 'wall', X(wl.x) + 4, Y(wl.h) - 4); }
    slots.forEach((s, si) => {
      const mc = s.mc, res = s.res; if (!res || !res.frames.length) return;
      const fr = frameOf(res, t); if (!fr) return;
      const d = S.derived(mc), H = d.H, Lb = mc.L1 + mc.L2, alpha = si === 0 ? 1 : 0.55;
      ctx2.globalAlpha = alpha;
      // frame
      ctx2.strokeStyle = si === 0 ? stone : s.col; ctx2.lineWidth = Math.max(1.5, Math.min(4, 0.012 * Lb * sc));
      if (mc.arch === 'fat') { const gx = 0.9 * (0.3 + 0.04 * Lb); ctx2.beginPath(); ctx2.moveTo(X(-gx), Y(0)); ctx2.lineTo(X(-gx), Y(H + mc.L2 + 0.8)); ctx2.moveTo(X(gx), Y(0)); ctx2.lineTo(X(gx), Y(H + mc.L2 + 0.8)); ctx2.moveTo(X(-0.34 * Lb), Y(H)); ctx2.lineTo(X(0.34 * Lb), Y(H)); ctx2.moveTo(X(-0.32 * Lb), Y(H)); ctx2.lineTo(X(-0.32 * Lb), Y(0)); ctx2.moveTo(X(0.32 * Lb), Y(H)); ctx2.lineTo(X(0.32 * Lb), Y(0)); ctx2.stroke(); }
      else { const bw = 0.42 * H, x0 = fr.P[0], wheeled = mc.arch === 'wfcw' || mc.arch === 'whcw', rw = wheeled ? Math.max(0.3, 0.06 * H) : 0; ctx2.beginPath(); ctx2.moveTo(X(x0 - bw), Y(rw * 0)); ctx2.lineTo(X(x0), Y(H)); ctx2.lineTo(X(x0 + bw), Y(0)); ctx2.moveTo(X(x0 - bw * 0.5), Y(H / 2)); ctx2.lineTo(X(x0 + bw * 0.5), Y(H / 2)); ctx2.stroke(); if (wheeled) { ctx2.fillStyle = css('--bg'); [-0.85, 0.85].forEach((f) => { ctx2.beginPath(); ctx2.arc(X(x0 + f * bw), Y(rw), Math.max(3, rw * sc), 0, 2 * Math.PI); ctx2.fill(); ctx2.stroke(); }); } }
      // trough
      ctx2.strokeStyle = line; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.moveTo(X((mc.arch === 'fat' ? 0 : fr.P[0]) - mc.L1 - 1.2), Y(mc.y_t) - 1); ctx2.lineTo(X((mc.arch === 'fat' ? 0 : fr.P[0]) + 0.3), Y(mc.y_t) - 1); ctx2.stroke();
      // box and hanger
      if (mc.arch !== 'trac') {
        const side = Math.cbrt(mc.M / (mc.mu_a < 0.01 ? 7874 : 2000)); let u;
        if (mc.arch === 'hcw' || mc.arch === 'whcw') u = [-Math.sin(fr.ps), -Math.cos(fr.ps)]; else if (mc.arch === 'fat') u = [0, -1]; else { const a = fr.th - Math.PI / 2; u = [-Math.sin(a), -Math.cos(a)]; }
        const v = [-u[1], u[0]], C = fr.C, hw = side / 2;
        if (mc.arch === 'hcw' || mc.arch === 'whcw') { ctx2.strokeStyle = iron; ctx2.lineWidth = Math.max(1.2, 0.006 * Lb * sc); ctx2.beginPath(); ctx2.moveTo(X(fr.K[0]), Y(fr.K[1])); ctx2.lineTo(X(C[0] - u[0] * hw), Y(C[1] - u[1] * hw)); ctx2.stroke(); }
        ctx2.fillStyle = si === 0 ? iron : s.col; ctx2.beginPath();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => { const x = C[0] + v[0] * a * hw + u[0] * b * hw, y = C[1] + v[1] * a * hw + u[1] * b * hw; i ? ctx2.lineTo(X(x), Y(y)) : ctx2.moveTo(X(x), Y(y)); }); ctx2.closePath(); ctx2.fill();
      } else {
        const ep = [Math.sin(mc.alpha_p || 0), -Math.cos(mc.alpha_p || 0)]; const sl = ep[1] < -0.05 ? (fr.K[1] - 1.0) / -ep[1] : 3; const re = [fr.K[0] + ep[0] * Math.max(sl, 0.3), fr.K[1] + ep[1] * Math.max(sl, 0.3)];
        ctx2.strokeStyle = ink2; ctx2.lineWidth = 1; ctx2.beginPath(); ctx2.moveTo(X(fr.K[0]), Y(fr.K[1])); ctx2.lineTo(X(re[0]), Y(re[1])); ctx2.stroke();
        const n = Math.min(8, Math.max(1, mc.N_p || 1)), sp = Math.max(0.45, 0.06 * Lb); ctx2.fillStyle = ink2;
        for (let k = 0; k < n; k++) { const px = re[0] + (k - (n - 1) / 2) * sp, hx = X(px), hy = Y(0), hg = Math.max(5, 1.7 * sc); ctx2.beginPath(); ctx2.moveTo(hx, hy); ctx2.lineTo(hx, hy - hg * 0.8); ctx2.stroke(); ctx2.beginPath(); ctx2.arc(hx, hy - hg * 0.8 - Math.max(1.5, 0.12 * sc), Math.max(1.5, 0.12 * sc), 0, 2 * Math.PI); ctx2.fill(); }
      }
      // beam (tapered)
      const K = fr.K, Sp = fr.S, dx = Sp[0] - K[0], dy = Sp[1] - K[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, t0 = mc.L2 / Lb, dA = (mc.D_b > 0 ? mc.D_b : 0.055 * Lb) / 2, dT = dA * 0.45;
      const at = (f, hh) => [K[0] + dx * f + nx * hh, K[1] + dy * f + ny * hh]; const halfAt = (f) => (f <= t0 ? dA * (0.75 + 0.25 * f / Math.max(t0, 1e-6)) : dA + (dT - dA) * (f - t0) / Math.max(1 - t0, 1e-6));
      const poly = [at(0, halfAt(0)), at(t0, halfAt(t0)), at(1, halfAt(1)), at(1, -halfAt(1)), at(t0, -halfAt(t0)), at(0, -halfAt(0))];
      ctx2.fillStyle = si === 0 ? wood : s.col; ctx2.strokeStyle = ink2; ctx2.lineWidth = 0.8; ctx2.beginPath(); poly.forEach((p, i) => (i ? ctx2.lineTo(X(p[0]), Y(p[1])) : ctx2.moveTo(X(p[0]), Y(p[1])))); ctx2.closePath(); ctx2.fill(); ctx2.stroke();
      if (dA * sc < 1.5) { ctx2.strokeStyle = si === 0 ? wood : s.col; ctx2.lineWidth = 3; ctx2.beginPath(); ctx2.moveTo(X(K[0]), Y(K[1])); ctx2.lineTo(X(Sp[0]), Y(Sp[1])); ctx2.stroke(); }
      ctx2.fillStyle = iron; ctx2.beginPath(); ctx2.arc(X(fr.P[0]), Y(fr.P[1]), Math.max(2.5, Math.min(6, (mc.r_a || 0.05) * sc)), 0, 2 * Math.PI); ctx2.fill();
      ctx2.fillStyle = s.col; ctx2.beginPath(); ctx2.arc(X(fr.P[0]), Y(fr.P[1]), 1.6, 0, 2 * Math.PI); ctx2.fill();
      // sling and stone; flight path
      const sp2 = stoneOf(res, t);
      if (sp2 && !sp2[2] && mc.sling) { ctx2.strokeStyle = ink2; ctx2.lineWidth = 1.2; ctx2.beginPath(); ctx2.moveTo(X(Sp[0]), Y(Sp[1])); ctx2.lineTo(X(sp2[0]), Y(sp2[1])); ctx2.stroke(); }
      if (res.flight && res.flight.length && (whole || sp2 && sp2[2])) { ctx2.strokeStyle = s.col; ctx2.lineWidth = 1.2; ctx2.setLineDash([3, 3]); ctx2.beginPath(); res.flight.forEach((q, i) => (i ? ctx2.lineTo(X(q[1]), Y(q[2])) : ctx2.moveTo(X(q[1]), Y(q[2])))); ctx2.stroke(); ctx2.setLineDash([]); }
      if (sp2) { ctx2.fillStyle = si === 0 ? ink : s.col; ctx2.beginPath(); ctx2.arc(X(sp2[0]), Y(sp2[1]), Math.max(2.5, d.d / 2 * sc), 0, 2 * Math.PI); ctx2.fill(); }
      ctx2.globalAlpha = 1;
    });
    // scale bar
    const bar = whole ? (xr[1] - xr[0] > 400 ? 100 : 50) : 5;
    ctx2.strokeStyle = ink2; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.moveTo(w - pad - bar * sc, h - pad - 6); ctx2.lineTo(w - pad, h - pad - 6); ctx2.stroke();
    ctx2.fillStyle = ink2; ctx2.font = '11px ' + css('--sans'); ctx2.textAlign = 'right'; ctx2.fillText(bar + ' m', w - pad, h - pad - 10);
    if (slots.length > 1) { ctx2.textAlign = 'left'; slots.forEach((s, i) => { ctx2.fillStyle = s.col; ctx2.fillText((i === 0 ? 'this machine' : (s.res && s.res.name) || 'kept ' + i) + (s.res && fin(s.res.R) ? ': ' + fmt(s.res.R) + ' m' : ''), pad + 2, h - pad - 6 - (slots.length - 1 - i) * 14); }); }
  }

  // ---------- charts ----------
  function chartCtx(id) { const c = $(id); const r = c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); if (!r.width) return null; c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); const cx = c.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, r.width, r.height); return { cx, w: r.width, h: r.height }; }
  function axes(cx, box, xr, yr, xl, yl, fmtx, fmty) {
    const { x0, y0, x1, y1 } = box; const X = (x) => x0 + (x - xr[0]) / (xr[1] - xr[0]) * (x1 - x0), Y = (y) => y1 - (y - yr[0]) / (yr[1] - yr[0]) * (y1 - y0);
    cx.strokeStyle = css('--line'); cx.lineWidth = 1; cx.fillStyle = css('--muted'); cx.font = '11px ' + css('--sans');
    const z0 = (q) => (Math.abs(q) < 1e-9 ? 0 : q);
    const nice = (r) => { const span = r[1] - r[0]; const st2 = Math.pow(10, Math.floor(Math.log10(span / 4))); const m = [1, 2, 5, 10].find((k) => span / (st2 * k) <= 6) || 10; return st2 * m; };
    const sx = nice(xr), sy = nice(yr);
    cx.textAlign = 'center'; for (let v = Math.ceil(xr[0] / sx) * sx; v <= xr[1] + 1e-9; v += sx) { cx.beginPath(); cx.moveTo(X(v), y0); cx.lineTo(X(v), y1); cx.strokeStyle = css('--line-2'); cx.stroke(); cx.fillText((fmtx || ((q) => fmt(z0(q), sx < 1 ? 2 : 0)))(v), X(v), y1 + 14); }
    cx.textAlign = 'right'; for (let v = Math.ceil(yr[0] / sy) * sy; v <= yr[1] + 1e-9; v += sy) { cx.beginPath(); cx.moveTo(x0, Y(v)); cx.lineTo(x1, Y(v)); cx.stroke(); cx.fillText((fmty || ((q) => fmt(z0(q), sy < 1 ? 2 : 0)))(v), x0 - 4, Y(v) + 4); }
    cx.textAlign = 'left'; cx.fillStyle = css('--ink-2'); cx.fillText(xl, x0, y1 + 28); cx.fillText(yl, x0, y0 - 6);
    return { X, Y };
  }
  function drawCharts() { drawFlight(); drawLoads(); drawSweep(); fillCompare(); }
  function drawFlight() {
    const c = chartCtx('#chart-flight'); if (!c || !st.res) return; const { cx, w, h } = c; const r = st.res;
    // left: the flight path(s) to scale; right: energy bands against time
    const slots = [{ res: st.res, col: css(COLS[0]) }].concat(st.cmp.map((s, i) => ({ res: s.res, col: css(COLS[(i + 1) % 3]) })));
    let R = 1, A = 1; slots.forEach((s) => { if (s.res && s.res.flight) { R = Math.max(R, s.res.R || 1); A = Math.max(A, s.res.apex || 1); } });
    const half = w * 0.52;
    const b1 = { x0: 44, y0: 16, x1: half - 16, y1: h - 36 };
    const hy = Math.max(A * 1.1, R * (b1.y1 - b1.y0) / (b1.x1 - b1.x0) * 0.5);
    const a1 = axes(cx, b1, [-10, R * 1.05], [Math.min(0, r.mc.y_target || 0), hy], 'distance, m', 'height, m');
    slots.forEach((s) => { if (!s.res || !s.res.flight) return; cx.strokeStyle = s.col; cx.lineWidth = 2; cx.beginPath(); s.res.flight.forEach((q, i) => (i ? cx.lineTo(a1.X(q[1]), a1.Y(q[2])) : cx.moveTo(a1.X(q[1]), a1.Y(q[2])))); cx.stroke(); });
    if (st.scene && st.scene.wall) { const wl = st.scene.wall; cx.fillStyle = css('--stone'); cx.fillRect(a1.X(wl.x), a1.Y(wl.h), Math.max(2, a1.X(wl.x + 2.5) - a1.X(wl.x)), a1.Y(0) - a1.Y(wl.h)); }
    cx.fillStyle = css('--ink'); cx.font = '12px ' + css('--sans'); cx.textAlign = 'right'; cx.fillText('Flight path, to scale', b1.x1, b1.y0 + 2); cx.textAlign = 'left';
    // energy
    const H = r.history; if (!H || !H.t) return;
    const b2 = { x0: half + 48, y0: 16, x1: w - 12, y1: h - 36 };
    const tEnd = H.t[H.t.length - 1]; const Etot = Math.max(1, r.E_available || 1) / 1000;
    const a2 = axes(cx, b2, [0, tEnd], [0, Etot * 1.02], 'time, s', 'energy, kJ');
    const series = [
      { k: (i) => H.PE_cw[i] - Math.min.apply(null, H.PE_cw), col: css('--iron'), l: 'counterweight (potential)' },
      { k: (i) => H.KE_cw[i] + H.KE_beam[i] + H.PE_beam[i] - Math.min.apply(null, H.PE_beam) + (H.KE_frame ? H.KE_frame[i] : 0), col: css('--wood'), l: 'beam, box and frame' },
      { k: (i) => (H.KE_p[i] || 0) + Math.max(0, H.PE_p[i] || 0), col: css(COLS[0]), l: 'stone' },
      { k: (i) => (H.W ? H.W[i] : 0), col: css('--line'), l: 'bearings and air' },
    ];
    const n = H.t.length; let base = new Array(n).fill(0);
    series.forEach((s) => { cx.fillStyle = s.col; cx.beginPath(); for (let i = 0; i < n; i++) { const v = base[i] + Math.max(0, s.k(i) || 0) / 1000; i ? cx.lineTo(a2.X(H.t[i]), a2.Y(Math.min(v, Etot * 1.02))) : cx.moveTo(a2.X(H.t[i]), a2.Y(Math.min(v, Etot * 1.02))); } for (let i = n - 1; i >= 0; i--) cx.lineTo(a2.X(H.t[i]), a2.Y(Math.min(base[i], Etot * 1.02))); cx.closePath(); cx.globalAlpha = 0.85; cx.fill(); cx.globalAlpha = 1; for (let i = 0; i < n; i++) base[i] += Math.max(0, s.k(i) || 0) / 1000; });
    if (fin(r.t_release)) { cx.strokeStyle = css('--ink'); cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(a2.X(r.t_release), b2.y0); cx.lineTo(a2.X(r.t_release), b2.y1); cx.stroke(); cx.setLineDash([]); cx.fillStyle = css('--ink-2'); cx.font = '11px ' + css('--sans'); cx.textAlign = 'left'; cx.fillText('release', a2.X(r.t_release) + 3, b2.y0 + 12); }
    cx.fillStyle = css('--ink'); cx.font = '12px ' + css('--sans'); cx.textAlign = 'right'; cx.fillText('Where the energy is', b2.x1, b2.y0 + 2); cx.textAlign = 'left';
    let lx = b2.x0 + 60; series.forEach((s) => { cx.fillStyle = s.col; cx.fillRect(lx, b2.y1 + 20, 10, 10); cx.fillStyle = css('--ink-2'); cx.font = '11px ' + css('--sans'); cx.fillText(s.l, lx + 13, b2.y1 + 29); lx += 13 + cx.measureText(s.l).width + 12; });
  }
  function drawLoads() {
    const c = chartCtx('#chart-loads'); if (!c || !st.res || !st.res.history) return; const { cx, w, h } = c; const r = st.res, H = r.history; const Mg = r.mc.M * r.mc.g || 1, mg = r.mc.m * r.mc.g || 1;
    const FR = H.F_Rx.map((v, i) => Math.hypot(v, H.F_Ry[i]) / Mg), FH = H.F_Hx.map((v, i) => Math.hypot(v, H.F_Hy[i]) / Mg), TS = H.T_s.map((v) => (v || 0) / mg);
    const b = { x0: 44, y0: 16, x1: w - 60, y1: h - 36 }; const tEnd = H.t[H.t.length - 1];
    const ymax = Math.max(1, Math.max.apply(null, FR.concat(FH).filter(fin)) * 1.1);
    const a = axes(cx, b, [0, tEnd], [0, ymax], 'time, s', 'load, multiples of the counterweight’s weight (Mg)');
    const plot = (arr, col, dash) => { cx.strokeStyle = col; cx.lineWidth = 2; cx.setLineDash(dash || []); cx.beginPath(); let started = false; arr.forEach((v, i) => { if (!fin(v)) { started = false; return; } started ? cx.lineTo(a.X(H.t[i]), a.Y(v)) : cx.moveTo(a.X(H.t[i]), a.Y(v)); started = true; }); cx.stroke(); cx.setLineDash([]); };
    plot(FR, css('--iron')); if (r.mc.arch === 'hcw' || r.mc.arch === 'whcw' || r.mc.arch === 'fat') plot(FH, css('--fcw'));
    const tmax = Math.max(1, Math.max.apply(null, TS.filter(fin))); const tsScaled = TS.map((v) => v / tmax * ymax); plot(tsScaled, css(COLS[0]), [4, 3]);
    cx.textAlign = 'right'; cx.fillStyle = css(COLS[0]); cx.font = '11px ' + css('--sans'); cx.fillText('sling pull, up to ' + fmt(tmax, 0) + ' × stone (dashed, own scale)', b.x1, b.y0 + 12);
    cx.fillStyle = css('--iron'); cx.fillText('axle', b.x1, b.y0 + 26); if (r.mc.arch === 'hcw' || r.mc.arch === 'whcw' || r.mc.arch === 'fat') { cx.fillStyle = css('--fcw'); cx.fillText(r.mc.arch === 'fat' ? 'guide pin' : 'hinge', b.x1, b.y0 + 40); }
    if (fin(r.t_release)) { cx.strokeStyle = css('--ink'); cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(a.X(r.t_release), b.y0); cx.lineTo(a.X(r.t_release), b.y1); cx.stroke(); cx.setLineDash([]); }
  }
  // ---------- sweep ----------
  const SWEEP = [
    { k: 'M', l: 'Counterweight M (kg)', get: (m) => m.M, set: (m, v) => { m.M = v; } },
    { k: 'm', l: 'Stone m (kg)', get: (m) => m.m, set: (m, v) => { m.m = v; m.d = null; } },
    { k: 'L4', l: 'Sling length L₄ (m)', get: (m) => m.L4, set: (m, v) => { m.L4 = v; } },
    { k: 'ratio', l: 'Arm ratio L₁/L₂ (beam length kept)', get: (m) => m.L1 / m.L2, set: (m, v) => { const Lb = m.L1 + m.L2; m.L2 = Lb / (1 + v); m.L1 = Lb - m.L2; m.I_b = null; m.L_CM = null; } },
    { k: 'L3', l: 'Hanger L₃ (m)', get: (m) => m.L3, set: (m, v) => { m.L3 = v; } },
    { k: 'H', l: 'Axle height H (m), tip at the trough', get: (m) => S.H_eff(m), set: (m, v) => { m.H = v; m.th0 = Math.acos(Math.max(-1, Math.min(1, (v - m.y_t) / m.L1))); } },
    { k: 'th0', l: 'Start angle θ₀ (°)', get: (m) => deg(m.th0), set: (m, v) => { m.th0 = rad(v); m.H = null; } },
    { k: 'beta', l: 'Prong angle β (°)', get: (m) => deg(m.beta), set: (m, v) => { m.beta = rad(v); m.release = 'prong'; } },
    { k: 'm_b', l: 'Beam mass m_b (kg)', get: (m) => m.m_b, set: (m, v) => { m.m_b = v; m.I_b = null; } },
    { k: 'C_d', l: 'Drag coefficient C_d', get: (m) => m.C_d, set: (m, v) => { m.C_d = v; } },
    { k: 'mu_a', l: 'Axle friction μ', get: (m) => m.mu_a, set: (m, v) => { m.mu_a = v; } },
  ];
  let sweepData = null;
  (function initSweep() {
    const ps = $('#sweep-param'); SWEEP.forEach((s) => { const o = document.createElement('option'); o.value = s.k; o.textContent = s.l; ps.append(o); });
    ps.addEventListener('change', sweepDefaults);
    $('#sweep-run').addEventListener('click', runSweep);
  })();
  function sweepDefaults() { const s = SWEEP.find((x) => x.k === $('#sweep-param').value); if (!s || !st.mc) return; const v = s.get(st.mc); const lo = s.k === 'beta' || s.k === 'th0' ? Math.max(0, v - 20) : v * 0.6, hi = s.k === 'beta' || s.k === 'th0' ? v + 20 : v * 1.4; $('#sweep-lo').value = +lo.toPrecision(4); $('#sweep-hi').value = +hi.toPrecision(4); }
  async function runSweep() {
    const s = SWEEP.find((x) => x.k === $('#sweep-param').value); const lo = +$('#sweep-lo').value, hi = +$('#sweep-hi').value; if (!s || !fin(lo) || !fin(hi)) return;
    const vals = []; for (let i = 0; i < 9; i++) vals.push(lo + (hi - lo) * i / 8);
    const machines = vals.map((v) => { const m = Object.assign({}, st.mc); s.set(m, v); m.rtol = 1e-7; m.atol = 1e-7; return m; });
    $('#sweep-run').disabled = true; $('#sweep-prog').textContent = 'running…';
    try { const out = await post({ cmd: 'sweepList', machines }, (p) => { $('#sweep-prog').textContent = Math.round(p * 100) + '%'; }); sweepData = { s, vals, out, now: s.get(st.mc) }; $('#sweep-prog').textContent = 'done, at the looser tolerance used for sweeps'; }
    catch (e) { $('#sweep-prog').textContent = 'failed: ' + e.message; }
    $('#sweep-run').disabled = false; drawSweep();
  }
  function drawSweep() {
    const c = chartCtx('#chart-sweep'); if (!c) return; const { cx, w, h } = c;
    if (!sweepData) { cx.fillStyle = css('--muted'); cx.font = '13px ' + css('--sans'); cx.fillText('Pick an input and run a sweep of nine throws.', 20, 30); return; }
    const { s, vals, out, now } = sweepData; const ok = out.filter((o) => o.status === 'ok' && fin(o.R));
    const Rmax = Math.max(1, Math.max.apply(null, ok.map((o) => o.R))) * 1.1;
    const b = { x0: 48, y0: 16, x1: w - 56, y1: h - 40 };
    const a = axes(cx, b, [Math.min.apply(null, vals), Math.max.apply(null, vals)], [0, Rmax], s.l, 'range, m');
    cx.strokeStyle = css(COLS[0]); cx.lineWidth = 2; cx.beginPath(); let started = false; out.forEach((o, i) => { if (o.status !== 'ok') { started = false; return; } started ? cx.lineTo(a.X(vals[i]), a.Y(o.R)) : cx.moveTo(a.X(vals[i]), a.Y(o.R)); started = true; }); cx.stroke();
    out.forEach((o, i) => { cx.fillStyle = o.status === 'ok' ? css(COLS[0]) : css('--fcw'); cx.beginPath(); cx.arc(a.X(vals[i]), o.status === 'ok' ? a.Y(o.R) : b.y1 - 4, 4, 0, 2 * Math.PI); cx.fill(); if (o.status !== 'ok') { cx.fillStyle = css('--fcw'); cx.font = '10px ' + css('--sans'); cx.textAlign = 'center'; cx.fillText(o.status.replace('_', ' '), a.X(vals[i]), b.y1 - 10); } });
    cx.strokeStyle = css('--ink'); cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(a.X(now), b.y0); cx.lineTo(a.X(now), b.y1); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = css('--ink-2'); cx.font = '11px ' + css('--sans'); cx.textAlign = 'left'; cx.fillText('now', a.X(now) + 3, b.y0 + 12);
    // efficiency on the right axis
    cx.strokeStyle = css('--opt'); cx.lineWidth = 1.5; cx.setLineDash([4, 3]); cx.beginPath(); started = false; out.forEach((o, i) => { if (o.status !== 'ok' || !fin(o.eta)) { started = false; return; } const y = b.y1 - o.eta * (b.y1 - b.y0); started ? cx.lineTo(a.X(vals[i]), y) : cx.moveTo(a.X(vals[i]), y); started = true; }); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = css('--opt-dark'); cx.textAlign = 'right'; cx.fillText('efficiency η, 0 to 1 (dashed)', b.x1, b.y0 + 12);
  }
  // ---------- compare ----------
  $('#cmp-add').addEventListener('click', () => { if (!st.res) return; if (st.cmp.length >= 2) st.cmp.shift(); const name = sel.value === '__custom' ? 'Edited machine ' + (st.cmp.length + 1) : (PR.LIST.find((x) => x.id === st.presetId) || {}).label; st.cmp.push({ mc: Object.assign({}, st.mc), res: Object.assign({}, st.res, { name }) }); fillCompare(); drawSide(st.t); drawFlight(); window.trebToast('Kept ' + name); });
  $('#cmp-clear').addEventListener('click', () => { st.cmp = []; fillCompare(); drawSide(st.t); drawFlight(); });
  function fillCompare() {
    const tb = $('#cmp-table'); const rows = [{ name: 'This machine', res: st.res, mc: st.mc }].concat(st.cmp.map((c) => ({ name: c.res.name, res: c.res, mc: c.mc })));
    const q = (r, k, dgt, f) => (r && r.res && fin(r.res[k]) ? fmt(f ? f(r.res[k]) : r.res[k], dgt) : '–');
    const lines = [['Layout', (r) => S.ARCH_TITLES[r.mc.arch] || r.mc.arch], ['Beam L₁ + L₂', (r) => fmt(r.mc.L1 + r.mc.L2, 2) + ' m'], ['Counterweight', (r) => fmt(r.mc.M) + ' kg'], ['Stone', (r) => fmt(r.mc.m, r.mc.m < 10 ? 2 : 0) + ' kg'], ['M/m', (r) => fmt(r.mc.M / r.mc.m, 0)],
      ['Range', (r) => q(r, 'R', 0) + ' m'], ['R*', (r) => q(r, 'R_star', 1)], ['Efficiency η', (r) => q(r, 'eta', 2)], ['Release', (r) => q(r, 'v_r', 1) + ' m/s at ' + q(r, 'alpha_r_deg', 0) + '°'], ['Impact energy', (r) => q(r, 'E_impact', 0, (v) => v / 1000) + ' kJ'],
      ['Peak axle load', (r) => (r.res && r.res.loads && fin(r.res.loads.F_R_max_Mg) ? fmt(r.res.loads.F_R_max_Mg, 2) + ' Mg' : '–')], ['Peak sling pull', (r) => (r.res && r.res.loads && fin(r.res.loads.T_s_max_mg) ? fmt(r.res.loads.T_s_max_mg, 0) + ' × stone' : '–')]];
    tb.innerHTML = '<thead><tr><th></th>' + rows.map((r, i) => '<th style="color:' + css(COLS[i % 3]) + '">' + window.trebEsc(r.name) + '</th>').join('') + '</tr></thead><tbody>' + lines.map(([l, f]) => '<tr><td>' + l + '</td>' + rows.map((r) => '<td class="n">' + (r.res ? f(r) : '–') + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }
  // ---------- tabs ----------
  $$('.pg-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { $$('.pg-tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', 'false')); b.setAttribute('aria-selected', 'true'); $$('.pg-tab').forEach((t) => { t.hidden = t.id !== 'tab-' + b.dataset.tab; }); if (b.dataset.tab === 'sweep' && !$('#sweep-lo').value) sweepDefaults(); drawCharts(); }));

  // ---------- challenges ----------
  const CHAL = [
    { id: 'c1', t: 'Reach 300 m with a 20 kg stone', s: 'Any machine, any materials. The stone must weigh 20 kg.', test: (r) => Math.abs(r.mc.m - 20) < 0.5 && r.R >= 300, start: 'demo_hcw', hint: 'The demonstration machine throws a 60 kg stone 331 m. Lighten the stone, then see what the sling and the prong do.' },
    { id: 'c2', t: 'Beat the Danish machine’s 168 m with its own 2,000 kg', s: 'Start from Hansen’s machine. Keep the counterweight at 2,200 kg or less (it includes a 200 kg box) and the stone at 15 kg. Beat 168 m, the longest shot Hansen measured.', test: (r) => r.mc.M <= 2200 && Math.abs(r.mc.m - 15) < 0.5 && r.R > 168, start: 'hansen', hint: 'The model already gives 180 m for the machine as built with its guessed beam, so the real work is to beat that honestly: a taller frame, a lighter beam or a longer sling.' },
    { id: 'c3', t: 'Put a 100 kg stone on Jerusalem’s wall from 100 m', s: 'Start from the Jerusalem 1187 design with the wall at 100 m. Use a stone of at least 100 kg and land it between 100 and 104 m, which is the wall and its top.', test: (r) => r.mc.m >= 100 && r.R >= 100 && r.R <= 104, start: 'jerusalem1187', hint: 'The design throws 20 kg 580 m. A 100 kg stone needs a shorter sling and a later prong; the Phase 8 run found 108 kg to 98 m with both re-tuned.' },
  ];
  const done = {}; try { Object.assign(done, JSON.parse(localStorage.getItem('treb-chal') || '{}')); } catch (e) { /* none */ }
  function buildChallenges() {
    const box = $('#challenge'); box.innerHTML = '';
    CHAL.forEach((c) => { const d = document.createElement('div'); d.className = 'chal' + (done[c.id] ? ' done' : ''); d.id = 'chal-' + c.id; d.innerHTML = '<h4>' + c.t + '</h4><div>' + c.s + '</div><div class="chal-s">' + (done[c.id] ? 'Done' : 'Not yet') + '</div><div class="row"><button class="btn quiet" type="button" data-start="' + c.start + '" data-c="' + c.id + '">Start here</button><button class="btn quiet" type="button" data-hint="' + c.id + '">Hint</button></div><div class="pg-note" id="hint-' + c.id + '" hidden>' + c.hint + '</div>'; box.append(d); });
    box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.start) { loadPreset(b.dataset.start); if (b.dataset.c === 'c3') { st.scene = { wall: { x: 100, h: 11, t: 2.5, label: 'North-east wall, 100 m' } }; syncEngineer(); } $$('.pg-modeseg button')[0].click(); window.trebToast('Loaded ' + b.textContent.toLowerCase() + ': now change the machine'); } if (b.dataset.hint) { const h = $('#hint-' + b.dataset.hint); h.hidden = !h.hidden; } });
  }
  function checkChallenges(r) { if (r.status !== 'ok') return; CHAL.forEach((c) => { if (!done[c.id] && c.test(r)) { done[c.id] = true; try { localStorage.setItem('treb-chal', JSON.stringify(done)); } catch (e) { /* none */ } const d = $('#chal-' + c.id); if (d) { d.classList.add('done'); $('.chal-s', d).textContent = 'Done'; } window.trebToast('Challenge done: ' + c.t); } }); }

  // ---------- start ----------
  buildSimple(); buildEngineer(); buildChallenges();
  fit2d();
  const hash = (location.hash || '').replace('#', '');
  const chal = CHAL.find((c) => c.id === hash);
  if (chal) { $$('.pg-modeseg button')[2].click(); loadPreset(chal.start); if (chal.id === 'c3') { st.scene = { wall: { x: 100, h: 11, t: 2.5, label: 'North-east wall, 100 m' } }; syncEngineer(); } }
  else if (PR.LIST.find((x) => x.id === hash)) loadPreset(hash);
  else loadPreset('jerusalem1187');
  window.addEventListener('hashchange', () => { const h2 = location.hash.replace('#', ''); if (PR.LIST.find((x) => x.id === h2)) loadPreset(h2); });
})();
