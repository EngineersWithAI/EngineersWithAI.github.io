/* Runs one throw on the cross-checked physics core (lib/sim_core.js) and returns plain data that can
   cross a worker boundary: result scalars, frames for animation, the flight path and the histories. */
(function (root) {
  'use strict';
  function build(S) {
    const r3 = (v) => Math.round(v * 1000) / 1000, r2 = (v) => Math.round(v * 100) / 100;
    const num = (v) => (Number.isFinite(v) ? v : null);
    function run(mcIn, opts) {
      opts = opts || {};
      const mc = S.machine(mcIn);
      const t0 = Date.now();
      const res = S.simulate(mc, { history: true });
      const out = {
        status: res.status, notes: res.notes, starts: res.starts, arch: mc.arch, name: mc.name,
        R: num(res.R), R_star: num(res.R_star), eta: num(res.eta), eta_H: num(res.eta_H), eta_R: num(res.eta_R), v_r: num(res.v_r), alpha_r_deg: num(res.alpha_r_deg),
        h_r: num(res.h_r), x_r: num(res.x_r), t_liftoff: num(res.t_liftoff), t_release: num(res.t_release), t_flight: num(res.t_flight), apex: num(res.apex),
        v_impact: num(res.v_impact), E_impact: num(res.E_impact), angle_impact_deg: num(res.angle_impact_deg), KE_r: num(res.KE_r), PE_r: num(res.PE_r),
        E_available: num(res.E_available), energy_error: num(res.energy_error), R_vac: num(res.R_vac), losses: res.losses || {}, loads: res.loads || {}, window_end: res.window_end,
        delta_r_deg: num(res.delta_r_deg), theta_r_deg: num(res.theta_r_deg), wall_ms: Date.now() - t0,
        derived: S.derived(mc), mc,
      };
      // frames for animation: 60 per second through the machine phases
      const segs = res.segments || [];
      const frames = [];
      if (segs.length) {
        const tA = segs[0].ta, tB = segs[segs.length - 1].tb;
        const n = Math.min(600, Math.max(60, Math.round((tB - tA) * 60)));
        for (let i = 0; i <= n; i++) {
          const t = tA + (tB - tA) * i / n;
          const fr = S.frameAt(res, t);
          const p = fr.pts;
          frames.push({ t: r3(t), phase: fr.phase, th: r3(fr.q[fr.dyn.i_th]), ps: fr.dyn.i_ps !== null ? r3(fr.q[fr.dyn.i_ps]) : 0, ph: fr.dyn.i_ph !== null ? r3(fr.q[fr.dyn.i_ph]) : 0,
            x: fr.dyn.i_x !== null ? r3(fr.q[fr.dyn.i_x]) : 0, P: p.P.map(r3), S: p.S.map(r3), K: p.K.map(r3), C: p.C.map(r3), B: p.B ? p.B.map(r3) : null,
            p: (fr.dyn.projectileOn && p.p) ? p.p.map(r3) : null });
        }
      } else if (res.window) {
        const w = res.window, n = 120;
        for (let i = 0; i <= n; i++) { const t = w.ta + (w.tb - w.ta) * i / n; const fr = S.frameAt(res, t); const p = fr.pts; frames.push({ t: r3(t), phase: 2, th: r3(fr.q[fr.dyn.i_th]), ps: fr.dyn.i_ps !== null ? r3(fr.q[fr.dyn.i_ps]) : 0, ph: 0, x: fr.dyn.i_x !== null ? r3(fr.q[fr.dyn.i_x]) : 0, P: p.P.map(r3), S: p.S.map(r3), K: p.K.map(r3), C: p.C.map(r3), B: null, p: p.p ? p.p.map(r3) : null }); }
      }
      out.frames = frames;
      out.flight = res.flight_path ? res.flight_path.map((q) => [r3(q[0]), r2(q[1]), r2(q[2])]) : null; // [t, x, y]
      // histories, thinned to about 300 rows
      const H = res.history;
      if (H && H.t && H.t.length) {
        const keep = ['t', 'phase', 'KE_cw', 'PE_cw', 'KE_beam', 'PE_beam', 'KE_p', 'PE_p', 'KE_frame', 'F_Rx', 'F_Ry', 'F_Hx', 'F_Hy', 'T_s', 'F_perp', 'lam', 'x_p', 'y_p', 'E_mech'];
        const step = Math.max(1, Math.floor(H.t.length / 300));
        const h = {};
        keep.forEach((k) => { if (H[k]) h[k] = H[k].filter((_, i) => i % step === 0).map((v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)); });
        let W = null; S.LOSS_KEYS.forEach((k) => { if (H['W_' + k]) { const a = H['W_' + k].filter((_, i) => i % step === 0); W = W ? W.map((v, i) => v + a[i]) : a.slice(); } });
        if (W) h.W = W.map((v) => Math.round(v));
        out.history = h;
      }
      return out;
    }
    return { run };
  }
  if (typeof module === 'object' && module.exports) module.exports = build;
  else root.TrebPG = build(root.TrebSim);
})(typeof self !== 'undefined' ? self : this);
