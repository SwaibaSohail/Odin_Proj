import { request } from "./api.js";
import { el, scoreRows } from "./ui.js";

const tabs = document.querySelector("#tabs");
const panel = document.querySelector("#panel");
const rows = document.querySelector("#score-rows");
const status = document.querySelector("#status");
const playLink = document.querySelector("#play-link");

let scenes = [];

async function show(slug) {
  const scene = scenes.find((s) => s.slug === slug) || scenes[0];
  for (const tab of tabs.children) {
    const selected = tab.dataset.slug === scene.slug;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) panel.setAttribute("aria-labelledby", tab.id);
  }
  history.replaceState(null, "", `?scene=${encodeURIComponent(scene.slug)}`);
  playLink.href = `/play?scene=${encodeURIComponent(scene.slug)}`;
  playLink.textContent = `Play ${scene.title}`;
  playLink.hidden = false;

  try {
    const { scores } = await request(`/scenes/${encodeURIComponent(scene.slug)}/scores`);
    rows.replaceChildren(
      ...(scores.length
        ? scoreRows(scores, { columns: ["rank", "name", "time", "misses", "when"] })
        : [el("tr", { class: "empty-row" }, el("td", { colspan: "5", text: "No times yet. Be the first on the board." }))]),
    );
    panel.hidden = false;
    status.hidden = true;
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
    status.hidden = false;
  }
}

async function load() {
  try {
    ({ scenes } = await request("/scenes"));
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
    return;
  }
  tabs.replaceChildren(
    ...scenes.map((scene) =>
      el("button", { type: "button", role: "tab", id: `tab-${scene.slug}`, "data-slug": scene.slug, "aria-controls": "panel", text: scene.title }),
    ),
  );
  show(new URLSearchParams(window.location.search).get("scene"));
}

tabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[role=tab]");
  if (tab) show(tab.dataset.slug);
});

// Arrow keys move between tabs.
tabs.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const list = [...tabs.children];
  const current = list.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const next = list[(current + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
  next.focus();
  show(next.dataset.slug);
});

load();
