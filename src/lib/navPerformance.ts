import {
  formatNavDate,
  fundVariantKey,
  getFundHistory,
  matchNavRows,
  parseNavDate,
  type NavRow,
} from "./navMatching";

interface PeriodReturn {
  label: string;
  startDate: string;
  endDate: string;
  startNav: number;
  endNav: number;
  absoluteReturnPct: number;
}

function pctChange(from: number, to: number): number {
  if (!from) return 0;
  return ((to - from) / from) * 100;
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function subtractMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function findClosestNavToTarget(
  history: NavRow[],
  target: Date,
  latest: NavRow
): NavRow | null {
  const latestTime = parseNavDate(latest.Date).getTime();
  let best: NavRow | null = null;
  let bestDiff = Infinity;

  for (const row of history) {
    const rowTime = parseNavDate(row.Date).getTime();
    if (rowTime >= latestTime) continue;

    const diff = Math.abs(rowTime - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }

  return best;
}

function computePeriodReturn(
  history: NavRow[],
  latest: NavRow,
  monthsBack: number,
  label: string
): PeriodReturn | null {
  const targetDate = subtractMonths(parseNavDate(latest.Date), monthsBack);
  const startRow = findClosestNavToTarget(history, targetDate, latest);

  if (!startRow || startRow.Date === latest.Date) {
    return null;
  }

  const startNav = Number(startRow["Net Asset Value"]);
  const endNav = Number(latest["Net Asset Value"]);

  return {
    label,
    startDate: startRow.Date,
    endDate: latest.Date,
    startNav,
    endNav,
    absoluteReturnPct: pctChange(startNav, endNav),
  };
}

function computeCagr(startNav: number, endNav: number, startDate: Date, endDate: Date): number {
  const years =
    (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0 || startNav <= 0) return 0;
  return (Math.pow(endNav / startNav, 1 / years) - 1) * 100;
}

function buildFundPerformanceReport(row: NavRow): string {
  const history = getFundHistory(row);
  if (history.length < 2) {
    return `Fund: ${row["Scheme Name "].trim()} (${row["Type "].trim()})\nInsufficient historical NAV data for performance calculation.\n`;
  }

  const latest = history[0];
  const oldest = history[history.length - 1];
  const latestNav = Number(latest["Net Asset Value"]);
  const oldestNav = Number(oldest["Net Asset Value"]);
  const latestDate = parseNavDate(latest.Date);
  const oldestDate = parseNavDate(oldest.Date);

  const periods = [
    computePeriodReturn(history, latest, 1, "1 Month"),
    computePeriodReturn(history, latest, 3, "3 Months"),
    computePeriodReturn(history, latest, 6, "6 Months"),
    computePeriodReturn(history, latest, 12, "1 Year"),
    computePeriodReturn(history, latest, 36, "3 Years"),
  ].filter((period): period is PeriodReturn => period !== null);

  const sinceInceptionPct = pctChange(oldestNav, latestNav);
  const cagr = computeCagr(oldestNav, latestNav, oldestDate, latestDate);

  let report = `Fund: ${row["Scheme Name "].trim()} (${row["Type "].trim()})\n`;
  report += `Historical data: ${oldest.Date} to ${latest.Date} (${history.length} month-end records)\n`;
  report += `Latest NAV (${latest.Date}): ₹${latestNav}\n`;
  report += `Returns based on month-end NAV movement (using available month-end records; past performance ≠ future results):\n`;

  for (const period of periods) {
    report += `- ${period.label} (${period.startDate} → ${period.endDate}): ${formatPct(period.absoluteReturnPct)} (₹${period.startNav} → ₹${period.endNav})\n`;
  }

  report += `- Since ${oldest.Date} (available history): ${formatPct(sinceInceptionPct)} (₹${oldestNav} → ₹${latestNav}), CAGR ~${cagr.toFixed(2)}% p.a.\n`;

  return report;
}

export function searchFundPerformance(query: string): string {
  const matches = matchNavRows(query, 8);

  if (matches.length === 0) {
    return "No matching funds found in the Shriram AMC NAV database. Please specify the fund name, plan type (Direct/Regular, Growth/IDCW), or time period.";
  }

  const wantsRanking = /\b(best|top|worst|compare|comparison|rank|highest|lowest)\b/i.test(query);
  const periodMatch = query.match(/\b(1|3|6|12|36)\s*(m|month|months|y|year|years)\b/i);
  const rankingMonths =
    periodMatch?.[1] === "1" && /y|year/i.test(periodMatch[0]) ? 12 :
    periodMatch?.[1] === "3" && /y|year/i.test(periodMatch[0]) ? 36 :
    periodMatch ? Number(periodMatch[1]) : 12;

  if (wantsRanking) {
    const ranked = matches
      .map((row) => {
        const history = getFundHistory(row);
        const latest = history[0];
        const period = computePeriodReturn(
          history,
          latest,
          rankingMonths,
          `${rankingMonths >= 12 ? rankingMonths / 12 : rankingMonths} ${rankingMonths >= 12 ? "Year(s)" : "Month(s)"}`
        );
        return {
          row,
          period,
          key: fundVariantKey(row),
        };
      })
      .filter((item) => item.period !== null)
      .sort((a, b) => b.period!.absoluteReturnPct - a.period!.absoluteReturnPct);

    if (ranked.length === 0) {
      return "Could not compute comparative performance for the requested funds.";
    }

    const isWorst = /\b(worst|lowest)\b/i.test(query);
    const ordered = isWorst ? [...ranked].reverse() : ranked;
    const periodLabel = ordered[0].period!.label;

    let response = `Comparative fund performance ranking (${periodLabel}, month-end NAV basis):\n\n`;
    ordered.slice(0, 8).forEach((item, index) => {
      const fund = item.row;
      response += `${index + 1}. ${fund["Scheme Name "].trim()} (${fund["Type "].trim()})\n`;
      response += `   Return: ${formatPct(item.period!.absoluteReturnPct)} (${item.period!.startDate} → ${item.period!.endDate})\n`;
      response += `   NAV: ₹${item.period!.startNav} → ₹${item.period!.endNav}\n\n`;
    });

    response += "Disclaimer: Returns are computed from month-end NAV data only. Past performance does not guarantee future results.\n";
    return response;
  }

  let response = "Historical fund performance from Shriram AMC month-end NAV database:\n\n";
  for (const row of matches.slice(0, 5)) {
    response += buildFundPerformanceReport(row);
    response += "\n";
  }

  response += "Disclaimer: Returns are computed from month-end NAV data only. Past performance does not guarantee future results.\n";
  return response;
}

export function getNavDataSummary(): string {
  const matches = matchNavRows("shriram", 37);
  const schemes = [...new Set(matches.map((row) => row["Scheme "].trim()))];

  return `Shriram AMC NAV database covers ${schemes.length} schemes with month-end NAV history (typically Jan 2022 to present). Performance can be calculated for 1M, 3M, 6M, 1Y, 3Y, and full available history using the getFundPerformance tool.`;
}
