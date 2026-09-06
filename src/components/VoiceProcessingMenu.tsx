import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Sparkles, 
  Headphones, 
  Radio, 
  Check, 
  Zap, 
  Activity,
  X
} from 'lucide-react';
import { VOICE_FILTERS, VoiceFilterConfig, RealtimeVoiceProcessor } from '@/utils/voiceProcessor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceProcessingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  voiceProcessor: RealtimeVoiceProcessor;
  activeFilterId: string;
  onSelectFilter: (filter: VoiceFilterConfig) => void;
  isBroadcasting: boolean;
  speakerRole: 'Host' | 'Seat Guest' | 'Viewer';
  onRequestSeat?: () => void;
}

export const VoiceProcessingMenu: React.FC<VoiceProcessingMenuProps> = ({
  isOpen,
  onClose,
  voiceProcessor,
  activeFilterId,
  onSelectFilter,
  isBroadcasting,
  speakerRole,
  onRequestSeat
}) => {
  const [isMonitoring, setIsMonitoring] = useState(voiceProcessor.getIsMonitoring());
  const [micVolume, setMicVolume] = useState(1.2);
  const [audioLevel, setAudioLevel] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync monitoring state with processor
  const handleToggleMonitoring = () => {
    const nextState = !isMonitoring;
    setIsMonitoring(nextState);
    voiceProcessor.setMonitoring(nextState);
    if (nextState) {
      toast.info('🎧 Hear Myself enabled! Use headphones to avoid feedback loop.');
    } else {
      toast.info('Hear Myself disabled.');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setMicVolume(newVol);
    voiceProcessor.setMasterVolume(newVol);
  };

  const handleFilterClick = (filter: VoiceFilterConfig) => {
    voiceProcessor.applyFilter(filter.id);
    onSelectFilter(filter);
    toast.success(`Applied ${filter.icon} ${filter.name} filter!`);
  };

  // Real-time Audio Visualizer Canvas animation loop
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const analyser = voiceProcessor.getAnalyser();
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Compute average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

      // Render to canvas if available
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        // Gradient color based on intensity
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(0.5, '#ec4899');
        gradient.addColorStop(1, '#f59e0b');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isOpen, voiceProcessor]);

  const activeFilter = VOICE_FILTERS.find(f => f.id === activeFilterId) || VOICE_FILTERS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-[#0C081E] border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_40px_rgba(6,182,212,0.25)] space-y-4 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <Radio size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Live Voice Effects (वॉयस फ़िल्टर)
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[8px] font-bold">
                      Real-time DSP
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Transform your voice live with robot, chipmunk & deep bass
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white text-xs transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Non-broadcaster alert if user is viewer */}
            {!isBroadcasting && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">🎙️</span>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-amber-300">Preview Mode Active</h4>
                    <p className="text-[10px] text-zinc-300 truncate">
                      Take an audio seat or host a room to broadcast live!
                    </p>
                  </div>
                </div>
                {onRequestSeat && (
                  <Button
                    size="sm"
                    onClick={onRequestSeat}
                    className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-bold shrink-0 shadow-sm"
                  >
                    Take Seat 🪑
                  </Button>
                )}
              </div>
            )}

            {/* Live Audio Visualizer Banner */}
            <div className="relative p-3 rounded-2xl bg-gradient-to-r from-black/80 via-[#140E2E]/90 to-black/80 border border-cyan-400/25 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{activeFilter.icon}</span>
                  <span className="text-xs font-bold text-white">
                    Active: <strong className="text-cyan-300">{activeFilter.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Activity size={10} className="animate-pulse" />
                  <span>MIC: {audioLevel}%</span>
                </div>
              </div>

              {/* Dynamic Waveform Canvas */}
              <div className="h-10 w-full bg-black/60 rounded-xl overflow-hidden relative flex items-center justify-center border border-white/5">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={40}
                  className="w-full h-full block"
                />
                {audioLevel === 0 && (
                  <span className="absolute text-[10px] text-zinc-500 font-medium pointer-events-none">
                    Speak into mic to see voice wave 🎙️
                  </span>
                )}
              </div>
            </div>

            {/* Voice Filters Grid */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                <span>Select Voice Preset</span>
                <span className="text-cyan-400">{VOICE_FILTERS.length} Effects Available</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {VOICE_FILTERS.map((filter) => {
                  const isSelected = filter.id === activeFilterId;

                  return (
                    <motion.button
                      key={filter.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleFilterClick(filter)}
                      className={`relative p-2.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-2.5 group overflow-hidden ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      {/* Active Indicator Ring */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      )}

                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${filter.color} flex items-center justify-center text-lg shrink-0 shadow-md`}>
                        {filter.icon}
                      </div>

                      <div className="min-w-0 flex-1 pr-3">
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                          {filter.name}
                        </h4>
                        <span className="text-[9px] text-zinc-400 block font-medium">
                          {filter.hindiName}
                        </span>
                        <p className="text-[8px] text-zinc-500 line-clamp-1 mt-0.5">
                          {filter.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Monitoring & Mic Gain Controls */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isMonitoring ? 'bg-cyan-500 text-black' : 'bg-white/10 text-zinc-400'}`}>
                    <Headphones size={14} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-white flex items-center gap-1">
                      Hear Myself (आवाज़ सुनें)
                    </h5>
                    <span className="text-[9px] text-zinc-400">
                      {isMonitoring ? 'Monitoring Active 🎧' : 'Listen to your voice filter'}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  type="button"
                  onClick={handleToggleMonitoring}
                  className={`h-7 px-3 rounded-lg text-[10px] font-extrabold transition-all ${
                    isMonitoring
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-md shadow-cyan-500/20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isMonitoring ? 'ON 🟢' : 'OFF'}
                </Button>
              </div>

              {/* Volume Gain Slider */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Volume2 size={13} />
                  <span className="text-[10px] font-bold">Gain:</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={micVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-cyan-300 w-8 text-right">
                  {Math.round(micVolume * 100)}%
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-1 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFilterClick(VOICE_FILTERS[0])}
                className="h-9 flex-1 rounded-xl bg-white/5 border-white/10 text-zinc-300 hover:text-white text-xs font-semibold"
              >
                Reset to Natural
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="h-9 flex-1 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black text-xs font-extrabold shadow-md shadow-cyan-500/20"
              >
                Done / Apply ✨
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VoiceProcessingMenu;
