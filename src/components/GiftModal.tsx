import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Coins, 
  Sparkles, 
  Heart, 
  Crown, 
  Car, 
  Rocket, 
  Diamond, 
  X, 
  PlusCircle, 
  Check, 
  Send
} from 'lucide-react';
import { RoomSeat } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MASTER_GIFTS, StoreGift } from '@/data/storeItems';

export interface GiftItem {
  id: string;
  name: string;
  hindiName: string;
  icon: string;
  coins: number;
  category: 'popular' | 'love' | 'vehicles' | 'luxury' | 'fantasy' | 'status';
  description: string;
  animType: 'tajmahal' | 'car' | 'castle' | 'jet' | 'crown' | 'rocket' | 'diamond' | 'rose' | 'simple';
  color: string;
}

// Spectacular Grand Feature Gifts
const GRAND_GIFTS: GiftItem[] = [
  {
    id: 'gift_tajmahal',
    name: 'Taj Mahal',
    hindiName: 'ताजमहल (Wonder of Love)',
    icon: '🏰',
    coins: 50000,
    category: 'luxury',
    description: 'Golden Wonder of Love with Fireworks & Rose Rain',
    animType: 'tajmahal',
    color: 'from-amber-400 via-yellow-300 to-amber-600'
  },
  {
    id: 'gift_supercar',
    name: 'Super Sports Car',
    hindiName: 'सुपर स्पोर्ट्स कार (Ferrari)',
    icon: '🏎️',
    coins: 25000,
    category: 'vehicles',
    description: 'Roaring Hypercar zooming with Golden Speed Trails',
    animType: 'car',
    color: 'from-red-500 via-rose-500 to-amber-500'
  },
  {
    id: 'gift_love_castle',
    name: 'Love Castle',
    hindiName: 'लव कैसल (Romantic Castle)',
    icon: '💖',
    coins: 15000,
    category: 'love',
    description: 'Fairytale Glowing Castle with Flying Pink Hearts',
    animType: 'castle',
    color: 'from-pink-500 via-fuchsia-500 to-purple-600'
  },
  {
    id: 'gift_private_jet',
    name: 'Private Jet',
    hindiName: 'प्राइवेट जेट (Luxury Jet)',
    icon: '✈️',
    coins: 10000,
    category: 'vehicles',
    description: 'Golden Wings Flying through Clouds & Banners',
    animType: 'jet',
    color: 'from-sky-400 via-blue-500 to-indigo-600'
  },
  {
    id: 'gift_royal_crown',
    name: 'Imperial Crown',
    hindiName: 'शाही ताज (Royal Crown)',
    icon: '👑',
    coins: 5000,
    category: 'status',
    description: 'Dazzling Golden Diamond Crown of Kings',
    animType: 'crown',
    color: 'from-amber-300 via-yellow-400 to-amber-500'
  },
  {
    id: 'gift_rocket',
    name: 'Space Rocket',
    hindiName: 'स्पेस रॉकेट (Blast Off)',
    icon: '🚀',
    coins: 2500,
    category: 'luxury',
    description: 'Fiery Rocket launch to the Moon with Stars',
    animType: 'rocket',
    color: 'from-orange-500 via-amber-500 to-red-600'
  },
  {
    id: 'gift_diamond',
    name: 'Mega Diamond',
    hindiName: 'शाही हीरा (Mega Diamond)',
    icon: '💎',
    coins: 1000,
    category: 'luxury',
    description: 'Rotating Blue Sapphire & Diamond Light Burst',
    animType: 'diamond',
    color: 'from-cyan-400 via-blue-400 to-indigo-500'
  }
];

