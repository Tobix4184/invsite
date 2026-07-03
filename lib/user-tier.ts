import { db } from "@/lib/db"
import { investment, profile } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import {
  bestTier,
  getPlanById,
  WITHDRAWAL_TIERS,
  type WithdrawalTier,
} from "@/lib/plans"

/**
 * Resolve a user's withdrawal tier.
 * 1. If admin set an override on the profile, use it.
 * 2. Otherwise derive the highest tier from the user's active packages.
 * Returns null if the user has no qualifying active package and no override.
 */
export async function getUserTier(userId: string): Promise<WithdrawalTier | null> {
  const [p] = await db
    .select({ override: profile.withdrawalTierOverride })
    .from(profile)
    .where(eq(profile.userId, userId))

  if (p?.override === "tier1" || p?.override === "tier2" || p?.override === "tier3") {
    return p.override
  }

  const rows = await db
    .select({ planId: investment.planId })
    .from(investment)
    .where(and(eq(investment.userId, userId), eq(investment.status, "active")))

  const tiers: WithdrawalTier[] = []
  for (const r of rows) {
    const plan = getPlanById(r.planId)
    if (plan) tiers.push(plan.withdrawalTier)
  }
  return bestTier(tiers)
}

export function tierInfo(tier: WithdrawalTier | null) {
  if (!tier) return null
  return { key: tier, ...WITHDRAWAL_TIERS[tier] }
}
