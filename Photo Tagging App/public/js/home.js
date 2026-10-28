import { request } from "./api.js";
import { el, formatTime } from "./ui.js";

const cast = document.querySelector("#cast");
const list = document.querySelector("#scene-list");
const status = document.querySelector("#status");

function castMember(character) {
  return el("li", { class: "card cast-member" }, [
    el("img", { class: "portrait", src: character.imageUrl, alt: "", width: "72", height: "72" }),
    el("div", {}, [el("h3", { text: character.name }), el("p", { text: character.description })]),
  ]);
}

function sceneCard(scene) {
  const best = scene.bestScore
    ? `Best: ${formatTime(scene.bestScore.timeMs)} by ${scene.bestScore.name}`
    : "No times yet. Be the first.";
  const play = `/play?scene=${encodeURIComponent(scene.slug)}`;
  return el("li", { class: "card scene-card" }, [
    el("a", { href: play, tabindex: "-1", "aria-hidden": "true" }, el("img", { src: scene.previewUrl, alt: "", width: "960", height: "617", loading: "lazy" })),
    el("div", { class: "scene-body" }, [
      el("h3", { text: scene.title }),
      el("p", { text: scene.description }),
      el("p", { class: "best", text: best }),
      el("div", { class: "scene-actions" }, [
        el("a", { class: "btn btn-primary", href: play, text: "Play" }),
        el("a", { href: `/scores?scene=${encodeURIComponent(scene.slug)}`, text: "High scores" }),
      ]),
    ]),
  ]);
}

async function load() {
  try {
    const { scenes } = await request("/scenes");
    // Everyone hides in every picture, but collect them all just in case.
    const characters = new Map();
    for (const scene of scenes) for (const character of scene.characters) characters.set(character.id, character);
    cast.replaceChildren(...[...characters.values()].map(castMember));
    list.replaceChildren(...scenes.map(sceneCard));
    status.hidden = true;
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
  }
}

load();
