import fs from "fs";
import path from "path";
import type { NavRow } from "./navTypes";

let navCache: NavRow[] = [];

function getNavJsonPath(): string {
  return path.join(process.cwd(), "data", "nav-records.json");
}

export function getNavCache(): NavRow[] {
  if (navCache.length > 0) {
    return navCache;
  }

  const jsonPath = getNavJsonPath();
  if (!fs.existsSync(jsonPath)) {
    console.warn(`NAV data not found at ${jsonPath}. Run: npm run build:data`);
    return [];
  }

  try {
    navCache = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as NavRow[];
  } catch (error) {
    console.error("Failed to parse nav-records.json:", error);
    navCache = [];
  }

  return navCache;
}
