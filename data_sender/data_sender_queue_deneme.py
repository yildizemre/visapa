import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

CASHIERS = ["Kasa-1", "Kasa-2"]


def login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send_queue(token: str, ts: str, cashier_id: str, total_customers: int, wait_time: float):
    payload = {
        "cashier_id": cashier_id,
        "total_customers": total_customers,
        "wait_time": wait_time,   # saniye
        "timestamp": ts,
        "status": "completed",
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/queues",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    r.raise_for_status()
    print("OK", ts, cashier_id, f"customers={total_customers}", f"wait={wait_time}s")


def main():
    token = login()
    date = "2026-03-08"

    # 10:00 - 22:00 arası saatlik kuyruk verisi
    for hour in range(10, 23):
        ts = f"{date}T{hour:02d}:00"

        # Kasa-1 biraz daha yoğun
        send_queue(token, ts, "Kasa-1", total_customers=12 + (hour - 10), wait_time=90 + (hour - 10) * 8)
        # Kasa-2 daha az yoğun
        send_queue(token, ts, "Kasa-2", total_customers=8 + (hour - 10), wait_time=60 + (hour - 10) * 6)


if __name__ == "__main__":
    main()
