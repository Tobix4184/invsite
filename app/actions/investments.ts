"use server"

import { db } from "@/lib/db"
import { investment, wallet, transaction, profile, referral } from "@/lib/db/schema"
import { PLANS, SITE } from "@/lib/plans"
import { getUserId } from "@/lib/session"
import { accrueIncomeForUser } from "@/lib/income-engine"
import { desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function buyPlan(planId: number) {
  const userId = await getUserId()
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return { ok: false, message: "Plan not found" }

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  const balance = Number(w?.balance ?? 0)
  if (balance < plan.price) {
    return { ok: false, message: "Insufficient balance. Please top up your account." }
  }

  // deduct price
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${plan.price}`, updatedAt: new Date() })
    .where(eq(wallet.userId, userId))

  await db.insert(investment).values({
    userId,
    planId: plan.id,
    planName: plan.name,
    price: String(plan.price),
    dailyEarning: String(plan.daily),
    totalEarning: String(plan.total),
    durationDays: plan.durationDays,
  })

  await db.insert(transaction).values({
    userId,
    type: "investment",
    amount: String(plan.price),
    description: `Purchased ${plan.name}`,
  })

  // pay referral commissions on the purchase amount
  await payReferralCommission(userId, plan.price)

  revalidatePath("/")
  revalidatePath("/products")
  return { ok: true, message: `${plan.name} activated! You'll earn daily for ${plan.durationDays} days.` }
}

async function payReferralCommission(buyerId: string, amount: number) {
  const refs = await db.select().from(referral).where(eq(referral.referredId, buyerId))
  for (const r of refs) {
    // Determine rate: promoters use their per-user override if set, else the
    // site-wide promoterLevel1 default. Normal users use referralLevel1/2.
    let rate = r.level === 1 ? SITE.referralLevel1 : SITE.referralLevel2
    if (r.level === 1) {
      const [referrerProfile] = await db.select().from(profile).where(eq(profile.userId, r.referrerId))
      if (referrerProfile?.isPromoter) {
        rate = referrerProfile.promoterCommission ?? SITE.promoterLevel1
      }
    }
    const commission = Math.round((amount * rate) / 100)
    if (commission <= 0) continue

    await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${commission}`,
        referralEarnings: sql`${wallet.referralEarnings} + ${commission}`,
        totalEarned: sql`${wallet.totalEarned} + ${commission}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.userId, r.referrerId))

    await db
      .update(referral)
      .set({ totalCommission: sql`${referral.totalCommission} + ${commission}` })
      .where(eq(referral.id, r.id))

    await db.insert(transaction).values({
      userId: r.referrerId,
      type: "referral",
      amount: String(commission),
      description: `Level ${r.level} referral commission (${rate}%)`,
    })
  }
}

export async function getInvestments() {
  const userId = await getUserId()
  await accrueIncomeForUser(userId)
  return db
    .select()
    .from(investment)
    .where(eq(investment.userId, userId))
    .orderBy(desc(investment.createdAt))
}
