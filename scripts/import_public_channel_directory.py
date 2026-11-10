#!/usr/bin/env python3
"""Build the website's reviewable public directory from Studio exports.

The input archive/CSVs are intentionally not copied into the public repository.
Only Studio rows marked Public are emitted into the website catalog.
"""
import argparse
import csv
import difflib
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path


def read_csv_bytes(data):
    return list(csv.DictReader(data.decode("utf-8-sig").splitlines()))


def archive_csv(zf, prefix):
    name = next(n for n in zf.namelist() if n.startswith(prefix))
    return read_csv_bytes(zf.read(name))


def clean_title(value):
    value = re.sub(r"\s*\(第\d+位\)$", "", value.strip())
    return re.sub(r"\s+", " ", value).casefold()


def member_playlist(record):
    title = (record.get("studio_title") or "") + " " + (record.get("title") or "")
    title = title.casefold()
    return any(marker in title for marker in ("会员", "會員", "members only", "member-only", "members-only"))


def taxonomy(title):
    # Four levels on the site: module -> series -> actual YouTube playlist -> video.
    # This first pass derives parent series from the real playlist title; the
    # source playlist name/ID remains unchanged and reviewable.
    t = title.casefold()
    if any(s in t for s in ("shorts", "top 20", "排行榜", "新观众先看", "精选")):
        return "collections", "频道入口与精选", "curated"
    if any(s in t for s in ("漏洞攻击", "短线伏击", "乱路狙击", "量化风控", "数据策略", "课程", "行动手册", "百家乐破解之道", "辅助视频", "收费指南")):
        return "courses", "课程目录", "confirmed"
    if any(s in t for s in ("老虎机", "老虎機", "slot machine", "slot strategies", "slot")):
        return "slots", "老虎机拆解｜机制、内幕与策略", "confirmed"
    if any(s in t for s in ("黑盒子", "牌靴", "作弊", "陷阱", "百家乐新知", "赌桌异常")):
        return "baccarat", "赌桌异常与黑盒子", "confirmed"
    if any(s in t for s in ("团队", "team victory", "team live")):
        return "baccarat", "百家乐团队与案例", "confirmed"
    if any(s in t for s in ("百家乐健身房", "拉斯维加斯实体", "新加坡实体", "赌场现场亲历")):
        return "baccarat", "赌场现场与牌靴亲历", "confirmed"
    if any(s in t for s in ("百家乐", "baccarat", "百家樂")):
        return "baccarat", "策略观点与数据研究", "confirmed"
    if any(s in t for s in ("凯利拍案", "揭秘赌场黑幕", "kelly uncovers")):
        return "investigations", "凯利拍案｜赌场事件与黑幕追查", "confirmed"
    if any(s in t for s in ("赌场", "casino", "vegas", "gambling risk weekly", "全球赌游", "赌场见闻", "全球賭場")):
        return "investigations", "赌场信息｜监管、运营与全球见闻", "confirmed"
    if any(s in t for s in ("赌徒", "戒赌", "上头", "离场", "人生", "玩家故事", "metaphysics", "gambler", "赌途")):
        return "commentary", "玩家经历、追损与离场思考", "confirmed"
    return "review", "待审核归类", "pending"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--merged-csv", required=True)
    ap.add_argument("--archive", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--csv-output", help="Optional reviewable four-level CSV generated from the public-safe catalog")
    args = ap.parse_args()

    with open(args.merged_csv, encoding="utf-8-sig", newline="") as f:
        merged = list(csv.DictReader(f))
    with zipfile.ZipFile(args.archive) as zf:
        studio_lists = archive_csv(zf, "07_")
        source_lists = archive_csv(zf, "02_")
        memberships = archive_csv(zf, "04_")

    playlists = {}
    lookup = []
    for r in source_lists:
        pid = r["播放列表ID"]
        playlists[pid] = {
            "id": pid, "title": r["播放列表标题"], "url": r["播放列表链接"],
            "count": int(r.get("视频数量(实抓)") or 0), "visibility": r.get("可见性", "unknown"),
            "description": "", "source": "公开播放列表抓取"
        }
        lookup.append((clean_title(r["播放列表标题"]), pid))
    for r in studio_lists:
        pid = r["播放列表ID"]
        p = playlists.setdefault(pid, {"id": pid, "title": r["播放列表名称"], "url": r["播放列表链接"], "count": int(r.get("视频数量(Studio)") or 0), "visibility": r.get("可见性(Studio)", "unknown"), "description": "", "source": "YouTube Studio"})
        p["studio_title"] = r["播放列表名称"]
        p["studio_visibility"] = r.get("可见性(Studio)", "unknown")
        p["studio_count"] = int(r.get("视频数量(Studio)") or 0)
        p["url"] = r.get("播放列表链接") or p.get("url", "")
        if p["visibility"] == "unknown": p["visibility"] = r.get("可见性(Studio)", "unknown")
        lookup.append((clean_title(r["播放列表名称"]), pid))

    by_video_lists = defaultdict(set)
    for r in memberships:
        by_video_lists[r["视频ID"]].add(r["播放列表ID"])

    # Map the list-name strings in the merged table to exact playlist IDs.
    # Membership rows with explicit IDs above take precedence.
    name_to_id = {}
    for name, pid in lookup:
        name_to_id.setdefault(name, pid)
    videos = {}
    for r in merged:
        vid = (r.get("视频ID") or "").strip()
        if not vid: continue
        item = videos.setdefault(vid, {
            "id": vid, "title": r.get("视频标题(公开页优先)", ""), "url": r.get("视频链接", ""),
            "type": r.get("类型", ""), "published": r.get("发布日期", ""),
            "duration_seconds": r.get("时长(秒)", ""), "duration": "", "views": "",
            "visibility": r.get("公开状态(Studio)", "待确认(Studio未匹配)"),
            "thumbnail": r.get("缩略图链接", ""), "description": "",
            "playlist_ids": [], "placements": []
        })
        if not item["title"]: item["title"] = r.get("视频标题(公开页优先)", "")
        item["views"] = r.get("播放量(Studio)") or r.get("播放量(公开详情)") or ""
        item["duration"] = item["duration"] or r.get("时长", "")
        for raw in (r.get("所属播放列表") or "").split(";"):
            name = re.sub(r"\s*\(第\d+位\)$", "", raw.strip())
            if not name: continue
            key = clean_title(name)
            pid = name_to_id.get(key)
            if not pid:
                choices = sorted(((difflib.SequenceMatcher(None, key, candidate).ratio(), candidate, candidate_id) for candidate, candidate_id in lookup), reverse=True)
                if choices and choices[0][0] >= 0.52: pid = choices[0][2]
            if pid: by_video_lists[vid].add(pid)

    # Public website catalog: never emit members-only, unlisted, private, or
    # Studio-unmatched video IDs. Their aggregate counts remain for reconciliation.
    public_videos = {vid: v for vid, v in videos.items() if v["visibility"].casefold() in ("public", "公开")}
    studio_public_lists = {pid: p for pid, p in playlists.items() if str(p.get("visibility", "")).casefold() in ("public", "公開")}
    public_lists = {pid: p for pid, p in studio_public_lists.items() if not member_playlist(p)}
    for p in public_lists.values():
        module, series, status = taxonomy(p.get("studio_title") or p["title"])
        p["module"] = module
        p["series"] = series
        p["classification_status"] = status
        p["slug"] = re.sub(r"[^a-z0-9]+", "-", clean_title(p.get("studio_title") or p["title"]).encode("ascii", "ignore").decode()).strip("-") or p["id"].lower()
    for vid, v in public_videos.items():
        ids = sorted(pid for pid in by_video_lists[vid] if pid in public_lists)
        v["playlist_ids"] = ids
        for pid in ids:
            p = public_lists[pid]
            module, series, status = taxonomy(p.get("studio_title") or p["title"])
            v["placements"].append({"module": module, "series": series, "playlist_id": pid, "playlist": p.get("studio_title") or p["title"], "status": status})
        if not v["placements"]:
            v["placements"] = [{"module": "review", "series": "待审核归类", "playlist_id": "", "playlist": "未匹配到公开视频播放列表", "status": "pending"}]
    catalog = {
        "generated_at": "2026-11-09",
        "source": "Studio + current playlist membership + merged video inventory",
        "privacy": "Only rows whose Studio visibility is Public are included. Members, Unlisted, Private, and unmatched records are excluded.",
        "reconciliation": {
            "unique_video_ids_in_source": len(videos), "public_videos_included": len(public_videos),
            "members_or_unlisted_or_private_or_unmatched_excluded": len(videos)-len(public_videos),
            "public_playlists": len(public_lists),
            "public_member_named_playlists_excluded": len(studio_public_lists) - len(public_lists),
            "public_videos_with_playlist": sum(bool(v['playlist_ids']) for v in public_videos.values()),
            "public_videos_pending_playlist_mapping": sum(not v['playlist_ids'] for v in public_videos.values())
        },
        "playlists": list(public_lists.values()), "videos": list(public_videos.values())
    }
    Path(args.output).write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.csv_output:
        fields = ["level1_module", "level2_series", "level3_playlist", "level4_video_title", "video_id", "video_url", "thumbnail", "views_snapshot", "published", "video_type", "visibility", "classification_status"]
        rows = []
        for video in catalog["videos"]:
            placements = video.get("placements") or []
            if not placements:
                placements = [{"module": "review", "series": "待审核归类", "playlist": "未匹配到公开视频播放列表", "status": "pending"}]
            for placement in placements:
                rows.append({
                    "level1_module": placement.get("module", "review"),
                    "level2_series": placement.get("series", "待审核归类"),
                    "level3_playlist": placement.get("playlist", "未匹配到公开视频播放列表"),
                    "level4_video_title": video.get("title", ""),
                    "video_id": video.get("id", ""),
                    "video_url": video.get("url", ""),
                    "thumbnail": video.get("thumbnail", ""),
                    "views_snapshot": video.get("views", ""),
                    "published": video.get("published", ""),
                    "video_type": video.get("type", ""),
                    "visibility": video.get("visibility", ""),
                    "classification_status": placement.get("status", "pending"),
                })
        with open(args.csv_output, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    print(json.dumps(catalog["reconciliation"], ensure_ascii=False))


if __name__ == "__main__": main()
