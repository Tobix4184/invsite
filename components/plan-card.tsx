"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
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
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex gap-3 p-3">
        {/* Asset image */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface">
          <Image
            src={plan.assetImage || "/placeholder.svg"}
            alt={plan.asset}
            fill
            className="object-cover"
            sizes="96px"
          />
          {plan.popular && (
            <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-foreground">
              Popular
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black leading-none">{plan.name}</h3>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{plan.asset}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${plan.badgeClass}`}
            >
              {plan.tier}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <StatTile label="Per Day" value={formatNaira(daily)} accent="text-success" />
            <StatTile label="Total" value={formatNaira(total)} accent="text-primary" />
            <StatTile label="Days" value={`${plan.durationDays}`} accent="text-foreground" />
          </div>

          <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
            Withdraw: <span className="text-foreground">{tier.dayLabel}</span>
          </p>
        </div>
      </div>

      <div className="border-t border-border p-3">
        {confirm ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-0.5">
              <button
                type="button"
                onClick={() => setAutoReinvest((v) => !v)}
                disabled={pending}
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${autoReinvest ? "bg-success/70" : "bg-muted"}`}
                aria-checked={autoReinvest}
                role="switch"
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${autoReinvest ? "left-3.5" : "left-0.5"}`}
                />
              </button>
              <span className="select-none text-[10px] text-muted-foreground/70">
                Auto-reinvest returns
              </span>
            </div>
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
            className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <span>Invest Now</span>
            <span className="tabular-nums">{formatNaira(plan.price)}</span>
          </button>
        )}
      </div>
    </article>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-surface px-1.5 py-1.5 text-center">
      <p className={`text-[11px] font-black tabular-nums leading-tight ${accent}`}>{value}</p>
      <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
