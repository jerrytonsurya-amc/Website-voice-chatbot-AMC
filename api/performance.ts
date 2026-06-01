import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getNavCache } from "../src/lib/navCache";
import { searchFundPerformance } from "../src/lib/navPerformance";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    getNavCache();
    const query = String(req.body?.query || "");
    const result = searchFundPerformance(query);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("performance api error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Performance search failed",
    });
  }
}
