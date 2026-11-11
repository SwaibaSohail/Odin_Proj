// Things the page asks the server to do that more than one part of it needs.
import { request } from "./api.js";
import { state, emit } from "./store.js";

export async function loadConversations() {
  const { conversations } = await request("/conversations");
  state.conversations = conversations;
  if (state.extra && conversations.some((c) => c.id === state.extra.id)) state.extra = null;
}

export async function loadPeople() {
  const { users } = await request("/users");
  state.people = users;
  state.peopleLoadedAt = Date.now();
  emit("people");
}

// Opens the chat with one person, creating it the first time.
export async function openDirect(userId) {
  let conversation = state.conversations.find((c) => !c.isGroup && c.members.some((member) => member.id === userId));
  if (!conversation) {
    ({ conversation } = await request("/conversations/direct", { method: "POST", body: { userId } }));
    // A brand new chat isn't in the list until someone says something.
    if (!state.conversations.some((c) => c.id === conversation.id)) state.extra = conversation;
  }
  window.location.hash = `#/c/${conversation.id}`;
}

export async function logOut() {
  await request("/auth/logout", { method: "POST" }).catch(() => {});
  window.location.replace("/login");
}
