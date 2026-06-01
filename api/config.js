/**
 * Vercel serverless: exposes WebSocket backend URL at runtime.
 * Set WS_URL in Vercel → Settings → Environment Variables, e.g.:
 * wss://your-app.onrender.com/api/live
 */
export default function handler(_request, response) {
  const wsUrl =
    process.env.WS_URL?.trim() ||
    process.env.VITE_WS_URL?.trim() ||
    "";

  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    wsUrl: wsUrl || null,
    configured: Boolean(wsUrl),
  });
}
