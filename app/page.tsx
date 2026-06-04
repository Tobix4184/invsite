import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { BalanceCard } from '@/components/balance-card'
import { QuickActions } from '@/components/quick-actions'
import { HeroInfo } from '@/components/hero-info'
import { PlanCard } from '@/components/plan-card'
import { PLANS } from '@/lib/plans'

export default function HomePage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <BalanceCard balance={1100} todayIncome={0} />
        <QuickActions />
        <HeroInfo />

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
