"""
Sabit gün (Europe/Istanbul): 2026-03-25, 10:00–22:00 arası saatlik veri.
Kullanıcı: kasimemre / kasimemre
Modüller: kişi sayımı (yaş + cinsiyet), ısı haritası.
"""
import requests
from datetime import datetime, date
from zoneinfo import ZoneInfo

API_BASE = "https://ai.vislivis.com"
USERNAME = "kasimemre"
PASSWORD = "kasimemre"

TZ = ZoneInfo("Europe/Istanbul")
TARGET_DATE = date(2026, 3, 25)
SITE_NAME = "Kasim Emre Demo"

CAMERAS = [
    {"name": "Kamera-1", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "Kamera-2", "type": "Kisi Sayim", "rtsp": ""},
    {"name": "cam2", "type": "Isi Haritasi", "rtsp": ""},
    {"name": "cam3", "type": "Isi Haritasi", "rtsp": ""},
]

HEATMAP_ZONES = {
    "cam2": ["Giris-Alan-1", "Giris-Alan-2", "Giris-Alan-3", "Giris-Alan-4", "Giris-Alan-5"],
    "cam3": ["Giyim-Alan-1", "Giyim-Alan-2", "Giyim-Alan-3"],
}


def login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


def send_setup(token: str):
    r = requests.post(
        f"{API_BASE}/api/settings/setup",
        json={"site_name": SITE_NAME, "cameras": CAMERAS},
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()
    print(f"OK setup | {SITE_NAME}")


def send_heartbeat(token: str):
    r = requests.post(
        f"{API_BASE}/api/health/heartbeat",
        json={},
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()


def send_customer(
    token: str,
    ts: str,
    entered: int,
    exited: int,
    female: int,
    male: int,
    age_18_30: int,
    age_30_50: int,
    age_50_plus: int,
):
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
    r = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()


def send_heatmap(token: str, ts: str, date_str: str, camera_id: str, zone: str, visitor_count: int, intensity: float):
    payload = {
        "zone": zone,
        "visitor_count": visitor_count,
        "intensity": intensity,
        "camera_id": camera_id,
        "timestamp": ts,
        "date_recorded": date_str,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()


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
        20: 118,
        21: 102,
        22: 88,
    }
    entered = hour_curve.get(hour, 90) + (day_seed % 11)
    exited = max(entered - ((hour + day_seed) % 19 - 9), 0)
    female = round(entered * 0.53)
    male = entered - female
    age_18_30 = round(entered * 0.23)
    age_30_50 = round(entered * 0.47)
    age_50_plus = max(entered - age_18_30 - age_30_50, 0)
    return entered, exited, female, male, age_18_30, age_30_50, age_50_plus


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


def iter_hours_target_10_to_22():
    """Sabit gün için 10:00–22:00 tam saat slotları."""
    for h in range(10, 23):
        yield datetime(TARGET_DATE.year, TARGET_DATE.month, TARGET_DATE.day, h, 0, 0, tzinfo=TZ)


def main():
    token = login()
    send_setup(token)

    hours = list(iter_hours_target_10_to_22())
    if not hours:
        print("Saat aralığı boş.")
        return

    n_cust = 0
    n_heat = 0
    for hour_dt in hours:
        ts = hour_dt.isoformat(timespec="minutes")
        date_str = hour_dt.strftime("%Y-%m-%d")
        send_heartbeat(token)

        e, x, f, m, a1, a2, a3 = customer_profile(hour_dt)
        send_customer(token, ts, e, x, f, m, a1, a2, a3)
        n_cust += 1

        for cam_id, zones in HEATMAP_ZONES.items():
            for zi, zone in enumerate(zones):
                vc, intensity = heatmap_profile(hour_dt, cam_id, zi)
                send_heatmap(token, ts, date_str, cam_id, zone, vc, intensity)
                n_heat += 1

        print(f"OK | {ts} | customer=1 heatmap={sum(len(z) for z in HEATMAP_ZONES.values())}")

    print("-" * 60)
    print(f"Tamam | {USERNAME} | hedef gün TR: {TARGET_DATE.strftime('%Y-%m-%d')}")
    print(f"Saatler: {hours[0].hour:02d}:00 – {hours[-1].hour:02d}:00")
    print(f"Customer: {n_cust} | Heatmap: {n_heat}")


if __name__ == "__main__":
    main()
