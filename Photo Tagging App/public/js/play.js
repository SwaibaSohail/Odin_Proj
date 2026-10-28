import { request } from "./api.js";
import { el, formatTime, plural, scoreRows } from "./ui.js";

const slug = new URLSearchParams(window.location.search).get("scene");

const titleEl = document.querySelector("#scene-title");
const targetsEl = document.querySelector("#targets");
const timerEl = document.querySelector("#timer");
const zoomOut = document.querySelector("#zoom-out");
const zoomIn = document.querySelector("#zoom-in");
const zoomLevel = document.querySelector("#zoom-level");
const showResultsButton = document.querySelector("#show-results");
const viewport = document.querySelector("#viewport");
const stage = document.querySelector("#stage");
const picture = document.querySelector("#picture");
const box = document.querySelector("#target-box");
const menu = document.querySelector("#target-menu");
const menuList = document.querySelector("#menu-list");
const loading = document.querySelector("#loading");
const toast = document.querySelector("#toast");
const dialog = document.querySelector("#result");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#player-name");
const nameError = document.querySelector("#name-error");
const board = document.querySelector("#board");
const boardRows = document.querySelector("#board-rows");

const ZOOMS = [1, 1.5, 2, 3, 4];
const BOX_SIZE = 60;

let scene = null;
let game = null;
let found = new Set();
let target = null; // where the targeting box is, as fractions of the picture
let guessing = false;
let finished = false;
let zoomIndex = 0;
let clockStart = 0;
let clock = null;

// ---------------------------------------------------------------- Setup

function showLoadError(message) {
  loading.classList.add("error");
  loading.replaceChildren(
    el("div", { class: "card" }, [
      el("p", { text: message }),
      el("a", { class: "btn", href: "/", text: "Back to the pictures" }),
    ]),
  );
  loading.hidden = false;
}

function renderTargets() {
  targetsEl.replaceChildren(
    ...scene.characters.map((character) =>
      el("li", { class: "target", "data-id": character.id, title: character.description }, [
        el("img", { src: character.imageUrl, alt: "", width: "36", height: "36" }),
        el("span", { class: "target-name", text: character.name }),
      ]),
    ),
  );
}

function updateTargets() {
  for (const item of targetsEl.children) {
    const character = scene.characters.find((c) => c.id === Number(item.dataset.id));
    const isFound = found.has(character.id);
    item.classList.toggle("found", isFound);
    item.setAttribute("aria-label", `${character.name}${isFound ? ", found" : ""}`);
  }
}

async function load() {
  if (!slug) {
    window.location.replace("/");
    return;
  }
  try {
    ({ scene } = await request(`/scenes/${encodeURIComponent(slug)}`));
  } catch (err) {
    titleEl.textContent = "Not found";
    showLoadError(err.status === 404 ? "That picture doesn't exist." : err.message);
    return;
  }

  document.title = `${scene.title} · Where's Mabel?`;
  titleEl.textContent = scene.title;
  renderTargets();
  const names = scene.characters.map((c) => c.name).join(", ");
  picture.alt = `${scene.title}, a crowded picture. Somewhere in it are ${names}.`;
  picture.width = scene.width;
  picture.height = scene.height;
  // On tall screens like phones, start zoomed in far enough to fill the height.
  const fill = viewport.clientHeight / ((viewport.clientWidth * scene.height) / scene.width);
  if (fill > 1) zoomIndex = ZOOMS.findIndex((zoom) => zoom >= fill - 0.05);
  if (zoomIndex < 0) zoomIndex = ZOOMS.length - 1;
  applyZoom(false);

  // The clock starts once the picture is on screen, not while it downloads.
  picture.addEventListener("load", startGame, { once: true });
  picture.addEventListener("error", () => showLoadError("The picture didn't load. Check your connection and try again."), { once: true });
  picture.src = scene.imageUrl;
}

async function startGame() {
  try {
    ({ game } = await request("/games", { method: "POST", body: { scene: scene.slug } }));
  } catch (err) {
    showLoadError(err.message);
    return;
  }
  loading.hidden = true;
  stage.classList.add("ready");
  clockStart = performance.now();
  clock = setInterval(tick, 250);
  tick();
}

