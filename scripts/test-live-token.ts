import "dotenv/config";
import { buildVoiceBotSystemInstruction } from "../src/lib/voiceBotPrompt";
import { buildCompactLiveSystemInstruction } from "../src/lib/voiceBotPrompt";
import { ai } from "../src/lib/geminiServer";
import { Modality } from "@google/genai";
import { LIVE_TOOL_DECLARATIONS } from "../src/lib/liveTools";
import { getNavCache } from "../src/lib/navDataLoader";

async function tryToken(label: string, systemInstruction: string, withTools: boolean) {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const config: Record<string, unknown> = {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
    systemInstruction,
  };
  if (withTools) {
    config.tools = LIVE_TOOL_DECLARATIONS;
  }

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: "gemini-3.1-flash-live-preview",
        config,
      },
      httpOptions: { apiVersion: "v1alpha" },
    },
  });
  console.log(label, "OK", token.name?.slice(0, 40), "instruction chars:", systemInstruction.length);
}

async function main() {
  getNavCache();
  const full = buildVoiceBotSystemInstruction({});
  const compact = buildCompactLiveSystemInstruction({});
  console.log("full", full.length, "compact", compact.length);
  await tryToken("compact+tools", compact, true);
  await tryToken("full+tools", full, true);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
