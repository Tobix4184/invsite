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

  if (!acc.sabussPin) {
    return NextResponse.json({ ok: true, status: "no_api_key", message: "No Sabuss Transaction PIN set — contact admin" })
  }

  // Query Sabuss for recent transactions on this account
  let sabussData: Record<string, unknown> | null = null
  try {
    const res = await fetch(`https://sabuss.com/vtu/api/query/${acc.sabussApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "credit", pin: acc.sabussPin }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    try { sabussData = JSON.parse(text) } catch { /* not JSON */ }
  } catch {
    return NextResponse.json({ ok: true, status: "pending", message: "Could not reach Sabuss API" })
  }

  if (!sabussData) {
    return NextResponse.json({ ok: true, status: "pending", message: "Sabuss returned invalid response" })
  }

  const depositAmount = Math.round(Number(dep.amount))
  // Check both the exact amount AND fee-deducted amount (Sabuss charges ₦50)
  const expectedExact = depositAmount
  const expectedNet   = depositAmount - 50
  const createdAt = new Date(dep.createdAt)

  // Collect all transaction rows from any array in the response
  const rows: Record<string, unknown>[] = []
  for (const v of Object.values(sabussData)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === "object") rows.push(item as Record<string, unknown>)
      }
    }
  }

  let matchedTransaction: Record<string, unknown> | null = null

  for (const row of rows) {
    const rawAmt = row.amount ?? row.credit ?? row.value ?? row.credited_amount ?? row.transaction_amount ?? 0
    const rowAmount = Math.round(Number(rawAmt))
    const amountMatches = rowAmount === expectedExact || rowAmount === expectedNet
    if (!amountMatches) continue

    const rowDateRaw = row.date ?? row.created_at ?? row.transaction_date ?? row.time ?? null
    if (rowDateRaw) {
      const d = new Date(String(rowDateRaw))
      if (!isNaN(d.getTime()) && d < createdAt) continue
    }

    // Name check — only soft-block if sender clearly doesn't match
    if (dep.senderName && (row.sender || row.account_name)) {
      const stored = dep.senderName.toLowerCase()
      const incoming = String(row.sender ?? row.account_name ?? "").toLowerCase()
      const parts = stored.split(/\s+/)
      const nameOk = parts.some((p) => p.length > 1 && incoming.includes(p))
      if (!nameOk) {
        await db.update(deposit).set({ status: "needs_review" }).where(eq(deposit.reference, reference))
        return NextResponse.json({ ok: true, status: "needs_review", message: "Payment found but name mismatch — flagged for admin review" })
      }
    }
    matchedTransaction = row
    break
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
