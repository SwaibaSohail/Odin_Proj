// Calls the API and returns the JSON. Throws an Error with a readable message,
// plus .status and .details (field errors) when the API sends them.
// `body` can be a plain object (sent as JSON) or a FormData (for pictures).
export async function request(path, { method = "GET", body } = {}) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body && !isForm ? { "Content-Type": "application/json" } : {},
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error("Can't reach the server. Check your connection and try again.");
    error.offline = true;
    throw error;
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    // The log-in ran out (or was ended somewhere else): start again.
    if (res.status === 401 && !path.startsWith("/auth/")) window.location.replace("/login");
    const error = new Error(data?.error || `Something went wrong (${res.status}).`);
    error.status = res.status;
    error.details = data?.details || [];
    throw error;
  }
  return data;
}
