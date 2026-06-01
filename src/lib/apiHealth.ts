import { getNavCache } from "./navDataLoader";

const LIVE_MODEL_CANDIDATES = [
  process.env.GEMINI_LIVE_MODEL,
  "gemini-2.5-flash-preview-native-audio-09-2025",
  "gemini-2.5-flash-live-preview",
  "gemini-3.1-flash-live-preview",
].filter((m): m is string => Boolean(m));

export function getApiHealth() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const cache = getNavCache();
  return {
    ok: Boolean(key),
    hasGeminiKey: Boolean(key),
    geminiKeyPrefix: key ? key.slice(0, 6) : null,
    navRecordCount: cache.length,
    navJsonPath: "data/nav-records.json",
    liveModels: LIVE_MODEL_CANDIDATES,
  };
}
