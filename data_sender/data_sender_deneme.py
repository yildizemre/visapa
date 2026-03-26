import requests

API_BASE = "https://ai.vislivis.com"
USERNAME = "demo"
PASSWORD = "demo"

def login() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    r.raise_for_status()
    return r.json()["access_token"]

def send_customer(token: str, ts: str):
    payload = {
        "entered": 100,
        "exited": 100,
        "customers_inside": 100,
        "timestamp": ts,
    }
    r = requests.post(
        f"{API_BASE}/api/analytics/customers",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    r.raise_for_status()
    print("OK", ts)

def main():
    token = login()
    date = "2026-03-11"  # SADECE BU GÜN
    for hour in [10, 11, 12, 13, 14]:
        ts = f"{date}T{hour:02d}:00"
        send_customer(token, ts)

if __name__ == "__main__":
    main()