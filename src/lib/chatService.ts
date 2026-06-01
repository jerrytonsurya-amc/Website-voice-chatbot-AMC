import { ai } from "./geminiClient";
import { searchNavData } from "./navSearch";
import { getFundPerformance } from "./navPerformance";
import { buildTextBotSystemInstruction } from "./textBotPrompt";
import type { SessionContext } from "./sessionContext";

const MODEL = "gemini-3.5-flash";

function isPerformanceQuery(text: string): boolean {
  return /\b(performance|perform|return|returns|growth|cagr|historical|history|past|previous|best|worst|compare|rank)\b/i.test(text);
}

function isNavQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("nav") || lower.includes("net asset value");
}

export async function handleChatMessage(
  message: string,
  context: SessionContext = {}
): Promise<string> {
  if (isPerformanceQuery(message)) {
    const data = getFundPerformance(message);
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `You are Shriram AMC assistant. Answer using ONLY this data. Reply in the user's language.

Data:
${data}

User: ${message}`,
    });
    return response.text ?? "Sorry, I could not generate a response.";
  }

  if (isNavQuery(message)) {
    const data = searchNavData(message);
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `You are Shriram AMC assistant. Answer NAV questions using ONLY this data. Reply in the user's language.

Data:
${data}

User: ${message}`,
    });
    return response.text ?? "Sorry, I could not generate a response.";
  }

  const systemInstruction = buildTextBotSystemInstruction(context);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: { systemInstruction },
  });

  return response.text ?? "Sorry, I could not generate a response.";
}
