#!/usr/bin/env python3
"""
Sadece **bir kullanıcı** için (varsayılan: nike) BUGÜNE dummy data basar.

Kullanım (local):

  cd backend
  python nike_dummy_today.py

İsteğe bağlı parametreler:

  python nike_dummy_today.py --user nike --password nike --url http://127.0.0.1:5000
"""

import argparse
import random
from datetime import date

import requests


def login(api_base: str, username: str, password: str) -> str:
  r = requests.post(
    f"{api_base}/api/auth/login",
    json={"username": username, "password": password},
    headers={"Content-Type": "application/json"},
    timeout=10,
  )
  r.raise_for_status()
  return r.json()["access_token"]


def rand(a: int, b: int) -> int:
  return random.randint(a, b)


def send_customer(api_base: str, token: str, ts: str) -> None:
  payload = {
    "entered": rand(5, 40),
    "exited": rand(3, 35),
    "timestamp": ts,
  }
  r = requests.post(
    f"{api_base}/api/analytics/customers",
    json=payload,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    timeout=10,
  )
  r.raise_for_status()


def send_heatmap(api_base: str, token: str, ts: str) -> None:
  zones = ["genel", "kasa-alani", "erkek-giyim", "kadin-giyim"]
  zone = random.choice(zones)
  payload = {
    "zone": zone,
    "visitor_count": rand(10, 80),
    "intensity": float(rand(20, 90)),
    "timestamp": ts,
  }
  r = requests.post(
    f"{api_base}/api/analytics/heatmaps",
    json=payload,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    timeout=10,
  )
  r.raise_for_status()


def send_queue(api_base: str, token: str, ts: str) -> None:
  cashiers = ["Kasa-1", "Kasa-2"]
  cashier = random.choice(cashiers)
  payload = {
    "cashier_id": cashier,
    "total_customers": rand(5, 25),
    "wait_time": float(rand(20, 120)),
    "status": "completed",
    "timestamp": ts,
  }
  r = requests.post(
    f"{api_base}/api/analytics/queues",
    json=payload,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    timeout=10,
  )
  r.raise_for_status()


def main() -> None:
  parser = argparse.ArgumentParser(description="Tek bir kullanıcı için (örn. nike) bugüne dummy data basar.")
  parser.add_argument("--url", type=str, default="http://127.0.0.1:5000", help="API base URL (örn. http://127.0.0.1:5000)")
  parser.add_argument("--user", type=str, default="nike", help="Kullanıcı adı (varsayılan: nike)")
  parser.add_argument("--password", type=str, default="nike", help="Şifre (varsayılan: nike)")
  args = parser.parse_args()

  api_base = args.url.rstrip("/")

  print(f"[nike_dummy_today] API: {api_base} | user={args.user}")

  token = login(api_base, args.user, args.password)

  today = date.today().strftime("%Y-%m-%d")
  print(f"[nike_dummy_today] Tarih: {today}")

  for hour in range(10, 23):  # 10:00 - 22:00
    ts = f"{today}T{hour:02d}:00"
    try:
      send_customer(api_base, token, ts)
      send_heatmap(api_base, token, ts)
      send_queue(api_base, token, ts)
    except Exception as e:
      print(f"  - {ts}: HATA: {e}")
    else:
      print(f"  - {ts}: OK")

  print("[nike_dummy_today] Bitti.")


if __name__ == "__main__":
  main()

