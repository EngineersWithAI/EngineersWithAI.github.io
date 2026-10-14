/* Shared behaviour: theme, menu, the sources panel, the rail. No dependencies. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ---------- theme ----------
  const root = document.documentElement;
  const saved = store.get('treb-theme');
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  function toggleTheme() {
    const dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next); store.set('treb-theme', next);
    window.dispatchEvent(new CustomEvent('treb-theme'));
  }
  window.trebTheme = () => (root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches)) ? 'dark' : 'light';
  window.trebCss = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  // ---------- show the sources ----------
  if (store.get('treb-sources') === '1') document.body.classList.add('show-sources');

  document.addEventListener('DOMContentLoaded', () => {
    const tb = $('#themebtn'); if (tb) tb.addEventListener('click', toggleTheme);
    const mb = $('#menubtn'); const nav = $('#topnav');
    if (mb && nav) mb.addEventListener('click', () => { nav.classList.toggle('open'); mb.setAttribute('aria-expanded', nav.classList.contains('open')); });
    $$('.srctoggle input').forEach((cb) => {
      cb.checked = document.body.classList.contains('show-sources');
      cb.addEventListener('change', () => { document.body.classList.toggle('show-sources', cb.checked); store.set('treb-sources', cb.checked ? '1' : '0'); });
    });
    buildPanel();
    document.body.addEventListener('click', onMarkClick);
    document.body.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.src, .mark')) { e.preventDefault(); onMarkClick(e); } });
    $$('.src, .mark').forEach((el) => { if (!el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); } if (!el.title) el.title = el.classList.contains('mark') ? 'Source' : 'How we know'; });
    rail();
  });

  // ---------- panel ----------
  let panel, back, body, tabs, title, lastFocus;
  function buildPanel() {
    back = document.createElement('div'); back.className = 'panel-back'; back.addEventListener('click', closePanel);
    panel = document.createElement('aside'); panel.className = 'panel'; panel.setAttribute('aria-label', 'Sources and working'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = '<div class="panel-h"><h3 id="panel-title">How we know</h3><button class="iconbtn" id="panel-close" aria-label="Close">' + X_SVG + '</button></div><div class="panel-tabs" id="panel-tabs" hidden></div><div class="panel-b" id="panel-body"></div>';
    document.body.append(back, panel);
    body = $('#panel-body'); tabs = $('#panel-tabs'); title = $('#panel-title');
    $('#panel-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });
  }
  function closePanel() { panel.classList.remove('open'); back.classList.remove('open'); if (lastFocus) lastFocus.focus(); }
  const X_SVG = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function onMarkClick(e) {
    const el = e.target.closest('.src, .mark');
    if (!el) return;
    e.preventDefault();
    lastFocus = el;
    const facts = (el.dataset.f || '').split(/\s+/).filter(Boolean);
    const srcs = (el.dataset.s || '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [key, pin] = x.split('|'); return { key, pin: pin || '' }; });
    const working = el.dataset.w || '';
    const runs = (el.dataset.r || '').split(/\s+/).filter(Boolean);
    const label = el.dataset.label || el.textContent.trim().slice(0, 80);
    openPanel({ facts, srcs, working, runs, label, note: el.dataset.note || '' });
  }

  function sourceOf(key) { return (window.TREB_FACTS && window.TREB_FACTS.sources && window.TREB_FACTS.sources[key]) || (window.TREB_STORY_SOURCES && window.TREB_STORY_SOURCES[key]) || (window.TREB_SOURCES && window.TREB_SOURCES[key]) || null; }
  function factOf(id) { return (window.TREB_FACTS && window.TREB_FACTS.facts && window.TREB_FACTS.facts[id]) || (window.TREB_STORY_FACTS && window.TREB_STORY_FACTS[id]) || null; }
  function runOf(id) { return (window.TREB_RUNS_INDEX && window.TREB_RUNS_INDEX[id]) || null; }

  function cite(s, pin) {
    if (!s) return '<span class="who">' + esc(pin || '') + '</span>';
    const who = s.author || s.editor || '';
    let t = '<span class="who">';
    if (who) t += esc(who) + (s.year ? ' (' + esc(s.year) + '). ' : '. ');
    t += s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' : '<i>' + esc(s.title) + '</i>';
    const bits = [];
    if (s.container) bits.push(s.container + (s.volume ? ' ' + s.volume : '') + (s.issue ? '(' + s.issue + ')' : ''));
    if (s.pages) bits.push('pp. ' + s.pages);
    if (!s.container && s.publisher) bits.push(s.publisher);
    if (bits.length) t += ', ' + esc(bits.join(', '));
    if (pin) t += ', ' + esc(pin);
    t += '. <span class="grade ' + esc(s.grade) + '" title="' + esc(gradeName(s.grade)) + '">' + esc(s.grade) + '</span>';
    if (s.doi) t += ' <a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener" class="small">doi</a>';
    t += '</span>';
    return t;
  }
  function gradeName(g) { return { A: 'Grade A: peer-reviewed work, a scholarly edition of a primary text, or an official record', B: 'Grade B: expert or institutional source without peer review', C: 'Grade C: press, popular or documentary source', D: 'Grade D: tool credit or weak source' }[g] || ''; }
  function gradeLine(g) { return { A: 'Grade A: peer-reviewed, a scholarly edition or an official record.', B: 'Grade B: an expert or institutional source without peer review.', C: 'Grade C: a press, popular or documentary source.', D: 'Grade D: tool credit.' }[g] || ''; }

  function factHtml(f) {
    let h = '<div class="fact"><div class="claim">' + esc(f.claim) + '</div>';
    if (f.value) h += '<div class="val">Value: ' + esc(f.value) + (f.unit ? ' ' + esc(f.unit) : '') + '</div>';
    if (f.quote) h += '<blockquote>' + esc(f.quote) + '</blockquote>';
    const keys = f.sources || [];
    keys.forEach((k, i) => { h += '<div>' + cite(sourceOf(k), i === 0 ? f.pin : '') + '</div>'; });
    if (f.conf) h += '<div class="conf"><b>Confidence ' + esc(f.conf) + '.</b> ' + esc(f.conf_note || '') + '</div>';
    h += '<div class="conf">' + esc(f.id) + ' in the sources register</div></div>';
    return h;
  }
  function srcHtml(x) {
    const s = sourceOf(x.key);
    let h = '<div class="fact"><div>' + cite(s, x.pin) + '</div>';
    if (s && s.grade_note) h += '<div class="conf">' + esc(gradeLine(s.grade)) + ' ' + esc(s.grade_note) + '</div>';
    if (s && s.kind) h += '<div class="conf">' + esc(s.kind) + '</div>';
    h += '</div>';
    return h;
  }
  function workingHtml(w) {
    let h = '<div class="working">';
    if (w.title) h += '<div class="claim">' + w.title + '</div>';
    (w.lines || []).forEach((l) => { h += '<div class="eq">' + l + '</div>'; });
    if (w.inputs && w.inputs.length) { h += '<dl>'; w.inputs.forEach((r) => { h += '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }); h += '</dl>'; }
    if (w.note) h += '<div class="note">' + w.note + '</div>';
    if (w.check) h += '<div class="note"><b>Check by hand:</b> ' + w.check + '</div>';
    if (w.deeper) h += '<div class="note"><a href="' + esc(w.deeper) + '">One step deeper</a>' + (w.deeperLabel ? ': ' + w.deeperLabel : '') + '</div>';
    h += '</div>';
    return h;
  }
  function runHtml(id) {
    const r = runOf(id);
    let h = '<div class="fact"><div class="claim">Model run ' + esc(id) + (r && r.title ? ': ' + esc(r.title) : '') + '</div>';
    if (r && r.what) h += '<div class="note">' + r.what + '</div>';
    if (r && r.assume) h += '<div class="conf"><b>Main assumptions.</b> ' + r.assume + '</div>';
    h += '<div class="conf">Record: 05_results/data/' + esc(id) + '_*.json in the project files, made with the Python model in 04_model/.</div></div>';
    return h;
  }
  const MODEL_NOTE = 'Numbers from our model are model values. Checked against measured throws, the model runs about 10 to 15% long, because it treats the beam, the frame and the sling as rigid. Comparisons between machines on equal terms are not affected.';

  function openPanel(o) {
    title.textContent = o.label ? o.label : 'How we know';
    const panes = [];
    const wpane = (o.working && window.TREB_WORKING && window.TREB_WORKING[o.working]) ? { name: 'How we worked it out', html: workingHtml(window.TREB_WORKING[o.working]) } : null;
    if (wpane && !o.facts.length && !o.srcs.length) panes.push(wpane);
    let know = '';
    o.facts.forEach((id) => { const f = factOf(id); know += f ? factHtml(f) : '<div class="fact conf">' + esc(id) + ' (not loaded on this page)</div>'; });
    o.srcs.forEach((x) => { know += srcHtml(x); });
    o.runs.forEach((id) => { know += runHtml(id); });
    if (o.note) know += '<div class="fact note">' + o.note + '</div>';
    if (o.runs.length || o.working) know += '<div class="modelnote">' + MODEL_NOTE + '</div>';
    if (know) panes.push({ name: o.facts.length || o.srcs.length ? 'How we know' : 'Where it comes from', html: know });
    if (wpane && (o.facts.length || o.srcs.length)) panes.push(wpane);
    if (!panes.length) panes.push({ name: 'How we know', html: '<div class="conf">No source attached to this mark.</div>' });
    tabs.innerHTML = ''; tabs.hidden = panes.length < 2;
    panes.forEach((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = p.name; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', () => { $$('button', tabs).forEach((x) => x.setAttribute('aria-selected', 'false')); b.setAttribute('aria-selected', 'true'); body.innerHTML = p.html; body.scrollTop = 0; });
      tabs.append(b);
    });
    body.innerHTML = panes[0].html; body.scrollTop = 0;
    panel.classList.add('open'); back.classList.add('open');
    setTimeout(() => $('#panel-close').focus(), 50);
  }
  window.trebOpenPanel = openPanel;

  // ---------- rail: highlight the stop in view ----------
  function rail() {
    const links = $$('.rail a'); if (!links.length) return;
    const stops = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    const obs = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id)); } });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    stops.forEach((s) => obs.observe(s));
  }

  // ---------- helpers for the interactives ----------
  window.trebFmt = function (v, d) { if (!Number.isFinite(v)) return '–'; return v.toLocaleString('en-GB', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); };
  window.trebToast = function (msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); };
  window.trebEsc = esc;

  // ---------- background music: muted until asked, loops, keeps its place between pages ----------
  (function music() {
    const TRACK = { src: 'audio/teller-of-the-tales.mp3', title: 'Teller of the Tales', by: 'Kevin MacLeod', url: 'https://incompetech.com', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' };
    const KEY = 'treb-music';
    let st = { on: true, vol: 0.45, t: 0 }; // sound on unless the visitor has turned it off
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const box = document.createElement('div'); box.className = 'music'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Background music');
    const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg>';
    const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="w" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
    box.innerHTML = '<button type="button" class="music-btn" aria-pressed="false" aria-label="Play music" title="Play music">' + ICON_OFF + '</button>' +
      '<div class="music-panel" hidden><label>Volume <input type="range" min="0" max="100" step="1" value="' + Math.round(st.vol * 100) + '" aria-label="Music volume"></label>' +
      '<span class="music-credit">' + esc(TRACK.title) + ' · <a href="' + TRACK.url + '" target="_blank" rel="noopener">' + esc(TRACK.by) + '</a>, <a href="' + TRACK.licenceUrl + '" target="_blank" rel="noopener">' + TRACK.licence + '</a></span></div>';
    document.body.append(box);
    const btn = $('.music-btn', box), panel = $('.music-panel', box), range = $('input', panel);
    let audio = null, hideT = null, fadeT = null;
    // One control for all sound. While the opening scene plays, the music stays quiet and the scene's own sound follows
    // this button and slider instead; when the scene gives way to the page the music fades in. window.trebSound is the link.
    let suspended = !!document.getElementById('intro') && !/[?&#]nointro\b/.test(location.search + location.hash);
    const listeners = []; const notify = () => listeners.forEach((f) => { try { f({ on: st.on, vol: st.vol }); } catch (e) {} });
    function fadeIn(sec) { const a = ensure(); clearInterval(fadeT); a.volume = 0; const t0 = performance.now(); if (st.t > 0 && st.t < (a.duration || 1e9)) { try { a.currentTime = st.t; } catch (e) {} }
      a.play().then(() => { show(true); fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (sec * 1000)); a.volume = st.vol * k * k; if (k >= 1) clearInterval(fadeT); }, 50); }).catch(() => {}); }
    window.trebSound = { get on() { return st.on; }, get vol() { return st.vol; }, onChange(f) { listeners.push(f); f({ on: st.on, vol: st.vol }); },
      suspendMusic() { suspended = true; if (audio && !audio.paused) { st.t = audio.currentTime; audio.pause(); } },
      resumeMusic(fadeSec) { if (!suspended) return; suspended = false; if (st.on) fadeIn(fadeSec || 3); } };
    function ensure() {
      if (audio) return audio;
      audio = new Audio(TRACK.src); audio.loop = true; audio.preload = 'auto'; audio.volume = st.vol;
      audio.addEventListener('timeupdate', () => { if (!audio.paused) { st.t = audio.currentTime; if ((st.t | 0) % 5 === 0) save(); } });
      return audio;
    }
    function show(on) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.innerHTML = on ? ICON_ON : ICON_OFF; btn.title = btn.ariaLabel = on ? 'Mute sound' : 'Sound on'; box.classList.toggle('on', on); }
    function openPanel() { panel.hidden = false; clearTimeout(hideT); hideT = setTimeout(() => { if (!panel.matches(':hover') && document.activeElement !== range) panel.hidden = true; }, 4000); }
    async function start(fromUser) {
      if (suspended) { st.on = true; save(); show(true); if (fromUser) openPanel(); notify(); return; } // the scene's sound answers; the music waits for the page
      const a = ensure(); a.volume = st.vol;
      if (st.t > 0 && st.t < (a.duration || 1e9)) { try { a.currentTime = st.t; } catch (e) {} }
      try { await a.play(); st.on = true; save(); show(true); if (fromUser) openPanel(); notify(); }
      catch (e) { st.on = false; save(); show(false); notify(); }
    }
    function stop() { clearInterval(fadeT); if (audio) { audio.pause(); st.t = audio.currentTime; } st.on = false; save(); show(false); panel.hidden = true; notify(); }
    btn.addEventListener('click', () => (st.on && (suspended || (audio && !audio.paused))) ? stop() : start(true));
    range.addEventListener('input', () => { st.vol = +range.value / 100; if (audio && !fadeT) audio.volume = st.vol; save(); clearTimeout(hideT); notify(); });
    range.addEventListener('change', () => openPanel());
    panel.addEventListener('mouseleave', () => openPanel());
    btn.addEventListener('mouseenter', () => { if (st.on) openPanel(); });
    window.addEventListener('pagehide', () => { if (audio && !audio.paused) { st.t = audio.currentTime; save(); } });
    show(false);
    // Carrying on from the previous page: browsers allow this once the visitor has played it here before.
    if (st.on) { show(true); if (!suspended) { ensure().addEventListener('loadedmetadata', () => { if (st.t > 0) { try { audio.currentTime = st.t; } catch (e) {} } }); start(false); } }
  })();
})();
