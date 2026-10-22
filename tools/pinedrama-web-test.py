#!/usr/bin/env python3
"""Tes live jalur WEB PineDrama (pinedrama.com) — hasil uji 22 Okt 2026.
Situs = Next.js; halaman seri/episode membawa payload RSC berisi episode_list
(can_play per episode). URL putar dari API same-origin:
  GET /api/episode/getEpisodePlayUrl?series_slug=<slug>&language=en&episode_id=<n>
  -> {code:200, data:{url: "<mp4 bertanda tangan di v.pinedrama.com>"}}
Episode terkunci -> {code:500, msg:"Episode unavailable"}.
CATATAN: (1) Python urllib kena blokir fingerprint TLS oleh CDN (404) — skrip ini
mungkin gagal di langkah ambil halaman; curl dan Node fetch lolos (terverifikasi).
(2) Fetch langsung file MP4 dari curl dibalas HTTP 500 (semua varian header dicoba);
pemutaran di browser asli terverifikasi jalan. Lihat docs/teardown-pinedrama-47.1.4.md.
"""
import json, re, sys, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0",
      "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"}
BASE = "https://pinedrama.com"

def get(url, headers=None):
    last = None
    for _ in range(3):  # situs kadang membalas kosong/404 sesaat dari jaringan ini
        try:
            req = urllib.request.Request(url, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
    raise last

def series_info(slug):
    html = get(f"{BASE}/dramas/{slug}/ep1")
    m = re.search(r'"episode_list\\":(\[.*?\])', html)
    eps = json.loads(m.group(1).replace('\\"', '"')) if m else []
    name = re.search(r'"name\\":\\"([^"\\]+)\\"', html)
    return (name.group(1) if name else slug), eps

def play_url(slug, ep):
    q = urllib.parse.urlencode({"series_slug": slug, "language": "en", "episode_id": ep})
    return json.loads(get(f"{BASE}/api/episode/getEpisodePlayUrl?{q}",
                          {"Referer": f"{BASE}/dramas/{slug}/ep{ep}"}))

if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "my-husband-murdered-me"
    name, eps = series_info(slug)
    print(f"Seri: {name} — episode bisa dimainkan (can_play): {[e['episode_id'] for e in eps]}")
    for e in eps[:2]:
        r = play_url(slug, e["episode_id"])
        print(f"  ep{e['episode_id']}: code={r['code']} url={r['data']['url'][:100]}...")
    locked = play_url(slug, 10)
    print(f"  ep10 (terkunci): code={locked['code']} msg={locked.get('msg')}")
