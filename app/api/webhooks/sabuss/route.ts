import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bankAccount, deposit } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { creditApprovedDeposit } from "@/app/actions/deposit"

/**
 * POST /api/webhooks/sabuss
 *
 * Sabuss fires this when money lands in a linked account.
 * Set this URL in EVERY Sabuss account: https://ipoco.xyz/api/webhooks/sabuss
 *
 * Confirmed Sabuss fee structure (fee deducted from the amount credited to
 * our Sabuss wallet — user sends X, Sabuss credits us X minus fee):
 *   ₦1    – ₦999   → ₦5  fee   (confirmed: ₦500 sent → ₦495 received)
 *   ₦1000+         → ₦50 fee   (confirmed: ₦1000 → ₦950, ₦50000 → ₦49950)
 *
 * We always credit users the FULL deposit amount they intended — we absorb
 * the Sabuss fee. Matching: net received + fee = deposit amount.
 *
 * Expected Sabuss payload fields:
 *   api_key        – the Sabuss API key of the receiving account (optional)
 *   account_number – the receiving account number (primary fallback)
 *   amount         – net amount credited to Sabuss wallet (after fee)
 *   sender         – sender name from bank
 *   reference      – Sabuss internal transaction ID
 *   type           – "credit"
 */

/** Returns the Sabuss fee for a given gross (user-intended) deposit amount */
function sabussFee(gross: number): number {
  if (gross < 1000) return 5
  return 50  // ₦1000 and above: flat ₦50 fee confirmed
}

/**
 * Given the net amount Sabuss credited to our wallet, return all possible
 * gross amounts the user could have intended to send.
 * (We check gross = net + fee for each tier.)
 */
function possibleGrossAmounts(net: number): number[] {
  const candidates = new Set<number>()
  // Try every fee tier
  for (const fee of [5, 10, 50, 100, 200]) {
    const gross = net + fee
    if (sabussFee(gross) === fee) candidates.add(gross)
  }
  candidates.add(net) // also accept exact match (some accounts have no fee)
  return Array.from(candidates)
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  console.log("[v0] Sabuss webhook received:", JSON.stringify(body))

  const { api_key, account_number, amount, sender, reference: sabussRef, type } = body

  // Only process credit notifications
  if (type && type !== "credit") {
    return NextResponse.json({ ok: true, skipped: "not a credit" })
  }

  if (!amount) {
    return NextResponse.json({ ok: false, error: "Missing amount" }, { status: 400 })
  }

  const netReceived = Math.round(parseFloat(amount))
  if (isNaN(netReceived) || netReceived <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
  }

  // 1. Find the bank account — by api_key first, then account_number as fallback
  let matchedAccount = null

  if (api_key) {
    const [acc] = await db.select().from(bankAccount).where(eq(bankAccount.sabussApiKey, api_key))
    matchedAccount = acc ?? null
  }

  if (!matchedAccount && account_number) {
    const [acc] = await db.select().from(bankAccount).where(eq(bankAccount.accountNumber, account_number))
    matchedAccount = acc ?? null
  }

  if (!matchedAccount) {
    console.log("[v0] Sabuss webhook: no matching account for api_key:", api_key, "account_number:", account_number)
    return NextResponse.json({ ok: true, skipped: "unknown account" })
  }

  console.log("[v0] Sabuss webhook: matched account", matchedAccount.accountNumber, "net received:", netReceived)

  const now = new Date()
  const possibleAmounts = possibleGrossAmounts(netReceived)
  console.log("[v0] Sabuss webhook: possible gross amounts:", possibleAmounts)

  // 2. Find all non-expired pending deposits for this bank account
  const allPending = await db
    .select()
    .from(deposit)
    .where(eq(deposit.bankAccountId, matchedAccount.id))

  const candidates = allPending.filter((d) => {
    if (!["pending", "processing"].includes(d.status)) return false
    if (d.expiresAt) {
      const grace = new Date(d.expiresAt)
      grace.setMinutes(grace.getMinutes() + 30)
      if (now >= grace) return false
    }
    const depAmt = Math.round(Number(d.amount))
    return possibleAmounts.includes(depAmt)
  })

  console.log("[v0] Sabuss webhook: found", candidates.length, "candidate deposits")

  if (candidates.length === 0) {
    // Store as unmatched so admin sees the inbound credit
    const unmatchedRef = `SABUSS_UNMATCHED_${sabussRef ?? Date.now()}`
    try {
      await db.insert(deposit).values({
        userId: "UNMATCHED",
        amount: String(netReceived),
        reference: unmatchedRef,
        status: "unmatched",
        bankAccountId: matchedAccount.id,
        assignedBankName: matchedAccount.bankName,
        assignedAccountNumber: matchedAccount.accountNumber,
        assignedAccountName: matchedAccount.accountName,
        senderName: sender ?? null,
        sabussRef: sabussRef ?? null,
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
    if (!chosen.senderName || !sender) return true
    const stored = chosen.senderName.toLowerCase().split(/\s+/)
    const incoming = sender.toLowerCase().split(/\s+/)
    return stored.some((p) => incoming.some((q) => p === q || p.startsWith(q) || q.startsWith(p)))
  })()

  if (!senderMatches) {
    await db
      .update(deposit)
      .set({
        status: "needs_review",
        senderName: sender ?? chosen.senderName,
        sabussRef: sabussRef ?? null,
      })
      .where(eq(deposit.reference, chosen.reference))
    console.log("[v0] Sabuss webhook: name mismatch, flagged for review:", chosen.reference)
    return NextResponse.json({ ok: true, status: "flagged_for_review", reference: chosen.reference })
  }

  // 5. Auto-approve — credit the FULL deposit amount (user's intended amount)
  console.log("[v0] Sabuss webhook: auto-approving", chosen.reference, "amount:", chosen.amount)
  const result = await creditApprovedDeposit({
    reference: chosen.reference,
    senderNameFromWebhook: sender ?? null,
    sabussRef: sabussRef ?? null,
    source: "webhook",
  })

  return NextResponse.json({ ok: result.ok, status: result.ok ? "approved" : "error", reference: chosen.reference })
}
