// Native Web Audio API Sound Synthesizer for Ringing, Chimes, Coin Deductions, & Voice previews

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    // Automatically attempt to unlock on first user gesture anywhere in document
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
      };
      window.addEventListener('click', unlockHandler, { passive: true, once: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true, once: true });
      window.addEventListener('keydown', unlockHandler, { passive: true, once: true });
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Force unlock AudioContext on user click or touch
  unlockAudio(): boolean {
    try {
      const ctx = this.initCtx();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a tiny audible warm-up sound to immediately transition AudioContext to running state
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
      this.isUnlocked = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  get isAudioContextSuspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended';
  }

  // Realistic Smartphone / Chamet / WhatsApp video call Ringtone (Loud, Melodic & 100% Reliable)
  playRingtone(): () => void {
    const ctx = this.initCtx();
    if (!ctx) return () => {};

    let isPlaying = true;
    let loopTimer: any = null;
    let activeNodes: any[] = [];

    // Master volume gain for ringtone to ensure loud and clear sound
    const masterRingGain = ctx.createGain();
    masterRingGain.gain.setValueAtTime(0.95, ctx.currentTime);
    masterRingGain.connect(ctx.destination);

    // Modern Cheerful Smartphone Video Call Ringtone (Dual Chime Cadence)
    // Plays an unmistakable, clear, loud, melodic video call ring pattern
    const ringNotes = [
      { freq1: 659.25, freq2: 523.25, time: 0.00, dur: 0.24 }, // E5 + C5
      { freq1: 783.99, freq2: 659.25, time: 0.25, dur: 0.24 }, // G5 + E5
      { freq1: 1046.50, freq2: 783.99, time: 0.50, dur: 0.38 }, // C6 + G5
      { freq1: 880.00, freq2: 698.46, time: 0.95, dur: 0.24 }, // A5 + F5
      { freq1: 1046.50, freq2: 880.00, time: 1.20, dur: 0.28 }, // C6 + A5
      { freq1: 1318.51, freq2: 1046.50, time: 1.50, dur: 0.50 }, // E6 + C6 peak
    ];

    const playPhrase = () => {
      if (!isPlaying || !ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Safe future base time to eliminate Web Audio past-scheduling drops
      const baseTime = Math.max(ctx.currentTime, 0.01) + 0.05;

      ringNotes.forEach(note => {
        if (!isPlaying) return;

        try {
          const startTime = baseTime + note.time;
          const endTime = startTime + note.dur;

          // Oscillator 1: High crisp melodic chime (sine)
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(note.freq1, startTime);

          // Oscillator 2: Rich harmony body (triangle)
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(note.freq2, startTime);

          // Note Envelope
          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0.001, startTime);
          noteGain.gain.linearRampToValueAtTime(0.9, startTime + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

          osc1.connect(noteGain);
          osc2.connect(noteGain);
          noteGain.connect(masterRingGain);

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(endTime);
          osc2.stop(endTime);

          activeNodes.push(osc1, osc2, noteGain);
        } catch (err) {
          console.warn("[audioEffects] Error scheduling ring note:", err);
        }
      });

      // Loop every 2.4 seconds (standard rhythmic ring cadence)
      loopTimer = setTimeout(playPhrase, 2400);
    };

    // Auto-resume if context was suspended
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (isPlaying) playPhrase();
      }).catch(() => {
        if (isPlaying) playPhrase();
      });
    } else {
      playPhrase();
    }

    // Attach immediate one-shot gesture listeners on window to unpause if suspended
    const unlockOnGesture = () => {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (isPlaying && activeNodes.length === 0) playPhrase();
        }).catch(() => {});
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', unlockOnGesture, { once: true, passive: true });
      window.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true });
      window.addEventListener('click', unlockOnGesture, { once: true, passive: true });
    }

    return () => {
      isPlaying = false;
      if (loopTimer) clearTimeout(loopTimer);
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
      activeNodes = [];
      try {
        masterRingGain.disconnect();
      } catch (e) {}
    };
  }

  // Radar Ping / Sonar pulse sound during Match Call search (Gentle fixed D5 drop - No sliding siren!)
  playRadarPing() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime + 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // Gentle D5 soft ping, constant pitch (No sliding pitch/siren)

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // Match Found chime (cheerful sparkling success)
  playMatchSuccess() {
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime + 0.02;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch (e) {}
  }

  // Coin Deduction Chime (Golden chime every 60s)
  playCoinDeduct() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  // Gift Celebration Sound
  playGiftCelebration() {
    const ctx = this.initCtx();
    if (!ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.45);
    });
  }

  // Call End / Hangup tone (Silenced - Prevents harsh sawtooth buzzer/siren when ending or cutting calls)
  playHangup() {
    // Intentionally silent so no buzzer or siren plays when user or host cuts the call
  }

  // Generic play helper
  play(type: 'gift' | 'pop' | 'coin' | 'ring' | 'hangup') {
    if (type === 'gift') this.playGiftCelebration();
    else if (type === 'coin') this.playCoinDeduct();
    else if (type === 'pop') this.playCoinDeduct();
    // 'hangup' remains completely silent per user directive
  }

  // Voice Note preview simulation with SpeechSynthesis if available
  speakVoiceNote(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined') return;

    // First try Web Speech API with a female Hindi / Indian English voice
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.25;
      utterance.rate = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        (v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Female'))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback melodic chime
      this.playGiftCelebration();
      if (onEnd) setTimeout(onEnd, 3000);
    }
  }

  stopVoiceNote() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundEffects = new SoundEffectsEngine();
