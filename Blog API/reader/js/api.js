import { API_URL } from "./config.js";

// Calls the API and returns the JSON. Throws an Error with a readable message,
// plus .status and .details (field errors) when the API sends them.
export async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Couldn't reach the blog. Is the API running at ${API_URL}?`);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Something went wrong (${res.status}).`);
    error.status = res.status;
    error.details = data?.details || [];
    throw error;
  }
  return data;
}
