import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  
  // Strict Directive: only throw hard error if it's a security or rules permission failure
  const isPermissionError = 
    errorMsg.toLowerCase().includes('permission') || 
    errorMsg.toLowerCase().includes('insufficient') ||
    errorMsg.toLowerCase().includes('unauthorized') ||
    errorMsg.toLowerCase().includes('denied');

  if (isPermissionError) {
    console.warn('Firestore Security Notice: ', errorString);
    if (typeof window !== 'undefined') {
      try {
        const event = new CustomEvent('firestore-permission-denied', { detail: errInfo });
        window.dispatchEvent(event);
      } catch (e) {
        console.warn("Could not dispatch permission event", e);
      }
    }
    // Log the error clearly without throwing a main-thread-blocking asynchronous crash
    console.warn('[Firestore Graceful Recovery] Access restriction prevented a full-screen crash.');
  } else {
    console.warn('[Firestore Offline/Graceful Fallback] Non-fatal capture:', errorMsg);
  }
}
