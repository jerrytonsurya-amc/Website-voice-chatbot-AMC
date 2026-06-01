import { getNavCache } from "./navCache";
import type { NavRow } from "./navTypes";

export type { NavRow } from "./navTypes";

const monthsMap: Record<string, string> = {
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
  "latest", "month", "end", "return", "returns", "performance", "perform", "performed",
  "growth", "historical", "history", "past", "previous", "year", "years", "compare",
  "best", "top", "worst", "how", "did", "fund", "funds", "scheme", "schemes",
]);

export function parseNavDate(dateStr: string): Date {
  const [dd, mm, yy] = dateStr.split("-").map(Number);
  return new Date(yy, mm - 1, dd);
}

export function formatNavDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export function fundVariantKey(row: NavRow): string {
  return `${row["Scheme Name "].trim()}|${row["Type "].trim()}`;
}

export function matchNavRows(query: string, limit = 10): NavRow[] {
  const cache = getNavCache() as NavRow[];
  if (cache.length === 0) return [];

  const text = query.toLowerCase();

  let targetMonth: string | null = null;
  for (const mkey in monthsMap) {
    if (text.includes(mkey)) {
      targetMonth = monthsMap[mkey];
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
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  const wantsComparison =
    /\b(best|top|worst|compare|comparison|rank|ranking|highest|lowest)\b/.test(text);
  const effectiveLimit = wantsComparison && queryWords.length === 0 ? 37 : limit;

  const scoredRows = cache.map((row) => {
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
        if (["aggressive", "hybrid", "balanced", "advantage", "elss", "tax", "saver", "flexi", "cap", "overnight", "multi", "asset", "allocation", "nifty", "1d", "rate", "liquid", "etf", "sector", "rotation", "money", "market"].includes(word)) {
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
  });

  const topScored = scoredRows
    .filter((item) => item.score > 2 || (wantsComparison && queryWords.length === 0))
    .sort((a, b) => b.score - a.score);

  const uniqueVariants = new Map<string, NavRow>();
  for (const item of topScored) {
    const key = fundVariantKey(item.row);
    if (!uniqueVariants.has(key)) {
      uniqueVariants.set(key, item.row);
    }
    if (uniqueVariants.size >= effectiveLimit) break;
  }

  return [...uniqueVariants.values()];
}

export function getFundHistory(row: NavRow): NavRow[] {
  const cache = getNavCache() as NavRow[];
  const key = fundVariantKey(row);

  return cache
    .filter((entry) => fundVariantKey(entry) === key)
    .sort((a, b) => parseNavDate(b.Date).getTime() - parseNavDate(a.Date).getTime());
}
