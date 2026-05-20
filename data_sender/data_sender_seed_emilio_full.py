import requests
from datetime import datetime, timedelta

API_BASE = "https://ai.vislivis.com"
USERNAME = "emilio"
PASSWORD = "emilio"

START_DATE = datetime(2026, 3, 1, 10, 0)
END_DATE = datetime(2026, 3, 13, 14, 0)

SITE_NAME = "Emilio Demo Magaza"

CAMERAS = [
    {"name": "Kamera-1", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "Kamera-2", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "Kamera-3", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "Kamera-4", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "cam1", "type": "Kasa Analizi", "rtsp": ""},
    {"name": "cam4", "type": "Kasa Analizi", "rtsp": ""},
    {"name": "cam2", "type": "Isi Haritasi", "rtsp": ""},
    {"name": "cam3", "type": "Isi Haritasi", "rtsp": ""},
]

HEATMAP_ZONES = {
    "cam2": ["Giris-Alan-1", "Giris-Alan-2", "Giris-Alan-3", "Giris-Alan-4", "Giris-Alan-5"],
    "cam3": ["Giyim-Alan-1", "Giyim-Alan-2", "Giyim-Alan-3"],
}

CASHIERS = ["cam1", "cam4"]


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


def send_customer(token: str, ts: str, entered: int, exited: int, female: int, male: int, age_18_30: int, age_30_50: int, age_50_plus: int):
    payload = {
        "entered": entered,
        "exited": exited,
        "customers_inside": max(entered - exited, 0),
        "female_count": female,
        "male_count": male,
        "age_18_30": age_18_30,
        "age_30_50": age_30_50,
        "age_50_plus": age_50_plus,
        "timestamp": ts,
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()


def send_heatmap(token: str, ts: str, date_str: str, camera_id: str, zone: str, visitor_count: int, intensity: float):
    payload = {
        "zone": zone,
        "visitor_count": visitor_count,
        "intensity": intensity,
        "camera_id": camera_id,
        "timestamp": ts,
        "date_recorded": date_str,
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()


def send_queue(token: str, ts: str, cashier_id: str, total_customers: int, wait_time: float):
    payload = {
        "cashier_id": cashier_id,
        "total_customers": total_customers,
        "wait_time": wait_time,
        "timestamp": ts,
        "status": "completed",
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/queues",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()


def iter_business_hours():
    current_day = START_DATE.date()
    end_day = END_DATE.date()
    while current_day <= end_day:
        start_hour = 10
        end_hour = 22
        if current_day == END_DATE.date():
            end_hour = END_DATE.hour
        for hour in range(start_hour, end_hour + 1):
            yield datetime(current_day.year, current_day.month, current_day.day, hour, 0)
        current_day += timedelta(days=1)


def customer_profile(hour_dt: datetime):
    hour = hour_dt.hour
    day_seed = hour_dt.day * 17

    hour_curve = {
        10: 72,
        11: 96,
        12: 128,
        13: 152,
        14: 176,
        15: 214,
        16: 188,
        17: 198,
        18: 184,
        19: 146,
        20: 132,
        21: 118,
        22: 94,
    }
    entered = hour_curve.get(hour, 90) + (day_seed % 11)
    exited = max(entered - ((hour + day_seed) % 19 - 9), 0)

    female = round(entered * 0.53)
    male = entered - female

    age_18_30 = round(entered * 0.23)
    age_30_50 = round(entered * 0.47)
    age_50_plus = max(entered - age_18_30 - age_30_50, 0)

    return entered, exited, female, male, age_18_30, age_30_50, age_50_plus


def queue_profile(hour_dt: datetime, cashier_id: str):
    hour = hour_dt.hour
    day_seed = hour_dt.day * 13
    if cashier_id == "cam1":
        base = {
            10: 14, 11: 28, 12: 74, 13: 96, 14: 128, 15: 156,
            16: 148, 17: 134, 18: 122, 19: 68, 20: 58, 21: 49, 22: 41,
        }
        wait = 55 + max(hour - 11, 0) * 6 + (day_seed % 9)
    else:
        base = {
            10: 18, 11: 24, 12: 52, 13: 77, 14: 88, 15: 103,
            16: 97, 17: 92, 18: 84, 19: 57, 20: 49, 21: 44, 22: 36,
        }
        wait = 42 + max(hour - 11, 0) * 5 + (day_seed % 7)
    total_customers = base.get(hour, 25) + (day_seed % 6)
    return total_customers, float(wait)


def heatmap_profile(hour_dt: datetime, camera_id: str, zone_index: int):
    hour = hour_dt.hour
    day_seed = hour_dt.day * 19
    if camera_id == "cam2":
        base_visitors = [34, 26, 58, 71, 43][zone_index]
        base_dwell = [11.5, 26.0, 14.0, 12.5, 18.0][zone_index]
    else:
        base_visitors = [28, 19, 24][zone_index]
        base_dwell = [12.0, 18.0, 16.0][zone_index]

    peak_boost = max(0, 6 - abs(15 - hour)) * (6 if camera_id == "cam2" else 4)
    visitor_count = base_visitors + peak_boost + (day_seed % 8)
    intensity = base_dwell + ((hour + zone_index + day_seed) % 5) * 3.7
    return visitor_count, round(intensity, 1)


def main():
    token = login()
    send_setup(token)

    total_customer_rows = 0
    total_heatmap_rows = 0
    total_queue_rows = 0

    for hour_dt in iter_business_hours():
        ts = hour_dt.isoformat(timespec="minutes")
        date_str = hour_dt.strftime("%Y-%m-%d")

        send_heartbeat(token)

        entered, exited, female, male, age_18_30, age_30_50, age_50_plus = customer_profile(hour_dt)
        send_customer(token, ts, entered, exited, female, male, age_18_30, age_30_50, age_50_plus)
        total_customer_rows += 1

        for cashier_id in CASHIERS:
            total_customers, wait_time = queue_profile(hour_dt, cashier_id)
            send_queue(token, ts, cashier_id, total_customers, wait_time)
            total_queue_rows += 1

        for camera_id, zones in HEATMAP_ZONES.items():
            for zone_index, zone in enumerate(zones):
                visitor_count, intensity = heatmap_profile(hour_dt, camera_id, zone_index)
                send_heatmap(token, ts, date_str, camera_id, zone, visitor_count, intensity)
                total_heatmap_rows += 1

        print(f"OK hour | {ts} | customer=1 queue=2 heatmap={sum(len(z) for z in HEATMAP_ZONES.values())}")

    print("-" * 60)
    print(f"Seed tamamlandi | {USERNAME}")
    print(f"Tarih araligi: {START_DATE.strftime('%Y-%m-%d %H:%M')} -> {END_DATE.strftime('%Y-%m-%d %H:%M')}")
    print(f"Customer rows: {total_customer_rows}")
    print(f"Queue rows: {total_queue_rows}")
    print(f"Heatmap rows: {total_heatmap_rows}")


if __name__ == "__main__":
    main()
