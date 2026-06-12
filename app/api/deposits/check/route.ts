import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bankAccount, deposit } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/session"
import { creditApprovedDeposit } from "@/app/actions/deposit"

/**
 * GET /api/deposits/check?reference=POCO_xxx
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
    return NextResponse.json({ ok: true, status: "no_api_key", message: "No Sabuss PIN set — contact admin" })
  }

  // Query Sabuss without a reference — returns all recent transactions.
  // We then match by amount + sender name (Sabuss references are internal and
  // cannot be used for lookup from our side).
  const depositAmount = Math.round(Number(dep.amount))
  const createdAt = new Date(dep.createdAt)

  let sabussData: Record<string, unknown> | null = null
  try {
    const formBody = new URLSearchParams()
    formBody.append("pin", acc.sabussPin)
    const res = await fetch(`https://sabuss.com/vtu/api/query/${acc.sabussApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
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

  if (String(sabussData.status ?? "").toLowerCase() === "error") {
    return NextResponse.json({ ok: true, status: "pending", message: "Sabuss API error — will retry" })
  }

  // Collect all transaction rows
  const rows: Record<string, unknown>[] = []
  for (const v of Object.values(sabussData)) {
    if (Array.isArray(v)) rows.push(...(v as Record<string, unknown>[]).filter(Boolean))
  }
  if (rows.length === 0 && sabussData.response) {
    if (Array.isArray(sabussData.response)) rows.push(...(sabussData.response as Record<string, unknown>[]))
    else if (typeof sabussData.response === "object") rows.push(sabussData.response as Record<string, unknown>)
  }

  // Match by amount (exact or minus ₦50 fee) + sender name + not before deposit creation
  const expectedNet = depositAmount - 50
  let matchedTransaction: Record<string, unknown> | null = null

  for (const row of rows) {
    const rowAmt = Math.round(Number(row.amount ?? row.credit ?? row.value ?? row.credited_amount ?? 0))
    if (rowAmt !== depositAmount && rowAmt !== expectedNet) continue

    const senderFields = [row.sender, row.account_name, row.narration, row.name].filter(Boolean).join(" ").toLowerCase()
    if (dep.senderName && senderFields) {
      const parts = dep.senderName.toLowerCase().split(/\s+/).filter((p) => p.length > 1)
      const nameMatch = parts.some((p) => senderFields.includes(p))
      if (!nameMatch) continue
    }

    const rowDate = row.date ?? row.created_at ?? row.transaction_date ?? row.time ?? null
    if (rowDate) {
      const d = new Date(String(rowDate))
      if (!isNaN(d.getTime()) && d < createdAt) continue
    }

    matchedTransaction = row
    break
  }

  if (!matchedTransaction) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      message: "Payment not found yet — will check again shortly",
      checkedAt: new Date().toISOString(),
    })
  }

  // Found a match — auto-approve via shared helper
  const senderFromPoll = matchedTransaction.sender ? String(matchedTransaction.sender) : null
  await creditApprovedDeposit({
    reference,
    senderNameFromWebhook: senderFromPoll,
    source: "poll",
  })

  return NextResponse.json({ ok: true, status: "approved" })
}