// Convert all 50 Store gifts into Room gifts
const CONVERTED_STORE_GIFTS: GiftItem[] = MASTER_GIFTS.map((g: StoreGift) => {
  const cat = g.category.toLowerCase() as 'popular' | 'love' | 'vehicles' | 'luxury' | 'fantasy' | 'status';
  let animType: GiftItem['animType'] = 'simple';
  if (g.id === 'rose' || g.id === 'rose_bouquet') animType = 'rose';
  else if (cat === 'vehicles') animType = 'car';
  else if (g.price >= 10000) animType = 'tajmahal';
  else if (g.id.includes('crown')) animType = 'crown';
  else if (g.id.includes('diamond') || g.id.includes('ring')) animType = 'diamond';

  return {
    id: `gift_${g.id}`,
    name: g.name,
    hindiName: `${g.name} (${g.rarity.toUpperCase()})`,
    icon: g.icon,
    coins: g.price,
    category: cat,
    description: g.description,
    animType,
    color: 'from-amber-400 to-yellow-500'
  };
});

// All 55+ gifts available in room
export const ROOM_GIFTS: GiftItem[] = [
  ...GRAND_GIFTS,
  ...CONVERTED_STORE_GIFTS.filter(g => !GRAND_GIFTS.some(grand => grand.icon === g.icon))
];

export type LuxuryGiftItem = GiftItem;

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoins: number;
  onAddCoins?: (amount: number) => void;
  seats?: RoomSeat[];
  hostData?: { hostId: string; hostName?: string; hostPhoto?: string };
  currentUserId?: string;
  targetUser?: { id?: string; uid?: string; name: string; photo?: string } | null;
  onSendGift: (gift: GiftItem, targetUser: { id: string; uid: string; name: string; photo?: string }) => void;
}

