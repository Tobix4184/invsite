"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"
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
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card">
      {/* Device image */}
      <div className="relative h-40 w-full overflow-hidden bg-surface">
        <Image
          src={plan.deviceImage}
          alt={plan.device}
          fill
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 448px"
        />
        {/* Tier badge */}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${plan.badgeClass}`}>
          {plan.tier}
        </span>
        {plan.popular && (
          <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
            Popular
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-black leading-none">{plan.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{plan.device}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost</p>
            <p className="text-base font-black tabular-nums">{formatNaira(plan.price)}</p>
          </div>
        </div>

        {/* Stats — 3 pill tiles */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatTile label="Daily %" value={`${plan.dailyReturnPercent}%`} accent="text-primary" />
          <StatTile label="Per Day" value={formatNaira(daily)} accent="text-success" />
          <StatTile label="30d Earn" value={formatNaira(total)} accent="text-amber-400" />
        </div>

        {confirm ? (
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5">
              <input
                type="checkbox"
                checked={autoReinvest}
                onChange={(e) => setAutoReinvest(e.target.checked)}
                disabled={pending}
                className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <RotateCcw className="h-3 w-3" />
                Auto-reinvest earnings
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 rounded-2xl border border-border bg-surface py-3 text-sm font-bold transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-success py-3 text-sm font-black text-success-foreground disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Invest {formatNaira(plan.price)}
          </button>
        )}
      </div>
    </article>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-2.5 text-center">
      <p className={`text-xs font-black tabular-nums ${accent}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}
