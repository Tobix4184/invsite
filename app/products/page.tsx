import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppHeader } from '@/components/app-header'
import { BottomNav } from '@/components/bottom-nav'
import { PlanCard } from '@/components/plan-card'
import { PLANS, formatNaira, SITE } from '@/lib/plans'
import { Layers, TrendingUp, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/')

  const maxDaily = Math.max(...PLANS.map((p) => p.dailyEarning))

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="Investment Packages" />

      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5 animate-fade-up">
        {/* Hero */}
        <section className="card-glass relative overflow-hidden rounded-3xl p-5">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Layers className="h-3.5 w-3.5" />
              {SITE.packageCount} packages
            </span>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-balance text-gradient">
              Invest in real valued assets
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Earn a fixed amount every 24 hours for the full duration of your plan.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="well flex items-center gap-2.5 rounded-2xl px-3 py-2.5">
                <TrendingUp className="h-4 w-4 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Up to per day</p>
                  <p className="text-sm font-black tabular-nums text-success">{formatNaira(maxDaily)}</p>
                </div>
              </div>
              <div className="well flex items-center gap-2.5 rounded-2xl px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Cycle length</p>
                  <p className="text-sm font-black">45–70 days</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Plan cards */}
        <section>
          <h2 className="mb-3 text-lg font-black tracking-tight">Choose your package</h2>
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
