// Starts the app, and keeps it up to date by asking the server every few
// seconds whether anything has changed.
import { request } from "./api.js";
import { state, on, emit } from "./store.js";
import { loadConversations, loadPeople } from "./actions.js";
import { showingPeople } from "./sidebar.js";
import * as chat from "./chat.js";

const CHECK_EVERY_MS = 3000;
// A tab in the background checks less often, which is still enough to stay "online".
const CHECK_HIDDEN_MS = 30000;
const PEOPLE_EVERY_MS = 10000;

let timer = null;
let refreshing = false;

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    await loadConversations();
    state.reachable = true;
    await chat.sync();
    if (showingPeople() && Date.now() - state.peopleLoadedAt > PEOPLE_EVERY_MS) await loadPeople();
  } catch (err) {
    if (err.offline || err.status >= 500) state.reachable = false;
  } finally {
    refreshing = false;
    emit("conversations");
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    await refresh();
    schedule();
  }, document.hidden ? CHECK_HIDDEN_MS : CHECK_EVERY_MS);
}

const refreshNow = () => refresh().then(schedule);

// The address decides which chat is open: #/c/12 is chat 12.
function route() {
  const match = window.location.hash.match(/^#\/c\/(\d+)$/);
  if (match) chat.open(Number(match[1]));
  else chat.close();
  emit("route");
}

async function start() {
  state.me = (await request("/auth/me")).user;
  emit("me");
  await refresh();
  route();
  schedule();
}

window.addEventListener("hashchange", route);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshNow();
});
on("refresh", refreshNow);

start().catch(() => {
  // The first request failed. Show that, and keep trying.
  state.reachable = false;
  emit("conversations");
  setTimeout(() => window.location.reload(), CHECK_HIDDEN_MS);
});
