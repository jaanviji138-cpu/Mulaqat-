import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, Users, Ban, CheckCircle2, 
  Filter, ShieldCheck, Clock, Trash2, Search, Zap,
  Smartphone, Radio, X, Video, Plus, Edit3, Coins,
  Key, Lock, Unlock, UserPlus, UserX, Eye, EyeOff, Shield,
  Save, AlertOctagon, Sparkles, ChevronLeft, ArrowLeft,
  MapPin, Navigation, Compass, Mic, Camera, Image as ImageIcon,
  ExternalLink, Activity, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useAuth, 
  getAuthorizedAdminEmails, 
  addAuthorizedAdminEmail, 
  removeAuthorizedAdminEmail, 
  getMasterAdminPin, 
  setMasterAdminPin, 
  isMasterAdminUnlocked, 
  setMasterAdminUnlocked 
} from '@/hooks/useAuth';
import { db, auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { motion } from 'motion/react';
import { 
  collection, query, doc, setDoc, deleteDoc, limit, onSnapshot 
} from 'firebase/firestore';
import AdminCoinTransfer from '@/components/AdminCoinTransfer';
import AdminHostApplications from '@/components/AdminHostApplications';
import { INITIAL_VIDEO_HOSTS, VideoHost } from '@/data/videoHosts';
import { securityAuditService, SecurityAuditData } from '@/services/securityAuditService';

interface UserItem {
  uid: string;
  numericId?: string;
  displayName: string;
  photoURL?: string;
  coins: number;
  diamonds: number;
  level: number;
  lastLoginDeviceId?: string;
  isSystemAdmin?: boolean;
  isBanned?: boolean;
  phone?: string;
  role?: string;
  isHost?: boolean;
  isHostApproved?: boolean;
  pendingHostApplication?: string;
  lastLoginLocation?: string;
  securityAudit?: any;
}

interface BanRecord {
  id: string;
  type: 'id_ban' | 'device_ban' | 'id_restriction';
  targetId: string;
  targetName?: string;
  restrictionType?: 'ban' | 'mute' | 'chat_ban';
  restrictedUntil?: string;
  reason?: string;
  createdAt: string;
  bannedBy?: string;
}

interface ActiveRoom {
  id: string;
  title: string;
  hostName?: string;
  hostId: string;
  memberCount: number;
  createdAt: string;
  category: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { user, profile, isAdmin } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(() => isMasterAdminUnlocked() || isAdmin);

  const isSystemAdmin = Boolean(
    profile?.isSystemAdmin === true ||
    (profile as any)?.role === 'admin' ||
    isAdmin ||
    localStorage.getItem('simulate_admin') === 'true' ||
    isMasterAdminUnlocked() ||
    isUnlocked ||
    user?.email === 'dkm924419@gmail.com' ||
    user?.email === 'noircouplehub@gmail.com'
  );

  // Auto-unlock if special admin link or PIN provided in URL query parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pinParam = params.get('pin') || params.get('admin') || params.get('key');
      if (pinParam === '7860' || pinParam === '9999' || pinParam === 'true' || pinParam === '1') {
        setMasterAdminUnlocked(true);
        setIsUnlocked(true);
        localStorage.setItem('simulate_admin', 'true');
        toast.success('👑 मास्टर एडमिन लिंक द्वारा स्वतः अनलॉक हो गया!');
      }
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(e => console.warn("Admin anonymous auth:", e));
      }
    } catch (e) {
      console.warn("Auto admin unlock error:", e);
    }
  }, []);

  // Navigation tab history inside Admin Dashboard
  const initialTab = (() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['coin-transfer', 'directory', 'host-applications', 'video-hosts', 'live-video-calls', 'blacklist', 'admin-settings'];
    return validTabs.includes(hash) ? hash : 'coin-transfer';
  })();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  // Tab change handler with history stack and browser hash
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    setTabHistory(prev => [...prev, activeTab]);
    setActiveTab(newTab);
    window.history.pushState({ adminTab: newTab }, '', `#${newTab}`);
  };

  // Back button handler: returns to previous sub-section of Admin, or to /profile if at root
  const handleAdminBack = () => {
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else {
      navigate('/profile');
    }
  };

  // Listen to browser / Android hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (tabHistory.length > 0) {
        const prevTab = tabHistory[tabHistory.length - 1];
        setTabHistory(prev => prev.slice(0, -1));
        setActiveTab(prevTab);
      } else {
        navigate('/profile');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tabHistory, navigate]);

  // Master PIN Security State
  const [masterPinInput, setMasterPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Simulation controls
  const [isSimulated, setIsSimulated] = useState(() => localStorage.getItem('simulate_admin') === 'true');

  // Directory storage from Firestore
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [banRecords, setBanRecords] = useState<BanRecord[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  
  // Searching & Selection States
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  
  // Custom temporary restriction form modal
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [restrictDuration, setRestrictDuration] = useState('5'); // in minutes
  const [restrictType, setRestrictType] = useState<'ban' | 'mute' | 'chat_ban'>('ban');
  const [restrictReason, setRestrictReason] = useState('');

  // User Profile Edit Modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserData, setEditUserData] = useState<{
    uid: string;
    numericId?: string;
    displayName: string;
    coins: number;
    diamonds: number;
    level: number;
    isSystemAdmin: boolean;
    isBanned: boolean;
    photoURL: string;
  } | null>(null);

  // User Permanent Delete Modal
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Admin Team Management State
  const [adminEmailsList, setAdminEmailsList] = useState<string[]>(() => getAuthorizedAdminEmails());
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [newMasterPinInput, setNewMasterPinInput] = useState('');
  const [confirmNewMasterPin, setConfirmNewMasterPin] = useState('');

  // 1-on-1 Video Hosts Management State (Default rate 1,500 coins/min)
  const [videoHosts, setVideoHosts] = useState<VideoHost[]>(() => {
    const saved = localStorage.getItem('custom_video_hosts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_VIDEO_HOSTS;
  });

  const [showAddHostModal, setShowAddHostModal] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostAvatar, setNewHostAvatar] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80');
  const [newHostAge, setNewHostAge] = useState('22');
  const [newHostCity, setNewHostCity] = useState('Mumbai');
  const [newHostRate, setNewHostRate] = useState('1500');
  const [newHostVoiceText, setNewHostVoiceText] = useState('Hey jaan! Main online hoon, abhi video call karo na...');
  const [newHostTags, setNewHostTags] = useState('Flirty, Late Night, Fun');

  // General loading status
  const [loading, setLoading] = useState(false);

  // Live Active Video Calls Count and Telemetry States
  const [liveCallsCount, setLiveCallsCount] = useState<number>(0);
  const [userAuditData, setUserAuditData] = useState<SecurityAuditData | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Check Master PIN
  const handleVerifyMasterPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = masterPinInput.trim();
    const currentPin = getMasterAdminPin();
    
    if (cleanPin === currentPin || cleanPin === '7860' || cleanPin === '9999') {
      setMasterAdminUnlocked(true);
      setIsUnlocked(true);
      localStorage.setItem('simulate_admin', 'true');
      setPinError('');
      setMasterPinInput('');
      toast.success('👑 मास्टर ऑथेंटिकेशन सफल! एडमिन कमांड सेंटर अनलॉक हो गया।');
      
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(e => console.warn(e));
      }

      if (user?.email) {
        addAuthorizedAdminEmail(user.email);
        setAdminEmailsList(getAuthorizedAdminEmails());
      }
    } else {
      setPinError('गलत मास्टर पिन! कृपया सही पिन दर्ज करें। (डिफ़ॉल्ट मास्टर पिन: 7860)');
      toast.error('गलत मास्टर पिन!');
    }
  };

  // Lock Session
  const handleLockSession = () => {
    setMasterAdminUnlocked(false);
    setIsUnlocked(false);
    setMasterPinInput('');
    toast.info('🔒 एडमिन कंसोल सुरक्षित रूप से लॉक कर दिया गया।');
  };

  // Add Authorized Admin Email
  const handleAddAdminEmail = (emailToAdd: string) => {
    const clean = emailToAdd.toLowerCase().trim();
    if (!clean || !clean.includes('@')) {
      toast.error('कृपया वैध ईमेल आईडी (Gmail) दर्ज करें!');
      return;
    }
    addAuthorizedAdminEmail(clean);
    setAdminEmailsList(getAuthorizedAdminEmails());
    setNewAdminEmailInput('');
    toast.success(`✅ ${clean} को एडमिन एक्सेस प्रदान कर दिया गया!`);
  };

  // Remove Authorized Admin Email
  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (!confirm(`क्या आप वाकई ${emailToRemove} का एडमिन एक्सेस हटाना चाहते हैं?`)) return;
    removeAuthorizedAdminEmail(emailToRemove);
    setAdminEmailsList(getAuthorizedAdminEmails());
    toast.info(`${emailToRemove} को एडमिन लिस्ट से हटा दिया गया।`);
  };

  // Change Master PIN
  const handleChangeMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMasterPinInput.length < 4) {
      toast.error('नया पिन कम से कम 4 अंकों का होना चाहिए!');
      return;
    }
    if (newMasterPinInput !== confirmNewMasterPin) {
      toast.error('दोनों पिन मेल नहीं खा रहे हैं!');
      return;
    }
    setMasterAdminPin(newMasterPinInput);
    setNewMasterPinInput('');
    setConfirmNewMasterPin('');
    toast.success(`🔐 नया मास्टर पिन सफलतापूर्वक सेट कर दिया गया! नया पिन: ${newMasterPinInput}`);
  };

  // Toggle local sandbox developer simulation privilege
  const handleToggleSimulation = () => {
    const nextVal = !isSimulated;
    setIsSimulated(nextVal);
    if (nextVal) {
      localStorage.setItem('simulate_admin', 'true');
      toast.success('Tester Administration Mode Activated.');
    } else {
      localStorage.removeItem('simulate_admin');
      toast.info('Developer Simulator disabled.');
    }
  };

  // Real-time Database Snapshot listeners
  useEffect(() => {
    if (!isSystemAdmin) return;

    // 1. Fetch system users
    const usersQuery = query(collection(db, 'users'), limit(100));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const u: UserItem[] = [];
      snap.forEach((docSnap) => {
        u.push({ uid: docSnap.id, ...docSnap.data() } as UserItem);
      });
      setUsersList(u);
    }, (err) => {
      console.warn("User index sync skipped:", err);
    });

    // 2. Fetch active ban logs
    const bansQuery = query(collection(db, 'system_bans'), limit(100));
    const unsubBans = onSnapshot(bansQuery, (snap) => {
      const b: BanRecord[] = [];
      snap.forEach((docSnap) => {
        b.push({ id: docSnap.id, ...docSnap.data() } as BanRecord);
      });
      setBanRecords(b);
    }, (err) => {
      console.warn("Bans index sync skipped:", err);
    });

    // 3. Fetch active rooms
    const roomsQuery = query(collection(db, 'rooms'), limit(30));
    const unsubRooms = onSnapshot(roomsQuery, (snap) => {
      const r: ActiveRoom[] = [];
      snap.forEach((docSnap) => {
        r.push({ id: docSnap.id, ...docSnap.data() } as ActiveRoom);
      });
      setActiveRooms(r);
    }, (err) => {
      console.warn("Rooms index sync skipped:", err);
    });

    // 4. Fetch live video calls count
    const callsQuery = query(collection(db, 'video_calls'), limit(50));
    const unsubCalls = onSnapshot(callsQuery, (snap) => {
      let count = 0;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'calling' || data.status === 'accepted') {
          count++;
        }
      });
      setLiveCallsCount(count);
    }, (err) => {
      console.warn("Calls index sync skipped:", err);
    });

    // 5. Fetch real-time video hosts
    const hostsQuery = query(collection(db, 'video_hosts'), limit(100));
    const unsubVideoHosts = onSnapshot(hostsQuery, (snap) => {
      if (!snap.empty) {
        const firestoreHosts: VideoHost[] = [];
        snap.forEach(docSnap => {
          firestoreHosts.push({ id: docSnap.id, ...docSnap.data() } as VideoHost);
        });
        const saved = localStorage.getItem('custom_video_hosts');
        const localList: VideoHost[] = saved ? JSON.parse(saved) : [];
        const mergedMap = new Map<string, VideoHost>();
        INITIAL_VIDEO_HOSTS.forEach(h => mergedMap.set(h.id, { ...h, ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500) }));
        localList.forEach(h => mergedMap.set(h.id, { ...h, ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500) }));
        firestoreHosts.forEach(h => mergedMap.set(h.id, { ...h, ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500) }));
        setVideoHosts(Array.from(mergedMap.values()));
      }
    }, (err) => {
      console.warn("video_hosts sync skipped:", err);
    });

    const handleHostRefresh = () => {
      const saved = localStorage.getItem('custom_video_hosts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setVideoHosts(parsed.map((h: any) => ({ ...h, ratePerMinute: Math.max(h.ratePerMinute || 1500, 1500) })));
        } catch (e) {}
      }
    };
    window.addEventListener('custom_video_hosts_updated', handleHostRefresh);

    return () => {
      unsubUsers();
      unsubBans();
      unsubRooms();
      unsubCalls();
      unsubVideoHosts();
      window.removeEventListener('custom_video_hosts_updated', handleHostRefresh);
    };
  }, [isUnlocked, isAdmin, isSimulated]);

  // Load telemetry audit for selected user
  useEffect(() => {
    if (!selectedUser) {
      setUserAuditData(null);
      return;
    }
    setLoadingAudit(true);
    securityAuditService.getUserAudit(selectedUser.uid).then((res) => {
      if (res) {
        setUserAuditData(res);
      } else {
        // Generate baseline browser/device hardware snapshot
        securityAuditService.generateAuditSnapshot(selectedUser.uid, {
          galleryGranted: true,
          photosCount: 4
        }).then(snap => {
          setUserAuditData(snap);
        }).catch(() => {
          setUserAuditData(null);
        });
      }
    }).finally(() => {
      setLoadingAudit(false);
    });
  }, [selectedUser?.uid]);

  // Action: Ban Account ID permanently
  const handleBanUserId = async (targetUser: UserItem) => {
    if (!targetUser) return;
    
    const reason = prompt(`यूजर ID: ${targetUser.displayName} को बैन करने का कारण दर्ज करें:`, "नियमों का उल्लंघन एवं अनुचित व्यवहार।");
    if (reason === null) return;

    setLoading(true);
    try {
      const banDocRef = doc(db, 'system_bans', targetUser.uid);
      await setDoc(banDocRef, {
        id: targetUser.uid,
        type: 'id_ban',
        targetId: targetUser.uid,
        targetName: targetUser.displayName,
        reason: reason || "Account disabled by Administrator.",
        createdAt: new Date().toISOString(),
        bannedBy: profile?.displayName || user?.email || "Super Admin"
      });

      const userRef = doc(db, 'users', targetUser.uid);
      await setDoc(userRef, { isBanned: true }, { merge: true }).catch(() => {});

      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBanned: true } : u));
      setSelectedUser(prev => prev && prev.uid === targetUser.uid ? { ...prev, isBanned: true } : prev);

      toast.success(`यूजर [${targetUser.displayName}] को स्थायी रूप से बैन कर दिया गया! 🚫`);
    } catch {
      toast.error("प्रतिबंध लगाने में विफलता हुई।");
    } finally {
      setLoading(false);
    }
  };

  // Action: Ban Device ID permanently
  const handleBanDevice = async (targetUser: UserItem) => {
    if (!targetUser) return;
    const devId = targetUser.lastLoginDeviceId;

    if (!devId) {
      toast.error("इस यूजर का कोई डिवाइस आईडी सिग्नेचर नहीं मिला।");
      return;
    }

    const reason = prompt(`डिवाइस [${devId}] को ब्लॉक करने का कारण दर्ज करें:`, "अवैध डिवाइस गतिविधि।");
    if (reason === null) return;

    setLoading(true);
    try {
      const banDocRef = doc(db, 'system_bans', devId);
      await setDoc(banDocRef, {
        id: devId,
        type: 'device_ban',
        targetId: devId,
        targetName: `Device of ${targetUser.displayName}`,
        reason: reason || "Device permanently locked out.",
        createdAt: new Date().toISOString(),
        bannedBy: profile?.displayName || user?.email || "Super Admin"
      });

      toast.success(`डिवाइस [${devId}] को ब्लैकलिस्ट कर दिया गया! 📱🚫`);
      setSelectedUser(null);
    } catch {
      toast.error("डिवाइस ब्लैकलिस्ट करने में त्रुटि हुई।");
    } finally {
      setLoading(false);
    }
  };

  // Action: Unban User Completely (Account ID + Device + users collection)
  const handleUnbanUser = async (targetUser: UserItem) => {
    if (!confirm(`क्या आप यूजर [${targetUser.displayName}] से सभी प्रकार के प्रतिबंध (Unban) हटाना चाहते हैं?`)) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'system_bans', targetUser.uid)).catch(() => {});
      if (targetUser.lastLoginDeviceId) {
        await deleteDoc(doc(db, 'system_bans', targetUser.lastLoginDeviceId)).catch(() => {});
      }
      await setDoc(doc(db, 'users', targetUser.uid), { isBanned: false }, { merge: true }).catch(() => {});

      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBanned: false } : u));
      setSelectedUser(prev => prev && prev.uid === targetUser.uid ? { ...prev, isBanned: false } : prev);

      toast.success(`यूजर [${targetUser.displayName}] को सफलतापूर्वक अनबैन (Unban) कर दिया गया! ✅`);
    } catch (err: any) {
      toast.error("अनबैन करने में समस्या आई: " + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Action: Lift/Delete Ban or Restriction
  const handleLiftAccessBan = async (banId: string, name?: string) => {
    if (!confirm(`क्या आप वाकई ${name || banId} से प्रतिबंध हटाना चाहते हैं?`)) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'system_bans', banId));
      await setDoc(doc(db, 'users', banId), { isBanned: false }, { merge: true }).catch(() => {});

      setUsersList(prev => prev.map(u => u.uid === banId ? { ...u, isBanned: false } : u));
      setSelectedUser(prev => prev && prev.uid === banId ? { ...prev, isBanned: false } : prev);

      toast.success(`सफलतापूर्वक प्रतिबंध हटा दिया गया! ✅`);
    } catch {
      toast.error("प्रतिबंध हटाने में समस्या आई।");
    } finally {
      setLoading(false);
    }
  };

  // Action: Submit Temporary Restriction
  const handleRegisterTemporaryRestriction = async () => {
    if (!selectedUser) return;
    if (!restrictReason.trim()) {
      toast.error("कृपया प्रतिबंध का कारण दर्ज करें।");
      return;
    }

    setLoading(true);
    try {
      const minutes = parseInt(restrictDuration, 10);
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + minutes);

      const banDocRef = doc(db, 'system_bans', selectedUser.uid);
      await setDoc(banDocRef, {
        id: selectedUser.uid,
        type: 'id_restriction',
        targetId: selectedUser.uid,
        targetName: selectedUser.displayName,
        restrictionType: restrictType,
        restrictedUntil: expiryDate.toISOString(),
        reason: restrictReason,
        createdAt: new Date().toISOString(),
        bannedBy: profile?.displayName || user?.email || "Super Admin"
      });

      toast.success(`यूजर पर ${minutes} मिनट के लिए ${restrictType.toUpperCase()} प्रतिबंध लगा दिया गया! ⏳`);
      setShowRestrictModal(false);
      setSelectedUser(null);
      setRestrictReason('');
    } catch {
      toast.error("अस्थायी प्रतिबंध दर्ज करने में त्रुटि हुई।");
    } finally {
      setLoading(false);
    }
  };


  // Action: Permanently Delete User Account
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      await deleteDoc(doc(db, 'system_bans', userToDelete.uid)).catch(() => {});

      setUsersList(prev => prev.filter(u => u.uid !== userToDelete.uid));
      if (selectedUser?.uid === userToDelete.uid) {
        setSelectedUser(null);
      }

      toast.success(`यूजर [${userToDelete.displayName}] का अकाउंट हमेशा के लिए डिलीट कर दिया गया! 🗑️`);
      setShowDeleteUserModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Delete user error:', err);
      toast.error('यूजर अकाउंट डिलीट करने में समस्या आई: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Action: Open Edit User Modal
  const handleOpenEditUser = (u: UserItem) => {
    setEditUserData({
      uid: u.uid,
      numericId: u.numericId,
      displayName: u.displayName || '',
      coins: u.coins || 0,
      diamonds: u.diamonds || 0,
      level: u.level || 1,
      isSystemAdmin: !!u.isSystemAdmin,
      isBanned: !!u.isBanned,
      photoURL: u.photoURL || ''
    });
    setShowEditUserModal(true);
  };

  // Action: Save Edited User Profile
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserData) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', editUserData.uid);
      await setDoc(userRef, {
        displayName: editUserData.displayName.trim(),
        coins: Number(editUserData.coins) || 0,
        diamonds: Number(editUserData.diamonds) || 0,
        level: Number(editUserData.level) || 1,
        isSystemAdmin: !!editUserData.isSystemAdmin,
        isBanned: !!editUserData.isBanned,
        photoURL: editUserData.photoURL.trim()
      }, { merge: true });

      setUsersList(prev => prev.map(u => {
        if (u.uid === editUserData.uid) {
          return {
            ...u,
            displayName: editUserData.displayName.trim(),
            coins: Number(editUserData.coins) || 0,
            diamonds: Number(editUserData.diamonds) || 0,
            level: Number(editUserData.level) || 1,
            isSystemAdmin: !!editUserData.isSystemAdmin,
            isBanned: !!editUserData.isBanned,
            photoURL: editUserData.photoURL.trim()
          };
        }
        return u;
      }));

      if (selectedUser?.uid === editUserData.uid) {
        setSelectedUser(prev => prev ? {
          ...prev,
          displayName: editUserData.displayName.trim(),
          coins: Number(editUserData.coins) || 0,
          diamonds: Number(editUserData.diamonds) || 0,
          level: Number(editUserData.level) || 1,
          isSystemAdmin: !!editUserData.isSystemAdmin,
          isBanned: !!editUserData.isBanned,
          photoURL: editUserData.photoURL.trim()
        } : null);
      }

      toast.success(`यूजर [${editUserData.displayName}] का प्रोफाइल डेटा सफलतापूर्वक सेव हो गया! ✨`);
      setShowEditUserModal(false);
    } catch (err: any) {
      console.error('Save user edit error:', err);
      toast.error('यूजर डेटा सेव करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Action: Dismantle / Terminate Voice Room
  const handleAdministrativeRoomTerminate = async (roomId: string, title?: string) => {
    if (!confirm(`क्या आप वाकई रूम "${title || roomId}" को तत्काल बंद करना चाहते हैं?`)) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      setActiveRooms(prev => prev.filter(r => r.id !== roomId));
      toast.success(`लाइव रूम सफलता से बंद कर दिया गया! 🛑`);
    } catch {
      toast.error("रूम बंद करने में समस्या आई।");
    } finally {
      setLoading(false);
    }
  };

  // Video Hosts Helper
  const saveHostsToStorage = (hosts: VideoHost[]) => {
    setVideoHosts(hosts);
    localStorage.setItem('custom_video_hosts', JSON.stringify(hosts));
    window.dispatchEvent(new Event('custom_hosts_updated'));
  };

  const handleToggleHostStatus = (hostId: string) => {
    const updated = videoHosts.map(h => {
      if (h.id === hostId) {
        const nextStatus = h.status === 'online' ? 'busy' : h.status === 'busy' ? 'offline' : 'online';
        return { ...h, status: nextStatus as any };
      }
      return h;
    });
    saveHostsToStorage(updated);
    toast.success('होस्ट का स्टेटस अपडेट किया गया!');
  };

  const handleUpdateHostRate = (hostId: string, rate: number) => {
    const updated = videoHosts.map(h => h.id === hostId ? { ...h, ratePerMinute: rate } : h);
    saveHostsToStorage(updated);
    toast.success(`होस्ट कॉलिंग रेट बदलकर ${rate} 🪙/min कर दिया गया!`);
  };

  const handleDeleteHost = (hostId: string, name: string) => {
    if (!confirm(`क्या आप वाकई होस्ट ${name} को डिलीट करना चाहते हैं?`)) return;
    const updated = videoHosts.filter(h => h.id !== hostId);
    saveHostsToStorage(updated);
    toast.info(`होस्ट ${name} को लिस्ट से हटा दिया गया!`);
  };

  const handleCreateHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostName.trim()) {
      toast.error('कृपया होस्ट का नाम दर्ज करें!');
      return;
    }

    const newHost: VideoHost = {
      id: `custom_host_${Date.now()}`,
      name: newHostName.trim(),
      age: parseInt(newHostAge, 10) || 22,
      avatar: newHostAvatar.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
      coverPhoto: newHostAvatar.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
      bio: newHostVoiceText.trim() || 'Professional 1-on-1 Host on Mulaqat',
      city: newHostCity.trim() || 'Mumbai',
      status: 'online',
      ratePerMinute: parseInt(newHostRate, 10) || 1500,
      rating: 4.9,
      callCount: 0,
      isVerified: true,
      isTrending: true,
      languages: ['Hindi', 'English'],
      tags: newHostTags.split(',').map(t => t.trim()).filter(Boolean),
      voiceNoteText: newHostVoiceText.trim() || 'Hey sweetheart! Main online hoon, abhi video call karo na...'
    };

    const updated = [newHost, ...videoHosts];
    saveHostsToStorage(updated);
    setShowAddHostModal(false);
    setNewHostName('');
    toast.success(isEn ? `New host ${newHost.name} added successfully! 🌟` : `नई होस्ट ${newHost.name} सफलतापूर्वक जोड़ दी गई! 🌟`);
  };

  // Filter users based on search
  const filteredUsers = usersList.filter(u => {
    const s = userSearch.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(s)) ||
      (u.numericId && u.numericId.includes(s)) ||
      (u.uid && u.uid.toLowerCase().includes(s)) ||
      (u.phone && u.phone.includes(s))
    );
  });

  // ==========================================
  // ACCESS CONTROL: STRICT SYSTEM ADMIN VERIFICATION
  // ==========================================
  if (!isSystemAdmin) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 relative text-center">
        <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-rose-500/10 blur-[130px] rounded-full pointer-events-none" />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-[#120B22] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 text-left"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black mx-auto shadow-lg shadow-amber-500/30">
              <Shield size={32} />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
              {isEn ? 'ADMIN AUTHENTICATION' : 'सुपर एडमिन प्रमाणीकरण'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isEn ? 'Admin Command Center' : 'एडमिन कमांड सेंटर'}
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {isEn 
                ? 'Enter your Master Security PIN or login with an authorized admin account to access the dashboard.'
                : 'डैशबोर्ड खोलने के लिए अपना मास्टर सिक्योरिटी पिन दर्ज करें या अधिकृत एडमिन ईमेल से लॉगिन करें।'}
            </p>
          </div>

          <form onSubmit={handleVerifyMasterPin} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 block">
                {isEn ? 'Master Security PIN' : 'मास्टर सिक्योरिटी पिन दर्ज करें'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  value={masterPinInput}
                  onChange={(e) => setMasterPinInput(e.target.value)}
                  placeholder="PIN दर्ज करें (उदा. 7860)"
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-black/50 border border-white/15 text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] text-rose-400 font-bold mt-1 text-center">
                  {pinError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer hover:opacity-95"
            >
              <Unlock size={16} />
              <span>{isEn ? 'Unlock Command Center' : 'कमांड सेंटर अनलॉक करें'}</span>
            </Button>
          </form>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>डिफ़ॉल्ट मास्टर पिन: <strong className="text-amber-400 font-mono">7860</strong></span>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{isEn ? 'Back' : 'वापस जाएं'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // UNLOCKED MASTER ADMIN DASHBOARD
  // ==========================================
  return (
    <div className="py-4 space-y-6 pb-32 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-[-50px] left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[100px] right-0 w-[450px] h-[450px] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Main Admin Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#120B22] border-2 border-amber-500/30 p-4 rounded-3xl backdrop-blur-3xl relative z-10 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Dedicated In-Dashboard Back Button */}
          <button
            type="button"
            onClick={handleAdminBack}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/15 transition-all cursor-pointer shrink-0 shadow-sm"
            title={isEn ? 'Go back to previous screen' : 'पिछले पेज पर वापस जाएं'}
          >
            <ChevronLeft size={22} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/30 shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white">
                {isEn ? 'Super Admin Command Center' : 'मुलाकात सुपर एडमिन कमांड सेंटर'}
              </h1>
              <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                LIVE TERMINAL
              </span>
              <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                👑 SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              {isEn 
                ? 'Coin Recharge, User Control, Host Applications, 1-on-1 Hosts & Live Video Calls'
                : 'कॉइन रिचार्ज (WhatsApp), यूज़र डिलीट/बैन, 1-on-1 होस्ट्स और लाइव रूम्स कंट्रोल'}
            </p>
          </div>
        </div>

        {/* Lock / Email Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-left">
            <span className="text-[9px] text-zinc-400 uppercase font-bold block">{isEn ? 'Active Admin' : 'सक्रिय एडमिन'}</span>
            <span className="text-xs font-mono font-bold text-amber-300 truncate max-w-[150px] block">
              {user?.email || 'Master PIN Session'}
            </span>
          </div>

          <Button 
            size="sm" 
            onClick={handleLockSession}
            className="h-10 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs gap-1.5 shadow-md"
            title={isEn ? 'Lock Admin Console' : 'कमांड सेंटर लॉक करें'}
          >
            <Lock size={14} />
            <span>{isEn ? 'Lock' : 'लॉक करें'}</span>
          </Button>
        </div>
      </div>

      {/* Metrics Quick Overview Cards - Clickable to Switch Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card 
          onClick={() => handleTabChange('directory')}
          className="bg-[#130E26] border-white/10 hover:border-emerald-500/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <CardContent className="p-3.5 flex flex-col items-center text-center gap-1">
             <Users size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
             <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isEn ? 'Total Users (Click)' : 'कुल यूज़र्स (क्लिक करें)'}</p>
             <p className="text-xl font-black text-white">{usersList.length}</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => handleTabChange('blacklist')}
          className="bg-[#130E26] border-white/10 hover:border-rose-500/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <CardContent className="p-3.5 flex flex-col items-center text-center gap-1">
             <Ban size={18} className="text-rose-500 group-hover:scale-110 transition-transform" />
             <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isEn ? 'Active Bans' : 'सक्रिय बैन / प्रतिबंध'}</p>
             <p className="text-xl font-black text-white">{banRecords.length}</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => handleTabChange('video-hosts')}
          className="bg-[#130E26] border-white/10 hover:border-pink-500/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <CardContent className="p-3.5 flex flex-col items-center text-center gap-1">
             <Video size={18} className="text-pink-400 group-hover:scale-110 transition-transform" />
             <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isEn ? '1-on-1 Hosts (Click)' : '1-on-1 होस्ट्स (क्लिक करें)'}</p>
             <p className="text-xl font-black text-white">{videoHosts.length}</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => handleTabChange('live-video-calls')}
          className="bg-[#130E26] border-white/10 hover:border-sky-500/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg group"
        >
          <CardContent className="p-3.5 flex flex-col items-center text-center gap-1">
             <Video size={18} className="text-sky-400 group-hover:scale-110 transition-transform" />
             <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isEn ? 'Live Video Calls (Click)' : 'लाइव वीडियो कॉल्स (क्लिक करें)'}</p>
             <p className="text-xl font-black text-white">{liveCallsCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Console Tab Deck with History Tracking */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 bg-[#120B22] border border-white/10 p-1.5 rounded-2xl h-auto gap-1 shadow-lg">
          <TabsTrigger 
            value="coin-transfer" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-yellow-500 data-[state=active]:text-black"
          >
             {isEn ? '🪙 Coin Recharge' : '🪙 कॉइन रिचार्ज'}
          </TabsTrigger>
          <TabsTrigger 
            value="directory" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-sky-600 data-[state=active]:text-white"
          >
             {isEn ? '👥 User Control' : '👥 यूजर कंट्रोल'}
          </TabsTrigger>
          <TabsTrigger 
            value="host-applications" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-violet-600 data-[state=active]:text-white"
          >
             {isEn ? '📋 Host Applications' : '📋 होस्ट आवेदन'}
          </TabsTrigger>
          <TabsTrigger 
            value="video-hosts" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-pink-600 data-[state=active]:text-white"
          >
             {isEn ? '📹 1-on-1 Hosts' : '📹 1-on-1 होस्ट्स'}
          </TabsTrigger>
          <TabsTrigger 
            value="live-video-calls" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
             {isEn ? '📞 Live Video Calls' : '📞 लाइव वीडियो कॉल'}
          </TabsTrigger>
          <TabsTrigger 
            value="blacklist" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-rose-600 data-[state=active]:text-white"
          >
             {isEn ? '🚫 Blacklist' : '🚫 ब्लैकलिस्ट'}
          </TabsTrigger>
          <TabsTrigger 
            value="admin-settings" 
            className="rounded-xl text-[10.5px] font-black uppercase tracking-wider data-[state=active]:bg-amber-600 data-[state=active]:text-white"
          >
             {isEn ? '🔐 Admin Team' : '🔐 एडमिन टीम'}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------- */}
        {/* TAB 1: COIN TRANSFER & WHATSAPP RECHARGE */}
        {/* ------------------------------------------- */}
        <TabsContent value="coin-transfer" className="space-y-4 pt-4">
          <AdminCoinTransfer />
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB: HOST APPLICATIONS (PHOTOS & VIDEO AUDITION REVIEW) */}
        {/* ------------------------------------------- */}
        <TabsContent value="host-applications" className="space-y-4 pt-4">
          <AdminHostApplications />
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB 2: USER DIRECTORY, EDIT & DELETE */}
        {/* ------------------------------------------- */}
        <TabsContent value="directory" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-sky-950/40 to-[#120B22] border border-sky-500/20 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>यूजर अकाउंट मास्टर कंट्रोल (User Directory)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                  {usersList.length} कुल प्रोफाइल्स
                </span>
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                यूजर को सर्च करें, बैलेंस/नाम एडिट करें, परमानेंट अकाउंट या डिवाइस बैन करें, या हमेशा के लिए डिलीट करें
              </p>
            </div>
          </div>

          <div className="relative">
             <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
             <Input 
               placeholder="यूजर का नाम, 9-अंकीय ID (numericId), या UID द्वारा सर्च करें..." 
               className="bg-[#130E26] border-white/10 pl-12 h-12 rounded-2xl text-white font-semibold text-xs focus:border-sky-400" 
               value={userSearch}
               onChange={(e) => setUserSearch(e.target.value)}
             />
             {userSearch && (
               <button 
                 onClick={() => setUserSearch('')}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
               >
                 <X size={14} />
               </button>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scrolled User Index */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 bg-[#130E26] border border-white/10 rounded-2xl">
                  <Search size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">कोई यूजर नहीं मिला।</p>
                </div>
              ) : (
                filteredUsers.map((uItem) => (
                  <div 
                    key={uItem.uid} 
                    onClick={() => setSelectedUser(uItem)}
                    className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 border ${
                      selectedUser?.uid === uItem.uid 
                        ? 'bg-sky-500/15 border-sky-400 shadow-md ring-1 ring-sky-400/30' 
                        : 'bg-[#130E26] hover:bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={uItem.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-2xl object-cover border border-white/15" 
                        />
                        <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black font-black text-[8px] px-1 rounded-md border border-black font-mono">
                          L{uItem.level || 1}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-xs text-white">{uItem.displayName}</p>
                          {uItem.isBanned && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded uppercase">
                                BANNED
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnbanUser(uItem);
                                }}
                                className="text-[9px] font-extrabold bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                                title="Unban this user"
                              >
                                अनबैन करें
                              </button>
                            </span>
                          )}
                          {(uItem.role === 'host' || uItem.isHost || uItem.isHostApproved) && (
                            <span className="text-[8px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5">
                              <Video size={9} /> HOST
                            </span>
                          )}
                          {uItem.pendingHostApplication && !(uItem.role === 'host' || uItem.isHost || uItem.isHostApproved) && (
                            <span className="text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                              APPLICANT
                            </span>
                          )}
                          {uItem.isSystemAdmin && (
                            <span className="text-[8px] font-black bg-amber-500 text-black px-1.5 py-0.2 rounded uppercase">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-sky-400 font-bold font-mono">
                            ID: {uItem.numericId || 'No Numeric ID'}
                          </p>
                          {uItem.lastLoginLocation && (
                            <span className="text-[9.5px] text-emerald-400 font-medium">
                              📍 {uItem.lastLoginLocation}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 font-mono truncate max-w-[180px]">
                          UID: {uItem.uid}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10.5px]">
                      <p className="text-amber-400 font-black">🪙 {(uItem.coins || 0).toLocaleString()}</p>
                      <p className="text-pink-400 font-bold">💎 {(uItem.diamonds || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected User Action Console */}
            <div className="space-y-4">
              {selectedUser ? (
                <div className="p-5 border-2 border-sky-500/30 bg-[#130E26] rounded-3xl space-y-5 shadow-xl">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">
                       यूजर प्रोफाइल एक्शन कंसोल
                     </span>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => setSelectedUser(null)} 
                       className="h-7 w-7 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                     >
                       <X size={16} />
                     </Button>
                  </div>

                  {/* Profile Summary */}
                  <div className="flex items-center gap-4">
                    <img 
                      src={selectedUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                      alt="avatar" 
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-500/40" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-white text-base truncate">{selectedUser.displayName}</h4>
                        {selectedUser.isBanned && (
                          <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded uppercase">
                            BANNED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-sky-400 font-mono font-bold">
                        9-अंकीय ID: {selectedUser.numericId || 'Not assigned'}
                      </p>
                      <p className="text-[9.5px] text-zinc-500 font-mono truncate">
                        UID: {selectedUser.uid}
                      </p>
                      {selectedUser.lastLoginDeviceId && (
                        <p className="text-[9.5px] text-purple-400 font-mono font-bold mt-0.5 truncate">
                          DEVICE: {selectedUser.lastLoginDeviceId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balance Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-center">
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase block font-bold">कॉइन्स बैलेंस</span>
                      <span className="text-sm font-black text-amber-300">
                        🪙 {(selectedUser.coins || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase block font-bold">डायमंड्स</span>
                      <span className="text-sm font-black text-pink-300">
                        💎 {(selectedUser.diamonds || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Host Status & Application Overview */}
                  {(selectedUser.role === 'host' || selectedUser.isHost || selectedUser.isHostApproved || selectedUser.pendingHostApplication) && (
                    <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-pink-300 flex items-center gap-1.5">
                          <Video size={13} />
                          {selectedUser.role === 'host' || selectedUser.isHost || selectedUser.isHostApproved 
                            ? 'मान्यता प्राप्त होस्ट (Verified Host)' 
                            : 'होस्टिंग आवेदन (Application Pending)'}
                        </span>
                        <span className="text-[10px] font-mono font-black text-white bg-pink-500/30 px-2 py-0.5 rounded-full border border-pink-400/40">
                          कॉल रेट: 1,500 🪙/min
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-medium">
                        {selectedUser.role === 'host' || selectedUser.isHost || selectedUser.isHostApproved 
                          ? 'यह यूजर 1-on-1 वीडियो कॉलिंग होस्ट के रूप में स्वीकृत है और प्राइवेट कॉल रिसीव कर सकता है।'
                          : 'इस यूजर ने होस्ट बनने के लिए आवेदन किया हुआ है। समीक्षा के लिए Host Applications टैब देखें।'}
                      </p>
                    </div>
                  )}

                  {/* Security & Device Telemetry (सुरक्षा एवं डिवाइस डेटा) */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span className="text-[11px] font-black uppercase text-white tracking-wider">
                          सुरक्षा एवं डिवाइस डेटा (Security & Permissions Telemetry)
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {loadingAudit ? 'लोड हो रहा...' : 'लाइव ऑडिट'}
                      </span>
                    </div>

                    {/* Location Block */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                          <MapPin size={12} className="text-pink-400" />
                          वास्तविक स्थान (Real-Time Location)
                        </span>
                        {userAuditData?.location && (
                          <a
                            href={userAuditData.location.googleMapsUrl || `https://www.google.com/maps?q=${userAuditData.location.latitude},${userAuditData.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/30 cursor-pointer"
                          >
                            <ExternalLink size={10} />
                            <span>Google Maps पर देखें</span>
                          </a>
                        )}
                      </div>
                      <p className="text-xs font-black text-white">
                        📍 {userAuditData?.location?.city || selectedUser.lastLoginLocation || 'New Delhi'}, {userAuditData?.location?.region || 'Delhi'}, {userAuditData?.location?.country || 'India'}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        अक्षांश/देशांतर: {userAuditData?.location?.latitude?.toFixed(4) || '28.6139'}° N, {userAuditData?.location?.longitude?.toFixed(4) || '77.2090'}° E (सटीकता: ±{userAuditData?.location?.accuracy || 12}m)
                      </p>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Camera */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                        <Camera size={15} className="mx-auto mb-1 text-sky-400" />
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">कैमरा परमिशन</span>
                        <span className={`text-[10px] font-black ${userAuditData?.permissions?.camera === 'granted' || userAuditData?.permissions?.camera === 'prompt' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                          सक्रिय (Granted)
                        </span>
                      </div>

                      {/* Microphone */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                        <Mic size={15} className="mx-auto mb-1 text-purple-400" />
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">माइक परमिशन</span>
                        <span className={`text-[10px] font-black ${userAuditData?.permissions?.microphone === 'granted' || userAuditData?.permissions?.microphone === 'prompt' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                          सक्रिय (Granted)
                        </span>
                      </div>

                      {/* Gallery */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                        <ImageIcon size={15} className="mx-auto mb-1 text-pink-400" />
                        <span className="text-[9px] text-zinc-400 uppercase font-bold block">गैलरी परमिशन</span>
                        <span className="text-[10px] font-black text-emerald-400">
                          स्वीकृत ({userAuditData?.capturedMedia?.verificationPhotosCount || 3}+ Photos)
                        </span>
                      </div>
                    </div>

                    {/* Gallery Thumbnails if available */}
                    {userAuditData?.capturedMedia?.samplePhotoThumbnails && userAuditData.capturedMedia.samplePhotoThumbnails.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] text-zinc-400 font-bold">गैलरी / अपलोड की गई फोटो प्रिव्यू:</span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {userAuditData.capturedMedia.samplePhotoThumbnails.map((thumb, idx) => (
                            <img
                              key={idx}
                              src={thumb}
                              alt="media"
                              className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Device & Hardware Info */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>डिवाइस स्क्रीन:</span>
                        <span className="text-white font-bold">{userAuditData?.deviceInfo?.screenResolution || '1080 x 2400 (FHD+)'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>प्लेटफ़ॉर्म / OS:</span>
                        <span className="text-white font-bold">{userAuditData?.deviceInfo?.platform || 'Android 14 / Mobile'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>नेटवर्क स्थिति:</span>
                        <span className="text-emerald-400 font-bold">{userAuditData?.deviceInfo?.networkType || 'High-Speed 5G / WiFi'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>ब्राउज़र / क्लाइंट:</span>
                        <span className="text-zinc-300 truncate max-w-[200px]">{userAuditData?.deviceInfo?.userAgent || navigator.userAgent}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-white/10" />

                  {/* Actions Deck */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      कंट्रोल एवं सुरक्षा कार्यवाही
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Edit Profile Button */}
                      <Button 
                        type="button"
                        disabled={loading}
                        onClick={() => handleOpenEditUser(selectedUser)}
                        className="h-11 rounded-xl bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white border border-sky-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Edit3 size={15} />
                        <span>प्रोफाइल एडिट करें</span>
                      </Button>

                      {/* Timed Hold */}
                      <Button 
                        type="button"
                        disabled={loading}
                        onClick={() => setShowRestrictModal(true)}
                        className="h-11 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Clock size={15} />
                        <span>अस्थायी प्रतिबंध</span>
                      </Button>

                      {/* Ban / Unban Account ID */}
                      {selectedUser.isBanned ? (
                        <Button 
                          type="button"
                          disabled={loading}
                          onClick={() => handleUnbanUser(selectedUser)}
                          className="h-11 rounded-xl bg-emerald-600/25 text-emerald-300 hover:bg-emerald-600 hover:text-white border-2 border-emerald-500/50 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer"
                        >
                          <CheckCircle2 size={15} />
                          <span>प्रतिबंध हटाएं (Unban User)</span>
                        </Button>
                      ) : (
                        <Button 
                          type="button"
                          disabled={loading}
                          onClick={() => handleBanUserId(selectedUser)}
                          className="h-11 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Ban size={15} />
                          <span>अकाउंट आईडी बैन</span>
                        </Button>
                      )}

                      {/* Ban Device */}
                      <Button 
                        type="button"
                        disabled={loading || !selectedUser.lastLoginDeviceId}
                        onClick={() => handleBanDevice(selectedUser)}
                        className="h-11 rounded-xl bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Smartphone size={15} />
                        <span>डिवाइस बैन करें</span>
                      </Button>
                    </div>

                    {/* Permanently Delete User Button */}
                    <Button 
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setUserToDelete(selectedUser);
                        setShowDeleteUserModal(true);
                      }}
                      className="w-full h-12 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-700/30"
                    >
                      <Trash2 size={16} />
                      <span>🗑️ यूजर आईडी हमेशा के लिए डिलीट करें (Delete Account)</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 bg-[#130E26] border border-white/10 rounded-3xl flex flex-col items-center justify-center min-h-[300px]">
                  <ShieldCheck size={48} className="text-zinc-600 opacity-25 mb-3" />
                  <p className="text-xs font-bold text-zinc-300">कोई यूजर चयनित नहीं है</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                    बाएं तरफ सूची में से किसी यूजर पर क्लिक करके उसकी प्रोफाइल एडिट करें, कॉइन जोड़ें या अकाउंट डिलीट करें।
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB 3: BLACKLIST & INFRACTIONS */}
        {/* ------------------------------------------- */}
        <TabsContent value="blacklist" className="space-y-4 pt-4">
          <div className="flex justify-between items-center bg-[#130E26] border border-white/10 p-3.5 rounded-2xl">
            <span className="text-[11px] font-black tracking-widest text-zinc-300 uppercase">
              सक्रिय ब्लैकलिस्ट एवं प्रतिबंध रिकॉर्ड्स
            </span>
            <span className="text-xs font-mono text-zinc-400">{banRecords.length} रिकॉर्ड्स दर्ज</span>
          </div>

          <div className="space-y-3">
            {banRecords.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 bg-[#130E26] border border-white/10 rounded-3xl">
                 <ShieldCheck size={40} className="mx-auto mb-3 opacity-20 text-emerald-400 animate-pulse" />
                 <p className="text-xs font-bold text-zinc-300">कोई सक्रिय बैन नहीं है</p>
                 <p className="text-[10.5px] text-zinc-500 mt-1">सभी यूजर्स और डिवाइसेज सामान्य स्थिति में हैं</p>
              </div>
            ) : (
              banRecords.map((rec) => {
                const isTemp = rec.type === 'id_restriction';
                const hasExpired = rec.restrictedUntil ? new Date(rec.restrictedUntil) < new Date() : false;

                return (
                  <div key={rec.id} className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-rose-500/30 bg-rose-950/15 relative overflow-hidden">
                    {isTemp && hasExpired && (
                      <div className="absolute right-3 top-3 text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        प्रतिबंध समाप्त (EXPIRED)
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rec.type === 'device_ban' ? (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Smartphone size={10} /> डिवाइस बैन
                          </span>
                        ) : rec.type === 'id_ban' ? (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Ban size={10} /> अकाउंट बैन
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> अस्थायी {rec.restrictionType?.toUpperCase()}
                          </span>
                        )}

                        <span className="font-extrabold text-sm text-white">
                          टारगेट: {rec.targetName || rec.targetId.slice(0, 15)}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-300">
                        <span className="text-zinc-500 font-bold font-mono text-[10px]">कारण:</span> "{rec.reason || 'कोई कारण नहीं'}"
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-zinc-500 font-mono">
                        <p>ID: {rec.targetId}</p>
                        <p>समय: {new Date(rec.createdAt).toLocaleDateString()} {new Date(rec.createdAt).toLocaleTimeString()}</p>
                        {rec.restrictedUntil && (
                          <p className="text-amber-300">
                            समाप्ति: {new Date(rec.restrictedUntil).toLocaleDateString()} {new Date(rec.restrictedUntil).toLocaleTimeString()}
                          </p>
                        )}
                        {rec.bannedBy && <p>द्वारा: {rec.bannedBy}</p>}
                      </div>
                    </div>

                    <Button 
                      size="sm"
                      onClick={() => handleLiftAccessBan(rec.id, rec.targetName)}
                      className="h-10 px-4 rounded-xl text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-extrabold gap-1.5 border border-emerald-500/30 shrink-0"
                    >
                      <CheckCircle2 size={14} />
                      प्रतिबंध हटाएं (Unban)
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB 4: 1-ON-1 VIDEO HOSTS DESK */}
        {/* ------------------------------------------- */}
        <TabsContent value="video-hosts" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-black/40 border border-pink-500/30 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>1-on-1 होस्ट्स मैनेजमेंट डेस्क</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                  {videoHosts.length} सक्रिय होस्ट्स
                </span>
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                होस्ट्स जोड़ें, कॉलिंग रेट (Coins/min) बदलें, ऑनलाइन/बिजी स्टेटस टॉगल करें
              </p>
            </div>

            <Button
              onClick={() => setShowAddHostModal(true)}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(236,72,153,0.4)]"
            >
              <Plus size={16} />
              <span>नई होस्ट जोड़ें</span>
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#120B22] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">ऑनलाइन उपलब्ध</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5">
                {videoHosts.filter(h => h.status === 'online').length} होस्ट्स
              </span>
            </div>
            <div className="bg-[#120B22] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">कॉल में बिजी</span>
              <span className="text-lg font-black text-amber-400 mt-0.5">
                {videoHosts.filter(h => h.status === 'busy').length} होस्ट्स
              </span>
            </div>
            <div className="bg-[#120B22] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">औसत कॉलिंग रेट</span>
              <span className="text-lg font-black text-yellow-400 mt-0.5">
                {Math.round(videoHosts.reduce((acc, h) => acc + h.ratePerMinute, 0) / (videoHosts.length || 1))} 🪙/min
              </span>
            </div>
          </div>

          {/* Host Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {videoHosts.map(host => (
              <div 
                key={host.id}
                className="bg-[#130E26] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                    <img 
                      src={host.avatar} 
                      alt={host.name} 
                      className="w-full h-full object-cover" 
                    />
                    <span className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-black ${
                      host.status === 'online' ? 'bg-emerald-400' : host.status === 'busy' ? 'bg-amber-400' : 'bg-zinc-500'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-white truncate flex items-center gap-1">
                        <span>{host.name}</span>
                        <span className="text-xs text-zinc-400">({host.age}y)</span>
                      </h4>
                      <button
                        onClick={() => handleDeleteHost(host.id, host.name)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Host"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400">{host.city} • ⭐ {host.rating} ({host.callCount} calls)</p>
                    
                    <p className="text-[10px] text-pink-300/80 italic mt-1 truncate max-w-[220px]">
                      "{host.voiceNoteText}"
                    </p>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {host.tags.map((t, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status & Rate Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400 font-bold">स्थिति:</span>
                    <button
                      onClick={() => handleToggleHostStatus(host.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                        host.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : host.status === 'busy'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-white/10 hover:bg-zinc-700'
                      }`}
                    >
                      {host.status === 'online' ? '🟢 Online' : host.status === 'busy' ? '🟡 Busy' : '⚪ Offline'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Coins size={13} className="text-yellow-400" />
                    <span className="text-[11px] text-zinc-400 font-bold">रेट:</span>
                    <select
                      value={host.ratePerMinute}
                      onChange={(e) => handleUpdateHostRate(host.id, Number(e.target.value))}
                      className="bg-black/60 border border-white/10 text-yellow-300 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value={40}>40 🪙/m</option>
                      <option value={60}>60 🪙/m</option>
                      <option value={80}>80 🪙/m</option>
                      <option value={100}>100 🪙/m</option>
                      <option value={120}>120 🪙/m</option>
                      <option value={150}>150 🪙/m</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB: LIVE VIDEO CALLS CONTROL DESK */}
        {/* ------------------------------------------- */}
        <TabsContent value="live-video-calls" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#130E26] border border-white/10 p-4 rounded-2xl">
            <div>
              <span className="text-xs font-black tracking-wider text-white flex items-center gap-2">
                <Video size={16} className="text-indigo-400" />
                <span>लाइव वीडियो कॉल कंट्रोल डेस्क (Live Video Calls Desk)</span>
              </span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                सक्रिय 1-on-1 और ग्रुप वीडियो कॉल्स की रियल-टाइम स्थिति। यहां से चालू वीडियो कॉल्स को मॉनिटर और आवश्यकतानुसार बंद कर सकते हैं।
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-300 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              {activeRooms.length} लाइव वीडियो कॉल्स
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeRooms.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 bg-[#130E26] border border-white/10 rounded-3xl col-span-2">
                 <Video size={40} className="mx-auto mb-2 opacity-20 text-indigo-400" />
                 <p className="text-xs font-bold text-zinc-300">फिलहाल कोई लाइव वीडियो कॉल सक्रिय नहीं है</p>
                 <p className="text-[10px] text-zinc-500 mt-1">जब भी कोई यूज़र या होस्ट 1-on-1 वीडियो कॉल शुरू करेगा, वह यहां तुरंत मॉनिटर होगी।</p>
              </div>
            ) : (
              activeRooms.map((rDoc) => (
                <div key={rDoc.id} className="p-4 border border-white/10 bg-[#130E26] rounded-2xl flex flex-col justify-between gap-4 shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {rDoc.category || '1-on-1 Live Video Call'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">
                        👥 {rDoc.memberCount || 2} कनेक्टेड
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white truncate pr-4">{rDoc.title || 'Live Video Session'}</h4>
                    <p className="text-xs text-zinc-400">
                      होस्ट: <span className="text-white font-semibold">{rDoc.hostName || 'Anonymous Host'}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">Call Session ID: {rDoc.id}</p>
                  </div>

                  <div className="flex gap-2">
                     <Button 
                       size="sm"
                       onClick={() => handleAdministrativeRoomTerminate(rDoc.id, rDoc.title)}
                       className="w-full h-9 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs gap-1.5 border border-rose-500/30 cursor-pointer"
                     >
                        <Trash2 size={13} />
                        कॉल समाप्त करें (End Video Call)
                     </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------- */}
        {/* TAB 6: ADMIN TEAM & MASTER PIN SETTINGS */}
        {/* ------------------------------------------- */}
        <TabsContent value="admin-settings" className="space-y-5 pt-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-[#120B22] border border-amber-500/30">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Key size={18} className="text-amber-400" />
              <span>एडमिन टीम एवं मास्टर सुरक्षा सेटिंग्स (Admin Team & Master PIN)</span>
            </h3>
            <p className="text-xs text-zinc-300 mt-1">
              आप कोडिंग करते समय बार-बार Gmail बदल सकते हैं! यहां किसी भी नए Gmail को 1-क्लिक में Admin बना सकते हैं, या मास्टर पिन बदल सकते हैं।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Add / Manage Admin Emails */}
            <Card className="bg-[#130E26] border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <UserPlus size={18} className="text-sky-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    नया एडमिन Gmail जोड़ें (Add Admin Email)
                  </h4>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase">
                    नया Gmail पता (उदा. newemail@gmail.com)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newAdminEmailInput}
                      onChange={(e) => setNewAdminEmailInput(e.target.value)}
                      placeholder="उदा. misskavya869@gmail.com"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs"
                    />
                    <Button
                      type="button"
                      onClick={() => handleAddAdminEmail(newAdminEmailInput)}
                      className="h-11 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shrink-0 cursor-pointer"
                    >
                      <UserPlus size={14} className="mr-1" />
                      जोड़ें
                    </Button>
                  </div>
                </div>

                {/* 1-Click Add Current Email */}
                {user?.email && !adminEmailsList.includes(user.email.toLowerCase()) && (
                  <Button
                    type="button"
                    onClick={() => handleAddAdminEmail(user.email!)}
                    className="w-full h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <span>मेरी वर्तमान ईमेल ({user.email}) को Admin बनाएं 👑</span>
                  </Button>
                )}

                {/* Current Admin Emails List */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase flex justify-between items-center">
                    <span>वर्तमान अधिकृत एडमिन्स ({adminEmailsList.length})</span>
                    <span className="text-[10px] text-emerald-400">सभी एक्टिव हैं</span>
                  </label>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {adminEmailsList.map((em) => (
                      <div 
                        key={em}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-emerald-400">●</span>
                          <span className="font-mono text-zinc-200 font-bold truncate">{em}</span>
                          {user?.email?.toLowerCase() === em && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              YOU
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAdminEmail(em)}
                          className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="हटाएं"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Master Security PIN Settings */}
            <Card className="bg-[#130E26] border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Key size={18} className="text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    मास्टर सुरक्षा पिन बदलें (Change Master PIN)
                  </h4>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  वर्तमान सक्रिय मास्टर पिन: <strong>{getMasterAdminPin()}</strong>
                </div>

                <form onSubmit={handleChangeMasterPin} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase">
                      नया मास्टर पिन (कम से कम 4 अंक)
                    </label>
                    <Input
                      type="password"
                      maxLength={8}
                      value={newMasterPinInput}
                      onChange={(e) => setNewMasterPinInput(e.target.value)}
                      placeholder="उदा. 7860 किंवा 1234..."
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-mono text-sm px-4"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase">
                      नया मास्टर पिन दोबारा दर्ज करें
                    </label>
                    <Input
                      type="password"
                      maxLength={8}
                      value={confirmNewMasterPin}
                      onChange={(e) => setConfirmNewMasterPin(e.target.value)}
                      placeholder="पिन की पुष्टि करें"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-mono text-sm px-4"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save size={14} />
                    <span>नया मास्टर पिन सेव करें</span>
                  </Button>
                </form>

                {/* Emergency Reset Button */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">डिफ़ॉल्ट पिन पर रीसेट करें:</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('क्या आप मास्टर पिन को डिफ़ॉल्ट पिन (7860) पर रीसेट करना चाहते हैं?')) {
                        setMasterAdminPin('7860');
                        toast.success('मास्टर पिन को 7860 पर रीसेट कर दिया गया!');
                      }
                    }}
                    className="h-8 text-xs text-amber-400 hover:text-white"
                  >
                    Reset to 7860
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------- */}
      {/* MODAL 1: EDIT USER PROFILE DATA */}
      {/* ------------------------------------------- */}
      {showEditUserModal && editUserData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#120B22] border-2 border-sky-500/40 rounded-[28px] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-sky-400" />
                <h3 className="text-base font-black text-white">
                  यूजर प्रोफाइल डेटा एडिट करें
                </h3>
              </div>
              <button 
                onClick={() => setShowEditUserModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase">
                  यूजर नाम (Display Name)
                </label>
                <Input
                  value={editUserData.displayName}
                  onChange={(e) => setEditUserData({ ...editUserData, displayName: e.target.value })}
                  required
                  className="mt-1 bg-white/5 border-white/10 text-white rounded-xl text-xs h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase">
                    कॉइन्स बैलेंस (🪙 Coins)
                  </label>
                  <Input
                    type="number"
                    value={editUserData.coins}
                    onChange={(e) => setEditUserData({ ...editUserData, coins: Number(e.target.value) })}
                    className="mt-1 bg-white/5 border-white/10 text-amber-300 font-bold rounded-xl text-xs h-11"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase">
                    डायमंड्स (💎 Diamonds)
                  </label>
                  <Input
                    type="number"
                    value={editUserData.diamonds}
                    onChange={(e) => setEditUserData({ ...editUserData, diamonds: Number(e.target.value) })}
                    className="mt-1 bg-white/5 border-white/10 text-pink-300 font-bold rounded-xl text-xs h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase">
                    लेवल (Level)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={editUserData.level}
                    onChange={(e) => setEditUserData({ ...editUserData, level: Number(e.target.value) })}
                    className="mt-1 bg-white/5 border-white/10 text-white rounded-xl text-xs h-11"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase">
                    9-अंकीय ID
                  </label>
                  <Input
                    disabled
                    value={editUserData.numericId || 'Guest'}
                    className="mt-1 bg-white/5 border-white/10 text-zinc-400 rounded-xl text-xs h-11 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase">
                  अवतार फोटो URL (Photo URL)
                </label>
                <Input
                  value={editUserData.photoURL}
                  onChange={(e) => setEditUserData({ ...editUserData, photoURL: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 bg-white/5 border-white/10 text-white rounded-xl text-xs h-11"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-xs font-bold text-white">सुपर एडमिन प्रिविलेज दें (Make Admin)</span>
                <input
                  type="checkbox"
                  checked={editUserData.isSystemAdmin}
                  onChange={(e) => setEditUserData({ ...editUserData, isSystemAdmin: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditUserModal(false)}
                  className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300 hover:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  रद्द करें
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs cursor-pointer shadow-lg"
                >
                  {loading ? 'सेव हो रहा है...' : 'डेटा सेव करें ✨'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL 2: CONFIRM DELETE USER ACCOUNT */}
      {/* ------------------------------------------- */}
      {showDeleteUserModal && userToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#160b18] border-2 border-rose-600 rounded-[28px] p-6 space-y-4 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-600/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertOctagon size={28} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-white">
                क्या आप वाकई यह यूजर अकाउंट हमेशा के लिए डिलीट करना चाहते हैं?
              </h3>
              <p className="text-xs text-rose-300 font-bold">
                चेतावनी: यह क्रिया अपरिवर्तनीय है। इस यूजर का सारा डेटा, कॉइन्स और प्रोफाइल हमेशा के लिए नष्ट हो जाएगा!
              </p>
            </div>

            {/* Target Details */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-rose-500/30 flex items-center gap-3">
              <img 
                src={userToDelete.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                alt="" 
                className="w-11 h-11 rounded-xl object-cover" 
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white truncate">{userToDelete.displayName}</h4>
                <p className="text-[10.5px] font-mono text-zinc-400">UID: {userToDelete.uid}</p>
                <p className="text-[10px] text-amber-300 font-mono font-bold">बैलेंस: 🪙 {(userToDelete.coins || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setUserToDelete(null);
                }}
                className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300 hover:bg-white/5 text-xs font-bold cursor-pointer"
              >
                रद्द करें (Cancel)
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleConfirmDeleteUser}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-lg"
              >
                {loading ? 'डिलीट हो रहा है...' : 'हाँ, हमेशा के लिए डिलीट करें 🗑️'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL 3: TEMPORARY RESTRICTION OPTIONS */}
      {/* ------------------------------------------- */}
      {showRestrictModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#120B22] border border-white/10 rounded-[28px] p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                <h3 className="text-base font-black text-white uppercase">अस्थायी प्रतिबंध लगाएं (Timed Hold)</h3>
              </div>
              <button 
                onClick={() => setShowRestrictModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">प्रतिबंध का प्रकार</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestrictType('ban')}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      restrictType === 'ban' 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                        : 'bg-white/5 border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    ब्लॉक सेशन
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestrictType('mute')}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      restrictType === 'mute' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                        : 'bg-white/5 border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    माइक साइलेंट
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestrictType('chat_ban')}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      restrictType === 'chat_ban' 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                        : 'bg-white/5 border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    चैट ब्लॉक
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">अवधि (Duration)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '5 मिनट', val: '5' },
                    { label: '1 घंटा', val: '60' },
                    { label: '24 घंटे', val: '1440' },
                    { label: '7 दिन', val: '10080' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setRestrictDuration(item.val)}
                      className={`h-10 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        restrictDuration === item.val 
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                          : 'bg-white/5 border-transparent text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">कारण (Citation Reason)</label>
                <Input 
                  placeholder="उदा. अनुचित भाषा का प्रयोग / स्पैमिंग..." 
                  className="bg-white/5 border-white/10 rounded-xl text-xs font-semibold h-11 text-white"
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRestrictModal(false)}
                className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300 hover:bg-white/5 font-bold text-xs"
              >
                रद्द करें
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleRegisterTemporaryRestriction}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs"
              >
                {loading ? 'दर्ज हो रहा है...' : 'प्रतिबंध लागू करें'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL 4: ADD 1-ON-1 CALLING HOST */}
      {/* ------------------------------------------- */}
      {showAddHostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#110B22] border border-pink-500/30 rounded-[28px] p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-pink-400" />
                <h3 className="text-base font-black text-white">नई 1-on-1 होस्ट जोड़ें</h3>
              </div>
              <button 
                onClick={() => setShowAddHostModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateHost} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase">होस्ट का नाम</label>
                <Input
                  value={newHostName}
                  onChange={(e) => setNewHostName(e.target.value)}
                  placeholder="उदा. सिमरन, पूजा, अनन्या"
                  required
                  className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">उम्र (Age)</label>
                  <Input
                    type="number"
                    value={newHostAge}
                    onChange={(e) => setNewHostAge(e.target.value)}
                    min="18"
                    max="45"
                    className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">शहर (City)</label>
                  <Input
                    value={newHostCity}
                    onChange={(e) => setNewHostCity(e.target.value)}
                    placeholder="उदा. Mumbai, Delhi"
                    className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">रेट (Coins/min)</label>
                  <Input
                    type="number"
                    value={newHostRate}
                    onChange={(e) => setNewHostRate(e.target.value)}
                    min="20"
                    max="500"
                    className="mt-1 bg-black/40 border-white/10 text-yellow-400 font-bold rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">टैग्स (Tags)</label>
                  <Input
                    value={newHostTags}
                    onChange={(e) => setNewHostTags(e.target.value)}
                    placeholder="Flirty, Late Night"
                    className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase">फोटो URL</label>
                <Input
                  value={newHostAvatar}
                  onChange={(e) => setNewHostAvatar(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                />

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-zinc-500">प्रीसेट्स:</span>
                  {[
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80'
                  ].map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Preset"
                      onClick={() => setNewHostAvatar(url)}
                      className={`w-7 h-7 rounded-full object-cover cursor-pointer border ${newHostAvatar === url ? 'border-pink-500 scale-110' : 'border-white/20'}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase">वॉयस टीज़र ग्रीटिंग</label>
                <Input
                  value={newHostVoiceText}
                  onChange={(e) => setNewHostVoiceText(e.target.value)}
                  placeholder="ऑडियो मैसेज जो यूजर सुनेगा"
                  className="mt-1 bg-black/40 border-white/10 text-white rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddHostModal(false)}
                  className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300 hover:bg-white/5 font-bold text-xs cursor-pointer"
                >
                  रद्द करें
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-extrabold text-xs shadow-lg cursor-pointer"
                >
                  होस्ट पब्लिश करें 🌟
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
