// Pop-ups: profiles, the new group form, group details and the picture viewer.
import { request } from "./api.js";
import { state, emit } from "./store.js";
import { loadPeople, openDirect } from "./actions.js";
import { el, avatar, presence, joined, plural } from "./ui.js";
import { isPicture, squarePhoto } from "./images.js";

const dialog = document.querySelector("#dialog");
const lightbox = document.querySelector("#lightbox");

function show(title, body) {
  dialog.replaceChildren(
    el("header", { class: "dialog-head" }, [
      el("h2", { id: "dialog-title", text: title }),
      el("button", { type: "button", class: "btn-plain", "data-close": true, text: "Close" }),
    ]),
    el("div", { class: "dialog-body" }, body),
  );
  if (!dialog.open) dialog.showModal();
}

for (const box of [dialog, lightbox]) {
  box.addEventListener("click", (event) => {
    // A click on the dimmed area around a pop-up lands on the pop-up element itself.
    if (event.target === box || event.target.closest("[data-close]")) box.close();
  });
}

const message = (kind = "error") => el("p", { class: `form-message ${kind}`, role: "status" });

function field(label, input, extra = []) {
  return el("div", { class: "field" }, [el("label", { for: input.id, text: label }), input, ...extra]);
}

// Puts a chat the server just sent back into the list in place of the old copy.
function keep(conversation) {
  state.conversations = [conversation, ...state.conversations.filter((c) => c.id !== conversation.id)];
  emit("conversations");
}

// A searchable list of people with tick boxes.
function peoplePicker(people, onChange) {
  const chosen = new Set();
  const filter = el("input", { type: "search", placeholder: "Search people", "aria-label": "Search people", autocomplete: "off" });
  const list = el("ul", { class: "pick-list" });

  function row(person) {
    const box = el("input", { type: "checkbox", value: person.id, checked: chosen.has(person.id) });
    box.addEventListener("change", () => {
      if (box.checked) chosen.add(person.id);
      else chosen.delete(person.id);
      onChange(chosen.size);
    });
    return el("li", {}, el("label", { class: "pick" }, [
      box,
      avatar(person, { size: 28 }),
      el("span", { class: "pick-name", text: person.displayName }),
      el("span", { class: "muted", text: `@${person.username}` }),
    ]));
  }

  function draw() {
    const query = filter.value.trim().toLowerCase();
    const shown = people.filter((p) => !query || p.displayName.toLowerCase().includes(query) || p.username.includes(query));
    const nobody = people.length ? "Nobody matches that search." : "There's nobody to add yet.";
    list.replaceChildren(...(shown.length ? shown.map(row) : [el("li", { class: "empty", text: nobody })]));
  }

  filter.addEventListener("input", draw);
  draw();
  return { node: el("div", { class: "field" }, [filter, list]), ids: () => [...chosen] };
}

// ---------------------------------------------------------------- Profiles

// Someone's profile. Yours gets an Edit button, everyone else's a Message button.
export function showUser(user) {
  const isMe = user.id === state.me.id;
  const note = message();
  const action = el("button", { type: "button", class: "btn btn-primary", text: isMe ? "Edit profile" : "Message" });
  action.addEventListener("click", async () => {
    if (isMe) return editProfile();
    try {
      await openDirect(user.id);
      dialog.close();
    } catch (err) {
      note.textContent = err.message;
    }
  });

  show(isMe ? "Your profile" : "Profile", [
    el("div", { class: "profile-top" }, [
      avatar(user, { size: 96 }),
      el("h3", { text: user.displayName }),
      el("p", { class: "muted", text: `@${user.username}` }),
      el("p", { class: isMe || user.online ? "status-online" : "muted", text: isMe ? "Online" : presence(user) }),
    ]),
    user.about ? el("p", { class: "profile-about", text: user.about }) : null,
    el("p", { class: "muted", text: `Joined ${joined(user.createdAt)}` }),
    note,
    el("div", { class: "dialog-actions" }, action),
  ]);
}

