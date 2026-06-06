import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bankAccount, deposit, wallet, transaction } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * Sabuss Webhook Handler
 * ─────────────────────
 * Sabuss POSTs a JSON payload to this URL whenever money lands in
 * a bank account linked to one of your Sabuss VTU accounts.
 *
 * Set this URL in each Sabuss account profile:
 *   https://ihh.incumb.fun/api/webhooks/sabuss
 *
 * Expected payload shape (from Sabuss docs):
 * {
 *   "api_key": "<your api key>",        // identifies which account received the payment
 *   "amount": "5000",                   // amount credited in Naira (string)
 *   "sender": "John Doe",               // sender name as it appears on the transfer
 *   "reference": "...",                 // Sabuss transaction reference
 *   "type": "credit",                   // "credit" | "debit"
 *   "date": "2026-06-06 22:00:00",      // date/time of the transaction
 *   "balance": "7950.37"                // new Sabuss wallet balance
 * }
 *
 * Matching logic:
 * 1. Find the bank_account row whose sabussApiKey matches the incoming api_key
 * 2. Find a pending deposit assigned to that bank account with:
 *    a. Matching amount (exact)
 *    b. Not yet expired
 *    c. Status = "pending" or "processing"
 * 3. If sender name is on file, check it partially matches (first or last name)
 * 4. If all checks pass → auto-approve (credit wallet, mark deposit success)
 * 5. If amount matches but name check fails → flag as "needs_review" for admin
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
    // Unknown api_key — not one of our accounts, ignore silently
    return NextResponse.json({ ok: true, skipped: "unknown api_key" })
  }

  const now = new Date()

  // 2. Find all pending deposits for this bank account with matching amount
  const candidates = await db
    .select()
    .from(deposit)
    .where(
      and(
        eq(deposit.bankAccountId, matchedAccount.id),
        eq(deposit.amount, String(incoming))
      )
    )

  const pending = candidates.filter((d) => {
    if (!["pending", "processing"].includes(d.status)) return false
    if (!d.expiresAt) return true
    // Allow 30 min grace after official expiry
    const grace = new Date(d.expiresAt)
    grace.setMinutes(grace.getMinutes() + 30)
    return now < grace
  })

  if (pending.length === 0) {
    // No matching pending deposit — could be a manual transfer or duplicate
    // Record as an unmatched webhook for admin visibility (using a sentinel reference)
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
  let chosen = pending[0]

  if (sender && pending.length > 1) {
    const senderLower = sender.toLowerCase()
    const withName = pending.find((d) => {
      if (!d.senderName) return false
      const parts = d.senderName.toLowerCase().split(/\s+/)
      return parts.some((p) => senderLower.includes(p) || p.includes(senderLower.split(/\s+/)[0]))
    })
    if (withName) chosen = withName
  }

  // 4. If sender name is on record, do a soft check
  const senderMatches = (() => {
    if (!chosen.senderName || !sender) return true // no name to check, let it pass
    const stored = chosen.senderName.toLowerCase()
    const incoming = sender.toLowerCase()
    const storedParts = stored.split(/\s+/)
    const incomingParts = incoming.split(/\s+/)
    // At least one word must overlap
    return storedParts.some((p) => incomingParts.some((q) => p === q || p.startsWith(q) || q.startsWith(p)))
  })()

  if (!senderMatches) {
    // Name mismatch — flag for manual review but don't auto-reject
    await db
      .update(deposit)
      .set({ status: "needs_review", senderName: sender ?? chosen.senderName })
      .where(eq(deposit.reference, chosen.reference))
    return NextResponse.json({ ok: true, status: "flagged_for_review", reference: chosen.reference })
  }

  // 5. Auto-approve — credit the wallet
  await db
    .update(deposit)
    .set({
      status: "success",
      senderName: sender ?? chosen.senderName,
    })
    .where(eq(deposit.reference, chosen.reference))

  await db
    .update(wallet)
    .set({
      balance: sql`${wallet.balance} + ${incoming}`,
      totalDeposited: sql`${wallet.totalDeposited} + ${incoming}`,
      updatedAt: new Date(),
    })
    .where(eq(wallet.userId, chosen.userId))

  await db.insert(transaction).values({
    userId: chosen.userId,
    type: "deposit",
    amount: String(incoming),
    status: "completed",
    reference: chosen.reference,
    description: `Auto-approved deposit via Sabuss webhook. Sender: ${sender ?? "unknown"}`,
  })

  // Update bank account stats
  await db
    .update(bankAccount)
    .set({
      totalDeposits: sql`${bankAccount.totalDeposits} + ${incoming}`,
      depositCount: sql`${bankAccount.depositCount} + 1`,
    })
    .where(eq(bankAccount.id, matchedAccount.id))

  return NextResponse.json({ ok: true, status: "approved", reference: chosen.reference })
}
