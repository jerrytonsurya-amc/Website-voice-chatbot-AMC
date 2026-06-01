import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getNavCache } from "../src/lib/navCache";
import { buildVoiceBotSystemInstruction } from "../src/lib/voiceBotPrompt";
import type { SessionContext } from "../src/lib/sessionContext";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    getNavCache();
    const context = (req.body?.context || {}) as SessionContext;
    const systemInstruction = buildVoiceBotSystemInstruction(context);
    return res.status(200).json({ systemInstruction });
  } catch (error) {
    console.error("live-config error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to build live config",
    });
  }
}
