import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import navRecordsBundled from "../../data/nav-records.json";
import type { NavRow } from "./navTypes";
import { parseNavFile } from "./navParser";

let navCache: NavRow[] = [];

function loadFromBundledJson(): NavRow[] {
  return navRecordsBundled as NavRow[];
}

function loadFromFilesystem(): NavRow[] | null {
  const candidates = [
    path.join(process.cwd(), "data", "nav-records.json"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/nav-records.json"),
  ];

  for (const jsonPath of candidates) {
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as NavRow[];
    }
  }
  return null;
}

export function getNavCache(): NavRow[] {
  if (navCache.length > 0) {
    return navCache;
  }

  try {
    navCache = loadFromBundledJson();
    if (navCache.length > 0) {
      return navCache;
    }
  } catch {
    // fall through
  }

  const fromFs = loadFromFilesystem();
  if (fromFs?.length) {
    navCache = fromFs;
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
