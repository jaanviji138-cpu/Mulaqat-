import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, updateDoc, setDoc, onSnapshot, 
  deleteDoc, collection, addDoc, query, orderBy, limit
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Users, Crown, Ban,
  Lock, Unlock, Send, Gift, Sparkles, X, 
  ChevronDown, Armchair, Plus,
  Share2, Radio, MessageCircle, Smile, Heart,
  Shield, LogOut, Globe, Check, Search, UserCheck, UserPlus,
  Music, Settings, Disc3, Play, Pause, SkipForward, Maximize2,
  FileText, Rewind, FastForward, Copy, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { INDIAN_MALE_AVATARS, INDIAN_FEMALE_AVATARS } from '@/utils/avatar';
import { getPublicOrigin, copyTextToClipboard } from '@/lib/utils';
import { ActivePulseDot } from '@/components/ActiveStatusIndicator';
import { VoiceProcessingMenu } from '@/components/VoiceProcessingMenu';
import { globalVoiceProcessor, VOICE_FILTERS, VoiceFilterConfig } from '@/utils/voiceProcessor';
import { roomAudioEngine, CustomSong } from '@/utils/roomAudioEffects';
import { useWebRTC } from '@/hooks/useWebRTC';
import EditRoomModal from '@/components/EditRoomModal';
import RoomMusicModal from '@/components/RoomMusicModal';
import GiftModal, { LuxuryGiftItem } from '@/components/GiftModal';
import LuxuryGiftAnimationOverlay, { ActiveLuxuryGift } from '@/components/LuxuryGiftAnimationOverlay';
import AnimatedEmojiOverlay, { ActiveSeatEmoji, SeatAnimatedEmojiBadge } from '@/components/AnimatedEmojiOverlay';
import { ExplosiveParticleCanvas, ExplosiveParticleCanvasRef } from '@/components/ExplosiveParticleCanvas';
import AdminHistoryLogModal, { AdminLogItem } from '@/components/AdminHistoryLogModal';

interface LiveViewer {
  uid: string;
  displayName: string;
  photoURL: string;
  numericId: string;
  joinedAt: string;
}

interface RoomSeat {
  index: number;
  uid: string | null;
  displayName: string;
  photoURL: string;
  numericId: string;
  isMuted?: boolean;
  isSelfMuted?: boolean;
  isLocked?: boolean;
  voiceFilter?: string;
  isSpeaking?: boolean;
  isMusicPlaying?: boolean;
}

interface LiveComment {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderNumericId?: string;
  text: string;
  isHost?: boolean;
  isEntry?: boolean;
}

interface FloatingGift {
  id: string;
  giftName: string;
  icon: string;
  senderName: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  senderPhoto?: string;
  startX: number;
  wobbleOffset: number;
  rotation: number;
  scale: number;
  speedDuration: number;
  createdAt: number;
}

export const REACTION_EMOJIS_PAGES = [
  // Page 1: Top Live Room Interactive 3D Animations (matches user video!)
  [
    { emoji: '😭', label: 'Waterfall Cry', badge: 'Popular' },
    { emoji: '🌹', label: 'Rose Flirt', badge: 'Hot' },
    { emoji: '🤮', label: 'Rainbow Barf', badge: 'Top' },
    { emoji: '😂', label: 'LOL Laugh', badge: 'Fun' },
    { emoji: '🎲', label: 'Lucky Dice', badge: 'Game' },
    { emoji: '🎰', label: '777 Jackpot', badge: 'Lucky' },
    { emoji: '👑', label: 'Royal Crown', badge: 'Elite' },
    { emoji: '👏', label: 'Clap Thanks', badge: '' },
  ],
  // Page 2: Expressions, Love & Swag
  [
    { emoji: '😎', label: 'Swag Dark', badge: 'Cool' },
    { emoji: '🥺', label: 'Puppy Eyes', badge: 'Cute' },
    { emoji: '😍', label: 'Heart Eyes', badge: 'Love' },
    { emoji: '😡', label: 'Angry Fire', badge: 'Rage' },
    { emoji: '🐱', label: 'Sleeping Cat', badge: 'Sleep' },
    { emoji: '🥸', label: 'Moustache', badge: 'Fun' },
    { emoji: '💋', label: 'Hot Kiss', badge: 'Kiss' },
    { emoji: '🫶', label: 'Heart Hands', badge: 'Love' },
  ],
  // Page 3: Hype, Wealth & Celebrations
  [
    { emoji: '🔥', label: 'Inferno Flame', badge: 'Hype' },
    { emoji: '💎', label: 'Mega Diamond', badge: 'Rich' },
    { emoji: '🚀', label: 'Rocket Launch', badge: 'Fast' },
    { emoji: '🤑', label: 'Money Rain', badge: 'Cash' },
    { emoji: '🎉', label: 'Party Popper', badge: 'Party' },
    { emoji: '💔', label: 'Heartbreak', badge: 'Sad' },
    { emoji: '⚡', label: 'Thunder Bolt', badge: 'Shock' },
    { emoji: '🥳', label: 'Celebrate', badge: 'Joy' },
  ]
];

export const REACTION_EMOJIS = REACTION_EMOJIS_PAGES.flat();

