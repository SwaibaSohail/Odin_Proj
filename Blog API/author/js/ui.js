import { getUser, clearSession, takeFlash } from "./session.js";

// Builds an element. Text always goes in with textContent, so nothing from
// the API can inject HTML.
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso) {
  return dateTime.format(new Date(iso));
}

export function timeEl(iso) {
  return el("time", { datetime: iso, text: formatDateTime(iso) });
}

export function statusBadge(published) {
  return el("span", {
    class: `badge ${published ? "badge-published" : "badge-draft"}`,
    text: published ? "Published" : "Draft",
  });
}

// Shows a message at the top of the page. type: "success" or "error".
export function showMessage(text, type = "success") {
  const box = document.querySelector("#message");
  box.textContent = text;
  box.className = `message message-${type}`;
  box.hidden = false;
  box.setAttribute("role", type === "error" ? "alert" : "status");
}

export function hideMessage() {
  document.querySelector("#message").hidden = true;
}

// Fills in the user's name, wires up "Log out" and shows any one-time message.
export function setUpPage() {
  const user = getUser();
  const name = document.querySelector("#user-name");
  if (name && user) name.textContent = user.name;

  document.querySelector("#log-out")?.addEventListener("click", () => {
    clearSession();
    window.location.replace("login.html");
  });

  const flash = takeFlash();
  if (flash) showMessage(flash);
}

// Marks fields with errors from the API, like { field: "title", message: "..." }.
export function showFieldErrors(form, details) {
  for (const { field, message } of details) {
    const input = form.elements[field];
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.setAttribute("aria-invalid", "true");
    if (slot) slot.textContent = message;
  }
}

export function clearFieldErrors(form) {
  for (const slot of form.querySelectorAll("[data-error-for]")) slot.textContent = "";
  for (const input of form.querySelectorAll("[aria-invalid]")) input.removeAttribute("aria-invalid");
}
