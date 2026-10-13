/* The story deck. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = window.trebEsc;
  const deck = $('#deck');
  const STOPS = { 1: 'Stop 1, The son cometh', 2: 'Stop 2, Before the trebuchet', 3: 'Stop 3, From China to Jerusalem', 5: 'Stop 5, Meet the machines', 7: 'Stop 7, The best trebuchet', 8: 'Stop 8, Right proportions, wrong frame', 9: 'Stop 9, Jerusalem, 1187', 10: 'Stop 10, After the trebuchet' };
  window.TREB_STORIES.forEach((c) => {
    const art = document.createElement('article'); art.className = 'story' + (c.top10 ? ' top' : ''); art.id = c.id; art.dataset.cat = c.category;
    const srcs = c.sources.map((s) => { const S = window.TREB_STORY_SOURCES[s.key]; const who = S ? (S.author || S.editor || S.title) : s.key; const yr = S && S.year ? ' ' + S.year : ''; return '<span class="src" data-s="' + esc(s.key) + '|" data-label="' + esc(who) + '">' + esc(who.split(',')[0]) + yr + '</span><span class="grade ' + esc(s.grade) + '">' + esc(s.grade) + '</span>'; }).join('');
    let quote = '';
    if (c.quote && c.quote.text) { const S = c.quote.key ? window.TREB_STORY_SOURCES[c.quote.key] : null; quote = '<blockquote>“' + esc(c.quote.text) + '”<cite>' + (S ? esc((S.author || S.editor || S.title).split(',')[0]) + (S.year ? ' ' + S.year : '') + (c.quote.pin ? ', ' + esc(c.quote.pin) : '') : esc(c.quote.pin)) + (c.quote.key ? ' <i class="mark" data-s="' + esc(c.quote.key) + '|' + esc(c.quote.pin) + '" data-label="The quotation’s source"></i>' : '') + '</cite></blockquote>'; }
    art.innerHTML = '<div class="s-meta">' + (c.top10 ? '<span class="top10">Top ten</span>' : '') + '<span>' + esc(c.category === 'Athens/ancient artillery' ? 'Athens and antiquity' : c.category === 'Modern reconstruction/record' ? 'Modern machine' : c.category === 'Words/oddities' ? 'Words' : c.category) + '</span><span>' + esc(c.date) + '</span></div>' +
      '<h2>' + esc(c.title) + '</h2>' +
      (c.img ? '<figure><img src="img/' + c.img + '" alt="" loading="lazy"><figcaption>' + esc(c.imgcap) + '</figcaption></figure>' : '') +
      '<div class="s-text">' + c.text + '</div>' +
      '<div class="s-why"><b>Why it matters here</b>' + c.why + '</div>' + quote +
      '<div class="s-src"><span class="muted">Sources</span>' + srcs + '</div>' +
      '<details><summary>What we could not confirm</summary><p>' + c.caveats + '</p></details>' +
      '<div class="s-stop">' + (STOPS[c.stop] ? '<a href="index.html#s' + c.stop + '">' + STOPS[c.stop] + '</a>' : '') + ' <span class="muted">· ' + esc(c.place) + '</span></div>';
    deck.append(art);
  });
  $$('#deck-cat button').forEach((b) => b.addEventListener('click', () => { $$('#deck-cat button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); const cat = b.dataset.cat; $$('.story').forEach((s) => s.classList.toggle('hide', !!cat && s.dataset.cat !== cat)); }));
  if (location.hash) { const t = $(location.hash); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 50); }
})();
