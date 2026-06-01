/**
 * Resolves WebSocket URL for the Gemini Live API bridge.
 *
 * Priority:
 * 1. VITE_WS_URL (baked in at build time)
 * 2. /api/config → WS_URL from Vercel env (runtime, no rebuild needed)
 * 3. Same host /api/live (local dev with npm run dev only)
 */
let cachedUrl: string | null = null;

function isVercelHost(): boolean {
  return window.location.hostname.includes("vercel.app");
}

export async function resolveLiveWebSocketUrl(): Promise<string> {
  if (cachedUrl) {
    return cachedUrl;
  }

  const buildTimeUrl = import.meta.env.VITE_WS_URL?.trim();
  if (buildTimeUrl) {
    cachedUrl = buildTimeUrl.replace(/\/$/, "");
    return cachedUrl;
  }

  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = (await res.json()) as { wsUrl?: string | null };
      if (data.wsUrl) {
        cachedUrl = data.wsUrl.replace(/\/$/, "");
        return cachedUrl;
      }
    }
  } catch {
    // Not on Vercel or config endpoint unavailable
  }

  if (isVercelHost()) {
    throw new Error(
      "Voice server is not configured. Deploy the Node backend on Render, then add WS_URL in Vercel (e.g. wss://your-app.onrender.com/api/live) and redeploy."
    );
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  cachedUrl = `${protocol}//${window.location.host}/api/live`;
  return cachedUrl;
}
