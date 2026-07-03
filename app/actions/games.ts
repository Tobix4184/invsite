"use server"

import { db } from "@/lib/db"
import {
  stakeSpin,
  luckyDrawSlot,
  luckyDrawRound,
  lockVault,
  wallet,
  transaction,
  investment,
  user as userTable,
  referral,
} from "@/lib/db/schema"
import { SITE } from "@/lib/plans"
import { getGameConfig } from "@/app/actions/settings"

/** Picks a random reward from a live-configured prize table. */
function pickSpinPrizeLive(prizes: { amount: number; weight: number }[]): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of prizes) {
    r -= p.weight
    if (r <= 0) return p.amount
  }
  return 0
}
import { getUserId } from "@/lib/session"
import { eq, sql, and, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ──────────────────────────────────────────────────────────────────────────────
// FREE-PLAY ENTITLEMENTS
// ──────────────────────────────────────────────────────────────────────────────
// Games never take money from the wallet. Instead, plays are EARNED:
//   • 1 play for every package the user has invested in
//   • 1 play for every valid referral (a referred member who has invested,
//     i.e. the referrer has earned commission from them)
// Each game spends from its own entitlement, tracked by counting rows.

/** Total plays a user has earned from investments + valid referrals (reads live config). */
async function earnedPlays(userId: string): Promise<{ investments: number; referrals: number; total: number }> {
  const [inv] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(investment)
    .where(eq(investment.userId, userId))

  const [ref] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(referral)
    .where(and(eq(referral.referrerId, userId), sql`${referral.totalCommission} > 0`))

  const investments = Number(inv?.c ?? 0)
  const referrals = Number(ref?.c ?? 0)

  // Read live plays-per-investment / referral from DB so admin changes take effect immediately
  const cfg = await getGameConfig()
  const total = investments * cfg.gamePlaysPerInvestment + referrals * cfg.gamePlaysPerReferral
  return { investments, referrals, total }
}

// ──────────────────────────────────────────────────────────────────────────────
// STAKE & SPIN (free play — awards a random reward drop, never costs money)
// ──────────────────────────────────────────────────────────────────────────────

/** How many free spins the user has left right now. */
export async function getSpinState() {
  const userId = await getUserId()
  const earned = await earnedPlays(userId)
  const [used] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(stakeSpin)
    .where(eq(stakeSpin.userId, userId))
  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))

  return {
    spinsAvailable: Math.max(0, earned.total - Number(used?.c ?? 0)),
    balance: Number(w?.balance ?? 0),
  }
}

export async function playSpin() {
  const userId = await getUserId()

  const earned = await earnedPlays(userId)
  const [used] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(stakeSpin)
    .where(eq(stakeSpin.userId, userId))
  const spinsAvailable = earned.total - Number(used?.c ?? 0)

  if (spinsAvailable <= 0) {
    return {
      ok: false,
      message: "No free spins left. Invest in a package or refer a friend to earn more spins.",
    }
  }

  // Award a random reward drop using live admin-configured prizes.
  // Worst case is ₦0 — nothing is ever deducted from the user.
  const cfg = await getGameConfig()
  const prize = pickSpinPrizeLive(cfg.spinPrizes)
  const outcome = prize > 0 ? "win" : "lose"

  // Record the spin first (this consumes exactly one play).
  await db.insert(stakeSpin).values({
    userId,
    stakeAmount: "0",
    outcome,
    multiplier: "0",
    winAmount: String(prize),
  })

  let newBalance: number | undefined
  if (prize > 0) {
    const [w] = await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${prize}`,
        totalEarned: sql`${wallet.totalEarned} + ${prize}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.userId, userId))
      .returning({ balance: wallet.balance })
    newBalance = Number(w?.balance ?? 0)

    await db.insert(transaction).values({
      userId,
      type: "game_win",
      amount: String(prize),
      description: `Stake & Spin reward drop — ₦${prize.toLocaleString()}`,
    })
  } else {
    const [w] = await db.select({ balance: wallet.balance }).from(wallet).where(eq(wallet.userId, userId))
    newBalance = Number(w?.balance ?? 0)
  }

  revalidatePath("/games")
  return {
    ok: true,
    outcome,
    winAmount: prize,
    spinsLeft: Math.max(0, spinsAvailable - 1),
    newBalance,
  }
}

export async function getSpinHistory() {
  const userId = await getUserId()
  return db
    .select()
    .from(stakeSpin)
    .where(eq(stakeSpin.userId, userId))
    .orderBy(desc(stakeSpin.createdAt))
    .limit(20)
}

