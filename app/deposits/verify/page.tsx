import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { deposit } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { creditApprovedDeposit } from "@/app/actions/deposit"

/**
 * GET /deposits/verify?reference=INCUM_xxx
 *
 * Paystack redirects here after a successful card/redirect payment.
 * We verify the deposit status and redirect to the deposit detail page.
 * The webhook will also fire — creditApprovedDeposit is idempotent (no double credit).
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}) {
  const params = await searchParams
  const reference = params.reference ?? params.trxref

  if (!reference) redirect("/deposits")

  // Verify with Paystack directly
  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (paystackKey) {
    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackKey}` },
        cache: "no-store",
      })
      const data = await res.json() as Record<string, unknown>
      const txData = data.data as Record<string, unknown> | undefined
      if (txData?.status === "success") {
        await creditApprovedDeposit({ reference, source: "webhook" })
      }
    } catch {
      // Webhook will handle it if verification fails here
    }
  }

  // Redirect to deposit detail — shows success/pending state
  const [dep] = await db.select().from(deposit).where(eq(deposit.reference, reference))
  if (dep) redirect(`/deposits/${reference}`)
  redirect("/deposits")
}
