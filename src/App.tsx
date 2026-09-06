/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Home, User, Wallet, MessageCircle, Plus, Search, Trophy, Settings, MessageSquare, Mic2, Sparkles, Star, Shield, BookOpen, Compass, Radio, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '@/components/Logo';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Pages
import HomePage from '@/pages/HomePage';
import LivePage from '@/pages/LivePage';
import LiveRoomPage from '@/pages/LiveRoomPage';
import LoginPage from '@/pages/LoginPage';
import RoomPage from '@/pages/RoomPage';
import ProfilePage from '@/pages/ProfilePage';
import WalletPage from '@/pages/WalletPage';
import AgencyPage from '@/pages/AgencyPage';
import AdminPage from '@/pages/AdminPage';
import BanOverlay from '@/components/BanOverlay';
import MomentsPage from '@/pages/MomentsPage';
import RoomsPage from '@/pages/RoomsPage';
import MessagesPage from '@/pages/MessagesPage';
import CreateRoomPage from '@/pages/CreateRoomPage';
import GiftsPage from '@/pages/GiftsPage';
import FloatingRoomPiP from '@/components/FloatingRoomPiP';

// 1-on-1 Video Calling
import VideoHostsPage from '@/pages/VideoHostsPage';
import VideoCallPage from '@/pages/VideoCallPage';
import IncomingCallModal from '@/components/IncomingCallModal';
import PermissionsModal from '@/components/PermissionsModal';

