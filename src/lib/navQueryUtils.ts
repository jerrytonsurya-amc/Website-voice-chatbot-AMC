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
  "latest", "month", "end", "fund", "scheme", "how", "much", "did", "give", "return",
  "returns", "performance", "perform", "growth", "historical", "history", "past",
  "previous", "best", "worst", "compare", "rank", "years", "year", "over", "from",
  "between", "since", "about", "tell", "show", "me",
]);

const KEY_TERMS = new Set([
  "aggressive", "hybrid", "balanced", "advantage", "elss", "tax", "saver", "flexi",
  "cap", "overnight", "multi", "asset", "allocation", "nifty", "1d", "rate", "liquid",
  "etf", "sector", "rotation", "money", "market",
]);

const PLAN_TERMS = new Set(["shriram", "direct", "regular", "growth", "idcw"]);

export function parseNavDate(date: string): Date {
  const [day, month, year] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function parseQuery(query: string) {
  const text = query.toLowerCase();

  let targetMonth: string | null = null;
  for (const [key, value] of Object.entries(MONTHS_MAP)) {
    if (text.includes(key)) {
      targetMonth = value;
      break;
    }
  }

  let targetYear: string | null = null;
  const yearMatch = text.match(/\b(202\d)\b/);
  if (yearMatch) {
    targetYear = yearMatch[1];
  }

  const queryWords = text
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  return { text, targetMonth, targetYear, queryWords };
}

export function scoreNavRow(row: NavRow, parsed: ReturnType<typeof parseQuery>): number {
  let score = 0;
  const scheme = (row["Scheme "] || "").toLowerCase();
  const schemeName = (row["Scheme Name "] || "").toLowerCase();
  const type = (row["Type "] || "").toLowerCase();
  const date = row.Date || "";

  if (parsed.targetYear && date.includes(parsed.targetYear)) {
    score += 30;
  }
  if (parsed.targetMonth) {
    const dateParts = date.split("-");
    if (dateParts[1] === parsed.targetMonth) {
      score += 30;
    }
  }

  for (const word of parsed.queryWords) {
    if (schemeName.includes(word)) {
      if (KEY_TERMS.has(word)) {
        score += 15;
      } else if (PLAN_TERMS.has(word)) {
        score += 8;
      } else {
        score += 4;
      }
    }
    if (scheme.includes(word)) {
      score += 2;
    }
    if (type.includes(word)) {
      score += 5;
    }
  }

  return score;
}

export function rankNavRows(rows: NavRow[], query: string, minScore = 2, limit = 10): NavRow[] {
  const parsed = parseQuery(query);
  return rows
    .map((row) => ({ row, score: scoreNavRow(row, parsed) }))
    .filter((item) => item.score > minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.row);
}
