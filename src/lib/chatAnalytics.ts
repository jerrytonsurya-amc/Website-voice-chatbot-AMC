import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "./firebase";
import type { SessionContext } from "./sessionContext";

export type VoiceChatLogStatus = "initiated" | "connected" | "failed";

export interface VoiceChatLogPayload {
  context: SessionContext;
  status?: VoiceChatLogStatus;
  errorMessage?: string;
}

/**
 * Records a voice chat event in Firestore collection `voice_chat_sessions`.
 * Non-blocking; failures are logged to the console only.
 */
export async function logVoiceChatSession({
  context,
  status = "initiated",
  errorMessage,
}: VoiceChatLogPayload): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const db = getFirestoreDb();
    const initiatedAt = new Date();

    await addDoc(collection(db, "voice_chat_sessions"), {
      status,
      initiatedAt: serverTimestamp(),
      initiatedAtIso: initiatedAt.toISOString(),
      initiatedAtMs: initiatedAt.getTime(),
      type: "voice",
      pageUrl: context.pageUrl ?? null,
      pageTitle: context.pageTitle ?? null,
      parentUrl: context.parentUrl ?? null,
      parentTitle: context.parentTitle ?? null,
      parentPath: context.parentPath ?? null,
      browserLanguage: context.browserLanguage ?? null,
      referrer: context.referrer ?? null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      errorMessage: errorMessage ?? null,
    });
  } catch (error) {
    console.warn("Firebase chat log failed:", error);
  }
}