// ──────────────────────────────────────────────────────────────────────────────
// LUCKY DRAW
// ──────────────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function getOrCreateRound(date: string) {
  const [existing] = await db
    .select()
    .from(luckyDrawRound)
    .where(eq(luckyDrawRound.drawDate, date))
  if (existing) return existing
  const [created] = await db
    .insert(luckyDrawRound)
    .values({ drawDate: date, prizePool: "0", status: "open" })
    .returning()
  return created
}

export async function getLuckyDrawState() {
  const userId = await getUserId()
  const today = todayStr()

  const round = await getOrCreateRound(today)

  // Count investments (each one grants a free draw slot)
  const [invCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(investment)
    .where(eq(investment.userId, userId))
  const investmentCount = Number(invCount?.c ?? 0)

  // Free slots already claimed (lifetime)
  const [freeClaimed] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "free")))

  const freeSlotsRemaining = Math.max(0, investmentCount - Number(freeClaimed?.c ?? 0))
  const hasActiveInvestment = investmentCount > 0

  // Count slots entered for today's draw
  const existingSlots = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.drawDate, today)))

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))

  return {
    round,
    today,
    freeSlotsRemaining,
    freeSlotAvailable: freeSlotsRemaining > 0,
    hasActiveInvestment,
    slotsEntered: existingSlots.length,
    balance: Number(w?.balance ?? 0),
    slotCost: SITE.luckyDrawSlotCost,
  }
}

export async function claimFreeDrawSlot() {
  const userId = await getUserId()
  const today = todayStr()

  const round = await getOrCreateRound(today)
  if (round.status !== "open") return { ok: false, message: "Draw already closed for today" }

  const [invCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(investment)
    .where(eq(investment.userId, userId))
  const investmentCount = Number(invCount?.c ?? 0)

  if (investmentCount === 0) {
    return { ok: false, message: "You need an investment to earn a free slot" }
  }

  const [freeClaimed] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "free")))

  if (Number(freeClaimed?.c ?? 0) >= investmentCount) {
    return { ok: false, message: "All free slots used. Invest again to earn more." }
  }

  await db.insert(luckyDrawSlot).values({ userId, source: "free", drawDate: today })

  // House-funded contribution to today's prize pool (no user money involved).
  // Uses live slot cost from admin config.
  const cfg2 = await getGameConfig()
  await db
    .update(luckyDrawRound)
    .set({ prizePool: sql`${luckyDrawRound.prizePool} + ${cfg2.luckyDrawSlotCost}` })
    .where(eq(luckyDrawRound.drawDate, today))

  revalidatePath("/games")
  return { ok: true, message: "Free slot entered!" }
}

// Public: last 3 draw winners with masked names — shown on the draw page for FOMO
export async function getRecentDrawWinners() {
  const recent = await db
    .select()
    .from(luckyDrawRound)
    .where(eq(luckyDrawRound.status, "drawn"))
    .orderBy(desc(luckyDrawRound.drawDate))
    .limit(5)

  const results: { name: string; amount: number; drawDate: string; place: number }[] = []

  for (const round of recent) {
    const pairs = [
      { uid: round.winner1Id, amt: round.winner1Amount, place: 1 },
      { uid: round.winner2Id, amt: round.winner2Amount, place: 2 },
      { uid: round.winner3Id, amt: round.winner3Amount, place: 3 },
    ] as const

    for (const { uid, amt, place } of pairs) {
      if (!uid || !amt) continue
      const [u] = await db.select({ name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, uid))
      const displayName = u
        ? maskName(u.name ?? u.email ?? "User")
        : "Someone"
      results.push({ name: displayName, amount: Number(amt), drawDate: round.drawDate, place })
    }
    if (results.length >= 6) break
  }

  return results.slice(0, 6)
}

function maskName(full: string): string {
  // "Jonathan salvation" → "J*** s***"
  return full.split(/\s+/).map((w) => w[0] + "*".repeat(Math.max(1, w.length - 1))).join(" ")
}

