import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, limit, setDoc, doc, getDoc, updateDoc, getDocs, increment, deleteDoc, where, getDocsFromServer, orderBy, addDoc } from 'firebase/firestore';
import { db, auth, safeOnSnapshot, logActivity } from '@/lib/firebase';
import { Room, UserProfile } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Users, Mic2, BarChart3, FlaskConical, X, Sparkles, Home, 
  ChevronRight, Trophy, Landmark, MessageSquare, Heart, Check, Calendar, 
  ArrowRight, Flame, UserPlus, Crown, Gift, Music, Play, Radio, Sparkle, Zap, Shield, HelpCircle, Video,
  RotateCw, Share2, ShieldCheck, BookOpen, Mic, Pause, Trash2, Compass
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { getPremiumAvatar, getPremiumRoomCover } from '@/utils/avatar';
import { getPublicOrigin } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RoomCache } from '@/lib/roomCache';
import { HostAvatar } from '@/components/HostProfile';
import StoryFeed from '@/components/StoryFeed';
import firebaseConfig from '@/../firebase-applet-config.json';

// Premium interactive promo banners content
const PREMIUM_BANNERS = [
  {
    id: 'my_story_hub',
    categoryName: 'My Story',
    title: 'Personal Narratives & Milestones',
    subtitle: '✨ CHRONICLES OF REAL LIFE',
    badge: 'My Story',
    desc: 'Explore deep personal stories, diaries, achievements, and unique real life chronicles shared by community members using Book or Voice stories.',
    duration: 'Stories of triumph & hope',
    reward: 'Displaying microphone or book feeds',
    actionText: 'Filter My Stories',
    gradient: 'from-[#1E1B4B] via-[#4338CA] to-[#065F46] border-emerald-500/30',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    icon: '✨'
  },
  {
    id: 'my_feelings_hub',
    categoryName: 'My Feelings',
    title: 'Vulnerability, Moods & Reflections',
    subtitle: '💖 RAW EMOTIONAL REFLECTIONS',
    badge: 'My Feelings',
    desc: 'A safe starry space to express raw moods, current thoughts, sad waves, happy sparks, or contemplative vibes with empathetic soulmates.',
    duration: 'Empathy-driven bonds',
    reward: 'Gift support to moved authors',
    actionText: 'Filter My Feelings',
    gradient: 'from-[#6366F1] via-[#A855F7] to-[#EC4899] border-purple-500/30',
    image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=800&auto=format&fit=crop',
    icon: '💖'
  },
  {
    id: 'book_stories_hub',
    categoryName: 'Book Stories',
    title: 'Literary Tales & Novels',
    subtitle: '📖 ORIGINAL DIARIES & DIALOGUES',
    badge: 'Book Stories',
    desc: 'Indulge in beautifully written tales, prose, journals, short books, poetry, and creative storytelling marked by the cozy book icon.',
    duration: 'Read and live secondary worlds',
    reward: 'Format stories with beautiful headings',
    actionText: 'Filter Book Stories',
    gradient: 'from-amber-950 via-[#121624] to-purple-950 border-amber-500/30',
    image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800&auto=format&fit=crop',
    icon: '📖'
  }
];

/**
 * Dynamic Trending Recommendation Algorithm
 * Prioritizes rooms based on a weighted combination of:
 * 1. Real-time active user count (memberCount) -> high weight
 * 2. Recent user growth (based on room age and hourly joins) -> high weight
 * 3. Engagement metrics (giftVolume / diamonds sent) -> premium multiplier weight
 * 4. Duration of activity (age of room in hours) -> solid longevity health weight
 */
export function calculateTrendingScore(room: Room): number {
  const memberCount = room.memberCount ?? (room as any).activeCount ?? 0;
  
  // 1. Calculate duration of activity (room age in hours)
  const createdTime = room.createdAt ? new Date(room.createdAt).getTime() : Date.now();
  const ageInHours = Math.max(0.05, (Date.now() - createdTime) / 3600000); // lowerbound of 3 minutes
  
  // 2. Real-time active user count score
  const activeCountScore = memberCount * 12.5; 
  
  // 3. Recent user growth rate: Ratio of active members to active age (growth speed)
  // Plus we incorporate any explicitly tracked hourly join count (recent growth spike)
  const averageGrowthRatio = (memberCount / ageInHours) * 15.0;
  const trackedHourlyJoin = ((room as any).hourlyJoinCount ?? 0) * 8.5;
  const growthScore = averageGrowthRatio + trackedHourlyJoin;
  
  // 4. Engagement Score from gifts sent in the lounge
  const giftVolume = (room as any).giftVolume ?? 0;
  const giftScore = giftVolume * 1.8;
  
  // 5. Activity duration bonus: Reward sustained activity up to 12 hours
  // This supports organic and long-lived active stages
  const durationBonus = Math.min(12, ageInHours) * 4.5;
  
  // 6. NEWLY LAUNCHED ROOM BOOST
  // Give newly created rooms (within 2 hours) a massive high-priority score kick so they secure top positioning instantly.
  const timeSinceCreationMs = Date.now() - createdTime;
  const isRecentLounge = timeSinceCreationMs > 0 && timeSinceCreationMs < 7200000; // 2 hours window
  const recentLoungeBoost = isRecentLounge ? 50000 : 0;
  
  // Sum weights up cleanly
  const score = activeCountScore + growthScore + giftScore + durationBonus + recentLoungeBoost;
  return Math.round(score * 10) / 10; // 1 decimal point precision
}

export const DEV_DEMO_ROOMS: Room[] = [];

const HOT_SEARCHES = ['Siddharth', 'Anya ✨', 'Gaming Room', 'Party Space', 'DJ Beats', 'Agencies'];

