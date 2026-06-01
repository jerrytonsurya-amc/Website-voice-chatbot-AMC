import "dotenv/config";
import express from "express";
import { createLiveToken, runChat, runTool } from "../src/lib/apiServices";
import type { SessionContext } from "../src/lib/sessionContext";

const PORT = Number(process.env.API_PORT || 3000);
const app = express();

app.use(express.json());

app.post("/api/live-token", async (req, res) => {
  try {
    const result = await createLiveToken((req.body?.context || {}) as SessionContext);
    res.json(result);
  } catch (error) {
    console.error("live-token error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create live token",
    });
  }
});

app.post("/api/tools", (req, res) => {
  try {
    const { name, args } = req.body || {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing tool name" });
      return;
    }
    const result = runTool(name, (args || {}) as Record<string, unknown>);
    res.json({ result });
  } catch (error) {
    console.error("tools error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Tool execution failed",
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Missing message" });
      return;
    }
    const result = await runChat(message, (context || {}) as SessionContext);
    res.json(result);
  } catch (error) {
    console.error("chat error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Chat failed",
    });
  }
});

app.get("/api/live-config", (_req, res) => {
  res.json({ ok: true, message: "Local API running. Use POST /api/live-token for voice." });
});

app.listen(PORT, () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. Voice chat will fail.");
  }
  console.log(`Local API listening on http://localhost:${PORT}`);
});
