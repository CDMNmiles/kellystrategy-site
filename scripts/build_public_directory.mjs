import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChannelLibrary } from '../prototype/channel-library.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content/youtube-public-directory.json'), 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const breadcrumb = items => `<nav aria-label="Breadcrumb"><a href="/catalog/">频道目录</a>${items.map(([label, href]) => ` / ${href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label)}`).join('')}</nav>`;
const shell = (title, body, active = '', description = '凯利策略公开视频目录') => `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="stylesheet" href="/channel-library.css"><link rel="stylesheet" href="/style.css"><script defer src="/channel-library.js"></script></head><body><header class="masthead"><a href="/catalog/">凯利策略 · Spot the Risks</a><nav>${['baccarat','slots','investigations','commentary','courses'].map(id => `<a href="/${id}/">${({ baccarat:'百家乐', slots:'老虎机', investigations:'赌场追查', commentary:'博彩杂谈', courses:'课程中心' })[id]}</a>`).join('')}</nav><a href="https://www.youtube.com/@SpotRisks" target="_blank" rel="noopener">YouTube ↗</a></header>${body}<footer><a href="/catalog/">频道目录</a> · 来源：YouTube Studio 公开内容清单</footer></body></html>`;

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const pages = buildChannelLibrary({ shell, breadcrumb, esc }, catalog);
pages.push(['/', shell('凯利策略频道目录', '<main class="cl-page"><h1>凯利策略频道目录</h1><p>按主题与播放列表浏览频道公开视频。</p><a href="/catalog/">进入内容目录 →</a></main>')]);
const searchIndex = catalog.videos.map(video => ({ type: '影片', title: video.title, href: video.url, category: video.module || '', keywords: `${video.title} ${(video.playlist_ids || []).join(' ')}` }));
pages.push(['/search/', shell('搜索公开视频', `<main class="cl-page"><h1>搜索频道公开视频</h1><label>输入影片关键词 <input id="search-query" type="search"></label><p id="search-count" aria-live="polite"></p><div id="search-results"></div><script type="application/json" id="search-index">${JSON.stringify(searchIndex).replace(/</g, '\\u003c')}</script><script defer src="/search.js"></script></main>`)]);
for (const [route, html] of pages) {
  const target = path.join(output, route, 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}
for (const name of ['channel-library.css', 'channel-library.js', 'style.css', 'search.js']) {
  fs.copyFileSync(path.join(root, 'prototype', name), path.join(output, name));
}
console.log(JSON.stringify({ pages: pages.length, publicVideos: catalog.reconciliation.public_videos_included, publicPlaylists: catalog.reconciliation.public_playlists, output: 'dist' }));
