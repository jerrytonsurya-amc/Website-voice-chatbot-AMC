import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { buildFundPerformanceSummaries } from "../src/lib/navPerformance";
import { resolveProjectFile } from "../src/lib/resolveProjectFile";

const dataDir = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function buildFromXlsx() {
  const xlsxPath = resolveProjectFile("Month_End_NAV.xlsx");
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Missing ${xlsxPath}. Add Month_End_NAV.xlsx to the project root.`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json(sheet);

  fs.writeFileSync(
    path.join(dataDir, "nav-records.json"),
    JSON.stringify(records, null, 0)
  );

  const names = [
    ...new Set(
      (records as { "Scheme Name "?: string }[])
        .map((row) => row["Scheme Name "]?.trim())
        .filter(Boolean)
    ),
  ].sort();

  const catalogText = names.map((name, index) => `${index + 1}. ${name}`).join("\n");
  fs.writeFileSync(
    path.join(dataDir, "fund-catalog.json"),
    JSON.stringify({ names, text: catalogText }, null, 2)
  );
  fs.writeFileSync(path.join(dataDir, "fund-catalog.txt"), catalogText);

  const navDatabaseText = (records as Record<string, unknown>[])
    .map((row) => {
      const name = String(row["Scheme Name "] || "").trim();
      const type = String(row["Type "] || "").trim();
      const date = String(row.Date || "");
      const nav = row["Net Asset Value"];
      return `${name} | ${type} | ${date} | NAV ₹${nav}`;
    })
    .join("\n");

  fs.writeFileSync(path.join(dataDir, "nav-database.txt"), navDatabaseText);

  return records;
}

async function main() {
  ensureDataDir();
  console.log("Building NAV data from Month_End_NAV.xlsx...");
  const records = buildFromXlsx();
  console.log(`  nav-records.json: ${records.length} rows`);

  const summaries = buildFundPerformanceSummaries();
  fs.writeFileSync(
    path.join(dataDir, "fund-performance-summary.json"),
    JSON.stringify(summaries, null, 2)
  );
  console.log(`  fund-performance-summary.json: ${summaries.length} funds`);

  const performanceText = summaries
    .map((summary) => {
      const yearly = summary.yearlyReturns
        .map((y) => `${y.year}: ${y.returnPercent.toFixed(2)}%`)
        .join(", ");
      return `${summary.schemeName} | ${summary.firstDate}–${summary.lastDate} | Total ${summary.totalReturnPercent.toFixed(2)}% | CAGR ${summary.cagrPercent?.toFixed(2) ?? "N/A"}% | Years: ${yearly}`;
    })
    .join("\n");

  fs.writeFileSync(path.join(dataDir, "fund-performance.txt"), performanceText);
  console.log("Done. NAV knowledge base is ready for Vercel deployment.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
