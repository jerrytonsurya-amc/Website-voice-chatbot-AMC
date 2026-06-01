import { getNavCache } from "./navDataLoader";
import { rankNavRows } from "./navQueryUtils";

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

  const results = rankNavRows(cache, query, 2, 10);

  if (results.length === 0) {
    return "No matching funds or dates found in our records. Please verify the fund name or date and try again.";
  }

  let responseText = "Matching NAV records found from the Shriram AMC database:\n\n";
  results.forEach((row, idx) => {
    responseText += `${idx + 1}. Fund: ${row["Scheme Name "].trim()} (${row["Type "].trim()})\n`;
    responseText += `   - Month-End Date: ${row.Date}\n`;
    responseText += `   - Net Asset Value (NAV): ₹${row["Net Asset Value"]}\n\n`;
  });

  return responseText;
}
