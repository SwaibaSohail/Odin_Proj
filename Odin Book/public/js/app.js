// Small touches that make the pages nicer. Everything still works without
// this file: forms are just sent to the server and the page reloads.

// "Are you sure?" before deleting or unfollowing.
document.addEventListener("submit", (event) => {
  const question = event.target.dataset.confirm;
  if (question && !window.confirm(question)) event.preventDefault();
});

// Likes: update the heart and the count in place instead of reloading.
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-like]");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector("button");
  if (button.disabled) return;
  button.disabled = true;
  try {
    const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error();
    const { liked, likes } = await res.json();
    form.action = `/posts/${form.dataset.like}/${liked ? "unlike" : "like"}`;
    button.classList.toggle("liked", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.title = liked ? "Unlike" : "Like";
    form.querySelector("[data-like-count]").textContent = likes;
  } catch {
    // Something went wrong, so fall back to sending the form the normal way.
    form.removeAttribute("data-like");
    form.submit();
  } finally {
    button.disabled = false;
  }
});

// Pictures are shrunk in the browser before they're uploaded.

function loadPicture(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That picture couldn't be opened."));
    image.src = URL.createObjectURL(file);
  });
}

// Draws part of a picture onto a new canvas as a JPEG file.
// The white background is for PNGs with see-through parts.
function redraw(image, name, { sx, sy, sw, sh, width, height, quality }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  URL.revokeObjectURL(image.src);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], `${name.replace(/\.\w+$/, "")}.jpg`, { type: "image/jpeg" })) : reject(new Error("That picture couldn't be prepared."))),
      "image/jpeg",
      quality,
    );
  });
}

// Big photos become at most 1600px. Small ones go as they are, and so do GIFs,
// which may be animated.
async function shrink(file) {
  if (file.type === "image/gif") return file;
  const image = await loadPicture(file);
  const { naturalWidth: w, naturalHeight: h } = image;
  const longest = Math.max(w, h);
  if (longest <= 1600 && file.size <= 1024 * 1024) {
    URL.revokeObjectURL(image.src);
    return file;
  }
  const scale = Math.min(1, 1600 / longest);
  return redraw(image, file.name, { sx: 0, sy: 0, sw: w, sh: h, width: Math.round(w * scale), height: Math.round(h * scale), quality: 0.85 });
}

// A 256px square cut from the middle, for a profile photo.
async function square(file) {
  const image = await loadPicture(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  return redraw(image, file.name, {
    sx: (image.naturalWidth - side) / 2,
    sy: (image.naturalHeight - side) / 2,
    sw: side,
    sh: side,
    width: 256,
    height: 256,
    quality: 0.9,
  });
}

const isPicture = (file) => ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type);

// Swaps the file a form will send for a prepared one.
function setFile(input, file) {
  const files = new DataTransfer();
  if (file) files.items.add(file);
  input.files = files.files;
}

// The box for writing a post: it grows as you type, counts characters and
// shows the picture you picked.
const composer = document.querySelector("[data-composer]");
if (composer) {
  const text = composer.querySelector("textarea");
  const picker = composer.querySelector("input[type=file]");
  const preview = composer.querySelector("[data-preview]");
  const previewImage = preview.querySelector("img");
  const counter = composer.querySelector("[data-counter]");
  const problem = composer.querySelector("[data-composer-error]");

  const say = (message) => {
    problem.textContent = message;
    problem.hidden = !message;
  };
  const update = () => {
    text.style.height = "auto";
    text.style.height = `${text.scrollHeight}px`;
    counter.textContent = `${text.value.length.toLocaleString("en")} / 1,000`;
    counter.classList.toggle("near", text.value.length > 950);
  };
  const clearPicture = () => {
    setFile(picker, null);
    if (previewImage.src) URL.revokeObjectURL(previewImage.src);
    previewImage.removeAttribute("src");
    preview.hidden = true;
  };

  text.addEventListener("input", update);
  picker.addEventListener("change", async () => {
    const [file] = picker.files;
    say("");
    if (!file) return clearPicture();
    if (!isPicture(file)) {
      clearPicture();
      return say("Only PNG, JPEG, GIF and WebP pictures can be posted.");
    }
    try {
      const prepared = await shrink(file);
      setFile(picker, prepared);
      if (previewImage.src) URL.revokeObjectURL(previewImage.src);
      previewImage.src = URL.createObjectURL(prepared);
      preview.hidden = false;
    } catch (err) {
      clearPicture();
      say(err.message);
    }
  });
  composer.querySelector("[data-remove-picture]").addEventListener("click", clearPicture);
  composer.addEventListener("submit", (event) => {
    if (text.value.trim() || picker.files.length) return;
    event.preventDefault();
    say("Write something or add a picture.");
    text.focus();
  });
  update();
}

// Profile photo: crop to a square and upload as soon as one is picked.
const photoForm = document.querySelector("[data-photo-form]");
if (photoForm) {
  const picker = photoForm.querySelector("input[type=file]");
  picker.addEventListener("change", async () => {
    const [file] = picker.files;
    if (!file) return;
    try {
      if (isPicture(file)) setFile(picker, await square(file));
    } catch {
      // Send the original and let the server explain what's wrong with it.
    }
    photoForm.submit();
  });
}
