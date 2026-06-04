"use server"

import { db } from "@/lib/db"
import { deposit, wallet, transaction, user as userTable } from "@/lib/db/schema"
import { SITE } from "@/lib/plans"
import { getUserId } from "@/lib/session"
import { eq, sql } from "drizzle-orm"

function baseUrl() {
  return (
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL) ?? "http://localhost:3000"
  )
}

/** Submits a manual deposit request for admin approval. */
export async function startDeposit(amount: number) {
  const userId = await getUserId()
  const amt = Math.floor(Number(amount))
  if (!amt || amt < SITE.minDeposit) {
    return { ok: false, message: `Minimum deposit is ₦${SITE.minDeposit.toLocaleString()}` }
  }

  const reference = `IHH_${userId.slice(0, 8)}_${Date.now()}`
  await db.insert(deposit).values({
    userId,
    amount: String(amt),
    reference,
    status: "pending",
  })

  return {
    ok: true,
    message: `Deposit request submitted. Waiting for admin approval.`,
    reference,
  }
}

/** Admin approves a deposit and credits the wallet. */
export async function approveDeposit(reference: string) {
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (dep.status === "success") return { ok: true, message: "Already approved" }

  const amount = Number(dep.amount)
  await db.update(deposit).set({ status: "success" }).where(eq(deposit.reference, reference))

  // credit wallet
  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${amount}`,
      totalDeposited: sql`${wallet.totalDeposited} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, dep.userId))

  await db.insert(transaction).values({
    userId: dep.userId,
    type: "deposit",
    amount: String(amount),
    status: "completed",
    reference,
    description: `Deposit approved: ₦${amount.toLocaleString()}`,
  })

  return { ok: true, message: `Deposit ₦${amount.toLocaleString()} approved` }
}

/** Admin rejects a deposit. */
export async function rejectDeposit(reference: string) {
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep) return { ok: false, message: "Deposit not found" }
  if (["success", "failed"].includes(dep.status)) return { ok: true, message: "Already processed" }

  await db.update(deposit).set({ status: "failed" }).where(eq(deposit.reference, reference))
  return { ok: true, message: "Deposit rejected" }
}
