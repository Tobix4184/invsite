"use client"

import { useState, useEffect } from "react"
import { formatNaira } from "@/lib/plans"
import { Clock } from "lucide-react"
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
  const [, setTick] = useState(0)
  const [mounted, setMounted] = useState(false)

  const { data } = useSWR('/api/live-balance', fetcher, {
    fallbackData: { investments: initialInvestments },
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })

  const investments: Inv[] = data?.investments ?? initialInvestments

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

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
          const countdown = mounted ? getCountdown(inv.lastPayoutAt) : ""
          const isReady = countdown === "Ready"

          return (
            <article
              key={inv.id}
              className="card-glass relative overflow-hidden rounded-2xl p-4 pl-5"
            >
              {/* Left accent stripe */}
              <span className={`absolute left-0 top-0 h-full w-2 border-r-2 border-ink ${inv.status === "active" ? "bg-success" : "bg-surface"}`} />

              {/* Top: plan name + status */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-tight">{inv.planName}</h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  inv.status === "active" ? "bg-success text-success-foreground" : "bg-surface text-muted-foreground"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full border border-ink ${inv.status === "active" ? "bg-background" : "bg-muted-foreground"}`} />
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
                {inv.status === "active" && mounted && (
                  <div className={`ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 text-[11px] font-black ${
                    isReady ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    <Clock className="h-3 w-3" />
                    <span suppressHydrationWarning>{isReady ? "Ready" : countdown}</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mt-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-surface">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {inv.daysPaid}/{inv.durationDays} days
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
