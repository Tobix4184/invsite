"use server"

import { db } from "@/lib/db"
import { wallet, transaction, weekendPayout, siteSetting } from "@/lib/db/schema"
import { getUserId, requireAdmin } from "@/lib/session"
import { eq, sql, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ─── Config helpers ────────────────────────────────────────────────────────────

export type PointsConfig = {
  /** Naira value of 1 point (default: 0.5, so 10 pts = ₦5) */
  pointsPerNaira: number
  /** Points awarded to both referrer and new user on registration */
  referralJoinPoints: number
  /** Points per ₦10 won in games */
  gameWinPointsRate: number
  /** Points awarded per plan purchase (fallback if not in map) */
  investmentDefaultPoints: number
  /** planId → points override map */
  investmentPointsMap: Record<string, number>
  /** Points awarded per ₦100 of daily investment income (default 5 → ₦3k/day = 150 pts) */
  dailyIncomePointsRate: number
}

export async function getPointsConfig(): Promise<PointsConfig> {
  const rows = await db
    .select()
    .from(siteSetting)
    .where(
      sql`key IN ('points_per_naira','referral_join_points','game_win_points_rate','investment_default_points','investment_points_map','daily_income_points_rate')`
    )

  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  return {
    pointsPerNaira: parseFloat(map["points_per_naira"] ?? "0.5"),
    referralJoinPoints: parseInt(map["referral_join_points"] ?? "1000", 10),
    gameWinPointsRate: parseFloat(map["game_win_points_rate"] ?? "1"),
    investmentDefaultPoints: parseInt(map["investment_default_points"] ?? "500", 10),
    investmentPointsMap: JSON.parse(map["investment_points_map"] ?? "{}"),
    dailyIncomePointsRate: parseFloat(map["daily_income_points_rate"] ?? "5"),
  }
}

export async function savePointsConfig(cfg: PointsConfig): Promise<void> {
  await requireAdmin()
  const pairs: [string, string][] = [
    ["points_per_naira", String(cfg.pointsPerNaira)],
    ["referral_join_points", String(cfg.referralJoinPoints)],
    ["game_win_points_rate", String(cfg.gameWinPointsRate)],
    ["investment_default_points", String(cfg.investmentDefaultPoints)],
    ["investment_points_map", JSON.stringify(cfg.investmentPointsMap)],
    ["daily_income_points_rate", String(cfg.dailyIncomePointsRate)],
  ]
  for (const [key, value] of pairs) {
    await db
      .insert(siteSetting)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSetting.key, set: { value, updatedAt: new Date() } })
  }
}

// ─── Core award helper ─────────────────────────────────────────────────────────

/**
 * Award weekend salary points to a user.
 * Called internally by tasks, games, and investment purchase flows.
 * @param userId  target user id
 * @param points  positive integer
 * @param reason  short description for the transaction log
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
): Promise<void> {
  if (points <= 0) return

  // Upsert wallet row — ensure it exists before updating
  await db
    .insert(wallet)
    .values({ userId, weekendPoints: points })
    .onConflictDoUpdate({
      target: wallet.userId,
      set: {
        weekendPoints: sql`${wallet.weekendPoints} + ${points}`,
        updatedAt: new Date(),
      },
    })

  // Log as a transaction (type "points_earned")
  await db.insert(transaction).values({
    userId,
    type: "points_earned",
    amount: String(points),
    status: "completed",
    description: reason,
  })
}

// ─── User-facing query ─────────────────────────────────────────────────────────

export type UserPointsData = {
  points: number
  nairaEquivalent: number
  pointsPerNaira: number
  nextPayoutDay: string // "Saturday, July 12"
}

export async function getUserPoints(): Promise<UserPointsData> {
  const userId = await getUserId()

  const [row] = await db
    .select({ weekendPoints: wallet.weekendPoints })
    .from(wallet)
    .where(eq(wallet.userId, userId))

  const cfg = await getPointsConfig()
  const points = row?.weekendPoints ?? 0
  const nairaEquivalent = points * cfg.pointsPerNaira

  // Calculate next Saturday
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  const daysUntilSat = day === 6 ? 7 : (6 - day)
  const nextSat = new Date(now)
  nextSat.setDate(now.getDate() + daysUntilSat)
  const nextPayoutDay = nextSat.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return { points, nairaEquivalent, pointsPerNaira: cfg.pointsPerNaira, nextPayoutDay }
}

// ─── User: withdraw weekend points to wallet ───────────────────────────────────

export type UserWithdrawPointsResult = {
  ok: boolean
  points?: number
  naira?: number
  message: string
}

/**
 * User-triggered: convert their own weekend salary points to ₦ in their wallet.
 * Only allowed on Saturday (or if admin forces it).
 * Points are reset to 0 after conversion.
 */
