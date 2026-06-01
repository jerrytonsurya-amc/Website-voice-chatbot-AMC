import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw) {
    throw new Error("GEMINI_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables.");
  }
  return raw.replace(/^["']|["']$/g, "");
}

export function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
      httpOptions: {
        apiVersion: "v1alpha",
        headers: {
          "User-Agent": "shriram-amc-voice-bot",
        },
      },
    });
  }
  return aiClient;
}

/** @deprecated Use getAi() */
export const ai = {
  get authTokens() {
    return getAi().authTokens;
  },
  get models() {
    return getAi().models;
  },
  get live() {
    return getAi().live;
  },
};
