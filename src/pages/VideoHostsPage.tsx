import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, Coins, ShieldCheck, 
  Volume2, VolumeX, Eye, EyeOff, Search, Star, MapPin,
  Zap, Sparkles, PhoneCall, PhoneOff, X, ChevronLeft, ChevronRight, Heart,
  MessageCircle, RotateCw, Copy, Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { INITIAL_VIDEO_HOSTS, VideoHost, isHostNew15Days } from '@/data/videoHosts';
import { soundEffects } from '@/utils/audioEffects';
import { globalAudioManager } from '@/services/globalAudioManager';
import { videoCallService } from '@/services/videoCallService';
import { toast } from 'sonner';

export default function VideoHostsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { language } = useLanguage();

  const [hosts, setHosts] = useState<VideoHost[]>(() => {
    const saved = localStorage.getItem('custom_video_hosts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((h: VideoHost) => ({
            ...h,
            ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500)
          }));
        }
      } catch (e) {}
    }
    return INITIAL_VIDEO_HOSTS.map(h => ({
      ...h,
      ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500)
    }));
  });

  // Real-time synchronization for all registered and created hosts
  useEffect(() => {
    const syncHosts = () => {
      const saved = localStorage.getItem('custom_video_hosts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHosts(parsed.map((h: VideoHost) => ({
              ...h,
              ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500)
            })));
          }
        } catch (e) {}
      }
    };

    window.addEventListener('storage', syncHosts);
    window.addEventListener('custom_video_hosts_updated', syncHosts);
    return () => {
      window.removeEventListener('storage', syncHosts);
      window.removeEventListener('custom_video_hosts_updated', syncHosts);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'all' | 'online'>('all');
  const [playingVoiceHostId, setPlayingVoiceHostId] = useState<string | null>(null);
  const [blurredHostIds, setBlurredHostIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Match Call State
  const [isMatching, setIsMatching] = useState(false);
  const [matchedHostPreview, setMatchedHostPreview] = useState<VideoHost | null>(null);
  const matchTimerRef = useRef<any>(null);
  const radarPingIntervalRef = useRef<any>(null);
  
  // Host Full Profile View Modal State
  const [selectedHostForProfile, setSelectedHostForProfile] = useState<VideoHost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Fast Incoming Ringtone Preview State
  const [isPreviewingRingtone, setIsPreviewingRingtone] = useState(false);

  const togglePreviewRingtone = () => {
    if (isPreviewingRingtone) {
      globalAudioManager.stopIncomingRingtone();
      setIsPreviewingRingtone(false);
      toast.info('Ringtone stopped');
    } else {
      globalAudioManager.startIncomingRingtone({
        volume: 1.0,
        onPlay: () => {
          setIsPreviewingRingtone(true);
          toast.success('🎵 Fast & Upbeat Ringtone Playing!');
        },
        onBlocked: () => {
          toast.warning('Tap anywhere to allow audio');
        }
      });
      setIsPreviewingRingtone(true);
    }
  };

  const handleTriggerTestIncomingCall = () => {
    soundEffects.unlockAudio();
    globalAudioManager.unlockAudio();
    globalAudioManager.startIncomingRingtone({ volume: 1.0 });
    window.dispatchEvent(new CustomEvent('trigger-incoming-call'));
    toast.success('📞 Incoming call received! Ringtone is playing.');
  };

  const coins = profile?.coins ?? 5000;

  // Cleanup match timers & ringtone preview on unmount
  useEffect(() => {
    return () => {
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
      if (radarPingIntervalRef.current) clearInterval(radarPingIntervalRef.current);
      globalAudioManager.stopIncomingRingtone();
    };
  }, []);

  // Open Host Profile Modal with browser history push so back button returns here
  const handleOpenHostProfile = (host: VideoHost) => {
    window.history.pushState({ hostProfile: host.id }, '');
    setSelectedHostForProfile(host);
    setActivePhotoIndex(0);
  };

  // Close Host Profile Modal cleanly
  const handleCloseHostProfile = () => {
    soundEffects.stopVoiceNote();
    setPlayingVoiceHostId(null);
    setSelectedHostForProfile(null);
    if (window.history.state?.hostProfile) {
      window.history.back();
    }
  };

  // Listen to browser/phone hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedHostForProfile) {
        soundEffects.stopVoiceNote();
        setPlayingVoiceHostId(null);
        setSelectedHostForProfile(null);
      }
      if (isMatching) {
        handleCancelMatch();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedHostForProfile, isMatching]);

  // Cancel Match Call cleanly
  const handleCancelMatch = () => {
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    if (radarPingIntervalRef.current) clearInterval(radarPingIntervalRef.current);
    setIsMatching(false);
    setMatchedHostPreview(null);
    toast.info('Match call cancelled');
  };

  // Filter hosts: simple search and all/online filter
  const filteredHosts = hosts.filter(host => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = host.name.toLowerCase().includes(q);
      const matchCity = host.city.toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }

    if (activeTab === 'online') return host.status === 'online';
    return true;
  });

  // Handle Play Voice Preview
  const handleToggleVoice = (e: React.MouseEvent, host: VideoHost) => {
    e.stopPropagation();
    if (playingVoiceHostId === host.id) {
      soundEffects.stopVoiceNote();
      setPlayingVoiceHostId(null);
    } else {
      soundEffects.stopVoiceNote();
      setPlayingVoiceHostId(host.id);
      toast.info(`Playing ${host.name}'s voice note... 🎙️`, { duration: 2500 });
      soundEffects.speakVoiceNote(host.voiceNoteText, () => {
        setPlayingVoiceHostId(null);
      });
    }
  };

  // Toggle Privacy Blur
  const toggleBlur = (e: React.MouseEvent, hostId: string) => {
    e.stopPropagation();
    setBlurredHostIds(prev => 
      prev.includes(hostId) ? prev.filter(id => id !== hostId) : [...prev, hostId]
    );
  };

  // Initiate 1-on-1 Video Call with Instant Connection (Fast & Active)
  const handleCallHost = (host: VideoHost) => {
    if (host.status === 'busy') {
      toast.warning(`${host.name} is currently on another call. Please try in a minute! ⏳`);
      return;
    }

    const hostRate = Math.max(host.ratePerMinute || 1500, 1500);
    if (coins < hostRate) {
      toast.error(language === 'hi' 
        ? `अपर्याप्त बैलेंस! 1-on-1 वीडियो कॉल के लिए कम से कम ${hostRate.toLocaleString()} कॉइन्स आवश्यक हैं। कृपया रिचार्ज करें!` 
        : `You need at least ${hostRate.toLocaleString()} coins for this call. Please recharge! ⚡`);
      navigate('/wallet');
      return;
    }

    soundEffects.stopVoiceNote();
    setPlayingVoiceHostId(null);
    globalAudioManager.unlockAudio();

    // Start outgoing call with ringing dial screen ("हमारी तरफ से रिंग जाएगी")
    navigate(`/call/${host.id}`, { 
      state: { 
        host, 
        autoAccepted: false,
        isMatchCall: false 
      } 
    });

    // Create Firestore call record in calling state
    videoCallService.initiateCall({
      callerId: user?.uid || 'user_guest',
      callerName: user?.displayName || profile?.displayName || 'User',
      callerPhoto: user?.photoURL || profile?.photoURL || '',
      receiverId: host.id,
      receiverName: host.name,
      receiverPhoto: host.avatar,
      ratePerMinute: host.ratePerMinute
    }).catch(err => {
      console.warn("Background call record creation:", err);
    });
  };

  // Random Host "Match Calls" Handler with New Host Prioritization & Circular Radar
  const handleMatchCall = async () => {
    if (coins < 1500) {
      toast.error(language === 'hi' ? 'मैच कॉल के लिए न्यूनतम 1,500 कॉइन्स आवश्यक हैं! कृपया रिचार्ज करें। ⚡' : 'Match call requires at least 1,500 coins. Please recharge! ⚡');
      navigate('/wallet');
      return;
    }

    // Strictly pick from ACTIVE (online) hosts as instructed by user
    const newOnlineHosts = hosts.filter(h => isHostNew15Days(h) && h.status === 'online');
    const allOnlineHosts = hosts.filter(h => h.status === 'online');

    let pool: VideoHost[] = [];
    if (newOnlineHosts.length > 0) {
      pool = newOnlineHosts;
    } else if (allOnlineHosts.length > 0) {
      pool = allOnlineHosts;
    }

    if (pool.length === 0) {
      toast.error('No active hosts available right now. Please try again in a few moments!');
      return;
    }

    soundEffects.stopVoiceNote();
    setPlayingVoiceHostId(null);
    soundEffects.unlockAudio();
    globalAudioManager.unlockAudio();
    setIsMatching(true);
    setMatchedHostPreview(null);

    // Play periodic radar pings while rotating
    soundEffects.playRadarPing();
    if (radarPingIntervalRef.current) clearInterval(radarPingIntervalRef.current);
    radarPingIntervalRef.current = setInterval(() => {
      soundEffects.playRadarPing();
    }, 900);

    // Pick random host from prioritized active pool
    const selectedHost = pool[Math.floor(Math.random() * pool.length)];

    // Rotate circle while matching, then instantly connect camera without ringing
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    matchTimerRef.current = setTimeout(async () => {
      clearInterval(radarPingIntervalRef.current);
      setMatchedHostPreview(selectedHost);
      soundEffects.playMatchSuccess();

      // Instant transition: camera opens immediately without ringing
      setTimeout(async () => {
        try {
          const callId = await videoCallService.initiateCall({
            callerId: user?.uid || 'user_guest',
            callerName: user?.displayName || profile?.displayName || 'User',
            callerPhoto: user?.photoURL || profile?.photoURL || '',
            receiverId: selectedHost.id,
            receiverName: selectedHost.name,
            receiverPhoto: selectedHost.avatar,
            ratePerMinute: selectedHost.ratePerMinute || 1500
          });

          setIsMatching(false);
          setMatchedHostPreview(null);
          // Navigate with autoAccepted: true & isMatchCall: true so camera opens instantly
          navigate(`/call/${selectedHost.id}?callId=${callId}&match=true`, {
            state: { host: selectedHost, callId, isMatchCall: true, autoAccepted: true }
          });
        } catch (err) {
          setIsMatching(false);
          setMatchedHostPreview(null);
          toast.error('Failed to connect match call. Please try again.');
        }
      }, 500);
    }, 2800);
  };

  return (
    <div id="video-hosts-page-root" className="min-h-screen bg-[#080914] text-white pb-32 font-sans relative overflow-x-hidden touch-pan-y">
      
      {/* Dynamic ambient background glow */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-rose-500/15 via-purple-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 left-0 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. TOP HEADER */}
      <div className="sticky top-0 z-30 bg-[#080914]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-[0_0_18px_rgba(244,63,94,0.4)]">
            <div className="w-full h-full bg-[#0E1022] rounded-[14px] flex items-center justify-center">
              <Video size={19} className="text-pink-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white">
                1-on-1 Video
              </h1>
              <span className="text-[9.5px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[10.5px] text-zinc-400 font-medium">
              Private 1-on-1 calling with active hosts
            </p>
          </div>
        </div>

        {/* Action Controls & Coins Capsule */}
        <div className="flex items-center gap-1.5">
          {/* Redesigned Premium 3D Coins Capsule */}
          <div 
            onClick={() => navigate('/wallet')}
            className="group cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#1F1404] via-[#332107] to-[#1F1404] hover:from-[#3a2507] hover:to-[#2b1b05] border border-amber-400/70 hover:border-amber-300 rounded-full py-1.5 px-3 shadow-[0_0_20px_rgba(245,158,11,0.45)] active:scale-95 transition-all shrink-0 relative overflow-hidden"
            title="Tap to Recharge Coins (कॉइन्स रिचार्ज करें)"
          >
            {/* Ambient Shimmer sheen sweeping across */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Glowing 3D Golden Coin Icon */}
            <div className="relative shrink-0 flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-amber-400/30 blur-sm animate-pulse pointer-events-none" />
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-[1.5px] shadow-[0_0_12px_rgba(245,158,11,0.8)] relative z-10 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center">
                  <Coins size={14} className="text-yellow-200 fill-amber-300 drop-shadow" />
                </div>
              </div>
            </div>

            {/* Coin count & Coins label */}
            <div className="flex flex-col pr-1 min-w-[48px]">
              <span className="text-sm font-black text-amber-200 font-mono tracking-tight leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {coins.toLocaleString()}
              </span>
              <span className="text-[7.5px] font-black text-amber-400/90 uppercase tracking-widest leading-none">
                🪙 Coins
              </span>
            </div>

            {/* Plus add button with golden bounce */}
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-[#2B1802] flex items-center justify-center font-black text-xs shadow-[0_2px_6px_rgba(0,0,0,0.5)] border border-amber-100/60 group-hover:rotate-90 transition-transform">
              +
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3 flex flex-col gap-3 relative z-10">
        
        {/* SEARCH & FILTER CONTROLS */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400" />
            <input 
              type="text"
              placeholder="Search host by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12162A]/90 border border-white/10 focus:border-rose-500/60 rounded-2xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none backdrop-blur-md shadow-inner transition-colors"
            />
          </div>

          {/* Simple Tab Switcher: All Hosts / Online */}
          <div className="flex items-center bg-[#12162A]/90 border border-white/10 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Hosts
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'online'
                  ? 'bg-emerald-500 text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </button>
          </div>
        </div>

        {/* Host Banner: Apply Hosting vs Host Center - strictly female or admin granted in DB */}
        {(profile?.gender === 'female' || Boolean((profile as any)?.canApplyHost)) && (() => {
          let hostApp: any = null;
          try {
            const saved = localStorage.getItem('my_host_application');
            if (saved) hostApp = JSON.parse(saved);
          } catch(e) {}

          const isApproved = hostApp?.status === 'approved' || localStorage.getItem('is_host_approved') === 'true' || profile?.isHostApproved || profile?.role === 'host';
          const isReviewing = hostApp?.status === 'pending_review';

          if (isApproved) {
            return (
              <div 
                onClick={() => navigate('/host')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-emerald-500/10 border border-emerald-500/40 hover:border-emerald-400 shadow-lg flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white tracking-wide uppercase font-display">
                        HOST CENTER
                      </h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                        VERIFIED HOST
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/90 font-medium mt-0.5">
                      View call stats, earnings & withdraw diamonds
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                  <ChevronRight size={16} />
                </div>
              </div>
            );
          }

          if (isReviewing) {
            return (
              <div 
                onClick={() => navigate('/apply-hosting')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-600/15 border border-amber-500/60 shadow-lg flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-black text-lg shadow-md shrink-0">
                    ⏳
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-amber-300 tracking-wide uppercase font-display">
                        APPLICATION UNDER REVIEW
                      </h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-black">
                        24H REVIEW
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 font-medium mt-0.5">
                      Your host application is being verified by team
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <ChevronRight size={16} />
                </div>
              </div>
            );
          }

          return (
            <div 
              onClick={() => navigate('/apply-hosting')}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-600/30 via-purple-600/20 to-pink-500/10 border border-pink-500/40 hover:border-pink-500/70 shadow-lg flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide uppercase font-display">
                    APPLY FOR HOSTING
                  </h3>
                  <p className="text-[11px] text-pink-200/90 font-medium mt-0.5">
                    Become a verified 1-on-1 private video call host
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-pink-300 shrink-0">
                <ChevronRight size={16} />
              </div>
            </div>
          );
        })()}

        {/* TALL PORTRAIT VIDEO HOSTS SHOWCASE */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {filteredHosts.map(host => {
            const isBlurred = blurredHostIds.includes(host.id);
            const isVoicePlaying = playingVoiceHostId === host.id;

            return (
              <motion.div
                key={host.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-[#101428] border border-white/10 hover:border-pink-500/60 rounded-3xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col transition-all cursor-pointer hover:shadow-[0_12px_35px_rgba(244,63,94,0.2)]"
                onClick={() => handleOpenHostProfile(host)}
              >
                {/* TALL PORTRAIT PHOTO CONTAINER */}
                <div className="relative aspect-[9/13.5] w-full overflow-hidden bg-[#0A0D1D]">
                  <img 
                    src={host.avatar} 
                    alt={host.name}
                    className={`w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105 ${
                      isBlurred ? 'blur-md scale-110' : 'saturate-[1.1] brightness-95'
                    }`}
                    loading="lazy"
                  />

                  {/* Shading */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D1D] via-[#0A0D1D]/25 to-black/50 pointer-events-none" />

                  {/* Top Badges: Live Status + Coin Rate */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase backdrop-blur-md border shadow-md ${
                      host.status === 'online' 
                        ? 'bg-black/70 text-emerald-300 border-emerald-500/40' 
                        : host.status === 'busy'
                          ? 'bg-black/70 text-amber-300 border-amber-500/40'
                          : 'bg-black/70 text-zinc-400 border-white/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        host.status === 'online' 
                          ? 'bg-emerald-400 animate-pulse' 
                          : host.status === 'busy'
                            ? 'bg-amber-400'
                            : 'bg-zinc-500'
                      }`} />
                      {host.status === 'online' ? 'ONLINE' : host.status === 'busy' ? 'BUSY' : 'OFFLINE'}
                    </span>

                    <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-md">
                      <Coins size={11} className="text-amber-400" />
                      {Math.max(host.ratePerMinute || 1500, 1500).toLocaleString()}🪙/m
                    </span>
                  </div>

                  {/* Modern Voice Teaser Pill */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleVoice(e, host)}
                    className={`absolute bottom-20 left-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black backdrop-blur-xl border transition-all duration-300 pointer-events-auto shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${
                      isVoicePlaying 
                        ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 text-white border-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.7)] scale-105 ring-2 ring-pink-400/40' 
                        : 'bg-black/75 hover:bg-black/90 text-zinc-100 border-white/20 hover:border-pink-400/50 hover:text-pink-200'
                    }`}
                  >
                    {isVoicePlaying ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping" />
                        <span className="text-yellow-200 tracking-wide font-extrabold">Playing Voice...</span>
                        <div className="flex items-end gap-0.5 h-2.5 ml-0.5">
                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                          <span className="w-0.5 h-1.5 bg-pink-200 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                          <span className="w-0.5 h-3 bg-yellow-300 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-pink-500/30 flex items-center justify-center text-pink-400">
                          <Volume2 size={11} />
                        </span>
                        <span className="tracking-wide">Listen Voice 🎙️</span>
                        <div className="flex items-center gap-0.5 opacity-50">
                          <span className="w-0.5 h-1 bg-pink-400 rounded-full" />
                          <span className="w-0.5 h-2 bg-pink-300 rounded-full" />
                          <span className="w-0.5 h-1 bg-pink-400 rounded-full" />
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Host Essential Info Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-3 pt-6 bg-gradient-to-t from-[#0A0D1D] via-[#0A0D1D]/95 to-transparent flex flex-col justify-end">
                    
                    {/* 15-day NEW Badge if applicable */}
                    {isHostNew15Days(host) && (
                      <div className="mb-1 flex items-center">
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 text-white text-[8.5px] font-black tracking-wider uppercase shadow-[0_0_8px_rgba(16,185,129,0.7)] flex items-center gap-0.5 border border-emerald-300/40">
                          <Sparkles size={9} className="text-yellow-200" />
                          <span>NEW HOST</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-white flex items-center gap-1.5 truncate drop-shadow-md">
                        <span className="truncate">{host.name}</span>
                        {host.isVerified && (
                          <ShieldCheck size={14} className="text-pink-400 shrink-0 fill-pink-400/20" />
                        )}
                      </h3>
                      <span className="text-[11px] font-bold text-zinc-300 shrink-0">
                        {host.age} yrs
                      </span>
                    </div>

                    {/* Instant 1-on-1 Video Call & Direct Message Action Buttons */}
                    <div className="mt-2.5 flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/messages', { state: { chatWithHost: host } });
                        }}
                        className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-300 border border-white/15 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer shadow-md"
                        title={`Chat with ${host.name}`}
                      >
                        <MessageCircle size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCallHost(host);
                        }}
                        className={`flex-1 h-10 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                          host.status === 'online'
                            ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-[0_4px_16px_rgba(244,63,94,0.4)] hover:brightness-110'
                            : 'bg-zinc-800 text-zinc-400 border border-white/10'
                        }`}
                      >
                        <Video size={14} className={host.status === 'online' ? 'animate-pulse text-white' : ''} />
                        <span className="truncate">
                          {host.status === 'online' ? 'Video Call 💖' : 'In Call ⏳'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredHosts.length === 0 && (
          <div className="text-center py-16 text-zinc-500 text-xs">
            <Video size={36} className="mx-auto mb-2 text-zinc-600" />
            <p>No hosts found matching your search.</p>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. UPGRADED "MATCH CALLS" FLOATING BUTTON (GORGEOUS, HIGH-TECH, ATTRACTIVE) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4 pointer-events-none">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleMatchCall}
          className="pointer-events-auto w-full py-3.5 px-5 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-sm shadow-[0_10px_35px_rgba(16,185,129,0.55)] border-2 border-emerald-300/40 flex items-center justify-between gap-3 active:scale-95 transition-all cursor-pointer group relative overflow-hidden backdrop-blur-xl"
        >
          {/* Animated glow sweep */}
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

          {/* Left Icon with radar ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <span className="absolute w-9 h-9 rounded-full bg-white/30 animate-ping opacity-75" />
            <div className="w-9 h-9 rounded-2xl bg-black/25 flex items-center justify-center text-white shadow-inner">
              <Zap size={18} className="fill-white" />
            </div>
          </div>

          {/* Center Text */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5 leading-none">
              <span className="text-sm font-black tracking-wide text-white drop-shadow-sm">⚡ Match Calls</span>
              <span className="text-[9.5px] uppercase font-black px-2 py-0.5 rounded-full bg-black/30 text-emerald-200 border border-emerald-300/40">
                Random
              </span>
            </div>
            <p className="text-[10px] text-emerald-100 font-bold mt-1">
              Random Online Host Matching • 1,500 🪙/min
            </p>
          </div>

          {/* Right Video Call Icon */}
          <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
            <PhoneCall size={16} className="text-white" />
          </div>
        </motion.button>
      </div>

      {/* ========================================================================= */}
      {/* 5. CIRCULAR SPINNING MATCHING RADAR OVERLAY (FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMatching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#07050F]/95 backdrop-blur-2xl flex flex-col justify-between items-center text-white select-none overflow-hidden py-8 px-4"
          >
            {/* Top Bar with Cancel / Back option */}
            <div className="w-full max-w-md flex items-center justify-between z-20">
              <button
                type="button"
                onClick={handleCancelMatch}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white font-bold text-xs backdrop-blur-md border border-white/15 transition-all cursor-pointer active:scale-95"
              >
                <ChevronLeft size={18} />
                <span>वापस (Back)</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>मैचिंग चालू है...</span>
              </div>
            </div>

            {/* Center: Spinning Circular Radar Scanner */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
              {matchedHostPreview ? (
                /* Sudden Reveal of Matched Host */
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 shadow-[0_0_60px_rgba(244,63,94,0.9)] mb-4">
                    <img 
                      src={matchedHostPreview.avatar} 
                      alt={matchedHostPreview.name} 
                      className="w-full h-full rounded-full object-cover border-4 border-[#07050F]"
                    />
                    <span className="absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black border-2 border-[#07050F]">
                      MATCHED!
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-1.5 justify-center">
                    <span>{matchedHostPreview.name}</span>
                    <ShieldCheck size={20} className="text-pink-400 fill-pink-400/20" />
                  </h2>
                  <p className="text-xs text-pink-300 font-bold mt-1">
                    ✨ मैच कनेक्ट हो रहा है... (Connecting Now)
                  </p>
                </motion.div>
              ) : (
                /* Continuous Circular Radar Spinning Animation */
                <div className="flex flex-col items-center">
                  <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center mb-6">
                    {/* Concentric Outer Radar Rings */}
                    <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse" />
                    <div className="absolute inset-6 rounded-full border border-teal-500/25" />
                    <div className="absolute inset-14 rounded-full border border-emerald-400/35" />
                    <div className="absolute inset-24 rounded-full border border-emerald-500/40" />

                    {/* Sonar Ping Wave */}
                    <div className="absolute inset-8 rounded-full border-2 border-emerald-400/50 animate-ping opacity-60" />

                    {/* Continuous 360-degree Rotating Radar Sweep Beam */}
                    <motion.div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(16,185,129,0) 0deg, rgba(16,185,129,0.35) 60deg, rgba(16,185,129,0) 90deg)'
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Orbiting Rotating Circle Indicators */}
                    <motion.div
                      className="absolute inset-3 rounded-full border-2 border-dashed border-emerald-400/40"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Orbiting Host Preview Avatars (Focusing on New Hosts) */}
                    {hosts.slice(0, 4).map((h, i) => {
                      const angles = [0, 90, 180, 270];
                      const angle = angles[i];
                      const rad = (angle * Math.PI) / 180;
                      const x = Math.cos(rad) * 110;
                      const y = Math.sin(rad) * 110;

                      return (
                        <motion.div
                          key={h.id}
                          className="absolute w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-lg"
                          style={{ transform: `translate(${x}px, ${y}px)` }}
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                        >
                          <img 
                            src={h.avatar} 
                            alt={h.name} 
                            className="w-full h-full rounded-full object-cover border-2 border-[#07050F]"
                          />
                          {isHostNew15Days(h) && (
                            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[8px] font-black shadow">
                              NEW
                            </span>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Center Core Circle with Rotating Indicator & User Avatar */}
                    <div className="relative z-20 w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-green-400 p-1 shadow-[0_0_35px_rgba(16,185,129,0.8)] flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-[#090614] flex items-center justify-center overflow-hidden relative">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <RotateCw size={28} className="text-emerald-400 animate-spin" />
                        )}
                        <span className="absolute inset-0 bg-emerald-500/15 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Status Text */}
                  <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                    <span>सक्रिय होस्ट्स खोजी जा रही हैं...</span>
                    <Sparkles size={18} className="text-emerald-400 animate-spin" />
                  </h3>

                  <p className="text-xs text-zinc-300 mt-2 font-medium max-w-xs">
                    🔄 गोल-गोल घूम रहा है, किसी भी ऑनलाइन होस्ट से अचानक कनेक्ट होगा
                  </p>

                  <div className="mt-3 px-3.5 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-pink-400" />
                    <span>Matching with active online hosts...</span>
                  </div>

                  <div className="mt-2 py-1 px-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-amber-300 font-semibold">
                    🪙 Call Rate: 1,500 coins / min
                  </div>
                </div>
              )}
            </div>

            {/* Bottom: BIG RED CUT CALL / CANCEL BUTTON */}
            <div className="w-full max-w-xs z-20 flex flex-col items-center">
              <button
                type="button"
                onClick={handleCancelMatch}
                className="w-full py-4 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm shadow-[0_0_30px_rgba(225,29,72,0.7)] flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer border border-red-400/40"
              >
                <PhoneOff size={20} />
                <span>Cancel Match</span>
              </button>
              <span className="text-[11px] text-zinc-400 mt-2">
                Tap anytime to stop matching
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. HOST 100% FULL-SCREEN PROFILE VIEW (FULLSCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedHostForProfile && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-0 z-50 w-full h-[100dvh] bg-[#07050F] flex flex-col text-white overflow-hidden select-none"
          >
            {/* Full-Screen Top Header Bar with Cut / Back Button */}
            <header className="sticky top-0 z-30 px-4 py-3 bg-[#07050F]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleCloseHostProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-90 border border-white/10 shrink-0"
              >
                <ChevronLeft size={19} />
                <span className="text-xs font-black tracking-wide">Back</span>
              </button>

              {/* Host Center Info with Name & Online badge */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mx-2 justify-center">
                <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-1.5 truncate">
                  <span className="truncate">{selectedHostForProfile.name}</span>
                  {selectedHostForProfile.isVerified && (
                    <ShieldCheck size={18} className="text-pink-400 fill-pink-400/20 shrink-0" />
                  )}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                  selectedHostForProfile.status === 'online'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedHostForProfile.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {selectedHostForProfile.status === 'online' ? 'Online' : 'Busy'}
                </span>
              </div>

              {/* Host Permanent ID Pill & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const idVal = selectedHostForProfile.numericId || '1000';
                    navigator.clipboard?.writeText(idVal);
                    toast.success(`Host ID #${idVal} Copied! 📋`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[11px] font-black font-mono flex items-center gap-1 hover:bg-pink-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Copy Host ID"
                >
                  <span>ID: {selectedHostForProfile.numericId || '1000'}</span>
                  <Copy size={11} className="text-pink-400" />
                </button>

                <button
                  type="button"
                  onClick={handleCloseHostProfile}
                  className="p-1.5 rounded-full bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Full-Screen Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 pb-28">
              {/* 1. Large High-Res Photo Gallery with Swipe Controls */}
              {(() => {
                const gallery = selectedHostForProfile.photos && selectedHostForProfile.photos.length > 0
                  ? selectedHostForProfile.photos
                  : [selectedHostForProfile.avatar, selectedHostForProfile.coverPhoto];
                const currentPhoto = gallery[activePhotoIndex] || gallery[0];

                return (
                  <div className="flex flex-col gap-2.5">
                    <div className="relative aspect-[4/5] sm:aspect-[16/10] max-h-[55vh] w-full rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 group">
                      <motion.img
                        key={currentPhoto}
                        initial={{ opacity: 0.7, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        src={currentPhoto}
                        alt={`${selectedHostForProfile.name} photo`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07050F] via-transparent to-black/40 pointer-events-none" />

                      {/* Photo Counter Pill */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-black text-white border border-white/20 flex items-center gap-1.5 shadow">
                        <Sparkles size={12} className="text-pink-400" />
                        <span>फोटो {activePhotoIndex + 1} / {gallery.length}</span>
                      </div>

                      {/* Online status badge on photo */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-[11px] font-black text-white border border-white/20 shadow flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        ONLINE
                      </div>

                      {/* Prominent Host Name & Identity Overlay at Bottom of Photo */}
                      <div className="absolute bottom-0 inset-x-0 p-4 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-1 pointer-events-none z-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-1.5">
                            <span>{selectedHostForProfile.name}</span>
                            {selectedHostForProfile.isVerified && (
                              <ShieldCheck size={22} className="text-pink-400 fill-pink-400/20 shrink-0" />
                            )}
                          </h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1 ${
                            selectedHostForProfile.status === 'online'
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                              : 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${selectedHostForProfile.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            {selectedHostForProfile.status === 'online' ? 'ऑनलाइन (Online)' : 'व्यस्त (Busy)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-200 font-bold flex-wrap">
                          <span className="text-pink-300">📍 {selectedHostForProfile.city}</span>
                          <span className="text-zinc-400">•</span>
                          <span>{selectedHostForProfile.age} साल (Years)</span>
                          <span className="text-zinc-400">•</span>
                          <span className="bg-pink-500/25 px-2 py-0.5 rounded-full text-[11px] text-pink-200 font-mono font-black border border-pink-500/40">
                            ID: #{selectedHostForProfile.numericId || '1000'}
                          </span>
                        </div>
                      </div>

                      {/* Prev / Next Arrows */}
                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndex(prev => (prev === 0 ? gallery.length - 1 : prev - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all border border-white/20 active:scale-90 cursor-pointer shadow-xl"
                            title="पिछली फोटो"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndex(prev => (prev === gallery.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all border border-white/20 active:scale-90 cursor-pointer shadow-xl"
                            title="अगली फोटो"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* 2. Photo Thumbnails Strip (5-6 DPs) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-xs font-black text-zinc-300">
                          होस्ट की 5-6 प्रोफ़ाइल फोटोज (AI & Real DPs)
                        </span>
                        <span className="text-[10px] text-pink-400 font-semibold">
                          टैप करके बड़ी फोटो देखें
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {gallery.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                              activePhotoIndex === idx
                                ? 'border-pink-500 ring-2 ring-pink-500/50 scale-105 shadow-md'
                                : 'border-white/15 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={p} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                            {activePhotoIndex === idx && (
                              <span className="absolute inset-0 bg-pink-500/20" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2B. PROMINENT HOST NAME & IDENTITY BANNER */}
              <div className="bg-gradient-to-r from-[#170E30] via-[#1A1238] to-[#120B24] border border-pink-500/30 rounded-3xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                      <span className="truncate">{selectedHostForProfile.name}</span>
                      {selectedHostForProfile.isVerified && (
                        <ShieldCheck size={20} className="text-pink-400 fill-pink-400/20 shrink-0" />
                      )}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                      selectedHostForProfile.status === 'online'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedHostForProfile.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {selectedHostForProfile.status === 'online' ? 'Online' : 'Busy'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 flex items-center gap-2 flex-wrap font-medium">
                    <span className="text-pink-300 font-bold">📍 {selectedHostForProfile.city}</span>
                    <span className="text-zinc-500">•</span>
                    <span>{selectedHostForProfile.age} yrs</span>
                    <span className="text-zinc-500">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const idVal = selectedHostForProfile.numericId || '1000';
                        navigator.clipboard?.writeText(idVal);
                        toast.success(`Host ID #${idVal} Copied! 📋`);
                      }}
                      className="bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-0.5 rounded-full text-[10px] text-pink-200 font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to copy ID"
                    >
                      <span>ID: #{selectedHostForProfile.numericId || '1000'}</span>
                      <Copy size={10} className="text-pink-300" />
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right pl-3">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Call Rate</div>
                  <div className="text-amber-300 font-black text-sm flex items-center gap-1">
                    <Coins size={14} className="text-amber-400" />
                    <span>{Math.max(selectedHostForProfile.ratePerMinute || 1500, 1500).toLocaleString()}🪙/m</span>
                  </div>
                </div>
              </div>

              {/* 3. Upgraded Audio Voice Note Player ("होस्ट की आवाज सुनें") */}
              <div className="bg-gradient-to-r from-[#170E30] to-[#120B24] border border-pink-500/30 rounded-3xl p-4 flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3.5 relative z-10">
                  <button
                    type="button"
                    onClick={(e) => handleToggleVoice(e, selectedHostForProfile)}
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer ${
                      playingVoiceHostId === selectedHostForProfile.id
                        ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white animate-pulse ring-4 ring-pink-500/40 shadow-[0_0_25px_rgba(244,63,94,0.6)]'
                        : 'bg-white/10 hover:bg-white/20 text-pink-300 border border-white/15'
                    }`}
                  >
                    {playingVoiceHostId === selectedHostForProfile.id ? (
                      <VolumeX size={22} className="text-yellow-300" />
                    ) : (
                      <Volume2 size={22} className="text-pink-400" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-white">
                        {playingVoiceHostId === selectedHostForProfile.id ? 'Playing Voice...' : 'Listen to Host Voice 🎙️'}
                      </p>
                      {playingVoiceHostId === selectedHostForProfile.id ? (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-1 h-3 bg-pink-400 rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                          <span className="w-1 h-2 bg-yellow-300 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                          <span className="w-1 h-3.5 bg-rose-400 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 opacity-40">
                          <span className="w-0.5 h-2 bg-pink-400 rounded-full" />
                          <span className="w-0.5 h-3 bg-pink-300 rounded-full" />
                          <span className="w-0.5 h-1.5 bg-pink-400 rounded-full" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 italic mt-0.5 line-clamp-1">
                      "{selectedHostForProfile.voiceNoteText}"
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-pink-300 bg-pink-500/20 px-3 py-1 rounded-full border border-pink-500/40 relative z-10 shrink-0">
                  {playingVoiceHostId === selectedHostForProfile.id ? 'Playing 🔊' : 'Audio Note 🎵'}
                </span>
              </div>

              {/* 5. Bio and Interests Tags */}
              <div className="bg-[#150D2B] rounded-3xl p-4 border border-white/5 flex flex-col gap-2.5 shadow-md">
                <span className="text-xs font-black text-zinc-300">About Host:</span>
                <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                  {selectedHostForProfile.bio}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedHostForProfile.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-bold border border-pink-500/20">
                      #{tag}
                    </span>
                  ))}
                  {selectedHostForProfile.languages.map((lang, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold border border-white/10">
                      🗣️ {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* 6. Prominent Action Buttons directly below About Host (Side-by-side length) */}
              <div className="pt-2 pb-6 grid grid-cols-2 gap-3">
                {/* Message Host Button */}
                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHostForProfile;
                    soundEffects.stopVoiceNote();
                    setPlayingVoiceHostId(null);
                    setSelectedHostForProfile(null);
                    navigate('/messages', { state: { chatWithHost: h } });
                  }}
                  className="py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-pink-200 border border-pink-500/30 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle size={18} className="text-pink-400 shrink-0" />
                  <span className="truncate">Chat</span>
                </button>

                {/* Direct Video Call Button */}
                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHostForProfile;
                    soundEffects.stopVoiceNote();
                    setPlayingVoiceHostId(null);
                    setSelectedHostForProfile(null);
                    handleCallHost(h);
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer ${
                    selectedHostForProfile.status === 'online'
                      ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white shadow-[0_4px_25px_rgba(244,63,94,0.55)] hover:brightness-110'
                      : 'bg-zinc-800 text-zinc-400 border border-white/10'
                  }`}
                >
                  <Video size={18} className={selectedHostForProfile.status === 'online' ? 'animate-pulse shrink-0' : 'shrink-0'} />
                  <span className="truncate">
                    Video Call ({Math.max(selectedHostForProfile.ratePerMinute || 1500, 1500).toLocaleString()}🪙/m)
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
