// Small helpers for building the page. Text always goes in with textContent,
// so names typed by players can't inject HTML.

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

// 83456 -> "1:23.4". Rounds down, so nobody gets a tenth they didn't earn.
export function formatTime(ms, tenths = true) {
  const totalTenths = Math.floor(Math.max(0, ms) / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const time = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return tenths ? `${time}.${totalTenths % 10}` : time;
}

export function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

const shortDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatDate(iso) {
  return shortDate.format(new Date(iso));
}

// Rows for a high score table. `you` highlights the player's own row.
export function scoreRows(scores, { you, columns = ["rank", "name", "time"] } = {}) {
  return scores.map((score) => {
    const cells = {
      rank: el("td", { class: "rank", text: String(score.rank) }),
      name: el("td", { class: "name", text: score.name }),
      time: el("td", { class: "num", text: formatTime(score.timeMs) }),
      misses: el("td", { class: "num misses", text: String(score.misses) }),
      when: el("td", { class: "when" }, el("time", { datetime: score.finishedAt, text: formatDate(score.finishedAt) })),
    };
    return el("tr", score.rank === you ? { class: "you" } : {}, columns.map((column) => cells[column]));
  });
}
