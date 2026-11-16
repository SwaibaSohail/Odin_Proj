// Small functions the pages use to show things.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fullDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

// "just now", "5m", "3h", "2d", then a date.
function timeAgo(date) {
  const age = Date.now() - date.getTime();
  if (age < MINUTE) return "just now";
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`;
  if (age < DAY) return `${Math.floor(age / HOUR)}h`;
  if (age < 7 * DAY) return `${Math.floor(age / DAY)}d`;
  return date.getFullYear() === new Date().getFullYear() ? shortDate.format(date) : longDate.format(date);
}

const exactTime = (date) => `${fullDate.format(date)} UTC`;
const joined = (date) => monthYear.format(date);

function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

// "Maya Ortiz" -> "MO", "Sam" -> "SA"
function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word) => [...word][0] || "";
  const letters = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : [...(words[0] || "?")].slice(0, 2).join("");
  return letters.toUpperCase();
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

// Makes text safe to put in a page, and turns web addresses into links.
function linkify(text) {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    // A full stop or bracket right after an address is punctuation, not part of it.
    const url = match[0].replace(/[.,!?;:)\]]+$/, "");
    html += escapeHtml(text.slice(last, match.index));
    html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    last = match.index + url.length;
  }
  return html + escapeHtml(text.slice(last));
}

module.exports = { timeAgo, exactTime, joined, plural, initials, linkify };
