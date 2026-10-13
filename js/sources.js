(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = window.trebEsc; const SRC = window.TREB_SOURCES;
  const list = Object.values(SRC).sort((a, b) => (a.author || a.editor || a.title).localeCompare(b.author || b.editor || b.title) || String(a.year).localeCompare(String(b.year)));
  const counts = { A: 0, B: 0, C: 0, D: 0 }, stat = {}; list.forEach((s) => { counts[s.grade] = (counts[s.grade] || 0) + 1; stat[s.status] = (stat[s.status] || 0) + 1; });
  $('#counts').innerHTML = '<div><b>' + list.length + '</b>works</div><div><b>' + counts.A + '</b>grade A</div><div><b>' + counts.B + '</b>grade B</div><div><b>' + counts.C + '</b>grade C</div><div><b>' + counts.D + '</b>grade D</div><div><b>' + (stat['Used'] || 0) + '</b>cited in the paper</div><div><b>' + (stat['Background'] || 0) + '</b>background</div><div><b>' + (stat['To fetch'] || 0) + '</b>still to fetch</div><div><b>1,735</b>facts recorded</div>';
  const reg = $('#reg');
  list.forEach((s) => {
    const d = document.createElement('div'); d.className = 'ent'; d.dataset.g = s.grade; d.dataset.s = s.status; d.dataset.q = (s.author + ' ' + s.editor + ' ' + s.title + ' ' + s.container + ' ' + s.year + ' ' + s.topics + ' ' + s.key).toLowerCase();
    const who = s.author || s.editor || '';
    const bits = []; if (s.container) bits.push(s.container + (s.volume ? ' ' + s.volume : '') + (s.issue ? '(' + s.issue + ')' : '') + (s.pages ? ', ' + s.pages : '')); if (!s.container && s.publisher) bits.push(s.publisher + (s.place ? ', ' + s.place : ''));
    const title = s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' : esc(s.title);
    const use = s.used_for ? '<details class="use"><summary>What was taken from it</summary>' + esc(s.used_for) + '</details>' : '';
    d.innerHTML = '<div class="g"><span class="grade ' + esc(s.grade) + '" title="' + esc(s.grade_note) + '">' + esc(s.grade) + '</span></div><div><div class="ttl">' + title + '<span class="st">' + esc(s.status) + '</span></div><div class="who">' + esc(who) + (s.year ? ' (' + esc(s.year) + ')' : '') + (bits.length ? '. ' + esc(bits.join('. ')) : '') + (s.kind ? '. ' + esc(s.kind) : '') + (s.doi ? '. <a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">doi</a>' : '') + '</div>' + (s.grade_note ? '<div class="who muted">' + esc(s.grade_note) + '</div>' : '') + '</div>' + use;
    reg.append(d);
  });
  let g = '', st = '', q = '';
  function filter() { let n = 0; $$('.ent', reg).forEach((e) => { const ok = (!g || e.dataset.g === g) && (!st || e.dataset.s === st) && (!q || e.dataset.q.includes(q)); e.classList.toggle('hide', !ok); if (ok) n++; }); $('#reg-count').textContent = n + ' of ' + list.length; }
  $$('#grade-seg button').forEach((b) => b.addEventListener('click', () => { $$('#grade-seg button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); g = b.dataset.g; filter(); }));
  $$('#status-seg button').forEach((b) => b.addEventListener('click', () => { $$('#status-seg button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); st = b.dataset.s; filter(); }));
  $('#q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); filter(); });
  filter();
  const imgs = $('#imgs');
  (window.TREB_IMAGES || []).forEach((im) => { const d = document.createElement('div'); d.className = 'imgc'; d.innerHTML = '<img src="img/' + esc(im.file) + '" alt="" loading="lazy"><b>' + esc(im.description) + '</b><span>' + esc(im.author) + ' · <a href="' + esc(im.license_url || im.page_url) + '" target="_blank" rel="noopener">' + esc(im.license) + '</a> · <a href="' + esc(im.page_url) + '" target="_blank" rel="noopener">Commons</a></span>'; imgs.append(d); });
})();
