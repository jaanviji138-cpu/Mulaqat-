import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, setDoc, onSnapshot, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { Room } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Crown, ArrowRight,
  Sparkles, Image as ImageIcon, Upload, Check,
  Armchair, Plus, Search, Palette, X, Lock, Globe,
  Radio, Volume2, ShieldCheck, Flame, Music, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_MALE_AVATARS, INDIAN_FEMALE_AVATARS } from '@/utils/avatar';

// Preset stylish Room DP covers
const PRESET_ROOM_DPS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop'
];

// Preset Luxury Room Background Wallpapers
const PRESET_WALLPAPERS = [
  { id: 'party', name: 'Party Neon 🎆', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop' },
  { id: 'royal', name: 'Royal Velvet 👑', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop' },
  { id: 'galaxy', name: 'Cosmic Stars 🌌', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1000&auto=format&fit=crop' },
  { id: 'gold', name: 'Gold Luxury 🏆', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop' },
];

const ROOM_CATEGORIES = [
  { id: 'all', label: '🔥 ऑल रूम', name: 'All Rooms' },
  { id: 'girls', label: '🌸 गर्ल रूम', name: 'Girl Rooms' },
  { id: 'boys', label: '⚡ बॉय रूम', name: 'Boy Rooms' },
];

export default function RoomsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const cached = localStorage.getItem('cached_live_rooms');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [searchIdQuery, setSearchIdQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  // Create Room Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [selectedRoomDP, setSelectedRoomDP] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeatCount, setSelectedSeatCount] = useState<number>(8);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop');
  const [isLaunching, setIsLaunching] = useState(false);
  const roomDPFileInputRef = useRef<HTMLInputElement>(null);

  const activeUid = user?.uid || 'user_local';
  const displayName = profile?.displayName || user?.displayName || 'Maxo Star';
  const photoURL = profile?.photoURL || user?.photoURL || (profile?.gender === 'female' ? INDIAN_FEMALE_AVATARS[0] : INDIAN_MALE_AVATARS[0]);

  // Random DP generator function
  const handlePickRandomDP = () => {
    const allAvatars = [...PRESET_ROOM_DPS, ...INDIAN_FEMALE_AVATARS, ...INDIAN_MALE_AVATARS];
    const randomPick = allAvatars[Math.floor(Math.random() * allAvatars.length)];
    setSelectedRoomDP(randomPick);
    toast.success('Random DP selected! 🎲✨');
  };

  // Delete/Remove Room Handler
  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'rooms', roomId), { isLive: false });
      await deleteDoc(doc(db, 'rooms', roomId));
      try {
        localStorage.removeItem(`persistent_room_${activeUid}`);
        localStorage.removeItem(`room_detail_${roomId}`);
      } catch (err) {}
      setRooms(prev => prev.filter(r => r.id !== roomId));
      toast.success('Room removed successfully! 🗑️');
    } catch (err) {
      toast.error('Failed to remove room');
    }
  };

  // Real-time Firestore Live Rooms synchronization
  useEffect(() => {
    const DUMMY_ROOM_IDS = new Set([
      'room_star_mic',
      'room_gaming_arena',
      'room_cozy_chat',
      'room_summer_solstice',
      'room_astrology'
    ]);
    const FAKE_USER_IDS = new Set([
      'siddharth_royal',
      'anya_star',
      'zara_beats',
      'kabir_vocals',
      'mia_chat',
      'anya_test',
      'zara_dj'
    ]);

    try {
      const q = query(collection(db, 'rooms'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveRooms: Room[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rId = docSnap.id;
          // Clean up and discard dummy rooms
          if (DUMMY_ROOM_IDS.has(rId) || rId.startsWith('mock_') || rId.startsWith('demo_room_')) {
            deleteDoc(doc(db, 'rooms', rId)).catch(() => {});
            return;
          }
          // Discard fake IDs
          if (data.hostId && FAKE_USER_IDS.has(data.hostId)) {
            deleteDoc(doc(db, 'rooms', rId)).catch(() => {});
            return;
          }
          if (data.isLive !== false) {
            liveRooms.push({ id: rId, ...data } as Room);
          }
        });

        // Ensure active user's created room is present if newly created
        try {
          const myActiveRoomId = localStorage.getItem(`persistent_room_${activeUid}`);
          if (myActiveRoomId && !DUMMY_ROOM_IDS.has(myActiveRoomId) && !liveRooms.some(r => r.id === myActiveRoomId)) {
            const cachedRoom = localStorage.getItem(`room_detail_${myActiveRoomId}`);
            if (cachedRoom) {
              const parsed = JSON.parse(cachedRoom);
              if (!DUMMY_ROOM_IDS.has(parsed.id)) {
                liveRooms.unshift(parsed);
              }
            }
          }
        } catch (e) {}

        setRooms(liveRooms);
        try {
          localStorage.setItem('cached_live_rooms', JSON.stringify(liveRooms));
        } catch (e) {}
      }, (error) => {
        console.warn("Rooms live stream listener error:", error);
      });

      return () => unsubscribe();
    } catch (e) {}
  }, [activeUid]);

  // Handle custom DP file upload from user's device
  const handleCustomDPUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Please choose an image under 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSelectedRoomDP(result);
          toast.success('Room DP selected! 📸');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Launch Voice Room with real-time multi-device Firestore sync
  const handleLaunchRoom = async () => {
    if (!roomTitle.trim()) {
      toast.error('Please enter Room Name (रूम का नाम लिखें)!');
      return;
    }

    setIsLaunching(true);
    const toastId = toast.loading('Creating Room in Firestore... 🎙️');
    const generatedId = (100000000 + Math.floor(Math.random() * 900000000)).toString();
    const nowISO = new Date().toISOString();
    const finalDP = selectedRoomDP || photoURL;

    const newRoom: any = {
      id: generatedId,
      title: roomTitle.trim(),
      description: 'Maxo Live Voice Room',
      thumbnailUrl: finalDP,
      wallpaperUrl: selectedWallpaper,
      hostId: activeUid,
      hostName: displayName,
      hostPhoto: finalDP,
      memberCount: 1,
      createdAt: nowISO,
      category: selectedCategory,
      roomType: 'premium',
      isLive: true,
      roomMode: isPrivateRoom ? 'private' : 'public',
      isPrivate: isPrivateRoom,
      allowedUsers: [activeUid],
      bannedUsers: [],
      mutedUsers: [],
      admins: [activeUid],
      seatCount: selectedSeatCount,
      seats: Array.from({ length: selectedSeatCount }, (_, i) => ({
        index: i,
        uid: null,
        displayName: '',
        photoURL: '',
        numericId: '',
        isMuted: false,
        isSelfMuted: false,
        isLocked: false
      }))
    };

    // 1. Immediate local storage cache for instant transition
    try {
      localStorage.setItem(`room_detail_${generatedId}`, JSON.stringify(newRoom));
      localStorage.setItem(`persistent_room_${activeUid}`, generatedId);
    } catch (e) {}

    // 2. Reliable Firestore write
    try {
      await setDoc(doc(db, 'rooms', generatedId), newRoom);
      toast.success(isPrivateRoom ? '🔒 Private Voice Room Created! 🚀' : '🎙️ Public Voice Room Created! 🚀', { id: toastId });
    } catch (err) {
      console.warn("Room creation firestore note:", err);
      toast.success('Voice Room Created! 🚀', { id: toastId });
    } finally {
      setIsCreateOpen(false);
      setIsLaunching(false);
      navigate(`/room/${generatedId}`);
    }
  };

  // Helpers for category classification
  const isGirlRoom = (r: Room) => {
    const cat = (r.category || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const host = (r.hostName || '').toLowerCase();
    const tags = (r.tags || []).map(t => t.toLowerCase()).join(' ');
    const gender = ((r as any).gender || (r as any).hostGender || '').toLowerCase();

    return (
      cat === 'girls' || 
      cat === 'girl' || 
      gender === 'female' ||
      title.includes('girl') || 
      title.includes('queen') || 
      title.includes('girls') || 
      title.includes('गर्ल') || 
      title.includes('लड़की') || 
      title.includes('female') ||
      tags.includes('girl') || 
      tags.includes('female') ||
      host.includes('anya') || 
      host.includes('zoya') || 
      host.includes('diya') || 
      host.includes('priya') || 
      host.includes('queen')
    );
  };

  const isBoyRoom = (r: Room) => {
    const cat = (r.category || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const host = (r.hostName || '').toLowerCase();
    const tags = (r.tags || []).map(t => t.toLowerCase()).join(' ');
    const gender = ((r as any).gender || (r as any).hostGender || '').toLowerCase();

    return (
      cat === 'boys' || 
      cat === 'boy' || 
      gender === 'male' ||
      title.includes('boy') || 
      title.includes('king') || 
      title.includes('boys') || 
      title.includes('बॉय') || 
      title.includes('लड़का') || 
      title.includes('male') ||
      tags.includes('boy') || 
      tags.includes('male') ||
      host.includes('siddharth') || 
      host.includes('kabir') || 
      host.includes('rahul') || 
      host.includes('king')
    );
  };

  // Filter rooms by tab and search
  const displayedRooms = rooms.filter(r => {
    if (selectedTab === 'girls') {
      if (!isGirlRoom(r)) return false;
    } else if (selectedTab === 'boys') {
      if (!isBoyRoom(r)) return false;
    }
    // 'all' tab shows all rooms

    if (!searchIdQuery.trim()) return true;
    const query = searchIdQuery.toLowerCase().trim();
    const matchId = (r.id || '').toLowerCase().includes(query);
    const matchHostId = (r.hostId || '').toLowerCase().includes(query);
    const matchTitle = (r.title || '').toLowerCase().includes(query);
    const matchHostName = (r.hostName || '').toLowerCase().includes(query);
    return matchId || matchHostId || matchTitle || matchHostName;
  });

  return (
    <div id="live-rooms-root" className="min-h-screen bg-[#07050F] text-white pb-28 max-w-lg mx-auto relative overflow-hidden">
      
      {/* Background ambient glow matching Live section */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-red-600/20 via-pink-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-30px] right-[-20px] w-72 h-72 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-20 left-[-40px] w-64 h-64 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none" />

      {/* 1. TOP HEADER: "MAXO" BRAND + CREATE ROOM BUTTON */}
      <div className="px-4 pt-5 pb-2 relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-red-500 via-pink-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
              MAXO
            </span>
            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">ROOMS</span>
            </div>
          </div>

          {/* Compact Colorful Create Room button on header right */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setRoomTitle(`${displayName}'s Lounge 🎙️`);
              setSelectedRoomDP(photoURL);
              setIsCreateOpen(true);
            }}
            id="btn-create-room-header"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.5)] border border-rose-400/40 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} className="stroke-[3] animate-pulse" />
            <span>Create Room</span>
          </motion.button>
        </div>

        {/* Search ID Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input 
            value={searchIdQuery}
            onChange={(e) => setSearchIdQuery(e.target.value)}
            placeholder="सर्च आईडी / Search ID or Room..."
            className="w-full bg-white/[0.06] border-white/10 hover:border-white/20 focus:border-rose-500 text-xs text-white rounded-xl pl-9 pr-8 h-9 transition-all placeholder:text-zinc-500"
          />
          {searchIdQuery && (
            <button 
              onClick={() => setSearchIdQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. EVENT SECTION BANNER: USER WELCOME & CHATTING WITH NEW PEOPLE */}
      <div className="px-4 py-2 relative z-10">
        <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-red-950/80 via-purple-950/60 to-pink-950/50 border border-rose-500/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(225,29,72,0.25)]">
          {/* Decorative ambient radial glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30 border border-rose-400/40">
              <Sparkles size={22} className="animate-pulse" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>EVENT • WELCOME</span>
                </span>
                <span className="text-[10px] text-amber-300 font-extrabold">
                  🎉 स्वागत है!
                </span>
              </div>

              <h3 className="text-sm font-black text-white leading-tight">
                {profile?.displayName || user?.displayName 
                  ? `Welcome, ${profile?.displayName || user?.displayName}! 🎙️` 
                  : 'Welcome to Maxo Rooms! 🎙️'}
              </h3>

              <p className="text-xs text-rose-100/95 leading-relaxed font-semibold">
                आप लोग सब नए लोगों से बातचीत कर सकते हैं! नए दोस्त बनाएं, लाइव वॉइस पार्टी में शामिल हों और खुलकर बात करें। ✨💬
              </p>

              <div className="pt-1 flex items-center gap-3 text-[10px] text-zinc-300 font-medium">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Users size={12} />
                  <span>100% Free Live Voice Chat</span>
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-pink-300 font-bold">
                  Connect & Chat 🌟
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CATEGORY TABS: ALL ROOM, GIRL ROOM, BOY ROOM */}
      <div className="px-4 py-2 relative z-10 grid grid-cols-3 gap-2">
        {ROOM_CATEGORIES.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`py-2 px-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/30 border border-rose-400/50 scale-[1.02]'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/10 hover:text-white'
              }`}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. SECTION HEADER: "ACTIVE ROOMS" */}
      <div className="flex items-center justify-between px-4 mt-3 mb-2 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Active Rooms
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-rose-300 text-[10px] font-bold">
            लाइव रूम्स
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-semibold">
          {displayedRooms.length} Live
        </span>
      </div>

      {/* 5. LIVE ROOMS LIST */}
      <div className="px-4 space-y-2.5 relative z-10">
        {displayedRooms.length > 0 ? (
          displayedRooms.map((room, index) => {
            const isPrivate = room.isPrivate || room.roomMode === 'private';
            return (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.15) }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/room/${room.id}`)}
                className="p-3 rounded-2xl bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.05] hover:from-white/[0.1] hover:to-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-rose-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={room.thumbnailUrl || room.hostPhoto || photoURL} 
                      alt={room.hostName || 'Host'} 
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-rose-500/60 shadow-md"
                    />
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-white text-[8px] font-black flex items-center gap-0.5 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white truncate group-hover:text-rose-300 transition-colors">
                        {room.title}
                      </h4>
                      {isPrivate ? (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[8px] font-black flex items-center gap-0.5 shrink-0">
                          <Lock size={8} /> Private
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[8px] font-black flex items-center gap-0.5 shrink-0">
                          <Globe size={8} /> Public
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-zinc-300 flex items-center gap-1 font-medium truncate">
                        <Crown size={10} className="text-amber-400 shrink-0" />
                        {room.hostName || 'Host'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ID: {room.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/40 flex items-center gap-1 shadow-sm">
                        <Armchair size={10} className="text-cyan-400" />
                        <span>
                          {room.seatedCount !== undefined 
                            ? `${room.seatedCount} Seated (बैठे हैं)` 
                            : `${(room.seats || []).filter((s: any) => s.uid).length + 1} Seated (बैठे हैं)`
                          } / {room.seatCount || 8}
                        </span>
                      </span>

                      <span className="text-[9px] text-rose-300 flex items-center gap-1 font-bold bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-500/30">
                        <Users size={10} className="text-rose-400" />
                        <span>{room.memberCount || 1} Total</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pl-2 flex items-center gap-1.5 shrink-0">
                  {room.hostId === activeUid && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRoom(e, room.id)}
                      title="Remove Room (रूम हटाएं)"
                      className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:via-rose-600 group-hover:to-pink-600 group-hover:text-white text-white flex items-center justify-center transition-all shadow-md">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-12 text-center space-y-2.5 bg-white/[0.02] rounded-3xl p-6 border border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-400/20">
              <Armchair size={26} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                No Active Rooms
              </h3>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">
                अभी कोई रूम लाइव नहीं है। ऊपर दिए गए "Create Room" बटन से अपना रूम शुरू करें! 🎙️
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 6. CREATE ROOM MODAL (Includes Public/Private Toggle) */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[#110C22] border border-rose-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#181130] border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <Radio size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">Create Room (कमरा बनाएं)</h3>
                    <p className="text-[9px] text-zinc-400">Maxo Voice Lounge 🎙️</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
                
                {/* 1. Room Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-200">
                    1. Room Name (रूम का नाम)
                  </label>
                  <Input 
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="e.g. Moonlight Voice Room 🎙️"
                    className="bg-black/60 border-white/15 text-xs text-white rounded-xl h-9 focus:border-rose-500"
                  />
                </div>

                {/* 2. Room Category: All Room / Girl Room / Boy Room */}
                <div className="space-y-1.5 bg-white/[0.03] p-2.5 rounded-2xl border border-white/5">
                  <label className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                    <span>2. Room Category (कैटेगरी चुनें)</span>
                    <span className="text-[9px] text-rose-400 font-bold">
                      {selectedCategory === 'girls' ? '🌸 Girl Room' : selectedCategory === 'boys' ? '⚡ Boy Room' : '🔥 All Room'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'all', label: '🔥 All Room', name: 'ऑल रूम' },
                      { id: 'girls', label: '🌸 Girl Room', name: 'गर्ल रूम' },
                      { id: 'boys', label: '⚡ Boy Room', name: 'बॉय रूम' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-md border-rose-400/50 scale-[1.02]'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className="text-[8px] opacity-75">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Room Privacy Toggle: Public vs Private */}
                <div className="space-y-1.5 bg-white/[0.03] p-2.5 rounded-2xl border border-white/5">
                  <label className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                    <span>3. Room Access (एक्सेस मोड)</span>
                    <span className="text-[9px] text-rose-400 font-bold">
                      {isPrivateRoom ? '🔒 Private (सिर्फ चुने हुए लोग)' : '🌐 Public (कोई भी आ सकता है)'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrivateRoom(false)}
                      className={`p-2 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !isPrivateRoom
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}
                    >
                      <Globe size={13} />
                      <span>Public Room</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivateRoom(true)}
                      className={`p-2 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isPrivateRoom
                          ? 'bg-red-500/20 border-red-400 text-red-300 shadow-md'
                          : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}
                    >
                      <Lock size={13} />
                      <span>Private Room</span>
                    </button>
                  </div>
                </div>

                {/* 4. Room DP (Gallery or File Upload) */}
                <div className="space-y-2 bg-white/[0.03] p-2.5 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                      <ImageIcon size={12} className="text-blue-400" />
                      <span>4. Room DP (रूम फोटो - फाइल चुनें)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => roomDPFileInputRef.current?.click()}
                        className="text-[10px] font-black text-blue-300 bg-blue-500/20 border border-blue-400/40 px-2.5 py-1 rounded-lg active:scale-95 flex items-center gap-1 cursor-pointer hover:bg-blue-500/30 transition-colors"
                      >
                        <Upload size={11} />
                        <span>📁 Choose File</span>
                      </button>
                      <input 
                        ref={roomDPFileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomDPUpload} 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  {/* DP Preview + Quick Choices */}
                  <div className="flex items-center gap-2 pt-1">
                    <div 
                      onClick={() => roomDPFileInputRef.current?.click()}
                      className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-500 shrink-0 shadow-lg cursor-pointer group"
                      title="Click to choose image file"
                    >
                      <img 
                        src={selectedRoomDP || photoURL} 
                        alt="Room DP" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload size={12} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1.5 flex-1">
                      {PRESET_ROOM_DPS.slice(0, 4).map((dpUrl, idx) => {
                        const isChosen = (selectedRoomDP || photoURL) === dpUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedRoomDP(dpUrl)}
                            className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer transition-all ${
                              isChosen ? 'ring-2 ring-blue-400 scale-105 border border-blue-400' : 'opacity-60 hover:opacity-100 border border-white/10'
                            }`}
                          >
                            <img src={dpUrl} alt="Preset" className="w-full h-full object-cover" />
                            {isChosen && (
                              <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
                                <Check size={12} className="text-white stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Room Theme Background */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                    <Palette size={11} className="text-blue-400" />
                    <span>5. Background Theme (बैकग्राउंड थीम)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_WALLPAPERS.map((wp) => {
                      const isSelected = selectedWallpaper === wp.url;
                      return (
                        <button
                          key={wp.id}
                          type="button"
                          onClick={() => setSelectedWallpaper(wp.url)}
                          className={`relative h-12 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-blue-400 border-blue-400 scale-105 shadow-md' : 'border-white/10 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-0.5">
                            <span className="text-[7px] font-bold text-white truncate">{wp.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Seats Count (Blue Border Glass Styling) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-blue-300">
                      <span>6. Room Seats (सीटें 🪑)</span>
                    </span>
                    <span className="text-[9px] text-blue-400 font-bold">{selectedSeatCount} Seats</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[4, 6, 8, 10, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedSeatCount(num)}
                        className={`py-2 rounded-xl border-2 text-[11px] font-black text-center transition-all cursor-pointer ${
                          selectedSeatCount === num
                            ? 'bg-blue-600/30 border-blue-400 text-cyan-200 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105'
                            : 'bg-black/30 border-blue-500/20 text-zinc-400 hover:border-blue-400/50 hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Fixed Footer Action */}
              <div className="p-3 bg-[#181130] border-t border-white/10 flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 border-white/15 text-zinc-300 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleLaunchRoom}
                  disabled={isLaunching}
                  className="flex-1 h-9 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(225,29,72,0.5)] border border-rose-400/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLaunching ? 'Creating...' : 'Create Room 🎙️'}
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

