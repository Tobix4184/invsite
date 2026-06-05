import Link from "next/link"
import { redirect } from "next/navigation"
import { Star } from "lucide-react"
import { getSession } from "@/lib/session"
import { getDashboardData } from "@/app/actions/account"
import { getInvestments } from "@/app/actions/investments"
import { getPendingDeposits } from "@/app/actions/deposit"
import { getPauseFlags } from "@/app/actions/settings"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { BalanceCard } from "@/components/balance-card"
import { QuickActions } from "@/components/quick-actions"
import { HeroInfo } from "@/components/hero-info"
import { PlanCard } from "@/components/plan-card"
import { ActiveInvestments } from "@/components/active-investments"
import { WelcomePopup } from "@/components/welcome-popup"
import { PendingDepositPopup } from "@/components/pending-deposit-popup"
import { PLANS } from "@/lib/plans"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [data, investments, pendingDeposits, pauseFlags] = await Promise.all([
    getDashboardData(),
    getInvestments(),
    getPendingDeposits(),
    getPauseFlags(),
  ])

  const todayIncome = investments
    .filter((i) => i.status === "active")
    .reduce((s, i) => s + Number(i.dailyEarning), 0)

  return (
    <div className="min-h-screen pb-24">
      <WelcomePopup />
      <PendingDepositPopup deposits={pendingDeposits} />
      <AppHeader />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {data.name}
            {data.isPromoter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                <Star className="h-3 w-3" /> Promoter
              </span>
            )}
          </h1>
        </div>

        <BalanceCard balance={data.balance} todayIncome={todayIncome} />
        <QuickActions
          signedInToday={data.signedInToday}
          depositsPaused={pauseFlags.depositsPaused}
          withdrawalsPaused={pauseFlags.withdrawalsPaused}
        />
        <HeroInfo isPromoter={data.isPromoter} />

        <ActiveInvestments investments={investments} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">IHH Plans</h2>
            <Link href="/products" className="text-sm font-semibold text-primary">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {PLANS.slice(0, 6).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
