import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Send, ChevronLeft, Video, Phone,
  Sparkles, MessageCircle, Crown, Check, 
  Flame, Heart, Smile, Gift, Radio, Volume2,
  CheckCheck, ShieldCheck, Bell, Star, MoreVertical,
  Users, Clock, UserCheck, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { INITIAL_VIDEO_HOSTS, VideoHost } from '@/data/videoHosts';
import { soundEffects } from '@/utils/audioEffects';
import { globalAudioManager } from '@/services/globalAudioManager';
import { FullScreenGiftAnimation, GiftAnimationData } from '@/components/FullScreenGiftAnimation';
import { useLanguage } from '@/contexts/LanguageContext';

interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isGift?: boolean;
  giftIcon?: string;
  giftName?: string;
}

interface ChatConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount?: number;
  isHost?: boolean;
  ratePerMinute?: number;
  city?: string;
  isVerified?: boolean;
}

export interface FriendPartner {
  id: string;
  name: string;
  avatar: string;
  city: string;
  age: number;
  totalCallMinutes: number;
  lastCallDate: string;
  relationshipBadge: string;
  intimacyScore: number;
  status: 'online' | 'busy' | 'offline';
  ratePerMinute: number;
  bio: string;
}

export const SEED_FRIENDS: FriendPartner[] = [
  {
    id: 'friend_priya',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
    city: 'Mumbai',
    age: 22,
    totalCallMinutes: 44,
    lastCallDate: 'Yesterday 11:30 PM',
    relationshipBadge: 'Close Pal 🔥',
    intimacyScore: 91,
    status: 'online',
    ratePerMinute: 1500,
    bio: 'Late night cozy talks & fun vibes ✨ Ready to talk anytime!'
  }
];

