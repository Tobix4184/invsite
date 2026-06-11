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
  const [autoReinvest, setAutoReinvest] = useState(false)

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
      <div className="relative h-36 w-full overflow-hidden bg-surface">
        <Image
          src={plan.deviceImage}
          alt={plan.device}
          fill
          className="object-contain p-4 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 448px"
        />
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
        {/* Name + price row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-black leading-none">{plan.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{plan.device}</p>
          </div>
          <p className="text-base font-black tabular-nums">{formatNaira(plan.price)}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <StatTile label="Daily %" value={`${plan.dailyReturnPercent}%`} accent="text-primary" />
          <StatTile label="Per Day" value={formatNaira(daily)} accent="text-success" />
          <StatTile label="30d Total" value={formatNaira(total)} accent="text-amber-400" />
        </div>

        {confirm ? (
          <div className="flex flex-col gap-2">
            {/* Auto-reinvest row — compact */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Auto-reinvest into Vault</span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setAutoReinvest(v => !v)}
                disabled={pending}
                className={`relative h-5 w-9 rounded-full transition-colors ${autoReinvest ? "bg-success" : "bg-secondary"}`}
                aria-checked={autoReinvest}
                role="switch"
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoReinvest ? "left-4" : "left-0.5"}`} />
              </button>
            </div>

            {/* Confirm / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-sm font-black text-success-foreground disabled:opacity-60"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-center rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
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
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-surface px-2 py-2 text-center">
      <p className={`text-xs font-black tabular-nums leading-tight ${accent}`}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
