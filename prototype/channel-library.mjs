const moduleInfo = {
  baccarat: { label: '百家乐', en: 'BACCARAT', intro: '从策略观点、数据研究与赌桌风险出发，按真实播放列表继续浏览。' },
  slots: { label: '老虎机', en: 'SLOT MACHINES', intro: '机制、赌场运营、实地体验与老虎机策略，按频道现有播放列表展开。' },
  investigations: { label: '赌场追查', en: 'CASINO WATCH', intro: '每周事件、监管与赌场运营资料、全球现场见闻，分别进入对应系列。' },
  commentary: { label: '博彩杂谈', en: 'PERSPECTIVES', intro: '玩家经历、博彩文化与人生思考，收录跨游戏的观察与故事。' },
  courses: { label: '课程中心', en: 'COURSES', intro: '集中浏览频道已有课程播放列表。课程内容、形式与现行安排可继续联系凱利确认。' },
  collections: { label: '频道精选', en: 'COLLECTIONS', intro: '新观众入口、热门排行榜与 Shorts 精选，方便快速进入频道代表内容。' },
  review: { label: '目录待核对', en: 'REVIEW QUEUE', intro: 'Studio 清单中已确认公开、但暂未匹配到公开主题播放列表的影片。' }
};

const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'playlist';
const numeric = value => {
  const s = String(value || '').replaceAll(',', '').trim().toLowerCase();
  const m = s.match(/^([\d.]+)\s*(万|萬|k|m)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  return n * ({ '万': 10000, '萬': 10000, k: 1000, m: 1000000 }[m[2]] || 1);
};

export function buildChannelLibrary({ shell, breadcrumb, esc }, catalog) {
  const playlists = catalog.playlists;
  const videos = catalog.videos;
  const videoById = new Map(videos.map(v => [v.id, v]));
  const videoCards = list => list.map(v => `<article class="cl-video"><a class="cl-thumb" href="${esc(v.url)}" target="_blank" rel="noopener"><img src="${esc(v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`)}" alt="${esc(v.title)}" loading="lazy"><span>▶</span>${v.duration ? `<i>${esc(v.duration)}</i>` : ''}</a><div class="cl-title"><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a></div><div class="cl-meta"><span>${esc(v.views || '—')} 次观看</span>${v.published ? `<span>${esc(v.published)}</span>` : ''}</div></article>`).join('');
  const playlistVideos = p => videos.filter(v => v.playlist_ids.includes(p.id)).sort((a, b) => numeric(b.views) - numeric(a.views));
  const playlistCard = p => {
    const related = playlistVideos(p);
    const cover = related[0]?.id || '';
    const count = p.studio_count || p.count || related.length;
    const path = `/catalog/${p.module}/${slugify(p.series)}/${slugify(p.studio_title || p.title)}-${p.id.slice(-5).toLowerCase()}/`;
    return `<a class="cl-playlist" href="${path}"><div class="cl-playlist-cover">${cover ? `<img src="https://i.ytimg.com/vi/${cover}/hqdefault.jpg" alt="" loading="lazy">` : `<div class="cl-cover-empty">${esc(moduleInfo[p.module]?.en || 'KELLY')}</div>`}<span>${count} 支</span></div><strong>${esc(p.studio_title || p.title)}</strong><small>${esc(moduleInfo[p.module]?.label || '待核對')} · 公開播放列表</small></a>`;
  };
  const pages = [];
  const seriesGroups = list => {
    const groups = new Map();
    for (const p of list) {
      const key = p.series || '待审核归类';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    return [...groups.entries()];
  };
  const listPage = (moduleId, p) => {
    const related = playlistVideos(p);
    const path = `/catalog/${moduleId}/${slugify(p.series)}/${slugify(p.studio_title || p.title)}-${p.id.slice(-5).toLowerCase()}/`;
    const list = `<main class="cl-page"><div class="cl-crumb">${breadcrumb([[moduleInfo[moduleId].label, `/${moduleId}/`], [p.series, `/catalog/${moduleId}/${slugify(p.series)}/`], [p.studio_title || p.title]])}</div><header class="cl-header"><div class="cl-kicker">${moduleInfo[moduleId].en} / PLAYLIST</div><h1>${esc(p.studio_title || p.title)}</h1><p>${esc(p.description || '按缩略图、标题与播放量浏览本播放列表中的公开视频。')}</p><div class="cl-actions"><a href="https://www.youtube.com/playlist?list=${esc(p.id)}" target="_blank" rel="noopener">打开 YouTube 完整播放列表 ↗</a><span>${related.length} 支已接入官网目录</span></div></header><div class="cl-tools"><label>在本列表中搜索 <input type="search" data-library-search placeholder="输入视频标题关键词"></label><span>${related.length} 支公开视频</span></div><div class="cl-video-grid" data-library-grid>${videoCards(related)}</div><button class="cl-load-more" data-library-more hidden>继续显示影片</button>${!related.length ? `<div class="cl-empty">Studio 中有这个公开播放列表；逐支影片匹配仍在核对。</div>` : ''}</main>`;
    pages.push([path, shell(`${p.studio_title || p.title}｜影片目录`, list, moduleId, p.description || p.title)]);
  };
  for (const [moduleId, info] of Object.entries(moduleInfo)) {
    const rows = playlists.filter(p => p.module === moduleId).sort((a, b) => (b.studio_count || b.count || 0) - (a.studio_count || a.count || 0));
    const grouped = seriesGroups(rows);
    const moduleVideos = videos.filter(v => v.placements.some(place => place.module === moduleId));
    const featured = [...new Map(moduleVideos.map(v => [v.id, v])).values()].sort((a, b) => numeric(b.views) - numeric(a.views)).slice(0, 5);
    const sections = grouped.map(([series, list]) => `<section class="cl-series"><div class="cl-series-head"><div><div class="cl-kicker">${info.en} / ${list.length} PLAYLIST${list.length === 1 ? '' : 'S'}</div><h2>${esc(series)}</h2></div><a href="/catalog/${moduleId}/${slugify(series)}/">查看系列 →</a></div><div class="cl-playlist-rail">${list.map(playlistCard).join('')}</div></section>`).join('');
    const reviewGrid = moduleId === 'review' ? `<section class="cl-series"><div class="cl-series-head"><div><div class="cl-kicker">STUDIO / PUBLIC</div><h2>公开但尚未匹配播放列表</h2></div></div><div class="cl-tools"><label>搜索影片 <input type="search" data-library-search placeholder="输入标题关键词"></label><span>${moduleVideos.length} 支待核对</span></div><div class="cl-video-grid" data-library-grid>${videoCards(moduleVideos)}</div><button class="cl-load-more" data-library-more hidden>继续显示影片</button></section>` : '';
    const courseAction = moduleId === 'courses' ? `<div class="cl-actions"><a href="/about/#contact">询问课程目录与现行安排 ↗</a><span>实际内容与获取方式以当前确认为准</span></div>` : '';
    const body = `<main class="cl-page"><header class="cl-module-head"><div class="cl-kicker">${info.en} / 凱利策略影片目錄</div><h1>${info.label}</h1><p>${info.intro}</p>${courseAction}<div class="cl-counts"><strong>${new Set(moduleVideos.map(v => v.id)).size}</strong><span>支已接入目录的公开视频</span><b>${rows.length}</b><span>个频道播放列表</span></div></header>${featured.length ? `<section class="cl-featured"><div class="cl-series-head"><div><div class="cl-kicker">PUBLIC VIDEOS / SORTED BY VIEWS</div><h2>观看人数较多的影片</h2></div></div><div class="cl-video-grid cl-feature-grid">${videoCards(featured)}</div></section>` : ''}${reviewGrid}${sections || (moduleId !== 'review' ? `<div class="cl-empty">该板块的公开播放列表正在逐项匹配。</div>` : '')}<div class="cl-footnote">影片分类以当前 YouTube 播放列表为依据；未匹配到公开列表的影片会留在「目录待核对」。播放量来自本次 Studio 清单快照。</div></main>`;
    pages.push([`/${moduleId}/`, shell(`${info.label}｜凱利策略`, breadcrumb([[info.label]] ) + body, moduleId, info.intro)]);
    for (const [series, list] of grouped) {
      const seriesPath = `/catalog/${moduleId}/${slugify(series)}/`;
      const seriesBody = `<main class="cl-page"><header class="cl-header"><div class="cl-kicker">${info.en} / SERIES</div><h1>${esc(series)}</h1><p>${info.intro}</p><a class="cl-back" href="/${moduleId}/">← 返回${info.label}</a></header><div class="cl-series-list">${list.map(playlistCard).join('')}</div></main>`;
      pages.push([seriesPath, shell(`${series}｜${info.label}`, breadcrumb([[info.label, `/${moduleId}/`], [series]] ) + seriesBody, moduleId, info.intro)]);
      list.forEach(p => listPage(moduleId, p));
    }
  }
  const catalogBody = `<main class="cl-page"><header class="cl-module-head"><div class="cl-kicker">KELLY STRATEGY / CONTENT LIBRARY</div><h1>频道内容目录</h1><p>以 YouTube Studio 中已确认公开的影片为基础。先选板块，再按系列和播放列表浏览。</p><div class="cl-total"><strong>${catalog.reconciliation.public_videos_included}</strong><span>支 Studio 标记为公开的影片已接入；会员、未公开及状态待核影片不在此公开目录中。</span></div></header><div class="cl-module-grid">${Object.entries(moduleInfo).filter(([id]) => !['review'].includes(id)).map(([id, info]) => `<a href="/${id}/"><small>${info.en}</small><strong>${info.label}</strong><span>${playlists.filter(p => p.module === id).length} 个公开播放列表</span></a>`).join('')}${Object.entries(moduleInfo).filter(([id]) => id === 'review').map(([id, info]) => `<a class="cl-review-link" href="/${id}/"><small>${info.en}</small><strong>${info.label}</strong><span>影片归属待核对</span></a>`).join('')}</div><p class="cl-footnote">数据快照：${catalog.generated_at}。播放量会随 YouTube 更新；点选影片可前往 YouTube 查看最新数据和评论。</p></main>`;
  pages.push(['/catalog/', shell('频道内容目录｜凱利策略', breadcrumb([['频道内容目录']]) + catalogBody, '', '凱利策略的百家乐、老虎机、赌场追查、博彩杂谈与课程目录。')]);
  return pages;
}
