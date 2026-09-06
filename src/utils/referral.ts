import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, limit } from 'firebase/firestore';
import { getPublicOrigin, copyTextToClipboard } from '@/lib/utils';

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredId: string;
  referredName: string;
  referredPhoto: string;
  referredNumericId?: string;
  timestamp: string;
  status: 'connected';
}

/**
 * Generate standard referral / invite code for a user
 */
export function getStandardReferralCode(numericId: string, customCode?: string): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase();
  }
  const cleanNum = (numericId || '789104').slice(-6);
  return `MAXO-${cleanNum}`;
}

/**
 * Generate full shareable Invite URL
 */
export function generateInviteUrl(refCode: string, roomId?: string): string {
  const origin = getPublicOrigin();
  if (roomId) {
    return `${origin}/room/${roomId}?ref=${encodeURIComponent(refCode)}`;
  }
  return `${origin}/invite?ref=${encodeURIComponent(refCode)}`;
}

/**
 * Resolve a referral code (supports MAXO-XXXX, numericId, or UID) to a user document
 */
export async function resolveReferrer(codeOrId: string): Promise<{ uid: string; displayName: string; photoURL: string; numericId: string } | null> {
  if (!codeOrId || !codeOrId.trim()) return null;
  const clean = codeOrId.trim().toUpperCase();
  const rawNum = clean.replace(/[^0-9]/g, '');

  try {
    const usersRef = collection(db, 'users');

    // 1. Try querying by customReferralCode
    const qCustom = query(usersRef, where('customReferralCode', '==', clean), limit(1));
    const snapCustom = await getDocs(qCustom);
    if (!snapCustom.empty) {
      const docData = snapCustom.docs[0].data();
      return {
        uid: snapCustom.docs[0].id,
        displayName: docData.displayName || 'Mulaqat Friend',
        photoURL: docData.photoURL || '',
        numericId: docData.numericId || ''
      };
    }

    // 2. Try querying by numericId if number exists
    if (rawNum) {
      const qNum = query(usersRef, where('numericId', '==', rawNum), limit(1));
      const snapNum = await getDocs(qNum);
      if (!snapNum.empty) {
        const docData = snapNum.docs[0].data();
        return {
          uid: snapNum.docs[0].id,
          displayName: docData.displayName || 'Mulaqat Friend',
          photoURL: docData.photoURL || '',
          numericId: docData.numericId || ''
        };
      }
    }

    // 3. Fallback scan / prefix match
    const snapAll = await getDocs(usersRef);
    for (const d of snapAll.docs) {
      const data = d.data();
      const id = d.id;
      const uNumeric = String(data.numericId || '');
      const uCustom = String(data.customReferralCode || '').toUpperCase();
      const defaultCode = `MAXO-${uNumeric.slice(-6)}`.toUpperCase();
      const mulaqatCode = `MULAQAT-${uNumeric.slice(-6)}`.toUpperCase();

      if (
        clean === defaultCode ||
        clean === mulaqatCode ||
        clean === uCustom ||
        (rawNum && (uNumeric === rawNum || uNumeric.endsWith(rawNum))) ||
        id.toUpperCase().startsWith(clean.replace('MULAQAT-', '').replace('MAXO-', '')) ||
        id.toUpperCase().slice(0, 8) === clean
      ) {
        return {
          uid: d.id,
          displayName: data.displayName || 'Mulaqat Friend',
          photoURL: data.photoURL || '',
          numericId: uNumeric
        };
      }
    }

    // 4. Local storage fallback for offline / mock testing
    const localDb = localStorage.getItem('maxo_custom_auth_db');
    if (localDb) {
      const parsed = JSON.parse(localDb);
      for (const uid in parsed) {
        const u = parsed[uid];
        if (
          u.numericId === rawNum ||
          clean === `MULAQAT-${String(u.numericId).slice(-6)}` ||
          clean === `MAXO-${String(u.numericId).slice(-6)}` ||
          uid.toUpperCase().startsWith(clean)
        ) {
          return {
            uid,
            displayName: u.displayName || 'Mulaqat Friend',
            photoURL: u.photoURL || '',
            numericId: u.numericId || ''
          };
        }
      }
    }
  } catch (err) {
    console.warn('Resolve referrer error:', err);
  }

  return null;
}

/**
 * Apply referral / friend invite relationship
 */
export async function applyReferralBonus(
  currentUserUid: string,
  currentUserName: string,
  currentUserPhoto: string,
  currentUserNumericId: string,
  referrerCodeOrId: string
): Promise<{ success: boolean; message: string; referrerName?: string }> {
  if (!currentUserUid || !referrerCodeOrId) {
    return { success: false, message: 'Invalid user or invite code.' };
  }

  const referrer = await resolveReferrer(referrerCodeOrId);
  if (!referrer) {
    return { success: false, message: 'Invite code not found. Please check and try again.' };
  }

  if (referrer.uid === currentUserUid || (referrer.numericId && referrer.numericId === currentUserNumericId)) {
    return { success: false, message: 'You cannot use your own invite code!' };
  }

  try {
    const userDocRef = doc(db, 'users', currentUserUid);
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.referredBy) {
        return { success: false, message: 'You have already connected with an invited friend!' };
      }
    }

    // 1. Update current user
    await setDoc(userDocRef, {
      referredBy: referrer.uid,
      referredByName: referrer.displayName,
      referredByCode: referrerCodeOrId.toUpperCase()
    }, { merge: true });

    // Update local storage profile
    try {
      const localProfileKey = `profile_${currentUserUid}`;
      const localProfile = localStorage.getItem(localProfileKey);
      if (localProfile) {
        const pData = JSON.parse(localProfile);
        pData.referredBy = referrer.uid;
        pData.referredByName = referrer.displayName;
        localStorage.setItem(localProfileKey, JSON.stringify(pData));
      }
      const mockUser = localStorage.getItem('maxo_mock_user');
      if (mockUser) {
        const mData = JSON.parse(mockUser);
        mData.referredBy = referrer.uid;
        mData.referredByName = referrer.displayName;
        localStorage.setItem('maxo_mock_user', JSON.stringify(mData));
      }
    } catch (e) {}

    // 2. Store referral audit record
    const referralId = `ref_${referrer.uid.slice(-6)}_${currentUserUid.slice(-6)}_${Date.now()}`;
    const referralRecord: ReferralRecord = {
      id: referralId,
      referrerId: referrer.uid,
      referredId: currentUserUid,
      referredName: currentUserName || 'New Friend',
      referredPhoto: currentUserPhoto || '',
      referredNumericId: currentUserNumericId || '',
      timestamp: new Date().toISOString(),
      status: 'connected'
    };

    await setDoc(doc(db, 'referrals', referralId), referralRecord);

    // Save to local referral history cache
    try {
      const cacheKey = `referrals_${referrer.uid}`;
      const existingCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      existingCache.unshift(referralRecord);
      localStorage.setItem(cacheKey, JSON.stringify(existingCache));
    } catch (e) {}

    return {
      success: true,
      message: `🎉 Successfully connected with ${referrer.displayName}! Welcome to मुलाकात (Mulaqat)! ✨`,
      referrerName: referrer.displayName
    };
  } catch (err: any) {
    console.error('Apply referral error:', err);
    return {
      success: false,
      message: 'Failed to link invite: ' + (err.message || 'Please retry.')
    };
  }
}

