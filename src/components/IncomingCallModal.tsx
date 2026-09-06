import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, PhoneOff, Video, Sparkles, 
  Crown, ShieldCheck, Coins
} from 'lucide-react';
import { INITIAL_VIDEO_HOSTS, VideoHost } from '@/data/videoHosts';
import { soundEffects } from '@/utils/audioEffects';
import { ringingController } from '@/utils/ringingAudio';
import { videoCallService } from '@/services/videoCallService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function IncomingCallModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [incomingHost, setIncomingHost] = useState<VideoHost | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);
  
  const countdownTimerRef = useRef<any>(null);
  const autoCallTimerRef = useRef<any>(null);
  const autoCallCountRef = useRef<number>(0);
  const isInsideCallOrRoomRef = useRef(false);
  const incomingHostRef = useRef<VideoHost | null>(null);
  const isHandlingCallEndRef = useRef(false);

  const activeUid = user?.uid || 'user_local';

  // Check if current route is an active call or voice room (no incoming calls during active sessions)
  const isInsideCallOrRoom = 
    location.pathname.startsWith('/call/') || 
    location.pathname.startsWith('/room/') || 
    location.pathname.startsWith('/live/') ||
    location.pathname === '/login';

  isInsideCallOrRoomRef.current = isInsideCallOrRoom;
  incomingHostRef.current = incomingHost;

  // Function to stop ringtone safely
  const stopRingtone = () => {
    ringingController.stopRinging();
    soundEffects.stopVoiceNote();
  };

  // Launch an incoming call
  const triggerCall = (host?: VideoHost, incomingCallId?: string) => {
    if (isInsideCallOrRoomRef.current || incomingHostRef.current) return;

    isHandlingCallEndRef.current = false;

    // Pick random popular host or specified
    const selectedHost = host || INITIAL_VIDEO_HOSTS[Math.floor(Math.random() * Math.min(INITIAL_VIDEO_HOSTS.length, 5))];
    
    setIncomingHost(selectedHost);
    incomingHostRef.current = selectedHost;
    setActiveCallId(incomingCallId || null);
    setCountdown(15); // Exactly 15 seconds full ring duration

    // Explicit ringing trigger (plays continuous 15-second melody)
    ringingController.triggerRinging({
      volume: 1.0
    });

    // Try device vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([400, 300, 400, 300, 600]);
      } catch (e) {}
    }
  };

  // Listen for real incoming calls targeting this user in Firestore
  useEffect(() => {
    if (!user?.uid || isInsideCallOrRoom) return;

    const unsubscribe = videoCallService.listenForIncomingCalls(user.uid, (call) => {
      if (incomingHostRef.current) return;
      const hostMatch = INITIAL_VIDEO_HOSTS.find(h => h.id === call.callerId) || {
        id: call.callerId,
        name: call.callerName,
        avatar: call.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        coverPhoto: call.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        bio: 'Maxo Live video call host',
        isVerified: true,
        age: 23,
        status: 'online' as const,
        rating: 4.9,
        ratePerMinute: Math.max(call.ratePerMinute || 1500, 1500),
        city: 'Mumbai',
        languages: ['Hindi', 'English'],
        tags: ['Trending', 'Video Call'],
        voiceNoteText: `Hey! Pick up my call, let's talk face to face!`,
        isTrending: true,
        callCount: 1540
      };
      triggerCall(hostMatch, call.id);
    });

    return () => unsubscribe();
  }, [user?.uid, isInsideCallOrRoom]);

  // Listen for global manual trigger events
  useEffect(() => {
    const handleCustomTrigger = (e: any) => {
      const host = e.detail?.host;
      triggerCall(host);
    };

    window.addEventListener('trigger-incoming-call', handleCustomTrigger);
    return () => {
      window.removeEventListener('trigger-incoming-call', handleCustomTrigger);
    };
  }, []);

  /**
   * INCOMING CALL FREQUENCY & 5-CALL LIMIT LOGIC:
   * 1. New user / entering app: Incoming call comes every 1 minute (60s). Max strictly 5 calls.
   * 2. When user recharges: autoCallCount resets to 0, triggers 1 call every 1 minute up to 5 calls max.
   * 3. After 5 calls: Stops completely so user is not irritated!
   */
  const scheduleNextCallInCycle = (delayMs = 60000) => {
    if (autoCallTimerRef.current) {
      clearTimeout(autoCallTimerRef.current);
      autoCallTimerRef.current = null;
    }

    if (autoCallCountRef.current >= 5) {
      return; // 5 calls limit reached! Stop automatic incoming calls.
    }

    autoCallTimerRef.current = setTimeout(() => {
      if (isInsideCallOrRoomRef.current || incomingHostRef.current) {
        // If busy, retry in 30 seconds
        scheduleNextCallInCycle(30000);
        return;
      }

      if (autoCallCountRef.current < 5) {
        autoCallCountRef.current += 1;
        const onlineHosts = INITIAL_VIDEO_HOSTS.filter(h => h.status === 'online');
        const selected = onlineHosts[Math.floor(Math.random() * onlineHosts.length)] || INITIAL_VIDEO_HOSTS[0];
        triggerCall(selected);
      }
    }, delayMs);
  };

  // Mount effect: Start the initial 1-minute cycle (max 5 calls)
  useEffect(() => {
    // First call arrives after 60 seconds (1 minute) of opening app
    scheduleNextCallInCycle(60000);

    // Listen for recharge event to reset count and start 5-call 1-minute cycle
    const handleUserRecharged = () => {
      autoCallCountRef.current = 0; // Reset counter for new recharge cycle
      toast.info('🎉 Recharge successful! Hosts are ready to connect with you 💖');
      // Start 1-minute interval for up to 5 calls
      scheduleNextCallInCycle(45000);
    };

    window.addEventListener('user-recharged', handleUserRecharged);

    return () => {
      if (autoCallTimerRef.current) clearTimeout(autoCallTimerRef.current);
      window.removeEventListener('user-recharged', handleUserRecharged);
    };
  }, []);

  // Countdown timer for incoming call: Exactly 15 seconds full ringtone
  useEffect(() => {
    if (!incomingHost) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [incomingHost]);

  // Handle Timeout when countdown hits 0 (outside setState updater)
  useEffect(() => {
    if (incomingHost && countdown === 0) {
      handleTimeout();
    }
  }, [countdown, incomingHost]);

  // Handle Timeout / Missed Call after 15 seconds
  const handleTimeout = () => {
    if (!incomingHost || isHandlingCallEndRef.current) return;
    isHandlingCallEndRef.current = true;
    const missedHost = incomingHost;
    
    stopRingtone();
    if (activeCallId) {
      videoCallService.updateCallStatus(activeCallId, 'missed');
    }
    setIncomingHost(null);
    setActiveCallId(null);

    recordMissedCall(missedHost);
    toast.error(`Missed video call from ${missedHost.name}`, {
      description: 'She sent you a message in the Messages tab 💬',
      duration: 3500
    });

    // Schedule next call in 60 seconds if within 5-call limit
    scheduleNextCallInCycle(60000);
  };

  // Decline / Cut Call (Red Button)
  const handleDecline = () => {
    if (!incomingHost || isHandlingCallEndRef.current) return;
    isHandlingCallEndRef.current = true;
    const declinedHost = incomingHost;

    stopRingtone();
    if (activeCallId) {
      videoCallService.updateCallStatus(activeCallId, 'declined');
    }
    setIncomingHost(null);
    setActiveCallId(null);

    recordMissedCall(declinedHost);
    toast.info(`Call ended with ${declinedHost.name}`, {
      description: `${declinedHost.name} left a message for you in Messages 💬`,
      duration: 3000
    });

    // Schedule next call in 60 seconds if within 5-call limit
    scheduleNextCallInCycle(60000);
  };

  // Accept / Attend Call (Green Button)
  const handleAccept = () => {
    if (!incomingHost || isHandlingCallEndRef.current) return;
    isHandlingCallEndRef.current = true;
    const targetHost = incomingHost;
    const currentCallId = activeCallId;
    const requiredCoins = Math.max(targetHost.ratePerMinute || 1500, 1500);
    const userCoins = Number(profile?.coins ?? 0);

    // Strictly check 1500 coins requirement for receiving video calls
    if (userCoins < requiredCoins) {
      stopRingtone();
      if (currentCallId) {
        videoCallService.updateCallStatus(currentCallId, 'missed');
      }
      setIncomingHost(null);
      setActiveCallId(null);
      recordMissedCall(targetHost);
      toast.error(`वीडियो कॉल के लिए न्यूनतम ${requiredCoins.toLocaleString()} कॉइन्स आवश्यक हैं! कृपया रिचार्ज करें। ⚡`, {
        description: `Your balance: ${userCoins.toLocaleString()} coins. Required: ${requiredCoins.toLocaleString()} coins.`,
        duration: 4000
      });
      navigate('/wallet');
      return;
    }

    // Connect call cleanly
    stopRingtone();
    soundEffects.play('pop');
    if (currentCallId) {
      videoCallService.updateCallStatus(currentCallId, 'connected');
    }
    setIncomingHost(null);
    setActiveCallId(null);

    toast.success(`Connecting 1-on-1 call with ${targetHost.name}... 💖`, { duration: 2500 });
    navigate(`/call/${targetHost.id}${currentCallId ? `?callId=${currentCallId}` : ''}`, { 
      state: { host: targetHost, callId: currentCallId, autoAccepted: true } 
    });
  };

  // Save missed call message in localStorage so Messages tab shows new message
  const recordMissedCall = (host: VideoHost) => {
    try {
      const storageKey = `maxo_chats_${activeUid}`;
      const existingRaw = localStorage.getItem(storageKey);
      let list: any[] = existingRaw ? JSON.parse(existingRaw) : [];

      const missedMsg = `Missed Video Call 📹`;

      const existingIndex = list.findIndex(c => c.partnerId === host.id);
      if (existingIndex >= 0) {
        list[existingIndex].lastMessage = missedMsg;
        list[existingIndex].updatedAt = new Date().toISOString();
        list[existingIndex].unreadCount = (list[existingIndex].unreadCount || 0) + 1;
      } else {
        list.unshift({
          id: 'conv_' + host.id,
          partnerId: host.id,
          partnerName: host.name,
          partnerPhoto: host.avatar,
          lastMessage: missedMsg,
          updatedAt: new Date().toISOString(),
          unreadCount: 1,
          isHost: true,
          ratePerMinute: host.ratePerMinute || 1500,
          city: host.city,
          isVerified: host.isVerified
        });
      }

      localStorage.setItem(storageKey, JSON.stringify(list));

      const localMsgKey = `maxo_msgs_${activeUid}_${host.id}`;
      const cachedMsgsRaw = localStorage.getItem(localMsgKey);
      let msgs: any[] = cachedMsgsRaw ? JSON.parse(cachedMsgsRaw) : [];

      // Avoid adding duplicate missed-call message if already present in the last 8 seconds
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.senderId === host.id && lastMsg.text === missedMsg) {
        const timeDiff = Date.now() - new Date(lastMsg.createdAt).getTime();
        if (timeDiff < 8000) {
          return; // Skip duplicate!
        }
      }

      // Generate guaranteed unique ID with high entropy
      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const uniqueMsgId = `msg_missed_${Date.now()}_${randomSuffix}`;

      msgs.push({
        id: uniqueMsgId,
        senderId: host.id,
        text: missedMsg,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(localMsgKey, JSON.stringify(msgs));
    } catch (e) {
      console.warn("Could not save missed call chat:", e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoCallTimerRef.current) clearTimeout(autoCallTimerRef.current);
    };
  }, []);

  if (!incomingHost || isInsideCallOrRoom) {
    return null;
  }

  const rate = Math.max(incomingHost.ratePerMinute || 1500, 1500);
  const userCoins = profile?.coins ?? 0;
  const hasEnoughCoins = userCoins >= rate;

  return (
    <AnimatePresence>
      {/* 
        UNIQUE DYNAMIC FLOATING CALL NOTIFICATION
        Sleek, high-end heads-up floating dynamic island card descending from the top of the viewport
      */}
      <div className="fixed top-3 left-3 right-3 max-w-md mx-auto z-[9999] pointer-events-none">
        <motion.div
          key="incoming-call-notification-banner"
          initial={{ y: -120, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="pointer-events-auto bg-gradient-to-b from-[#180D2E]/95 via-[#100722]/95 to-[#0A0418]/95 border-2 border-pink-400/40 backdrop-blur-2xl rounded-3xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(236,72,153,0.35)] relative overflow-hidden"
        >
          {/* Shimmering top glowing highlight */}
          <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-pulse" />
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 relative z-10">
            
            {/* Host Avatar with Concentric Sonar Waves */}
            <div className="relative shrink-0 flex items-center justify-center">
              <motion.span 
                className="absolute w-16 h-16 rounded-full border border-pink-400/40 pointer-events-none"
                animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span 
                className="absolute w-14 h-14 rounded-full border border-rose-400/50 pointer-events-none"
                animate={{ scale: [1, 1.28], opacity: [0.9, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />
              <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-rose-500 to-fuchsia-500 shadow-[0_0_20px_rgba(244,63,94,0.65)] relative z-10">
                <img 
                  src={incomingHost.avatar} 
                  alt={incomingHost.name}
                  className="w-full h-full rounded-full object-cover border-2 border-[#100922]" 
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#100922] shadow z-20" />
            </div>

            {/* Host Details & Visual Soundwave */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-black text-white truncate drop-shadow-sm">
                  {incomingHost.name}
                </h3>
                {incomingHost.isVerified && (
                  <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm">
                    ✓
                  </span>
                )}
                <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-300 text-[9px] font-black border border-amber-400/30 shrink-0">
                  HOST 👑
                </span>
              </div>

              {/* Status & Sound Equalizer */}
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-pink-300 font-bold flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping shrink-0" />
                  <span>Incoming Video Call</span>
                </p>
                {/* Visualizer bars */}
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 h-2.5 bg-pink-400 rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                  <span className="w-0.5 h-1.5 bg-amber-300 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                  <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                </div>
              </div>

              {/* Tag, City & Countdown */}
              <div className="flex items-center gap-1.5 mt-1">
                {incomingHost.city && (
                  <span className="text-[9.5px] font-semibold text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded-md">
                    {incomingHost.city}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9.5px] font-bold">
                  <span>1-on-1 Video Call</span>
                </span>

                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9.5px] font-mono font-bold">
                  {countdown}s
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS: RED DECLINE & GREEN ANSWER */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* RED DECLINE BUTTON */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleDecline}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.55)] border border-rose-400/40 cursor-pointer active:scale-90 transition-all"
                title="Decline Call"
              >
                <PhoneOff size={19} className="stroke-[2.5]" />
              </motion.button>

              {/* GREEN ANSWER BUTTON */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                animate={{ 
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 16px rgba(34,197,94,0.5)',
                    '0 0 28px rgba(34,197,94,0.9)',
                    '0 0 16px rgba(34,197,94,0.5)'
                  ]
                }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                onClick={handleAccept}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 via-green-500 to-emerald-400 hover:from-emerald-400 hover:to-green-400 text-white flex items-center justify-center border-2 border-emerald-200/60 cursor-pointer active:scale-90 transition-all"
                title="Answer Call"
              >
                <Phone size={19} className="stroke-[2.5]" />
              </motion.button>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Global helper to manually test or trigger incoming call anytime from any button
export function triggerSimulatedIncomingCall(host?: VideoHost) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trigger-incoming-call', { detail: { host } }));
  }
}
