document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-library-grid]');
  const input = document.querySelector('[data-library-search]');
  const more = document.querySelector('[data-library-more]');
  if (!grid) return;
  const cards = [...grid.children];
  const pageSize = 25;
  let shown = pageSize;
  const update = () => {
    const q = (input?.value || '').trim().toLocaleLowerCase();
    let matched = 0;
    for (const card of cards) {
      const visibleBySearch = !q || card.textContent.toLocaleLowerCase().includes(q);
      if (visibleBySearch) {
        matched += 1;
        card.hidden = matched > shown;
      } else card.hidden = true;
    }
    if (more) {
      more.hidden = matched <= shown;
      more.textContent = `继续显示影片（${Math.min(pageSize, matched - shown)} 支）`;
    }
  };
  input?.addEventListener('input', () => { shown = pageSize; update(); });
  more?.addEventListener('click', () => { shown += pageSize; update(); });
  update();
});
