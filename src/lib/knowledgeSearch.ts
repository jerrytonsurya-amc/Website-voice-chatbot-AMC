import fs from "fs";
import { resolveProjectFile } from "./resolveProjectFile";

let cachedKnowledge: string | null = null;

function loadKnowledge(): string {
  if (cachedKnowledge === null) {
    cachedKnowledge = fs.readFileSync(
      resolveProjectFile("data", "market-mantra-knowledge.txt"),
      "utf8"
    );
  }
  return cachedKnowledge;
}

export function searchMarketKnowledge(query: string, maxChars = 12000): string {
  const text = loadKnowledge();
  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  if (queryWords.length === 0) {
    return text.slice(0, maxChars);
  }

  const sections = text.split(/={10,}[\s\S]*?DOCUMENT:\s*/).filter(Boolean);

  const scored = sections.map((section, index) => {
    const lower = section.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (lower.includes(word)) score += 1;
    }
    return { section, score, index };
  });

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (top.length === 0) {
    return `No exact match in Monthly Market Mantra reports for "${query}". Here is an excerpt:\n\n${text.slice(0, maxChars)}`;
  }

  let result = "Relevant excerpts from Shriram AMC Monthly Market Mantra reports:\n\n";
  for (const item of top) {
    result += `---\n${item.section.trim()}\n\n`;
  }

  return result.slice(0, maxChars);
}
