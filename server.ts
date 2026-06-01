import "dotenv/config";
import { searchNavData, getNavCache } from "./src/lib/navSearch";
import { getFundPerformance } from "./src/lib/navPerformance";
import { ai } from "./src/lib/geminiClient";
import { buildVoiceBotSystemInstruction } from "./src/lib/voiceBotPrompt";
import type { SessionContext } from "./src/lib/sessionContext";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { LiveServerMessage, Modality, Type } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/api/live" });

  // Pre-process NAV data (fast)
  getNavCache();
  console.log("NAV Service initialized.");

  app.post("/api/chat", express.json(), async (req, res) => {
    const { message } = req.body;
    
    const lower = message.toLowerCase();
    const isPerformanceQuery = /performance|return|growth|how did|historical|past|compare|1 year|3 year|6 month|cagr|since inception/i.test(lower);
    const isNavQuery = lower.includes("nav") || lower.includes("net asset");

    if (isPerformanceQuery || isNavQuery) {
      const context = isPerformanceQuery
        ? getFundPerformance(message)
        : searchNavData(message);

      const prompt = `Answer using ONLY the Shriram AMC database results below. Do not invent numbers. If data is missing, say so.

Database results:
${context}

User question: ${message}`;

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
                  if (call.name === "getNavData" || call.name === "getFundPerformance") {
                    const query = String((call.args as any)?.query || "");
                    console.log(`Live API requested ${call.name} for: "${query}"`);

                    const context =
                      call.name === "getFundPerformance"
                        ? getFundPerformance(query)
                        : searchNavData(query);

                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
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
                  description: "Look up month-end NAV from Month_End_NAV.xlsx for a specific fund, plan (Regular/Direct, Growth/IDCW), and/or date.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: { type: Type.STRING, description: "English search: fund name, plan type, month/year if needed." },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "getFundPerformance",
                  description: "Get historical performance and returns (1M, 3M, 6M, 1Y, 3Y, since inception) from Month_End_NAV.xlsx. Use for past performance, returns, growth, or fund comparison questions.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: { type: Type.STRING, description: "English search: fund name and plan (e.g. Shriram ELSS Tax Saver Regular Growth)." },
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
