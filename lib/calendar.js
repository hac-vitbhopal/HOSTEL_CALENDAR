import { getEntries } from "./dataStore.js";

export const EXAM_WARNING_DAYS = 2;
const COLOR_PRIORITY = ["red", "yellow", "blue", "green"];
const TYPE_COLOR = {
  exam: "red",
  event: "blue",
  sport: "green",
  hpl: "green",
  holiday: "yellow",
};

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function buildCalendarMap(entries) {
  const map = {};
  const ensureDay = (iso) => {
    if (!map[iso]) map[iso] = { colors: new Set(), items: [] };
    return map[iso];
  };

  for (const raw of entries || []) {
    const start = String(raw?.startDate || raw?.date || "").trim();
    const end = String(raw?.endDate || start).trim();
    const type = String(raw?.type || "").trim().toLowerCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !type) continue;

    const item = { startDate: start, endDate: end, type, title: String(raw?.title || ""), batches: String(raw?.batches || raw?.batch || ""), details: String(raw?.details || "") };
    const baseColor = TYPE_COLOR[type] || "green";
    let cursor = start;
    while (cursor <= end) {
      const day = ensureDay(cursor);
      day.colors.add(baseColor);
      day.items.push(item);
      cursor = addDaysIso(cursor, 1);
    }

    if (type === "exam") {
      for (let n = 1; n <= EXAM_WARNING_DAYS; n++) ensureDay(addDaysIso(start, -n)).colors.add("yellow");
    }
  }

  const result = {};
  for (const [iso, day] of Object.entries(map)) {
    const color = COLOR_PRIORITY.find((c) => day.colors.has(c)) || null;
    const uniqueItems = day.items.filter((item, i, arr) => arr.findIndex((x) => x.startDate === item.startDate && x.endDate === item.endDate && x.type === item.type && x.title === item.title) === i);
    result[iso] = { color, items: uniqueItems };
  }
  return result;
}

export async function fetchCalendarData() {
  return buildCalendarMap(await getEntries());
}
