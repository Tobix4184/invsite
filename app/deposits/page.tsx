import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { getUserDeposits } from "@/app/actions/deposit"
import { getLiveDepositLimits } from "@/app/actions/settings"
import { DepositHistoryClient } from "./deposit-history-client"
import { NewDepositClient } from "./new-deposit-client"
import { db } from "@/lib/db"
import { wallet } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function DepositsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [deposits, w, limits] = await Promise.all([
    getUserDeposits(),
    db.select().from(wallet).where(eq(wallet.userId, session.user.id)).then((r) => r[0]),
    getLiveDepositLimits(),
  ])

  const balance = Number(w?.balance ?? 0)

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="Deposits" />
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <NewDepositClient balance={balance} minDeposit={limits.minDeposit} />

        {deposits.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Deposit History</p>
            <DepositHistoryClient deposits={deposits} />
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
