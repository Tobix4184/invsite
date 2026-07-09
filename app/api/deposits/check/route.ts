import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deposit } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/session"
import { creditApprovedDeposit } from "@/app/actions/deposit"

/**
 * GET /api/deposits/check?reference=INCUM_xxx
 *
 * Polls Paystack's verify endpoint to check if a bank transfer has been confirmed.
 * This runs every 20s from the deposit detail page as a backup to the webhook.
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

  // Already resolved
  if (dep.status === "success" || dep.status === "approved") {
    return NextResponse.json({ ok: true, status: "approved" })
  }
  if (dep.status === "failed" || dep.status === "rejected") {
    return NextResponse.json({ ok: true, status: "cancelled" })
  }

  // Auto-cancel if expired
  const now = new Date()
  if (dep.expiresAt && now > new Date(dep.expiresAt)) {
    if (["pending", "processing"].includes(dep.status)) {
      await db.update(deposit).set({ status: "failed" }).where(eq(deposit.reference, reference))
    }
    return NextResponse.json({ ok: true, status: "expired" })
  }

  // Verify with Paystack
  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) {
    return NextResponse.json({ ok: true, status: "pending", message: "Waiting for payment confirmation." })
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
      cache: "no-store",
    })
    const data = await res.json() as { status: boolean; data?: { status: string; authorization?: { sender_name?: string } } }

    if (data?.status && data?.data?.status === "success") {
      const senderName = data.data.authorization?.sender_name ?? null
      await creditApprovedDeposit({ reference, senderNameFromWebhook: senderName, source: "poll" })
      return NextResponse.json({ ok: true, status: "approved" })
    }

    // Paystack returns "pending" for bank transfers still awaiting payment
    return NextResponse.json({ ok: true, status: "pending", message: "Waiting for your transfer to arrive." })
  } catch {
    return NextResponse.json({ ok: true, status: "pending", message: "Could not reach payment gateway." })
  }
}
