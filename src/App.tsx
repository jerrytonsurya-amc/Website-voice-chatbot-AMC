/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, BrainCircuit, Signal, Loader2, Sparkles, X } from 'lucide-react';
import { useLiveSession } from './lib/useLiveSession';

export default function App() {
  const { start, stop, isActive, rms, connectionStatus, errorMessage } = useLiveSession();
  const [mounted, setMounted] = useState(false);
  const [isWidget, setIsWidget] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsWidget(window.location.search.includes('mode=widget'));
  }, []);

  if (!mounted) return null;

  return (
    <div id="app-root" className={`min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center justify-center relative ${isWidget ? 'p-4' : 'p-4'}`}>
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-yellow-500/10 via-transparent to-transparent blur-[120px]"
        />
        <motion.div 
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -45, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-amber-600/10 via-transparent to-transparent blur-[120px]"
        />
        {/* Animated Particles/Dust */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:4px_4px]" />
      </div>

      {/* Top HUD - Hidden or Minimal in Widget Mode */}
      {!isWidget && (
        <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-start z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center group overflow-hidden">
              <Sparkles className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h2 className="text-sm font-medium tracking-[0.2em] uppercase opacity-80">Shriram AMC</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/20'}`} />
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">
                  {connectionStatus === 'connected' ? 'Quantum Link Secure' : 'Curriculum V-A Loaded'}
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-auto flex gap-3">
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3">
              <Signal className={`w-3 h-3 ${isActive ? 'text-emerald-400' : 'text-white/20'}`} />
              <span className="text-[10px] font-mono tracking-[0.1em] opacity-60">12ms RTT</span>
            </div>
          </div>
        </nav>
      )}

      {/* Central Visualizer Engine */}
      <main className={`relative z-10 w-full max-w-4xl flex flex-col items-center justify-center transition-all ${isWidget ? 'gap-8' : 'gap-16'} px-6`}>
        
        <div className={`relative w-full flex items-center justify-center transition-all ${isWidget ? 'h-64' : 'h-96'}`}>
          {/* Liquid Core */}
          <div className={`relative transition-all ${isWidget ? 'w-48 h-48' : 'w-64 h-64 md:w-80 md:h-80'}`}>
            {/* Iridescent Layer 1 */}
            <motion.div
              animate={{
                scale: 1 + rms.model * 2.5,
                borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "70% 30% 50% 50% / 30% 60% 40% 70%", "40% 60% 70% 30% / 40% 50% 60% 50%"],
                rotate: [0, 120, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-amber-400/20 to-yellow-600/20 blur-xl opacity-60"
            />
            
            {/* Iridescent Layer 2 */}
            <motion.div
              animate={{
                scale: 1 + rms.user * 2,
                borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "60% 40% 30% 70% / 60% 30% 70% 40%", "30% 70% 70% 30% / 30% 30% 70% 70%"],
                rotate: [0, -90, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 border border-white/10 backdrop-blur-[2px] shadow-2xl"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)'
              }}
            />

            {/* Glowing Focal Point */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`rounded-full border border-white/20 flex items-center justify-center bg-black/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(234,179,8,0.1)] transition-all ${isWidget ? 'w-24 h-24' : 'w-32 h-32 md:w-40 md:h-40'}`}>
                <AnimatePresence mode="wait">
                  {connectionStatus === 'connecting' ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className={`${isWidget ? 'w-6 h-6' : 'w-10 h-10'} animate-spin text-yellow-500/40`} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div 
                      key="active" 
                      initial={{ scale: 0.8, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1"
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: isWidget ? [6, 16, 6] : [8, 24, 8],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          className="w-1 bg-yellow-400 rounded-full"
                          style={{ height: isWidget ? '8px' : '12px' }}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Sparkles className={`${isWidget ? 'w-6 h-6' : 'w-10 h-10'} text-yellow-500/20`} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className={`w-full flex flex-col items-center transition-all ${isWidget ? 'gap-6 mt-[-20px]' : 'gap-8'}`}>
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isActive ? stop : start}
              className={`
                relative rounded-full font-bold tracking-[0.3em] uppercase transition-all duration-700
                overflow-hidden flex items-center gap-4 border
                ${isWidget ? 'px-8 py-3.5 text-xs' : 'px-12 py-5 text-sm'}
                ${isActive 
                  ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' 
                  : 'bg-transparent text-white border-yellow-500/20 hover:border-yellow-500/60 hover:bg-yellow-500/5'
                }
              `}
            >
              {isActive ? <X className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isActive ? 'Stop Chat' : isWidget ? 'Start AI' : 'Initiate voice chat'}
              
              {/* Button Sheen */}
              <motion.div 
                animate={{ left: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              />
            </motion.button>
            <div className={`absolute -inset-4 rounded-full blur-2xl opacity-20 transition-all duration-500 group-hover:opacity-40 -z-10 ${isActive ? 'bg-yellow-500' : 'bg-amber-600'}`} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-40 flex items-center gap-2">
              {!isWidget && <span className="w-1 h-1 rounded-full bg-white animate-ping" />}
              {isWidget ? 'Sync: Stable' : 'Real-time Neural Sync'}
            </span>
            {connectionStatus === 'error' && errorMessage && (
              <p className="text-[10px] text-red-400/90 text-center max-w-md leading-relaxed px-4">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Floating Status Bar - Hidden in Widget Mode or minimal */}
      {!isWidget ? (
        <footer className="fixed bottom-0 left-0 w-full p-8 flex justify-between items-end z-50 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-4 h-0.5 rounded-full overflow-hidden bg-white/5"
                >
                  <motion.div 
                    className="h-full bg-yellow-500/60"
                    animate={{ 
                      width: isActive && i === Math.floor(rms.user * 30) ? "100%" : "0%" 
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-[9px] font-mono tracking-widest uppercase opacity-30">Spectrum Response</span>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-mono tracking-widest uppercase opacity-30 block">Connection: {connectionStatus === 'connected' ? 'Secure' : connectionStatus}</span>
            <span className="text-[9px] font-mono tracking-widest uppercase opacity-30 block mt-1">Status: {isActive ? 'Streaming' : 'Ready'}</span>
          </div>
        </footer>
      ) : (
        <div className="fixed bottom-4 text-center w-full">
           <span className="text-[8px] font-mono tracking-widest uppercase opacity-20">Shriram Finance AMC Intelligence v1.0</span>
        </div>
      )}
    </div>
  );
}
