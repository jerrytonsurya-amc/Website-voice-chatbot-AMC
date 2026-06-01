import { handleChatMessage } from "./chatService";
import { getApiHealth } from "./apiHealth";
import { createLiveToken } from "./liveTokenService";
import { getNavCache } from "./navDataLoader";
import { executeLiveTool } from "./liveTools";
import { getPerformanceSummaries } from "./navPerformance";
import type { SessionContext } from "./sessionContext";

export { createLiveToken, getApiHealth };

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
