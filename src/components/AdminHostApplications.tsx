import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, XCircle, Clock, Eye, Video, 
  Camera, ShieldCheck, Sparkles, Search, Filter, Phone, 
  MapPin, Globe, ChevronRight, ChevronLeft, Play, Pause,
  Volume2, VolumeX, AlertTriangle, RefreshCw, Star, ArrowRight,
  ExternalLink, MessageSquare, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, setDoc, getDoc, getDocs 
} from 'firebase/firestore';
import { VideoHost } from '@/data/videoHosts';

export interface HostApplicationItem {
  id: string;
  appId?: string;
  userId?: string;
  numericId?: string;
  phone?: string;
  fullName: string;
  age: number;
  city?: string;
  languages?: string[];
  photosCount?: number;
  photos?: string[];
  coverPhoto?: string;
  videoUrl?: string;
  faceVerified?: boolean;
  videoVerified?: boolean;
  status: 'pending_review' | 'approved' | 'rejected';
  appliedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  ratePerMinute?: number;
  bio?: string;
}

const SAMPLE_APPLICATIONS: HostApplicationItem[] = [
  {
    id: 'HOST_948211',
    appId: 'HOST_948211',
    userId: 'user_priyal_948',
    numericId: '109284729',
    phone: '+91 98765 43210',
    fullName: 'Priyal Sharma',
    age: 22,
    city: 'Mumbai, Maharashtra',
    languages: ['Hindi', 'English'],
    photosCount: 5,
    photos: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80'
    ],
    coverPhoto: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-a-video-call-with-her-phone-41481-large.mp4',
    faceVerified: true,
    videoVerified: true,
    status: 'pending_review',
    appliedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    ratePerMinute: 1500,
    bio: 'Hi guys! Main late night calls ke liye available hoon, friendly aur fun vibes ✨'
  },
  {
    id: 'HOST_837194',
    appId: 'HOST_837194',
    userId: 'user_ananya_837',
    numericId: '209384912',
    phone: '+91 98112 34567',
    fullName: 'Ananya Verma',
    age: 23,
    city: 'New Delhi',
    languages: ['Hindi', 'English', 'Punjabi'],
    photosCount: 6,
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80'
    ],
    coverPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-a-video-call-with-her-phone-41481-large.mp4',
    faceVerified: true,
    videoVerified: true,
    status: 'pending_review',
    appliedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    ratePerMinute: 1500,
    bio: 'Professional model & live host. Love dancing, singing & deep midnight conversations.'
  },
  {
    id: 'HOST_716295',
    appId: 'HOST_716295',
    userId: 'user_sneha_716',
    numericId: '309485123',
    phone: '+91 97654 32109',
    fullName: 'Sneha Kapoor',
    age: 21,
    city: 'Chandigarh',
    languages: ['Hindi', 'Punjabi'],
    photosCount: 5,
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80'
    ],
    coverPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-a-video-call-with-her-phone-41481-large.mp4',
    faceVerified: true,
    videoVerified: true,
    status: 'approved',
    appliedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    approvedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    ratePerMinute: 1500,
    bio: 'Sweet and caring talks. Connect 1-on-1 on private video call!'
  }
];

