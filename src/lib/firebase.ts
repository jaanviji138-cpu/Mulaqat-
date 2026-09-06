import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, setLogLevel, doc, getDocFromServer, getDocsFromServer, getDoc } from 'firebase/firestore';
import firebaseConfig from '@/../firebase-applet-config.json';

// Silence internal Firestore warning logs and assertion messages from polluting console.error
try {
  setLogLevel('silent');
} catch (e) {
  // Gracefully skip if setter isn't supported in current bindings
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const settings = {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
};

const dbId = (firebaseConfig as any).firestoreDatabaseId;
const globalForFirebase = globalThis as any;

let currentDbInstance: any;

if (globalForFirebase.firestoreDb) {
  currentDbInstance = globalForFirebase.firestoreDb;
} else {
  try {
    if (dbId && dbId !== '(default)' && dbId !== 'default') {
      try {
        currentDbInstance = initializeFirestore(app, settings, dbId);
      } catch (e) {
        currentDbInstance = getFirestore(app, dbId);
      }
    } else {
      try {
        currentDbInstance = initializeFirestore(app, settings);
      } catch (e) {
        currentDbInstance = getFirestore(app);
      }
    }
  } catch (err) {
    // Ultimate fallback if both fail
    try {
      currentDbInstance = getFirestore(app);
    } catch (e) {
      currentDbInstance = getFirestore(app, dbId);
    }
  }
  globalForFirebase.firestoreDb = currentDbInstance;
}

// Export the custom resolved Firestore database instance directly
export const db = currentDbInstance;
export const auth = getAuth(app);

import { 
  getDocs, 
  DocumentReference, 
  Query, 
  CollectionReference,
  onSnapshot,
  collection,
  setDoc
} from 'firebase/firestore';

/**
 * A highly resilient, high-performance, and crash-proof alternative to onSnapshot.
 * Prefers the native Firestore SDK real-time subscription for zero-overhead, SSE/WebSocket updates,
 * and falls back elegantly to periodic REST polling ONLY if subscription fails or is blocked.
 * This completely eliminates CPU and battery draining periodic polling under normal operations.
 */
export function safeOnSnapshot(
  ref: any,
  ...args: any[]
): () => void {
  let onNext: any = null;
  let onError: any = null;

  if (typeof args[0] === 'function') {
    onNext = args[0];
    onError = args[1];
  } else if (typeof args[0] === 'object' && typeof args[1] === 'function') {
    onNext = args[1];
    onError = args[2];
  }

  let active = true;
  let timerId: any = null;
  let unsubReal: (() => void) | null = null;

  // Tailored safe polling interval as fallback
  let intervalMs = 6000;
  try {
    const pathStr = ref.path || (ref._query && ref._query.path && ref._query.path.toString()) || '';
    if (pathStr.includes('messages') || pathStr.includes('chat') || pathStr.includes('hand_raises')) {
      intervalMs = 3000;
    } else if (pathStr.includes('room')) {
      intervalMs = 4000;
    }
  } catch (e) {
    // Graceful fallback
  }

  const scheduleNext = () => {
    if (active) {
      timerId = setTimeout(performPollingFetch, intervalMs);
    }
  };

  const performPollingFetch = async () => {
    if (!active) return;
    try {
      if (ref instanceof DocumentReference || (ref.type === 'document')) {
        let snap;
        try {
          snap = await getDocFromServer(ref);
        } catch (e) {
          snap = await getDoc(ref);
        }
        if (active && onNext) {
          onNext(snap);
        }
      } else {
        let snap;
        try {
          snap = await getDocsFromServer(ref);
        } catch (e) {
          snap = await getDocs(ref);
        }
        if (active && onNext) {
          onNext(snap);
        }
      }
    } catch (err) {
      if (active) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isOffline = errMsg.toLowerCase().includes('offline') || !navigator.onLine;
        const isPermissionError = 
          errMsg.toLowerCase().includes('permission') || 
          errMsg.toLowerCase().includes('insufficient') ||
          errMsg.toLowerCase().includes('unauthorized') ||
          errMsg.toLowerCase().includes('denied');

        if (isPermissionError) {
          console.warn("[safeOnSnapshot] Polling permission violation - aborting sync:", errMsg);
          active = false;
          if (onError) {
            try { onError(err); } catch(ex) {}
          }
          return; // returns without scheduling next to prevent CPU usage loops
        }

        if (isOffline) {
          console.warn("[safeOnSnapshot] Client is offline. Polling sync postponed cleanly:", errMsg);
        } else if (onError) {
          try { onError(err); } catch(ex) {}
        } else {
          console.warn("safeOnSnapshot fallback polling error captured:", err);
        }
      }
    } finally {
      if (active) {
        scheduleNext();
      }
    }
  };

  try {
    // Attempt native SDK onSnapshot first
    unsubReal = onSnapshot(ref, (snap) => {
      if (active && onNext) {
        onNext(snap);
      }
    }, (err) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isPermissionError = 
        errMsg.toLowerCase().includes('permission') || 
        errMsg.toLowerCase().includes('insufficient') ||
        errMsg.toLowerCase().includes('unauthorized') ||
        errMsg.toLowerCase().includes('denied');

      if (isPermissionError) {
        console.warn("[safeOnSnapshot] Native onSnapshot permission notice - stopping sync subscription:", errMsg);
        active = false;
        if (unsubReal) {
          try { unsubReal(); } catch(ex) {}
          unsubReal = null;
        }
        if (onError) {
          try { onError(err); } catch(ex) {}
        }
        return;
      }

      console.warn("Native onSnapshot subscription error, falling back to polling:", err);
      if (active) {
        if (unsubReal) {
          try { unsubReal(); } catch(ex) {}
          unsubReal = null;
        }
        // Immediately trigger first poll, then start polling cycle
        performPollingFetch();
      }
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const isPermissionError = 
      errMsg.toLowerCase().includes('permission') || 
      errMsg.toLowerCase().includes('insufficient') ||
      errMsg.toLowerCase().includes('unauthorized') ||
      errMsg.toLowerCase().includes('denied');

    if (isPermissionError) {
      console.warn("[safeOnSnapshot] Failed to initialize native onSnapshot due to permissions:", errMsg);
      active = false;
      if (onError) {
        try { onError(e); } catch(ex) {}
      }
    } else {
      console.warn("Failed to initialize native onSnapshot, using polling fallback:", e);
      performPollingFetch();
    }
  }

  return () => {
    active = false;
    if (unsubReal) {
      unsubReal();
    }
    if (timerId) {
      clearTimeout(timerId);
    }
  };
}

export async function logActivity(
  type: 'room_started' | 'room_joined' | 'gift_sent' | 'new_follower',
  user: { uid: string; displayName: string; photoURL?: string },
  details: {
    roomId?: string | null;
    roomTitle?: string | null;
    giftName?: string | null;
    giftIcon?: string | null;
    targetUid?: string | null;
    targetName?: string | null;
  }
) {
  try {
    const actRef = doc(collection(db, 'activities'));
    await setDoc(actRef, {
      id: actRef.id,
      type,
      userUid: user.uid,
      userName: user.displayName || 'Guest',
      userPhoto: user.photoURL || '',
      timestamp: new Date().toISOString(),
      details
    });
  } catch (error) {
    console.warn("Failed to log activity to Firestore:", error);
  }
}