// Referral bonus: if a user referred someone who has deposited, they get 1 free bonus slot per referral
export async function claimReferralDrawSlot() {
  const userId = await getUserId()
  const today = todayStr()

  const round = await getOrCreateRound(today)
  if (round.status !== "open") return { ok: false, message: "Draw already closed for today" }

  // Qualifying referral = referrer has earned commission > 0 (means referred user deposited)
  const qualifying = await db
    .select()
    .from(referral)
    .where(and(eq(referral.referrerId, userId), sql`${referral.totalCommission} > 0`))

  if (qualifying.length === 0) {
    return { ok: false, message: "No qualifying referrals yet. Refer a friend who deposits to earn a bonus slot." }
  }

  // How many referral slots have been claimed so far (across all dates)?
  const claimed = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "referral")))

  const remaining = qualifying.length - claimed.length
  if (remaining <= 0) return { ok: false, message: "All referral bonus slots already claimed." }

  // Grant exactly 1 referral slot for today's draw
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(luckyDrawSlot).values({ userId, source: "referral" as any, drawDate: today })

  revalidatePath("/games")
  return { ok: true, message: `Referral bonus slot entered! You have ${remaining - 1} more referral slot${remaining - 1 === 1 ? "" : "s"} to claim.` }
}

// ──────────────────────────────────────────────────────────────────────────────
// LOCK VAULT
// ──────────────────────────────────────────────────────────────────────────────

export async function createVault(amount: number, tierIndex: number) {
  const userId = await getUserId()
  const cfg = await getGameConfig()

  const tier = cfg.vaultTiers[tierIndex]
  if (!tier) return { ok: false, message: "Invalid vault tier" }
  if (amount < cfg.vaultMin) {
    return { ok: false, message: `Minimum vault amount is ₦${cfg.vaultMin.toLocaleString()}` }
  }

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  if (!w || Number(w.balance) < amount) {
    return { ok: false, message: "Insufficient balance" }
  }

  const bonusAmount = Math.round(amount * (tier.bonusPercent / 100))
  const unlocksAt = new Date(Date.now() + tier.days * 24 * 60 * 60 * 1000)

  // Deduct from wallet
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}`, updatedAt: new Date() })
    .where(eq(wallet.userId, userId))

  await db.insert(lockVault).values({
    userId,
    amount: String(amount),
    lockDays: tier.days,
    bonusPercent: String(tier.bonusPercent),
    bonusAmount: String(bonusAmount),
    status: "locked",
    unlocksAt,
  })

  await db.insert(transaction).values({
    userId,
    type: "vault_lock",
    amount: String(amount),
    description: `Locked ₦${amount.toLocaleString()} in vault for ${tier.days} days (+${tier.bonusPercent}% bonus)`,
  })

  revalidatePath("/games")
  return {
    ok: true,
    message: `₦${amount.toLocaleString()} locked for ${tier.days} days. You earn ₦${bonusAmount.toLocaleString()} bonus on maturity.`,
  }
}

export async function claimVault(vaultId: number) {
  const userId = await getUserId()

  const [vault] = await db
    .select()
    .from(lockVault)
    .where(and(eq(lockVault.id, vaultId), eq(lockVault.userId, userId)))

  if (!vault) return { ok: false, message: "Vault not found" }
  if (vault.status !== "locked") return { ok: false, message: "Vault already settled" }

  const now = new Date()
  const matured = now >= vault.unlocksAt

  const principal = Number(vault.amount)
  const bonus = Number(vault.bonusAmount)

  let payout: number
  let status: string
  let description: string

  if (matured) {
    payout = principal + bonus
    status = "completed"
    description = `Vault matured — received ₦${payout.toLocaleString()} (₦${principal.toLocaleString()} + ₦${bonus.toLocaleString()} bonus)`
  } else {
    // Early break: return principal minus penalty (read live config)
    const liveCfg = await getGameConfig()
    const penaltyTier = liveCfg.vaultTiers.find((t) => t.days === vault.lockDays)
    const penaltyPct = penaltyTier?.penaltyPercent ?? 10
    const penalty = Math.round(principal * (penaltyPct / 100))
    payout = principal - penalty
    status = "broken"
    description = `Vault broken early — ₦${penalty.toLocaleString()} penalty applied, received ₦${payout.toLocaleString()}`
  }

  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${payout}`,
      ...(matured ? { totalEarned: sql`${wallet.totalEarned} + ${bonus}` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))

  await db
    .update(lockVault)
    .set({ status, completedAt: now, penaltyAmount: matured ? null : String(principal - payout) })
    .where(eq(lockVault.id, vaultId))

  await db.insert(transaction).values({
    userId,
    type: matured ? "vault_complete" : "vault_break",
    amount: String(payout),
    description,
  })

  revalidatePath("/games")
  return { ok: true, message: description, payout, matured }
}

export async function getUserVaults() {
  const userId = await getUserId()
  return db
    .select()
    .from(lockVault)
    .where(eq(lockVault.userId, userId))
    .orderBy(desc(lockVault.createdAt))
}
