"use server"

import { db } from "@/lib/db"
import {
  referral,
  referralMilestone,
  milestoneClaim,
  wallet,
  transaction,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, sql, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getAvailableMilestones() {
  const userId = await getUserId()
  
  // Get user's level 1 referral count
  const referrals = await db
    .select()
    .from(referral)
    .where(and(eq(referral.referrerId, userId), eq(referral.level, 1)))
  const referralCount = referrals.length
  
  // Get all active milestones
  const milestones = await db
    .select()
    .from(referralMilestone)
    .where(eq(referralMilestone.isActive, true))
    .orderBy(referralMilestone.referralCount)
  
  // Get user's claimed milestones
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
  
  // Get user's referral count
  const referrals = await db
    .select()
    .from(referral)
    .where(and(eq(referral.referrerId, userId), eq(referral.level, 1)))
  const referralCount = referrals.length
  
  if (referralCount < milestone.referralCount) {
    return { ok: false, message: `You need ${milestone.referralCount} referrals to claim this. You have ${referralCount}.` }
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
