import React, { useState, useEffect } from 'react';
import { 
  Coins, Search, Send, User, CheckCircle2, 
  Sparkles, History, Clock, ArrowRight, ShieldCheck, 
  AlertCircle, RefreshCw, Smartphone, Copy, Check,
  AlertOctagon, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, setDoc, addDoc, collection, 
  query, orderBy, limit, onSnapshot, increment, where, getDocs
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { RECHARGE_PLANS } from '@/data/rechargePlans';

interface UserInfo {
  uid: string;
  numericId?: string;
  displayName: string;
  photoURL?: string;
  coins: number;
  totalRechargedCoins?: number;
  phone?: string;
}

interface RechargeLog {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  coinsAdded: number;
  amountInr: number;
  paymentSource: string;
  note?: string;
  adminName: string;
  createdAt: string;
}

export default function AdminCoinTransfer() {
  const { profile, user } = useAuth();

  // Target User State
  const [targetUserId, setTargetUserId] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<UserInfo | null>(null);

  // Transfer Form State
  const [transferMode, setTransferMode] = useState<'credit' | 'deduct'>('credit');
  const [selectedCoins, setSelectedCoins] = useState<number>(3100);
  const [customCoins, setCustomCoins] = useState<string>('');
  const [amountInr, setAmountInr] = useState<number>(100);
  const [paymentSource, setPaymentSource] = useState<string>('PhonePe (WhatsApp)');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<false | true>(false);

  // User Verification & Existence State
  const [userNotFound, setUserNotFound] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState('');

  // Success Celebration State
  const [lastCreditSuccess, setLastCreditSuccess] = useState<{
    userName: string;
    coins: number;
    newTotal: number;
    mode: 'credit' | 'deduct';
  } | null>(null);

  // Recent Recharge History
  const [rechargeLogs, setRechargeLogs] = useState<RechargeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Lookup user when targetUserId changes
  const handleLookupUser = async (uidToLookup: string) => {
    const cleanId = uidToLookup.trim();
    if (!cleanId) {
      setFoundUser(null);
      setUserNotFound(false);
      setNotFoundQuery('');
      return;
    }

    // Quick match with active user profile
    if (profile && (profile.uid === cleanId || profile.numericId === cleanId)) {
      setFoundUser({
        uid: profile.uid,
        numericId: profile.numericId,
        displayName: `${profile.displayName} (वर्तमान प्रोफाइल)`,
        photoURL: profile.photoURL || '',
        coins: Number(profile.coins || 0),
        totalRechargedCoins: 0,
        phone: ''
      });
      setUserNotFound(false);
      setNotFoundQuery('');
      return;
    }

    setSearchingUser(true);
    setUserNotFound(false);
    try {
      let resolvedUid = cleanId;
      let docData: any = null;

      try {
        const snap = await getDoc(doc(db, 'users', cleanId));
        if (snap.exists()) {
          docData = snap.data();
          resolvedUid = snap.id;
        }
      } catch (docErr) {
        console.warn('Direct doc lookup skipped:', docErr);
      }

      if (!docData) {
        // 1. Try querying by 9-digit numerical ID (as string)
        try {
          const qNum = query(collection(db, 'users'), where('numericId', '==', cleanId), limit(1));
          const snapNum = await getDocs(qNum);
          if (!snapNum.empty) {
            const firstDoc = snapNum.docs[0];
            docData = firstDoc.data();
            resolvedUid = firstDoc.id;
          }
        } catch (qErr) {
          console.warn('Query numericId string skipped:', qErr);
        }
      }

      if (!docData && /^\d+$/.test(cleanId)) {
        // 1b. Try querying by numericId as integer
        try {
          const qNumInt = query(collection(db, 'users'), where('numericId', '==', parseInt(cleanId, 10)), limit(1));
          const snapNumInt = await getDocs(qNumInt);
          if (!snapNumInt.empty) {
            const firstDoc = snapNumInt.docs[0];
            docData = firstDoc.data();
            resolvedUid = firstDoc.id;
          }
        } catch (qErr) {
          console.warn('Query numericId int skipped:', qErr);
        }
      }

      if (!docData) {
        // 2. Try querying by phone
        try {
          const qPhone = query(collection(db, 'users'), where('phone', '==', cleanId), limit(1));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            const firstDoc = snapPhone.docs[0];
            docData = firstDoc.data();
            resolvedUid = firstDoc.id;
          }
        } catch (qErr) {
          console.warn('Query phone skipped:', qErr);
        }
      }

      if (!docData) {
        // 3. Try querying by displayName
        try {
          const qName = query(collection(db, 'users'), where('displayName', '==', cleanId), limit(1));
          const snapName = await getDocs(qName);
          if (!snapName.empty) {
            const firstDoc = snapName.docs[0];
            docData = firstDoc.data();
            resolvedUid = firstDoc.id;
          }
        } catch (qErr) {
          console.warn('Query displayName skipped:', qErr);
        }
      }

      if (!docData) {
        // Check local storage cache if available for a registered user profile
        const localCached = localStorage.getItem(`profile_${cleanId}`);
        if (localCached) {
          try {
            const parsed = JSON.parse(localCached);
            if (parsed && (parsed.displayName || parsed.numericId)) {
              docData = parsed;
              resolvedUid = parsed.uid || cleanId;
            }
          } catch (e) {}
        }
      }

      if (docData) {
        setFoundUser({
          uid: resolvedUid,
          numericId: docData.numericId ? String(docData.numericId) : cleanId,
          displayName: docData.displayName || 'Mulaqat User',
          photoURL: docData.photoURL || '',
          coins: Number(docData.coins || 0),
          totalRechargedCoins: Number(docData.totalRechargedCoins || 0),
          phone: docData.phone || docData.phoneNumber || ''
        });
        setUserNotFound(false);
        setNotFoundQuery('');
      } else {
        // User does not exist in application!
        setFoundUser(null);
        setUserNotFound(true);
        setNotFoundQuery(cleanId);
      }
    } catch (err: any) {
      console.warn('User lookup notice:', err);
      setFoundUser(null);
      setUserNotFound(true);
      setNotFoundQuery(cleanId);
    } finally {
      setSearchingUser(false);
    }
  };

  // Real-time listener for recent recharge orders
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'recharge_orders'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const logs: RechargeLog[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          logs.push({
            id: docSnap.id,
            orderId: d.orderId || docSnap.id,
            userId: d.userId || '',
            userName: d.userName || 'User',
            coinsAdded: Number(d.coinsAdded || 0),
            amountInr: Number(d.amountInr || 0),
            paymentSource: d.paymentSource || 'WhatsApp',
            note: d.note || '',
            adminName: d.adminName || 'Admin',
            createdAt: d.createdAt || new Date().toISOString()
          });
        });
        setRechargeLogs(logs);
        setLoadingLogs(false);
      }, (err) => {
        console.warn('Recharge logs snapshot error:', err);
        setLoadingLogs(false);
      });

      return () => unsub();
    } catch (e) {
      setLoadingLogs(false);
    }
  }, []);

  // Quick Plan Selection Handler
  const handleSelectPlan = (coins: number, inr: number) => {
    setSelectedCoins(coins);
    setCustomCoins('');
    setAmountInr(inr);
  };

  // Custom Coins Input Handler
  const handleCustomCoinsChange = (val: string) => {
    setCustomCoins(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedCoins(num);
    }
  };

  // Submit Coins Credit or Deduction
  const handleSendCoins = async () => {
    const finalCoins = customCoins ? parseInt(customCoins, 10) : selectedCoins;

    if (!targetUserId.trim()) {
      toast.error('कृपया पहले यूजर आईडी (User ID) दर्ज करें!');
      return;
    }

    if (!foundUser || (targetUserId.trim() !== foundUser.numericId && targetUserId.trim() !== foundUser.uid)) {
      toast.error(`❌ यह यूज़र ID ("${targetUserId.trim()}") ऐप में मौजूद नहीं है या अभी तक सर्च नहीं की गई है! केवल ऐप में बनी हुई आईडी पर ही कॉइन भेजे जा सकते हैं।`);
      return;
    }

    if (!finalCoins || finalCoins <= 0) {
      toast.error('कृपया वैध कॉइन संख्या दर्ज करें!');
      return;
    }

    const cleanUid = foundUser.uid;
    const adminDisplayName = profile?.displayName || user?.email || 'Super Admin';
    const isCredit = transferMode === 'credit';

    setSubmitting(true);
    try {
      // 1. Update User in Firestore
      let userSnap: any = null;
      let existingCoins = 0;
      try {
        const userRef = doc(db, 'users', cleanUid);
        userSnap = await getDoc(userRef);
        existingCoins = userSnap.exists() ? (userSnap.data().coins || 0) : 0;
      } catch (e) {
        console.warn('Doc get existing coins notice:', e);
        existingCoins = foundUser?.coins || 0;
      }

      const newBalance = isCredit ? (existingCoins + finalCoins) : Math.max(0, existingCoins - finalCoins);

      try {
        const userRef = doc(db, 'users', cleanUid);
        await setDoc(userRef, {
          coins: newBalance,
          totalRechargedCoins: increment(isCredit ? finalCoins : -finalCoins),
          lastRechargeAt: new Date().toISOString(),
          lastRechargeCoins: isCredit ? finalCoins : -finalCoins,
          lastRechargeAmount: isCredit ? amountInr : 0,
          lastRechargeBy: adminDisplayName
        }, { merge: true });
      } catch (writeErr: any) {
        console.warn('Firestore setDoc user notice:', writeErr);
      }

      // 2. Add log entry in recharge_orders collection
      const orderId = `OFFLINE_${Date.now()}`;
      try {
        await addDoc(collection(db, 'recharge_orders'), {
          orderId,
          userId: cleanUid,
          userNumericId: foundUser?.numericId || '',
          userName: foundUser?.displayName || 'User',
          coinsAdded: isCredit ? finalCoins : -finalCoins,
          amountInr: isCredit ? amountInr : 0,
          paymentSource: paymentSource,
          note: note.trim() || `${isCredit ? 'Credit' : 'Deduct'} via WhatsApp Offline Desk - Approved by ${adminDisplayName}`,
          adminEmail: user?.email || 'admin@mulaqat.app',
          adminName: adminDisplayName,
          createdAt: new Date().toISOString(),
          status: 'completed',
          type: transferMode
        });
      } catch (logErr: any) {
        console.warn('Firestore addDoc recharge_orders notice:', logErr);
      }

      // 3. Sync locally if target is the active profile
      if (profile && (profile.uid === cleanUid || profile.numericId === cleanUid)) {
        try {
          const cached = localStorage.getItem(`profile_${profile.uid}`);
          if (cached) {
            const p = JSON.parse(cached);
            p.coins = newBalance;
            localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(p));
          }
          const act = localStorage.getItem('maxo_active_profile');
          if (act) {
            const p = JSON.parse(act);
            p.coins = newBalance;
            localStorage.setItem('maxo_active_profile', JSON.stringify(p));
          }
          window.dispatchEvent(new Event('auth_profile_updated'));
        } catch (syncErr) {}
      }

      // 4. Call server endpoint as dual record
      try {
        await fetch('/api/admin/credit-coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: cleanUid,
            coins: isCredit ? finalCoins : -finalCoins,
            amountInr: isCredit ? amountInr : 0,
            paymentSource,
            note: note.trim(),
            adminName: adminDisplayName
          })
        });
      } catch (e) {
        // silent
      }

      // 4. Play audio celebration
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.volume = 0.5;
        audio.play();
      } catch (e) {}

      // 5. Update UI
      setLastCreditSuccess({
        userName: foundUser?.displayName || cleanUid,
        coins: finalCoins,
        newTotal: newBalance,
        mode: transferMode
      });

      if (foundUser) {
        setFoundUser({
          ...foundUser,
          coins: newBalance,
          totalRechargedCoins: (foundUser.totalRechargedCoins || 0) + (isCredit ? finalCoins : -finalCoins)
        });
      }

      toast.success(
        isCredit
          ? `🎉 सफलतापूर्वक ${finalCoins.toLocaleString()} कॉइन्स यूजर के खाते में भेज दिए गए!`
          : `⚠️ सफलतापूर्वक ${finalCoins.toLocaleString()} कॉइन्स यूजर के खाते से काट लिए गए!`
      );
      setNote('');
    } catch (err: any) {
      console.error('Failed to credit coins:', err);
      toast.error('कॉइन्स भेजने में समस्या आई: ' + (err.message || 'त्रुटि'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-[#120B22] border-2 border-amber-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black text-2xl shadow-lg shrink-0">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  यूजर कॉइन ट्रांसफर डैशबोर्ड
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                  ADMIN LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                यूजर की आईडी डालें, कॉइन्स चुनें और 1-क्लिक में यूजर के खाते में सीधा कॉइन्स भेजें
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Success Banner */}
      {lastCreditSuccess && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-green-900/30 border-2 border-emerald-500/60 shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-300 uppercase tracking-wide">
                कॉइन्स सफलतापूर्वक क्रेडिट हो गए! 🚀
              </p>
              <p className="text-xs text-white mt-0.5">
                यूजर: <strong>{lastCreditSuccess.userName}</strong> को{' '}
                <strong className="text-amber-300">+{lastCreditSuccess.coins.toLocaleString()} कॉइन्स</strong> भेजे गए।
                (नया बैलेंस: {lastCreditSuccess.newTotal.toLocaleString()} 🪙)
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastCreditSuccess(null)}
            className="text-xs text-emerald-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      )}

      {/* 3. Main Transfer Form Card */}
      <Card className="bg-[#130E26] border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <CardContent className="p-4 sm:p-6 space-y-5">
          
          {/* Operation Mode Selector: Credit (+) vs Deduct (-) */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider pl-1">
              कार्यवाही प्रकार:
            </span>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTransferMode('credit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  transferMode === 'credit'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ➕ कॉइन जमा करें (Credit)
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('deduct')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  transferMode === 'deduct'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ➖ कॉइन काटें (Deduct)
              </button>
            </div>
          </div>

          {/* Step 1: User Identification */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>1. यूजर आईडी (User ID) डालें या पेस्ट करें</span>
              {searchingUser && <span className="text-[10px] text-amber-400">सर्च हो रहा है...</span>}
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={targetUserId}
                  onChange={(e) => {
                    setTargetUserId(e.target.value);
                    handleLookupUser(e.target.value);
                  }}
                  placeholder="उदा. 9-अंकीय ID किंवा User UID..."
                  className="h-12 bg-white/5 border-white/10 rounded-2xl text-white font-mono text-sm px-4 focus:border-amber-400"
                />
              </div>

              <Button
                type="button"
                onClick={() => handleLookupUser(targetUserId)}
                className="h-12 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md"
              >
                <Search size={16} />
                <span>चेक करें</span>
              </Button>
            </div>

            {/* Found User Card */}
            {foundUser && (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-emerald-500/40 flex items-center justify-between mt-2 shadow-lg animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold overflow-hidden shrink-0">
                    {foundUser.photoURL ? (
                      <img src={foundUser.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{foundUser.displayName}</span>
                        <CheckCircle2 size={15} className="text-emerald-400 fill-emerald-400/20" />
                      </h4>
                      {foundUser.numericId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/30">
                          ID: {foundUser.numericId}
                        </span>
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase font-bold">
                        रजिस्टर्ड
                      </span>
                    </div>
                    <p className="text-[10.5px] font-mono text-zinc-400">UID: {foundUser.uid}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">वर्तमान बैलेंस</span>
                  <span className="text-sm font-black text-amber-300 flex items-center gap-1 justify-end">
                    🪙 {foundUser.coins.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* No User Found Alert */}
            {userNotFound && notFoundQuery && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/50 flex items-start gap-3 mt-2 shadow-lg animate-in fade-in">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertOctagon size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-rose-300">कोई यूज़र नहीं मिला (No User Found)</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                      अमान्य ID
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    दर्ज की गई आईडी <code className="font-mono text-amber-300 font-bold bg-black/50 px-2 py-0.5 rounded border border-white/10">"{notFoundQuery}"</code> ऐप में मौजूद नहीं है।
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    ⚠️ जब तक यह आईडी ऐप में क्रिएट या रजिस्टर नहीं होगी, तब तक इस पर कॉइन्स ट्रांसफर नहीं किए जा सकते। कृपया यूजर से सही 9-अंकीय ID लें।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Coin Selection (Quick Presets) */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>2. कॉइन्स पैक चुनें (ऑफिशियल प्लान्स)</span>
              <span className="text-[11px] text-amber-400 font-bold">चयनित: +{selectedCoins.toLocaleString()} Coins</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RECHARGE_PLANS.map((plan) => {
                const isSelected = selectedCoins === plan.coins && !customCoins;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan.coins, plan.price)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{plan.priceDisplay}</span>
                      <span className="text-xs">🪙</span>
                    </div>
                    <p className="text-xs font-black text-amber-300 mt-1">
                      +{plan.coins.toLocaleString()}
                    </p>
                    <span className="text-[9.5px] text-zinc-400 block mt-0.5">
                      {plan.tagline || 'कॉइन्स'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Coins Input */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                या कस्टम कॉइन संख्या टाइप करें:
              </span>
              <Input
                type="number"
                value={customCoins}
                onChange={(e) => handleCustomCoinsChange(e.target.value)}
                placeholder="उदा. 5000, 25000, 50000 कॉइन्स..."
                className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-bold text-sm px-4"
              />
            </div>
          </div>

          {/* Step 3: Payment Source & Reference Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">
                पेमेंट का माध्यम
              </label>
              <select
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value)}
                className="w-full h-11 bg-[#1c1436] border border-white/10 rounded-xl text-white text-xs px-3 focus:outline-none focus:border-amber-400"
              >
                <option value="PhonePe (WhatsApp)">PhonePe (WhatsApp)</option>
                <option value="Google Pay (WhatsApp)">Google Pay (WhatsApp)</option>
                <option value="Airtel Payment Bank">Airtel Payment Bank</option>
                <option value="Paytm UPI">Paytm UPI</option>
                <option value="Direct QR Scan">Direct QR Scan</option>
                <option value="Cash / Manual">कैश / ऑफलाइन</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">
                प्राप्त अमाउंट (₹)
              </label>
              <Input
                type="number"
                value={amountInr}
                onChange={(e) => setAmountInr(Number(e.target.value))}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-white font-bold text-xs px-3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase">
              नोट / संदर्भ (वैकल्पिक)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="उदा. WhatsApp पर राहुल से ₹100 प्राप्त हुए..."
              className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs px-3"
            />
          </div>

          {/* Big Action Send/Deduct Button */}
          <Button
            type="button"
            onClick={handleSendCoins}
            disabled={submitting || !foundUser || userNotFound || !targetUserId.trim()}
            className={`w-full h-14 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all cursor-pointer ${
              !foundUser || userNotFound
                ? 'bg-white/10 text-zinc-500 cursor-not-allowed border border-white/10 opacity-70 shadow-none'
                : transferMode === 'credit'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-600 text-black shadow-amber-500/25'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-700 text-white shadow-rose-600/25'
            }`}
          >
            {submitting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : !foundUser || userNotFound ? (
              <AlertOctagon size={18} className="text-zinc-500" />
            ) : (
              <Send size={18} className={transferMode === 'credit' ? 'fill-black' : 'fill-white'} />
            )}
            <span>
              {submitting
                ? 'प्रक्रिया जारी है...'
                : !foundUser || userNotFound
                  ? '⚠️ पहले सही और रजिस्टर्ड यूजर ID चेक करें'
                  : transferMode === 'credit'
                    ? `🚀 ${foundUser.displayName} को +${(customCoins ? parseInt(customCoins, 10) || 0 : selectedCoins).toLocaleString()} कॉइन्स भेजें`
                    : `⚠️ ${foundUser.displayName} से -${(customCoins ? parseInt(customCoins, 10) || 0 : selectedCoins).toLocaleString()} कॉइन्स काटें`}
            </span>
          </Button>

        </CardContent>
      </Card>

      {/* 4. Recent Recharge Log Table */}
      <Card className="bg-[#130E26] border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              हाल ही में किए गए रीचार्ज (लाइव लॉग)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">
            कुल: {rechargeLogs.length} रीचार्ज
          </span>
        </div>

        <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto custom-scrollbar">
          {loadingLogs ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              लॉग लोड हो रहे हैं...
            </div>
          ) : rechargeLogs.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <p className="text-xs font-bold text-zinc-400">अभी तक कोई ऑफलाइन रीचार्ज रिकॉर्ड नहीं है</p>
              <p className="text-[11px] text-zinc-600">ऊपर यूजर आईडी डालकर पहला रीचार्ज करें</p>
            </div>
          ) : (
            rechargeLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{log.userName}</span>
                    <span className="text-[9.5px] font-mono text-zinc-400">UID: {log.userId.slice(0, 10)}...</span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400">
                    {log.paymentSource} {log.amountInr ? `(₹${log.amountInr})` : ''} • {log.note || 'रीचार्ज पूरा हुआ'}
                  </p>
                  <span className="text-[9.5px] text-zinc-500">
                    {new Date(log.createdAt).toLocaleString('hi-IN')} • एडमिन: {log.adminName}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1 justify-end">
                    <span>+</span>
                    <span>{log.coinsAdded.toLocaleString()}</span>
                    <span>🪙</span>
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    सफल
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
