import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getDashboardData } from "@/app/actions/account"
import { getInvestments } from "@/app/actions/investments"
import { getPendingDeposits } from "@/app/actions/deposit"
import { getActivePromos } from "@/app/actions/promos"
import { getLiveDepositLimits, getLiveWithdrawalCharge } from "@/app/actions/settings"
import { AppHeader } from "@/components/app-header"
import { BottomNav } from "@/components/bottom-nav"
import { BalanceCard } from "@/components/balance-card"
import { QuickActions } from "@/components/quick-actions"
import { PlanCard } from "@/components/plan-card"
import { ActiveInvestments } from "@/components/active-investments"
import { WelcomePopup } from "@/components/welcome-popup"
import { PendingDepositPopup } from "@/components/pending-deposit-popup"
import { PromoPopup } from "@/components/promo-popup"
import { FloatingGamesButton } from "@/components/floating-games-button"
import { PLANS, maskPhone } from "@/lib/plans"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const userId = session.user.id
  const [data, investments, pendingDeposits, activePromos, limits, charge] = await Promise.all([
    getDashboardData(),
    getInvestments(),
    getPendingDeposits(),
    getActivePromos(),
    getLiveDepositLimits(),
    getLiveWithdrawalCharge(),
  ])

  const todayIncome = investments
    .filter((i) => i.status === "active")
    .reduce((s, i) => s + Number(i.dailyEarning), 0)

  return (
    <div className="min-h-screen pb-28">
      <WelcomePopup isNewUser={data.isNewUser} />
      <PendingDepositPopup deposits={pendingDeposits} minDeposit={limits.minDeposit} withdrawalCharge={charge} />
      {!data.isNewUser && <PromoPopup promos={activePromos} />}
      <AppHeader isPromoter={data.isPromoter} />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5 animate-fade-up">
        {/* Greeting */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Welcome</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight tabular-nums">
            {data.phone ? maskPhone(data.phone) : data.name.split(" ")[0]}
            {data.isPromoter && (
              <span className="rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gold-foreground">
                Partner
              </span>
            )}
          </h1>
        </div>

        <BalanceCard
          balance={data.balance}
          todayIncome={todayIncome}
          weekendPoints={data.weekendPoints ?? 0}
          pointsPerNaira={data.pointsPerNaira ?? 0.5}
          nextPayoutDay={data.nextPayoutDay ?? "Saturday"}
        />
        <QuickActions signedInToday={data.signedInToday} />

        <ActiveInvestments investments={investments} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight">Investment Packages</h2>
            <Link href="/products" className="text-sm font-bold text-primary underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {PLANS.slice(0, 4).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      </main>

      <FloatingGamesButton />
      <BottomNav />
    </div>
  )
}
