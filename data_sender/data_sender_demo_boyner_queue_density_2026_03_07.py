import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

DATE = "2026-03-07"
SITE_NAME = "Boyner İstinye Park"

CAMERAS = [
    {"name": "cam1", "type": "Kasa Analizi", "rtsp": ""},
    {"name": "cam2", "type": "Isı Haritası", "rtsp": ""},
    {"name": "cam3", "type": "Isı Haritası", "rtsp": ""},
    {"name": "cam4", "type": "Kasa Analizi", "rtsp": ""},
]

QUEUE_HOURLY = [
    ("10:00", 5, 12),
    ("11:00", 24, 83),
    ("12:00", 108, 71),
    ("13:00", 115, 92),
    ("14:00", 121, 113),
    ("15:00", 167, 156),
    ("16:00", 106, 119),
    ("17:00", 128, 120),
    ("18:00", 125, 140),
    ("19:00", 28, 67),
    ("20:00", 34, 108),
    ("21:00", 45, 93),
]

QUEUE_WAIT_CAM1 = [35, 48, 72, 81, 84, 110, 88, 97, 93, 42, 55, 58]
QUEUE_WAIT_CAM4 = [29, 51, 64, 70, 76, 108, 82, 85, 99, 47, 79, 68]

CAM2_HOURLY = [
    ("11:00", [39, 24, 48, 82, 89], [11.5, 64.1, 22.7, 20.4, 24.6]),
    ("12:00", [52, 40, 99, 66, 63], [7.9, 10.7, 13.0, 11.1, 12.3]),
    ("13:00", [44, 43, 78, 83, 69], [9.4, 17.1, 11.6, 20.5, 13.3]),
    ("14:00", [73, 66, 92, 128, 76], [10.3, 18.6, 28.4, 12.5, 16.7]),
    ("15:00", [64, 43, 79, 132, 87], [7.7, 47.9, 9.4, 14.7, 13.6]),
    ("16:00", [63, 43, 96, 127, 86], [7.8, 13.3, 10.0, 13.4, 9.1]),
    ("17:00", [68, 43, 92, 128, 78], [11.9, 71.2, 8.7, 13.4, 14.8]),
    ("18:00", [31, 24, 62, 64, 79], [5.9, 15.1, 25.9, 12.1, 10.5]),
    ("19:00", [19, 11, 42, 41, 55], [6.8, 31.0, 24.6, 39.1, 19.4]),
    ("20:00", [16, 13, 25, 49, 49], [8.8, 40.7, 13.9, 20.7, 31.6]),
    ("21:00", [14, 5, 21, 32, 18], [7.8, 44.9, 16.0, 31.7, 68.9]),
]

CAM3_HOURLY = [
    ("11:00", [33, 30, 22], [8.6, 20.1, 14.1]),
    ("12:00", [36, 20, 30], [11.8, 21.9, 16.5]),
    ("13:00", [54, 28, 38], [10.2, 10.5, 16.6]),
    ("14:00", [52, 27, 38], [11.0, 22.1, 15.5]),
    ("15:00", [70, 41, 47], [9.7, 14.7, 28.8]),
    ("16:00", [49, 32, 38], [12.0, 36.5, 11.9]),
    ("17:00", [52, 36, 54], [31.7, 32.1, 15.1]),
    ("18:00", [45, 15, 40], [16.2, 11.0, 12.0]),
    ("19:00", [19, 18, 15], [11.5, 10.7, 17.7]),
    ("20:00", [15, 8, 18], [17.9, 14.8, 15.7]),
    ("21:00", [12, 4, 26], [23.9, 30.4, 18.9]),
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
    print("cam2 toplam ziyaretçi: 3253")
    print("cam3 toplam ziyaretçi: 1062")
    print("Pik kuyruk saati: 15:00 | cam1=167 cam4=156")


if __name__ == "__main__":
    main()
