import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, PhoneCall, Clock, Diamond, ArrowDownToLine, 
  Building2, CheckCircle2, AlertCircle, History, Sparkles, 
  Plus, Edit2, ShieldCheck, X, DollarSign, Wallet
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BankAccount {
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  addedAt: string;
}

interface WithdrawalRecord {
  id: string;
  beansAmount: number;
  inrAmount: number;
  status: 'under_review' | 'approved' | 'rejected';
  requestedAt: string;
  accountDetails: string;
}

interface CallLogItem {
  id: string;
  userName: string;
  userAvatar: string;
  duration: string;
  diamondsEarned: number;
  timestamp: string;
}

export default function HostCenterPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Host stats with local persistence
  const [callsPicked, setCallsPicked] = useState<number>(() => {
    const saved = localStorage.getItem('host_calls_picked');
    return saved ? parseInt(saved, 10) : 42;
  });

  const [callAvgDuration, setCallAvgDuration] = useState<string>(() => {
    return localStorage.getItem('host_call_avg_duration') || '5m 18s';
  });

  const [availableDiamonds, setAvailableDiamonds] = useState<number>(() => {
    const saved = localStorage.getItem('host_available_diamonds');
    return saved !== null ? parseInt(saved, 10) : 28500;
  });

  const [totalDiamondsEarned, setTotalDiamondsEarned] = useState<number>(() => {
    const saved = localStorage.getItem('host_total_diamonds_earned');
    return saved !== null ? parseInt(saved, 10) : 84200;
  });

  // Bank Account state (prompted only once, permanently saved)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(() => {
    try {
      const saved = localStorage.getItem('host_bank_account');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  // Modal for adding / editing bank account
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [holderName, setHolderName] = useState(bankAccount?.holderName || profile?.displayName || '');
  const [bankName, setBankName] = useState(bankAccount?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(bankAccount?.accountNumber || '');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(bankAccount?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(bankAccount?.ifscCode || '');
  const [upiId, setUpiId] = useState(bankAccount?.upiId || '');

  // Withdrawal inputs
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Withdrawal History
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRecord[]>(() => {
    try {
      const saved = localStorage.getItem('host_withdrawal_history');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      {
        id: 'WD_94821',
        beansAmount: 15000,
        inrAmount: 1500,
        status: 'approved',
        requestedAt: 'Yesterday, 04:30 PM',
        accountDetails: 'HDFC Bank •••• 4892'
      }
    ];
  });

  // Active view tab: 'overview' | 'history' | 'calls'
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'calls'>('overview');

  // Recent call logs
  const recentCalls: CallLogItem[] = [
    {
      id: 'call_1',
      userName: 'Rahul Verma',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      duration: '08m 45s',
      diamondsEarned: 13125,
      timestamp: '25 mins ago'
    },
    {
      id: 'call_2',
      userName: 'Aakash Singh',
      userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
      duration: '04m 20s',
      diamondsEarned: 6500,
      timestamp: '2 hours ago'
    },
    {
      id: 'call_3',
      userName: 'Vikram Malhotra',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      duration: '06m 12s',
      diamondsEarned: 9300,
      timestamp: 'Yesterday'
    }
  ];

  // Save bank account handler
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holderName.trim()) {
      toast.error('Please enter account holder name');
      return;
    }
    if (!upiId.trim() && (!bankName.trim() || !accountNumber.trim())) {
      toast.error('Please provide either bank account details or a UPI ID');
      return;
    }
    if (accountNumber && accountNumber !== confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return;
    }

    const newAccount: BankAccount = {
      holderName: holderName.trim(),
      bankName: bankName.trim() || 'UPI Direct',
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      upiId: upiId.trim(),
      addedAt: new Date().toISOString()
    };

    setBankAccount(newAccount);
    localStorage.setItem('host_bank_account', JSON.stringify(newAccount));
    setShowAccountModal(false);
    toast.success('Payout account linked successfully! You only need to add this once.');
  };

  // Quick fill "Withdraw All"
  const handleWithdrawAll = () => {
    setWithdrawAmountInput(availableDiamonds.toString());
  };

  // Submit withdrawal request
  const handleSubmitWithdrawal = () => {
    if (!bankAccount) {
      toast.error('Please add your bank account first before requesting a withdrawal.');
      setShowAccountModal(true);
      return;
    }

    const amount = parseInt(withdrawAmountInput, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount of diamonds/beans to withdraw.');
      return;
    }

    if (amount > availableDiamonds) {
      toast.error(`Insufficient diamond balance. Maximum available is ${availableDiamonds.toLocaleString()} 💎.`);
      return;
    }

    if (amount < 1000) {
      toast.error('Minimum withdrawal amount is 1,000 Diamonds/Beans (₹100).');
      return;
    }

    // Deduct diamonds immediately
    const updatedBalance = availableDiamonds - amount;
    setAvailableDiamonds(updatedBalance);
    localStorage.setItem('host_available_diamonds', updatedBalance.toString());

    // 10 Diamonds/Beans = ₹1 INR
    const inrAmount = Math.floor(amount / 10);

    const newRecord: WithdrawalRecord = {
      id: `WD_${Date.now().toString().slice(-6)}`,
      beansAmount: amount,
      inrAmount: inrAmount,
      status: 'under_review',
      requestedAt: 'Just now',
      accountDetails: bankAccount.bankName 
        ? `${bankAccount.bankName} •••• ${bankAccount.accountNumber ? bankAccount.accountNumber.slice(-4) : 'UPI'}`
        : `UPI: ${bankAccount.upiId}`
    };

    const updatedHistory = [newRecord, ...withdrawalHistory];
    setWithdrawalHistory(updatedHistory);
    localStorage.setItem('host_withdrawal_history', JSON.stringify(updatedHistory));

    setWithdrawAmountInput('');
    setShowWithdrawModal(false);
    toast.success(`🎉 Withdrawal request of ${amount.toLocaleString()} 💎 (₹${inrAmount.toLocaleString()}) submitted! Status moved to Under Review.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C0B32] via-[#0E051D] to-[#06020E] text-white font-sans pb-28 relative overflow-x-hidden">
      {/* Top Ambient Glows */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-pink-500/20 via-purple-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-10 -right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#160A29]/90 backdrop-blur-xl border-b border-pink-500/20 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-1.5 font-display tracking-wide">
              <span>HOST CENTER</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VERIFIED HOST
              </span>
            </h1>
            <p className="text-[10px] text-pink-200/80 font-medium">Earnings, Call Stats & Diamond Withdrawals</p>
          </div>
        </div>

        {/* Live Reception Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[10px] font-bold text-emerald-300">Receiving Calls</span>
        </div>
      </header>

      {/* 2. CORE STATS TILES (CALLS, CALL AVG, DIAMONDS, TOTAL EARNED) */}
      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        
        {/* Big Balance Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#2D0D4B] via-[#1A0C38] to-[#0B1530] border-2 border-pink-500/40 shadow-[0_15px_40px_rgba(236,72,153,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Diamond size={16} />
              </div>
              <span className="text-xs font-bold text-pink-200 uppercase tracking-wider">
                Available Withdrawable Diamonds
              </span>
            </div>
            <span className="text-[10px] font-bold text-pink-200 bg-black/40 px-2 py-0.5 rounded-full border border-pink-500/20">
              Rate: 10 💎 = ₹1
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between relative z-10">
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight flex items-center gap-1.5 drop-shadow-md">
                <span>{availableDiamonds.toLocaleString()}</span>
                <span className="text-lg text-pink-400">💎</span>
              </div>
              <p className="text-xs text-emerald-300 font-bold mt-0.5 flex items-center gap-1">
                <span>≈ ₹{Math.floor(availableDiamonds / 10).toLocaleString()} INR Estimated Cash</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_6px_20px_rgba(236,72,153,0.35)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownToLine size={14} className="stroke-[2.5]" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Grid (Calls Picked, Call Average, Total Lifetime Earned) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Calls Answered */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-teal-900/20 to-black/50 border border-emerald-500/30 shadow-md">
            <div className="flex items-center gap-1.5 text-emerald-300/80 mb-1">
              <PhoneCall size={13} className="text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Calls Picked</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {callsPicked} <span className="text-xs text-zinc-400 font-sans">Calls</span>
            </div>
            <span className="text-[9px] text-emerald-400 font-semibold">100% Answer Rate</span>
          </div>

          {/* 2. Call Average Duration */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-orange-900/20 to-black/50 border border-amber-500/30 shadow-md">
            <div className="flex items-center gap-1.5 text-amber-300/80 mb-1">
              <Clock size={13} className="text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Call Average</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {callAvgDuration}
            </div>
            <span className="text-[9px] text-amber-300 font-semibold">High Engagement</span>
          </div>

          {/* 3. Total Lifetime Diamonds */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-pink-900/20 to-black/50 border border-purple-500/30 shadow-md">
            <div className="flex items-center gap-1.5 text-purple-300/80 mb-1">
              <Sparkles size={13} className="text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Earned</span>
            </div>
            <div className="text-lg font-black text-white font-mono truncate">
              {totalDiamondsEarned.toLocaleString()}
            </div>
            <span className="text-[9px] text-purple-300 font-semibold">Lifetime 💎</span>
          </div>
        </div>

        {/* 3. LINKED BANK ACCOUNT CARD (ONLY ADD ONCE, SAVED PERMANENTLY) */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-[#120B24] border border-indigo-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-pink-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Payout Bank Account / UPI
              </h3>
            </div>
            {bankAccount && (
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="text-[10px] font-bold text-pink-300 hover:text-white flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20"
              >
                <Edit2 size={10} />
                <span>Edit Account</span>
              </button>
            )}
          </div>

          {bankAccount ? (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{bankAccount.bankName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-mono">
                  {bankAccount.accountNumber 
                    ? `A/C: •••• •••• ${bankAccount.accountNumber.slice(-4)}` 
                    : `UPI: ${bankAccount.upiId}`}
                </p>
                <p className="text-[10px] text-zinc-400">
                  Beneficiary: <strong className="text-zinc-200">{bankAccount.holderName}</strong>
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck size={18} />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-black/40 border border-dashed border-white/20 text-center space-y-2">
              <p className="text-xs text-zinc-300 font-medium">
                No payout account linked yet. Add your bank details once to receive diamond withdrawals.
              </p>
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-black flex items-center gap-1.5 mx-auto active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Add Bank Account / UPI (One-time Setup)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. TAB NAVIGATION: OVERVIEW / WITHDRAWAL HISTORY / CALL LOG */}
        <div className="flex bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-pink-950/60 p-1 rounded-2xl border border-pink-500/20">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-[#FF416C] via-[#FF4B2B] to-[#F7971E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Withdraw Diamonds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#FF416C] via-[#FF4B2B] to-[#F7971E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History size={12} />
            <span>Withdrawal History ({withdrawalHistory.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === 'calls'
                ? 'bg-gradient-to-r from-[#FF416C] via-[#FF4B2B] to-[#F7971E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Call Logs
          </button>
        </div>

        {/* TAB 1: WITHDRAW FORM */}
        {activeTab === 'overview' && (
          <div className="p-4 rounded-3xl bg-gradient-to-b from-[#180A2E]/90 to-[#100620]/90 border border-pink-500/20 shadow-lg space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                Enter Diamonds / Beans to Withdraw
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmountInput}
                  onChange={(e) => setWithdrawAmountInput(e.target.value)}
                  placeholder="Type diamond amount (e.g., 5000)"
                  className="w-full h-12 bg-black/50 border border-white/10 focus:border-pink-500 rounded-2xl px-4 text-base font-bold font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                />
                {/* "Withdraw All" Button */}
                <button
                  type="button"
                  onClick={handleWithdrawAll}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-black border border-pink-500/40 active:scale-95 transition-all cursor-pointer"
                >
                  Withdraw All (All)
                </button>
              </div>
            </div>

            {/* Quick conversion preview */}
            {withdrawAmountInput && parseInt(withdrawAmountInput, 10) > 0 && (
              <div className="p-3 rounded-2xl bg-black/40 border border-pink-500/30 flex items-center justify-between text-xs">
                <span className="text-zinc-300">Net Cashout Amount:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  ₹{Math.floor(parseInt(withdrawAmountInput, 10) / 10).toLocaleString()} INR
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmitWithdrawal}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 active:scale-98 transition-all cursor-pointer"
            >
              Submit Withdrawal Request 💸
            </button>

            <div className="text-[11px] text-zinc-400 space-y-1 pt-1 leading-relaxed">
              <p>• Payouts are reviewed and credited within 24 business hours.</p>
              <p>• Diamonds are immediately placed into review once submitted.</p>
            </div>
          </div>
        )}

        {/* TAB 2: WITHDRAWAL HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {withdrawalHistory.length === 0 ? (
              <div className="p-8 text-center bg-[#110B22]/90 rounded-3xl border border-white/10 text-zinc-400">
                <History size={32} className="mx-auto mb-2 opacity-40 text-pink-400" />
                <p className="text-xs font-bold">No withdrawal requests found</p>
                <p className="text-[10px] text-zinc-500 mt-1">Submitted withdrawals will appear here in real-time.</p>
              </div>
            ) : (
              withdrawalHistory.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#180A2E]/70 to-pink-950/40 border border-pink-500/25 shadow-md space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black text-white">{item.id}</span>
                      <span className="text-[9px] text-pink-200/70">• {item.requestedAt}</span>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      item.status === 'approved' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : item.status === 'under_review'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {item.status === 'approved' ? '✅ Credited' : item.status === 'under_review' ? '⏳ Under Review' : '❌ Rejected'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-base font-black text-white font-mono flex items-center gap-1">
                        <span>{item.beansAmount.toLocaleString()}</span>
                        <span className="text-xs text-pink-400">💎</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">₹{item.inrAmount.toLocaleString()} INR</p>
                    </div>

                    <p className="text-[11px] text-zinc-300 font-mono">
                      To: {item.accountDetails}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: CALL LOGS */}
        {activeTab === 'calls' && (
          <div className="space-y-3">
            {recentCalls.map(call => (
              <div
                key={call.id}
                className="p-3.5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-pink-950/40 border border-purple-500/25 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={call.userAvatar}
                    alt={call.userName}
                    className="w-10 h-10 rounded-2xl object-cover border border-pink-500/30"
                  />
                  <div>
                    <h4 className="text-xs font-black text-white">{call.userName}</h4>
                    <p className="text-[10px] text-pink-200/70 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      <span>Duration: {call.duration}</span>
                      <span>• {call.timestamp}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    +{call.diamondsEarned.toLocaleString()} 💎
                  </span>
                  <p className="text-[9px] text-zinc-400">Received</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* MODAL: ADD / EDIT BANK ACCOUNT (ONE-TIME SETUP) */}
      <AnimatePresence>
        {showAccountModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-[#120D24] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-pink-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {bankAccount ? 'Update Payout Account' : 'Add Payout Account (One-time)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    Account Holder Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Full name as per bank record"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    Bank Name (e.g., HDFC, SBI, ICICI)
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Enter bank name"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter account number"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs font-mono uppercase text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">OR Fast UPI ID</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    UPI ID (Google Pay / PhonePe / Paytm)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@oksbi / 9876543210@paytm"
                    className="w-full h-10 bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl px-3 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  Save & Link Account 🔒
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK WITHDRAW DIALOG MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#120D24] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine size={18} className="text-pink-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Diamond Cashout Request
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Available Balance:</span>
                  <span className="font-black text-white font-mono">{availableDiamonds.toLocaleString()} 💎</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                    Withdrawal Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmountInput}
                      onChange={(e) => setWithdrawAmountInput(e.target.value)}
                      placeholder="Type amount or click All"
                      className="w-full h-11 bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-3.5 text-sm font-bold font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleWithdrawAll}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-[11px] font-black border border-pink-500/30 hover:bg-pink-500/30 active:scale-95 transition-all"
                    >
                      All (All)
                    </button>
                  </div>
                </div>

                {withdrawAmountInput && parseInt(withdrawAmountInput, 10) > 0 && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <span className="text-emerald-300">You Receive (INR):</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ₹{Math.floor(parseInt(withdrawAmountInput, 10) / 10).toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmitWithdrawal}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 active:scale-98 transition-all cursor-pointer"
                >
                  Confirm Withdrawal (Move to Review) 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
