// 1-on-1 Video Call Signaling, Firestore Ringing Synchronization, and Camera Track Health Service

import { db, safeOnSnapshot } from '@/lib/firebase';
import { 
  doc, setDoc, updateDoc, collection, query, where, 
  onSnapshot, getDoc, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';

export interface VideoCallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  status: 'ringing' | 'connected' | 'declined' | 'ended' | 'missed';
  signalingState?: 'idle' | 'offering' | 'answering' | 'connected' | 'completed';
  createdAt: string;
  connectedAt?: string;
  endedAt?: string;
  endReason?: string;
  ratePerMinute?: number;
  durationSeconds?: number;
  coinsSpent?: number;
  hostBeansEarned?: number;
  offer?: { sdp: string; type: string };
  answer?: { sdp: string; type: string };
  iceCandidates?: any[];
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

class VideoCallService {
  /**
   * Initiates a new video call session in Firestore with ringing status.
   */
  async initiateCall(params: {
    callerId: string;
    callerName: string;
    callerPhoto?: string;
    receiverId: string;
    receiverName: string;
    receiverPhoto?: string;
    ratePerMinute?: number;
  }): Promise<string> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const callRef = doc(db, 'video_calls', callId);

    const newCall: VideoCallSession = {
      id: callId,
      callerId: params.callerId,
      callerName: params.callerName,
      callerPhoto: params.callerPhoto || '',
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverPhoto: params.receiverPhoto || '',
      status: 'ringing',
      signalingState: 'offering',
      createdAt: new Date().toISOString(),
      ratePerMinute: params.ratePerMinute && params.ratePerMinute >= 1500 ? params.ratePerMinute : 1500
    };

    try {
      await setDoc(callRef, newCall);
    } catch (err) {
      console.warn("Could not write call to Firestore, operating with local session:", err);
    }

    return callId;
  }

  /**
   * Subscribes to real-time call updates to synchronize ringing and connection status
   * between caller and receiver.
   */
  subscribeToCall(
    callId: string, 
    onUpdate: (session: VideoCallSession | null) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!callId) return () => {};

    const callRef = doc(db, 'video_calls', callId);

    return safeOnSnapshot(
      callRef,
      (snapshot: any) => {
        if (snapshot.exists && snapshot.exists()) {
          onUpdate(snapshot.data() as VideoCallSession);
        } else {
          onUpdate(null);
        }
      },
      (err: any) => {
        console.warn("[VideoCallService] Snapshot subscription error:", err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Updates the status of a call (e.g. ringing -> connected, declined, ended)
   */
  async updateCallStatus(
    callId: string, 
    status: VideoCallSession['status'], 
    extra: Partial<VideoCallSession> = {}
  ): Promise<void> {
    if (!callId) return;

    try {
      const callRef = doc(db, 'video_calls', callId);
      const updates: any = {
        status,
        updatedAt: new Date().toISOString(),
        ...extra
      };

      if (status === 'connected') {
        updates.connectedAt = new Date().toISOString();
        updates.signalingState = 'connected';
      } else if (status === 'ended' || status === 'declined' || status === 'missed') {
        updates.endedAt = new Date().toISOString();
        updates.signalingState = 'completed';
      }

      await updateDoc(callRef, updates);
    } catch (e) {
      console.warn("[VideoCallService] Status update failed:", e);
    }
  }

  /**
   * Listen for incoming calls targeting a specific receiver user
   */
  listenForIncomingCalls(
    receiverId: string, 
    onIncoming: (call: VideoCallSession) => void
  ): () => void {
    if (!receiverId) return () => {};

    try {
      const callsCol = collection(db, 'video_calls');
      const q = query(
        callsCol, 
        where('receiverId', '==', receiverId),
        where('status', '==', 'ringing'),
        limit(1)
      );

      return safeOnSnapshot(q, (snapshot: any) => {
        if (snapshot.empty) return;
        const firstDoc = snapshot.docs[0];
        if (firstDoc) {
          onIncoming(firstDoc.data() as VideoCallSession);
        }
      });
    } catch (e) {
      console.warn("Failed to listen for incoming calls:", e);
      return () => {};
    }
  }

  /**
   * Robust attachment and resume helper for camera streams.
   * Ensures srcObject is attached, inline playback flags are active,
   * and triggers an explicit play() to unfreeze the rendering pipeline.
   */
  async bindAndResumeStream(
    videoEl: HTMLVideoElement | null,
    stream: MediaStream | null,
    options?: { isVideoOff?: boolean }
  ): Promise<boolean> {
    if (!videoEl || !stream) return false;

    try {
      const videoTracks = stream.getVideoTracks();

      // Check if tracks are live
      if (videoTracks.length === 0 || videoTracks.every(t => t.readyState === 'ended')) {
        console.warn("[bindAndResumeStream] Stream has no live video tracks");
        return false;
      }

      // Synchronize track enabled status
      videoTracks.forEach(t => {
        t.enabled = !options?.isVideoOff;
      });

      // Attach srcObject if missing or swapped
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }

      // Set essential attributes for non-blocking mobile/desktop inline playback
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');

      // Explicit play() trigger with promise resolution check
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        await playPromise.catch((playErr) => {
          console.warn("[bindAndResumeStream] Video play deferred:", playErr?.name || playErr);
        });
      }

      return true;
    } catch (err) {
      console.warn("[bindAndResumeStream] Unexpected error binding stream:", err);
      return false;
    }
  }

  /**
   * Handles track state after WebRTC signaling completes to prevent frozen video.
   * Checks if local tracks became muted or disabled, re-enables them,
   * and restarts the video element rendering.
   */
  async resumeStreamAfterSignaling(
    videoEl: HTMLVideoElement | null,
    stream: MediaStream | null,
    reacquireCamera: () => Promise<MediaStream | null>,
    options?: { isVideoOff?: boolean }
  ): Promise<MediaStream | null> {
    console.info("[VideoCallService] WebRTC signaling completed. Verifying track state & unfreezing stream...");

    let activeStream = stream;

    // 1. Verify if tracks are alive
    if (!activeStream || activeStream.getVideoTracks().length === 0 || activeStream.getVideoTracks().some(t => t.readyState === 'ended')) {
      console.warn("[VideoCallService] Track ended during signaling; re-acquiring camera...");
      activeStream = await reacquireCamera();
      if (!activeStream) return null;
    }

    // 2. Ensure all live video tracks are active and unmuted
    activeStream.getVideoTracks().forEach(track => {
      track.enabled = !options?.isVideoOff;
      
      // Hook track mute/unmute to auto-kick video.play()
      track.onmute = () => {
        console.warn("[VideoTrack] Video track muted by browser/RTC engine");
      };
      track.onunmute = () => {
        console.info("[VideoTrack] Video track unmuted; kicking video playback");
        if (videoEl) {
          videoEl.play().catch(() => {});
        }
      };
    });

    // 3. Re-attach and play video element
    if (videoEl && activeStream) {
      await this.bindAndResumeStream(videoEl, activeStream, options);
    }

    return activeStream;
  }

  /**
   * Anti-freeze watchdog: Periodically checks whether the video element is stalled or paused,
   * and automatically invokes play() if live tracks are present.
   */
  startStreamWatchdog(
    getVideoEl: () => HTMLVideoElement | null,
    getStream: () => MediaStream | null,
    getIsVideoOff: () => boolean
  ): () => void {
    let lastTime = -1;
    let stuckCount = 0;

    const interval = setInterval(() => {
      const video = getVideoEl();
      const stream = getStream();
      const isVideoOff = getIsVideoOff();

      if (!video || !stream || isVideoOff) {
        lastTime = -1;
        stuckCount = 0;
        return;
      }

      const activeTracks = stream.getVideoTracks().filter(t => t.readyState === 'live' && t.enabled);
      if (activeTracks.length === 0) return;

      // Check if video is paused
      if (video.paused) {
        console.info("[StreamWatchdog] Video was paused while stream is active; resuming...");
        video.play().catch(() => {});
        return;
      }

      // Check if video time is advancing
      if (video.currentTime === lastTime && video.readyState >= 2) {
        stuckCount++;
        if (stuckCount >= 2) {
          console.warn("[StreamWatchdog] Video frame stalled detected; re-triggering play()...");
          video.play().catch(() => {});
          stuckCount = 0;
        }
      } else {
        stuckCount = 0;
        lastTime = video.currentTime;
      }
    }, 1500);

    return () => clearInterval(interval);
  }

  /**
   * Sets up a real or simulated WebRTC PeerConnection for 1-on-1 signaling.
   */
  createPeerConnection(
    localStream: MediaStream | null,
    onSignalingComplete: () => void
  ): RTCPeerConnection | null {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) return null;

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Attach local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Track signaling and ICE connection states
      pc.oniceconnectionstatechange = () => {
        console.info(`[WebRTC ICE] State changed: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          onSignalingComplete();
        }
      };

      pc.onsignalingstatechange = () => {
        console.info(`[WebRTC Signaling] State changed: ${pc.signalingState}`);
        if (pc.signalingState === 'stable') {
          onSignalingComplete();
        }
      };

      return pc;
    } catch (e) {
      console.warn("PeerConnection initialization error:", e);
      return null;
    }
  }
}

export const videoCallService = new VideoCallService();
