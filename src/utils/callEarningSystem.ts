/**
 * MULAQAT – HOST WITHDRAWAL & EARNING SYSTEM (OFFICIAL SOURCE OF TRUTH)
 *
 * 🫘 Bean → ₹ Conversion:
 *    - 1,000 Beans = ₹9 (₹0.009 per Bean)
 *    - Conversion is fixed across the entire application.
 *
 * 💰 Minimum Withdrawal:
 *    - 50,000 Beans = ₹450 Minimum Withdrawal.
 *    - Host can only submit a withdrawal request after reaching 50,000 Beans.
 *
 * 🎙️ Call Earning:
 *    - User is charged 1,500 Coins/minute.
 *    - Host receives 1,000 Beans per completed minute.
 *    - 0–30 seconds: 0 Beans
 *    - 30–60 seconds: 500 Beans
 *    - 60 seconds complete: 1,000 Beans
 *    - Every completed minute thereafter: 1,000 Beans
 *    - Call rate remains 1,000 Beans per completed minute whether call lasts 10 mins or 1 hour.
 *
 * 🎁 Gift Earning:
 *    - User's gift 100% value in Coins is deducted.
 *    - Host receives 50% of the gift value in Beans.
 *    - Platform share: 50%.
 */

export const CALL_COIN_RATE_PER_MINUTE = 1500; // 1,500 Coins deducted from user per minute
export const HOST_BEANS_RATE_PER_MINUTE = 1000; // 1,000 Beans credited to host per completed minute

// Fixed ₹ conversion
export const BEANS_PER_RUPEE_UNIT = 1000;
export const INR_PER_1000_BEANS = 9; // 1,000 Beans = ₹9
export const BEAN_TO_INR_RATE = 9 / 1000; // 0.009

export const MIN_WITHDRAWAL_BEANS = 50000; // 50,000 Beans
export const MIN_WITHDRAWAL_INR = 450; // ₹450

/**
 * Checks if a user has applied and is an approved host with a host ID.
 * Regular users (whether male or female) who haven't applied or haven't been approved
 * are strictly regular users and do not get host beans or withdrawal options.
 */
export function checkIsApprovedHost(profile?: any): boolean {
  if (!profile) return false;
  // If role is host or isHostApproved is true
  if (profile.role === 'host' || profile.isHostApproved === true) return true;
  if (profile.hostId && typeof profile.hostId === 'string' && profile.hostId.trim().length > 0) return true;

  try {
    const localApp = localStorage.getItem('my_host_application');
    if (localApp) {
      const parsed = JSON.parse(localApp);
      if (parsed?.status === 'approved' && (parsed.userId === profile.uid || !parsed.userId)) {
        return true;
      }
    }
    const approvedHosts = localStorage.getItem('approved_host_ids');
    if (approvedHosts) {
      const parsed = JSON.parse(approvedHosts);
      if (Array.isArray(parsed) && parsed.includes(profile.uid)) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

export const WITHDRAWAL_TIERS = [
  { beans: 1000, inr: 9 },
  { beans: 5000, inr: 45 },
  { beans: 10000, inr: 90 },
  { beans: 20000, inr: 180 },
  { beans: 50000, inr: 450, isMinimum: true },
  { beans: 100000, inr: 900 },
  { beans: 200000, inr: 1800 },
  { beans: 500000, inr: 4500 },
  { beans: 1000000, inr: 9000 },
];

export function convertBeansToInr(beans: number): number {
  if (beans <= 0) return 0;
  return Math.floor((beans / 1000) * 9);
}

// Backward-compatible alias
export const beansToInr = convertBeansToInr;

export const MINUTE_RATES_TABLE = [
  { minute: 1, percent: 66.7, beans: 1000, description: "1st Minute: 1,000 Beans" },
  { minute: 2, percent: 66.7, beans: 1000, description: "2nd Minute: 1,000 Beans" },
  { minute: 3, percent: 66.7, beans: 1000, description: "3rd Minute: 1,000 Beans" },
  { minute: 4, percent: 66.7, beans: 1000, description: "Subsequent: 1,000 Beans/min" },
];

export function convertInrToBeans(inr: number): number {
  if (inr <= 0) return 0;
  return Math.floor((inr / 9) * 1000);
}

/**
 * Returns host beans earned for a specific minute index.
 * - minuteNumber 1: 1,000 Beans
 * - minuteNumber >= 2: 1,000 Beans
 */
export function getHostBeansForMinute(minuteNumber: number): number {
  if (minuteNumber <= 0) return 0;
  return HOST_BEANS_RATE_PER_MINUTE; // Flat 1,000 Beans per minute
}

export function getHostRatePercentForMinute(_minuteNumber: number): number {
  return 66.7; // 1,000 Beans / 1,500 Coins ≈ 66.7%
}

export interface CallEarningBreakdown {
  durationSeconds: number;
  completedMinutes: number;
  userCoinsDeducted: number;
  hostBeansEarned: number;
  currentMinuteNumber: number;
  currentMinutePercent: number;
  currentMinuteBeans: number;
  isFirstMinutePartial: boolean;
  minuteByMinute: Array<{
    minute: number;
    ratePercent: number;
    coinsDeducted: number;
    beansEarned: number;
  }>;
}

/**
 * Computes exact cumulative coins deducted from user and beans credited to host
 * according to Mulaqat rules:
 * - 0–30s: 0 Beans (User charged 1,500 Coins)
 * - 30–60s: 500 Beans
 * - 60s: 1,000 Beans
 * - Each completed minute thereafter: 1,000 Beans
 */
export function calculateCallEarnings(durationSeconds: number): CallEarningBreakdown {
  const safeDuration = Math.max(0, durationSeconds);
  const completedMinutes = Math.floor(safeDuration / 60);
  const isFirstMinutePartial = safeDuration > 0 && safeDuration < 60;

  // 1. User Coin Deduction: 1,500 Coins per minute started
  const userCoinsDeducted = safeDuration > 0
    ? Math.max(1, completedMinutes) * CALL_COIN_RATE_PER_MINUTE
    : 0;

  // 2. Host Bean Earnings:
  // 0–30s => 0 Beans
  // 30–60s => 500 Beans
  // 60s+ => 1,000 Beans * completedMinutes
  let hostBeansEarned = 0;
  if (safeDuration >= 60) {
    hostBeansEarned = completedMinutes * HOST_BEANS_RATE_PER_MINUTE;
  } else if (safeDuration >= 30) {
    hostBeansEarned = 500;
  } else {
    hostBeansEarned = 0;
  }

  const minuteByMinute: Array<{
    minute: number;
    ratePercent: number;
    coinsDeducted: number;
    beansEarned: number;
  }> = [];

  for (let m = 1; m <= completedMinutes; m++) {
    minuteByMinute.push({
      minute: m,
      ratePercent: 66.7,
      coinsDeducted: CALL_COIN_RATE_PER_MINUTE,
      beansEarned: HOST_BEANS_RATE_PER_MINUTE,
    });
  }

  const currentMinuteNumber = completedMinutes + 1;

  return {
    durationSeconds: safeDuration,
    completedMinutes,
    userCoinsDeducted,
    hostBeansEarned,
    currentMinuteNumber,
    currentMinutePercent: 66.7,
    currentMinuteBeans: HOST_BEANS_RATE_PER_MINUTE,
    isFirstMinutePartial,
    minuteByMinute,
  };
}
