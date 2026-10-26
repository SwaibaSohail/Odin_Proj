// Dark mode toggle. The saved choice is applied in each page's <head> first.

const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return root.dataset.theme || (systemDark.matches ? "dark" : "light");
}

function updateToggle() {
  const isDark = currentTheme() === "dark";
  toggle.textContent = isDark ? "Light" : "Dark";
  toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  toggle.title = toggle.getAttribute("aria-label");
}

toggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch (e) {
    // Storage unavailable; the theme still applies for this page view.
  }
  updateToggle();
});

systemDark.addEventListener("change", updateToggle);
updateToggle();
