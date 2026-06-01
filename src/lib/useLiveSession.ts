
import { useEffect, useRef, useState, useCallback } from 'react';
import { arrayBufferToBase64, base64ToFloat32Array, float32ToInt16, calculateRMS } from './audio';
import { collectSessionContext, initParentContextListener } from './sessionContext';
import { resolveLiveWebSocketUrl } from './liveApiUrl';

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      // Post a copy to avoid neutering issues if possible, though mostly for stability
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const stop = useCallback(() => {
    setIsActive(false);
    setConnectionStatus('idle');
    wsRef.current?.close();
    wsRef.current = null;
    
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

  const start = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const wsUrl = await resolveLiveWebSocketUrl();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      // Initialize Worklet
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'sessionContext',
          context: collectSessionContext(),
        }));
      };

      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === 'open') {
          setIsActive(true);
          setConnectionStatus('connected');
          
          const source = ctx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
          
          workletNode.port.onmessage = (e) => {
            const inputData = e.data;
            setRms(prev => ({ ...prev, user: calculateRMS(inputData) }));

            const pcmData = float32ToInt16(inputData);
            const base64Data = arrayBufferToBase64(pcmData);
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                realtimeInput: {
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                }
              }));
            }
          };

          source.connect(workletNode);
          workletNode.connect(ctx.destination);
          workletNodeRef.current = workletNode;
        }

        if (data.type === 'message') {
          const message = data.message;
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
        }

        if (data.type === 'error') {
          console.error("Bridge Error:", data.error);
          setConnectionStatus('error');
          stop();
        }

        if (data.type === 'close') {
          setIsActive(false);
          setConnectionStatus('idle');
        }
      };

      ws.onerror = () => {
        console.error("WebSocket Error");
        setErrorMessage(
          "Could not connect to the voice server. Ensure WS_URL points to your Render backend (wss://.../api/live)."
        );
        setConnectionStatus('error');
        stop();
      };

      ws.onclose = () => {
        setIsActive(false);
        setConnectionStatus('idle');
      };

    } catch (err) {
      console.error("Failed to start session:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to start voice session.");
      setConnectionStatus('error');
    }
  }, [stop, playNextChunk]);

  useEffect(() => {
    initParentContextListener();
    return () => stop();
  }, [stop]);

  return { start, stop, isActive, rms, connectionStatus, errorMessage };
}
