"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, TrendingUp, CalendarDays, Coins } from "lucide-react"
import { toast } from "sonner"
import {
  type Plan,
  formatNaira,
  getDailyEarning,
  getTotalEarning,
  WITHDRAWAL_TIERS,
} from "@/lib/plans"
import { buyPlan } from "@/app/actions/investments"

export function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  const daily = getDailyEarning(plan)
  const total = getTotalEarning(plan)
  const tier = WITHDRAWAL_TIERS[plan.withdrawalTier]
  const isVip = plan.withdrawalTier === "tier1"

  function handleBuy() {
    startTransition(async () => {
      const res = await buyPlan(plan.id)
      if (res.ok) {
        toast.success(res.message)
        setConfirm(false)
        router.refresh()
      } else {
        toast.error(res.message)
        if (res.message.toLowerCase().includes("insufficient")) {
          router.push(`/deposits`)
        }
      }
    })
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
      <div className="flex gap-3.5 p-3.5">
        {/* Asset image */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-surface">
          <Image
            src={plan.assetImage || "/placeholder.svg"}
            alt={plan.asset}
            fill
            className="object-cover"
            sizes="112px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {plan.popular && (
            <span className="absolute left-1.5 top-1.5 rounded-lg border-2 border-ink bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground">
              Popular
            </span>
          )}
          <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] font-bold text-white">
            {plan.asset}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black uppercase leading-none tracking-tight">{plan.name}</h3>
              <p className="mt-1.5 text-2xl font-black tabular-nums text-foreground">{formatNaira(plan.price)}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${plan.badgeClass}`}
            >
              {plan.tier}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <StatTile icon={TrendingUp} label="Per Day" value={formatNaira(daily)} chip="bg-success" />
            <StatTile icon={Coins} label="Total" value={formatNaira(total)} chip="bg-primary" />
            <StatTile icon={CalendarDays} label="Days" value={`${plan.durationDays}`} chip="bg-gold" />
          </div>

          <p className="mt-2.5 text-[10px] font-bold text-muted-foreground">
            Withdraw: <span className={isVip ? "text-primary" : "text-foreground"}>{tier.dayLabel}</span>
          </p>
        </div>
      </div>

      <div className="border-t-2 border-ink p-3.5">
        {confirm ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="press flex-1 rounded-2xl border-2 border-ink bg-card py-3 text-sm font-black shadow-[3px_3px_0_0_var(--ink)]"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={pending}
                className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-success py-3 text-sm font-black text-success-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary px-4 py-3.5 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            Invest Now
          </button>
        )}
      </div>
    </article>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  chip,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  chip: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-ink bg-surface px-1.5 py-2 text-center">
      <span className={`flex h-5 w-5 items-center justify-center rounded-md border border-ink ${chip}`}>
        <Icon className="h-3 w-3 text-foreground" />
      </span>
      <p className="text-[11px] font-black leading-tight tabular-nums">{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
