"use client"

import { useState, useEffect, useTransition } from "react"
import { formatNaira } from "@/lib/plans"
import { Clock, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { toggleAutoReinvest } from "@/app/actions/investments"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Inv = {
  id: number
  planName: string
  dailyEarning: string
  amountEarned: string
  totalEarning: string
  daysPaid: number
  durationDays: number
  status: string
  autoReinvest: boolean
  lastPayoutAt: Date | string
}

function getCountdown(lastPayoutAt: Date | string): string {
  const next = new Date(lastPayoutAt).getTime() + 24 * 60 * 60 * 1000
  const diff = next - Date.now()
  if (diff <= 0) return "Ready"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function ActiveInvestments({ investments: initialInvestments }: { investments: Inv[] }) {
  const [pending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const { data } = useSWR('/api/live-balance', fetcher, {
    fallbackData: { investments: initialInvestments },
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })

  const investments: Inv[] = data?.investments ?? initialInvestments

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  function handleToggle(id: number) {
    setTogglingId(id)
    startTransition(async () => {
      const res = await toggleAutoReinvest(id)
      toast[res.ok ? "success" : "error"](res.message)
      setTogglingId(null)
    })
  }

  if (investments.length === 0) return null

  return (
    <section>
      {/* Section header — uppercase label only, no extra decoration */}
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Active Plans
      </p>

      <div className="flex flex-col gap-2">
        {investments.map((inv) => {
          const pct = Math.min(100, Math.round((inv.daysPaid / inv.durationDays) * 100))
          const countdown = getCountdown(inv.lastPayoutAt)
          const isReady = countdown === "Ready"
          const isToggling = pending && togglingId === inv.id

          return (
            <article
              key={inv.id}
              className="relative overflow-hidden rounded-xl border border-border bg-card pl-4 pr-4 py-4"
            >
              {/* Left accent stripe */}
              <span className={`absolute left-0 top-0 h-full w-[3px] ${inv.status === "active" ? "bg-success" : "bg-muted"}`} />

              {/* Top: plan name + status */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight">{inv.planName}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${
                  inv.status === "active" ? "text-success" : "text-muted-foreground"
                }`}>
                  {inv.status}
                </span>
              </div>

              {/* Earnings */}
              <div className="mt-2 flex items-baseline gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Daily</p>
                  <p className="text-sm font-black text-success">{formatNaira(Number(inv.dailyEarning))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Earned</p>
                  <p className="text-sm font-black">{formatNaira(Number(inv.amountEarned))}</p>
                </div>
              </div>

              {/* Countdown */}
              {inv.status === "active" && (
                <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-bold ${
                  isReady ? "bg-success/12 text-success" : "bg-primary/10 text-primary"
                }`}>
                  <Clock className="h-3 w-3" />
                  {isReady ? "Payout ready" : `Next in ${countdown}`}
                </div>
              )}

              {/* Progress */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-1 overflow-hidden rounded-none bg-surface">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                    {inv.daysPaid}/{inv.durationDays}d
                  </p>
                </div>

                {/* Auto-reinvest toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(inv.id)}
                  disabled={isToggling}
                  className={`relative h-4 w-7 shrink-0 rounded-none transition-colors disabled:opacity-40 ${
                    inv.autoReinvest ? "bg-success/70" : "bg-muted"
                  }`}
                  title={inv.autoReinvest ? "Auto-reinvest into Lock Vault (7 days, +8%): ON" : "Auto-reinvest into Lock Vault: OFF"}
                  role="switch"
                  aria-checked={inv.autoReinvest}
                >
                  {isToggling ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <RotateCcw className="h-2.5 w-2.5 animate-spin text-white" />
                    </span>
                  ) : (
                    <span className={`absolute top-0.5 h-3 w-3 rounded-none bg-white shadow-sm transition-all ${
                      inv.autoReinvest ? "left-3.5" : "left-0.5"
                    }`} />
                  )}
                </button>
                <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap select-none">Lock Vault</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
