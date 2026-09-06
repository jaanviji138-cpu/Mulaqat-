import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, safeOnSnapshot } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { getPremiumAvatar, INDIAN_MALE_AVATARS, INDIAN_FEMALE_AVATARS, INDIAN_MALE_NAMES, INDIAN_FEMALE_NAMES } from '@/utils/avatar';

export interface BanStatus {
  isBanned: boolean;
  type: 'id_ban' | 'device_ban' | 'id_restriction';
  restrictionType?: 'ban' | 'mute' | 'chat_ban';
  reason?: string;
  restrictedUntil?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  deviceId: string;
  banStatus: BanStatus | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  deviceId: '',
  banStatus: null,
  isAdmin: false,
});

export function getOrCreateNumericId(uid: string, providedId?: string): string {
  if (providedId && /^\d+$/.test(providedId)) {
    localStorage.setItem(`numeric_id_${uid}`, providedId);
    return providedId;
  }
  const key = `numeric_id_${uid}`;
  const cached = localStorage.getItem(key);
  if (cached && /^\d+$/.test(cached)) {
    return cached;
  }
  
  // Sequential ID generation starting from 1000 (1000, 1001, 1002...)
  const lastIdStr = localStorage.getItem('maxo_global_last_numeric_id');
  let nextNum = lastIdStr ? parseInt(lastIdStr, 10) + 1 : 1000;
  if (isNaN(nextNum) || nextNum < 1000) {
    nextNum = 1000;
  }
  localStorage.setItem('maxo_global_last_numeric_id', nextNum.toString());
  const generatedId = nextNum.toString();
  localStorage.setItem(key, generatedId);
  return generatedId;
}

export function getOrCreateDeviceId(): string {
  const key = 'maxo_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId || !deviceId.startsWith('dev_')) {
    deviceId = 'dev_' + Math.floor(100000000 + Math.random() * 900000000).toString();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

export function getAuthorizedAdminEmails(): string[] {
  const defaultEmails = [
    'dkm924419@gmail.com',
    'noircouplehub@gmail.com',
    'lpari3423@gmail.com', 
    's30669983@gmail.com', 
    'gumanamains37@gmail.com', 
    'gumanamainsana@gmail.com', 
    'misskavya869@gmail.com',
    'rambomr837@gmail.com'
  ];
  if (typeof window === 'undefined') return defaultEmails;
  try {
    const custom = localStorage.getItem('mulaqat_custom_admin_emails');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...defaultEmails, ...parsed.map(e => String(e).toLowerCase().trim())]));
      }
    }
  } catch (e) {}
  return defaultEmails;
}

export function addAuthorizedAdminEmail(email: string) {
  const clean = email.toLowerCase().trim();
  if (!clean || !clean.includes('@')) return;
  const current = getAuthorizedAdminEmails();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    localStorage.setItem('mulaqat_custom_admin_emails', JSON.stringify(updated));
    window.dispatchEvent(new Event('auth_profile_updated'));
  }
}

export function removeAuthorizedAdminEmail(email: string) {
  const clean = email.toLowerCase().trim();
  const current = getAuthorizedAdminEmails();
  const updated = current.filter(e => e !== clean);
  localStorage.setItem('mulaqat_custom_admin_emails', JSON.stringify(updated));
  window.dispatchEvent(new Event('auth_profile_updated'));
}

export function getMasterAdminPin(): string {
  if (typeof window === 'undefined') return '7860';
  return localStorage.getItem('mulaqat_master_admin_pin') || '7860';
}

export function setMasterAdminPin(newPin: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mulaqat_master_admin_pin', newPin.trim());
}

export function isMasterAdminUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem('mulaqat_master_admin_unlocked') === 'true' ||
    localStorage.getItem('mulaqat_master_admin_unlocked') === 'true'
  );
}

