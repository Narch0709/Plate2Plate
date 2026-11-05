from math import asin, cos, radians, sin, sqrt

AVG_CITY_SPEED_KMH = 25


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0  # Earth's radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))


def eta_minutes(distance_km: float) -> int:
    return max(1, round(distance_km / AVG_CITY_SPEED_KMH * 60))