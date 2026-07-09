"use server"

import { db } from "@/lib/db"
import { deposit, wallet, transaction, bankAccount, referral, profile } from "@/lib/db/schema"
import { SITE } from "@/lib/plans"
import { getUserId } from "@/lib/session"
import { eq, sql, desc, and } from "drizzle-orm"
import { getBoolSetting, getLiveDepositLimits, pickWeightedBankAccount, SETTING_KEYS } from "@/app/actions/settings"
import { revalidatePath } from "next/cache"

/**
 * Shared helper — credits a deposit, updates wallet, writes transaction record,
 * updates bank account stats, and fires referral commission on first deposit.
 * Called by the Sabuss webhook, the Sabuss poll (check route), and admin approve.
 */
export async function creditApprovedDeposit({
  reference,
  senderNameFromWebhook,
  sabussRef,
  source,
}: {
  reference: string
  senderNameFromWebhook?: string | null
  sabussRef?: string | null
  source: "webhook" | "poll" | "admin"
}) {
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.status === "success") return { ok: true, message: "Already approved" }

  const depositAmount = Math.round(Number(dep.amount))

  // Mark deposit as approved
  await db
    .update(deposit)
    .set({
      status: "success",
      senderName: senderNameFromWebhook ?? dep.senderName,
      ...(sabussRef ? { sabussRef } : {}),
    })
    .where(eq(deposit.reference, reference))

  // Credit wallet
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${depositAmount}`,
      totalDeposited: sql`${wallet.totalDeposited} + ${depositAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, dep.userId))

  // Write transaction record
  await db.insert(transaction).values({
    userId: dep.userId,
    type: "deposit",
    amount: String(depositAmount),
    status: "completed",
    reference,
    description: `Deposit approved (${source}). Sender: ${senderNameFromWebhook ?? dep.senderName ?? "unknown"}`,
  })

  // Update bank account stats
  if (dep.bankAccountId) {
    await db
      .update(bankAccount)
      .set({
        totalDeposits: sql`${bankAccount.totalDeposits} + ${depositAmount}`,
        depositCount: sql`${bankAccount.depositCount} + 1`,
      })
      .where(eq(bankAccount.id, dep.bankAccountId))
  }

  // Fire referral commission on FIRST successful deposit
  const userDeposits = await db
    .select()
    .from(deposit)
    .where(and(eq(deposit.userId, dep.userId), eq(deposit.status, "success")))
  const isFirstDeposit = userDeposits.length === 1 // we just inserted success so count is 1

  if (isFirstDeposit) {
    await payDepositReferralCommission(dep.userId, depositAmount)
  }

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  return { ok: true, message: `Deposit ₦${depositAmount.toLocaleString()} approved` }
}

/** Pay referral commission when a user makes their first deposit */
async function payDepositReferralCommission(userId: string, amount: number) {
  const refs = await db.select().from(referral).where(eq(referral.referredId, userId))
  for (const r of refs) {
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
      description: `Level ${r.level} referral commission on first deposit (${rate}%)`,
    })
  }
}

function baseUrl() {
  return (
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL) ?? "http://localhost:3000"
  )
}

