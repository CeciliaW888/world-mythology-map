#!/usr/bin/env python3
"""For each myth, fetch the lead image from its Wikipedia article via REST summary API."""

import json
import subprocess
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MYTHS_FILE = ROOT / "data" / "myths.json"

UA = "world-mythology-map/1.0 (https://github.com/CeciliaW888/world-mythology-map)"


def get_image(wikipedia_url: str) -> tuple[str, str]:
    """Returns (image_url, status). Tries the larger 'originalimage' first, falls back to thumbnail."""
    title = wikipedia_url.replace("https://en.wikipedia.org/wiki/", "")
    api = "https://en.wikipedia.org/api/rest_v1/page/summary/" + title
    r = subprocess.run(
        ["curl", "-sSL", "-A", UA, "--max-time", "15", api],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return "", f"curl: {r.stderr.strip()[:60]}"
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        return "", "json parse error"
    # Prefer thumbnail (smaller, faster to load) over originalimage
    img = d.get("thumbnail", {}).get("source") or d.get("originalimage", {}).get("source", "")
    return img, "ok" if img else "no image in article"


def main() -> None:
    myths = json.loads(MYTHS_FILE.read_text())
    updated = 0
    failed = []
    for i, m in enumerate(myths):
        wiki = m.get("wikipedia")
        if not wiki:
            failed.append((m["id"], m["en"], "no wikipedia url"))
            continue
        img, status = get_image(wiki)
        if img:
            m["img"] = img
            updated += 1
            print(f"  ✓ {m['id']:>3}  {m['en']:<35}  {img[:80]}")
        else:
            failed.append((m["id"], m["en"], status))
            print(f"  ✗ {m['id']:>3}  {m['en']:<35}  {status}")
        # gentle pace to avoid 429
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

    MYTHS_FILE.write_text(json.dumps(myths, ensure_ascii=False, indent=2) + "\n")
    print(f"\nUpdated {updated}/{len(myths)} images")
    if failed:
        print(f"Failed ({len(failed)}):")
        for mid, en, reason in failed:
            print(f"  {mid:>3}  {en}  —  {reason}")


if __name__ == "__main__":
    main()
