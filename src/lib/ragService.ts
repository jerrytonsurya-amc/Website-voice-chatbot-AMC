import { ai } from './geminiClient';

// Simplified RAG service
export async function generateEmbedding(text: string) {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
  });
  return (result as any).embedding?.values || [];
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
