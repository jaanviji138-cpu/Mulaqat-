import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Copy, ShieldCheck, Sparkles, ArrowLeft, 
  QrCode, Check, MessageCircle, Lock, ExternalLink,
  ChevronRight, AlertCircle, PhoneCall
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { RECHARGE_PLANS, RechargePlan } from '@/data/rechargePlans';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type PaymentMethodKey = 'phonepe' | 'gpay' | 'airtel' | 'universal';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlanId?: string;
  defaultMethod?: PaymentMethodKey;
  onSuccess?: (coinsAdded: number) => void;
}

export default function RechargeModal({
  isOpen,
  onClose,
  defaultPlanId = 'plan_100',
}: RechargeModalProps) {
  const { profile, user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const OWNER_WHATSAPP_NUMBER = '918053511029';
  const OWNER_UPI_ID = '8053511029@ybl';

  const activeUserId = profile?.uid || user?.uid || (typeof localStorage !== 'undefined' ? localStorage.getItem('last_active_uid') : null) || 'USER_' + Math.floor(100000 + Math.random() * 900000);
  const activeUserName = profile?.displayName || user?.displayName || 'यूजर';

  useEffect(() => {
    if (defaultPlanId) setSelectedPlanId(defaultPlanId);
  }, [defaultPlanId, isOpen]);

  const selectedPlan: RechargePlan =
    RECHARGE_PLANS.find((p) => p.id === selectedPlanId) || RECHARGE_PLANS[0];

  // Helper to construct WhatsApp redirect URL for any plan
  const getWhatsAppRechargeUrl = (plan: RechargePlan) => {
    const text = 
      `नमस्ते एडमिन!\n` +
      `मुझे Mulaqat Live ऐप में कॉइन्स का ऑफलाइन रिचार्ज करवाना है।\n\n` +
      `📌 प्लान: ${plan.priceDisplay} (रुपए)\n` +
      `🪙 कॉइन्स: ${plan.coins.toLocaleString()} Coins\n` +
      `🆔 मेरी यूजर आईडी (User ID): ${activeUserId}\n` +
      `👤 मेरा नाम: ${activeUserName}\n\n` +
      `कृपया मुझे पेमेंट स्कैनर / विवरण भेजें ताकि मैं पेमेंट करके कॉइन्स प्राप्त कर सकूं। धन्यवाद!`;

    return `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  // Direct 1-tap open WhatsApp for chosen plan
  const handleOpenWhatsAppForPlan = (plan: RechargePlan) => {
    setSelectedPlanId(plan.id);
    const url = getWhatsAppRechargeUrl(plan);
    toast.info(`WhatsApp खोला जा रहा है (${plan.priceDisplay})... 💬`, { duration: 2500 });

    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      window.location.href = url;
    }
  };

  // Copy User ID helper
  const handleCopyUserId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeUserId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success('आपकी यूजर आईडी कॉपी हो गई! WhatsApp पर भेजें 📋');
    }
  };

  // Copy UPI ID helper
  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(OWNER_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
      toast.success('ऑफिशियल UPI ID कॉपी हो गई! 📋');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="full_screen_offline_recharge_view"
        className="fixed inset-0 z-[120] w-full h-[100dvh] bg-[#0c0517] flex flex-col text-white select-none overflow-hidden"
      >
        {/* Full Screen Top Header */}
        <header className="px-4 py-3.5 bg-gradient-to-r from-[#220a38] via-[#160626] to-[#0c0517] border-b border-pink-500/20 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>कॉइन रीचार्ज</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  ऑफलाइन मोड
                </span>
              </h1>
              <p className="text-[10.5px] text-zinc-400">
                100% सुरक्षित • सीधा एडमिन WhatsApp सहायता
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Coins Display */}
            <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="text-xs">🪙</span>
              <span className="text-xs sm:text-sm font-black text-amber-300">
                {(profile?.coins || 0).toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-xl mx-auto w-full custom-scrollbar pb-12">
          
          {/* 1. MANDATORY CLEAR NOTICE: NO SELF-RECHARGE, ADMIN-CONTROLLED ONLY */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-red-950/30 to-purple-950/40 border border-amber-500/40 shadow-lg space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  महत्वपूर्ण सुरक्षा सूचना
                </p>
                <p className="text-[11px] text-zinc-200 mt-0.5 leading-relaxed font-medium">
                  कोई भी यूजर ऐप में खुद से ऑनलाइन रीचार्ज नहीं कर सकता। पूर्ण सुरक्षा और धोखाधड़ी से बचाव के लिए सभी रीचार्ज केवल <strong>अधिकृत एडमिन (WhatsApp)</strong> द्वारा ऑफलाइन किए जाते हैं।
                </p>
              </div>
            </div>
          </div>

          {/* 2. PROMINENT TOP OFFLINE RECHARGE BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#075e54]/30 via-emerald-950/40 to-[#075e54]/20 border-2 border-[#25d366]/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#25d366] flex items-center justify-center text-white shadow-lg">
                  <MessageCircle size={22} className="fill-white text-[#25d366]" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">
                    ऑफलाइन रिचार्ज करवाने के लिए यहाँ क्लिक करें
                  </h2>
                  <p className="text-[11px] text-emerald-300 font-bold">
                    WhatsApp: 8053511029 (24x7 सेवा)
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              नीचे किसी भी प्लान पर क्लिक करें। आपका WhatsApp सीधे एडमिन के नंबर पर खुल जाएगा और आपके खाते में तुरंत कॉइन्स जोड़ दिए जाएंगे।
            </p>

            <a
              href={getWhatsAppRechargeUrl(selectedPlan)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#25d366] to-emerald-600 hover:from-[#20ba59] hover:to-emerald-700 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <MessageCircle size={16} className="fill-white" />
              <span>ऑफलाइन रीचार्ज हेतु WhatsApp पर संपर्क करें ➔</span>
            </a>
          </div>

          {/* 3. USER ID COPY BADGE (CRITICAL FOR ADMIN DASHBOARD) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                आपकी यूजर आईडी (User ID):
              </span>
              <p className="text-xs font-mono font-black text-pink-400 tracking-wide">
                {activeUserId}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyUserId}
              className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 active:scale-95 border border-pink-500/40 text-pink-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedId ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedId ? 'कॉपी हो गई' : 'आईडी कॉपी करें'}</span>
            </button>
          </div>

          {/* 4. RECHARGE PLANS SECTION (CLICKING ANY PLAN OPENS WHATSAPP) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-pink-400" />
                <span>कॉइन प्लान चुनें (क्लिक करते ही WhatsApp खुलेगा)</span>
              </h3>
              <span className="text-[11px] text-pink-400 font-bold">7 पैकेजेस</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RECHARGE_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleOpenWhatsAppForPlan(plan)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#3b1250] to-[#1d072b] border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.3)] scale-[1.01]'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-pink-500/40'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[9.5px] font-black text-white uppercase tracking-wider shadow-md">
                        {plan.badge}
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {plan.priceDisplay}
                          </span>
                          <p className="text-[11px] font-bold text-pink-400">{plan.tagline || 'कॉइन रीचार्ज'}</p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-sm">🪙</span>
                            <span className="text-lg font-black text-amber-300">
                              {plan.coins.toLocaleString()}
                            </span>
                          </div>
                          {plan.bonusText && (
                            <span className="text-[9.5px] font-black text-emerald-400">
                              {plan.bonusText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>कॉलिंग बैकअप:</span>
                        <span className="font-bold text-zinc-200">
                          ~{Math.floor(plan.coins / 100)} मिनट वीडियो कॉल
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Action Button on each plan */}
                    <button
                      type="button"
                      className="mt-3.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#25d366] to-emerald-600 hover:from-[#20ba59] hover:to-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <MessageCircle size={14} className="fill-white" />
                      <span>{plan.priceDisplay} • WhatsApp पर रीचार्ज करें</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. OFFICIAL QR SCANNER SECTION */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#220a38] via-[#160626] to-[#0c0517] border border-pink-500/30 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <QrCode size={16} className="text-pink-400" />
                <span>ऑफिशियल पेमेंट स्कैनर (QR Scanner)</span>
              </h3>
              <span className="text-[9.5px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                वेरीफाइड स्कैनर
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              आप नीचे दिए गए ऑफिशियल स्कैनर से किसी भी UPI ऐप (PhonePe, GPay, Paytm) द्वारा डायरेक्ट पेमेंट कर सकते हैं, फिर स्क्रीनशॉट WhatsApp पर भेजकर कॉइन्स ले सकते हैं।
            </p>

            <div className="flex flex-col items-center justify-center p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3">
              <div className="p-3.5 rounded-2xl bg-white shadow-2xl border-2 border-pink-500/40">
                <QRCodeSVG
                  value={`upi://pay?pa=${OWNER_UPI_ID}&pn=Mulaqat%20Live&tn=Mulaqat_Recharge_${activeUserId}`}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-black text-white">Mulaqat Live ऑफिशियल स्कैनर</p>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                  <span className="font-mono text-pink-300 text-[11px]">{OWNER_UPI_ID}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedUpi ? 'कॉपी' : 'कॉपी करें'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Recharge Tap Button */}
            <a
              href={getWhatsAppRechargeUrl(selectedPlan)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer"
            >
              <PhoneCall size={14} />
              <span>ऑफलाइन रिचार्ज करवाने के लिए यहाँ टैप करें ➔</span>
            </a>
          </div>

          {/* Security Guarantee Footer */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center gap-2 text-[10.5px] text-zinc-400 text-center">
            <Lock size={12} className="text-emerald-400" />
            <span>100% सुरक्षित • केवल ऑफिशियल एडमिन द्वारा कॉइन्स ट्रांसफर</span>
          </div>

        </main>
      </div>
    </AnimatePresence>
  );
}