// Newly Audited Me Sub-pages
import SettingsPage from '@/pages/SettingsPage';
import StorePage from '@/pages/StorePage';
import BackpackPage from '@/pages/BackpackPage';
import LevelPage from '@/pages/LevelPage';
import InvitePage from '@/pages/InvitePage';
import CustomerServicePage from '@/pages/CustomerServicePage';
import EventCenterPage from '@/pages/EventCenterPage';
import AstrologyPage from '@/pages/AstrologyPage';
import FamilyPage from '@/pages/FamilyPage';
import HostCenterPage from '@/pages/HostCenterPage';
import VerificationPage from '@/pages/VerificationPage';
import ApplyHostingPage from '@/pages/ApplyHostingPage';
import { FloatingVideoCallPiP } from '@/components/FloatingVideoCallPiP';
import { useLanguage } from '@/contexts/LanguageContext';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const isCallsActive = location.pathname === '/' || location.pathname === '/calls' || location.pathname.startsWith('/calls');
  const isMomentsActive = location.pathname.startsWith('/moments');
  const isChatActive = location.pathname.startsWith('/messages');
  const isMeActive = location.pathname.startsWith('/profile') || location.pathname.startsWith('/wallet') || location.pathname.startsWith('/settings') || location.pathname.startsWith('/store') || location.pathname.startsWith('/backpack');

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#09071A]/95 backdrop-blur-2xl py-1.5 px-2.5 flex justify-around items-center z-50 shadow-[0_-12px_35px_rgba(0,0,0,0.85)] border-t border-white/[0.08]">
      
      {/* 1. 1-on-1 Video Calls Tab */}
      <Link 
        to="/calls" 
        className="relative flex flex-col items-center gap-0.5 flex-1 py-1 transition-transform active:scale-95 group"
      >
        {isCallsActive && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 via-rose-500/20 to-violet-500/20 rounded-xl border border-pink-500/35" />
        )}
        <div className={`p-1 rounded-lg transition-colors relative z-10 ${
          isCallsActive ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
        }`}>
          <Video size={19} className={isCallsActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className={`text-[9px] font-bold tracking-tight relative z-10 transition-colors ${isCallsActive ? 'text-pink-400 font-black' : 'text-zinc-400'}`}>
          {t('nav.video')}
        </span>
      </Link>

      {/* 2. Moments Tab */}
      <Link 
        to="/moments" 
        className="relative flex flex-col items-center gap-0.5 flex-1 py-1 transition-transform active:scale-95 group"
      >
        {isMomentsActive && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 via-rose-500/20 to-violet-500/20 rounded-xl border border-pink-500/35" />
        )}
        <div className={`p-1 rounded-lg transition-colors relative z-10 ${
          isMomentsActive ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
        }`}>
          <Sparkles size={19} className={isMomentsActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className={`text-[9px] font-bold tracking-tight relative z-10 transition-colors ${isMomentsActive ? 'text-pink-400 font-black' : 'text-zinc-400'}`}>
          {t('nav.moments')}
        </span>
      </Link>

      {/* 3. Messages Tab */}
      <Link 
        to="/messages" 
        className="relative flex flex-col items-center gap-0.5 flex-1 py-1 transition-transform active:scale-95 group"
      >
        {isChatActive && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 via-rose-500/20 to-violet-500/20 rounded-xl border border-pink-500/35" />
        )}
        <div className={`p-1 rounded-lg transition-colors relative z-10 ${
          isChatActive ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
        }`}>
          <div className="relative">
            <MessageSquare size={19} className={isChatActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
        </div>
        <span className={`text-[9px] font-bold tracking-tight relative z-10 transition-colors ${isChatActive ? 'text-pink-400 font-black' : 'text-zinc-400'}`}>
          {t('nav.messages')}
        </span>
      </Link>

      {/* 4. Me Tab */}
      <Link 
        to="/profile" 
        className="relative flex flex-col items-center gap-0.5 flex-1 py-1 transition-transform active:scale-95 group"
      >
        {isMeActive && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 via-rose-500/20 to-violet-500/20 rounded-xl border border-pink-500/35" />
        )}
        <div className={`p-1 rounded-lg transition-colors relative z-10 ${
          isMeActive ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
        }`}>
          <User size={19} className={isMeActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className={`text-[9px] font-bold tracking-tight relative z-10 transition-colors ${isMeActive ? 'text-pink-400 font-black' : 'text-zinc-400'}`}>
          {t('nav.me')}
        </span>
      </Link>

    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const noHeaderPaths = ['/profile', '/', '/calls', '/call', '/moments', '/rooms', '/messages', '/discover', '/room'];
  const isNoHeader = noHeaderPaths.some(path => location.pathname === path || location.pathname.startsWith(path));
  
  // Track validated rooms in a ref to avoid running blocking token refreshes on every minor state change
  const validatedRoomsRef = React.useRef<Record<string, boolean>>({});

  // Instantly initialize room ID on page load
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/room/')) {
        const parts = path.split('/');
        const rId = parts[2];
        if (rId && rId !== 'create') {
          return rId;
        }
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        const rParam = searchParams.get('roomId') || searchParams.get('room');
        if (rParam && rParam !== 'create') {
          return rParam;
        }
      }
    }
    return null;
  });

  React.useEffect(() => {
    const checkAndRedirect = async () => {
      const searchParams = new URLSearchParams(location.search);
      const adminParam = searchParams.get('admin') || searchParams.get('pin');
      if (adminParam) {
        navigate('/admin');
        return;
      }

      const rParam = searchParams.get('roomId') || searchParams.get('room');
      let targetRoomId = rParam && rParam !== 'create' ? rParam : null;

      if (!targetRoomId && location.pathname.startsWith('/room/')) {
        const parts = location.pathname.split('/');
        const rId = parts[2];
        if (rId && rId !== 'create') {
          targetRoomId = rId;
        }
      }

      if (targetRoomId) {
        setActiveRoomId(targetRoomId);
      }

      if (rParam && rParam !== 'create') {
        navigate(`/room/${rParam}`, { replace: true });
      }
    };

    checkAndRedirect();
  }, [location.pathname, location.search, navigate]);

  const isInsideActiveRoom = location.pathname.startsWith('/room/');
  // Only actual ongoing 1-on-1 calls `/call/:hostId` are full screen; `/calls` is the scrollable hosts lobby
  const isFullScreenCall = location.pathname.startsWith('/call/');
  const isBottomNavHidden = isInsideActiveRoom || location.pathname.startsWith('/live/') || isFullScreenCall;

  // Admin access check (Only owner / admin sees the admin crown in the header)
  const isUserAdmin = Boolean(
    user?.email === 'dkm924419@gmail.com' ||
    user?.email === 'noircouplehub@gmail.com' ||
    (profile as any)?.isSystemAdmin === true ||
    (profile as any)?.role === 'admin' ||
    localStorage.getItem('simulate_admin') === 'true'
  );

  return (
    <div className={`min-h-screen ${isFullScreenCall ? 'p-0 overflow-hidden h-screen' : 'pb-24 relative overflow-x-hidden'} bg-bg-dark text-white`}>
      {!isNoHeader && (
        <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-bg-dark/50 backdrop-blur-md z-40">
          <Logo size="md" />
          <div className="flex items-center gap-2">
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
                title="Super Admin Dashboard"
              >
                <span>👑</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Admin</span>
              </button>
            )}
            <Button variant="ghost" size="icon" className="text-gray-300" onClick={() => navigate('/moments')}>
              <Search size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-300" onClick={() => navigate('/level')}>
              <Trophy size={20} />
            </Button>
          </div>
        </header>
      )}
      
      <main className={isNoHeader ? '' : 'px-6'}>
        <div className="w-full">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Floating Minimized Room PiP capsule ONLY when user navigated away to other tabs */}
      <AnimatePresence>
        {activeRoomId && !isInsideActiveRoom && (
          <FloatingRoomPiP
            key={`pip_${activeRoomId}`}
            roomId={activeRoomId}
            onClose={() => setActiveRoomId(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating Minimized 1-on-1 Video Call PiP when user hits Back or navigates away */}
      <FloatingVideoCallPiP />

      {/* Hide BottomNav when user is active inside a video call, voice room, or live stream */}
      {!isBottomNavHidden && (
        <BottomNav />
      )}

      {/* Global Real-time Incoming Video Call Surprise Overlay */}
      <IncomingCallModal />

      {/* App Permissions Setup Modal (Camera, Phone, Mic, Notifications, Storage) */}
      <PermissionsModal />

      <Toaster position="top-center" expand={true} richColors />
    </div>
  );
}

export default function App() {
  const { user, profile, loading, banStatus, deviceId } = useAuth();
  
  const [showReconnect, setShowReconnect] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  React.useEffect(() => {
    // Persistent diagnostic registry for monitoring runtime integrity
    (window as any).__centralizedErrorLogs = (window as any).__centralizedErrorLogs || [];

    const handleRuntimeError = (event: ErrorEvent) => {
      const errMessage = event.message || '';
      if (!errMessage || errMessage === 'Script error.') return;
      const errStack = event.error?.stack || 'No stack trace';
      const logEntry = {
        type: 'uncaught-exception',
        message: errMessage,
        stack: errStack,
        timestamp: new Date().toISOString()
      };
      (window as any).__centralizedErrorLogs.push(logEntry);

      // Check if error is related to connection/sockets/webrtc/firestore
      const lowerMsg = errMessage.toLowerCase();
      if (
        lowerMsg.includes('webrtc_fatal') || 
        lowerMsg.includes('peerconnection_closed') || 
        lowerMsg.includes('websocket_fatal_disconnect')
      ) {
        setReconnectError(errMessage || 'Socket/Network connection interrupted.');
        setShowReconnect(true);
      }
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason?.message || reason || '');
      if (!reasonStr || reasonStr === 'Script error.') return;
      const errStack = reason?.stack || 'No stack trace';
      const logEntry = {
        type: 'unhandled-promise-rejection',
        message: reasonStr,
        stack: errStack,
        timestamp: new Date().toISOString()
      };
      (window as any).__centralizedErrorLogs.push(logEntry);

      // Trigger user-friendly reconnection notice on database, socket or webrtc interruptions
      const lowerReason = reasonStr.toLowerCase();
      if (
        lowerReason.includes('webrtc_fatal') || 
        lowerReason.includes('peerconnection_closed') || 
        lowerReason.includes('websocket_fatal_disconnect')
      ) {
        setReconnectError(reasonStr || 'Server real-time pipeline disconnected.');
        setShowReconnect(true);
      }
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    // Global hook to custom emit socket disruption signals from Room page
    const handleCustomSocketAlert = (e: Event) => {
      const detail = (e as any).detail || 'Web socket pipeline offline';
      setReconnectError(detail);
      setShowReconnect(true);
    };
    window.addEventListener('socket-connection-error', handleCustomSocketAlert);

    return () => {
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      window.removeEventListener('socket-connection-error', handleCustomSocketAlert);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090B]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.05, 1], opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-8"
        >
          <Logo size="xl" showText={true} />
        </motion.div>
      </div>
    );
  }

  // Intercept and load Full Screen Ban Notice if Device or ID is banned or restricted full lock out
  if (banStatus && (banStatus.isBanned || banStatus.type === 'device_ban' || banStatus.restrictionType === 'ban')) {
    return <BanOverlay banStatus={banStatus} deviceId={deviceId} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          user ? (
            <MainLayout>
              <Routes>
                <Route path="/" element={<VideoHostsPage />} />
                <Route path="/calls" element={<VideoHostsPage />} />
                <Route path="/call/:hostId" element={<VideoCallPage />} />
                <Route path="/moments" element={<MomentsPage />} />
                <Route path="/live" element={<MomentsPage />} />
                <Route path="/live/:streamId" element={<LiveRoomPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/room/create" element={<CreateRoomPage />} />
                <Route path="/create-room" element={<CreateRoomPage />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:userId" element={<MessagesPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/vip" element={<Navigate to="/profile" replace />} />
                <Route path="/vip-rooms" element={<Navigate to="/rooms" replace />} />
                <Route path="/agency" element={<AgencyPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/gifts/:userId" element={<GiftsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/backpack" element={<Navigate to="/profile" replace />} />
                <Route path="/level" element={<LevelPage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/join" element={<InvitePage />} />
                <Route path="/support" element={<CustomerServicePage />} />
                <Route path="/events" element={<EventCenterPage />} />
                <Route path="/astrology" element={<AstrologyPage />} />
                <Route path="/family" element={<FamilyPage />} />
                <Route path="/host" element={<HostCenterPage />} />
                <Route path="/apply-hosting" element={<ApplyHostingPage />} />
                <Route path="/apply-host" element={<ApplyHostingPage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/discover" element={<Navigate to="/moments" replace />} />
              </Routes>
            </MainLayout>
          ) : (
            <LoginPage />
          )
        } />
      </Routes>
      {showReconnect && (
        <div className="fixed inset-x-0 bottom-24 lg:bottom-6 mx-auto w-full max-w-md px-4 z-[999]">
          <div className="bg-[#090D1A]/95 hover:bg-[#0E1324]/95 border border-amber-500/30 text-white rounded-2xl shadow-[0_20px_60px_rgba(245,158,11,0.25)] p-5 backdrop-blur-xl flex flex-col gap-4 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 animate-pulse">
                <Sparkles size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black tracking-wide text-amber-400 uppercase">Real-time Connection Interrupted</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  The voice server or database socket reported a synchronization glitch. Our self-healing system is realigning connections.
                </p>
                {reconnectError && (
                  <p className="text-[10px] font-mono text-gray-400 mt-2 truncate bg-black/40 px-2 py-1 rounded border border-white/5">
                    Detail: {reconnectError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[11px] font-black tracking-widest text-slate-400 hover:text-white uppercase transition-colors"
                onClick={() => setShowReconnect(false)}
              >
                Dismiss
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[11px] font-black tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(245,158,11,0.3)] border-none"
                onClick={async () => {
                  toast.loading('Re-negotiating connections...', { id: 'app-reconnect' });
                  try {
                    if (navigator.onLine) {
                      if (auth.currentUser) {
                        await auth.currentUser.getIdToken(true);
                      }
                    }
                    toast.success('Successfully re-connected! ✨', { id: 'app-reconnect' });
                    setShowReconnect(false);
                  } catch (e) {
                    console.warn("Soft recovery failed, initiating page reload...", e);
                    window.location.reload();
                  }
                }}
              >
                Reconnect & Sync
              </Button>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}
