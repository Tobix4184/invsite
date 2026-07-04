"use server"

import { db } from "@/lib/db"
import {
  promoterSalary,
  salaryPayment,
  wallet,
  transaction,
  profile,
  referral,
  investment,
  user as userTable,
} from "@/lib/db/schema"
import { getUserId, requireAdmin } from "@/lib/session"
import { getSalaryConfig, type SalaryConfig } from "@/app/actions/settings"
import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ─── Algorithm ────────────────────────────────────────────────────────────────

type SalaryComputation = {
  points: number
  amount: number
  referralsCounted: number
  activeReferrals: number
}

/** Map a plan price to points using the configured brackets. */
function pointsForPrice(price: number, tiers: { minPrice: number; points: number }[]): number {
  let pts = 0
  for (const t of tiers) {
    if (price >= t.minPrice) pts = t.points
  }
  return pts
}

/**
 * Compute a promoter's salary from their referrals' plans within the rolling window.
 * Each valid referral (one who earned the promoter commission) whose referred user
 * has an active package purchased within the window contributes points based on the
 * highest-priced such package. Salary = points x rate, capped at the weekly max.
 */
export async function computeSalaryForUser(
  userId: string,
  cfg: SalaryConfig,
): Promise<SalaryComputation> {
  // Valid referrals: referred users who generated commission for this promoter
  const refRows = await db
    .select({ referredId: referral.referredId })
    .from(referral)
    .where(and(eq(referral.referrerId, userId), gt(referral.totalCommission, "0")))

  const referredIds = [...new Set(refRows.map((r) => r.referredId))]
  if (referredIds.length === 0) {
    return { points: 0, amount: 0, referralsCounted: 0, activeReferrals: 0 }
  }

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - cfg.windowDays)

  // Highest active package price per referred user, purchased within the window
  const invRows = await db
    .select({
      userId: investment.userId,
      maxPrice: sql<number>`max(${investment.price})::float`,
    })
    .from(investment)
    .where(
      and(
        inArray(investment.userId, referredIds),
        eq(investment.status, "active"),
        gte(investment.createdAt, windowStart),
      ),
    )
    .groupBy(investment.userId)

  let points = 0
  let counted = 0
  for (const row of invRows) {
    const p = pointsForPrice(Number(row.maxPrice), cfg.planTiers)
    if (p > 0) {
      points += p
      counted++
    }
  }

  const amount = Math.min(Math.round(points * cfg.ratePerPoint), cfg.maxWeekly)
  return { points, amount, referralsCounted: counted, activeReferrals: invRows.length }
}

/** Resolve the payable amount for a promoter (manual override wins). */
async function payableAmount(
  row: typeof promoterSalary.$inferSelect,
  cfg: SalaryConfig,
): Promise<{ amount: number; comp: SalaryComputation | null }> {
  if (row.manualOverride) {
    return { amount: Math.round(Number(row.weeklyAmount)), comp: null }
  }
  const comp = await computeSalaryForUser(row.userId, cfg)
  return { amount: comp.amount, comp }
}

// ─── User-facing ──────────────────────────────────────────────────────────────

