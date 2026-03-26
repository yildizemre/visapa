import math
import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

DATE = "2026-03-05"
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

HOURLY_TRAFFIC = [
    ("10:00", 85, 60),
    ("11:00", 88, 88),
    ("12:00", 132, 132),
    ("13:00", 156, 177),
    ("14:00", 199, 187),
    ("15:00", 271, 275),
    ("16:00", 190, 177),
    ("17:00", 223, 202),
    ("18:00", 196, 190),
    ("19:00", 162, 164),
    ("20:00", 191, 175),
    ("21:00", 79, 93),
]

TOTAL_ENTERED = 1972
TOTAL_EXITED = 1972
TOTAL_FEMALE = 1066
TOTAL_MALE = 906

# Backend 3 yaş alanı tuttuğu için rapordaki dağılım konsolide edilir.
TOTAL_AGE_18_30 = 433
TOTAL_AGE_30_50 = 946
TOTAL_AGE_50_PLUS = 593  # 0-12 + 13-17 + 51-64 + 65+


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


def apportion(total: int, weights: list[int]) -> list[int]:
    if total <= 0:
        return [0 for _ in weights]
    weight_sum = sum(weights)
    if weight_sum <= 0:
        base = total // len(weights)
        remainder = total - (base * len(weights))
        result = [base for _ in weights]
        for i in range(remainder):
            result[i] += 1
        return result

    raw = [(total * w) / weight_sum for w in weights]
    ints = [math.floor(x) for x in raw]
    remainder = total - sum(ints)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - ints[i], reverse=True)
    for i in range(remainder):
        ints[order[i]] += 1
    return ints


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


def send_customer(token: str, hour: str, payload: dict):
    timestamp = f"{DATE}T{hour}"
    body = {
        "entered": payload["entered"],
        "exited": payload["exited"],
        "customers_inside": payload["customers_inside"],
        "male_count": payload["male_count"],
        "female_count": payload["female_count"],
        "age_18_30": payload["age_18_30"],
        "age_30_50": payload["age_30_50"],
        "age_50_plus": payload["age_50_plus"],
        "timestamp": timestamp,
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=body,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print(
        f"OK customer | {timestamp} | "
        f"giren={payload['entered']} çıkan={payload['exited']} "
        f"kadın={payload['female_count']} erkek={payload['male_count']} "
        f"18-30={payload['age_18_30']} 30-50={payload['age_30_50']} 50+={payload['age_50_plus']}"
    )


def main():
    token = login()
    send_setup(token)
    send_heartbeat(token)

    entered_weights = [entered for _, entered, _ in HOURLY_TRAFFIC]
    female_by_hour = apportion(TOTAL_FEMALE, entered_weights)
    male_by_hour = apportion(TOTAL_MALE, entered_weights)
    age_18_30_by_hour = apportion(TOTAL_AGE_18_30, entered_weights)
    age_30_50_by_hour = apportion(TOTAL_AGE_30_50, entered_weights)
    age_50_plus_by_hour = apportion(TOTAL_AGE_50_PLUS, entered_weights)

    total_entered = 0
    total_exited = 0

    for idx, (hour, entered, exited) in enumerate(HOURLY_TRAFFIC):
        customers_inside = max(entered - exited, 0)
        payload = {
            "entered": entered,
            "exited": exited,
            "customers_inside": customers_inside,
            "female_count": female_by_hour[idx],
            "male_count": male_by_hour[idx],
            "age_18_30": age_18_30_by_hour[idx],
            "age_30_50": age_30_50_by_hour[idx],
            "age_50_plus": age_50_plus_by_hour[idx],
        }
        send_customer(token, hour, payload)
        total_entered += entered
        total_exited += exited

    print("-" * 60)
    print(f"Gün: {DATE}")
    print(f"Toplam giren: {total_entered}")
    print(f"Toplam çıkan: {total_exited}")
    print(f"Kadın: {sum(female_by_hour)} | Erkek: {sum(male_by_hour)}")
    print(
        f"Yaş grupları: 18-30={sum(age_18_30_by_hour)} "
        f"30-50={sum(age_30_50_by_hour)} 50+={sum(age_50_plus_by_hour)}"
    )
    print("En yoğun saat: 15:00-15:59 | 271 müşteri")


if __name__ == "__main__":
    main()
