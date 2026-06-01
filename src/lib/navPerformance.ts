import { getNavCache } from "./navSearch";
import { getTopSchemeGroups, parseNavDate, sortNavRowsByDate } from "./navMatching";
import type { NavRow } from "./navTypes";

function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function periodReturn(startNav: number, endNav: number): number {
  return ((endNav - startNav) / startNav) * 100;
}

function annualizedReturn(startNav: number, endNav: number, months: number): number | null {
  if (months < 1 || startNav <= 0) return null;
  const totalReturn = endNav / startNav;
  return (Math.pow(totalReturn, 12 / months) - 1) * 100;
}

function rowAtOffset(series: NavRow[], monthsBack: number): NavRow | null {
  const index = series.length - 1 - monthsBack;
  if (index < 0) return null;
  return series[index];
}

function buildPerformanceBlock(schemeName: string, series: NavRow[]): string {
  const sorted = sortNavRowsByDate(series);
  if (sorted.length === 0) {
    return `No historical data for ${schemeName}.`;
  }

  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const monthsOfData = sorted.length - 1;

  const r1m = rowAtOffset(sorted, 1);
  const r3m = rowAtOffset(sorted, 3);
  const r6m = rowAtOffset(sorted, 6);
  const r12m = rowAtOffset(sorted, 12);
  const r36m = rowAtOffset(sorted, 36);

  const lines: string[] = [
    `Scheme: ${schemeName.trim()}`,
    `Plan type: ${latest["Type "]?.trim() || "N/A"}`,
    `Data range: ${earliest.Date} to ${latest.Date} (${sorted.length} month-end observations)`,
    `Latest NAV (${latest.Date}): ₹${latest["Net Asset Value"]}`,
    "",
    "Point-to-point returns (based on month-end NAV, not guaranteed future performance):",
  ];

  const addPeriod = (label: string, start: NavRow | null) => {
    if (!start) {
      lines.push(`- ${label}: insufficient history`);
      return;
    }
    const ret = periodReturn(start["Net Asset Value"], latest["Net Asset Value"]);
    lines.push(
      `- ${label}: ${formatPct(ret)} (from ₹${start["Net Asset Value"]} on ${start.Date} to ₹${latest["Net Asset Value"]} on ${latest.Date})`
    );
  };

  addPeriod("1 month", r1m);
  addPeriod("3 months", r3m);
  addPeriod("6 months", r6m);
  addPeriod("1 year", r12m);
  addPeriod("3 years", r36m);

  const sinceInception = periodReturn(earliest["Net Asset Value"], latest["Net Asset Value"]);
  const cagr = annualizedReturn(
    earliest["Net Asset Value"],
    latest["Net Asset Value"],
    monthsOfData
  );

  lines.push(
    `- Since first record (${earliest.Date}): ${formatPct(sinceInception)}`,
    cagr !== null
      ? `- Annualized return (CAGR) over full available history: ${formatPct(cagr)}`
      : ""
  );

  const recent = sorted.slice(-6);
  lines.push("", "Recent month-end NAV trail:");
  for (const row of recent) {
    lines.push(`  ${row.Date}: ₹${row["Net Asset Value"]}`);
  }

  return lines.filter(Boolean).join("\n");
}

export function getFundPerformance(query: string): string {
  const cache = getNavCache();
  if (cache.length === 0) {
    return "No NAV data available. The Month_End_NAV.xlsx database could not be loaded.";
  }

  const groups = getTopSchemeGroups(cache, query, 2);
  if (groups.length === 0) {
    return "No matching Shriram AMC funds found for this performance query. Ask the user to specify the fund name and plan (Regular/Direct, Growth/IDCW).";
  }

  const dates = cache.map((r) => parseNavDate(r.Date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const header = [
    "SHRIRAM AMC HISTORICAL FUND PERFORMANCE (from Month_End_NAV.xlsx)",
    `Database covers month-end NAV from ${minDate.toLocaleDateString("en-IN")} to ${maxDate.toLocaleDateString("en-IN")}.`,
    "All figures are past NAV-based returns, not investment advice.",
    "",
  ];

  const blocks = groups.map((g) => buildPerformanceBlock(g.schemeName, g.rows));
  return header.join("\n") + blocks.join("\n\n---\n\n");
}

export function getNavDatabaseOverview(): string {
  const cache = getNavCache();
  if (cache.length === 0) return "NAV database unavailable.";

  const schemeNames = new Set(cache.map((r) => r["Scheme Name "]?.trim()).filter(Boolean));
  const dates = cache.map((r) => parseNavDate(r.Date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return [
    `${cache.length} month-end NAV records`,
    `${schemeNames.size} fund plan variants`,
    `Period: ${minDate.toLocaleDateString("en-IN")} – ${maxDate.toLocaleDateString("en-IN")}`,
    "Use getNavData for specific NAV lookups; use getFundPerformance for returns and historical performance.",
  ].join("; ");
}
