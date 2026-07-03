import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { PlanCard } from '@/components/plan-card'
import { PLANS, getDailyEarning, getTotalEarning, formatNaira } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/')
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Investment Packages" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] bg-primary/90 text-center text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
            <div className="px-2 py-2.5">Package</div>
            <div className="px-2 py-2.5">Price</div>
            <div className="px-2 py-2.5">Per Day</div>
            <div className="px-2 py-2.5">Total</div>
          </div>
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`grid grid-cols-[1.2fr_1fr_1fr_1fr] text-center text-xs tabular-nums ${
                i % 2 === 0 ? 'bg-card' : 'bg-secondary/40'
              }`}
            >
              <div className="border-r border-border px-1 py-2.5 font-bold text-primary">
                {plan.name}
              </div>
              <div className="px-1 py-2.5">{formatNaira(plan.price)}</div>
              <div className="px-1 py-2.5 text-success font-semibold">{formatNaira(getDailyEarning(plan))}</div>
              <div className="px-1 py-2.5">{formatNaira(getTotalEarning(plan))}</div>
            </div>
          ))}
          <p className="bg-card px-3 py-2.5 text-center text-[11px] text-muted-foreground">
            Packages run 45–70 days • Earn a fixed amount every 24 hours
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight">All Packages</h2>
          <div className="flex flex-col gap-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-xs text-muted-foreground">
          Minimum investment to activate any plan is {formatNaira(PLANS[0].price)}.
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
