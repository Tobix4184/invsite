import { db } from "@/lib/db"
import { siteSetting, bankAccount } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SITE } from "@/lib/plans"

export const SETTING_KEYS = {
  siteFrozen: "site_frozen",               // "true" = entire site frozen for all non-admin users
  depositsPaused: "deposits_paused",
  withdrawalsPaused: "withdrawals_paused",
  // Deposit / withdrawal limits — stored in DB so admin can change and takes effect immediately
  minDeposit: "min_deposit",           // naira e.g. "1000"
  minWithdrawal: "min_withdrawal",     // naira e.g. "1000"
  // Withdrawal charge — stored in DB so admin can change it and it applies immediately
  withdrawalCharge: "withdrawal_charge_percent",  // percent e.g. "18"
  // Game config — stored in site_setting, override SITE defaults at runtime
  stakeHouseEdge: "game_stake_house_edge",       // fraction e.g. "0.70"
  stakeMin: "game_stake_min",                     // naira e.g. "500"
  stakeMax: "game_stake_max",                     // naira e.g. "50000"
  stakeMultipliers: "game_stake_multipliers",     // JSON array e.g. "[1.5,2,3]"
  luckyDrawSlotCost: "game_lucky_draw_slot_cost", // naira e.g. "200"
  vaultBonus7: "game_vault_bonus_7",              // percent e.g. "8"
  vaultBonus14: "game_vault_bonus_14",            // percent e.g. "18"
  vaultBonus30: "game_vault_bonus_30",            // percent e.g. "40"
  vaultPenalty: "game_vault_penalty",             // percent e.g. "10"
  vaultMin: "game_vault_min",                     // naira e.g. "1000"
  // Spin slot prizes — JSON array of {amount, weight} e.g. '[{"amount":0,"weight":26},...]'
  spinPrizes: "game_spin_prizes",
  // Lucky Draw prize shares — JSON array of 3 fractions summing to 1 e.g. '[0.5,0.3,0.2]'
  luckyDrawPrizeShares: "game_lucky_draw_prize_shares",
  // Plays earned per investment / per qualifying referral
  gamePlaysPerInvestment: "game_plays_per_investment",
  gamePlaysPerReferral: "game_plays_per_referral",
  // Scratch card prizes — JSON array of {amount, weight}
  scratchPrizes: "game_scratch_prizes",
  // Scratch cards earned per valid referral
  scratchCardsPerReferral: "game_scratch_cards_per_referral",
} as const

/** Reads a single setting value, returns null if missing. */
export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, key))
  return row?.value ?? null
}

/** Reads a boolean setting (defaults to false if unset). */
export async function getBoolSetting(key: string): Promise<boolean> {
  const v = await getSetting(key)
  return v === "true"
}

/** Upserts a setting value. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSetting)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSetting.key, set: { value, updatedAt: new Date() } })
}

/**
 * Returns live game config from the DB, falling back to SITE defaults.
 * Called by game server actions so config changes take effect immediately.
 */
