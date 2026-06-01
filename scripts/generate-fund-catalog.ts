import fs from "fs";
import path from "path";
import { getNavCache } from "../src/lib/navCache";
import { getFundCatalog } from "../src/lib/navSearch";

getNavCache();
const text = getFundCatalog();
const names = text
  .split("\n")
  .map((line) => line.replace(/^\d+\.\s*/, "").trim())
  .filter(Boolean);

const outPath = path.join(process.cwd(), "data/fund-catalog.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ names, text }, null, 2), "utf8");
console.log(`Wrote ${outPath} (${names.length} funds)`);
