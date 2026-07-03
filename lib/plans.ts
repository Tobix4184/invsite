export type WithdrawalTier = 'tier1' | 'tier2' | 'tier3'

export type Plan = {
  id: number
  name: string
  tier: string
  /** Real-world valued asset this package represents */
  asset: string
  assetImage: string
  price: number
  /** Fixed daily earning in Naira */
  dailyEarning: number
  durationDays: number
  /** Which withdrawal tier this package unlocks */
  withdrawalTier: WithdrawalTier
  popular?: boolean
  accentColor: string
  badgeClass: string
}

export const PLANS: Plan[] = [
  {
    id: 1,
    name: 'Basic',
    tier: 'Entry',
    asset: 'Gold Reserve',
    assetImage: '/assets/gold.png',
    price: 10000,
    dailyEarning: 370,
    durationDays: 45,
    withdrawalTier: 'tier3',
    accentColor: '#00D4FF',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 2,
    name: 'Hustle',
    tier: 'Popular',
    asset: 'Solar Energy Farm',
    assetImage: '/assets/solar.png',
    price: 35000,
    dailyEarning: 1300,
    durationDays: 45,
    withdrawalTier: 'tier3',
    popular: true,
    accentColor: '#00D4FF',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 3,
    name: 'Grind',
    tier: 'Growth',
    asset: 'Agricultural Estate',
    assetImage: '/assets/agriculture.png',
    price: 80000,
    dailyEarning: 3000,
    durationDays: 50,
    withdrawalTier: 'tier2',
    accentColor: '#34D399',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 4,
    name: 'Wealth',
    tier: 'Premium',
    asset: 'Real Estate Fund',
    assetImage: '/assets/realestate.png',
    price: 150000,
    dailyEarning: 5600,
    durationDays: 55,
    withdrawalTier: 'tier2',
    accentColor: '#34D399',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 5,
    name: 'Empire',
    tier: 'VIP',
    asset: 'Oil & Gas Holding',
    assetImage: '/assets/oil.png',
    price: 300000,
    dailyEarning: 11200,
    durationDays: 60,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  },
  {
    id: 6,
    name: 'Legend',
    tier: 'VIP',
    asset: 'Data Center Grid',
    assetImage: '/assets/datacenter.png',
    price: 500000,
    dailyEarning: 18500,
    durationDays: 65,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  },
  {
    id: 7,
    name: 'Sovereign',
    tier: 'VIP',
    asset: 'Diamond Holdings',
    assetImage: '/assets/diamond.png',
    price: 1000000,
    dailyEarning: 37000,
    durationDays: 70,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  },
]

/** Returns daily earning in Naira */
export function getDailyEarning(plan: Plan): number {
  return plan.dailyEarning
}

/** Returns total earning over full duration */
export function getTotalEarning(plan: Plan): number {
  return plan.dailyEarning * plan.durationDays
}

export function getPlanById(id: number): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

// ── Withdrawal tier schedule ────────────────────────────────────────────────
// JS getDay(): 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
export const WITHDRAWAL_TIERS: Record<
  WithdrawalTier,
  { label: string; days: number[]; dayLabel: string }
> = {
  tier1: { label: 'Tier 1 · VIP', days: [5], dayLabel: 'Every Friday' },
  tier2: { label: 'Tier 2', days: [4], dayLabel: 'Every Thursday' },
  tier3: { label: 'Tier 3', days: [3], dayLabel: 'Every Wednesday' },
}

/** Highest tier the user qualifies for based on their active packages (tier1 > tier2 > tier3) */
export function bestTier(tiers: WithdrawalTier[]): WithdrawalTier | null {
  if (tiers.includes('tier1')) return 'tier1'
  if (tiers.includes('tier2')) return 'tier2'
  if (tiers.includes('tier3')) return 'tier3'
  return null
}

/** Is today a valid withdrawal day for the given tier? */
export function canWithdrawToday(tier: WithdrawalTier | null, date = new Date()): boolean {
  if (!tier) return false
  return WITHDRAWAL_TIERS[tier].days.includes(date.getDay())
}

export const SITE = {
  name: '247 Incum',
  short: '247',
  tagline: 'Earn Every Hour, Every Day',
  signInBonus: 100,
  welcomeBonus: 500,
  minWithdrawal: 1000,
  minDeposit: 10000,
  withdrawalCharge: 18,
  referralLevel1: 20,
  referralLevel2: 3,
  // Promoters get NO special referral commission — they earn a salary instead.
  // Kept equal to referralLevel1 so promoter commission logic stays neutral.
  promoterLevel1: 20,
  withdrawalHours: 'Mornings on your tier day',
  inviteCode: 'INCUM01',
  telegramGroup: 'https://t.me/AFRI_EARN',
  telegramChannel: 'https://t.me/AFRI_EARN',
  telegramSupport: 'https://t.me/AFRI_EARN',

  // Promoter salary system (promoters get salary, NOT extra referral commission)
  defaultPromoterSalary: 5000, // weekly, admin can override per promoter

  // Launch promo defaults (admin can edit/disable)
  launchPromo: {
    packagePrice: 35000, // Hustle
    cashbackPercent: 60,
  },

  // Stake & Spin
  stakeMin: 500,
  stakeMax: 50000,
  stakeHouseEdge: 0.65,
  stakeMultipliers: [1.5, 1.8, 2.0, 2.5, 3.0] as number[],

  // Lucky Draw
  luckyDrawSlotCost: 200,
  luckyDrawFreePerInvestment: 1,
  luckyDrawPrizeShares: [0.5, 0.3, 0.2] as number[],

  // Lock Vault removed from UI — config retained for backend compatibility only
  vaultTiers: [
    { days: 7, bonusPercent: 8, penaltyPercent: 10 },
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
    lockVault: false, // removed from UI
    virtualAccount: false, // coming soon
  },
}

export function formatNaira(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '₦0'
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
