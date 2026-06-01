import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getNavCache } from "../src/lib/navDataLoader";

/** Health check — live config is embedded in /api/live-token ephemeral constraints. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cache = getNavCache();
    return res.status(200).json({
      ok: true,
      navRecords: cache.length,
      message: "Use POST /api/live-token to start a voice session.",
    });
  } catch (error) {
    console.error("live-config error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Service unavailable",
    });
  }
}
