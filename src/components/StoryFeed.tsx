import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  collection, query, orderBy, doc, updateDoc, 
  deleteDoc, increment, addDoc, getDoc 
} from 'firebase/firestore';
import { db, auth, safeOnSnapshot, logActivity } from '@/lib/firebase';
import { 
  BookOpen, Mic, Heart, MessageSquare, Share2, Gift, Play, Pause, 
  Plus, Trash2, Sparkles, X, ChevronDown, ChevronUp, BarChart2, Sliders 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';
import { getPublicOrigin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import StoryEditor from './StoryEditor';
import AudioEffectsTest from '@/components/profile/AudioEffectsTest';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

export interface StoryComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  type: 'typed' | 'voice';
  title: string;
  category: 'My Story' | 'My Feelings' | 'Book Stories';
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  likedBy: string[];
  commentsCount: number;
  comments: StoryComment[];
  sharesCount: number;
  giftCount: number;
  giftCoins: number;
  storyType?: string;
  voiceFilter?: string;
  reactions?: Record<string, number>;
  poll?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    votedUsers?: Record<string, string>;
  };
}

const GIFT_OPTIONS = [
  { id: 'rose', name: 'Starlight Rose', cost: 10, icon: '💮', desc: 'Dotted with celestial fairy sparkles' },
  { id: 'prestige_cup', name: 'Prestige Cup', cost: 50, icon: '🏆', desc: 'Acclaim for highly moving narratives' },
  { id: 'crown', name: 'Crown Jewel', cost: 200, icon: '👑', desc: 'Ultimate nobility alignment support' },
  { id: 'cosmic_pulse', name: 'Cosmic Heart', cost: 500, icon: '💖', desc: 'Profound soul connection & empathy' }
];

const BANNER_CATEGORIES = [
  {
    category: 'My Story' as const,
    title: 'Personal Narratives & Milestones',
    subtitle: '✨ CHRONICLES OF REAL LIFE',
    badge: 'My Story',
    desc: 'Explore deep personal stories, diaries, achievements, and unique real life chronicles.',
    icon: '✨',
    gradient: 'from-[#1E1B4B] via-[#4338CA] to-[#0D1527]',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop'
  },
  {
    category: 'My Feelings' as const,
    title: 'Vulnerability, Moods & Reflections',
    subtitle: '💖 RAW EMOTIONAL REFLECTIONS',
    badge: 'My Feelings',
    desc: 'A safe starry space to express raw moods, current thoughts, sad waves, or happy sparks.',
    icon: '💖',
    gradient: 'from-[#4C1D95] via-[#A855F7] to-[#14102B]',
    image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=400&auto=format&fit=crop'
  },
  {
    category: 'Book Stories' as const,
    title: 'Literary Tales & Novels',
    subtitle: '📖 ORIGINAL DIARIES & DIALOGUES',
    badge: 'Book Stories',
    desc: 'Indulge in beautifully written tales, prose, journals, short books, poetry, and creative storytelling.',
    icon: '📖',
    gradient: 'from-amber-950 via-[#1E152A] to-purple-950',
    image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=400&auto=format&fit=crop'
  }
];

interface StoryFeedProps {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

export default function StoryFeed({ selectedCategory, setSelectedCategory }: StoryFeedProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const currentUser = auth.currentUser || user;

  // Real-time timeline state
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showVocalLab, setShowVocalLab] = useState<boolean>(false);

  // Playback & Interaction controller states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [showCommentsId, setShowCommentsId] = useState<string | null>(null);
  const [storyScrollPercent, setStoryScrollPercent] = useState<Record<string, number>>({});

  const handleStoryScroll = (storyId: string, e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollableHeight = el.scrollHeight - el.clientHeight;
    if (scrollableHeight > 0) {
      const percentage = (el.scrollTop / scrollableHeight) * 100;
      setStoryScrollPercent(prev => ({ ...prev, [storyId]: percentage }));
    } else {
      setStoryScrollPercent(prev => ({ ...prev, [storyId]: 100 }));
    }
  };
  const [commentText, setCommentText] = useState('');
  const [showGiftId, setShowGiftId] = useState<string | null>(null);
  const [revealedStoryId, setRevealedStoryId] = useState<string | null>(null);

  // Floating long-press reaction menu & animation particles
  const [floatingMenuStoryId, setFloatingMenuStoryId] = useState<string | null>(null);
  const [floatingParticles, setFloatingParticles] = useState<Array<{
    id: number;
    emoji: string;
    storyId: string;
    left: number;
    scale: number;
    duration: number;
    delay: number;
  }>>([]);

  const pressTimer = useRef<any>(null);

