// The left side: the Chats and People lists, search, and your own name at the bottom.
import { state, on, peerOf, titleOf, unreadTotal } from "./store.js";
import { loadPeople, openDirect, logOut } from "./actions.js";
import { el, avatar, shortWhen, presence } from "./ui.js";
import { editProfile, newGroup } from "./dialogs.js";

const tabChats = document.querySelector("#tab-chats");
const tabPeople = document.querySelector("#tab-people");
const search = document.querySelector("#search");
const list = document.querySelector("#list");
const empty = document.querySelector("#list-empty");
const totalBadge = document.querySelector("#unread-total");
const offline = document.querySelector("#offline");
const meButton = document.querySelector("#me");

let tab = "chats";
let drawn = "";

const firstName = (name) => name.split(" ")[0];
const matches = (text, query) => text.toLowerCase().includes(query);

// The line under a chat's name: its newest message.
function preview(conversation) {
  const last = conversation.lastMessage;
  if (!last) return "";
  const mine = last.sender.id === state.me.id;
  const who = mine ? "You" : firstName(last.sender.displayName);
  if (last.kind === "event") return `${who} ${last.body}`;
  const what = last.body || "Photo";
  if (mine || conversation.isGroup) return `${who}: ${what}`;
  return what;
}

function chatRow(conversation) {
  const last = conversation.lastMessage;
  const unread = conversation.unread;
  return el("li", {}, el(
    "a",
    {
      class: `row${unread ? " unread" : ""}`,
      href: `#/c/${conversation.id}`,
      "aria-current": conversation.id === state.openId ? "true" : null,
    },
    [
      avatar(conversation.isGroup ? conversation : peerOf(conversation), { dot: !conversation.isGroup }),
      el("span", { class: "row-body" }, [
        el("span", { class: "row-top" }, [
          el("span", { class: "row-title", text: titleOf(conversation) }),
          last ? el("time", { class: "row-when", datetime: last.createdAt, text: shortWhen(last.createdAt) }) : null,
        ]),
        el("span", { class: "row-bottom" }, [
          el("span", { class: "row-preview", text: preview(conversation) }),
          unread ? el("span", { class: "badge", text: unread > 99 ? "99+" : String(unread), "aria-label": `${unread} unread` }) : null,
        ]),
      ]),
    ],
  ));
}

function personRow(person) {
  return el("li", {}, el("button", { type: "button", class: "row", "data-user": person.id, title: `Message ${person.displayName}` }, [
    avatar(person, { dot: true }),
    el("span", { class: "row-body" }, [
      el("span", { class: "row-top" }, el("span", { class: "row-title", text: person.displayName })),
      el("span", { class: "row-bottom" }, el("span", { class: `row-preview${person.online ? " status-online" : ""}`, text: `@${person.username} · ${presence(person)}` })),
    ]),
  ]));
}

function chatRows(query) {
  const chats = state.conversations.filter((c) => !query || matches(titleOf(c), query));
  if (chats.length) return { rows: chats.map(chatRow) };
  return { rows: [], message: query ? "No chats match that search." : "No chats yet. Open People to say hello to someone." };
}

function peopleRows(query) {
  const people = state.people.filter((p) => !query || matches(p.displayName, query) || matches(p.username, query));
  if (!people.length) {
    if (!state.peopleLoadedAt) return { rows: [], message: "Loading..." };
    return { rows: [], message: query ? "Nobody matches that search." : "Nobody else has signed up yet." };
  }
  const online = people.filter((p) => p.online);
  const others = people.filter((p) => !p.online);
  const heading = (text) => el("li", { class: "list-heading", text });
  return {
    rows: [
      ...(online.length ? [heading(`Online (${online.length})`), ...online.map(personRow)] : []),
      ...(others.length ? [heading(online.length ? "Everyone else" : "Everyone"), ...others.map(personRow)] : []),
    ],
  };
}

function render() {
  const total = unreadTotal();
  totalBadge.hidden = total === 0;
  totalBadge.textContent = total > 99 ? "99+" : String(total);
  document.title = total ? `(${total}) Parley` : "Parley";
  offline.hidden = state.reachable;

  // Rebuilding the list every few seconds would drop focus and hover, so only
  // do it when what it shows has changed.
  const query = search.value.trim().toLowerCase();
  const source = tab === "chats" ? state.conversations : state.people;
  const signature = JSON.stringify([tab, query, state.openId, state.peopleLoadedAt > 0, source]);
  if (signature === drawn) return;
  drawn = signature;

  const { rows, message } = tab === "chats" ? chatRows(query) : peopleRows(query);
  list.replaceChildren(...rows);
  list.hidden = rows.length === 0;
  empty.hidden = rows.length > 0;
  empty.textContent = message || "";
}

function renderMe() {
  meButton.replaceChildren(
    avatar(state.me, { size: 34 }),
    el("span", { class: "me-text" }, [
      el("span", { class: "me-name", text: state.me.displayName }),
      el("span", { class: "me-hint", text: `@${state.me.username}` }),
    ]),
  );
}

function showTab(name) {
  tab = name;
  tabChats.setAttribute("aria-selected", String(name === "chats"));
  tabPeople.setAttribute("aria-selected", String(name === "people"));
  search.value = "";
  search.placeholder = name === "chats" ? "Search chats" : "Search people";
  if (name === "people") loadPeople().catch(() => {});
  render();
}

// Whether the People list is showing, so the app knows to keep it fresh.
export const showingPeople = () => tab === "people";

tabChats.addEventListener("click", () => showTab("chats"));
tabPeople.addEventListener("click", () => showTab("people"));
search.addEventListener("input", render);

list.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-user]");
  if (!row) return;
  try {
    await openDirect(Number(row.dataset.user));
    showTab("chats");
  } catch (err) {
    empty.textContent = err.message;
    empty.hidden = false;
  }
});

meButton.addEventListener("click", editProfile);
document.querySelector("#new-group").addEventListener("click", newGroup);
document.querySelector("#log-out").addEventListener("click", logOut);

on("conversations", render);
on("people", render);
on("route", render);
on("me", renderMe);
