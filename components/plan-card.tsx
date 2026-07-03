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
  const [autoReinvest, setAutoReinvest] = useState(true)

  const daily = getDailyEarning(plan)
  const total = getTotalEarning(plan)
  const tier = WITHDRAWAL_TIERS[plan.withdrawalTier]
  const isVip = plan.withdrawalTier === "tier1"

  function handleBuy() {
    startTransition(async () => {
      const res = await buyPlan(plan.id, { autoReinvest })
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
    <article
      className={`card-glass relative overflow-hidden rounded-3xl ${plan.popular ? "border-primary/40 glow-primary" : ""}`}
    >
      <div className="flex gap-3.5 p-3.5">
        {/* Asset image */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-white/5">
          <Image
            src={plan.assetImage || "/placeholder.svg"}
            alt={plan.asset}
            fill
            className="object-cover"
            sizes="112px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {plan.popular && (
            <span className="absolute left-1.5 top-1.5 rounded-lg bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground">
              Popular
            </span>
          )}
          <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] font-semibold text-white/90">
            {plan.asset}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black leading-none tracking-tight">{plan.name}</h3>
              <p className="mt-1.5 text-2xl font-black tabular-nums text-gradient">{formatNaira(plan.price)}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${plan.badgeClass}`}
            >
              {plan.tier}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <StatTile icon={TrendingUp} label="Per Day" value={formatNaira(daily)} accent="text-success" />
            <StatTile icon={Coins} label="Total" value={formatNaira(total)} accent="text-primary" />
            <StatTile icon={CalendarDays} label="Days" value={`${plan.durationDays}`} accent="text-foreground" />
          </div>

          <p className="mt-2.5 text-[10px] font-semibold text-muted-foreground">
            Withdraw: <span className={isVip ? "text-gold" : "text-foreground"}>{tier.dayLabel}</span>
          </p>
        </div>
      </div>

      <div className="border-t border-border/60 p-3.5">
        {confirm ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAutoReinvest((v) => !v)}
              disabled={pending}
              className="flex items-center gap-2.5"
            >
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${autoReinvest ? "bg-success" : "bg-muted"}`}
                role="switch"
                aria-checked={autoReinvest}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${autoReinvest ? "left-[18px]" : "left-0.5"}`}
                />
              </span>
              <span className="select-none text-xs text-muted-foreground">Auto-reinvest returns</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 rounded-2xl border border-border bg-surface py-3 text-sm font-bold transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-success py-3 text-sm font-black text-success-foreground transition-all active:scale-[0.98] disabled:opacity-60 glow-success"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
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
  accent,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="well flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-center">
      <Icon className={`h-3 w-3 ${accent}`} />
      <p className={`text-[11px] font-black leading-tight tabular-nums ${accent}`}>{value}</p>
      <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
