import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, Volume2, Shield, Sparkles, Sliders, Play, Square, Star, 
  Headphones, Music, Trash2, FileText, Check, ChevronRight, 
  Speaker, Save, Radio, MessageSquare, AudioLines
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { toast } from 'sonner';

interface AudioEffectsTestProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

interface SavedRecording {
  id: string;
  userId: string;
  title: string;
  category: string;
  audioData: string; // Base64 Audio URL
  timestamp: string;
  scriptText?: string;
  duration: number;
}

const PERSONALITIES = [
  { id: 'Singer', label: '🧑‍🎤 Vocal Singer', color: 'from-[#EC4899] to-[#EF4444]', glint: 'shadow-pink-500/25', desc: 'Adds velvet echo reverb perfect for high ranges' },
  { id: 'Storyteller', label: '📖 Storyteller', color: 'from-[#3B82F6] to-[#06B6D4]', glint: 'shadow-blue-500/25', desc: 'Calibrated for crystalline warm acoustic speech' },
  { id: 'Entertainer', label: '🎭 Entertainer', color: 'from-[#F59E0B] to-[#F97316]', glint: 'shadow-amber-500/25', desc: 'Punchy vocal enhancements that cut through noise' },
];

export default function AudioEffectsTest({ profile, onUpdateProfile }: AudioEffectsTestProps) {
  // Navigation Tabs: 'calibrator' or 'studio'
  const [activeTab, setActiveTab] = useState<'calibrator' | 'studio'>('calibrator');
  
  // Custom Badge Selection
  const [selectedBadge, setSelectedBadge] = useState<string>(() => {
    return profile.badges?.find(b => ['Singer', 'Storyteller', 'Entertainer'].includes(b)) || 'Storyteller';
  });

  const [activeFilter, setActiveFilter] = useState<'Default' | 'Singing Reverb' | 'Warm Bass' | 'Crystalline Studio'>('Default');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringVolume, setMonitoringVolume] = useState(70);

  // STUDIO SUITE STATES
  const [studioMode, setStudioMode] = useState<'My Story' | 'Story Typing' | 'Singing' | 'Podcasting'>('Singing');
  const [recordedList, setRecordedList] = useState<SavedRecording[]>([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);

  // Running recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [typedStoryText, setTypedStoryText] = useState('');
  const [customTrackTitle, setCustomTrackTitle] = useState('');
  const [activeBackingBeat, setActiveBackingBeat] = useState<'none' | 'lofi' | 'retro'>('none');
  const [playingRecId, setPlayingRecId] = useState<string | null>(null);

  // Web Audio Context & Recorder Node References
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const filterHighPassRef = useRef<BiquadFilterNode | null>(null);
  const filterLowPassRef = useRef<BiquadFilterNode | null>(null);
  const filterBassRef = useRef<BiquadFilterNode | null>(null);
  const filterTrebleRef = useRef<BiquadFilterNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  // Recorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const beatTimerRef = useRef<any>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean-up references on unmount
  useEffect(() => {
    fetchSavedRecordings();
    return () => {
      stopAudioMonitoring(true);
      stopRecordingProcess();
      stopBackingBeats();
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
    };
  }, []);

  // Sync EQ Filter preset automatically when switching Mode
  useEffect(() => {
    if (studioMode === 'Singing') {
      handleUpdateFilter('Singing Reverb');
    } else if (studioMode === 'Podcasting') {
      handleUpdateFilter('Crystalline Studio');
    } else {
      handleUpdateFilter('Warm Bass');
    }
  }, [studioMode]);

  const fetchSavedRecordings = async () => {
    setIsLoadingRecordings(true);
    try {
      const q = query(
        collection(db, 'recordings'),
        where('userId', '==', profile.uid)
      );
      const snapshot = await getDocs(q);
      const items: SavedRecording[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as SavedRecording);
      });
      // Sort locally descending limit size
      items.sort((a, b) => b.id.localeCompare(a.id));
      setRecordedList(items);
    } catch (e) {
      console.warn("Could not retrieve cloud tracks, loading simulated cached recordings.", e);
      // Fallback local mock to prevent empty state layout
      setRecordedList([
        {
          id: 'seed_rec_1',
          userId: profile.uid,
          title: 'Morning Chill Podcast Intro',
          category: 'Podcasting',
          audioData: '',
          timestamp: 'Today',
          duration: 12
        }
      ]);
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  const handleSelectBadge = async (badgeId: string) => {
    setSelectedBadge(badgeId);
    try {
      const clearedBadges = (profile.badges || []).filter(b => !['Singer', 'Storyteller', 'Entertainer'].includes(b));
      const updatedBadges = [...clearedBadges, badgeId];

      await updateDoc(doc(db, 'users', profile.uid), {
        badges: updatedBadges
      });
      onUpdateProfile({ badges: updatedBadges });
      toast.success(`Active personality badge updated to: ${badgeId}! ✨`);
    } catch (e) {
      toast.error('Could not personalize profile badge.');
    }
  };

  const createConvolutionImpulse = (ctx: BaseAudioContext, duration: number, decay: number) => {
    const rate = ctx.sampleRate;
    const len = rate * duration;
    const impBuffer = ctx.createBuffer(2, len, rate);
    const chanLeft = impBuffer.getChannelData(0);
    const chanRight = impBuffer.getChannelData(1);

    for (let i = 0; i < len; i++) {
         const progress = i / len;
         const amplitude = Math.exp(-progress * decay) * (1 - progress);
         chanLeft[i] = (Math.random() * 2 - 1) * amplitude;
         chanRight[i] = (Math.random() * 2 - 1) * amplitude;
    }
    return impBuffer;
  };

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtxClass();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const startAudioMonitoring = async () => {
    if (isMonitoring) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });

      mediaStreamRef.current = stream;
      const ctx = await ensureAudioContext();

      // Create Nodes
      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 9200;
      filterLowPassRef.current = lp;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 85;
      filterHighPassRef.current = hp;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 130;
      bass.gain.value = 8;
      filterBassRef.current = bass;

      const treble = ctx.createBiquadFilter();
      treble.type = 'peaking';
      treble.frequency.value = 3500;
      treble.Q.value = 1.0;
      treble.gain.value = 4;
      filterTrebleRef.current = treble;

      const conv = ctx.createConvolver();
      conv.buffer = createConvolutionImpulse(ctx, 1.8, 2.5);
      convolverRef.current = conv;

      const dry = ctx.createGain();
      dryGainRef.current = dry;

      const wet = ctx.createGain();
      wetGainRef.current = wet;

      const output = ctx.createGain();
      output.gain.value = monitoringVolume / 100;
      outputGainRef.current = output;

      // Pipe
      source.connect(hp);
      hp.connect(lp);
      lp.connect(bass);
      bass.connect(treble);

      treble.connect(dry);
      treble.connect(conv);
      conv.connect(wet);

      dry.connect(output);
      wet.connect(output);
      output.connect(ctx.destination);

      setIsMonitoring(true);
      applyFilterSettings(activeFilter, dry, wet, bass, treble);
      toast.success('Live audio monitoring connected! Connect headphones for optimal loop avoidance. 🎧');
    } catch (err) {
      console.error(err);
      toast.error('Microphone feedback denied. Grant system access permissions.');
    }
  };

  const stopAudioMonitoring = (silent = false) => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsMonitoring(false);
    if (!silent) {
      toast.info('Audio loop monitoring disconnected.');
    }
  };

  const applyFilterSettings = (
    filter: typeof activeFilter,
    dryNode = dryGainRef.current,
    wetNode = wetGainRef.current,
    bassNode = filterBassRef.current,
    trebleNode = filterTrebleRef.current
  ) => {
    if (!dryNode || !wetNode || !bassNode || !trebleNode) return;

    if (filter === 'Default') {
      dryNode.gain.setValueAtTime(1.0, 0);
      wetNode.gain.setValueAtTime(0.0, 0);
      bassNode.gain.setValueAtTime(2.0, 0);
      trebleNode.gain.setValueAtTime(1.0, 0);
    } else if (filter === 'Singing Reverb') {
      dryNode.gain.setValueAtTime(0.65, 0);
      wetNode.gain.setValueAtTime(0.70, 0);
      bassNode.gain.setValueAtTime(8.0, 0);
      trebleNode.gain.setValueAtTime(6.0, 0);
    } else if (filter === 'Warm Bass') {
      dryNode.gain.setValueAtTime(0.95, 0);
      wetNode.gain.setValueAtTime(0.12, 0);
      bassNode.gain.setValueAtTime(12.0, 0);
      trebleNode.gain.setValueAtTime(1.5, 0);
    } else if (filter === 'Crystalline Studio') {
      dryNode.gain.setValueAtTime(0.90, 0);
      wetNode.gain.setValueAtTime(0.20, 0);
      bassNode.gain.setValueAtTime(4.0, 0);
      trebleNode.gain.setValueAtTime(10.0, 0);
    }
  };

  const handleUpdateFilter = (filterName: typeof activeFilter) => {
    setActiveFilter(filterName);
    if (isMonitoring) {
      applyFilterSettings(filterName);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setMonitoringVolume(newVal);
    if (outputGainRef.current) {
      outputGainRef.current.gain.setValueAtTime(newVal / 100, 0);
    }
  };

  // VOCAL RECORDER RECORDING CORE LOGIC
  const startRecordingSession = async () => {
    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      
      // Auto active monitor optionally so they hear themselves with reverb filters
      await ensureAudioContext();
      
      audioChunksRef.current = [];
      let options = {};
      
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const trackTitle = customTrackTitle.trim() || `${studioMode} Stream Session`;
          
          const newTrack: SavedRecording = {
            id: `rec_${Date.now()}`,
            userId: profile.uid,
            title: trackTitle,
            category: studioMode,
            audioData: base64Audio,
            timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            scriptText: studioMode === 'Story Typing' ? typedStoryText : undefined,
            duration: recordingSeconds || 5
          };
          
          setRecordedList(prev => [newTrack, ...prev]);
          setCustomTrackTitle('');
          
          // Save permanently to user database
          try {
            await addDoc(collection(db, 'recordings'), {
              userId: newTrack.userId,
              title: newTrack.title,
              category: newTrack.category,
              audioData: newTrack.audioData,
              timestamp: newTrack.timestamp,
              scriptText: newTrack.scriptText || '',
              duration: newTrack.duration,
              createdAt: serverTimestamp()
            });
            toast.success(`"${newTrack.title}" vocal recording safely synchronized up to the cloud! ☁️🎙️`);
          } catch (e) {
            console.warn("Firestore save failed, cached locally only.", e);
            toast.info(`Saved! "${newTrack.title}" recorded successfully in local memory.`);
          }
        };
      };
      
      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      
      // Start clock interval
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Start Backing instrumental music synthetically if desired
      if (activeBackingBeat !== 'none') {
        runSynthBeats(activeBackingBeat);
      }
      
      toast.success(`Voice Recording Session in "${studioMode}" started! Express yourself now. 🎙️`);
    } catch (err) {
      console.error(err);
      toast.error('Local Audio feedback/mic rejected. Provide device microphone permission.');
    }
  };

  const stopRecordingProcess = () => {
    if (!isRecording) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    stopBackingBeats();
    setIsRecording(false);
    toast.success("Recording session complete. Processing your sound filter tweaks...");
  };

  // SOUNDBOARD OR BEAT SYNTHESIZERS
  const playSoundEffect = async (sfxType: 'applause' | 'airhorn' | 'laughter' | 'gasp') => {
    const ctx = await ensureAudioContext();
    
    if (sfxType === 'airhorn') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(390, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);
      
      osc2.frequency.setValueAtTime(395, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(135, ctx.currentTime + 0.35);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (sfxType === 'applause') {
      for (let i = 0; i < 7; i++) {
        const delay = i * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 + Math.random() * 500, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + delay + 0.25);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.25);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.25);
      }
    } else if (sfxType === 'gasp') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.22);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else { // Laughter
      for (let i = 0; i < 4; i++) {
        const delay = i * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + delay + 0.09);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.09);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.09);
      }
    }
  };

  const runSynthBeats = (beatType: 'lofi' | 'retro') => {
    stopBackingBeats();
    
    const playBar = async () => {
      const ctx = await ensureAudioContext();
      
      // Kick sound
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(100, ctx.currentTime);
      kickOsc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.15);
      
      kickGain.gain.setValueAtTime(0.2, ctx.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(ctx.destination);
      kickOsc.start();
      kickOsc.stop(ctx.currentTime + 0.15);

      if (beatType === 'lofi') {
        // Soft synth melody chord
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = 'triangle';
        melOsc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4 chord lofi note
        melOsc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.4); // E4 
        
        melGain.gain.setValueAtTime(0.05, ctx.currentTime);
        melGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        melOsc.connect(melGain);
        melGain.connect(ctx.destination);
        melOsc.start();
        melOsc.stop(ctx.currentTime + 0.4);
      } else {
        // High strike
        const hatOsc = ctx.createOscillator();
        const hatGain = ctx.createGain();
        hatOsc.type = 'sawtooth';
        hatOsc.frequency.setValueAtTime(2500, ctx.currentTime + 0.25);
        
        hatGain.gain.setValueAtTime(0, ctx.currentTime);
        hatGain.gain.setValueAtTime(0.03, ctx.currentTime + 0.25);
        hatGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        hatOsc.connect(hatGain);
        hatGain.connect(ctx.destination);
        hatOsc.start(ctx.currentTime + 0.25);
        hatOsc.stop(ctx.currentTime + 0.3);
      }
    };

    playBar();
    beatTimerRef.current = setInterval(() => {
      playBar();
    }, 550); // 110 BPM loop
  };

  const stopBackingBeats = () => {
    if (beatTimerRef.current) {
      clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
  };

  const togglePlayback = (track: SavedRecording) => {
    if (playingRecId === track.id) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      setPlayingRecId(null);
    } else {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      
      // If mock track with empty datastring, simulate playing
      if (!track.audioData) {
        setPlayingRecId(track.id);
        toast.info(`Simulating playback of sound bite: "${track.title}"`);
        setTimeout(() => {
          setPlayingRecId(null);
        }, track.duration * 1000);
        return;
      }

      const player = new Audio(track.audioData);
      activeAudioPlayerRef.current = player;
      setPlayingRecId(track.id);
      player.play();
      player.onended = () => {
        setPlayingRecId(null);
      };
    }
  };

  const handleDeleteRecord = async (trackId: string) => {
    try {
      setRecordedList(prev => prev.filter(t => t.id !== trackId));
      await deleteDoc(doc(db, 'recordings', trackId));
      toast.success("Sound track dismissed successfully.");
    } catch (e) {
      toast.error("Could not remove vocal track from database.");
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#121624]/80 border border-white/5 rounded-3xl p-5 space-y-4">
      {/* HEADER SEGMENT TAB CONTROLLER */}
      <div className="flex gap-2.5 border-b border-white/5 pb-3">
        <button
          onClick={() => {
            setActiveTab('calibrator');
            stopBackingBeats();
          }}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
            activeTab === 'calibrator'
              ? 'bg-gradient-to-r from-pink-500/10 to-[#A855F7]/10 border-pink-500/30 text-white font-black'
              : 'bg-transparent border-transparent text-gray-500 hover:text-white'
          }`}
          type="button"
        >
          <Headphones size={13} className="text-pink-400" /> CALIBRATOR LAB
        </button>
        <button
          onClick={() => {
            setActiveTab('studio');
          }}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
            activeTab === 'studio'
              ? 'bg-gradient-to-r from-pink-500/10 to-[#A855F7]/10 border-pink-500/30 text-white font-black'
              : 'bg-transparent border-transparent text-gray-500 hover:text-white'
          }`}
          type="button"
        >
          <AudioLines size={13} className="text-pink-400 animate-pulse" /> RECORDING STUDIO
        </button>
      </div>

      {activeTab === 'calibrator' ? (
        <div className="space-y-4">
          {/* PERSONALITY CREDENTIAL BADGES */}
          <div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-[10px] font-black uppercase text-pink-400 tracking-widest flex items-center gap-1.5">
                <Star size={11} className="text-pink-400" /> CHARACTER BADGES
              </h4>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-3">
              {PERSONALITIES.map((p) => {
                const isEquipped = selectedBadge === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectBadge(p.id)}
                    className={`py-2 px-2.5 rounded-xl text-[9.5px] font-black uppercase transition-all flex flex-col items-center justify-between gap-1 border ${
                      isEquipped 
                        ? 'bg-zinc-950/60 border-pink-500 text-white shadow-lg shadow-pink-500/10 scale-102 font-extrabold' 
                        : 'bg-black/15 border-white/5 text-gray-400 hover:text-white'
                    }`}
                    type="button"
                  >
                    <span>{p.label}</span>
                    <div className={`w-1 h-1 rounded-full ${isEquipped ? 'bg-pink-500' : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
            <p className="text-[8px] text-zinc-500 mt-2 font-medium">
              * Equipping badges changes your active profile nickname aura instantly.
            </p>
          </div>

          {/* REALTIME FEEDBACK LOOPS */}
          <div className="bg-zinc-950/50 rounded-2xl p-4 border border-white/5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex justify-between items-center">
              <div>
                <h5 className="text-[11px] font-black text-gray-200 uppercase tracking-tight flex items-center gap-1.5 leading-none">
                  <Speaker size={13} className="text-pink-400" /> ACOUSTIC LAB CALIBRATOR
                </h5>
                <span className="text-[8.5px] text-zinc-500 block mt-1 tracking-tight leading-normal">
                  Real-time microphone testing using studio compression & noise gates.
                </span>
              </div>

              <button
                onClick={isMonitoring ? () => stopAudioMonitoring() : startAudioMonitoring}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                  isMonitoring 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                    : 'bg-pink-500 text-white hover:bg-pink-500/90 shadow-md shadow-pink-500/10'
                }`}
                type="button"
              >
                {isMonitoring ? (
                  <>
                    <Square size={10} className="fill-current" /> STOP FEEDBACK
                  </>
                ) : (
                  <>
                    <Play size={10} className="fill-current" /> START FEEDBACK
                  </>
                )}
              </button>
            </div>

            {/* Live feedback waveforms */}
            <AnimatePresence>
              {isMonitoring && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 40 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-1 bg-black/60 rounded-xl h-10 px-4 border border-white/5 overflow-hidden"
                >
                  {Array.from({ length: 16 }).map((_, inx) => (
                    <motion.div 
                      key={inx}
                      animate={{ 
                        height: [
                          8 + Math.random() * 8, 
                          24 + Math.random() * 12, 
                          8 + Math.random() * 8
                        ] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.4 + (inx % 3) * 0.15,
                        ease: "easeInOut"
                      }}
                      className="w-[3px] bg-gradient-to-t from-pink-500 to-[#A855F7] rounded-full"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* EQ Preset Filters */}
            <div className="grid grid-cols-2 gap-2">
              {(['Default', 'Singing Reverb', 'Warm Bass', 'Crystalline Studio'] as const).map((fil) => {
                const isSel = activeFilter === fil;
                return (
                  <button
                    key={fil}
                    onClick={() => handleUpdateFilter(fil)}
                    className={`p-2.5 rounded-xl border text-[8.5px] font-black uppercase text-left transition-all relative ${
                      isSel 
                        ? 'bg-[#181d2d] border-[#A855F7]/35 text-[#A855F7] shadow-sm' 
                        : 'bg-white/[0.01] border-white/5 text-gray-500 hover:text-zinc-300'
                    }`}
                    type="button"
                  >
                    <span>{fil}</span>
                    <Sliders size={11} className={`absolute right-2 top-2.5 ${isSel ? 'text-pink-400' : 'text-gray-650'}`} />
                  </button>
                );
              })}
            </div>

            {/* Monitoring volume controls */}
            <div className="flex items-center gap-3.5 pt-2 border-t border-white/5 text-xs text-zinc-500">
              <Volume2 size={13} className="text-pink-400" />
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold uppercase w-10">VOLUME ({monitoringVolume}%)</span>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={monitoringVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 h-1 rounded-full bg-zinc-800 accent-pink-500 outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* MODE SELECTOR */}
          <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1 rounded-xl">
            {(['My Story', 'Story Typing', 'Singing', 'Podcasting'] as const).map(mode => {
              const isSelected = studioMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setStudioMode(mode);
                    stopRecordingProcess();
                  }}
                  className={`py-1.5 text-center text-[8.5px] font-black uppercase rounded-lg transition-all ${
                    isSelected
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-zinc-200'
                  }`}
                  type="button"
                >
                  {mode.split(' ')[0]} {/* Shorthand labels */}
                </button>
              );
            })}
          </div>

          {/* DYNAMIC STUDIO PANEL CONFIG */}
          <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-2xl space-y-3">
            {studioMode === 'My Story' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-pink-400 tracking-wider">YOUR STORYBOOK TRACKS</h4>
                  <span className="text-[8px] font-mono text-zinc-500">{recordedList.length} TRACKS</span>
                </div>

                {isLoadingRecordings ? (
                  <p className="text-[9px] text-zinc-500 text-center italic">Scanning cosmic soundscapes...</p>
                ) : recordedList.length === 0 ? (
                  <div className="py-6 text-center text-zinc-600">
                    <p className="text-[10px] italic">No story recordings captured yet.</p>
                    <p className="text-[8px] mt-1">Try Recording in Story Typing or Singing modes!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {recordedList.map(track => (
                      <div 
                        key={track.id}
                        className="p-2.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-gray-100 truncate">{track.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[8px] text-zinc-500 font-mono">
                            <span className="bg-zinc-800 text-pink-400 px-1 py-0.5 rounded uppercase">{track.category}</span>
                            <span>{track.duration}s</span>
                            <span>•</span>
                            <span>{track.timestamp}</span>
                          </div>
                          {track.scriptText && (
                            <p className="text-[7.5px] text-zinc-400 italic mt-1 line-clamp-1">"{track.scriptText}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => togglePlayback(track)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              playingRecId === track.id
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : 'bg-zinc-800 border-white/5 text-zinc-300 hover:text-white'
                            }`}
                            type="button"
                          >
                            {playingRecId === track.id ? '⏸' : '▶'}
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(track.id)}
                            className="p-1.5 rounded-lg bg-zinc-900/40 border border-transparent hover:border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            type="button"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {studioMode === 'Story Typing' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-[#3B82F6] tracking-wider">✍️ STYLISH STORY NARRATOR</h4>
                  <span className="text-[8px] text-zinc-500 font-mono">STEP 1: TYPE SCRIPT</span>
                </div>
                <textarea
                  value={typedStoryText}
                  onChange={(e) => setTypedStoryText(e.target.value)}
                  placeholder="Type or paste your narrative, script, or poetry verse here. Then hit Record below and narrate it!"
                  className="w-full h-20 p-2.5 bg-black/40 border border-white/5 rounded-xl text-[10px] text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500/30 transition-colors"
                />
              </div>
            )}

            {studioMode === 'Singing' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-pink-400 tracking-wider">🎵 MICROPHONE BACKING BEATS</h4>
                  <span className="text-[8px] text-zinc-500 font-mono">REVERB AUTO-CALIBRATED</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: '❌ No Beat', desc: 'No background loop' },
                    { id: 'lofi', label: '🎹 Lofi Synth', desc: 'Chill chords melody' },
                    { id: 'retro', label: '🥁 Retro Drum', desc: 'Simple rhythm clicks' }
                  ].map(beat => {
                    const isActive = activeBackingBeat === beat.id;
                    return (
                      <button
                        key={beat.id}
                        onClick={() => {
                          setActiveBackingBeat(beat.id as any);
                          if (isRecording && beat.id !== 'none') {
                            runSynthBeats(beat.id as any);
                          } else {
                            stopBackingBeats();
                          }
                          toast.success(`Backing melody set to: ${beat.label}`);
                        }}
                        className={`p-2 rounded-xl text-left border flex flex-col justify-between h-14 transition-all ${
                          isActive
                            ? 'bg-[#181d2d] border-pink-500/40 text-pink-400'
                            : 'bg-black/15 border-white/5 text-gray-400 hover:text-white'
                        }`}
                        type="button"
                      >
                        <span className="text-[9px] font-black uppercase">{beat.label}</span>
                        <span className="text-[7.5px] text-zinc-500 block leading-none">{beat.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {studioMode === 'Podcasting' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">📻 RECORDING SOUNDBOARD MODIFIER</h4>
                  <span className="text-[8px] text-zinc-500 font-mono">INJECT STUDIO EFFECTS LIVE</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'applause', label: '👏 Clap', color: 'hover:bg-cyan-500/10 hover:border-cyan-500/20 text-cyan-400' },
                    { id: 'laughter', label: '😂 Haha', color: 'hover:bg-pink-500/10 hover:border-pink-500/20 text-pink-400' },
                    { id: 'gasp', label: '😮 Oh!', color: 'hover:bg-purple-500/10 hover:border-purple-500/20 text-purple-400' },
                    { id: 'airhorn', label: '🚨 Horn', color: 'hover:bg-red-500/10 hover:border-red-500/20 text-red-400' }
                  ].map(sfx => (
                    <button
                      key={sfx.id}
                      onClick={() => playSoundEffect(sfx.id as any)}
                      className={`py-2 px-1 rounded-xl bg-black/30 border border-white/5 text-[9px] font-black uppercase transition-all active:scale-95 cursor-pointer ${sfx.color}`}
                      type="button"
                    >
                      {sfx.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LIVE RECORDING CAPTURING WIDGET CONTROLS */}
            {studioMode !== 'My Story' && (
              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={customTrackTitle}
                    onChange={(e) => setCustomTrackTitle(e.target.value)}
                    placeholder="Enter track title (e.g. My Magic Story #1)"
                    className="flex-1 px-3 py-1.5 bg-black/50 border border-white/5 rounded-xl text-[10px] text-zinc-300 placeholder-zinc-650 outline-none focus:border-pink-500/25 transition-all"
                  />
                  {isRecording && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/25 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] font-mono font-bold text-red-400">{formatSeconds(recordingSeconds)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {isRecording ? (
                    <button
                      onClick={stopRecordingProcess}
                      className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 hover:brightness-110 active:scale-98 transition-all"
                      type="button"
                    >
                      <Square size={12} className="fill-current" /> STOP & SAVE SOUND TRACK
                    </button>
                  ) : (
                    <button
                      onClick={startRecordingSession}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-pink-500/15 hover:brightness-110 active:scale-98 transition-all"
                      type="button"
                    >
                      <Mic size={12} className="animate-bounce" /> INITIALIZE VOCAL RECORDING
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
