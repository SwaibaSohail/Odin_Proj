import { request } from "./api.js";
import { requireSession } from "./session.js";
import { el, timeEl, statusBadge, setUpPage, showMessage } from "./ui.js";

const table = document.querySelector("#post-table");
const tbody = table.querySelector("tbody");
const status = document.querySelector("#status");
const filterButtons = document.querySelectorAll("[data-filter]");

let posts = [];
let filter = "all";

function postRow(post) {
  const toggle = el("button", {
    type: "button",
    class: "btn btn-small",
    text: post.published ? "Unpublish" : "Publish",
    onclick: () => setPublished(post, !post.published),
  });
  const remove = el("button", {
    type: "button",
    class: "btn btn-small btn-danger",
    text: "Delete",
    onclick: () => deletePost(post),
  });

  return el("tr", {}, [
    el("td", {}, [el("a", { href: `editor.html?id=${post.id}`, class: "post-title", text: post.title })]),
    el("td", {}, [statusBadge(post.published)]),
    el("td", { class: "num", text: String(post.commentCount) }),
    el("td", { class: "date" }, [timeEl(post.updatedAt)]),
    el("td", { class: "row-actions" }, [toggle, remove]),
  ]);
}

function render() {
  const counts = {
    all: posts.length,
    published: posts.filter((post) => post.published).length,
    draft: posts.filter((post) => !post.published).length,
  };
  for (const button of filterButtons) {
    button.querySelector(".count").textContent = counts[button.dataset.filter];
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }

  const visible = posts.filter((post) => filter === "all" || post.published === (filter === "published"));
  tbody.replaceChildren(...visible.map(postRow));
  table.hidden = visible.length === 0;
  status.hidden = visible.length > 0;
  status.textContent = posts.length === 0 ? "No posts yet. Write your first one." : "Nothing here.";
}

async function loadPosts() {
  try {
    ({ posts } = await request("/posts?status=all"));
    render();
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
  }
}

async function setPublished(post, published) {
  try {
    const { post: updated } = await request(`/posts/${post.id}`, { method: "PATCH", body: { published } });
    posts = posts.map((p) => (p.id === post.id ? { ...p, ...updated } : p));
    render();
    showMessage(`"${post.title}" is ${published ? "now live on the blog" : "back to being a draft"}.`);
  } catch (err) {
    showMessage(err.message, "error");
  }
}

async function deletePost(post) {
  if (!window.confirm(`Delete "${post.title}" and its comments? This can't be undone.`)) return;
  try {
    await request(`/posts/${post.id}`, { method: "DELETE" });
    posts = posts.filter((p) => p.id !== post.id);
    render();
    showMessage(`Deleted "${post.title}".`);
  } catch (err) {
    showMessage(err.message, "error");
  }
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    render();
  });
}

if (requireSession()) {
  setUpPage();
  loadPosts();
}
