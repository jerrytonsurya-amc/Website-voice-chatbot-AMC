import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Modality } from "@google/genai";
import { ai } from "../src/lib/geminiServer";
import { LIVE_TOOL_DECLARATIONS } from "../src/lib/liveTools";
import { buildVoiceBotSystemInstruction } from "../src/lib/voiceBotPrompt";
import type { SessionContext } from "../src/lib/sessionContext";
import { getNavCache } from "../src/lib/navDataLoader";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    getNavCache();

    const context = (req.body?.context || {}) as SessionContext;
    const systemInstruction = buildVoiceBotSystemInstruction(context);

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
            systemInstruction,
            tools: LIVE_TOOL_DECLARATIONS,
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return res.status(200).json({
      token: token.name,
      model: "gemini-3.1-flash-live-preview",
    });
  } catch (error) {
    console.error("live-token error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create live token",
    });
  }
}