/** Initiates a deposit via Paystack bank transfer (virtual account). */
export async function startDeposit(amount: number) {
  const userId = await getUserId()

  if (await getBoolSetting(SETTING_KEYS.depositsPaused)) {
    return { ok: false, unavailable: true, message: "Service unavailable. Please try again later." }
  }

  const amt = Math.floor(Number(amount))
  const { minDeposit } = await getLiveDepositLimits()
  if (!amt || amt < minDeposit) {
    return { ok: false, message: `Minimum deposit is ₦${minDeposit.toLocaleString()}` }
  }

  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) {
    return { ok: false, message: "Payment gateway not configured. Please contact support." }
  }

  // Paystack requires a valid email — use the platform owner's verified Gmail
  const email = "alladstets@gmail.com"

  const reference = `INCUM_${userId.slice(0, 8)}_${Date.now()}`

  // Call Paystack charge API — bank_transfer channel generates a virtual account
  let paystackData: Record<string, unknown> | null = null
  try {
    const res = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amt * 100, // Paystack uses kobo (1 NGN = 100 kobo)
        currency: "NGN",
        reference,
        bank_transfer: {
          account_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      }),
      cache: "no-store",
    })
    paystackData = await res.json()
  } catch {
    return { ok: false, message: "Could not reach payment gateway. Please try again." }
  }

  if (!paystackData?.status || !paystackData?.data) {
    return {
      ok: false,
      message: (paystackData?.message as string) ?? "Payment gateway error. Please try again.",
    }
  }

  const data = paystackData.data as Record<string, unknown>

  // Paystack returns virtual account details at the top level of data:
  // { account_name, account_number, bank: { name }, account_expires_at, ... }
  const bankObj = (data.bank ?? {}) as Record<string, unknown>
  const bankName: string = (bankObj.name as string) ?? "Paystack-Titan"
  const accountNumber: string = (data.account_number as string) ?? ""
  const accountName: string = (data.account_name as string) ?? "247 Incum"

  if (!accountNumber) {
    return { ok: false, message: "Could not generate virtual account. Please try again." }
  }

  // Use Paystack's actual expiry or fall back to 30 minutes
  const expiresAt = data.account_expires_at
    ? new Date(data.account_expires_at as string)
    : new Date(Date.now() + 30 * 60 * 1000)

  await db.insert(deposit).values({
    userId,
    amount: String(amt),
    reference,
    status: "pending",
    assignedBankName: bankName,
    assignedAccountNumber: accountNumber,
    assignedAccountName: accountName,
    expiresAt,
  })

  return {
    ok: true,
    reference,
    bankAccount: { bankName, accountNumber, accountName },
    expiresAt: expiresAt.toISOString(),
  }
}

/** Admin approves a deposit and credits the wallet. */
export async function approveDeposit(reference: string) {
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (!["pending", "processing", "needs_review"].includes(dep.status)) {
    return { ok: false, message: "Deposit cannot be approved in current status" }
  }
  return creditApprovedDeposit({ reference, source: "admin" })
}

/** Admin rejects a deposit. */
export async function rejectDeposit(reference: string) {
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (["success", "failed"].includes(dep.status)) return { ok: true, message: "Already processed" }
  if (!["pending", "processing"].includes(dep.status)) {
    return { ok: false, message: "Deposit cannot be rejected in current status" }
  }

  await db.update(deposit).set({ status: "failed" }).where(eq(deposit.reference, reference))
  return { ok: true, message: "Deposit rejected" }
}

/** User updates their sender name for a pending deposit */
export async function updateDepositSenderName(reference: string, senderName: string) {
  const userId = await getUserId()
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.userId !== userId) return { ok: false, message: "Not authorized" }
  if (dep.status !== "pending") return { ok: false, message: "Deposit already processed" }
  
  await db
    .update(deposit)
    .set({ senderName: senderName.trim() })
    .where(eq(deposit.reference, reference))
  
  return { ok: true, message: "Sender name updated" }
}

/** Get user's pending deposit by reference */
export async function getDepositByReference(reference: string) {
  const userId = await getUserId()
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  
  if (!dep) return null
  if (dep.userId !== userId) return null
  
  return dep
}

/** Get all user's deposits */
export async function getUserDeposits() {
  const userId = await getUserId()
  return db
    .select()
    .from(deposit)
    .where(eq(deposit.userId, userId))
    .orderBy(desc(deposit.createdAt))
}

/** Get user's pending deposits (not expired) */
export async function getPendingDeposits() {
  const userId = await getUserId()
  const now = new Date()
  
  const deposits = await db
    .select()
    .from(deposit)
    .where(
      and(
        eq(deposit.userId, userId),
        eq(deposit.status, "pending")
      )
    )
    .orderBy(desc(deposit.createdAt))
  
  // Filter out expired deposits (but keep recent ones within 15 min grace period)
  return deposits.filter(dep => {
    if (!dep.expiresAt) return true
    const expiryWithGrace = new Date(dep.expiresAt)
    expiryWithGrace.setMinutes(expiryWithGrace.getMinutes() + 15) // 15 min grace period
    return now < expiryWithGrace
  })
}

/** Mark a deposit as "waiting" (user confirmed they made payment) */
export async function markDepositAsPaid(reference: string) {
  const userId = await getUserId()
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.userId !== userId) return { ok: false, message: "Not authorized" }
  if (dep.status !== "pending") return { ok: false, message: "Deposit already processed" }
  
  await db
    .update(deposit)
    .set({ status: "processing" })
    .where(eq(deposit.reference, reference))
  
  return { ok: true, message: "Payment marked as complete. Processing..." }
}
