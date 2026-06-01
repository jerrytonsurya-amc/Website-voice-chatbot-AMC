/**
 * Local dev API server — same routes as Vercel /api/* for voice + tools.
 * Run alongside Vite (see scripts/dev.ts).
 */
import "dotenv/config";
import express from "express";
import { getNavCache } from "../src/lib/navCache";
import { searchNavData } from "../src/lib/navSearch";
import { searchFundPerformance } from "../src/lib/navPerformance";
import { searchMarketKnowledge } from "../src/lib/knowledgeSearch";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

getNavCache();

app.post("/api/live-token", async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY missing in .env" });
  }
  try {
    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    res.json({ token: token.name });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Token failed" });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({
    mode: "vercel-direct",
    configured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post("/api/nav", (req, res) => {
  res.json({ result: searchNavData(String(req.body?.query || "")) });
});

app.post("/api/performance", (req, res) => {
  res.json({ result: searchFundPerformance(String(req.body?.query || "")) });
});

app.post("/api/search-knowledge", (req, res) => {
  res.json({ result: searchMarketKnowledge(String(req.body?.query || "")) });
});

const PORT = Number(process.env.API_PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Dev API server on http://localhost:${PORT}`);
});
