"use server"

import { db } from "@/lib/db"
import { wallet, withdrawal, transaction, giftCode, giftCodeRedemption, profile } from "@/lib/db/schema"
import { SITE, getNextWithdrawalTime, formatNextWithdrawalTime } from "@/lib/plans"
import { getSession, getUserId } from "@/lib/session"
import { getUserTier } from "@/lib/user-tier"
import { getBoolSetting, getLiveDepositLimits, getLiveWithdrawalCharge, SETTING_KEYS } from "@/app/actions/settings"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function requestWithdrawal(data: {
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  bankCode?: string
}) {
  const userId = await getUserId()
  const amount = Number(data.amount)

  // Check if this user is an admin — admins bypass all tier/day/pause restrictions
  const session = await getSession()
  const [userProfile] = await db.select({ role: profile.role }).from(profile).where(eq(profile.userId, userId))
  const isAdmin = userProfile?.role === "admin"

  // Respect global withdrawal pause — surface as a generic network error (not for admins)
  if (!isAdmin && await getBoolSetting(SETTING_KEYS.withdrawalsPaused)) {
    return { ok: false, message: "Network error. Please try again later." }
  }

  const { minWithdrawal } = await getLiveDepositLimits()
  if (!amount || amount < minWithdrawal) {
    return { ok: false, message: `Minimum withdrawal is ₦${minWithdrawal.toLocaleString()}` }
  }
  if (!data.bankName || !data.accountNumber || !data.accountName) {
    return { ok: false, message: "Please fill in your bank details" }
  }

  // Enforce active package requirement + 22-hour cooldown (skipped for admins)
  const tier = await getUserTier(userId)
  if (!isAdmin) {
    if (!tier) {
      return { ok: false, message: "You need an active package before you can withdraw." }
    }

    // Must have made at least one real deposit
    const [w0] = await db.select({ totalDeposited: wallet.totalDeposited }).from(wallet).where(eq(wallet.userId, userId))
    if (!w0 || Number(w0.totalDeposited ?? 0) <= 0) {
      return { ok: false, message: "You need to make a deposit before you can withdraw." }
    }

    // Enforce withdrawal window: 9:00 AM – 6:30 PM (Nigeria time, UTC+1)
    const now = new Date()
    const nigeriaOffset = 60 // UTC+1 in minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
    const nigeriaMinutes = (utcMinutes + nigeriaOffset) % (24 * 60)
    const openMinutes = 9 * 60      // 09:00
    const closeMinutes = 18 * 60 + 30 // 18:30
    if (nigeriaMinutes < openMinutes || nigeriaMinutes >= closeMinutes) {
      return {
        ok: false,
        message: "Withdrawals are open 9:00 AM – 6:30 PM (Nigerian time). Please come back during that window.",
      }
    }

    // Check 22-hour cooldown from the most recent withdrawal request
    const [lastWithdrawal] = await db
      .select({ createdAt: withdrawal.createdAt })
      .from(withdrawal)
      .where(eq(withdrawal.userId, userId))
      .orderBy(desc(withdrawal.createdAt))
      .limit(1)

    const nextTime = getNextWithdrawalTime(lastWithdrawal?.createdAt ?? null)
    if (nextTime) {
      return {
        ok: false,
        message: `Your next withdrawal is available ${formatNextWithdrawalTime(nextTime)}.`,
      }
    }
  }

  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId))
  const balance = Number(w?.balance ?? 0)
  if (balance < amount) {
    return { ok: false, message: "Insufficient balance" }
  }

  const chargePct = await getLiveWithdrawalCharge()
  const charge = Math.round((amount * chargePct) / 100)
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
    bankCode: data.bankCode ?? null,
    withdrawalTier: tier ?? "admin",
    status: "pending",
  })

  // Save bank details for next time (including bank code for auto-transfer)
  await db
    .update(profile)
    .set({
      savedBankName: data.bankName,
      savedAccountNumber: data.accountNumber,
      savedAccountName: data.accountName,
      savedBankCode: data.bankCode ?? null,
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
    savedBankCode: p.savedBankCode,
  }
}

export async function getUserWithdrawals() {
  const userId = await getUserId()
  return db
    .select()
    .from(withdrawal)
    .where(eq(withdrawal.userId, userId))
    .orderBy(desc(withdrawal.createdAt))
    .limit(20)
}

// ── Bank name verification via Paystack ──────────────────────────────────────

/**
 * Resolves an account holder name using Paystack's bank/resolve endpoint.
 * @param accountNumber - 10-digit NUBAN account number
 * @param bankCode      - Paystack bank code (from /api/banks)
 */
export async function lookupBankAccountName(
  accountNumber: string,
  bankCode: string,
): Promise<{ ok: boolean; accountName?: string; message?: string }> {
  if (!bankCode) return { ok: false, message: "Select a bank first." }
  if (accountNumber.length !== 10) return { ok: false, message: "Enter a 10-digit account number first." }

  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) {
    return { ok: false, message: "Auto-verify not available. Enter your account name below." }
  }

  try {
    const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${paystackKey}`, Accept: "application/json" },
      cache: "no-store",
    })
    const data = await res.json()
    if (!res.ok || !data?.status) {
      return { ok: false, message: data?.message ?? "Account not found. Enter name manually." }
    }
    const name: string | undefined = data?.data?.account_name
    if (!name) return { ok: false, message: "Could not fetch name. Enter manually." }
    return { ok: true, accountName: name }
  } catch {
    return { ok: false, message: "Verification failed. Enter your account name below." }
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
