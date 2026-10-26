// Small helpers for building the page. Text always goes in with textContent,
// so nothing from the API can inject HTML.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

const longDate = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDate(iso) {
  return longDate.format(new Date(iso));
}

export function formatDateTime(iso) {
  return dateTime.format(new Date(iso));
}

export function timeEl(iso, format = formatDate) {
  return el("time", { datetime: iso, text: format(iso) });
}

// Blank lines separate paragraphs.
export function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => el("p", { text: part }));
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
