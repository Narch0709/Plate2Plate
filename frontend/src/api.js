const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = new URLSearchParams(form);
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });

  if (!res.ok) {
    let message = "Something went wrong";
    try {
      const data = await res.json();
      message = typeof data.detail === "string" ? data.detail : "Please check the details you entered";
    } catch {
      // keep the default message
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}