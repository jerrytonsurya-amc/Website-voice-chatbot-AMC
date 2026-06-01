/**
 * Builds all text/JSON knowledge files from source documents.
 * Run: npm run build:data  (also runs automatically before Vercel deploy)
 *
 * Outputs:
 *   data/market-mantra-knowledge.txt  — scraped PDF + PPT reports
 *   data/nav-database.txt             — human-readable NAV export from Excel
 *   data/nav-records.json             — structured NAV rows for search APIs
 *   data/fund-catalog.txt             — list of fund names
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import XLSX from "xlsx";
import type { NavRow } from "../src/lib/navTypes";

const DATA_DIR = path.join(process.cwd(), "data");

function writeNavFromExcel() {
  const xlsxPath = path.join(process.cwd(), "Month_End_NAV.xlsx");
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Missing ${xlsxPath}`);
  }

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as NavRow[];

  const jsonPath = path.join(DATA_DIR, "nav-records.json");
  fs.writeFileSync(jsonPath, JSON.stringify(rows), "utf8");
  console.log(`Wrote ${jsonPath} (${rows.length} rows)`);

  const lines: string[] = [
    "SHRIRAM AMC MONTH-END NAV DATABASE",
    "Source: Month_End_NAV.xlsx",
    "Format: Fund | Plan Type | Date | NAV (₹)",
    "",
  ];

  for (const row of rows) {
    const name = (row["Scheme Name "] || "").trim();
    const type = (row["Type "] || "").trim();
    const date = row.Date || "";
    const nav = row["Net Asset Value"];
    lines.push(`${name} | ${type} | ${date} | ₹${nav}`);
  }

  const txtPath = path.join(DATA_DIR, "nav-database.txt");
  fs.writeFileSync(txtPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${txtPath}`);

  const names = [
    ...new Set(rows.map((r) => (r["Scheme Name "] || "").trim()).filter(Boolean)),
  ].sort();

  const catalogLines = names.map((name, i) => `${i + 1}. ${name}`);
  const catalogPath = path.join(DATA_DIR, "fund-catalog.txt");
  fs.writeFileSync(catalogPath, catalogLines.join("\n"), "utf8");
  console.log(`Wrote ${catalogPath} (${names.length} funds)`);

  const catalogJsonPath = path.join(DATA_DIR, "fund-catalog.json");
  fs.writeFileSync(
    catalogJsonPath,
    JSON.stringify({ names, text: catalogLines.join("\n") }, null, 2),
    "utf8"
  );
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log("Extracting PDF/PPT → data/market-mantra-knowledge.txt ...");
  execSync("npx tsx scripts/extract-knowledge.ts", { stdio: "inherit", cwd: process.cwd() });

  console.log("Exporting Excel → data/nav-database.txt + nav-records.json ...");
  writeNavFromExcel();

  const readme = `Shriram AMC Voice Bot — Knowledge Base Files
==========================================

market-mantra-knowledge.txt
  Scraped text + tables from Monthly Market Mantra PDF and PPT files.
  Used by: searchMarketKnowledge tool (voice bot)

nav-database.txt
  All month-end NAV rows in plain text (from Month_End_NAV.xlsx).
  Used for reference; search uses nav-records.json

nav-records.json
  Structured NAV data for getNavData and getFundPerformance tools.

fund-catalog.txt
  List of Shriram AMC fund names.

Rebuild after updating source files:
  npm run build:data
`;
  fs.writeFileSync(path.join(DATA_DIR, "README.txt"), readme, "utf8");
  console.log("\nAll knowledge files built in data/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