  const handlePointerDownCard = (storyId: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setFloatingMenuStoryId(storyId);
      // Give sound/visual toast indicator of unlocked state
      toast.info("Reaction Menu activated! Select an emotion aura card. ✨", {
        duration: 1500
      });
    }, 650); // 650ms hold to activate floating reaction overlay
  };

  const handlePointerUpOrLeaveCard = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Poll Vote handler to modify Firestore in real-time
  const handleVotePoll = async (storyId: string, optionId: string) => {
    if (!currentUser) {
      toast.error("Please sign in first to submit your poll vote!");
      return;
    }

    const story = stories.find(s => s.id === storyId);
    if (!story || !story.poll) return;

    const votedUsers = story.poll.votedUsers || {};
    if (votedUsers[currentUser.uid]) {
      toast.info("You already registered your vote in this memoir poll! 📊");
      return;
    }

    const updatedOptions = story.poll.options.map(opt => {
      if (opt.id === optionId) {
        return { ...opt, votes: (opt.votes || 0) + 1 };
      }
      return opt;
    });

    const updatedVotedUsers = {
      ...votedUsers,
      [currentUser.uid]: optionId
    };

    try {
      await updateDoc(doc(db, 'stories', storyId), {
        'poll.options': updatedOptions,
        'poll.votedUsers': updatedVotedUsers
      });
      toast.success("Vote documented successfully! Real-time syncing completed. 🗳️✨");
    } catch (err) {
      console.error("Firestore poll updating error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `stories/${storyId}`);
    }
  };

  // Emoji selection processor (initiates floating particle fountain)
  const handleSelectReaction = async (storyId: string, emoji: string) => {
    // Generate 12 beautiful dancing floating particles representing selected emoji
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      storyId,
      left: 10 + Math.random() * 80, // randomized left coordinates (10 - 90%)
      scale: 0.6 + Math.random() * 1.1,
      duration: 1.6 + Math.random() * 1.4,
      delay: Math.random() * 0.45
    }));

    setFloatingParticles(prev => [...prev, ...newParticles]);

    // Fast memory garbage collection cleanup
    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 4000);

    // Sync state counters on Firestore document reactions list
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const currentReactions = story.reactions || {};
    const updatedReactions = {
      ...currentReactions,
      [emoji]: (currentReactions[emoji] || 0) + 1
    };

    try {
      await updateDoc(doc(db, 'stories', storyId), {
        reactions: updatedReactions
      });
    } catch (e) {
      console.warn("Skip quiet syncing of emoji counter on firestore:", e);
    }

    setFloatingMenuStoryId(null);
  };

  // Top banner sliding index state
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync selectedCategory to slide activeBannerIdx if category changes from external code:
  useEffect(() => {
    if (selectedCategory) {
      const idx = BANNER_CATEGORIES.findIndex(b => b.category === selectedCategory);
      if (idx !== -1 && idx !== activeBannerIdx) {
        setActiveBannerIdx(idx);
      }
    }
  }, [selectedCategory]);

  // Real-time Firebase Firestore stories listener subscription
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setStories(items);
      setLoading(false);
    }, (error) => {
      console.warn("Real-time stories subscription offline fallback:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Filter computing
  const filteredStories = useMemo(() => {
    if (!selectedCategory) return stories;
    return stories.filter(s => s.category === selectedCategory);
  }, [stories, selectedCategory]);

  const handleBannerSelect = (idx: number) => {
    setActiveBannerIdx(idx);
    setSelectedCategory(BANNER_CATEGORIES[idx].category);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      const nextIdx = (activeBannerIdx + 1) % BANNER_CATEGORIES.length;
      handleBannerSelect(nextIdx);
    } else {
      const prevIdx = (activeBannerIdx - 1 + BANNER_CATEGORIES.length) % BANNER_CATEGORIES.length;
      handleBannerSelect(prevIdx);
    }
  };

  // Drag handler for Framer Motion swiping gesture
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50; 
    if (info.offset.x < -swipeThreshold) {
      handleSwipe('left');
    } else if (info.offset.x > swipeThreshold) {
      handleSwipe('right');
    }
  };

  // Audio stream togglers
  const handleToggleVoice = (storyId: string, audioUrl: string) => {
    if (playingId === storyId) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayingId(storyId);
      setAudioProgress(0);

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setPlayingId(null);
        setAudioProgress(0);
      });

      audio.play().catch(err => {
        console.warn("Playback blocked or format incompatibility check:", err);
        toast.error("Blocked by browser permissions. Tap directly to play.");
        setPlayingId(null);
      });
    }
  };

  // Like interaction handler
  const handleLike = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      toast.error("Please sign in or identify yourself to like stories!");
      return;
    }

    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const liked = story.likedBy?.includes(currentUser.uid);
    let revisedLikedBy = [];
    if (liked) {
      revisedLikedBy = (story.likedBy || []).filter(uid => uid !== currentUser.uid);
    } else {
      revisedLikedBy = [...(story.likedBy || []), currentUser.uid];
    }

    try {
      await updateDoc(doc(db, 'stories', storyId), {
        likedBy: revisedLikedBy,
        likesCount: revisedLikedBy.length
      });
    } catch (err) {
      console.error("Liking write rejected:", err);
      handleFirestoreError(err, OperationType.UPDATE, `stories/${storyId}`);
    }
  };

  // Comment submission handler
  const handleComment = async (storyId: string) => {
    if (!currentUser) {
      toast.error("Identify or sign in to add comments on stories!");
      return;
    }
    if (!commentText.trim()) return;

    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    try {
      const commentObj: StoryComment = {
        id: 'comment_' + Date.now(),
        authorId: currentUser.uid,
        authorName: profile?.displayName || currentUser.displayName || 'Soulmate',
        authorPhoto: profile?.photoURL || getPremiumAvatar(currentUser.uid),
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };

      const revisedComments = [...(story.comments || []), commentObj];
      await updateDoc(doc(db, 'stories', storyId), {
        comments: revisedComments,
        commentsCount: revisedComments.length
      });

      setCommentText('');
      toast.success("Affirmation left successfully! 💬🧡");
    } catch (err) {
      console.error("Comment submit rejected:", err);
      handleFirestoreError(err, OperationType.UPDATE, `stories/${storyId}`);
    }
  };

  // Share story helper
  const handleShare = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        sharesCount: increment(1)
      });
      const deepLink = `${getPublicOrigin()}/?story=${storyId}`;
      await navigator.clipboard.writeText(deepLink);
      toast.success("Story shared! Deep path link saved to clipboard. 📤💫");
    } catch (err) {
      console.error("Sharing update rejected:", err);
    }
  };

  // Economic coin ledger transaction for gift transmissions
  const handleSendGiftLocal = async (storyId: string, gift: typeof GIFT_OPTIONS[0]) => {
    if (!currentUser) {
      toast.error("Please sign in or load profile to send gifts!");
      return;
    }
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    if (story.authorId === currentUser.uid) {
      toast.error("Self-gifting is blocked. Support other story creators!");
      return;
    }

    const availableCoins = profile?.coins || 0;
    if (availableCoins < gift.cost) {
      toast.error(`Insufficient Gold Balance! ${gift.name} costs ${gift.cost} coins. Wallet Balance: ${availableCoins} coins.`);
      return;
    }

    try {
      // Deduct coins from sender
      await updateDoc(doc(db, 'users', currentUser.uid), {
        coins: increment(-gift.cost)
      });

      // Recipient receives 50% value converted as diamonds and gains appropriate XP rewards
      const convertedDiamonds = Math.max(1, Math.round(gift.cost * 0.5));
      const authorRef = doc(db, 'users', story.authorId);
      const authorSnap = await getDoc(authorRef);
      
      let nextXp = gift.cost; // Default fallback: 1 XP per gift.cost
      let nextLevel = 1;
      
      if (authorSnap.exists()) {
        const aData = authorSnap.data();
        const currentDiamonds = aData.diamonds || 0;
        nextXp = (aData.experience || 0) + gift.cost;
        nextLevel = aData.level || 1;
        
        while (nextXp >= nextLevel * 150) {
          nextXp -= nextLevel * 150;
          nextLevel += 1;
        }
        
        await updateDoc(authorRef, {
          diamonds: currentDiamonds + convertedDiamonds,
          experience: nextXp,
          level: nextLevel
        });
      } else {
        await updateDoc(authorRef, {
          diamonds: increment(convertedDiamonds),
          experience: nextXp,
          level: nextLevel
        });
      }

      // Increment story variables
      await updateDoc(doc(db, 'stories', storyId), {
        giftCount: increment(1),
        giftCoins: increment(gift.cost)
      });

      // Log activity
      await addDoc(collection(db, 'activities'), {
        userName: profile?.displayName || currentUser.displayName || 'Soulmate',
        userUid: currentUser.uid,
        userPhoto: profile?.photoURL || getPremiumAvatar(currentUser.uid),
        type: 'gift_sent',
        timestamp: new Date().toISOString(),
        details: {
          roomId: 'story_timeline',
          roomTitle: `Story: ${story.title}`,
          giftName: gift.name,
          giftIcon: gift.icon,
          targetUid: story.authorId,
          targetName: story.authorName
        }
      });

      setShowGiftId(null);
      toast.success(`Sent ${gift.icon} ${gift.name} (-${gift.cost} coins) to storyteller! 💖✨`);
    } catch (err) {
      console.error("Gifting transaction failed:", err);
      handleFirestoreError(err, OperationType.WRITE, 'activities/gifts');
    }
  };

  // Story record deletion
  const handleDelete = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this story memoir?")) return;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      toast.success("Memoir removed successfully from cosmic timeline.");
    } catch (err) {
      toast.error("Delete transaction rejected.");
      handleFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Gesture Category Banner with Sliding Tabs (Responsive, smooth layout transition) */}
      <div className="space-y-3 select-none">
        {/* Banner Tabs Menu */}
        <div className="flex bg-[#12162A]/60 border border-white/5 rounded-2xl p-1 gap-1 items-center">
          {BANNER_CATEGORIES.map((b, idx) => {
            const isSelected = selectedCategory === b.category;
            return (
              <button
                key={b.category}
                type="button"
                onClick={() => handleBannerSelect(idx)}
                className={`flex-1 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white font-black shadow-lg shadow-pink-500/10' 
                    : 'text-zinc-400 hover:text-white bg-transparent'
                }`}
              >
                <span>{b.icon}</span>
                <span className="hidden xs:inline">{b.category}</span>
              </button>
            );
          })}
          {/* Subtle All stories filter clear trigger */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              toast.info('Viewing all stories synced across channels 🌌');
            }}
            className={`px-3 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border-0 ${
              !selectedCategory 
                ? 'bg-white/10 text-amber-400 font-extrabold border border-amber-450/10' 
                : 'text-zinc-500 hover:text-white bg-transparent'
            }`}
          >
            All
          </button>
        </div>

        {/* Sliding touch gesture-responsive banner wrapper */}
        <div className="relative overflow-hidden rounded-[24px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBannerIdx}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              whileTap={{ cursor: 'grabbing' }}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`w-full aspect-[22/10] sm:aspect-[24/8.5] rounded-[24px] bg-gradient-to-r ${BANNER_CATEGORIES[activeBannerIdx].gradient} p-[1px] relative overflow-hidden shadow-2xl cursor-grab`}
            >
              <div className="bg-[#0A0D1A]/95 rounded-[24px] w-full h-full p-4.5 flex flex-col justify-between relative overflow-hidden">
                {/* Visual Unsplash banner category image */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 h-full pointer-events-none">
                  <img 
                    src={BANNER_CATEGORIES[activeBannerIdx].image} 
                    className="w-full h-full object-cover rounded-r-[24px] select-none" 
                    alt="" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="absolute left-0 right-0 bottom-0 top-0 bg-gradient-to-r from-[#0A0D1A] via-[#0A0D1A]/85 to-transparent pointer-events-none z-0" />

                {/* Content info block */}
                <div className="z-10 flex items-center justify-between">
                  <span className="text-[8px] font-black tracking-widest text-[#F43F5E] uppercase bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                    SWIPE TO NAVIGATION
                  </span>
                  <span className="text-xl">{BANNER_CATEGORIES[activeBannerIdx].icon}</span>
                </div>

                <div className="z-10 mt-1 space-y-0.5">
                  <h4 className="text-[9px] font-black text-rose-450 tracking-wider leading-none uppercase">
                    {BANNER_CATEGORIES[activeBannerIdx].subtitle}
                  </h4>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug font-display">
                    {BANNER_CATEGORIES[activeBannerIdx].title}
                  </h2>
                  <p className="text-[10px] text-zinc-400 leading-snug line-clamp-1 max-w-[85%] font-medium">
                    {BANNER_CATEGORIES[activeBannerIdx].desc}
                  </p>
                </div>

                <div className="z-10 flex items-center justify-between text-[9px] pt-2 border-t border-white/5">
                  <span className="text-zinc-500 font-extrabold uppercase tracking-widest">
                    Swipe left/right on card to toggle category
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="text-amber-400 font-black uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                  >
                    <span>Create +</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel indicators dots */}
        <div className="flex justify-center items-center gap-1.5 mt-1">
          {BANNER_CATEGORIES.map((banner, index) => (
            <button
              key={banner.category}
              type="button"
              onClick={() => handleBannerSelect(index)}
              className={`w-5 h-1.5 rounded-full transition-all duration-300 border-0 ${
                activeBannerIdx === index ? 'bg-gradient-to-r from-pink-500 to-amber-500 w-8' : 'bg-white/10 hover:bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating or inline action panel trigger header */}
      <div className="flex items-center justify-between px-1 gap-2 flex-wrap font-sans">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FF4D67] font-mono">
          {selectedCategory ? `'${selectedCategory}'` : 'All'} Chronicles
        </h3>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/moments')}
            className="bg-gradient-to-r from-orange-500 via-[#FF4D67] to-pink-500 hover:opacity-95 text-white font-black text-[10px] tracking-wider uppercase px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl shadow-rose-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-0"
          >
            <Sparkles size={12} />
            <span>Share Moments</span>
          </button>
        </div>
      </div>

      {/* Feed Panel Stream */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-[3px] border-amber-400/15 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-mono text-[9px] uppercase tracking-widest">Syncing cosmic streams...</p>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="bg-[#121421]/30 backdrop-blur-md rounded-[32px] border border-white/5 p-12 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400 border border-white/5">
            <BookOpen size={28} className="text-rose-450 opacity-60" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase text-gray-300 tracking-widest">No Chronicles Found</p>
            <p className="text-[10px] text-gray-500 font-bold max-w-xs mx-auto">Be the first to publish a soul story onto this timeline stream!</p>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/moments')}
            className="text-[9px] uppercase tracking-widest bg-white/5 border border-white/10 hover:border-amber-400 font-black text-amber-400 px-4 py-2.5 rounded-xl transition-colors hover:bg-white/10 cursor-pointer"
          >
            Share Moments
          </button>
        </div>
      ) : (
        <div className="space-y-5 relative">
          <AnimatePresence mode="popLayout">
            {filteredStories.map((story, index) => {
              const hasLiked = story.likedBy?.includes(currentUser?.uid || 'anonymous');
              const isAuthor = story.authorId === currentUser?.uid;

              // Compute dynamic Trending or Featured badges based on engagement scores
              const likes = story.likesCount || 0;
              const comments = story.commentsCount || 0;
              const shares = story.sharesCount || 0;
              const giftCoins = story.giftCoins || 0;
              const engagementScore = (likes * 3) + (comments * 5) + (shares * 4) + (giftCoins * 0.4);

              const createdTime = new Date(story.createdAt).getTime();
              const isRecent = (Date.now() - createdTime) < 24 * 60 * 60 * 1000;
              
              const engagementBadge = engagementScore >= 5
                ? (isRecent 
                    ? { label: '⚡ Trending', className: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-orange-500/30 text-orange-400' }
                    : { label: '⭐ Featured', className: 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-pink-500/30 text-pink-450' }
                  )
                : null;

              // Customize a premium physics-based card-stack animation variants for My Story and Book Stories categories
              const isStackLayout = selectedCategory === 'My Story' || selectedCategory === 'Book Stories';
              
              const stackVariants = {
                initial: isStackLayout 
                  ? { opacity: 0, scale: 0.92, y: 35, rotate: index % 2 === 0 ? -1.5 : 1.5, zIndex: 0 }
                  : { opacity: 0, y: 12, rotate: 0 },
                animate: { 
                  opacity: 1, 
                  scale: 1, 
                  y: 0, 
                  rotate: isStackLayout ? (index % 2 === 0 ? 0.4 : -0.4) : 0, 
                  zIndex: index + 1,
                  transition: { 
                    type: "spring" as const, 
                    stiffness: 220, 
                    damping: 24, 
                    delay: isStackLayout ? Math.min(index * 0.04, 0.22) : 0 
                  }
                },
                exit: isStackLayout 
                  ? { 
                      opacity: 0, 
                      scale: 0.94, 
                      x: index % 2 === 0 ? -120 : 120, 
                      y: -20, 
                      rotate: index % 2 === 0 ? -5 : 5,
                      transition: { duration: 0.25, ease: "easeIn" as const }
                    }
                  : { opacity: 0, y: -12, transition: { duration: 0.18 } }
              };

              return (
                <motion.div 
                  key={story.id}
                  layout="position"
                  variants={stackVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onPointerDown={() => handlePointerDownCard(story.id)}
                  onPointerUp={handlePointerUpOrLeaveCard}
                  onPointerLeave={handlePointerUpOrLeaveCard}
                  className="bg-gradient-to-br from-[#121624]/75 via-[#0C101A]/85 to-[#121421]/75 border border-white/5 rounded-[28px] p-5 relative overflow-hidden shadow-2xl hover:border-white/10 transition-all group"
                >
                  
                  {/* Author Info Block */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-400/40 p-[1.5px] shrink-0 overflow-hidden bg-zinc-800">
                        <img src={story.authorPhoto} className="w-full h-full object-cover rounded-full" alt="" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black tracking-tight text-white">{story.authorName}</span>
                          <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none scale-90">LEVEL {story.authorId.substring(0, 3).charCodeAt(0) % 15 + 1}</span>
                        </div>
                        <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                          {new Date(story.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Dynamic engagement badges inside headers */}
                      {engagementBadge && (
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm select-none shrink-0 ${engagementBadge.className}`}>
                          {engagementBadge.label}
                        </span>
                      )}
                      <span className="bg-white/5 border border-white/5 text-[8px] font-black uppercase text-pink-400 tracking-wider px-2 py-0.5 rounded-full shrink-0">
                        {story.category}
                      </span>
                      {isAuthor && (
                        <button 
                          onClick={(e) => handleDelete(story.id, e)}
                          className="p-1 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/10 cursor-pointer"
                          title="Delete Memoir"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                {/* Story Body */}
                <div className="py-4 space-y-3">
                  
                  <div className="flex items-center gap-2 mb-1">
                    {story.type === 'typed' ? (
                      <div className="w-7 h-7 bg-amber-400/15 border border-amber-400/25 rounded-md flex items-center justify-center text-amber-400 shadow-sm">
                        <BookOpen size={13} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 bg-[#EC4899]/15 border border-[#EC4899]/25 rounded-md flex items-center justify-center text-[#EC4899] shadow-sm">
                        <Mic size={13} strokeWidth={2.5} />
                      </div>
                    )}
                    
                    <button 
                      onClick={() => {
                        if (story.type === 'typed') {
                          setRevealedStoryId(revealedStoryId === story.id ? null : story.id);
                        } else {
                          handleToggleVoice(story.id, story.audioUrl!);
                        }
                      }}
                      className="text-left select-text outline-none focus:outline-none focus:text-amber-400 text-[13px] sm:text-[14px] font-black tracking-tight text-white hover:text-amber-400 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      {story.title}
                    </button>
                  </div>

                  {story.type === 'typed' ? (
                    <div className="space-y-2">
                      <div 
                        onScroll={(e) => handleStoryScroll(story.id, e)}
                        ref={(el) => {
                          if (el && revealedStoryId === story.id && storyScrollPercent[story.id] === undefined) {
                            const scrollable = el.scrollHeight > el.clientHeight;
                            setStoryScrollPercent(prev => ({
                              ...prev,
                              [story.id]: scrollable ? 0 : 100
                            }));
                          }
                        }}
                        className={`text-[11.5px] leading-relaxed text-gray-300 font-semibold transition-all duration-300 ${
                          revealedStoryId === story.id 
                            ? 'max-h-56 overflow-y-auto pr-1.5 custom-scrollbar' 
                            : 'line-clamp-2 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (revealedStoryId !== story.id) {
                            setRevealedStoryId(story.id);
                          }
                        }}
                      >
                        <p className="select-text whitespace-pre-line break-words">{story.content}</p>
                      </div>
                      
                      {/* Thin subtle story scroll consumption progress bar at the bottom of content area */}
                      {revealedStoryId === story.id && (storyScrollPercent[story.id] !== undefined) && (
                        <div className="mt-3.5 space-y-1 bg-white/[0.01] border border-white/5 rounded-xl p-2 animate-fade-in">
                          <div className="h-1 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden relative">
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-400 via-[#FF4D67] to-pink-500 transition-all duration-150"
                              style={{ width: `${storyScrollPercent[story.id]}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                            <span>Story Consumption Progress</span>
                            <span className="text-pink-400">{Math.round(storyScrollPercent[story.id])}% read</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <button 
                          onClick={() => {
                            const wasRevealed = revealedStoryId === story.id;
                            setRevealedStoryId(wasRevealed ? null : story.id);
                            if (wasRevealed) {
                              setStoryScrollPercent(prev => {
                                const copy = { ...prev };
                                delete copy[story.id];
                                return copy;
                              });
                            }
                          }}
                          className="text-[9px] uppercase tracking-widest text-[#FF4D67] font-black hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-0"
                        >
                          <span>{revealedStoryId === story.id ? 'Hide Narrative' : 'Reveal Full Memoir Story'}</span>
                          {revealedStoryId === story.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#050811]/70 border border-white/5 rounded-2xl p-4 space-y-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleVoice(story.id, story.audioUrl!)}
                          className={`w-9 h-9 rounded-full bg-gradient-to-r ${
                            playingId === story.id ? 'from-red-500 to-pink-500 animate-pulse' : 'from-amber-400 to-[#FF4D67]'
                          } flex items-center justify-center text-white shadow-xl transition-all active:scale-90 cursor-pointer border-0 shrink-0`}
                        >
                          {playingId === story.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center text-[8.5px] font-mono text-gray-500 font-black uppercase tracking-wider">
                            <span>{playingId === story.id ? 'Playing Voice Track...' : 'Listen Voice recording'}</span>
                            <span>{playingId === story.id ? `${Math.round(audioProgress)}%` : 'HIGH-QUALITY'}</span>
                          </div>

                          <div className="h-1.5 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden relative">
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-400 via-[#FF4D67] to-pink-500 transition-all duration-100"
                              style={{ width: `${playingId === story.id ? audioProgress : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {playingId === story.id && (
                        <div className="flex justify-center items-end gap-1 h-3 pb-0.5">
                          {[...Array(24)].map((_, idx) => (
                            <span 
                              key={idx} 
                              className="w-[1.5px] bg-[#FF4D67] rounded-full transition-all duration-300"
                              style={{ 
                                height: `${Math.max(15, Math.sin(idx + audioProgress * 0.15) * 85 + 15)}%`,
                                animation: 'bounce 1s infinite alternate',
                                animationDelay: `${idx * 40}ms`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {story.imageUrl && (
                    <div className="mt-2.5 max-h-56 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-black/20">
                      <img 
                        src={story.imageUrl} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover select-none hover:scale-[1.02] transition-transform duration-300 max-h-56" 
                        alt="Story media" 
                      />
                    </div>
                  )}

                </div>

                {/* Real-time Emoji reactions summary row */}
                {story.reactions && Object.keys(story.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 select-none pb-2.5">
                    {Object.entries(story.reactions)
                      .filter(([_, count]) => count > 0)
                      .map(([emoji, count]) => (
                        <div 
                          key={emoji} 
                          className="bg-white/[0.03] border border-white/5 py-1 px-2.5 rounded-full text-[9px] font-bold text-gray-300 flex items-center gap-1 leading-none shadow-sm"
                        >
                          <span>{emoji}</span>
                          <span className="font-mono text-pink-400 text-[10px]">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Real-time interactive audience poll if attached */}
                {story.poll && (
                  <div className="bg-[#0c0f1d]/55 border border-white/5 rounded-2xl p-4 my-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-amber-400/20 flex items-center justify-center text-amber-400">
                        <BarChart2 size={11} strokeWidth={2.5} />
                      </div>
                      <h4 className="text-[11.5px] font-black tracking-tight text-white select-text">
                        {story.poll.question}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const votedUsers = story.poll.votedUsers || {};
                        const userVote = votedUsers[currentUser?.uid || ''];
                        const hasVoted = !!userVote;
                        
                        const totalVotes = story.poll.options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);

                        return story.poll.options.map((opt: any) => {
                          const percent = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                          const isUserChoice = userVote === opt.id;

                          return (
                            <div key={opt.id} className="relative z-10">
                              {hasVoted ? (
                                <div className="w-full relative h-10 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between px-3.5 overflow-hidden transition-all duration-300">
                                  {/* Percentage background fill bar */}
                                  <div 
                                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-400/10 to-pink-500/10 transition-all duration-700 ease-out z-0" 
                                    style={{ width: `${percent}%` }}
                                  />
                                  <span className="text-[10px] font-bold text-gray-200 z-10 flex items-center gap-1.5 select-text">
                                    {isUserChoice && <span className="text-emerald-400 font-extrabold pr-0.5">✓</span>}
                                    {opt.text}
                                  </span>
                                  <span className="text-[10.5px] font-mono font-black text-pink-400 z-10">
                                    {percent}% <span className="text-[8px] font-medium text-zinc-550">({opt.votes || 0})</span>
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleVotePoll(story.id, opt.id);
                                  }}
                                  className="w-full h-10 rounded-xl border border-white/5 hover:border-amber-400/30 bg-white/[0.01] hover:bg-white/[0.03] flex items-center justify-between px-3.5 transition-all text-left cursor-pointer text-gray-300 hover:text-white"
                                >
                                  <span className="text-[10px] font-bold select-text">{opt.text}</span>
                                  <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-transparent hover:bg-amber-400" />
                                  </div>
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Long-press reaction emoji overlay */}
                <AnimatePresence>
                  {floatingMenuStoryId === story.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -20, x: '-50%' }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, scale: 0.85, y: -20, x: '-50%' }}
                      className="absolute top-14 left-1/2 -translate-x-1/2 z-[50] bg-zinc-950/95 border border-[#FF4D67]/45 rounded-2xl py-2 px-3 flex items-center gap-3.5 shadow-2xl backdrop-blur-xl"
                      onPointerDown={(ev) => ev.stopPropagation()}
                    >
                      {['❤️', '🔥', '😂', '😮', '🎉', '🚀'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReaction(story.id, emoji);
                          }}
                          className="text-lg hover:scale-135 transition-transform bg-transparent border-0 outline-none p-0 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFloatingMenuStoryId(null);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-white ml-1 bg-transparent border-none cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Floating animated upward reactions particles */}
                <AnimatePresence>
                  {floatingParticles
                    .filter(p => p.storyId === story.id)
                    .map(p => (
                      <motion.span
                        key={p.id}
                        initial={{ opacity: 1, y: '100%', scale: 0.1, x: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          y: '-130%', 
                          scale: p.scale,
                          x: [0, Math.sin(p.id) * 35, Math.cos(p.id) * 45, Math.sin(p.id) * 55] 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: p.duration, 
                          ease: "easeOut",
                          delay: p.delay 
                        }}
                        className="absolute pointer-events-none text-2xl select-none z-[40]"
                        style={{ left: `${p.left}%`, bottom: '15%' }}
                      >
                        {p.emoji}
                      </motion.span>
                    ))
                  }
                </AnimatePresence>

                {/* Interaction Footer Icons - 'Like', 'Comment', 'Share', 'Gift' */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3.5 text-gray-400 text-[10px] font-black select-none">
                  
                  <button 
                    onClick={(e) => handleLike(story.id, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer bg-transparent ${
                      hasLiked 
                        ? 'border-[#FF4D67]/35 text-[#FF4D67] bg-[#FF4D67]/5' 
                        : 'border-white/5 hover:border-[#FF4D67]/20 hover:text-white'
                    }`}
                  >
                    <Heart size={14} className={hasLiked ? 'fill-current' : ''} />
                    <span>{story.likesCount || 0}</span>
                  </button>

                  <button 
                    onClick={() => setShowCommentsId(showCommentsId === story.id ? null : story.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer bg-transparent ${
                      showCommentsId === story.id 
                        ? 'border-pink-500/35 text-pink-450 bg-pink-500/5' 
                        : 'border-white/5 hover:border-pink-500/20 hover:text-white'
                    }`}
                  >
                    <MessageSquare size={14} />
                    <span>{story.commentsCount || 0}</span>
                  </button>

                  <button 
                    onClick={(e) => handleShare(story.id, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 hover:border-cyan-500/20 hover:text-white transition-all active:scale-95 cursor-pointer bg-transparent"
                  >
                    <Share2 size={13} className="text-cyan-400/80" />
                    <span>{story.sharesCount || 0}</span>
                  </button>

                  <button 
                    onClick={() => setShowGiftId(showGiftId === story.id ? null : story.id)}
                    className="flex justify-center items-center gap-1 hover:text-white relative bg-orange-500/10 border border-orange-500/20 text-orange-400 p-1.5 px-4 rounded-xl cursor-pointer"
                  >
                    <Gift size={13} />
                    <span className="text-[9.5px]">Gift</span>
                    {story.giftCount > 0 && (
                      <span className="absolute -top-2.5 -right-2 bg-gradient-to-r from-orange-500 to-[#FF4D67] text-white text-[7.5px] font-bold px-1 py-0.2 rounded-full border border-[#161C2C] shadow-lg scale-95">
                        {story.giftCoins}c
                      </span>
                    )}
                  </button>

                </div>

                {/* Expanded Inline comment sections */}
                <AnimatePresence>
                  {showCommentsId === story.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-3.5 border-t border-white/5 space-y-4">
                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                          {(story.comments || []).length === 0 ? (
                            <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wide py-1 pl-1">Write the first supportive comment to spark links!</p>
                          ) : (
                            (story.comments || []).map((comm) => (
                              <div key={comm.id} className="flex gap-2.5 p-2 bg-white/[0.02] border border-white/5 rounded-2xl animate-fade-in">
                                <img src={comm.authorPhoto} className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" alt="" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-white">{comm.authorName}</span>
                                    <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-wider">{new Date(comm.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-300 font-medium mt-0.5 leading-snug break-words">{comm.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input Row */}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Share an affirmation..." 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleComment(story.id); }}
                            className="flex-1 h-9 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-pink-500 font-sans"
                          />
                          <button 
                            onClick={() => handleComment(story.id)}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-black text-[10px] uppercase tracking-wider px-4 rounded-xl cursor-pointer border-0"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gifting tray panels */}
                <AnimatePresence>
                  {showGiftId === story.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-3 border-t border-white/5 space-y-3 bg-[#060810]/50 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={11} /> Send Talent Support Gift
                          </span>
                          <span className="text-[8.5px] text-gray-400 uppercase tracking-wider font-extrabold">My wallet: {profile?.coins || 0} COINS</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {GIFT_OPTIONS.map((g) => (
                            <div 
                              key={g.id}
                              onClick={() => handleSendGiftLocal(story.id, g)}
                              className="bg-white/5 border border-white/5 hover:border-orange-500/40 p-3 rounded-2xl text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-1 relative"
                            >
                              <span className="text-2xl block">{g.icon}</span>
                              <h5 className="text-[9px] font-black text-white truncate leading-none mt-1.5">{g.name}</h5>
                              <span className="text-[8px] font-semibold text-amber-400 block mt-0.5">{g.cost} Gold Coins</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {/* Story creation modal removed - hosts share moments from Moments page */}

    </div>
  );
}
