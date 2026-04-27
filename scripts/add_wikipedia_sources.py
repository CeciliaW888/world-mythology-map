#!/usr/bin/env python3
"""Add a `wikipedia` source URL to each myth in data/myths.json.

Validates every URL via the Wikipedia REST summary API, prints any 404s.
"""

import json
import subprocess
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MYTHS_FILE = ROOT / "data" / "myths.json"

# Curated map: myth id -> Wikipedia article title (en.wikipedia.org)
SOURCES = {
    1:  "Nüwa",
    2:  "Hou Yi",
    3:  "Yu the Great",
    4:  "Pangu",
    5:  "Chang'e",
    6:  "Jingwei",
    7:  "The Cowherd and the Weaver Girl",
    8:  "Legend of the White Snake",
    9:  "Battle of Zhuolu",
    10: "Kuafu",
    11: "Lady Meng Jiang",
    12: "Nezha",
    13: "Butterfly Lovers",
    14: "Journey to the West",
    15: "Fuxi",

    20: "Prometheus",
    21: "Aphrodite",
    22: "Trojan War",
    23: "Odyssey",
    24: "Icarus",
    25: "Orpheus",
    26: "Theseus",
    27: "Pandora's box",
    28: "Perseus",
    29: "Deucalion",

    30: "Osiris myth",
    31: "Ra",
    32: "Eye of Horus",
    33: "Anubis",
    34: "Sphinx",
    35: "Set (deity)",

    40: "Amaterasu",
    41: "Izanagi",
    42: "Momotarō",
    43: "Yamata no Orochi",
    44: "The Tale of the Bamboo Cutter",
    45: "Urashima Tarō",
    46: "Yuki-onna",
    47: "Mount Fuji",

    50: "Ragnarök",
    51: "Yggdrasil",
    52: "Jörmungandr",
    53: "Loki",
    54: "Odin",
    55: "Fenrir",

    60: "Samudra manthan",
    61: "Ramayana",
    62: "Ganesha",
    63: "Mahabharata",
    64: "Dashavatara",
    65: "Hanuman",

    70: "Epic of Gilgamesh",
    71: "Eridu Genesis",
    72: "Inanna",
    73: "Tiamat",

    75: "Dangun",
    76: "The Tale of Chunhyang",
    77: "Kumiho",

    80: "Quetzalcoatl",
    81: "Five Suns",
    82: "Maya Hero Twins",

    85: "Obatala",
    86: "Shango",
    87: "Anansi",

    88: "Rainbow Serpent",
    89: "Dreamtime",

    90: "Tupi people",  # no single flood-myth article — closest cultural anchor
    91: "Boto",

    92: "Inti",
    93: "Viracocha",

    94: "Tuan mac Cairill",
    95: "Cú Chulainn",
    96: "Children of Lir",

    97: "Baba Yaga",
    98: "Firebird (Slavic folklore)",
    99: "Vasilisa the Beautiful",

    100: "Māui (Māori mythology)",
    101: "Rangi and Papa",

    102: "Illuyanka",
    103: "Gordian Knot",

    104: "Aladdin",
    105: "Sinbad the Sailor",
    106: "One Thousand and One Nights",

    107: "Romulus and Remus",
    108: "Pinocchio",
}


def url_for(title: str) -> str:
    return "https://en.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"), safe="(),'_")


def validate(title: str) -> tuple[bool, str]:
    api = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title.replace(" ", "_"), safe="(),'_")
    try:
        result = subprocess.run(
            ["curl", "-sSL", "-A", "world-mythology-map (validate-sources)", "--max-time", "10", api],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode != 0:
            return False, f"curl failed: {result.stderr.strip()[:80]}"
        data = json.loads(result.stdout)
        if data.get("type") == "disambiguation":
            return False, "disambiguation page"
        if "title" not in data:
            return False, data.get("detail", "no title in response")[:80]
        return True, data["title"]
    except Exception as e:
        return False, str(e)[:80]


def main() -> None:
    myths = json.loads(MYTHS_FILE.read_text())
    failed = []

    for m in myths:
        title = SOURCES.get(m["id"])
        if not title:
            failed.append((m["id"], m["en"], "no mapping"))
            continue
        ok, info = validate(title)
        status = "✓" if ok else "✗"
        print(f"  {status} {m['id']:>3}  {m['en']:<35}  →  {title}  ({info})")
        if ok:
            m["wikipedia"] = url_for(title)
        else:
            failed.append((m["id"], m["en"], f"{title}: {info}"))

    if failed:
        print(f"\n{len(failed)} unresolved:")
        for mid, name, reason in failed:
            print(f"  {mid}  {name}  —  {reason}")

    MYTHS_FILE.write_text(json.dumps(myths, ensure_ascii=False, indent=2) + "\n")
    print(f"\nWrote {MYTHS_FILE}")


if __name__ == "__main__":
    main()
