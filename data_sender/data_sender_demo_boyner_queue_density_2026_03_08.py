import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

DATE = "2026-03-08"
SITE_NAME = "Boyner İstinye Park"

CAMERAS = [
    {"name": "cam1", "type": "Kasa Analizi", "rtsp": ""},
    {"name": "cam2", "type": "Isı Haritası", "rtsp": ""},
    {"name": "cam3", "type": "Isı Haritası", "rtsp": ""},
    {"name": "cam4", "type": "Kasa Analizi", "rtsp": ""},
    {"name": "Kamera-5", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-6", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-7", "type": "Kişi Sayım", "rtsp": ""},
    {"name": "Kamera-8", "type": "Kişi Sayım", "rtsp": ""},
]

# Kuyruk analizi: cam1 (Kasiyerler) ve cam4 (Ana Koridor)
QUEUE_HOURLY = [
    ("10:00", 14, 43),
    ("11:00", 31, 46),
    ("12:00", 108, 69),
    ("13:00", 142, 122),
    ("14:00", 184, 95),
    ("15:00", 204, 146),
    ("16:00", 205, 81),
    ("17:00", 159, 94),
    ("18:00", 154, 121),
    ("19:00", 56, 59),
    ("20:00", 66, 146),
    ("21:00", 64, 57),
]

# Ortalama bekleme süreleri (sn) - raporla uyumlu olacak şekilde gerçekçi örnekler
QUEUE_WAIT_CAM1 = [45, 52, 70, 84, 96, 118, 121, 95, 88, 54, 61, 58]
QUEUE_WAIT_CAM4 = [38, 41, 55, 79, 68, 91, 57, 63, 74, 46, 93, 49]

# Yoğunluk analizi: cam2 Giriş Alanı (5 zone)
CAM2_HOURLY = [
    ("11:00", [26, 24, 69, 50, 29], [12.5, 34.9, 14.8, 17.9, 691.3]),
    ("12:00", [43, 27, 69, 73, 28], [12.3, 29.3, 13.3, 12.0, 23.7]),
    ("13:00", [57, 40, 91, 136, 35], [7.1, 40.0, 8.3, 11.5, 19.3]),
    ("14:00", [90, 51, 89, 151, 32], [10.1, 18.0, 25.9, 10.7, 31.4]),
    ("15:00", [98, 53, 108, 166, 64], [13.2, 38.6, 8.2, 9.0, 19.5]),
    ("16:00", [58, 42, 97, 137, 66], [7.5, 21.2, 12.5, 8.6, 30.8]),
    ("17:00", [52, 26, 97, 161, 42], [19.2, 31.2, 8.9, 10.0, 31.6]),
    ("18:00", [49, 21, 57, 77, 32], [9.6, 13.0, 8.4, 15.5, 34.1]),
    ("19:00", [26, 19, 35, 61, 37], [9.1, 26.8, 9.5, 13.6, 20.1]),
    ("20:00", [18, 10, 37, 41, 28], [22.9, 22.7, 21.6, 15.1, 47.0]),
]

# Yoğunluk analizi: cam3 Giyim Alanı (3 zone)
CAM3_HOURLY = [
    ("11:00", [40, 28, 57], [9.5, 16.4, 21.7]),
    ("12:00", [23, 18, 31], [11.9, 15.3, 12.4]),
    ("13:00", [64, 27, 50], [11.7, 30.6, 12.8]),
    ("14:00", [92, 56, 74], [16.6, 22.1, 14.8]),
    ("15:00", [87, 48, 43], [10.8, 19.1, 26.3]),
    ("16:00", [78, 49, 53], [12.7, 18.6, 18.7]),
    ("17:00", [82, 51, 72], [16.7, 15.4, 15.3]),
    ("18:00", [48, 31, 46], [17.8, 29.9, 12.9]),
    ("19:00", [37, 14, 28], [9.3, 16.3, 18.1]),
    ("20:00", [37, 24, 33], [18.1, 15.3, 20.7]),
    ("21:00", [23, 14, 30], [7.1, 19.5, 14.2]),
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


def send_queue(token: str, hour: str, cashier_id: str, total_customers: int, wait_time: float):
    timestamp = f"{DATE}T{hour}"
    payload = {
        "cashier_id": cashier_id,
        "total_customers": total_customers,
        "wait_time": wait_time,
        "timestamp": timestamp,
        "status": "completed",
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/queues",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print(f"OK queue | {timestamp} | {cashier_id} | customers={total_customers} wait={wait_time}s")


def send_heatmap(token: str, hour: str, zone: str, visitor_count: int, intensity: float, camera_id: str):
    timestamp = f"{DATE}T{hour}"
    payload = {
        "zone": zone,
        "visitor_count": visitor_count,
        "intensity": intensity,
        "camera_id": camera_id,
        "timestamp": timestamp,
        "date_recorded": DATE,
    }
    response = requests.post(
        f"{API_BASE}/api/analytics/heatmaps",
        json=payload,
        headers=auth_headers(token),
        timeout=30,
    )
    response.raise_for_status()
    print(f"OK heatmap | {timestamp} | {camera_id}:{zone} | visitors={visitor_count} dwell={intensity}s")


def main():
    token = login()
    send_setup(token)
    send_heartbeat(token)

    total_cam1 = 0
    total_cam4 = 0

    for i, (hour, cam1_total, cam4_total) in enumerate(QUEUE_HOURLY):
        send_queue(token, hour, "cam1", cam1_total, QUEUE_WAIT_CAM1[i])
        send_queue(token, hour, "cam4", cam4_total, QUEUE_WAIT_CAM4[i])
        total_cam1 += cam1_total
        total_cam4 += cam4_total

    for hour, visitors, dwells in CAM2_HOURLY:
        for idx, (visitor_count, intensity) in enumerate(zip(visitors, dwells), start=1):
            send_heatmap(token, hour, f"Giriş-Alan-{idx}", visitor_count, intensity, "cam2")

    for hour, visitors, dwells in CAM3_HOURLY:
        for idx, (visitor_count, intensity) in enumerate(zip(visitors, dwells), start=1):
            send_heatmap(token, hour, f"Giyim-Alan-{idx}", visitor_count, intensity, "cam3")

    print("-" * 60)
    print(f"Gün: {DATE}")
    print(f"cam1 toplam kuyruk: {total_cam1}")
    print(f"cam4 toplam kuyruk: {total_cam4}")
    print("cam2 toplam ziyaretçi: 3025")
    print("cam3 toplam ziyaretçi: 1488")
    print("Pik kuyruk saati: cam1 16:00 (205), cam4 15:00 ve 20:00 (146)")


if __name__ == "__main__":
    main()
