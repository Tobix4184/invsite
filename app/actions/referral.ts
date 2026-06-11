"use server"

import { db } from "@/lib/db"
import {
  referral,
  referralMilestone,
  milestoneClaim,
  wallet,
  transaction,
  deposit,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, sql, and, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Returns the number of level-1 referrals that have made at least
 * one confirmed deposit. Only these count toward milestone rewards.
 */
async function countDepositedReferrals(userId: string): Promise<number> {
  const refs = await db
    .select({ referredId: referral.referredId })
    .from(referral)
    .where(and(eq(referral.referrerId, userId), eq(referral.level, 1)))

  if (refs.length === 0) return 0

  const referredIds = refs.map(r => r.referredId)

  const deposited = await db
    .select({ userId: deposit.userId })
    .from(deposit)
    .where(
      and(
        inArray(deposit.userId, referredIds),
        eq(deposit.status, "confirmed")
      )
    )

  // One user counts once regardless of how many deposits they made
  return new Set(deposited.map(d => d.userId)).size
}

export async function getAvailableMilestones() {
  const userId = await getUserId()

  // Only referrals who have completed a deposit count toward milestones
  const referralCount = await countDepositedReferrals(userId)

  const milestones = await db
    .select()
    .from(referralMilestone)
    .where(eq(referralMilestone.isActive, true))
    .orderBy(referralMilestone.referralCount)

  const claims = await db
    .select()
    .from(milestoneClaim)
    .where(eq(milestoneClaim.userId, userId))

  const claimedIds = new Set(claims.map(c => c.milestoneId))

  return {
    referralCount,
    milestones: milestones.map(m => ({
      id: m.id,
      referralCount: m.referralCount,
      rewardAmount: m.rewardAmount,
      canClaim: referralCount >= m.referralCount && !claimedIds.has(m.id),
      claimed: claimedIds.has(m.id),
    })),
  }
}

export async function claimMilestone(milestoneId: number) {
  const userId = await getUserId()
  
  // Get the milestone
  const [milestone] = await db
    .select()
    .from(referralMilestone)
    .where(and(eq(referralMilestone.id, milestoneId), eq(referralMilestone.isActive, true)))
  
  if (!milestone) {
    return { ok: false, message: "Milestone not found or inactive" }
  }
  
  // Check if already claimed
  const existingClaim = await db
    .select()
    .from(milestoneClaim)
    .where(and(eq(milestoneClaim.userId, userId), eq(milestoneClaim.milestoneId, milestoneId)))
  
  if (existingClaim.length > 0) {
    return { ok: false, message: "You have already claimed this milestone" }
  }
  
  // Only deposited referrals count toward milestone eligibility
  const referralCount = await countDepositedReferrals(userId)

  if (referralCount < milestone.referralCount) {
    return { ok: false, message: `You need ${milestone.referralCount} deposited referrals to claim this. You have ${referralCount}.` }
  }
  
  const rewardAmount = Number(milestone.rewardAmount)
  
  // Record the claim
  await db.insert(milestoneClaim).values({
    userId,
    milestoneId,
    referralCount: milestone.referralCount,
    rewardAmount: String(rewardAmount),
  })
  
  // Credit the user's wallet
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${rewardAmount}`,
      totalEarned: sql`${wallet.totalEarned} + ${rewardAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))
  
  // Record transaction
  await db.insert(transaction).values({
    userId,
    type: "bonus",
    amount: String(rewardAmount),
    description: `Referral milestone bonus (${milestone.referralCount} referrals)`,
  })
  
  revalidatePath("/team")
  revalidatePath("/dashboard")
  return { ok: true, message: `Congratulations! ₦${rewardAmount.toLocaleString()} bonus credited!` }
}
