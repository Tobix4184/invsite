import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bankAccount, deposit } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { creditApprovedDeposit } from "@/app/actions/deposit"

/**
 * POST /api/webhooks/sabuss
 *
 * Sabuss fires this whenever money lands in a linked account.
 * Set this URL in each Sabuss account profile:
 *   https://ipoco.xyz/api/webhooks/sabuss
 *
 * Expected payload:
 * {
 *   "api_key":   "<your api key>",
 *   "amount":    "5000",          // credited amount in Naira (string)
 *   "sender":    "John Doe",      // sender name from bank transfer
 *   "reference": "...",           // Sabuss transaction reference
 *   "type":      "credit",
 *   "date":      "2026-06-06 22:00:00",
 *   "balance":   "7950.37"
 * }
 *
 * Matching logic:
 * 1. Find the bank_account row whose sabussApiKey matches api_key
 * 2. Find pending deposit for that account matching the amount
 *    (exact, or gross before ₦50 fee, or before ₦100 fee)
 * 3. If sender name on file — soft-check at least one word matches
 * 4. Pass  → auto-approve via creditApprovedDeposit()
 * 5. Name mismatch → flag as "needs_review" so admin can confirm
 * 6. No match → store as "unmatched" so admin sees the inbound credit
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { api_key, amount, sender, reference: sabussRef, type } = body

  // Only process credit notifications
  if (type && type !== "credit") {
    return NextResponse.json({ ok: true, skipped: "not a credit" })
  }

  if (!api_key || !amount) {
    return NextResponse.json({ ok: false, error: "Missing api_key or amount" }, { status: 400 })
  }

  const incoming = Math.round(parseFloat(amount))
  if (isNaN(incoming) || incoming <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
  }

  // 1. Find the bank account by api_key
  const [matchedAccount] = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.sabussApiKey, api_key))

  if (!matchedAccount) {
    return NextResponse.json({ ok: true, skipped: "unknown api_key" })
  }

  const now = new Date()

  // 2. Find all non-expired pending deposits for this bank account
  const allPending = await db
    .select()
    .from(deposit)
    .where(eq(deposit.bankAccountId, matchedAccount.id))

  const candidates = allPending.filter((d) => {
    if (!["pending", "processing"].includes(d.status)) return false
    if (d.expiresAt) {
      // 30-minute grace window after expiry
      const grace = new Date(d.expiresAt)
      grace.setMinutes(grace.getMinutes() + 30)
      if (now >= grace) return false
    }
    const depAmt = Math.round(Number(d.amount))
    // Accept exact amount, or if Sabuss deducted ₦50 or ₦100 fee
    return depAmt === incoming || depAmt === incoming + 50 || depAmt === incoming + 100
  })

  if (candidates.length === 0) {
    // Store as unmatched so admin sees the inbound credit
    const unmatchedRef = `SABUSS_UNMATCHED_${sabussRef ?? Date.now()}`
    try {
      await db.insert(deposit).values({
        userId: "UNMATCHED",
        amount: String(incoming),
        reference: unmatchedRef,
        status: "unmatched",
        bankAccountId: matchedAccount.id,
        assignedBankName: matchedAccount.bankName,
        assignedAccountNumber: matchedAccount.accountNumber,
        assignedAccountName: matchedAccount.accountName,
        senderName: sender ?? null,
      })
    } catch {
      // ignore duplicate insert errors
    }
    return NextResponse.json({ ok: true, status: "no_matching_deposit" })
  }

  // 3. Pick the best match — prefer one where sender name matches
  let chosen = candidates[0]

  if (sender && candidates.length > 1) {
    const senderLower = sender.toLowerCase()
    const withName = candidates.find((d) => {
      if (!d.senderName) return false
      const parts = d.senderName.toLowerCase().split(/\s+/)
      const inParts = senderLower.split(/\s+/)
      return parts.some((p) => inParts.some((q) => p === q || p.startsWith(q) || q.startsWith(p)))
    })
    if (withName) chosen = withName
  }

  // 4. Soft sender-name check
  const senderMatches = (() => {
    if (!chosen.senderName || !sender) return true // no name on file — let it pass
    const stored = chosen.senderName.toLowerCase().split(/\s+/)
    const incoming = sender.toLowerCase().split(/\s+/)
    return stored.some((p) => incoming.some((q) => p === q || p.startsWith(q) || q.startsWith(p)))
  })()

  if (!senderMatches) {
    // Name mismatch — flag for review but don't reject
    await db
      .update(deposit)
      .set({
        status: "needs_review",
        senderName: sender ?? chosen.senderName,
        sabussRef: sabussRef ?? null,
      })
      .where(eq(deposit.reference, chosen.reference))
    return NextResponse.json({ ok: true, status: "flagged_for_review", reference: chosen.reference })
  }

  // 5. Auto-approve via shared helper
  const result = await creditApprovedDeposit({
    reference: chosen.reference,
    senderNameFromWebhook: sender ?? null,
    sabussRef: sabussRef ?? null,
    source: "webhook",
  })

  return NextResponse.json({ ok: result.ok, status: result.ok ? "approved" : "error", reference: chosen.reference })
}
