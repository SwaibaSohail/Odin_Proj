// Small helpers for building the page. Text always goes in with textContent,
// so nothing anyone types can inject HTML.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

export function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

// "Maya Ortiz" -> "MO", "Sam" -> "SA"
export function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word) => [...word][0] || "";
  const letters = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : [...(words[0] || "?")].slice(0, 2).join("");
  return letters.toUpperCase();
}

// A photo, or initials on a colour picked from the id. Works for a person or
// a group. With `dot`, people who are online get a green dot.
export function avatar(who, { size = 40, dot = false } = {}) {
  const sizeClass = size === 40 ? "" : ` s${size}`;
  const picture = who.avatarUrl
    ? el("img", { class: `avatar${sizeClass}`, src: who.avatarUrl, alt: "", width: size, height: size })
    : el("span", {
        class: `avatar${sizeClass} c${who.id % 8}${who.isGroup ? " group" : ""}`,
        "aria-hidden": "true",
        text: initials(who.isGroup ? who.name : who.displayName),
      });
  if (!dot) return picture;
  return el("span", { class: "avatar-wrap" }, [picture, who.online ? el("span", { class: "dot", title: "Online" }) : null]);
}

// Dates and times

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const shortWeekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const fullDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// 0 for today, 1 for yesterday, and so on.
const daysAgo = (date) => Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);

export const clock = (iso) => timeFormat.format(new Date(iso));
export const joined = (iso) => monthYear.format(new Date(iso));
export const sameDay = (a, b) => startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();

// For the lines between days in a chat: "Today", "Yesterday", "Tuesday", "3 November 2026".
export function dayLabel(iso) {
  const date = new Date(iso);
  const days = daysAgo(date);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return days < 7 ? weekday.format(date) : fullDate.format(date);
}

// For the chat list: "14:32", "Yesterday", "Tue", "3 Nov".
export function shortWhen(iso) {
  const date = new Date(iso);
  const days = daysAgo(date);
  if (days <= 0) return clock(iso);
  if (days === 1) return "Yesterday";
  return days < 7 ? shortWeekday.format(date) : shortDate.format(date);
}

// "Online", "Last seen 5 minutes ago", "Last seen yesterday"
export function presence(user) {
  if (user.online) return "Online";
  if (!user.lastSeenAt) return "Offline";
  const minutes = Math.max(1, Math.round((Date.now() - new Date(user.lastSeenAt)) / 60000));
  if (minutes < 60) return `Last seen ${relative.format(-minutes, "minute")}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last seen ${relative.format(-hours, "hour")}`;
  const days = Math.round(hours / 24);
  return days < 30 ? `Last seen ${relative.format(-days, "day")}` : `Last seen ${shortDate.format(new Date(user.lastSeenAt))}`;
}

// Turns web addresses in a message into links. Everything else stays plain text.
export function linkify(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    // A full stop or bracket right after an address is punctuation, not part of it.
    const url = match[0].replace(/[.,!?;:)\]]+$/, "");
    parts.push(text.slice(last, match.index));
    parts.push(el("a", { href: url, target: "_blank", rel: "noopener noreferrer", text: url }));
    last = match.index + url.length;
  }
  parts.push(text.slice(last));
  return parts.filter(Boolean);
}
