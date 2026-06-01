import { Type } from "@google/genai";
import { searchFundPerformance } from "./navPerformance";
import { searchNavData } from "./navSearch";

export const LIVE_TOOL_DECLARATIONS = [{
  functionDeclarations: [
    {
      name: "getNavData",
      description: "Get month-end NAV values for Shriram AMC funds. Use for NAV, scheme price, or value on a specific date.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "English search query: fund name, plan type (Direct/Regular Growth/IDCW), month, year.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "getFundPerformance",
      description: "Get historical fund performance, returns, CAGR, and year-wise growth from Month_End_NAV data (Feb 2022–Dec 2025).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "English search query: fund name and performance period (e.g. returns, growth, compare, best performer).",
          },
        },
        required: ["query"],
      },
    },
  ],
}];

export function executeLiveTool(name: string, args: Record<string, unknown>): string {
  const query = String(args.query || "");

  switch (name) {
    case "getNavData":
      return searchNavData(query);
    case "getFundPerformance":
      return searchFundPerformance(query);
    default:
      return `Unknown tool: ${name}`;
  }
}
