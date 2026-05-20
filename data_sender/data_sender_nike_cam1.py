#!/usr/bin/env python3
"""
Nike kullanıcısı için örnek kişi sayım verisi gönderir (kamera bazlı).

Kullanım (local backend çalışıyorken):

  cd data_sender
  python data_sender_nike_cam1.py

İsteğe bağlı:

  python data_sender_nike_cam1.py --url http://127.0.0.1:5000
"""

import argparse
import json
import os
import sys

import requests

API_BASE = "http://127.0.0.1:5000"
USERNAME = "nike"
PASSWORD = "nike"

DIR = os.path.dirname(os.path.abspath(__file__))


def login(api_base: str, username: str, password: str) -> str:
    r = requests.post(
        f"{api_base}/api/auth/login",
        json={"username": username, "password": password},
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send_customer_data(api_base: str, token: str, payload: dict) -> dict:
    base = {
        "entered": int(payload.get("entered") or 0),
        "exited": int(payload.get("exited") or 0),
    }
    # Kamera ve zaman bilgisini aynen ilet
    for k in ("camera_id", "location", "zone_visited"):
        if payload.get(k) is not None:
            base[k] = payload[k]
    if payload.get("timestamp"):
        base["timestamp"] = payload["timestamp"]

    r = requests.post(
        f"{api_base}/api/analytics/customers",
        json=base,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Nike için kamera bazlı kişi sayım verisi gönderir.")
    parser.add_argument(
        "--url",
        type=str,
        default=API_BASE,
        help="API base URL (örn. http://127.0.0.1:5000 veya http://ai.vislivis.com:5000)",
    )
    parser.add_argument(
        "-j",
        "--json",
        type=str,
        default="payload_nike_cam1.json",
        help="Payload JSON dosya adı (varsayılan: payload_nike_cam1.json)",
    )
    args = parser.parse_args()

    api_base = args.url.rstrip("/")

    path = args.json if os.path.isabs(args.json) else os.path.join(DIR, args.json)
    try:
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except FileNotFoundError:
        print(f"Hata: Payload dosyası bulunamadı: {path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Hata: Geçersiz JSON - {e}")
        sys.exit(1)

    try:
        token = login(api_base, USERNAME, PASSWORD)
        result = send_customer_data(api_base, token, payload)
        print(f"OK | kamera={payload.get('camera_id')} giren={payload.get('entered')} çıkan={payload.get('exited')} | id={result.get('id')}")
    except requests.RequestException as e:
        print(f"Hata: {e}")
        if hasattr(e, "response") and e.response is not None:
            try:
                err = e.response.json()
                print(f"  {err.get('error', e.response.text)}")
            except Exception:
                print(f"  {e.response.text}")
        sys.exit(1)


if __name__ == "__main__":
    main()

