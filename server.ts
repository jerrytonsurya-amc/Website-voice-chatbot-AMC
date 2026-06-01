import "dotenv/config";
import { searchNavData, getNavCache } from "./src/lib/navSearch";
import { searchFundPerformance } from "./src/lib/navPerformance";
import { loadMarketKnowledgeBase } from "./src/lib/knowledgeBase";
import { ai } from "./src/lib/geminiClient";
import { buildVoiceBotSystemInstruction } from "./src/lib/voiceBotPrompt";
import type { SessionContext } from "./src/lib/sessionContext";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { LiveServerMessage, Modality, Type } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/api/live" });

  // Pre-process NAV data and market knowledge base
  getNavCache();
  loadMarketKnowledgeBase();
  console.log("NAV Service initialized.");

  app.post("/api/chat", express.json(), async (req, res) => {
    const { message } = req.body;
    const lower = message.toLowerCase();

    const isPerformanceQuery =
      /\b(performance|perform|return|returns|growth|cagr|historical|history|past|previous|best|worst|compare|rank)\b/.test(lower);
    const isNavQuery = lower.includes("nav") || lower.includes("net asset value");

    if (isPerformanceQuery) {
      const context = searchFundPerformance(message);
      const prompt = `Answer the user's question about fund performance using ONLY the data below. Respond in the same language as the user. Include the disclaimer about past performance.

Data:
${context}

Query: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ reply: response.text });
    }

    if (isNavQuery) {
      console.log("NAV mentioned, processing file...");
      const context = searchNavData(message);

      const prompt = `Based on the following data, answer the user query about NAV details. If the answer is not in the data, just answer normally based on your knowledge:

      Data:
      ${context}

      Query: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ reply: response.text });
    }
    
    // Simple chat behavior if NAV not mentioned
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
    });
    
    res.json({ reply: response.text });
  });

  wss.on("connection", (clientWs) => {
    console.log("Client connected to Live API bridge");

    let session: any = null;
    let sessionStarted = false;
    let contextReceived = false;

    const connectToGemini = async (sessionContext: SessionContext = {}) => {
      if (sessionStarted) return;
      sessionStarted = true;

      const pageHint = sessionContext.parentUrl || sessionContext.pageUrl || "unknown page";
      console.log(`Starting voice session with page context: ${pageHint}`);

      try {
        session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          callbacks: {
            onopen: () => {
              console.log("Connected to Gemini Live");
              clientWs.send(JSON.stringify({ type: "open" }));
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.toolCall) {
                for (const call of message.toolCall.functionCalls) {
                  if (call.name === "getNavData") {
                    const query = String((call.args as any)?.query || "");
                    console.log(`Live API requested getNavData for: "${query}"`);

                    const context = searchNavData(query);

                    session.sendToolResponse({
                      functionResponses: [{
                        name: "getNavData",
                        id: call.id,
                        response: { result: context },
                      }],
                    });
                  }

                  if (call.name === "getFundPerformance") {
                    const query = String((call.args as any)?.query || "");
                    console.log(`Live API requested getFundPerformance for: "${query}"`);

                    const context = searchFundPerformance(query);

                    session.sendToolResponse({
                      functionResponses: [{
                        name: "getFundPerformance",
                        id: call.id,
                        response: { result: context },
                      }],
                    });
                  }
                }
              } else {
                clientWs.send(JSON.stringify({ type: "message", message }));
              }
            },
            onerror: (err) => {
              console.error("Gemini Live Error:", err);
              clientWs.send(JSON.stringify({ type: "error", error: err.message }));
            },
            onclose: () => {
              console.log("Gemini Live closed");
              clientWs.send(JSON.stringify({ type: "close" }));
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
            tools: [{
              functionDeclarations: [
                {
                  name: "getNavData",
                  description: "Look up month-end NAV values for specific Shriram AMC funds, plans, or dates.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: { type: Type.STRING, description: "English search query for fund name, plan type (Direct/Regular, Growth/IDCW), and/or date." },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "getFundPerformance",
                  description: "Calculate historical fund performance and returns from month-end NAV data. Use for questions about past returns, growth, CAGR, comparisons, best/worst performers, or how a fund performed over 1M/3M/6M/1Y/3Y or since available history.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: { type: Type.STRING, description: "English search query describing the fund(s) and time period or comparison (e.g. 'Aggressive Hybrid Direct Growth 1 year return', 'best performing Shriram fund last year')." },
                    },
                    required: ["query"],
                  },
                },
              ],
            }],
            systemInstruction: buildVoiceBotSystemInstruction(sessionContext),
          },
        });
      } catch (err: any) {
        console.error("Failed to connect to Gemini:", err);
        clientWs.send(JSON.stringify({ type: "error", error: err.message }));
        clientWs.close();
      }
    };

    const contextTimeout = setTimeout(() => {
      if (!contextReceived) {
        console.log("No session context received; starting with defaults");
        void connectToGemini({});
      }
    }, 2500);

    clientWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "sessionContext" && !contextReceived) {
          contextReceived = true;
          clearTimeout(contextTimeout);
          void connectToGemini(msg.context || {});
          return;
        }

        if (msg.realtimeInput && session) {
          session.sendRealtimeInput(msg.realtimeInput);
        }
      } catch (e) {
        console.error("Error processing client message:", e);
      }
    });

    clientWs.on("close", () => {
      clearTimeout(contextTimeout);
      console.log("Client disconnected");
      session?.close();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
