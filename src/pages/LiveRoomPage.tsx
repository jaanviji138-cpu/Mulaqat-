import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { 
  doc, updateDoc, onSnapshot, collection, addDoc, 
  query, orderBy, limit, increment, arrayUnion, arrayRemove, setDoc 
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, Gift, Send, Radio,
  RefreshCw, Volume2, VolumeX, Sparkles, Crown,
  Eye, Users, Lock, Globe, UserPlus, Plus, Search, 
  ChevronLeft, ChevronDown, Maximize2, Mic, MicOff, UserMinus, ShieldAlert, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';

interface StreamComment {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isGift?: boolean;
  giftIcon?: string;
  isSystem?: boolean;
  isEntry?: boolean;
}

interface FloatingHeart {
  id: number;
  x: number;
  color: string;
  size: number;
}

interface LiveViewer {
  uid: string;
  displayName: string;
  photoURL: string;
  joinedAt?: string;
  numericId?: string;
}

export interface LiveSeat {
  index: number;
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
  isMuted: boolean;
  isLocked: boolean;
}

const GIFTS_LIST = [
  { id: 'rose', name: 'Rose', icon: '🌹', cost: 10 },
  { id: 'heart', name: 'Heart Sparkle', icon: '💖', cost: 50 },
  { id: 'dj', name: 'DJ Sound', icon: '🎧', cost: 200 },
  { id: 'car', name: 'Sports Car', icon: '🏎️', cost: 1000 },
  { id: 'crown', name: 'Royal Crown', icon: '👑', cost: 5000 },
  { id: 'rocket', name: 'Star Rocket', icon: '🚀', cost: 20000 },
];

export default function LiveRoomPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [streamData, setStreamData] = useState<any>(null);
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [viewersList, setViewersList] = useState<LiveViewer[]>([]);
  const [diamondsCount, setDiamondsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Host camera controls
  const [isHost, setIsHost] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // 4 to 5 Live Guest Seats
  const [guestSeats, setGuestSeats] = useState<LiveSeat[]>([
    { index: 0, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
    { index: 1, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
    { index: 2, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false },
    { index: 3, uid: null, displayName: null, photoURL: null, isMuted: false, isLocked: false }
  ]);

  // Guest Seat Action Modal
  const [selectedSeat, setSelectedSeat] = useState<LiveSeat | null>(null);
  const [showSeatActionModal, setShowSeatActionModal] = useState(false);
  const [showInviteToSeatModal, setShowInviteToSeatModal] = useState(false);

  // Private Mode & Allowed Users Management
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Modals & Announcements
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [activeEntryBanner, setActiveEntryBanner] = useState<string | null>(null);

  // Minimize Live (Floating PiP) state
  const [isMinimized, setIsMinimized] = useState(false);

  // Floating hearts
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Gift animation banner
  const [activeGiftBanner, setActiveGiftBanner] = useState<{ sender: string; gift: any } | null>(null);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const currentDisplayName = profile?.displayName || user?.displayName || 'Maxo User';
  const currentAvatar = profile?.photoURL || user?.photoURL || getPremiumAvatar(user?.uid || 'user');
  const currentNumericId = profile?.numericId || user?.uid?.slice(0, 9).replace(/\D/g, '') || '102938475';

  // Load stream data & listen to real-time changes
  useEffect(() => {
    if (!streamId) return;

    const streamDocRef = doc(db, 'live_streams', streamId);

    const unsubscribe = onSnapshot(streamDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStreamData(data);
        const hostUser = user?.uid === data.hostId;
        setIsHost(hostUser);
        setDiamondsCount(data.diamondsEarned || 0);
        setViewerCount(data.viewerCount || 1);
        if (data.viewers && Array.isArray(data.viewers)) {
          setViewersList(data.viewers);
        }
        if (data.guestSeats && Array.isArray(data.guestSeats)) {
          setGuestSeats(data.guestSeats);
        }
      }
    }, (err) => {
      console.warn('Live stream snapshot error:', err);
    });

    // Real-time comments listener
    const commentsQ = query(
      collection(db, 'live_streams', streamId, 'comments'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const commentsUnsub = onSnapshot(commentsQ, (snapshot) => {
      const liveComments: StreamComment[] = [];
      snapshot.forEach((d) => {
        liveComments.push({ id: d.id, ...d.data() } as StreamComment);
      });
      setComments(liveComments);
    }, (err) => {
      console.warn("Live room comments snapshot note:", err);
    });

    // Register user entry in viewer list if viewer
    if (user && streamId) {
      const viewerEntry: LiveViewer = {
        uid: user.uid,
        displayName: currentDisplayName,
        photoURL: currentAvatar,
        numericId: currentNumericId,
        joinedAt: new Date().toISOString()
      };

      updateDoc(streamDocRef, {
        viewerCount: increment(1),
        viewers: arrayUnion(viewerEntry)
      }).catch(() => {});

      // Trigger user entry banner & comment
      setActiveEntryBanner(currentDisplayName);
      setTimeout(() => setActiveEntryBanner(null), 3500);

      addDoc(collection(db, 'live_streams', streamId, 'comments'), {
        senderName: 'MAXO LIVE',
        senderAvatar: '',
        text: `🌟 ${currentDisplayName} entered the live stream!`,
        isSystem: true,
        isEntry: true,
        timestamp: new Date().toISOString()
      }).catch(() => {});
    }

    return () => {
      unsubscribe();
      commentsUnsub();
      if (user && streamId) {
        updateDoc(streamDocRef, {
          viewerCount: increment(-1)
        }).catch(() => {});
      }
    };
  }, [streamId, user?.uid]);

  // Host camera capture
  useEffect(() => {
    if (!isHost) return;

    const startHostCamera = async () => {
      try {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
        localStreamRef.current = stream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          await videoElementRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Camera fallback in live room:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = fallbackStream;
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = fallbackStream;
            await videoElementRef.current.play().catch(() => {});
          }
        } catch (e) {
          toast.error('Camera access interrupted. Check browser permissions.');
        }
      }
    };

    startHostCamera();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isHost, facingMode]);

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    toast.info('Flipping camera... 🔄');
  };

  // Toggle Mic
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicMuted;
      });
      setIsMicMuted(!isMicMuted);
      toast.success(!isMicMuted ? 'Microphone Muted 🔇' : 'Microphone Live 🎙️');
    }
  };

  // Toggle Public / Private Mode for Host
  const handleToggleRoomPrivacy = async (toPrivate: boolean) => {
    if (!isHost || !streamId) return;
    try {
      const allowed = streamData?.allowedUsers?.length ? streamData.allowedUsers : [user?.uid];
      await updateDoc(doc(db, 'live_streams', streamId), {
        isPrivate: toPrivate,
        roomMode: toPrivate ? 'private' : 'public',
        allowedUsers: allowed
      });
      setStreamData((prev: any) => ({ ...prev, isPrivate: toPrivate, roomMode: toPrivate ? 'private' : 'public', allowedUsers: allowed }));
      toast.success(toPrivate ? '🔒 Stream is now Private (प्राइवेट मोड सक्रिय)' : '🌐 Stream is now Public (पब्लिक मोड सक्रिय)');
      if (toPrivate) {
        setShowAddUsersModal(true);
      }
    } catch (e) {
      toast.error('Failed to change room privacy.');
    }
  };

  // Host: Add user to Allowed Private List
  const handleAddUserToPrivateLive = async (targetUid: string, targetName: string) => {
    if (!isHost || !streamId) return;
    try {
      await updateDoc(doc(db, 'live_streams', streamId), {
        allowedUsers: arrayUnion(targetUid)
      });
      setStreamData((prev: any) => ({
        ...prev,
        allowedUsers: [...(prev.allowedUsers || []), targetUid]
      }));

      // Broadcast entry message
      addDoc(collection(db, 'live_streams', streamId, 'comments'), {
        senderName: 'MAXO HOST 👑',
        senderAvatar: '',
        text: `✨ ${targetName} was granted access to this Private Live!`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }).catch(() => {});

      toast.success(`✅ ${targetName} added to Private Live!`);
    } catch (e) {
      toast.error('Failed to add user.');
    }
  };

  // Host: Remove user from Allowed Private List
  const handleRemoveUserFromPrivateLive = async (targetUid: string, targetName: string) => {
    if (!isHost || !streamId) return;
    try {
      await updateDoc(doc(db, 'live_streams', streamId), {
        allowedUsers: arrayRemove(targetUid)
      });
      setStreamData((prev: any) => ({
        ...prev,
        allowedUsers: (prev.allowedUsers || []).filter((id: string) => id !== targetUid)
      }));
      toast.info(`🚫 Removed ${targetName} from Private Live.`);
    } catch (e) {
      toast.error('Failed to remove user.');
    }
  };

  // Viewer: Request access to private room
  const handleRequestPrivateAccess = async () => {
    if (!user || !streamId) return;
    try {
      await addDoc(collection(db, 'live_streams', streamId, 'comments'), {
        senderName: currentDisplayName,
        senderAvatar: currentAvatar,
        text: `🙋‍♂️ Requesting access to join this Private Live Room!`,
        isSystem: true,
        timestamp: new Date().toISOString()
      });
      toast.success('Access request sent to Host! 📩');
    } catch (e) {
      toast.info('Request submitted.');
    }
  };

  // SEAT MANAGEMENT (Host Invite, Mute, Kick out)
  const handleSeatClick = (seat: LiveSeat) => {
    setSelectedSeat(seat);
    if (isHost) {
      if (seat.uid) {
        setShowSeatActionModal(true);
      } else {
        setShowInviteToSeatModal(true);
      }
    } else {
      // Viewer clicks seat
      if (!seat.uid) {
        toast.info('Seat request sent to Host! 🎙️');
        if (streamId) {
          addDoc(collection(db, 'live_streams', streamId, 'comments'), {
            senderName: currentDisplayName,
            senderAvatar: currentAvatar,
            text: `🎙️ Requested to sit on Guest Seat ${seat.index + 1}!`,
            isSystem: true,
            timestamp: new Date().toISOString()
          }).catch(() => {});
        }
      }
    }
  };

  // Host: Invite user to seat
  const handleInviteUserToSeat = async (targetViewer: LiveViewer) => {
    if (!isHost || !selectedSeat || !streamId) return;
    try {
      const updatedSeats = guestSeats.map(s => {
        if (s.index === selectedSeat.index) {
          return {
            ...s,
            uid: targetViewer.uid,
            displayName: targetViewer.displayName,
            photoURL: targetViewer.photoURL || getPremiumAvatar(targetViewer.uid),
            isMuted: false
          };
        }
        return s;
      });

      setGuestSeats(updatedSeats);
      setShowInviteToSeatModal(false);

      await updateDoc(doc(db, 'live_streams', streamId), {
        guestSeats: updatedSeats
      });

      addDoc(collection(db, 'live_streams', streamId, 'comments'), {
        senderName: 'HOST 👑',
        senderAvatar: '',
        text: `🎙️ ${targetViewer.displayName} is now on Guest Seat ${selectedSeat.index + 1}!`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }).catch(() => {});

      toast.success(`Seated ${targetViewer.displayName} on Seat ${selectedSeat.index + 1}! ✨`);
    } catch (e) {
      toast.error('Failed to seat user.');
    }
  };

  // Host: Kick out / Remove user from seat
  const handleKickOutFromSeat = async () => {
    if (!isHost || !selectedSeat || !streamId) return;
    try {
      const guestName = selectedSeat.displayName || 'Guest';
      const updatedSeats = guestSeats.map(s => {
        if (s.index === selectedSeat.index) {
          return { ...s, uid: null, displayName: null, photoURL: null, isMuted: false };
        }
        return s;
      });

      setGuestSeats(updatedSeats);
      setShowSeatActionModal(false);

      await updateDoc(doc(db, 'live_streams', streamId), {
        guestSeats: updatedSeats
      });

      addDoc(collection(db, 'live_streams', streamId, 'comments'), {
        senderName: 'HOST 👑',
        senderAvatar: '',
        text: `👋 Removed ${guestName} from Guest Seat ${selectedSeat.index + 1}`,
        isSystem: true,
        timestamp: new Date().toISOString()
      }).catch(() => {});

      toast.info(`Removed ${guestName} from seat.`);
    } catch (e) {
      toast.error('Failed to kick user from seat.');
    }
  };

  // Host: Toggle Mute guest mic
  const handleToggleMuteGuest = async () => {
    if (!isHost || !selectedSeat || !streamId) return;
    try {
      const newMuteState = !selectedSeat.isMuted;
      const updatedSeats = guestSeats.map(s => {
        if (s.index === selectedSeat.index) {
          return { ...s, isMuted: newMuteState };
        }
        return s;
      });

      setGuestSeats(updatedSeats);
      setShowSeatActionModal(false);

      await updateDoc(doc(db, 'live_streams', streamId), {
        guestSeats: updatedSeats
      });

      toast.success(newMuteState ? `Muted ${selectedSeat.displayName}'s microphone 🔇` : `Unmuted ${selectedSeat.displayName}'s microphone 🎙️`);
    } catch (e) {
      toast.error('Failed to update guest mic state.');
    }
  };

  // Send Comment
  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;

    const text = commentInput.trim();
    setCommentInput('');

    const newComment: StreamComment = {
      id: `comment_${Date.now()}`,
      senderName: currentDisplayName,
      senderAvatar: currentAvatar,
      text: text
    };

    setComments(prev => [...prev.slice(-40), newComment]);

    if (streamId) {
      try {
        await addDoc(collection(db, 'live_streams', streamId, 'comments'), {
          ...newComment,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}
    }
  };

  // Heart Tap Reaction
  const handleTapHeart = () => {
    const colors = ['#EF4444', '#EC4899', '#F59E0B', '#8B5CF6', '#10B981'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomSize = Math.floor(Math.random() * 16) + 24;
    const randomX = Math.floor(Math.random() * 60) + 20;

    const heart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x: randomX,
      color: randomColor,
      size: randomSize
    };

    setFloatingHearts(prev => [...prev.slice(-25), heart]);

    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== heart.id));
    }, 2000);
  };

  // Send Gift
  const handleSendGift = async (gift: typeof GIFTS_LIST[0]) => {
    setShowGiftModal(false);
    setActiveGiftBanner({ sender: currentDisplayName, gift });
    setDiamondsCount(prev => prev + gift.cost);

    const giftComment: StreamComment = {
      id: `gift_${Date.now()}`,
      senderName: currentDisplayName,
      senderAvatar: currentAvatar,
      text: `Sent ${gift.icon} ${gift.name} (+${gift.cost} 💎)`,
      isGift: true,
      giftIcon: gift.icon
    };

    setComments(prev => [...prev, giftComment]);
    toast.success(`You sent ${gift.icon} ${gift.name}! 🎉`);

    if (streamId) {
      try {
        await updateDoc(doc(db, 'live_streams', streamId), {
          diamondsEarned: increment(gift.cost)
        });
        await addDoc(collection(db, 'live_streams', streamId, 'comments'), {
          ...giftComment,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}
    }

    setTimeout(() => {
      setActiveGiftBanner(null);
    }, 3500);
  };

  // Leave / End Live stream confirmed
  const handleConfirmLeaveLive = async () => {
    setShowLeaveConfirmModal(false);
    if (isHost && streamId) {
      try {
        await updateDoc(doc(db, 'live_streams', streamId), {
          isLive: false,
          endedAt: new Date().toISOString()
        });
      } catch (e) {}
    }
    toast.info(isHost ? 'Live broadcast ended.' : 'Left the live stream.');
    navigate('/live');
  };

  // Check Private Access Permission
  const isPrivate = streamData?.isPrivate || streamData?.roomMode === 'private';
  const isAllowed = isHost || (streamData?.allowedUsers && streamData.allowedUsers.includes(user?.uid));

  // IF PRIVATE & NOT ALLOWED -> SHOW PRIVATE LOCK SCREEN
  if (streamData && isPrivate && !isAllowed) {
    return (
      <div id="private-live-locked" className="fixed inset-0 z-50 bg-[#07050F] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-600/30 via-pink-600/20 to-purple-800/30 border border-red-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)]">
            <Lock size={46} className="text-red-400 animate-pulse" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black shadow uppercase">
            PRIVATE LIVE
          </span>
        </div>

        <h2 className="text-2xl font-black text-white">🔒 Private Live Stream</h2>
        <p className="text-xs text-amber-300 font-bold mt-1">
          (प्राइवेट लाइव - केवल चुने हुए सदस्य)
        </p>
        
        <p className="text-xs text-zinc-400 max-w-xs mt-3.5 leading-relaxed">
          यह लाइव स्ट्रीम होस्ट (<span className="text-white font-bold">{streamData?.hostName || 'Host'}</span>) द्वारा प्राइवेट रखी गई है। केवल वही यूज़र देख सकते हैं जिन्हें होस्ट ने ऐड किया है।
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handleRequestPrivateAccess}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:opacity-95 text-white font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            <span>Request Access (अनुरोध भेजें) 📩</span>
          </Button>

          <Button
            onClick={() => navigate('/live')}
            variant="outline"
            className="w-full h-11 rounded-2xl bg-white/5 border-white/15 text-zinc-300 hover:text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} className="mr-1" />
            Back to Live List (वापस जाएं)
          </Button>
        </div>
      </div>
    );
  }

  // Filtered viewers for the Add Users Modal
  const filteredUsersToInvite = viewersList.filter(v => {
    if (v.uid === user?.uid) return false;
    if (!searchUserQuery.trim()) return true;
    const q = searchUserQuery.toLowerCase().trim();
    return (v.displayName || '').toLowerCase().includes(q) || (v.numericId || '').includes(q);
  });

  return (
    <>
      {/* FLOATING MINIMIZED LIVE PLAYER PIP */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="fixed bottom-24 right-4 z-50 bg-[#0F0C1E]/95 backdrop-blur-2xl border border-pink-500/40 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2.5 max-w-xs text-white"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-red-500/50 shrink-0">
              <img 
                src={streamData?.hostAvatar || currentAvatar} 
                alt="" 
                className="w-full h-full object-cover" 
              />
              <span className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-[7px] font-black text-center uppercase">LIVE</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-white truncate">{streamData?.title || 'Maxo Live'}</p>
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-300 mt-0.5">
                <span className="text-amber-400 font-bold">{streamData?.hostName || 'Host'}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-pink-400 font-bold"><Eye size={9} /> {viewerCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="w-7 h-7 rounded-lg bg-pink-600/80 hover:bg-pink-600 flex items-center justify-center text-white cursor-pointer shadow"
                title="Expand Live"
              >
                <Maximize2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(true)}
                className="w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white cursor-pointer shadow"
                title="Leave Live"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN FULL-SCREEN LIVE STREAM ROOM */}
      <div className={`fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden select-none flex flex-col justify-between ${isMinimized ? 'hidden' : 'block'}`}>
        
        {/* 1. FULL SCREEN NATURAL VIDEO BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#07050F]" onClick={handleTapHeart}>
          {/* Fallback rich backdrop so it never renders a dead black screen */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={streamData?.coverUrl || streamData?.hostAvatar || currentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop'}
              alt="Live Backdrop"
              className="w-full h-full object-cover brightness-[0.4] blur-sm scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70" />
          </div>

          {isHost ? (
            <video
              ref={videoElementRef}
              autoPlay
              playsInline
              muted
              style={{
                filter: filterEnabled ? 'contrast(1.04) brightness(1.06) saturate(1.1)' : 'none',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
              }}
              className="relative w-full h-full object-cover z-[1]"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center z-[1]">
              <img
                src={streamData?.coverUrl || streamData?.hostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop'}
                alt="Live video stream"
                className="w-full h-full object-cover brightness-95"
                referrerPolicy="no-referrer"
              />
              {/* Live Video Shading Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/75 pointer-events-none" />
            </div>
          )}
        </div>

        {/* 2. TOP HEADER - HOST PROFILE, PUBLIC/PRIVATE TOGGLE, ADD USERS, DIAMONDS, VIEWERS & CONTROLS */}
        <div className="relative z-30 pt-3 px-3.5 flex items-center justify-between bg-gradient-to-b from-black/85 to-transparent">
          
          {/* Host Profile Capsule with Vocal Sound Wave */}
          <div className="flex items-center gap-2 bg-black/65 backdrop-blur-xl border border-white/15 p-1 pr-3 rounded-full shadow-lg relative">
            <div className="relative">
              <img 
                src={streamData?.hostAvatar || currentAvatar} 
                alt="host" 
                className="w-8 h-8 rounded-full object-cover border border-amber-400"
                referrerPolicy="no-referrer"
              />
              {/* Host Vocal Ring (Subtle luxury glowing wave) */}
              {!isMicMuted && (
                <>
                  <motion.span 
                    animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="absolute -inset-1 rounded-full border-2 border-red-500 pointer-events-none"
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.45, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.1 }}
                    className="absolute -inset-2 rounded-full border border-amber-400 pointer-events-none"
                  />
                </>
              )}
            </div>

            <div className="min-w-0 max-w-[95px]">
              <p className="text-[11px] font-black text-white truncate leading-tight flex items-center gap-1">
                {streamData?.hostName || 'Maxo Star'}
                <Crown size={11} className="text-amber-400 shrink-0" />
              </p>
              <p className="text-[9px] font-extrabold text-amber-400 flex items-center gap-1 leading-none mt-0.5">
                💎 {diamondsCount.toLocaleString()}
              </p>
            </div>

            {!isHost && (
              <button
                onClick={() => {
                  setIsFollowing(!isFollowing);
                  toast.success(!isFollowing ? 'Followed creator! 🌟' : 'Unfollowed.');
                }}
                className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isFollowing 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                }`}
              >
                {isFollowing ? '✓' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Right Actions: Public/Private Selector, Add User, Viewers, Minimize & Close */}
          <div className="flex items-center gap-1.5">
            
            {/* Host Privacy Switcher & Add Button */}
            {isHost && (
              <div className="flex items-center gap-1 bg-black/65 backdrop-blur-xl border border-white/15 p-0.5 px-1 rounded-full shadow-lg">
                <button
                  type="button"
                  onClick={() => handleToggleRoomPrivacy(!isPrivate)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                    isPrivate ? 'bg-red-600 text-white shadow' : 'bg-emerald-500 text-black shadow'
                  }`}
                  title="Toggle Public / Private"
                >
                  {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                  <span>{isPrivate ? 'Private' : 'Public'}</span>
                </button>

                {/* In Private Mode: Host "Add Users (+)" Button */}
                {isPrivate && (
                  <button
                    type="button"
                    onClick={() => setShowAddUsersModal(true)}
                    className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-[9px] font-black flex items-center gap-0.5 shadow cursor-pointer active:scale-95 animate-pulse"
                    title="Add / Invite Users to Private Live"
                  >
                    <Plus size={10} className="stroke-[3]" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            )}

            {/* Viewers / Listeners Button */}
            <button
              type="button"
              onClick={() => setShowViewersModal(true)}
              className="flex items-center gap-1 bg-black/65 backdrop-blur-xl border border-white/15 px-2 py-1 rounded-full text-xs font-black text-white hover:bg-white/10 active:scale-95 transition-all shadow-md cursor-pointer"
              title="View Live Listeners & Viewers"
            >
              <Users size={12} className="text-amber-400" />
              <span>{viewerCount}</span>
            </button>

            {/* Minimize Live Button */}
            <button
              type="button"
              onClick={() => {
                setIsMinimized(true);
                toast.info('Live stream minimized (फ्लोटिंग मोड)');
              }}
              className="w-7 h-7 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shadow-md cursor-pointer"
              title="Minimize Live"
            >
              <ChevronDown size={15} />
            </button>

            {/* Leave / End Stream Button */}
            <button
              type="button"
              onClick={() => setShowLeaveConfirmModal(true)}
              className="w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-600 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all active:scale-95 shadow-md cursor-pointer"
              title={isHost ? 'End Live (लाइव समाप्त करें)' : 'Leave Live (लाइव से बाहर निकलें)'}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 3. USER ENTRY ANNOUNCEMENT BANNER */}
        <AnimatePresence>
          {activeEntryBanner && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="relative z-30 mx-4 my-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/90 via-pink-600/90 to-red-600/90 backdrop-blur-md border border-amber-300/40 text-white text-[11px] font-black shadow-lg flex items-center gap-1.5 max-w-fit"
            >
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              <span>🌟 {activeEntryBanner} entered the Live!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. 4 TO 5 GUEST AUDIO SEATS OVERLAY (TRANSPARENT & ELEGANT) */}
        <div className="relative z-30 px-3.5 my-auto flex flex-col items-end pointer-events-none">
          <div className="p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
            <span className="text-[8px] font-black uppercase text-amber-300 tracking-wider text-center">
              Guest Seats
            </span>
            {guestSeats.map((seat, sIdx) => {
              const isOccupied = !!seat.uid;
              return (
                <div key={sIdx} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleSeatClick(seat)}
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl transition-all active:scale-95 cursor-pointer ${
                      isOccupied
                        ? 'p-[1.5px] bg-transparent border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-transparent hover:bg-blue-500/10 border-2 border-blue-500 hover:border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                    }`}
                    title={isOccupied ? `${seat.displayName} (Tap for Options)` : `Seat ${sIdx + 1} (Tap to Invite/Sit)`}
                  >
                    {isOccupied ? (
                      <div className="w-full h-full rounded-full overflow-hidden relative">
                        <img 
                          src={seat.photoURL || getPremiumAvatar(seat.uid || 'guest')} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                        
                        {/* Speaker Vocal Sound Waves */}
                        {!seat.isMuted && (
                          <motion.span 
                            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.2, 0.8] }}
                            transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                            className="absolute -inset-1 rounded-full border-2 border-cyan-400 pointer-events-none"
                          />
                        )}

                        {/* Mute badge */}
                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border border-black font-bold ${
                          seat.isMuted ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'
                        }`}>
                          {seat.isMuted ? '🔇' : '🎙️'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center drop-shadow">
                        <Plus size={15} className="text-blue-400 stroke-[2.5]" />
                        <span className="text-[7.5px] font-black text-blue-200 leading-none mt-0.5 font-mono">{sIdx + 1}</span>
                      </div>
                    )}
                  </button>
                  <span className="text-[8px] font-black text-blue-100 mt-0.5 truncate max-w-[48px] text-center bg-black/60 px-1.5 py-0.2 rounded-full border border-blue-500/30">
                    {isOccupied ? seat.displayName?.split(' ')[0] : `Seat ${sIdx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. FLOATING HEART REACTIONS ANIMATION */}
        <div className="absolute right-6 bottom-28 pointer-events-none z-30">
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 0.8, x: 0 }}
              animate={{ 
                opacity: 0, 
                y: -240, 
                scale: 1.4, 
                x: (Math.random() - 0.5) * 60 
              }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              style={{ color: heart.color, fontSize: `${heart.size}px` }}
              className="absolute bottom-0 right-0 select-none"
            >
              ❤️
            </motion.div>
          ))}
        </div>

        {/* 6. GIFT ALERT BANNER */}
        <AnimatePresence>
          {activeGiftBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="absolute inset-x-6 top-1/3 z-40 bg-gradient-to-r from-amber-500/95 via-pink-600/95 to-purple-600/95 backdrop-blur-xl border border-amber-300/50 p-4 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center gap-4 text-white"
            >
              <span className="text-5xl animate-bounce">{activeGiftBanner.gift.icon}</span>
              <div>
                <p className="text-xs font-black uppercase text-amber-200 tracking-wider">SPECIAL GIFT ALERT! 🎁</p>
                <p className="text-sm font-black text-white">
                  <span className="text-amber-300">{activeGiftBanner.sender}</span> sent{' '}
                  <span className="text-pink-200 font-extrabold">{activeGiftBanner.gift.name}</span>!
                </p>
                <p className="text-[10px] text-amber-100 font-bold mt-0.5">+{activeGiftBanner.gift.cost} Diamonds earned 💎</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 7. BOTTOM CHAT STREAM & ACTION CONTROLS */}
        <div className="relative z-30 px-3.5 pb-4 pt-2 space-y-2.5 bg-gradient-to-t from-black via-black/80 to-transparent">
          
          {/* Live Chat Comments */}
          <div className="h-36 overflow-y-auto space-y-1.5 scrollbar-none pr-2 flex flex-col justify-end">
            {comments.slice(-10).map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs max-w-[85%] backdrop-blur-md ${
                  msg.isEntry
                    ? 'bg-gradient-to-r from-amber-500/30 to-pink-500/30 border border-amber-400/30 text-amber-200 font-bold'
                    : msg.isSystem
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold'
                    : msg.isGift
                    ? 'bg-gradient-to-r from-pink-500/30 to-amber-500/30 border border-pink-400/30 text-white font-extrabold'
                    : 'bg-black/60 border border-white/10 text-white'
                }`}
              >
                {!msg.isSystem && msg.senderAvatar && (
                  <img src={msg.senderAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                )}
                <span className="font-black text-pink-300 shrink-0">
                  {msg.senderName}:
                </span>
                <span className="font-medium text-zinc-100 break-words">
                  {msg.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Comment Input Bar & Actions */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendComment} className="flex-1 flex items-center bg-black/65 backdrop-blur-xl border border-white/15 rounded-full px-3 py-1.5">
              <Input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Send live message (मैसेज भेजें)... 💬"
                className="bg-transparent border-0 text-white placeholder:text-zinc-400 text-xs h-7 px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {commentInput.trim() && (
                <button type="submit" className="text-pink-400 hover:text-pink-300 p-1 cursor-pointer">
                  <Send size={15} />
                </button>
              )}
            </form>

            {/* Host Controls */}
            {isHost ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="w-9 h-9 rounded-full bg-black/65 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-90 cursor-pointer"
                  title="Flip Camera"
                >
                  <RefreshCw size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`w-9 h-9 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-lg active:scale-90 cursor-pointer ${
                    isMicMuted ? 'bg-red-600/80 border-red-400 text-white' : 'bg-black/65 border-white/20 text-white'
                  }`}
                  title={isMicMuted ? 'Unmute' : 'Mute'}
                >
                  {isMicMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterEnabled(!filterEnabled);
                    toast.success(filterEnabled ? 'Filter Removed' : 'Glow Filter Applied ✨');
                  }}
                  className={`w-9 h-9 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer ${
                    filterEnabled ? 'bg-pink-600/90 border-pink-300 text-white shadow-pink-500/30' : 'bg-black/65 border-white/20 text-zinc-300'
                  }`}
                  title="Filter"
                >
                  <Sparkles size={15} />
                </button>
              </div>
            ) : (
              /* Viewer Controls (Gift & Heart) */
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowGiftModal(true)}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[1.5px] shadow-lg cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center text-white">
                    <Gift size={16} className="text-amber-300 animate-pulse" />
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 1.25 }}
                  onClick={handleTapHeart}
                  className="w-9 h-9 rounded-full bg-red-600/90 backdrop-blur-xl border border-red-400/60 flex items-center justify-center text-white shadow-lg cursor-pointer active:bg-red-500"
                >
                  <Heart size={16} className="fill-white" />
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* 8. MODAL: HOST GUEST SEAT ACTION (MUTE / KICK OUT) */}
        <AnimatePresence>
          {showSeatActionModal && selectedSeat && isHost && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="w-full max-w-sm bg-[#120C24] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedSeat.photoURL || getPremiumAvatar(selectedSeat.uid || 'guest')} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover border border-amber-400" 
                    />
                    <div>
                      <h4 className="text-sm font-black text-white">{selectedSeat.displayName}</h4>
                      <p className="text-[10px] text-amber-300 font-bold">Guest Seat {selectedSeat.index + 1}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSeatActionModal(false)} className="text-zinc-400 hover:text-white p-1">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    onClick={handleToggleMuteGuest}
                    className={`h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      selectedSeat.isMuted ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {selectedSeat.isMuted ? <Mic size={15} /> : <MicOff size={15} />}
                    <span>{selectedSeat.isMuted ? 'Unmute Mic (अनम्यूट)' : 'Mute Mic (म्यूट करें)'}</span>
                  </Button>

                  <Button
                    onClick={handleKickOutFromSeat}
                    className="h-11 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserMinus size={15} />
                    <span>Kick Out (नीचे उतारें)</span>
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 9. MODAL: HOST INVITE VIEWER TO SEAT */}
        <AnimatePresence>
          {showInviteToSeatModal && selectedSeat && isHost && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="w-full max-w-sm bg-[#120C24] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <h4 className="text-xs font-black text-white">Invite to Seat {selectedSeat.index + 1}</h4>
                    <p className="text-[9px] text-amber-300">उपलब्ध सदस्यों को सीट पर बिठाएं</p>
                  </div>
                  <button onClick={() => setShowInviteToSeatModal(false)} className="text-zinc-400 hover:text-white text-xs">
                    ✕
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 scrollbar-none">
                  {viewersList.filter(v => v.uid !== user?.uid).length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 text-xs">
                      No other viewers in room right now to invite.
                    </div>
                  ) : (
                    viewersList.filter(v => v.uid !== user?.uid).map((v) => (
                      <div key={v.uid} className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div className="flex items-center gap-2.5">
                          <img src={v.photoURL || getPremiumAvatar(v.uid)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                          <div>
                            <p className="text-xs font-bold text-white">{v.displayName}</p>
                            <p className="text-[9px] text-zinc-400 font-mono">ID: {v.numericId || v.uid.slice(0, 8)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleInviteUserToSeat(v)}
                          className="h-7 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-black text-[10px] font-black cursor-pointer"
                        >
                          Seat (बिठाएं) 🎙️
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 10. MODAL: HOST ADD USERS TO PRIVATE LIVE STREAM */}
        <AnimatePresence>
          {showAddUsersModal && isHost && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="w-full max-w-sm bg-[#110C22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300">
                      <UserPlus size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Add Users to Private Live</h4>
                      <p className="text-[9px] text-amber-300 font-medium">प्राइवेट लाइव में यूज़र्स शामिल करें</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddUsersModal(false)}
                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 text-xs cursor-pointer hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Search user */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Search user name or ID..."
                    className="h-8 pl-8 pr-3 bg-white/5 border-white/10 text-xs text-white rounded-xl placeholder:text-zinc-500"
                  />
                </div>

                {/* List of active users to Add */}
                <div className="max-h-52 overflow-y-auto space-y-2 scrollbar-none pr-1">
                  {filteredUsersToInvite.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 text-xs">
                      No other users in room right now. New listeners will appear here to add!
                    </div>
                  ) : (
                    filteredUsersToInvite.map((v) => {
                      const isAlreadyAllowed = streamData?.allowedUsers?.includes(v.uid);
                      return (
                        <div
                          key={v.uid}
                          className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.04] border border-white/10"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={v.photoURL || getPremiumAvatar(v.uid)}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-white/20"
                            />
                            <div>
                              <p className="text-xs font-bold text-white">{v.displayName || 'Guest User'}</p>
                              <p className="text-[9px] text-zinc-400 font-mono">ID: {v.numericId || v.uid.slice(0, 8)}</p>
                            </div>
                          </div>

                          {isAlreadyAllowed ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveUserFromPrivateLive(v.uid, v.displayName)}
                              className="px-2.5 py-1 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 text-[10px] font-black active:scale-95 cursor-pointer"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddUserToPrivateLive(v.uid, v.displayName)}
                              className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black text-[10px] font-black shadow active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={11} className="stroke-[3]" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <Button
                  onClick={() => setShowAddUsersModal(false)}
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 text-black font-black text-xs cursor-pointer shadow"
                >
                  Done (पूर्ण) ✓
                </Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 11. VIEWERS / LISTENERS MODAL */}
        <AnimatePresence>
          {showViewersModal && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-[#0E0A1A]/95 backdrop-blur-2xl border-t border-white/10 p-5 rounded-t-3xl shadow-2xl max-w-lg mx-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                  <Users size={15} className="text-pink-400" /> Live Viewers & Listeners ({viewersList.length || viewerCount})
                </span>
                <button onClick={() => setShowViewersModal(false)} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-none">
                {/* Host Entry */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={streamData?.hostAvatar || currentAvatar} 
                      alt="" 
                      className="w-9 h-9 rounded-full object-cover border border-amber-400" 
                    />
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1">
                        {streamData?.hostName || 'Host'}
                        <Crown size={12} className="text-amber-400 fill-amber-400" />
                      </p>
                      <p className="text-[10px] text-amber-300 font-bold">Room Host 👑</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">Live</span>
                </div>

                {/* Viewers entries */}
                {viewersList.filter(v => v.uid !== streamData?.hostId).map((v, i) => (
                  <div key={v.uid || i} className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={v.photoURL || getPremiumAvatar(v.uid)} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover border border-white/10" 
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{v.displayName || 'Viewer'}</p>
                        <p className="text-[9px] text-zinc-400 font-mono">ID: {v.numericId || v.uid.slice(0, 8)}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-pink-400 flex items-center gap-1">
                      <Eye size={10} /> Watching
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 12. LEAVE / END CONFIRMATION MODAL */}
        <AnimatePresence>
          {showLeaveConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-xs bg-[#150D24] border border-red-500/30 rounded-3xl p-5 shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">
                    {isHost ? 'End Live Broadcast?' : 'Leave Live Stream?'}
                  </h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {isHost ? 'क्या आप लाइव समाप्त करना चाहते हैं? सभी दर्शक बाहर हो जाएंगे।' : 'क्या आप इस लाइव स्ट्रीम को छोड़ना चाहते हैं?'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowLeaveConfirmModal(false)}
                    className="flex-1 h-10 rounded-2xl bg-white/5 border-white/15 text-zinc-300 hover:text-white text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmLeaveLive}
                    className="flex-1 h-10 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg"
                  >
                    {isHost ? 'End Live' : 'Leave'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 13. GIFT SELECTION TRAY MODAL */}
        <AnimatePresence>
          {showGiftModal && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-[#0C081A]/95 backdrop-blur-2xl border-t border-amber-500/20 p-5 rounded-t-3xl shadow-2xl space-y-4 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Gift size={15} /> Send Live Gift to {streamData?.hostName || 'Host'}
                </span>
                <button onClick={() => setShowGiftModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {GIFTS_LIST.map((g) => (
                  <motion.button
                    key={g.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSendGift(g)}
                    className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 p-3 rounded-2xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{g.icon}</span>
                    <span className="text-xs font-black text-white">{g.name}</span>
                    <span className="text-[10px] font-extrabold text-amber-400">🪙 {g.cost}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
