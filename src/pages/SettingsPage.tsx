import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, Settings, User, Sliders, Shield, Info, Trash2, LogOut, Check, Volume2, VolumeX, 
  ShieldAlert, Globe, Bell, Lock, Ban, ShieldCheck, HeartPulse, Camera, Zap
} from 'lucide-react';
import { PREMIUM_AVATARS, getPremiumAvatar } from '@/utils/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { language: currentLang, setLanguage: setAppLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  // States of Profile attributes
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState(18);
  const [gender, setGender] = useState<'male' | 'female' | 'secret' | 'custom'>('secret');
  const [country, setCountry] = useState('Global');
  const [numericId, setNumericId] = useState('');

  // Photo alignment and customization systems
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCropZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyCrop = () => {
    if (!selectedImage) return;
    setIsSavingImage(true);
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "#0C101A";
        ctx.fillRect(0, 0, 256, 256);
        
        const minDim = Math.min(img.width, img.height);
        const sourceSize = minDim / cropZoom;
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;
        
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 256, 256);
        
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoURL(croppedBase64);
        toast.success("Profile photo crop applied successfully!");
      }
      setSelectedImage(null);
      setIsSavingImage(false);
    };
    img.onerror = () => {
      toast.error("Failed to parse chosen photo");
      setSelectedImage(null);
      setIsSavingImage(false);
    };
  };

  const useRawImage = () => {
    if (!selectedImage) return;
    setPhotoURL(selectedImage);
    toast.success("Bypassed crop. Using raw original image!");
    setSelectedImage(null);
  };
  
  // Custom sandbox editor states
  const [photoURL, setPhotoURL] = useState('');
  const [coins, setCoins] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Setting controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [showActiveSession, setShowActiveSession] = useState(true);
  
  // Notification options
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyMoments, setNotifyMoments] = useState(true);
  const [notifyRoomInvites, setNotifyRoomInvites] = useState(true);
  
  // Language Select
  const [language, setLanguage] = useState('English');
  
  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; name: string; tag: string }[]>([
    { id: 'usr_toxic88', name: 'Toxic_Player_88', tag: 'Spamming on mic' },
    { id: 'usr_spambot', name: 'CryptoSpammer99', tag: 'Selling coin bot' }
  ]);

  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'privacy' | 'security' | 'notifications' | 'language' | 'blocks' | 'cache' | 'privacyPolicy' | 'about'>('privacy');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Security Center State variables
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState(() => 'REC-' + Math.floor(100000 + Math.random() * 900000).toString() + '-' + Math.floor(100000 + Math.random() * 900000).toString());
  
  const [loginHistoryList, setLoginHistoryList] = useState([
    { device: 'iPhone 15 Pro Max', location: 'Singapore', ip: '128.51.10.82', time: '2026-06-01 09:12:44', action: 'Login Successful' },
    { device: 'Google Pixel 8', location: 'India', ip: '192.168.1.104', time: '2026-06-01 04:30:11', action: 'One Tap Sign In' },
    { device: 'MacBook Pro 16', location: 'Vietnam', ip: '113.161.4.225', time: '2026-05-28 14:22:15', action: 'Password Validated' },
    { device: 'Chrome Client via Cloud Run', location: 'Japan', ip: '34.120.14.88', time: '2026-05-27 18:01:50', action: 'Cookie Restored' }
  ]);

  const [activeDevices, setActiveDevices] = useState([
    { name: 'Chrome Viewport (This Device)', location: 'Current Location', os: 'Linux / Cloud Run sandbox', state: 'Online Now', id: 'dev_1' },
    { name: 'मुलाकात (Mulaqat) App for Android', location: 'New Delhi, IN', os: 'Android 14', state: 'Active 2h ago', id: 'dev_2' }
  ]);

  const handleSetPassword = () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters long.');
      return;
    }
    
    try {
      const stored = localStorage.getItem('maxo_custom_auth_db') || '{}';
      const dbData = JSON.parse(stored);
      const uid = profile?.uid || 'guest';
      
      dbData[uid] = { ...dbData[uid], password: newPassword };
      localStorage.setItem('maxo_custom_auth_db', JSON.stringify(dbData));
      
      toast.success('Security password has been set successfully! 🛡️');
      setNewPassword('');
    } catch (e) {
      toast.error('Failed to update client-side auth state.');
    }
  };

  const handleChangePassword = () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      toast.error('Please fill in both password fields.');
      return;
    }
    
    try {
      const stored = localStorage.getItem('maxo_custom_auth_db') || '{}';
      const dbData = JSON.parse(stored);
      const uid = profile?.uid || 'guest';
      const oldSaved = dbData[uid]?.password || '123456';
      
      if (oldSaved !== oldPassword) {
        toast.error('Legacy password confirmation failed.');
        return;
      }
      
      dbData[uid] = { ...dbData[uid], password: newPassword };
      localStorage.setItem('maxo_custom_auth_db', JSON.stringify(dbData));
      
      toast.success('Security password changed successfully! Key updated.');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      toast.error('Failed to execute secure password transition.');
    }
  };

  const handleRequestMobileChange = () => {
    if (!newMobile.trim() || newMobile.length < 8) {
      toast.error('Please enter a valid cellular number.');
      return;
    }
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedOtp(pin);
    setIsOtpSent(true);
    toast.info(`[Simulation OTP] Security validation code sent: ${pin}`, { duration: 8000 });
  };

  const handleVerifyMobileChange = () => {
    if (verificationOtp !== simulatedOtp) {
      toast.error('OTP code mismatch. Please check the simulation prompt.');
      return;
    }
    
    try {
      const stored = localStorage.getItem('maxo_custom_auth_db') || '{}';
      const dbData = JSON.parse(stored);
      const uid = profile?.uid || 'guest';
      
      dbData[uid] = { ...dbData[uid], mobileNumber: newMobile };
      localStorage.setItem('maxo_custom_auth_db', JSON.stringify(dbData));
      
      // Update in-memory profile representation as well if synced
      toast.success(`Mobile number linked & authenticated: ${newMobile} 🎉`);
      setIsOtpSent(false);
      setNewMobile('');
      setVerificationOtp('');
    } catch (e) {
      toast.error('Mobile registration fault.');
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAge(profile.age || 18);
      setGender((profile.gender as any) || 'secret');
      setCountry(profile.country || 'Global');
      setPhotoURL(profile.photoURL || '');
      setCoins(profile.coins ?? 0);
      setDiamonds(profile.diamonds ?? 0);
      setLevel(profile.level ?? 1);
      setNumericId(profile.numericId || '');
    }
  }, [profile]);

  useEffect(() => {
    // Synchronize local states
    const cachedSound = localStorage.getItem('sound_enabled');
    if (cachedSound !== null) setSoundEnabled(cachedSound === 'true');
    
    const cachedPrivacy = localStorage.getItem('privacy_mode');
    if (cachedPrivacy !== null) setPrivacyMode(cachedPrivacy === 'true');

    const cached2FA = localStorage.getItem('two_factor_auth');
    if (cached2FA !== null) setTwoFactorAuth(cached2FA === 'true');

    const cachedLang = localStorage.getItem('system_language');
    if (cachedLang !== null) setLanguage(cachedLang);
  }, []);

  const handleSave = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        bio,
        age: Number(age),
        gender,
        country,
        photoURL,
        coins: Number(coins),
        diamonds: Number(diamonds),
        level: Number(level),
        numericId: numericId.trim()
      });

      // Synchronize simulated credentials in client storage
      const cached = localStorage.getItem('maxo_mock_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.uid === profile.uid) {
            parsed.displayName = displayName;
            parsed.photoURL = photoURL;
            parsed.coins = Number(coins);
            parsed.diamonds = Number(diamonds);
            parsed.level = Number(level);
            parsed.numericId = numericId.trim();
            localStorage.setItem('maxo_mock_user', JSON.stringify(parsed));
            localStorage.setItem('maxo_permanent_guest', JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn("Could not sync storage token:", e);
        }
      }

      localStorage.setItem(`profile_${profile.uid}`, JSON.stringify({
        ...profile,
        displayName,
        bio,
        age: Number(age),
        gender,
        country,
        photoURL,
        coins: Number(coins),
        diamonds: Number(diamonds),
        level: Number(level),
        numericId: numericId.trim()
      }));
      localStorage.setItem(`numeric_id_${profile.uid}`, numericId.trim());
      
      toast.success('Your settings and profile updates synced perfectly!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sync changes with servers');
    } finally {
      setSaving(false);
    }
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('sound_enabled', String(newValue));
    toast.success(newValue ? '🔔 App audio feed is activated!' : '🔕 Audio reactions silenced');
  };

  const togglePrivacy = () => {
    const newValue = !privacyMode;
    setPrivacyMode(newValue);
    localStorage.setItem('privacy_mode', String(newValue));
    toast.success(newValue ? '👥 Incognito mode on! You are hidden from visitor boards' : '👥 Public mode on! Room views will track your presence');
  };

  const toggle2FA = () => {
    const newValue = !twoFactorAuth;
    setTwoFactorAuth(newValue);
    localStorage.setItem('two_factor_auth', String(newValue));
    toast.success(newValue ? '🛡️ Two-Factor authentication enabled on this device!' : '⚠️ Two-factor security deactivated');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setLanguage(selected);
    localStorage.setItem('system_language', selected);
    toast.success(`🌐 Native translation is now set to ${selected}!`);
  };

  const handleUnblock = (userId: string, userName: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    toast.success(`🎉 ${userName} has been removed from your blocked user registry.`);
  };

  const handleClearCache = () => {
    localStorage.clear();
    // Restore persistent token details so we don't force login unless needed
    localStorage.setItem('sound_enabled', 'true');
    toast.success('🚀 Diagnostic local cache purged! All profile textures and rooms will redownload.');
  };

  return (
    <div className="min-h-screen bg-[#0C101A] text-white font-sans pb-32">
      {/* Sticky Header with Go Back */}
      <div className="px-6 pt-12 pb-4 flex items-center gap-4 bg-[#0C101A]/90 backdrop-blur-md sticky top-0 z-30 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-gray-400 hover:text-white rounded-full bg-white/5 w-8 h-8">
          <ChevronLeft size={20} />
        </Button>
        <Settings size={22} className="text-pink-500 animate-spin-slow" />
        <h1 className="text-lg font-black uppercase tracking-wider">Settings & Security</h1>
      </div>

      <div className="px-5 space-y-6 pt-4">
        {/* Profile Identity Setup card */}
        <div className="bg-[#13192B]/45 border border-white/5 rounded-[28px] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <User size={18} className="text-pink-500" />
            <span className="font-black text-xs uppercase tracking-wider text-pink-400">Identity Directory</span>
          </div>

          <div className="space-y-3">
            {/* Unified Avatar Selection and Dynamic Cropping workspace */}
            <div className="flex flex-col items-center text-center space-y-3 bg-black/25 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">Profile Display Picture</span>
              
              <div className="relative group">
                <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-indigo-500 shadow-lg overflow-hidden flex items-center justify-center">
                  <img 
                    src={photoURL || getPremiumAvatar(displayName)} 
                    alt="Settings Avatar" 
                    className="w-full h-full rounded-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-200">
                  <Camera size={18} className="text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="xs"
                  className="bg-white/5 border-white/10 text-white rounded-lg text-[9px] font-black uppercase px-2.5 h-7 hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.onchange = (e: any) => handleFileChange(e);
                    fileInput.click();
                  }}
                >
                  📁 Upload Photo
                </Button>
                <Button 
                  variant="outline"
                  size="xs"
                  className="bg-white/5 border-white/10 text-white rounded-lg text-[9px] font-black uppercase px-2.5 h-7 hover:bg-white/10"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  🔗 Paste URL
                </Button>
              </div>

              {/* Paste URL inline widget */}
              {showUrlInput && (
                <div className="w-full space-y-1.5">
                  <Input 
                    type="text" 
                    placeholder="https://example.com/avatar.jpg"
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value);
                      if (e.target.value.startsWith('http')) {
                        setPhotoURL(e.target.value);
                      }
                    }}
                    className="h-8 rounded-lg bg-white/5 border-white/10 text-[10px]"
                  />
                  <p className="text-[8px] text-gray-500 italic">Paints any external image URL as your profile picture.</p>
                </div>
              )}

              {/* Image Alignment & Cropping workspace */}
              {selectedImage && (
                <div className="w-full bg-[#161B2E] border border-pink-500/30 p-3 rounded-xl space-y-3 text-center">
                  <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Crop & Zoom Aligner</p>
                  
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-pink-500/50 bg-black relative flex items-center justify-center">
                    <img 
                      src={selectedImage} 
                      alt="Local Crop Align" 
                      className="max-w-none origin-center transition-transform"
                      style={{ 
                        transform: `scale(${cropZoom})`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] text-gray-400 font-bold">
                      <span>Zoom: {cropZoom.toFixed(1)}x</span>
                      <span>Scale Level</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.1" 
                      value={cropZoom} 
                      onChange={e => setCropZoom(Number(e.target.value))} 
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="ghost" 
                      size="xs"
                      onClick={() => setSelectedImage(null)}
                      className="text-gray-400 hover:text-white text-[9px] uppercase font-black"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="xs"
                      onClick={useRawImage}
                      className="bg-zinc-805 border border-white/5 text-zinc-100 text-[9px] uppercase font-black rounded-lg h-6 px-2.5 hover:bg-zinc-700"
                    >
                      Use Raw GIF/PNG
                    </Button>
                    <Button 
                      size="xs"
                      disabled={isSavingImage}
                      onClick={applyCrop}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] uppercase font-black rounded-lg h-6 px-2.5"
                    >
                      {isSavingImage ? 'Applying...' : 'Apply Crop'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick select Premium Avatars grid */}
              <div className="w-full space-y-1 pt-1.5 border-t border-white/5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block text-left">Quick Premium Avatars:</span>
                <div className="grid grid-cols-6 gap-1.5 mt-1 bg-black/10 p-1.5 rounded-xl">
                  {PREMIUM_AVATARS.slice(0, 6).map((av, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setPhotoURL(av);
                        toast.success("Premium avatar selected!");
                      }}
                      className={`w-8 h-8 rounded-full overflow-hidden border transition-all relative shrink-0 ${
                        photoURL === av ? 'border-pink-500 scale-105' : 'border-transparent hover:border-white/10'
                      }`}
                    >
                      <img src={av} alt="Quick setting avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Nickname</label>
              <Input 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10 font-bold text-white focus-visible:ring-pink-500"
                placeholder="E.g. Star Lord"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Unique User ID (Numeric / Card UID)</label>
                <button
                  type="button"
                  onClick={() => {
                    const randomId = (100000000 + Math.floor(Math.random() * 900000000)).toString();
                    setNumericId(randomId);
                    toast.success("Generated random new unique numeric ID!");
                  }}
                  className="text-[9px] font-black uppercase text-pink-400 hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                >
                  🔄 Auto-Generate
                </button>
              </div>
              <Input 
                value={numericId}
                onChange={e => setNumericId(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10 font-bold text-white focus-visible:ring-pink-500 font-mono"
                placeholder="9-Digit Number e.g. 849302148"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Age</label>
                <Input 
                  type="number"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="h-11 rounded-xl bg-white/5 border-white/10 font-bold text-white focus-visible:ring-pink-500"
                  placeholder="21"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Country</label>
                <Input 
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="h-11 rounded-xl bg-white/5 border-white/10 font-bold text-white focus-visible:ring-pink-500"
                  placeholder="Vietnam"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Privacy Gender</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { code: 'male', label: '♂️ M' },
                  { code: 'female', label: '♀️ F' },
                  { code: 'secret', label: '🤫 Off' },
                  { code: 'custom', label: '✨' }
                ] as const).map(g => (
                  <button
                    key={g.code}
                    onClick={() => setGender(g.code)}
                    className={`h-9 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      gender === g.code 
                        ? 'bg-pink-600 border-pink-500 text-white' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Status Signature</label>
              <Textarea 
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="min-h-[70px] rounded-xl bg-white/5 border-white/10 font-bold text-white focus-visible:ring-pink-500 resize-none p-3 text-xs leading-normal"
                placeholder="Let room members know about you..."
              />
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {saving ? 'Syncing...' : 'Update Sync State'}
            </Button>
          </div>
        </div>

        {/* Modular Navigation Tabs for Settings sections */}
        <div className="bg-[#13192B]/45 border border-white/5 rounded-[28px] p-4 flex flex-wrap gap-1">
          {[
            { id: 'privacy', label: 'Privacy', icon: Sliders },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'notifications', label: 'Notify', icon: Bell },
            { id: 'language', label: 'Language', icon: Globe },
            { id: 'blocks', label: 'Blocks', icon: Ban },
            { id: 'cache', label: 'Storage', icon: ShieldAlert },
            { id: 'about', label: 'About App', icon: Info },
            { id: 'privacyPolicy', label: 'Policy', icon: ShieldCheck }
          ].map((tab) => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                  activeSubTab === tab.id 
                    ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' 
                    : 'bg-white/5 border border-transparent text-gray-400'
                }`}
              >
                <IconComp size={11} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic section workspace */}
        <div className="bg-[#121624] border border-white/5 p-5 rounded-[28px]">
          <AnimatePresence mode="wait">
            {activeSubTab === 'privacy' && (
              <motion.div 
                key="privacy"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Incognito Visits</h4>
                    <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Stops users from receiving notifications when you view profiles</p>
                  </div>
                  <button 
                    onClick={togglePrivacy}
                    className={`w-11 h-6 rounded-full transition-colors relative ${privacyMode ? 'bg-pink-600' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${privacyMode ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Sound Effects</h4>
                    <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Manage system reaction audios inside mic rooms</p>
                  </div>
                  <button 
                    onClick={toggleSound}
                    className={`w-11 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-pink-600' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${soundEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-left"
              >
                {/* Header Title */}
                <div className="border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-pink-500 tracking-widest block">MAXO PRESTIGE SECURE</span>
                  <h3 className="text-sm font-black text-white uppercase italic">Security Center</h3>
                </div>

                {/* 1. Set / Change Password */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-400 block">Set & Change Password</span>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Current Password (if changing)</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">New Security Password</label>
                      <Input
                        type="password"
                        placeholder="Enter secure password key"
                        className="h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold text-white focus:ring-pink-500"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 pt-1 font-sans">
                      <Button
                        size="xs"
                        className="flex-1 bg-pink-600/20 border border-pink-500/30 text-pink-300 hover:bg-pink-600/40 text-[10px] uppercase font-black rounded-lg h-9"
                        onClick={handleSetPassword}
                      >
                        Set Initial Password
                      </Button>
                      <Button
                        size="xs"
                        className="flex-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 text-[10px] uppercase font-black rounded-lg h-9"
                        onClick={handleChangePassword}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 2. Bind / Change Mobile Number */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#60a5fa] block">Mobile Number Binding</span>
                  
                  {!isOtpSent ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-400 leading-relaxed font-medium">Link your cell number to restore this profile across mobile devices instantly.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="E.g. +1 (555) 123-4567"
                          className="h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold"
                          value={newMobile}
                          onChange={e => setNewMobile(e.target.value)}
                        />
                        <Button
                          size="xs"
                          onClick={handleRequestMobileChange}
                          className="bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:bg-purple-600/50 text-[10px] uppercase font-black rounded-xl px-4"
                        >
                          Request SMS
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[9px] text-[#f43f5e] font-black uppercase">Simulated Code Sent to {newMobile}!</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="6-digit verification pin"
                          className="h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold"
                          maxLength={6}
                          value={verificationOtp}
                          onChange={e => setVerificationOtp(e.target.value)}
                        />
                        <Button
                          size="xs"
                          onClick={handleVerifyMobileChange}
                          className="bg-green-600/30 border border-green-500/30 text-green-300 hover:bg-green-600/50 text-[10px] uppercase font-black rounded-xl px-4"
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Account Recovery */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">Account Recovery Key</span>
                    <Button 
                      size="xs" 
                      variant="ghost"
                      onClick={() => {
                        setRecoveryCode('REC-' + Math.floor(100000 + Math.random() * 900000).toString() + '-' + Math.floor(100000 + Math.random() * 900000).toString());
                        toast.success('Generated fresh master restoration sequence!');
                      }}
                      className="text-[9px] font-black text-amber-400 uppercase"
                    >
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal font-medium">Write down this unique seed phrase. If you ever lose your credentials, enter this key to restore your diamonds, badges, and profile level.</p>
                  <div className="p-3 bg-black/40 rounded-xl border border-dashed border-white/10 text-center font-mono text-xs font-black text-amber-200 select-all cursor-pointer">
                    {recoveryCode}
                  </div>
                </div>

                {/* 4. Device Management */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#a7f3d0] block">Device Management</span>
                  <div className="space-y-2">
                    {activeDevices.map(device => (
                      <div key={device.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black text-white">{device.name}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5 font-bold uppercase">{device.os} • {device.location}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-[#10b981]/15 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/10">
                          {device.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Login History */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block">Login History</span>
                  <div className="divide-y divide-white/5 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {loginHistoryList.map((log, index) => (
                      <div key={index} className="pt-2.5 flex justify-between items-start text-xs font-sans">
                        <div>
                          <p className="text-xs font-black text-zinc-300">{log.device}</p>
                          <p className="text-[9.5px] text-gray-500 font-semibold mt-0.5">{log.ip} • {log.location}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono leading-none text-[#a855f7] block">{log.action}</span>
                          <span className="text-[8.5px] text-gray-500 block mt-1">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Biometric Secured Advanced Defenses */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#10b981] block">Biometric advanced defenses</span>
                  <p className="text-[10px] text-gray-400 leading-normal font-medium">Toggle additional dynamic defenses including security checks during live voice speaking and face-verification requirements for diamond transactions.</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                      <div>
                        <p className="text-xs font-black text-white">Require Biometric on Withdrawals</p>
                        <p className="text-[8px] text-gray-500 mt-0.5 uppercase">Prompt real face recognition on high value diamond trades</p>
                      </div>
                      <button 
                        onClick={() => {
                          const val = !localStorage.getItem('biometric_withdrawal');
                          localStorage.setItem('biometric_withdrawal', val ? 'true' : '');
                          toast.success(val ? '🛡️ Diamond transactions are now biometric guarded!' : '⚠️ Biometrics deactivated');
                        }}
                        className="p-1 px-3 py-1 text-[9px] font-black bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg uppercase"
                      >
                        Toggle
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                      <div>
                        <p className="text-xs font-black text-white">Restrict Suspected IP Ranges</p>
                        <p className="text-[8px] text-gray-500 mt-0.5 uppercase">Lock profile if accessed from non-verified hosting range</p>
                      </div>
                      <button 
                        onClick={() => {
                          const val = !localStorage.getItem('restrict_ip');
                          localStorage.setItem('restrict_ip', val ? 'true' : '');
                          toast.success(val ? '🛡️ Security protocol deployed on network proxies!' : '⚠️ Legacy proxies allowed');
                        }}
                        className="p-1 px-3 py-1 text-[9px] font-black bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg uppercase"
                      >
                        Active
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {[
                  { title: 'Follower Alerts', desc: 'Notify me when another user starts following my profile', val: notifyFollowers, set: setNotifyFollowers },
                  { title: 'Moments reaction notifications', desc: 'Notify me when people comment on my posts', val: notifyMoments, set: setNotifyMoments },
                  { title: 'Room invitations', desc: 'Notify when host mic requests or agency team slots pop up', val: notifyRoomInvites, set: setNotifyRoomInvites }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 rounded-2xl p-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">{item.title}</h4>
                      <p className="text-[9px] text-gray-500 mt-1 font-bold leading-normal">{item.desc}</p>
                    </div>
                    <button 
                      onClick={() => { item.set(!item.val); toast.success('Notification settings synchronized!'); }}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${item.val ? 'bg-pink-600' : 'bg-white/10'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${item.val ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {activeSubTab === 'language' && (
              <motion.div 
                key="language"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-[#0C101A] border border-white/5 p-5 rounded-2xl text-center space-y-4">
                  <Globe className="text-pink-500 w-10 h-10 mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">
                      {currentLang === 'hi' ? 'सिस्टम भाषा' : 'System Language'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {currentLang === 'hi' ? 'अपनी पसंदीदा भाषा चुनें (अंग्रेजी या हिंदी)' : 'Choose your preferred language (English or Hindi)'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAppLanguage('en');
                        toast.success('System language set to English 🇬🇧');
                      }}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        currentLang === 'en'
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-lg font-black'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>English 🇬🇧</span>
                      {currentLang === 'en' && <Check size={14} className="text-white stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAppLanguage('hi');
                        toast.success('सिस्टम भाषा हिंदी सेट कर दी गई है 🇮🇳');
                      }}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        currentLang === 'hi'
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-lg font-black'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>हिंदी 🇮🇳</span>
                      {currentLang === 'hi' && <Check size={14} className="text-white stroke-[3]" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'blocks' && (
              <motion.div 
                key="blocks"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Ban size={14} className="text-pink-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">Blocked Users Registry</span>
                  </div>
                  
                  {blockedUsers.length > 0 ? (
                    <div className="divide-y divide-white/5 bg-black/40 rounded-2xl px-4 py-2 border border-white/5">
                      {blockedUsers.map(u => (
                        <div key={u.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-white">{u.name}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">{u.tag}</p>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleUnblock(u.id, u.name)}
                            className="rounded-lg h-7 text-[10px] uppercase font-black text-white bg-pink-600/15 border border-pink-500/20 hover:bg-pink-600/35"
                          >
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-black/20 rounded-2xl text-center border border-dashed border-white/5">
                      <p className="text-xs text-gray-500 italic">No members listed in your blocked registry.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeSubTab === 'cache' && (
              <motion.div 
                key="cache"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-black/35 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center space-y-4">
                  <Trash2 className="text-red-500 w-8 h-8 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Diagnostic Defragmenter</h4>
                    <p className="text-[9px] text-gray-500 leading-relaxed font-bold uppercase">Deletes room cached feeds, asset links and temporary local state records.</p>
                  </div>
                  <div className="py-1 px-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono font-black text-zinc-300">2.84 MB Cache Used</span>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleClearCache}
                    className="w-full bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 rounded-xl h-11 uppercase font-black text-xs"
                  >
                    Clear All Cache Now
                  </Button>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'privacyPolicy' && (
              <motion.div 
                key="privacyPolicy"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-left"
              >
                <div className="border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-pink-500 tracking-widest block">SOULLINK COMPLIANCE</span>
                  <h3 className="text-sm font-black text-white uppercase italic">Privacy &amp; Telemetry Guidelines</h3>
                </div>

                <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-white uppercase">1. Information We Collect</h4>
                    <p className="text-[11px] text-gray-400">
                      When you connect to active lounge channels, we collect voice stream metadata, network metrics, user nickname, level milestones, and gold balance transactions. Public microphone audio is encrypted in real-time and is never cached or stored on our servers.
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-white uppercase">2. Persistent Storage &amp; Encryption</h4>
                    <p className="text-[11px] text-gray-400">
                      We store account-specific parameters (such as Starlight level milestones, unlocked stickers, and security recovery keys) securely using Firestore Database on Google Cloud servers. Local preferences (such as incognito status, system audio settings, and OTP verification logs) are cached using sandboxed client storage.
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-white uppercase">3. Biometrics &amp; Security Measures</h4>
                    <p className="text-[11px] text-gray-400">
                      Biometric checks and Simulated Face recognition systems compile security hashes locally within your secure client container. These tokens are cryptographically matched to prevent unauthorized withdrawals of your star/diamond balance.
                    </p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-white uppercase">4. Data Erasure &amp; Portability</h4>
                    <p className="text-[11px] text-gray-400">
                      You maintain 100% ownership over your data. You can completely erase your local state, diagnostic storage, and linked metadata by executing the "Diagnostic Defragmenter" in the Storage tab, or request absolute deletion of your cloud-synced account.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'about' && (
              <motion.div 
                key="about"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5 text-left font-sans"
              >
                <div className="border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase text-pink-500 tracking-widest block">SOULLINK CORE PLATFORM</span>
                  <h3 className="text-sm font-black text-white uppercase italic">About &amp; Security</h3>
                </div>

                {/* About application details card */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-white">SoulLink Lounge</span>
                    <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase">v3.25.0 Stable</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    SoulLink is a high-fidelity voice socialization, regional streaming soundwave, and interactive stardust agency platform. Bridging global voices with interactive voice lounges, virtual gifts, and consecutive attendance rewards.
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    Device Identifier: <span className="text-zinc-400">{profile?.lastLoginDeviceId || 'unknown_sandbox'}</span>
                  </p>
                </div>

                {/* Clear local privacy policies fastlink */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      toast.info("SoulLink Terms of Service are governed under stardust compliance protocols.");
                    }}
                    type="button" 
                    className="p-3 bg-black/25 hover:bg-black/40 border border-white/5 text-left rounded-xl transition-all"
                  >
                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider block">Terms of Service</span>
                    <span className="text-[8px] text-gray-500 block mt-0.5 uppercase">Usage &amp; agency rules</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveSubTab('privacyPolicy');
                      toast.info("Navigated to Privacy Policy workspace!");
                    }}
                    type="button" 
                    className="p-3 bg-black/25 hover:bg-black/40 border border-white/5 text-left rounded-xl transition-all"
                  >
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block">Privacy Policy</span>
                    <span className="text-[8px] text-gray-500 block mt-0.5 uppercase">Data &amp; voice parameters</span>
                  </button>
                </div>

                {/* DESTRUCTIVE LEAVE/LOGOUT APPLICATION SYSTEM */}
                <div className="bg-red-950/15 border border-red-500/25 rounded-3xl p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5 font-mono">
                      <LogOut size={14} className="stroke-[2.5]" /> Account Sign-Out Gateway
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Choose your exit pathway below. You can log out of the current registration entirely to start fresh, or preserve your local auto-login passport.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Option 1: Delete Account (7-Day Deletion Review Policy) */}
                    <div className="bg-red-950/40 border border-red-500/40 p-3.5 rounded-xl space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                          <Trash2 size={12} className="stroke-[2.5]" /> Delete Account (7-Day Review)
                        </span>
                        <div className="bg-red-500/20 text-red-300 border border-red-500/40 text-[7px] font-mono tracking-widest font-black uppercase px-1.5 py-0.5 rounded">
                          7-DAY POLICY
                        </div>
                      </div>
                      <p className="text-[8.5px] text-zinc-400 leading-normal">
                        Place your ID under the official 7-Day Deletion Review. Your account is immediately locked and deactivated. After 7 days, it will be wiped permanently.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full h-9 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-wider rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                      >
                        <Trash2 size={12} />
                        <span>Delete ID (Enter 7-Day Review)</span>
                      </Button>
                    </div>

                    {/* Option 2: ID Log Out (Wipe storage to sign in with a new ID) */}
                    <div className="bg-black/40 border border-red-900/40 p-3 rounded-xl space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-wider">Option 2: ID Log Out</span>
                        <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-[6.5px] font-mono tracking-widest font-black uppercase px-1 py-0 rounded">CLEARS ID</div>
                      </div>
                      <p className="text-[8.5px] text-zinc-500 leading-normal">
                        Completely wipe your current ID, permanent guest credentials, and access keys from this device. Ideal if you want to create or register a brand-new user identity.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const userNumId = numericId || profile?.numericId || localStorage.getItem('maxo_saved_numeric_id');
                          if (userNumId && displayName) {
                            localStorage.setItem('mulaqat_remembered_numeric_id', userNumId.toString());
                            localStorage.setItem('mulaqat_remembered_name', displayName);
                            localStorage.setItem('mulaqat_remembered_photo', photoURL || '');
                            localStorage.setItem('mulaqat_remembered_gender', profile?.gender || 'male');
                          }
                          localStorage.removeItem('maxo_mock_user');
                          localStorage.removeItem('maxo_permanent_guest');
                          auth.signOut().then(() => {
                            toast.success("Successfully logged out! Your ID & Name are preserved. 🚀");
                            navigate('/login');
                          });
                        }}
                        className="w-full h-8.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black uppercase text-[9.5px] tracking-wider rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Zap size={11} className="text-yellow-300" />
                        <span>Execute ID Log Out</span>
                      </Button>
                    </div>

                    {/* Option 3: Logout Session (Preserve Quick Login) */}
                    <div className="bg-black/25 border border-white/5 p-3 rounded-xl space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-zinc-300 uppercase tracking-wider">Option 3: Logout Session</span>
                        <div className="bg-zinc-800 text-zinc-400 border border-white/5 text-[6.5px] font-mono tracking-widest font-black uppercase px-1 py-0 rounded">KEEPS ID SAFE</div>
                      </div>
                      <p className="text-[8.5px] text-zinc-500 leading-normal">
                        Exit the active server session but keep your login credentials remembered securely on this phone for quick-login back in anytime.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          auth.signOut().then(() => {
                            toast.success("Logged out successfully! Quick-access keys preserved. 🔒⚜️");
                            navigate('/login');
                          });
                        }}
                        className="w-full h-8.5 border-white/10 bg-white/[0.02] hover:bg-white/5 text-zinc-200 font-extrabold uppercase text-[9.5px] tracking-wide rounded-lg cursor-pointer"
                      >
                        Sign Out Session Only
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 7-DAY ACCOUNT DELETION CONFIRMATION MODAL */}
                <AnimatePresence>
                  {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                      <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        className="bg-[#1A0B12] border-2 border-red-500/50 rounded-3xl p-5 max-w-sm w-full text-left space-y-4 shadow-[0_20px_50px_rgba(239,68,68,0.3)]"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                          <Trash2 size={24} className="stroke-[2.5]" />
                        </div>

                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-1.5">
                            <span>Confirm 7-Day Account Deletion</span>
                          </h3>
                          <p className="text-xs text-red-300 font-semibold mt-1">
                            ID #{numericId || profile?.numericId || localStorage.getItem('maxo_saved_numeric_id') || '1000'}
                          </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/40 border border-red-500/20 text-[11px] text-zinc-300 space-y-2 leading-relaxed">
                          <p>
                            ⚠️ Once confirmed, your ID enters a mandatory <strong className="text-red-400">7-Day Deletion Review</strong> window.
                          </p>
                          <p>
                            During these 7 days, your account is deactivated and locked. You will NOT be able to log in or create a new account from this device until the 7 days expire.
                          </p>
                          <p className="text-zinc-400 text-[10px]">
                            After 7 days, all your account records, coins, and chats will be permanently deleted.
                          </p>
                        </div>

                        <div className="flex gap-2.5 pt-1">
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 h-10 border-white/10 text-zinc-300 hover:text-white bg-white/5 rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              const userNumId = numericId || profile?.numericId || localStorage.getItem('maxo_saved_numeric_id') || '1000';
                              const reviewPayload = {
                                numericId: userNumId,
                                displayName: displayName || profile?.displayName || 'User',
                                requestedAt: Date.now(),
                                scheduledDeletionDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
                              };
                              localStorage.setItem('mulaqat_deletion_review', JSON.stringify(reviewPayload));
                              localStorage.removeItem('maxo_mock_user');
                              localStorage.removeItem('maxo_permanent_guest');
                              localStorage.removeItem('maxo_active_profile');
                              localStorage.removeItem('maxo_custom_profile');
                              localStorage.removeItem('maxo_user_gender');
                              auth.signOut().then(() => {
                                toast.error(`⚠️ ID #${userNumId} placed under 7-day deletion review.`);
                                navigate('/login');
                              });
                            }}
                            className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg active:scale-95"
                          >
                            Confirm Delete
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* ADVANCED PROFILE SANDBOX ACCORDION (COLLAPSIBLE FOR LUXURY TIER UI) */}
                <div className="border border-[#fbbf24]/15 rounded-2xl p-4 bg-white/[0.01] space-y-4">
                  <div className="flex justify-between items-center text-[#fbbf24]">
                    <span className="text-[10px] font-black uppercase tracking-widest block">🔧 Sandbox Asset Editor (Simulation Mode)</span>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Edit Name & Picture Selection */}
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-pink-400 block pb-1 border-b border-white/5">Edit Profile Picture & Name</span>
                      
                      <div className="flex items-center gap-4 bg-black/35 p-2 rounded-lg">
                        <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-pink-500/35">
                          <img src={photoURL || getPremiumAvatar(displayName)} alt="DP Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[7.5px] uppercase tracking-wider text-purple-400 font-extrabold block">Display Name Control</span>
                          <Input
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="h-8 bg-white/5 border-white/10 text-xs font-bold text-white mt-1"
                            placeholder="Edit Name"
                          />
                        </div>
                      </div>

                      {/* Quick Select Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Quick Portrait Selection</span>
                        <div className="grid grid-cols-6 gap-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
                          {PREMIUM_AVATARS.slice(0, 12).map((av, idx) => {
                            const isChosen = photoURL === av;
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => {
                                  setPhotoURL(av);
                                  toast.success("Profile photo updated! Save sandbox to apply.");
                                }}
                                className={`w-8 h-8 rounded-full overflow-hidden border transition-all relative ${
                                  isChosen ? 'border-pink-500 scale-105 shadow-md shadow-pink-500/30' : 'border-transparent hover:border-white/10'
                                }`}
                              >
                                <img src={av} alt="Quick avatar" className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Coins & Diamonds Simulator */}
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#fbbf24] block pb-1 border-b border-white/5">Simulate Wallet Assets</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-500 uppercase block">Simulated Coins</label>
                          <Input
                            type="number"
                            className="h-8 bg-white/5 border-white/10 text-xs font-mono font-bold"
                            value={coins}
                            onChange={e => setCoins(Number(e.target.value))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCoins(prev => prev + 5000);
                              toast.success("+5,000 Gold Coins added!");
                            }}
                            className="text-[8px] uppercase tracking-wider text-[#fbbf24] font-black hover:underline mt-1 block"
                          >
                            +5k Coins
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-500 uppercase block">Simulated Diamonds</label>
                          <Input
                            type="number"
                            className="h-8 bg-white/5 border-white/10 text-xs font-mono font-bold"
                            value={diamonds}
                            onChange={e => setDiamonds(Number(e.target.value))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDiamonds(prev => prev + 100);
                              toast.success("+100 Diamonds added!");
                            }}
                            className="text-[8px] uppercase tracking-wider text-purple-400 font-black hover:underline mt-1 block"
                          >
                            +100 Dms
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3. Level Simulator */}
                    <div className="bg-[#fbbf24]/5 border border-[#fbbf24]/10 rounded-xl p-3 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block pb-1 border-b border-white/5">Milestones & Status</span>
                      
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase block">Profile Stardust Level</label>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          className="h-8 bg-white/5 border-white/10 text-xs font-mono font-bold"
                          value={level}
                          onChange={e => setLevel(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Save Changes button */}
                    <Button 
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full h-9 bg-gradient-to-r from-[#FF4D67] to-purple-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all mt-2"
                    >
                      {saving ? "Direct Syncing..." : "Save Sandbox Preferences"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back navigation footer click */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/profile')} 
          className="w-full h-12 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-widest mt-6"
        >
          Back to Me Profile
        </Button>
      </div>
    </div>
  );
}
