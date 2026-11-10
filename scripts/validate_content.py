#!/usr/bin/env python3
"""Validate the public catalog; this does not verify source facts or completeness."""
import argparse
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {"baccarat", "slots", "investigations", "commentary"}
COMMON = set("id kind slug title summary primary_category additional_categories section_ids topic_ids series_ids tags search_aliases thumbnail published_at updated_at public_review provenance_key public_references related_ids body".split())
SPECIFIC = {
    "video": set("youtube_id youtube_url format access embed_status embed_verified_at duration_seconds chapters transcript".split()),
    "article": set("author_display_name article_type event_date timeline follow_up_ids corrections".split()),
    "series": {"items"}, "topic": {"items"},
    "course": set("modules preview_ids delivery access_term offers contact_keys".split()),
    "tool": set("availability purpose features instructions version platforms requirements release_notes launch_url download_url downloads verified_at repository_url".split()),
}


def validate(taxonomy, catalog, contacts=None):
    errors = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    def date(value):
        if not isinstance(value, str):
            return False
        try:
            dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
            return True
        except ValueError:
            return False
    def https(value):
        if not isinstance(value, str):
            return False
        u = urlsplit(value)
        return u.scheme == "https" and bool(u.hostname) and not u.username and not u.password
    def scan(value, label):
        if isinstance(value, str):
            # All private-source material stays outside this public delivery format.
            require(not re.search(r"(?:drive\.google\.com/(?:file|drive)|docs\.google\.com/(?:document|spreadsheets|presentation)/d/|libfile_[a-z0-9]+|file-inline-libfile_|/workspace/)", value, re.I), label + ": internal-source marker")
        elif isinstance(value, dict):
            for k, v in value.items():
                scan(v, label + "." + k)
        elif isinstance(value, list):
            for i, v in enumerate(value):
                scan(v, f"{label}[{i}]")
    if not isinstance(taxonomy, dict) or not isinstance(catalog, dict):
        return ["taxonomy and catalog must be objects"]
    require(taxonomy.get("schema_version") == 1, "taxonomy schema_version must be 1")
    require(catalog.get("schema_version") == 1, "catalog schema_version must be 1")
    require(set(catalog) <= {"schema_version", "items"}, "unknown catalog root field")
    cats = taxonomy.get("categories", [])
    utilities = taxonomy.get("utility_entries", [])
    require(isinstance(cats, list) and all(isinstance(c, dict) for c in cats), "categories must be objects")
    if not isinstance(cats, list) or not all(isinstance(c, dict) for c in cats):
        return errors
    require(len(cats) == 4 and {c.get("id") for c in cats} == CATEGORIES, "exactly four fixed categories required")
    require(isinstance(utilities, list) and all(isinstance(u, dict) for u in utilities), "utility_entries must be objects")
    if not isinstance(utilities, list) or not all(isinstance(u, dict) for u in utilities):
        return errors
    require(len(utilities) == 2 and {u.get("id") for u in utilities} == {"courses", "baccarat-tools"}, "course and tool entries required")
    paths = [c.get("path") for c in cats + utilities]
    require(all(isinstance(p, str) and p.startswith("/") and p.endswith("/") for p in paths), "navigation paths must be absolute site paths")
    require(len(paths) == len(set(str(p) for p in paths)), "duplicate navigation path")
    expected_paths = {"baccarat": "/baccarat/", "slots": "/slots/", "investigations": "/investigations/", "commentary": "/commentary/", "courses": "/courses/", "baccarat-tools": "/tools/"}
    for entry in cats + utilities:
        require(entry.get("path") == expected_paths.get(entry.get("id")), "navigation id/path mismatch")
    sections = taxonomy.get("sections", [])
    section_map = {}
    require(isinstance(sections, list), "sections must be an array")
    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                errors.append("invalid section"); continue
            sid, category, slug = section.get("id"), section.get("category"), section.get("slug")
            require(isinstance(sid, str) and sid not in section_map, "invalid/duplicate section id")
            require(isinstance(slug, str) and bool(re.fullmatch(r"[a-z0-9-]+", slug)), "invalid section slug")
            require(category in CATEGORIES and sid == str(category) + "-" + str(slug), "invalid section/category mapping")
            require(section.get("status") in {"candidate", "active", "retired"}, "invalid section status")
            if isinstance(sid, str): section_map[sid] = section
    contacts = contacts if contacts is not None else {"schema_version": 1, "channels": []}
    contact_keys = set()
    require(isinstance(contacts, dict), "contacts must be an object")
    channels = contacts.get("channels", []) if isinstance(contacts, dict) else []
    require(isinstance(contacts, dict) and contacts.get("schema_version") == 1 and set(contacts) <= {"schema_version", "channels"}, "invalid contacts root")
    require(isinstance(channels, list), "channels must be an array")
    if isinstance(channels, list):
        for channel in channels:
            if not isinstance(channel, dict):
                errors.append("invalid contact channel"); continue
            ck, ctype, value = channel.get("key"), channel.get("type"), channel.get("value")
            require(set(channel) <= {"key", "type", "label", "value", "qr_url", "verified_at", "public_review"}, "unknown contact field")
            require(isinstance(ck, str) and bool(re.fullmatch(r"[a-z0-9_-]+", ck)) and ck not in contact_keys, "invalid/duplicate contact key")
            require(ctype in {"email", "wechat", "whatsapp"}, "invalid contact type")
            require(isinstance(value, str) and bool(value.strip()), "contact value required")
            require(channel.get("public_review") == "approved" and date(channel.get("verified_at")), "contact needs public review and verification date")
            if isinstance(value, str) and ctype == "email":
                require(bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value)) and not any(c in value for c in "\r\n?&"), "invalid email contact")
            if isinstance(value, str) and ctype == "whatsapp":
                require(bool(re.fullmatch(r"\+[1-9][0-9]{6,14}", value)), "invalid WhatsApp phone")
            if channel.get("qr_url") is not None:
                require(https(channel["qr_url"]), "invalid contact QR URL")
            if isinstance(ck, str): contact_keys.add(ck)
    scan(contacts, "contacts")
    rows = catalog.get("items")
    if not isinstance(rows, list):
        return errors + ["catalog.items must be an array"]
    scan(catalog, "catalog")
    ids, slugs, youtube_ids = set(), set(), set()
    by_id = {}
    for n, item in enumerate(rows):
        key = f"items[{n}]"
        if not isinstance(item, dict):
            errors.append(key + ": must be an object")
            continue
        kind = item.get("kind")
        if kind not in SPECIFIC:
            errors.append(key + ": unsupported kind")
            continue
        require(not (set(item) - COMMON - SPECIFIC[kind]), key + ": unknown field(s): " + ",".join(sorted(set(item) - COMMON - SPECIFIC[kind])))
        for field in ["id", "slug", "title", "summary"]:
            require(isinstance(item.get(field), str) and bool(item[field].strip()), key + ": missing " + field)
        identity = item.get("id")
        slug = item.get("slug")
        if not isinstance(identity, str) or not isinstance(slug, str):
            continue
        require(bool(re.fullmatch(r"[a-z0-9][a-z0-9_-]*", identity)), key + ": invalid id")
        require(bool(re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug)), key + ": invalid slug")
        require(identity not in ids, key + ": duplicate id")
        require((kind, slug) not in slugs, key + ": duplicate kind/slug")
        ids.add(identity); slugs.add((kind, slug)); by_id[identity] = item
        require(item.get("primary_category") in CATEGORIES, key + ": invalid primary_category")
        require(item.get("public_review") == "approved", key + ": public review required")
        require(date(item.get("updated_at")), key + ": invalid updated_at")
        for field in ["body", "provenance_key", "delivery", "access_term", "purpose", "instructions", "version", "requirements", "author_display_name"]:
            if field in item:
                require(isinstance(item[field], str), key + ": " + field + " must be text")
        for field in ["published_at", "event_date", "verified_at", "embed_verified_at"]:
            if item.get(field) is not None:
                require(date(item[field]), key + ": invalid " + field)
        additional = item.get("additional_categories", [])
        require(isinstance(additional, list) and all(isinstance(c, str) and c in CATEGORIES and c != item.get("primary_category") for c in additional), key + ": invalid additional_categories")
        section_ids = item.get("section_ids", [])
        require(isinstance(section_ids, list), key + ": invalid section_ids")
        if isinstance(section_ids, list):
            for sid in section_ids:
                section = section_map.get(sid) if isinstance(sid, str) else None
                require(bool(section) and section.get("status") == "active", key + ": unknown/inactive section")
                if section:
                    require(section.get("category") == item.get("primary_category") or section.get("category") in additional, key + ": section/category mismatch")
        for field in ["tags", "search_aliases", "contact_keys", "platforms"]:
            value = item.get(field, [])
            require(isinstance(value, list) and all(isinstance(s, str) and s.strip() for s in value), key + ": invalid " + field)
        for field in ["launch_url", "download_url", "repository_url", "youtube_url"]:
            if item.get(field) is not None:
                require(https(item[field]), key + ": invalid " + field)
        thumb = item.get("thumbnail")
        if thumb is not None:
            require(isinstance(thumb, dict) and set(thumb) <= {"url", "alt"} and https(thumb.get("url")) and isinstance(thumb.get("alt"), str) and bool(thumb["alt"].strip()), key + ": invalid thumbnail")
        references = item.get("public_references", [])
        require(isinstance(references, list), key + ": invalid public_references")
        if isinstance(references, list):
            for ref in references:
                require(isinstance(ref, dict) and set(ref) <= {"title", "url", "locator"} and https(ref.get("url")) and isinstance(ref.get("title"), str), key + ": invalid public reference")
        if kind == "video":
            yid = item.get("youtube_id")
            require(isinstance(yid, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{11}", yid)), key + ": invalid youtube_id")
            if isinstance(yid, str):
                require(yid not in youtube_ids, key + ": duplicate youtube_id"); youtube_ids.add(yid)
                if item.get("youtube_url"):
                    require(item["youtube_url"] == "https://www.youtube.com/watch?v=" + yid, key + ": youtube_url must match youtube_id")
            require(item.get("access") in {"public", "members", "purchase"}, key + ": invalid access")
            require(item.get("embed_status") in {"allowed", "blocked", "unknown"}, key + ": invalid embed_status")
            if "format" in item:
                require(item["format"] in {"long", "short", "live-replay"}, key + ": invalid format")
            duration = item.get("duration_seconds")
            require(duration is None or (type(duration) is int and duration >= 0), key + ": invalid duration")
            chapters = item.get("chapters", [])
            previous = -1
            if not isinstance(chapters, list):
                errors.append(key + ": chapters must be an array"); chapters = []
            for chapter in chapters:
                if not isinstance(chapter, dict):
                    errors.append(key + ": invalid chapter"); continue
                start = chapter.get("start_seconds")
                valid = type(start) is int and start >= 0 and start > previous
                require(set(chapter) <= {"label", "start_seconds"} and valid and isinstance(chapter.get("label"), str) and bool(chapter["label"].strip()), key + ": invalid chapter order/label")
                if valid:
                    if type(duration) is int:
                        require(start < duration, key + ": chapter exceeds duration")
                    previous = start
        elif kind == "article":
            require(item.get("article_type") in {"analysis", "reference", "event"}, key + ": invalid article_type")
        elif kind == "tool":
            state = item.get("availability")
            require(state in {"available", "trial", "development", "retired"}, key + ": invalid availability")
            if state in {"available", "trial"}:
                require(bool(item.get("launch_url") or item.get("download_url")), key + ": usable tool needs an entry URL")
                require(date(item.get("verified_at")) and bool(item.get("version")), key + ": usable tool needs verification and version")
        elif kind == "course":
            require(all(k in contact_keys for k in item.get("contact_keys", []) if isinstance(k, str)), key + ": unknown contact key")
            offers = item.get("offers", [])
            require(isinstance(offers, list), key + ": offers must be an array")
            if isinstance(offers, list):
                for offer in offers:
                    if not isinstance(offer, dict):
                        errors.append(key + ": invalid offer"); continue
                    require(set(offer) <= {"type", "amount", "currency", "conditions", "verified_at", "valid_until"}, key + ": unknown offer field")
                    require(offer.get("type") in {"purchase", "membership"}, key + ": invalid offer type")
                    require(type(offer.get("amount")) in {int, float} and math.isfinite(offer["amount"]) and offer["amount"] >= 0, key + ": invalid amount")
                    require(isinstance(offer.get("currency"), str) and bool(re.fullmatch(r"[A-Z]{3}", offer["currency"])), key + ": invalid currency")
                    require(date(offer.get("verified_at")), key + ": unverified offer")
                    if offer.get("valid_until") is not None:
                        require(date(offer["valid_until"]), key + ": invalid offer expiry")
        # Reject nonempty rich structures until their nested contracts exist.
        for field in ["transcript", "timeline", "corrections", "downloads", "modules", "release_notes"]:
            if field in item:
                require(item[field] in (None, [], ""), key + ": nested schema not implemented for " + field)
    for identity, item in by_id.items():
        for field, expected_kind in [("related_ids", None), ("topic_ids", "topic"), ("series_ids", "series"), ("preview_ids", "video"), ("follow_up_ids", None)]:
            refs = item.get(field, [])
            require(isinstance(refs, list), identity + ": invalid " + field)
            if not isinstance(refs, list):
                continue
            require(all(isinstance(r, str) for r in refs), identity + ": reference ids must be strings")
            if not all(isinstance(r, str) for r in refs):
                continue
            require(len(refs) == len(set(refs)), identity + ": duplicate references")
            for ref in refs:
                require(ref != identity and ref in by_id, identity + ": unresolved/self reference " + ref)
                if expected_kind and ref in by_id:
                    require(by_id[ref]["kind"] == expected_kind, identity + ": wrong reference kind")
        if item["kind"] in {"series", "topic"}:
            members = item.get("items", [])
            require(isinstance(members, list), identity + ": members must be an array")
            if not isinstance(members, list):
                continue
            seen, orders = set(), set()
            for member in members:
                if not isinstance(member, dict):
                    errors.append(identity + ": invalid member"); continue
                ref, order = member.get("content_id"), member.get("order")
                require(set(member) <= {"content_id", "order", "episode_label"}, identity + ": unknown member field")
                require(isinstance(ref, str) and ref in by_id and ref != identity and ref not in seen, identity + ": invalid/duplicate member")
                require(type(order) is int and order > 0 and order not in orders, identity + ": invalid/duplicate order")
                if isinstance(ref, str): seen.add(ref)
                if type(order) is int: orders.add(order)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--structure-only", action="store_true")
    parser.add_argument("--catalog", type=Path, default=ROOT / "content/catalog.json")
    args = parser.parse_args()
    try:
        taxonomy = json.loads((ROOT / "content/taxonomy.json").read_text())
        catalog = json.loads(args.catalog.read_text())
        contacts = json.loads((ROOT / "content/contacts.json").read_text())
        errors = validate(taxonomy, catalog, contacts)
    except (OSError, ValueError, TypeError) as exc:
        print(json.dumps({"status": "FAIL", "errors": [str(exc)]}, ensure_ascii=False)); return 1
    status = "FAIL" if errors else "STRUCTURE_PASS" if args.structure_only else "INCOMPLETE" if not catalog["items"] else "CATALOG_PASS"
    print(json.dumps({"status": status, "items": len(catalog.get("items", [])), "errors": errors, "limit": "Does not verify facts, permissions, source coverage, live URLs, contacts or software execution."}, ensure_ascii=False))
    return 1 if errors else 2 if status == "INCOMPLETE" else 0


if __name__ == "__main__":
    sys.exit(main())