export default function GiftModal({
  isOpen,
  onClose,
  userCoins,
  onAddCoins,
  seats = [],
  hostData,
  currentUserId = '',
  targetUser,
  onSendGift
}: GiftModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'love' | 'luxury' | 'vehicles' | 'fantasy' | 'status'>('all');
  const [selectedGift, setSelectedGift] = useState<GiftItem>(ROOM_GIFTS[0]);
  const [selectedRecipientUid, setSelectedRecipientUid] = useState<string>(() => {
    if (targetUser?.uid || targetUser?.id) return (targetUser.uid || targetUser.id)!;
    if (hostData?.hostId && hostData.hostId !== currentUserId) return hostData.hostId;
    const firstSeated = (seats || []).find(s => s.uid && s.uid !== currentUserId);
    return firstSeated?.uid || hostData?.hostId || 'room';
  });

  if (!isOpen) return null;

  // Build eligible recipient list
  const recipients: { uid: string; id: string; name: string; photo?: string; role: string }[] = [];

  if (targetUser && (targetUser.id || targetUser.uid)) {
    const tId = (targetUser.uid || targetUser.id)!;
    recipients.push({
      uid: tId,
      id: tId,
      name: targetUser.name || 'Recipient',
      photo: targetUser.photo,
      role: 'Selected User ⭐'
    });
  }

  if (hostData?.hostId && (!targetUser || (targetUser.id !== hostData.hostId && targetUser.uid !== hostData.hostId))) {
    recipients.push({
      uid: hostData.hostId,
      id: hostData.hostId,
      name: hostData.hostName || 'Room Host',
      photo: hostData.hostPhoto,
      role: 'Host 👑'
    });
  }

  (seats || []).forEach((seat) => {
    if (seat.uid && seat.uid !== hostData?.hostId && (!targetUser || (targetUser.id !== seat.uid && targetUser.uid !== seat.uid))) {
      recipients.push({
        uid: seat.uid,
        id: seat.uid,
        name: seat.displayName || `Seat ${seat.index + 1}`,
        photo: seat.photoURL,
        role: `Seat ${seat.index + 1}`
      });
    }
  });

  const filteredGifts = selectedCategory === 'all' 
    ? ROOM_GIFTS 
    : ROOM_GIFTS.filter(g => g.category === selectedCategory);

  const currentRecipient = recipients.find(r => r.uid === selectedRecipientUid || r.id === selectedRecipientUid) || recipients[0] || {
    uid: 'room',
    id: 'room',
    name: 'All Room Members 🌟',
    photo: '',
    role: 'Room'
  };

  const handleSend = () => {
    if (!selectedGift) return;

    if (userCoins < selectedGift.coins) {
      toast.error(`Need ${selectedGift.coins.toLocaleString()} Coins! Tap "+ Add Coins" to get free coins.`);
      return;
    }

    onSendGift(selectedGift, {
      uid: currentRecipient.uid,
      id: currentRecipient.id,
      name: currentRecipient.name,
      photo: currentRecipient.photo
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="w-full max-w-md bg-[#0F0B24] border border-amber-400/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col max-h-[88vh] text-white overflow-hidden space-y-3"
      >
        {/* Header with Coin Balance & Topup */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow">
              <Gift size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Send Luxury Gift</span>
                <Sparkles size={13} className="text-amber-400" />
              </h3>
              <p className="text-[10px] text-zinc-400">Send gifts and trigger full-screen animations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Coins Pill */}
            <div className="flex items-center gap-1.5 bg-black/60 border border-amber-400/50 px-2.5 py-1 rounded-full shadow-inner">
              <Coins size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-amber-300 font-mono">
                {userCoins.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Recipient Selection Tray */}
        {recipients.length > 0 && (
          <div className="space-y-1.5 bg-black/30 p-2 rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold text-zinc-400 px-1">Choose Receiver:</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recipients.map((rec) => {
                const isSelected = selectedRecipientUid === rec.uid;
                return (
                  <button
                    key={rec.uid}
                    type="button"
                    onClick={() => setSelectedRecipientUid(rec.uid)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {rec.photo ? (
                      <img src={rec.photo} alt={rec.name} className="w-5 h-5 rounded-full object-cover border border-amber-400/50" />
                    ) : (
                      <span className="text-xs">👤</span>
                    )}
                    <div className="text-left">
                      <span className="text-[11px] font-bold text-white block leading-tight max-w-[80px] truncate">{rec.name}</span>
                      <span className="text-[8px] text-amber-300 block">{rec.role}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: 'all', label: 'All 🎁' },
            { id: 'popular', label: 'Popular ⭐' },
            { id: 'love', label: 'Love 💖' },
            { id: 'luxury', label: 'Luxury 🏰' },
            { id: 'vehicles', label: 'Vehicles 🏎️' },
            { id: 'fantasy', label: 'Fantasy 🦄' },
            { id: 'status', label: 'Status 👑' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-black font-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gift Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2 pr-0.5 max-h-[36vh]">
          {filteredGifts.map((gift) => {
            const isSelected = selectedGift.id === gift.id;
            const canAfford = userCoins >= gift.coins;

            return (
              <motion.button
                key={gift.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedGift(gift)}
                className={`relative p-2.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                  isSelected
                    ? 'bg-amber-400/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] scale-[1.02]'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                }`}
              >
                {/* Special Tag for big animations */}
                {gift.coins >= 10000 && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-red-500 text-black px-1.5 py-0.2 rounded-full shadow">
                    ANIMATION
                  </span>
                )}

                <span className="text-3xl sm:text-4xl my-1 filter drop-shadow">
                  {gift.icon}
                </span>

                <div className="w-full">
                  <span className="text-[10px] font-black text-white block truncate">
                    {gift.name}
                  </span>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-300 font-mono">
                    <Coins size={10} className="text-amber-400 fill-amber-400" />
                    <span>{gift.coins >= 1000 ? `${(gift.coins / 1000).toFixed(0)}k` : gift.coins}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                    <Check size={10} className="stroke-[3]" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Gift Preview & Send Footer */}
        <div className="pt-2 border-t border-white/10 bg-[#140E30] -mx-4 -mb-4 p-4 rounded-b-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-3xl shrink-0">{selectedGift.icon}</span>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-white truncate">{selectedGift.hindiName}</h4>
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-300 font-mono">
                <Coins size={12} className="text-amber-400 fill-amber-400" />
                <span>{selectedGift.coins.toLocaleString()} Coins</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSend}
            className="h-10 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-500 text-black font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.5)] active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send size={13} className="stroke-[3]" />
            <span>Send Gift 🎁</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
