import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { getPublicOrigin, copyTextToClipboard } from '@/lib/utils';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy, limit, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, Share2, Copy, Check, UserPlus, Users, 
  MessageSquare, Send, Sparkles, RefreshCw, QrCode, Crown, 
  CheckCircle2, ArrowRight, HeartHandshake, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStandardReferralCode, 
  generateInviteUrl, 
  applyReferralBonus, 
  resolveReferrer, 
  ReferralRecord 
} from '@/utils/referral';
import { getPremiumAvatar } from '@/utils/avatar';

export default function InvitePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeUid = profile?.uid || user?.uid || 'guest_user';
  const numericId = profile?.numericId || localStorage.getItem('maxo_saved_numeric_id') || '789104';
  const currentDisplayName = profile?.displayName || user?.displayName || 'Maxo Star';
  const currentAvatar = profile?.photoURL || user?.photoURL || getPremiumAvatar(activeUid);

  // Invite code state & Reset capability
  const [customCode, setCustomCode] = useState<string>(() => {
    const saved = localStorage.getItem(`maxo_custom_ref_code_${activeUid}`);
    return saved || (profile as any)?.customReferralCode || '';
  });

  const inviteCode = customCode || getStandardReferralCode(numericId);
  const inviteUrl = generateInviteUrl(inviteCode);

  const [partnerCode, setPartnerCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [resettingCode, setResettingCode] = useState(false);
  const [referrerProfile, setReferrerProfile] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newCustomInput, setNewCustomInput] = useState('');

  // Referred friends real-time list
  const [referralsList, setReferralsList] = useState<ReferralRecord[]>(() => {
    try {
      const cached = localStorage.getItem(`referrals_${activeUid}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Handle incoming ?ref=... query params on page load
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const refParam = searchParams.get('ref') || searchParams.get('code');
    if (refParam) {
      const clean = refParam.trim().toUpperCase();
      if (clean !== inviteCode) {
        setPartnerCode(clean);
        resolveReferrer(clean).then(res => {
          if (res) {
            toast.info(`🎉 You were invited by ${res.displayName}! Connect below to join the party! ✨`);
          }
        });
      }
    }
  }, [location.search, inviteCode]);

  // Check if current user already has a referrer linked
  useEffect(() => {
    async function checkExistingReferrer() {
      if (!activeUid) return;
      
      const rId = (profile as any)?.referredBy || localStorage.getItem(`referred_by_${activeUid}`);
      const rName = (profile as any)?.referredByName;
      
      if (rId) {
        if (rName) {
          setReferrerProfile({ displayName: rName, uid: rId });
        }
        try {
          const rSnap = await getDoc(doc(db, 'users', rId));
          if (rSnap.exists()) {
            setReferrerProfile({ uid: rId, ...rSnap.data() });
          }
        } catch (e) {
          console.warn("Fetch referrer profile warn:", e);
        }
      }
    }
    checkExistingReferrer();
  }, [activeUid, profile]);

  // Real-time subscription to user's referred friends
  useEffect(() => {
    if (!activeUid) return;
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', activeUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: ReferralRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ReferralRecord);
        });
        
        // Sort newest first
        list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setReferralsList(list);
        try {
          localStorage.setItem(`referrals_${activeUid}`, JSON.stringify(list));
        } catch (e) {}
      }, (err) => {
        console.warn("Referrals snapshot warn:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Referrals hook error:", e);
    }
  }, [activeUid]);

  // Copy Full Share Link
  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    if (ok) {
      toast.success('👑 Invite Link Copied! Share with your friends on WhatsApp & Telegram! 🚀✨');
    } else {
      toast.info(`Invite Link: ${inviteUrl}`);
    }
  };

  // Copy Referral Code Only
  const handleCopyCode = async () => {
    const ok = await copyTextToClipboard(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    if (ok) {
      toast.success(`Invite Code "${inviteCode}" copied to clipboard! 📋`);
    } else {
      toast.info(`Invite Code: ${inviteCode}`);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const text = `🔥 Join me on मुलाकात (Mulaqat Live)! 🎙️✨\n\nConnect with me, chat in voice rooms, and 1-on-1 private video calls!\n\nInvite Code: *${inviteCode}*\n👉 Open Link: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Telegram Share
  const handleShareTelegram = () => {
    const text = `🔥 Join me on मुलाकात (Mulaqat Live)! 🎙️✨ Use my invite code "${inviteCode}" to connect with me!`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Native OS Share Sheet
  const handleNativeShare = async () => {
    const title = 'Join मुलाकात (Mulaqat Live)';
    const text = `🔥 Join me on मुलाकात (Mulaqat Live)! Connect in live video calls & chat rooms! Invite Code: ${inviteCode} ✨`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: inviteUrl });
        toast.success('Shared successfully! 🎉');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // RESET INVITE LINK (रीसेट करो और नया कोड जनरेट करो)
  const handleResetInviteCode = async (customText?: string) => {
    setResettingCode(true);
    try {
      let finalCode = '';
      if (customText && customText.trim()) {
        const clean = customText.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (clean.length < 4 || clean.length > 16) {
          toast.error('Custom code must be between 4 and 16 characters!');
          setResettingCode(false);
          return;
        }
        finalCode = clean.startsWith('MAXO-') ? clean : `MAXO-${clean}`;
      } else {
        const randToken = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalCode = `MAXO-${numericId.slice(-4)}${randToken}`;
      }

      setCustomCode(finalCode);
      localStorage.setItem(`maxo_custom_ref_code_${activeUid}`, finalCode);

      try {
        await updateDoc(doc(db, 'users', activeUid), {
          customReferralCode: finalCode
        });
      } catch (e) {
        console.warn("Firestore customReferralCode save skipped:", e);
      }

      setShowResetModal(false);
      setNewCustomInput('');
      toast.success(`🎉 Invite Link & Code successfully updated: ${finalCode} ✨`);
    } catch (err: any) {
      toast.error('Reset failed: ' + (err.message || 'Please try again'));
    } finally {
      setResettingCode(false);
    }
  };

  // Apply a Friend's Referral Code
  const handleApplyReferral = async () => {
    if (!partnerCode.trim()) {
      toast.error('Please enter a valid invite code!');
      return;
    }

    setClaiming(true);
    const result = await applyReferralBonus(
      activeUid,
      currentDisplayName,
      currentAvatar,
      numericId,
      partnerCode.trim()
    );

    if (result.success) {
      toast.success(result.message);
      setReferrerProfile({ displayName: result.referrerName });
      localStorage.setItem(`referred_by_${activeUid}`, partnerCode.trim());
      setPartnerCode('');
    } else {
      toast.error(result.message);
    }
    setClaiming(false);
  };

  const totalFriendsCount = referralsList.length;

  return (
    <div id="invite-page-root" className="min-h-screen bg-[#07050F] text-white font-sans pb-32 relative overflow-x-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-rose-600/15 via-purple-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-40px] right-[-40px] w-80 h-80 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-48 left-[-50px] w-80 h-80 bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Sticky Top Header */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between bg-[#07050F]/70 backdrop-blur-xl sticky top-0 z-30 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/profile')} 
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Share2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">Invite Friends</h1>
              <p className="text-[10px] text-rose-300 font-bold">दोस्तों को इनवाइट करें और कनेक्ट करें</p>
            </div>
          </div>
        </div>

        {/* Quick Reset Link Action */}
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-rose-300 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Reset or Customize Invite Link"
        >
          <RefreshCw size={12} className={resettingCode ? 'animate-spin' : ''} />
          <span>Reset Link</span>
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4 relative z-10">

        {/* 1. HOLOGRAPHIC INVITATION PASS (CARD) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden p-5 bg-gradient-to-br from-zinc-900/90 via-[#181124]/95 to-black border-2 border-rose-500/40 shadow-[0_15px_50px_rgba(225,29,72,0.2)]"
        >
          {/* Subtle Decorative Pattern */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-rose-500/20 via-pink-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute -bottom-6 -right-6 text-8xl opacity-10 select-none pointer-events-none">✨</div>

          {/* Pass Header */}
          <div className="flex items-center justify-between relative z-10 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <img 
                src={currentAvatar} 
                alt={currentDisplayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-rose-400 shadow-md"
              />
              <div>
                <p className="text-xs font-black text-white flex items-center gap-1">
                  <span>{currentDisplayName}</span>
                  <Crown size={12} className="text-rose-400 shrink-0" />
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  User ID: {numericId}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
                Party Invite 🎙️
              </span>
              <p className="text-[9px] text-rose-300 font-bold mt-0.5">Live Voice Chat</p>
            </div>
          </div>

          {/* Referral Code Display Area */}
          <div className="py-4 space-y-2 relative z-10 text-center">
            <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">
              Your Invitation Code (आपका इनवाइट कोड)
            </p>
            <div className="inline-flex items-center justify-center gap-3 bg-black/60 border border-rose-500/50 px-6 py-2.5 rounded-2xl shadow-inner backdrop-blur-md">
              <span className="text-xl sm:text-2xl font-mono font-black tracking-widest bg-gradient-to-r from-rose-300 via-pink-200 to-rose-400 bg-clip-text text-transparent">
                {inviteCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center transition-colors active:scale-95"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400 stroke-[3]" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Real Link Box & 1-Tap Copy */}
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 bg-white/[0.05] p-1.5 pl-3 rounded-2xl border border-white/10 text-xs">
              <span className="text-[11px] font-mono text-zinc-300 truncate flex-1 select-all">
                {inviteUrl}
              </span>
              <Button
                onClick={handleCopyLink}
                className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md border-none active:scale-95 shrink-0"
              >
                {copiedLink ? <Check size={13} className="stroke-[3]" /> : <Copy size={13} className="stroke-[3]" />}
                <span>{copiedLink ? 'Copied! ✅' : 'Copy Link 📋'}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="text-[11px] text-zinc-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors"
              >
                <QrCode size={13} />
                <span>Show QR Code 📲</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors underline underline-offset-2"
              >
                <RefreshCw size={11} />
                <span>Reset / Change Code (कोड रीसेट करें)</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 2. VIRAL SOCIAL SHARE SUITE (1-TAP SHARE) */}
        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 px-1">
            <Share2 size={13} className="text-rose-400" />
            <span>Instant 1-Click Share (सोशल मीडिया पर शेयर करें)</span>
          </h2>

          <div className="grid grid-cols-3 gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleShareWhatsApp}
              className="py-3 px-3 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-black flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                <MessageSquare size={16} className="fill-black" />
              </div>
              <span>WhatsApp</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleShareTelegram}
              className="py-3 px-3 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-cyan-950/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-black flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-md">
                <Send size={15} className="fill-black" />
              </div>
              <span>Telegram</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleNativeShare}
              className="py-3 px-3 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-950/40 border border-pink-500/40 hover:border-pink-400 text-pink-300 text-xs font-black flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                <Share2 size={15} />
              </div>
              <span>More Options</span>
            </motion.button>
          </div>
        </section>

        {/* 3. FRIENDS OVERVIEW CARD */}
        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <HeartHandshake size={14} className="text-rose-400" />
                <span>Connected Friends (जुड़े हुए दोस्त)</span>
              </h3>
              <p className="text-[10px] text-zinc-400">
                Friends who joined मुलाकात (Mulaqat) with your invitation link
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono font-black text-xs">
              👥 {totalFriendsCount} Friends
            </span>
          </div>
        </div>

        {/* 4. APPLY FRIEND'S INVITE CODE (अगर आपको किसी ने इनवाइट किया है) */}
        <div className="p-4 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-3">
          <h3 className="text-xs font-black text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus size={14} className="text-rose-400" />
            <span>Connect with Inviter (दोस्त का कोड लगाएं)</span>
          </h3>

          {referrerProfile ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="stroke-[3]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-emerald-300">
                  Connected with Friend! ✅
                </p>
                <p className="text-[10px] text-zinc-300 truncate">
                  Invited by: <span className="font-bold text-white">{referrerProfile.displayName || 'Mulaqat Friend'}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10px] text-zinc-400">
                Did a friend invite you? Enter their invite code or ID below to connect with them!
              </p>
              <div className="flex items-center gap-2">
                <Input 
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  placeholder="Enter Code (e.g. MAXO-789104 or User ID)"
                  className="h-10 rounded-xl bg-black/50 border-white/15 text-xs text-white font-mono placeholder:text-zinc-500 uppercase tracking-wider"
                />
                <Button
                  disabled={claiming || !partnerCode.trim()}
                  onClick={handleApplyReferral}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-xs shadow-md border-none shrink-0 active:scale-95 transition-all"
                >
                  {claiming ? 'Connecting...' : 'Connect 🤝'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 5. REFERRED FRIENDS LIST (REAL-TIME FIRESTORE DATA) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Users size={13} className="text-rose-400" />
              <span>Invited Friends History ({referralsList.length})</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-bold">इनवाइट लिस्ट</span>
          </div>

          {referralsList.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-zinc-500">
                <UserPlus size={24} />
              </div>
              <p className="text-xs font-black text-zinc-300">No Friends Joined Yet</p>
              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                Share your invite link on WhatsApp or Telegram. When friends open your link, they will appear here instantly!
              </p>
              <Button
                onClick={handleShareWhatsApp}
                className="mt-2 h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs"
              >
                Share on WhatsApp 💬
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {referralsList.map((ref) => (
                <div 
                  key={ref.id}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={ref.referredPhoto || getPremiumAvatar(ref.referredId)} 
                      alt={ref.referredName}
                      className="w-10 h-10 rounded-full object-cover border border-rose-400/50 shadow"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">
                        {ref.referredName}
                      </p>
                      <p className="text-[9.5px] text-zinc-400 font-mono">
                        {ref.timestamp ? new Date(ref.timestamp).toLocaleDateString() : 'Joined recently'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black">
                      Connected 🤝
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* MODAL: QR CODE DISPLAY */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xs bg-[#120D24] border-2 border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode size={14} className="text-rose-400" />
                  <span>Scan to Join मुलाकात</span>
                </h4>
                <button 
                  onClick={() => setShowQRModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-black"
                >
                  ✕
                </button>
              </div>

              {/* Dynamic QR Code Canvas representation */}
              <div className="p-4 bg-white rounded-2xl mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-lg relative">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-rose-300 font-mono">{inviteCode}</p>
                <p className="text-[10px] text-zinc-400">Scan with any phone camera or QR scanner to open directly!</p>
              </div>

              <Button
                onClick={handleCopyLink}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs"
              >
                Copy Link 📋
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RESET & CUSTOMIZE INVITE CODE */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[#120D24] border-2 border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <RefreshCw size={14} />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Reset Invite Link & Code
                  </h4>
                </div>
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-black"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-zinc-300 leading-relaxed">
                You can generate a fresh randomized invite code or create your own custom personalized invite code (e.g. <span className="text-rose-300 font-bold">MAXO-FRIEND</span>).
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase">
                  Custom Code (Optional / अपनी पसंद का कोड)
                </label>
                <Input 
                  value={newCustomInput}
                  onChange={(e) => setNewCustomInput(e.target.value.toUpperCase())}
                  placeholder="e.g. PARTY777 or STAR999"
                  className="h-10 rounded-xl bg-black/60 border-white/15 text-xs text-white font-mono uppercase tracking-wider"
                  maxLength={16}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={resettingCode}
                  onClick={() => handleResetInviteCode()}
                  className="h-10 rounded-xl bg-white/[0.05] border-white/10 text-zinc-300 hover:text-white font-black text-xs"
                >
                  🎲 Auto-Generate
                </Button>

                <Button
                  type="button"
                  disabled={resettingCode}
                  onClick={() => handleResetInviteCode(newCustomInput)}
                  className="h-10 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white font-black text-xs shadow-md border-none"
                >
                  {resettingCode ? 'Saving...' : 'Save & Reset ✅'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

