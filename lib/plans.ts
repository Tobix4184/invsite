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
  /** Fixed weekend salary points awarded per day of active earnings */
  dailyPoints: number
  /** Which withdrawal tier this package unlocks */
  withdrawalTier: WithdrawalTier
  popular?: boolean
  accentColor: string
  badgeClass: string
}

export const PLANS: Plan[] = [
  {
    // ₦3k × 40 days × ₦650/day = ₦26,000 total → 867% ROI
    id: 1,
    name: 'Starter',
    tier: 'Entry',
    asset: 'Treasury Savings',
    assetImage: '/assets/treasury.png',
    price: 3000,
    dailyEarning: 650,
    dailyPoints: 150,
    durationDays: 40,
    withdrawalTier: 'tier3',
    accentColor: '#00D4FF',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  {
    // ₦6k × 40 days × ₦1,000/day = ₦40,000 total → 667% ROI
    id: 9,
    name: 'Rising',
    tier: 'Entry',
    asset: 'Micro Finance Bond',
    assetImage: '/assets/treasury.png',
    price: 6000,
    dailyEarning: 1000,
    dailyPoints: 200,
    durationDays: 40,
    withdrawalTier: 'tier3',
    accentColor: '#00D4FF',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  {
    // ₦10k × 45 days × ₦1,300/day = ₦58,500 total → 585% ROI
    id: 2,
    name: 'Basic',
    tier: 'Entry',
    asset: 'Gold Reserve',
    assetImage: '/assets/gold.png',
    price: 10000,
    dailyEarning: 1300,
    dailyPoints: 400,
    durationDays: 45,
    withdrawalTier: 'tier3',
    accentColor: '#00D4FF',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  {
    // ₦35k × 45 days × ₦4,200/day = ₦189,000 total → 540% ROI
    id: 3,
    name: 'Hustle',
    tier: 'Popular',
    asset: 'Solar Energy Farm',
    assetImage: '/assets/solar.png',
    price: 35000,
    dailyEarning: 4200,
    dailyPoints: 800,
    durationDays: 45,
    withdrawalTier: 'tier3',
    popular: true,
    accentColor: '#00D4FF',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  {
    // ₦80k × 50 days × ₦8,800/day = ₦440,000 total → 550% ROI
    id: 4,
    name: 'Grind',
    tier: 'Growth',
    asset: 'Agricultural Estate',
    assetImage: '/assets/agriculture.png',
    price: 80000,
    dailyEarning: 8800,
    dailyPoints: 1500,
    durationDays: 50,
    withdrawalTier: 'tier2',
    accentColor: '#34D399',
    badgeClass: 'bg-success text-success-foreground',
  },
  {
    // ₦150k × 55 days × ₦15,000/day = ₦825,000 total → 550% ROI
    id: 5,
    name: 'Wealth',
    tier: 'Premium',
    asset: 'Real Estate Fund',
    assetImage: '/assets/realestate.png',
    price: 150000,
    dailyEarning: 15000,
    dailyPoints: 2500,
    durationDays: 55,
    withdrawalTier: 'tier2',
    accentColor: '#34D399',
    badgeClass: 'bg-success text-success-foreground',
  },
  {
    // ₦300k × 60 days × ₦28,000/day = ₦1,680,000 total → 560% ROI
    id: 6,
    name: 'Empire',
    tier: 'VIP',
    asset: 'Oil & Gas Holding',
    assetImage: '/assets/oil.png',
    price: 300000,
    dailyEarning: 28000,
    dailyPoints: 4000,
    durationDays: 60,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-gold text-gold-foreground',
  },
  {
    // ₦500k × 65 days × ₦45,000/day = ₦2,925,000 total → 585% ROI
    id: 7,
    name: 'Legend',
    tier: 'VIP',
    asset: 'Data Center Grid',
    assetImage: '/assets/datacenter.png',
    price: 500000,
    dailyEarning: 45000,
    dailyPoints: 6000,
    durationDays: 65,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-gold text-gold-foreground',
  },
  {
    // ₦1M × 70 days × ₦85,000/day = ₦5,950,000 total → 595% ROI
    id: 8,
    name: 'Sovereign',
    tier: 'VIP',
    asset: 'Diamond Holdings',
    assetImage: '/assets/diamond.png',
    price: 1000000,
    dailyEarning: 85000,
    dailyPoints: 10000,
    durationDays: 70,
    withdrawalTier: 'tier1',
    accentColor: '#F5C451',
    badgeClass: 'bg-gold text-gold-foreground',
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
  packageCount: 9,

  // Phone numbers that are auto-granted the admin role on signup.
  adminPhones: ['08077229485'],
  signInBonus: 100,
  welcomeBonus: 500,
  minWithdrawal: 1000,
  minDeposit: 3000,
  withdrawalCharge: 18,
  referralLevel1: 20,
  referralLevel2: 3,
  // Promoters get NO special referral commission — they earn a salary instead.
  // Kept equal to referralLevel1 so promoter commission logic stays neutral.
  promoterLevel1: 20,
  withdrawalHours: 'Mornings on your tier day',
  inviteCode: 'INCUM01',
  telegramGroup: 'https://t.me/incomehh',
  telegramChannel: 'https://t.me/incomehh',
  telegramSupport: 'https://t.me/247incumSpt',

  // Promoter salary system (promoters get salary, NOT extra referral commission)
  defaultPromoterSalary: 5000, // weekly, admin can override per promoter

  // Launch promo defaults (admin can edit/disable)
  launchPromo: {
    packagePrice: 35000, // Hustle
    cashbackPercent: 60,
  },

  // ── Free-play games (no wallet money is ever staked) ─────────────────────
  // Plays are EARNED, not bought: users get plays for every package they buy
  // and for every referral who becomes a valid (investing) member.
  gamePlaysPerInvestment: 1,
  gamePlaysPerReferral: 1,

  // Stake & Spin — spinning a free play awards a random reward "drop".
  // No stake is deducted; the worst outcome is simply ₦0.
  // Special amount -1 = "bonus spin" (grants 1 extra spin, no naira credited).
  spinPrizes: [
    { amount: 0,    weight: 30 },  // no win
    { amount: 10,   weight: 18 },  // ₦10
    { amount: 50,   weight: 15 },  // ₦50
    { amount: 100,  weight: 14 },  // ₦100
    { amount: 200,  weight: 10 },  // ₦200
    { amount: 350,  weight: 6  },  // ₦350
    { amount: 500,  weight: 4  },  // ₦500
    { amount: 1000, weight: 2  },  // ₦1,000
    { amount: -1,   weight: 1  },  // bonus spin
  ] as { amount: number; weight: number }[],

  // Scratch Card prizes — amount 0 = no win, amount > 0 = naira reward.
  scratchPrizes: [
    { amount: 0,    weight: 25 },  // no win
    { amount: 50,   weight: 20 },  // ₦50
    { amount: 100,  weight: 18 },  // ₦100
    { amount: 200,  weight: 12 },  // ₦200
    { amount: 500,  weight: 8  },  // ₦500
    { amount: 1000, weight: 5  },  // ₦1,000
    { amount: 2000, weight: 2  },  // ₦2,000
    { amount: 5000, weight: 1  },  // ₦5,000 (jackpot)
  ] as { amount: number; weight: number }[],

  // How many scratch cards a valid referral earns the referrer
  scratchCardsPerReferral: 2,

  // Legacy stake fields kept for backward compatibility (unused by the new spin)
  stakeMin: 0,
  stakeMax: 0,
  stakeHouseEdge: 0.65,
  stakeMultipliers: [1.5, 1.8, 2.0, 2.5, 3.0] as number[],

  // Lucky Draw — slots are free (earned from investments + referrals).
  // Each slot entered adds this house-funded amount to the daily prize pool.
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

/** Picks a random reward drop (Naira) from the weighted spin prize table. */
export function pickSpinPrize(): number {
  const prizes = SITE.spinPrizes
  const total = prizes.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of prizes) {
    r -= p.weight
    if (r <= 0) return p.amount
  }
  return 0
}

/** Masks a phone number for display, e.g. "08077229485" -> "0807*****485". */
export function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/[^\d]/g, '')
  if (digits.length < 7) return digits || 'Member'
  return `${digits.slice(0, 4)}*****${digits.slice(-3)}`
}

export function formatNaira(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '₦0'
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
