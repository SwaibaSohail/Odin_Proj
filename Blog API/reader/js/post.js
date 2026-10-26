import { request } from "./api.js";
import { el, timeEl, formatDateTime, paragraphs, plural } from "./ui.js";

const article = document.querySelector("#post");
const status = document.querySelector("#status");
const commentsSection = document.querySelector("#comments");
const commentList = document.querySelector("#comment-list");
const commentHeading = document.querySelector("#comments-heading");
const form = document.querySelector("#comment-form");
const formMessage = document.querySelector("#form-message");

const postId = new URLSearchParams(window.location.search).get("id");
let commentCount = 0;

function commentItem(comment) {
  return el("li", { class: "comment" }, [
    el("p", { class: "comment-meta" }, [
      el("strong", { text: comment.name }),
      " · ",
      timeEl(comment.createdAt, formatDateTime),
    ]),
    el("p", { class: "comment-body", text: comment.body }),
  ]);
}

function updateHeading() {
  commentHeading.textContent = commentCount === 0 ? "No comments yet" : plural(commentCount, "comment");
}

async function showPost() {
  if (!postId) {
    status.textContent = "No post was chosen.";
    return;
  }

  try {
    const [{ post }, { comments }] = await Promise.all([
      request(`/posts/${encodeURIComponent(postId)}`),
      request(`/posts/${encodeURIComponent(postId)}/comments`),
    ]);

    document.title = `${post.title} · Notebook`;
    status.remove();
    article.append(
      el("p", { class: "meta" }, [timeEl(post.publishedAt), ` · by ${post.author.name}`]),
      el("h1", { text: post.title }),
      el("div", { class: "post-body" }, paragraphs(post.body))
    );

    commentCount = comments.length;
    updateHeading();
    commentList.append(...comments.map(commentItem));
    commentsSection.hidden = false;
  } catch (err) {
    status.textContent = err.status === 404 ? "This post doesn't exist, or it isn't published." : err.message;
    status.classList.add("error");
  }
}

function showFieldErrors(details) {
  for (const { field, message } of details) {
    const input = form.elements[field];
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.setAttribute("aria-invalid", "true");
    if (slot) slot.textContent = message;
  }
}

function clearErrors() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
  for (const slot of form.querySelectorAll("[data-error-for]")) slot.textContent = "";
  for (const input of form.querySelectorAll("[aria-invalid]")) input.removeAttribute("aria-invalid");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();
  const button = form.querySelector("button");
  button.disabled = true;

  try {
    const { comment } = await request(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: { name: form.elements.name.value, body: form.elements.body.value },
    });
    commentList.append(commentItem(comment));
    commentCount += 1;
    updateHeading();
    form.elements.body.value = "";
    formMessage.textContent = "Thanks! Your comment is up.";
    formMessage.classList.add("success");
  } catch (err) {
    showFieldErrors(err.details || []);
    if (!err.details?.length) {
      formMessage.textContent = err.message;
      formMessage.classList.add("error");
    }
  } finally {
    button.disabled = false;
  }
});

showPost();