export async function getGameConfig() {
  const rows = await db.select().from(siteSetting)
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const g = SETTING_KEYS
  const raw = (k: string, def: string) => map.get(k) ?? def

  const withdrawalChargePct = parseFloat(raw(g.withdrawalCharge, String(SITE.withdrawalCharge)))
  const houseEdge = parseFloat(raw(g.stakeHouseEdge, String(SITE.stakeHouseEdge)))
  const stakeMin = parseInt(raw(g.stakeMin, String(SITE.stakeMin)), 10)
  const stakeMax = parseInt(raw(g.stakeMax, String(SITE.stakeMax)), 10)
  const multipliers: number[] = JSON.parse(raw(g.stakeMultipliers, JSON.stringify(SITE.stakeMultipliers)))
  const slotCost = parseInt(raw(g.luckyDrawSlotCost, String(SITE.luckyDrawSlotCost)), 10)
  const vaultBonus7 = parseFloat(raw(g.vaultBonus7, String(SITE.vaultTiers[0].bonusPercent)))
  const vaultBonus14 = parseFloat(raw(g.vaultBonus14, String(SITE.vaultTiers[1].bonusPercent)))
  const vaultBonus30 = parseFloat(raw(g.vaultBonus30, String(SITE.vaultTiers[2].bonusPercent)))
  const vaultPenalty = parseFloat(raw(g.vaultPenalty, String(SITE.vaultTiers[0].penaltyPercent)))
  const vaultMin = parseInt(raw(g.vaultMin, String(SITE.vaultMin)), 10)

  const defaultSpinPrizes = SITE.spinPrizes
  const spinPrizesRaw = map.get(SETTING_KEYS.spinPrizes)
  const spinPrizes: { amount: number; weight: number }[] = spinPrizesRaw
    ? JSON.parse(spinPrizesRaw)
    : defaultSpinPrizes

  const defaultShares = SITE.luckyDrawPrizeShares
  const sharesRaw = map.get(SETTING_KEYS.luckyDrawPrizeShares)
  const luckyDrawPrizeShares: number[] = sharesRaw ? JSON.parse(sharesRaw) : defaultShares

  const gamePlaysPerInvestment = parseInt(raw(SETTING_KEYS.gamePlaysPerInvestment, String(SITE.gamePlaysPerInvestment)), 10)
  const gamePlaysPerReferral   = parseInt(raw(SETTING_KEYS.gamePlaysPerReferral,   String(SITE.gamePlaysPerReferral)), 10)

  const scratchPrizesRaw = map.get(SETTING_KEYS.scratchPrizes)
  const scratchPrizes: { amount: number; weight: number }[] = scratchPrizesRaw
    ? JSON.parse(scratchPrizesRaw)
    : SITE.scratchPrizes
  const scratchCardsPerReferral = parseInt(raw(SETTING_KEYS.scratchCardsPerReferral, String(SITE.scratchCardsPerReferral)), 10)

  return {
    withdrawalCharge: withdrawalChargePct,
    stakeHouseEdge: houseEdge,
    stakeMin,
    stakeMax,
    stakeMultipliers: multipliers,
    luckyDrawSlotCost: slotCost,
    luckyDrawPrizeShares,
    spinPrizes,
    gamePlaysPerInvestment,
    gamePlaysPerReferral,
    scratchPrizes,
    scratchCardsPerReferral,
    vaultTiers: [
      { days: 7,  bonusPercent: vaultBonus7,  penaltyPercent: vaultPenalty },
      { days: 14, bonusPercent: vaultBonus14, penaltyPercent: vaultPenalty },
      { days: 30, bonusPercent: vaultBonus30, penaltyPercent: vaultPenalty },
    ],
    vaultMin,
  }
}

/**
 * Returns live deposit and withdrawal minimums from DB, falling back to SITE defaults.
 */
export async function getLiveDepositLimits(): Promise<{ minDeposit: number; minWithdrawal: number }> {
  const rows = await db.select().from(siteSetting)
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const minDep = parseInt(map.get(SETTING_KEYS.minDeposit) ?? "", 10)
  const minWd  = parseInt(map.get(SETTING_KEYS.minWithdrawal) ?? "", 10)
  return {
    minDeposit:   isNaN(minDep) ? SITE.minDeposit   : minDep,
    minWithdrawal: isNaN(minWd)  ? (SITE.minWithdrawal ?? 1000) : minWd,
  }
}

/**
 * Returns the current withdrawal charge percent from DB (falls back to SITE default).
 * Called at approval time so admin changes apply to pending withdrawals immediately.
 */
export async function getLiveWithdrawalCharge(): Promise<number> {
  const v = await getSetting(SETTING_KEYS.withdrawalCharge)
  const parsed = v ? parseFloat(v) : NaN
  return isNaN(parsed) ? SITE.withdrawalCharge : parsed
}

/**
 * Returns all live platform-info values shown in the AppHeader info panel.
 * Fetched from the DB so admin changes apply immediately — no hardcoded SITE fallbacks
 * for the user-visible display values.
 */
