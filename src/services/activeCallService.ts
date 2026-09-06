// Global Active Video Call Service
// Manages ongoing 1-on-1 video call state across route transitions
// Implements Mulaqat 1-to-1 Video Call Coins (1,500/min) & Host Beans Earning System

import { VideoHost } from '@/data/videoHosts';
import { videoCallService } from '@/services/videoCallService';
import { soundEffects } from '@/utils/audioEffects';
import { globalAudioManager } from '@/services/globalAudioManager';
import { 
  CALL_COIN_RATE_PER_MINUTE, 
  getHostRatePercentForMinute, 
  getHostBeansForMinute, 
  calculateCallEarnings 
} from '@/utils/callEarningSystem';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

export interface ActiveCallState {
  host: VideoHost;
  callId: string | null;
  callerUid?: string;
  isMatchCall: boolean;
  callStatus: 'ringing' | 'connected' | 'ended';
  durationSeconds: number;
  completedMinutes: number;
  currentCoins: number;
  coinsSpent: number;
  hostBeansEarned: number; // Host's earnings in Beans
  currentMinuteRatePercent: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimised: boolean;
  localStream: MediaStream | null;
  startedAt: number;
}

export type ActiveCallListener = (state: ActiveCallState | null) => void;

class ActiveCallService {
  private activeCall: ActiveCallState | null = null;
  private listeners: Set<ActiveCallListener> = new Set();
  private durationInterval: any = null;

  public getActiveCall(): ActiveCallState | null {
    return this.activeCall;
  }

  public isCallActive(): boolean {
    return !!this.activeCall && this.activeCall.callStatus === 'connected';
  }

  public isMinimised(): boolean {
    return !!this.activeCall && this.activeCall.isMinimised;
  }

  /**
   * Initializes or updates an active call with Mulaqat Earning System rules:
   * - 1,500 Coins per minute.
   * - User charged 1,500 Coins for first minute on connection.
   * - Host earns 0 Beans until minute 1 (60s) completes.
   */
  public startCall(params: {
    host: VideoHost;
    callId?: string | null;
    callerUid?: string;
    isMatchCall?: boolean;
    initialCoins: number;
    durationSeconds?: number;
    coinsSpent?: number;
    hostBeansEarned?: number;
    isMuted?: boolean;
    isVideoOff?: boolean;
    localStream?: MediaStream | null;
  }): ActiveCallState {
    // If returning to existing call with same host, restore it
    if (this.activeCall && this.activeCall.host.id === params.host.id && this.activeCall.callStatus === 'connected') {
      this.activeCall.isMinimised = false;
      if (params.localStream) {
        this.activeCall.localStream = params.localStream;
      }
      if (typeof params.durationSeconds === 'number') {
        this.activeCall.durationSeconds = params.durationSeconds;
        this.activeCall.completedMinutes = Math.floor(params.durationSeconds / 60);
      }
      if (typeof params.coinsSpent === 'number') {
        this.activeCall.coinsSpent = params.coinsSpent;
      }
      if (typeof params.hostBeansEarned === 'number') {
        this.activeCall.hostBeansEarned = params.hostBeansEarned;
      }
      this.notify();
      return this.activeCall;
    }

    // Clean up previous call timers
    this.cleanupTimers();

    const duration = params.durationSeconds || 0;
    const completedMinutes = Math.floor(duration / 60);
    
    // Calculate initial coins spent and host beans
    let initialCoinsSpent = params.coinsSpent ?? 0;
    let initialHostBeans = params.hostBeansEarned ?? 0;
    let currentCoins = params.initialCoins;

    if (duration === 0) {
      // First minute initial charge: 1,500 Coins charged upfront from user
      // Host receives 0 Beans until 60 seconds is completed
      if (currentCoins >= CALL_COIN_RATE_PER_MINUTE && initialCoinsSpent === 0) {
        currentCoins -= CALL_COIN_RATE_PER_MINUTE;
        initialCoinsSpent = CALL_COIN_RATE_PER_MINUTE;
        initialHostBeans = 0;
        this.deductUserCoins(params.callerUid, CALL_COIN_RATE_PER_MINUTE);
      }
    } else {
      const breakdown = calculateCallEarnings(duration);
      initialCoinsSpent = breakdown.userCoinsDeducted;
      initialHostBeans = breakdown.hostBeansEarned;
    }

    this.activeCall = {
      host: params.host,
      callId: params.callId || null,
      callerUid: params.callerUid,
      isMatchCall: !!params.isMatchCall,
      callStatus: 'connected',
      durationSeconds: duration,
      completedMinutes,
      currentCoins,
      coinsSpent: initialCoinsSpent,
      hostBeansEarned: initialHostBeans,
      currentMinuteRatePercent: getHostRatePercentForMinute(completedMinutes + 1),
      isMuted: params.isMuted ?? false,
      isVideoOff: params.isVideoOff ?? false,
      isMinimised: false,
      localStream: params.localStream || null,
      startedAt: Date.now()
    };

    this.startTimers();
    this.notify();
    return this.activeCall;
  }

