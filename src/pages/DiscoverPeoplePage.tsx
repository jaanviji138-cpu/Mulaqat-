/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, increment, limit } from 'firebase/firestore';
import { db, auth, logActivity } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Users, Globe, ArrowLeft, Search, UserPlus, UserCheck, 
  MapPin, RefreshCw, Compass, Heart, Tag, Link2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';

// Common English stopwords for parsing interests
const STOP_WORDS = new Set([
  'and', 'the', 'in', 'of', 'to', 'a', 'is', 'for', 'with', 'on', 'at', 'by', 'an', 
  'my', 'your', 'our', 'their', 'or', 'about', 'like', 'i', 'me', 'you', 'he', 'she', 
  'they', 'we', 'us', 'him', 'her', 'them', 'is', 'am', 'are', 'was', 'were', 'be', 
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'if', 'then', 
  'else', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
  'most', 'other', 'some', 'such', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 
  'very', 'can', 'will', 'just', 'should', 'now', 'local', 'music', 'gaming', 'retro',
  'singer', 'singer.', 'chat.', 'lover.', 'life!', 'classical', 'sufi'
]);

// Curated community creators to guarantee discovery is always rich and active
const DEFAULT_DISCOVERY_CREATORS: UserProfile[] = [
  {
    uid: 'priya_sharma_delhi',
    displayName: 'Priya Sharma',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Music lover, Ghazal singer & Late night voice host from New Delhi 🎵',
    country: 'India',
    followersCount: 1420,
    followingCount: 180,
    visitorsCount: 380,
    level: 18,
    experience: 2400,
    badges: ['Top Voice', 'Gold Star'],
    coins: 52000,
    diamonds: 4200,
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'aarav_patel_mumbai',
    displayName: 'Aarav Patel',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Guitarist, Indie Bollywood tracks, Gaming streams & Tech enthusiast 🎸',
    country: 'India',
    followersCount: 980,
    followingCount: 310,
    visitorsCount: 210,
    level: 14,
    experience: 1800,
    badges: ['Guitar Master'],
    coins: 24000,
    diamonds: 1800,
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'sneha_roy_kolkata',
    displayName: 'Sneha Roy',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    bio: 'Classical Indian vocals, Poetry nights & Heartfelt podcasts ✨',
    country: 'India',
    followersCount: 2310,
    followingCount: 140,
    visitorsCount: 650,
    level: 22,
    experience: 4100,
    badges: ['Classical Diva', 'Verified Singer'],
    coins: 89000,
    diamonds: 7500,
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'rohan_verma_punjab',
    displayName: 'Rohan Verma',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Bhangra beats, Stand-up comedy & Party room host 🕺',
    country: 'India',
    followersCount: 1890,
    followingCount: 220,
    visitorsCount: 420,
    level: 16,
    experience: 2100,
    badges: ['Party King'],
    coins: 41000,
    diamonds: 3200,
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'ananya_sen_bangalore',
    displayName: 'Ananya Sen',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    bio: 'Acoustic covers, Chill vibes, Anime & Coffee talks ☕',
    country: 'India',
    followersCount: 3150,
    followingCount: 95,
    visitorsCount: 890,
    level: 25,
    experience: 5600,
    badges: ['Super Host', 'Acoustic Soul'],
    coins: 120000,
    diamonds: 11000,
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'zara_beats',
    displayName: 'Zara Khan',
    photoURL: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    bio: 'DJ sets, EDM mixes & Late night party room organizer 🎧',
    country: 'India',
    followersCount: 4200,
    followingCount: 310,
    visitorsCount: 1240,
    level: 28,
    experience: 7800,
    badges: ['Official DJ', 'Star Icon'],
    coins: 165000,
    diamonds: 15400,
    lastLogin: new Date().toISOString(),
  }
];

