/**
 * WebSocket URL for the Gemini Live API bridge.
 * - Local dev: same host as the page (server.ts serves /api/live).
 * - Vercel (static): set VITE_WS_URL to your Node backend, e.g.
 *   wss://your-app.onrender.com/api/live
 */
export function getLiveWebSocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/live`;
}
