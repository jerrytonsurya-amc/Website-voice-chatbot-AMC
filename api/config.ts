import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    mode: "vercel-direct",
    configured: Boolean(process.env.GEMINI_API_KEY),
    message: "Voice runs on Vercel via Gemini Live API (no external WebSocket server needed).",
  });
}
