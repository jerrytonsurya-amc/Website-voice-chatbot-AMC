import fs from "fs";
import path from "path";
import type { NavRow } from "./navTypes";
import { parseNavFile } from "./navParser";

let navCache: NavRow[] = [];

export function getNavCache(): NavRow[] {
  if (navCache.length > 0) {
    return navCache;
  }

  const jsonPath = path.join(process.cwd(), "data", "nav-records.json");
  if (fs.existsSync(jsonPath)) {
    navCache = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as NavRow[];
    return navCache;
  }

  try {
    navCache = parseNavFile() as NavRow[];
  } catch (error) {
    console.error("Failed to load NAV data:", error);
    navCache = [];
  }

  return navCache;
}
