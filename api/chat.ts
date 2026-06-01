import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleChatMessage } from "../src/lib/chatService";
import { getNavCache } from "../src/lib/navDataLoader";
import { getPerformanceSummaries } from "../src/lib/navPerformance";
import type { SessionContext } from "../src/lib/sessionContext";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    getNavCache();
    getPerformanceSummaries();

    const { message, context } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    const reply = await handleChatMessage(message, (context || {}) as SessionContext);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("chat error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Chat failed",
    });
  }
}