// Pre-seeded authentic initial chats with Mulaqat Official Account pinned at index 0 and 1 dummy host
const SEED_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv_system',
    partnerId: 'system_official',
    partnerName: 'Mulaqat Official Team 🛡️',
    partnerPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    lastMessage: '🎉 Welcome to Mulaqat! All official notices, security updates, and coin offers will be sent here.',
    updatedAt: new Date().toISOString(),
    unreadCount: 1,
    isHost: false
  },
  {
    id: 'conv_priya',
    partnerId: 'host_priya_sharma',
    partnerName: 'Priya Sharma',
    partnerPhoto: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
    lastMessage: 'Hey! I am online right now, call me on 1-on-1 private video call? 💋✨',
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    unreadCount: 1,
    isHost: true,
    ratePerMinute: 1500,
    city: 'Mumbai',
    isVerified: true
  }
];

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    try {
      const activeUid = user?.uid || 'user_local';
      const stored = localStorage.getItem(`maxo_chats_${activeUid}`);
      if (stored) {
        const parsed: ChatConversation[] = JSON.parse(stored);
        // Ensure official account is updated and pinned at top
        const systemChat = parsed.find(c => c.partnerId === 'system_official');
        const others = parsed.filter(c => c.partnerId !== 'system_official');
        if (systemChat) {
          systemChat.partnerName = 'Mulaqat Official Team 🛡️';
          if (!systemChat.lastMessage || /[\u0900-\u097F]/.test(systemChat.lastMessage)) {
            systemChat.lastMessage = '🎉 Welcome to Mulaqat! All official notices, security updates, and coin offers will be sent here.';
          }
          return [systemChat, ...others];
        }
        return [SEED_CONVERSATIONS[0], ...others];
      }
    } catch (e) {}
    return SEED_CONVERSATIONS;
  });

  const [mainTab, setMainTab] = useState<'messages' | 'friends'>('messages');
  const [friendsList, setFriendsList] = useState<FriendPartner[]>(SEED_FRIENDS);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Chat overlay
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isHostTyping, setIsHostTyping] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeUid = user?.uid || 'user_local';
  const coins = profile?.coins ?? 500;
  const location = useLocation();
  const [showHostPickerModal, setShowHostPickerModal] = useState(false);

  // Clean up voice synthesis / audio on unmount or chat switch
  useEffect(() => {
    setIsPlayingVoice(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [activeChat]);

  // Handle Play Voice note
  const handleToggleVoice = () => {
    if (isPlayingVoice) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoice(false);
      return;
    }

    const hostVoiceUrl = (activeChat as any)?.voiceNoteAudio || (activeChat as any)?.audioUrl;
    if (hostVoiceUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(hostVoiceUrl);
      } else {
        audioRef.current.src = hostVoiceUrl;
      }
      audioRef.current.onended = () => setIsPlayingVoice(false);
      audioRef.current.onerror = () => speakVoiceFallback();
      audioRef.current.play()
        .then(() => setIsPlayingVoice(true))
        .catch(() => speakVoiceFallback());
    } else {
      speakVoiceFallback();
    }
  };

  const speakVoiceFallback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = (activeChat as any)?.voiceNoteText || 
        `Hey! I am ${activeChat?.partnerName || 'online'}. Let us connect on 1-on-1 private video call right now!`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.pitch = 1.25;
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria') || v.lang.includes('IN'))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      setIsPlayingVoice(true);
      window.speechSynthesis.speak(utterance);
    } else {
      soundEffects.play('pop');
      toast.info("Voice note played");
    }
  };

  // Active hosts for top circular status story bar (ONLY genuinely online / active hosts)
  const allHosts: VideoHost[] = (() => {
    try {
      const saved = localStorage.getItem('custom_video_hosts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_VIDEO_HOSTS;
  })();

  const activeHosts = allHosts.filter(h => h.status === 'online');

  // Auto open chat if navigated with chatWithHost state
  useEffect(() => {
    if (location.state && (location.state as any).chatWithHost) {
      const targetHost = (location.state as any).chatWithHost as VideoHost;
      handleHostStoryClick(targetHost);
    }
  }, [location.state]);

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`maxo_chats_${activeUid}`, JSON.stringify(conversations));
    } catch (e) {}
  }, [conversations, activeUid]);

  // Load messages when opening chat
  useEffect(() => {
    if (!activeChat) return;

    try {
      const localMsgKey = `maxo_msgs_${activeUid}_${activeChat.partnerId}`;
      const cached = localStorage.getItem(localMsgKey);
      if (cached) {
        const rawList = JSON.parse(cached);
        if (Array.isArray(rawList)) {
          // Robust deduplication & ID sanitization
          const seenIds = new Set<string>();
          const sanitized: DirectMessage[] = [];

          for (const item of rawList) {
            if (!item) continue;
            let msgId = item.id;
            // If missing or duplicate, make it guaranteed unique
            if (!msgId || seenIds.has(msgId)) {
              msgId = `${msgId || 'msg'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              item.id = msgId;
            }
            // Sanitize any legacy Hindi message
            if (item.text && /[\u0900-\u097F]/.test(item.text)) {
              if (activeChat.partnerId === 'system_official') {
                item.text = '🎉 Welcome to Mulaqat Official Team! All official notices, security updates, and coin offers will be sent here.';
              } else {
                item.text = 'Hey! I am online right now, connect with me on 1-on-1 private video call 💖';
              }
            }
            seenIds.add(msgId);
            sanitized.push(item);
          }

          setMessages(sanitized);
          if (sanitized.length !== rawList.length || seenIds.size !== rawList.length) {
            localStorage.setItem(localMsgKey, JSON.stringify(sanitized));
          }
        } else {
          setMessages([]);
        }
      } else {
        // Provide starter greeting message
        const starter: DirectMessage[] = [
          {
            id: 'm_starter_' + Date.now(),
            senderId: activeChat.partnerId,
            text: activeChat.lastMessage,
            createdAt: activeChat.updatedAt
          }
        ];
        setMessages(starter);
        localStorage.setItem(localMsgKey, JSON.stringify(starter));
      }
    } catch (e) {}

    // Mark as read
    setConversations(prev => prev.map(c => 
      c.partnerId === activeChat.partnerId ? { ...c, unreadCount: 0 } : c
    ));

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeChat, activeUid]);

  const handleSendMessage = (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || !activeChat) return;

    if (!customText) setInputText('');
    setSending(true);

    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: activeUid,
      text: text,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);

    // Save locally
    try {
      const localMsgKey = `maxo_msgs_${activeUid}_${activeChat.partnerId}`;
      localStorage.setItem(localMsgKey, JSON.stringify(updatedMessages));
    } catch (e) {}

    // Update conversation last message
    setConversations(prev => prev.map(c => 
      c.partnerId === activeChat.partnerId ? { ...c, lastMessage: text, updatedAt: new Date().toISOString() } : c
    ));

    setSending(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Automatic Reply Logic: Always reply when user messages a host or official support
    if (activeChat.isHost) {
      setTimeout(() => {
        setIsHostTyping(true);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 600);

      setTimeout(() => {
        setIsHostTyping(false);

        const lower = text.toLowerCase();
        let reply = '';
        if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('hii') || lower.includes('namaste')) {
          reply = `Hey handsome! So happy you messaged me 💖 Let's talk face to face on 1-on-1 private video call, I'm online now!`;
        } else if (lower.includes('call') || lower.includes('video') || lower.includes('live')) {
          reply = `Yes, I am totally free for you! Click the video call button at the top right to connect directly 🎥💋`;
        } else if (lower.includes('kya kar') || lower.includes('free') || lower.includes('busy') || lower.includes('how are') || lower.includes('doing')) {
          reply = `I was waiting for your message! Doing great, let's start a private video call so we can chat comfortably 🥰`;
        } else if (lower.includes('rate') || lower.includes('coin') || lower.includes('cost') || lower.includes('price')) {
          reply = `It's only ${activeChat.ratePerMinute || 1500} coins per minute for private 1-on-1 HD call. Start call anytime!`;
        } else if (lower.includes('love') || lower.includes('gorgeous') || lower.includes('beautiful') || lower.includes('cute') || lower.includes('sweet')) {
          reply = `Aww you are so sweet! Tap the call icon above and say that to me face to face ✨`;
        } else {
          reply = `Thanks for your message! I am online for 1-on-1 private video calls right now. Tap the call icon above to connect with me live 💋`;
        }

        const hostMsg: DirectMessage = {
          id: `msg_host_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          senderId: activeChat.partnerId,
          text: reply,
          createdAt: new Date().toISOString()
        };
        setMessages(cur => {
          const appended = [...cur, hostMsg];
          try {
            const localKey = `maxo_msgs_${activeUid}_${activeChat.partnerId}`;
            localStorage.setItem(localKey, JSON.stringify(appended));
          } catch (e) {}
          return appended;
        });
        setConversations(prev => prev.map(c => 
          c.partnerId === activeChat.partnerId ? { ...c, lastMessage: reply, updatedAt: new Date().toISOString() } : c
        ));
        soundEffects.play('pop');
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }, 1500);
    } else if (activeChat.partnerId === 'system_official') {
      // Official Mulaqat Team Auto-Reply
      setTimeout(() => {
        const officialReply: DirectMessage = {
          id: `msg_official_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          senderId: 'system_official',
          text: `Thank you for contacting Mulaqat Official Team! We have received your inquiry. For instant coin top-ups or host applications, please check your Wallet and Profile sections. Have a wonderful experience on Mulaqat! 🛡️`,
          createdAt: new Date().toISOString()
        };
        setMessages(cur => {
          const appended = [...cur, officialReply];
          try {
            const localKey = `maxo_msgs_${activeUid}_system_official`;
            localStorage.setItem(localKey, JSON.stringify(appended));
          } catch (e) {}
          return appended;
        });
        setConversations(prev => prev.map(c => 
          c.partnerId === 'system_official' ? { ...c, lastMessage: officialReply.text, updatedAt: new Date().toISOString() } : c
        ));
        soundEffects.play('pop');
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }, 1000);
    }
  };

  // Send virtual gift
  const handleSendGift = (giftName: string, icon: string, cost: number) => {
    if (coins < cost) {
      toast.error(`Not enough coins! You need ${cost} 🪙 to send this.`);
      return;
    }
    if (!activeChat) return;

    soundEffects.play('gift');
    const giftMsg: DirectMessage = {
      id: `msg_gift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: activeUid,
      text: `Sent a ${giftName} ${icon} (${cost} Coins)`,
      createdAt: new Date().toISOString(),
      isGift: true,
      giftIcon: icon,
      giftName: giftName
    };

    const updatedMessages = [...messages, giftMsg];
    setMessages(updatedMessages);

    try {
      const localMsgKey = `maxo_msgs_${activeUid}_${activeChat.partnerId}`;
      localStorage.setItem(localMsgKey, JSON.stringify(updatedMessages));
    } catch (e) {}

    setShowGiftModal(false);
    toast.success(`🎁 Sent ${giftName} to ${activeChat.partnerName}!`);
  };

  // Start chat directly from host story bar
  const handleHostStoryClick = (host: VideoHost) => {
    const existing = conversations.find(c => c.partnerId === host.id);
    if (existing) {
      setActiveChat(existing);
    } else {
      const newChat: ChatConversation = {
        id: 'conv_' + host.id,
        partnerId: host.id,
        partnerName: host.name,
        partnerPhoto: host.avatar,
        lastMessage: host.voiceNoteText || 'Hi! Let us connect on video call.',
        updatedAt: new Date().toISOString(),
        isHost: true,
        ratePerMinute: host.ratePerMinute,
        city: host.city,
        isVerified: host.isVerified
      };
      setConversations([newChat, ...conversations]);
      setActiveChat(newChat);
    }
  };

  // Filter and sort conversations so Mulaqat Official Account is pinned at top
  const sortedConversations = [...conversations].sort((a, b) => {
    const isOfficialA = a.partnerId === 'system_official' || a.partnerName.includes('Mulaqat Official');
    const isOfficialB = b.partnerId === 'system_official' || b.partnerName.includes('Mulaqat Official');
    if (isOfficialA) return -1;
    if (isOfficialB) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredConversations = sortedConversations.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.partnerName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div id="messages-page-root" className="min-h-screen bg-[#07050F] text-white pb-28 max-w-lg mx-auto relative overflow-hidden font-sans">
      
      {/* Ambient Light Pink Soft Glow */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-pink-300/15 via-pink-200/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-30px] left-[-30px] w-72 h-72 bg-pink-300/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 right-[-30px] w-72 h-72 bg-rose-200/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 1. TOP HEADER WITH COINS */}
      <div className="px-5 pt-6 pb-2 relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-200 via-pink-300 to-rose-200 bg-clip-text text-transparent drop-shadow-md flex items-center gap-2">
            <span>{mainTab === 'messages' ? 'Messages' : 'Friends'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-300/15 text-pink-200 border border-pink-300/30 font-bold">
              {mainTab === 'messages' ? 'Chat 💬' : 'Friends 💖'}
            </span>
          </h1>
          <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
            {mainTab === 'messages' 
              ? 'Private 1-on-1 chats & host requests'
              : 'Special partners with long-duration 1-on-1 calls'
            }
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-bold text-yellow-400">
          <Sparkles size={13} className="text-yellow-400" />
          <span>{coins.toLocaleString()} 🪙</span>
        </div>
      </div>

      {/* TOP TAB SWITCHER: Messages VS Friend */}
      <div className="px-5 mt-2 relative z-10">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#110B22]/90 border border-pink-300/20 shadow-lg">
          <button
            type="button"
            onClick={() => setMainTab('messages')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'messages'
                ? 'bg-gradient-to-r from-pink-300 via-rose-200 to-pink-300 text-zinc-950 shadow-md shadow-pink-300/25 font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageCircle size={14} />
            <span>Messages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-zinc-900 font-bold">
              {conversations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('friends')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'friends'
                ? 'bg-gradient-to-r from-pink-300 via-rose-200 to-pink-300 text-zinc-950 shadow-md shadow-pink-300/25 font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Friends</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-zinc-900 font-bold">
              {friendsList.length} 💖
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MESSAGES (RECENT CALLS & CHATS)                                    */}
      {/* ========================================================================= */}
      {mainTab === 'messages' && (
        <>
          {/* 2. ONLINE ACTIVE VIDEO HOSTS BAR (STORY CIRCLES - ONLY TRULY ACTIVE HOSTS) */}
          {activeHosts.length > 0 && (
            <div className="mt-4 relative z-10">
              <div className="px-5 flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider">
                    Online Female Hosts
                  </span>
                </div>
                <span className="text-[10px] text-pink-400 font-extrabold cursor-pointer hover:underline bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20" onClick={() => navigate('/calls')}>
                  View All ➔
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
                {activeHosts.map((host) => (
                  <div 
                    key={host.id}
                    onClick={() => handleHostStoryClick(host)}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-pink-300 via-rose-200 to-pink-200 shadow-[0_0_12px_rgba(244,114,182,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <img 
                          src={host.avatar} 
                          alt={host.name} 
                          className="w-full h-full rounded-full object-cover border-2 border-[#07050F]"
                        />
                      </div>
                      {/* Live green dot with pulse */}
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#07050F] shadow-sm flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-white max-w-[58px] truncate text-center group-hover:text-pink-200">
                      {host.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-black text-amber-300 bg-black/60 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                      {host.ratePerMinute}🪙/m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CLEAN SEARCH & DIRECT MESSAGE TO HOST BUTTON */}
          <div className="px-5 mt-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" />
                <Input 
                  placeholder="Search messages or hosts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-11 pr-4 bg-white/[0.05] border border-pink-300/20 hover:border-pink-300/40 focus:ring-2 focus:ring-pink-300/40 rounded-2xl text-xs text-white placeholder:text-zinc-500 backdrop-blur-xl"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowHostPickerModal(true)}
                className="h-10 px-3.5 rounded-2xl text-xs font-black bg-pink-300/15 hover:bg-pink-300/25 text-pink-200 border border-pink-300/30 flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} className="text-pink-300 stroke-[3]" />
                <span>Message Host</span>
              </button>
            </div>
          </div>

          {/* 4. CONVERSATION LIST */}
          <div className="px-5 mt-4 space-y-2.5 relative z-10">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv, index) => (
                <motion.div
                  key={conv.partnerId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  onClick={() => setActiveChat(conv)}
                  className={`p-3.5 rounded-3xl border flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-98 shadow-md group ${
                    conv.partnerId === 'system_official' || conv.partnerName.includes('Mulaqat Official')
                      ? 'bg-gradient-to-r from-pink-900/20 to-[#110B22]/90 border-pink-300/40 hover:border-pink-300/60 shadow-pink-900/10'
                      : 'bg-[#110B22]/85 hover:bg-[#180F30] border-pink-300/15 hover:border-pink-300/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img 
                        src={conv.partnerPhoto} 
                        alt={conv.partnerName} 
                        className="w-13 h-13 rounded-2xl object-cover border border-pink-300/30 shadow-md group-hover:scale-105 transition-transform"
                      />
                      {conv.isHost && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#07050F] flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                        </span>
                      )}
                      {(conv.partnerId === 'system_official' || conv.partnerName.includes('Mulaqat Official')) && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-pink-400 border-2 border-[#07050F] flex items-center justify-center text-[9px]">
                          🛡️
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-white truncate group-hover:text-pink-200 transition-colors">
                          {conv.partnerName}
                        </h4>
                        {(conv.partnerId === 'system_official' || conv.partnerName.includes('Mulaqat Official')) && (
                          <span className="text-[9px] font-black text-pink-200 bg-pink-300/20 border border-pink-300/30 px-1.5 py-0.5 rounded-full">
                            📌 Pinned
                          </span>
                        )}
                        {conv.isVerified && (
                          <span className="text-[10px] text-pink-300 font-bold">✓</span>
                        )}
                        {conv.city && (
                          <span className="text-[9px] text-zinc-400 px-1.5 py-0.2 rounded-full bg-white/5 border border-white/5">
                            {conv.city}
                          </span>
                        )}
                        {conv.ratePerMinute && (
                          <span className="text-[9px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                            {conv.ratePerMinute}🪙/m
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-300 truncate mt-1 leading-tight">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>

                  {/* Right Side Actions / Badge */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {conv.unreadCount ? (
                      <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(244,114,182,0.6)] animate-pulse">
                        {conv.unreadCount}
                      </span>
                    ) : (
                      <CheckCheck size={14} className="text-pink-300/70" />
                    )}

                    {conv.isHost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/call/${conv.partnerId}`);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-400 via-rose-300 to-pink-300 hover:brightness-110 text-zinc-950 shadow-md text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Video size={11} className="animate-pulse text-zinc-950" />
                        <span>Call 💖</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-16 text-center bg-white/[0.02] rounded-3xl border border-white/5 space-y-2">
                <MessageCircle size={28} className="text-zinc-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">No messages found</h4>
                <p className="text-[11px] text-zinc-500">Search for a user or message an online host above.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FRIEND (LONG-DURATION CALL PARTNERS)                                */}
      {/* ========================================================================= */}
      {mainTab === 'friends' && (
        <div className="px-5 mt-4 space-y-3.5 relative z-10">
          
          {/* Header Note explaining Friend Tab */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-pink-950/50 via-purple-950/40 to-pink-900/30 border border-pink-500/30 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md">
                  <Heart size={16} className="fill-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Top Friends (Long-Duration Partners)</h3>
                  <p className="text-[10px] text-pink-200">Longest & deepest connections in 1-on-1 calls</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 font-black border border-pink-500/30">
                {friendsList.reduce((acc, f) => acc + f.totalCallMinutes, 0)} min Call Time
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              ⭐ Partners you have spent the most time connecting with on private video calls. Call directly or message anytime!
            </p>
          </div>

          {/* Friends List */}
          <div className="space-y-3">
            {friendsList.map((friend, idx) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="p-4 rounded-3xl bg-[#110B22]/90 border border-white/10 hover:border-pink-500/40 shadow-lg space-y-3 transition-all"
              >
                {/* Friend info row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-pink-500 to-amber-400 shadow-md">
                        <img 
                          src={friend.avatar} 
                          alt={friend.name} 
                          className="w-full h-full object-cover rounded-[14px]"
                        />
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#07050F] ${
                        friend.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-white truncate">{friend.name}</h4>
                        <span className="text-[10px] text-zinc-400">{friend.age} yr</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/5 text-zinc-300 border border-white/5">
                          {friend.city}
                        </span>
                      </div>

                      {/* Relationship badge & total call time */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                          <Heart size={10} className="fill-pink-400 text-pink-400" />
                          {friend.relationshipBadge}
                        </span>

                        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock size={10} />
                          {friend.totalCallMinutes} mins talk time
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      friend.status === 'online' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {friend.status === 'online' ? '● Online' : '● In Call'}
                    </span>
                    <p className="text-[9px] text-zinc-400 mt-1">Last call: {friend.lastCallDate}</p>
                  </div>
                </div>

                {/* Friend Bio Quote */}
                <p className="text-[11px] text-zinc-300 italic bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  "{friend.bio}"
                </p>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      // Open direct conversation
                      const matchingConv = conversations.find(c => c.partnerName === friend.name) || {
                        id: 'conv_' + friend.id,
                        partnerId: friend.id,
                        partnerName: friend.name,
                        partnerPhoto: friend.avatar,
                        lastMessage: `Hey ${friend.name}! Great talking to you earlier!`,
                        updatedAt: new Date().toISOString(),
                        isHost: true,
                        ratePerMinute: friend.ratePerMinute,
                        city: friend.city,
                        isVerified: true
                      };
                      setActiveChat(matchingConv);
                    }}
                    className="flex-1 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                  >
                    <MessageCircle size={13} />
                    <span>Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/call/host_${friend.name.toLowerCase().replace(' ', '_')}`);
                    }}
                    className="flex-1 h-9 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Video size={13} className="animate-pulse" />
                    <span>Video Call ({friend.ratePerMinute}🪙/m)</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FULL SCREEN 1-ON-1 CHAT OVERLAY */}
      <AnimatePresence>
        {activeChat && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed inset-0 z-[80] bg-[#07050F] flex flex-col max-w-lg mx-auto overflow-hidden"
          >
            {/* Top Bar with Direct Call Button */}
            <div className="p-3.5 bg-white/[0.04] backdrop-blur-2xl flex items-center justify-between border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveChat(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 active:scale-95 transition-all"
                >
                  <ChevronLeft size={22} />
                </button>
                
                <div className="relative">
                  <img 
                    src={activeChat.partnerPhoto} 
                    alt={activeChat.partnerName} 
                    className="w-10 h-10 rounded-full object-cover border border-pink-500/40"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#07050F]" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black text-white">{activeChat.partnerName}</h3>
                    {activeChat.isVerified && <span className="text-[10px] text-pink-400">✓</span>}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    Online • Ready to Call
                  </span>
                </div>
              </div>

              {/* Action Buttons (Direct Call + Gift) */}
              <div className="flex items-center gap-2">
                {activeChat.isHost && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowGiftModal(true)}
                      className="w-9 h-9 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-yellow-400 flex items-center justify-center border border-white/10 active:scale-95"
                      title="Send Gift"
                    >
                      <Gift size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/call/${activeChat.partnerId}`);
                      }}
                      className="h-9 px-3.5 rounded-2xl bg-gradient-to-r from-pink-400 via-rose-300 to-pink-300 hover:opacity-95 active:scale-95 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,114,182,0.4)] transition-all"
                    >
                      <Video size={14} className="stroke-[2.5] text-zinc-950" />
                      <span>Call</span>
                      {activeChat.ratePerMinute && (
                        <span className="text-[9px] bg-black/20 px-1.5 py-0.2 rounded-full text-zinc-900 font-black">
                          {activeChat.ratePerMinute}🪙
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Host Audio Teaser Banner */}
            {activeChat.isHost && (
              <div className="px-4 py-2 bg-gradient-to-r from-pink-900/20 via-[#130B29]/80 to-pink-900/20 border-b border-pink-300/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-pink-300/20 text-pink-300 flex items-center justify-center">
                    <Volume2 size={12} />
                  </div>
                  <span className="text-[11px] text-zinc-300 font-medium">
                    🎙️ Voice Teaser: <span className="text-pink-200 italic">"Listen to my voice note"</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/25 to-amber-500/25 hover:from-pink-500/35 hover:to-amber-500/35 text-[10px] font-black text-yellow-300 border border-yellow-400/30 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {isPlayingVoice ? (
                    <>
                      <span className="flex items-center gap-0.5">
                        <span className="w-1 h-3 bg-yellow-400 animate-pulse rounded-full" />
                        <span className="w-1 h-4 bg-yellow-300 animate-pulse rounded-full [animation-delay:0.15s]" />
                        <span className="w-1 h-2 bg-yellow-400 animate-pulse rounded-full [animation-delay:0.3s]" />
                      </span>
                      <span>Playing... Pause ⏸</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={12} className="text-yellow-400" />
                      <span>Play Voice ▶</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center py-3">
                <span className="text-[10px] text-zinc-400 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10">
                  🔒 End-to-end Encrypted Private Session
                </span>
              </div>

              {messages.map((m, idx) => {
                const isMe = m.senderId === activeUid;
                const uniqueKey = m.id ? `${m.id}_${idx}` : `msg_${idx}`;
                return (
                  <div 
                    key={uniqueKey}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs ${
                      m.isGift 
                        ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-yellow-300 font-bold'
                        : isMe 
                        ? 'bg-gradient-to-r from-pink-300 via-rose-300 to-pink-200 text-zinc-950 font-medium rounded-br-none shadow-[0_4px_12px_rgba(244,114,182,0.3)]' 
                        : 'bg-white/10 text-zinc-100 rounded-bl-none border border-white/5'
                    }`}>
                      {m.isGift && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{m.giftIcon}</span>
                          <span className="font-black text-xs uppercase tracking-wider">{m.giftName}</span>
                        </div>
                      )}
                      <p className="leading-relaxed">{m.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                        <span className="text-[8px]">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && <CheckCheck size={10} className="text-zinc-950" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Host Typing Indicator Bubble */}
              {isHostTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-zinc-100 rounded-2xl rounded-bl-none px-3.5 py-2 border border-white/10 flex items-center gap-2 shadow-md">
                    <span className="text-[10px] text-pink-300 font-bold">
                      {activeChat?.partnerName || 'Host'} is typing...
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ELEVATED BOTTOM INPUT BAR & RECOMMENDED MESSAGES */}
            <div className="bg-[#0B061A] backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] pb-7 sm:pb-4 pt-2.5 shrink-0">
              {/* Quick recommended messages */}
              <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-pink-300 font-bold shrink-0 flex items-center gap-1 bg-pink-500/15 px-2 py-1 rounded-full border border-pink-500/30">
                  ✨ Quick:
                </span>
                {[
                  'Hi there! How are you? 💖',
                  'Can we connect on video call? 🎥',
                  'You look gorgeous ✨',
                  'Are you free right now? 🌙',
                  'Would love to talk with you 💌',
                  'Send a smile 😊',
                  'Can I send a gift? 🎁'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="px-3 py-1 rounded-full bg-white/[0.07] hover:bg-pink-500/20 text-zinc-200 hover:text-pink-300 border border-white/10 hover:border-pink-500/30 text-[11px] font-medium whitespace-nowrap active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Quick Emoji Reaction bar */}
              <div className="px-3 pb-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                <div className="flex items-center gap-2.5">
                  {['❤️', '🌹', '😘', '💋', '🔥', '🎁', '👋', '😍'].map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(emoji)}
                      className="text-base hover:scale-125 active:scale-95 transition-transform cursor-pointer p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-zinc-500">Tap to react</span>
              </div>

              {/* Main Input Field - Elevated & Prominent */}
              <div className="px-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGiftModal(true)}
                  className="w-11 h-11 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Send Gift"
                >
                  <Gift size={20} />
                </button>

                <div className="flex-1 relative flex items-center">
                  <Input 
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full h-11 bg-white/[0.08] border border-white/15 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/40 text-sm text-white rounded-2xl pl-3.5 pr-10 placeholder:text-zinc-400 font-medium"
                  />
                </div>

                <Button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputText.trim()}
                  className="h-11 w-11 p-0 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-white flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.6)] active:scale-95 transition-all cursor-pointer"
                >
                  <Send size={17} />
                </Button>
              </div>
            </div>

            {/* Virtual Gift Sheet */}
            <AnimatePresence>
              {showGiftModal && (
                <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end justify-center p-3">
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-md bg-[#160E2E] border border-pink-500/30 rounded-[32px] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Gift size={18} className="text-yellow-400" />
                        <h4 className="text-sm font-black text-white">Send Gift to {activeChat.partnerName}</h4>
                      </div>
                      <span className="text-xs font-bold text-yellow-400">
                        {coins.toLocaleString()} 🪙
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { name: 'Red Rose', icon: '🌹', cost: 10 },
                        { name: 'Heart Kiss', icon: '💋', cost: 25 },
                        { name: 'Diamond Ring', icon: '💍', cost: 50 },
                        { name: 'Royal Crown', icon: '👑', cost: 100 },
                        { name: 'Champagne', icon: '🍾', cost: 150 },
                        { name: 'Love Rocket', icon: '🚀', cost: 250 },
                        { name: 'Ferrari Car', icon: '🏎️', cost: 500 },
                        { name: 'Private Yacht', icon: '🛥️', cost: 1000 }
                      ].map((g, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendGift(g.name, g.icon, g.cost)}
                          className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/40 flex flex-col items-center gap-1 active:scale-95 transition-all text-center"
                        >
                          <span className="text-2xl">{g.icon}</span>
                          <span className="text-[10px] font-bold text-white truncate max-w-full">{g.name}</span>
                          <span className="text-[9px] font-extrabold text-yellow-400">{g.cost} 🪙</span>
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => setShowGiftModal(false)}
                      variant="ghost"
                      className="w-full h-9 rounded-xl text-zinc-400 hover:text-white text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. FULL SCREEN HOST PICKER MODAL TO START CHAT */}
      <AnimatePresence>
        {showHostPickerModal && (
          <div className="fixed inset-0 z-[90] w-full h-[100dvh] bg-[#0A0614] flex flex-col text-white overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full h-full max-w-lg mx-auto flex flex-col bg-[#0A0614] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-white/[0.04] backdrop-blur-2xl flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowHostPickerModal(false)}
                    className="p-1.5 text-zinc-300 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>Message a Host</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">Online</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">Choose your favorite host to start a private conversation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHostPickerModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Host list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {INITIAL_VIDEO_HOSTS.map((host) => (
                  <div
                    key={host.id}
                    onClick={() => {
                      setShowHostPickerModal(false);
                      handleHostStoryClick(host);
                    }}
                    className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={host.avatar} 
                          alt={host.name} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-pink-500/40 group-hover:border-pink-500 transition-colors"
                        />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0A0614] ${
                          host.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-sm text-white truncate group-hover:text-pink-300 transition-colors">
                            {host.name}
                          </h4>
                          {host.isVerified && <ShieldCheck size={14} className="text-pink-400 shrink-0" />}
                          <span className="text-[10px] text-zinc-400 shrink-0">{host.age} yrs</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {host.voiceNoteText || `${host.city} • ${host.languages.join(', ')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHostPickerModal(false);
                          handleHostStoryClick(host);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white border border-pink-500/40 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <MessageCircle size={13} />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
