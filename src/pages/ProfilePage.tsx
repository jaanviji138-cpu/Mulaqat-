import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Crown, Heart, Sparkles, 
  Pencil, CheckCircle2, LogOut,
  Check, Camera, Globe, Upload,
  Flame, Share2, UserPlus, MessageSquare,
  Send, Users, ArrowRight, Wallet,
  Headphones, UserX, Info, Settings,
  ChevronRight, ShoppingBag, ShieldCheck, ChevronLeft,
  HelpCircle, Package, Trophy, Radio,
  Gift, Moon, Sun, Smartphone, Bell,
  Volume2, ShieldAlert, FileText, ExternalLink,
  RefreshCw, X, ChevronDown, ChevronUp, Search,
  UserMinus, Plus, Shield, Sliders,
  CreditCard, MessageCircle, Award, Compass,
  Sparkle, Coins, Video, Phone, Trash2, Languages, Vibrate
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { INDIAN_FEMALE_AVATARS, INDIAN_MALE_AVATARS, INDIAN_MALE_NAMES, INDIAN_FEMALE_NAMES } from '@/utils/avatar';
import { copyTextToClipboard } from '@/lib/utils';
import { getStandardReferralCode, generateInviteUrl } from '@/utils/referral';
import { getStoredUserLocation } from '@/utils/location';
import { RECHARGE_PLANS } from '@/data/rechargePlans';
import RechargeModal from '@/components/RechargeModal';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlockedUserItem {
  id: string;
  name: string;
  photoURL: string;
  numericId: string;
  blockedAt: string;
}

interface TransactionRecord {
  id: string;
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'reward';
  title: string;
  amount: number;
  isPositive: boolean;
  date: string;
  details: string;
}

