import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, Database, AlertCircle, RefreshCw, 
  Settings, Play, Volume2, Radio
} from 'lucide-react';
import { MediaUploadHandler } from '@/utils/mediaUpload';

interface RecorderDebuggerProps {
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  isActive: boolean;
}

export default function RecorderDebugger({ mediaStream, audioContext, isActive }: RecorderDebuggerProps) {
  const [rmsVolume, setRmsVolume] = useState<number>(0);
  const [sampleRate, setSampleRate] = useState<number>(0);
  const [bufferSize, setBufferSize] = useState<string>('0 bytes');
  const [storageState, setStorageState] = useState<{ isReady: boolean; mode: string; path?: string }>({
    isReady: false,
    mode: 'Checking'
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  // Function to add a console and UI combined log
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(`[AudioDebugger] ${msg}`);
    setDiagnosticLogs(prev => [formatted, ...prev].slice(0, 5));
  };

  // Check Storage readiness
  const runDiagnosticCheck = async () => {
    setIsChecking(true);
    addLog("Initiating storage readiness diagnostic...");
    
    try {
      const res = await MediaUploadHandler.checkStorageReadiness();
      setStorageState(res);
      if (res.isReady) {
        addLog(`Storage Readiness: READY (${res.mode} synced on ${res.path})`);
      } else {
        addLog("Storage Readiness: WARNING (Could not connect)");
      }
    } catch (e: any) {
      setStorageState({ isReady: false, mode: 'error' });
      addLog(`Storage Diagnostics Failed: ${e.message || e}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runDiagnosticCheck();
  }, []);

  // Monitor Web Audio stream and log buffer status
  useEffect(() => {
    if (!isActive || !mediaStream) {
      setRmsVolume(0);
      return;
    }

    addLog(`Active media recording stream detected: ${mediaStream.id}`);
    addLog(`Tracks active: ${mediaStream.getAudioTracks().map(t => `${t.label} (${t.readyState})`).join(', ')}`);

    let audioCtx: AudioContext | null = audioContext;
    let didCreateLocalCtx = false;

    if (!audioCtx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        didCreateLocalCtx = true;
        addLog(`Sub-debugger AudioContext initialized. SampleRate: ${audioCtx.sampleRate}Hz`);
      } catch (err: any) {
        addLog(`Failed to configure diagnostic AudioContext: ${err.message || err}`);
        return;
      }
    }

    setSampleRate(audioCtx.sampleRate);

    let analyser: AnalyserNode | null = null;
    let microphoneNode: MediaStreamAudioSourceNode | null = null;
    let scriptNode: ScriptProcessorNode | null = null;

    try {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      microphoneNode = audioCtx.createMediaStreamSource(mediaStream);
      microphoneNode.connect(analyser);

      // Create a ScriptProcessor to read actual hardware audio buffers for logging!
      scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      analyser.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      let logThrottle = 0;

      scriptNode.onaudioprocess = (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const bufferLen = inputData.length;
        
        // Calculate root-mean-square (RMS) for signal amplitude monitoring
        let sum = 0;
        for (let i = 0; i < bufferLen; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / bufferLen);
        setRmsVolume(Math.round(rms * 100));
        setBufferSize(`${bufferLen} floats (${(bufferLen * 4).toLocaleString()} bytes)`);

        logThrottle++;
        if (logThrottle >= 25) { // Every ~2 seconds at 4096 buffer size
          logThrottle = 0;
          console.log(`[AudioBuffer Monitor] Buffer state: ${bufferLen} frames. Amplitude average RMS: ${rms.toFixed(5)}`);
        }
      };
    } catch (e: any) {
      addLog(`Failed to hook Web Audio buffer analyzer nodes: ${e.message || e}`);
    }

    return () => {
      // Cleanup buffer listener
      if (scriptNode) {
        try { scriptNode.disconnect(); } catch (e) {}
      }
      if (microphoneNode) {
        try { microphoneNode.disconnect(); } catch (e) {}
      }
      if (analyser) {
        try { analyser.disconnect(); } catch (e) {}
      }
      if (didCreateLocalCtx && audioCtx) {
        try { audioCtx.close(); } catch (e) {}
      }
      addLog("Stream monitor terminated.");
    };
  }, [mediaStream, audioContext, isActive]);

  return (
    <div className="bg-[#090b11] border border-white/5 rounded-2xl p-4 space-y-4 text-left shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#FF4D67] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white font-mono">
            Biometric Hardware Debugger
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] font-mono text-zinc-500 uppercase">Storage readiness:</span>
          {isChecking ? (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-spin flex items-center justify-center p-0.5" />
          ) : storageState.isReady ? (
            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-mono uppercase px-1.5 py-0.5 rounded font-black tracking-widest">
              <ShieldCheck size={9} className="text-emerald-400" /> READY
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[7px] font-mono uppercase px-1.5 py-0.5 rounded font-black tracking-widest">
              <AlertCircle size={9} className="text-rose-400" /> WARN
            </div>
          )}
          <button 
            type="button" 
            onClick={runDiagnosticCheck}
            disabled={isChecking}
            className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw size={10} className={isChecking ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 font-mono">
          <p className="text-[7.5px] text-zinc-500 font-extrabold uppercase mb-1">Signal RMS Amp</p>
          <div className="flex items-center gap-1.5">
            <Volume2 size={11} className={rmsVolume > 0 ? "text-emerald-400" : "text-zinc-600"} />
            <span className="text-[10.5px] font-black text-white">{rmsVolume}%</span>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 font-mono">
          <p className="text-[7.5px] text-zinc-500 font-extrabold uppercase mb-1">Hardware SampleRate</p>
          <div className="flex items-center gap-1.5">
            <Radio size={11} className="text-pink-500 animate-pulse" />
            <span className="text-[10.5px] font-black text-white">{sampleRate ? `${sampleRate} Hz` : '0 Hz'}</span>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 font-mono">
          <p className="text-[7.5px] text-zinc-500 font-extrabold uppercase mb-1">Active Buffer size</p>
          <div className="flex items-center gap-1.5">
            <Database size={11} className="text-cyan-400" />
            <span className="text-[10.5px] font-black text-white truncate max-w-[80px]">{bufferSize}</span>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 space-y-1.5 font-mono">
        <p className="text-[7.5px] text-zinc-500 font-extrabold uppercase">Live diagnostic feed</p>
        <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1 text-[7px] text-zinc-400">
          {diagnosticLogs.length === 0 ? (
            <p className="italic text-zinc-600">No buffer logs available. Start recording to record live telemetry.</p>
          ) : (
            diagnosticLogs.map((log, i) => (
              <p key={i} className="truncate select-none leading-relaxed border-l border-white/5 pl-1.5">{log}</p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
