import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { PlanCard } from '@/components/plan-card'
import { PLANS, formatNaira } from '@/lib/plans'

export default function ProductsPage() {
  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="IHH Income Table" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-success/90 text-center text-[11px] font-bold uppercase tracking-wide text-success-foreground">
            <div className="px-2 py-2.5">Plan</div>
            <div className="px-2 py-2.5">Price</div>
            <div className="px-2 py-2.5">Daily</div>
            <div className="px-2 py-2.5">Total</div>
          </div>
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`grid grid-cols-[1fr_1fr_1fr_1fr] text-center text-xs tabular-nums ${
                i % 2 === 0 ? 'bg-card' : 'bg-secondary/40'
              }`}
            >
              <div className="border-r border-border px-1 py-2.5 font-bold text-success">
                {plan.name}
              </div>
              <div className="px-1 py-2.5">{plan.price.toLocaleString()}</div>
              <div className="px-1 py-2.5">{plan.daily.toLocaleString()}</div>
              <div className="px-1 py-2.5">{plan.total.toLocaleString()}</div>
            </div>
          ))}
          <p className="bg-card px-3 py-2.5 text-center text-[11px] text-muted-foreground">
            All plans run for 30 days • Income drops every 24 hours
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight">All Plans</h2>
          <div className="flex flex-col gap-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-xs text-muted-foreground">
          Minimum deposit to activate any plan is {formatNaira(PLANS[0].price)}.
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
