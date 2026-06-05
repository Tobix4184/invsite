"use server"

import { db } from "@/lib/db"
import { wallet, withdrawal, transaction, giftCode, giftCodeRedemption, profile } from "@/lib/db/schema"
import { SITE } from "@/lib/plans"
import { getUserId } from "@/lib/session"
import { getBoolSetting, SETTING_KEYS } from "@/app/actions/settings"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function requestWithdrawal(data: {
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
}) {
  const userId = await getUserId()
  const amount = Number(data.amount)

  // Respect global withdrawal pause
  if (await getBoolSetting(SETTING_KEYS.withdrawalsPaused)) {
    return { ok: false, message: "Withdrawals are temporarily unavailable. Please check back later." }
  }

  if (!amount || amount < SITE.minWithdrawal) {
    return { ok: false, message: `Minimum withdrawal is ₦${SITE.minWithdrawal.toLocaleString()}` }
  }
  if (!data.bankName || !data.accountNumber || !data.accountName) {
    return { ok: false, message: "Please fill in your bank details" }
  }

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  const balance = Number(w?.balance ?? 0)
  if (balance < amount) {
    return { ok: false, message: "Insufficient balance" }
  }

  const charge = Math.round((amount * SITE.withdrawalCharge) / 100)
  const net = amount - charge

  // hold the funds immediately
  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}`, updatedAt: new Date() })
    .where(eq(wallet.userId, userId))

  await db.insert(withdrawal).values({
    userId,
    amount: String(amount),
    charge: String(charge),
    netAmount: String(net),
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountName: data.accountName,
    status: "pending",
  })

  // Save bank details for next time
  await db
    .update(profile)
    .set({
      savedBankName: data.bankName,
      savedAccountNumber: data.accountNumber,
      savedAccountName: data.accountName,
    })
    .where(eq(profile.userId, userId))

  await db.insert(transaction).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    status: "pending",
    description: `Withdrawal request (₦${charge.toLocaleString()} fee, ₦${net.toLocaleString()} net)`,
  })

  revalidatePath("/")
  revalidatePath("/withdraw")
  return {
    ok: true,
    message: `Withdrawal of ₦${amount.toLocaleString()} submitted. You'll receive ₦${net.toLocaleString()} after approval.`,
  }
}

export async function getSavedBankDetails() {
  const userId = await getUserId()
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId))
  if (!p) return null
  return {
    savedBankName: p.savedBankName,
    savedAccountNumber: p.savedAccountNumber,
    savedAccountName: p.savedAccountName,
  }
}

export async function redeemGiftCode(code: string) {
  const userId = await getUserId()
  const clean = code.trim().toUpperCase()
  if (!clean) return { ok: false, message: "Enter a gift code" }

  const [gc] = await db.select().from(giftCode).where(eq(giftCode.code, clean))
  if (!gc || !gc.active) return { ok: false, message: "Invalid or expired gift code" }
  if (gc.uses >= gc.maxUses) return { ok: false, message: "This gift code has been fully used" }

  // prevent double redemption by same user
  const prior = await db
    .select()
    .from(giftCodeRedemption)
    .where(and(eq(giftCodeRedemption.userId, userId), eq(giftCodeRedemption.giftCodeId, gc.id)))
  if (prior.length > 0) return { ok: false, message: "You already redeemed this code" }

  const amount = Number(gc.amount)
  await db.update(giftCode).set({ uses: sql`${giftCode.uses} + 1` }).where(eq(giftCode.id, gc.id))
  await db.insert(giftCodeRedemption).values({
    userId,
    giftCodeId: gc.id,
    code: clean,
    amount: String(amount),
  })
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${amount}`,
      totalEarned: sql`${wallet.totalEarned} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, userId))
  await db.insert(transaction).values({
    userId,
    type: "bonus",
    amount: String(amount),
    description: `Gift code redeemed: ${clean}`,
  })

  revalidatePath("/")
  return { ok: true, message: `You received ₦${amount.toLocaleString()} from gift code!` }
}
