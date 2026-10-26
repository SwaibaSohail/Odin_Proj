import { request } from "./api.js";
import { getToken, saveSession } from "./session.js";
import { showMessage, showFieldErrors, clearFieldErrors } from "./ui.js";

const form = document.querySelector("#login-form");

if (getToken()) window.location.replace("index.html");

if (new URLSearchParams(window.location.search).get("expired")) {
  showMessage("Your session has ended. Log in again to keep writing.", "error");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(form);
  const button = form.querySelector("button");
  button.disabled = true;

  try {
    const { token, user } = await request("/auth/login", {
      method: "POST",
      auth: false,
      body: { username: form.elements.username.value, password: form.elements.password.value },
    });
    if (user.role !== "AUTHOR") {
      showMessage("This account can't write posts.", "error");
      return;
    }
    saveSession(token, user);
    window.location.replace("index.html");
  } catch (err) {
    if (err.details?.length) showFieldErrors(form, err.details);
    else showMessage(err.message, "error");
  } finally {
    button.disabled = false;
  }
});
