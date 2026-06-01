import fs from "fs";
import { parseNavFile } from "./navParser";
import type { NavRow } from "./navTypes";
import { resolveProjectFile } from "./resolveProjectFile";

let navCache: NavRow[] = [];

export function getNavCache(): NavRow[] {
  if (navCache.length === 0) {
    try {
      const jsonPath = resolveProjectFile("data", "nav-records.json");
      navCache = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as NavRow[];
      console.log(`NAV cache loaded from JSON: ${navCache.length} rows.`);
    } catch (jsonError) {
      console.warn("nav-records.json not found, trying Excel:", jsonError);
      try {
        navCache = parseNavFile() as NavRow[];
        console.log(`NAV cache loaded from Excel: ${navCache.length} rows.`);
      } catch (xlsxError) {
        console.error("NAV data unavailable. Run: npm run build:data", xlsxError);
      }
    }
  }
  return navCache;
}
