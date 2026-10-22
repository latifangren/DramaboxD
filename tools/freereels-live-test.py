#!/usr/bin/env python3
"""Tes live API FreeReels (apiv2.free-reels.com) — bikin sesi tamu sendiri, tanpa kredensial tersimpan.

Alur (hasil reverse HeaderInterceptor + AccountRepository + DeviceIdManager):
  1. POST /frv2-api/anonymous/login
     body {"device_id": <UUID>, "device_name": "<BRAND> <MODEL>",
           "sign": md5_hex("8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv" + device_id)}
     + header perangkat lengkap (app-name=com.freereels.app wajib ada)
     -> data.auth_key (oauth_token) + data.auth_secret (oauth_secret)
  2. Header Authorization per request:
     oauth_signature=<md5_hex("8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv&" + auth_secret)>,oauth_token=<auth_key>,ts=<millis>
  3. Endpoint konten: POST /search/drama, POST /search/hot-list-v2,
     GET /search/trending_searches, GET /drama/info_v2?series_id=
"""
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = "https://apiv2.free-reels.com/frv2-api"
KEY = "8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv"
DEVICE_ID = str(uuid.uuid4())


def headers(token=None, secret=None):
    h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "okhttp/4.12.0",
        "language": "en-US",
        "app-display-lang": "en-US",
        "country": "US",
        "timezone": "7",
        "network-type": "wifi",
        "screen-width": "1080",
        "screen-height": "2400",
        "is-mainland": "false",
        "device-country": "US",
        "device-language": "en-US",
        "x-device-model": "Pixel 8",
        "x-device-manufacturer": "Google",
        "x-device-brand": "google",
        "x-device-product": "shiba",
        "x-device-fingerprint": "google/shiba/shiba:14/AP2A.240905.003/12231197:user/release-keys",
        "session-id": str(uuid.uuid4()),
        "gaid": "",
        "app-name": "com.freereels.app",
        "app-version": "2.3.40",
        "device-id": DEVICE_ID,
        "device-version": "34",
        "device": "android",
    }
    if token:
        sig = hashlib.md5((KEY + "&" + secret).encode()).hexdigest()
        h["Authorization"] = f"oauth_signature={sig},oauth_token={token},ts={int(time.time() * 1000)}"
    return h


def call(method, path, body=None, token=None, secret=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=headers(token, secret), method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    sign = hashlib.md5((KEY + DEVICE_ID).encode()).hexdigest()
    st, resp = call(
        "POST",
        "/anonymous/login",
        {"device_id": DEVICE_ID, "device_name": "Google Pixel 8", "sign": sign},
    )
    print("login:", st, resp.get("code"), resp.get("message"))
    data = resp["data"]
    token, secret = data["auth_key"], data["auth_secret"]
    print("user_id:", data["user_id"], "(guest)")

    ts = str(int(time.time() * 1000))
    st, hot = call("POST", "/search/hot-list-v2", {"next": None, "timestamp": ts}, token, secret)
    print("hot-list:", st, hot.get("code"), "items:", len(hot.get("data", {}).get("items", [])))

    kw = sys.argv[1] if len(sys.argv) > 1 else "love"
    st, sr = call("POST", "/search/drama", {"keyword": kw, "next": None, "timestamp": ts}, token, secret)
    items = sr.get("data", {}).get("items", [])
    print(f"search '{kw}':", st, sr.get("code"), "items:", len(items))
    if not items:
        return
    first = items[0]
    print("first:", first["id"], first["name"], "episodes:", first.get("episode_count"))

    st, info = call("GET", f"/drama/info_v2?series_id={first['id']}", token=token, secret=secret)
    d = info.get("data", {}).get("info", {})
    eps = d.get("episode_list", [])
    ep = d.get("episode", {})
    print("info_v2:", st, info.get("code"), "episode_list:", len(eps))
    print("episode 1 m3u8 (external_audio_h264):", (ep.get("external_audio_h264_m3u8") or "")[:110])
    print("episode 1 duration:", ep.get("duration"), "unlock:", ep.get("unlock"))


if __name__ == "__main__":
    main()
