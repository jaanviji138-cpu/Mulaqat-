import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, setDoc, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, Video, Camera, Sparkles, Search, 
  RefreshCw, Eye, X, Volume2, VolumeX, Globe, Lock, UserPlus, Plus, Check,
  Users, Armchair, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';
import LiveMomentsSection from '@/components/LiveMomentsSection';

export default function LivePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [activeLiveCategory, setActiveLiveCategory] = useState<'all' | 'video' | 'voice'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Live Video Modal states
  const [isCreateLiveOpen, setIsCreateLiveOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [selectedPrivateUsers, setSelectedPrivateUsers] = useState<string[]>([]);
  const [showPreLiveAddUsers, setShowPreLiveAddUsers] = useState(false);
  const [recentUsersList, setRecentUsersList] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState('');

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentDisplayName = profile?.displayName || user?.displayName || 'Maxo Creator';
  const currentAvatar = profile?.photoURL || user?.photoURL || getPremiumAvatar(user?.uid || 'user');

  // Real-time Firestore Live Streams & Voice Rooms subscription
  useEffect(() => {
    try {
      const qStreams = query(collection(db, 'live_streams'));
      const unsubStreams = onSnapshot(qStreams, (snapshot) => {
        const dbStreams: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isLive !== false) {
            dbStreams.push({ id: docSnap.id, ...data, type: 'video' });
          }
        });
        setLiveStreams(dbStreams);
      }, (err) => {
        console.warn('Firestore live streams error:', err);
      });

      const qRooms = query(collection(db, 'rooms'));
      const unsubRooms = onSnapshot(qRooms, (snapshot) => {
        const dbRooms: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isLive !== false) {
            dbRooms.push({ id: docSnap.id, ...data, type: 'voice' });
          }
        });
        setLiveRooms(dbRooms);
      }, (err) => {
        console.warn('Firestore rooms live error:', err);
      });

      return () => {
        unsubStreams();
        unsubRooms();
      };
    } catch (e) {
      console.warn('Live stream sub error:', e);
    }
  }, []);

  // Fetch recent platform users for private invite list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(30));
        const snap = await getDocs(q);
        const users: any[] = [];
        snap.forEach(d => {
          if (d.id !== user?.uid) {
            users.push({ id: d.id, ...d.data() });
          }
        });
        setRecentUsersList(users);
      } catch (e) {
        console.warn('Failed fetching users for pre-live invite:', e);
      }
    };
    fetchUsers();
  }, [user?.uid]);

  // Fast Camera start when opening Create Live Modal
  useEffect(() => {
    if (isCreateLiveOpen) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    return () => {
      stopCameraPreview();
    };
  }, [isCreateLiveOpen, facingMode]);

  const startCameraPreview = async () => {
    try {
      stopCameraPreview();
      // Fast, lightweight getUserMedia request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: isMicEnabled
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => {});
      }
      setIsCameraReady(true);
    } catch (err: any) {
      console.warn('Fast camera access fallback:', err);
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = basicStream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = basicStream;
          await videoPreviewRef.current.play().catch(() => {});
        }
        setIsCameraReady(true);
      } catch (fallbackErr) {
        toast.error('Camera access permission required to go Live! 📷');
        setIsCameraReady(false);
      }
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    toast.info('Switching camera... 🔄');
  };

  // Toggle user in private allowed list
  const toggleSelectUser = (targetUid: string) => {
    setSelectedPrivateUsers(prev => 
      prev.includes(targetUid) ? prev.filter(id => id !== targetUid) : [...prev, targetUid]
    );
  };

  // Launch the Live Video Stream
  const handleStartLiveBroadcast = async () => {
    if (!user) {
      toast.error('Please log in to start a Live broadcast!');
      navigate('/login');
      return;
    }

    const titleToUse = liveTitle.trim() || `${currentDisplayName}'s Live Stream 🔥`;
    setIsStartingStream(true);
    const toastId = toast.loading('Initiating Live Broadcast... 🔴');

    try {
      const streamId = `live_${user.uid}_${Date.now()}`;
      const allowedList = isPrivateMode 
        ? Array.from(new Set([user.uid, ...selectedPrivateUsers]))
        : [user.uid];

      const initialGuestSeats = [
        { index: 0, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
        { index: 1, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
        { index: 2, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
        { index: 3, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false }
      ];

      const newStreamData = {
        id: streamId,
        hostId: user.uid,
        hostName: currentDisplayName,
        hostAvatar: currentAvatar,
        hostNumericId: profile?.numericId?.toString() || '789104',
        title: titleToUse,
        coverUrl: currentAvatar,
        isLive: true,
        isPrivate: isPrivateMode,
        roomMode: isPrivateMode ? 'private' : 'public',
        allowedUsers: allowedList,
        guestSeats: initialGuestSeats,
        seatRequests: [],
        viewerCount: 1,
        viewers: [{
          uid: user.uid,
          displayName: currentDisplayName,
          photoURL: currentAvatar,
          joinedAt: new Date().toISOString()
        }],
        diamondsEarned: 0,
        filterEnabled: filterEnabled,
        facingMode: facingMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'live_streams', streamId), newStreamData);

      toast.success(isPrivateMode ? 'Private Live Room Created! 🔒🔴' : 'You are now LIVE! 🔴🎥', { id: toastId });
      stopCameraPreview();
      setIsCreateLiveOpen(false);
      navigate(`/live/${streamId}`);
    } catch (err: any) {
      console.error('Failed to create live stream:', err);
      toast.error('Could not start live stream. Please try again.', { id: toastId });
    } finally {
      setIsStartingStream(false);
    }
  };

  // Unified items list (Video streams + Voice party rooms)
  const allLiveItems = [
    ...liveStreams.map(s => ({ ...s, itemType: 'video' as const })),
    ...liveRooms.map(r => ({ ...r, itemType: 'voice' as const }))
  ];

  // Filtered live streams by search query and category
  const filteredStreams = allLiveItems.filter(item => {
    if (activeLiveCategory === 'video' && item.itemType !== 'video') return false;
    if (activeLiveCategory === 'voice' && item.itemType !== 'voice') return false;

    if (!searchQuery.trim()) return true;
    const queryStr = searchQuery.toLowerCase().trim();
    return (
      (item.title || '').toLowerCase().includes(queryStr) || 
      (item.hostName || '').toLowerCase().includes(queryStr) ||
      (item.id || '').toLowerCase().includes(queryStr)
    );
  });

  const filteredInviteUsers = recentUsersList.filter(u => {
    if (!userSearchText.trim()) return true;
    const q = userSearchText.toLowerCase().trim();
    return (
      (u.displayName || '').toLowerCase().includes(q) || 
      (u.numericId || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#07050F] text-white pb-24 font-sans select-none relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-red-600/20 via-pink-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-30px] right-[-20px] w-72 h-72 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. TOP HEADER - MAXO LIVE BRANDING WITH "CREATE LIVE" BUTTON */}
      <header className="sticky top-0 z-40 bg-[#07050F]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3.5 flex items-center justify-between">
        
        {/* Logo and LIVE badge */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-red-500 via-pink-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
            MAXO
          </span>
          <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Top Right: "Create Live" Button */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsCreateLiveOpen(true)}
            id="btn-create-live"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.5)] border border-rose-400/40 transition-all cursor-pointer active:scale-95"
          >
            <Camera size={15} className="stroke-[2.5] animate-pulse" />
            <span>Create Live</span>
          </motion.button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-3.5 space-y-4 relative z-10 pb-20">
        
        {/* 2. SEARCH BAR */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Live Streamer, Host or Room ID..."
            className="pl-9 pr-8 py-2.5 h-10 bg-white/[0.06] border-white/10 hover:border-white/20 focus:border-red-500 rounded-xl text-xs text-white placeholder:text-zinc-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 3. CATEGORY SELECTOR CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: '🔥 All Live', count: allLiveItems.length },
            { id: 'video', label: '🎥 Video Live', count: liveStreams.length },
            { id: 'voice', label: '🎙️ Voice Party', count: liveRooms.length }
          ].map((tab) => {
            const isActive = activeLiveCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLiveCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30 border border-rose-400/40 scale-105'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-zinc-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. FEATURED TOP BANNER - GO LIVE CALLOUT */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-950/70 via-purple-950/50 to-pink-950/40 border border-red-500/30 p-4 shadow-xl flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1 z-10 max-w-[68%]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">FULL SCREEN CAMERA LIVE</span>
            </div>
            <h3 className="text-xs font-black text-white leading-snug">
              Start Video Live Stream & Connect With Real Viewers! 🔴✨
            </h3>
            <p className="text-[10px] text-zinc-300">
              Full-screen camera broadcast with live gifts and chat.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateLiveOpen(true)}
            className="z-10 px-3 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-1 cursor-pointer"
          >
            <Video size={13} />
            <span>Go Live</span>
          </motion.button>
        </div>

        {/* 5. ACTIVE LIVE VIDEO & VOICE STREAMS */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <Radio size={14} className="text-red-500 animate-pulse" />
              <span>Active Broadcasters & Hosts ({filteredStreams.length})</span>
            </h2>
            <span className="text-[10px] text-rose-300 font-bold">होस्ट लाइव लिस्ट</span>
          </div>

          {filteredStreams.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center space-y-3 backdrop-blur-xl">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <Video size={22} className="text-red-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-white">No Broadcasters Live Right Now</p>
                <p className="text-[10.5px] text-zinc-400 max-w-xs mx-auto">
                  अभी कोई होस्ट लाइव नहीं है। "Go Live" बटन दबाकर लाइव शुरू करें! 🎥
                </p>
              </div>
              <Button 
                onClick={() => setIsCreateLiveOpen(true)}
                className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-red-500/20 cursor-pointer h-9 px-4"
              >
                <Camera size={13} className="mr-1.5" />
                Start Live Broadcast
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredStreams.map((item) => {
                const isVoice = item.itemType === 'voice';
                const targetUrl = isVoice ? `/room/${item.id}` : `/live/${item.id}`;
                const coverImage = item.coverUrl || item.thumbnailUrl || item.hostAvatar || item.hostPhoto || currentAvatar;
                const hostPhoto = item.hostAvatar || item.hostPhoto || currentAvatar;
                const seatedNum = item.seatedCount !== undefined ? item.seatedCount : ((item.seats || []).filter((s: any) => s.uid).length + 1);

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(targetUrl)}
                    className="group relative rounded-3xl overflow-hidden bg-zinc-950 border-2 border-red-500/40 shadow-2xl cursor-pointer min-h-[200px] flex flex-col justify-between p-3.5"
                  >
                    {/* Background Image / Stream Cover */}
                    <img 
                      src={coverImage} 
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.85]"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dark Gradients for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${
                        isVoice ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-600/40' : 'bg-red-600 text-white shadow-red-600/40 animate-pulse'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>{isVoice ? 'VOICE PARTY 🎙️' : 'HOST IS LIVE 🔴'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.isPrivate && (
                          <div className="bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow">
                            <Lock size={10} />
                            <span>PRIVATE</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/20">
                          <Eye size={11} className="text-zinc-300" />
                          <span>{item.viewerCount || item.memberCount || 1} live</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stream & Host Details (Host DP, Host Name, Host Numeric ID, Seated Count) */}
                    <div className="relative z-10 space-y-2 bg-black/60 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
                      <p className="text-xs sm:text-sm font-black text-white line-clamp-1 group-hover:text-pink-300 transition-colors">
                        {item.title}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <img 
                              src={hostPhoto} 
                              alt={item.hostName} 
                              className="w-8 h-8 rounded-full object-cover border-2 border-red-500 shadow-md" 
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white leading-tight flex items-center gap-1">
                              <Crown size={11} className="text-amber-400" />
                              <span>{item.hostName || 'Host'}</span>
                            </p>
                            <p className="text-[9.5px] text-zinc-300 font-mono">
                              ID: {item.hostNumericId || item.id?.substring(0, 9) || '789104'}
                            </p>
                          </div>
                        </div>

                        {/* Seated status & action */}
                        <div className="flex flex-col items-end gap-1">
                          {isVoice && (
                            <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/70 px-2 py-0.5 rounded-md border border-cyan-500/40 flex items-center gap-1">
                              <Armchair size={10} className="text-cyan-400" />
                              <span>{seatedNum} बैठे हैं</span>
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                            {isVoice ? 'Join Voice 🎙️' : 'Watch Live 🎥'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. LIVE MOMENTS SECTION (UPLOAD MOMENT, LIKE & COMMENT, PIN TO TOP, FULLSCREEN) */}
        <section id="live-moments-section" className="space-y-2 pt-2">
          <LiveMomentsSection />
        </section>
      </main>

      {/* 5. CREATE LIVE STREAM MODAL (FULL SCREEN NATURAL CAMERA & PUBLIC/PRIVATE OPTIONS) */}
      <AnimatePresence>
        {isCreateLiveOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden"
          >
            {/* Camera Viewport (Full Screen Natural Camera - NO OVER-ZOOMING) */}
            <div className="absolute inset-0 z-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                style={{
                  filter: filterEnabled ? 'contrast(1.04) brightness(1.06) saturate(1.1)' : 'none',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
                className="w-full h-full object-cover"
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-center p-6 space-y-3 z-10">
                  <div className="w-12 h-12 rounded-full border-3 border-red-500/20 border-t-red-500 animate-spin" />
                  <p className="text-sm text-zinc-200 font-bold">Opening camera...</p>
                  <p className="text-xs text-zinc-400">Please grant camera and microphone permission.</p>
                </div>
              )}

              {/* Shading gradients top and bottom */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />
            </div>

            {/* Modal Top Bar */}
            <div className="relative z-20 px-4 pt-3.5 pb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreateLiveOpen(false)}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xl border border-red-500/30 text-white text-xs font-black shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Live Studio</span>
              </div>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={handleFlipCamera}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-lg"
                title="Flip Camera"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Floating Side Tools (Filter & Mic) */}
            <div className="absolute right-4 top-20 z-20 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFilterEnabled(!filterEnabled);
                  toast.success(filterEnabled ? 'Natural Camera' : 'Glow Filter Applied ✨');
                }}
                className={`w-10 h-10 rounded-full backdrop-blur-xl border flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer ${
                  filterEnabled 
                    ? 'bg-pink-600/90 border-pink-400 text-white shadow-pink-500/30' 
                    : 'bg-black/60 border-white/20 text-zinc-300'
                }`}
                title="Filter"
              >
                <Sparkles size={16} />
                <span className="text-[7.5px] font-black mt-0.5">Filter</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                className={`w-10 h-10 rounded-full backdrop-blur-xl border flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer ${
                  isMicEnabled ? 'bg-black/60 border-white/20 text-white' : 'bg-red-500/90 border-red-400 text-white'
                }`}
                title="Microphone"
              >
                {isMicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span className="text-[7.5px] font-black mt-0.5">{isMicEnabled ? 'Mic On' : 'Muted'}</span>
              </button>
            </div>

            {/* Modal Bottom: Title Input, Public/Private Room Toggle & Start Button */}
            <div className="relative z-20 px-4 pb-7 pt-2 space-y-3 max-w-sm mx-auto w-full">
              
              {/* Title Input */}
              <div className="relative">
                <Input
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="Enter Live Title (लाइव का नाम लिखें)... 🌟"
                  className="bg-black/75 backdrop-blur-xl border-white/20 text-white placeholder:text-zinc-400 text-xs font-bold rounded-2xl h-11 focus:border-red-500 shadow-xl px-4"
                  maxLength={45}
                />
              </div>

              {/* PUBLIC VS PRIVATE ROOM SELECTOR */}
              <div className="p-1 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 flex items-center gap-1 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setIsPrivateMode(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isPrivateMode
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-lg shadow-emerald-500/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe size={14} />
                  <span>Public (पब्लिक)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivateMode(true)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isPrivateMode
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-lg shadow-red-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Lock size={14} />
                  <span>Private (प्राइवेट)</span>
                </button>
              </div>

              {/* Private Mode Controls & Add User Button */}
              {isPrivateMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-red-950/80 border border-red-500/40 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-600/40 flex items-center justify-center text-red-300">
                        <Lock size={12} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white">Private Stream Access</p>
                        <p className="text-[9px] text-amber-300 font-medium">
                          {selectedPrivateUsers.length > 0 ? `${selectedPrivateUsers.length} Users Allowed` : 'No users invited yet'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPreLiveAddUsers(true)}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 text-black text-[10px] font-black flex items-center gap-1 shadow-md active:scale-95 cursor-pointer animate-pulse"
                    >
                      <UserPlus size={12} className="stroke-[3]" />
                      <span>{selectedPrivateUsers.length > 0 ? 'Edit Users (ऐड)' : 'Add Users (ऐड करें)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Start Live CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartLiveBroadcast}
                disabled={isStartingStream}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(225,29,72,0.6)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Radio size={18} className="animate-pulse" />
                <span>{isStartingStream ? 'Starting Live...' : isPrivateMode ? `Start Private Live (${selectedPrivateUsers.length} Allowed)` : 'Start Live Broadcast (लाइव शुरू करें)'}</span>
              </motion.button>
            </div>

            {/* PRE-LIVE ADD USERS MODAL */}
            <AnimatePresence>
              {showPreLiveAddUsers && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                  <motion.div
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 80 }}
                    className="w-full max-w-sm bg-[#120D24] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300">
                          <UserPlus size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">Select Allowed Viewers</h4>
                          <p className="text-[9px] text-amber-300">प्राइवेट लाइव के लिए यूज़र्स चुनें ({selectedPrivateUsers.length} Selected)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreLiveAddUsers(false)}
                        className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Search box */}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        placeholder="Search by name, ID or email..."
                        className="h-8 pl-8 pr-3 bg-white/5 border-white/10 text-xs text-white rounded-xl placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Users list */}
                    <div className="max-h-56 overflow-y-auto space-y-2 scrollbar-none pr-1">
                      {filteredInviteUsers.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 text-xs">
                          No users found.
                        </div>
                      ) : (
                        filteredInviteUsers.map((u) => {
                          const isSelected = selectedPrivateUsers.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => toggleSelectUser(u.id)}
                              className={`flex items-center justify-between p-2 rounded-2xl border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-emerald-500/20 border-emerald-500/50' 
                                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.photoURL || getPremiumAvatar(u.id)}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                                />
                                <div>
                                  <p className="text-xs font-bold text-white">{u.displayName || 'Maxo Star'}</p>
                                  <p className="text-[9px] text-zinc-400 font-mono">ID: {u.numericId || u.id.slice(0, 8)}</p>
                                </div>
                              </div>

                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/30 text-transparent'
                              }`}>
                                <Check size={13} className="stroke-[3]" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <Button
                      onClick={() => setShowPreLiveAddUsers(false)}
                      className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 text-black font-black text-xs cursor-pointer shadow"
                    >
                      Done ({selectedPrivateUsers.length} Allowed) ✓
                    </Button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