export function editProfile() {
  const photo = el("span", {}, avatar(state.me, { size: 96 }));
  const picker = el("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp", hidden: true });
  const change = el("button", { type: "button", class: "btn btn-small" });
  const remove = el("button", { type: "button", class: "btn btn-small", text: "Remove" });
  const photoNote = message("good");

  const name = el("input", { id: "profile-name", maxlength: "40", autocomplete: "name", required: true });
  const about = el("textarea", { id: "profile-about", maxlength: "160", rows: "3", placeholder: "A line about you" });
  const username = el("input", { id: "profile-username", readonly: true });
  const nameError = el("p", { class: "field-error" });
  const aboutError = el("p", { class: "field-error" });
  const counter = el("span", { class: "counter" });
  const save = el("button", { type: "submit", class: "btn btn-primary", text: "Save" });
  const note = message();
  name.value = state.me.displayName;
  about.value = state.me.about;
  username.value = `@${state.me.username}`;

  function showPhoto() {
    photo.replaceChildren(avatar(state.me, { size: 96 }));
    change.textContent = state.me.avatarUrl ? "Change photo" : "Add a photo";
    remove.hidden = !state.me.avatarUrl;
  }
  function sayPhoto(text, kind) {
    photoNote.textContent = text;
    photoNote.className = `form-message ${kind}`;
  }
  // The server replies with the new profile, which the rest of the page picks up.
  function update(user) {
    state.me = user;
    emit("me");
    emit("refresh");
  }
  const count = () => {
    counter.textContent = `${about.value.length} / 160`;
  };

  change.addEventListener("click", () => picker.click());
  picker.addEventListener("change", async () => {
    const [file] = picker.files;
    picker.value = "";
    if (!file) return;
    if (!isPicture(file)) return sayPhoto("Choose a PNG, JPEG, GIF or WebP picture.", "error");
    try {
      const body = new FormData();
      body.append("avatar", await squarePhoto(file));
      update((await request("/users/me/avatar", { method: "PUT", body })).user);
      showPhoto();
      sayPhoto("Photo updated.", "good");
    } catch (err) {
      sayPhoto(err.message, "error");
    }
  });
  remove.addEventListener("click", async () => {
    try {
      update((await request("/users/me/avatar", { method: "DELETE" })).user);
      showPhoto();
      sayPhoto("Photo removed.", "good");
    } catch (err) {
      sayPhoto(err.message, "error");
    }
  });
  about.addEventListener("input", () => {
    count();
    aboutError.textContent = "";
  });
  name.addEventListener("input", () => {
    nameError.textContent = "";
  });

  const form = el("form", { novalidate: true }, [
    el("div", { class: "photo-row" }, [photo, el("div", {}, [el("div", { class: "photo-buttons" }, [change, remove, picker]), photoNote])]),
    field("Your name", name, [nameError]),
    field("About", about, [counter, aboutError]),
    field("Username", username, [el("p", { class: "hint", text: "Usernames can't be changed." })]),
    note,
    el("div", { class: "dialog-actions" }, save),
  ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    nameError.textContent = aboutError.textContent = note.textContent = "";
    save.disabled = true;
    try {
      update((await request("/users/me", { method: "PATCH", body: { displayName: name.value, about: about.value } })).user);
      dialog.close();
    } catch (err) {
      const errors = Object.fromEntries((err.details || []).map((detail) => [detail.field, detail.message]));
      nameError.textContent = errors.displayName || "";
      aboutError.textContent = errors.about || "";
      if (!errors.displayName && !errors.about) note.textContent = err.message;
      save.disabled = false;
    }
  });

  showPhoto();
  count();
  show("Your profile", form);
  name.focus();
}

// ---------------------------------------------------------------- Groups

export async function newGroup() {
  await loadPeople().catch(() => {});

  const name = el("input", { id: "group-name", maxlength: "50", autocomplete: "off", placeholder: "Weekend plans", required: true });
  const create = el("button", { type: "submit", class: "btn btn-primary", text: "Create group", disabled: true });
  const note = message();
  const ready = () => {
    create.disabled = !name.value.trim() || picker.ids().length === 0;
  };
  const picker = peoplePicker(state.people, ready);
  name.addEventListener("input", ready);

  const form = el("form", { novalidate: true }, [
    field("Group name", name),
    el("p", { class: "section-title", text: "Who's in it" }),
    picker.node,
    note,
    el("div", { class: "dialog-actions" }, create),
  ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    create.disabled = true;
    try {
      const { conversation } = await request("/conversations/groups", {
        method: "POST",
        body: { name: name.value, memberIds: picker.ids() },
      });
      keep(conversation);
      dialog.close();
      window.location.hash = `#/c/${conversation.id}`;
    } catch (err) {
      note.textContent = err.details?.[0]?.message || err.message;
      ready();
    }
  });

  show("New group", form);
  name.focus();
}