  /**
   * Minimizes the call into a floating Picture-in-Picture window
   */
  public minimizeCall(): void {
    if (!this.activeCall || this.activeCall.callStatus !== 'connected') return;
    this.activeCall.isMinimised = true;
    this.notify();
  }

  /**
   * Restores call back to full screen view
   */
  public maximizeCall(): ActiveCallState | null {
    if (!this.activeCall) return null;
    this.activeCall.isMinimised = false;
    this.notify();
    return this.activeCall;
  }

  /**
   * Toggles mute state
   */
  public toggleMute(): boolean {
    if (!this.activeCall) return false;
    this.activeCall.isMuted = !this.activeCall.isMuted;
    if (this.activeCall.localStream) {
      this.activeCall.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.activeCall!.isMuted;
      });
    }
    this.notify();
    return this.activeCall.isMuted;
  }

  /**
   * Toggles video off state
   */
  public toggleVideo(): boolean {
    if (!this.activeCall) return false;
    this.activeCall.isVideoOff = !this.activeCall.isVideoOff;
    if (this.activeCall.localStream) {
      this.activeCall.localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.activeCall!.isVideoOff;
      });
    }
    this.notify();
    return this.activeCall.isVideoOff;
  }

  /**
   * Ends call and performs complete cleanup according to Mulaqat earning rules
   */
  public endCall(reason: string = 'User ended call'): void {
    if (!this.activeCall) return;

    this.cleanupTimers();

    globalAudioManager.stopAll();

    // Stop local media stream
    if (this.activeCall.localStream) {
      try {
        this.activeCall.localStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }

    if (this.activeCall.callId) {
      videoCallService.updateCallStatus(this.activeCall.callId, 'ended', { 
        endReason: reason,
        durationSeconds: this.activeCall.durationSeconds,
        coinsSpent: this.activeCall.coinsSpent,
        hostBeansEarned: this.activeCall.hostBeansEarned
      });
    }

    this.activeCall.callStatus = 'ended';
    this.activeCall.isMinimised = false;
    this.notify();

    // Clear after notification
    setTimeout(() => {
      this.activeCall = null;
      this.notify();
    }, 100);
  }

  /**
   * 1-second call duration ticker & per-minute Mulaqat Coins/Beans Engine
   */
  private startTimers(): void {
    this.cleanupTimers();

    this.durationInterval = setInterval(() => {
      if (this.activeCall && this.activeCall.callStatus === 'connected') {
        this.activeCall.durationSeconds += 1;
        const dur = this.activeCall.durationSeconds;

        // Mulaqat Bean Earning & Per-Minute Coin Deduction Rules:
        // 0–30s: 0 Beans
        // 30s: 500 Beans
        // 60s (Minute 1 complete): 1,000 Beans total. User charged 1,500 Coins for Minute 2 if available.
        // 120s (Minute 2 complete): 2,000 Beans total. User charged 1,500 Coins for Minute 3 if available.
        // If balance is insufficient at ANY minute mark (e.g. at 120s with 3,000 initial coins), call terminates immediately!
        if (dur === 30) {
          this.activeCall.hostBeansEarned = 500;
          this.creditHostBeans(this.activeCall.host.id, 500);
          this.notify();
        }
        else if (dur > 0 && dur % 60 === 0) {
          const completedMin = Math.floor(dur / 60);
          this.activeCall.completedMinutes = completedMin;

          // Credit remaining 500 beans for this completed minute (total 1,000 beans/min for host)
          this.activeCall.hostBeansEarned = completedMin * 1000;
          this.creditHostBeans(this.activeCall.host.id, 500);

          // Check if user has sufficient coins (1,500) for the NEXT minute
          if (this.activeCall.currentCoins >= CALL_COIN_RATE_PER_MINUTE) {
            // Deduct 1,500 coins for the upcoming minute
            this.activeCall.currentCoins -= CALL_COIN_RATE_PER_MINUTE;
            this.activeCall.coinsSpent += CALL_COIN_RATE_PER_MINUTE;
            this.activeCall.currentMinuteRatePercent = 66.7;

            soundEffects.playCoinDeduct();
            this.deductUserCoins(this.activeCall.callerUid, CALL_COIN_RATE_PER_MINUTE);
            this.notify();
          } else {
            // Insufficient coins for the upcoming minute -> Call cuts automatically!
            soundEffects.playCoinDeduct();
            this.endCall('Coins balance exhausted');
            return;
          }
        } else if (dur % 60 === 30) {
          // Mid-minute host encouragement: +500 beans
          const currentMinBase = Math.floor(dur / 60) * 1000;
          this.activeCall.hostBeansEarned = currentMinBase + 500;
          this.creditHostBeans(this.activeCall.host.id, 500);
          this.notify();
        } else {
          this.notify();
        }
      }
    }, 1000);
  }

  private cleanupTimers(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Helper to deduct coins from caller in database and localStorage
   */
  private deductUserCoins(uid?: string, amount: number = CALL_COIN_RATE_PER_MINUTE) {
    if (!uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      updateDoc(userRef, { coins: increment(-amount) }).catch(() => {});

      const cached = localStorage.getItem(`profile_${uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.coins = Math.max(0, (parsed.coins || 0) - amount);
          localStorage.setItem(`profile_${uid}`, JSON.stringify(parsed));
        } catch (e) {}
      }

      const activeProf = localStorage.getItem('maxo_active_profile');
      if (activeProf) {
        try {
          const parsed = JSON.parse(activeProf);
          parsed.coins = Math.max(0, (parsed.coins || 0) - amount);
          localStorage.setItem('maxo_active_profile', JSON.stringify(parsed));
        } catch (e) {}
      }

      const mockUser = localStorage.getItem('maxo_mock_user');
      if (mockUser) {
        try {
          const parsed = JSON.parse(mockUser);
          parsed.coins = Math.max(0, (parsed.coins || 0) - amount);
          localStorage.setItem('maxo_mock_user', JSON.stringify(parsed));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("User coin deduction sync:", err);
    }
  }

  /**
   * Helper to credit host Beans to Host Bean Wallet
   */
  private creditHostBeans(hostId: string, beansAmount: number) {
    if (!hostId || beansAmount <= 0) return;
    try {
      // 1. Update host document beans in Firestore
      const hostRef = doc(db, 'users', hostId);
      updateDoc(hostRef, { 
        beans: increment(beansAmount),
        totalBeansEarned: increment(beansAmount)
      }).catch(() => {});

      // 2. Also update in local storage if host profile exists locally
      const cached = localStorage.getItem(`profile_${hostId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.beans = (parsed.beans || 0) + beansAmount;
          localStorage.setItem(`profile_${hostId}`, JSON.stringify(parsed));
        } catch (e) {}
      }

      // Record transaction
      const hostEarningsKey = `host_beans_earnings_${hostId}`;
      const existing = parseInt(localStorage.getItem(hostEarningsKey) || '0', 10);
      localStorage.setItem(hostEarningsKey, (existing + beansAmount).toString());
    } catch (err) {
      console.warn("Host beans credit sync:", err);
    }
  }

  public subscribe(listener: ActiveCallListener): () => void {
    this.listeners.add(listener);
    listener(this.activeCall);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.activeCall ? { ...this.activeCall } : null;
    this.listeners.forEach(fn => fn(copy));
  }
}

export const activeCallService = new ActiveCallService();