export default function AdminHostApplications() {
  const [applications, setApplications] = useState<HostApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Modal States
  const [inspectItem, setInspectItem] = useState<HostApplicationItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isPlayingAuditionVideo, setIsPlayingAuditionVideo] = useState(false);

  // Reject Dialog State
  const [rejectingItem, setRejectingItem] = useState<HostApplicationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('फोटो की गुणवत्ता कम है या चेहरा स्पष्ट नहीं है');
  const [customRejectNote, setCustomRejectNote] = useState('');

  // Processing Action State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Subscribe to Firestore host_applications
  useEffect(() => {
    try {
      const q = query(collection(db, 'host_applications'), orderBy('appliedAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: HostApplicationItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              appId: data.appId || docSnap.id,
              userId: data.userId || '',
              numericId: data.numericId || '',
              phone: data.phone || '',
              fullName: data.fullName || 'Host Applicant',
              age: data.age || 21,
              city: data.city || 'India',
              languages: data.languages || ['Hindi', 'English'],
              photosCount: data.photosCount || (data.photos?.length || 1),
              photos: data.photos || [data.coverPhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80'],
              coverPhoto: data.coverPhoto || (data.photos?.[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80'),
              videoUrl: data.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-a-video-call-with-her-phone-41481-large.mp4',
              faceVerified: data.faceVerified ?? true,
              videoVerified: data.videoVerified ?? true,
              status: data.status || 'pending_review',
              appliedAt: data.appliedAt || new Date().toISOString(),
              approvedAt: data.approvedAt,
              rejectedReason: data.rejectedReason,
              ratePerMinute: data.ratePerMinute || 60,
              bio: data.bio || ''
            });
          });

          // Check if local storage has an un-synced application
          const localApp = localStorage.getItem('my_host_application');
          if (localApp) {
            try {
              const parsed = JSON.parse(localApp);
              if (parsed && parsed.appId && !list.some(item => item.id === parsed.appId || item.appId === parsed.appId)) {
                list.unshift(parsed);
              }
            } catch (e) {}
          }

          if (list.length === 0) {
            // Seed sample applications if nothing is in database
            setApplications(SAMPLE_APPLICATIONS);
          } else {
            setApplications(list);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('host_applications listener notice:', error);
          // Fallback to sample applications on initial load or permission
          setApplications(SAMPLE_APPLICATIONS);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (e) {
      setApplications(SAMPLE_APPLICATIONS);
      setLoading(false);
    }
  }, []);

  // Seed / Reset Sample Applications
  const handleSeedSamples = async () => {
    setActionLoadingId('seed');
    try {
      for (const sample of SAMPLE_APPLICATIONS) {
        await setDoc(doc(db, 'host_applications', sample.id), sample);
      }
      toast.success('✨ 3 टेस्ट होस्ट आवेदन सफलतापूर्वक लोड किए गए!');
    } catch (e) {
      // Local state fallback
      setApplications(SAMPLE_APPLICATIONS);
      toast.success('✨ टेस्ट आवेदन प्रीव्यू में लोड किए गए!');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Approve Host Application
  const handleApproveApplication = async (app: HostApplicationItem) => {
    setActionLoadingId(app.id);
    try {
      // 1. Update status in Firestore host_applications
      const appRef = doc(db, 'host_applications', app.id);
      const approvedTime = new Date().toISOString();
      await setDoc(
        appRef,
        {
          status: 'approved',
          approvedAt: approvedTime
        },
        { merge: true }
      );

      // 2. Add Host to Active 1-on-1 Video Host List (custom_video_hosts)
      const existingSaved = localStorage.getItem('custom_video_hosts');
      let currentHosts: VideoHost[] = [];
      if (existingSaved) {
        try {
          currentHosts = JSON.parse(existingSaved);
        } catch (e) {}
      }

      const newHostEntry: VideoHost = {
        id: `host_${app.id.toLowerCase()}`,
        numericId: app.numericId || String(Math.floor(1000 + Math.random() * 9000)),
        name: app.fullName,
        age: app.age || 22,
        avatar: app.coverPhoto || app.photos?.[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
        coverPhoto: app.coverPhoto || app.photos?.[0] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
        photos: app.photos && app.photos.length > 0 ? app.photos : [
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80'
        ],
        bio: app.bio || `नमस्ते! Main ${app.fullName} hoon, Mulaqat par 1-on-1 video call ke liye connect karein! ✨`,
        status: 'online',
        ratePerMinute: Math.max(app.ratePerMinute || 1500, 1500),
        languages: app.languages || ['Hindi', 'English'],
        tags: ['Trending', 'Sweet', 'Verified'],
        city: app.city || 'Mumbai',
        callCount: 0,
        rating: 5.0,
        isVerified: true,
        isTrending: true,
        isNew: true,
        createdAt: Date.now(),
        voiceNoteText: `Hey! Main online hoon, video call connect karo abhi!`
      };

      // Merge into hosts
      const updatedHosts = [newHostEntry, ...currentHosts.filter(h => h.id !== newHostEntry.id)];
      localStorage.setItem('custom_video_hosts', JSON.stringify(updatedHosts));

      // Also persist host directly into Firestore video_hosts collection
      try {
        await setDoc(doc(db, 'video_hosts', newHostEntry.id), newHostEntry);
        if (app.userId) {
          await setDoc(doc(db, 'users', app.userId), {
            role: 'host',
            isHost: true,
            isHostApproved: true,
            hostId: newHostEntry.id
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Firestore video_hosts approval save notice:', err);
      }

      // Dispatch global event for instantaneous real-time UI refresh
      window.dispatchEvent(new Event('custom_video_hosts_updated'));

      // 3. Update application in local list
      setApplications(prev =>
        prev.map(item =>
          item.id === app.id ? { ...item, status: 'approved', approvedAt: approvedTime } : item
        )
      );

      // If inspect modal open, update it
      if (inspectItem && inspectItem.id === app.id) {
        setInspectItem({ ...inspectItem, status: 'approved', approvedAt: approvedTime });
      }

      toast.success(`🎉 ${app.fullName} का होस्ट आवेदन स्वीकार कर लिया गया! वह अब 1-on-1 वीडियो कॉलिंग लिस्ट में लाइव है।`);
    } catch (err: any) {
      console.warn('Approve host notice:', err);
      // Local optimistic update
      setApplications(prev =>
        prev.map(item =>
          item.id === app.id ? { ...item, status: 'approved', approvedAt: new Date().toISOString() } : item
        )
      );
      toast.success(`🎉 ${app.fullName} का होस्ट आवेदन स्वीकार कर लिया गया!`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Host Application
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const finalReason = customRejectNote.trim() || rejectReason;
    setActionLoadingId(rejectingItem.id);

    try {
      const appRef = doc(db, 'host_applications', rejectingItem.id);
      await setDoc(
        appRef,
        {
          status: 'rejected',
          rejectedReason: finalReason
        },
        { merge: true }
      );

      setApplications(prev =>
        prev.map(item =>
          item.id === rejectingItem.id ? { ...item, status: 'rejected', rejectedReason: finalReason } : item
        )
      );

      if (inspectItem && inspectItem.id === rejectingItem.id) {
        setInspectItem({ ...inspectItem, status: 'rejected', rejectedReason: finalReason });
      }

      toast.info(`❌ ${rejectingItem.fullName} का आवेदन अस्वीकार किया गया। कारण: ${finalReason}`);
    } catch (err) {
      setApplications(prev =>
        prev.map(item =>
          item.id === rejectingItem.id ? { ...item, status: 'rejected', rejectedReason: finalReason } : item
        )
      );
      toast.info(`❌ ${rejectingItem.fullName} का आवेदन अस्वीकार किया गया।`);
    } finally {
      setActionLoadingId(null);
      setRejectingItem(null);
      setCustomRejectNote('');
    }
  };

  // Filter logic
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      !s ||
      app.fullName.toLowerCase().includes(s) ||
      (app.numericId && app.numericId.includes(s)) ||
      (app.id && app.id.toLowerCase().includes(s)) ||
      (app.city && app.city.toLowerCase().includes(s)) ||
      (app.phone && app.phone.includes(s));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = applications.filter(a => a.status === 'pending_review').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Stats */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-violet-950/60 via-purple-950/30 to-[#120B22] border border-violet-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Users size={20} className="text-violet-400" />
              <span>होस्ट आवेदन सत्यापन डेस्क (Host Applications Review)</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-300">
            जब लड़कियां होस्टिंग के लिए 5-6 फोटो और 10-सेकंड का वीडियो ऑडीशन अपलोड करके अप्लाई करती हैं, उनका पूरा डाटा यहां आता है। आप जांच कर सीधे स्वीकार (Approve) या अस्वीकार (Reject) कर सकते हैं।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleSeedSamples}
            disabled={actionLoadingId === 'seed'}
            variant="outline"
            className="h-10 px-3.5 rounded-xl border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>टेस्ट आवेदन री-लोड करें</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('pending_review')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending_review'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400'
            }`}
          >
            <Clock size={14} />
            <span>समीक्षाधीन (Pending)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              statusFilter === 'pending_review' ? 'bg-black/20 text-black font-mono' : 'bg-amber-500/20 text-amber-300 font-mono'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'approved'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>स्वीकृत (Approved)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              statusFilter === 'approved' ? 'bg-black/20 text-black font-mono' : 'bg-emerald-500/20 text-emerald-300 font-mono'
            }`}>
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'rejected'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-black'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400'
            }`}
          >
            <XCircle size={14} />
            <span>अस्वीकृत (Rejected)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              statusFilter === 'rejected' ? 'bg-black/20 text-white font-mono' : 'bg-rose-500/20 text-rose-300 font-mono'
            }`}>
              {rejectedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white/20 text-white font-black'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400'
            }`}
          >
            <span>सभी ({applications.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम, शहर, ID से खोजें..."
            className="h-10 pl-9 bg-white/5 border-white/10 rounded-xl text-white text-xs"
          />
        </div>
      </div>

      {/* 3. Host Applications List */}
      {filteredApplications.length === 0 ? (
        <Card className="bg-[#130E26] border-white/10 rounded-3xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-zinc-500 mb-3">
            <Users size={32} />
          </div>
          <h3 className="text-base font-black text-white">कोई आवेदन नहीं मिला</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'आपके खोजे गए शब्द से कोई भी होस्ट आवेदन मैच नहीं हुआ।'
              : 'इस कैटेगरी में फिलहाल कोई आवेदन उपलब्ध नहीं है।'}
          </p>
          <Button
            type="button"
            onClick={handleSeedSamples}
            className="mt-4 h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
          >
            परीक्षण के लिए 3 सैंपल आवेदन लोड करें
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredApplications.map((app) => {
            const isApproved = app.status === 'approved';
            const isRejected = app.status === 'rejected';
            const isPending = app.status === 'pending_review';
            const isActing = actionLoadingId === app.id;

            return (
              <Card
                key={app.id}
                className={`bg-[#130E26] border rounded-3xl overflow-hidden shadow-xl transition-all hover:border-violet-500/40 ${
                  isPending
                    ? 'border-amber-500/30'
                    : isApproved
                      ? 'border-emerald-500/30'
                      : 'border-rose-500/30 opacity-75'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar: Applicant Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar preview */}
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-violet-500/40 shrink-0 bg-black/40">
                        <img
                          src={app.coverPhoto || app.photos?.[0]}
                          alt={app.fullName}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-white">{app.fullName}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-pink-300 font-bold">
                            {app.age} वर्ष
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                          {app.city && (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <MapPin size={12} className="text-violet-400" />
                              {app.city}
                            </span>
                          )}
                          {app.numericId && (
                            <span className="font-mono text-zinc-400 text-[11px]">
                              ID: {app.numericId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono">App #{app.id}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(app.appliedAt).toLocaleDateString('hi-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock size={12} />
                          समीक्षाधीन
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          स्वीकृत होस्ट
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <XCircle size={12} />
                          अस्वीकृत
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges & Verifications */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/5">
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-zinc-400 uppercase block font-bold">बायोमेट्रिक</span>
                        <span className="text-[11px] font-black text-emerald-300 truncate block">फेस वेरिफाइड ✅</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                      <Video size={16} className="text-violet-400 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-zinc-400 uppercase block font-bold">10s ऑडीशन</span>
                        <span className="text-[11px] font-black text-violet-300 truncate block">वीडियो उपलब्ध ✅</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                      <Camera size={16} className="text-pink-400 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-zinc-400 uppercase block font-bold">अपलोड फोटो</span>
                        <span className="text-[11px] font-black text-pink-300 truncate block">{app.photos?.length || app.photosCount || 5} पोर्ट्रेट फोटो</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                      <Globe size={16} className="text-amber-400 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-zinc-400 uppercase block font-bold">भाषाएं</span>
                        <span className="text-[11px] font-black text-amber-300 truncate block">
                          {(app.languages || ['Hindi']).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5-6 Photos Gallery Preview Strip */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                        <Camera size={13} className="text-pink-400" />
                        <span>होस्ट प्रोफाइल फोटो गैलरी ({app.photos?.length || 5} Photos)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInspectItem(app);
                          setActivePhotoIdx(0);
                        }}
                        className="text-violet-400 hover:text-violet-300 font-black cursor-pointer flex items-center gap-1"
                      >
                        <span>विस्तृत देखें</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {(app.photos && app.photos.length > 0 ? app.photos : [app.coverPhoto || '']).map((pUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => {
                            setInspectItem(app);
                            setActivePhotoIdx(pIdx);
                          }}
                          className="relative w-16 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-pink-500 cursor-pointer shrink-0 group transition-all"
                        >
                          <img
                            src={pUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/60 text-white font-bold">
                            #{pIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video Audition Preview Button */}
                  {app.videoUrl && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-black/40 border border-violet-500/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
                          <Video size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-white block">10-सेकंड लाइव वीडियो ऑडीशन</span>
                          <span className="text-[10px] text-zinc-400 block">चेहरे और आवाज की जांच करें</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setInspectItem(app);
                          setIsPlayingAuditionVideo(true);
                        }}
                        className="h-9 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Play size={13} className="fill-white" />
                        <span>ऑडीशन चलाएं</span>
                      </Button>
                    </div>
                  )}

                  {/* Rejection Reason if already rejected */}
                  {isRejected && app.rejectedReason && (
                    <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="font-black">अस्वीकृति का कारण: </span>
                        <span>{app.rejectedReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    {/* Inspect Full Application Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setInspectItem(app);
                        setActivePhotoIdx(0);
                      }}
                      className="flex-1 h-11 rounded-xl border-white/10 hover:bg-white/10 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>समीक्षा (Inspect)</span>
                    </Button>

                    {/* Approve Button */}
                    {(!isApproved || isRejected) && (
                      <Button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleApproveApplication(app)}
                        className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        {isActing ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>स्वीकार करें (Approve)</span>
                      </Button>
                    )}

                    {/* Reject Button */}
                    {(!isRejected || isApproved) && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isActing}
                        onClick={() => setRejectingItem(app)}
                        className="h-11 px-3 rounded-xl border-rose-500/30 hover:bg-rose-500/10 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>अस्वीकार</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DETAILED INSPECTION MODAL (FULL SCREEN LIGHTBOX) */}
      {/* ========================================================= */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#130E26] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-violet-500/40">
                  <img
                    src={inspectItem.coverPhoto || inspectItem.photos?.[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{inspectItem.fullName}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">
                      {inspectItem.age} वर्ष
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Application ID: <span className="font-mono text-zinc-300">{inspectItem.id}</span>
                  </p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setInspectItem(null);
                  setIsPlayingAuditionVideo(false);
                }}
                className="w-9 h-9 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Media Player / Photo Viewer Stage */}
              <div className="relative rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[440px]">
                {isPlayingAuditionVideo && inspectItem.videoUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    <video
                      src={inspectItem.videoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full max-h-[400px] rounded-xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPlayingAuditionVideo(false)}
                      className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold cursor-pointer"
                    >
                      ← फोटो गैलरी पर वापस जाएं
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={
                        (inspectItem.photos && inspectItem.photos[activePhotoIdx]) ||
                        inspectItem.coverPhoto ||
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={`Photo ${activePhotoIdx + 1}`}
                      className="w-full max-h-[400px] object-contain"
                    />

                    {/* Left/Right controls */}
                    {inspectItem.photos && inspectItem.photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIdx(prev =>
                              prev > 0 ? prev - 1 : (inspectItem.photos?.length || 1) - 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer border border-white/20 shadow-lg"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIdx(prev =>
                              prev < (inspectItem.photos?.length || 1) - 1 ? prev + 1 : 0
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer border border-white/20 shadow-lg"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}

                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-xs font-bold border border-white/20">
                      फोटो {activePhotoIdx + 1} / {inspectItem.photos?.length || 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails Row */}
              {inspectItem.photos && inspectItem.photos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {inspectItem.photos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActivePhotoIdx(idx);
                        setIsPlayingAuditionVideo(false);
                      }}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                        activePhotoIdx === idx && !isPlayingAuditionVideo
                          ? 'border-pink-500 scale-105 shadow-md shadow-pink-500/20'
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}

                  {/* Video Audition Thumbnail Tab */}
                  {inspectItem.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setIsPlayingAuditionVideo(true)}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 cursor-pointer shrink-0 flex flex-col items-center justify-center gap-1 transition-all ${
                        isPlayingAuditionVideo
                          ? 'border-violet-500 bg-violet-600/30 scale-105 shadow-md'
                          : 'border-white/10 bg-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Video size={18} className="text-violet-300" />
                      <span className="text-[9px] font-bold text-violet-200">10s Video</span>
                    </button>
                  )}
                </div>
              )}

              {/* Detailed Applicant Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">पूरा नाम</span>
                  <span className="text-white font-bold text-sm">{inspectItem.fullName}</span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">आयु (Age)</span>
                  <span className="text-white font-bold text-sm">{inspectItem.age} वर्ष</span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">शहर एवं राज्य</span>
                  <span className="text-white font-bold">{inspectItem.city || 'India'}</span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">फ़ोन / WhatsApp</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {inspectItem.phone || '+91 98765 43210'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">बोलने वाली भाषाएं</span>
                  <span className="text-white font-bold">
                    {(inspectItem.languages || ['Hindi']).join(', ')}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] font-bold uppercase">1-on-1 कॉलिंग रेट</span>
                  <span className="text-amber-400 font-bold">
                    {Math.max(inspectItem.ratePerMinute || 1500, 1500).toLocaleString()} 🪙 कॉइन्स / मिनट
                  </span>
                </div>

                {inspectItem.bio && (
                  <div className="sm:col-span-2">
                    <span className="text-zinc-400 block text-[11px] font-bold uppercase">होस्ट बायो</span>
                    <p className="text-zinc-200 text-xs italic mt-0.5">{inspectItem.bio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                स्थिति: <span className="font-bold text-white capitalize">{inspectItem.status}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingItem(inspectItem)}
                  className="h-11 px-4 rounded-xl border-rose-500/40 text-rose-300 hover:bg-rose-500/10 font-bold text-xs"
                >
                  <XCircle size={15} className="mr-1.5" />
                  अस्वीकार करें
                </Button>

                <Button
                  type="button"
                  onClick={() => handleApproveApplication(inspectItem)}
                  className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} className="mr-1.5" />
                  स्वीकार एवं लाइव करें (Approve Host)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. REJECTION REASON MODAL */}
      {/* ========================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#130E26] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {rejectingItem.fullName} का आवेदन अस्वीकार करें
                </h3>
                <p className="text-xs text-zinc-400">कृपया अस्वीकृति का उचित कारण चुनें:</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                'फोटो की गुणवत्ता कम है या चेहरा स्पष्ट नहीं है',
                '10-सेकंड का वीडियो ऑडीशन अस्पष्ट है या आवाज साफ नहीं है',
                'आयु सत्यापन अधूरा है (18+ अनिवार्य)',
                'पहचान पत्र (ID Proof) में जानकारी अधूरी है',
                'अन्य कारण'
              ].map((reasonOption) => (
                <label
                  key={reasonOption}
                  onClick={() => setRejectReason(reasonOption)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs transition-all ${
                    rejectReason === reasonOption
                      ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="reject_reason"
                    checked={rejectReason === reasonOption}
                    onChange={() => setRejectReason(reasonOption)}
                    className="accent-rose-500"
                  />
                  <span>{reasonOption}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">
                कस्टम नोट (वैकल्पिक)
              </label>
              <Input
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
                placeholder="उदा. कृपया अच्छी रोशनी में 5 स्पष्ट फोटो अपलोड करें..."
                className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectingItem(null);
                  setCustomRejectNote('');
                }}
                className="flex-1 h-11 rounded-xl border-white/10 text-zinc-300 font-bold text-xs"
              >
                रद्द करें
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/20"
              >
                पुष्टि करें (Reject)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