// The clock on screen is just for show. The server keeps the real time.
function tick() {
  timerEl.textContent = formatTime(performance.now() - clockStart, false);
}

// ---------------------------------------------------------------- Zoom and panning

function applyZoom(keepCentre = true) {
  const centreX = (viewport.scrollLeft + viewport.clientWidth / 2) / stage.offsetWidth;
  const centreY = (viewport.scrollTop + viewport.clientHeight / 2) / stage.offsetHeight;
  const zoom = ZOOMS[zoomIndex];
  stage.style.width = `${zoom * 100}%`;
  if (keepCentre) {
    viewport.scrollLeft = centreX * stage.offsetWidth - viewport.clientWidth / 2;
    viewport.scrollTop = centreY * stage.offsetHeight - viewport.clientHeight / 2;
  }
  zoomLevel.textContent = `${zoom * 100}%`;
  zoomOut.disabled = zoomIndex === 0;
  zoomIn.disabled = zoomIndex === ZOOMS.length - 1;
  closeTarget();
}

function changeZoom(step) {
  const next = Math.min(ZOOMS.length - 1, Math.max(0, zoomIndex + step));
  if (next === zoomIndex) return;
  zoomIndex = next;
  applyZoom();
}

zoomOut.addEventListener("click", () => changeZoom(-1));
zoomIn.addEventListener("click", () => changeZoom(1));

// Drag with the mouse to look around. Touch screens scroll on their own.
let drag = null;
let dragged = false;

viewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0 || menu.contains(event.target)) return;
  drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  dragged = false;
});

window.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!dragged && Math.hypot(dx, dy) < 6) return;
  if (!dragged) closeTarget();
  dragged = true;
  viewport.classList.add("panning");
  viewport.scrollLeft = drag.left - dx;
  viewport.scrollTop = drag.top - dy;
});

window.addEventListener("pointerup", () => {
  drag = null;
  viewport.classList.remove("panning");
});

// ---------------------------------------------------------------- Targeting box

function openTarget(x, y) {
  target = { x, y };
  box.style.left = `${x * 100}%`;
  box.style.top = `${y * 100}%`;
  box.hidden = false;

  menuList.replaceChildren(
    ...scene.characters
      .filter((character) => !found.has(character.id))
      .map((character) =>
        el("li", {}, el("button", { type: "button", class: "menu-item", "data-id": character.id }, [
          el("img", { src: character.imageUrl, alt: "", width: "34", height: "34" }),
          el("span", { text: character.name }),
        ])),
      ),
  );
  menu.hidden = false;
  positionMenu();
  menuList.querySelector("button")?.focus({ preventScroll: true });
}

