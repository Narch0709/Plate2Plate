import { useEffect, useRef } from "react";
import { getToken } from "../api";

const WS_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/^http/, "ws");

export default function useLive(onMessage) {
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    let ws;
    let timer;
    let closed = false;

    function connect() {
      ws = new WebSocket(`${WS_URL}/ws?token=${getToken()}`);
      ws.onmessage = (e) => {
        try {
          handler.current(JSON.parse(e.data));
        } catch {
          // ignore malformed messages
        }
      };
      ws.onclose = () => {
        if (!closed) timer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws.close();
    };
  }, []);
}