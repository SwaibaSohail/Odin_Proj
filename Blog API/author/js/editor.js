import { request } from "./api.js";
import { READER_URL } from "./config.js";
import { requireSession, setFlash } from "./session.js";
import {
  el,
  timeEl,
  statusBadge,
  setUpPage,
  showMessage,
  hideMessage,
  showFieldErrors,
  clearFieldErrors,
} from "./ui.js";

const form = document.querySelector("#post-form");
const heading = document.querySelector("#heading");
const crumb = document.querySelector("#crumb");
const statusLine = document.querySelector("#post-status");
const saveButton = document.querySelector("#save");
const publishButton = document.querySelector("#publish");
const deleteButton = document.querySelector("#delete");
const viewLink = document.querySelector("#view-on-blog");
const commentsSection = document.querySelector("#comments");
const commentList = document.querySelector("#comment-list");
const commentsHeading = document.querySelector("#comments-heading");

const postId = new URLSearchParams(window.location.search).get("id");
let post = null;
let unsaved = false;

// Updates the buttons and status line to match the post.
function showPostState() {
  heading.textContent = post ? "Edit post" : "New post";
  crumb.textContent = post ? post.title : "New post";
  document.title = `${post ? post.title : "New post"} · Notebook Editor`;
  saveButton.textContent = post ? "Save changes" : "Save draft";
  publishButton.textContent = post?.published ? "Unpublish" : post ? "Publish" : "Save and publish";
  deleteButton.hidden = !post;
  viewLink.hidden = !post?.published;
  if (post) viewLink.href = `${READER_URL}/post.html?id=${post.id}`;

  statusLine.replaceChildren();
  if (post) {
    statusLine.append(statusBadge(post.published), " · Last saved ", timeEl(post.updatedAt));
    if (post.publishedAt) statusLine.append(" · First published ", timeEl(post.publishedAt));
  }
}

async function loadPost() {
  if (!postId) {
    showPostState();
    return;
  }
  try {
    ({ post } = await request(`/posts/${encodeURIComponent(postId)}`));
    form.elements.title.value = post.title;
    form.elements.body.value = post.body;
    showPostState();
    loadComments();
  } catch (err) {
    form.hidden = true;
    showMessage(err.status === 404 ? "That post doesn't exist." : err.message, "error");
  }
}

// Saves the form. publish: true/false changes the status, undefined keeps it.
async function save(publish) {
  clearFieldErrors(form);
  hideMessage();
  const fields = { title: form.elements.title.value, body: form.elements.body.value };
  if (publish !== undefined) fields.published = publish;

  try {
    if (!post) {
      const { post: created } = await request("/posts", { method: "POST", body: fields });
      unsaved = false;
      setFlash(created.published ? "Published. It's live on the blog." : "Draft saved.");
      window.location.replace(`editor.html?id=${created.id}`);
      return;
    }

    ({ post } = await request(`/posts/${post.id}`, { method: "PATCH", body: fields }));
    unsaved = false;
    showPostState();
    if (publish === true) showMessage("Published. It's live on the blog.");
    else if (publish === false) showMessage("Unpublished. It's a draft again.");
    else showMessage("Changes saved.");
  } catch (err) {
    if (err.details?.length) showFieldErrors(form, err.details);
    else showMessage(err.message, "error");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  save(undefined);
});

publishButton.addEventListener("click", () => {
  if (!form.reportValidity()) return;
  save(!post?.published);
});

deleteButton.addEventListener("click", async () => {
  if (!window.confirm(`Delete "${post.title}" and its comments? This can't be undone.`)) return;
  try {
    await request(`/posts/${post.id}`, { method: "DELETE" });
    unsaved = false;
    setFlash(`Deleted "${post.title}".`);
    window.location.replace("index.html");
  } catch (err) {
    showMessage(err.message, "error");
  }
});

form.addEventListener("input", () => {
  unsaved = true;
});

window.addEventListener("beforeunload", (event) => {
  if (unsaved) event.preventDefault();
});

// Comments

function commentItem(comment) {
  const body = el("p", { class: "comment-body", text: comment.body });
  const actions = el("div", { class: "comment-actions" }, [
    el("button", { type: "button", class: "btn btn-small", text: "Edit", onclick: () => startEditing() }),
    el("button", {
      type: "button",
      class: "btn btn-small btn-danger",
      text: "Delete",
      onclick: () => deleteComment(),
    }),
  ]);
  const item = el("li", { class: "comment" }, [
    el("p", { class: "comment-meta" }, [el("strong", { text: comment.name }), " · ", timeEl(comment.createdAt)]),
    body,
    actions,
  ]);

  function startEditing() {
    const textarea = el("textarea", { rows: "3", maxlength: "2000", "aria-label": `Edit comment by ${comment.name}` });
    textarea.value = comment.body;
    const error = el("p", { class: "field-error" });
    const editor = el("div", { class: "comment-editor" }, [
      textarea,
      error,
      el("div", { class: "comment-actions" }, [
        el("button", { type: "button", class: "btn btn-small btn-primary", text: "Save", onclick: saveEdit }),
        el("button", { type: "button", class: "btn btn-small btn-ghost", text: "Cancel", onclick: stopEditing }),
      ]),
    ]);
    body.replaceWith(editor);
    actions.hidden = true;
    textarea.focus();

    async function saveEdit() {
      try {
        const { comment: updated } = await request(`/comments/${comment.id}`, {
          method: "PATCH",
          body: { body: textarea.value },
        });
        comment.body = updated.body;
        body.textContent = updated.body;
        stopEditing();
        showMessage("Comment updated.");
      } catch (err) {
        error.textContent = err.details?.[0]?.message || err.message;
      }
    }

    function stopEditing() {
      editor.replaceWith(body);
      actions.hidden = false;
    }
  }

  async function deleteComment() {
    if (!window.confirm(`Delete this comment by ${comment.name}?`)) return;
    try {
      await request(`/comments/${comment.id}`, { method: "DELETE" });
      item.remove();
      updateCommentsHeading();
      showMessage("Comment deleted.");
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  return item;
}

function updateCommentsHeading() {
  const count = commentList.children.length;
  commentsHeading.textContent = count === 0 ? "No comments" : `Comments (${count})`;
}

async function loadComments() {
  try {
    const { comments } = await request(`/posts/${post.id}/comments`);
    commentList.replaceChildren(...comments.map(commentItem));
    updateCommentsHeading();
    commentsSection.hidden = false;
  } catch (err) {
    showMessage(err.message, "error");
  }
}

if (requireSession()) {
  setUpPage();
  loadPost();
}
