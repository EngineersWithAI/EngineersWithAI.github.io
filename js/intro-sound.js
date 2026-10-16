/* Sound for the opening scene, made on the spot with the Web Audio API: no files, nothing downloaded.
   A bed of wind and a distant battle (a roar of voices, clinks of steel, drums), the trigger's creak, the
   beam's whoosh, the snap of the sling, the fireball's roar that follows the stone, thuds and whumps as
   the other engines' shot lands on the walls, the hiss of arrow volleys, the bowman's bowstring, and the
   crash at the end. Everything is routed through one master gain with a reverb send for distance.

   The scene talks to this file only through window.TrebIntroSound.event(name, data); js/intro.js guards
   every call, so removing the <script> line for this file in index.html (or the file itself) leaves the
   animation exactly as it is, in silence. Browsers only allow audio after a click, so it starts with the
   click on the trebuchet. */
(function () {
  'use strict';
  let ctx = null, master = null, verb = null, verbSend = null, dry = null, listener = { x: 0, y: 0, z: 0 }, started = false, ended = false;
  let wanted = 0.7; // the master level: the page's sound control (window.trebSound, in js/site.js) sets it when present
  let bed = null, roar = null, slowK = 1, slowFilter = null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function noiseBuffer(seconds, brown) {
    const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function impulse(seconds, decay) {
    const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  let white = null, brown = null;
  function src(buf, loop) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; }
  function env(g, t0, a, peak, hold, rel, floor) { const p = g.gain; p.cancelScheduledValues(t0); p.setValueAtTime(floor || 0.0001, t0); p.linearRampToValueAtTime(peak, t0 + a); p.setValueAtTime(peak, t0 + a + hold); p.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); }
  // a sound at a place: quieter, duller, more reverberant and later with distance
  function spatial(dist, base) { const d = Math.max(1, dist || 1); const vol = base * clamp(60 / d, 0.05, 1); const wet = clamp(d / 120, 0.1, 0.9); const delay = d / 340; const cutoff = clamp(9000 * 50 / d, 600, 9000); return { vol, wet, delay, cutoff }; }
  function out(node, wet, cutoff) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff || 12000; node.connect(lp); const wg = ctx.createGain(); wg.gain.value = wet == null ? 0.3 : wet; const dg = ctx.createGain(); dg.gain.value = 1 - (wet == null ? 0.3 : wet) * 0.6; lp.connect(wg); lp.connect(dg); wg.connect(verbSend); dg.connect(dry); return lp; }
  const dist = (p) => p ? Math.hypot(p.x - listener.x, p.y - listener.y, p.z - listener.z) : 30;

  // ---------------------------------------------------------------- the bed: wind, a distant battle, drums
  function startBed() {
    const t0 = ctx.currentTime; bed = { nodes: [] };
    const wind = src(brown, true); const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 320; const wg = ctx.createGain(); wg.gain.value = 0; wind.connect(wf); wf.connect(wg); out(wg, 0.2, 2000); wind.start(); wg.gain.linearRampToValueAtTime(0.5, t0 + 3); bed.nodes.push(wind);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(wf.frequency); lfo.start(); bed.nodes.push(lfo);
    // the roar of a battle a few hundred meters off: many short bursts of band-passed noise, voices and steel
    const crowd = ctx.createGain(); crowd.gain.value = 0; out(crowd, 0.75, 2600); crowd.gain.linearRampToValueAtTime(1, t0 + 4); bed.crowd = crowd;
    const voices = []; for (let i = 0; i < 6; i++) { const s = src(white, true); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 280 + i * 140; f.Q.value = 3.5; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(crowd); s.start(); voices.push(g); bed.nodes.push(s); }
    bed.timer = setInterval(() => { if (ended) return; const g = voices[Math.floor(rand(0, voices.length))]; const t = ctx.currentTime; env(g, t, rand(0.05, 0.2), rand(0.03, 0.09), rand(0.05, 0.4), rand(0.2, 0.6));
      if (Math.random() < 0.35) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = rand(1800, 4200); const g2 = ctx.createGain(); g2.gain.value = 0; o.connect(g2); g2.connect(crowd); o.start(t); env(g2, t, 0.004, rand(0.01, 0.03), 0.01, rand(0.08, 0.25)); o.stop(t + 0.5); }
      if (Math.random() < 0.12) thud({ x: listener.x + rand(120, 220), y: 0, z: listener.z + rand(-120, 120) }, 0.5); }, 140);
    bed.drums = setInterval(() => { if (ended) return; const t = ctx.currentTime; for (let k = 0; k < 2; k++) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(85, t + k * 0.42); o.frequency.exponentialRampToValueAtTime(48, t + k * 0.42 + 0.25); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); out(g, 0.8, 900); o.start(t + k * 0.42); env(g, t + k * 0.42, 0.005, 0.12, 0.02, 0.35); o.stop(t + k * 0.42 + 0.6); } }, 2600);
  }

  // ---------------------------------------------------------------- one-shot sounds
  function thud(p, base) { const s = spatial(dist(p), base || 1); const t = ctx.currentTime + s.delay;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.35); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); out(g, s.wet, s.cutoff); o.start(t); env(g, t, 0.004, 0.9 * s.vol, 0.03, 0.5); o.stop(t + 0.8);
    const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(s.cutoff, 1800); const ng = ctx.createGain(); ng.gain.value = 0; n.connect(f); f.connect(ng); out(ng, s.wet, s.cutoff); n.start(t); env(ng, t, 0.003, 0.5 * s.vol, 0.02, 0.3); n.stop(t + 0.6); }
  function whump(p, base) { const s = spatial(dist(p), base || 0.8); const t = ctx.currentTime + s.delay; // fire landing: a soft low burst and a brief crackle
    const n = src(brown); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(s.cutoff, 700); const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); out(g, s.wet, s.cutoff); n.start(t); env(g, t, 0.02, 1.2 * s.vol, 0.08, 0.7); n.stop(t + 1); }
  function whoosh(p, base, dur, f0, f1) { const s = spatial(dist(p), base || 1); const t = ctx.currentTime + s.delay; const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(f0 || 180, t); f.frequency.exponentialRampToValueAtTime(f1 || 1400, t + dur * 0.8); const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); out(g, s.wet, s.cutoff); n.start(t); env(g, t, dur * 0.55, 0.9 * s.vol, dur * 0.1, dur * 0.45); n.stop(t + dur + 0.2); }
  function creak(p) { const s = spatial(dist(p), 0.5); const t = ctx.currentTime + s.delay; for (let k = 0; k < 2; k++) { const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.value = 900 + k * 500; o.frequency.setValueAtTime(110 + k * 40, t); o.frequency.linearRampToValueAtTime(70 + k * 30, t + 0.7); const v = ctx.createOscillator(); v.frequency.value = 9 + k * 3; const vg = ctx.createGain(); vg.gain.value = 8; v.connect(vg); vg.connect(o.frequency); v.start(t); const g = ctx.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); out(g, s.wet, s.cutoff); o.start(t); env(g, t + k * 0.15, 0.08, 0.35 * s.vol, 0.25, 0.4); o.stop(t + 1.2); v.stop(t + 1.2); } }
  function snap(p) { const s = spatial(dist(p), 0.9); const t = ctx.currentTime + s.delay; const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); out(g, s.wet, s.cutoff); n.start(t); env(g, t, 0.002, 0.7 * s.vol, 0.01, 0.12); n.stop(t + 0.3); }
  function twang() { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.25); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); out(g, 0.15, 6000); o.start(t); env(g, t, 0.003, 0.5, 0.02, 0.3); o.stop(t + 0.5);
    const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(3200, t + 0.02); f.frequency.exponentialRampToValueAtTime(1400, t + 0.5); const ng = ctx.createGain(); ng.gain.value = 0; n.connect(f); f.connect(ng); out(ng, 0.3, 8000); n.start(t); env(ng, t + 0.02, 0.02, 0.18, 0.05, 0.45); n.stop(t + 0.7); }
  function volley(p) { const s = spatial(dist(p), 0.35); const t = ctx.currentTime + s.delay; const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(1200, t + 1.2); const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); out(g, s.wet, s.cutoff); n.start(t); env(g, t, 0.3, 0.6 * s.vol, 0.3, 0.7); n.stop(t + 1.6); }
  function crash() { const t = ctx.currentTime; // the stone takes the tower top and the camera with it
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.2); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); out(g, 0.5, 4000); o.start(t); env(g, t, 0.003, 1.4, 0.1, 2.2); o.stop(t + 3);
    const n = src(white); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(300, t + 1.5); const ng = ctx.createGain(); ng.gain.value = 0; n.connect(f); f.connect(ng); out(ng, 0.6, 9000); n.start(t); env(ng, t, 0.004, 1.1, 0.15, 1.8); n.stop(t + 3);
    const r = src(brown); const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 160; const rg = ctx.createGain(); rg.gain.value = 0; r.connect(rf); rf.connect(rg); out(rg, 0.7, 2000); r.start(t); env(rg, t + 0.1, 0.2, 0.8, 0.6, 3.5); r.stop(t + 5);
    if (bed && bed.crowd) bed.crowd.gain.linearRampToValueAtTime(0, t + 0.4); }

  // ---------------------------------------------------------------- the fireball's roar, following the stone
  function startRoar() { if (roar) return; const n = src(brown, true); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.value = 260; const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); const lp = out(g, 0.35, 5000); n.start();
    const fl = ctx.createOscillator(); fl.frequency.value = 11; const flg = ctx.createGain(); flg.gain.value = 0.25; fl.connect(flg); flg.connect(g.gain); fl.start();
    const c = src(white, true); const cf = ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 3000; const cg = ctx.createGain(); cg.gain.value = 0; c.connect(cf); cf.connect(cg); cg.connect(g); c.start();
    roar = { n, g, f, lp, fl, c, cg, crackle: setInterval(() => { if (!roar) return; const t = ctx.currentTime; env(cg, t, 0.002, rand(0.1, 0.3), 0.005, 0.03); }, 60) }; }
  function roarAt(d) { if (!roar) return; const t = ctx.currentTime; const k = clamp(40 / Math.max(4, d), 0, 1.3); roar.g.gain.setTargetAtTime(0.9 * k, t, 0.08); roar.lp.frequency.setTargetAtTime(clamp(9000 * 30 / Math.max(6, d), 500, 9000) * slowK, t, 0.1); roar.f.frequency.setTargetAtTime(220 + 140 * k, t, 0.1); }
  function stopRoar() { if (!roar) return; const t = ctx.currentTime; roar.g.gain.setTargetAtTime(0, t, 0.15); clearInterval(roar.crackle); const r = roar; roar = null; setTimeout(() => { try { r.n.stop(); r.fl.stop(); r.c.stop(); } catch (e) {} }, 1500); }

  // ---------------------------------------------------------------- control
  function start() { if (started) return; started = true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    slowFilter = ctx.createBiquadFilter(); slowFilter.type = 'lowpass'; slowFilter.frequency.value = 20000; slowFilter.connect(master);
    dry = ctx.createGain(); dry.gain.value = 1; dry.connect(slowFilter);
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.2); verbSend = ctx.createGain(); verbSend.gain.value = 0.8; verbSend.connect(verb); const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(slowFilter);
    white = noiseBuffer(2.5, false); brown = noiseBuffer(3, true);
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, wanted), ctx.currentTime + 1.2);
    startBed(); }
  function level(v) { wanted = v; if (ctx && !ended) master.gain.setTargetAtTime(Math.max(0.0001, wanted), ctx.currentTime, 0.3); }
  function slow(on) { if (!ctx) return; slowK = on ? 0.35 : 1; const t = ctx.currentTime; slowFilter.frequency.setTargetAtTime(on ? 900 : 20000, t, 0.25); if (bed && bed.crowd) bed.crowd.gain.setTargetAtTime(on ? 0.45 : 1, t, 0.3); }
  function stop() { if (!ctx || ended) return; ended = true; const t = ctx.currentTime; master.gain.setTargetAtTime(0.0001, t, 0.6); if (bed) { clearInterval(bed.timer); clearInterval(bed.drums); } stopRoar(); setTimeout(() => { try { ctx.close(); } catch (e) {} }, 4000); }

  // follow the page's sound control: its button turns the scene's sound on and off, its slider sets the level; a click on it
  // is also the gesture browsers want before any audio, so the battle can start from there
  if (window.trebSound) { let first = true; window.trebSound.onChange((v) => { const w = v.on ? 0.9 * v.vol : 0; if (first) { first = false; wanted = w; return; } level(w); if (v.on && !started) { start(); if (ctx && ctx.state === 'suspended') ctx.resume(); } }); }
  window.TrebIntroSound = {
    state() { return { started, ended, wanted, master: master ? master.gain.value : null, ctx: ctx ? ctx.state : null }; },
    event(name, d) { d = d || {};
      if (name === 'start') { start(); if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
      if (!ctx || ended) return;
      if (name === 'listener') { listener = { x: d.x, y: d.y, z: d.z }; return; }
      if (name === 'creak') creak(d.p);
      else if (name === 'swing') whoosh(d.p, d.far ? 0.55 : 1.1, 1.4, 120, 900);
      else if (name === 'release') { snap(d.p); if (!d.far) startRoar(); else whoosh(d.p, 0.4, 0.8, 500, 2500); }
      else if (name === 'ball') roarAt(d.dist);
      else if (name === 'thud') thud(d.p, 1.0);
      else if (name === 'whump') whump(d.p, 0.8);
      else if (name === 'volley') volley(d.p);
      else if (name === 'twang') twang();
      else if (name === 'slow') slow(!!d.on);
      else if (name === 'impact') { stopRoar(); slow(false); crash(); }
      else if (name === 'stop') stop(); }
  };
})();
