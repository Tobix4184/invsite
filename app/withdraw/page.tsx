import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { WithdrawForm } from "@/components/withdraw-form"
import { WithdrawalHistoryClient } from "./withdrawal-history-client"
import { getUserWithdrawals } from "@/app/actions/wallet"
import { getLiveDepositLimits, getLiveWithdrawalCharge } from "@/app/actions/settings"
import { getNextWithdrawalTime } from "@/lib/plans"
import { db } from "@/lib/db"
import { wallet, withdrawal, profile } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function WithdrawPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [[w], withdrawals, limits, charge, [lastWd], [prof]] = await Promise.all([
    db.select().from(wallet).where(eq(wallet.userId, session.user.id)),
    getUserWithdrawals(),
    getLiveDepositLimits(),
    getLiveWithdrawalCharge(),
    db.select({ createdAt: withdrawal.createdAt }).from(withdrawal).where(eq(withdrawal.userId, session.user.id)).orderBy(desc(withdrawal.createdAt)).limit(1),
    db.select({ windowBypass: profile.windowBypass }).from(profile).where(eq(profile.userId, session.user.id)),
  ])

  const balance = Number(w?.balance ?? 0)
  const nextWithdrawalAt = getNextWithdrawalTime(lastWd?.createdAt ?? null)
  const windowBypass = prof?.windowBypass === true

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="Withdraw" />
      <WithdrawForm
        balance={balance}
        minWithdrawal={limits.minWithdrawal}
        withdrawalCharge={charge}
        nextWithdrawalAt={nextWithdrawalAt?.toISOString() ?? null}
      />
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
