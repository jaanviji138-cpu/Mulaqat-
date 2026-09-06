import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, ShieldCheck, Sparkles, AlertCircle, ShoppingBag, 
  Check, Archive, Grid, Heart, Crown, Award, User, HelpCircle, 
  Zap, MessageCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MASTER_GIFTS, STORE_ITEMS, lookupStoreItem, StoreItem, StoreGift } from '@/data/storeItems';
import { AnimatedAvatarFrame, LUXURY_FRAMES } from '@/components/AnimatedAvatarFrame';

export default function BackpackPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Tab control: Closet (Frames, Entry, Bubbles, Decors) vs Vault (Gifts stock)
  const [activeSegment, setActiveSegment] = useState<'closet' | 'vault'>('closet');
  const [closetFilter, setClosetFilter] = useState<'all' | 'frame' | 'entrance' | 'bubble' | 'avatar_dec'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ownedIds = profile?.badges || [];
  
  // All items available + 24h trial items
  const ownedFashionItems = STORE_ITEMS.filter(item => ownedIds.includes(item.id) || item.id === 'frame_sakura_bloom_trial');

  const filteredFashionItems = closetFilter === 'all' 
    ? ownedFashionItems 
    : ownedFashionItems.filter(item => item.type === closetFilter);

  // Determine active custom profile properties (default empty if none)
  const activeFrame = (profile as any)?.activeFrame || '';
  const activeBubble = (profile as any)?.activeBubble || '';
  const activeBadge = (profile as any)?.activeBadge || '';
  const activeEntrance = (profile as any)?.activeEntrance || '';
  const activeAvatarDec = (profile as any)?.activeAvatarDec || '';
  const activeRoomDec = (profile as any)?.activeRoomDec || '';

  // Extract gifts stock from profile.giftInventory map
  const giftInventory = (profile as any)?.giftInventory || {};
  const ownedGiftKeys = Object.keys(giftInventory).filter(key => giftInventory[key] > 0);
  const ownedGiftsList = ownedGiftKeys.map(key => {
    const giftObj = MASTER_GIFTS.find(g => g.id === key);
    return giftObj ? { ...giftObj, qty: giftInventory[key] } : null;
  }).filter(Boolean) as (StoreGift & { qty: number })[];

  const handleEquipFashion = async (item: StoreItem) => {
    if (!profile?.uid) return;
    setUpdatingId(item.id);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updates: Record<string, any> = {};

      if (item.type === 'frame') {
        const isEquipped = activeFrame === item.id;
        updates.activeFrame = isEquipped ? '' : item.id;
      } else if (item.type === 'bubble') {
        const isEquipped = activeBubble === item.id;
        updates.activeBubble = isEquipped ? '' : item.id;
      } else if (item.type === 'badge') {
        const isEquipped = activeBadge === item.id;
        updates.activeBadge = isEquipped ? '' : item.id;
      } else if (item.type === 'entrance') {
        const isEquipped = activeEntrance === item.id;
        updates.activeEntrance = isEquipped ? '' : item.id;
      } else if (item.type === 'avatar_dec') {
        const isEquipped = activeAvatarDec === item.id;
        updates.activeAvatarDec = isEquipped ? '' : item.id;
      } else if (item.type === 'room_dec') {
        const isEquipped = activeRoomDec === item.id;
        updates.activeRoomDec = isEquipped ? '' : item.id;
      }

      await updateDoc(userRef, updates);
      toast.success(`${item.name} equipment updated!`);
    } catch (e) {
      console.error("Equipping error:", e);
      toast.error('Failed to change your equipped tools.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B11] text-white font-sans pb-32">
      {/* Sticky Top Navigation */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#090B11]/80 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-gray-400 hover:text-white rounded-full bg-white/5 border border-white/10">
            <ChevronLeft size={22} className="stroke-[2.5]" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black text-sm shadow-md">
              🎒
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight text-white">Backpack Vault</h1>
              <p className="text-[10px] text-amber-400 font-bold">Frames, Entry, Bubbles & Gifts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Dynamic Interactive Preview Card with Animated Avatar Frame */}
        {profile && (
          <div className="bg-gradient-to-b from-[#111625] to-[#0A0D16] rounded-[32px] p-6 border border-white/10 flex flex-col items-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0,transparent_75%)]" />
            
            <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 relative z-10">
              Live Equipped Avatar Preview
            </h3>
            
            {/* Real-time Layered Avatar Rendering */}
            <div className="relative flex items-center justify-center py-4 relative z-10">
              <AnimatedAvatarFrame frameId={activeFrame} size="lg">
                <img 
                  src={profile.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'} 
                  className="w-20 h-20 rounded-full object-cover shadow-inner" 
                  alt={profile.displayName} 
                />
              </AnimatedAvatarFrame>
            </div>

            {/* Profile detail listings */}
            <div className="text-center space-y-2 relative z-10">
              <p className="font-black text-base text-white">{profile.displayName}</p>
              
              <div className="flex flex-wrap gap-1.5 justify-center">
                {activeFrame ? (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-400/40 shadow-sm flex items-center gap-1">
                    <Sparkles size={10} /> Frame: {STORE_ITEMS.find(i => i.id === activeFrame)?.name || 'Equipped'}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 px-3 py-1 rounded-full border border-white/10">
                    No Frame Equipped
                  </span>
                )}
                {activeEntrance && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-400/40 flex items-center gap-1">
                    <Zap size={10} /> Entry Effect Active
                  </span>
                )}
                {activeBubble && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1">
                    <MessageCircle size={10} /> Bubble Active
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2 segmented tab controls: Closet vs Stock */}
        <div className="grid grid-cols-2 bg-[#0C101A]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 gap-1 shadow-inner">
          <button 
            onClick={() => setActiveSegment('closet')}
            className={`py-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === 'closet'
                ? 'bg-gradient-to-tr from-yellow-500 to-amber-600 text-black shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Grid size={14} />
            <span>Fashion Closet</span>
          </button>
          
          <button 
            onClick={() => setActiveSegment('vault')}
            className={`py-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === 'vault'
                ? 'bg-gradient-to-tr from-yellow-500 to-amber-600 text-black shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Archive size={14} />
            <span>Gifts Stock ({ownedGiftsList.length})</span>
          </button>
        </div>

        {/* CLOSET SUB-CATEGORIES: All, Frames, Entry, Bubbles, Decors */}
        {activeSegment === 'closet' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: 'all', label: 'All Items' },
                { key: 'frame', label: 'Avatar Frames (फ्रेम)' },
                { key: 'entrance', label: 'Entry Effects (एंट्री)' },
                { key: 'bubble', label: 'Chat Bubbles' },
                { key: 'avatar_dec', label: 'Decorations' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setClosetFilter(f.key as any)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    closetFilter === f.key
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 24-Hour Free Trial Banner */}
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/30 border border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-lg">
                  🌸
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white">Sakura Starlight Trial</p>
                    <span className="bg-pink-500 text-black text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">24h Free</span>
                  </div>
                  <p className="text-[10px] text-pink-300 font-medium">Equip this trial animated frame directly in your backpack!</p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleEquipFashion({
                  id: 'frame_sakura_bloom_trial',
                  name: 'Sakura Starlight Trial',
                  type: 'frame',
                  description: '24h Trial',
                  price: 0,
                  priceType: 'coins',
                  previewIcon: '🌸',
                  previewClass: ''
                })}
                className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase ${
                  activeFrame === 'frame_sakura_bloom_trial'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-pink-500 hover:bg-pink-400 text-black font-black'
                }`}
              >
                {activeFrame === 'frame_sakura_bloom_trial' ? 'Unequip' : 'Try Now'}
              </Button>
            </div>

            {/* ITEM CARDS */}
            {filteredFashionItems.length === 0 ? (
              <div className="text-center py-12 px-6 bg-[#0C101A] rounded-[28px] border border-white/5 space-y-3">
                <AlertCircle size={36} className="text-gray-500 mx-auto" />
                <p className="font-bold text-white text-sm">No items found in this section</p>
                <p className="text-xs text-gray-500">Visit the store to purchase luxury animated frames and entry effects.</p>
                <Button 
                  onClick={() => navigate('/store')} 
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 py-2 rounded-xl flex mx-auto gap-1.5 items-center uppercase"
                >
                  <ShoppingBag size={13} /> Open Store
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFashionItems.map(item => {
                  const isEquipped = 
                    (item.type === 'frame' && activeFrame === item.id) ||
                    (item.type === 'bubble' && activeBubble === item.id) ||
                    (item.type === 'badge' && activeBadge === item.id) ||
                    (item.type === 'entrance' && activeEntrance === item.id) ||
                    (item.type === 'avatar_dec' && activeAvatarDec === item.id) ||
                    (item.type === 'room_dec' && activeRoomDec === item.id);

                  return (
                    <div 
                      key={item.id}
                      className={`bg-[#0C101A] border rounded-2xl p-4 flex gap-3.5 items-center justify-between transition-all ${
                        isEquipped ? 'border-amber-500/60 bg-amber-500/[0.04] shadow-md shadow-amber-500/5' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 bg-white/5 rounded-xl flex items-center justify-center text-xl relative border border-white/10">
                          {item.type === 'frame' ? (
                            <AnimatedAvatarFrame frameId={item.id} size="xs">
                              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                👤
                              </div>
                            </AnimatedAvatarFrame>
                          ) : (
                            <span>{item.previewIcon}</span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <h4 className="font-black text-xs text-white leading-tight">{item.name}</h4>
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                            {item.type === 'frame' ? 'Avatar Frame' : item.type === 'entrance' ? 'Entry Effect' : item.type}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={updatingId === item.id}
                        onClick={() => handleEquipFashion(item)}
                        className={`h-8 px-4 rounded-xl text-[10px] font-black uppercase transition-all ${
                          isEquipped 
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40' 
                            : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black shadow-md'
                        }`}
                      >
                        {updatingId === item.id ? '...' : isEquipped ? 'Unequip' : 'Equip'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GIFTS STOCK VAULT */}
        {activeSegment === 'vault' && (
          <div className="space-y-3">
            {ownedGiftsList.length === 0 ? (
              <div className="text-center py-12 px-6 bg-[#0C101A] rounded-[28px] border border-white/5 space-y-3">
                <Archive size={36} className="text-gray-500 mx-auto" />
                <p className="font-bold text-white text-sm">No gifts in inventory</p>
                <p className="text-xs text-gray-500">Collect gifts received from voice rooms or purchase in store.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ownedGiftsList.map(gift => (
                  <div key={gift.id} className="bg-[#0C101A] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
                    <span className="text-3xl animate-bounce">{gift.icon}</span>
                    <p className="text-xs font-black text-white">{gift.name}</p>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                      Qty: {gift.qty}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