export async function withdrawWeekendPoints(): Promise<UserWithdrawPointsResult> {
  const userId = await getUserId()

  const [row] = await db
    .select({ weekendPoints: wallet.weekendPoints })
    .from(wallet)
    .where(eq(wallet.userId, userId))

  const pts = row?.weekendPoints ?? 0
  if (pts <= 0) {
    return { ok: false, message: "You have no weekend salary points to withdraw." }
  }

  // Only allow on Saturdays (getDay() === 6)
  const today = new Date().getDay()
  if (today !== 6) {
    const daysLeft = today === 0 ? 7 : (6 - today)
    return {
      ok: false,
      message: `Weekend salary withdrawals are only available on Saturdays. ${daysLeft} day${daysLeft !== 1 ? "s" : ""} to go.`,
    }
  }

  const cfg = await getPointsConfig()
  const naira = pts * cfg.pointsPerNaira

  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${String(naira)}`,
      totalEarned: sql`${wallet.totalEarned} + ${String(naira)}`,
      weekendPoints: 0,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))

  await db.insert(transaction).values({
    userId,
    type: "weekend_salary",
    amount: String(naira),
    status: "completed",
    description: `Weekend salary: ${pts} pts × ₦${cfg.pointsPerNaira} = ₦${naira.toFixed(2)}`,
  })

  revalidatePath("/weekend-salary")
  revalidatePath("/dashboard")

  return { ok: true, points: pts, naira, message: `₦${naira.toLocaleString()} added to your wallet!` }
}

// ─── Admin: weekend payout (bulk run) ─────────────────────────────────────────

export type WeekendPayoutResult = {
  ok: boolean
  userCount: number
  totalPoints: number
  totalNaira: number
  message?: string
}

/**
 * Admin bulk trigger: convert ALL users' weekend_points to ₦.
 * This processes users who haven't withdrawn manually.
 * Only admins can call this.
 */
export async function processWeekendPayout(): Promise<WeekendPayoutResult> {
  await requireAdmin()

  const cfg = await getPointsConfig()

  // Fetch all wallets with points > 0
  const rows = await db
    .select({ userId: wallet.userId, weekendPoints: wallet.weekendPoints })
    .from(wallet)
    .where(sql`${wallet.weekendPoints} > 0`)

  if (rows.length === 0) {
    return { ok: true, userCount: 0, totalPoints: 0, totalNaira: 0, message: "No points to pay out." }
  }

  let totalPoints = 0
  let totalNaira = 0

  for (const row of rows) {
    const pts = row.weekendPoints ?? 0
    if (pts <= 0) continue
    const naira = pts * cfg.pointsPerNaira
    totalPoints += pts
    totalNaira += naira

    // Credit balance and reset points in one update
    await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${String(naira)}`,
        totalEarned: sql`${wallet.totalEarned} + ${String(naira)}`,
        weekendPoints: 0,
        updatedAt: new Date(),
      })
      .where(eq(wallet.userId, row.userId))

    // Log transaction
    await db.insert(transaction).values({
      userId: row.userId,
      type: "weekend_salary",
      amount: String(naira),
      status: "completed",
      description: `Weekend salary: ${pts} pts × ₦${cfg.pointsPerNaira} = ₦${naira.toFixed(2)}`,
    })
  }

  // Record payout run
  await db.insert(weekendPayout).values({
    userCount: rows.length,
    totalPoints,
    totalNaira: String(totalNaira.toFixed(2)),
    note: `Processed ${rows.length} users at ₦${cfg.pointsPerNaira}/pt`,
  })

  revalidatePath("/admin")
  revalidatePath("/dashboard")

  return { ok: true, userCount: rows.length, totalPoints, totalNaira }
}

// ─── Admin: points overview ────────────────────────────────────────────────────

export type PointsOverview = {
  totalUsers: number
  totalPoints: number
  estimatedPayout: number
  pointsPerNaira: number
  payoutHistory: Array<{
    id: number
    runAt: string
    userCount: number
    totalPoints: number
    totalNaira: number
    note: string | null
  }>
}

export async function getPointsOverview(): Promise<PointsOverview> {
  await requireAdmin()

  const cfg = await getPointsConfig()

  const [agg] = await db
    .select({
      totalUsers: sql<number>`count(*)::int`,
      totalPoints: sql<number>`coalesce(sum(${wallet.weekendPoints}),0)::int`,
    })
    .from(wallet)
    .where(sql`${wallet.weekendPoints} > 0`)

  const history = await db
    .select()
    .from(weekendPayout)
    .orderBy(desc(weekendPayout.runAt))
    .limit(10)

  return {
    totalUsers: agg?.totalUsers ?? 0,
    totalPoints: agg?.totalPoints ?? 0,
    estimatedPayout: (agg?.totalPoints ?? 0) * cfg.pointsPerNaira,
    pointsPerNaira: cfg.pointsPerNaira,
    payoutHistory: history.map((h) => ({
      id: h.id,
      runAt: h.runAt.toISOString(),
      userCount: h.userCount,
      totalPoints: h.totalPoints,
      totalNaira: Number(h.totalNaira),
      note: h.note,
    })),
  }
}