/** Fetch the signed-in promoter's salary summary + recent payments. */
export async function getMySalary() {
  const userId = await getUserId()
  const [sal] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, userId))
  if (!sal || !sal.isActive) return null

  const cfg = await getSalaryConfig()
  const { amount, comp } = await payableAmount(sal, cfg)

  const payments = await db
    .select()
    .from(salaryPayment)
    .where(eq(salaryPayment.userId, userId))
    .orderBy(desc(salaryPayment.paidAt))
    .limit(10)
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(amount),0)::float` })
    .from(salaryPayment)
    .where(eq(salaryPayment.userId, userId))

  return {
    weeklyAmount: amount,
    isActive: sal.isActive,
    manualOverride: sal.manualOverride,
    lastPaidAt: sal.lastPaidAt,
    totalPaid: Number(total),
    points: comp?.points ?? null,
    referralsCounted: comp?.referralsCounted ?? null,
    windowDays: cfg.windowDays,
    enabled: cfg.enabled,
    payments,
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listPromoterSalaries() {
  await requireAdmin()
  const cfg = await getSalaryConfig()
  const rows = await db
    .select({
      id: promoterSalary.id,
      userId: promoterSalary.userId,
      weeklyAmount: promoterSalary.weeklyAmount,
      isActive: promoterSalary.isActive,
      manualOverride: promoterSalary.manualOverride,
      autoQualified: promoterSalary.autoQualified,
      note: promoterSalary.note,
      lastPaidAt: promoterSalary.lastPaidAt,
      userName: userTable.name,
      userEmail: userTable.email,
      userPhone: profile.phone,
      isPromoter: profile.isPromoter,
    })
    .from(promoterSalary)
    .leftJoin(userTable, eq(promoterSalary.userId, userTable.id))
    .leftJoin(profile, eq(promoterSalary.userId, profile.userId))
    .orderBy(desc(promoterSalary.createdAt))

  // Attach a computed salary preview to each promoter
  const withPreview = await Promise.all(
    rows.map(async (r) => {
      const comp = await computeSalaryForUser(r.userId, cfg)
      const payable = r.manualOverride ? Math.round(Number(r.weeklyAmount)) : comp.amount
      return { ...r, computedAmount: comp.amount, points: comp.points, referralsCounted: comp.referralsCounted, payable }
    }),
  )
  return { config: cfg, promoters: withPreview }
}

/**
 * Add or update a promoter manually. If `weeklyAmount` is provided (> 0),
 * the promoter is set to manual-override mode; otherwise they use the algorithm.
 */
export async function setPromoterSalary(input: {
  identifier: string
  weeklyAmount?: number
  useAlgorithm?: boolean
  note?: string
}) {
  await requireAdmin()
  const id = input.identifier.trim()
  if (!id) return { ok: false, message: "Enter the promoter's phone or email" }

  const useAlgorithm = input.useAlgorithm ?? true
  const amount = Math.max(0, Math.round(Number(input.weeklyAmount) || 0))

  // Resolve by email first, then by phone number
  let u: { id: string; name: string | null } | undefined
  if (id.includes("@")) {
    ;[u] = await db.select().from(userTable).where(eq(userTable.email, id.toLowerCase()))
  } else {
    const digits = id.replace(/[^\d]/g, "")
    const [p] = await db.select().from(profile).where(eq(profile.phone, digits))
    if (p) [u] = await db.select().from(userTable).where(eq(userTable.id, p.userId))
  }
  if (!u) return { ok: false, message: "No user with that phone or email" }

  await db.update(profile).set({ isPromoter: true }).where(eq(profile.userId, u.id))

  const [existing] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, u.id))
  if (existing) {
    await db
      .update(promoterSalary)
      .set({
        weeklyAmount: String(amount),
        manualOverride: !useAlgorithm,
        note: input.note ?? existing.note,
        isActive: true,
      })
      .where(eq(promoterSalary.userId, u.id))
  } else {
    await db.insert(promoterSalary).values({
      userId: u.id,
      weeklyAmount: String(amount),
      manualOverride: !useAlgorithm,
      autoQualified: false,
      note: input.note,
    })
  }
  revalidatePath("/admin")
  const mode = useAlgorithm ? "algorithm-based salary" : `fixed ₦${amount.toLocaleString()}/week`
  return { ok: true, message: `${u.name ?? "Promoter"} added with ${mode}` }
}

export async function togglePromoterSalary(userId: string, isActive: boolean) {
  await requireAdmin()
  await db.update(promoterSalary).set({ isActive }).where(eq(promoterSalary.userId, userId))
  revalidatePath("/admin")
  return { ok: true }
}

/** Remove a promoter from the salary program. */
export async function removePromoterSalary(userId: string) {
  await requireAdmin()
  await db.delete(promoterSalary).where(eq(promoterSalary.userId, userId))
  await db.update(profile).set({ isPromoter: false }).where(eq(profile.userId, userId))
  revalidatePath("/admin")
  return { ok: true, message: "Promoter removed from salary program" }
}

/**
 * Auto-qualify promoters by activity. Scans all users who have valid referrals
 * and, for anyone meeting the configured active-referral threshold in the window,
 * creates/activates an algorithm-based promoter salary record.
 */
export async function syncAutoPromoters() {
  await requireAdmin()
  const cfg = await getSalaryConfig()

  const referrers = await db
    .selectDistinct({ referrerId: referral.referrerId })
    .from(referral)
    .where(gt(referral.totalCommission, "0"))

  let added = 0
  for (const { referrerId } of referrers) {
    const comp = await computeSalaryForUser(referrerId, cfg)
    if (comp.referralsCounted < cfg.autoQualifyMin) continue

    const [existing] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, referrerId))
    if (existing) {
      if (!existing.isActive) {
        await db.update(promoterSalary).set({ isActive: true }).where(eq(promoterSalary.userId, referrerId))
      }
      continue
    }
    await db.insert(promoterSalary).values({
      userId: referrerId,
      weeklyAmount: "0",
      manualOverride: false,
      autoQualified: true,
    })
    await db.update(profile).set({ isPromoter: true }).where(eq(profile.userId, referrerId))
    added++
  }
  revalidatePath("/admin")
  return {
    ok: true,
    message: added > 0 ? `Auto-qualified ${added} new promoter(s)` : "No new promoters qualified",
  }
}

/** Pay a single promoter their current weekly salary into their wallet. */
export async function payPromoterSalary(userId: string) {
  await requireAdmin()
  const cfg = await getSalaryConfig()
  const [sal] = await db.select().from(promoterSalary).where(eq(promoterSalary.userId, userId))
  if (!sal || !sal.isActive) return { ok: false, message: "No active salary for this promoter" }

  const { amount } = await payableAmount(sal, cfg)
  if (amount <= 0) return { ok: false, message: "Computed salary is ₦0 this period" }

  await creditSalary(userId, amount)
  revalidatePath("/admin")
  return { ok: true, message: `Paid ₦${amount.toLocaleString()} salary` }
}

/** Pay every active promoter their current weekly salary. */
export async function payAllSalaries() {
  await requireAdmin()
  const cfg = await getSalaryConfig()
  const rows = await db.select().from(promoterSalary).where(eq(promoterSalary.isActive, true))
  let count = 0
  let total = 0
  for (const sal of rows) {
    const { amount } = await payableAmount(sal, cfg)
    if (amount <= 0) continue
    await creditSalary(sal.userId, amount)
    count++
    total += amount
  }
  revalidatePath("/admin")
  return { ok: true, message: `Paid ${count} promoter(s) a total of ₦${total.toLocaleString()}` }
}

async function creditSalary(userId: string, amount: number) {
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${amount}`,
      totalEarned: sql`${wallet.totalEarned} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))
  await db.insert(salaryPayment).values({ userId, amount: String(amount), note: "Weekly salary" })
  await db.update(promoterSalary).set({ lastPaidAt: new Date() }).where(eq(promoterSalary.userId, userId))
  await db.insert(transaction).values({
    userId,
    type: "salary",
    amount: String(amount),
    description: "Promoter weekly salary",
  })
}
