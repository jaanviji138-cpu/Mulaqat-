export interface VideoHost {
  id: string;
  numericId?: string; // Permanent short ID starting at 1000
  name: string;
  age: number;
  avatar: string;
  coverPhoto: string;
  photos?: string[]; // 5-6 portrait DPs
  bio: string;
  status: 'online' | 'busy' | 'offline';
  ratePerMinute: number; // in coins, e.g. 1500
  languages: string[];
  tags: string[];
  city: string;
  callCount: number;
  rating: number; // e.g. 5.0
  isVerified: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  createdAt?: number | string; // Timestamp when host ID was created
  voiceNoteText: string;
  voiceDurationSec?: number;
  interests?: string[];
  videoLoopUrl?: string;
}

/**
 * Checks if host ID is within 15 days of creation (for 'NEW' badge)
 * As instructed: "15 दिन तक उसकी आईडी के आगे या साइड में न्यू टैग होना चाहिए। जब 15 दिन कंप्लीट हो जाएं तो यह न्यू हट जाना चाहिए।"
 */
export function isHostNew15Days(host: VideoHost): boolean {
  if (host.isNew === false) return false;
  if (host.isNew === true && !host.createdAt) return true;
  if (!host.createdAt) return true; // Default to new for demo/recent hosts

  const createdTime = typeof host.createdAt === 'number' ? host.createdAt : new Date(host.createdAt).getTime();
  if (isNaN(createdTime)) return true;

  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
  return (Date.now() - createdTime) < fifteenDaysMs;
}

// Exactly 1 clean verified dummy host for testing, as explicitly requested by user
export const INITIAL_VIDEO_HOSTS: VideoHost[] = [
  {
    id: 'host_priya_sharma',
    numericId: '1000',
    name: 'Priya Sharma',
    age: 22,
    avatar: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&auto=format&fit=crop&q=80',
    photos: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80'
    ],
    bio: 'Late night cozy talks & fun vibes ✨ Connect with me on 1-on-1 private video call!',
    status: 'online',
    ratePerMinute: 1500,
    languages: ['Hindi', 'English'],
    tags: ['✨ Sweet Talk', '🌙 Late Night', '💖 1-on-1 Call'],
    city: 'Mumbai',
    callCount: 1420,
    rating: 5.0,
    isVerified: true,
    isTrending: true,
    voiceNoteText: 'नमस्ते! मैं प्रिया शर्मा। मुझसे 1-on-1 प्राइवेट वीडियो कॉल पर बात कीजिए! 💋',
    voiceDurationSec: 5,
    interests: ['Music', 'Dancing', 'Late Night Talk', 'Astrology']
  }
];

export interface InCallDare {
  id: string;
  text: string;
  icon: string;
  coinCost: number;
}

export const IN_CALL_DARES: InCallDare[] = [
  { id: 'dare_flying_kiss', text: 'Send a sweet Flying Kiss 💋', icon: '💋', coinCost: 299 },
  { id: 'dare_wink_smile', text: 'Wink and give a cute smile 😉', icon: '😉', coinCost: 199 },
  { id: 'dare_hair_flip', text: 'Slow motion hair flip ✨', icon: '💁‍♀️', coinCost: 399 },
  { id: 'dare_heart_hands', text: 'Make finger hearts with both hands 🫰', icon: '🫰', coinCost: 249 },
  { id: 'dare_sing_line', text: 'Hum a romantic Bollywood line 🎵', icon: '🎵', coinCost: 499 }
];
