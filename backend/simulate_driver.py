import sys
import time

import httpx

BASE = "http://127.0.0.1:8000"


def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python simulate_driver.py NGO_EMAIL NGO_PASSWORD CLAIM_ID")
    email, password, claim_id = sys.argv[1], sys.argv[2], sys.argv[3]

    with httpx.Client(base_url=BASE) as client:
        login = client.post("/auth/login", data={"username": email, "password": password})
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        track = client.get(f"/claims/{claim_id}/track", headers=headers)
        track.raise_for_status()
        info = track.json()
        if info["pickup_latitude"] is None:
            raise SystemExit("This listing has no latitude/longitude. Create one with coordinates.")

        end_lat, end_lng = info["pickup_latitude"], info["pickup_longitude"]
        start_lat, start_lng = end_lat + 0.03, end_lng + 0.03  # roughly 4-5 km away
        steps = 20

        for i in range(steps + 1):
            f = i / steps
            lat = start_lat + (end_lat - start_lat) * f
            lng = start_lng + (end_lng - start_lng) * f
            r = client.post(
                f"/claims/{claim_id}/location",
                json={"latitude": lat, "longitude": lng},
                headers=headers,
            )
            r.raise_for_status()
            d = r.json()
            print(f"{i}/{steps}  distance {d['distance_km']} km, ETA {d['eta_minutes']} min")
            time.sleep(1)


if __name__ == "__main__":
    main()