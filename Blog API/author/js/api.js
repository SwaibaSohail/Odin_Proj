import { API_URL } from "./config.js";
import { getToken, clearSession } from "./session.js";

// Calls the API with the log-in token. Returns the JSON, or throws an Error
// with a readable message plus .status and .details (field errors).
// If the token has expired, you're sent back to the log-in page.
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Couldn't reach the API. Is it running at ${API_URL}?`);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401 && token) {
    clearSession();
    window.location.replace("login.html?expired=1");
    return new Promise(() => {}); // stop here while the page changes
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Something went wrong (${res.status}).`);
    error.status = res.status;
    error.details = data?.details || [];
    throw error;
  }
  return data;
}
