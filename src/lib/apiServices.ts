import { Modality } from "@google/genai";
import { getAi, getGeminiApiKey } from "./geminiServer";
import { handleChatMessage } from "./chatService";
import { getNavCache } from "./navDataLoader";
import { executeLiveTool, LIVE_TOOL_DECLARATIONS } from "./liveTools";
import { getPerformanceSummaries } from "./navPerformance";
import type { SessionContext } from "./sessionContext";
import {
  buildCompactLiveSystemInstruction,
  buildVoiceBotSystemInstruction,
} from "./voiceBotPrompt";

const LIVE_MODEL_CANDIDATES = [
  process.env.GEMINI_LIVE_MODEL,
  "gemini-2.5-flash-preview-native-audio-09-2025",
  "gemini-2.5-flash-live-preview",
  "gemini-3.1-flash-live-preview",
].filter((m): m is string => Boolean(m));

function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function requestEphemeralToken(
  model: string,
  systemInstruction: string,
  withTools: boolean
) {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const liveConfig: Record<string, unknown> = {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    },
    systemInstruction,
  };

  if (withTools) {
    liveConfig.tools = LIVE_TOOL_DECLARATIONS;
  }

  const token = await getAi().authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model,
        config: liveConfig,
      },
      httpOptions: { apiVersion: "v1alpha" },
    },
  });

  return { token: token.name, model };
}

export async function createLiveToken(context: SessionContext = {}) {
  getNavCache();
  getGeminiApiKey();

  const attempts: { label: string; instruction: string; withTools: boolean }[] = [
    {
      label: "compact",
      instruction: buildCompactLiveSystemInstruction(context),
      withTools: true,
    },
    {
      label: "compact-no-tools",
      instruction: buildCompactLiveSystemInstruction(context),
      withTools: false,
    },
    {
      label: "full",
      instruction: buildVoiceBotSystemInstruction(context),
      withTools: true,
    },
  ];

  const errors: string[] = [];

  for (const model of LIVE_MODEL_CANDIDATES) {
    for (const attempt of attempts) {
      try {
        const result = await requestEphemeralToken(
          model,
          attempt.instruction,
          attempt.withTools
        );
        if (!result.token) {
          throw new Error("Gemini returned an empty ephemeral token.");
        }
        return result;
      } catch (error) {
        const message = formatApiError(error);
        errors.push(`${model}/${attempt.label}: ${message}`);
        console.error(`live-token attempt (${model}/${attempt.label}) failed:`, error);
      }
    }
  }

  throw new Error(
    `Could not create voice session token. ${errors.join(" | ")}`
  );
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

export function getApiHealth() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const cache = getNavCache();
  return {
    ok: Boolean(key),
    hasGeminiKey: Boolean(key),
    geminiKeyPrefix: key ? key.slice(0, 6) : null,
    navRecordCount: cache.length,
    liveModels: LIVE_MODEL_CANDIDATES,
  };
}
