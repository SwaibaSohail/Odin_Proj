// The log-in token lives in localStorage. Logging out just removes it.

const TOKEN_KEY = "blogToken";
const USER_KEY = "blogUser";
const FLASH_KEY = "blogFlash";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Sends you to the log-in page if you aren't logged in.
export function requireSession() {
  if (!getToken()) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

// A one-time message shown on the next page, like "Post deleted."
export function setFlash(text) {
  sessionStorage.setItem(FLASH_KEY, text);
}

export function takeFlash() {
  const text = sessionStorage.getItem(FLASH_KEY);
  sessionStorage.removeItem(FLASH_KEY);
  return text;
}
