// Web Audio API Hi-Fi Studio DSP Engine for Room Music Player & Sound FX

export interface CustomSong {
  id: string;
  title: string;
  artist?: string;
  url: string; // ObjectURL or remote URL
  duration?: number;
  fileName: string;
  fileSize?: string;
  isCustomFile: boolean;
}

export type AudioVibePreset = 'studio_spatial' | 'stadium_echo' | 'club_bass' | 'lofi_chill' | 'pure_crystal';

export interface VibePresetConfig {
  id: AudioVibePreset;
  name: string;
  hindiName: string;
  icon: string;
  desc: string;
  reverb: number;
  echo: number;
  bass: number;
  spatial: number;
}

export const AUDIO_VIBE_PRESETS: VibePresetConfig[] = [
  {
    id: 'studio_spatial',
    name: '3D Spatial Studio',
    hindiName: '3D स्पेशियल साउंड',
    icon: '🎧',
    desc: 'Wide stereo surround, rich depth & acoustic space',
    reverb: 0.35,
    echo: 0.15,
    bass: 0.45,
    spatial: 0.8
  },
  {
    id: 'stadium_echo',
    name: 'Stadium Echo & Reverb',
    hindiName: 'स्टेडियम गूंज और इको',
    icon: '🏟️',
    desc: 'Concert hall ambience with repeating echo vibe',
    reverb: 0.75,
    echo: 0.55,
    bass: 0.3,
    spatial: 0.6
  },
  {
    id: 'club_bass',
    name: 'Club Heavy Bass Drop',
    hindiName: 'क्लब डीप बास बूस्ट',
    icon: '🔊',
    desc: 'Deep sub-bass punch, dynamic limiter & high loudness',
    reverb: 0.2,
    echo: 0.05,
    bass: 0.85,
    spatial: 0.5
  },
  {
    id: 'lofi_chill',
    name: 'Lo-Fi Chill & Warmth',
    hindiName: 'लो-फाई वॉर्म वाइब',
    icon: '🌙',
    desc: 'Warm analog tape tone, smooth highs & relaxing feel',
    reverb: 0.45,
    echo: 0.25,
    bass: 0.5,
    spatial: 0.4
  },
  {
    id: 'pure_crystal',
    name: 'Pure Crystal Hi-Fi',
    hindiName: 'क्रिस्टल क्लियर मास्टर',
    icon: '✨',
    desc: 'Ultra transparent studio master with pristine clarity',
    reverb: 0.1,
    echo: 0.0,
    bass: 0.25,
    spatial: 0.3
  }
];

class RoomAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmInterval: any = null;
  private isBgmPlaying = false;
  private currentBgm = 'Lo-Fi Chill';

  // Custom Local File Music Player
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private currentPlayingSong: CustomSong | null = null;
  private isLocalSongPlaying = false;
  private songList: CustomSong[] = [];
  private volume: number = 0.85;
  private listeners: Set<() => void> = new Set();

  // DSP Audio Nodes for Hi-Fi, Reverb, Echo, Bass Boost & Spatializing
  private bassFilterNode: BiquadFilterNode | null = null;
  private trebleFilterNode: BiquadFilterNode | null = null;
  private midFilterNode: BiquadFilterNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private delayWetGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  // DSP Parameters
  private currentPreset: AudioVibePreset = 'studio_spatial';
  private reverbLevel: number = 0.35;
  private echoLevel: number = 0.15;
  private bassLevel: number = 0.45;
  private isAudioGraphReady = false;

  constructor() {
    // Curated high quality tracks
    this.songList = [
      {
        id: 'studio_track_1',
        title: 'Maxo Club Beats (Bass Pro)',
        artist: 'Maxo Sound Lab',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        fileName: 'maxo_club_beats.mp3',
        duration: 145,
        isCustomFile: false
      },
      {
        id: 'studio_track_2',
        title: 'Bollywood Midnight Vibes',
        artist: 'Royal Lounge HD',
        url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=spirit-blossom-15285.mp3',
        fileName: 'bollywood_midnight.mp3',
        duration: 178,
        isCustomFile: false
      },
      {
        id: 'studio_track_3',
        title: 'Electric Party Anthem',
        artist: 'Studio Surround FX',
        url: 'https://cdn.pixabay.com/download/audio/2021/08/08/audio_88447e769f.mp3?filename=electronic-future-beats-117997.mp3',
        fileName: 'electric_party.mp3',
        duration: 132,
        isCustomFile: false
      }
    ];

    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.volume = this.volume;
      this.audioElement.loop = false;

      this.audioElement.addEventListener('play', () => {
        this.isLocalSongPlaying = true;
        this.ensureAudioDSPChain();
        this.notify();
      });

      this.audioElement.addEventListener('pause', () => {
        this.isLocalSongPlaying = false;
        this.notify();
      });

      this.audioElement.addEventListener('ended', () => {
        this.playNextSong();
      });

      this.audioElement.addEventListener('timeupdate', () => {
        this.notify();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn("Audio element playback error, falling back to synthesizer:", e);
        this.isLocalSongPlaying = false;
        this.notify();
      });
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Generates a synthetic acoustic impulse response for reverb without needing huge IR files
  private createReverbImpulse(duration: number = 2.2, decay: number = 2.0): AudioBuffer {
    const ctx = this.initCtx();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decay);
      // Stereo diffusion
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  // Establishes the full DSP Audio Pipeline
  private ensureAudioDSPChain() {
    if (this.isAudioGraphReady || !this.audioElement) return;
    try {
      const ctx = this.initCtx();
      if (!this.mediaSourceNode) {
        this.mediaSourceNode = ctx.createMediaElementSource(this.audioElement);
      }

      // Master Studio Limiter for loud, clear, distortion-free output
      this.masterCompressor = ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-6, ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(10, ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(2.5, ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.005, ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.1, ctx.currentTime);

      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume * 1.0, ctx.currentTime);

      // Create WebRTC stream destination for broadcasting music to room
      this.streamDestination = ctx.createMediaStreamDestination();

      // Clean, pure connection without distorting filters
      this.mediaSourceNode.connect(this.masterCompressor);
      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);
      this.masterGain.connect(this.streamDestination);

      this.isAudioGraphReady = true;
    } catch (e) {
      console.warn("Audio DSP pipeline notice:", e);
    }
  }

  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  public getMixedMediaStreamTrack(): MediaStreamTrack | null {
    try {
      if (!this.ctx) {
        this.initCtx();
      }
      if (!this.streamDestination && this.ctx) {
        this.streamDestination = this.ctx.createMediaStreamDestination();
        if (this.masterGain) {
          this.masterGain.connect(this.streamDestination);
        }
      }
      if (this.streamDestination) {
        const tracks = this.streamDestination.stream.getAudioTracks();
        if (tracks.length > 0) return tracks[0];
      }
    } catch (e) {}
    return null;
  }

  // Updates DSP Parameters in real-time
  public applyVibePreset(presetId: AudioVibePreset) {
    const config = AUDIO_VIBE_PRESETS.find(p => p.id === presetId);
    if (!config) return;

    this.currentPreset = presetId;
    this.setReverbLevel(config.reverb);
    this.setEchoLevel(config.echo);
    this.setBassBoost(config.bass);
  }

  public setReverbLevel(level: number) {
    this.reverbLevel = Math.max(0, Math.min(1, level));
    if (this.reverbWetGain && this.ctx) {
      this.reverbWetGain.gain.setValueAtTime(this.reverbLevel * 0.75, this.ctx.currentTime);
    }
    this.notify();
  }

  public setEchoLevel(level: number) {
    this.echoLevel = Math.max(0, Math.min(1, level));
    if (this.delayWetGain && this.ctx) {
      this.delayWetGain.gain.setValueAtTime(this.echoLevel * 0.7, this.ctx.currentTime);
    }
    this.notify();
  }

  public setBassBoost(level: number) {
    this.bassLevel = Math.max(0, Math.min(1, level));
    if (this.bassFilterNode && this.ctx) {
      this.bassFilterNode.gain.setValueAtTime(this.bassLevel * 12, this.ctx.currentTime);
    }
    this.notify();
  }

  public getDSPState() {
    return {
      currentPreset: this.currentPreset,
      reverbLevel: this.reverbLevel,
      echoLevel: this.echoLevel,
      bassLevel: this.bassLevel
    };
  }

  // --- SONGS MANAGEMENT ---
  public getSongList(): CustomSong[] {
    return this.songList;
  }

  public addSongsFromFiles(files: FileList | File[]) {
    const newSongs: CustomSong[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        return;
      }
      const url = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      
      const song: CustomSong = {
        id: `user_song_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: cleanTitle,
        artist: 'Device Audio (HQ)',
        url: url,
        fileName: file.name,
        fileSize: sizeMB,
        isCustomFile: true
      };
      newSongs.push(song);
    });

    if (newSongs.length > 0) {
      this.songList = [...newSongs, ...this.songList];
      this.notify();
    }
    return newSongs;
  }

  public removeSong(id: string) {
    if (this.currentPlayingSong?.id === id) {
      this.stopLocalSong();
    }
    this.songList = this.songList.filter(s => s.id !== id);
    this.notify();
  }

  public playSong(song: CustomSong) {
    if (!this.audioElement) return;
    this.stopBGM();

    this.ensureAudioDSPChain();

    if (this.currentPlayingSong?.id === song.id && this.audioElement.src) {
      if (this.audioElement.paused) {
        this.audioElement.play().catch(e => console.warn(e));
      }
      return;
    }

    this.currentPlayingSong = song;
    this.audioElement.src = song.url;
    this.audioElement.currentTime = 0;
    this.audioElement.volume = this.volume;
    
    this.audioElement.play().then(() => {
      this.isLocalSongPlaying = true;
      this.notify();
    }).catch(err => {
      console.warn("Could not play audio track directly, launching synthesizer fallback:", err);
      this.toggleBGM(song.title, true);
    });
  }

  public pauseLocalSong() {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
    this.isLocalSongPlaying = false;
    this.notify();
  }

  public pauseMusic() {
    this.pauseLocalSong();
  }

  public resumeMusic() {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {});
      this.isLocalSongPlaying = true;
      this.notify();
    }
  }

  public togglePlayPause(song?: CustomSong) {
    if (song && (!this.currentPlayingSong || this.currentPlayingSong.id !== song.id)) {
      this.playSong(song);
      return;
    }

    if (!this.currentPlayingSong && this.songList.length > 0) {
      this.playSong(this.songList[0]);
      return;
    }

    if (this.audioElement) {
      if (this.audioElement.paused) {
        this.audioElement.play().catch(e => console.warn(e));
      } else {
        this.audioElement.pause();
      }
    }
  }

  public playNextSong() {
    if (this.songList.length === 0) return;
    const currentIndex = this.songList.findIndex(s => s.id === this.currentPlayingSong?.id);
    const nextIndex = (currentIndex + 1) % this.songList.length;
    this.playSong(this.songList[nextIndex]);
  }

  public playPrevSong() {
    if (this.songList.length === 0) return;
    const currentIndex = this.songList.findIndex(s => s.id === this.currentPlayingSong?.id);
    const prevIndex = (currentIndex - 1 + this.songList.length) % this.songList.length;
    this.playSong(this.songList[prevIndex]);
  }

  public seek(seconds: number) {
    if (this.audioElement && !isNaN(seconds)) {
      this.audioElement.currentTime = Math.max(0, Math.min(this.audioElement.duration || seconds, seconds));
      this.notify();
    }
  }

  public skipForward(seconds: number = 10) {
    if (this.audioElement) {
      this.seek(this.audioElement.currentTime + seconds);
    }
  }

  public skipBackward(seconds: number = 10) {
    if (this.audioElement) {
      this.seek(this.audioElement.currentTime - seconds);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume * 1.3, this.ctx.currentTime);
    }
    this.notify();
  }

  public getVolume() {
    return this.volume;
  }

  public getCurrentPlaybackInfo() {
    const duration = (this.audioElement?.duration && !isNaN(this.audioElement.duration) && this.audioElement.duration > 0)
      ? this.audioElement.duration 
      : this.currentPlayingSong?.duration || 0;

    const currentTime = this.audioElement?.currentTime || 0;
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
    const remainingTime = Math.max(0, duration - currentTime);

    return {
      isPlaying: this.isLocalSongPlaying || this.isBgmPlaying,
      currentSong: this.currentPlayingSong,
      currentTime,
      duration,
      progressPercent,
      remainingTime,
      currentBgm: this.currentBgm,
      isBgmPlaying: this.isBgmPlaying,
      currentPreset: this.currentPreset,
      reverbLevel: this.reverbLevel,
      echoLevel: this.echoLevel,
      bassLevel: this.bassLevel
    };
  }

  public stopLocalSong() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isLocalSongPlaying = false;
    this.currentPlayingSong = null;
    this.notify();
  }

  public stopAllMusic() {
    this.stopLocalSong();
    this.stopBGM();
    this.notify();
  }

  // --- SOUND EFFECTS (Applause, Cheer, Horn, Win, Bell, Laugh) ---
  public playSoundEffect(type: 'applause' | 'laugh' | 'horn' | 'cheer' | 'win' | 'gift' | 'bell') {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      if (type === 'applause' || type === 'cheer') {
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.6));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1.8;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (type === 'horn') {
        [440, 554.37, 659.25].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.setValueAtTime(freq * 1.05, now + 0.1);
          osc.frequency.setValueAtTime(freq, now + 0.2);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.8);
        });
      } else if (type === 'win' || type === 'gift' || type === 'bell') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);

          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.22, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.75);
        });
      } else if (type === 'laugh') {
        [0, 0.15, 0.3, 0.45, 0.6].forEach((st, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450 - i * 20, now + st);
          osc.frequency.linearRampToValueAtTime(320 - i * 20, now + st + 0.12);

          gain.gain.setValueAtTime(0.22, now + st);
          gain.gain.exponentialRampToValueAtTime(0.01, now + st + 0.13);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + st);
          osc.stop(now + st + 0.14);
        });
      }
    } catch (e) {
      console.warn("Sound effect error:", e);
    }
  }

  // --- AMBIENT SYNTHESIZER ---
  public toggleBGM(trackName: string, enable?: boolean): boolean {
    const shouldPlay = enable !== undefined ? enable : !this.isBgmPlaying;
    if (!shouldPlay) {
      this.stopBGM();
      return false;
    }

    this.stopBGM();
    this.currentBgm = trackName;
    this.isBgmPlaying = true;

    const ctx = this.initCtx();
    let chordIndex = 0;

    const chordsLoFi = [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 329.63],
      [196.00, 246.94, 293.66, 392.00],
    ];

    const playChord = () => {
      if (!this.isBgmPlaying || !this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      const chord = chordsLoFi[chordIndex % chordsLoFi.length];
      chordIndex++;

      chord.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.9);
      });
    };

    playChord();
    this.bgmInterval = setInterval(playChord, 3000);
    this.notify();
    return true;
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.notify();
  }

  public isBGMActive() {
    return this.isBgmPlaying || this.isLocalSongPlaying;
  }

  public getCurrentTrack() {
    return this.currentPlayingSong?.title || this.currentBgm;
  }
}

export const roomAudioEngine = new RoomAudioEngine();
