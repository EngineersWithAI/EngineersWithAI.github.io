/* Web worker: runs throws off the main thread. Falls back to the main thread when workers are unavailable. */
importScripts('../lib/treb_eom.js', '../lib/sim_core.js', 'pg-sim.js');
self.onmessage = function (e) {
  const m = e.data;
  try {
    if (m.cmd === 'throw') {
      const r = TrebPG.run(m.mc, m.opts);
      self.postMessage({ id: m.id, ok: true, result: r });
    } else if (m.cmd === 'sweepList') {
      const out = [];
      m.machines.forEach((mc, i) => {
        const r = TrebPG.run(mc, { history: false });
        out.push({ R: r.R, R_star: r.R_star, eta: r.eta, E_impact: r.E_impact, v_r: r.v_r, alpha_r_deg: r.alpha_r_deg, status: r.status, loads: r.loads, notes: r.notes });
        self.postMessage({ id: m.id, progress: (i + 1) / m.machines.length });
      });
      self.postMessage({ id: m.id, ok: true, result: out });
    }
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
  }
};
