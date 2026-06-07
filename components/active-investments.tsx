"use client"

import { useState, useEffect, useTransition } from "react"
import { formatNaira } from "@/lib/plans"
import { Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { toggleAutoReinvest } from "@/app/actions/investments"

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

function getTimeUntilNextPayout(lastPayoutAt: Date | string): string {
  const last = new Date(lastPayoutAt).getTime()
  const nextPayout = last + 24 * 60 * 60 * 1000 // 24 hours from last payout
  const now = Date.now()
  const diff = nextPayout - now
  
  if (diff <= 0) return "Ready!"
  
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function ActiveInvestments({ investments }: { investments: Inv[] }) {
  const [, setTick] = useState(0)
  const [pending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)
  
  // Update every minute to refresh countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  function handleToggleReinvest(invId: number) {
    setTogglingId(invId)
    startTransition(async () => {
      const res = await toggleAutoReinvest(invId)
      toast[res.ok ? "success" : "error"](res.message)
      setTogglingId(null)
    })
  }

  if (investments.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight">My Investments</h2>
      <div className="flex flex-col gap-3">
        {investments.map((inv) => {
          const pct = Math.min(100, Math.round((inv.daysPaid / inv.durationDays) * 100))
          const timeUntil = getTimeUntilNextPayout(inv.lastPayoutAt)
          const isReady = timeUntil === "Ready!"
          
          return (
            <article key={inv.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{inv.planName}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    inv.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Daily <span className="font-semibold text-success">{formatNaira(Number(inv.dailyEarning))}</span>
                </span>
                <span className="text-muted-foreground">
                  Earned <span className="font-semibold text-foreground">{formatNaira(Number(inv.amountEarned))}</span>
                </span>
              </div>
              
              {inv.status === "active" && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isReady ? "bg-success/15 text-success" : "bg-amber-400/15 text-amber-400"}`}>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Next payout: {timeUntil}</span>
                </div>
              )}

              {/* Auto-reinvest toggle */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Auto-reinvest</span>
                <button
                  onClick={() => handleToggleReinvest(inv.id)}
                  disabled={pending && togglingId === inv.id}
                  className={`relative h-4 w-7 rounded-full transition-colors ${
                    inv.autoReinvest ? "bg-success/30" : "bg-secondary"
                  } disabled:opacity-50`}
                >
                  {pending && togglingId === inv.id ? (
                    <Loader2 className="absolute left-1 top-0.5 h-3 w-3 animate-spin text-success" />
                  ) : (
                    <div
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-success transition-all ${
                        inv.autoReinvest ? "left-3.5" : "left-1"
                      }`}
                    />
                  )}
                </button>
              </div>
              
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {inv.daysPaid}/{inv.durationDays} days · {formatNaira(Number(inv.totalEarning))} total
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
