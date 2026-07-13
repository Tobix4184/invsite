"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, TrendingUp, CalendarDays, Coins, Zap, ArrowRight, Check, X, Lock } from "lucide-react"
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
  const roi = Math.round((total / plan.price) * 100)

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
    <article className="group relative overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5">

      {/* Top accent strip */}
      <div className={`h-1.5 w-full ${isVip ? "bg-gold" : plan.withdrawalTier === "tier2" ? "bg-success" : "bg-primary"}`} />

      {/* Hero section: image + price */}
      <div className="relative">
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={plan.assetImage || "/placeholder.svg"}
            alt={plan.asset}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Sold-out full overlay */}
          {plan.soldOut && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-[2px]">
              <Lock className="h-8 w-8 text-white/80" />
              <span className="rounded-full border-2 border-white/40 bg-black/60 px-4 py-1 text-sm font-black uppercase tracking-widest text-white">
                Sold Out
              </span>
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${plan.badgeClass}`}>
              {plan.tier}
            </span>
            {plan.popular && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-foreground">
                <Zap className="h-2.5 w-2.5" />
                Hot
              </span>
            )}
          </div>

          {/* ROI badge */}
          <div className="absolute right-3 top-3">
            <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-success px-2.5 py-0.5 text-[10px] font-black text-success-foreground">
              <TrendingUp className="h-2.5 w-2.5" />
              {roi}% ROI
            </span>
          </div>

          {/* Asset name + plan name at bottom of image */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{plan.asset}</p>
            <h3 className="text-xl font-black uppercase leading-none tracking-tight text-white">{plan.name}</h3>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Investment</p>
          <p className="text-2xl font-black tabular-nums text-foreground">{formatNaira(plan.price)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Withdraw</p>
          <p className={`text-xs font-black ${isVip ? "text-gold-foreground" : "text-foreground"}`}>{tier.dayLabel}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x-2 divide-ink/10 border-b-2 border-ink/10">
        <StatCell icon={TrendingUp} bg="bg-primary" label="Per Day" value={formatNaira(daily)} />
        <StatCell icon={Coins} bg="bg-success" label="Total" value={formatNaira(total)} />
        <StatCell icon={CalendarDays} bg="bg-gold" label="Days" value={`${plan.durationDays}d`} />
      </div>

      {/* CTA */}
      <div className="p-3.5">
        {plan.soldOut ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink/30 bg-muted py-4 text-sm font-black uppercase tracking-wide text-muted-foreground opacity-60">
            <Lock className="h-4 w-4" />
            No Longer Available
          </div>
        ) : confirm ? (
          <div className="flex gap-2.5">
            <button
              onClick={() => setConfirm(false)}
              disabled={pending}
              className="press flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-card py-3.5 text-sm font-black shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleBuy}
              disabled={pending}
              className="press flex flex-[2] items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-success py-3.5 text-sm font-black text-success-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {pending ? "Processing..." : "Confirm Buy"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="press group/btn flex w-full items-center justify-between rounded-2xl border-2 border-ink bg-primary px-5 py-4 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <span>Invest Now</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-primary-foreground/30 bg-primary-foreground/20 transition-transform group-hover/btn:translate-x-0.5">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        )}
      </div>
    </article>
  )
}

function StatCell({
  icon: Icon,
  bg,
  label,
  value,
}: {
  icon: typeof TrendingUp
  bg: string
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg border border-ink/30 ${bg}`}>
        <Icon className="h-3 w-3 text-foreground/80" />
      </span>
      <p className="text-sm font-black tabular-nums leading-none">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
