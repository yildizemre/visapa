#!/usr/bin/env python3
"""
Belirli kullanıcılar için günlük dummy veri üretir.

Kullanım (local veya VDS, backend çalışıyorken):

  cd backend
  python dummy_data_job.py

Notlar:
- Admin kullanıcısı ile login olur, /api/admin/users üzerinden user id'leri çeker,
  sonra her kullanıcı için /api/admin/users/{id}/impersonate ile o kullanıcı adına token alır.
- Saat 10:00 - 22:00 arası her saat için:
  - /api/analytics/customers  (giren/çıkan)
  - /api/analytics/heatmaps   (ziyaretçi / yoğunluk)
  - /api/analytics/queues     (kuyruk verisi)
"""

import argparse
import random
import sys
from datetime import date

import requests

API_BASE = "http://127.0.0.1:5000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"

# Dummy veri basılacak kullanıcı adları (Admin panelindeki "Kullanıcı" kolonu)
# LOCAL geliştirirken bu listeyi boş bırakırsan: admin hariç TÜM kullanıcılar için dummy veri basar.
DEMO_USERNAMES: list[str] = [
    # Örnek: sadece belirli kullanıcılar için basmak istersen buraya ekleyebilirsin.
    # "kasim",
    # "Abdullah",
    # "nike",
    # "defacto-tum-avmler-yonetim",
    # "defacto-avm2",
    # "defacto-avm1",
    # "beymen",
]


def admin_login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def list_users(admin_token: str) -> dict[str, int]:
    """Tüm kullanıcıları çekip username -> id map döndürür."""
    params = {"page": 1, "per_page": 200}
    r = requests.get(
        f"{API_BASE}/api/admin/users",
        params=params,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    mapping: dict[str, int] = {}
    for u in data.get("users", []):
        username = u.get("username")
        uid = u.get("id")
        if username and uid:
            mapping[str(username)] = int(uid)
    return mapping


def impersonate(admin_token: str, user_id: int) -> str:
    r = requests.post(
        f"{API_BASE}/api/admin/users/{user_id}/impersonate",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def rand_between(a: int, b: int) -> int:
    return random.randint(a, b)


def send_customer_sample(token: str, ts: str) -> None:
    payload = {
        "entered": rand_between(5, 40),
        "exited": rand_between(3, 35),
        "timestamp": ts,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()


def send_heatmap_sample(token: str, ts: str) -> None:
    zones = ["genel", "kasa-alani", "erkek-giyim", "kadin-giyim"]
    zone = random.choice(zones)
    payload = {
        "zone": zone,
        "visitor_count": rand_between(10, 80),
        "intensity": float(rand_between(20, 90)),
        "timestamp": ts,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()


def send_queue_sample(token: str, ts: str) -> None:
    cashiers = ["Kasa-1", "Kasa-2"]
    cashier = random.choice(cashiers)
    payload = {
        "cashier_id": cashier,
        "total_customers": rand_between(5, 30),
        "wait_time": float(rand_between(20, 120)),
        "status": "completed",
        "timestamp": ts,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/queues",
        json=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    r.raise_for_status()


def main() -> None:
    global API_BASE, ADMIN_USERNAME, ADMIN_PASSWORD

    parser = argparse.ArgumentParser(description="Seçili kullanıcılar için günlük dummy veri üretir.")
    parser.add_argument(
        "--url",
        type=str,
        default=API_BASE,
        help="Backend API base URL (örn: http://127.0.0.1:5000 veya http://ai.vislivis.com:5000)",
    )
    parser.add_argument(
        "--admin-user",
        type=str,
        default=ADMIN_USERNAME,
        help="Admin kullanıcı adı (varsayılan: admin)",
    )
    parser.add_argument(
        "--admin-pass",
        type=str,
        default=ADMIN_PASSWORD,
        help="Admin şifresi (varsayılan: admin)",
    )
    args = parser.parse_args()

    API_BASE = args.url.rstrip("/")
    ADMIN_USERNAME = args.admin_user
    ADMIN_PASSWORD = args.admin_pass

    today: date = date.today()
    date_str = today.strftime("%Y-%m-%d")
    print(f"[dummy_data_job] Tarih: {date_str}")
    try:
        admin_token = admin_login()
    except Exception as e:
        print(f"[dummy_data_job] Admin login başarısız: {e}")
        sys.exit(1)

    try:
        user_map = list_users(admin_token)
    except Exception as e:
        print(f"[dummy_data_job] Kullanıcı listesi alınamadı: {e}")
        sys.exit(1)

    print(f"[dummy_data_job] Toplam kullanıcı: {len(user_map)}")

    # Hedef kullanıcı listesi:
    # - DEMO_USERNAMES boş ise: admin hariç tüm kullanıcılar
    # - Dolu ise: sadece o listedekiler
    if DEMO_USERNAMES:
        target_usernames = DEMO_USERNAMES
    else:
        target_usernames = [u for u in user_map.keys() if u != ADMIN_USERNAME]

    for username in target_usernames:
        uid = user_map.get(username)
        if not uid:
            print(f"[dummy_data_job] Uyarı: '{username}' isimli kullanıcı bulunamadı, atlanıyor.")
            continue
        try:
            user_token = impersonate(admin_token, uid)
        except Exception as e:
            print(f"[dummy_data_job] '{username}' için impersonate hatası: {e}")
            continue

        print(f"[dummy_data_job] Kullanıcı: {username} (id={uid}) için dummy veri basılıyor...")

        for hour in range(10, 23):  # 10:00 - 22:00
            ts = f"{date_str}T{hour:02d}:00"
            try:
                send_customer_sample(user_token, ts)
                send_heatmap_sample(user_token, ts)
                send_queue_sample(user_token, ts)
            except Exception as e:
                print(f"  - {ts} için hata: {e}")
            else:
                print(f"  - {ts} için kayıt eklendi.")

    print("[dummy_data_job] Tamamlandı.")


if __name__ == "__main__":
    main()

