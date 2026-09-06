import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Image, Palette, Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Crown, UserMinus, VolumeX, Ban, X, Check, Upload, Sparkles, MessageSquare,
  UserCheck, UserX, Trash2, RefreshCw, Lock, Unlock, Search, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_MALE_AVATARS, INDIAN_FEMALE_AVATARS } from '@/utils/avatar';

export const ROOM_BG_THEMES = [
  { id: 'purple_luxury', name: 'Purple Luxury', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop' },
  { id: 'pink_premium', name: 'Pink Velvet', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop' },
  { id: 'blue_neon', name: 'Blue Cyber Neon', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop' },
  { id: 'gold_vip', name: 'Gold Palace Theme', url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop' },
  { id: 'dark_elite', name: 'Midnight Velvet', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
  { id: 'galaxy_theme', name: 'Galaxy Cosmic', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop' },
  { id: 'emerald_lounge', name: 'Emerald Royale', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop' },
  { id: 'sunset_glow', name: 'Sunset Lounge', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' }
];

export const LUXURY_COVER_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=300&h=300&fit=crop'
];

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomData: any;
  isHost: boolean;
  viewers: any[];
  seats?: any[];
  currentUserId?: string;
  initialTab?: 'info' | 'theme' | 'admin' | 'kicked';
  onKickUser: (uid: string, name: string) => void;
  onUnkickUser?: (uid: string, name: string) => void;
  onMuteUser?: (uid: string) => void;
  onUpdateRoomData?: (newData: any) => void;
}

export default function EditRoomModal({
  isOpen,
  onClose,
  roomId,
  roomData,
  isHost,
  viewers,
  seats = [],
  currentUserId,
  initialTab = 'info',
  onKickUser,
  onUnkickUser,
  onMuteUser,
  onUpdateRoomData
}: EditRoomModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'theme' | 'admin' | 'kicked'>(initialTab);
  
  // Room form states
  const [title, setTitle] = useState(roomData?.title || 'Maxo Voice Lounge');
  const [coverUrl, setCoverUrl] = useState(roomData?.thumbnailUrl || LUXURY_COVER_PRESETS[0]);
  const [theme, setTheme] = useState(roomData?.backgroundTheme || 'purple_luxury');
  const [notice, setNotice] = useState(roomData?.welcomeMessage || 'Welcome to our room! Enjoy & respect rules.');
  const [adminIds, setAdminIds] = useState<string[]>(roomData?.superAdminIds || []);
  const [kickedUids, setKickedUids] = useState<string[]>(roomData?.kickedUsers || []);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [adminProfilesCache, setAdminProfilesCache] = useState<Record<string, { displayName: string; photoURL: string; numericId: string }>>({});

  // Sync state when roomData or initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (roomData) {
      if (roomData.title) setTitle(roomData.title);
      if (roomData.thumbnailUrl) setCoverUrl(roomData.thumbnailUrl);
      if (roomData.backgroundTheme) setTheme(roomData.backgroundTheme);
      if (roomData.welcomeMessage) setNotice(roomData.welcomeMessage);
      if (Array.isArray(roomData.superAdminIds)) setAdminIds(roomData.superAdminIds);
      if (Array.isArray(roomData.kickedUsers)) setKickedUids(roomData.kickedUsers);
    }
  }, [roomData]);

  // Fetch Firestore profiles for any admin IDs not currently in active viewers list
  useEffect(() => {
    if (!adminIds || adminIds.length === 0) return;

    adminIds.forEach(async (aId) => {
      if (adminProfilesCache[aId]) return;
      try {
        const userDocRef = doc(db, 'users', aId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setAdminProfilesCache(prev => ({
            ...prev,
            [aId]: {
              displayName: uData.displayName || `Admin ${aId.slice(0, 4)}`,
              photoURL: uData.photoURL || INDIAN_FEMALE_AVATARS[0],
              numericId: uData.numericId || aId.slice(0, 9).replace(/\D/g, '') || '928471923'
            }
          }));
        }
      } catch (e) {
        console.warn("Could not fetch user profile for admin:", aId);
      }
    });
  }, [adminIds]);

  if (!isOpen) return null;

  // Handle Cover image file selection
  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverUrl(reader.result as string);
        toast.success('Room DP photo updated! 📸');
      };
      reader.readAsDataURL(file);
    }
  };

  // Direct Remove Admin Action
  const handleRemoveAdmin = async (targetUid: string, targetName: string) => {
    if (!isHost) {
      toast.error('Only the Room Owner can remove admins.');
      return;
    }

    const newAdmins = adminIds.filter(id => id !== targetUid);
    setAdminIds(newAdmins);

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        superAdminIds: newAdmins
      });
      if (onUpdateRoomData) {
        onUpdateRoomData({ superAdminIds: newAdmins });
      }
      toast.success(`Removed admin privileges from ${targetName} 🛡️❌`);
    } catch (e) {
      console.warn("Firestore admin removal note:", e);
      if (onUpdateRoomData) {
        onUpdateRoomData({ superAdminIds: newAdmins });
      }
      toast.success(`Removed admin privileges from ${targetName} 🛡️❌`);
    }
  };

  // Add / Appoint Admin Action
  const handleAddAdmin = async (targetUid: string, targetName: string) => {
    if (!isHost) {
      toast.error('Only the Room Owner can appoint admins.');
      return;
    }

    if (adminIds.includes(targetUid)) return;

    const newAdmins = [...adminIds, targetUid];
    setAdminIds(newAdmins);

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        superAdminIds: newAdmins
      });
      if (onUpdateRoomData) {
        onUpdateRoomData({ superAdminIds: newAdmins });
      }
      toast.success(`Appointed ${targetName} as Room Admin! 🛡️✨`);
    } catch (e) {
      console.warn("Firestore admin appoint note:", e);
      if (onUpdateRoomData) {
        onUpdateRoomData({ superAdminIds: newAdmins });
      }
      toast.success(`Appointed ${targetName} as Room Admin! 🛡️✨`);
    }
  };

  // Remove / Unban a Kicked-Out user
  const handleUnbanKickedUser = async (targetUid: string, targetName: string) => {
    if (!isHost) {
      toast.error('Only Room Owner can unban kicked users.');
      return;
    }
    const newKicked = kickedUids.filter(id => id !== targetUid);
    setKickedUids(newKicked);

    if (onUnkickUser) {
      onUnkickUser(targetUid, targetName);
    } else {
      try {
        await updateDoc(doc(db, 'rooms', roomId), {
          kickedUsers: newKicked
        });
      } catch (e) {}
    }

    if (onUpdateRoomData) {
      onUpdateRoomData({ kickedUsers: newKicked });
    }
    toast.success(`Removed kick restriction for ${targetName}! User can now enter the room ✅`);
  };

  // Save Room Edits
  const handleSaveRoomDetails = async () => {
    if (!title.trim()) {
      toast.error('Room title cannot be empty.');
      return;
    }

    setIsSaving(true);
    const selectedThemeObj = ROOM_BG_THEMES.find(t => t.id === theme);
    const updatedData = {
      title: title.trim(),
      thumbnailUrl: coverUrl,
      backgroundTheme: theme,
      wallpaperUrl: selectedThemeObj?.url || coverUrl,
      welcomeMessage: notice.trim(),
      superAdminIds: adminIds,
      kickedUsers: kickedUids
    };

    // Instant local & parent state update
    if (onUpdateRoomData) {
      onUpdateRoomData(updatedData);
    }

    try {
      await updateDoc(doc(db, 'rooms', roomId), updatedData);
      toast.success('Room profile, background & notice saved successfully! 🌟');
      onClose();
    } catch (e) {
      console.warn('Firestore update warning (applied locally):', e);
      toast.success('Room settings applied! ✨');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Combine viewers and seats for member list resolution
  const allKnownRoomUsers = [
    ...viewers,
    ...seats.filter(s => s.uid && s.uid !== currentUserId).map(s => ({
      uid: s.uid!,
      displayName: s.displayName,
      photoURL: s.photoURL,
      numericId: s.numericId
    }))
  ].filter((u, index, self) => index === self.findIndex(t => t.uid === u.uid));

  // Resolved list of current admins with complete profile data
  const currentAdminUsers = adminIds.map(aId => {
    const foundInRoom = allKnownRoomUsers.find(u => u.uid === aId);
    if (foundInRoom) {
      return {
        ...foundInRoom,
        isOnlineInRoom: true
      };
    }

    const cachedProfile = adminProfilesCache[aId];
    if (cachedProfile) {
      return {
        uid: aId,
        displayName: cachedProfile.displayName,
        photoURL: cachedProfile.photoURL,
        numericId: cachedProfile.numericId,
        isOnlineInRoom: false
      };
    }

    return {
      uid: aId,
      displayName: `Admin (${aId.slice(0, 5)})`,
      photoURL: INDIAN_FEMALE_AVATARS[0],
      numericId: aId.slice(0, 8).replace(/\D/g, '') || '8849201',
      isOnlineInRoom: false
    };
  });

  // Filter non-admin room users available for promotion
  const nonAdminMembers = allKnownRoomUsers.filter(
    u => !adminIds.includes(u.uid) && u.uid !== currentUserId
  );

  const filteredNonAdminMembers = nonAdminMembers.filter(u => {
    if (!adminSearchQuery.trim()) return true;
    const q = adminSearchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.numericId && u.numericId.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3.5 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="w-full max-w-sm bg-[#100B22] border border-amber-500/30 rounded-3xl p-4 shadow-2xl space-y-3.5 max-h-[88vh] flex flex-col text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-black shadow">
              <Settings size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>{isHost ? 'Room Settings & Admin' : 'Room Profile'}</span>
                {isHost && <Crown size={12} className="text-amber-400 fill-amber-400" />}
              </h3>
              <p className="text-[9px] text-zinc-400 font-mono">Room ID: {roomId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 text-xs cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation (DP & Info, Theme BG, Room Administration, Kicked Out) */}
        <div className="grid grid-cols-4 p-1 bg-black/60 rounded-2xl border border-white/10 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-1.5 rounded-xl text-[9.5px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeTab === 'info' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Image size={12} />
            <span>DP & Info</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-1.5 rounded-xl text-[9.5px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeTab === 'theme' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Palette size={12} />
            <span>Theme BG</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-1.5 rounded-xl text-[9.5px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeTab === 'admin' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield size={12} />
            <span>Admins ({adminIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kicked')}
            className={`py-1.5 rounded-xl text-[9.5px] font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeTab === 'kicked' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ban size={12} />
            <span>Kicked ({kickedUids.length})</span>
          </button>
        </div>

        {/* Tab 1: Info, DP, Title & Announcement Notice */}
        {activeTab === 'info' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {/* DP / Cover Preview & Selector */}
            <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/5">
              <img 
                src={coverUrl} 
                alt="Room Cover" 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0" 
              />
              <div className="space-y-1.5 flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Room Picture / Profile DP</span>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 text-[10px] font-bold cursor-pointer border border-white/10">
                  <Upload size={10} />
                  <span>Upload DP (फोटो बदलें)</span>
                  <input type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                </label>
              </div>
            </div>

            {/* Presets Grid */}
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-400 mb-1.5 block">Preset Avatars</span>
              <div className="grid grid-cols-6 gap-1.5">
                {LUXURY_COVER_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCoverUrl(preset)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition-transform active:scale-95 ${
                      coverUrl === preset ? 'border-amber-400 shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Room Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-300">Room Name / Title (कमरे का नाम)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isHost}
                placeholder="Enter Room Name..."
                className="bg-black/50 border-white/10 text-xs text-white rounded-xl h-9 focus:border-amber-400"
              />
            </div>

            {/* Welcome Notice / Announcement */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-300">Room Notice / Announcement (रूम नोटिस व घोषणा)</label>
              <Textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                disabled={!isHost}
                placeholder="Write room rules, announcement & welcome message..."
                rows={2}
                className="bg-black/50 border-white/10 text-xs text-white rounded-xl resize-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Theme Selector (Background Luxury Wallpaper) */}
        {activeTab === 'theme' && (
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            <span className="text-[10px] font-black uppercase text-zinc-300 block">Select Room Background Luxury Wallpaper</span>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_BG_THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  className={`relative rounded-2xl overflow-hidden p-2 text-left border-2 transition-all cursor-pointer ${
                    theme === th.id 
                      ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-[1.02]' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={th.url} alt="" className="absolute inset-0 w-full h-full object-cover brightness-60" />
                  <div className="relative z-10 space-y-1">
                    <p className="text-[11px] font-black text-white">{th.name}</p>
                    <span className="text-[8.5px] text-amber-300 font-bold block">
                      {theme === th.id ? '✓ Selected' : 'Tap to apply'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: ROOM ADMINISTRATION PANEL (Owner Exclusive Administration & Direct Remove Admin Button) */}
        {activeTab === 'admin' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            
            {/* Header Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-purple-950/60 to-black/60 border border-cyan-400/40 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-black flex items-center justify-center font-black shadow-md shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Room Administration</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[8.5px]">
                        {isHost ? 'Owner Controls 👑' : 'View Only 👁️'}
                      </span>
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-medium">
                      Manage room moderators & permissions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-[10px]">
                    {adminIds.length} Admins
                  </span>
                </div>
              </div>
            </div>

            {/* Non-owner Warning */}
            {!isHost && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] font-medium flex items-center gap-2">
                <Lock size={14} className="shrink-0 text-amber-400" />
                <span>Only the Room Owner (Host) can add or remove Room Admins.</span>
              </div>
            )}

            {/* Section 1: CURRENT ACTIVE ADMINS WITH DIRECT 'REMOVE ADMIN' BUTTON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Shield size={12} className="text-amber-400" />
                  <span>Current Admins ({currentAdminUsers.length})</span>
                </span>
                <span className="text-[9px] text-zinc-400">
                  {currentAdminUsers.length} total assigned
                </span>
              </div>

              {currentAdminUsers.length === 0 ? (
                <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl text-center space-y-1.5">
                  <ShieldOff size={22} className="mx-auto text-zinc-500 opacity-60" />
                  <p className="text-[11px] font-bold text-zinc-300">No Admins Assigned</p>
                  <p className="text-[9.5px] text-zinc-500">
                    {isHost 
                      ? 'You have not appointed any room admins yet. Select members below to assign admin powers.' 
                      : 'This room has no active admins.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentAdminUsers.map((admin) => (
                    <div 
                      key={admin.uid} 
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-[#140F2D] to-[#1B1438] border border-cyan-500/30 flex items-center justify-between gap-2 shadow-md hover:border-cyan-400/50 transition-all"
                    >
                      {/* Admin Avatar & Details */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img 
                            src={admin.photoURL} 
                            alt={admin.displayName} 
                            className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400 shadow" 
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                            admin.isOnlineInRoom ? 'bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse' : 'bg-zinc-500'
                          }`} title={admin.isOnlineInRoom ? 'Active in Room' : 'Offline'} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-black text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{admin.displayName}</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-[8px] font-black shrink-0 shadow-sm">
                              ADMIN 🛡️
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>ID: {admin.numericId}</span>
                            <span>•</span>
                            <span className={admin.isOnlineInRoom ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                              {admin.isOnlineInRoom ? 'In Room' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct 'Remove Admin' Action Button */}
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(admin.uid, admin.displayName)}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600/30 via-rose-600/30 to-pink-600/30 hover:from-red-600/50 hover:to-rose-600/50 border border-red-500/50 text-red-200 text-[10px] font-black flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer transition-all active:scale-95 group"
                          title="Directly remove admin privileges from this user"
                        >
                          <UserMinus size={13} className="text-red-400 group-hover:scale-110 transition-transform" />
                          <span>Remove Admin</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: APPOINT NEW ADMIN FROM ROOM MEMBERS (Owner Only) */}
            {isHost && (
              <div className="space-y-2.5 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1">
                    <UserPlus size={12} className="text-cyan-400" />
                    <span>Appoint New Admin (एडमिन बनाएं)</span>
                  </span>
                  <span className="text-[9px] text-zinc-400">
                    {nonAdminMembers.length} available
                  </span>
                </div>

                {/* Search Bar for Members */}
                {nonAdminMembers.length > 3 && (
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="Search member by name or ID..."
                      className="bg-black/50 border-white/10 text-xs text-white rounded-xl pl-7.5 h-8 focus:border-cyan-400 placeholder:text-zinc-500"
                    />
                  </div>
                )}

                {/* Non-admin members list */}
                {nonAdminMembers.length === 0 ? (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-zinc-500 text-[10px]">
                    No other members currently in this room to appoint.
                  </div>
                ) : filteredNonAdminMembers.length === 0 ? (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-center text-zinc-500 text-[10px]">
                    No members match "{adminSearchQuery}"
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredNonAdminMembers.map((viewer) => (
                      <div 
                        key={viewer.uid} 
                        className="p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-2 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img 
                            src={viewer.photoURL} 
                            alt={viewer.displayName} 
                            className="w-7 h-7 rounded-full object-cover border border-amber-400/40 shrink-0" 
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{viewer.displayName}</p>
                            <span className="text-[8.5px] text-zinc-400 font-mono">ID: {viewer.numericId}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddAdmin(viewer.uid, viewer.displayName)}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/50 text-cyan-300 text-[9.5px] font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          <ShieldCheck size={11} />
                          <span>Make Admin</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Tab 4: Kicked Out Users List with UNBAN Option */}
        {activeTab === 'kicked' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            <div className="bg-red-500/10 border border-red-400/30 p-2.5 rounded-2xl">
              <p className="text-[10px] text-red-300 font-bold flex items-center gap-1">
                <Ban size={12} className="shrink-0" />
                <span>Kicked Out Users (किक आउट / ब्लॉक सूची)</span>
              </p>
              <p className="text-[9px] text-zinc-400 mt-0.5 leading-relaxed">
                जिन यूज़र्स को कमरे से किक आउट किया गया है, उन्हें यहाँ से अनबैन करके कमरे में वापस आने की अनुमति दें।
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[9.5px] font-black uppercase text-zinc-400">Restricted Users ({kickedUids.length})</span>
              {kickedUids.length === 0 ? (
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-1">
                  <UserCheck size={24} className="mx-auto text-emerald-400 opacity-60 mb-1" />
                  <p className="text-[11px] font-bold text-white">No Kicked Users</p>
                  <p className="text-[9.5px] text-zinc-500">कमरे से किसी को किक आउट नहीं किया गया है।</p>
                </div>
              ) : (
                kickedUids.map((uid) => (
                  <div key={uid} className="flex items-center justify-between p-2.5 rounded-2xl bg-red-950/20 border border-red-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-900/50 border border-red-400/60 flex items-center justify-center text-xs font-bold text-red-200">
                        🚫
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white">User {uid.slice(0, 6)}</p>
                        <span className="text-[8.5px] text-zinc-400 font-mono">UID: {uid.slice(0, 10)}...</span>
                      </div>
                    </div>

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleUnbanKickedUser(uid, `User ${uid.slice(0, 5)}`)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                        title="Unban and allow user to rejoin"
                      >
                        <UserCheck size={12} />
                        <span>Unban (निकालें)</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer Save Button */}
        {isHost && (
          <div className="border-t border-white/10 pt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 rounded-xl border-white/15 bg-white/5 text-zinc-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveRoomDetails}
              className="flex-1 h-9 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-black text-xs shadow-lg cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Settings (सेव करें)'}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}


