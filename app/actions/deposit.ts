"use server"

import { db } from "@/lib/db"
import { deposit, wallet, transaction, bankAccount } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { eq, sql, desc, and } from "drizzle-orm"
import { getBoolSetting, getLiveDepositLimits, pickWeightedBankAccount, SETTING_KEYS } from "@/app/actions/settings"
import { revalidatePath } from "next/cache"

/**
 * Shared helper — credits a deposit, updates wallet, writes transaction record,
 * and updates bank account stats.
 * Called by the Paystack webhook and admin approve.
 * Referral commissions are NOT fired here — they fire once in investments.ts on first plan purchase.
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

  // NOTE: Referral commission is NOT fired here. It fires once in investments.ts
  // when the referred user purchases their first plan. This prevents double-paying.

  revalidatePath("/dashboard")
  revalidatePath("/admin")
  return { ok: true, message: `Deposit ₦${depositAmount.toLocaleString()} approved` }
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

/** Common validation used by both deposit methods. */
async function validateDepositRequest(amount: number) {
  if (await getBoolSetting(SETTING_KEYS.depositsPaused)) {
    return { ok: false as const, unavailable: true, message: "Service unavailable. Please try again later." }
  }
  const amt = Math.floor(Number(amount))
  const { minDeposit } = await getLiveDepositLimits()
  if (!amt || amt < minDeposit) {
    return { ok: false as const, message: `Minimum deposit is ₦${minDeposit.toLocaleString()}` }
  }
  return { ok: true as const, amt }
}

/**
 * Initiates a deposit via Paystack redirect (Initialize Transaction).
 * Returns a Paystack authorization_url — the client redirects the user there.
 * Paystack calls the webhook (charge.success) when the user completes payment.
 */
export async function startPaystackDeposit(amount: number) {
  const userId = await getUserId()
  const validation = await validateDepositRequest(amount)
  if (!validation.ok) return validation
  const { amt } = validation

  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) {
    return { ok: false as const, message: "Payment gateway not configured. Please contact support." }
  }

  const reference = `INCUM_${userId.slice(0, 8)}_${Date.now()}`
  const email = "alladstets@gmail.com"
  const callbackUrl = `${baseUrl()}/deposits/verify?reference=${reference}`

  let paystackData: Record<string, unknown> | null = null
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amt * 100, // kobo
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: { userId, cancel_action: `${baseUrl()}/deposits` },
      }),
      cache: "no-store",
    })
    paystackData = await res.json()
  } catch {
    return { ok: false as const, message: "Could not reach payment gateway. Please try again." }
  }

  if (!paystackData?.status || !paystackData?.data) {
    return { ok: false as const, message: (paystackData?.message as string) ?? "Payment gateway error. Please try again." }
  }

  const data = paystackData.data as Record<string, unknown>
  const authorizationUrl = data.authorization_url as string

  if (!authorizationUrl) {
    return { ok: false as const, message: "Could not generate payment link. Please try again." }
  }

  // Create a pending deposit record so we can credit it when webhook fires
  await db.insert(deposit).values({
    userId,
    amount: String(amt),
    reference,
    status: "pending",
    assignedBankName: "Paystack",
    assignedAccountNumber: null,
    assignedAccountName: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  })

  return { ok: true as const, authorizationUrl, reference }
}

/**
 * Initiates a deposit via IncumPay — assigns an admin bank account.
 * User transfers manually; admin approves from dashboard.
 */
export async function startIncumPayDeposit(amount: number) {
  const userId = await getUserId()
  const validation = await validateDepositRequest(amount)
  if (!validation.ok) return validation
  const { amt } = validation

  const adminAccount = await pickWeightedBankAccount()
  if (!adminAccount) {
    return { ok: false as const, message: "No bank accounts configured. Please contact support." }
  }

  const reference = `INCUM_${userId.slice(0, 8)}_${Date.now()}`

  await db.insert(deposit).values({
    userId,
    amount: String(amt),
    reference,
    status: "pending",
    assignedBankName: adminAccount.bankName,
    assignedAccountNumber: adminAccount.accountNumber,
    assignedAccountName: adminAccount.accountName,
    bankAccountId: adminAccount.id,
    // No expiresAt — admin approves manually, no timeout
  })

  return {
    ok: true as const,
    reference,
    bankAccount: {
      bankName: adminAccount.bankName,
      accountNumber: adminAccount.accountNumber,
      accountName: adminAccount.accountName,
    },
  }
}

/** @deprecated Use startPaystackDeposit or startIncumPayDeposit instead. */
export async function startDeposit(amount: number) {
  return startIncumPayDeposit(amount)
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
  if (!["pending", "processing", "needs_action"].includes(dep.status)) {
    return { ok: false, message: "Deposit cannot be rejected in current status" }
  }

  await db.update(deposit).set({ status: "failed" }).where(eq(deposit.reference, reference))
  return { ok: true, message: "Deposit rejected" }
}

/** User updates their sender name for a pending/processing/needs_action deposit */
export async function updateDepositSenderName(reference: string, senderName: string) {
  const userId = await getUserId()
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))

  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.userId !== userId) return { ok: false, message: "Not authorized" }
  if (!["pending", "processing", "needs_action"].includes(dep.status)) {
    return { ok: false, message: "Deposit already processed" }
  }

  await db
    .update(deposit)
    .set({ senderName: senderName.trim() })
    .where(eq(deposit.reference, reference))

  return { ok: true, message: "Sender name updated" }
}

/**
 * User reports a failed/expired deposit as an issue.
 * Sets status to "needs_action" so admin sees it as needing attention.
 */
export async function reportFailedDeposit(reference: string, senderName?: string) {
  const userId = await getUserId()
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))

  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.userId !== userId) return { ok: false, message: "Not authorized" }
  if (dep.status === "success" || dep.status === "approved") {
    return { ok: false, message: "This deposit was already approved." }
  }
  if (dep.status === "needs_action") {
    return { ok: true, message: "Already reported — admin will review shortly." }
  }

  await db
    .update(deposit)
    .set({
      status: "needs_action",
      ...(senderName ? { senderName: senderName.trim() } : {}),
    })
    .where(eq(deposit.reference, reference))

  return { ok: true, message: "Issue reported. Our team will review your deposit and respond shortly." }
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