// A group's name and members, with ways to rename it, add people or leave.
export async function groupInfo(conversation) {
  await loadPeople().catch(() => {});
  const { id } = conversation;
  const note = message();

  const name = el("input", { id: "group-rename", maxlength: "50", autocomplete: "off", "aria-label": "Group name", required: true });
  const rename = el("button", { type: "submit", class: "btn", text: "Rename" });
  name.value = conversation.name;
  const renameForm = el("form", { class: "inline-form", novalidate: true }, [name, rename]);
  renameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    note.textContent = "";
    try {
      const data = await request(`/conversations/${id}`, { method: "PATCH", body: { name: name.value } });
      keep(data.conversation);
      emit("refresh");
      groupInfo(data.conversation);
    } catch (err) {
      note.textContent = err.details?.[0]?.message || err.message;
    }
  });

  // You first, then everyone else by name.
  const byName = (a, b) => (b.id === state.me.id) - (a.id === state.me.id) || a.displayName.localeCompare(b.displayName);
  const members = el("ul", { class: "member-list" }, [...conversation.members].sort(byName).map((member) => {
    const isMe = member.id === state.me.id;
    const row = el("button", { type: "button", class: "row" }, [
      avatar(member, { size: 34, dot: !isMe }),
      el("span", { class: "row-body" }, [
        el("span", { class: "row-top" }, el("span", { class: "row-title", text: isMe ? `${member.displayName} (you)` : member.displayName })),
        el("span", { class: "row-bottom" }, el("span", { class: "row-preview", text: isMe ? "Online" : presence(member) })),
      ]),
    ]);
    row.addEventListener("click", () => showUser(member));
    return el("li", {}, row);
  }));

  const inGroup = new Set(conversation.members.map((member) => member.id));
  const add = el("button", { type: "button", class: "btn", text: "Add to group", disabled: true });
  const picker = peoplePicker(state.people.filter((person) => !inGroup.has(person.id)), (count) => {
    add.disabled = count === 0;
  });
  add.addEventListener("click", async () => {
    note.textContent = "";
    add.disabled = true;
    try {
      const data = await request(`/conversations/${id}/members`, { method: "POST", body: { userIds: picker.ids() } });
      keep(data.conversation);
      emit("refresh");
      groupInfo(data.conversation);
    } catch (err) {
      note.textContent = err.details?.[0]?.message || err.message;
      add.disabled = false;
    }
  });

  const leave = el("button", { type: "button", class: "btn btn-danger", text: "Leave group" });
  leave.addEventListener("click", async () => {
    if (!window.confirm(`Leave "${conversation.name}"? You'll need someone to add you back.`)) return;
    try {
      await request(`/conversations/${id}/members/me`, { method: "DELETE" });
      state.conversations = state.conversations.filter((c) => c.id !== id);
      emit("conversations");
      dialog.close();
      window.location.hash = "#/";
    } catch (err) {
      note.textContent = err.message;
    }
  });

  show("Group details", [
    renameForm,
    el("p", { class: "section-title", text: plural(conversation.members.length, "member") }),
    members,
    el("p", { class: "section-title", text: "Add people" }),
    picker.node,
    note,
    el("div", { class: "dialog-actions" }, add),
    el("div", { class: "dialog-actions leave" }, leave),
  ]);
}

// ---------------------------------------------------------------- Pictures

export function showPicture(url, description) {
  lightbox.replaceChildren(
    el("button", { type: "button", class: "btn btn-small lightbox-close", "data-close": true, text: "Close" }),
    el("img", { src: url, alt: description }),
  );
  lightbox.showModal();
}