// Puts the list beside the box, inside the part of the picture you can see.
function positionMenu() {
  const px = target.x * stage.offsetWidth;
  const py = target.y * stage.offsetHeight;
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const viewLeft = viewport.scrollLeft;
  const viewRight = Math.min(viewLeft + viewport.clientWidth, stage.offsetWidth);
  const viewTop = viewport.scrollTop;
  const viewBottom = Math.min(viewTop + viewport.clientHeight, stage.offsetHeight);
  const gap = BOX_SIZE / 2 + 10;

  let left = px + gap;
  if (left + width > viewRight - 8) left = px - gap - width;
  left = Math.max(viewLeft + 8, Math.min(left, viewRight - width - 8));
  let top = py - BOX_SIZE / 2;
  top = Math.max(viewTop + 8, Math.min(top, viewBottom - height - 8));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeTarget() {
  target = null;
  box.hidden = true;
  menu.hidden = true;
}

picture.addEventListener("click", (event) => {
  if (dragged) {
    dragged = false;
    return;
  }
  if (!game || finished || guessing) return;
  // Where the click landed as a fraction of the picture, so it means the same
  // spot whatever the screen size or zoom.
  const rect = picture.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  openTarget(x, y);
});

// Clicking anywhere else closes the box.
document.addEventListener("click", (event) => {
  if (target && event.target !== picture && !menu.contains(event.target)) closeTarget();
});

document.addEventListener("keydown", (event) => {
  if (dialog.open || event.target.matches("input")) return;
  if (event.key === "Escape") closeTarget();
  if (event.key === "+" || event.key === "=") changeZoom(1);
  if (event.key === "-" || event.key === "_") changeZoom(-1);
});

window.addEventListener("resize", closeTarget);

// ---------------------------------------------------------------- Guessing

let toastTimer = null;

function showToast(text, kind) {
  toast.textContent = text;
  toast.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function addMarker(character, spot) {
  const marker = el("div", { class: "marker" }, el("span", { class: "marker-label", text: character.name }));
  marker.style.left = `calc(${spot.x * 100}% - 5px)`;
  marker.style.top = `calc(${spot.y * 100}% - 5px)`;
  marker.style.width = `calc(${spot.width * 100}% + 10px)`;
  marker.style.height = `calc(${spot.height * 100}% + 10px)`;
  stage.append(marker);
}

function showMiss(x, y) {
  const miss = el("div", { class: "miss" });
  miss.style.left = `${x * 100}%`;
  miss.style.top = `${y * 100}%`;
  miss.addEventListener("animationend", () => miss.remove());
  stage.append(miss);
}

menu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button || !target || guessing) return;
  const character = scene.characters.find((c) => c.id === Number(button.dataset.id));
  const { x, y } = target;
  closeTarget();
  guessing = true;

  try {
    const res = await request(`/games/${game.id}/guesses`, {
      method: "POST",
      body: { characterId: character.id, x, y },
    });
    if (res.correct) {
      found = new Set(res.found);
      addMarker(character, res.box);
      updateTargets();
      const left = scene.characters.length - found.size;
      showToast(left ? `You found ${character.name}! ${left} to go.` : `You found ${character.name}!`, "good");
    } else {
      showMiss(x, y);
      showToast(`That's not ${character.name}. Keep looking.`, "bad");
    }
    if (res.finished) finish(res.result);
  } catch (err) {
    showToast(err.message, "bad");
  } finally {
    guessing = false;
  }
});

// ---------------------------------------------------------------- The end

function finish(result) {
  finished = true;
  clearInterval(clock);
  timerEl.textContent = formatTime(result.timeMs);
  timerEl.classList.add("stopped");
  stage.classList.add("done");
  showResultsButton.hidden = false;

  document.querySelector("#result-scene").textContent = `${scene.title}, all ${scene.characters.length} found in`;
  document.querySelector("#result-time").textContent = formatTime(result.timeMs);
  document.querySelector("#result-misses").textContent =
    result.misses === 0 ? "No wrong guesses. Sharp eyes!" : plural(result.misses, "wrong guess", "wrong guesses");
  const note = document.querySelector("#result-note");
  if (result.madeTopScores) {
    note.textContent = `That's number ${result.rank} on the high scores. Add your name to keep your spot.`;
    nameForm.hidden = false;
  } else {
    note.textContent = "Not quite fast enough for the top 10 this time.";
  }
  dialog.showModal();
  if (result.madeTopScores) nameInput.focus();
  loadBoard();
}

async function loadBoard(you) {
  try {
    const { scores } = await request(`/scenes/${encodeURIComponent(scene.slug)}/scores`);
    showBoard(scores, you);
  } catch {
    // The table is a nice extra. The result above still stands.
  }
}

function showBoard(scores, you) {
  if (!scores.length) return;
  boardRows.replaceChildren(...scoreRows(scores, { you }));
  board.hidden = false;
}

nameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  nameError.textContent = "";
  try {
    const { rank, scores } = await request(`/games/${game.id}`, { method: "PATCH", body: { name: nameInput.value } });
    nameForm.hidden = true;
    document.querySelector("#result-note").textContent = `Saved. You're number ${rank} on the high scores.`;
    showBoard(scores, rank);
  } catch (err) {
    nameError.textContent = err.details?.[0]?.message || err.message;
    nameInput.focus();
  }
});

document.querySelector("#play-again").addEventListener("click", () => window.location.reload());
showResultsButton.addEventListener("click", () => dialog.showModal());

load();
