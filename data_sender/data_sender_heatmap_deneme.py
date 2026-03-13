import requests

API_BASE = "http://127.0.0.1:5000"
USERNAME = "deneme"
PASSWORD = "deneme"

ZONES = [
    ("Giriş", 45, 120.0),
    ("Erkek Giyim", 38, 180.0),
    ("Kadın Giyim", 42, 210.0),
    ("Ayakkabı", 30, 150.0),
]


def login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send_heatmap(token: str, ts: str, date_str: str, zone: str, visitor_count: int, intensity: float):
    payload = {
        "zone": zone,
        "visitor_count": visitor_count,
        "intensity": intensity,  # ortalama bekleme/geçirme süresi (sn)
        "timestamp": ts,
        "date_recorded": date_str,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    r.raise_for_status()
    print("OK", ts, zone, f"visitor={visitor_count}", f"intensity={intensity}")


def main():
    token = login()
    date = "2026-03-12"

    # 10:00 - 22:00 arası her saat için heatmap verisi
    for hour in range(10, 23):
        ts = f"{date}T{hour:02d}:00"
        # Saat ilerledikçe küçük değişimler ekleyelim
        hour_boost = max(hour - 12, 0) * 2
        for zone, base_visitors, base_intensity in ZONES:
            visitor_count = base_visitors + hour_boost
            intensity = base_intensity + (hour % 3) * 15
            send_heatmap(token, ts, date, zone, visitor_count, intensity)


if __name__ == "__main__":
    main()
