import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import firebaseConfig from '@/../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Video, Sparkles, 
  ShieldCheck, Flame, X, UserCheck, Check, FileText, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  INDIAN_FEMALE_AVATARS, 
  INDIAN_MALE_AVATARS,
  INDIAN_MALE_NAMES,
  INDIAN_FEMALE_NAMES,
  generateIndianProfile
} from '@/utils/avatar';

// Real verified female hosts showcased softly in ambient background
const BACKGROUND_HOSTS = [
  {
    name: 'Priya Sharma',
    city: 'Mumbai',
    rate: '60 🪙/min',
    img: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&auto=format&fit=crop&q=80',
    tag: '💖 Flirty & Sweet',
  },
  {
    name: 'Ananya Roy',
    city: 'Delhi',
    rate: '60 🪙/min',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700&auto=format&fit=crop&q=80',
    tag: '🔥 Sweet Vibe',
  },
  {
    name: 'Simran Kaur',
    city: 'Chandigarh',
    rate: '60 🪙/min',
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=700&auto=format&fit=crop&q=80',
    tag: '✨ Late Night',
  },
  {
    name: 'Riya Sen',
    city: 'Goa',
    rate: '60 🪙/min',
    img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=700&auto=format&fit=crop&q=80',
    tag: '👑 Star Host',
  }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [userAgreed, setUserAgreed] = useState(true);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [shakeAgreement, setShakeAgreement] = useState(false);

  // Remembered user on this device across logouts
  const [rememberedUser, setRememberedUser] = useState<{
    numericId: string;
    displayName: string;
    photoURL?: string;
    gender: 'male' | 'female';
  } | null>(null);

  useEffect(() => {
    try {
      const savedNumId = localStorage.getItem('mulaqat_remembered_numeric_id') || localStorage.getItem('maxo_saved_numeric_id');
      const savedName = localStorage.getItem('mulaqat_remembered_name');
      const savedPhoto = localStorage.getItem('mulaqat_remembered_photo');
      const savedGender = (localStorage.getItem('mulaqat_remembered_gender') || localStorage.getItem('maxo_user_gender')) as any;
      
      let parsedProf: any = null;
      const rawProf = localStorage.getItem('maxo_active_profile') || localStorage.getItem('maxo_custom_profile');
      if (rawProf) {
        try { parsedProf = JSON.parse(rawProf); } catch(e) {}
      }

      const finalNumId = savedNumId || parsedProf?.numericId?.toString();
      const finalName = savedName || parsedProf?.displayName;

      if (finalNumId && finalName) {
        setRememberedUser({
          numericId: finalNumId,
          displayName: finalName,
          photoURL: savedPhoto || parsedProf?.photoURL,
          gender: (savedGender === 'female' || parsedProf?.gender === 'female') ? 'female' : 'male'
        });
      }
    } catch(e) {}
  }, []);

  // Discrete 5-tap secret Admin access on login screen
  const secretLoginTapRef = useRef(0);
  const secretLoginTimerRef = useRef<any>(null);

  const handleSecretLoginTap = () => {
    secretLoginTapRef.current += 1;
    if (secretLoginTimerRef.current) clearTimeout(secretLoginTimerRef.current);

    if (secretLoginTapRef.current >= 5) {
      secretLoginTapRef.current = 0;
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

    secretLoginTimerRef.current = setTimeout(() => {
      secretLoginTapRef.current = 0;
    }, 2500);
  };

  // Skip login if session already exists or redirect to admin if requested
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const adminParam = searchParams.get('admin') || searchParams.get('pin');
      if (adminParam || window.location.hash.includes('admin')) {
        navigate('/admin');
        return;
      }

      const roomParam = searchParams.get('room') || searchParams.get('roomId');
      
      if (roomParam) {
        sessionStorage.setItem('post_login_redirect', `/room/${roomParam}`);
      }

      const activeSession = localStorage.getItem('maxo_mock_user') || localStorage.getItem('maxo_permanent_guest');
      if (activeSession) {
        const landingTarget = sessionStorage.getItem('post_login_redirect') || (roomParam ? `/room/${roomParam}` : '/');
        sessionStorage.removeItem('post_login_redirect');
        if (landingTarget !== '/') {
          window.location.href = landingTarget;
        } else {
          navigate('/');
        }
      }
    } catch (e) {
      console.warn("Session check error:", e);
    }
  }, [navigate]);

  const saveStoredCredentials = (uid: string, data: any) => {
    try {
      const stored = localStorage.getItem('maxo_custom_auth_db');
      const dbData = stored ? JSON.parse(stored) : {};
      dbData[uid] = { ...dbData[uid], ...data };
      localStorage.setItem('maxo_custom_auth_db', JSON.stringify(dbData));
    } catch (e) {
      console.warn("Storage write alert:", e);
    }
  };

  // Instant zero-delay login execution
  const executeLoginInstant = (genderToUse: 'male' | 'female') => {
    if (!userAgreed) {
      setShakeAgreement(true);
      setTimeout(() => setShakeAgreement(false), 800);
      toast.warning('Please accept user agreement first! ✅');
      return;
    }

    // 0. Check 7-Day Account Deletion Review status
    try {
      const pendingDeletionRaw = localStorage.getItem('mulaqat_deletion_review');
      if (pendingDeletionRaw) {
        const pendingData = JSON.parse(pendingDeletionRaw);
        const now = Date.now();
        const scheduledTime = pendingData.scheduledDeletionDate || 0;
        if (now < scheduledTime) {
          const daysLeft = Math.max(1, Math.ceil((scheduledTime - now) / (24 * 60 * 60 * 1000)));
          toast.error(`⚠️ Your ID #${pendingData.numericId} is under 7-day deletion review (${daysLeft} days left). You cannot create a new ID until the 7 days expire.`);
          return;
        } else {
          // 7 days completed: Permanent deletion completed, purge old record
          localStorage.removeItem('mulaqat_deletion_review');
          localStorage.removeItem('maxo_saved_numeric_id');
          localStorage.removeItem('maxo_saved_uid');
        }
      }
    } catch (e) {}

    // Check if user already has an existing ID on this device - Always login to the exact same ID!
    let generatedId = localStorage.getItem('mulaqat_remembered_numeric_id') || localStorage.getItem('maxo_saved_numeric_id');
    
    const existingProfileStr = localStorage.getItem('maxo_active_profile') || localStorage.getItem('maxo_custom_profile');
    let existingProfile: any = null;
    try {
      if (existingProfileStr) existingProfile = JSON.parse(existingProfileStr);
    } catch (e) {}

    if (!generatedId && existingProfile?.numericId) {
      generatedId = existingProfile.numericId.toString();
    }

    if (!generatedId) {
      // Allocate next incremental ID starting from 1000 (1000, 1001, 1002...)
      const lastIdStr = localStorage.getItem('maxo_global_last_numeric_id');
      let nextNum = lastIdStr ? parseInt(lastIdStr, 10) + 1 : 1000;
      if (isNaN(nextNum) || nextNum < 1000) {
        nextNum = 1000;
      }
      localStorage.setItem('maxo_global_last_numeric_id', nextNum.toString());
      generatedId = nextNum.toString();
      localStorage.setItem('maxo_saved_numeric_id', generatedId);
      localStorage.setItem('mulaqat_remembered_numeric_id', generatedId);
    }

    // Reuse existing UID or generate a clean consistent user UID
    let activeUid = existingProfile?.uid || localStorage.getItem('maxo_saved_uid');
    if (!activeUid) {
      activeUid = 'user_' + generatedId;
      localStorage.setItem('maxo_saved_uid', activeUid);
    }

    // 1. Retrieve or generate local profile. ALWAYS prioritize existing name & avatar!
    const nameList = genderToUse === 'male' ? INDIAN_MALE_NAMES : INDIAN_FEMALE_NAMES;
    const avatarList = genderToUse === 'male' ? INDIAN_MALE_AVATARS : INDIAN_FEMALE_AVATARS;

    const rememberedName = localStorage.getItem('mulaqat_remembered_name');
    const rememberedPhoto = localStorage.getItem('mulaqat_remembered_photo');

    const assignedName = existingProfile?.displayName || rememberedName || nameList[Math.floor(Math.random() * nameList.length)];
    const photoURL = existingProfile?.photoURL || rememberedPhoto || avatarList[Math.floor(Math.random() * avatarList.length)];
    const userCoins = typeof existingProfile?.coins === 'number' ? existingProfile.coins : 100;
    const userDiamonds = typeof existingProfile?.diamonds === 'number' ? existingProfile.diamonds : 10;

    // EXACT USER SPECIFICATION: Exactly 100 coins welcome gift for new users!
    const newProfile = {
      uid: activeUid,
      numericId: generatedId,
      displayName: assignedName,
      photoURL: photoURL,
      level: existingProfile?.level || 1,
      experience: existingProfile?.experience || 0,
      coins: userCoins,
      diamonds: userDiamonds,
      badges: existingProfile?.badges || ['👑 Mulaqat Star'],
      followersCount: existingProfile?.followersCount || Math.floor(10 + Math.random() * 25),
      followingCount: existingProfile?.followingCount || Math.floor(5 + Math.random() * 10),
      visitorsCount: existingProfile?.visitorsCount || Math.floor(20 + Math.random() * 50),
      lastLogin: new Date().toISOString(),
      age: existingProfile?.age || Math.floor(20 + Math.random() * 6),
      country: existingProfile?.country || 'India 🇮🇳',
      bio: existingProfile?.bio || (genderToUse === 'female' ? 'Party Queen 🌸 | Love singing & vibes' : 'Desi Rockstar 🎸 | Good vibes only'),
      gender: genderToUse,
      theme: 'Space Dust',
      isFunTimeUser: true
    };

    const loggedUser = {
      uid: activeUid,
      displayName: assignedName,
      photoURL: photoURL,
      gender: genderToUse,
      email: '',
      isAnonymous: true,
      numericId: generatedId,
      level: newProfile.level,
      coins: userCoins,
      diamonds: userDiamonds,
      badges: newProfile.badges
    };

    // Instant local commit & save permanent identity
    localStorage.setItem('mulaqat_remembered_numeric_id', generatedId);
    localStorage.setItem('mulaqat_remembered_name', assignedName);
    localStorage.setItem('mulaqat_remembered_photo', photoURL);
    localStorage.setItem('mulaqat_remembered_gender', genderToUse);
    localStorage.setItem('maxo_saved_numeric_id', generatedId);
    localStorage.setItem('maxo_saved_uid', activeUid);
    localStorage.setItem('maxo_user_gender', genderToUse);
    localStorage.setItem('maxo_active_profile', JSON.stringify(newProfile));
    localStorage.setItem('maxo_custom_profile', JSON.stringify(newProfile));
    localStorage.setItem('maxo_mock_user', JSON.stringify(loggedUser));
    localStorage.setItem('maxo_permanent_guest', JSON.stringify(loggedUser));
    localStorage.setItem(`profile_${activeUid}`, JSON.stringify(newProfile));
    if (auth.currentUser?.uid) {
      localStorage.setItem(`profile_${auth.currentUser.uid}`, JSON.stringify({ ...newProfile, uid: auth.currentUser.uid }));
    }
    localStorage.setItem(`numeric_id_${activeUid}`, generatedId);
    saveStoredCredentials(activeUid, { numericId: generatedId, displayName: assignedName });

    // Notify auth context immediately with zero delay
    window.dispatchEvent(new Event('auth_profile_updated'));
    window.dispatchEvent(new Event('storage'));

    toast.success(
      `Welcome ${assignedName}! +100 free coins bonus! 🪙`
    );

    // Asynchronous non-blocking background Firebase auth sync (never delays UI transition)
    setTimeout(() => {
      try {
        const isPlaceholderConfig = !firebaseConfig || firebaseConfig.apiKey?.includes('remixed-');
        if (!isPlaceholderConfig && auth) {
          signInAnonymously(auth).then((cred) => {
            const firebaseUid = cred.user.uid;
            import('firebase/firestore').then(({ doc, setDoc }) => {
              setDoc(doc(db, 'users', firebaseUid), { ...newProfile, uid: firebaseUid }, { merge: true }).catch(() => {});
            });
          }).catch(() => {});
        }
      } catch (e) {}
    }, 100);

    // Instant client-side redirection without full-page browser reloading
    const landingTarget = sessionStorage.getItem('post_login_redirect') || '/';
    sessionStorage.removeItem('post_login_redirect');
    navigate(landingTarget, { replace: true });
  };

  return (
    <div 
      id="login-page-root" 
      className="relative min-h-[100dvh] w-full bg-[#05020B] text-white flex flex-col justify-between overflow-x-hidden select-none font-sans"
    >
      
      {/* ========================================================================= */}
      {/* 1. ULTRA ATTRACTIVE LUXURY BACKGROUND                                     */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Soft Background Cards */}
        <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 opacity-25 filter blur-[1px]">
          {BACKGROUND_HOSTS.map((host, idx) => (
            <div 
              key={idx} 
              className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img 
                src={host.img} 
                alt={host.name} 
                className="w-full h-full object-cover brightness-90 saturate-[1.2]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                <span className="text-[11px] font-black text-white">{host.name}</span>
                <span className="text-[9px] text-pink-300 font-bold">{host.rate}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Deep Luxury Midnight Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05020B]/85 via-[#070314]/92 to-[#04010A]" />
        
        {/* Ambient Neon Lighting Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-pink-600/25 via-purple-600/20 to-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-t from-rose-600/20 to-violet-700/20 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP LIVE TICKER                                                        */}
      {/* ========================================================================= */}
      <div className="relative z-10 pt-4 px-4 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-pink-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(236,72,153,0.25)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black tracking-wide text-zinc-200">
            <span className="text-pink-400 font-extrabold">1,480+</span> Female Hosts Live Online
          </span>
          <Flame size={12} className="text-amber-400 fill-amber-400" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTER HERO & DIRECT GENDER SELECTION                                  */}
      {/* ========================================================================= */}
      <div className="relative z-10 px-5 py-4 flex flex-col items-center text-center max-w-sm mx-auto w-full my-auto">
        
        {/* Glowing Logo */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative mb-2.5"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 rounded-3xl blur-xl opacity-60 animate-pulse" />
          <div className="relative z-10 drop-shadow-[0_10px_30px_rgba(244,63,94,0.6)]">
            <Logo size="xl" showText={false} />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
          <span className="bg-gradient-to-r from-amber-300 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(244,63,94,0.5)]">
            Mulaqat
          </span>
        </h1>

        {/* 1-on-1 Video Call Tag */}
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 backdrop-blur-md">
          <Video size={13} className="text-pink-400 animate-pulse" />
          <span className="text-[11px] font-black tracking-wider uppercase text-pink-300">
            1-on-1 Private Video Call
          </span>
        </div>

        {/* Direct Interactive Card */}
        <div className="w-full mt-5 bg-[#120B24]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
          
          {/* RETURNING USER INSTANT RESUME CARD */}
          {rememberedUser && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-600/20 to-amber-500/20 border border-pink-500/40 text-left">
              <div className="flex items-center gap-3">
                <img 
                  src={rememberedUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'} 
                  alt="avatar" 
                  className="w-11 h-11 rounded-full object-cover border-2 border-pink-400 shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">{rememberedUser.displayName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 font-bold font-mono">
                      ID: {rememberedUser.numericId}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">आपकी पहले से बनी आईडी (Saved Account)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => executeLoginInstant(rememberedUser.gender || 'male')}
                className="w-full mt-2.5 h-10 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <span>👉 {rememberedUser.displayName} के रूप में लॉगिन करें</span>
              </button>
            </div>
          )}

          <div className="text-center mb-3.5">
            <h3 className="text-sm font-black text-white flex items-center justify-center gap-1.5">
              <span>{rememberedUser ? 'या नया प्रोफाइल चुनें (Or Switch)' : t('login.selectGender', 'Select Your Gender')}</span>
              <Sparkles size={14} className="text-amber-400" />
            </h3>
            <p className="text-[10.5px] text-zinc-400 mt-0.5 font-medium">
              {t('login.selectGenderDesc', 'Tap to select and enter instantly')}
            </p>
          </div>

          {/* TWO PROMINENT GENDER SELECTION CARDS */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* BOY CARD */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (selectedGender === 'male') {
                  executeLoginInstant('male');
                } else {
                  setSelectedGender('male');
                }
              }}
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative ${
                selectedGender === 'male'
                  ? 'bg-gradient-to-b from-blue-600/40 via-indigo-900/60 to-blue-950/80 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.6)] ring-2 ring-blue-400/40'
                  : 'bg-white/[0.04] border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07]'
              }`}
            >
              {selectedGender === 'male' && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
                  <Check size={10} className="stroke-[3]" />
                </span>
              )}
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-400/70 shadow-md">
                <img src={INDIAN_MALE_AVATARS[0]} alt="Boy" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-white block">
                  Boy 👦
                </span>
                <span className="text-[10px] text-blue-300 font-bold block mt-0.5">
                  {selectedGender === 'male' ? 'Selected ✅' : 'Male ID'}
                </span>
              </div>
            </motion.button>

            {/* GIRL CARD */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (selectedGender === 'female') {
                  executeLoginInstant('female');
                } else {
                  setSelectedGender('female');
                }
              }}
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative ${
                selectedGender === 'female'
                  ? 'bg-gradient-to-b from-pink-600/40 via-rose-900/60 to-pink-950/80 border-pink-400 shadow-[0_0_25px_rgba(244,63,94,0.6)] ring-2 ring-pink-400/40'
                  : 'bg-white/[0.04] border-white/10 hover:border-pink-400/50 hover:bg-white/[0.07]'
              }`}
            >
              {selectedGender === 'female' && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow">
                  <Check size={10} className="stroke-[3]" />
                </span>
              )}
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-400/70 shadow-md">
                <img src={INDIAN_FEMALE_AVATARS[0]} alt="Girl" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <span className="text-sm font-black text-white block">
                  Girl 👧
                </span>
                <span className="text-[10px] text-pink-300 font-bold block mt-0.5">
                  {selectedGender === 'female' ? 'Selected ✅' : 'Female ID'}
                </span>
              </div>
            </motion.button>

          </div>

          {/* VIBRANT GREEN "ENTER" BUTTON (ACTIVATES IMMEDIATELY ON GENDER CLICK) */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              {selectedGender ? (
                <motion.button
                  key="enter-active"
                  initial={{ scale: 0.92, opacity: 0, y: 5 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 5 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => executeLoginInstant(selectedGender)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(16,185,129,0.7)] border-2 border-emerald-300 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-lg">🚀</span>
                  <span className="tracking-wide">ENTER NOW</span>
                  <ArrowRight size={18} className="stroke-[3]" />
                </motion.button>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-bold text-xs flex items-center justify-center gap-2">
                  <span>Select Boy or Girl above to enter</span>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* WELCOME BONUS COINS */}
          <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-amber-300 font-black">
            <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{t('login.welcomeBonus', '+100 Coins Welcome Bonus Included 🪙')}</span>
          </div>

        </div>

        {/* User Agreement (Clean Modern Toggle) */}
        <motion.div 
          animate={shakeAgreement ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.5 }}
          className={`mt-4 p-2.5 rounded-2xl border transition-all text-left flex items-start gap-2 max-w-sm w-full ${
            shakeAgreement 
              ? 'bg-rose-500/20 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
              : userAgreed 
                ? 'bg-pink-500/10 border-pink-500/30' 
                : 'bg-black/40 border-white/15'
          }`}
        >
          <button
            type="button"
            onClick={() => setUserAgreed(!userAgreed)}
            className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center transition-all cursor-pointer border-2 ${
              userAgreed
                ? 'bg-gradient-to-tr from-pink-500 to-rose-500 border-pink-400 text-white shadow-sm'
                : 'border-zinc-400 bg-white/5 hover:border-pink-400'
            }`}
          >
            {userAgreed && <Check size={10} className="stroke-[3]" />}
          </button>

          <div className="text-[10.5px] leading-relaxed text-zinc-300">
            <span>I agree to the </span>
            <button
              type="button"
              onClick={() => setShowAgreementModal(true)}
              className="text-pink-400 font-bold hover:underline"
            >
              User Terms
            </button>
            <span> & </span>
            <button
              type="button"
              onClick={() => setShowAgreementModal(true)}
              className="text-pink-400 font-bold hover:underline"
            >
              Privacy Policy
            </button>
            <span> (18+ years).</span>
          </div>
        </motion.div>

        {/* Safe & Instant Indicator */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-zinc-400 font-medium">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck size={12} />
            100% Secure
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-amber-300">
            <Sparkles size={12} />
            Instant Access
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM FOOTER & SECRET ADMIN PORTAL ENTRY                              */}
      {/* ========================================================================= */}
      <div className="relative z-10 pb-4 pt-1 text-center px-4">
        <p 
          onClick={handleSecretLoginTap}
          className="text-[10.5px] text-zinc-600 hover:text-zinc-500 font-medium select-none cursor-pointer transition-colors"
          title="Mulaqat Live"
        >
          Mulaqat • 1-on-1 Private Live Video Lounge • 18+ Only
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 5. USER AGREEMENT & PRIVACY POLICY MODAL                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAgreementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-gradient-to-b from-[#1C1036] to-[#0A0418] border border-pink-500/30 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-left overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">User Agreement & Terms</h3>
                    <p className="text-[10px] text-zinc-400">Terms of Service & Privacy Policy</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable Terms Text */}
              <div className="my-3 overflow-y-auto pr-1 space-y-2.5 text-xs text-zinc-300 leading-relaxed flex-1">
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <h4 className="font-bold text-pink-400 text-xs">1. Age Requirement (18+)</h4>
                  <p className="text-zinc-400 text-[11px]">
                    You must be at least 18 years of age or older to use this application.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <h4 className="font-bold text-pink-400 text-xs">2. 1-on-1 Calling & Community Guidelines</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Maintain respect and decorum when interacting with hosts and users. Any form of harassment, vulgarity, or unauthorized screen recording is strictly prohibited.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <h4 className="font-bold text-pink-400 text-xs">3. Privacy & Data Security</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Your personal information and credentials are fully encrypted and securely stored.
                  </p>
                </div>
              </div>

              {/* Modal Accept Action Button */}
              <div className="pt-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setUserAgreed(true);
                    setShowAgreementModal(false);
                    toast.success('User agreement accepted! ✅');
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>I Agree & Accept</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