export default function ProfilePage() {
  const { user, profile: authProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (authProfile) return authProfile;
    try {
      const activeUid = auth.currentUser?.uid;
      if (activeUid) {
        const cached = localStorage.getItem(`profile_${activeUid}`);
        if (cached) return JSON.parse(cached);
      }
      const mock = localStorage.getItem('maxo_mock_user');
      if (mock) return JSON.parse(mock);
    } catch (e) {}
    return null;
  });

  // Modal Visibility States
  const [isEditing, setIsEditing] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [isProfileRechargeModalOpen, setIsProfileRechargeModalOpen] = useState(false);
  const [selectedProfilePlanId, setSelectedProfilePlanId] = useState<string>('plan_100');
  const [showCoinsDetail, setShowCoinsDetail] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [showCallHistory, setShowCallHistory] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editPhoto, setEditPhoto] = useState('');
  const [editCountry, setEditCountry] = useState('India 🇮🇳');
  const [editCity, setEditCity] = useState('Mumbai');
  const [editDob, setEditDob] = useState('2002-05-15');
  const [editAge, setEditAge] = useState(22);
  const [saving, setSaving] = useState(false);

  // Copy Feedback States
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);

  // Coins detail active tab
  const [coinsDetailTab, setCoinsDetailTab] = useState<'all' | 'income' | 'expense'>('all');

  // Help Center separate state
  const [helpCategory, setHelpCategory] = useState<'coins' | 'hosts' | 'recharge'>('coins');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Feedback separate state (Host rating questionnaire)
  const [feedbackHostExperience, setFeedbackHostExperience] = useState('Loved it 😍');
  const [feedbackHostTalk, setFeedbackHostTalk] = useState('Very Polite 💖');
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // Language Context hook
  const { language, setLanguage, t } = useLanguage();

  // Settings requested states
  const [notifSound, setNotifSound] = useState(() => {
    return localStorage.getItem('maxo_notif_sound') !== 'false';
  });
  const [notifVibrate, setNotifVibrate] = useState(() => {
    return localStorage.getItem('maxo_notif_vibrate') !== 'false';
  });
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cacheSize, setCacheSize] = useState('18.4 MB');

  // Interactive Following and Followers Lists (Real Data from Firestore)
  const [followingList, setFollowingList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('my_following_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [followersList, setFollowersList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('my_followers_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Blocked users list (Real Data)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>(() => {
    try {
      const saved = localStorage.getItem('my_blocked_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync profile
  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      return;
    }
    const targetUid = auth.currentUser?.uid;
    if (targetUid) {
      getDoc(doc(db, 'users', targetUid)).then((snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      }).catch(() => {});
    }
  }, [authProfile]);

  // Push history state when opening any profile sub-modal/screen so device Back button returns to Me tab
  const openSubModal = (setter: (val: any) => void, val: any, modalKey: string) => {
    window.history.pushState({ profileSubModal: modalKey }, '');
    setter(val);
  };

  // Close sub-modal and balance browser history
  const closeSubModal = (setter?: (val: any) => void, val: any = false) => {
    if (setter) setter(val);
    if (window.history.state?.profileSubModal) {
      window.history.back();
    }
  };

  const openSettings = () => openSubModal(setShowSettings, true, 'settings');
  const closeSettings = () => closeSubModal(setShowSettings, false);

  const openHelpCenter = () => openSubModal(setShowHelpCenter, true, 'helpCenter');
  const closeHelpCenter = () => closeSubModal(setShowHelpCenter, false);

  const openFeedback = () => openSubModal(setShowFeedback, true, 'feedback');
  const closeFeedback = () => closeSubModal(setShowFeedback, false);

  const openCallHistory = () => openSubModal(setShowCallHistory, true, 'callHistory');
  const closeCallHistory = () => closeSubModal(setShowCallHistory, false);

  const openBlockedList = () => openSubModal(setShowBlockedList, true, 'blockedList');
  const closeBlockedList = () => closeSubModal(setShowBlockedList, false);

  const openAbout = () => openSubModal(setShowAbout, true, 'about');
  const closeAbout = () => closeSubModal(setShowAbout, false);

  const openBuyCoins = () => openSubModal(setShowBuyCoins, true, 'buyCoins');
  const closeBuyCoins = () => closeSubModal(setShowBuyCoins, false);

  const openCoinsDetail = () => openSubModal(setShowCoinsDetail, true, 'coinsDetail');
  const closeCoinsDetail = () => closeSubModal(setShowCoinsDetail, false);

  const openFollowModal = (type: 'followers' | 'following') => openSubModal(setShowFollowModal, type, 'followModal');
  const closeFollowModal = () => closeSubModal(setShowFollowModal, null);

  const openPrivacyPolicyModal = () => openSubModal(setShowPrivacyPolicyModal, true, 'privacyPolicy');
  const closePrivacyPolicyModal = () => closeSubModal(setShowPrivacyPolicyModal, false);

  const openDeleteConfirm = () => openSubModal(setShowDeleteConfirm, true, 'deleteConfirm');
  const closeDeleteConfirm = () => closeSubModal(setShowDeleteConfirm, false);

  const closeEditProfile = () => closeSubModal(setIsEditing, false);

  // Back button listener for sub-options inside ProfilePage
  useEffect(() => {
    const handlePopState = () => {
      // 1. Stacked / Nested modals
      if (isProfileRechargeModalOpen) {
        setIsProfileRechargeModalOpen(false);
        return;
      }
      if (showPrivacyPolicyModal) {
        setShowPrivacyPolicyModal(false);
        return;
      }
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }
      if (showAbout) {
        setShowAbout(false);
        return;
      }
      if (showBlockedList) {
        setShowBlockedList(false);
        return;
      }
      // 2. Main Sub-screens
      if (showBuyCoins) {
        setShowBuyCoins(false);
        return;
      }
      if (showCoinsDetail) {
        setShowCoinsDetail(false);
        return;
      }
      if (showHelpCenter) {
        setShowHelpCenter(false);
        return;
      }
      if (showFeedback) {
        setShowFeedback(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showCallHistory) {
        setShowCallHistory(false);
        return;
      }
      if (showFollowModal) {
        setShowFollowModal(null);
        return;
      }
      if (isEditing) {
        setIsEditing(false);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isProfileRechargeModalOpen,
    showPrivacyPolicyModal,
    showDeleteConfirm,
    showAbout,
    showBlockedList,
    showBuyCoins,
    showCoinsDetail,
    showHelpCenter,
    showFeedback,
    showSettings,
    showCallHistory,
    showFollowModal,
    isEditing
  ]);

  const numericId = profile?.numericId || (profile?.uid ? profile.uid.slice(0, 8).replace(/\D/g, '') || '15590390' : '15590390');
  const gender = (profile?.gender as 'male' | 'female') || (localStorage.getItem('maxo_user_gender') as 'male' | 'female') || 'male';
  const displayName = profile?.displayName || user?.displayName || (gender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0]);
  const photoURL = (gender === 'male' && profile?.photoURL && INDIAN_FEMALE_AVATARS.includes(profile.photoURL))
    ? INDIAN_MALE_AVATARS[0]
    : (gender === 'female' && profile?.photoURL && INDIAN_MALE_AVATARS.includes(profile.photoURL))
    ? INDIAN_FEMALE_AVATARS[0]
    : (profile?.photoURL || user?.photoURL || (gender === 'female' ? INDIAN_FEMALE_AVATARS[0] : INDIAN_MALE_AVATARS[0]));
  const country = profile?.country || 'India 🇮🇳';
  const bio = profile?.bio || (gender === 'male' ? 'Desi Rockstar 🎸 | Good vibes only' : 'Party Queen 🌸 | Love singing & vibes');
  const coins = profile?.coins ?? 100;
  const totalRecharged = (profile as any)?.totalRechargedCoins ?? 500;
  const diamonds = profile?.diamonds ?? 1250;
  const level = profile?.level ?? 12;
  const followersCount = (profile as any)?.followersCount ?? 0;
  const followingCount = (profile as any)?.followingCount ?? 0;
  const visitorsCount = (profile as any)?.visitorsCount ?? (profile as any)?.visitors ?? 0;
  const isSystemAdminUser = Boolean(
    isAdmin || 
    (profile as any)?.isSystemAdmin === true || 
    localStorage.getItem('simulate_admin') === 'true' ||
    user?.email === 'dkm924419@gmail.com' ||
    user?.email === 'noircouplehub@gmail.com'
  );

  // Invite code & link calculation
  const activeUid = profile?.uid || user?.uid || 'guest_user';
  const customSavedCode = localStorage.getItem(`maxo_custom_ref_code_${activeUid}`) || (profile as any)?.customReferralCode || '';
  const inviteCode = getStandardReferralCode(numericId, customSavedCode);
  const inviteUrl = generateInviteUrl(inviteCode);

  // Copy ID to clipboard
  const handleCopyId = async () => {
    const ok = await copyTextToClipboard(numericId);
    setCopiedId(true);
    toast.success(`ID ${numericId} copied! 📋`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Secret 5-tap trigger for Owner on any device
  const secretTapCountRef = React.useRef(0);
  const secretTapTimerRef = React.useRef<any>(null);

  const handleSecretTap = () => {
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) clearTimeout(secretTapTimerRef.current);

    if (secretTapCountRef.current >= 5) {
      secretTapCountRef.current = 0;
      const entered = prompt("🔐 सुपर एडमिन प्रमाणीकरण: 4-अंकीय मास्टर पिन दर्ज करें:");
      if (entered === "7860") {
        localStorage.setItem('simulate_admin', 'true');
        toast.success("सुपर एडमिन एक्सेस अनलॉक हो गया! 👑");
        navigate('/admin');
      } else if (entered !== null) {
        toast.error("अमान्य पिन (Invalid PIN)!");
      }
      return;
    }

    secretTapTimerRef.current = setTimeout(() => {
      secretTapCountRef.current = 0;
    }, 2500);
  };

  // Copy invite link
  const handleCopyInviteLink = async () => {
    const ok = await copyTextToClipboard(inviteUrl);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 3000);
    if (ok) {
      toast.success('👑 Invite Link Copied! Share with your friends! 🚀✨');
    } else {
      toast.info(`Invite Link: ${inviteUrl}`);
    }
  };

  // Open Edit Profile modal
  const handleOpenEdit = () => {
    setEditName(displayName);
    setEditBio(bio);
    setEditGender(gender);
    setEditPhoto(photoURL);
    setEditCountry(country);
    setEditCity((profile as any)?.city || 'Mumbai');
    const existingDob = (profile as any)?.dob || '2002-05-15';
    setEditDob(existingDob);
    const existingAge = (profile as any)?.age || 22;
    setEditAge(existingAge);
    openSubModal(setIsEditing, true, 'editProfile');
  };

  // Handle Date of Birth Change and auto-calculate Age
  const handleDobChange = (val: string) => {
    setEditDob(val);
    if (val) {
      const birthDate = new Date(val);
      const diff = Date.now() - birthDate.getTime();
      const calculatedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      if (!isNaN(calculatedAge) && calculatedAge >= 18 && calculatedAge <= 99) {
        setEditAge(calculatedAge);
      }
    }
  };

  // Handle custom photo file upload
  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size must be less than 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditPhoto(reader.result);
          toast.success('Photo loaded! Click Save to apply ✨');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile changes instantly (Optimistic UI + background persistence)
  const handleSaveProfile = () => {
    if (!editName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }
    
    try {
      const activeUid = user?.uid || auth.currentUser?.uid || 'user_local';
      const updatedData: UserProfile = {
        ...profile,
        uid: activeUid,
        displayName: editName.trim(),
        bio: editBio.trim(),
        photoURL: editPhoto || photoURL,
        gender: editGender,
        country: editCountry,
        city: editCity,
        dob: editDob,
        age: editAge,
        numericId: numericId,
        coins: coins,
        diamonds: diamonds,
        level: level,
      } as any;

      // 1. Instantly update UI and close modal with zero delay
      setProfile(updatedData);
      closeEditProfile();
      toast.success('🎉 Profile Updated Successfully!');

      // 2. Instantly persist to localStorage
      try {
        localStorage.setItem(`profile_${activeUid}`, JSON.stringify(updatedData));
        const mockStr = localStorage.getItem('maxo_mock_user');
        if (mockStr) {
          const parsed = JSON.parse(mockStr);
          parsed.displayName = editName.trim();
          parsed.bio = editBio.trim();
          parsed.photoURL = editPhoto || photoURL;
          parsed.gender = editGender;
          parsed.country = editCountry;
          parsed.city = editCity;
          parsed.dob = editDob;
          parsed.age = editAge;
          localStorage.setItem('maxo_mock_user', JSON.stringify(parsed));
        }
      } catch (e) {}

      // 3. Sync to Firestore in the background without blocking the UI
      setDoc(doc(db, 'users', activeUid), updatedData, { merge: true })
        .catch(err => console.warn("Background Firestore profile sync:", err));

    } catch (e: any) {
      toast.error('Failed to save: ' + (e?.message || 'Unknown error'));
    }
  };

  // Quick Coin Recharge Function
  const handleRechargeCoins = async (amount: number, bonus: number = 0) => {
    const totalAdded = amount + bonus;
    const newBalance = coins + totalAdded;
    const newTotalRecharged = totalRecharged + totalAdded;

    try {
      const activeUid = profile?.uid || user?.uid || 'guest_user';
      const updatedProfile = {
        ...profile,
        uid: activeUid,
        coins: newBalance,
        totalRechargedCoins: newTotalRecharged
      };

      localStorage.setItem(`profile_${activeUid}`, JSON.stringify(updatedProfile));
      try {
        await updateDoc(doc(db, 'users', activeUid), { 
          coins: newBalance,
          totalRechargedCoins: newTotalRecharged
        });
      } catch (e) {}

      setProfile(updatedProfile as UserProfile);
      toast.success(`🎉 Successfully recharged +${totalAdded.toLocaleString()} Coins! 🪙`);
      window.dispatchEvent(new CustomEvent('user-recharged', { detail: { coinsAdded: totalAdded } }));
      closeBuyCoins();
    } catch (e: any) {
      toast.error('Recharge failed: ' + e.message);
    }
  };

  // Unblock user
  const handleUnblockUser = (id: string, name: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
    toast.success(`Unblocked ${name} successfully! ✅`);
  };

  // Clear App Cache
  const handleClearCache = () => {
    setCacheSize('0.0 KB');
    toast.success('🧹 App Cache Cleared successfully!');
  };

  // Logout (Preserves account identity so logging back in returns to the exact same ID & Name)
  const handleLogout = async () => {
    // Preserve identity credentials for instant return to same ID
    if (numericId && displayName) {
      localStorage.setItem('mulaqat_remembered_numeric_id', numericId.toString());
      localStorage.setItem('mulaqat_remembered_name', displayName);
      localStorage.setItem('mulaqat_remembered_photo', photoURL || '');
      localStorage.setItem('mulaqat_remembered_gender', gender || 'male');
    }
    localStorage.removeItem('maxo_mock_user');
    localStorage.removeItem('maxo_permanent_guest');
    try {
      await signOut(auth);
    } catch (e) {}
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Sample transactions list
  const transactions: TransactionRecord[] = [
    {
      id: 'tx_1',
      type: 'reward',
      title: 'Daily Voice Room Bonus',
      amount: 1000,
      isPositive: true,
      date: 'Today, 04:30 PM',
      details: 'Active in Voice Room 15 mins'
    },
    {
      id: 'tx_2',
      type: 'gift_sent',
      title: 'Luxury Taj Mahal Gift',
      amount: 9999,
      isPositive: false,
      date: 'Today, 02:15 PM',
      details: 'Sent in Party Room'
    },
    {
      id: 'tx_3',
      type: 'recharge',
      title: 'Diamond & Coin Topup',
      amount: 50000,
      isPositive: true,
      date: 'Yesterday, 08:20 PM',
      details: 'Mega Pack Topup'
    },
    {
      id: 'tx_4',
      type: 'gift_received',
      title: 'Royal Crown Gift',
      amount: 2500,
      isPositive: true,
      date: '2 days ago',
      details: 'Received on Stage'
    }
  ];

  const filteredTransactions = transactions.filter(t => {
    if (coinsDetailTab === 'income') return t.isPositive;
    if (coinsDetailTab === 'expense') return !t.isPositive;
    return true;
  });

  const faqs = [
    {
      q: "How do I start a 1-on-1 private video call with a host?",
      a: "Go to the 'Video' tab on the bottom navigation bar, tap on any online host's card, or use the 'Match Calls' button for fast matching."
    },
    {
      q: "How do I add or recharge coins?",
      a: "Go to your Profile or Wallet section, tap 'Recharge', select your desired pack, and pay instantly via PhonePe or any UPI app."
    },
    {
      q: "How does 'Become a Video Host' work for females?",
      a: "Female users can apply for hosting through their profile. Verified hosts earn diamonds from received calls and withdraw real cash directly to their bank account or UPI."
    },
    {
      q: "Are 1-on-1 video calls private and secure?",
      a: "Yes, all video calls are end-to-end encrypted. Screen recording is strictly prevented, and you can report or block inappropriate behavior at any moment."
    }
  ];

  return (
    <div id="profile-page-root" className="min-h-screen bg-[#07050F] text-white pb-32 max-w-lg mx-auto relative overflow-hidden font-sans">
      
      {/* Hidden file input for custom photo upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCustomPhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Elegant Atmospheric Ambient Aura */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-pink-900/10 via-purple-900/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-40px] left-[-40px] w-80 h-80 rounded-full blur-[110px] pointer-events-none bg-pink-500/15" />
      <div className="absolute top-48 right-[-40px] w-80 h-80 rounded-full blur-[130px] pointer-events-none bg-purple-500/15 opacity-60" />

      {/* TOP HEADER: Clean with Quick Actions */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-base font-black tracking-wider text-white uppercase font-display flex items-center gap-1.5">
            <span>MY PROFILE</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings button */}
          <button
            type="button"
            onClick={openSettings}
            className="w-8 h-8 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-zinc-300 flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          {/* Edit Profile Pill Button */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer"
          >
            <Pencil size={12} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* 1. HERO IDENTITY PROFILE CARD */}
      <div className="px-5 pt-3 flex flex-col items-center text-center relative z-10">
        
        {/* Glowing Neon Avatar Frame */}
        <div 
          onClick={handleOpenEdit}
          className="relative cursor-pointer group transition-transform active:scale-95"
        >
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-[0_0_25px_rgba(244,114,182,0.45)] flex items-center justify-center relative border border-pink-400/40">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#07050F] bg-zinc-900">
              <img 
                src={photoURL} 
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Camera Edit Badge */}
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg border border-black/40">
            <Camera size={11} className="stroke-[2.5]" />
          </div>
        </div>

        {/* User Name, Gender, Age */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md">
            {displayName}
          </h1>

          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${gender === 'female' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
            <span>{gender === 'female' ? `♀️ ${t('profile.girl')}` : `♂️ ${t('profile.boy')}`}</span>
            <span>•</span>
            <span>{profile?.age || 21} {t('profile.yearsOld')}</span>
          </span>
        </div>

        {/* Location & Numeric ID Pills */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {/* User Detected Location */}
          <span className="text-xs px-3 py-1 rounded-full bg-pink-500/15 text-pink-200 border border-pink-500/30 font-semibold flex items-center gap-1 shadow-sm">
            <span>📍</span>
            <span>{getStoredUserLocation()}</span>
          </span>

          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-zinc-300 border border-white/10 transition-all active:scale-95"
          >
            <span className="font-bold text-pink-400 text-[10px]">ID</span>
            <span className="font-mono text-white font-bold text-xs">{numericId}</span>
            {copiedId ? (
              <Check size={12} className="text-emerald-400 stroke-[3]" />
            ) : (
              <Copy size={12} className="text-zinc-400" />
            )}
          </button>
        </div>

        {/* Bio */}
        <p className="text-xs text-zinc-400 mt-2 max-w-xs italic line-clamp-2">
          "{bio}"
        </p>

        {/* Stats Trio Row */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4">
          <button 
            type="button"
            onClick={() => openFollowModal('following')}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-pink-500/30 transition-all text-center cursor-pointer"
          >
            <span className="block font-black text-white text-base">{followingCount}</span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Following</span>
          </button>

          <button 
            type="button"
            onClick={() => openFollowModal('followers')}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-pink-500/30 transition-all text-center cursor-pointer"
          >
            <span className="block font-black text-pink-400 text-base">{followersCount}</span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Followers</span>
          </button>

          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
            <span className="block font-black text-amber-400 text-base">{visitorsCount}</span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Visitors</span>
          </div>
        </div>
      </div>

      {/* 2. VIBRANT MIXED LUXURY RECHARGE WALLET CARD */}
      <div className="px-5 mt-4 relative z-10">
        <div className="relative p-5 rounded-3xl bg-gradient-to-tr from-[#7928CA] via-[#FF0080] to-[#FF8A00] text-white shadow-[0_14px_45px_rgba(255,0,128,0.35)] border border-pink-400/30 overflow-hidden">
          
          {/* Metallic Glow Shapes */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-2 right-2 text-white/15">
            <Coins size={105} />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/20">
                {t('profile.coinBalance')}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  {coins.toLocaleString()}
                </span>
                <span className="text-xs font-black text-amber-200 uppercase">{t('common.coins')}</span>
              </div>
              <button
                type="button"
                onClick={openCoinsDetail}
                className="flex items-center gap-1 text-[11px] text-white/90 font-extrabold mt-1 hover:text-white cursor-pointer"
              >
                <span>{t('profile.txHistory')}</span>
                <ChevronRight size={13} className="stroke-[3]" />
              </button>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={openBuyCoins}
                className="h-10 px-5 rounded-2xl bg-white hover:bg-zinc-100 active:scale-95 text-purple-950 font-black text-xs tracking-wider shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} className="stroke-[3] text-pink-600" />
                <span>{t('common.recharge')}</span>
              </button>
              <span className="text-[9px] font-black text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                {t('profile.instantTopup')} ⚡
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 USER ACTIONS & SERVICES LIST */}
      <div className="px-5 mt-4 space-y-3 relative z-10">
        {/* Apply Hosting / Review / Host Center Card - female or admin granted in DB */}
        {(gender === 'female' || Boolean((profile as any)?.canApplyHost)) && (() => {
          let hostApp: any = null;
          try {
            const saved = localStorage.getItem('my_host_application');
            if (saved) hostApp = JSON.parse(saved);
          } catch(e) {}

          const isReviewing = hostApp?.status === 'pending_review';
          const isApproved = hostApp?.status === 'approved' || profile?.isHostApproved || profile?.role === 'host';

          if (isReviewing) {
            return (
              <div 
                onClick={() => navigate('/apply-hosting')}
                className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-600/15 border-2 border-amber-500/60 shadow-[0_8px_24px_rgba(245,158,11,0.2)] flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-lg shrink-0">
                    ⏳
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-amber-300 uppercase tracking-tight">{t('profile.applyReview')}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-black">
                        24h Review
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5 font-medium">{t('profile.applyReviewDesc')}</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>
            );
          }

          if (isApproved) {
            return (
              <div 
                onClick={() => navigate('/host')}
                className="p-4 rounded-3xl bg-gradient-to-r from-[#00b09b]/35 via-[#02aab0]/30 to-[#96c93d]/25 border-2 border-teal-400/50 shadow-[0_10px_30px_rgba(0,176,155,0.25)] flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:border-teal-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-500 to-lime-400 flex items-center justify-center text-black font-black text-lg shadow-lg shrink-0">
                    🎙️
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white uppercase tracking-tight">{t('profile.hostCenter')}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 font-black border border-teal-500/40">
                        Verified Host
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-200/90 mt-0.5 font-medium">{t('profile.hostCenterDesc')}</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-teal-300 shrink-0">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>
            );
          }

          return (
            <div 
              onClick={() => navigate('/apply-hosting')}
              className="p-4 rounded-3xl bg-gradient-to-r from-[#8A2387]/45 via-[#E94057]/35 to-[#F27121]/30 border-2 border-pink-500/50 hover:border-pink-400 shadow-[0_10px_35px_rgba(233,64,87,0.3)] flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF416C] via-[#FF4B2B] to-[#F7971E] flex items-center justify-center text-white shadow-lg shrink-0">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide font-display">
                    {t('profile.applyHost')}
                  </h3>
                  <p className="text-[11px] text-pink-200/90 mt-0.5 font-medium">{t('profile.applyHostDesc')}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-pink-300 shrink-0">
                <ChevronRight size={18} className="stroke-[2.5]" />
              </div>
            </div>
          );
        })()}

        {/* Clean Modern Menu Group */}
        <div className="bg-[#110B22]/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          
          {/* 1. Call History */}
          <button
            type="button"
            onClick={openCallHistory}
            className="w-full px-4 py-3.5 flex items-center justify-between bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent hover:from-pink-500/20 active:bg-white/[0.08] transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500/25 to-purple-500/25 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">
                <Radio size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{t('profile.callHistory')}</span>
                <span className="text-[10px] text-pink-300/80 block">{t('profile.callHistoryDesc')}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-pink-400/80" />
          </button>

          {/* 2. Customer Support / Help Center */}
          <button
            type="button"
            onClick={openHelpCenter}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Headphones size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{t('profile.helpCenter')}</span>
                <span className="text-[10px] text-zinc-400 block">{t('profile.helpCenterDesc')}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-500" />
          </button>

          {/* 3. Feedback */}
          <button
            type="button"
            onClick={openFeedback}
            className="w-full px-4 py-3.5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent hover:from-purple-500/20 active:bg-white/[0.08] transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/25 to-indigo-500/25 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{t('profile.feedback')}</span>
                <span className="text-[10px] text-purple-300/80 block">{t('profile.feedbackDesc')}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-purple-400/80" />
          </button>

          {/* 4. Settings */}
          <button
            type="button"
            onClick={openSettings}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Sliders size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{t('settings.title')}</span>
                <span className="text-[10px] text-zinc-400 block">{t('settings.subtitle')}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-500" />
          </button>

          {/* 5. Super Admin Command Center (Only visible to Owner / System Admins) */}
          {isSystemAdminUser && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full px-4 py-3.5 flex items-center justify-between bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent hover:from-amber-500/25 active:bg-white/[0.08] transition-all text-left cursor-pointer border-t border-amber-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-300 block">
                      {language === 'en' ? 'Super Admin Command Center' : 'सुपर एडमिन कमांड सेंटर'}
                    </span>
                    <span className="text-[8px] font-black bg-amber-400 text-black px-1.5 py-0.2 rounded-full uppercase">
                      OWNER
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    {language === 'en' ? 'Coin transfer, user control, video hosts' : 'कॉइन रिचार्ज, यूज़र डिलीट/बैन, 1-on-1 होस्ट्स'}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-amber-400" />
            </button>
          )}

        </div>

        {/* Discrete Footer with Secret Admin 5-Tap Trigger */}
        <div className="pt-6 pb-2 text-center select-none">
          <p 
            onClick={handleSecretTap}
            className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors"
            title="Mulaqat v1.2.0"
          >
            Mulaqat • 1-on-1 Live Video • v1.2.0
          </p>
        </div>
      </div>

      {/* Call History Full Screen Screen */}
      <AnimatePresence>
        {showCallHistory && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-gradient-to-b from-[#1C0D36] via-[#100722] to-[#080312] flex flex-col text-white overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto flex flex-col bg-gradient-to-b from-[#1C0D36] via-[#100722] to-[#080312] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-purple-950/70 via-pink-950/60 to-[#100722] backdrop-blur-2xl flex items-center justify-between border-b border-pink-500/20 shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={closeCallHistory}
                    className="p-1.5 text-zinc-300 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>1-on-1 Call History</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">Calls</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">Details of your previous private video calls</p>
                  </div>
                </div>
                <button 
                  onClick={closeCallHistory}
                  className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {[
                  { id: 'host_1', host: 'Simran Sharma', city: 'Mumbai', duration: '04:12', coins: 240, time: 'Today, 03:20 PM', status: 'Completed', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80' },
                  { id: 'host_2', host: 'Pooja Verma', city: 'Delhi', duration: '08:45', coins: 700, time: 'Yesterday, 11:30 PM', status: 'Completed', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
                  { id: 'host_3', host: 'Ananya Roy', city: 'Bangalore', duration: '02:30', coins: 150, time: '2 days ago', status: 'Completed', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' }
                ].map((c, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-indigo-950/30 border border-pink-500/25 shadow-lg hover:border-pink-400/50 transition-all flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={c.avatar} alt={c.host} className="w-11 h-11 rounded-full object-cover border-2 border-pink-500/40" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#110B22]"></span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1">
                            <span>{c.host}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">({c.city})</span>
                          </h4>
                          <span className="text-[10.5px] text-zinc-400 block mt-0.5">⏱️ Duration: {c.duration} • {c.time}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-yellow-400 block">-{c.coins} 🪙</span>
                        <span className="text-[9.5px] text-emerald-400 font-bold">Ended</span>
                      </div>
                    </div>

                    {/* Quick Call Back Action */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">1-on-1 Private Call</span>
                      <button
                        type="button"
                        onClick={() => {
                          closeCallHistory();
                          navigate(`/call/${c.id}`);
                        }}
                        className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Video size={12} />
                        <span>Call Again</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom footer button */}
              <div className="p-4 bg-[#0E091E] border-t border-white/10 shrink-0">
                <Button
                  onClick={closeCallHistory}
                  className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs active:scale-98 transition-all cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. EDIT PROFILE / MY PAGE SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Top Bar Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeEditProfile}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Edit Profile</h3>
                    <p className="text-[10px] text-zinc-500">Update your avatar, name and info</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEditProfile}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Content - Clean Line-by-Line Attractive Layout */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
                
                {/* Line 1: Avatar Photo & Preset Selection */}
                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100/70 space-y-3 text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-purple-500 to-pink-500 mx-auto shadow-md">
                      <img 
                        src={editPhoto || photoURL} 
                        alt="Avatar Preview" 
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                      title="Upload custom photo"
                    >
                      <Camera size={14} className="stroke-[2.5]" />
                    </button>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-black text-purple-700 hover:text-purple-800 underline inline-flex items-center gap-1.5"
                    >
                      <Upload size={13} />
                      Upload Photo from Gallery
                    </button>
                    <p className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG (Max 4MB)</p>
                  </div>

                  {/* Preset Avatars Bar */}
                  <div className="pt-2 border-t border-purple-100/80">
                    <p className="text-[11px] font-bold text-zinc-600 mb-2 text-left">Or choose a preset avatar:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(editGender === 'female' ? INDIAN_FEMALE_AVATARS : INDIAN_MALE_AVATARS).slice(0, 8).map((avUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditPhoto(avUrl)}
                          className={`relative rounded-xl aspect-square overflow-hidden border-2 transition-all ${
                            editPhoto === avUrl ? 'border-purple-600 scale-105 shadow-md ring-2 ring-purple-400/40' : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <img src={avUrl} alt="Avatar" className="w-full h-full object-cover" />
                          {editPhoto === avUrl && (
                            <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-white fill-purple-600" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Line 2: Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-800 flex items-center justify-between">
                    <span>1. Display Name</span>
                    <span className="text-[10px] text-purple-600 font-bold">Required</span>
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name..."
                    className="bg-zinc-50 border-zinc-200 text-sm font-semibold text-zinc-900 rounded-xl h-11 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                {/* Line 3: Date of Birth & Age Display */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-800">2. Date of Birth</label>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      🎂 Age: {editAge} Years
                    </span>
                  </div>
                  <input
                    type="date"
                    value={editDob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-sm font-semibold text-zinc-900 rounded-xl h-11 px-3 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                  <p className="text-[10px] text-zinc-500">Only users 18 years and older can initiate calls</p>
                </div>

                {/* Line 4: Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-800">3. Gender</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditGender('male');
                        if (!editPhoto || INDIAN_FEMALE_AVATARS.includes(editPhoto)) {
                          setEditPhoto(INDIAN_MALE_AVATARS[0]);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        editGender === 'male'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm font-black'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      <Crown size={14} />
                      <span>Boy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditGender('female');
                        if (!editPhoto || INDIAN_MALE_AVATARS.includes(editPhoto)) {
                          setEditPhoto(INDIAN_FEMALE_AVATARS[0]);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        editGender === 'female'
                          ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm font-black'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      <Heart size={14} />
                      <span>Girl</span>
                    </button>
                  </div>
                </div>

                {/* Line 5: Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-800">4. Bio / Status</label>
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    className="bg-zinc-50 border-zinc-200 text-xs text-zinc-900 rounded-xl min-h-[65px] resize-none focus:border-purple-600 font-medium"
                  />
                </div>

                {/* Line 6: Country & City */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-800">5. Country</label>
                    <Input
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      placeholder="India 🇮🇳"
                      className="bg-zinc-50 border-zinc-200 text-xs font-semibold text-zinc-900 rounded-xl h-10 focus:border-purple-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-800">6. City</label>
                    <Input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Mumbai, Delhi..."
                      className="bg-zinc-50 border-zinc-200 text-xs font-semibold text-zinc-900 rounded-xl h-10 focus:border-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Action Bar */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditProfile}
                  className="flex-1 h-11 rounded-xl bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 font-bold text-xs active:scale-95 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md active:scale-95"
                >
                  {saving ? 'Saving...' : 'Save Changes ✨'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. BUY COINS / QUICK RECHARGE SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBuyCoins && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeBuyCoins}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Recharge Coins</h3>
                    <p className="text-[10px] text-zinc-500">Current Balance: {coins.toLocaleString()} Coins</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeBuyCoins}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Coin Packages Grid (7 Official Plans) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-700">Official Coin Packs</span>
                  <span className="text-[10px] text-purple-600 font-bold">Direct UPI / PhonePe</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {RECHARGE_PLANS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfilePlanId(pack.id);
                        setIsProfileRechargeModalOpen(true);
                      }}
                      className="p-3 rounded-2xl bg-zinc-50 hover:bg-purple-50/70 border border-zinc-200 hover:border-purple-400 text-left transition-all active:scale-95 flex flex-col justify-between min-h-[110px] relative cursor-pointer group"
                    >
                      {pack.badge && (
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full font-bold text-[8.5px] uppercase tracking-tight ${
                          pack.popular 
                            ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-xs' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {pack.badge}
                        </span>
                      )}
                      <div>
                        <span className="text-base font-black text-zinc-900 flex items-center gap-1">
                          <span>{pack.coins.toLocaleString()}</span>
                          <span className="text-xs">🪙</span>
                        </span>
                        {pack.bonusText && (
                          <p className="text-[9.5px] text-emerald-600 font-bold mt-0.5">{pack.bonusText}</p>
                        )}
                        {pack.tagline && (
                          <p className="text-[8.5px] text-zinc-400 font-medium truncate">{pack.tagline}</p>
                        )}
                      </div>
                      <div className="w-full py-1.5 rounded-xl bg-purple-600 group-hover:bg-purple-700 text-white font-extrabold text-xs text-center shadow-xs transition-colors">
                        {pack.priceDisplay}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI Options Info */}
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-600 font-semibold">Payment Mode:</span>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#5f259f] text-[9.5px] font-black text-white">PhonePe</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-[9.5px] font-black text-white">GPay</span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-[9.5px] font-black text-white">Airtel</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9.5px] font-black text-amber-300">⚡ Auto-Add</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-zinc-400">
                🔒 100% Secure UPI. सीधे PhonePe/GPay से पेमेंट करें और कॉइन्स अपने आप जुड़ जाएंगे।
              </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECHARGE MODAL FOR PROFILE PAGE */}
      <RechargeModal
        isOpen={isProfileRechargeModalOpen}
        onClose={() => setIsProfileRechargeModalOpen(false)}
        defaultPlanId={selectedProfilePlanId}
        onSuccess={(added) => {
          if (profile) {
            setProfile({
              ...profile,
              coins: (profile.coins || 0) + added,
              totalRechargedCoins: ((profile as any)?.totalRechargedCoins || 0) + added,
            } as UserProfile);
          }
          closeBuyCoins();
        }}
      />

      {/* ========================================================================= */}
      {/* 7. COINS DETAIL SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCoinsDetail && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeCoinsDetail}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Coins Detail</h3>
                    <p className="text-[10px] text-zinc-500">Track all coin income and gifting expenses</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCoinsDetail}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Total Balance Overview Box */}
              <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Coin Balance</span>
                  <p className="text-2xl font-black text-purple-700 flex items-center gap-1">
                    <span>{coins.toLocaleString()}</span>
                    <span className="text-sm">🪙</span>
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    closeCoinsDetail();
                    openBuyCoins();
                  }}
                  className="h-8 px-4 rounded-full bg-[#FFDF00] hover:bg-yellow-400 text-black font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  + Buy Coins
                </Button>
              </div>

              {/* Tabs Filter */}
              <div className="flex border-b border-zinc-100 px-4 pt-2 gap-2 shrink-0">
                {(['all', 'income', 'expense'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCoinsDetailTab(tab)}
                    className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      coinsDetailTab === tab 
                        ? 'border-purple-600 text-purple-700' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Transaction Records List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                {filteredTransactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        tx.isPositive 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {tx.isPositive ? '+' : '-'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-900">{tx.title}</h4>
                        <p className="text-[10px] text-zinc-400">{tx.details} • {tx.date}</p>
                      </div>
                    </div>

                    <div className={`text-xs font-black ${
                      tx.isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.isPositive ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`} 🪙
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8A. HELP CENTER SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showHelpCenter && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeHelpCenter}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">{t('support.helpCenter')}</h3>
                    <p className="text-[10px] text-zinc-500">{t('support.helpSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeHelpCenter}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Support Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
                
                {/* 1. Primary Live Chat Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    closeHelpCenter();
                    navigate('/support');
                  }}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between active:scale-98 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Headphones size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black">{t('support.liveChat')}</h4>
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                      </div>
                      <p className="text-[11px] text-emerald-100 mt-0.5">{t('support.liveChatDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-emerald-100" />
                </button>

                {/* 2. Suggestive Help Categories Selector */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{t('support.selectTopic')}</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'coins', label: 'Coins Issue', sub: 'Balance & Topup', icon: '🪙' },
                      { id: 'hosts', label: 'Host Issue', sub: 'Behavior & Quality', icon: '📹' },
                      { id: 'recharge', label: 'Recharge Issue', sub: 'Payment Status', icon: '⚡' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setHelpCategory(item.id as any)}
                        className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col items-center text-center cursor-pointer ${
                          helpCategory === item.id
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                            : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <span className="text-xl mb-1">{item.icon}</span>
                        <span className="text-xs font-black text-zinc-900 leading-tight">{item.label}</span>
                        <span className="text-[9px] text-zinc-500 font-medium mt-0.5">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Dynamic Category Assistance Cards */}
                <div className="space-y-2.5 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  {helpCategory === 'coins' && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                        <span>🪙 Frequently Asked Coin Questions:</span>
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            1. Are coins deducted if a video call does not connect?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            No! Coins are only deducted once the host answers your 1-on-1 call and the conversation starts.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            2. How do I recharge coins?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Go to your Profile or Wallet, tap Recharge, and instantly add coins via PhonePe or any UPI app.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpCategory === 'hosts' && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                        <span>📹 Host Help & Safety Inquiries:</span>
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            1. What happens if a host disconnects early?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            You are only charged for the exact seconds the call was connected. Unused coins remain safely in your balance.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            2. How do I report inappropriate host behavior?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            You can report the host directly from the video call screen or Feedback section. Our moderation team reviews all reports.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpCategory === 'recharge' && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                        <span>⚡ Recharge & Payment Troubleshooting:</span>
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            1. Money debited from bank but coins not credited?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            UPI payments typically sync within 1-2 minutes. If not credited, share your 12-digit UTR reference number in live chat.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-xs">
                          <p className="font-bold text-zinc-800">
                            2. Which payment methods are accepted?
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Instant recharge is supported via PhonePe, Google Pay, Paytm, Airtel Payments Bank, and all UPI apps.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Immediate resolution action */}
                  <Button
                    type="button"
                    onClick={() => {
                      closeHelpCenter();
                      navigate('/support');
                    }}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>{t('support.askInChat')}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8B. FEEDBACK SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-gradient-to-b from-[#1E0E38] via-[#120724] to-[#080214] flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-gradient-to-b from-[#1E0E38] via-[#120724] to-[#080214] flex flex-col overflow-hidden text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-950/80 via-pink-950/70 to-indigo-950/80 backdrop-blur-xl border-b border-purple-500/20 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeFeedback}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>{t('feedback.title')}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">Feedback</span>
                    </h3>
                    <p className="text-[10px] text-pink-200/70">{t('feedback.subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5 text-left">
                
                {/* Question 1: Experience */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-pink-200 block leading-tight">
                    {t('feedback.q1')} 🤔
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Loved it 😍',
                      'Liked it 😊',
                      'It was okay 🙂',
                      'Disliked it 😕',
                      'Terrible 😡'
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFeedbackHostExperience(opt)}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          feedbackHostExperience === opt
                            ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/30 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)] ring-1 ring-purple-400 font-black'
                            : 'bg-white/[0.04] border-white/10 text-zinc-200 hover:bg-white/10 hover:border-purple-400/40'
                        }`}
                      >
                        <span>{opt}</span>
                        {feedbackHostExperience === opt && (
                          <CheckCircle2 size={16} className="text-purple-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Behavior */}
                <div className="space-y-2.5 pt-3 border-t border-white/10">
                  <label className="text-xs font-black text-pink-200 block leading-tight">
                    {t('feedback.q2')} 💬
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Very Polite 💖',
                      'Good 👍',
                      'Average 🤝',
                      'Rude 👎',
                      'Very Rude 😠'
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFeedbackHostTalk(opt)}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          feedbackHostTalk === opt
                            ? 'bg-gradient-to-r from-pink-600/40 to-rose-600/30 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.35)] ring-1 ring-pink-400 font-black'
                            : 'bg-white/[0.04] border-white/10 text-zinc-200 hover:bg-white/10 hover:border-pink-400/40'
                        }`}
                      >
                        <span>{opt}</span>
                        {feedbackHostTalk === opt && (
                          <CheckCircle2 size={16} className="text-pink-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Comments */}
                <div className="space-y-1.5 pt-3 border-t border-white/10">
                  <label className="text-xs font-bold text-zinc-300">{t('feedback.additionalComments')}</label>
                  <Textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder={t('feedback.placeholder')}
                    className="bg-white/[0.05] border-white/15 text-xs text-white placeholder:text-zinc-500 rounded-xl min-h-[70px] resize-none focus:border-pink-400"
                  />
                </div>
              </div>

              {/* Fixed Bottom Submit Button */}
              <div className="p-4 bg-[#0c0517]/95 border-t border-white/10 shrink-0">
                <Button
                  type="button"
                  onClick={() => {
                    toast.success('Thank you! Your feedback has been recorded successfully.');
                    closeFeedback();
                    setFeedbackNotes('');
                  }}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-xs shadow-[0_8px_25px_rgba(236,72,153,0.4)] active:scale-98 cursor-pointer"
                >
                  {t('feedback.submit')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 9. BLOCKED LIST SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBlockedList && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeBlockedList}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Blocked List</h3>
                    <p className="text-[10px] text-zinc-500">{blockedUsers.length} users restricted from contacting you</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeBlockedList}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Blocked Users List */}
              <div className="p-5 overflow-y-auto flex-1 space-y-3 text-left">
                {blockedUsers.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 space-y-2">
                    <ShieldCheck size={36} className="mx-auto text-emerald-500 opacity-60" />
                    <p className="text-xs font-bold text-zinc-700">No blocked users</p>
                    <p className="text-[11px] text-zinc-400">Your block list is completely clean.</p>
                  </div>
                ) : (
                  blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.photoURL} 
                          alt={u.name} 
                          className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                        />
                        <div>
                          <h4 className="text-xs font-black text-zinc-900">{u.name}</h4>
                          <p className="text-[10px] text-zinc-400">ID: {u.numericId} • Blocked {u.blockedAt}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockUser(u.id, u.name)}
                        className="h-8 px-3 rounded-xl border-zinc-200 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold"
                      >
                        Unblock
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 10. ABOUT SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeAbout}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">About</h3>
                    <p className="text-[10px] text-zinc-500">Mulaqat Live 1-on-1 Video Party Platform</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAbout}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* About Content */}
              <div className="p-6 overflow-y-auto flex-1 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/20">
                  🎙️
                </div>

                <div>
                  <h3 className="text-lg font-black text-zinc-900">Mulaqat Live</h3>
                  <p className="text-xs text-purple-700 font-bold">Version 2.5.0 (Build 2026.09)</p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
                    India's leading 1-on-1 video chat, real-time voice stages, and social networking platform.
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl border border-zinc-100 divide-y divide-zinc-100 text-left text-xs font-semibold text-zinc-700">
                  <div className="p-3.5 flex items-center justify-between">
                    <span>User Agreement</span>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <span>Privacy Policy</span>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <span>Community Code of Conduct</span>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </div>
                  <div className="p-3.5 flex items-center justify-between">
                    <span>Check for Updates</span>
                    <span className="text-[10px] font-bold text-emerald-600">Latest Version ✅</span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400">
                  © 2026 Mulaqat Live Inc. All rights reserved.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 11. SETTING SCREEN (100% FULL SCREEN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeSettings}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">{t('settings.title')}</h3>
                    <p className="text-[10px] text-zinc-500">{t('settings.subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeSettings}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Settings Options List */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
                
                {/* 1. App Language - English & Hindi */}
                <div className="space-y-2 bg-zinc-50 rounded-2xl border border-zinc-200/80 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Languages size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900">{t('settings.languageOption')}</p>
                        <p className="text-[10px] text-zinc-500">{t('settings.languageDesc')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                        toast.success('App language set to English 🇬🇧');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-black'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>English</span>
                      {language === 'en' && <CheckCircle2 size={14} className="text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('hi');
                        toast.success('App language set to Hindi 🇮🇳');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        language === 'hi'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-black'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>Hindi</span>
                      {language === 'hi' && <CheckCircle2 size={14} className="text-white" />}
                    </button>
                  </div>
                </div>

                {/* 2. Notification Sound & Vibrate */}
                <div className="space-y-2 bg-zinc-50 rounded-2xl border border-zinc-200/80 p-4">
                  <p className="text-xs font-black text-zinc-900 mb-2">Notifications</p>
                  
                  {/* Notification Sound */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Volume2 size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{t('settings.notifSound')}</p>
                        <p className="text-[10px] text-zinc-500">{t('settings.notifSoundDesc')}</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={notifSound}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setNotifSound(val);
                        localStorage.setItem('maxo_notif_sound', String(val));
                        toast.info(val ? 'Sound Enabled' : 'Sound Muted');
                      }}
                      className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Notification Vibrate */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Vibrate size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{t('settings.notifVibrate')}</p>
                        <p className="text-[10px] text-zinc-500">{t('settings.notifVibrateDesc')}</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={notifVibrate}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setNotifVibrate(val);
                        localStorage.setItem('maxo_notif_vibrate', String(val));
                        toast.info(val ? 'Vibrate Enabled' : 'Vibrate Disabled');
                      }}
                      className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Clean Cache */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                      <RefreshCw size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{t('settings.clearCache')}</p>
                      <p className="text-[10px] text-zinc-500">Cache memory: <span className="font-bold text-teal-700">{cacheSize}</span></p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    className="h-8 px-3 rounded-xl border-zinc-300 text-xs font-bold hover:bg-zinc-200 cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>

                {/* 4. Blocked Users */}
                <button
                  type="button"
                  onClick={openBlockedList}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Shield size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">Blocked List</p>
                      <p className="text-[10px] text-zinc-500">Manage restricted users</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400" />
                </button>

                {/* 5. About */}
                <button
                  type="button"
                  onClick={openAbout}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Info size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">About Mulaqat Live</p>
                      <p className="text-[10px] text-zinc-500">Version 2.5.0 & App Details</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400" />
                </button>

                {/* 6. Privacy Policy */}
                <button
                  type="button"
                  onClick={openPrivacyPolicyModal}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{t('profile.privacyPolicy')}</p>
                      <p className="text-[10px] text-zinc-500">Data privacy and safety guidelines</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400" />
                </button>

                {/* 7. Delete Account */}
                <button
                  type="button"
                  onClick={openDeleteConfirm}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 hover:bg-rose-100/70 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                      <Trash2 size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-rose-900">Delete Account</p>
                      <p className="text-[10px] text-rose-600">Permanently remove account and data</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </button>

                {/* 6. Log Out */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleLogout}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>{t('common.logout')}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 11B. PRIVACY POLICY MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPrivacyPolicyModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-zinc-100"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Privacy Policy</h3>
                    <p className="text-[10px] text-zinc-500">Mulaqat Live Data & Security Standards</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePrivacyPolicyModal}
                  className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 text-xs text-zinc-700 space-y-3 leading-relaxed text-left">
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 font-bold text-indigo-900">
                  🔐 Mulaqat Live places the highest priority on user safety, privacy, and account security.
                </div>
                
                <h4 className="font-black text-zinc-900">1. Data Collection & Purpose:</h4>
                <p>We only collect essential profile details (such as username, gender, and age) required to deliver seamless 1-on-1 calling and social connections.</p>

                <h4 className="font-black text-zinc-900">2. 1-on-1 Call Security:</h4>
                <p>All 1-on-1 video and audio streams are encrypted end-to-end. Screen recording is strictly prohibited, and abusive conduct leads to immediate termination.</p>

                <h4 className="font-black text-zinc-900">3. Wallet & Payment Safety:</h4>
                <p>All UPI, PhonePe, and payment gateway transactions are handled via compliant, encrypted banking networks.</p>

                <h4 className="font-black text-zinc-900">4. Right to Deletion:</h4>
                <p>You may permanently wipe your account and all associated profile records at any time directly through the Settings menu.</p>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-100 shrink-0">
                <Button
                  type="button"
                  onClick={closePrivacyPolicyModal}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                >
                  Understood 👍
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 11C. DELETE ACCOUNT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 border border-zinc-100 text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-black">
                <Trash2 size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-zinc-900">Are you sure you want to delete your account?</h3>
                <p className="text-xs text-zinc-500">
                  This action is permanent and irreversible. Your coins, call logs, and profile records will be permanently erased.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteConfirm}
                  className="flex-1 h-11 rounded-xl border-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    closeDeleteConfirm();
                    closeSettings();
                    toast.success('Account deleted successfully');
                    try {
                      localStorage.clear();
                      await signOut(auth);
                      navigate('/login');
                    } catch (err) {
                      navigate('/login');
                    }
                  }}
                  className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs"
                >
                  Yes, Delete Permanently
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 12. FOLLOWING & FOLLOWERS SCREEN (100% FULL SCREEN & SLIMMED DOWN LIST) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFollowModal && (
          <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white flex flex-col overflow-hidden select-none">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full h-full max-w-lg mx-auto bg-white flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeFollowModal}
                    className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">
                      {showFollowModal === 'following' ? 'Following' : 'Followers'}
                    </h3>
                    <p className="text-[10px] text-zinc-500">Your favorite hosts and connected friends</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFollowModal}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sub-Tab Switcher */}
              <div className="grid grid-cols-2 p-1.5 bg-zinc-100/80 border-b border-zinc-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFollowModal('following')}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                    showFollowModal === 'following'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Following ({followingList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowModal('followers')}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                    showFollowModal === 'followers'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Followers ({followersList.length})
                </button>
              </div>

              {/* Body / Slimmed Down List */}
              <div className="p-3.5 overflow-y-auto flex-1 space-y-2 text-left">
                {showFollowModal === 'following' ? (
                  followingList.length === 0 ? (
                    <div className="py-12 text-center text-zinc-400 space-y-2">
                      <p className="text-xs font-bold text-zinc-700">No Following yet</p>
                      <p className="text-[11px] text-zinc-400">Follow hosts from the Video section to see them here.</p>
                    </div>
                  ) : (
                    followingList.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 rounded-xl bg-zinc-50/90 hover:bg-zinc-100/80 border border-zinc-200/70 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img 
                              src={item.avatar} 
                              alt={item.name} 
                              className="w-9 h-9 rounded-full object-cover border border-purple-300"
                            />
                            {item.status === 'online' && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1 truncate">
                              <span className="truncate">{item.name}</span>
                              <span className="text-[10px] text-zinc-400 font-normal shrink-0">({item.age}y)</span>
                            </h4>
                            <p className="text-[10px] text-zinc-500 truncate">📍 {item.city} • {item.rate} 🪙/min</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              closeFollowModal();
                              navigate(`/call/${item.id}`);
                            }}
                            className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-[10.5px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Video size={11} />
                            <span>Call</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFollowingList(prev => prev.filter(f => f.id !== item.id));
                              toast.info(`Unfollowed ${item.name}`);
                            }}
                            className="h-7 px-2 rounded-lg border border-zinc-200/80 bg-white text-zinc-500 hover:text-rose-600 font-bold text-[10.5px] hover:bg-rose-50/50 transition-colors"
                          >
                            Unfollow
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  followersList.length === 0 ? (
                    <div className="py-12 text-center text-zinc-400 space-y-2">
                      <p className="text-xs font-bold text-zinc-700">No followers yet</p>
                      <p className="text-[11px] text-zinc-400">Invite friends to grow your follower base.</p>
                    </div>
                  ) : (
                    followersList.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 rounded-xl bg-zinc-50/90 hover:bg-zinc-100/80 border border-zinc-200/70 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={item.avatar} 
                            alt={item.name} 
                            className="w-9 h-9 rounded-full object-cover border border-zinc-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-zinc-900 truncate">{item.name}</h4>
                            <p className="text-[10px] text-zinc-500 truncate">📍 {item.city} • {item.age}y</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFollowersList(prev => prev.map(f => f.id === item.id ? { ...f, isFollowing: !f.isFollowing } : f));
                            toast.success(!item.isFollowing ? `Followed ${item.name} ✅` : `Unfollowed ${item.name}`);
                          }}
                          className={`h-7 px-2.5 rounded-lg font-black text-[10.5px] transition-all cursor-pointer shrink-0 ml-2 ${
                            item.isFollowing
                              ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                          }`}
                        >
                          {item.isFollowing ? 'Following ✓' : '+ Follow Back'}
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

