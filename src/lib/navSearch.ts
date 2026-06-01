import { parseNavFile } from "./navParser";
import type { NavRow } from "./navTypes";
import { scoreNavRows } from "./navMatching";

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

export function getFundCatalog(): string {
  const cache = getNavCache();
  const names = [
    ...new Set(
      cache
        .map((row) => row["Scheme Name "]?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ].sort();

  if (names.length === 0) {
    return "Fund catalog unavailable.";
  }

  return names.map((name, index) => `${index + 1}. ${name}`).join("\n");
}

export function searchNavData(query: string): string {
  const cache = getNavCache();
  if (cache.length === 0) {
    return "No NAV data available in database.";
  }

  const topScored = scoreNavRows(cache, query);

  if (topScored.length === 0) {
    return "No matching funds or dates found in our records. Please verify the fund name or date and try again.";
  }

  const results = topScored.slice(0, 10).map((item) => item.row);

  let responseText = "Matching NAV records found from the Shriram AMC database:\n\n";
  results.forEach((r, idx) => {
    responseText += `${idx + 1}. Fund: ${r["Scheme Name "].trim()} (${r["Type "].trim()})\n`;
    responseText += `   - Month-End Date: ${r.Date}\n`;
    responseText += `   - Net Asset Value (NAV): ₹${r["Net Asset Value"]}\n\n`;
  });

  return responseText;
}
