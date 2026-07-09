import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { creditApprovedDeposit } from "@/app/actions/deposit"
import { db } from "@/lib/db"
import { withdrawal, wallet, transaction } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { setSetting, SETTING_KEYS } from "@/app/actions/settings"

/**
 * POST /api/paystack/webhook
 *
 * Paystack sends a signed webhook when a bank transfer is confirmed.
 * Event: charge.success — reference matches our deposit reference.
 *
 * Set this URL in your Paystack dashboard under Settings → Webhooks:
 *   https://your-domain.com/api/paystack/webhook
 */
export async function POST(req: NextRequest) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const body = await req.text()

  // Verify Paystack signature
  const signature = req.headers.get("x-paystack-signature") ?? ""
  const hash = crypto.createHmac("sha512", paystackKey).update(body).digest("hex")
  if (hash !== signature) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  // ── Transfer events (outgoing withdrawal auto-pay) ────────────────────────
  if (event.event === "transfer.success" || event.event === "transfer.failed") {
    const data = event.data as Record<string, unknown>
    const transferCode = data?.transfer_code as string | undefined
    const transferRef = data?.reference as string | undefined

    if (transferCode || transferRef) {
      // Find the withdrawal by transfer code or reference (WD_{id}_timestamp)
      const [wd] = transferCode
        ? await db.select().from(withdrawal).where(eq(withdrawal.paystackTransferCode, transferCode))
        : await db.select().from(withdrawal).where(eq(withdrawal.paystackTransferCode, transferRef ?? ""))

      if (wd) {
        if (event.event === "transfer.success") {
          await db.update(withdrawal).set({ status: "approved", processedAt: new Date() }).where(eq(withdrawal.id, wd.id))
          await db.update(transaction).set({ status: "completed" })
            .where(and(eq(transaction.userId, wd.userId), eq(transaction.status, "pending")))
        } else {
          // Transfer failed — refund the held amount back to wallet
          await db.update(withdrawal).set({ status: "failed", processedAt: new Date() }).where(eq(withdrawal.id, wd.id))
          await db.update(wallet)
            .set({ balance: sql`${wallet.balance} + ${Number(wd.amount)}`, updatedAt: new Date() })
            .where(eq(wallet.userId, wd.userId))
          const failReason = (data?.gateway_response as string ?? "").toLowerCase()
          await db.insert(transaction).values({
            userId: wd.userId,
            type: "refund",
            amount: String(wd.amount),
            description: "Withdrawal transfer failed — amount refunded to wallet",
          })
          // If failure was due to insufficient Paystack balance, disable auto mode
          if (failReason.includes("insufficient") || failReason.includes("balance")) {
            await setSetting(SETTING_KEYS.withdrawalsAutomatic, "false")
          }
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  // ── Incoming deposit (charge.success) ────────────────────────────────────
  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const data = event.data as Record<string, unknown>
  const reference = data?.reference as string | undefined
  const channel = data?.channel as string | undefined
  const senderName = (data?.authorization as Record<string, unknown>)?.sender_name as string | undefined
    ?? (data?.metadata as Record<string, unknown>)?.sender_name as string | undefined

  if (!reference) {
    return NextResponse.json({ ok: false, error: "No reference" }, { status: 400 })
  }

  // Only auto-credit if this is our reference format or bank_transfer channel
  if (channel !== "bank_transfer" && !reference.startsWith("INCUM_")) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  await creditApprovedDeposit({
    reference,
    senderNameFromWebhook: senderName ?? null,
    source: "webhook",
  })

  return NextResponse.json({ ok: true })
}
