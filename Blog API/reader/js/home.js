import { request } from "./api.js";
import { el, timeEl, plural } from "./ui.js";

const list = document.querySelector("#posts");
const status = document.querySelector("#status");

function postItem(post) {
  const link = `post.html?id=${post.id}`;
  return el("article", { class: "post-item" }, [
    el("p", { class: "meta" }, [timeEl(post.publishedAt)]),
    el("h2", {}, [el("a", { href: link, text: post.title })]),
    el("p", { class: "excerpt", text: post.excerpt }),
    el("p", { class: "meta" }, [
      el("span", { text: plural(post.commentCount, "comment") }),
      " · ",
      el("a", { href: link, text: "Read the post" }),
    ]),
  ]);
}

async function showPosts() {
  try {
    const { posts } = await request("/posts");
    status.remove();
    if (posts.length === 0) {
      list.append(el("p", { class: "empty", text: "Nothing published yet. Check back soon." }));
      return;
    }
    list.append(...posts.map(postItem));
  } catch (err) {
    status.textContent = err.message;
    status.classList.add("error");
  }
}

showPosts();
