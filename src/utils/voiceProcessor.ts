// Real-time Web Audio API Voice Processing Engine

export interface VoiceFilterConfig {
  id: string;
  name: string;
  hindiName: string;
  icon: string;
  description: string;
  color: string;
  glowColor: string;
}

export const VOICE_FILTERS: VoiceFilterConfig[] = [
  {
    id: 'original',
    name: 'Natural Studio',
    hindiName: 'नेचुरल स्टूडियो',
    icon: '🎙️',
    description: 'Crisp broadcast voice with noise reduction & auto-leveling',
    color: 'from-amber-400 to-amber-600',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  {
    id: 'robot',
    name: 'Cyborg Robot',
    hindiName: 'रोबोट आवाज़',
    icon: '🤖',
    description: 'Metallic ring-modulated robotic synth voice',
    color: 'from-cyan-400 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)'
  },
  {
    id: 'chipmunk',
    name: 'Chipmunk / Squeak',
    hindiName: 'चिपमंक / फनी',
    icon: '🐿️',
    description: 'High-pitch squeaky cartoon voice with bright harmonics',
    color: 'from-pink-400 to-rose-500',
    glowColor: 'rgba(244, 63, 94, 0.4)'
  },
  {
    id: 'deep',
    name: 'Deep Titan / Monster',
    hindiName: 'गहरी आवाज़ (राक्षस)',
    icon: '👹',
    description: 'Heavy bass sub-octave monster voice',
    color: 'from-purple-500 to-indigo-700',
    glowColor: 'rgba(147, 51, 234, 0.4)'
  },
  {
    id: 'echo',
    name: 'Stadium Echo / Reverb',
    hindiName: 'स्टेडियम गूंज (इको)',
    icon: '🏟️',
    description: 'Grand concert hall spatial acoustics & repeating echo',
    color: 'from-emerald-400 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'megaphone',
    name: 'Megaphone / Radio',
    hindiName: 'मेगाफोन / वॉकी-टॉकी',
    icon: '📢',
    description: 'Crunchy band-limited loudspeaker distortion',
    color: 'from-yellow-400 to-orange-500',
    glowColor: 'rgba(234, 179, 8, 0.4)'
  },
  {
    id: 'alien',
    name: 'Alien Cosmic',
    hindiName: 'एलियन आवाज़',
    icon: '👽',
    description: 'Dual-frequency vibrato modulation from outer space',
    color: 'from-lime-400 to-emerald-600',
    glowColor: 'rgba(132, 204, 22, 0.4)'
  },
  {
    id: 'telephone',
    name: 'Vintage Phone',
    hindiName: 'विंटेज टेलीफ़ोन',
    icon: '☎️',
    description: 'Classic 80s telephone line bandwidth & saturation',
    color: 'from-stone-400 to-amber-700',
    glowColor: 'rgba(180, 83, 9, 0.4)'
  }
];

// Generates distortion curve for megaphone/radio saturation
function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export class RealtimeVoiceProcessor {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private activeNodes: (AudioNode | { stop?: () => void })[] = [];
  private currentFilterId = 'original';
  private isMonitoring = false;
  private analyserNode: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private rawStream: MediaStream | null = null;

  constructor() {
    // Lazy initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public setMonitoring(enable: boolean) {
    this.isMonitoring = enable;
    if (this.monitorGainNode) {
      this.monitorGainNode.gain.setValueAtTime(enable ? 1.0 : 0.0, this.ctx?.currentTime || 0);
    }
  }

  public getIsMonitoring(): boolean {
    return this.isMonitoring;
  }

  public getCurrentFilterId(): string {
    return this.currentFilterId;
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(2.0, vol)), this.ctx.currentTime);
    }
  }

  public setupStream(stream: MediaStream): MediaStream {
    this.initContext();
    if (!this.ctx) return stream;

    this.rawStream = stream;
    this.cleanupNodes();

    try {
      this.sourceNode = this.ctx.createMediaStreamSource(stream);
      this.destinationNode = this.ctx.createMediaStreamDestination();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.2, this.ctx.currentTime);

      this.monitorGainNode = this.ctx.createGain();
      this.monitorGainNode.gain.setValueAtTime(this.isMonitoring ? 1.0 : 0.0, this.ctx.currentTime);
      this.monitorGainNode.connect(this.ctx.destination);

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;

      this.applyFilter(this.currentFilterId);

      return this.destinationNode.stream;
    } catch (err) {
      console.warn("Audio processing pipeline initialization notice:", err);
      return stream;
    }
  }

  private cleanupNodes() {
    this.activeNodes.forEach(node => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        if ('disconnect' in node && typeof (node as AudioNode).disconnect === 'function') {
          (node as AudioNode).disconnect();
        }
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  public applyFilter(filterId: string) {
    this.currentFilterId = filterId;
    if (!this.ctx || !this.sourceNode || !this.destinationNode || !this.masterGain || !this.monitorGainNode || !this.analyserNode) {
      return;
    }

    this.cleanupNodes();
    const ctx = this.ctx;
    const src = this.sourceNode;
    const now = ctx.currentTime;

    try {
      if (filterId === 'robot') {
        // --- 1. CYBORG ROBOT (Ring Modulation) ---
        const carrier = ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(55, now); // 55Hz robotic carrier

        const carrierGain = ctx.createGain();
        carrierGain.gain.setValueAtTime(1.0, now);

        const ringGain = ctx.createGain();
        ringGain.gain.setValueAtTime(0.0, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(3.0, now);

        carrier.connect(ringGain.gain);
        src.connect(ringGain);
        ringGain.connect(filter);
        filter.connect(this.masterGain);

        carrier.start();
        this.activeNodes.push(carrier, carrierGain, ringGain, filter);

      } else if (filterId === 'chipmunk') {
        // --- 2. CHIPMUNK / HIGH PITCH (Resonant Formant Shift + Bright Modulation) ---
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(600, now);

        const resonantPeak1 = ctx.createBiquadFilter();
        resonantPeak1.type = 'peaking';
        resonantPeak1.frequency.setValueAtTime(2400, now);
        resonantPeak1.gain.setValueAtTime(16, now);
        resonantPeak1.Q.setValueAtTime(4.0, now);

        const resonantPeak2 = ctx.createBiquadFilter();
        resonantPeak2.type = 'peaking';
        resonantPeak2.frequency.setValueAtTime(3800, now);
        resonantPeak2.gain.setValueAtTime(12, now);
        resonantPeak2.Q.setValueAtTime(3.5, now);

        // Fast pitch vibrato
        const vibrato = ctx.createOscillator();
        vibrato.type = 'sine';
        vibrato.frequency.setValueAtTime(14, now);
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.setValueAtTime(250, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(resonantPeak1.frequency);
        vibrato.start();

        src.connect(highpass);
        highpass.connect(resonantPeak1);
        resonantPeak1.connect(resonantPeak2);
        resonantPeak2.connect(this.masterGain);

        this.activeNodes.push(highpass, resonantPeak1, resonantPeak2, vibrato, vibratoGain);

      } else if (filterId === 'deep') {
        // --- 3. DEEP TITAN / MONSTER (Sub-Bass Resonance + Lowpass) ---
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(900, now);
        lowpass.Q.setValueAtTime(2.0, now);

        const bassBoost = ctx.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.setValueAtTime(150, now);
        bassBoost.gain.setValueAtTime(18, now);

        // Sub-frequency modulator
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(38, now);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.35, now);
        subOsc.connect(subGain);

        const merger = ctx.createGain();
        merger.gain.setValueAtTime(1.1, now);

        src.connect(lowpass);
        lowpass.connect(bassBoost);
        bassBoost.connect(merger);
        subGain.connect(merger);
        merger.connect(this.masterGain);

        subOsc.start();
        this.activeNodes.push(lowpass, bassBoost, subOsc, subGain, merger);

      } else if (filterId === 'echo') {
        // --- 4. STADIUM ECHO / CONCERT REVERB ---
        const directGain = ctx.createGain();
        directGain.gain.setValueAtTime(0.9, now);

        const delay = ctx.createDelay(1.0);
        delay.delayTime.setValueAtTime(0.24, now); // 240ms echo

        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.48, now);

        const damping = ctx.createBiquadFilter();
        damping.type = 'lowpass';
        damping.frequency.setValueAtTime(3200, now);

        src.connect(directGain);
        directGain.connect(this.masterGain);

        src.connect(delay);
        delay.connect(damping);
        damping.connect(feedback);
        feedback.connect(delay);
        damping.connect(this.masterGain);

        this.activeNodes.push(directGain, delay, feedback, damping);

      } else if (filterId === 'megaphone') {
        // --- 5. MEGAPHONE / WALKIE-TALKIE (Band-limited Saturation) ---
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(750, now);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3000, now);

        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(60) as any;
        shaper.oversample = '2x';

        const boost = ctx.createGain();
        boost.gain.setValueAtTime(1.4, now);

        src.connect(hp);
        hp.connect(lp);
        lp.connect(shaper);
        shaper.connect(boost);
        boost.connect(this.masterGain);

        this.activeNodes.push(hp, lp, shaper, boost);

      } else if (filterId === 'alien') {
        // --- 6. ALIEN COSMIC (Dual LFO Pitch Modulation) ---
        const delay = ctx.createDelay(0.1);
        delay.delayTime.setValueAtTime(0.02, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(8.5, now);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.006, now);

        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.Q.setValueAtTime(4.0, now);

        src.connect(delay);
        delay.connect(filter);
        filter.connect(this.masterGain);

        lfo.start();
        this.activeNodes.push(delay, lfo, lfoGain, filter);

      } else if (filterId === 'telephone') {
        // --- 7. VINTAGE PHONE ---
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(350, now);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3400, now);

        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(25) as any;

        src.connect(hp);
        hp.connect(lp);
        lp.connect(shaper);
        shaper.connect(this.masterGain);

        this.activeNodes.push(hp, lp, shaper);

      } else {
        // --- 0. NATURAL STUDIO PRO (Ultra Heavy Chest Resonance + Crisp Articulation + Studio Leveling) ---
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(75, now); // remove sub-rumble

        // Heavy chest warmth & deep voice presence
        const chestWarmth = ctx.createBiquadFilter();
        chestWarmth.type = 'lowshelf';
        chestWarmth.frequency.setValueAtTime(180, now);
        chestWarmth.gain.setValueAtTime(4.5, now);

        // Vocal presence & speech intelligibility peak
        const presencePeak = ctx.createBiquadFilter();
        presencePeak.type = 'peaking';
        presencePeak.frequency.setValueAtTime(3200, now);
        presencePeak.Q.setValueAtTime(1.1, now);
        presencePeak.gain.setValueAtTime(4.8, now);

        // Airy studio sheen
        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.setValueAtTime(6800, now);
        highShelf.gain.setValueAtTime(3.2, now);

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-24, now);
        comp.knee.setValueAtTime(28, now);
        comp.ratio.setValueAtTime(4.0, now);
        comp.attack.setValueAtTime(0.002, now);
        comp.release.setValueAtTime(0.22, now);

        src.connect(hp);
        hp.connect(chestWarmth);
        chestWarmth.connect(presencePeak);
        presencePeak.connect(highShelf);
        highShelf.connect(comp);
        comp.connect(this.masterGain);

        this.activeNodes.push(hp, chestWarmth, presencePeak, highShelf, comp);
      }

      // Connect output of masterGain to destination (broadcast stream), monitor (headphones), and analyser (visualizer)
      this.masterGain.disconnect();
      this.masterGain.connect(this.destinationNode);
      this.masterGain.connect(this.monitorGainNode);
      this.masterGain.connect(this.analyserNode);

    } catch (err) {
      console.warn("Apply voice filter notice:", err);
      // Fallback: direct connection
      src.connect(this.masterGain);
      this.masterGain.connect(this.destinationNode);
      this.masterGain.connect(this.monitorGainNode);
      this.masterGain.connect(this.analyserNode);
    }
  }

  public destroy() {
    this.cleanupNodes();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.sourceNode = null;
    this.destinationNode = null;
    this.masterGain = null;
    this.monitorGainNode = null;
    this.analyserNode = null;
  }
}

// Global Singleton for easy in-app voice processing across components
export const globalVoiceProcessor = new RealtimeVoiceProcessor();
