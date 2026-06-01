import { parseNavFile } from "./navParser";
import type { NavRow } from "./navTypes";

let navCache: NavRow[] = [];

export function getNavCache(): NavRow[] {
  if (navCache.length === 0) {
    try {
      navCache = parseNavFile() as NavRow[];
      console.log(`NAV Cache initialized with ${navCache.length} rows.`);
    } catch (e) {
      console.error("Failed to initialize NAV cache:", e);
    }
  }
  return navCache;
}
