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


def send_age_gender(token: str, ts: str):
    payload = {
        "entered": 0,
        "exited": 0,
        "customers_inside": 100,
        "male_count": 50,
        "female_count": 50,
        "age_18_30": 40,
        "age_30_50": 40,
        "age_50_plus": 20,
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
    print("OK", ts, "male=50 female=50 age=40/40/20")


def main():
    token = login()
    date = "2026-03-07"
    for hour in [10, 11, 12, 13, 14]:
        ts = f"{date}T{hour:02d}:00"
        send_age_gender(token, ts)


if __name__ == "__main__":
    main()
