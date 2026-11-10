const indexElement = document.querySelector('#search-index');
const queryInput = document.querySelector('#search-query');
const resultCount = document.querySelector('#search-count');
const results = document.querySelector('#search-results');

if (indexElement && queryInput && resultCount && results) {
  const index = JSON.parse(indexElement.textContent);
  const render = () => {
    const query = queryInput.value.trim().toLocaleLowerCase();
    const matches = index.filter(item => !query || item.title.toLocaleLowerCase().includes(query));
    resultCount.textContent = `找到 ${matches.length} 支影片`;
    results.replaceChildren(...matches.slice(0, 100).map(item => {
      const paragraph = document.createElement('p');
      const link = document.createElement('a');
      link.href = item.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `${item.title} ↗`;
      paragraph.append(link);
      return paragraph;
    }));
  };
  queryInput.addEventListener('input', render);
  render();
}
