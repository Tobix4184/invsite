"use client"

import { useState, useEffect, useTransition } from "react"
import { formatNaira } from "@/lib/plans"
import { Clock, RotateCcw } from "lucide-react"
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

function getCountdown(lastPayoutAt: Date | string): string {
  const next = new Date(lastPayoutAt).getTime() + 24 * 60 * 60 * 1000
  const diff = next - Date.now()
  if (diff <= 0) return "Ready"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function ActiveInvestments({ investments }: { investments: Inv[] }) {
  const [, setTick] = useState(0)
  const [pending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
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
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">Active Plans</h2>
      <div className="flex flex-col gap-3">
        {investments.map((inv) => {
          const pct = Math.min(100, Math.round((inv.daysPaid / inv.durationDays) * 100))
          const countdown = getCountdown(inv.lastPayoutAt)
          const isReady = countdown === "Ready"
          const isToggling = pending && togglingId === inv.id

          return (
            <article key={inv.id} className="rounded-2xl border border-border bg-card p-4">
              {/* Top row */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{inv.planName}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  inv.status === "active" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                }`}>
                  {inv.status}
                </span>
              </div>

              {/* Earnings row */}
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  Daily <span className="font-semibold text-success">{formatNaira(Number(inv.dailyEarning))}</span>
                </span>
                <span className="text-muted-foreground">
                  Earned <span className="font-semibold text-foreground">{formatNaira(Number(inv.amountEarned))}</span>
                </span>
              </div>

              {/* Countdown pill */}
              {inv.status === "active" && (
                <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  isReady ? "bg-success/15 text-success" : "bg-amber-400/10 text-amber-400"
                }`}>
                  <Clock className="h-3 w-3" />
                  {isReady ? "Payout ready" : `Next in ${countdown}`}
                </div>
              )}

              {/* Progress + auto-reinvest in one row */}
              <div className="mt-3 flex items-center gap-3">
                {/* Progress bar */}
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                    {inv.daysPaid}/{inv.durationDays}d
                  </p>
                </div>

                {/* Auto-reinvest into vault toggle — compact */}
                <button
                  type="button"
                  onClick={() => handleToggle(inv.id)}
                  disabled={isToggling}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    inv.autoReinvest ? "bg-success" : "bg-secondary"
                  }`}
                  title={inv.autoReinvest ? "Auto-reinvest into Vault: ON" : "Auto-reinvest into Vault: OFF"}
                  role="switch"
                  aria-checked={inv.autoReinvest}
                >
                  {isToggling ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <RotateCcw className="h-3 w-3 animate-spin text-white" />
                    </span>
                  ) : (
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                      inv.autoReinvest ? "left-4" : "left-0.5"
                    }`} />
                  )}
                </button>
                <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Vault</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
