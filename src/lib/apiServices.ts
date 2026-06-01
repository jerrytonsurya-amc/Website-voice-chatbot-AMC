import { Modality } from "@google/genai";
import { ai } from "./geminiServer";
import { handleChatMessage } from "./chatService";
import { getNavCache } from "./navDataLoader";
import { executeLiveTool, LIVE_TOOL_DECLARATIONS } from "./liveTools";
import { getPerformanceSummaries } from "./navPerformance";
import type { SessionContext } from "./sessionContext";
import { buildVoiceBotSystemInstruction } from "./voiceBotPrompt";

export async function createLiveToken(context: SessionContext = {}) {
  getNavCache();

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

  return {
    token: token.name,
    model: "gemini-3.1-flash-live-preview",
  };
}

export function runTool(name: string, args: Record<string, unknown>) {
  getNavCache();
  getPerformanceSummaries();
  return executeLiveTool(name, args);
}

export async function runChat(message: string, context: SessionContext = {}) {
  getNavCache();
  getPerformanceSummaries();
  const reply = await handleChatMessage(message, context);
  return { reply };
}