// Helper to extract clean interests keywords from bio text
function extractInterests(bio: string = ''): string[] {
  return bio
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

export default function DiscoverPeoplePage() {
  const { user, profile } = useAuth();
  const currentUser = auth.currentUser || user;
  const navigate = useNavigate();

  // Component states
  const [users, setUsers] = useState<UserProfile[]>(DEFAULT_DISCOVERY_CREATORS);
  const [follows, setFollows] = useState<{ followerId: string; targetId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'interests' | 'country' | 'mutual'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Synchronize dynamic followed list locally
  const [followedUids, setFollowedUids] = useState<string[]>([]);

  // Fetch users and follow relationship tables from DB with resilience
  const fetchDiscoveryData = async (showToast: boolean = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      let usersList: UserProfile[] = [];
      let followsList: { followerId: string; targetId: string }[] = [];

      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(60)));
        usersList = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      } catch (uErr: any) {
        console.warn('Firestore users query notice:', uErr?.message || uErr);
      }

      try {
        const followsSnap = await getDocs(query(collection(db, 'follows'), limit(100)));
        followsList = followsSnap.docs.map(doc => doc.data() as { followerId: string; targetId: string });
      } catch (fErr: any) {
        console.warn('Firestore follows query notice:', fErr?.message || fErr);
      }

      // Merge remote profiles with curated community creators
      const existingUids = new Set(usersList.map(u => u.uid));
      const combinedUsers = [
        ...usersList,
        ...DEFAULT_DISCOVERY_CREATORS.filter(c => !existingUids.has(c.uid))
      ];

      setUsers(combinedUsers);
      setFollows(followsList);

      if (currentUser) {
        const myFollowing = followsList
          .filter(f => f.followerId === currentUser.uid)
          .map(f => f.targetId);
        setFollowedUids(myFollowing);
      }

      if (showToast) {
        toast.success('Recommendation index synchronized! ✨');
      }
    } catch (err: any) {
      console.warn('Discovery synchronization notice:', err?.message || err);
      // Ensure fallback users remain populated
      setUsers(prev => prev.length > 0 ? prev : DEFAULT_DISCOVERY_CREATORS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiscoveryData();
  }, [currentUser]);

  // Handle follow / unfollow syncing with DB
  const handleFollowToggle = async (targetUid: string) => {
    if (!currentUser) {
      toast.error('Log in first to connect with other voice star nobles!');
      return;
    }
    if (currentUser.uid === targetUid) {
      toast.error('You cannot follow yourself!');
      return;
    }

    const isFollowing = followedUids.includes(targetUid);
    const updated = isFollowing 
      ? followedUids.filter(x => x !== targetUid)
      : [...followedUids, targetUid];

    // Optimistic UI state update
    setFollowedUids(updated);

    try {
      const followDocId = `${currentUser.uid}_${targetUid}`;
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followDocId));
        toast.info('No longer following this star profile.');
        
        // Remove from follows local cache
        setFollows(prev => prev.filter(f => !(f.followerId === currentUser.uid && f.targetId === targetUid)));
      } else {
        await setDoc(doc(db, 'follows', followDocId), {
          followerId: currentUser.uid,
          targetId: targetUid,
          timestamp: new Date().toISOString()
        });
        
        const targetName = users.find(u => u.uid === targetUid)?.displayName || 'Star User';
        toast.success(`Successfully followed ${targetName}! ✨`);

        // Add to follows local cache
        setFollows(prev => [...prev, { followerId: currentUser.uid, targetId: targetUid }]);

        // Log follow activity for real-time feed
        logActivity('new_follower', {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Guest',
          photoURL: currentUser.photoURL || getPremiumAvatar(currentUser.uid)
        }, {
          targetUid: targetUid,
          targetName: targetName
        });
      }

      // Safely update follower count on target user if document exists
      try {
        const targetUserRef = doc(db, 'users', targetUid);
        const diffVal = isFollowing ? -1 : 1;
        await updateDoc(targetUserRef, {
          followersCount: increment(diffVal)
        });
      } catch (e) {
        // Target document might be a virtual creator profile
      }
      
      // Safely update following count on current user
      try {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const diffVal = isFollowing ? -1 : 1;
        await updateDoc(currentUserRef, {
          followingCount: increment(diffVal)
        });
      } catch (e) {
        // Local user doc update notice
      }

    } catch (err: any) {
      console.warn("Follow synchronization notice:", err?.message || err);
    }
  };

  // Re-calculate suggestions list dynamically on requirements
  const suggestedPeople = useMemo(() => {
    if (!currentUser) return [];

    const myProfile = users.find(u => u.uid === currentUser.uid);
    const myBioInterestKeys = myProfile ? extractInterests(myProfile.bio || '') : [];
    const myCountry = myProfile?.country || 'India';

    // Compile list of people we are already following
    const followingSet = new Set(followedUids);

    return users
      .filter(u => u.uid !== currentUser.uid && !followingSet.has(u.uid)) // Filter out self and already followed users
      .map(otherUser => {
        let matchScore = 0;
        const reasons: string[] = [];

        // 1. Similar interests from profile bio
        const otherInterests = extractInterests(otherUser.bio || '');
        const sharedInterests = myBioInterestKeys.filter(interest => otherInterests.includes(interest));
        
        if (sharedInterests.length > 0) {
          matchScore += sharedInterests.length * 40; // 40 points per shared interest word
          reasons.push(`Similar Interests: ${sharedInterests.join(', ')}`);
        }

        // 2. Same country matching
        const hasSameCountry = otherUser.country && otherUser.country.trim().toLowerCase() === myCountry.trim().toLowerCase();
        if (hasSameCountry) {
          matchScore += 50; // 50 flat points
          reasons.push(`Same Country (${otherUser.country})`);
        }

        // 3. Mutual Friends (Friend of Friends graph paths)
        // If current user follows Person X, and Person X follows otherUser, Person X is a mutual connection path
        const myFollowing = follows.filter(f => f.followerId === currentUser.uid).map(f => f.targetId);
        const targetFollowers = follows.filter(f => f.targetId === otherUser.uid).map(f => f.followerId);

        // Intersection of people I follow who also follow this otherUser
        const mutuals = myFollowing.filter(uid => targetFollowers.includes(uid));
        const mutualFriendProfiles = users.filter(usr => mutuals.includes(usr.uid));

        if (mutuals.length > 0) {
          matchScore += mutuals.length * 60; // 60 points per mutual follower path
          reasons.push(`${mutuals.length} Mutual Connection${mutuals.length > 1 ? 's' : ''}`);
        }

        // Standard level bonus weight (to encourage connecting with star members)
        const experienceBonus = Math.min(15, otherUser.level || 1) * 2;
        matchScore += experienceBonus;

        return {
          ...otherUser,
          matchScore,
          reasons,
          sharedInterests,
          mutualFriends: mutualFriendProfiles,
          hasSameCountry: !!hasSameCountry
        };
      })
      // Sorting based on highest compatibility match score
      .sort((a, b) => b.matchScore - a.matchScore)
      // Tab based filter
      .filter(userScore => {
        if (activeTab === 'interests') {
          return userScore.sharedInterests.length > 0;
        }
        if (activeTab === 'country') {
          return userScore.hasSameCountry;
        }
        if (activeTab === 'mutual') {
          return userScore.mutualFriends.length > 0;
        }
        return true; // "all"
      })
      // Search text query filter
      .filter(u => {
        if (!searchQuery.trim()) return true;
        const queryNorm = searchQuery.toLowerCase();
        return (
          u.displayName.toLowerCase().includes(queryNorm) ||
          (u.bio || '').toLowerCase().includes(queryNorm) ||
          (u.country || '').toLowerCase().includes(queryNorm)
        );
      });
  }, [users, follows, followedUids, currentUser, activeTab, searchQuery]);

  return (
    <div className="bg-[#030303] min-h-screen text-white pb-32 font-sans antialiased relative overflow-hidden">
      {/* Background starlight ambient gradients */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[#1C112C] via-[#0C0A19] to-[#030303] -z-10" />
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[350px] h-[350px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Panel */}
      <header className="sticky top-0 z-40 bg-[#030303]/90 backdrop-blur-md border-b border-white/5 py-4 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-white bg-transparent border-0 cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              Discover People <Sparkles size={18} className="text-yellow-400 animate-pulse shrink-0" />
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expand your VoiceStar circle in SoulLink</p>
          </div>
        </div>

        <button 
          onClick={() => fetchDiscoveryData(true)}
          disabled={refreshing}
          className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer flex items-center justify-center disabled:opacity-55"
          title="Refresh recommendation criteria"
        >
          <RefreshCw size={18} className={`${refreshing ? 'animate-spin text-pink-500' : ''}`} />
        </button>
      </header>

      {/* Main Container Core wrapped panel */}
      <main className="max-w-xl mx-auto px-5 pt-4 space-y-6 select-none leading-none">
        
        {/* Search Suggestion Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by name, interests or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl h-11 pl-11 pr-5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all font-semibold outline-none"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 border border-transparent shadow-lg text-white' 
                : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Compass size={14} /> All Matches
          </button>
          <button
            onClick={() => setActiveTab('interests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'interests' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 border border-transparent shadow-lg text-white' 
                : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Tag size={14} /> Interests Overlap
          </button>
          <button
            onClick={() => setActiveTab('country')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'country' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 border border-transparent shadow-lg text-white' 
                : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={14} /> Same Country
          </button>
          <button
            onClick={() => setActiveTab('mutual')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mutual' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 border border-transparent shadow-lg text-white' 
                : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Users size={14} /> Mutual Connections
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 animate-spin border-t-purple-500" />
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Analyzing companion relationships...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Header statistics count */}
            <div className="flex items-center justify-between text-gray-400 text-[10px] font-black tracking-widest uppercase pb-2 border-b border-white/5">
              <span>SUGGESTED FOR YOU</span>
              <span>{suggestedPeople.length} COMPANIONS MATCHED</span>
            </div>

            {/* Empty States */}
            {suggestedPeople.length === 0 ? (
              <div className="glass-card p-8 text-center space-y-4 bg-[#0A0D18]/40 border-white/5 rounded-2xl">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                  <Compass size={24} className="text-gray-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-sm text-white">No matches found</h3>
                  <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                    Try broadening your bio description under your Me-profile tab or adjust search query search parameters. We'll populate more stars soon!
                  </p>
                </div>
              </div>
            ) : (
              /* Discovery Recommendations Beautiful List or Grid Format */
              <div className="space-y-3.5">
                <AnimatePresence mode="popLayout">
                  {suggestedPeople.map((matchUser, index) => {
                    const profileThemeClr = matchUser.gender === 'female' ? 'from-rose-500/20 to-transparent' : 'from-blue-500/20 to-transparent';
                    
                    return (
                      <motion.div
                        key={matchUser.uid}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                        className={`w-full glass-card p-[1px] bg-gradient-to-br ${profileThemeClr} border border-glass-border shadow-xl hover:scale-[1.01] transition-all rounded-3xl`}
                      >
                        <div className="bg-[#0C0F1A]/95 p-5 rounded-3xl flex flex-col gap-4">
                          
                          {/* User details header segment */}
                          <div className="flex items-start gap-3.5">
                            {/* Avatar frame */}
                            <div 
                              onClick={() => navigate(`/profile/${matchUser.uid}`)}
                              className="relative shrink-0 cursor-pointer group active:scale-95 transition-transform"
                            >
                              <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 p-[1.5px] group-hover:border-pink-500 transition-colors">
                                <Avatar className="w-full h-full border-0">
                                  <AvatarImage src={matchUser.photoURL || getPremiumAvatar(matchUser.uid)} className="object-cover" referrerPolicy="no-referrer" />
                                  <AvatarFallback className="bg-neutral-800 text-[10px] font-black uppercase text-white">
                                    {matchUser.displayName.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>

                              {/* Online badge */}
                              <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0C0F1A] ${
                                matchUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                            </div>

                            {/* Center identifiers */}
                            <div className="flex-1 space-y-1 mt-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 
                                  onClick={() => navigate(`/profile/${matchUser.uid}`)}
                                  className="text-sm font-black text-white hover:text-pink-500 transition-colors cursor-pointer tracking-tight leading-tight"
                                >
                                  {matchUser.displayName}
                                </h3>

                                {/* Level Badge */}
                                <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-sm shrink-0">
                                  Lv.{matchUser.level || 1}
                                </span>
                              </div>

                              {/* Sub id */}
                              <p className="text-[9px] text-gray-500 font-mono">ID: {matchUser.numericId || '912384918'}</p>
                            </div>

                            {/* Dynamic Follow Trigger Action */}
                            <Button
                              onClick={() => handleFollowToggle(matchUser.uid)}
                              size="sm"
                              className={`h-8 rounded-xl px-5 transition-all text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                followedUids.includes(matchUser.uid)
                                  ? 'bg-transparent border border-white/10 hover:bg-white/5 text-gray-400'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 active:scale-95 text-white border-0'
                              }`}
                            >
                              {followedUids.includes(matchUser.uid) ? (
                                <span className="flex items-center gap-1"><UserCheck size={11} /> Followed</span>
                              ) : (
                                <span className="flex items-center gap-1"><UserPlus size={11} /> Follow</span>
                              )}
                            </Button>
                          </div>

                          {/* Profile Bio bio preview */}
                          {matchUser.bio && (
                            <p className="text-[11px] text-gray-300 font-semibold leading-relaxed bg-white/[0.02] border border-white/[0.02] p-3 rounded-2xl">
                              "{matchUser.bio}"
                            </p>
                          )}

                          {/* Matching factors reasons indicator */}
                          <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.04]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Interest Overlap Key Tags */}
                              {matchUser.sharedInterests.map(tag => (
                                <span key={tag} className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Tag size={10} /> {tag}
                                </span>
                              ))}

                              {/* Country indicator */}
                              {matchUser.hasSameCountry && (
                                <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Globe size={10} /> Same Country ({matchUser.country})
                                </span>
                              )}

                              {/* Mutual followers Count tag */}
                              {matchUser.mutualFriends.length > 0 && (
                                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Link2 size={10} className="mr-0.5" /> {matchUser.mutualFriends.length} Mutual Connection{matchUser.mutualFriends.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {/* Display calculated recommendation logic matching explanation */}
                            <div className="text-[10px] text-gray-400 font-bold tracking-tight uppercase flex items-center gap-1.5 pt-1">
                              <Info size={12} className="text-purple-400 shrink-0" />
                              <span className="text-gray-500">Matching score:</span>
                              <span className="text-purple-400 font-black">{matchUser.matchScore} pts</span>
                              <span className="text-neutral-700 font-normal">|</span>
                              <span className="text-gray-400 lowercase">{matchUser.reasons.join(' · ')}</span>
                            </div>

                            {/* Mutual Friends Avatar Cluster */}
                            {matchUser.mutualFriends.length > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Connected via:</span>
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {matchUser.mutualFriends.slice(0, 3).map(friend => (
                                    <Avatar key={friend.uid} className="w-5 h-5 border border-[#0C0F1A] rounded-full">
                                      <AvatarImage src={friend.photoURL || getPremiumAvatar(friend.uid)} />
                                      <AvatarFallback className="bg-zinc-800 text-[8px] font-black">{friend.displayName.slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold">
                                  {matchUser.mutualFriends.slice(0, 2).map(f => f.displayName.split(' ')[0]).join(', ')}
                                  {matchUser.mutualFriends.length > 2 && ` and ${matchUser.mutualFriends.length - 2} others`}
                                </span>
                              </div>
                            )}

                          </div>

                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
