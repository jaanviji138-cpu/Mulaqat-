// Ultra-Romantic & Unique In-Call Gifts
export interface RomanticGift {
  id: string;
  name: string;
  hindiName: string;
  category: 'sweet' | 'romantic' | 'passion' | 'royal';
  cost: number;
  icon: string;
  animationType: 'rose_rain' | 'flying_kiss' | 'heart_explosion' | 'diamond_shine' | 'love_car' | 'crown_royalty' | 'castle_magic' | 'fireworks' | 'yacht_sunset' | 'teddy_hug' | 'candle_dinner' | 'love_lock' | 'universe_cosmic' | 'chocolate_sweet' | 'guitar_serenade';
  tagline: string;
  themeColor: string;
  gradient: string;
}

export const ROMANTIC_GIFTS: RomanticGift[] = [
  {
    id: 'sweet_rose',
    name: 'Red Rose Bouquet',
    hindiName: 'गुलाब का गुलदस्ता',
    category: 'sweet',
    cost: 20,
    icon: '🌹',
    animationType: 'rose_rain',
    tagline: 'खुशबूदार ताज़ा लाल गुलाब सिर्फ तुम्हारे लिए 🌹',
    themeColor: '#f43f5e',
    gradient: 'from-rose-600 via-pink-600 to-red-600'
  },
  {
    id: 'flying_kiss',
    name: 'Hot Flying Kiss',
    hindiName: 'हॉट लव किस',
    category: 'romantic',
    cost: 50,
    icon: '💋',
    animationType: 'flying_kiss',
    tagline: 'मीठा सा रोमांटिक चुंबन सीधे दिल तक 💋',
    themeColor: '#ec4899',
    gradient: 'from-pink-600 via-rose-500 to-red-500'
  },
  {
    id: 'chocolate_box',
    name: 'Sweet Love Chocolates',
    hindiName: 'हार्ट चॉकलेट बॉक्स',
    category: 'sweet',
    cost: 80,
    icon: '🍫',
    animationType: 'chocolate_sweet',
    tagline: 'प्यार भरी मीठी चॉकलेट्स की मिठास 🍫',
    themeColor: '#a16207',
    gradient: 'from-amber-700 via-amber-600 to-yellow-600'
  },
  {
    id: 'beating_heart',
    name: 'Throbbing Love Heart',
    hindiName: 'धड़कता हुआ दिल',
    category: 'passion',
    cost: 120,
    icon: '💖',
    animationType: 'heart_explosion',
    tagline: 'ये दिल सिर्फ तुम्हारे लिए धड़कता है 💓',
    themeColor: '#e11d48',
    gradient: 'from-rose-500 via-pink-600 to-fuchsia-600'
  },
  {
    id: 'teddy_hug',
    name: 'Romantic Teddy Hug',
    hindiName: 'लव टेडी हग',
    category: 'sweet',
    cost: 180,
    icon: '🧸',
    animationType: 'teddy_hug',
    tagline: 'प्यारा सा गर्म आलिंगन और ढेर सारा प्यार 🧸',
    themeColor: '#d97706',
    gradient: 'from-amber-500 via-orange-500 to-rose-500'
  },
  {
    id: 'candle_dinner',
    name: 'Candlelight Dinner',
    hindiName: 'कैंडल लाइट डिनर',
    category: 'romantic',
    cost: 300,
    icon: '🍷',
    animationType: 'candle_dinner',
    tagline: 'मोमबत्ती की रोशनी में एक हसीन रोमांटिक शाम 🍷',
    themeColor: '#be123c',
    gradient: 'from-red-700 via-rose-600 to-amber-600'
  },
  {
    id: 'diamond_ring',
    name: 'Diamond Love Ring',
    hindiName: 'डायमंड प्रपोजल रिंग',
    category: 'romantic',
    cost: 600,
    icon: '💍',
    animationType: 'diamond_shine',
    tagline: 'मेरी ज़िन्दगी बन जाओ... हमेशा के लिए 💍✨',
    themeColor: '#38bdf8',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600'
  },
  {
    id: 'love_lock',
    name: 'Eternal Love Lock',
    hindiName: 'फॉरएवर लव लॉक',
    category: 'passion',
    cost: 900,
    icon: '🔒',
    animationType: 'love_lock',
    tagline: 'हमारे प्यार का ताला जिसकी चाबी खो गई है 🔒💖',
    themeColor: '#eab308',
    gradient: 'from-yellow-400 via-amber-500 to-orange-500'
  },
  {
    id: 'guitar_serenade',
    name: 'Romantic Guitar Song',
    hindiName: 'रोमांटिक गिटार धुन',
    category: 'sweet',
    cost: 1200,
    icon: '🎸',
    animationType: 'guitar_serenade',
    tagline: 'तुम्हारे हुस्न के नाम एक सुरीली मोहब्बत की धुन 🎸🎶',
    themeColor: '#8b5cf6',
    gradient: 'from-violet-600 via-purple-600 to-pink-600'
  },
  {
    id: 'ferrari_drive',
    name: 'Ferrari Romantic Drive',
    hindiName: 'रेड फरारी लॉन्ग ड्राइव',
    category: 'passion',
    cost: 2000,
    icon: '🏎️',
    animationType: 'love_car',
    tagline: 'चलो साथ चलें दूर हवाओं में फरारी राइड पर 🏎️💨',
    themeColor: '#ef4444',
    gradient: 'from-red-600 via-rose-600 to-amber-500'
  },
  {
    id: 'queen_crown',
    name: 'Queen of My Heart',
    hindiName: 'क्वीन क्राउन',
    category: 'royal',
    cost: 3500,
    icon: '👑',
    animationType: 'crown_royalty',
    tagline: 'तुम मेरे दिल की मलिका और रानी हो 👑✨',
    themeColor: '#f59e0b',
    gradient: 'from-amber-400 via-yellow-300 to-amber-600'
  },
  {
    id: 'love_castle',
    name: 'Romance Castle',
    hindiName: 'प्रेम महल',
    category: 'royal',
    cost: 6000,
    icon: '🏰',
    animationType: 'castle_magic',
    tagline: 'सपनों का वो महल जहाँ सिर्फ तुम और मैं हैं 🏰💖',
    themeColor: '#ec4899',
    gradient: 'from-pink-500 via-purple-600 to-indigo-600'
  },
  {
    id: 'love_fireworks',
    name: 'Romantic Fireworks',
    hindiName: 'लव आतिशबाजी',
    category: 'passion',
    cost: 10000,
    icon: '🎆',
    animationType: 'fireworks',
    tagline: 'तुम्हारे प्यार में आसमान में रोशन होती आतिशबाजी 🎆✨',
    themeColor: '#06b6d4',
    gradient: 'from-cyan-400 via-fuchsia-500 to-amber-400'
  },
  {
    id: 'sunset_yacht',
    name: 'Sunset Love Yacht',
    hindiName: 'सनसेट लव यॉट',
    category: 'royal',
    cost: 15000,
    icon: '🛥️',
    animationType: 'yacht_sunset',
    tagline: 'समंदर की लहरों पर डूबते सूरज के साथ रोमांस 🛥️🌅',
    themeColor: '#0284c7',
    gradient: 'from-sky-500 via-indigo-600 to-pink-500'
  },
  {
    id: 'love_universe',
    name: 'You Are My Universe',
    hindiName: 'माई लव यूनिवर्स',
    category: 'royal',
    cost: 25000,
    icon: '🪐',
    animationType: 'universe_cosmic',
    tagline: 'तुम सिर्फ एक इंसान नहीं, मेरी पूरी कायनात हो 🪐✨',
    themeColor: '#a855f7',
    gradient: 'from-purple-600 via-pink-500 to-yellow-400'
  }
];
