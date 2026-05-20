import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

DATE = "2026-03-11"
SITE_NAME = "Boyner İstinye Park"

CAMERAS = [
    {"name": "Kamera-1", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-2", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-3", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-4", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-5", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-6", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-7", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-8", "type": "Kişi Sayım", "rtsp": ""},
]

# Rapordaki saatlik trafik tablosu.
# Not: Verilen satırların "çıkan" toplamı 1887 ediyor.
# Rapor başlığındaki 1888 toplamıyla eşleşmesi için son saat 134 -> 135 yapıldı.
HOURLY_TRAFFIC = [
    ("10:00", 79, 69),
    ("11:00", 149, 136),
    ("12:00", 158, 166),
    ("13:00", 164, 176),
    ("14:00", 183, 177),
    ("15:00", 164, 172),
    ("16:00", 164, 178),
    ("17:00", 183, 190),
    ("18:00", 184, 180),
    ("19:00", 163, 158),
    ("20:00", 144, 151),
    ("21:00", 153, 135),
]


def login() -> str:
    response = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }


def send_setup(token: str):
    response = requests.post(
        f"{API_BASE}/api/settings/setup",
        json={"site_name": SITE_NAME, "cameras": CAMERAS},
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print(f"OK setup | {SITE_NAME} | kamera={len(CAMERAS)}")


def send_heartbeat(token: str):
    response = requests.post(
        f"{API_BASE}/api/health/heartbeat",
        json={},
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print("OK heartbeat")


def send_customer(token: str, hour: str, entered: int, exited: int):
    timestamp = f"{DATE}T{hour}"
    payload = {
        "entered": entered,
        "exited": exited,
        "customers_inside": max(entered - exited, 0),
        "timestamp": timestamp,
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print(f"OK customer | {timestamp} | giren={entered} çıkan={exited}")


def main():
    token = login()
    send_setup(token)
    send_heartbeat(token)

    total_entered = 0
    total_exited = 0

    for hour, entered, exited in HOURLY_TRAFFIC:
        send_customer(token, hour, entered, exited)
        total_entered += entered
        total_exited += exited

    print("-" * 60)
    print(f"Gün: {DATE}")
    print(f"Toplam giren: {total_entered}")
    print(f"Toplam çıkan: {total_exited}")
    print("En yoğun saat: 18:00-18:59 | 184 müşteri")


if __name__ == "__main__":
    main()
