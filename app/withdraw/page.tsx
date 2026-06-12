import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { WithdrawForm } from "@/components/withdraw-form"
import { WithdrawalHistoryClient } from "./withdrawal-history-client"
import { getUserWithdrawals } from "@/app/actions/wallet"
import { db } from "@/lib/db"
import { wallet } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function WithdrawPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [[w], withdrawals] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, session.user.id)),
    getUserWithdrawals(),
  ])

  const balance = Number(w?.balance ?? 0)

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Withdraw" />
      <WithdrawForm balance={balance} />
      {withdrawals.length > 0 && (
        <div className="mx-auto max-w-md px-4 pb-5">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Withdrawal History</p>
          <WithdrawalHistoryClient withdrawals={withdrawals} />
        </div>
      )}
      <BottomNav />
    </div>
  )
}
