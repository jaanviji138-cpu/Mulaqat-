import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera, Sparkles, 
  Gift, Heart, Coins, Volume2, ShieldCheck, AlertCircle, RefreshCw, 
  X, Check, Flame, MessageCircle, Star, Award, Maximize2, Minimize2,
  Camera, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { INITIAL_VIDEO_HOSTS, VideoHost, IN_CALL_DARES } from '@/data/videoHosts';
import { ROMANTIC_GIFTS, RomanticGift } from '@/data/romanticGifts';
import { FullScreenGiftAnimation } from '@/components/FullScreenGiftAnimation';
import { soundEffects } from '@/utils/audioEffects';
import { ringingController } from '@/utils/ringingAudio';
import { globalAudioManager } from '@/services/globalAudioManager';
import { videoCallService, VideoCallSession } from '@/services/videoCallService';
import { activeCallService } from '@/services/activeCallService';
import { 
  CALL_COIN_RATE_PER_MINUTE, 
  getHostRatePercentForMinute, 
  getHostBeansForMinute, 
  calculateCallEarnings,
  MINUTE_RATES_TABLE,
  checkIsApprovedHost
} from '@/utils/callEarningSystem';
import { toast } from 'sonner';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function VideoCallPage() {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const isApprovedHost = checkIsApprovedHost(profile);

  // Find host details
  const [host, setHost] = useState<VideoHost | null>(null);
  const searchParams = new URLSearchParams(location.search);
  const isMatchCall = Boolean((location.state as any)?.isMatchCall || searchParams.get('match') === 'true');
  const autoAccepted = Boolean((location.state as any)?.autoAccepted);
  
  // Outgoing direct calls start in ringing mode; match calls and accepted incoming calls connect immediately
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'unanswered' | 'ended'>(() => {
    return (autoAccepted || isMatchCall) ? 'connected' : 'ringing';
  });

  // Automatically register connected call with activeCallService (for Match calls & instant connections)
  useEffect(() => {
    if (callStatus === 'connected' && host) {
      if (!autoAccepted && !isMatchCall && currentCoins < CALL_COIN_RATE_PER_MINUTE && coinsSpent === 0) {
        toast.error(`You need at least ${CALL_COIN_RATE_PER_MINUTE.toLocaleString()} coins for a 1-to-1 video call. Please recharge! ⚡`);
        navigate('/wallet');
        return;
      }
      const active = activeCallService.getActiveCall();
      if (!active || active.host.id !== host.id || active.callStatus !== 'connected') {
        activeCallService.startCall({
          host,
          callId: callId || undefined,
          callerUid: user?.uid,
          isMatchCall,
          initialCoins: currentCoins,
          durationSeconds,
          coinsSpent,
          hostBeansEarned,
          isMuted,
          isVideoOff,
          localStream: localStreamRef.current
        });
      }
    }
  }, [callStatus, host, isMatchCall]);

  // Firestore Call synchronization session ID & Match Call flag
  const [callId, setCallId] = useState<string>(() => {
    return (location.state as any)?.callId || searchParams.get('callId') || '';
  });

  // Autoplay policy state
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  
  // Audio & Video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isBeautyOn, setIsBeautyOn] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error' | 'permission_denied' | 'off'>('loading');
  
  // View swap: whether user's camera is in Full Screen and host is in PiP
  const [isSwappedView, setIsSwappedView] = useState(false);
  const [pipSize, setPipSize] = useState<'normal' | 'large'>('normal');
  
  // Streams & Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mainUserVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const giftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Call Timers, Coins & Host Beans Earning System
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [completedMinutes, setCompletedMinutes] = useState(0);
  const [currentCoins, setCurrentCoins] = useState<number>(profile?.coins ?? 1500);
  const [coinsSpent, setCoinsSpent] = useState(0);
  const [hostBeansEarned, setHostBeansEarned] = useState(0);
  const [currentMinuteRatePercent, setCurrentMinuteRatePercent] = useState(40);
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);
  const [floatingCoinDeduct, setFloatingCoinDeduct] = useState<string | null>(null);
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);

  // Modals & In-call Interactive features
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [activeFullScreenGift, setActiveFullScreenGift] = useState<RomanticGift | null>(null);
  const [selectedGiftCategory, setSelectedGiftCategory] = useState<'all' | 'sweet' | 'romantic' | 'passion' | 'royal'>('all');
  const [showDareModal, setShowDareModal] = useState(false);
  const [activeDare, setActiveDare] = useState<typeof IN_CALL_DARES[0] | null>(null);
  const [flyingHearts, setFlyingHearts] = useState<{ id: number; x: number }[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [endReason, setEndReason] = useState('User disconnected');

  // In-Call Live Text Chat with Host
  const [inCallText, setInCallText] = useState('');
  const [inCallMessages, setInCallMessages] = useState<{ id: string; sender: 'user' | 'host'; text: string }[]>([]);

  const handleSendInCallMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inCallText.trim();
    if (!text) return;
    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text };
    setInCallMessages(prev => [...prev.slice(-3), userMsg]);
    setInCallText('');

    // Host responds warmly after a short realistic delay
    setTimeout(() => {
      const cuteReplies = [
        'Aww thank you handsome! 🥰',
        'I am loving our private video call! 💖',
        'You have such a sweet voice! ✨',
        'Send me a rose darling! 🌹',
        'Aap kitne pyaare ho! 😘'
      ];
      const randomReply = cuteReplies[Math.floor(Math.random() * cuteReplies.length)];
      setInCallMessages(prev => [...prev.slice(-3), {
        id: (Date.now() + 1).toString(),
        sender: 'host' as const,
        text: randomReply
      }]);
    }, 1200);
  };

  // Load host
  useEffect(() => {
    // Check state from navigation first, or fallback to INITIAL_VIDEO_HOSTS
    const navStateHost = (location.state as any)?.host;
    if (navStateHost) {
      setHost(navStateHost);
    } else {
      const found = INITIAL_VIDEO_HOSTS.find(h => h.id === hostId) || INITIAL_VIDEO_HOSTS[0];
      setHost(found);
    }
  }, [hostId, location.state]);

  // Reconnect/maximize from active PiP call if available
  useEffect(() => {
    const existing = activeCallService.getActiveCall();
    if (existing && existing.host.id === hostId && existing.callStatus === 'connected') {
      setCallStatus('connected');
      setDurationSeconds(existing.durationSeconds);
      setCompletedMinutes(existing.completedMinutes);
      setCurrentCoins(existing.currentCoins);
      setCoinsSpent(existing.coinsSpent);
      setHostBeansEarned(existing.hostBeansEarned);
      setCurrentMinuteRatePercent(existing.currentMinuteRatePercent);
      setIsMuted(existing.isMuted);
      setIsVideoOff(existing.isVideoOff);
      if (existing.localStream) {
        localStreamRef.current = existing.localStream;
      }
      activeCallService.maximizeCall();
    }
  }, [hostId]);

  // Minimizes current call to floating PiP capsule instead of abruptly dropping the call
  const handleMinimizeCall = () => {
    if (!host) {
      navigate('/video-hosts');
      return;
    }

    activeCallService.startCall({
      host,
      callId: callId || undefined,
      callerUid: user?.uid,
      isMatchCall,
      initialCoins: currentCoins,
      durationSeconds,
      coinsSpent,
      hostBeansEarned,
      isMuted,
      isVideoOff,
      localStream: localStreamRef.current
    });
    activeCallService.minimizeCall();
    toast.info('📱 Call Minimized to PiP');
    navigate('/video-hosts', { replace: true });
  };

  // Intercept Back Button: If in connected call, minimize to floating PiP instead of dropping call
  useEffect(() => {
    if (callStatus !== 'connected') return;

    window.history.pushState({ inCall: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleMinimizeCall();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [callStatus, host, callId, isMatchCall, currentCoins, durationSeconds, coinsSpent, isMuted, isVideoOff]);

  // Keep coin balance in sync
  useEffect(() => {
    if (profile?.coins !== undefined) {
      setCurrentCoins(profile.coins);
    }
  }, [profile?.coins]);

  // Synchronize or initiate Call Session in Firestore
  useEffect(() => {
    let isCancelled = false;

    // If callId was not provided, initiate in Firestore
    if (!callId && host) {
      videoCallService.initiateCall({
        callerId: user?.uid || 'user_guest',
        callerName: user?.displayName || profile?.displayName || 'User',
        callerPhoto: user?.photoURL || profile?.photoURL || '',
        receiverId: host.id,
        receiverName: host.name,
        receiverPhoto: host.avatar,
        ratePerMinute: Math.max(host.ratePerMinute || 1500, 1500)
      }).then(newCallId => {
        if (!isCancelled) {
          setCallId(newCallId);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [callId, host, user?.uid, profile?.displayName]);

  // Listen to Firestore call status updates
  useEffect(() => {
    if (!callId) return;

    const unsubscribe = videoCallService.subscribeToCall(callId, (session) => {
      if (!session) return;

      if (session.status === 'connected') {
        if (callStatus !== 'connected') {
          setCallStatus('connected');
          ringingController.stopRinging();
          setIsAutoplayBlocked(false);
          toast.success(`${host?.name || 'Host'} connected! ✨`, { duration: 3000 });
          handleSignalingComplete();
        }
      } else if (session.status === 'declined') {
        ringingController.stopRinging();
        setIsAutoplayBlocked(false);
        toast.error(`${host?.name || 'Host'} is currently busy or declined`);
        handleEndCall('Host declined call');
      } else if (session.status === 'ended') {
        ringingController.stopRinging();
        setIsAutoplayBlocked(false);
        handleEndCall('Call session ended');
      }
    });

    return () => unsubscribe();
  }, [callId, callStatus, host?.name]);

  // Setup camera stream with progressive fallback and track state listeners
  const setupCamera = async (): Promise<MediaStream | null> => {
    setCameraStatus('loading');
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      let stream: MediaStream | null = null;

      // Strategy 1: Native device camera with preferred facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode
          },
          audio: false
        });
      } catch (e1) {
        // Strategy 2: HD vertical portrait mobile constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 720 },
              height: { ideal: 1280 }
            },
            audio: false
          });
        } catch (e2) {
          // Strategy 3: Any available video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      // Separately attach microphone track so mic permissions never kill the camera
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
          stream?.addTrack(track);
        });
      } catch (audioErr) {
        console.warn("Microphone access unavailable, proceeding with video-only:", audioErr);
      }

      if (stream) {
        // Attach track state listeners to prevent frozen stream
        stream.getVideoTracks().forEach(track => {
          track.enabled = !isVideoOff;

          track.onmute = () => {
            console.warn("[CameraStream] Video track muted by hardware/browser");
          };
          track.onunmute = () => {
            console.info("[CameraStream] Video track unmuted - unfreezing video element");
            const targetEl = isSwappedView ? mainUserVideoRef.current : localVideoRef.current;
            if (targetEl) {
              targetEl.play().catch(() => {});
            }
          };
          track.onended = () => {
            console.warn("[CameraStream] Video track ended unexpectedly; re-establishing camera...");
            setupCamera();
          };
        });

        localStreamRef.current = stream;

        // Robust attachment using videoCallService
        await videoCallService.bindAndResumeStream(localVideoRef.current, stream, { isVideoOff });
        await videoCallService.bindAndResumeStream(mainUserVideoRef.current, stream, { isVideoOff });

        setCameraStatus('active');
        return stream;
      }

      return null;
    } catch (err: any) {
      console.warn("Camera could not be accessed:", err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
      } else {
        setCameraStatus('error');
      }
      return null;
    }
  };

  // Resumes camera stream after WebRTC signaling completes to prevent frozen picture
  const handleSignalingComplete = async () => {
    console.info("[VideoCallPage] WebRTC signaling completed. Resuming streams & verifying track state...");
    const targetVideo = isSwappedView ? mainUserVideoRef.current : localVideoRef.current;
    const restoredStream = await videoCallService.resumeStreamAfterSignaling(
      targetVideo,
      localStreamRef.current,
      setupCamera,
      { isVideoOff }
    );
    if (restoredStream) {
      localStreamRef.current = restoredStream;
    }
  };

  // Initialize camera ONLY when call is connected (Camera does not open during ringing phase)
  useEffect(() => {
    if (callStatus === 'connected') {
      setupCamera();
    }

    return () => {
      // Only terminate hardware media tracks if the call was NOT minimized into PiP
      if (localStreamRef.current && !activeCallService.isMinimised()) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [callStatus, facingMode]);

  // Keep video elements bound when swapped or view changes
  useEffect(() => {
    if (localStreamRef.current && callStatus === 'connected') {
      const targetVideo = isSwappedView ? mainUserVideoRef.current : localVideoRef.current;
      videoCallService.bindAndResumeStream(targetVideo, localStreamRef.current, { isVideoOff });
    }
  }, [isSwappedView, isVideoOff, callStatus]);

  // Anti-Freeze Watchdog: continuously monitors video element play state & currentTime
  useEffect(() => {
    if (callStatus !== 'connected') return;

    const stopWatchdog = videoCallService.startStreamWatchdog(
      () => (isSwappedView ? mainUserVideoRef.current : localVideoRef.current),
      () => localStreamRef.current,
      () => isVideoOff
    );

    return () => {
      stopWatchdog();
    };
  }, [callStatus, isSwappedView, isVideoOff]);

  // Outgoing Ringing and Host Attendance Handshake Flow
  useEffect(() => {
    if (callStatus === 'ringing') {
      // 1. Start authentic pleasant telephone ringing on user's device
      globalAudioManager.startOutgoingRingtone({
        onBlocked: () => setIsAutoplayBlocked(true),
        onPlay: () => setIsAutoplayBlocked(false)
      });

      // Synchronize audio blocked state with GlobalAudioManager
      const unsubscribeAudio = globalAudioManager.subscribe((state) => {
        setIsAutoplayBlocked(state.isAudioBlocked);
      });

      // Check if host is active (online)
      const isHostActive = (host?.status ?? 'online') === 'online';
      const callCoinRate = Math.max(host?.ratePerMinute || 1500, 1500);

      // Strictly verify caller coin balance before connecting call
      if (currentCoins < callCoinRate) {
        globalAudioManager.stopOutgoingRingtone();
        ringingController.stopRinging();
        toast.error(`अपर्याप्त बैलेंस! वीडियो कॉल के लिए न्यूनतम ${callCoinRate.toLocaleString()} कॉइन्स आवश्यक हैं।`);
        navigate('/wallet');
        return;
      }

      // Ring for 6.8 seconds (2 full pleasant ringback cadences)
      const ringingTimer = setTimeout(async () => {
        globalAudioManager.stopOutgoingRingtone();
        if (isHostActive) {
          // Host attended the call! Camera will now open for both.
          if (callId) {
            await videoCallService.updateCallStatus(callId, 'connected').catch(() => {});
          }
          setCallStatus('connected');
          if (host) {
            activeCallService.startCall({
              host,
              callId: callId || undefined,
              callerUid: user?.uid,
              isMatchCall,
              initialCoins: currentCoins,
              durationSeconds: 0,
              coinsSpent: 0,
              hostBeansEarned: 0,
              isMuted: false,
              isVideoOff: false,
              localStream: localStreamRef.current
            });
          }
          toast.success(`${host?.name || 'Host'} answered the call! 💖`);
          handleSignalingComplete();
        } else {
          // Host is offline/busy and cannot answer
          setCallStatus('unanswered');
          globalAudioManager.stopAll();
          ringingController.stopRinging();
          toast.error(`${host?.name || 'Host'} is currently offline or unable to answer.`);
        }
      }, 6800);

      return () => {
        unsubscribeAudio();
        globalAudioManager.stopOutgoingRingtone();
        clearTimeout(ringingTimer);
      };
    } else {
      globalAudioManager.stopOutgoingRingtone();
      setIsAutoplayBlocked(false);
    }
  }, [callStatus, host, callId]);

  // Real-time synchronization with activeCallService (Mulaqat Coins & Host Beans System)
  useEffect(() => {
    let prevCompletedMin = 0;
    const unsub = activeCallService.subscribe((state) => {
      if (state && state.callStatus === 'connected') {
        setDurationSeconds(state.durationSeconds);
        setCurrentCoins(state.currentCoins);
        setCoinsSpent(state.coinsSpent);
        setHostBeansEarned(state.hostBeansEarned);
        setCompletedMinutes(state.completedMinutes);
        setCurrentMinuteRatePercent(state.currentMinuteRatePercent);

        // Visual floating indicator on completed minute transition
        if (state.completedMinutes > prevCompletedMin) {
          prevCompletedMin = state.completedMinutes;
          const minNum = state.completedMinutes;
          const ratePct = getHostRatePercentForMinute(minNum);
          const beansEarned = getHostBeansForMinute(minNum);

          if (minNum === 1) {
            setFloatingCoinDeduct(`Minute 1 Complete: +${beansEarned} Beans (${ratePct}%) to Host! 🫘`);
          } else if (minNum === 10) {
            setFloatingCoinDeduct(`🎉 10-Min Task Completed! +${beansEarned} Beans (Max 45%) Unlocked! 🫘`);
          } else {
            setFloatingCoinDeduct(`Minute ${minNum}: -1,500 🪙 | +${beansEarned} Beans (${ratePct}%) to Host! 🫘`);
          }
          setTimeout(() => setFloatingCoinDeduct(null), 3500);
        }
      } else if (state && state.callStatus === 'ended') {
        // Automatic disconnect when coins run out (wallet balance exhausted)
        handleEndCall('Coins balance exhausted. कॉइन्स समाप्त हो गए!');
      }
    });
    return () => unsub();
  }, []);

  // Helper format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Video Off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Cleanup gift timer on unmount
  useEffect(() => {
    return () => {
      if (giftTimeoutRef.current) {
        clearTimeout(giftTimeoutRef.current);
      }
    };
  }, []);

  // Current caller status check: male/caller does NOT earn beans
  const isCaller = profile?.gender !== 'female' && profile?.role !== 'host';

  // Send in-call romantic gift with full screen animation (exactly 3 seconds)
  const handleSendGift = (gift: RomanticGift) => {
    if (currentCoins < gift.cost) {
      toast.error('Not enough coins for this gift! Please recharge your wallet.');
      setShowGiftModal(false);
      navigate('/wallet');
      return;
    }

    // Instantly close gift modal so screen is clear
    setShowGiftModal(false);

    // Instantly deduct coins & play celebration
    setCurrentCoins(c => Math.max(0, c - gift.cost));
    setCoinsSpent(s => s + gift.cost);
    soundEffects.playGiftCelebration();

    // Trigger full screen animation
    setActiveFullScreenGift(gift);

    // Host receives 50% of gift value in Beans
    const hostGiftBeans = Math.floor(gift.cost * 0.5);
    if (host?.id) {
      try {
        const hostRef = doc(db, 'users', host.id);
        updateDoc(hostRef, {
          beans: increment(hostGiftBeans),
          totalBeansEarned: increment(hostGiftBeans),
        }).catch(() => {});
      } catch (e) {}
    }

    // Enforce exact 3.0 second animation duration
    if (giftTimeoutRef.current) {
      clearTimeout(giftTimeoutRef.current);
    }
    giftTimeoutRef.current = setTimeout(() => {
      setActiveFullScreenGift(null);
    }, 3000);

    // Trigger visual floating hearts/sparkles for 3 seconds
    const newHearts = Array.from({ length: 14 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 80 + 10
    }));
    setFlyingHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setFlyingHearts([]);
    }, 3000);

    toast.success(`Sent ${gift.icon} ${gift.hindiName} (${gift.name}) to ${host?.name || 'Host'}! 💖`, {
      duration: 2500
    });

    // Update in database
    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          coins: increment(-gift.cost)
        }).catch(() => {});
      } catch (e) {}
    }
  };

  // Trigger Dare
  const handleTriggerDare = (dare: typeof IN_CALL_DARES[0]) => {
    if (currentCoins < dare.coinCost) {
      toast.error('Not enough coins for this dare! Recharge wallet.');
      return;
    }

    setCurrentCoins(c => c - dare.coinCost);
    setCoinsSpent(s => s + dare.coinCost);
    soundEffects.playGiftCelebration();
    setActiveDare(dare);
    setShowDareModal(false);

    toast.success(`Dare triggered: "${dare.text}"! 💃`);
    setTimeout(() => {
      setActiveDare(null);
    }, 9000);
  };

  // End Call
  const handleEndCall = (reasonOrEvent?: string | React.MouseEvent) => {
    const reason = typeof reasonOrEvent === 'string' ? reasonOrEvent : 'User ended call';
    globalAudioManager.stopAll();
    ringingController.stopRinging();
    activeCallService.endCall(reason);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (callId) {
      videoCallService.updateCallStatus(callId, 'ended', { endReason: reason });
    }
    setEndReason(reason);
    setCallStatus('ended');
    setShowSummaryModal(true);
  };

  return (
    <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-[#06040B] text-white overflow-hidden flex flex-col select-none">
      
      {/* Top ambient container */}
      <AnimatePresence>
        {/* Banner completely removed per user instruction */}
      </AnimatePresence>

      {/* 1. Video Surface (Host Backdrop or Fullscreen User Camera) */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
        {isSwappedView ? (
          /* User Camera Full Screen View */
          <div className="absolute inset-0 w-full h-full bg-black">
            {isVideoOff ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400">
                <VideoOff size={48} className="text-zinc-600 mb-3" />
                <p className="text-base font-bold text-white">Your Camera is Paused</p>
                <button
                  type="button"
                  onClick={toggleVideo}
                  className="mt-3 px-4 py-2 rounded-xl bg-pink-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
                >
                  Resume Camera 📷
                </button>
              </div>
            ) : cameraStatus === 'permission_denied' || cameraStatus === 'error' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 p-6 text-center">
                <AlertCircle size={44} className="text-amber-400 mb-3 animate-bounce" />
                <p className="text-base font-bold text-white mb-1">Camera Permission Required</p>
                <p className="text-xs text-zinc-400 max-w-xs mb-4">Browser blocked camera access or camera is busy. Tap below to grant permission.</p>
                <button
                  type="button"
                  onClick={setupCamera}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-xs shadow-lg active:scale-95 transition-all"
                >
                  Enable Camera 📷
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <video
                  ref={(el) => {
                    mainUserVideoRef.current = el;
                    if (el && localStreamRef.current) {
                      if (el.srcObject !== localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.play().catch(() => {});
                    setCameraStatus('active');
                  }}
                  className={`w-full h-full object-cover object-center ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${isBeautyOn ? 'contrast-[1.02] brightness-[1.05] saturate-[1.08]' : ''}`}
                />
                <div className="absolute top-24 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Your Live Camera (Full Screen)</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
          </div>
        ) : (
          /* Host Backdrop View */
          host && (
            <div className="absolute inset-0 w-full h-full">
              {/* Host Backdrop Image with subtle breathing zoom animation */}
              <motion.img 
                src={host.coverPhoto || host.avatar} 
                alt={host.name}
                className={`w-full h-full object-cover ${isBeautyOn ? 'brightness-105 contrast-105 saturate-110' : ''}`}
                animate={{
                  scale: [1, 1.03, 1],
                  filter: [
                    'brightness(1) contrast(1)',
                    'brightness(1.05) contrast(1.05)',
                    'brightness(1) contrast(1)'
                  ]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              {/* Dark glass subtle gradient overlays for controls legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-950/20 via-transparent to-purple-950/20 pointer-events-none" />
            </div>
          )
        )}

        {/* Ringing Overlay: Fullscreen Host DP + Center Pulse + Red Cut Call Button */}
        {callStatus === 'ringing' && (
          <div 
            onClick={() => {
              globalAudioManager.unblockAudio();
              setIsAutoplayBlocked(false);
            }}
            className="absolute inset-0 z-50 flex flex-col justify-between items-center bg-black cursor-pointer"
          >
            {/* Fullscreen Host Backdrop Image */}
            <img 
              src={host?.coverPhoto || host?.avatar} 
              alt={host?.name}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.70]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/95 pointer-events-none" />

            {/* Top Calling Status Capsule */}
            <div className="relative z-10 pt-14 text-center px-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-xs font-bold text-pink-300 border border-pink-500/40 shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
                1-on-1 Private Video Calling...
              </span>
            </div>

            {/* Center Host Profile with Pulsing Rings */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
              <div className="relative flex items-center justify-center mb-6">
                <motion.div 
                  className="absolute w-44 h-44 rounded-full border-2 border-pink-500/40"
                  animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div 
                  className="absolute w-36 h-36 rounded-full border-2 border-rose-500/50"
                  animate={{ scale: [1, 1.4], opacity: [0.9, 0] }}
                  transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                />
                <img 
                  src={host?.avatar} 
                  alt={host?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.9)]"
                />
              </div>

              <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-1.5 justify-center drop-shadow-md">
                <span>{host?.name}</span>
                {host?.isVerified && <ShieldCheck size={22} className="text-pink-400 fill-pink-400/20" />}
              </h2>
              <p className="text-zinc-300 text-xs font-medium mt-1">
                {host?.city} • {host?.languages?.join(', ')}
              </p>
              <div className="mt-3 px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Coins size={14} className="text-amber-400" />
                <span>Rate: {Math.max(host?.ratePerMinute || 1500, 1500).toLocaleString()} Coins / min</span>
              </div>

              {/* Tap to unblock audio if browser blocked sound */}
              {isAutoplayBlocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    globalAudioManager.unblockAudio();
                    setIsAutoplayBlocked(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-full bg-pink-600/90 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg border border-pink-400/50 animate-bounce cursor-pointer"
                >
                  <Volume2 size={15} />
                  <span>🔊 Tap to hear ringtone</span>
                </button>
              )}
            </div>

            {/* Bottom: ONLY Red Cut Call Button */}
            <div className="relative z-10 pb-16 text-center flex flex-col items-center">
              <button 
                type="button"
                onClick={() => {
                  globalAudioManager.stopAll();
                  ringingController.stopRinging();
                  navigate(-1);
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.9)] ring-4 ring-rose-500/40 active:scale-90 hover:scale-105 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={32} />
              </button>
              <span className="text-xs font-black text-rose-300 mt-2.5 tracking-wide">
                Cancel Call
              </span>
            </div>
          </div>
        )}

        {/* Unanswered Screen: When host is offline/busy and didn't attend */}
        {callStatus === 'unanswered' && (
          <div className="absolute inset-0 z-50 flex flex-col justify-between items-center bg-[#080512] text-white p-6 pt-16 pb-14 select-none">
            {/* Top Status */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                No Answer
              </span>
            </div>

            {/* Center Host Info */}
            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="relative mb-5">
                <img 
                  src={host?.avatar} 
                  alt={host?.name} 
                  className="w-28 h-28 rounded-full object-cover border-4 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.3)] opacity-90"
                />
                <span className="absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-amber-300 text-[10px] font-black border border-amber-500/40">
                  {host?.status === 'busy' ? 'Busy' : 'Offline'}
                </span>
              </div>

              <h2 className="text-xl font-black text-white">{host?.name}</h2>
              <p className="text-xs text-zinc-400 mt-2 font-medium leading-relaxed">
                Host is currently busy or unable to answer the call. Please try again in a few moments or connect with another active host.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="w-full max-w-xs flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/video-hosts')}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Video size={16} />
                <span>Call Another Active Host</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white font-bold text-xs border border-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <span>← Back</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Top Header Info Bar (Only shown when callStatus is 'connected') */}
        {callStatus === 'connected' && (
          <div className="absolute top-0 inset-x-0 z-[60] pt-8 pb-4 px-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              {/* Back / Minimize Call Button */}
              <button
                type="button"
                onClick={handleMinimizeCall}
                className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-xl active:scale-90 transition-all shadow-md cursor-pointer shrink-0"
                title="Minimize Call to PiP"
              >
                <ChevronLeft size={22} className="stroke-[2.5]" />
              </button>

              {/* Host Profile Capsule */}
              <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full py-1.5 px-3 shadow-lg">
                <div className="relative">
                  <img 
                    src={host?.avatar} 
                    alt={host?.name} 
                    className="w-9 h-9 rounded-full object-cover border-2 border-pink-500" 
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white tracking-tight">{host?.name}</span>
                    {host?.isVerified && <ShieldCheck size={13} className="text-pink-400" />}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-300">
                    <span className="text-yellow-400 font-semibold">{CALL_COIN_RATE_PER_MINUTE.toLocaleString()} 🪙/m</span>
                    <span>•</span>
                    <span className="font-mono text-white font-bold">{formatTime(durationSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Host Live Rate & Beans Pill - Only visible for Approved Host with Host ID */}
              {!isCaller && isApprovedHost && (
                <div className="hidden xs:flex items-center gap-1.5 bg-black/60 backdrop-blur-xl border border-pink-500/30 rounded-full py-1.5 px-3 text-[11px] shadow-lg">
                  <span className="text-yellow-300 font-black flex items-center gap-0.5">
                    🫘 {hostBeansEarned.toLocaleString()} Beans
                  </span>
                </div>
              )}
            </div>

            {/* Right Side: Coins Balance + Red Cut Call Button in Top Corner */}
            <div className="flex items-center gap-2">
              <div 
                onClick={() => navigate('/wallet')}
                className="cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 backdrop-blur-xl rounded-full py-1.5 px-3 text-xs font-black text-amber-300 hover:scale-105 active:scale-95 transition-all"
              >
                <Coins size={14} className="text-amber-400" />
                <span>{currentCoins.toLocaleString()}</span>
              </div>

              {/* Corner Cut Call Button */}
              <button 
                type="button"
                onClick={() => handleEndCall('User ended call')}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.8)] border border-rose-400 active:scale-90 hover:scale-105 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 3. Floating Deduct Indicator Animation */}
        <AnimatePresence>
          {floatingCoinDeduct && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: -40, scale: 1.2 }}
              exit={{ opacity: 0, y: -80, scale: 0.9 }}
              className="absolute top-24 z-30 flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-sm px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.8)] border border-pink-400"
            >
              <Coins size={16} />
              <span>{floatingCoinDeduct} (1 Min Talk)</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Active Dare Banner (If triggered) */}
        <AnimatePresence>
          {activeDare && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="absolute top-20 inset-x-6 z-30 bg-gradient-to-r from-purple-900/90 to-pink-900/90 border-2 border-pink-500/80 backdrop-blur-xl rounded-2xl p-3 text-center shadow-[0_0_30px_rgba(236,72,153,0.6)]"
            >
              <div className="flex items-center justify-center gap-2 text-pink-300 font-bold text-xs uppercase tracking-wider mb-1">
                <Flame size={14} className="text-yellow-400 animate-bounce" />
                <span>Live Dare in Progress!</span>
                <Flame size={14} className="text-yellow-400 animate-bounce" />
              </div>
              <p className="text-white text-base font-black tracking-wide">{activeDare.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Low Balance Warning Alert */}
        {showLowBalanceWarning && callStatus === 'connected' && (
          <div className="absolute top-24 inset-x-4 z-20 bg-amber-500/90 text-black text-xs font-black py-1.5 px-3 rounded-xl flex items-center justify-between shadow-xl animate-pulse">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={15} />
              <span>Low Balance: Less than 1 minute remaining!</span>
            </div>
            <button 
              onClick={() => navigate('/wallet')} 
              className="bg-black text-white px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold"
            >
              Recharge ⚡
            </button>
          </div>
        )}

        {/* 6. Flying Hearts & Gifts Canvas */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {flyingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: '80%', x: `${heart.x}%`, scale: 0.5 }}
              animate={{ opacity: 0, y: '10%', scale: 1.8 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute text-3xl"
            >
              💖
            </motion.div>
          ))}
        </div>

        {/* 7. Picture-in-Picture (PiP) Window (Only rendered when call is connected) */}
        {callStatus === 'connected' && (
          isSwappedView ? (
            /* Host PiP when User Camera is Fullscreen */
            <motion.div 
              drag
              dragConstraints={{ left: -140, right: 140, top: -250, bottom: 250 }}
            onClick={() => {
              setIsSwappedView(false);
              toast.info('Swapped view: Host is now Full Screen');
            }}
            className={`absolute top-20 right-4 z-20 ${
              pipSize === 'large' ? 'w-44 sm:w-52' : 'w-28 sm:w-34'
            } aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-[0_10px_35px_rgba(0,0,0,0.85)] cursor-pointer backdrop-blur-md transition-all group`}
            title="Tap to make Host full screen"
          >
            <img 
              src={host?.avatar} 
              alt={host?.name}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
            <div className="absolute bottom-1.5 inset-x-1.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center justify-between text-[9px] font-bold text-white">
              <span className="truncate">{host?.name || 'Host'}</span>
              <span className="text-[8px] text-pink-300 flex items-center gap-0.5">
                <Minimize2 size={9} />
                <span>Host</span>
              </span>
            </div>
            <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-full text-white/80 group-hover:text-white transition-all">
              <RefreshCw size={11} />
            </div>
          </motion.div>
        ) : (
          /* User Camera PiP when Host is Fullscreen */
          <motion.div 
            drag
            dragConstraints={{ left: -140, right: 140, top: -250, bottom: 250 }}
            className={`absolute top-20 right-4 z-20 ${
              pipSize === 'large' ? 'w-44 sm:w-52' : 'w-28 sm:w-34'
            } aspect-[3/4] bg-zinc-950 rounded-2xl overflow-hidden border-2 border-pink-500/70 shadow-[0_10px_35px_rgba(0,0,0,0.85)] cursor-grab active:cursor-grabbing backdrop-blur-md transition-all group`}
          >
            {isVideoOff ? (
              <div 
                onClick={toggleVideo}
                className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 text-[10px] p-2 text-center cursor-pointer hover:bg-zinc-900 transition-all"
              >
                <VideoOff size={22} className="mb-1 text-zinc-500" />
                <span className="font-bold">Camera Off</span>
                <span className="text-[8px] text-pink-400 mt-0.5">Tap to turn on</span>
              </div>
            ) : cameraStatus === 'permission_denied' || cameraStatus === 'error' ? (
              <div 
                onClick={setupCamera}
                className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-2 text-center cursor-pointer hover:bg-zinc-900 transition-all"
              >
                <AlertCircle size={22} className="mb-1 text-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-white leading-tight">Enable Camera</span>
                <span className="text-[8px] text-pink-400 mt-1 bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-500/30">Tap to allow 📷</span>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setIsSwappedView(true);
                  toast.info('Your camera is now Full Screen 📱');
                }}
                className="relative w-full h-full cursor-pointer"
                title="Tap to make your camera full screen"
              >
                <video 
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStreamRef.current) {
                      if (el.srcObject !== localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                      }
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay 
                  playsInline 
                  muted 
                  onLoadedMetadata={(e) => {
                    e.currentTarget.play().catch(() => {});
                    setCameraStatus('active');
                  }}
                  className={`w-full h-full object-cover object-center ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${isBeautyOn ? 'contrast-[1.02] brightness-[1.05] saturate-[1.08]' : ''}`}
                />
                {cameraStatus === 'loading' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <RefreshCw size={16} className="animate-spin text-pink-400" />
                  </div>
                )}
                
                {/* Overlay with tap to expand indicator */}
                <div className="absolute bottom-1.5 inset-x-1.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center justify-between text-[9px] font-bold text-zinc-200 group-hover:bg-pink-600/90 group-hover:text-white transition-all">
                  <span>You</span>
                  <span className="text-[8px] text-pink-300 group-hover:text-white font-semibold flex items-center gap-0.5">
                    <Maximize2 size={9} />
                    <span>Expand</span>
                  </span>
                </div>
              </div>
            )}

            {/* Corner PiP resize toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPipSize(prev => prev === 'normal' ? 'large' : 'normal');
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
              title={pipSize === 'normal' ? 'Enlarge preview' : 'Shrink preview'}
            >
              {pipSize === 'normal' ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Floating In-Call Messages Overlay (Connected Phase) */}
      {callStatus === 'connected' && inCallMessages.length > 0 && (
        <div className="absolute bottom-32 inset-x-4 z-40 flex flex-col gap-2 pointer-events-none max-w-sm mx-auto">
          {inCallMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`px-3.5 py-1.5 rounded-2xl text-xs backdrop-blur-xl shadow-lg max-w-[85%] border ${
                msg.sender === 'user' 
                  ? 'bg-purple-700/80 text-white self-end border-purple-400/50 rounded-br-none' 
                  : 'bg-gradient-to-r from-pink-600/90 to-rose-600/90 text-white self-start border-pink-400/50 rounded-bl-none'
              }`}
            >
              <span className="text-[10px] font-black block opacity-80">
                {msg.sender === 'user' ? 'You' : `${host?.name} 💖`}
              </span>
              <span className="font-semibold text-[13px]">{msg.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* 8. Bottom In-Call Interactive Control Panel (Only shown when callStatus === 'connected') */}
      {callStatus === 'connected' && (
        <div className="relative z-[60] px-4 pb-12 pt-3 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3">
          
          {/* Long Horizontal Strip: In-Call Message Input */}
          <form onSubmit={handleSendInCallMessage} className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full pl-4 pr-1.5 py-1.5 shadow-xl max-w-md mx-auto w-full">
            <input
              type="text"
              value={inCallText}
              onChange={(e) => setInCallText(e.target.value)}
              placeholder="Send message to host..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-400 outline-none"
            />
            <button
              type="submit"
              disabled={!inCallText.trim()}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs disabled:opacity-40 active:scale-95 transition-all shadow cursor-pointer shrink-0"
            >
              Send 💬
            </button>
          </form>

          {/* Connected Action Buttons: Send Gift, Flip Camera, Cam On/Off */}
          <div className="flex items-center justify-center gap-6 max-w-sm mx-auto w-full pt-1">
            
            {/* Send Gift Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setShowGiftModal(true)}
                className="w-13 h-13 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)] border border-pink-300 active:scale-90 hover:scale-105 transition-all cursor-pointer"
                title="Send Gift to Host"
              >
                <Gift size={22} className="text-yellow-300" />
              </button>
              <span className="text-[10px] font-black text-pink-300">
                Send Gift 🎁
              </span>
            </div>

            {/* Flip Camera Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={flipCamera}
                className="w-13 h-13 rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer"
                title="Flip Camera"
              >
                <SwitchCamera size={22} />
              </button>
              <span className="text-[10px] font-bold text-zinc-300">
                Flip Cam 🔄
              </span>
            </div>

            {/* Toggle Video (Cam On/Off) Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer ${
                  isVideoOff 
                    ? 'bg-red-500/30 text-red-400 border border-red-500/60' 
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
              <span className="text-[10px] font-bold text-zinc-300">
                {isVideoOff ? 'Turn Cam On' : 'Cam Off 📹'}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 9. Dare Selection Modal */}
      <AnimatePresence>
        {showDareModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-[#120B20] border border-pink-500/30 rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="text-pink-500" />
                  <h3 className="font-black text-white text-base">Dare {host?.name || 'Host'} 🎲</h3>
                </div>
                <button 
                  onClick={() => setShowDareModal(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Pick a flirty dare! The host will perform this action live on your call:
              </p>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {IN_CALL_DARES.map(dare => (
                  <button
                    key={dare.id}
                    onClick={() => handleTriggerDare(dare)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{dare.icon}</span>
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{dare.text}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-black shrink-0">
                      {dare.coinCost} 🪙
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10. Romantic Gift Selection Modal */}
      <AnimatePresence>
        {showGiftModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md bg-[#120B20] border border-pink-500/40 rounded-t-[32px] sm:rounded-3xl p-5 shadow-[0_0_50px_rgba(236,72,153,0.3)] max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                    <Gift size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base flex items-center gap-1.5">
                      <span>Romantic Special Gifts</span>
                      <span className="text-pink-400">💖</span>
                    </h3>
                    <p className="text-[10px] text-pink-200/80">
                      Send a gift and trigger a stunning full-screen animation!
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGiftModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar shrink-0">
                {[
                  { id: 'all', label: 'All', icon: '✨' },
                  { id: 'romantic', label: 'Romantic', icon: '💋' },
                  { id: 'sweet', label: 'Sweet Love', icon: '🌹' },
                  { id: 'passion', label: 'Hot Passion', icon: '🔥' },
                  { id: 'royal', label: 'Royal Luxury', icon: '👑' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedGiftCategory(cat.id as any)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                      selectedGiftCategory === cat.id
                        ? 'bg-pink-600 text-white border-pink-400 shadow-md scale-105'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-zinc-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Romantic Gifts Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto py-2 pr-1 max-h-[50vh]">
                {ROMANTIC_GIFTS
                  .filter(g => selectedGiftCategory === 'all' || g.category === selectedGiftCategory)
                  .map(gift => (
                    <button
                      key={gift.id}
                      type="button"
                      onClick={() => handleSendGift(gift)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/50 transition-all group active:scale-95 text-center relative overflow-hidden cursor-pointer"
                    >
                      <span className="text-3xl group-hover:scale-125 transition-transform drop-shadow-md">
                        {gift.icon}
                      </span>
                      <span className="text-[11px] font-black text-white mt-1.5 leading-tight line-clamp-1">
                        {gift.name}
                      </span>
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-yellow-300 text-[10px] font-black border border-yellow-500/30">
                        {gift.cost} 🪙
                      </div>
                    </button>
                  ))}
              </div>

              {/* Bottom Balance & Wallet Link */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-xs shrink-0">
                <span className="text-zinc-400">
                  Balance: <strong className="text-yellow-400 font-mono text-sm">{currentCoins.toLocaleString()} 🪙</strong>
                </span>
                <button 
                  type="button"
                  onClick={() => navigate('/wallet')} 
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs hover:from-amber-400 shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Coins size={13} />
                  <span>Recharge +</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN ROMANTIC GIFT ANIMATION OVERLAY */}
      <FullScreenGiftAnimation
        gift={activeFullScreenGift}
        hostName={host?.name || 'Host'}
        senderName={user?.displayName || profile?.displayName || 'User'}
        onComplete={() => setActiveFullScreenGift(null)}
      />

      {/* 11. Luxury Call Summary Modal (When call ends or is declined) */}
      <AnimatePresence>
        {showSummaryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowSummaryModal(false);
              navigate('/calls');
            }}
            className="fixed inset-0 z-50 bg-[#07040E]/90 backdrop-blur-2xl flex items-center justify-center p-5 select-none"
          >
            <motion.div 
              initial={{ scale: 0.88, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gradient-to-b from-[#180F2E] to-[#0D071B] border border-pink-500/30 rounded-[32px] p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(236,72,153,0.25)] relative overflow-hidden"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button in Top Corner */}
              <button
                type="button"
                id="call-summary-close-btn"
                onClick={() => {
                  setShowSummaryModal(false);
                  navigate('/calls');
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 z-10"
                title="Close"
              >
                <X size={16} />
              </button>

              {/* Host Avatar with Ambient Ring */}
              <div className="relative w-24 h-24 mx-auto mb-4 mt-2">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 animate-spin-slow opacity-80 blur-[2px]" />
                <div className="relative w-full h-full rounded-full p-1 bg-[#180F2E]">
                  <img 
                    src={host?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200'} 
                    alt={host?.name || 'Host'} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg border border-red-400/40 whitespace-nowrap">
                  Disconnected
                </span>
              </div>

              {/* Title & Status */}
              <h3 className="text-xl font-black text-white tracking-tight">
                Call with {host?.name || 'Host'}
              </h3>
              <p className="text-xs text-pink-300/90 font-medium mt-1">
                {endReason === 'Host declined call' 
                  ? `${host?.name || 'Host'} is currently busy` 
                  : 'Private session successfully completed'}
              </p>

              {/* Duration Card */}
              <div className="my-5 bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">
                  Total Duration
                </span>
                <p className="text-3xl font-black text-white font-mono mt-1 tracking-tight">
                  {formatTime(durationSeconds)}
                </p>
                <span className="text-[10px] text-pink-300/70 mt-1 block font-medium">
                  {durationSeconds > 0 ? 'High Definition 1-on-1 Session' : 'Call did not connect'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  id="call-summary-done-btn"
                  onClick={() => {
                    setShowSummaryModal(false);
                    navigate('/calls');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-black text-sm text-white shadow-[0_4px_20px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-pink-400/30"
                >
                  <span>Done</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSummaryModal(false);
                    navigate('/messages');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                >
                  <MessageCircle size={14} className="text-pink-400" />
                  <span>Send Message to {host?.name || 'Host'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
