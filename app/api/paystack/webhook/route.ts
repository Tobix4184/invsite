import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { creditApprovedDeposit } from "@/app/actions/deposit"

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

  // Only handle charge.success for bank_transfer channel
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
