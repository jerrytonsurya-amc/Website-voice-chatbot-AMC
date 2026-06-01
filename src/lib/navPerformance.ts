import fs from "fs";
import path from "path";
import { getNavCache } from "./navDataLoader";
import type { FundPerformanceSummary, NavRow } from "./navTypes";
import { parseNavDate, parseQuery, scoreNavRow } from "./navQueryUtils";

let summaryCache: FundPerformanceSummary[] | null = null;

function yearsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function computeSummary(rows: NavRow[]): FundPerformanceSummary | null {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort(
    (a, b) => parseNavDate(a.Date).getTime() - parseNavDate(b.Date).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstNav = first["Net Asset Value"];
  const lastNav = last["Net Asset Value"];
  const totalReturnPercent = firstNav > 0 ? ((lastNav - firstNav) / firstNav) * 100 : 0;
  const spanYears = yearsBetween(parseNavDate(first.Date), parseNavDate(last.Date));
  const cagrPercent =
    spanYears > 0 && firstNav > 0
      ? (Math.pow(lastNav / firstNav, 1 / spanYears) - 1) * 100
      : null;

  const byYear = new Map<string, NavRow[]>();
  for (const row of sorted) {
    const year = row.Date.split("-")[2];
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year)!.push(row);
  }

  const yearlyReturns = [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, yearRows]) => {
      const yearSorted = [...yearRows].sort(
        (a, b) => parseNavDate(a.Date).getTime() - parseNavDate(b.Date).getTime()
      );
      const startNav = yearSorted[0]["Net Asset Value"];
      const endNav = yearSorted[yearSorted.length - 1]["Net Asset Value"];
      return {
        year,
        startNav,
        endNav,
        returnPercent: startNav > 0 ? ((endNav - startNav) / startNav) * 100 : 0,
      };
    });

  let bestMonth: FundPerformanceSummary["bestMonth"] = null;
  let worstMonth: FundPerformanceSummary["worstMonth"] = null;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]["Net Asset Value"];
    const curr = sorted[i]["Net Asset Value"];
    if (prev <= 0) continue;
    const change = ((curr - prev) / prev) * 100;
    const point = { date: sorted[i].Date, nav: curr };

    if (!bestMonth || change > ((bestMonth.nav - prev) / prev) * 100) {
      if (change > 0) bestMonth = point;
    }
    if (!worstMonth || change < ((worstMonth.nav - prev) / prev) * 100) {
      if (change < 0) worstMonth = point;
    }
  }

  return {
    schemeName: last["Scheme Name "].trim(),
    scheme: last["Scheme "].trim(),
    type: last["Type "].trim(),
    recordCount: sorted.length,
    firstDate: first.Date,
    lastDate: last.Date,
    firstNav,
    lastNav,
    totalReturnPercent,
    cagrPercent,
    bestMonth,
    worstMonth,
    yearlyReturns,
  };
}

export function buildFundPerformanceSummaries(): FundPerformanceSummary[] {
  const cache = getNavCache();
  const groups = new Map<string, NavRow[]>();

  for (const row of cache) {
    const key = row["Scheme Name "].trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return [...groups.values()]
    .map((rows) => computeSummary(rows))
    .filter((summary): summary is FundPerformanceSummary => summary !== null)
    .sort((a, b) => a.schemeName.localeCompare(b.schemeName));
}

export function getPerformanceSummaries(): FundPerformanceSummary[] {
  if (summaryCache) {
    return summaryCache;
  }

  const jsonPath = path.join(process.cwd(), "data", "fund-performance-summary.json");
  if (fs.existsSync(jsonPath)) {
    summaryCache = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as FundPerformanceSummary[];
    return summaryCache;
  }

  summaryCache = buildFundPerformanceSummaries();
  return summaryCache;
}

function formatSummary(summary: FundPerformanceSummary, index: number): string {
  const yearly = summary.yearlyReturns
    .map((y) => `      ${y.year}: ${y.returnPercent.toFixed(2)}% (₹${y.startNav} → ₹${y.endNav})`)
    .join("\n");

  return `${index + 1}. ${summary.schemeName} (${summary.type.trim()})
   - Data points: ${summary.recordCount} month-end NAVs (${summary.firstDate} to ${summary.lastDate})
   - Starting NAV: ₹${summary.firstNav}
   - Latest NAV: ₹${summary.lastNav}
   - Total return over period: ${summary.totalReturnPercent.toFixed(2)}%
   - CAGR (approx.): ${summary.cagrPercent !== null ? `${summary.cagrPercent.toFixed(2)}%` : "N/A"}
   - Calendar year returns:
${yearly}`;
}

export function searchFundPerformance(query: string): string {
  const summaries = getPerformanceSummaries();
  if (summaries.length === 0) {
    return "No fund performance data available.";
  }

  const parsed = parseQuery(query);
  const scored = summaries
    .map((summary) => {
      const fakeRow: NavRow = {
        "Net Asset Value": summary.lastNav,
        Date: summary.lastDate,
        "Scheme ": summary.scheme,
        "Scheme Name ": summary.schemeName,
        "Type ": summary.type,
      };
      return { summary, score: scoreNavRow(fakeRow, parsed) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const topByReturn = [...summaries]
      .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
      .slice(0, 5);

    return `No exact fund match for "${query}". Here are top historical performers in our database (Feb 2022 – Dec 2025):\n\n${topByReturn
      .map((summary, index) => formatSummary(summary, index))
      .join("\n\n")}`;
  }

  const results = scored.slice(0, 5).map((item) => item.summary);
  let response = "Shriram AMC historical fund performance (from Month_End_NAV.xlsx):\n\n";
  response += results.map((summary, index) => formatSummary(summary, index)).join("\n\n");

  if (/compare|best|top|rank|highest/i.test(query)) {
    const leaders = [...summaries]
      .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
      .slice(0, 3);
    response += "\n\nTop total returns in database:\n";
    response += leaders
      .map(
        (s, i) =>
          `${i + 1}. ${s.schemeName}: ${s.totalReturnPercent.toFixed(2)}% (${s.firstDate} to ${s.lastDate})`
      )
      .join("\n");
  }

  return response;
}