export async function getPlatformInfo() {
  const rows = await db.select().from(siteSetting)
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const minDep = parseInt(map.get(SETTING_KEYS.minDeposit) ?? "", 10)
  const minWd  = parseInt(map.get(SETTING_KEYS.minWithdrawal) ?? "", 10)
  const charge = parseFloat(map.get(SETTING_KEYS.withdrawalCharge) ?? "")

  return {
    minDeposit:       isNaN(minDep)  ? SITE.minDeposit              : minDep,
    minWithdrawal:    isNaN(minWd)   ? (SITE.minWithdrawal ?? 1000) : minWd,
    withdrawalCharge: isNaN(charge)  ? SITE.withdrawalCharge        : charge,
    referralLevel1:   SITE.referralLevel1,
    referralLevel2:   SITE.referralLevel2,
    promoterLevel1:   SITE.promoterLevel1,
    withdrawalHours:  SITE.withdrawalHours,
    signInBonus:      SITE.signInBonus,
  }
}

/**
 * Saves game configuration values to the DB. Called from the admin dashboard.
 * Only updates keys that are explicitly passed (partial update).
 */
export async function saveGameConfig(config: {
  spinPrizes?: { amount: number; weight: number }[]
  luckyDrawSlotCost?: number
  luckyDrawPrizeShares?: number[]
  gamePlaysPerInvestment?: number
  gamePlaysPerReferral?: number
  scratchPrizes?: { amount: number; weight: number }[]
  scratchCardsPerReferral?: number
}): Promise<void> {
  const g = SETTING_KEYS
  const tasks: Promise<void>[] = []
  if (config.spinPrizes !== undefined)
    tasks.push(setSetting(g.spinPrizes, JSON.stringify(config.spinPrizes)))
  if (config.luckyDrawSlotCost !== undefined)
    tasks.push(setSetting(g.luckyDrawSlotCost, String(config.luckyDrawSlotCost)))
  if (config.luckyDrawPrizeShares !== undefined)
    tasks.push(setSetting(g.luckyDrawPrizeShares, JSON.stringify(config.luckyDrawPrizeShares)))
  if (config.gamePlaysPerInvestment !== undefined)
    tasks.push(setSetting(g.gamePlaysPerInvestment, String(config.gamePlaysPerInvestment)))
  if (config.gamePlaysPerReferral !== undefined)
    tasks.push(setSetting(g.gamePlaysPerReferral, String(config.gamePlaysPerReferral)))
  if (config.scratchPrizes !== undefined)
    tasks.push(setSetting(g.scratchPrizes, JSON.stringify(config.scratchPrizes)))
  if (config.scratchCardsPerReferral !== undefined)
    tasks.push(setSetting(g.scratchCardsPerReferral, String(config.scratchCardsPerReferral)))
  await Promise.all(tasks)
}

/** Convenience: returns pause flags + site freeze state. */
export async function getPauseFlags(): Promise<{ depositsPaused: boolean; withdrawalsPaused: boolean; siteFrozen: boolean }> {
  const rows = await db.select().from(siteSetting)
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    siteFrozen: map.get(SETTING_KEYS.siteFrozen) === "true",
    depositsPaused: map.get(SETTING_KEYS.depositsPaused) === "true",
    withdrawalsPaused: map.get(SETTING_KEYS.withdrawalsPaused) === "true",
  }
}

/**
 * Picks an active bank account using weighted random selection.
 * Higher `weight` = higher chance of being shown. Optionally avoids
 * re-picking the same account that was used last (when more than one is active).
 */
export async function pickWeightedBankAccount(excludeId?: number) {
  const accounts = await db.select().from(bankAccount).where(eq(bankAccount.isActive, true))
  if (accounts.length === 0) return null

  let pool = accounts
  if (excludeId != null && accounts.length > 1) {
    const filtered = accounts.filter((a) => a.id !== excludeId)
    if (filtered.length > 0) pool = filtered
  }

  // Sabuss-enabled accounts (have an API key) are given 5x their base weight
  // so they are strongly preferred over manual-only accounts.
  // If ALL accounts in the pool have no Sabuss key, fallback is normal weighting.
  const hasSabuss = pool.some((a) => a.sabussApiKey)
  const effectiveWeight = (a: (typeof pool)[number]) => {
    const base = Math.max(1, a.weight ?? 1)
    return hasSabuss && a.sabussApiKey ? base * 5 : base
  }

  const totalWeight = pool.reduce((sum, a) => sum + effectiveWeight(a), 0)
  let r = Math.random() * totalWeight
  for (const acc of pool) {
    r -= effectiveWeight(acc)
    if (r <= 0) return acc
  }
  return pool[pool.length - 1]
}
