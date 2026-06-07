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
import { getUserId } from "@/lib/session"
import { eq, sql, and, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ──────────────────────────────────────────────────────────────────────────────
// STAKE & SPIN
// ──────────────────────────────────────────────────────────────────────────────

export async function playSpin(stakeAmount: number) {
  const userId = await getUserId()
  const cfg = await getGameConfig()

  if (stakeAmount < cfg.stakeMin || stakeAmount > cfg.stakeMax) {
    return { ok: false, message: `Stake must be between ₦${cfg.stakeMin.toLocaleString()} and ₦${cfg.stakeMax.toLocaleString()}` }
  }

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  if (!w || Number(w.balance) < stakeAmount) {
    return { ok: false, message: "Insufficient balance" }
  }

  // Determine outcome: house wins cfg.stakeHouseEdge fraction of the time
  const rand = Math.random()
  const userWins = rand > cfg.stakeHouseEdge

  let winAmount = 0
  let multiplier = 0

  if (userWins) {
    const mults = cfg.stakeMultipliers
    multiplier = mults[Math.floor(Math.random() * mults.length)]
    winAmount = Math.round(stakeAmount * multiplier)
  }

  const outcome = userWins ? "win" : "lose"
  const netChange = userWins ? winAmount - stakeAmount : -stakeAmount

  // Update wallet atomically
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${netChange}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))

  // Record the spin
  await db.insert(stakeSpin).values({
    userId,
    stakeAmount: String(stakeAmount),
    outcome,
    multiplier: String(multiplier || 0),
    winAmount: String(winAmount),
  })

  // Record transaction
  await db.insert(transaction).values({
    userId,
    type: outcome === "win" ? "game_win" : "game_loss",
    amount: String(Math.abs(netChange)),
    description:
      outcome === "win"
        ? `Stake & Spin — won ${multiplier}x (₦${winAmount.toLocaleString()})`
        : `Stake & Spin — lost stake of ₦${stakeAmount.toLocaleString()}`,
  })

  revalidatePath("/games")
  return {
    ok: true,
    outcome,
    multiplier,
    winAmount,
    netChange,
    newBalance: Number(w.balance) + netChange,
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

  // Count active investments
  const activeInvestments = await db
    .select()
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  // 1 free slot per investment — lifetime (not per day). Check if ANY free slot
  // has ever been claimed by this user (across all draw dates).
  const freeSlotsClaimed = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "free")))

  const hasUsedFreeSlot = freeSlotsClaimed.length > 0
  const hasActiveInvestment = activeInvestments.length > 0
  // Free slot is available only if they have an active investment AND haven't used it yet
  const freeSlotAvailable = hasActiveInvestment && !hasUsedFreeSlot

  // Count slots entered for today's draw
  const existingSlots = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.drawDate, today)))

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))

  return {
    round,
    today,
    freeSlotAvailable,
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

  const activeInvestments = await db
    .select()
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  if (activeInvestments.length === 0) {
    return { ok: false, message: "You need an active investment to use your free slot" }
  }

  // Check if free slot has EVER been used (lifetime, not per day)
  const existing = await db
    .select()
    .from(luckyDrawSlot)
    .where(and(eq(luckyDrawSlot.userId, userId), eq(luckyDrawSlot.source, "free")))

  if (existing.length > 0) {
    return { ok: false, message: "Free slot already used" }
  }

  await db.insert(luckyDrawSlot).values({ userId, source: "free", drawDate: today })

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

export async function buyDrawSlots(count: number) {
  const userId = await getUserId()
  const today = todayStr()
  const cfg = await getGameConfig()

  if (count < 1 || count > 50) return { ok: false, message: "Invalid slot count" }

  const round = await getOrCreateRound(today)
  if (round.status !== "open") return { ok: false, message: "Draw already closed for today" }

  const totalCost = count * cfg.luckyDrawSlotCost
  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  if (!w || Number(w.balance) < totalCost) {
    return { ok: false, message: `Insufficient balance. Need ₦${totalCost.toLocaleString()}` }
  }

  // Deduct cost and grow prize pool
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${totalCost}`, updatedAt: new Date() })
    .where(eq(wallet.userId, userId))

  await db
    .update(luckyDrawRound)
    .set({ prizePool: sql`${luckyDrawRound.prizePool} + ${totalCost}` })
    .where(eq(luckyDrawRound.drawDate, today))

  const rows = Array.from({ length: count }, () => ({
    userId,
    source: "purchased" as const,
    purchaseAmount: String(cfg.luckyDrawSlotCost),
    drawDate: today,
  }))
  await db.insert(luckyDrawSlot).values(rows)

  await db.insert(transaction).values({
    userId,
    type: "game_slots",
    amount: String(totalCost),
    description: `Bought ${count} Lucky Draw slot${count > 1 ? "s" : ""}`,
  })

  revalidatePath("/games")
  return { ok: true, message: `${count} slot${count > 1 ? "s" : ""} purchased` }
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