export function setMasterAdminUnlocked(unlocked: boolean) {
  if (typeof window === 'undefined') return;
  if (unlocked) {
    sessionStorage.setItem('mulaqat_master_admin_unlocked', 'true');
    localStorage.setItem('mulaqat_master_admin_unlocked', 'true');
  } else {
    sessionStorage.removeItem('mulaqat_master_admin_unlocked');
    localStorage.removeItem('mulaqat_master_admin_unlocked');
  }
  window.dispatchEvent(new Event('auth_profile_updated'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cachedMockStr = localStorage.getItem('maxo_mock_user');
      if (cachedMockStr) {
        try {
          return JSON.parse(cachedMockStr);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const explicitGender = localStorage.getItem('maxo_user_gender') as 'male' | 'female' | null;
      const cachedActive = localStorage.getItem('maxo_active_profile');
      if (cachedActive) {
        try {
          const p = JSON.parse(cachedActive);
          if (explicitGender && p.gender !== explicitGender) {
            p.gender = explicitGender;
            p.photoURL = explicitGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0];
            p.displayName = explicitGender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0];
          }
          return p;
        } catch (e) {}
      }
      const cachedMockStr = localStorage.getItem('maxo_mock_user');
      if (cachedMockStr) {
        try {
          const u = JSON.parse(cachedMockStr);
          const cachedProfile = localStorage.getItem(`profile_${u.uid}`);
          if (cachedProfile) {
            const p = JSON.parse(cachedProfile);
            if (explicitGender && p.gender !== explicitGender) {
              p.gender = explicitGender;
              p.photoURL = explicitGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0];
              p.displayName = explicitGender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0];
            }
            return p;
          }
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cachedMockStr = localStorage.getItem('maxo_mock_user');
      if (cachedMockStr) {
        return false;
      }
    }
    return true;
  });

  const [deviceId] = useState(() => getOrCreateDeviceId());
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);

  // Determine system administration status 
  const adminEmails = getAuthorizedAdminEmails();
  const isAdmin = !!(
    (user?.email && adminEmails.includes(user.email.toLowerCase())) ||
    (profile && (profile as any).isSystemAdmin === true) ||
    localStorage.getItem('simulate_admin') === 'true' ||
    isMasterAdminUnlocked()
  );

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubUserBan: (() => void) | null = null;
    let unsubDeviceBan: (() => void) | null = null;

    // Safety timeout: Never stay stuck on loading screen
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 600);

    // A real-time snapshot listener for device bans
    const devBanRef = doc(db, 'system_bans', deviceId);
    unsubDeviceBan = safeOnSnapshot(devBanRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.type === 'device_ban') {
          setBanStatus({
            isBanned: true,
            type: 'device_ban',
            reason: data.reason || 'Term violation identified by security engine on this device.',
          });
          return;
        }
      } else {
        setBanStatus(prev => prev?.type === 'device_ban' ? null : prev);
      }
    }, (err) => {
      console.warn("Device ban snapshot failed (safely skipped):", err);
    });

    const handleUserSession = async (currentUser: any) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubUserBan) {
        unsubUserBan();
        unsubUserBan = null;
      }

      if (currentUser) {
        setUser(currentUser);
        const storedActiveProfile = (() => {
          try {
            const act = localStorage.getItem('maxo_active_profile');
            if (act) return JSON.parse(act);
          } catch(e) {}
          return null;
        })();

        const explicitGender = (localStorage.getItem('maxo_user_gender') as 'male' | 'female' | null);
        const storedGender = explicitGender || storedActiveProfile?.gender || 'male';

        const cached = localStorage.getItem(`profile_${currentUser.uid}`) || (storedActiveProfile ? JSON.stringify(storedActiveProfile) : null);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Strictly guarantee gender and avatar correspondence
            if (explicitGender) {
              parsed.gender = explicitGender;
              if (explicitGender === 'male' && (!parsed.photoURL || INDIAN_FEMALE_AVATARS.includes(parsed.photoURL))) {
                parsed.photoURL = INDIAN_MALE_AVATARS[0];
                parsed.displayName = INDIAN_MALE_NAMES[0];
              } else if (explicitGender === 'female' && (!parsed.photoURL || INDIAN_MALE_AVATARS.includes(parsed.photoURL))) {
                parsed.photoURL = INDIAN_FEMALE_AVATARS[0];
                parsed.displayName = INDIAN_FEMALE_NAMES[0];
              }
            } else if (!parsed.gender || parsed.gender === 'secret') {
              parsed.gender = storedGender;
              parsed.photoURL = storedGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0];
            }
            setProfile(parsed);
            setLoading(false);
          } catch (pErr) {
            const generatedId = getOrCreateNumericId(currentUser.uid);
            const fallbackProfile: UserProfile = {
              uid: currentUser.uid,
              numericId: generatedId,
              displayName: storedActiveProfile?.displayName || (storedGender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0]),
              photoURL: storedActiveProfile?.photoURL || (storedGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0]),
              level: 1,
              experience: 0,
              coins: storedActiveProfile?.coins ?? 100,
              diamonds: 10,
              badges: ['👑 Mulaqat Star'],
              followersCount: 5,
              followingCount: 3,
              visitorsCount: 17,
              isVIP: false,
              lastLogin: new Date().toISOString(),
              lastLoginDeviceId: deviceId,
              age: 22,
              gender: storedGender,
              country: 'India 🇮🇳',
              bio: storedGender === 'male' ? 'Desi Rockstar 🎸 | Good vibes only' : 'Party Queen 🌸 | Love singing & vibes',
              theme: 'Space Dust'
            };
            setProfile(fallbackProfile);
            setLoading(false);
          }
        } else {
          const generatedId = getOrCreateNumericId(currentUser.uid);
          const fallbackProfile: UserProfile = {
            uid: currentUser.uid,
            numericId: generatedId,
            displayName: storedActiveProfile?.displayName || (storedGender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0]),
            photoURL: storedActiveProfile?.photoURL || (storedGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0]),
            level: 1,
            experience: 0,
            coins: storedActiveProfile?.coins ?? 100,
            diamonds: 10,
            badges: ['👑 Mulaqat Star'],
            followersCount: 5,
            followingCount: 3,
            visitorsCount: 17,
            isVIP: false,
            lastLogin: new Date().toISOString(),
            lastLoginDeviceId: deviceId,
            age: 22,
            gender: storedGender,
            country: 'India 🇮🇳',
            bio: storedGender === 'male' ? 'Desi Rockstar 🎸 | Good vibes only' : 'Party Queen 🌸 | Love singing & vibes',
            theme: 'Space Dust'
          };
          setProfile(fallbackProfile);
          setLoading(false);
        }

        // Establish real-time listener for user ID bans & limits
        const userBanRef = doc(db, 'system_bans', currentUser.uid);
        unsubUserBan = safeOnSnapshot(userBanRef, (snap: any) => {
          if (snap.exists()) {
            const data = snap.data();
            const now = new Date();
            const expires = data.restrictedUntil ? new Date(data.restrictedUntil) : null;

            if (data.type === 'id_ban') {
              setBanStatus({
                isBanned: true,
                type: 'id_ban',
                reason: data.reason || 'Your account ID was permanently banned by the administration.',
              });
            } else if (data.type === 'id_restriction' && (!expires || expires > now)) {
              setBanStatus({
                isBanned: data.restrictionType === 'ban',
                type: 'id_restriction',
                restrictionType: data.restrictionType,
                reason: data.reason || 'Temporary limitation placed on this account.',
                restrictedUntil: data.restrictedUntil,
              });
            } else {
              setBanStatus(prev => prev?.type === 'id_ban' || prev?.type === 'id_restriction' ? null : prev);
            }
          } else {
            setBanStatus(prev => prev?.type === 'id_ban' || prev?.type === 'id_restriction' ? null : prev);
          }
        }, (err) => {
          console.warn("User ban snapshot failed (safely skipped):", err);
        });

        try {
          const profileRef = doc(db, 'users', currentUser.uid);
          unsubProfile = safeOnSnapshot(profileRef, async (docSnap: any) => {
            const generatedId = getOrCreateNumericId(currentUser.uid);
            if (docSnap.exists()) {
              const updatedProfile = docSnap.data() as UserProfile;
              let stableId = updatedProfile.numericId;
              let needsUpdate = false;

              if (!stableId || !/^\d{9}$/.test(stableId)) {
                stableId = generatedId;
                needsUpdate = true;
              }
              if (updatedProfile.lastLoginDeviceId !== deviceId) {
                needsUpdate = true;
              }

              // Enforce explicit user selected gender if set
              const activeExplicitGender = (localStorage.getItem('maxo_user_gender') as 'male' | 'female' | null);
              if (activeExplicitGender && updatedProfile.gender !== activeExplicitGender) {
                updatedProfile.gender = activeExplicitGender;
                if (activeExplicitGender === 'male' && (!updatedProfile.photoURL || INDIAN_FEMALE_AVATARS.includes(updatedProfile.photoURL))) {
                  updatedProfile.photoURL = INDIAN_MALE_AVATARS[0];
                  updatedProfile.displayName = INDIAN_MALE_NAMES[0];
                  updatedProfile.bio = 'Desi Rockstar 🎸 | Good vibes only';
                } else if (activeExplicitGender === 'female' && (!updatedProfile.photoURL || INDIAN_MALE_AVATARS.includes(updatedProfile.photoURL))) {
                  updatedProfile.photoURL = INDIAN_FEMALE_AVATARS[0];
                  updatedProfile.displayName = INDIAN_FEMALE_NAMES[0];
                  updatedProfile.bio = 'Party Queen 🌸 | Love singing & vibes';
                }
                needsUpdate = true;
              }

              if (needsUpdate) {
                await setDoc(profileRef, { 
                  ...updatedProfile,
                  numericId: stableId,
                  lastLoginDeviceId: deviceId
                }, { merge: true }).catch(() => {});
              } else {
                localStorage.setItem(`numeric_id_${currentUser.uid}`, stableId);
              }

              updatedProfile.numericId = stableId;
              setProfile(updatedProfile);
              localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
              setLoading(false);
            } else {
              if (!docSnap.metadata.fromCache) {
                // Read from compiled localized cache to preserve user details
                const locCached = localStorage.getItem(`profile_${currentUser.uid}`);
                let locProfile: any = null;
                if (locCached) {
                  try {
                    locProfile = JSON.parse(locCached);
                  } catch (e) {}
                }

                const finalGender = explicitGender || locProfile?.gender || storedGender || 'male';
                const finalPhoto = locProfile?.photoURL || (finalGender === 'male' ? INDIAN_MALE_AVATARS[0] : INDIAN_FEMALE_AVATARS[0]);
                const finalName = locProfile?.displayName || (finalGender === 'male' ? INDIAN_MALE_NAMES[0] : INDIAN_FEMALE_NAMES[0]);

                const newProfile: UserProfile = {
                  uid: currentUser.uid,
                  numericId: locProfile?.numericId || generatedId,
                  displayName: finalName,
                  photoURL: finalPhoto,
                  level: locProfile?.level ?? 1,
                  experience: locProfile?.experience ?? 0,
                  coins: locProfile?.coins ?? 100,
                  diamonds: locProfile?.diamonds ?? 10,
                  badges: locProfile?.badges ?? ['👑 Mulaqat Star'],
                  followersCount: locProfile?.followersCount ?? 5,
                  followingCount: locProfile?.followingCount ?? 3,
                  visitorsCount: locProfile?.visitorsCount ?? 17,
                  isVIP: locProfile?.isVIP ?? false,
                  lastLogin: new Date().toISOString(),
                  lastLoginDeviceId: deviceId,
                  age: locProfile?.age ?? 22,
                  gender: finalGender,
                  country: locProfile?.country || 'India 🇮🇳',
                  bio: locProfile?.bio || (finalGender === 'male' ? 'Desi Rockstar 🎸 | Good vibes only' : 'Party Queen 🌸 | Love singing & vibes'),
                  theme: locProfile?.theme || 'Space Dust'
                };
                
                await setDoc(profileRef, newProfile).catch(() => {});
                setProfile(newProfile);
                localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
              } else {
                const cached = localStorage.getItem(`profile_${currentUser.uid}`);
                if (cached) {
                  try {
                    setProfile(JSON.parse(cached));
                  } catch (pErr) {}
                }
              }
              setLoading(false);
            }
          }, (err) => {
            console.warn("Profile snapshot failed, falling back to local profile securely:", err);
            const cached = localStorage.getItem(`profile_${currentUser.uid}`);
            if (cached) {
              try {
                setProfile(JSON.parse(cached));
              } catch (pErr) {}
            } else {
              const generatedId = getOrCreateNumericId(currentUser.uid);
              const firstNames = ['Liam', 'Aria', 'Ethan', 'Julian', 'Zoe', 'Lucas', 'Sophia', 'Alexander', 'Olivia', 'Nathan', 'Chloe', 'Ryan', 'Serena', 'Marcus', 'Elena', 'Justin', 'Amara', 'Derrick'];
              const lastSuffixes = ['Melody', 'Vibe', 'Echo', 'Beats', 'Voice', 'Harmony', 'Chords', 'Tune', 'Sonic', 'Mic', 'Decks', 'Rhythm', 'Acoustic'];
              const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]}_${lastSuffixes[Math.floor(Math.random() * lastSuffixes.length)]}`;
              
              const fallbackProfile: UserProfile = {
                uid: currentUser.uid,
                numericId: generatedId,
                displayName: currentUser.displayName || randomName,
                photoURL: currentUser.photoURL || getPremiumAvatar(currentUser.uid),
                level: 1,
                experience: 0,
                coins: 1500,
                diamonds: 10,
                badges: [],
                followersCount: 5,
                followingCount: 3,
                visitorsCount: 17,
                isVIP: false,
                lastLogin: new Date().toISOString(),
                lastLoginDeviceId: deviceId,
                age: 18,
                gender: 'secret',
                country: 'Global',
                bio: 'Just stepped into Maxo Party! 🌟 (Local Profile Active)',
                theme: 'Space Dust'
              };
              setProfile(fallbackProfile);
              localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(fallbackProfile));
            }
            setLoading(false);
          });
        } catch (error: any) {
          setLoading(false);
        }
      } else {
        const cachedMockStr = localStorage.getItem('maxo_mock_user');
        if (cachedMockStr) {
          try {
            const mockUserVal = JSON.parse(cachedMockStr);
            handleUserSession(mockUserVal);
            return;
          } catch (e) {}
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const cachedMockStr = localStorage.getItem('maxo_mock_user');
      if (u && u.isAnonymous && cachedMockStr) {
        try {
          const parsedMock = JSON.parse(cachedMockStr);
          if (parsedMock.uid && (parsedMock.uid.startsWith('guest_') || parsedMock.uid.startsWith('mobile_') || parsedMock.uid.startsWith('pass_user_') || parsedMock.uid.startsWith('user_') || /^\d+$/.test(parsedMock.uid))) {
            await auth.signOut();
            return;
          }
        } catch (e) {}
      }
      handleUserSession(u);
    });

    const handleAuthUpdated = () => {
      const cachedMockStr = localStorage.getItem('maxo_mock_user');
      if (cachedMockStr) {
        try {
          const mockUserVal = JSON.parse(cachedMockStr);
          setUser(mockUserVal);
          const act = localStorage.getItem('maxo_active_profile') || localStorage.getItem(`profile_${mockUserVal.uid}`);
          if (act) {
            setProfile(JSON.parse(act));
          }
          setLoading(false);
        } catch (e) {}
      }
    };
    window.addEventListener('auth_profile_updated', handleAuthUpdated);
    window.addEventListener('storage', handleAuthUpdated);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('auth_profile_updated', handleAuthUpdated);
      window.removeEventListener('storage', handleAuthUpdated);
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (unsubUserBan) unsubUserBan();
      if (unsubDeviceBan) unsubDeviceBan();
    };
  }, [deviceId]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, deviceId, banStatus, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
