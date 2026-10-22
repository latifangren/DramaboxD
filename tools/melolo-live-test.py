#!/usr/bin/env python3
"""Tes live API Melolo (api.tmtreader.com) — hasil reverse APK 5.1.8.
Alur: search -> directory (daftar episode) -> video_model per item -> URL stream MP4.
video_model: POST JSON {video_id: <item_id>, biz_param: {video_platform: 1024 (Mixed),
need_all_video_definition: true, use_os_player: false, video_id_type: 0 (VideoId),
caller_scene: "series"}} + params umum app_id/version_name/device_id. Tanpa signing MetaSec.
main_url di video_list ter-base64; video_duration & poster_url ada di model.
"""
import base64, json, sys, urllib.parse, urllib.request

BASE = "https://api.tmtreader.com"
PARAMS = {"app_id": "645713", "version_name": "5.1.8", "device_id": "7268586056781432322"}
UA = {"User-Agent": "okhttp/4.12.0"}

def get(path, extra):
    url = BASE + path + "?" + urllib.parse.urlencode({**PARAMS, **extra})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.loads(r.read())

def video_model(item_id):
    url = BASE + "/novel/player/video_model/v1/?" + urllib.parse.urlencode(PARAMS)
    body = json.dumps({
        "video_id": str(item_id),
        "biz_param": {"video_platform": 1024, "need_all_video_definition": True,
                      "use_os_player": False, "video_id_type": 0, "caller_scene": "series"},
    }).encode()
    req = urllib.request.Request(url, data=body, headers={**UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def best_stream(model):
    entries = sorted(model["video_list"].values(), key=lambda v: v.get("vheight", 0))
    v = entries[-1]
    return v["definition"], base64.b64decode(v["main_url"]).decode()

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "love"
    s = get("/i18n_novel/search/page/v1/", {"query": q, "offset": 0, "count": 5})
    book = s["data"]["search_data"][0]["books"][0]
    bid = book["book_id"]
    print(f"Seri: {book['book_name']} ({bid}), {book.get('serial_count')} episode")
    d = get("/i18n_novel/book/directory/info/v1/", {"book_id": bid})
    items = d["data"]["item_list"]
    print(f"Directory: {len(items)} item, paid: {len(d['data'].get('paid_item_id_set') or [])}")
    for iid in items[:2]:
        vm = video_model(iid)
        model = json.loads(vm["data"]["video_model"])
        definition, url = best_stream(model)
        print(f"  item {iid}: {definition} dur={model.get('video_duration')}s {url[:100]}...")
