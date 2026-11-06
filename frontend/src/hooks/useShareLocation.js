import { useEffect, useRef } from "react";
import { api } from "../api";

// While enabled, sends this device's position to the backend every few seconds.
// In demo mode it simulates a driver travelling about 4 km to the pickup point.
export default function useShareLocation({ claimId, enabled, demo, latitude, longitude }) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    async function send(lat, lng) {
      const now = Date.now();
      if (now - lastSent.current < 3500) return;
      lastSent.current = now;
      try {
        await api(`/claims/${claimId}/location`, {
          method: "POST",
          body: { latitude: lat, longitude: lng },
        });
      } catch {
        // ignore, the next update will try again
      }
    }

    if (demo) {
      if (latitude == null || longitude == null) return undefined;
      const steps = 25;
      const startLat = latitude + 0.03;
      const startLng = longitude + 0.03;
      let step = 0;
      const tick = () => {
        const f = Math.min(step / steps, 1);
        send(startLat + (latitude - startLat) * f, startLng + (longitude - startLng) * f);
        step += 1;
      };
      tick();
      const id = setInterval(tick, 4000);
      return () => clearInterval(id);
    }

    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => send(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [claimId, enabled, demo, latitude, longitude]);
}