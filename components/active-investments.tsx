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
      {/* Section header */}
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Active Plans
      </p>

      <div className="flex flex-col gap-3">
        {investments.map((inv) => {
          const pct = Math.min(100, Math.round((inv.daysPaid / inv.durationDays) * 100))
          const countdown = getCountdown(inv.lastPayoutAt)
          const isReady = countdown === "Ready"
          const isToggling = pending && togglingId === inv.id

          return (
            <article
              key={inv.id}
              className="card-glass relative overflow-hidden rounded-2xl p-4"
            >
              {/* Left accent stripe */}
              <span className={`absolute left-0 top-0 h-full w-1 ${inv.status === "active" ? "bg-success" : "bg-muted"}`} />

              {/* Top: plan name + status */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-tight">{inv.planName}</h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  inv.status === "active" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${inv.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                  {inv.status}
                </span>
              </div>

              {/* Earnings */}
              <div className="mt-3 flex items-baseline gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Daily</p>
                  <p className="text-sm font-black text-success tabular-nums">{formatNaira(Number(inv.dailyEarning))}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Earned</p>
                  <p className="text-sm font-black tabular-nums">{formatNaira(Number(inv.amountEarned))}</p>
                </div>
                {inv.status === "active" && (
                  <div className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isReady ? "bg-success/12 text-success" : "bg-primary/10 text-primary"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {isReady ? "Ready" : countdown}
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mt-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {inv.daysPaid}/{inv.durationDays} days
                  </p>
                </div>

                {/* Auto-reinvest toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground">Auto</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(inv.id)}
                    disabled={isToggling}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                      inv.autoReinvest ? "bg-success" : "bg-muted"
                    }`}
                    title={inv.autoReinvest ? "Auto-reinvest earnings: ON" : "Auto-reinvest earnings: OFF"}
                    role="switch"
                    aria-checked={inv.autoReinvest}
                  >
                    {isToggling ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <RotateCcw className="h-3 w-3 animate-spin text-white" />
                      </span>
                    ) : (
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                        inv.autoReinvest ? "left-[18px]" : "left-0.5"
                      }`} />
                    )}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
