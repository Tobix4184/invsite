"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, TrendingUp, Loader2, Percent } from "lucide-react"
import { toast } from "sonner"
import { type Plan, formatNaira, getDailyEarning, getTotalEarning } from "@/lib/plans"
import { buyPlan } from "@/app/actions/investments"

export function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [autoReinvest, setAutoReinvest] = useState(true)

  const daily = getDailyEarning(plan)
  const total = getTotalEarning(plan)

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
          router.push(`/topup?plan=${plan.id}`)
        }
      }
    })
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Device image header */}
      <div className="relative h-36 w-full bg-secondary/40">
        <Image
          src={plan.deviceImage}
          alt={plan.device}
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 448px"
        />
        {/* Tier badge */}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${plan.badgeClass}`}>
          {plan.tier}
        </span>
        {plan.popular && (
          <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            Popular
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Name + device */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-black leading-none">{plan.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{plan.device}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Investment</p>
            <p className="text-base font-black tabular-nums">{formatNaira(plan.price)}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-3 text-center mb-4">
          <Metric icon={Percent} tint="text-primary" label="Daily %" value={`${plan.dailyReturnPercent}%`} />
          <Metric icon={TrendingUp} tint="text-success" label="Daily" value={formatNaira(daily)} />
          <Metric icon={CalendarDays} tint="text-amber-400" label="30d Total" value={formatNaira(total)} />
        </div>

        {confirm ? (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoReinvest}
                onChange={(e) => setAutoReinvest(e.target.checked)}
                disabled={pending}
                className="h-3.5 w-3.5 cursor-pointer rounded border-border bg-secondary"
              />
              <span className="text-[11px] text-muted-foreground">Auto-reinvest earnings</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-border bg-secondary py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-bold text-success-foreground disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Invest Now
          </button>
        )}
      </div>
    </article>
  )
}

function Metric({ icon: Icon, tint, label, value }: { icon: typeof TrendingUp; tint: string; label: string; value: string }) {
  return (
    <div>
      <Icon className={`mx-auto h-3.5 w-3.5 ${tint}`} />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-bold tabular-nums">{value}</p>
    </div>
  )
}
