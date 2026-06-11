export type Plan = {
  id: number
  name: string
  tier: string
  device: string
  deviceImage: string
  price: number
  dailyReturnPercent: number
  durationDays: number
  // Computed helpers (not stored in DB — use getDailyEarning / getTotalEarning)
  popular?: boolean
  accentColor: string
  badgeClass: string
}

export const PLANS: Plan[] = [
  {
    id: 1,
    name: 'Bronze',
    tier: 'Starter',
    device: 'Budget Smartphone',
    deviceImage: '/devices/bronze.png',
    price: 3000,
    dailyReturnPercent: 1.5,
    durationDays: 30,
    accentColor: '#CD7F32',
    badgeClass: 'bg-amber-700/20 text-amber-600 border-amber-700/30',
  },
  {
    id: 2,
    name: 'Silver',
    tier: 'Basic',
    device: 'Mid-range Tablet',
    deviceImage: '/devices/silver.png',
    price: 10000,
    dailyReturnPercent: 2.0,
    durationDays: 30,
    accentColor: '#A8A9AD',
    badgeClass: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  },
  {
    id: 3,
    name: 'Gold',
    tier: 'Standard',
    device: 'Premium Laptop',
    deviceImage: '/devices/gold.png',
    price: 25000,
    dailyReturnPercent: 2.5,
    durationDays: 30,
    popular: true,
    accentColor: '#FFD700',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  {
    id: 4,
    name: 'Platinum',
    tier: 'Advanced',
    device: 'Gaming Desktop',
    deviceImage: '/devices/platinum.png',
    price: 50000,
    dailyReturnPercent: 3.0,
    durationDays: 30,
    accentColor: '#E5E4E2',
    badgeClass: 'bg-gray-300/20 text-gray-300 border-gray-300/30',
  },
  {
    id: 5,
    name: 'Diamond',
    tier: 'Professional',
    device: 'Workstation',
    deviceImage: '/devices/diamond.png',
    price: 100000,
    dailyReturnPercent: 3.5,
    durationDays: 30,
    accentColor: '#00E5FF',
    badgeClass: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  },
  {
    id: 6,
    name: 'Elite',
    tier: 'Expert',
    device: 'Enterprise Server',
    deviceImage: '/devices/elite.png',
    price: 250000,
    dailyReturnPercent: 4.0,
    durationDays: 30,
    accentColor: '#9B59B6',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 7,
    name: 'Legend',
    tier: 'Master',
    device: 'Server Rack',
    deviceImage: '/devices/legend.png',
    price: 500000,
    dailyReturnPercent: 4.5,
    durationDays: 30,
    accentColor: '#FF6B35',
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  {
    id: 8,
    name: 'Sovereign',
    tier: 'Supreme',
    device: 'Data Center',
    deviceImage: '/devices/sovereign.png',
    price: 1000000,
    dailyReturnPercent: 5.0,
    durationDays: 30,
    accentColor: '#00D48A',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
]

/** Returns daily earning in Naira (floor to whole naira) */
export function getDailyEarning(plan: Plan): number {
  return Math.floor((plan.price * plan.dailyReturnPercent) / 100)
}

/** Returns total earning over full duration */
export function getTotalEarning(plan: Plan): number {
  return getDailyEarning(plan) * plan.durationDays
}

export const SITE = {
  name: 'Poco',
  short: 'POCO',
  tagline: 'Smart Investment Platform',
  signInBonus: 100,
  welcomeBonus: 500,
  minWithdrawal: 1000,
  minDeposit: 3000,
  withdrawalCharge: 18,
  referralLevel1: 20,
  referralLevel2: 3,
  promoterLevel1: 40,
  withdrawalHours: '9 AM to 8 PM Daily',
  inviteCode: 'POCO01',
  telegramGroup: 'https://t.me/pocoinvest',
  telegramChannel: 'https://t.me/pocoinvest',
  telegramSupport: 'pocosupport',

  // Stake & Spin
  stakeMin: 500,
  stakeMax: 50000,
  stakeHouseEdge: 0.65,
  stakeMultipliers: [1.5, 1.8, 2.0, 2.5, 3.0] as number[],

  // Lucky Draw
  luckyDrawSlotCost: 200,
  luckyDrawFreePerInvestment: 1,
  luckyDrawPrizeShares: [0.5, 0.3, 0.2] as number[],

  // Lock Vault tiers
  vaultTiers: [
    { days: 7,  bonusPercent: 8,  penaltyPercent: 10 },
    { days: 14, bonusPercent: 18, penaltyPercent: 10 },
    { days: 30, bonusPercent: 40, penaltyPercent: 10 },
  ] as { days: number; bonusPercent: number; penaltyPercent: number }[],
  vaultMin: 1000,

  // Deposit payment expiry (minutes)
  paymentExpiryMinutes: 60,

  // Feature flags
  features: {
    stakeAndSpin: true,
    luckyDraw: true,
    lockVault: true,
  },
}

export function formatNaira(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '₦0'
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
