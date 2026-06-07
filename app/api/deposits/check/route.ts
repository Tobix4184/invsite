"use server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bankAccount, deposit, wallet, transaction } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { getSession } from "@/lib/session"

/**
 * GET /api/deposits/check?reference=IHH_xxx
 *
 * Called by the deposit page every 3 minutes to check if Sabuss has received
 * the payment. Uses the Sabuss Query/Fetch Transaction API:
 *   POST https://sabuss.com/vtu/api/query/{API_KEY}
 *   body: { reference: "..." }   (or fetches last transactions and scans them)
 *
 * Returns:
 *   { status: "approved" }  — payment found, wallet credited
 *   { status: "pending" }   — not found yet
 *   { status: "expired" }   — deposit expired, now cancelled
 *   { status: "no_api_key" } — account has no Sabuss key, manual only
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const reference = req.nextUrl.searchParams.get("reference")
  if (!reference) return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 })

  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (!dep || dep.userId !== userId) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }

  // Already resolved — no need to hit Sabuss at all
  if (dep.status === "success" || dep.status === "approved") {
    return NextResponse.json({ ok: true, status: "approved", message: "Deposit already confirmed" })
  }
  if (dep.status === "failed" || dep.status === "rejected") {
    return NextResponse.json({ ok: true, status: "cancelled" })
  }

  const now = new Date()

  // Auto-cancel if expired
  if (dep.expiresAt && now > new Date(dep.expiresAt)) {
    if (["pending", "processing"].includes(dep.status)) {
      await db.update(deposit).set({ status: "failed" }).where(eq(deposit.reference, reference))
    }
    return NextResponse.json({ ok: true, status: "expired" })
  }

  // If no Sabuss account assigned, can't poll
  if (!dep.bankAccountId) {
    return NextResponse.json({ ok: true, status: "no_api_key", message: "No account assigned" })
  }

  const [acc] = await db.select().from(bankAccount).where(eq(bankAccount.id, dep.bankAccountId))
  if (!acc?.sabussApiKey) {
    return NextResponse.json({ ok: true, status: "no_api_key", message: "Manual approval only — no Sabuss key on this account" })
  }

  // Query Sabuss for recent transactions on this account
  let sabussData: Record<string, unknown> | null = null
  try {
    const res = await fetch(`https://sabuss.com/vtu/api/query/${acc.sabussApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "credit" }),
      signal: AbortSignal.timeout(8000),
    })
    sabussData = await res.json()
  } catch {
    return NextResponse.json({ ok: true, status: "pending", message: "Could not reach Sabuss API" })
  }

  // Sabuss deducts a ₦50 platform fee on all transactions above ₦1,000.
  // So a user sending ₦3,000 will show as ₦2,950 in the Sabuss ledger.
  // We match against (depositAmount - 50) to account for this.
  const depositAmount = Math.round(Number(dep.amount))
  const expectedAmount = depositAmount - 50   // what Sabuss actually records
  const createdAt = new Date(dep.createdAt)

  let matchedTransaction: Record<string, unknown> | null = null

  const rows = Array.isArray(sabussData?.response)
    ? (sabussData.response as Record<string, unknown>[])
    : Array.isArray(sabussData?.data)
      ? (sabussData.data as Record<string, unknown>[])
      : null

  if (rows) {
    for (const row of rows) {
      const rowAmount = Math.round(Number(row.amount ?? row.credit ?? row.value ?? 0))
      const rowDate = row.date ? new Date(String(row.date)) : null
      if (rowAmount !== expectedAmount) continue
      if (rowDate && rowDate < createdAt) continue // transaction predates this deposit
      // Check sender name if we have one
      if (dep.senderName && row.sender) {
        const stored = dep.senderName.toLowerCase()
        const incoming = String(row.sender).toLowerCase()
        const parts = stored.split(/\s+/)
        const nameOk = parts.some((p) => incoming.includes(p) || p.includes(incoming.split(/\s+/)[0]))
        if (!nameOk) {
          // Name mismatch — flag for review, don't auto-approve
          await db.update(deposit).set({ status: "needs_review" }).where(eq(deposit.reference, reference))
          return NextResponse.json({ ok: true, status: "needs_review", message: "Payment found but name mismatch — flagged for admin review" })
        }
      }
      matchedTransaction = row
      break
    }
  }

  if (!matchedTransaction) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      message: "Payment not found yet — will check again in 3 minutes",
      checkedAt: new Date().toISOString(),
    })
  }

  // Found a match — auto-approve.
  // Always credit the full depositAmount the user intended, not the Sabuss net amount.
  await db.update(deposit).set({
    status: "success",
    senderName: dep.senderName ?? (matchedTransaction.sender ? String(matchedTransaction.sender) : dep.senderName),
  }).where(eq(deposit.reference, reference))

  await db.update(wallet).set({
    balance: sql`${wallet.balance} + ${depositAmount}`,
    totalDeposited: sql`${wallet.totalDeposited} + ${depositAmount}`,
    updatedAt: new Date(),
  }).where(eq(wallet.userId, userId))

  await db.insert(transaction).values({
    userId,
    type: "deposit",
    amount: String(depositAmount),
    status: "completed",
    reference,
    description: `Auto-approved via Sabuss poll. Sender: ${matchedTransaction.sender ?? "unknown"}`,
  })

  await db.update(bankAccount).set({
    totalDeposits: sql`${bankAccount.totalDeposits} + ${depositAmount}`,
    depositCount: sql`${bankAccount.depositCount} + 1`,
  }).where(eq(bankAccount.id, dep.bankAccountId))

  return NextResponse.json({ ok: true, status: "approved" })
}
