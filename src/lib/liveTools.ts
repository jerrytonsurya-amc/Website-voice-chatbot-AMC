import { Type } from "@google/genai";

export const LIVE_API_TOOLS = [{
  functionDeclarations: [
    {
      name: "getNavData",
      description: "Look up month-end NAV values for specific Shriram AMC funds, plans, or dates.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: "English search query for fund name, plan type, and/or date." },
        },
        required: ["query"],
      },
    },
    {
      name: "getFundPerformance",
      description: "Calculate historical fund performance and returns from month-end NAV data.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: "English search query for fund(s) and time period or comparison." },
        },
        required: ["query"],
      },
    },
    {
      name: "searchMarketKnowledge",
      description: "Search Monthly Market Mantra PDF/PPT reports for market outlook, macro trends, sector views, index returns, FII/DII, inflation, and Shriram AMC research content.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: "Search query about markets, sectors, or economic topics." },
        },
        required: ["query"],
      },
    },
  ],
}];
