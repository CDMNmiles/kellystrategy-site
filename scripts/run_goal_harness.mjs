import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'content/youtube-public-directory.json');
const dist = path.join(root, 'dist');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const errors = [];
const notes = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const expectedModules = new Set(['baccarat', 'slots', 'investigations', 'commentary', 'courses', 'collections', 'review']);
const playlists = new Map((catalog.playlists || []).map(p => [p.id, p]));
const videos = catalog.videos || [];
const seenVideoIds = new Set();
const placedVideoIds = new Set();

assert(Array.isArray(catalog.playlists), 'catalog.playlists must be an array');
assert(Array.isArray(catalog.videos), 'catalog.videos must be an array');
assert(Boolean(catalog.generated_at && catalog.source && catalog.reconciliation), 'catalog source and reconciliation metadata are required');

for (const p of catalog.playlists || []) {
  assert(Boolean(p.id && p.title), `playlist missing id/title: ${JSON.stringify(p)}`);
  assert(expectedModules.has(p.module), `playlist has invalid module: ${p.title}`);
  assert(Boolean(p.series), `playlist missing series: ${p.title}`);
  assert(/^https:\/\/www\.youtube\.com\/playlist\?list=/.test(p.url || ''), `playlist URL invalid: ${p.title}`);
  assert(['confirmed', 'curated', 'pending'].includes(p.classification_status), `playlist classification state missing/invalid: ${p.title}`);
  if (p.classification_status === 'pending') notes.push(`playlist awaits human review: ${p.title}`);
}

for (const v of videos) {
  assert(Boolean(v.id && v.title), `video missing ID/title: ${JSON.stringify(v)}`);
  assert(!seenVideoIds.has(v.id), `duplicate video ID in public catalog: ${v.id}`);
  seenVideoIds.add(v.id);
  assert(['Public', '公开'].includes(v.visibility), `non-public visibility leaked into public catalog: ${v.id}/${v.visibility}`);
  assert(v.url === `https://www.youtube.com/watch?v=${v.id}`, `video URL does not match ID: ${v.id}`);
  const ids = Array.isArray(v.playlist_ids) ? v.playlist_ids : [];
  if (!ids.length) {
    assert((v.placements || []).some(p => p.status === 'pending' && p.playlist === '未匹配到公开视频播放列表'), `unplaced public video lacks explicit pending placement: ${v.id}`);
  }
  for (const id of ids) {
    const playlist = playlists.get(id);
    assert(Boolean(playlist), `video ${v.id} references missing/non-public playlist ${id}`);
    if (playlist) placedVideoIds.add(v.id);
  }
}

const expectedPublic = catalog.reconciliation?.public_videos_included;
assert(expectedPublic === videos.length, `reconciliation public video count ${expectedPublic} != actual ${videos.length}`);
assert((catalog.reconciliation?.public_playlists ?? -1) === playlists.size, 'reconciliation public playlist count does not match catalog');
assert(placedVideoIds.size === (catalog.reconciliation?.public_videos_with_playlist ?? -1), 'reconciliation playlist-mapped count does not match actual data');

if (!fs.existsSync(path.join(dist, 'index.html'))) errors.push('dist/index.html missing; run npm run build first');
for (const module of ['baccarat', 'slots', 'investigations', 'commentary', 'courses']) {
  const file = path.join(dist, module, 'index.html');
  assert(fs.existsSync(file), `module route missing: /${module}/`);
}
for (const p of playlists.values()) {
  if (!p.module || !p.series) continue;
  const seriesSlug = String(p.series).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'playlist';
  const playlistSlug = String(p.studio_title || p.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'playlist';
  const tail = String(p.id).slice(-5).toLowerCase();
  const file = path.join(dist, 'catalog', p.module, seriesSlug, `${playlistSlug}-${tail}`, 'index.html');
  assert(fs.existsSync(file), `playlist page missing for ${p.title}: ${path.relative(dist, file)}`);
}

const searchPage = path.join(dist, 'search', 'index.html');
if (fs.existsSync(searchPage)) {
  const html = fs.readFileSync(searchPage, 'utf8');
  const match = html.match(/<script type="application\/json" id="search-index">([\s\S]*?)<\/script>/);
  assert(Boolean(match), 'search index JSON missing from /search/');
  if (match) {
    const index = JSON.parse(match[1]);
    const indexed = new Set(index.filter(item => item.type === '影片').map(item => item.href));
    const missing = videos.filter(v => !indexed.has(v.url));
    assert(missing.length === 0, `${missing.length} public catalog videos missing from site search`);
  }
} else errors.push('search page missing; run npm run build first');

const report = {
  stage: 'goal-harness-v0.1',
  result: errors.length ? 'FAIL' : 'PASS_WITH_REVIEW_ITEMS',
  source_video_ids: catalog.reconciliation?.unique_video_ids_in_source,
  public_videos: videos.length,
  public_playlists: playlists.size,
  public_videos_with_playlist: placedVideoIds.size,
  public_videos_pending_playlist: videos.length - placedVideoIds.size,
  pending_classification_playlists: [...playlists.values()].filter(p => p.classification_status === 'pending').length,
  errors,
  review_notes: {
    pending_playlists: [...playlists.values()].filter(p => p.classification_status === 'pending').map(p => p.title),
    pending_public_video_playlist_matches: videos.length - placedVideoIds.size,
    next_manual_review: `核对 ${[...playlists.values()].filter(p => p.classification_status === 'pending').length} 个待审核播放列表、${videos.length - placedVideoIds.size} 支公开未匹配影片，以及 700+ 频道公开量与 Studio 清单差异。`,
  },
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length ? 1 : 0;
