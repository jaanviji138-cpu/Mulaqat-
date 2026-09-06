// Global Audio Manager for Outgoing & Incoming Video Calls
// Features:
// 1. Full, Fast, High-energy, Sweet Upbeat Polyphonic Incoming Ringtone (148 BPM Melodic Chime Ringtone)
// 2. Audible Outgoing Ringtone cadence ("होस्ट को घंटी जा रही है...")
// 3. Fail-safe multi-layered Web Audio engine with instant unlock on any user tap

export interface AudioManagerState {
  isOutgoingRinging: boolean;
  isIncomingRinging: boolean;
  isAudioBlocked: boolean;
  isMuted: boolean;
  volume: number;
}

export type AudioStateListener = (state: AudioManagerState) => void;

class GlobalAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isOutgoing = false;
  private isIncoming = false;
  private isBlocked = false;
  private isMuted = false;
  private currentVolume = 1.0; // Maximum clear volume
  private isUnlocked = false;

  // Active synthesizer loop timers & oscillators
  private activeIncomingTimer: any = null;
  private activeOutgoingTimer: any = null;
  private activeNodes: (AudioNode | OscillatorNode)[] = [];

  private listeners: Set<AudioStateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Automatic capture of the very first user interaction anywhere in the window
      const unlockListener = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlockListener, { capture: true, passive: true });
      window.addEventListener('touchstart', unlockListener, { capture: true, passive: true });
      window.addEventListener('pointerdown', unlockListener, { capture: true, passive: true });
      window.addEventListener('keydown', unlockListener, { capture: true, passive: true });
    }
  }

  /**
   * Safe AudioContext initialization & master gain connection with Studio Limiter / Compressor
   */
  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && !this.masterGain) {
      try {
        // High-fidelity studio dynamics compressor / brickwall limiter to eliminate clipping glitches
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(14, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
        this.masterGain.connect(this.compressor);
      } catch (e) {
        console.warn('[GlobalAudioManager] Failed to create master gain or compressor:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Forcefully unlock Web Audio on any touch or click event
   */
  public unlockAudio(): boolean {
    try {
      const ctx = this.getContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Play a tiny warm-up pulse to immediately force AudioContext to 'running'
      if (!this.isUnlocked) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
          this.isUnlocked = true;
          this.isBlocked = false;
        } catch (e) {}
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  public unblockAudio(): void {
    this.unlockAudio();
    this.isBlocked = false;
    if (this.isIncoming) {
      this.playFastIncomingSynthLoop();
    }
    this.notifyListeners();
  }

  /**
   * Starts the Full, Fast, High-energy Incoming Ringtone (148 BPM Romantic Pop Ringtone)
   */
  public startIncomingRingtone(options?: { volume?: number; onPlay?: () => void; onBlocked?: () => void }): void {
    this.stopOutgoingRingtone();

    this.isIncoming = true;
    this.isOutgoing = false;

    if (options?.volume !== undefined) {
      this.currentVolume = options.volume;
    } else {
      this.currentVolume = 1.0;
    }

    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      } catch (e) {}
    }

    const ctx = this.getContext();
    if (!ctx) {
      this.isBlocked = true;
      if (options?.onBlocked) options.onBlocked();
      this.notifyListeners();
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isBlocked = false;
        if (options?.onPlay) options.onPlay();
        this.playFastIncomingSynthLoop();
        this.notifyListeners();
      }).catch(() => {
        this.isBlocked = true;
        if (options?.onBlocked) options.onBlocked();
        this.notifyListeners();
      });
    } else {
      this.isBlocked = false;
      if (options?.onPlay) options.onPlay();
      this.playFastIncomingSynthLoop();
      this.notifyListeners();
    }
  }

  /**
   * Final High-Volume, Crisp, Vocal-Melodic Romantic Ringtone
   * Tempo: 144 BPM. Lush, singing vocal-formant bell chime.
   * Clear vocal-presence frequencies with zero glitching or crackling.
   */
  private playFastIncomingSynthLoop(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.activeIncomingTimer) {
      clearTimeout(this.activeIncomingTimer);
      this.activeIncomingTimer = null;
    }

    // Always clear prior active nodes to avoid memory buildup and overlapping glitches
    this.cleanupActiveNodes();

    // Active oscillator recycling without touching masterGain volume
    const cleanNodes = () => {
      const now = this.ctx?.currentTime || 0;
      this.activeNodes = this.activeNodes.filter(node => {
        try {
          // If node has stopped in the past, disconnect and drop
          if ('_stopTime' in (node as any) && (node as any)._stopTime < now - 0.2) {
            node.disconnect();
            return false;
          }
        } catch (e) {}
        return true;
      });
    };

    const loopCycle = () => {
      if (!this.isIncoming || !this.ctx || !this.masterGain) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.isIncoming) loopCycle();
        }).catch(() => {});
        return;
      }

      // Ensure master gain is at full volume for ringtone
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      } catch (e) {}

      cleanNodes();

      // Safe future scheduling anchor (60ms ahead of currentTime)
      const now = this.ctx.currentTime + 0.06;
      const step = 60 / 144 / 4; // 144 BPM 16th note (~104ms per step)

      // Signature Melodic Romance Chime Ringtone (Sweet, Lively & Upbeat Indian Pop Motif)
      const melody = [
        { s: 0,  f: 659.25,  d: 0.20, accent: 1.1 }, // E5
        { s: 2,  f: 783.99,  d: 0.20, accent: 1.1 }, // G5
        { s: 3,  f: 880.00,  d: 0.22, accent: 1.15 }, // A5
        { s: 4,  f: 1046.50, d: 0.35, accent: 1.3 }, // C6 (High Peak Chime)
        { s: 6,  f: 987.77,  d: 0.20, accent: 1.05 }, // B5
        { s: 8,  f: 880.00,  d: 0.22, accent: 1.1 }, // A5
        { s: 10, f: 783.99,  d: 0.22, accent: 1.1 }, // G5
        { s: 12, f: 659.25,  d: 0.24, accent: 1.0 }, // E5
        { s: 14, f: 587.33,  d: 0.26, accent: 1.0 }, // D5

        // Phrase 2 - Uplifting Melodic Resolution
        { s: 16, f: 523.25,  d: 0.20, accent: 1.05 }, // C5
        { s: 18, f: 659.25,  d: 0.20, accent: 1.1 }, // E5
        { s: 19, f: 783.99,  d: 0.20, accent: 1.1 }, // G5
        { s: 20, f: 880.00,  d: 0.24, accent: 1.15 }, // A5
        { s: 22, f: 1046.50, d: 0.24, accent: 1.25 }, // C6
        { s: 24, f: 1174.66, d: 0.26, accent: 1.3 }, // D6
        { s: 26, f: 1318.51, d: 0.38, accent: 1.35 }, // E6 (Singing Peak Bell)
        { s: 28, f: 1174.66, d: 0.24, accent: 1.1 }, // D6
        { s: 30, f: 1046.50, d: 0.44, accent: 1.25 }  // C6 (Sustained sweet chime)
      ];

      // Vocal Formant Filter (Warm vocal presence at 1.85kHz)
      let vocalFilter: BiquadFilterNode | null = null;
      try {
        vocalFilter = this.ctx.createBiquadFilter();
        vocalFilter.type = 'peaking';
        vocalFilter.frequency.setValueAtTime(1850, now);
        vocalFilter.Q.setValueAtTime(2.2, now);
        vocalFilter.gain.setValueAtTime(5.0, now);
        vocalFilter.connect(this.masterGain);
        this.activeNodes.push(vocalFilter);
      } catch (e) {}

      const destGain = vocalFilter || this.masterGain;

      melody.forEach(n => {
        if (!this.isIncoming || !this.ctx) return;

        try {
          const startTime = now + n.s * step;
          const stopTime = startTime + n.d + 0.10;

          // 1. Primary Singing Sine Oscillator
          const osc1 = this.ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(n.f, startTime);

          // 2. Sweet Harmonic Shimmer (triangle)
          const osc2 = this.ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(n.f * 2, startTime);

          // 3. Smooth, zero-click Envelope
          const noteGain = this.ctx.createGain();
          const targetVol = this.isMuted ? 0 : Math.min(1.0, 0.75 * n.accent);

          noteGain.gain.setValueAtTime(0.0001, startTime);
          noteGain.gain.linearRampToValueAtTime(targetVol, startTime + 0.012);
          noteGain.gain.setTargetAtTime(0.0001, startTime + 0.025, n.d * 0.45);

          osc1.connect(noteGain);
          osc2.connect(noteGain);
          noteGain.connect(destGain);

          (osc1 as any)._stopTime = stopTime;
          (osc2 as any)._stopTime = stopTime;
          (noteGain as any)._stopTime = stopTime;

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(stopTime);
          osc2.stop(stopTime);

          this.activeNodes.push(osc1, osc2, noteGain);
        } catch (e) {}
      });

      // Repeat loop continuously every 3.3 seconds as long as incoming call is active
      this.activeIncomingTimer = setTimeout(() => {
        if (this.isIncoming) {
          loopCycle();
        }
      }, 3300);
    };

    loopCycle();
  }

  /**
   * Stops incoming ringtone and clears all sound oscillators
   */
  public stopIncomingRingtone(): void {
    this.isIncoming = false;

    if (this.activeIncomingTimer) {
      clearTimeout(this.activeIncomingTimer);
      this.activeIncomingTimer = null;
    }

    this.cleanupActiveNodes();
    this.notifyListeners();
  }

  /**
   * Outgoing Ringtone cadence ("हमारी तरफ से घंटी जा रही है - ट्रू-ट्रू...")
   * Authentic, realistic dual-burst telecommunication ringback tone (400Hz + 450Hz dual-frequency tone)
   * Pattern: Trrrr (0.45s) -> silence (0.22s) -> Trrrr (0.45s) -> silence (2.2s) -> repeat
   */
  public startOutgoingRingtone(options?: { onBlocked?: () => void; onPlay?: () => void }): void {
    if (this.isOutgoing) return;

    this.stopIncomingRingtone();
    this.isOutgoing = true;

    const ctx = this.getContext();
    if (!ctx) {
      this.isBlocked = true;
      if (options?.onBlocked) options.onBlocked();
      return;
    }

    const ringCycle = () => {
      if (!this.isOutgoing || !this.ctx || !this.masterGain) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.isOutgoing) ringCycle();
        }).catch(() => {});
        return;
      }

      try {
        const now = this.ctx.currentTime + 0.04;
        
        // Authentic Indian/Global telecom ringback: dual 400Hz + 450Hz sine tones
        // 2 distinct pulses ("ट्रू-ट्रू")
        const pulses = [
          { start: 0, duration: 0.42 },      // First "Trrrr"
          { start: 0.62, duration: 0.42 }    // Second "Trrrr"
        ];

        pulses.forEach(pulse => {
          if (!this.ctx || !this.masterGain) return;

          const pStart = now + pulse.start;
          const pEnd = pStart + pulse.duration;

          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const osc3 = this.ctx.createOscillator(); // gentle sub-harmonic
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(400, pStart);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(450, pStart);

          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(850, pStart);

          const targetVol = this.isMuted ? 0 : 0.48;
          gain.gain.setValueAtTime(0.0001, pStart);
          gain.gain.linearRampToValueAtTime(targetVol, pStart + 0.025);
          gain.gain.setValueAtTime(targetVol, pEnd - 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, pEnd);

          osc1.connect(gain);
          osc2.connect(gain);
          
          // Subtle harmonic gain for clarity on small mobile speakers
          const harmGain = this.ctx.createGain();
          harmGain.gain.setValueAtTime(0.08, pStart);
          osc3.connect(harmGain);
          harmGain.connect(gain);

          gain.connect(this.masterGain);

          osc1.start(pStart);
          osc2.start(pStart);
          osc3.start(pStart);

          osc1.stop(pEnd + 0.05);
          osc2.stop(pEnd + 0.05);
          osc3.stop(pEnd + 0.05);

          this.activeNodes.push(osc1, osc2, osc3, gain, harmGain);
        });

      } catch (e) {
        console.warn('Outgoing ringtone error:', e);
      }

      // Next cadence cycle starts after ~3.3 seconds (2.2s silence after 2nd ring)
      this.activeOutgoingTimer = setTimeout(ringCycle, 3300);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.isBlocked = false;
        if (options?.onPlay) options.onPlay();
        ringCycle();
        this.notifyListeners();
      }).catch(() => {
        this.isBlocked = true;
        if (options?.onBlocked) options.onBlocked();
        this.notifyListeners();
      });
    } else {
      this.isBlocked = false;
      if (options?.onPlay) options.onPlay();
      ringCycle();
      this.notifyListeners();
    }
  }

  /**
   * One-touch ringtone test for users to immediately verify audio is working
   */
  public testRingtone(type: 'incoming' | 'outgoing' = 'incoming'): void {
    this.unlockAudio();
    if (type === 'incoming') {
      this.startIncomingRingtone({ volume: 1.0 });
      setTimeout(() => {
        this.stopIncomingRingtone();
      }, 6000);
    } else {
      this.startOutgoingRingtone();
      setTimeout(() => {
        this.stopOutgoingRingtone();
      }, 6000);
    }
  }

  public stopOutgoingRingtone(): void {
    this.isOutgoing = false;

    if (this.activeOutgoingTimer) {
      clearTimeout(this.activeOutgoingTimer);
      this.activeOutgoingTimer = null;
    }

    this.cleanupActiveNodes();
    this.notifyListeners();
  }

  public stopAll(): void {
    this.stopIncomingRingtone();
    this.stopOutgoingRingtone();
  }

  private cleanupActiveNodes(): void {
    if (this.masterGain && this.ctx && this.ctx.state === 'running') {
      try {
        // Quick 12ms soft ramp to avoid DC offset pop when stopping oscillators
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.012);
      } catch (e) {}
    }

    const nodesToClean = [...this.activeNodes];
    this.activeNodes = [];

    setTimeout(() => {
      for (const node of nodesToClean) {
        try {
          if ('stop' in node && typeof (node as any).stop === 'function') {
            (node as any).stop();
          }
          node.disconnect();
        } catch (e) {}
      }
      if (this.masterGain && this.ctx && this.ctx.state === 'running') {
        try {
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
        } catch (e) {}
      }
    }, 15);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      } catch (e) {}
    }
    this.notifyListeners();
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      } catch (e) {}
    }
    this.notifyListeners();
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  public getState(): AudioManagerState {
    return {
      isOutgoingRinging: this.isOutgoing,
      isIncomingRinging: this.isIncoming,
      isAudioBlocked: this.isBlocked,
      isMuted: this.isMuted,
      volume: this.currentVolume
    };
  }
}

export const globalAudioManager = new GlobalAudioManager();
