
import { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveServerMessage, Session } from '@google/genai';
import { arrayBufferToBase64, base64ToFloat32Array, float32ToInt16, calculateRMS } from './audio';
import { collectSessionContext, initParentContextListener } from './sessionContext';
import { connectGeminiLive } from './geminiLiveSession';

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

export function useLiveSession() {
  const [isActive, setIsActive] = useState(false);
  const [rms, setRms] = useState({ user: 0, model: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const stop = useCallback(() => {
    setIsActive(false);
    setConnectionStatus('idle');
    sessionRef.current?.close();
    sessionRef.current = null;

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
        setRms(prev => ({ ...prev, model: 0 }));
        return;
      }
      analyser.getFloatTimeDomainData(dataArray);
      setRms(prev => ({ ...prev, model: calculateRMS(dataArray) }));
      requestAnimationFrame(updateModelRms);
    };
    updateModelRms();
  }, []);

  const handleModelMessage = useCallback((message: LiveServerMessage) => {
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
  }, [playNextChunk]);

  const start = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);

      const sessionContext = collectSessionContext();

      const session = await connectGeminiLive(sessionContext, {
        onopen: () => {
          setIsActive(true);
          setConnectionStatus('connected');

          const source = ctx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');

          workletNode.port.onmessage = (e) => {
            const inputData = e.data as Float32Array;
            setRms(prev => ({ ...prev, user: calculateRMS(inputData) }));

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
        onmessage: handleModelMessage,
        onerror: (err) => {
          console.error('Gemini Live Error:', err);
          setErrorMessage(err.message || 'Voice connection failed.');
          setConnectionStatus('error');
          stop();
        },
        onclose: () => {
          setIsActive(false);
          setConnectionStatus('idle');
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to start session:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start voice session.');
      setConnectionStatus('error');
      stop();
    }
  }, [stop, handleModelMessage]);

  useEffect(() => {
    initParentContextListener();
    return () => stop();
  }, [stop]);

  return { start, stop, isActive, rms, connectionStatus, errorMessage };
}
