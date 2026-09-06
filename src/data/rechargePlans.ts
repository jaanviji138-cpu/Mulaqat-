export interface RechargePlan {
  id: string;
  price: number;
  priceInr?: number;
  priceDisplay: string;
  coins: number;
  badge?: string;
  popular?: boolean;
  bonusText?: string;
  tagline?: string;
}

export const RECHARGE_PLANS: RechargePlan[] = [
  {
    id: 'plan_100',
    price: 100,
    priceInr: 100,
    priceDisplay: '₹100',
    coins: 3100,
    badge: 'Popular',
    bonusText: '31 Coins/₹',
    tagline: 'Starter Recharge',
  },
  {
    id: 'plan_300',
    price: 300,
    priceInr: 300,
    priceDisplay: '₹300',
    coins: 9350,
    badge: 'Saver',
    bonusText: '+50 Extra Coins',
    tagline: 'Host Caller Pack',
  },
  {
    id: 'plan_500',
    price: 500,
    priceInr: 500,
    priceDisplay: '₹500',
    coins: 15655,
    badge: '🔥 Hot Deal',
    bonusText: '+155 Extra Coins',
    tagline: 'Video Calling Special',
  },
  {
    id: 'plan_1000',
    price: 1000,
    priceInr: 1000,
    priceDisplay: '₹1,000',
    coins: 31620,
    badge: '⭐ Best Value',
    popular: true,
    bonusText: '+620 Extra Coins',
    tagline: 'Most Popular Pack',
  },
  {
    id: 'plan_2000',
    price: 2000,
    priceInr: 2000,
    priceDisplay: '₹2,000',
    coins: 63860,
    badge: '💎 VIP Pack',
    bonusText: '+1,860 Extra Coins',
    tagline: 'Elite Host Supporter',
  },
  {
    id: 'plan_5000',
    price: 5000,
    priceInr: 5000,
    priceDisplay: '₹5,000',
    coins: 160425,
    badge: '👑 Royal Club',
    bonusText: '+5,425 Extra Coins',
    tagline: 'Luxury Gifter Tier',
  },
  {
    id: 'plan_10000',
    price: 10000,
    priceInr: 10000,
    priceDisplay: '₹10,000',
    coins: 322400,
    badge: '⚡ Supreme King',
    bonusText: '+12,400 Extra Coins',
    tagline: 'Maximum Coin Bonus',
  },
];
