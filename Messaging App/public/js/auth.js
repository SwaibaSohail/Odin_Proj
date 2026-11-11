// The log-in and sign-up forms.
import { request } from "./api.js";

const form = document.querySelector("#auth-form");
const message = document.querySelector("#form-message");
const button = form.querySelector("button[type=submit]");

function showFieldErrors(details) {
  for (const { field, message: text } of details) {
    const input = form.elements[field];
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (!input || !slot) continue;
    slot.textContent = text;
    input.setAttribute("aria-invalid", "true");
  }
  form.querySelector("[aria-invalid=true]")?.focus();
}

function clearErrors() {
  message.textContent = "";
  for (const slot of form.querySelectorAll("[data-error-for]")) slot.textContent = "";
  for (const input of form.querySelectorAll("[aria-invalid]")) input.removeAttribute("aria-invalid");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();
  button.disabled = true;
  try {
    await request(`/auth/${form.dataset.mode}`, { method: "POST", body: Object.fromEntries(new FormData(form)) });
    window.location.replace("/");
  } catch (err) {
    if (err.details?.length) showFieldErrors(err.details);
    else message.textContent = err.message;
    button.disabled = false;
  }
});
