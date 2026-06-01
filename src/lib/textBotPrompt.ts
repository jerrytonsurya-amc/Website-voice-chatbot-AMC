import { MARKET_KNOWLEDGE_BASE } from "./knowledgeBase";
import { getFundCatalog } from "./navSearch";
import { formatSessionContextBlock, type SessionContext } from "./sessionContext";

export function buildTextBotSystemInstruction(context: SessionContext = {}): string {
  const fundCatalog = getFundCatalog();
  const contextBlock = formatSessionContextBlock(context);

  return `You are the Shriram AMC assistant. Answer in the user's language.

Use NAV data tools logic: for NAV questions use exact database facts; for performance/returns use historical NAV-derived metrics only.

SESSION CONTEXT:
${contextBlock}

FUND CATALOG:
${fundCatalog}

KNOWLEDGE BASE:
${MARKET_KNOWLEDGE_BASE}

Do not give buy/sell advice.`;
}