export default function RoomPage({ props }: { props?: { roomId?: string; isMinimized?: boolean; onCloseRoom?: () => void } } = {}) {
  const { roomId: paramRoomId } = useParams<{ roomId: string }>();
  const roomId = props?.roomId || paramRoomId;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const activeUid = user?.uid || 'user_local';
  const displayName = profile?.displayName || user?.displayName || 'Maxo Star';
  const photoURL = profile?.photoURL || user?.photoURL || (profile?.gender === 'female' ? INDIAN_FEMALE_AVATARS[0] : INDIAN_MALE_AVATARS[0]);
  const numericId = profile?.numericId || (user?.uid ? user.uid.slice(0, 9).replace(/\D/g, '') || '928471923' : '928471923');

  // Minimized check
  const isMinimized = props?.isMinimized ?? (!location.pathname.startsWith('/room/' + roomId));

  // Room state
  const [roomData, setRoomData] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);

  // Pure Audio state (NO CAMERA)
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0); // 0 to 1
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Real-time Voice Processing Filter Menu State
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [activeVoiceFilter, setActiveVoiceFilter] = useState<VoiceFilterConfig>(VOICE_FILTERS[0]);

  // Live Viewers
  const [viewers, setViewers] = useState<LiveViewer[]>([]);
  const [showListenersModal, setShowListenersModal] = useState(false);
  const [entryBanner, setEntryBanner] = useState<string | null>(null);
  const knownViewersRef = useRef<Set<string>>(new Set());

  // Moderated lists
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);

  // Circular Seats state
  const [seats, setSeats] = useState<RoomSeat[]>([
    { index: 0, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 1, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 2, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 3, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 4, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 5, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 6, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false },
    { index: 7, uid: null, displayName: '', photoURL: '', numericId: '', isMuted: false, isSelfMuted: false, isLocked: false }
  ]);
  const [selectedOccupiedSeat, setSelectedOccupiedSeat] = useState<RoomSeat | null>(null);
  const [selectedEmptySeatIndex, setSelectedEmptySeatIndex] = useState<number | null>(null);

  // Private Room Mode & Allowed Users Management
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedAllowedUsers, setSelectedAllowedUsers] = useState<string[]>([]);

  // Room Edit & Music Player Modals State
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomInitialTab, setEditRoomInitialTab] = useState<'info' | 'theme' | 'admin' | 'kicked'>('info');
  const [showMusicPlayerModal, setShowMusicPlayerModal] = useState(false);
  const [activeSeatEmojis, setActiveSeatEmojis] = useState<ActiveSeatEmoji[]>([]);

  // End live confirmation modal
  const [showEndModal, setShowEndModal] = useState(false);

  // Live Chat & Comments
  const [comments, setComments] = useState<LiveComment[]>([
    {
      id: 'cmt_init_1',
      senderId: 'sys_1',
      senderName: 'Maxo Guard 🛡️',
      senderPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      text: 'Welcome to Maxo Voice Room! Respect community rules & enjoy ✨',
      isHost: false
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Floating Gifts & Luxury Animations State
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [activeLuxuryGift, setActiveLuxuryGift] = useState<ActiveLuxuryGift | null>(null);

  // Real-time listener for Room Luxury Gifts
  useEffect(() => {
    if (!roomId) return;
    const giftsRef = collection(db, 'rooms', roomId, 'gifts');
    const q = query(giftsRef, orderBy('createdAt', 'desc'), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data();
          if (d && Date.now() - d.createdAt < 18000) {
            setActiveLuxuryGift({
              id: change.doc.id,
              giftId: d.giftId || 'tajmahal',
              giftName: d.giftName || 'Luxury Gift',
              hindiName: d.hindiName,
              icon: d.icon || '🏰',
              coins: d.coins || 9999,
              animType: d.animType || 'tajmahal',
              senderId: d.senderId,
              senderName: d.senderName,
              senderPhoto: d.senderPhoto,
              receiverId: d.receiverId,
              receiverName: d.receiverName,
              receiverPhoto: d.receiverPhoto,
              createdAt: d.createdAt || Date.now()
            });

            // Burst particles on screen
            particleCanvasRef.current?.triggerBurst(d.icon || '✨');
          }
        }
      });
    }, (err) => {
      console.warn("Room gifts snapshot note:", err);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Explosive Particle Canvas Ref & Admin History Logs State
  const particleCanvasRef = useRef<ExplosiveParticleCanvasRef>(null);
  const [adminLogs, setAdminLogs] = useState<AdminLogItem[]>([]);
  const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);

  // Helper to record admin / room actions in Firestore & local state
  const recordAdminLog = async (
    actionType: AdminLogItem['actionType'],
    category: AdminLogItem['category'],
    details: string,
    target?: { id?: string; name?: string; photo?: string },
    seatIdx?: number
  ) => {
    const newLog: AdminLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      actionType,
      category,
      actorId: activeUid,
      actorName: displayName,
      actorPhoto: photoURL,
      targetId: target?.id,
      targetName: target?.name,
      targetPhoto: target?.photo,
      seatIndex: seatIdx,
      details,
      timestamp: Date.now()
    };

    setAdminLogs(prev => [newLog, ...prev.slice(0, 49)]);

    if (roomId) {
      try {
        await addDoc(collection(db, 'rooms', roomId, 'adminLogs'), newLog);
      } catch (e) {}
    }
  };

  // Real-time listener for Admin Action Logs
  useEffect(() => {
    if (!roomId) return;
    const logsRef = collection(db, 'rooms', roomId, 'adminLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: AdminLogItem[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      if (fetched.length > 0) {
        setAdminLogs(fetched);
      }
    }, (err) => {
      console.warn("Admin logs snapshot note:", err);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Floating Animated Emoji Reactions & Reaction Tray State
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showReactionTray, setShowReactionTray] = useState(false);
  const [reactionTrayPage, setReactionTrayPage] = useState(0);

  // Dynamic Share & Invite State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real-time Music Playback Tracking
  const [activeMusicInfo, setActiveMusicInfo] = useState(() => roomAudioEngine.getCurrentPlaybackInfo());

  // Check if current user is seated on any chair
  const mySeat = seats.find(s => s.uid === activeUid);
  const isUserSeated = !!mySeat;
  const isUserSeatedAndMuted = mySeat?.isMuted || mySeat?.isSelfMuted || false;

  // Active WebRTC Audio Pipeline for bidirectional voice in room
  const { localStream, activeSpeakerStreams } = useWebRTC({
    roomId: roomId || '',
    currentUserId: activeUid,
    seats: seats,
    isLocalMuted: isMicMuted,
    isHost: isHost,
    hostId: roomData?.hostId,
    voiceVolume: 1.0,
    isVoiceMuted: false
  });

  // Music state synchronization across room
  useEffect(() => {
    if (!roomData?.activeMusic) return;
    const music = roomData.activeMusic;
    if (music.senderUid !== activeUid) {
      if (music.isPlaying) {
        const current = roomAudioEngine.getCurrentPlaybackInfo();
        if (!current.isPlaying || current.currentSong?.id !== music.songId) {
          roomAudioEngine.playSong({
            id: music.songId,
            title: music.title,
            artist: music.artist || 'Room DJ',
            url: music.url,
            fileName: music.title,
            isCustomFile: false,
            duration: music.duration || 180
          });
          if (typeof music.currentTime === 'number' && Math.abs(current.currentTime - music.currentTime) > 3) {
            roomAudioEngine.seek(music.currentTime);
          }
        }
      } else {
        if (roomAudioEngine.getCurrentPlaybackInfo().isPlaying) {
          roomAudioEngine.pauseMusic();
        }
      }
    }
  }, [roomData?.activeMusic, activeUid]);

  const broadcastMusicSync = async (song: CustomSong | null, isPlaying: boolean, currentTime: number = 0) => {
    if (!roomId || (!isHost && !isUserSeated)) return;
    try {
      if (song && isPlaying) {
        await updateDoc(doc(db, 'rooms', roomId), {
          activeMusic: {
            songId: song.id,
            title: song.title,
            artist: song.artist || 'Room DJ',
            url: song.url,
            duration: song.duration || 180,
            isPlaying: true,
            currentTime: currentTime,
            updatedAt: Date.now(),
            senderUid: activeUid,
            senderName: displayName
          }
        });
      } else {
        await updateDoc(doc(db, 'rooms', roomId), {
          'activeMusic.isPlaying': false,
          'activeMusic.senderUid': activeUid,
          'activeMusic.updatedAt': Date.now()
        });
      }
    } catch (e) {
      console.warn("Music broadcast sync alert:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = roomAudioEngine.subscribe(() => {
      setActiveMusicInfo(roomAudioEngine.getCurrentPlaybackInfo());
    });
    return () => {
      unsubscribe();
      roomAudioEngine.stopAllMusic();
    };
  }, []);

  // Real-time Web Audio API setup for crystal-clear microphone audio & vocal waves detection
  const setupAudioStreamAndAnalyzer = async () => {
    try {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false // NO CAMERA!
      });

      audioStreamRef.current = stream;

      // Audio DSP Processor setup
      try {
        globalVoiceProcessor.setupStream(stream);
      } catch (e) {}

      // Web Audio API volume / vocal wave meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVocalLevels = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 60);

        setLocalAudioLevel(normalized);
        const speakingNow = normalized > 0.03 && !isMicMuted;
        setIsSpeakingLocal(speakingNow);

        animFrameRef.current = requestAnimationFrame(checkVocalLevels);
      };

      checkVocalLevels();
    } catch (err) {
      console.warn("Audio mic initialization warning:", err);
    }
  };

  // Start audio when host or seated
  useEffect(() => {
    if (isHost || isUserSeated) {
      setupAudioStreamAndAnalyzer();
    } else {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setLocalAudioLevel(0);
      setIsSpeakingLocal(false);
    }

    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isHost, isUserSeated]);

  // Handle local microphone toggle
  const handleToggleLocalMic = async () => {
    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);

    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !newMuteState;
      });
    }

    // If seated user, update self-mute in Firestore
    if (isUserSeated && roomId && mySeat) {
      const updatedSeats = [...seats];
      if (updatedSeats[mySeat.index]) {
        updatedSeats[mySeat.index].isSelfMuted = newMuteState;
        setSeats(updatedSeats);
        try {
          await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
        } catch (e) {}
      }
    }

    toast.success(newMuteState ? 'Microphone Muted 🔇' : 'Microphone Live 🎙️');
  };

  // Real-time Voice Filter Selection
  const handleSelectVoiceFilter = async (filter: VoiceFilterConfig) => {
    setActiveVoiceFilter(filter);
    globalVoiceProcessor.applyFilter(filter.id);
  };

  // Load initial cached room details for instantaneous display
  useEffect(() => {
    if (!roomId) return;
    try {
      const cached = localStorage.getItem(`room_detail_${roomId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRoomData(parsed);
        setIsHost(parsed.hostId === activeUid);
        if (parsed.seats && Array.isArray(parsed.seats)) {
          setSeats(parsed.seats);
        }
      }
    } catch (e) {}
  }, [roomId, activeUid]);

  // Real-time Room Document Listener
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        const hostFlag = data.hostId === activeUid;
        setIsHost(hostFlag);

        setBannedUsers(data.bannedUsers || []);
        setMutedUsers(data.mutedUsers || []);

        const targetCount = data.seatCount || (Array.isArray(data.seats) ? data.seats.length : 8);
        const incomingSeats: RoomSeat[] = Array.isArray(data.seats) ? data.seats : [];
        const fullSeatsList: RoomSeat[] = [];
        const FAKE_USER_IDS = new Set([
          'siddharth_royal', 'anya_star', 'zara_beats', 'kabir_vocals', 'mia_chat', 'anya_test', 'zara_dj'
        ]);
        let foundFakeOnSeat = false;

        for (let i = 0; i < targetCount; i++) {
          const seat = incomingSeats[i];
          const isFake = seat && seat.uid && (
            FAKE_USER_IDS.has(seat.uid) ||
            seat.uid.startsWith('mock_') ||
            seat.uid.startsWith('demo_') ||
            seat.uid.startsWith('fake_')
          );

          if (isFake) {
            foundFakeOnSeat = true;
          }

          if (seat && !isFake) {
            fullSeatsList.push(seat);
          } else {
            fullSeatsList.push({
              index: i,
              uid: null,
              displayName: '',
              photoURL: '',
              numericId: '',
              isMuted: false,
              isSelfMuted: false,
              isLocked: seat?.isLocked || false
            });
          }
        }
        setSeats(fullSeatsList);

        if (foundFakeOnSeat && hostFlag) {
          updateDoc(roomRef, { seats: fullSeatsList }).catch(() => {});
        }

        // Check if current user is banned
        if (data.bannedUsers && data.bannedUsers.includes(activeUid)) {
          toast.error('You were restricted from this room 🚫');
          navigate('/rooms');
        }

        // Check if current user was kicked
        if (data.kickedUsers && data.kickedUsers.includes(activeUid)) {
          toast.error('You were removed from the room 🚫');
          navigate('/rooms');
        }

        // Sync allowedUsers for Private Room
        if (data.allowedUsers && Array.isArray(data.allowedUsers)) {
          setSelectedAllowedUsers(data.allowedUsers);
        }
      }
    }, (error) => {
      console.warn("Room onSnapshot notice:", error);
    });

    return () => unsubscribe();
  }, [roomId, activeUid, navigate]);

  // Real-time Viewers / Members presence sync and Entry Announcements
  useEffect(() => {
    if (!roomId) return;

    // Register active user in Firestore room members
    const memberDocRef = doc(db, 'rooms', roomId, 'members', activeUid);
    setDoc(memberDocRef, {
      uid: activeUid,
      displayName: displayName,
      photoURL: photoURL,
      numericId: numericId,
      role: isHost ? 'host' : 'viewer',
      joinedAt: new Date().toISOString(),
      lastSeen: Date.now()
    }, { merge: true }).catch(() => {});

    // Real-time listener for actual joined members in this room
    const membersColRef = collection(db, 'rooms', roomId, 'members');
    const unsubscribeMembers = onSnapshot(membersColRef, (snapshot) => {
      const liveMembers: LiveViewer[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.uid) {
          liveMembers.push({
            uid: d.uid,
            displayName: d.displayName || 'Guest User',
            photoURL: d.photoURL || INDIAN_FEMALE_AVATARS[0],
            numericId: d.numericId || d.uid.slice(0, 9).replace(/\D/g, '') || '100000000',
            joinedAt: d.joinedAt || new Date().toISOString()
          });

          // Detect new user entry announcement!
          if (!knownViewersRef.current.has(d.uid) && d.uid !== activeUid) {
            knownViewersRef.current.add(d.uid);
            const entryText = `✨ ${d.displayName} (ID: ${d.numericId || 'Guest'}) joined the room!`;
            setEntryBanner(entryText);
            setTimeout(() => setEntryBanner(null), 3500);

            // Append entry message to live chat
            setComments(prev => [
              ...prev.slice(-30),
              {
                id: `entry_${Date.now()}_${d.uid}`,
                senderId: 'sys_entry',
                senderName: 'Room Entry 🌟',
                senderPhoto: d.photoURL || INDIAN_FEMALE_AVATARS[0],
                senderNumericId: d.numericId,
                text: `${d.displayName} joined the voice room! 🚪✨`,
                isEntry: true
              }
            ]);
          }
        }
      });

      if (liveMembers.length > 0) {
        setViewers(liveMembers);
      }
    }, (err) => {
      console.warn("Room members snapshot note:", err);
    });

    return () => {
      unsubscribeMembers();
      deleteDoc(memberDocRef).catch(() => {});
    };
  }, [roomId, activeUid, displayName, photoURL, numericId, isHost]);

  // Real-time Comments Listener
  useEffect(() => {
    if (!roomId) return;
    const commentsQuery = query(
      collection(db, 'rooms', roomId, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const liveComments: LiveComment[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        liveComments.unshift({
          id: docSnap.id,
          senderId: d.senderId,
          senderName: d.senderName,
          senderPhoto: d.senderPhoto,
          senderNumericId: d.senderNumericId,
          text: d.text,
          isHost: d.isHost
        });
      });
      if (liveComments.length > 0) {
        setComments(liveComments);
      }
    }, (err) => {
      console.warn("Room comments snapshot note:", err);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Real-time Reactions Listener (Animates strictly on user's seat / ID avatar)
  useEffect(() => {
    if (!roomId) return;
    const reactionsRef = collection(db, 'rooms', roomId, 'reactions');
    const q = query(reactionsRef, orderBy('createdAt', 'desc'), limit(15));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const reactionId = change.doc.id;
          if (data && data.senderId !== activeUid && data.emoji) {
            // Find sender's seat or host
            const senderSeatIdx = seats.findIndex(s => s.uid === data.senderId);
            const targetSeatIndex: number | 'host' | null = 
              senderSeatIdx !== -1 
                ? senderSeatIdx 
                : (data.senderId === roomData?.hostId ? 'host' : null);

            // ONLY show animation on specific user's seat/host ID
            if (targetSeatIndex !== null) {
              const activeAnim: ActiveSeatEmoji = {
                id: `seat_emoji_${reactionId}_${Date.now()}`,
                emoji: data.emoji,
                seatIndex: targetSeatIndex,
                senderName: data.senderName || 'User',
                senderPhoto: data.senderPhoto,
                senderNumericId: data.senderNumericId,
                createdAt: Date.now()
              };
              setActiveSeatEmojis(prev => [...prev.slice(-12), activeAnim]);
              setTimeout(() => {
                setActiveSeatEmojis(prev => prev.filter(a => a.id !== activeAnim.id));
              }, 4800);
            }
          }
        }
      });
    }, (err) => {
      console.warn("Room reactions snapshot note:", err);
    });

    return () => unsubscribe();
  }, [roomId, activeUid, seats, roomData?.hostId]);

  // Send Chat Message
  const handleSendComment = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : chatInput).trim();
    if (!textToSend || !roomId) return;

    if (mutedUsers.includes(activeUid)) {
      toast.error('You are muted in this room 🔇');
      return;
    }

    if (!customText) {
      setChatInput('');
    }

    const newComment: LiveComment = {
      id: `local_${Date.now()}`,
      senderId: activeUid,
      senderName: displayName,
      senderPhoto: photoURL,
      senderNumericId: numericId,
      text: textToSend,
      isHost: isHost
    };

    setComments(prev => [...prev.slice(-25), newComment]);

    try {
      await addDoc(collection(db, 'rooms', roomId, 'comments'), {
        senderId: activeUid,
        senderName: displayName,
        senderPhoto: photoURL,
        senderNumericId: numericId,
        text: textToSend,
        isHost: isHost,
        createdAt: Date.now()
      });
    } catch (err) {}
  };

  // Send Reaction: Large In-Place 5-Second Seat Animated Emoji on User Avatar ID
  const handleSendReaction = async (emoji: string) => {
    if (!roomId) return;
    const mySeatIndex = seats.findIndex(s => s.uid === activeUid);
    const targetSeatIndex: number | 'host' | null = mySeatIndex !== -1 ? mySeatIndex : (isHost ? 'host' : null);
    
    // If user is seated or host, animate directly on their avatar ID
    if (targetSeatIndex !== null) {
      const activeAnim: ActiveSeatEmoji = {
        id: `seat_emoji_${Date.now()}_${Math.random()}`,
        emoji,
        seatIndex: targetSeatIndex,
        senderName: displayName,
        senderPhoto: photoURL,
        senderNumericId: numericId,
        createdAt: Date.now()
      };
      setActiveSeatEmojis(prev => [...prev.slice(-12), activeAnim]);
      setTimeout(() => {
        setActiveSeatEmojis(prev => prev.filter(a => a.id !== activeAnim.id));
      }, 4800);
    } else {
      toast.info('Take a seat 🪑 on mic to display your animated emoji on screen!');
    }

    try {
      await addDoc(collection(db, 'rooms', roomId, 'reactions'), {
        emoji: emoji,
        senderId: activeUid,
        senderName: displayName,
        senderPhoto: photoURL,
        senderNumericId: numericId,
        seatIndex: targetSeatIndex ?? 'audience',
        createdAt: Date.now()
      });
    } catch (e) {}
  };

  // Send Luxury Gift with Fullscreen Animation & Coin Deduction
  const handleSendLuxuryGift = async (
    gift: LuxuryGiftItem,
    recipient: { id: string; uid?: string; name: string; photo?: string } | null
  ) => {
    if (!roomId) return;
    const userCoins = profile?.coins ?? 50000;

    if (userCoins < gift.coins) {
      toast.error(`Not enough coins! You need ${gift.coins.toLocaleString()} coins. Please recharge 🪙`);
      return;
    }

    setShowGiftPicker(false);
    particleCanvasRef.current?.triggerBurst(gift.icon || '🎁');

    // 1. Deduct coins from sender in Firestore
    try {
      const userRef = doc(db, 'users', activeUid);
      await updateDoc(userRef, {
        coins: Math.max(0, userCoins - gift.coins)
      });
    } catch (e) {}

    // 2. Add coins to receiver if receiver exists and is not self
    if (recipient && recipient.id && recipient.id !== activeUid) {
      try {
        const receiverRef = doc(db, 'users', recipient.id);
        const rSnap = await getDoc(receiverRef);
        if (rSnap.exists()) {
          const currentRCoins = rSnap.data().coins || 0;
          await updateDoc(receiverRef, {
            coins: currentRCoins + gift.coins
          });
        }
      } catch (e) {}
    }

    // 3. Post gift event to Firestore rooms/{roomId}/gifts to trigger for all listeners
    const giftDocData = {
      giftId: gift.id,
      giftName: gift.name,
      hindiName: gift.hindiName,
      icon: gift.icon,
      coins: gift.coins,
      animType: gift.animType,
      senderId: activeUid,
      senderName: displayName,
      senderPhoto: photoURL,
      receiverId: recipient?.id,
      receiverName: recipient?.name,
      receiverPhoto: recipient?.photo,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'rooms', roomId, 'gifts'), giftDocData);
    } catch (e) {}

    // 4. Send chat announcement
    const receiverLabel = recipient ? ` to ${recipient.name}` : '';
    handleSendComment(undefined, `🎁 Gifted ${gift.name} ${gift.icon}${receiverLabel}!`);

    recordAdminLog(
      'change_theme',
      'settings',
      `${displayName} gifted ${gift.name} ${gift.icon} (${gift.coins} coins)${receiverLabel} 🎁`
    );

    toast.success(`🎁 Sent ${gift.name} ${gift.icon}!`);
  };

  // Take / Shift Seat Action (सीट पर बैठें / शिफ्ट करें 🪑) - 1-Click with ZERO ID CLONING
  const handleTakeSeat = async (seatIdx: number) => {
    if (mutedUsers.includes(activeUid)) {
      toast.error('You are muted in this room 🔇');
      return;
    }
    if (bannedUsers.includes(activeUid)) {
      toast.error('You are restricted in this room 🚫');
      return;
    }

    const currentSeat = seats[seatIdx];
    if (currentSeat?.isLocked && !isHost) {
      toast.error('This seat is locked by Host 🔒');
      return;
    }

    // If clicking on already own seat, do nothing
    if (currentSeat && currentSeat.uid === activeUid) {
      return;
    }

    // If another user occupies this seat
    if (currentSeat && currentSeat.uid && currentSeat.uid !== activeUid) {
      setSelectedOccupiedSeat(currentSeat);
      return;
    }

    // PREVENT CLONING: Remove activeUid from ALL other seats so the user only occupies ONE seat!
    const updatedSeats = seats.map((s, idx) => {
      if (idx === seatIdx) {
        return {
          index: seatIdx,
          uid: activeUid,
          displayName: displayName || (isHost ? 'Host' : 'Guest'),
          photoURL: photoURL || INDIAN_FEMALE_AVATARS[0],
          numericId: numericId,
          isMuted: isMicMuted,
          isSelfMuted: isMicMuted,
          isLocked: false
        };
      } else if (s.uid === activeUid) {
        // Vacate previous seat completely to prevent cloning
        return {
          index: idx,
          uid: null,
          displayName: '',
          photoURL: '',
          numericId: '',
          isMuted: false,
          isSelfMuted: false,
          isLocked: s.isLocked || false
        };
      }
      return s;
    });

    setSeats(updatedSeats);
    setSelectedEmptySeatIndex(null);

    if (roomId) {
      try {
        await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      } catch (e) {}
    }
    recordAdminLog(
      isHost ? 'shift_seat' : 'take_seat',
      'seat',
      `${displayName} sat on Seat ${seatIdx + 1} 🪑`,
      { id: activeUid, name: displayName, photo: photoURL },
      seatIdx
    );
    toast.success(`🪑 ${isHost ? 'Shifted to' : 'Took'} Seat ${seatIdx + 1}! Live audio connected 🎙️`);
  };

  // Return Host to Host Stage Podium from a numbered seat
  const handleReturnToHostStage = async () => {
    if (!isHost || !roomId) return;
    const isSittingOnNumberSeat = seats.some(s => s.uid === activeUid);
    if (!isSittingOnNumberSeat) return;

    const updatedSeats = seats.map((s, idx) => {
      if (s.uid === activeUid) {
        return {
          index: idx,
          uid: null,
          displayName: '',
          photoURL: '',
          numericId: '',
          isMuted: false,
          isSelfMuted: false,
          isLocked: s.isLocked || false
        };
      }
      return s;
    });

    setSeats(updatedSeats);
    try {
      await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      recordAdminLog('host_stage_return', 'settings', `${displayName} returned to Host Stage Podium 👑`, { id: activeUid, name: displayName, photo: photoURL });
      toast.success('Returned to Host Stage Podium 👑');
    } catch (e) {}
  };

  // Leave Seat Action (सीट छोड़ें 🚪) - Auto stops any playing music!
  const handleLeaveMySeat = async () => {
    roomAudioEngine.stopAllMusic();
    const userSeatIdx = seats.findIndex(s => s.uid === activeUid);
    if (userSeatIdx === -1) return;

    const updatedSeats = seats.map((s, idx) => {
      if (s.uid === activeUid) {
        return {
          index: idx,
          uid: null,
          displayName: '',
          photoURL: '',
          numericId: '',
          isMuted: false,
          isSelfMuted: false,
          isLocked: s.isLocked || false
        };
      }
      return s;
    });

    setSeats(updatedSeats);
    setSelectedOccupiedSeat(null);

    if (roomId) {
      try {
        await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      } catch (e) {}
    }
    recordAdminLog('leave_seat', 'seat', `${displayName} stepped down from Seat ${userSeatIdx + 1} 🚪`, { id: activeUid, name: displayName, photo: photoURL }, userSeatIdx);
    toast.info(`You stepped down from Seat ${userSeatIdx + 1} 🚪`);
  };

  // Host: Toggle Lock Seat (सीट लॉक / अनलॉक करें 🔒)
  const handleToggleLockSeat = async (seatIdx: number) => {
    if (!isHost || !roomId) return;
    const updatedSeats = [...seats];
    const targetSeat = updatedSeats[seatIdx];
    if (!targetSeat) return;

    targetSeat.isLocked = !targetSeat.isLocked;
    setSeats(updatedSeats);
    setSelectedEmptySeatIndex(null);

    try {
      await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      recordAdminLog(
        targetSeat.isLocked ? 'lock_seat' : 'unlock_seat',
        'seat',
        `${displayName} ${targetSeat.isLocked ? 'locked 🔒' : 'unlocked 🔓'} Seat ${seatIdx + 1}`,
        undefined,
        seatIdx
      );
      toast.success(targetSeat.isLocked ? `Seat ${seatIdx + 1} Locked 🔒` : `Seat ${seatIdx + 1} Unlocked 🔓`);
    } catch (e) {}
  };

  // Host: Remove user from Seat (सीट से हटाएं / Left Seat)
  const handleRemoveUserFromSeat = async (seatIdx: number) => {
    if (!isHost || !roomId) return;
    const target = seats[seatIdx];
    if (target?.uid === activeUid) {
      roomAudioEngine.stopAllMusic();
    }

    const updatedSeats = [...seats];
    const removedUser = updatedSeats[seatIdx].displayName;
    const removedUid = updatedSeats[seatIdx].uid;
    const removedPhoto = updatedSeats[seatIdx].photoURL;
    updatedSeats[seatIdx] = {
      index: seatIdx,
      uid: null,
      displayName: '',
      photoURL: '',
      numericId: '',
      isMuted: false,
      isSelfMuted: false,
      isLocked: false
    };
    setSeats(updatedSeats);
    setSelectedOccupiedSeat(null);

    try {
      await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      recordAdminLog(
        'remove_seat',
        'seat',
        `${displayName} removed ${removedUser || 'User'} from Seat ${seatIdx + 1} 🚪`,
        { id: removedUid || undefined, name: removedUser, photo: removedPhoto },
        seatIdx
      );
      toast.info(`Removed ${removedUser || 'User'} from Seat ${seatIdx + 1} 🚪`);
    } catch (e) {}
  };

  // Host: Toggle Mute for Seat User
  const handleToggleSeatMute = async (seatIdx: number) => {
    if (!isHost || !roomId) return;
    const updatedSeats = [...seats];
    const targetSeat = updatedSeats[seatIdx];
    if (!targetSeat || !targetSeat.uid) return;

    targetSeat.isMuted = !targetSeat.isMuted;
    setSeats(updatedSeats);
    setSelectedOccupiedSeat(null);

    try {
      await updateDoc(doc(db, 'rooms', roomId), { seats: updatedSeats });
      recordAdminLog(
        targetSeat.isMuted ? 'mute_user' : 'unmute_user',
        'audio',
        `${displayName} ${targetSeat.isMuted ? 'muted 🔇' : 'unmuted 🎙️'} Seat ${seatIdx + 1} (${targetSeat.displayName})`,
        { id: targetSeat.uid, name: targetSeat.displayName, photo: targetSeat.photoURL },
        seatIdx
      );
      toast.success(targetSeat.isMuted ? 'Seat Audio Muted 🔇' : 'Seat Audio Unmuted 🎙️');
    } catch (e) {}
  };

  // Host: Kick out user from Room
  const handleKickOutUser = async (targetUid: string, targetName: string) => {
    if (!isHost || !roomId) return;
    setViewers(prev => prev.filter(v => v.uid !== targetUid));
    setSelectedOccupiedSeat(null);

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      const currentKicked = snap.exists() ? snap.data().kickedUsers || [] : [];
      await updateDoc(roomRef, {
        kickedUsers: Array.from(new Set([...currentKicked, targetUid]))
      });
      // Also clear seat if sitting
      const updatedSeats = seats.map(s => s.uid === targetUid ? { ...s, uid: null, displayName: '', photoURL: '', numericId: '' } : s);
      await updateDoc(roomRef, { seats: updatedSeats });
      setSeats(updatedSeats);
      recordAdminLog(
        'kick_user',
        'moderation',
        `${displayName} kicked ${targetName} from the room 🚫`,
        { id: targetUid, name: targetName }
      );
      toast.success(`🚫 ${targetName} has been kicked out!`);
    } catch (e) {
      toast.success(`🚫 ${targetName} kicked out!`);
    }
  };

  // Host: Un-kick / Unban user from Room
  const handleUnkickUser = async (targetUid: string, targetName: string) => {
    if (!isHost || !roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      const currentKicked: string[] = snap.exists() ? snap.data().kickedUsers || [] : [];
      const updatedKicked = currentKicked.filter(id => id !== targetUid);
      await updateDoc(roomRef, { kickedUsers: updatedKicked });
      recordAdminLog(
        'unkick_user',
        'moderation',
        `${displayName} unbanned ${targetName} from the room ✅`,
        { id: targetUid, name: targetName }
      );
      toast.success(`Unbanned ${targetName} ✅`);
    } catch (e) {
      toast.error('Failed to unban user');
    }
  };

  // Share Room Link
  const handleShareRoomLink = async (openModal: boolean = true) => {
    const origin = getPublicOrigin();
    const dynamicUrl = `${origin}/room/${roomId}`;
    const ok = await copyTextToClipboard(dynamicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);

    if (ok) {
      toast.success('Room link copied! 📋');
    } else {
      toast.info(`Room Link: ${dynamicUrl}`);
    }

    if (openModal) {
      setShowShareModal(true);
    }
  };

  const handleShareWhatsApp = () => {
    const origin = getPublicOrigin();
    const dynamicUrl = `${origin}/room/${roomId}`;
    const shareTitle = roomData?.title || `${displayName}'s Live Party`;
    const text = `🔥 Join my Live Voice Room on Maxo! 🎙️✨\nRoom: "${shareTitle}"\n👉 ${dynamicUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    const origin = getPublicOrigin();
    const dynamicUrl = `${origin}/room/${roomId}`;
    const shareTitle = roomData?.title || `${displayName}'s Live Party`;
    const text = `🔥 Join my Live Voice Room on Maxo! 🎙️✨ Room: "${shareTitle}"`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(dynamicUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = async () => {
    const origin = getPublicOrigin();
    const dynamicUrl = `${origin}/room/${roomId}`;
    const shareTitle = roomData?.title || `${displayName}'s Live Party`;
    const shareMessage = `🔥 Join my live party on Maxo! 🎙️✨ Room: "${shareTitle}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: dynamicUrl,
        });
        toast.success('Shared successfully! 🎉');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleShareRoomLink(false);
        }
      }
    } else {
      handleShareRoomLink(false);
    }
  };

  // Minimize Live (PiP mode)
  const handleMinimizeLive = () => {
    navigate('/rooms');
    toast.info('Room minimized to background audio 🎙️');
  };

  // Leave / End Room
  const handleLeaveOrEndRoom = async () => {
    if (isHost && roomId) {
      try {
        await updateDoc(doc(db, 'rooms', roomId), { isLive: false });
        await deleteDoc(doc(db, 'rooms', roomId));
      } catch (e) {}
      toast.info('Voice Room Ended 🛑');
    } else {
      toast.info('Left Room 🚪');
    }
    navigate('/rooms');
  };

  // Toggle Public / Private Mode for Host
  const handleSetRoomMode = async (toPrivate: boolean) => {
    if (!isHost || !roomId) return;
    try {
      const initialAllowed = roomData?.allowedUsers?.length ? roomData.allowedUsers : [activeUid];
      await updateDoc(doc(db, 'rooms', roomId), {
        isPrivate: toPrivate,
        roomMode: toPrivate ? 'private' : 'public',
        allowedUsers: initialAllowed
      });
      setRoomData((prev: any) => ({ ...prev, isPrivate: toPrivate, roomMode: toPrivate ? 'private' : 'public', allowedUsers: initialAllowed }));
      recordAdminLog(
        'change_privacy',
        'settings',
        `${displayName} switched room to ${toPrivate ? 'Private 🔒' : 'Public 🌐'}`
      );
      toast.success(toPrivate ? '🔒 Room is now Private (प्राइवेट मोड सक्रिय)' : '🌐 Room is now Public (पब्लिक मोड सक्रिय)');
      if (toPrivate) {
        setShowAddUsersModal(true);
      }
    } catch (err) {
      console.warn("Update room privacy mode error:", err);
    }
  };

  // Toggle allowing a specific user in Private Room
  const handleToggleAllowedUser = (targetUid: string) => {
    setSelectedAllowedUsers((prev) => 
      prev.includes(targetUid) ? prev.filter(id => id !== targetUid) : [...prev, targetUid]
    );
  };

  // Save allowed users in Firestore
  const handleSaveAllowedUsers = async () => {
    if (!isHost || !roomId) return;
    try {
      const finalAllowed = Array.from(new Set([...selectedAllowedUsers, activeUid]));
      await updateDoc(doc(db, 'rooms', roomId), {
        allowedUsers: finalAllowed
      });
      setRoomData((prev: any) => ({ ...prev, allowedUsers: finalAllowed }));
      toast.success(`✅ ${finalAllowed.length} users allowed to enter!`);
      setShowAddUsersModal(false);
    } catch (err) {
      toast.error('Failed to save allowed users');
    }
  };

  // Filtered users for Private Add Modal (combine room viewers and seated guests)
  const allKnownRoomUsers = [
    ...viewers,
    ...seats.filter(s => s.uid && s.uid !== activeUid).map(s => ({
      uid: s.uid!,
      displayName: s.displayName,
      photoURL: s.photoURL,
      numericId: s.numericId,
      joinedAt: ''
    }))
  ].filter((u, index, self) => index === self.findIndex(t => t.uid === u.uid) && u.uid !== activeUid);

  const filteredUsersToSelect = allKnownRoomUsers.filter(u => {
    if (!searchUserQuery.trim()) return true;
    const query = searchUserQuery.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(query) || (u.numericId || '').includes(query);
  });

  // If minimized PiP Floating Capsule is active
  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-20 right-4 z-50 p-2.5 rounded-2xl bg-black/90 border border-amber-400/50 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 cursor-pointer max-w-[200px]"
        onClick={() => navigate(`/room/${roomId}`)}
      >
        <div className="relative shrink-0">
          <img 
            src={roomData?.thumbnailUrl || roomData?.hostPhoto || photoURL} 
            alt="DP" 
            className="w-9 h-9 rounded-xl object-cover border border-amber-400"
          />
          {isSpeakingLocal && (
            <span className="absolute -inset-1 rounded-xl border border-amber-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black text-white truncate block">
            {roomData?.title || 'Maxo Voice'}
          </span>
          <span className="text-[8px] text-amber-300 font-mono block">
            ID: {roomId}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/room/${roomId}`);
          }}
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs"
        >
          ↗
        </button>
      </motion.div>
    );
  }

  // Check if Room is Private and user is not allowed
  const isRoomPrivate = roomData?.isPrivate || roomData?.roomMode === 'private';
  const isUserAllowed = isHost || (roomData?.allowedUsers && roomData.allowedUsers.includes(activeUid));

  if (roomData && isRoomPrivate && !isUserAllowed) {
    return (
      <div id="private-room-locked" className="fixed inset-0 z-50 bg-[#07050F] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-500/20 via-pink-500/10 to-purple-600/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <Lock size={44} className="text-red-400 animate-pulse" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black shadow">
            PRIVATE
          </span>
        </div>

        <h2 className="text-xl font-black text-white">🔒 This Room is Private</h2>
        <p className="text-xs text-amber-300 font-bold mt-1">
          (प्राइवेट रूम - केवल चुने हुए सदस्य)
        </p>
        
        <p className="text-xs text-zinc-400 max-w-xs mt-3 leading-relaxed">
          इस रूम में केवल वही यूज़र प्रवेश कर सकते हैं जिन्हें रूम होस्ट (<span className="text-white font-bold">{roomData?.hostName || 'Host'}</span>) ने अपनी मर्ज़ी से ऐड किया है।
        </p>

        <div className="mt-8 flex flex-col gap-2.5 w-full max-w-xs">
          <Button
            onClick={() => navigate('/rooms')}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 hover:opacity-95 text-black font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Back to Rooms (वापस जाएं) 🎙️
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="voice-room-fullscreen" className="fixed inset-0 z-50 bg-[#080512] text-white flex flex-col justify-between overflow-hidden select-none">
      
      {/* 1. LUXURY ROOM WALLPAPER BACKDROP (NO VIDEO / NO CAMERA) */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center pointer-events-none">
        <div 
          className="w-full h-full flex flex-col items-center justify-center relative bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${roomData?.wallpaperUrl || roomData?.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop'})`
          }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-transparent to-black/95 pointer-events-none" />
      </div>

      {/* 2. TOP FLOATING HEADER (Luxury Room DP, ID Copy, Privacy, Admin Logs, Share, Listeners, Minimize, End) */}
      <div className="relative z-20 px-3.5 pt-3 flex items-center justify-between">
        
        {/* Left: Luxury Room DP + Title + Room ID (Click to open Edit Room Settings / Profile) */}
        <div className="flex items-center gap-1.5 bg-black/75 hover:bg-black/90 backdrop-blur-xl border border-amber-500/40 rounded-full p-1 pr-2.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all">
          <button
            type="button"
            onClick={() => setShowEditRoomModal(true)}
            className="flex items-center gap-2 cursor-pointer text-left group"
            title="Room Settings & Profile 👑"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                <img 
                  src={roomData?.thumbnailUrl || roomData?.hostPhoto || photoURL} 
                  alt="Room DP" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5">
                <ActivePulseDot size="xs" />
              </span>
            </div>
            <div className="min-w-0 max-w-[100px] sm:max-w-[130px]">
              <h4 className="text-[11px] font-black text-white truncate flex items-center gap-1 group-hover:text-amber-300 transition-colors">
                <span>{roomData?.title || roomData?.hostName || displayName}</span>
                {isHost && <Crown size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
              </h4>
              <span className="text-[8.5px] text-amber-300 font-mono block truncate">
                ID: {roomId}
              </span>
            </div>
          </button>

          {/* Quick Copy Room ID Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(roomId || '');
              toast.success(`Room ID ${roomId} copied! 📋`);
            }}
            className="w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/20 text-zinc-400 hover:text-amber-300 flex items-center justify-center cursor-pointer transition-colors"
            title="Copy Room ID"
          >
            <Copy size={9} />
          </button>
        </div>

        {/* Right Actions: Admin Panel (Owner) + Share + Listeners Count + Minimize + End/Leave */}
        <div className="flex items-center gap-1.5">
          {/* Owner-exclusive Room Administration Shortcut */}
          {isHost && (
            <button
              type="button"
              onClick={() => {
                setEditRoomInitialTab('admin');
                setShowEditRoomModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-purple-500/25 hover:from-cyan-500/40 border border-cyan-400/60 text-cyan-300 backdrop-blur-xl shadow-md active:scale-95 transition-all cursor-pointer"
              title="Room Administration Panel 🛡️ (एडमिन प्रबंधन)"
            >
              <Shield size={12} className="text-cyan-300 stroke-[2.5]" />
              <span className="text-[10px] font-black text-cyan-300">Admin</span>
            </button>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={() => handleShareRoomLink(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 hover:from-amber-500/30 border border-amber-400/50 text-amber-300 backdrop-blur-xl shadow-md active:scale-95 transition-transform"
            title="Share Room"
          >
            <Share2 size={12} className="text-amber-300 stroke-[2.5]" />
            <span className="text-[10px] font-black text-amber-300">Share</span>
          </button>

          {/* Listeners Count */}
          <button
            type="button"
            onClick={() => setShowListenersModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 text-[11px] font-bold text-white shadow-md active:scale-95 cursor-pointer"
            title="View Listeners"
          >
            <Users size={12} className="text-amber-400" />
            <span>{Math.max(1, viewers.length)}</span>
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={handleMinimizeLive}
            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white backdrop-blur-xl shadow-md active:scale-95 cursor-pointer"
            title="Minimize Room"
          >
            <ChevronDown size={15} />
          </button>

          {/* End / Leave Button */}
          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            className="w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-600 border border-white/15 flex items-center justify-center text-white shadow-md active:scale-95 cursor-pointer"
            title={isHost ? 'End Room' : 'Leave Room'}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 3. FLOATING ENTRY BANNER ANNOUNCEMENT */}
      <AnimatePresence>
        {entryBanner && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-16 left-3 z-30 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/90 via-purple-600/90 to-black/90 text-white font-black text-[10px] shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-amber-400/40"
          >
            <Sparkles size={11} className="text-amber-300 animate-spin" />
            <span>{entryBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CENTRAL VOICE CHAT ARENA (REDESIGNED LUXURY AUDIO STAGE) */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-start px-2 pt-2 pb-1 overflow-y-auto scrollbar-none">
        
        {/* LUXURY AUDIO STAGE PODIUM CONTAINER */}
        <div className="w-full max-w-sm mx-auto p-3.5 rounded-3xl bg-gradient-to-b from-white/[0.08] via-purple-950/20 to-black/60 border border-white/15 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.6)] my-auto relative overflow-hidden">
          
          {/* Ambient Stage Top Light Beam */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-b from-amber-400/20 via-pink-500/10 to-transparent blur-xl pointer-events-none" />

          {/* Stage Aura Header */}
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Radio size={11} className="text-amber-400 animate-pulse" />
                Live Audio Stage
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              <Armchair size={10} className="text-cyan-400" />
              <span>{seats.filter(s => !!s.uid).length} / {seats.length} Seated</span>
            </div>
          </div>

          {/* ULTRA ATTRACTIVE AUDIO SEATS GRID (4 x 2 = 8 SEATS) */}
          <div className="grid grid-cols-4 gap-x-2.5 sm:gap-x-3.5 gap-y-3 px-0.5">
            {seats.map((seat, sIdx) => {
              const isOccupied = !!seat.uid;
              const isMe = seat.uid === activeUid;
              const isSeatMuted = seat.isMuted || seat.isSelfMuted;
              const isSeatLocked = seat.isLocked;
              const isHostSeat = sIdx === 0 || seat.uid === roomData?.hostId;
              const hasEmojiOnThisSeat = activeSeatEmojis.some(a => a.seatIndex === sIdx);

              // Determine whether this seat is playing music or speaking normally
              const isMusicPlayingOnSeat = isOccupied && (
                (isMe && activeMusicInfo.isPlaying) ||
                (seat.uid === roomData?.hostId && roomData?.musicPlaying) ||
                (seat.isMusicPlaying || false)
              );

              // Vocal sound waves logic: Red waves for music, Green waves for normal voice
              const isSpeakingOnThisSeat = isOccupied && !hasEmojiOnThisSeat && (
                isMusicPlayingOnSeat || (
                  !isSeatMuted && (
                    isMe 
                      ? ((isSpeakingLocal || localAudioLevel > 0.03) && !isMicMuted)
                      : (!!activeSpeakerStreams[seat.uid || ''] || seat.isSpeaking || false)
                  )
                )
              );

              return (
                <div key={sIdx} className="flex flex-col items-center group relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isOccupied) {
                        setSelectedOccupiedSeat(seat);
                      } else if (isSeatLocked && !isHost) {
                        toast.error(`Seat ${sIdx + 1} is locked by Host 🔒`);
                      } else {
                        // 1-Click Direct Sit & Shift!
                        handleTakeSeat(sIdx);
                      }
                    }}
                    className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                      isOccupied
                        ? `p-[2.5px] ${
                            isMusicPlayingOnSeat
                              ? 'bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 shadow-[0_0_24px_rgba(239,68,68,0.85)] border-2 border-red-300'
                              : isSpeakingOnThisSeat
                                ? 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_24px_rgba(16,185,129,0.85)] border-2 border-emerald-300'
                                : isHostSeat
                                  ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.6)] border-2 border-amber-300/80'
                                  : isSeatMuted 
                                    ? 'bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                                    : 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 border border-cyan-300/80 shadow-[0_0_18px_rgba(6,182,212,0.5)]'
                          }`
                        : isSeatLocked
                          ? 'bg-transparent border-2 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                          : isHostSeat
                            ? 'bg-gradient-to-b from-amber-950/40 via-yellow-950/30 to-black/60 border-2 border-dashed border-amber-400/80 hover:border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.4)] hover:shadow-[0_0_26px_rgba(251,191,36,0.7)] hover:scale-105'
                            : 'bg-gradient-to-b from-cyan-950/35 via-purple-950/25 to-black/60 hover:from-cyan-900/50 hover:to-purple-900/50 border-2 border-dashed border-cyan-400/70 hover:border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.6)] hover:scale-105'
                    }`}
                    title={isOccupied ? seat.displayName : isSeatLocked ? `Seat ${sIdx + 1} (Locked)` : isHostSeat ? `Host Mic 👑 (Tap to Sit)` : `Seat ${sIdx + 1} (Tap to Sit / Shift)`}
                  >
                    {/* Inside Seat Capsule */}
                    <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden backdrop-blur-2xl relative ${
                      isOccupied
                        ? 'bg-black/90'
                        : isSeatLocked
                          ? 'bg-red-950/40 text-red-300'
                          : 'bg-gradient-to-b from-white/[0.05] to-black/40 text-white'
                    }`}>
                      {isOccupied ? (
                        <>
                          <img 
                            src={seat.photoURL || INDIAN_FEMALE_AVATARS[0]} 
                            alt={seat.displayName} 
                            className="w-full h-full rounded-full object-cover"
                          />
                          
                          {/* REAL-TIME VOCAL SOUND WAVES & EQUALIZER: RED for Music 🔴, GREEN for Normal Voice 🟢 */}
                          {isSpeakingOnThisSeat && (
                            <>
                              <motion.span 
                                animate={{ scale: [1, 1.38, 1], opacity: [0.95, 0.1, 0.95] }}
                                transition={{ repeat: Infinity, duration: 0.85, ease: "easeInOut" }}
                                className={`absolute -inset-1 rounded-full border-2 pointer-events-none ${
                                  isMusicPlayingOnSeat 
                                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]' 
                                    : 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,1)]'
                                }`}
                              />
                              <motion.span 
                                animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.15, ease: "easeInOut", delay: 0.1 }}
                                className={`absolute -inset-2 rounded-full border pointer-events-none ${
                                  isMusicPlayingOnSeat 
                                    ? 'border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.85)]' 
                                    : 'border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.85)]'
                                }`}
                              />
                              {/* Animated Equalizer Wave Bars */}
                              <div className="absolute bottom-0 inset-x-0 flex items-end justify-center gap-0.5 pb-0.5 z-20 pointer-events-none bg-black/60 backdrop-blur-sm">
                                {isMusicPlayingOnSeat ? (
                                  <>
                                    <span className="w-0.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-0.5 h-3.5 bg-rose-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-0.5 h-2.5 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                  </>
                                ) : (
                                  <>
                                    <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-0.5 h-3.5 bg-teal-300 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                  </>
                                )}
                              </div>
                            </>
                          )}

                          {/* Floating musical note when playing music */}
                          {isMe && activeMusicInfo.isPlaying && (
                            <motion.span
                              animate={{ y: [-2, -14, -2], opacity: [0.8, 1, 0.8], scale: [0.9, 1.2, 0.9] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] filter drop-shadow-[0_0_8px_rgba(168,85,247,1)] pointer-events-none"
                            >
                              🎵
                            </motion.span>
                          )}

                          {/* Active Status Pulse */}
                          <span className="absolute -top-0.5 -right-0.5">
                            <ActivePulseDot size="xs" />
                          </span>

                          {/* Host crown if seat user is the host */}
                          {isHostSeat && (
                            <span className="absolute -top-1.5 -left-1.5 p-0.5 rounded-full bg-black/60 shadow">
                              <Crown size={13} className="text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                            </span>
                          )}
                        </>
                      ) : isSeatLocked ? (
                        <div className="flex flex-col items-center justify-center text-red-400">
                          <Lock size={15} />
                        </div>
                      ) : (
                        /* Attractive Empty Audio Seat: Glowing Mic with subtle Plus badge */
                        <div className="flex flex-col items-center justify-center transition-transform group-hover:scale-110">
                          {isHostSeat ? (
                            <div className="flex flex-col items-center">
                              <Crown size={14} className="text-amber-400 animate-pulse mb-0.5" />
                              <Mic size={14} className="text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Mic size={16} className="text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
                              <span className="text-[7px] font-black text-cyan-400 mt-0.5">+ SIT</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mic Mute / Unmute Status Badge */}
                    {isOccupied && (
                      <span className={`absolute -bottom-1 -right-1 z-30 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] border-2 border-black shadow font-black transition-transform ${
                        isSeatMuted ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse'
                      }`}>
                        {isSeatMuted ? '🔇' : '🎙️'}
                      </span>
                    )}

                    {/* Large Animated Emoji directly on this Seat */}
                    {activeSeatEmojis
                      .filter(a => a.seatIndex === sIdx)
                      .map(anim => (
                        <SeatAnimatedEmojiBadge key={anim.id} emoji={anim.emoji} />
                      ))
                    }
                  </button>

                  {/* Seat User Name Label */}
                  <span className={`text-[9px] font-black mt-1.5 truncate max-w-[70px] text-center px-2 py-0.5 rounded-full border shadow-md flex items-center justify-center gap-0.5 backdrop-blur-md ${
                    isOccupied 
                      ? isHostSeat 
                        ? 'bg-amber-950/80 text-amber-200 border-amber-400/50' 
                        : 'bg-black/85 text-white border-cyan-500/40' 
                      : isHostSeat
                        ? 'bg-amber-950/50 text-amber-300 border-amber-400/30'
                        : 'bg-black/60 text-zinc-400 border-white/10'
                  }`}>
                    {isOccupied && isHostSeat && <Crown size={8} className="text-amber-400 shrink-0" />}
                    <span className="truncate">{isOccupied ? seat.displayName.split(' ')[0] : isSeatLocked ? `Locked 🔒` : isHostSeat ? `Host Mic` : `Seat ${sIdx + 1}`}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE LISTENERS & AUDIENCE LIST (श्रोतागण - ID & Name displayed below seats) */}
        <div className="w-full max-w-sm mt-3 pt-2.5 border-t border-white/10 px-1 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
              <Users size={12} className="text-amber-400" />
              <span>Active Audience & Listeners ({Math.max(1, viewers.length)})</span>
            </span>
            <button
              onClick={() => setShowListenersModal(true)}
              className="text-[9px] font-bold text-zinc-400 hover:text-white"
            >
              View All ({viewers.length}) →
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {viewers.map((v) => (
              <div 
                key={v.uid} 
                className="relative flex items-center gap-1.5 bg-black/60 border border-white/10 px-2 py-1 rounded-full shrink-0 shadow-sm"
              >
                <div className="relative">
                  <img 
                    src={v.photoURL || INDIAN_FEMALE_AVATARS[0]} 
                    alt="" 
                    className="w-5 h-5 rounded-full object-cover border border-amber-400/40" 
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-white truncate max-w-[60px] leading-tight">
                    {v.displayName.split(' ')[0]}
                  </span>
                  <span className="text-[7.5px] text-amber-300/90 font-mono leading-none">
                    ID: {v.numericId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. LUXURY FULLSCREEN GIFT CELEBRATION OVERLAY */}
      <LuxuryGiftAnimationOverlay
        activeGift={activeLuxuryGift}
        onComplete={() => setActiveLuxuryGift(null)}
      />

      {/* 7. LIVE CHAT STREAM CONTAINER (Bottom Left) */}
      <div className="relative z-20 px-3 pb-2 max-h-36 overflow-y-auto space-y-1.5 scrollbar-none flex flex-col justify-end">
        {comments.slice(-8).map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`px-2.5 py-1 rounded-xl text-xs max-w-[85%] backdrop-blur-md border inline-flex items-center gap-1.5 shadow-sm ${
              comment.isEntry 
                ? 'bg-gradient-to-r from-amber-500/25 to-purple-600/25 border-amber-400/40 text-amber-200 font-bold'
                : comment.isHost
                  ? 'bg-amber-500/20 border-amber-400/30 text-white'
                  : 'bg-black/60 border-white/10 text-white'
            }`}
          >
            <span className={`font-black text-[11px] ${comment.isHost ? 'text-amber-300' : 'text-cyan-300'}`}>
              {comment.senderName}:
            </span>
            <span className="text-zinc-200 text-[11px] break-words">
              {comment.text}
            </span>
          </motion.div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* 8. REACTION TRAY POPOVER (3-PAGE ADVANCED ANIMATED EMOJI KEYBOARD LIKE VIDEO) */}
      <AnimatePresence>
        {showReactionTray && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative z-30 mx-2.5 mb-2 p-3 rounded-3xl bg-[#120B22]/95 border border-amber-400/50 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-2.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase text-amber-300 tracking-wide">
                  Animated Mic Emojis (एनिमेटेड इमोजी)
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowReactionTray(false)} 
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* 4x2 Emoji Grid for Current Page */}
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              {REACTION_EMOJIS_PAGES[reactionTrayPage].map((rx) => (
                <button
                  key={rx.label}
                  type="button"
                  onClick={() => {
                    handleSendReaction(rx.emoji);
                    setShowReactionTray(false);
                  }}
                  className="relative flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/60 active:scale-115 transition-all cursor-pointer group shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  title={rx.label}
                >
                  {rx.badge && (
                    <span className="absolute -top-1.5 right-1 px-1 py-0.1 bg-gradient-to-r from-amber-500 to-rose-500 text-black text-[7px] font-black rounded-full shadow border border-amber-300 leading-tight">
                      {rx.badge}
                    </span>
                  )}
                  <span className="text-3xl filter drop-shadow group-hover:scale-115 transition-transform">
                    {rx.emoji}
                  </span>
                  <span className="text-[8.5px] font-black text-zinc-300 mt-1 truncate max-w-[65px] text-center leading-none">
                    {rx.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Pagination Navigation Dots (• • •) & Category Tabs */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 px-1">
              <div className="flex items-center gap-1.5">
                {['Interactive', 'Flirt & Swag', 'Hype & Cash'].map((tabName, pIdx) => (
                  <button
                    key={tabName}
                    type="button"
                    onClick={() => setReactionTrayPage(pIdx)}
                    className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      reactionTrayPage === pIdx
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tabName}
                  </button>
                ))}
              </div>

              {/* 3 Pagination Indicator Dots */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setReactionTrayPage(dotIdx)}
                    className={`transition-all rounded-full cursor-pointer ${
                      reactionTrayPage === dotIdx
                        ? 'w-4 h-1.5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]'
                        : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                    title={`Page ${dotIdx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8.5 FLOATING MINI MUSIC PLAYER DOCK (When music is active and modal is minimized/closed) */}
      <AnimatePresence>
        {activeMusicInfo.currentSong && !showMusicPlayerModal && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="relative z-30 mx-3 mb-2 px-3 py-2 rounded-2xl bg-black/90 border border-cyan-400/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(6,182,212,0.45)] flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div 
                onClick={() => setShowMusicPlayerModal(true)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Tap to maximize Music Player 🎵"
              >
                {/* Rotating Circular Visualizer with Countdown */}
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 p-[2px] shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.7)]">
                  {/* SVG Circular Progress Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeDasharray="100.5"
                      strokeDashoffset={100.5 - ((activeMusicInfo.currentTime / (activeMusicInfo.duration || 1)) * 100.5)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Disc3 size={18} className={`text-white z-10 ${activeMusicInfo.isPlaying ? 'animate-spin' : ''}`} />
                  {activeMusicInfo.isPlaying && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping z-20" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-white truncate max-w-[120px] sm:max-w-[180px] group-hover:text-cyan-300 transition-colors">
                      {activeMusicInfo.currentSong.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[7.5px] font-bold border border-cyan-400/30 shrink-0">
                      Live Vibe
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-400">
                    <span>
                      {(() => {
                        const ct = activeMusicInfo.currentTime || 0;
                        const dur = activeMusicInfo.duration || 0;
                        const m1 = Math.floor(ct / 60);
                        const s1 = Math.floor(ct % 60);
                        const m2 = Math.floor(dur / 60);
                        const s2 = Math.floor(dur % 60);
                        return `${m1}:${s1 < 10 ? '0' : ''}${s1} / ${m2}:${s2 < 10 ? '0' : ''}${s2}`;
                      })()}
                    </span>
                    {activeMusicInfo.isPlaying && (
                      <span className="text-[8px] text-cyan-400 font-sans font-bold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Playing
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mini Controls: -10s, Play/Pause, +10s, Next, Maximize, Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => roomAudioEngine.seek(Math.max(0, activeMusicInfo.currentTime - 10))}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                  title="Rewind 10s"
                >
                  <Rewind size={10} />
                </button>

                <button
                  type="button"
                  onClick={() => roomAudioEngine.togglePlayPause()}
                  className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black flex items-center justify-center font-bold shadow-md cursor-pointer active:scale-95 hover:brightness-110"
                  title={activeMusicInfo.isPlaying ? 'Pause' : 'Play'}
                >
                  {activeMusicInfo.isPlaying ? <Pause size={12} className="fill-black" /> : <Play size={12} className="fill-black ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => roomAudioEngine.seek(Math.min(activeMusicInfo.duration || 0, activeMusicInfo.currentTime + 10))}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                  title="Forward 10s"
                >
                  <FastForward size={10} />
                </button>

                <button
                  type="button"
                  onClick={() => roomAudioEngine.playNextSong()}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                  title="Next Song"
                >
                  <SkipForward size={11} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowMusicPlayerModal(true)}
                  className="w-6 h-6 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 flex items-center justify-center cursor-pointer active:scale-90"
                  title="Maximize Player"
                >
                  <Maximize2 size={11} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    roomAudioEngine.stopAllMusic();
                    toast.info('Music stopped ⏹️');
                  }}
                  className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center cursor-pointer active:scale-90"
                  title="Stop & Close"
                >
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* Clickable & Draggable Progress Bar right in the Mini Dock! */}
            <div className="w-full flex items-center gap-1.5 px-0.5">
              <input
                type="range"
                min="0"
                max={activeMusicInfo.duration || 100}
                value={activeMusicInfo.currentTime || 0}
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  roomAudioEngine.seek(newTime);
                }}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
                title="Click or drag to seek song ⏩"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. BOTTOM ACTION BAR */}
      <div className="relative z-20 px-3 pb-3 pt-1 flex items-center justify-between gap-2 bg-gradient-to-t from-black via-black/80 to-transparent">
        
        {/* Chat Input Field */}
        <form onSubmit={handleSendComment} className="flex-1 relative flex items-center">
          <Input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Say something nice..."
            className="w-full bg-black/60 border-white/15 text-xs text-white rounded-xl pl-3 pr-8 h-9 focus:border-amber-400 placeholder:text-zinc-500"
          />
          {chatInput.trim() && (
            <button
              type="submit"
              className="absolute right-1.5 w-6 h-6 rounded-lg bg-amber-400 text-black flex items-center justify-center active:scale-95 shadow"
            >
              <Send size={12} />
            </button>
          )}
        </form>

        {/* Reaction Tray Button */}
        <button
          type="button"
          onClick={() => setShowReactionTray(!showReactionTray)}
          className={`h-9 px-3 rounded-xl border flex items-center justify-center gap-1.5 backdrop-blur-md active:scale-95 transition-all shrink-0 ${
            showReactionTray ? 'bg-amber-400 text-black border-amber-300 font-bold' : 'bg-white/10 border-white/15 text-amber-300'
          }`}
          title="Reactions (एनिमेटेड इमोजी)"
        >
          <Smile size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Emoji</span>
        </button>

        {/* HOST CONTROLS */}
        {isHost && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Music & Sound FX Modal Button */}
            <button
              type="button"
              onClick={() => setShowMusicPlayerModal(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600/40 to-pink-600/40 hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-400/40 text-purple-200 flex items-center justify-center shadow-md active:scale-95 transition-transform"
              title="Room Music & Sound FX (संगीत और ध्वनि प्रभाव)"
            >
              <Music size={15} className="text-purple-300 stroke-[2.5]" />
            </button>

            {/* Voice FX */}
            <button
              type="button"
              onClick={() => setShowVoiceMenu(true)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 flex items-center justify-center active:scale-95 shadow-md"
              title="Voice Filter FX (आवाज़ प्रभाव)"
            >
              <Radio size={15} />
            </button>

            {/* Mic Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleLocalMic}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center backdrop-blur-md active:scale-95 shadow-md ${
                isMicMuted ? 'bg-red-500/30 border-red-500 text-red-300' : 'bg-emerald-500/30 border-emerald-500 text-emerald-300'
              }`}
              title="Toggle Host Mic"
            >
              {isMicMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          </div>
        )}

        {/* SEATED USER CONTROLS */}
        {!isHost && isUserSeated && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Seated Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleLocalMic}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center backdrop-blur-md active:scale-95 shadow-md ${
                isMicMuted ? 'bg-red-500/30 border-red-500 text-red-300' : 'bg-emerald-500/30 border-emerald-500 text-emerald-300'
              }`}
              title="Toggle Microphone"
            >
              {isMicMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* Music & Sound FX (Seated users can play sound effects) */}
            <button
              type="button"
              onClick={() => setShowMusicPlayerModal(true)}
              className="w-9 h-9 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-400/40 text-purple-300 flex items-center justify-center active:scale-95 shadow-md"
              title="Sound FX"
            >
              <Music size={15} />
            </button>

            {/* Leave Seat button */}
            <button
              type="button"
              onClick={handleLeaveMySeat}
              className="h-9 px-2 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 text-red-300 flex items-center justify-center gap-1 active:scale-95 text-[10px] font-bold shadow-md"
              title="Leave Seat (सीट छोड़ें)"
            >
              <LogOut size={12} />
              <span>Leave</span>
            </button>

            {/* Send Gift */}
            <button
              type="button"
              onClick={() => setShowGiftPicker(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black flex items-center justify-center shadow active:scale-95"
              title="Send Gift"
            >
              <Gift size={15} className="stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* VIEWER CONTROLS */}
        {!isHost && !isUserSeated && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Take Seat Button */}
            <button
              type="button"
              onClick={() => {
                const firstEmpty = seats.find(s => !s.uid && !s.isLocked);
                if (firstEmpty) {
                  handleTakeSeat(firstEmpty.index);
                } else {
                  toast.info('All available audio seats are occupied or locked.');
                }
              }}
              className="h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black flex items-center justify-center gap-1 shadow active:scale-95 text-xs"
              title="Take Seat (सीट पर बैठें)"
            >
              <Armchair size={14} className="stroke-[2.5]" />
              <span>Take Seat</span>
            </button>

            {/* Send Gift */}
            <button
              type="button"
              onClick={() => setShowGiftPicker(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black flex items-center justify-center shadow active:scale-95"
              title="Send Gift"
            >
              <Gift size={15} className="stroke-[2.5]" />
            </button>
          </div>
        )}

      </div>

      {/* 10. MODAL: OCCUPIED SEAT MANAGEMENT & ACTIONS */}
      <AnimatePresence>
        {selectedOccupiedSeat && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="w-full max-w-xs bg-[#110C22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={selectedOccupiedSeat.photoURL || INDIAN_FEMALE_AVATARS[0]} 
                    alt={selectedOccupiedSeat.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-amber-400"
                  />
                  <div>
                    <h4 className="text-xs font-black text-white">{selectedOccupiedSeat.displayName}</h4>
                    <span className="text-[10px] text-amber-300 font-mono">Seat {selectedOccupiedSeat.index + 1}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOccupiedSeat(null)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 text-xs"
                >
                  ✕
                </button>
              </div>

              {/* If Current User is on this Seat */}
              {selectedOccupiedSeat.uid === activeUid && (
                <div className="space-y-1.5 pt-1">
                  <Button
                    onClick={handleToggleLocalMic}
                    className="w-full h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    {isMicMuted ? 'Unmute My Mic 🎙️' : 'Mute My Mic 🔇'}
                  </Button>
                  <Button
                    onClick={handleLeaveMySeat}
                    className="w-full h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    Leave Seat (सीट छोड़ें 🚪)
                  </Button>
                </div>
              )}

              {/* If Host is Managing this Occupied Seat */}
              {isHost && selectedOccupiedSeat.uid !== activeUid && (
                <div className="space-y-1.5 pt-1">
                  <Button
                    onClick={() => handleToggleSeatMute(selectedOccupiedSeat.index)}
                    className="w-full h-8 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-bold text-xs"
                  >
                    {selectedOccupiedSeat.isMuted ? 'Unmute Seat Mic 🎙️' : 'Mute Seat Mic 🔇'}
                  </Button>
                  <Button
                    onClick={() => handleRemoveUserFromSeat(selectedOccupiedSeat.index)}
                    className="w-full h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Remove from Seat (सीट से हटाएं 🚪)
                  </Button>
                  <Button
                    onClick={() => handleKickOutUser(selectedOccupiedSeat.uid!, selectedOccupiedSeat.displayName)}
                    className="w-full h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    Kick Out from Room (कमरे से निकालें 🚫)
                  </Button>
                </div>
              )}

              {/* If Viewer is Interacting with Seated Guest */}
              {!isHost && selectedOccupiedSeat.uid !== activeUid && (
                <div className="space-y-1.5 pt-1">
                  <Button
                    onClick={() => {
                      setSelectedOccupiedSeat(null);
                      setShowGiftPicker(true);
                    }}
                    className="w-full h-8 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-xs shadow"
                  >
                    Send Gift to {selectedOccupiedSeat.displayName.split(' ')[0]} 🎁
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. MODAL: EMPTY SEAT ACTIONS FOR HOST (LOCK / UNLOCK) */}
      <AnimatePresence>
        {selectedEmptySeatIndex !== null && isHost && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="w-full max-w-xs bg-[#110C22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="text-xs font-black text-white">Seat {selectedEmptySeatIndex + 1} Controls</h4>
                <button
                  type="button"
                  onClick={() => setSelectedEmptySeatIndex(null)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => handleToggleLockSeat(selectedEmptySeatIndex)}
                  className="w-full h-9 rounded-xl bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  {seats[selectedEmptySeatIndex]?.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                  <span>{seats[selectedEmptySeatIndex]?.isLocked ? 'Unlock Seat 🔓' : 'Lock Seat (सीट लॉक करें 🔒)'}</span>
                </Button>
                <Button
                  onClick={() => handleTakeSeat(selectedEmptySeatIndex)}
                  variant="outline"
                  className="w-full h-9 rounded-xl bg-white/5 border-white/15 text-white font-bold text-xs"
                >
                  Sit on this Seat (खुद बैठें 🪑)
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. LISTENERS LIST MODAL */}
      <AnimatePresence>
        {showListenersModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="w-full max-w-sm bg-[#110C22] border border-white/15 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3 max-h-[75vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-amber-400" />
                  <h3 className="text-xs font-black text-white">Listeners ({viewers.length})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowListenersModal(false)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {viewers.map((viewer) => (
                  <div key={viewer.uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <img src={viewer.photoURL} alt={viewer.displayName} className="w-8 h-8 rounded-full object-cover border border-amber-400/50" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{viewer.displayName}</h4>
                        <span className="text-[9px] text-zinc-400 font-mono">ID: {viewer.numericId}</span>
                      </div>
                    </div>
                    {isHost && viewer.uid !== activeUid && (
                      <button
                        onClick={() => handleKickOutUser(viewer.uid, viewer.displayName)}
                        className="px-2 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[10px] font-bold"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 13. SHARE INVITE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="w-full max-w-sm bg-[#110C22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Share2 size={14} className="text-amber-400" />
                  <span>Share Room & Invite Friends</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-2">
                <span className="text-[10px] text-zinc-400 block font-mono break-all">
                  {`${getPublicOrigin()}/room/${roomId}`}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleShareRoomLink(false)}
                    className="flex-1 h-8 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs"
                  >
                    {copiedLink ? 'Copied! ✅' : 'Copy Link 📋'}
                  </Button>
                  <Button
                    onClick={handleNativeShare}
                    variant="outline"
                    className="flex-1 h-8 rounded-xl bg-white/10 border-white/20 text-white font-bold text-xs"
                  >
                    Share App 📲
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-400 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleShareTelegram}
                    className="h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-400 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send size={13} /> Telegram
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 15. END / LEAVE ROOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {showEndModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xs bg-[#110C22] border border-red-500/30 rounded-3xl p-4 shadow-2xl space-y-3 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 mx-auto flex items-center justify-center">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isHost ? 'End Voice Room?' : 'Leave Room?'}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {isHost ? 'क्या आप इस कमरे को बंद करना चाहते हैं?' : 'क्या आप इस कमरे से बाहर जाना चाहते हैं?'}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 h-9 rounded-xl bg-white/5 border-white/15 text-white font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLeaveOrEndRoom}
                  className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow"
                >
                  {isHost ? 'End Room' : 'Leave'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 16. VOICE PROCESSING MENU */}
      <VoiceProcessingMenu 
        isOpen={showVoiceMenu}
        onClose={() => setShowVoiceMenu(false)}
        voiceProcessor={globalVoiceProcessor}
        activeFilterId={activeVoiceFilter.id}
        onSelectFilter={handleSelectVoiceFilter}
        isBroadcasting={isHost || isUserSeated}
        speakerRole={isHost ? 'Host' : isUserSeated ? 'Seat Guest' : 'Viewer'}
      />

      {/* 17. ADD USERS TO PRIVATE ROOM MODAL */}
      <AnimatePresence>
        {showAddUsersModal && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#110C22] border border-amber-400/40 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-[#181130] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                    <Lock size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">Add to Private Room</h3>
                    <p className="text-[9px] text-zinc-400">सिर्फ चुने हुए यूज़र्स को अनुमति दें</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUsersModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Search User Bar */}
              <div className="p-3 border-b border-white/10 bg-black/40">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Search user by name or ID..."
                    className="bg-white/5 border-white/15 text-xs text-white rounded-xl pl-8.5 h-8.5 focus:border-amber-400 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* User list */}
              <div className="p-3 overflow-y-auto flex-1 space-y-2 max-h-60">
                {filteredUsersToSelect.length > 0 ? (
                  filteredUsersToSelect.map((u) => {
                    const isChecked = selectedAllowedUsers.includes(u.uid);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => handleToggleAllowedUser(u.uid)}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-amber-400/15 border-amber-400/60 shadow-md'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={u.photoURL || INDIAN_FEMALE_AVATARS[0]}
                            alt={u.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-amber-400/50 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{u.displayName}</h4>
                            <span className="text-[9px] text-zinc-400 font-mono">ID: {u.numericId || 'User'}</span>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isChecked
                            ? 'bg-gradient-to-r from-amber-400 to-pink-500 border-amber-300 text-black'
                            : 'border-white/20 bg-white/5'
                        }`}>
                          {isChecked && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-zinc-400 text-xs">
                    <Users size={24} className="mx-auto text-zinc-500 mb-2 opacity-50" />
                    <p>No other room users currently detected.</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Users who open or join this room will appear here.</p>
                  </div>
                )}
              </div>

              {/* Footer Action */}
              <div className="p-3 bg-[#181130] border-t border-white/10 flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddUsersModal(false)}
                  className="flex-1 h-9 rounded-xl bg-white/5 border-white/15 text-zinc-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAllowedUsers}
                  className="flex-1 h-9 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-pink-500 text-black font-black text-xs shadow active:scale-95 cursor-pointer"
                >
                  Save Allowed ({selectedAllowedUsers.length})
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 18. SPECIALIZED ANIMATED EMOJI OVERLAY (Tears Crying Stream, Trembling Sad, Love, Laughing, Anger) */}
      <AnimatedEmojiOverlay activeEmojis={activeSeatEmojis} />

      {/* 19. EDIT ROOM SETTINGS & PROFILE / MODERATION MODAL */}
      <EditRoomModal
        isOpen={showEditRoomModal}
        onClose={() => setShowEditRoomModal(false)}
        roomId={roomId || ''}
        roomData={roomData}
        isHost={isHost}
        currentUserId={activeUid}
        initialTab={editRoomInitialTab}
        viewers={viewers}
        seats={seats}
        onKickUser={(targetUid, targetName) => handleKickOutUser(targetUid, targetName)}
        onUnkickUser={(targetUid, targetName) => handleUnkickUser(targetUid, targetName)}
        onUpdateRoomData={(newData) => setRoomData((prev: any) => ({ ...prev, ...newData }))}
      />

      {/* 20. ROOM MUSIC & SOUND EFFECTS MODAL */}
      <RoomMusicModal
        isOpen={showMusicPlayerModal}
        onClose={() => setShowMusicPlayerModal(false)}
        isHost={isHost}
        isSeated={isUserSeated}
        onSendSoundAnnouncement={(text) => handleSendComment(undefined, text)}
        onBroadcastSync={broadcastMusicSync}
      />

      {/* 21. ADMIN / HOST HISTORY ACTION LOG MODAL */}
      <AdminHistoryLogModal
        isOpen={showAdminLogsModal}
        onClose={() => setShowAdminLogsModal(false)}
        logs={adminLogs}
        isHost={isHost}
        onClearLogs={() => setAdminLogs([])}
        onUnkickUser={handleUnkickUser}
        onUnmuteUser={(seatIdx) => handleToggleSeatMute(seatIdx)}
      />

      {/* 22. LUXURY GIFT PICKER MODAL */}
      <GiftModal
        isOpen={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        onSendGift={handleSendLuxuryGift}
        userCoins={profile?.coins ?? 50000}
        seats={seats}
        hostData={{
          hostId: roomData?.hostId || '',
          hostName: roomData?.hostName || 'Room Host',
          hostPhoto: roomData?.hostPhoto || ''
        }}
        currentUserId={activeUid}
        targetUser={
          selectedOccupiedSeat && selectedOccupiedSeat.uid !== activeUid
            ? { id: selectedOccupiedSeat.uid || '', uid: selectedOccupiedSeat.uid || '', name: selectedOccupiedSeat.displayName, photo: selectedOccupiedSeat.photoURL }
            : !isHost && roomData?.hostId
              ? { id: roomData.hostId, uid: roomData.hostId, name: roomData.hostName || 'Room Host', photo: roomData.hostPhoto }
              : null
        }
      />

    </div>
  );
}
