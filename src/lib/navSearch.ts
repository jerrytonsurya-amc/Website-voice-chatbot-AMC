import { parseNavFile } from "./navParser";

interface NavRow {
  "Net Asset Value": number;
  "Date": string;
  "Scheme ": string;
  "Scheme Name ": string;
  "Type ": string;
}

let navCache: NavRow[] = [];

export function getNavCache(): NavRow[] {
  if (navCache.length === 0) {
    try {
      navCache = parseNavFile() as NavRow[];
      console.log(`NAV Cache initialized with ${navCache.length} rows.`);
    } catch (e) {
      console.error("Failed to initialize NAV cache:", e);
    }
  }
  return navCache;
}

export function searchNavData(query: string): string {
  const cache = getNavCache();
  if (cache.length === 0) {
    return "No NAV data available in database.";
  }

  const text = query.toLowerCase();

  // Mapping for months
  const monthsMap: { [key: string]: string } = {
    january: "01", jan: "01", " 01 ": "01", "/01/": "01",
    february: "02", feb: "02", " 02 ": "02", "/02/": "02",
    march: "03", mar: "03", " 03 ": "03", "/03/": "03",
    april: "04", apr: "04", " 04 ": "04", "/04/": "04",
    may: "05", " 05 ": "05", "/05/": "05",
    june: "06", jun: "06", " 06 ": "06", "/06/": "06",
    july: "07", jul: "07", " 07 ": "07", "/07/": "07",
    august: "08", aug: "08", " 08 ": "08", "/08/": "08",
    september: "09", sep: "09", sept: "09", " 09 ": "09", "/09/": "09",
    october: "10", oct: "10", " 10 ": "10", "/10/": "10",
    november: "11", nov: "11", " 11 ": "11", "/11/": "11",
    december: "12", dec: "12", " 12 ": "12", "/12/": "12"
  };

  let targetMonth: string | null = null;
  for (const mkey in monthsMap) {
    if (text.includes(mkey)) {
      targetMonth = monthsMap[mkey];
      break;
    }
  }

  // Find Year (e.g. 2022, 2023, 2024, 2025, 2026)
  let targetYear: string | null = null;
  const yearMatch = text.match(/\b(202\d|2\d)\b/);
  if (yearMatch) {
    targetYear = yearMatch[1];
    if (targetYear.length === 2) {
      targetYear = "20" + targetYear;
    }
  }

  // Extract other key descriptor words from query (split by non-alphanumeric, filter short words)
  const queryWords = text.split(/[^a-z0-9]+/).filter(w => w.length > 1 && !["the", "and", "for", "with", "what", "is", "of", "in", "at", "on", "nav", "value", "latest", "month", "end"].includes(w));

  // Determine fund match scores
  const scoredRows = cache.map(row => {
    let score = 0;

    const scheme = (row["Scheme "] || "").toLowerCase();
    const schemeName = (row["Scheme Name "] || "").toLowerCase();
    const type = (row["Type "] || "").toLowerCase();
    const date = (row["Date"] || ""); // e.g. "31-01-2022"

    // 1. Date matches
    if (targetYear && date.includes(targetYear)) {
      score += 30; // Strong weight for year match
    }
    if (targetMonth) {
      const dateParts = date.split('-');
      if (dateParts[1] === targetMonth) {
        score += 30; // Strong weight for month match
      }
    }

    // 2. Query word matches
    for (const word of queryWords) {
      if (schemeName.includes(word)) {
        // High score for key distinctive terms
        if (["aggressive", "hybrid", "balanced", "advantage", "elss", "tax", "saver", "flexi", "cap", "overnight", "multi", "asset", "allocation", "nifty", "1d", "rate", "liquid", "etf", "sector", "rotation", "money", "market"].includes(word)) {
          score += 15;
        } else if (["shriram", "direct", "regular", "growth", "idcw"].includes(word)) {
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

    return { row, score };
  });

  // Sort descending and select highly-relevant results
  const topScored = scoredRows
    .filter(item => item.score > 2)
    .sort((a, b) => b.score - a.score);

  if (topScored.length === 0) {
    return "No matching funds or dates found in our records. Please verify the fund name or date and try again.";
  }

  // Take top 10 results
  const results = topScored.slice(0, 10).map(item => item.row);

  // Build an extremely readable text response for Gemini to use.
  let responseText = "Matching NAV records found from the Shriram AMC database:\n\n";
  results.forEach((r, idx) => {
    responseText += `${idx + 1}. Fund: ${r["Scheme Name "].trim()} (${r["Type "].trim()})\n`;
    responseText += `   - Month-End Date: ${r["Date"]}\n`;
    responseText += `   - Net Asset Value (NAV): ₹${r["Net Asset Value"]}\n\n`;
  });

  return responseText;
}
