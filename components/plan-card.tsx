'use client'

import Link from 'next/link'
import { CalendarDays, Coins, TrendingUp } from 'lucide-react'
import { type Plan, formatNaira } from '@/lib/plans'

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      {plan.popular && (
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
          Popular
        </span>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success/30 to-primary/30 text-base font-extrabold text-foreground">
          {plan.id}
        </div>
        <div>
          <h3 className="text-lg font-bold leading-none">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Price <span className="font-semibold text-foreground">{formatNaira(plan.price)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-secondary/60 p-3 text-center">
        <Metric icon={Coins} tint="text-success" label="Daily" value={formatNaira(plan.daily)} />
        <Metric icon={TrendingUp} tint="text-amber-400" label="Total" value={formatNaira(plan.total)} />
        <Metric icon={CalendarDays} tint="text-sky-400" label="Duration" value={`${plan.durationDays}d`} />
      </div>

      <Link
        href={`/topup?plan=${plan.id}`}
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Buy Now
      </Link>
    </article>
  )
}

function Metric({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof Coins
  tint: string
  label: string
  value: string
}) {
  return (
    <div>
      <Icon className={`mx-auto h-4 w-4 ${tint}`} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-bold tabular-nums">{value}</p>
    </div>
  )
}
