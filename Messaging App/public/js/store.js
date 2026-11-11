// What the app knows right now, shared by every part of the page, and a tiny
// way for those parts to tell each other that something changed.

export const state = {
  me: null,
  conversations: [], // your chats, newest first
  extra: null, // a chat that's open but has no messages yet, so isn't in the list
  people: [], // everyone else
  peopleLoadedAt: 0,
  openId: null, // the chat showing on the right
  reachable: true, // false while the server can't be reached
};

const listeners = {};

export function on(event, listener) {
  (listeners[event] ||= []).push(listener);
}

export function emit(event) {
  for (const listener of listeners[event] || []) listener();
}

export function findConversation(id) {
  return state.conversations.find((c) => c.id === id) || (state.extra?.id === id ? state.extra : null);
}

// The other person in a chat between two people.
export function peerOf(conversation) {
  return conversation.members.find((member) => member.id !== state.me.id) || conversation.members[0];
}

export function titleOf(conversation) {
  return conversation.isGroup ? conversation.name : peerOf(conversation).displayName;
}

export function unreadTotal() {
  return state.conversations.reduce((sum, c) => sum + c.unread, 0);
}
