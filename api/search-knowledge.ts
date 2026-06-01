import type { VercelRequest, VercelResponse } from "@vercel/node";
import { searchMarketKnowledge } from "../src/lib/knowledgeSearch";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = String(req.body?.query || "");
    const result = searchMarketKnowledge(query);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("search-knowledge api error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Knowledge search failed",
    });
  }
}
