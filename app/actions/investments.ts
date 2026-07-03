"use server"

import { db } from "@/lib/db"
import { investment, wallet, transaction, profile, referral, promo, promoRedemption } from "@/lib/db/schema"
import { PLANS, SITE, getDailyEarning, getTotalEarning } from "@/lib/plans"
import { getUserId } from "@/lib/session"
import { accrueIncomeForUser } from "@/lib/income-engine"
import { and, desc, eq, sql } from "drizzle-orm"
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

  const daily = getDailyEarning(plan)
  const total = getTotalEarning(plan)

  // Is this the user's first-ever package purchase? (for first-purchase-only promos)
  const [{ count: priorCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(investment)
    .where(eq(investment.userId, userId))
  const isFirstPurchase = Number(priorCount) === 0

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
    dailyEarning: String(daily),
    totalEarning: String(total),
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

  // apply any qualifying promo cashback
  const promoBonus = await applyPromo(userId, plan.price, isFirstPurchase)

  revalidatePath("/")
  revalidatePath("/products")
  const bonusMsg = promoBonus > 0 ? ` Plus ₦${promoBonus.toLocaleString()} promo cashback credited!` : ""
  return {
    ok: true,
    message: `${plan.name} activated! You'll earn daily for ${plan.durationDays} days.${bonusMsg}`,
  }
}

/**
 * Applies the best active promo the purchase qualifies for and credits cashback.
 * Returns the bonus amount credited (0 if none).
 */
async function applyPromo(userId: string, price: number, isFirstPurchase: boolean): Promise<number> {
  const now = new Date()
  const promos = await db.select().from(promo).where(eq(promo.isActive, true))

  // Choose the highest-value promo this purchase qualifies for
  let best: { id: number; bonus: number } | null = null
  for (const pr of promos) {
    if (pr.startsAt && now < pr.startsAt) continue
    if (pr.endsAt && now > pr.endsAt) continue
    if (pr.maxRedemptions != null && pr.redemptions >= pr.maxRedemptions) continue
    if (pr.conditionType === "min_package_price" && price < Number(pr.conditionValue)) continue

    // First-purchase-only promos require this to be the user's first package
    if (pr.firstPurchaseOnly) {
      if (!isFirstPurchase) continue
      const [{ promoClaimed }] = await db
        .select({ promoClaimed: profile.promoClaimed })
        .from(profile)
        .where(eq(profile.userId, userId))
      if (promoClaimed) continue
    } else {
      // Non-first-purchase promos: one redemption per user per promo
      const prior = await db
        .select({ id: promoRedemption.id })
        .from(promoRedemption)
        .where(and(eq(promoRedemption.userId, userId), eq(promoRedemption.promoId, pr.id)))
      if (prior.length > 0) continue
    }

    const bonus =
      pr.bonusType === "percent"
        ? Math.round((price * Number(pr.bonusValue)) / 100)
        : Math.round(Number(pr.bonusValue))
    if (bonus <= 0) continue
    if (!best || bonus > best.bonus) best = { id: pr.id, bonus }
  }

  if (!best) return 0

  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${best.bonus}`,
      totalEarned: sql`${wallet.totalEarned} + ${best.bonus}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))

  await db.insert(promoRedemption).values({
    userId,
    promoId: best.id,
    amount: String(best.bonus),
  })
  await db.update(promo).set({ redemptions: sql`${promo.redemptions} + 1` }).where(eq(promo.id, best.id))
  await db.update(profile).set({ promoClaimed: true }).where(eq(profile.userId, userId))

  await db.insert(transaction).values({
    userId,
    type: "bonus",
    amount: String(best.bonus),
    description: `Promo cashback`,
  })

  return best.bonus
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
    .where(
      and(
        eq(investment.userId, userId),
        // Never show cancelled or admin-deleted investments to the user
        sql`${investment.status} NOT IN ('cancelled', 'deleted')`
      )
    )
    .orderBy(desc(investment.createdAt))
}