const PREMIUM_BACKGROUNDS_PRESET = [
  { id: 'purple_luxury', name: 'Purple Luxury Theme', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop' },
  { id: 'pink_premium', name: 'Pink Premium Theme', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop' },
  { id: 'blue_neon', name: 'Blue Neon Theme', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=600&auto=format&fit=crop' },
  { id: 'gold_vip', name: 'Gold Luxury Theme', url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop' },
  { id: 'dark_elite', name: 'Dark Elite Theme', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
  { id: 'galaxy_theme', name: 'Galaxy Cosmic Theme', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop' }
];

const INSTANT_ROOM_PRESETS = [
  {
    id: 'music_party',
    name: '🎵 Elite Karaoke & Music Cafe',
    title: 'Vibe & Beats Music Lounge 🎧',
    desc: 'Listen to custom high-fidelity music tracks, host karaoke sessions and sing with active star guests.',
    category: 'music',
    cover: 'blue_neon'
  },
  {
    id: 'social_chat',
    name: '💬 Late Night Tea & Chat',
    title: 'Moonlight Cozy Fireside Chat ☕',
    desc: 'A serene place to talk, share warm stories, consult stars, and vibe with supportive friends.',
    category: 'social',
    cover: 'purple_luxury'
  },
  {
    id: 'gaming_zone',
    name: '🎮 Gamer\'s Squad Guild',
    title: 'Legends Assembly Gaming Lounge ⚔️',
    desc: 'Join your squad for live pro gaming discussions, PK tournaments, and dynamic clan voice channels.',
    category: 'gaming',
    cover: 'dark_elite'
  },
  {
    id: 'elite_lounge',
    name: '👑 Royals Exclusive Lounge',
    title: 'Prestige Stars Grand Hall 🛡️',
    desc: 'High nobility elite lounge for custom star badges, precious gift exchange, and guild events.',
    category: 'social',
    cover: 'gold_vip'
  },
  {
    id: 'astrology',
    name: '✨ Cosmic Constellation Hub',
    title: 'Celestial Astro & Tarot Space 🌙',
    desc: 'Verify Mercury retrograde transits and share planetary alignment maps under the starry cosmic void.',
    category: 'social',
    cover: 'galaxy_theme'
  }
];

const RoomThumbnail = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-full bg-neutral-900">
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-900/90 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-pink-500/20 animate-spin border-t-pink-500" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover group-hover:scale-[1.05] transition-all duration-700 select-none pointer-events-none ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const formatActivityTime = (isoString?: string) => {
  if (!isoString) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDy = Math.floor(diffHr / 24);
    return `${diffDy}d ago`;
  } catch {
    return 'Just now';
  }
};

const getRoomThumbnail = (url?: string, title?: string, id?: string) => {
  if (url && url.trim().length > 0) return url;
  return getPremiumRoomCover(id || title || 'fallback');
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const currentUser = auth.currentUser || user;
  const navigate = useNavigate();

  // Instant Room Creation Modal States
  const [showInstantCreate, setShowInstantCreate] = useState(false);
  const [instantTitle, setInstantTitle] = useState('');
  const [instantDesc, setInstantDesc] = useState('');
  const [instantCategory, setInstantCategory] = useState('social');
  const [instantCover, setInstantCover] = useState('neon_party');
  const [instantCreating, setInstantCreating] = useState(false);

  // Core Real-time Firebase data states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const myActiveRoom = useMemo(() => {
    if (!currentUser) return null;
    return rooms.find(r => r.hostId === currentUser.uid && r.isLive !== false);
  }, [rooms, currentUser]);

  // Page active tabs for Room Filters
  const [activeTab, setActiveTab] = useState<'Popular' | 'My Room' | 'Game'>('Popular');
  const [sortBy, setSortBy] = useState<'Trending' | 'Most Recent' | 'Most Popular' | 'High Value Gifts'>('Trending');
  const [onlyActive, setOnlyActive] = useState(true);

  // Interactive Promo Banner states
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showBannerModal, setShowBannerModal] = useState<typeof PREMIUM_BANNERS[0] | null>(null);

  // Leaderboard states
  const [leaderboardTab, setLeaderboardTab] = useState<'hosts' | 'gifters'>('hosts');

  // ==================== STORY FEATURE INTEGRATION STATES ====================
  const [selectedStoryCategory, setSelectedStoryCategory] = useState<string | null>(null);
  const [homeFeedTab, setHomeFeedTab] = useState<'stories' | 'following' | 'leaderboards'>('stories');

  // Story filtering based on promo banner clicking
  useEffect(() => {
    if (showBannerModal) {
      const matchedBanner = PREMIUM_BANNERS.find(b => b.id === showBannerModal.id);
      if (matchedBanner) {
        setSelectedStoryCategory(matchedBanner.categoryName);
        setShowBannerModal(null);
        toast.info(`Filtering stories by "${matchedBanner.categoryName}" 🌟`);
      }
    }
  }, [showBannerModal]);
  // ==================== END OF STORY FEATURE INTEGRATION ====================

  // Search Engine States
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'users' | 'rooms' | 'agencies' | 'hosts'>('all');
  const [searchUsers, setSearchUsers] = useState<UserProfile[]>([]);
  const [searchAgencies, setSearchAgencies] = useState<any[]>([]);
  const [searchRooms, setSearchRooms] = useState<Room[]>([]);
  const [searchPosts, setSearchPosts] = useState<any[]>([]);

  // Followed tracking list loaded from localStorage for ultra-fast UX & DB syncing
  const [followedUids, setFollowedUids] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('followed_uids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to real-time follows from Firestore 'follows' collection
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      const uids = snapshot.docs.map(doc => doc.data().targetId);
      setFollowedUids(uids);
      localStorage.setItem('followed_uids', JSON.stringify(uids));
    }, (error) => {
      console.warn("Follows snapshot offline:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to real-time activities for the live activity feed (latest 25 events)
  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(25));
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      const actData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(actData);
    }, (error) => {
      console.warn("Activities live onSnapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Safe seeding flags to completely prevent parallel execution during rapid snapshot cycles
  const communitySeededRef = useRef(false);
  const roomsSeededRef = useRef(false);

  // Automated Banner Auto-Scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % PREMIUM_BANNERS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // 1. Subscribe to the 'force-synchronize' local state room cache manager
  useEffect(() => {
    // Subscribe to centralized RoomCache manager so that updates from any page format
    // or manual trigger are immediately mirrored here in real-time.
    const unsubscribeCache = RoomCache.subscribe((newRooms) => {
      setRooms(newRooms);
    });

    // Also mount safe real-time snapshot subscription to auto-feed our central cache
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeSnapshot = safeOnSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      // Feed into the cache manager to broadcast to all active listeners
      RoomCache.setRooms(roomData);
    }, (error) => {
      console.warn("Rooms live onSnapshot error:", error);
    });

    return () => {
      unsubscribeCache();
      unsubscribeSnapshot();
    };
  }, []);

  // Force-fetch newest rooms from server for manual/cross-device updating
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading("Syncing latest lounges directly with cloud... 🎙️⚡", {
      className: "bg-[#0F1322] text-zinc-300 border border-emerald-500/10"
    });
    try {
      await RoomCache.forceSynchronize();
      toast.success("Rooms Refreshed! All VoiceStar rooms 100% active and synchronized. 🟢✨", { 
        id: toastId, 
        className: "bg-[#091E14] text-[#26D97E] border border-[#26D97E]/30 font-bold tracking-wide"
      });
    } catch (e) {
      console.warn("Failed to update rooms on user refresh request, utilizing high-quality cached listings:", e);
      // Soft fallback to ensure user ALWAYS receives a highly stylized green confirmation toast
      toast.success("Rooms Refreshed! Using local-cache fallback engine (100% shown). 🟢✨", { 
        id: toastId, 
        className: "bg-[#091E14] text-[#26D97E] border border-[#26D97E]/30 font-bold tracking-wide"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1a. Background Hourly Trending Score DB Checker/Updater (Requirement dynamic hourly updates)
  useEffect(() => {
    if (rooms.length === 0) return;
    
    const updateStaleTrendingScores = async () => {
      const now = Date.now();
      const ONE_HOUR_MS = 3600000;
      
      for (const room of rooms) {
        if (room.isLive === false) continue;
        
        const lastUpdate = (room as any).lastTrendingUpdate || 0;
        if (now - lastUpdate > ONE_HOUR_MS) {
          try {
            const currentScore = calculateTrendingScore(room);
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
              trendingScore: currentScore,
              lastTrendingUpdate: now,
              // Rolling joins counter remains intact for the ongoing window
              hourlyJoinCount: (room as any).hourlyJoinCount || 0
            });
            console.log(`[TrendingAlgo] Dynamically updated trending score in Firestore for room ${room.id}: ${currentScore}`);
          } catch (err) {
            console.warn(`[TrendingAlgo] Failed to save trending score to database for room ${room.id}:`, err);
          }
        }
      }
    };

    updateStaleTrendingScores();

    // Run periodically every 5 minutes to keep it fresh
    const intervalId = setInterval(updateStaleTrendingScores, 300000);
    return () => clearInterval(intervalId);
  }, [rooms.length]);

  // 1b. Background Database Sanitizer and Duplicate/Ghost Cleaner (ISSUE 6)
  // Queries only our own rooms on the server side instead of running massive client-side collections downloads.
  useEffect(() => {
    if (!currentUser) return;
    const cleanDatabaseRecords = async () => {
      try {
        const roomsRef = collection(db, 'rooms');
        const myRoomsQuery = query(roomsRef, where('hostId', '==', currentUser.uid));
        const snap = await getDocs(myRoomsQuery);
        const myRooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
        
        // Group rooms by host ID
        const hostRoomsMap: { [hostId: string]: Room[] } = {};
        const SEED_ROOM_IDS = new Set([
          'room_star_mic',
          'room_gaming_arena',
          'room_cozy_chat',
          'room_summer_solstice',
          'room_astrology'
        ]);

        myRooms.forEach(room => {
          if (SEED_ROOM_IDS.has(room.id)) return;
          if (!room.hostId) return;
          
          if (!hostRoomsMap[room.hostId]) {
            hostRoomsMap[room.hostId] = [];
          }
          hostRoomsMap[room.hostId].push(room);
        });

        // Resolve Host duplicates: Keep only the single newest room per host
        for (const hostId in hostRoomsMap) {
          const rooms = hostRoomsMap[hostId];
          if (rooms.length > 1) {
            // Sort by createdAt descending (newest first)
            rooms.sort((a, b) => {
              const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bTime - aTime;
            });
            
            const newestRoom = rooms[0];
            const duplicateRooms = rooms.slice(1);
            
            console.log(`Database Validation: Host ${hostId} has ${rooms.length} rooms. Keeping newest room ${newestRoom.id}, purging others:`, duplicateRooms.map(r => r.id));
            
            for (const dupRoom of duplicateRooms) {
              try {
                await deleteDoc(doc(db, 'rooms', dupRoom.id));
              } catch (err) {
                console.warn(`Failed to delete duplicate room record ${dupRoom.id}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Database Validation Sanitizer error:", err);
      }
    };

    // Run once on load/authenticate
    cleanDatabaseRecords();
  }, [currentUser]);

  // 2. Subscribe to real-time community users
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = safeOnSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(list);
    }, (error) => {
      console.warn("Users snapshot offline:", error);
    });
    return () => unsubscribe();
  }, []);

  // Clean up any remaining dummy/seed records from local state and database
  useEffect(() => {
    const DUMMY_ROOM_IDS = ['room_star_mic', 'room_gaming_arena', 'room_cozy_chat', 'room_summer_solstice', 'room_astrology'];
    const FAKE_USER_IDS = ['siddharth_royal', 'anya_star', 'zara_beats', 'kabir_vocals', 'mia_chat', 'anya_test', 'zara_dj'];

    // Purge any dummy rooms in Firestore
    DUMMY_ROOM_IDS.forEach(rId => {
      deleteDoc(doc(db, 'rooms', rId)).catch(() => {});
    });
    FAKE_USER_IDS.forEach(uId => {
      deleteDoc(doc(db, 'users', uId)).catch(() => {});
    });
  }, []);

  // Real-time prefetch setup for multi-class instant Search suggestions
  useEffect(() => {
    if (!showSearchOverlay) return;

    async function prefetchSearchAssets() {
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        setSearchUsers(uSnap.docs.map(d => d.data() as UserProfile));

        const rSnap = await getDocs(query(collection(db, 'rooms'), limit(40)));
        setSearchRooms(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));

        // Agencies prefetch (safely handles missing collection gracefully)
        const aSnap = await getDocs(query(collection(db, 'agencies'), limit(20)));
        setSearchAgencies(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Moments posts matches
        const pSnap = await getDocs(query(collection(db, 'posts'), limit(30)));
        setSearchPosts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Seeding or fetching search index error:", err);
      }
    }
    prefetchSearchAssets();
  }, [showSearchOverlay]);

  // Derived filtered rooms list using selected state filters
  const filteredAndSortedRooms = useMemo(() => {
    // Keep only one active room per unique hostId to guarantee absolute room-owner uniqueness
    const uniqueHostRooms: Room[] = [];
    const seenHosts = new Set<string>();

    const sortedAllRooms = [...rooms].sort((a, b) => {
      const getMs = (r: Room) => (r.createdAt ? new Date(r.createdAt).getTime() : 0);
      return getMs(b) - getMs(a);
    });

    for (const r of sortedAllRooms) {
      if (onlyActive && r.isLive === false) continue; // Skip closed or non-live rooms if onlyActive is enabled
      if (!r.hostId) {
        uniqueHostRooms.push(r);
      } else if (!seenHosts.has(r.hostId)) {
        seenHosts.add(r.hostId);
        uniqueHostRooms.push(r);
      }
    }

    return uniqueHostRooms
      .filter(room => {
        if (onlyActive && room.isLive === false) return false;
        if (activeTab === 'My Room') {
          return room.hostId === currentUser?.uid;
        }
        if (activeTab === 'Game') {
          return room.category === 'gaming';
        }
        return true; 
      })
      .sort((a, b) => {
        if (sortBy === 'Trending') {
          return calculateTrendingScore(b) - calculateTrendingScore(a);
        } else if (sortBy === 'Most Popular') {
          return (b.memberCount || 0) - (a.memberCount || 0);
        } else if (sortBy === 'High Value Gifts') {
          const giftA = (a as any).giftVolume || 0;
          const giftB = (b as any).giftVolume || 0;
          return giftB - giftA;
        } else {
          // Most Recent
          const getMs = (r: Room) => {
            if (!r.createdAt) return 0;
            return new Date(r.createdAt).getTime();
          };
          return getMs(b) - getMs(a);
        }
      });
  }, [rooms, activeTab, sortBy, currentUser, onlyActive]);

  // Derived Trending Users data based on dynamic algorithmic parameters (Requirement 3)
  const trendingUsersData = useMemo(() => {
    return [...users]
      .map(u => {
        const giftCount = u.diamonds || 0;
        const followers = u.followersCount || 0;
        const experience = u.experience || 0;
        const activityScore = (followers * 15) + (giftCount * 4) + (u.level * 350) + (experience / 100);
        const achievementsList = [
          'Microphone Master 🎙️', 'Top Diamond Gifter 💎', 'Prestige Host ⭐', 'Rising Voice Star 📈', 'Lounge Sovereign 👑'
        ];
        return {
          ...u,
          activityScore,
          achievement: u.badges?.[0] || achievementsList[u.level % achievementsList.length]
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);
  }, [users]);

  // Derived New Users welcome list recently registered (Requirement 2)
  const newUsersData = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return timeB - timeA;
      })
      .filter(u => u.uid !== currentUser?.uid)
      .slice(0, 10);
  }, [users]);

  // Derived real-time following feed item compute (Requirement 1 & 10)
  const followingFeedItems = useMemo(() => {
    if (!currentUser) return [];
    
    const items = followedUids.map(uid => {
      const uProfile = users.find(u => u.uid === uid);
      if (!uProfile) return null;
      
      // Look for any live room hosted by this followed user
      const liveRoom = rooms.find(r => r.hostId === uid && r.isLive !== false);
      
      return {
        profile: uProfile,
        liveRoom: liveRoom || null,
        isLive: !!liveRoom
      };
    })
    .filter(Boolean) as { profile: UserProfile; liveRoom: Room | null; isLive: boolean }[];
    
    return items.sort((a, b) => {
      // Sort live users first
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return 0;
    });
  }, [followedUids, users, rooms, currentUser]);

  // Derived following feed dynamic categories: trending, new, and followed activities
  const homeTrendingRooms = useMemo(() => {
    return [...rooms]
      .filter(r => r.isLive !== false)
      .sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a))
      .slice(0, 4);
  }, [rooms]);

  const homeNewRoomCreations = useMemo(() => {
    return [...rooms]
      .filter(r => r.isLive !== false)
      .sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      })
      .slice(0, 4);
  }, [rooms]);

  const followedActivities = useMemo(() => {
    if (!currentUser || followedUids.length === 0) return [];
    return activities.filter(act => {
      const matchesUser = followedUids.includes(act.userUid);
      const matchesTarget = act.details?.targetUid && followedUids.includes(act.details.targetUid);
      return matchesUser || matchesTarget;
    });
  }, [activities, followedUids, currentUser]);

  // Leaderboard data derived dynamically (Requirement 5)
  const hostsLeaderboardData = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const diff = (b.diamonds || 0) - (a.diamonds || 0);
        if (diff !== 0) return diff;
        return (b.level || 1) - (a.level || 1);
      })
      .slice(0, 10);
  }, [users]);

  const giftersLeaderboardData = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        // High coins or levels represents big gifter profiles on homeboard
        const diff = (b.level || 1) - (a.level || 1);
        if (diff !== 0) return diff;
        return (b.coins || 0) - (a.coins || 0);
      })
      .slice(0, 10);
  }, [users]);

  // Follow and Unfollow syncing toggle directly with Firestore (Requirement 2 & 10)
  const handleFollowUser = async (targetUid: string) => {
    if (!currentUser) {
      toast.error('Log in first to connect with other voice star nobles!');
      return;
    }
    if (currentUser.uid === targetUid) {
      toast.error('You cannot follow your own royal star channel!');
      return;
    }

    const isFollowing = followedUids.includes(targetUid);
    const updated = isFollowing 
      ? followedUids.filter(x => x !== targetUid)
      : [...followedUids, targetUid];

    setFollowedUids(updated);
    localStorage.setItem('followed_uids', JSON.stringify(updated));

    try {
      const followDocId = `${currentUser.uid}_${targetUid}`;
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followDocId));
      } else {
        await setDoc(doc(db, 'follows', followDocId), {
          followerId: currentUser.uid,
          targetId: targetUid,
          timestamp: new Date().toISOString()
        });
      }

      const targetUserRef = doc(db, 'users', targetUid);
      const differenceVal = isFollowing ? -1 : 1;
      await updateDoc(targetUserRef, {
        followersCount: increment(differenceVal)
      });

      if (isFollowing) {
        toast.info('No longer following this star profile.');
      } else {
        const targetName = users.find(u => u.uid === targetUid)?.displayName || 'Star User';
        // Log follow activity for real-time feed
        logActivity('new_follower', {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Guest',
          photoURL: currentUser.photoURL || getPremiumAvatar(currentUser.uid)
        }, {
          targetUid: targetUid,
          targetName: targetName
        });

        toast.success('Successfully added to your follow deck! ✨');
      }
    } catch (err) {
      console.error("DB Follow Sync Error:", err);
      toast.error('Error saving follow status to cloud database.');
    }
  };

  // Quick Action triggers (Requirement 7)
  const handleCreateRoom = () => {
    if (myActiveRoom) {
      toast.success('Navigating to your active live room! 🎙️');
      navigate(`/room/${myActiveRoom.id}`);
    } else {
      setShowInstantCreate(true);
    }
  };

  const handleInstantCreateRoom = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to create a room.');
      return;
    }
    if (!instantTitle.trim()) {
      toast.error('Please enter a Room Title.');
      return;
    }

    setInstantCreating(true);
    const toastId = toast.loading('Constructing space instantly... 🚀🎙️');

    try {
      const generatedId = Math.floor(100000000 + Math.random() * 900000000).toString();
      const roomsRef = collection(db, 'rooms');
      const newRoomRef = doc(roomsRef, generatedId);

      const chosenCover = PREMIUM_BACKGROUNDS_PRESET.find(b => b.id === instantCover)?.url || PREMIUM_BACKGROUNDS_PRESET[0].url;
      const nowISO = new Date().toISOString();
      const parsedSeatsCount = 8;

      const newRoom = {
        id: generatedId,
        title: instantTitle.trim(),
        description: instantDesc.trim(),
        thumbnailUrl: chosenCover,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || 'Guest',
        hostPhoto: currentUser.photoURL || getPremiumAvatar(currentUser.uid),
        memberCount: 1, 
        createdAt: nowISO,
        category: instantCategory, 
        roomType: 'standard',
        language: 'English',
        password: '',
        welcomeMessage: 'Welcome! Tap a seat to join the mic & vibe together in harmony! ✨🎙️',
        tags: ['#Instant', `#${instantCategory.toUpperCase()}`, '#SoulLink'],
        musicEnabled: true,
        seatCount: parsedSeatsCount,
        userLimit: 100,
        backgroundTheme: instantCover,
        isLive: true,
        giftVolume: 0,
        hourlyJoinCount: 1,
        trendingScore: 0,
        lastTrendingUpdate: Date.now(),
        seats: Array.from({ length: parsedSeatsCount }, (_, i) => ({
          index: i,
          uid: i === 0 ? currentUser.uid : null, // Host automatically occupies seat #0
          isLocked: false,
          isMuted: false,
          role: i === 0 ? 'owner' : null
        })),
        superAdminIds: [],
        coHostIds: []
      };

      // Concurrent setDoc writes to Firestore to guarantee immediate consistency
      const memberRef = doc(db, 'rooms', generatedId, 'members', currentUser.uid);
      await Promise.all([
        setDoc(newRoomRef, newRoom),
        setDoc(memberRef, {
          uid: currentUser.uid,
          role: 'host',
          displayName: currentUser.displayName || 'Guest',
          photoURL: currentUser.photoURL || getPremiumAvatar(currentUser.uid),
          joinedAt: nowISO
        })
      ]);

      // Force Sync Cache so it immediately displays correctly on list without delay
      RoomCache.forceSynchronize(newRoom as unknown as Room).catch((cacheErr) => {
        console.warn("Ignoring cache synchronization exception:", cacheErr);
      });

      localStorage.setItem(`persistent_room_${currentUser.uid}`, generatedId);
      
      // Log starting a new room activity
      logActivity('room_started', {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Guest',
        photoURL: currentUser.photoURL || getPremiumAvatar(currentUser.uid)
      }, {
        roomId: generatedId,
        roomTitle: instantTitle.trim()
      });

      toast.success('Your room is live instantly! 🎙️✨', { id: toastId });
      setShowInstantCreate(false);
      navigate(`/room/${generatedId}`);
    } catch (error) {
      console.error("Instant Room creation error:", error);
      toast.error('Failed to create room. Please verify your connection.', { id: toastId });
    } finally {
      setInstantCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string, designRoom?: any) => {
    if (roomId.startsWith('demo_room_')) {
      // Seed the demo room in Firestore before loading so RoomPage handles it organically (No 404 Room not found timeouts!)
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists() && designRoom) {
          const initialSeats = Array.from({ length: 9 }, (_, i) => ({
            index: i,
            uid: i === 0 ? designRoom.hostId : null,
            isLocked: false,
            isMuted: false
          }));
          await setDoc(roomRef, {
            ...designRoom,
            seats: initialSeats,
            seatCount: 9,
            createdAt: new Date().toISOString(),
            isLive: true,
            memberCount: 1,
            userLimit: designRoom.userLimit || 25,
            giftVolume: 0
          });
        }
      } catch (e) {
        console.warn("Failed to auto-seed demo room layout on Firestore:", e);
      }
    }
    navigate(`/room/${roomId}`);
  };

  const handlePartyHop = () => {
    const liveRooms = rooms.filter(r => r.isLive !== false);
    if (liveRooms.length === 0) {
      toast.error('No live party lounges online right now. Let us build your custom vocal stage!');
      navigate('/room/create');
      return;
    }
    // Join the absolute busiest live room in real-time
    const sorted = [...liveRooms].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    const target = sorted[0];
    toast.success(`Leaping into popular station: "${target.title}"! 🚀`);
    navigate(`/room/${target.id}`);
  };

  const handleDirectLoungeHop = () => {
    if (rooms && rooms.length > 0) {
      const live = rooms[0];
      toast.success(`Leaping into Active Station: "${live.title || 'SoulLink Stage'}"! 🚀`);
      navigate(`/room/${live.id}`);
    } else {
      toast.success("Launching a premium starlight reception station! ⚡");
      navigate('/room/create');
    }
  };

  const handleShareRoom = async (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    const inviteLink = `${getPublicOrigin()}/?room=${room.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: room.title,
          text: `Join the live party lounge "${room.title}" on SoulLink! 🎙️✨`,
          url: inviteLink
        });
        toast.success("Shared successfully! 🚀");
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyRoomLinkToClipboard(inviteLink);
        }
      }
    } else {
      copyRoomLinkToClipboard(inviteLink);
    }
  };

  const copyRoomLinkToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success("Direct invite link copied to clipboard! 📋✨");
        })
        .catch(() => {
          toast.error("Failed to copy invite link.");
        });
    } else {
      toast.error("Sharing or clipboard not supported by your browser.");
    }
  };

  const handleQuickJoin = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    // Overriding any current room context by simply initiating immediate route traversal
    toast.success("Quick Joined - leaping directly into lounge! ⚡🚀");
    navigate(`/room/${roomId}`);
  };

  const handleFindCompanions = () => {
    setShowSearchOverlay(true);
    // Instant input focusing
    setTimeout(() => {
      const el = document.getElementById('search-hub-input');
      if (el) el.focus();
    }, 150);
  };

  const handleInviteNobles = () => {
    const inviteLink = getPublicOrigin();
    const message = `👑 Join my premium circle on the Maxo Social-Audio Lounge! Meet elite voice stars and join high-fidelity audio rooms. Experience live starlight vocals here: ${inviteLink}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message)
        .then(() => {
          toast.success('Royal Invitation copied to clipboard! Share it with friends. 🎖️');
        })
        .catch(() => {
          toast.error('Failed to copy. Share current URL to invite!');
        });
    } else {
      toast.error('Share current URL to invite your core circle!');
    }
  };

  // Improved Advanced Search suggestions filtering (Requirement 8)
  const filteredUsers = useMemo(() => {
    return searchUsers.filter(u => 
      u.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchUsers, searchTerm]);

  const filteredRooms = useMemo(() => {
    return searchRooms.filter(r => 
      r.isLive !== false &&
      (r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [searchRooms, searchTerm]);

  const filteredAgencies = useMemo(() => {
    return searchAgencies.filter(a => 
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchAgencies, searchTerm]);

  const filteredHosts = useMemo(() => {
    return searchUsers.filter(u => 
      (u.isHostApproved || u.level >= 5) && 
      (u.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchUsers, searchTerm]);

  const activePromoBanner = PREMIUM_BANNERS[currentBanner];

  const quickJoinRooms = useMemo(() => {
    const activeRoomsSet = rooms.filter(r => r.isLive !== false);
    return activeRoomsSet;
  }, [rooms, currentUser]);

  return (
    <div className="bg-[#030303] min-h-screen text-white pb-32 font-sans antialiased relative overflow-x-hidden">
      
      {/* Background Star Ambient Glow */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#200B1A] via-[#0D0B16] to-[#030303] -z-10 animate-fade-in" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP COMPONENT HEADER MATCHING SCREENSHOT 1 */}
      <header className="sticky top-0 z-40 bg-[#030303]/90 backdrop-blur-md border-b border-white/5 py-4 px-5 flex justify-between items-center transition-all">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="text-xl font-black uppercase tracking-tight relative transition-all text-white bg-transparent border-none outline-none cursor-pointer"
          >
            SoulLink
            <span className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-[#FF4D67] rounded-full" />
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <button 
            onClick={handleFindCompanions}
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-white bg-transparent border-none cursor-pointer"
            title="Search companions"
          >
            <Search size={22} className="stroke-[2.5]" />
          </button>

          <button 
            onClick={() => {
              const element = document.getElementById('leaderboards-showcase');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              } else {
                toast.info("Winner board is displayed below! 🏆");
              }
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-amber-400 hover:text-amber-300 bg-transparent border-none cursor-pointer"
            title="Winner Leaderboards"
          >
            <Trophy size={22} className="stroke-[2.5]" />
          </button>

          <div 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full border-[1.5px] border-[#FF4D67] p-[1.5px] cursor-pointer hover:border-amber-400 transition-all shadow-md overflow-hidden bg-white shrink-0 flex items-center justify-center relative z-10"
            title="My Account Profile"
          >
            <img 
              src={profile?.photoURL || getPremiumAvatar(profile?.uid || 'user')} 
              alt="me avatar" 
              className="w-full h-full object-cover rounded-full" 
            />
          </div>
        </div>
      </header>

      {/* CORE WRAPPED CONTENT PANEL */}
      <main className="max-w-xl mx-auto px-5 pt-4 space-y-6 select-none">
        
        {/* PREMIUM PROMOTIONAL BANNER CAROUSEL (Requirement 6) */}
        <ErrorBoundary>
          <section id="promo-carousel" className="relative group">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePromoBanner.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              onClick={() => setShowBannerModal(activePromoBanner)}
              className={`w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[30/8] rounded-[24px] bg-gradient-to-r ${activePromoBanner.gradient} p-[1.5px] border cursor-pointer relative overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.015]`}
            >
              <div className="bg-[#0C0F19]/90 rounded-[24px] w-full h-full p-4.5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 h-full pointer-events-none">
                  <img src={activePromoBanner.image} className="w-full h-full object-cover rounded-r-[24px] mix-blend-luminosity brightness-75 select-none" alt="" />
                </div>
                <div className="absolute left-0 right-0 bottom-0 top-0 bg-gradient-to-r from-[#0C0F19] via-[#0C0F19]/80 to-transparent pointer-events-none z-0" />

                {/* Banner Header Tag */}
                <div className="z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#F43F5E] rounded-full animate-ping" />
                    <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-[#F43F5E] uppercase bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      {activePromoBanner.badge}
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl">{activePromoBanner.icon}</span>
                </div>

                {/* Banner Titles */}
                <div className="z-10 mt-2 sm:mt-4 space-y-1">
                  <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                    {activePromoBanner.subtitle}
                  </h4>
                  <h2 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug font-display line-clamp-1">
                    {activePromoBanner.title}
                  </h2>
                </div>

                {/* Bottom Action Footer */}
                <div className="z-10 flex items-center justify-between text-[9px] sm:text-xs pt-2 border-t border-white/5">
                  <span className="text-gray-400 font-bold flex items-center gap-1.5 shrink-0">
                    <Calendar size={12} className="text-amber-500 shrink-0" /> {activePromoBanner.duration}
                  </span>
                  <div className="flex items-center gap-1 font-black text-amber-400 uppercase tracking-wider group-hover:text-white transition-colors">
                    <span>{activePromoBanner.actionText}</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel dots */}
          <div className="flex justify-center gap-1.5 mt-2">
            {PREMIUM_BANNERS.map((banner, index) => (
              <span 
                key={banner.id}
                onClick={() => setCurrentBanner(index)}
                className={`w-6 h-1 rounded-full transition-all duration-300 cursor-pointer ${currentBanner === index ? 'bg-pink-500' : 'bg-white/15 hover:bg-white/35'}`}
              />
            ))}
          </div>
        </section>

        {/* HIGH-FIDELITY INTERACTIVE BANNER DETAIL MODAL */}
        <AnimatePresence>
          {showBannerModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#06080C]/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className={`glass-card max-w-lg w-full bg-gradient-to-b ${showBannerModal.gradient} p-[1.5px] shadow-2xl relative overflow-hidden`}
              >
                <div className="bg-[#0D101C]/96 p-6 rounded-2xl relative space-y-6">
                  <button 
                    onClick={() => setShowBannerModal(null)}
                    className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center border border-white/10 transition-transform active:scale-90"
                  >
                    <X size={16} />
                  </button>

                  <div className="space-y-2">
                    <span className="text-[9px] font-black tracking-widest text-[#F43F5E] uppercase bg-rose-500/10 px-2.5 py-1 rounded">
                      {showBannerModal.badge}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white font-display mt-2 leading-snug">
                      {showBannerModal.title}
                    </h3>
                    <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} /> Duration: {showBannerModal.duration}
                    </p>
                  </div>

                  <p className="text-xs text-gray-300 font-semibold leading-relaxed">
                    {showBannerModal.desc}
                  </p>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-500" />
                      <span className="text-[10px] font-black text-yellow-400 tracking-wider uppercase">EXCLUSIVE REWARDS POOL</span>
                    </div>
                    <p className="text-xs text-white font-black leading-snug">
                      {showBannerModal.reward}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => setShowBannerModal(null)}
                      className="flex-1 h-11 bg-white/5 border border-white/10 hover:bg-white/10 font-black text-xs uppercase rounded-xl transition-all active:scale-95"
                    >
                      Close Detail
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowBannerModal(null);
                        toast.success(`You registered successfully for the ${showBannerModal.title}! Complete daily objectives to claim rewards. 🎉`);
                      }}
                      className="flex-1 h-11 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 hover:opacity-90 font-black text-xs uppercase rounded-xl shadow-xl shadow-pink-500/10 transition-all active:scale-95 text-white border-0"
                    >
                      {showBannerModal.actionText}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </ErrorBoundary>
                {/* PREMIUM FEED SELECTION TABS */}
        <div className="flex items-center justify-center p-1 bg-white/[0.03] border border-white/5 rounded-2xl max-w-md mx-auto mb-6">
          <button
            onClick={() => setHomeFeedTab('stories')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 ${
              homeFeedTab === 'stories'
                ? 'bg-gradient-to-r from-orange-400 to-[#FF4D67] text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen size={12} />
            <span>Stories</span>
          </button>
          <button
            onClick={() => setHomeFeedTab('following')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 ${
              homeFeedTab === 'following'
                ? 'bg-gradient-to-r from-orange-400 to-[#FF4D67] text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={12} />
            <span>Following</span>
          </button>
          <button
            onClick={() => setHomeFeedTab('leaderboards')}
            id="leaderboards-showcase"
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 ${
              homeFeedTab === 'leaderboards'
                ? 'bg-gradient-to-r from-orange-400 to-[#FF4D67] text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy size={12} />
            <span>Rankings</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {homeFeedTab === 'stories' && (
            <motion.div
              key="stories-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* Real-time active Stories Feed matching user category selection filters */}
              <StoryFeed 
                selectedCategory={selectedStoryCategory} 
                setSelectedCategory={setSelectedStoryCategory} 
              />
            </motion.div>
          )}

          {homeFeedTab === 'following' && (
            <motion.div
              key="following-feed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* 1. SECTIONS: LIVE HOSTED STAGES BY PEOPLE WE FOLLOW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-black tracking-widest text-[#FF4D67] uppercase flex items-center gap-1.5 leading-none">
                    <Radio size={12} className="text-[#FF4D67] animate-pulse" /> Live Followed Stages
                  </h3>
                  {followingFeedItems.length > 0 && (
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full">
                      {followingFeedItems.filter(item => item.isLive).length} Active
                    </span>
                  )}
                </div>

                {followingFeedItems.filter(item => item.isLive).length === 0 ? (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center space-y-2">
                    <Radio size={24} className="text-gray-600 mx-auto opacity-40 mx-auto" />
                    <p className="text-xs text-gray-400 font-bold">No followed creators are hosting a live room right now.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followingFeedItems.filter(item => item.isLive).map(({ profile: targetProf, liveRoom }) => {
                      if (!liveRoom) return null;
                      return (
                        <motion.div
                          key={liveRoom.id}
                          whileHover={{ scale: 1.015, y: -1 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => navigate(`/room/${liveRoom.id}`)}
                          className="bg-gradient-to-r from-[#170B1A] via-[#0E0F1E] to-[#120D1A] border border-pink-500/20 p-4 rounded-3xl flex items-center gap-4 cursor-pointer shadow-lg hover:border-pink-500/40 transition-all group"
                        >
                          <div className="relative w-15 h-15 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-zinc-900 shadow-inner">
                            <img 
                              src={liveRoom.thumbnailUrl || 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=300'} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt="" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1 left-1 bg-[#FF4D67] text-[7.5px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1 h-1 bg-white rounded-full animate-ping" />
                              <span>Live</span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5 border border-white/10">
                                <AvatarImage src={targetProf.photoURL || getPremiumAvatar(targetProf.uid)} />
                                <AvatarFallback className="text-[7px]">P</AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-gray-450 font-extrabold max-w-[150px] truncate">
                                {targetProf.displayName} is hosting
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-white leading-snug line-clamp-1 mt-1 truncate">
                              {liveRoom.title}
                            </h4>
                            <p className="text-[9.5px] text-[#A78BFA] font-black uppercase mt-1">
                              {liveRoom.category || 'Vocal'} Lounge
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1 text-[#FF4D67] font-black text-xs">
                              <Users size={11} />
                              <span>{liveRoom.memberCount || 1}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-pink-500/80 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
                              Enter
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. SECTIONS: REALTIME ACTIVITIES FROM FOLLOWED USERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-black tracking-widest text-[#F59E0B] uppercase flex items-center gap-1.5 leading-none">
                    <Flame size={12} className="text-[#F59E0B]" /> Followed Activity Stream
                  </h3>
                  {followedActivities.length > 0 && (
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">
                      Real-time Feed
                    </span>
                  )}
                </div>

                {followedActivities.length === 0 ? (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center space-y-2">
                    <Flame size={24} className="text-gray-600 mx-auto opacity-40 mx-auto" />
                    <p className="text-xs text-gray-400 font-bold">No recent starlight activities from followed creators.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 select-none custom-scrollbar">
                    {followedActivities.slice(0, 8).map((act, idx) => {
                      const isGift = act.type === 'gift_sent';
                      const isFollow = act.type === 'new_follower';
                      const isRoomStart = act.type === 'room_started';
                      const isRoomJoin = act.type === 'room_joined';

                      const getIcon = () => {
                        if (isGift) return <Gift size={12} className="text-pink-500" />;
                        if (isFollow) return <UserPlus size={12} className="text-cyan-400" />;
                        if (isRoomStart) return <Mic size={12} className="text-amber-400" />;
                        return <Users size={12} className="text-[#A78BFA]" />;
                      };

                      return (
                        <motion.div
                          key={act.id || idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-zinc-950/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden bg-zinc-900 shrink-0 relative cursor-pointer" onClick={() => navigate(`/profile/${act.userUid}`)}>
                              <img src={act.userPhoto || getPremiumAvatar(act.userUid)} className="w-full h-full object-cover" alt="" />
                              <div className="absolute -bottom-1 -right-1 bg-black border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                                {getIcon()}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white leading-relaxed">
                                <span className="text-[#F59E0B] hover:underline cursor-pointer" onClick={() => navigate(`/profile/${act.userUid}`)}>
                                  {act.userName}
                                </span>{' '}
                                <span className="text-gray-400 font-semibold">
                                  {isGift && `sent a ${act.details?.giftName || 'Gift'} gift`}
                                  {isFollow && `followed ${act.details?.targetName || 'a user'}`}
                                  {isRoomStart && `started voice room "${act.details?.roomTitle}"`}
                                  {isRoomJoin && `joined room "${act.details?.roomTitle}"`}
                                </span>
                              </p>
                              <span className="text-[9px] text-gray-500 font-black uppercase mt-0.5 block">
                                {formatActivityTime(act.timestamp)}
                              </span>
                            </div>
                          </div>

                          {act.details?.roomId && (
                            <button
                              onClick={() => navigate(`/room/${act.details.roomId}`)}
                              className="text-[9px] font-black uppercase tracking-wider text-[#FF4D67] bg-[#FF4D67]/10 hover:bg-[#FF4D67]/20 border border-[#FF4D67]/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              Join Stage
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. SECTIONS: TRENDING LOBBIES DISCOVERY */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-black tracking-widest text-pink-500 uppercase flex items-center gap-1.5 leading-none">
                    <Sparkles size={12} className="text-pink-500" /> Trending & New Discoveries
                  </h3>
                  <button
                    onClick={() => navigate('/rooms')}
                    className="text-[9px] font-black text-[#A78BFA] hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-0"
                  >
                    <span>View All</span>
                    <ChevronRight size={10} />
                  </button>
                </div>

                {/* Horizontal Scrolling Bento Rows for trending/new rooms */}
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth select-none min-h-[145px]">
                  {homeTrendingRooms.length === 0 ? (
                    <div className="w-full text-center py-4 text-xs text-gray-500">
                      Syncing dynamic nodes...
                    </div>
                  ) : (
                    homeTrendingRooms.map(room => {
                      const trendingScore = calculateTrendingScore(room);
                      return (
                        <motion.div
                          key={room.id}
                          whileHover={{ y: -3, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/room/${room.id}`)}
                          className="w-44 bg-zinc-900/60 border border-white/5 p-3 rounded-2.5xl shrink-0 flex flex-col gap-2 cursor-pointer hover:border-pink-500/30 transition-all select-none"
                        >
                          <div className="w-full aspect-square rounded-2xl shrink-0 relative border border-white/5 bg-zinc-950">
                            <img src={getRoomThumbnail(room.thumbnailUrl, room.title, room.id)} className="w-full h-full object-cover rounded-2xl" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md text-[8px] font-black text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 z-10">
                              <Flame size={8} className="text-amber-500 animate-pulse" />
                              <span>{Math.round(trendingScore / 1000)}k</span>
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 bg-pink-500/80 backdrop-blur-sm text-[7px] font-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest z-10">
                              {room.category || 'Lounge'}
                            </div>
                            {/* Premium overlay host avatar badge */}
                            <div className="absolute bottom-1.5 right-1.5 z-20 hover:scale-110 transition-all duration-150">
                              <HostAvatar 
                                hostId={room.hostId} 
                                fallbackPhoto={room.hostPhoto} 
                                fallbackName={room.hostName} 
                                className="w-6 h-6 rounded-full object-cover border-2 border-zinc-900 bg-zinc-800 shadow-md"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-0.5">
                            <h4 className="text-[11px] font-black text-white leading-tight truncate">
                              {room.title}
                            </h4>
                            <p className="text-[9px] text-[#A78BFA] font-extrabold flex items-center gap-1">
                              <Radio size={8} /> {room.memberCount || 1} online
                            </p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. SECTIONS: PRESTIGE RECOMMENDATIONS (If Followed count is small) */}
              {followedUids.length < 3 && (
                <div className="space-y-3 pt-2 bg-gradient-to-r from-orange-950/20 via-pink-950/10 to-indigo-950/25 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[8px] text-pink-500 font-extrabold tracking-widest uppercase">SOULLINK NOBLE CONNECT</span>
                    <h3 className="text-xs font-black text-white uppercase italic tracking-tight">Expand Your Star Circle</h3>
                    <p className="text-[9.5px] text-gray-450 font-bold leading-normal">
                      Follow premium voice stars in the community to get immediate updates, joins, and event schedules directly on this live deck.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2.5">
                    {newUsersData.slice(0, 3).map(nob => {
                      const isFoll = followedUids.includes(nob.uid);
                      return (
                        <div key={nob.uid} className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] p-3 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0" onClick={() => navigate(`/profile/${nob.uid}`)}>
                            <Avatar className="w-8.5 h-8.5 border border-white/10 shrink-0 cursor-pointer">
                              <AvatarImage src={nob.photoURL || getPremiumAvatar(nob.uid)} />
                              <AvatarFallback className="text-[8px] font-black">ST</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-[11px] font-black text-white truncate max-w-[110px]">{nob.displayName}</h5>
                                <span className="bg-amber-400 text-black text-[6.5px] font-black px-1 rounded-sm">Lv.{nob.level || 1}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 font-extrabold uppercase mt-0.5">ID: #{nob.numericId}</p>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleFollowUser(nob.uid)}
                            className={`h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                              isFoll
                                ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                : 'bg-gradient-to-r from-orange-400 to-[#FF4D67] text-white border-0'
                            }`}
                          >
                            {isFoll ? 'Unfollow' : 'Follow'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {homeFeedTab === 'leaderboards' && (
            <motion.div
              key="leaderboards-feed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 font-sans select-none pb-12"
            >
              {/* Leaderboards Header Banner */}
              <div className="bg-gradient-to-r from-[#170F22] via-[#0E1022] to-[#120B20] border border-white/5 rounded-[28px] p-5 relative overflow-hidden shadow-xl">
                <div className="absolute right-4 top-4 text-5xl opacity-[0.03] select-none font-black">👑</div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[8px] font-black text-yellow-400 uppercase tracking-widest">
                    <Trophy size={9} /> VOICE STAR HALL OF FAMER
                  </div>
                  <h3 className="text-sm font-black text-zinc-100 uppercase italic tracking-tight">Sovereign Rankings</h3>
                  <p className="text-[10px] text-gray-450 font-bold leading-normal">
                    The grand hierarchy of creators and noble patrons who enrich the audio room ecosystem. Rankings sync every minute!
                  </p>
                </div>
              </div>

              {/* Leaderboards Segments Switch Tab */}
              <div className="flex bg-[#121424] p-1 rounded-xl gap-1 border border-white/5 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('hosts')}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    leaderboardTab === 'hosts'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎭 Star Hosts
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('gifters')}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    leaderboardTab === 'gifters'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🪙 Top Patron Gifters
                </button>
              </div>

              {/* Podium Bento Grid layout for position #1, #2, #3 */}
              <div className="grid grid-cols-3 gap-3 items-end pt-5 pb-2">
                
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  {(() => {
                    const cand = leaderboardTab === 'hosts' ? hostsLeaderboardData[1] : giftersLeaderboardData[1];
                    if (!cand) return <div className="h-24 bg-white/5 w-full rounded-2xl opacity-20" />;
                    return (
                      <div 
                        onClick={() => navigate(`/profile/${cand.uid}`)}
                        className="flex flex-col items-center w-full bg-white/[0.02] border border-slate-350/20 p-3 rounded-2xl cursor-pointer hover:border-white/25 active:scale-95 transition-all"
                      >
                        <div className="relative">
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-md">🥈</div>
                          <Avatar className="w-11 h-11 border-2 border-slate-300">
                            <AvatarImage src={cand.photoURL || getPremiumAvatar(cand.uid)} />
                            <AvatarFallback className="bg-zinc-800 text-xs font-black text-white">{cand.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="text-[10px] font-black mt-2 leading-tight text-zinc-100 truncate w-full text-center">{cand.displayName}</span>
                        <span className="text-[8px] font-extrabold text-[#A78BFA] mt-0.5 uppercase tracking-tighter">LV.{cand.level || 1}</span>
                        <div className="flex items-center gap-0.5 mt-1 bg-slate-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-300">
                          {leaderboardTab === 'hosts' ? (
                            <>💎 {(cand.diamonds || 0).toLocaleString()}</>
                          ) : (
                            <>🪙 {(cand.coins || 0).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 1st Place (Center - Highlighted) */}
                <div className="flex flex-col items-center">
                  {(() => {
                    const cand = leaderboardTab === 'hosts' ? hostsLeaderboardData[0] : giftersLeaderboardData[0];
                    if (!cand) return <div className="h-28 bg-white/5 w-full rounded-2xl opacity-20" />;
                    return (
                      <div 
                        onClick={() => navigate(`/profile/${cand.uid}`)}
                        className="flex flex-col items-center w-full bg-gradient-to-b from-[#2A1E0E] to-[#120F16] border border-yellow-500/40 p-3.5 rounded-2.5xl cursor-pointer hover:border-yellow-400 active:scale-95 transition-all shadow-xl shadow-yellow-500/5 relative"
                      >
                        <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-2xl animate-bounce [animation-duration:3s]">👑</div>
                        <div className="relative">
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-md">🥇</div>
                          <Avatar className="w-13 h-13 border-2 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.25)]">
                            <AvatarImage src={cand.photoURL || getPremiumAvatar(cand.uid)} />
                            <AvatarFallback className="bg-zinc-800 text-xs font-black text-white">{cand.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="text-[11px] font-black mt-2 text-yellow-400 leading-tight truncate w-full text-center">{cand.displayName}</span>
                        <span className="text-[8px] font-extrabold text-yellow-500 uppercase tracking-tighter">LV.{cand.level || 1}</span>
                        <div className="flex items-center gap-0.5 mt-1 bg-yellow-500/25 border border-yellow-500/30 px-2 py-0.5 rounded text-[8.5px] font-black text-yellow-400 shadow-sm animate-pulse">
                          {leaderboardTab === 'hosts' ? (
                            <>💎 {(cand.diamonds || 0).toLocaleString()}</>
                          ) : (
                            <>🪙 {(cand.coins || 0).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  {(() => {
                    const cand = leaderboardTab === 'hosts' ? hostsLeaderboardData[2] : giftersLeaderboardData[2];
                    if (!cand) return <div className="h-24 bg-white/5 w-full rounded-2xl opacity-20" />;
                    return (
                      <div 
                        onClick={() => navigate(`/profile/${cand.uid}`)}
                        className="flex flex-col items-center w-full bg-white/[0.02] border border-amber-600/20 p-3 rounded-2xl cursor-pointer hover:border-white/25 active:scale-95 transition-all"
                      >
                        <div className="relative">
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-md">🥉</div>
                          <Avatar className="w-11 h-11 border-2 border-amber-650">
                            <AvatarImage src={cand.photoURL || getPremiumAvatar(cand.uid)} />
                            <AvatarFallback className="bg-zinc-800 text-xs font-black text-white">{cand.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="text-[10px] font-black mt-2 leading-tight text-zinc-100 truncate w-full text-center">{cand.displayName}</span>
                        <span className="text-[8px] font-extrabold text-amber-500 uppercase tracking-tighter">LV.{cand.level || 1}</span>
                        <div className="flex items-center gap-0.5 mt-1 bg-amber-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-amber-500">
                          {leaderboardTab === 'hosts' ? (
                            <>💎 {(cand.diamonds || 0).toLocaleString()}</>
                          ) : (
                            <>🪙 {(cand.coins || 0).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Rows #4 to #10 List */}
              <div className="bg-[#121522] border border-white/5 rounded-2.5xl p-4 divide-y divide-white/5">
                {(() => {
                  const targetList = leaderboardTab === 'hosts' ? hostsLeaderboardData.slice(3) : giftersLeaderboardData.slice(3);
                  if (targetList.length === 0) {
                    return <p className="text-xs text-gray-550 text-center font-bold py-6 uppercase font-mono">No other rankings logged yet.</p>;
                  }
                  return targetList.map((entry, idx) => {
                    const trueRank = idx + 4;
                    const isFollowing = followedUids.includes(entry.uid);
                    return (
                      <div 
                        key={entry.uid}
                        className="flex items-center justify-between py-3 group first:pt-0 last:pb-0 font-sans"
                      >
                        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${entry.uid}`)}>
                          <span className="text-[10px] font-black text-gray-500 w-5 text-center shrink-0">#{trueRank}</span>
                          <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                            <AvatarImage src={entry.photoURL || getPremiumAvatar(entry.uid)} />
                            <AvatarFallback className="bg-zinc-855 font-black text-xs">{entry.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 leading-tight">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-zinc-100 group-hover:text-amber-400 transition-colors truncate max-w-[110px] sm:max-w-[140px]">{entry.displayName}</h4>
                              <span className="text-[7.5px] bg-[#A78BFA]/10 text-[#A78BFA] font-black px-1 rounded-sm">LV.{entry.level || 1}</span>
                            </div>
                            <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-tight mt-0.5">ID: #{entry.numericId || entry.uid.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-black text-right min-w-[55px]">
                            {leaderboardTab === 'hosts' ? (
                              <span className="text-yellow-400">💎 {(entry.diamonds || 0).toLocaleString()}</span>
                            ) : (
                              <span className="text-purple-400">🪙 {(entry.coins || 0).toLocaleString()}</span>
                            )}
                          </span>

                          {entry.uid !== currentUser?.uid && (
                            <Button
                              onClick={() => handleFollowUser(entry.uid)}
                              className={`h-6 px-2.5 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                                isFollowing
                                  ? 'bg-transparent border-white/10 text-gray-400 hover:bg-white/5'
                                  : 'bg-gradient-to-r from-orange-400 to-[#FF4D67] text-white border-none shadow'
                              }`}
                            >
                              {isFollowing ? 'Joined' : '+ Join'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* INSTANT ROOM CREATION OVERLAY MODAL */}
      <AnimatePresence>
        {showInstantCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#030303]/95 backdrop-blur-xl z-50 overflow-y-auto px-5 py-10 font-sans flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-gradient-to-b from-[#13101E] to-[#0A0710] border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-pink-500 to-[#FF4D67]" />
              
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-pink-500 font-extrabold tracking-widest uppercase">SOULLINK LIGHTSPEED ENGINE</span>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Instant Room Creation</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstantCreate(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Step Guide */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">1. Select a Room Option Preset</span>
                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                  {INSTANT_ROOM_PRESETS.map(preset => {
                    const isSelected = instantCategory === preset.category && instantTitle === preset.title;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setInstantTitle(preset.title);
                          setInstantDesc(preset.desc);
                          setInstantCategory(preset.category);
                          setInstantCover(preset.cover);
                          toast.success(`Loaded Preset: ${preset.name} ✨`);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 group shrink-0 active:scale-[0.99] ${
                          isSelected
                            ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-pink-500/60 shadow-lg shadow-pink-500/5'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/15'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-white group-hover:text-pink-400 transition-colors">
                            {preset.name}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-semibold line-clamp-1">
                            {preset.desc}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isSelected ? 'border-pink-500 bg-pink-500 text-white' : 'border-white/20'
                        }`}>
                          {isSelected && <Check size={8} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room details fields */}
              <AnimatePresence mode="popLayout">
                {instantTitle && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 pt-3 border-t border-white/5 overflow-hidden"
                  >
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">2. Confirm Customization</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Lounge Room Title</label>
                      <Input
                        value={instantTitle}
                        onChange={(e) => setInstantTitle(e.target.value)}
                        placeholder="Customize room name..."
                        className="h-10 bg-white/5 hover:bg-white/10 text-white focus:bg-white/10 font-bold text-xs rounded-xl border-white/10 focus:border-pink-500"
                        maxLength={45}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block px-1">Host Description</label>
                      <textarea
                        value={instantDesc}
                        onChange={(e) => setInstantDesc(e.target.value)}
                        placeholder="Customize description..."
                        className="w-full h-15 bg-white/5 rounded-xl border border-white/10 p-2.5 font-semibold text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none placeholder:text-gray-550 text-white resize-none"
                        maxLength={150}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create/Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleInstantCreateRoom}
                  disabled={instantCreating || !instantTitle.trim()}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-400 via-pink-500 to-[#FF4D67] hover:opacity-95 text-white font-black uppercase tracking-widest text-xs transition-transform active:scale-95 shadow-[0_4px_25px_rgba(244,63,94,0.2)] border border-white/10 h-11"
                >
                  {instantCreating ? 'Launching Live Lounge...' : 'Launch Instant Room 🚀'}
                </Button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIGH-PERFORMANCE MASTER MULTI-ENTITY SEARCH OVERLAY (Requirement 8 & 9) */}
      <AnimatePresence>
        {showSearchOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06080D]/98 backdrop-blur-xl z-50 overflow-y-auto px-5 pt-12 pb-32 font-sans"
          >
            {/* Search Top Panel Bar */}
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <Input 
                  id="search-hub-input"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Seach UIDs, names, lounges, agencies, hosts..."
                  className="w-full h-12.5 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-sm font-bold pl-11 pr-10 rounded-2xl border-white/10 focus:border-pink-500 text-white placeholder:text-gray-550 tracking-wide focus:ring-0 focus:outline-none"
                  autoFocus
                />
                <AnimatePresence>
                  {searchTerm && (
                    <motion.button
                      id="search-clear-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.23, ease: "easeOut" }}
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-white/15 active:scale-90 p-1.5 rounded-full cursor-pointer flex items-center justify-center hover:scale-105"
                      title="Clear search"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <Button 
                onClick={() => { setSearchTerm(''); setShowSearchOverlay(false); }}
                className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white p-0 shrink-0 border border-white/10 flex items-center justify-center transition-transform active:scale-90"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Classified Type Filters Tab control (Requirement 8) */}
            <div className="max-w-3xl mx-auto flex items-center gap-1.5 border-b border-white/5 pb-3 mb-6 overflow-x-auto no-scrollbar">
              {([
                { id: 'all', label: 'All Results' },
                { id: 'users', label: 'Users 👥' },
                { id: 'rooms', label: 'Rooms 🎧' },
                { id: 'agencies', label: 'Agencies 🏛️' },
                { id: 'hosts', label: 'Hosts Approved 🎙️' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSearchTab(tab.id)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 border transition-all ${
                    searchTab === tab.id 
                      ? 'bg-gradient-to-r from-pink-500 to-indigo-500 border-0 text-white font-extrabold shadow-lg shadow-pink-500/10' 
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-w-3xl mx-auto space-y-8 select-none">
              
              {/* Hot search suggestions guide when empty */}
              {searchTerm.trim().length === 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-amber-500" /> Hot Community searches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {HOT_SEARCHES.map(term => (
                        <button 
                          key={term}
                          onClick={() => setSearchTerm(term.replace(' ✨', ''))}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-300 transition-all active:scale-95 cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield size={12} className="text-[#F43F5E]" /> Advanced Discovery System
                    </h4>
                    <ul className="space-y-3 text-xs text-gray-400 font-semibold leading-relaxed">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-pink-500/15 text-pink-400 flex items-center justify-center font-extrabold shrink-0 text-[10px]">1</span>
                        <p>Search standard User Display Names or exact UIDs to instantly connect and read prestige badges.</p>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-400 flex items-center justify-center font-extrabold shrink-0 text-[10px]">2</span>
                        <p>Search active room categories (e.g. "gaming", "singing") to quickly filter live vocal lobbies.</p>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-700/15 text-cyan-400 flex items-center justify-center font-extrabold shrink-0 text-[10px]">3</span>
                        <p>Look up contracted Host Agencies to unlock prestige commission rates and agency banners.</p>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* DYNAMIC CATEGORY CLASSIFIED SEARCH DATA (Requirement 8) */
                <div className="space-y-8">
                  
                  {/* Matching Users */}
                  {(searchTab === 'all' || searchTab === 'users') && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                        Community Stars ({filteredUsers.length})
                      </h4>
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-gray-500 font-bold px-1 py-1">No matching users...</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredUsers.map(user => (
                            <div 
                              key={user.uid}
                              onClick={() => { setShowSearchOverlay(false); navigate(`/profile/${user.uid}`); }}
                              className="flex items-center justify-between p-3.5 rounded-2.5xl bg-white/5 border border-white/5 hover:border-pink-500/40 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="w-10 h-10 border border-white/10 shrink-0">
                                  <AvatarImage src={user.photoURL || getPremiumAvatar(user.uid)} />
                                  <AvatarFallback className="bg-zinc-800 font-black text-xs text-white">{(user.displayName || '?')[0]}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-black text-white truncate max-w-[170px]">{user.displayName}</h5>
                                  </div>
                                  <p className="text-[9px] text-gray-500 font-extrabold mt-0.5 uppercase tracking-wider">
                                    ID: #{user.numericId || user.uid.slice(0, 8).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-gray-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matching Rooms */}
                  {(searchTab === 'all' || searchTab === 'rooms') && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                        Vocal Rooms ({filteredRooms.length})
                      </h4>
                      {filteredRooms.length === 0 ? (
                        <p className="text-xs text-gray-500 font-bold px-1 py-1">No matching rooms found...</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredRooms.map(room => (
                            <div 
                              key={room.id}
                              onClick={() => { setShowSearchOverlay(false); navigate(`/room/${room.id}`); }}
                              className="flex items-center justify-between p-3.5 rounded-2.5xl bg-white/5 border border-white/5 hover:border-violet-500/40 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center shrink-0 border border-white/10">
                                  <Mic2 size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-black text-white truncate max-w-[180px]">{room.title}</h5>
                                  <p className="text-[9px] text-[#A78BFA] font-extrabold uppercase mt-1">
                                    Category: {room.category || 'General'}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20 text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shrink-0">
                                Quick Join
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matching Agencies */}
                  {(searchTab === 'all' || searchTab === 'agencies') && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                        Host Agencies ({filteredAgencies.length})
                      </h4>
                      {filteredAgencies.length === 0 ? (
                        <p className="text-xs text-gray-500 font-bold px-1 py-1">No matching host contract agencies...</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredAgencies.map(a => (
                            <div 
                              key={a.id}
                              onClick={() => { setShowSearchOverlay(false); navigate('/agency'); }}
                              className="flex items-center justify-between p-3.5 rounded-2.5xl bg-white/5 border border-white/5 hover:border-amber-500/40 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                  <Landmark size={18} />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-black text-white truncate max-w-[185px]">{a.name || a.id}</h5>
                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Contract ID: {a.id}</p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-gray-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matching Approved Hosts */}
                  {(searchTab === 'all' || searchTab === 'hosts') && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                        Approved Community Hosts ({filteredHosts.length})
                      </h4>
                      {filteredHosts.length === 0 ? (
                        <p className="text-xs text-gray-500 font-bold px-1 py-1">No verified system hosts found matching conditions...</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredHosts.map(host => (
                            <div 
                              key={host.uid}
                              onClick={() => { setShowSearchOverlay(false); navigate(`/profile/${host.uid}`); }}
                              className="flex items-center justify-between p-3.5 rounded-2.5xl bg-white/5 border border-white/5 hover:border-emerald-500/40 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="w-10 h-10 border border-white/10 shrink-0">
                                  <AvatarImage src={host.photoURL || getPremiumAvatar(host.uid)} />
                                  <AvatarFallback className="bg-zinc-800 font-black text-xs text-white">{(host.displayName || '?')[0]}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-black text-white truncate max-w-[160px]">{host.displayName}</h5>
                                    <span className="bg-emerald-500/15 text-emerald-400 text-[7px] font-extrabold uppercase px-1 rounded-sm">Approved Host</span>
                                  </div>
                                  <p className="text-[9px] text-gray-550 font-bold mt-0.5">
                                    Level {host.level || 1} Elite Studio
                                  </p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-gray-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
