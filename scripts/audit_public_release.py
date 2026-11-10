#!/usr/bin/env python3
"""Scan a repository tree for source video/playlist IDs that are not public.

The private source identifiers are never printed. Only affected paths and
counts are reported. Raw Studio files stay outside the repository.
"""
import argparse
import csv
import re
import zipfile
from pathlib import Path


VIDEO_ID = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-])")
PLAYLIST_ID = re.compile(r"\bPL[A-Za-z0-9_-]{8,}\b")
MEMBER_MARKERS = ("会员", "會員", "members only", "member-only", "members-only")


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def archive_csv(zf, prefix):
    name = next((n for n in zf.namelist() if n.startswith(prefix)), None)
    if not name:
        raise ValueError(f"missing {prefix} CSV in source archive")
    return list(csv.DictReader(zf.read(name).decode("utf-8-sig").splitlines()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--studio-csv", required=True, type=Path)
    parser.add_argument("--merged-csv", required=True, type=Path)
    parser.add_argument("--playlists-zip", required=True, type=Path)
    args = parser.parse_args()

    public_video_ids = set()
    forbidden_video_ids = set()
    for row in read_csv(args.studio_csv):
        vid = (row.get("匹配视频ID") or "").strip()
        if not VIDEO_ID.fullmatch(vid):
            continue
        (public_video_ids if row.get("公开状态(Studio)") in ("Public", "公开") else forbidden_video_ids).add(vid)
    for row in read_csv(args.merged_csv):
        vid = (row.get("视频ID") or "").strip()
        if VIDEO_ID.fullmatch(vid) and row.get("公开状态(Studio)") not in ("Public", "公开"):
            forbidden_video_ids.add(vid)
    forbidden_video_ids.difference_update(public_video_ids)

    forbidden_playlist_ids = set()
    with zipfile.ZipFile(args.playlists_zip) as zf:
        for prefix, title_key, visibility_key in (
            ("02_", "播放列表标题", "可见性"),
            ("07_", "播放列表名称", "可见性(Studio)"),
        ):
            for row in archive_csv(zf, prefix):
                pid = (row.get("播放列表ID") or "").strip()
                title = (row.get(title_key) or "").casefold()
                visibility = (row.get(visibility_key) or "").casefold()
                private_name = any(marker.casefold() in title for marker in MEMBER_MARKERS)
                if pid and (visibility not in ("public", "公开", "公開") or private_name):
                    forbidden_playlist_ids.add(pid)

    hits = []
    excluded_dirs = {".git", "node_modules", "dist", ".sites-checkout"}
    for path in args.repo.rglob("*"):
        if not path.is_file() or any(part in excluded_dirs for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        found_videos = forbidden_video_ids.intersection(VIDEO_ID.findall(text))
        found_playlists = forbidden_playlist_ids.intersection(PLAYLIST_ID.findall(text))
        if found_videos or found_playlists:
            hits.append((path.relative_to(args.repo), len(found_videos), len(found_playlists)))

    print(f"restricted_video_ids_checked={len(forbidden_video_ids)}")
    print(f"restricted_playlist_ids_checked={len(forbidden_playlist_ids)}")
    if hits:
        for path, video_count, playlist_count in hits:
            print(f"FAIL {path}: restricted videos={video_count}, restricted playlists={playlist_count}")
        raise SystemExit(1)
    print("PASS no restricted source IDs found in repository files")


if __name__ == "__main__":
    main()
