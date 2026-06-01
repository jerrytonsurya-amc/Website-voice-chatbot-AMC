import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runTool } from "../src/lib/apiServices";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, args } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Missing tool name" });
    }

    const result = runTool(name, (args || {}) as Record<string, unknown>);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("tools error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Tool execution failed",
    });
  }
}
