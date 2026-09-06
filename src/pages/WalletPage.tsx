import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, CreditCard, Landmark, ArrowDownCircle, ArrowUpCircle, X, ShieldCheck, Sparkles, Zap, CheckCircle2, Smartphone, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RECHARGE_PLANS } from '@/data/rechargePlans';
import RechargeModal from '@/components/RechargeModal';
import { BEAN_TO_INR_RATE, MIN_WITHDRAWAL_BEANS, WITHDRAWAL_TIERS, beansToInr, checkIsApprovedHost } from '@/utils/callEarningSystem';

export default function WalletPage() {
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const { language } = useLanguage();

  const isUserAdmin = Boolean(
    isAdmin ||
    (profile as any)?.isSystemAdmin === true ||
    (profile as any)?.role === 'admin' ||
    user?.email === 'dkm924419@gmail.com' ||
    user?.email === 'noircouplehub@gmail.com' ||
    localStorage.getItem('simulate_admin') === 'true'
  );

  // Only users who have applied and received approved host ID can see Beans & Withdrawal
  const isApprovedHost = checkIsApprovedHost(profile);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawBeans, setWithdrawBeans] = useState(50000);
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'success'>('form');

  // Recharge Modal State
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string>('plan_100');
  const [selectedMethodForModal, setSelectedMethodForModal] = useState<'phonepe' | 'gpay' | 'airtel' | 'universal'>('phonepe');

  const plans = RECHARGE_PLANS;

  const handleOpenPlanRecharge = (planId: string, method: 'phonepe' | 'gpay' | 'airtel' | 'universal' = 'phonepe') => {
    setSelectedPlanForModal(planId);
    setSelectedMethodForModal(method);
    setIsRechargeModalOpen(true);
  };

  const handleWithdrawalSubmit = async () => {
    if (!profile?.uid) return;
    const availableBeans = profile.beans || 0;

    if (withdrawBeans < MIN_WITHDRAWAL_BEANS) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_BEANS.toLocaleString()} Beans (₹${beansToInr(MIN_WITHDRAWAL_BEANS)})!`);
      return;
    }
    if (availableBeans < withdrawBeans) {
      toast.error(`Insufficient beans balance! You only have ${availableBeans.toLocaleString()} Beans.`);
      return;
    }
    if (payoutMethod === 'upi' && !upiId.trim()) {
      toast.error('Please enter your UPI ID (e.g. 9876543210@ybl)');
      return;
    }
    if (payoutMethod === 'bank' && (!bankDetails.accountNumber.trim() || !bankDetails.ifscCode.trim())) {
      toast.error('Please enter your Bank Account Number & IFSC Code');
      return;
    }

    setWithdrawing(true);
    const newBeans = availableBeans - withdrawBeans;
    const inrPayout = beansToInr(withdrawBeans);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, {
        beans: newBeans,
        uid: profile.uid,
        lastWithdrawalAt: new Date().toISOString(),
        lastWithdrawalBeans: withdrawBeans,
        lastWithdrawalInr: inrPayout,
      }, { merge: true });

      const cached = localStorage.getItem(`profile_${profile.uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.beans = newBeans;
          localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(parsed));
        } catch (e) {}
      }

      setWithdrawStep('success');
      toast.success(`Withdrawal request submitted! ₹${inrPayout} will be credited to your account.`);
    } catch (err) {
      console.error("Wallet withdraw error:", err);
      toast.error('Error submitting withdrawal request. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="py-6 space-y-8 pb-32 bg-bg-dark min-h-screen text-white select-none">
      {/* Coin & Beans Balance Header */}
      <div className="flex flex-col items-center py-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-bold">Coin Balance</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">{(profile?.coins || 0).toLocaleString()}</span>
          <img src="https://cdn-icons-png.flaticon.com/512/11502/11502424.png" className="w-6 h-6" alt="coin" />
        </div>
        
        {/* Only show Beans if applied and approved as host */}
        {isApprovedHost && (
          <p className="text-xs text-purple-300 font-extrabold uppercase tracking-wider mt-2 flex items-center gap-1.5 bg-purple-950/40 px-3 py-1 rounded-full border border-purple-500/30">
            <span>🫘 Beans Balance: {(profile?.beans || 0).toLocaleString()}</span>
            <span className="text-emerald-400">(₹{beansToInr(profile?.beans || 0)})</span>
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`grid ${isApprovedHost ? 'grid-cols-2' : 'grid-cols-1'} gap-4 px-6`}>
        <Button 
          variant="outline" 
          onClick={() => handleOpenPlanRecharge('plan_100')}
          className="h-20 flex flex-col gap-1 border-pink-500/30 bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-transparent text-white hover:bg-pink-500/25 rounded-2xl cursor-pointer"
        >
          <ArrowDownCircle size={22} className="text-pink-400" />
          <span className="text-xs font-black uppercase tracking-tight">Recharge Coins</span>
          <span className="text-[10px] text-emerald-300 font-bold">ऑफलाइन WhatsApp रीचार्ज</span>
        </Button>

        {isApprovedHost && (
          <Button 
            variant="outline" 
            onClick={() => setIsWithdrawOpen(true)}
            className="h-20 flex flex-col gap-1 border-purple-500/30 bg-gradient-to-tr from-purple-500/20 to-transparent text-white hover:bg-purple-500/25 rounded-2xl cursor-pointer"
          >
            <ArrowUpCircle size={22} className="text-purple-400" />
            <span className="text-xs font-black uppercase tracking-tight">Withdraw Beans</span>
            <span className="text-[10px] text-purple-300">50,000 Beans = ₹450</span>
          </Button>
        )}
      </div>

      {/* Admin Coin Transfer Command Card (Only visible to Owner / Admins) */}
      {isUserAdmin && (
        <div className="px-6 mt-3">
          <div 
            onClick={() => navigate('/admin')}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-600/20 to-transparent border-2 border-amber-400/50 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">👑</span>
              <div>
                <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  एडमिन कॉइन ट्रांसफर डैशबोर्ड
                </p>
                <p className="text-[10.5px] text-zinc-300">
                  यूजर की आईडी डालें और सीधे कॉइन्स भेजें ➔
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-amber-400 text-black px-3 py-1.5 rounded-full shrink-0 uppercase shadow-md">
              OWNER
            </span>
          </div>
        </div>
      )}

      {/* If not an approved host yet, show Apply Hosting prompt strictly for female or admin-granted DB users */}
      {!isApprovedHost && (profile?.gender === 'female' || Boolean((profile as any)?.canApplyHost)) && (
        <div className="px-6 mt-3">
          <div 
            onClick={() => navigate('/apply-hosting')}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent border border-pink-500/25 flex items-center justify-between cursor-pointer hover:border-pink-500/40 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎙️</span>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wide">
                  APPLY FOR HOSTING
                </p>
                <p className="text-[10px] text-pink-300">
                  Beans wallet and withdrawal options unlock upon hosting verification
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black bg-pink-500 text-white px-2.5 py-1 rounded-full shrink-0 uppercase">
              Apply
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4 px-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-tight text-white">
              <ShoppingBag size={18} className="text-pink-400" />
              Top Up Coins
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Official rates for video calls & gifts
            </p>
          </div>
          <span className="text-[10px] font-black uppercase text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
            UPI Active
          </span>
        </div>

        {/* PhonePe, GPay & Airtel UPI Gateways */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* PhonePe Direct Gateway */}
          <div 
            onClick={() => handleOpenPlanRecharge('plan_100', 'phonepe')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-[#5f259f]/25 to-purple-950/40 border border-[#8039d4]/35 hover:border-[#8039d4] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex flex-col justify-between min-h-[102px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-xl bg-[#5f259f] flex items-center justify-center text-white font-black text-xs shadow-md">
                P
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-[#5f259f]/30 text-purple-300 text-[8px] font-black border border-purple-500/20">
                1-Tap
              </span>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-black text-white">PhonePe</p>
              <p className="text-[8.5px] sm:text-[9px] text-purple-300/80 font-mono truncate">8053511029@ybl</p>
            </div>
            <div className="text-[9.5px] font-bold text-pink-400 flex items-center gap-0.5">
              <span>Pay</span> ➔
            </div>
          </div>

          {/* Google Pay Gateway */}
          <div 
            onClick={() => handleOpenPlanRecharge('plan_100', 'gpay')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-emerald-950/25 to-teal-950/40 border border-emerald-500/35 hover:border-emerald-500 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex flex-col justify-between min-h-[102px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                G
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 text-[8px] font-black border border-emerald-500/20">
                Instant
              </span>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-black text-white">Google Pay</p>
              <p className="text-[8.5px] sm:text-[9px] text-emerald-300/80 font-mono truncate">sk9422971-2@okhdfcbank</p>
            </div>
            <div className="text-[9.5px] font-bold text-emerald-400 flex items-center gap-0.5">
              <span>Pay</span> ➔
            </div>
          </div>

          {/* Airtel Gateway */}
          <div 
            onClick={() => handleOpenPlanRecharge('plan_100', 'airtel')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-red-950/25 to-rose-950/40 border border-red-500/35 hover:border-red-500 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex flex-col justify-between min-h-[102px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-[9px] shadow-md">
                airtel
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-300 text-[8px] font-black border border-red-500/20">
                Bank
              </span>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-black text-white">Airtel Bank</p>
              <p className="text-[8.5px] sm:text-[9px] text-red-300/80 font-mono truncate">8053511029@airtel</p>
            </div>
            <div className="text-[9.5px] font-bold text-pink-400 flex items-center gap-0.5">
              <span>Pay</span> ➔
            </div>
          </div>
        </div>

        {/* UPI Supported Apps Strip */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-pink-400" />
            <span className="text-[11px] text-zinc-300 font-bold">
              All UPI Apps Supported
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-black">
            <span className="px-2 py-0.5 rounded bg-[#5f259f] text-white">PhonePe</span>
            <span className="px-2 py-0.5 rounded bg-red-600 text-white">Airtel</span>
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">GPay</span>
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white">Paytm</span>
          </div>
        </div>

        {/* 7 Official Recharge Plans Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              onClick={() => handleOpenPlanRecharge(plan.id)}
              className={`bg-white/[0.04] border overflow-hidden transition-all duration-200 cursor-pointer rounded-3xl relative hover:scale-[1.02] active:scale-[0.98] ${
                plan.popular 
                  ? 'border-pink-500/50 shadow-lg shadow-pink-500/10 bg-gradient-to-b from-pink-500/10 to-transparent' 
                  : 'border-white/10 hover:border-pink-400/40'
              }`}
            >
              <CardContent className="p-4 sm:p-5 text-center space-y-2.5 relative">
                {plan.badge && (
                  <div className={`absolute top-0 right-0 text-[8.5px] font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-tight text-white ${
                    plan.popular ? 'bg-gradient-to-r from-pink-500 to-amber-400' : 'bg-pink-600/80'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-black text-xl sm:text-2xl text-white tracking-tight">
                      {plan.coins.toLocaleString()}
                    </span>
                    <img src="https://cdn-icons-png.flaticon.com/512/11502/11502424.png" className="w-5 h-5" alt="coin" />
                  </div>
                  {plan.bonusText && (
                    <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                      {plan.bonusText}
                    </p>
                  )}
                  {plan.tagline && (
                    <p className="text-[9px] text-zinc-400 font-medium truncate">
                      {plan.tagline}
                    </p>
                  )}
                </div>

                <div className={`h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-md ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-pink-500 to-amber-400 text-white hover:opacity-90' 
                    : 'bg-white text-zinc-900 hover:bg-zinc-100'
                }`}>
                  {plan.priceDisplay}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* WITHDRAWAL ENGINE MODAL (Only for Approved Hosts with Host ID) */}
      {isApprovedHost && (
        <AnimatePresence>
          {isWithdrawOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.93, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.93, y: 20 }}
                className="bg-[#0f0a1d] border border-purple-500/25 rounded-[32px] w-full max-w-md p-6 overflow-hidden relative shadow-2xl relative font-sans text-white"
              >
                <button 
                  onClick={() => setIsWithdrawOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>

                {/* Title Header */}
                <div className="text-center space-y-1 mb-5 mt-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-extrabold text-purple-300 uppercase tracking-widest leading-none">
                    🫘 Host Earnings Withdrawal
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Beans Cashout</h3>
                  <p className="text-[11px] text-zinc-400">1,000 Beans = ₹9 • Minimum Withdrawal: 50,000 Beans (₹450)</p>
                </div>

                {withdrawStep === 'form' ? (
                  <div className="space-y-4">
                    {/* Beans Balance Box */}
                    <div className="bg-white/[0.04] border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-400">Your Balance</p>
                        <p className="text-xl font-black text-white mt-0.5">🫘 {(profile?.beans || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-emerald-400">INR Value</p>
                        <p className="text-xl font-black text-emerald-400 mt-0.5">₹{beansToInr(profile?.beans || 0)}</p>
                      </div>
                    </div>

                    {/* Predefined Tiers */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Select Amount
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {WITHDRAWAL_TIERS.slice(0, 6).map((tier) => {
                          const isSelected = withdrawBeans === tier.beans;
                          const canAfford = (profile?.beans || 0) >= tier.beans;
                          return (
                            <button
                              key={tier.beans}
                              type="button"
                              disabled={!canAfford}
                              onClick={() => setWithdrawBeans(tier.beans)}
                              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-900/40 border-purple-500 text-white ring-1 ring-purple-500'
                                  : canAfford
                                  ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                                  : 'bg-white/[0.02] border-white/5 text-zinc-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-xs font-black">₹{tier.inr}</p>
                              <p className="text-[9px] text-zinc-400">{(tier.beans / 1000).toLocaleString()}k Beans</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payout Method */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('upi')}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer font-bold text-xs ${
                            payoutMethod === 'upi'
                              ? 'bg-purple-900/40 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                              : 'bg-white/5 border-white/10 text-zinc-400'
                          }`}
                        >
                          <Smartphone size={14} />
                          <span>UPI (PhonePe/GPay)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('bank')}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer font-bold text-xs ${
                            payoutMethod === 'bank'
                              ? 'bg-purple-900/40 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                              : 'bg-white/5 border-white/10 text-zinc-400'
                          }`}
                        >
                          <Landmark size={14} />
                          <span>Bank Account</span>
                        </button>
                      </div>
                    </div>

                    {/* Payout Input Fields */}
                    {payoutMethod === 'upi' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">
                          Enter UPI ID
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. 9876543210@ybl or user@oksbi"
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={bankDetails.accountHolder}
                          onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                          placeholder="Account Holder Name"
                          className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                          placeholder="Account Number"
                          className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="text"
                          value={bankDetails.ifscCode}
                          onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                          placeholder="IFSC Code (e.g. SBIN0001234)"
                          className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono uppercase text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      onClick={handleWithdrawalSubmit}
                      disabled={withdrawing || (profile?.beans || 0) < MIN_WITHDRAWAL_BEANS}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg active:scale-98 transition-all"
                    >
                      {withdrawing ? 'Processing...' : `Withdraw ₹${beansToInr(withdrawBeans)} (${withdrawBeans.toLocaleString()} Beans)`}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5 py-4 text-center">
                    <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 size={36} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-black text-white">Withdrawal Request Received!</h4>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        ₹{beansToInr(withdrawBeans)} will be transferred to your account within 24 hours.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setIsWithdrawOpen(false);
                        setWithdrawStep('form');
                      }}
                      className="w-full h-10 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* RECHARGE & UPI PAYMENT MODAL */}
      <RechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        defaultPlanId={selectedPlanForModal}
        defaultMethod={selectedMethodForModal}
      />
    </div>
  );
}
