
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { arrayBufferToBase64, base64ToFloat32Array, float32ToInt16, calculateRMS } from './audio';
import { logVoiceChatSession } from './chatAnalytics';
import { collectSessionContext, initParentContextListener } from './sessionContext';

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      this.port.postMessage(channelData);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;


async function fetchLiveToken(context: ReturnType<typeof collectSessionContext>) {
  let response: Response;
  try {
    response = await fetch('/api/live-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. Run npm run dev (API on port 3000 + Vite on 5173), not vite alone.'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to start voice session (${response.status})`);
  }

  return response.json() as Promise<{ token: string; model: string }>;
}

async function runLiveTool(name: string, args: Record<string, unknown>) {
  const response = await fetch('/api/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, args }),
  });

  if (!response.ok) {
    throw new Error(`Tool ${name} failed`);
  }

  const body = await response.json();
  return body.result as string;
}

export function useLiveSession() {
  const [isActive, setIsActive] = useState(false);
  const [rms, setRms] = useState({ user: 0, model: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    setIsActive(false);

    sessionRef.current?.close();
    sessionRef.current = null;

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setRms({ user: 0, model: 0 });
  }, []);

  const stop = useCallback(() => {
    setConnectionStatus('idle');
    setErrorMessage(null);
    cleanupMedia();
  }, [cleanupMedia]);

  const failSession = useCallback((message: string) => {
    setErrorMessage(message);
    setConnectionStatus('error');
    cleanupMedia();
  }, [cleanupMedia]);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const analyser = ctx.createAnalyser();
    source.connect(analyser);

    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
    source.start();

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    const updateModelRms = () => {
      if (!isPlayingRef.current) {
        setRms((prev) => ({ ...prev, model: 0 }));
        return;
      }
      analyser.getFloatTimeDomainData(dataArray);
      setRms((prev) => ({ ...prev, model: calculateRMS(dataArray) }));
      requestAnimationFrame(updateModelRms);
    };
    updateModelRms();
  }, []);

  const start = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const context = collectSessionContext();
      void logVoiceChatSession({ context, status: 'initiated' });

      const { token, model } = await fetchLiveToken(context);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setConnectionStatus('connected');
            void logVoiceChatSession({ context, status: 'connected' });

            const source = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');

            workletNode.port.onmessage = (event) => {
              const inputData = event.data as Float32Array;
              setRms((prev) => ({ ...prev, user: calculateRMS(inputData) }));

              const pcmData = float32ToInt16(inputData);
              const base64Data = arrayBufferToBase64(pcmData);

              session.sendRealtimeInput({
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
              });
            };

            source.connect(workletNode);
            workletNode.connect(ctx.destination);
            workletNodeRef.current = workletNode;
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                try {
                  const result = await runLiveTool(
                    call.name || '',
                    (call.args || {}) as Record<string, unknown>
                  );
                  session.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { result },
                    }],
                  });
                } catch (toolError) {
                  console.error('Tool error:', toolError);
                  session.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { result: 'Data lookup failed. Please try again.' },
                    }],
                  });
                }
              }
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const float32Data = base64ToFloat32Array(base64Audio);
              audioQueueRef.current.push(float32Data);
              playNextChunk();
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onerror: (err) => {
            console.error('Gemini Live Error:', err);
            const msg = err.message || 'Voice connection error';
            void logVoiceChatSession({ context, status: 'failed', errorMessage: msg });
            failSession(msg);
          },
          onclose: () => {
            setIsActive(false);
            setConnectionStatus('idle');
          },
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to start session:', err);
      const message =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Microphone access denied. Allow microphone permission in your browser.'
            : err.message
          : 'Failed to start voice chat';
      const context = collectSessionContext();
      void logVoiceChatSession({ context, status: 'failed', errorMessage: message });
      failSession(message);
    }
  }, [failSession, playNextChunk]);

  useEffect(() => {
    initParentContextListener();
    return () => stop();
  }, [stop]);

  return { start, stop, isActive, rms, connectionStatus, errorMessage };
}
