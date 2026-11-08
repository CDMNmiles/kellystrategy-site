const toast = message => { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2600); };
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(button.dataset.copy); toast('已複製微信號：' + button.dataset.copy); }
  catch { toast('請手動複製微信號：' + button.dataset.copy); }
}));
document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => {
  const frame = document.getElementById('video-player');
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(button.dataset.video)}?start=${Number(button.dataset.chapter)}&autoplay=1`;
  frame.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
}));
const params = new URLSearchParams(location.search);
function applyTag(tag) {
  document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b.dataset.filter === tag); b.setAttribute('aria-pressed', String(b.dataset.filter === tag)); });
  let shown = 0;
  document.querySelectorAll('#filtered-grid .filterable').forEach(el => { el.hidden = !!tag && el.dataset.tag !== tag; if (!el.hidden) shown++; });
  const empty = document.getElementById('filter-empty'); if (empty) empty.hidden = shown !== 0;
}
if (document.querySelector('[data-filter-list]')) {
  applyTag(params.get('tag') || '');
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { const p = new URLSearchParams(location.search); if (b.dataset.filter) p.set('tag', b.dataset.filter); else p.delete('tag'); history.pushState(null, '', location.pathname + (p.size ? '?' + p : '')); applyTag(b.dataset.filter); }));
  document.querySelector('[data-clear-filter]')?.addEventListener('click', () => { history.pushState(null, '', location.pathname); applyTag(''); });
  addEventListener('popstate', () => applyTag(new URLSearchParams(location.search).get('tag') || ''));
}
function applyCourse(category) {
  document.querySelectorAll('[data-course-category]').forEach(b => b.classList.toggle('active', b.dataset.courseCategory === category));
  document.querySelectorAll('#course-grid .filterable').forEach(el => { el.hidden = !!category && el.dataset.category !== category; });
}
if (document.querySelector('[data-course-filters]')) {
  applyCourse(params.get('category') || '');
  document.querySelectorAll('[data-course-category]').forEach(b => b.addEventListener('click', () => { history.pushState(null, '', '/courses/' + (b.dataset.courseCategory ? '?category=' + b.dataset.courseCategory : '')); applyCourse(b.dataset.courseCategory); }));
  addEventListener('popstate', () => applyCourse(new URLSearchParams(location.search).get('category') || ''));
}
const searchIndex = document.getElementById('search-index');
if (searchIndex) {
  const index = JSON.parse(searchIndex.textContent);
  const input = document.getElementById('search-input');
  input.value = params.get('q') || '';
  let type = params.get('type') || '';
  const pairs = [['百家乐', '百家樂'], ['老虎机', '老虎機'], ['赌场', '賭場'], ['课程', '課程'], ['工具', '軟體'], ['程序牌', '程序牌'], ['凯利', '凱利'], ['复盘', '復盤'], ['换钱', '換錢']];
  const norm = s => { let text = String(s).toLowerCase().replace(/\s+/g, ''); for (const [a, b] of pairs) text = text.split(a).join(b); return text; };
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text) node.textContent = text; return node; };
  const render = () => {
    const p = new URLSearchParams(location.search); const q = norm(p.get('q') || ''); type = p.get('type') || '';
    input.value = p.get('q') || '';
    const result = index.filter(i => (!type || i.type === type) && (!p.get('category') || i.category === p.get('category')) && (!q || norm(i.title + i.summary + i.keywords + i.type).includes(q)));
    document.querySelectorAll('[data-search-type]').forEach(b => b.classList.toggle('active', b.dataset.searchType === type));
    const target = document.getElementById('search-results'); target.replaceChildren();
    document.getElementById('result-count').textContent = q ? `找到 ${result.length} 項相關內容` : `目前原型收錄 ${result.length} 項內容`;
    if (!result.length) { const empty = el('div', 'empty-state'); empty.append(el('h2', '', '找不到相關內容'), el('p', '', '試試其他關鍵詞，或清除類型篩選。完整歷史內容仍在整理。')); target.append(empty); }
    for (const i of result) {
      const row = el('article', 'video-card'); const visual = el('a', 'thumb'); visual.href = i.href;
      if (i.image) { const img = el('img'); img.src = i.image; img.alt = i.title; img.loading = 'lazy'; visual.append(img); }
      else { visual.append(el('span', 'search-kind', i.type)); }
      const body = el('div', 'card-body'); body.append(el('div', 'meta', i.type)); const link = el('a', 'card-title', i.title); link.href = i.href; body.append(link, el('p', 'summary', i.summary)); row.append(visual, body); target.append(row);
    }
  };
  render();
  document.querySelectorAll('[data-search-type]').forEach(b => b.addEventListener('click', () => { const p = new URLSearchParams(location.search); if (b.dataset.searchType) p.set('type', b.dataset.searchType); else p.delete('type'); history.pushState(null, '', '/search/' + (p.size ? '?' + p : '')); render(); }));
  addEventListener('popstate', render);
}
