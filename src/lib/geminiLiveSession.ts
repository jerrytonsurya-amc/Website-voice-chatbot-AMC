import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { buildVoiceBotSystemInstruction } from "./voiceBotPrompt";
import { LIVE_API_TOOLS } from "./liveTools";
import type { SessionContext } from "./sessionContext";

async function callToolApi(endpoint: string, query: string): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tool API ${endpoint} failed: ${err}`);
  }

  const data = (await res.json()) as { result?: string };
  return data.result || "No data returned.";
}

async function handleToolCalls(session: Session, message: LiveServerMessage) {
  if (!message.toolCall?.functionCalls?.length) return;

  for (const call of message.toolCall.functionCalls) {
    const query = String((call.args as { query?: string })?.query || "");
    let result = "";

    if (call.name === "getNavData") {
      result = await callToolApi("/api/nav", query);
    } else if (call.name === "getFundPerformance") {
      result = await callToolApi("/api/performance", query);
    } else if (call.name === "searchMarketKnowledge") {
      result = await callToolApi("/api/search-knowledge", query);
    } else {
      result = `Unknown tool: ${call.name}`;
    }

    session.sendToolResponse({
      functionResponses: [{
        name: call.name,
        id: call.id,
        response: { result },
      }],
    });
  }
}

export interface LiveSessionCallbacks {
  onopen?: () => void;
  onmessage?: (message: LiveServerMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;
}

export async function connectGeminiLive(
  sessionContext: SessionContext,
  callbacks: LiveSessionCallbacks
): Promise<Session> {
  const tokenRes = await fetch("/api/live-token", { method: "POST" });
  if (!tokenRes.ok) {
    throw new Error("Failed to get voice session token. Set GEMINI_API_KEY in Vercel environment variables.");
  }

  const { token } = (await tokenRes.json()) as { token: string };
  if (!token) {
    throw new Error("Voice token missing. Check GEMINI_API_KEY on Vercel.");
  }

  const ai = new GoogleGenAI({
    apiKey: token,
    httpOptions: { apiVersion: "v1alpha" },
  });

  let session!: Session;

  session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    callbacks: {
      onopen: () => callbacks.onopen?.(),
      onmessage: async (message) => {
        if (message.toolCall) {
          await handleToolCalls(session, message);
        } else {
          callbacks.onmessage?.(message);
        }
      },
      onerror: (e) => callbacks.onerror?.(e instanceof Error ? e : new Error(String(e))),
      onclose: () => callbacks.onclose?.(),
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      tools: LIVE_API_TOOLS,
      systemInstruction: buildVoiceBotSystemInstruction(sessionContext),
    },
  });

  return session;
}
