import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createLiveToken } from "../src/lib/liveTokenService";
import type { SessionContext } from "../src/lib/sessionContext";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await createLiveToken((req.body?.context || {}) as SessionContext);
    return res.status(200).json(result);
  } catch (error) {
    console.error("live-token error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create live token",
    });
  }
}
