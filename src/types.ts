export enum UserRole {
  HOST = 'host',
  CO_HOST = 'co-host',
  AUDIENCE = 'audience'
}

export enum MessageType {
  TEXT = 'text',
  GIFT = 'gift',
  SYSTEM = 'system'
}

export interface UserProfile {
  uid: string;
  numericId?: string; // Random unique 9-digit ID
  displayName: string;
  photoURL?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other' | string;
  role?: 'host' | 'user' | 'admin' | string;
  country?: string;
  birthday?: string;
  theme?: string; // Profile theme selection
  level: number;
  experience: number;
  coins: number; // User payment currency
  beans?: number; // Host earning currency (Replaced Diamonds)
  diamonds?: number; // Legacy alias for backward compatibility
  badges: string[];
  followersCount: number;
  followingCount: number;
  visitorsCount: number;
  isVIP?: boolean;
  age?: number;
  agencyId?: string;
  lastLogin: string;
  zodiac?: string; // Astrology sign
  faceVerified?: boolean;
  identityVerified?: boolean;
  isHostApproved?: boolean;
  isSystemAdmin?: boolean;
  blockedUsers?: string[]; // Blocked user uids
  dailyLoginStreak?: number;
  lastLoginDeviceId?: string;
  lastCheckInDate?: string;
  voiceStreakCount?: number;
  voiceMissionClaimedDate?: string;
  status?: 'online' | 'away' | 'busy' | string;
}

export interface RoomSeat {
  index: number;
  uid: string | null;
  displayName?: string;
  photoURL?: string;
  numericId?: string;
  isLocked?: boolean;
  isMuted?: boolean;
  isSelfMuted?: boolean;
  isSpeaking?: boolean;
  isMusicPlaying?: boolean;
}

export interface Room {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName?: string;
  hostPhoto?: string;
  coHostIds: string[];
  superAdminIds: string[];
  chatBannedUserIds?: string[];
  bannedUserIds?: string[];
  pinnedMsg?: any;
  isLocked?: boolean;
  roomType?: string;
  language?: string;
  password?: string;
  memberCount: number;
  category: string;
  backgroundTheme: string;
  roomTheme?: string;
  thumbnailUrl?: string; // Room DP
  isLive: boolean;
  isPrivate?: boolean;
  roomMode?: 'public' | 'private';
  allowedUsers?: string[];
  bannedUsers?: string[];
  kickedUsers?: string[];
  mutedUsers?: string[];
  createdAt: string;
  seatCount: number;
  seatedCount?: number;
  seats: RoomSeat[];
  welcomeMessage?: string;
  tags?: string[];
  musicEnabled?: boolean;
  userLimit?: number;
  trendingScore?: number;
  lastTrendingUpdate?: number;
  hourlyJoinCount?: number;
  musicPlaying?: boolean;
  musicTrackUrl?: string;
  musicTrackName?: string;
  musicTrackIndex?: number;
  musicStartedAt?: number;
  musicProgressMs?: number;
  musicSenderId?: string;
  giftVolume?: number;
}

export interface RoomMember {
  uid: string;
  role: UserRole;
  isMuted: boolean;
  joinedAt: string;
  displayName?: string;
  photoURL?: string;
  activeEntrance?: string;
  lastActive?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  timestamp: any;
  type: MessageType;
  giftId?: string;
}

export interface Gift {
  id: string;
  name: string;
  coinCost: number;
  diamondValue: number;
  animationUrl: string;
  iconUrl: string;
}
