import type { NavRow } from "./navTypes";

const MONTHS_MAP: Record<string, string> = {
  january: "01", jan: "01", " 01 ": "01", "/01/": "01", janvari: "01",
  february: "02", feb: "02", " 02 ": "02", "/02/": "02", farvari: "02", februaryi: "02",
  march: "03", mar: "03", " 03 ": "03", "/03/": "03", marcha: "03", maarch: "03",
  april: "04", apr: "04", " 04 ": "04", "/04/": "04", aprel: "04",
  may: "05", " 05 ": "05", "/05/": "05", mai: "05",
  june: "06", jun: "06", " 06 ": "06", "/06/": "06", joon: "06",
  july: "07", jul: "07", " 07 ": "07", "/07/": "07",
  august: "08", aug: "08", " 08 ": "08", "/08/": "08", agast: "08",
  september: "09", sep: "09", sept: "09", " 09 ": "09", "/09/": "09", sitambar: "09",
  october: "10", oct: "10", " 10 ": "10", "/10/": "10", aktubar: "10",
  november: "11", nov: "11", " 11 ": "11", "/11/": "11", navambar: "11",
  december: "12", dec: "12", " 12 ": "12", "/12/": "12", disambar: "12",
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "what", "is", "of", "in", "at", "on", "nav", "value",
  "latest", "month", "end", "how", "did", "perform", "performance", "return", "returns",
  "growth", "past", "previous", "history", "historical", "year", "years", "last", "over",
  "compare", "between", "from", "to", "was", "were", "has", "have", "fund", "scheme",
]);

export function parseNavDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function sortNavRowsByDate(rows: NavRow[]): NavRow[] {
  return [...rows].sort(
    (a, b) => parseNavDate(a.Date).getTime() - parseNavDate(b.Date).getTime()
  );
}

export function scoreNavRows(cache: NavRow[], query: string): { row: NavRow; score: number }[] {
  const text = query.toLowerCase();

  let targetMonth: string | null = null;
  for (const mkey in MONTHS_MAP) {
    if (text.includes(mkey)) {
      targetMonth = MONTHS_MAP[mkey];
      break;
    }
  }

  let targetYear: string | null = null;
  const yearMatch = text.match(/\b(202\d|2\d)\b/);
  if (yearMatch) {
    targetYear = yearMatch[1];
    if (targetYear.length === 2) {
      targetYear = "20" + targetYear;
    }
  }

  const queryWords = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return cache
    .map((row) => {
      let score = 0;
      const scheme = (row["Scheme "] || "").toLowerCase();
      const schemeName = (row["Scheme Name "] || "").toLowerCase();
      const type = (row["Type "] || "").toLowerCase();
      const date = row.Date || "";

      if (targetYear && date.includes(targetYear)) score += 30;
      if (targetMonth) {
        const dateParts = date.split("-");
        if (dateParts[1] === targetMonth) score += 30;
      }

      for (const word of queryWords) {
        if (schemeName.includes(word)) {
          if (
            [
              "aggressive", "hybrid", "balanced", "advantage", "elss", "tax", "saver",
              "flexi", "cap", "overnight", "multi", "asset", "allocation", "nifty", "1d",
              "rate", "liquid", "etf", "sector", "rotation", "money", "market",
            ].includes(word)
          ) {
            score += 15;
          } else if (["shriram", "direct", "regular", "growth", "idcw"].includes(word)) {
            score += 8;
          } else {
            score += 4;
          }
        }
        if (scheme.includes(word)) score += 2;
        if (type.includes(word)) score += 5;
      }

      return { row, score };
    })
    .filter((item) => item.score > 2)
    .sort((a, b) => b.score - a.score);
}

/** Group top matches by full scheme name (plan variant). */
export function getTopSchemeGroups(
  cache: NavRow[],
  query: string,
  limit = 3
): { schemeName: string; rows: NavRow[] }[] {
  const scored = scoreNavRows(cache, query);
  const byScheme = new Map<string, NavRow[]>();

  for (const { row } of scored) {
    const name = row["Scheme Name "]?.trim();
    if (!name || byScheme.has(name)) continue;
    const allRows = cache.filter((r) => r["Scheme Name "]?.trim() === name);
    if (allRows.length > 0) {
      byScheme.set(name, sortNavRowsByDate(allRows));
    }
    if (byScheme.size >= limit) break;
  }

  return [...byScheme.entries()].map(([schemeName, rows]) => ({ schemeName, rows }));
}
