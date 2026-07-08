'use client'

import { useState } from 'react'
import { Star, CalendarClock, ArrowUpFromLine, TrendingUp, Users, Gamepad2 } from 'lucide-react'
import { toast } from 'sonner'
import { withdrawWeekendPoints } from '@/app/actions/points'
import { formatNaira } from '@/lib/plans'

export function WeekendSalaryClient({
  points: initialPoints,
  nairaEquivalent: initialNaira,
  pointsPerNaira,
  nextPayoutDay,
}: {
  points: number
  nairaEquivalent: number
  pointsPerNaira: number
  nextPayoutDay: string
}) {
  const [points, setPoints] = useState(initialPoints)
  const [nairaEquivalent, setNairaEquivalent] = useState(initialNaira)
  const [loading, setLoading] = useState(false)

  const isSaturday = new Date().getDay() === 6

  async function handleWithdraw() {
    setLoading(true)
    try {
      const result = await withdrawWeekendPoints()
      if (result.ok) {
        toast.success(result.message)
        setPoints(0)
        setNairaEquivalent(0)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div className="rounded-3xl border-2 border-ink bg-primary p-5 text-primary-foreground shadow-[5px_5px_0_0_var(--ink)]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
            <Star className="h-3 w-3" /> Weekend Salary
          </span>
        </div>

        <p className="mt-4 text-[2.8rem] font-black leading-none tracking-tight tabular-nums">
          {points.toLocaleString()}
          <span className="ml-2 text-xl font-bold opacity-70">pts</span>
        </p>
        <p className="mt-1.5 text-sm font-bold opacity-80">
          ≈ {formatNaira(nairaEquivalent)}
          <span className="ml-2 text-xs opacity-60">· 10 pts = ₦{(10 * pointsPerNaira).toFixed(0)}</span>
        </p>

        {/* Withdraw button */}
        <button
          onClick={handleWithdraw}
          disabled={loading || points === 0 || !isSaturday}
          className="press mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-ink bg-gold py-3.5 text-sm font-black text-gold-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          <ArrowUpFromLine className="h-4 w-4" />
          {loading ? "Processing…" : `Withdraw ${formatNaira(nairaEquivalent)} to Wallet`}
        </button>

        {!isSaturday && (
          <p className="mt-2.5 text-center text-xs font-bold opacity-70">
            Available every Saturday · Next: {nextPayoutDay}
          </p>
        )}
      </div>

      {/* Payout schedule */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 py-3.5 shadow-[3px_3px_0_0_var(--ink)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary">
          <CalendarClock className="h-4 w-4 text-primary-foreground" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next payout window</p>
          <p className="text-sm font-black text-foreground">{nextPayoutDay}</p>
        </div>
      </div>

      {/* How to earn */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">How to earn points</p>
        <div className="flex flex-col gap-2.5">
          {[
            { icon: TrendingUp, title: "Daily Investment Income", desc: "5 pts per ₦100 earned daily from your plans", sub: "Auto-earned every day" },
            { icon: Users, title: "Refer Friends", desc: "+1,000 pts when a referred friend registers", sub: "Per referral" },
            { icon: Star, title: "Buy a Plan", desc: "+500 pts per investment package purchased", sub: "One-time per purchase" },
            { icon: Gamepad2, title: "Win at Games", desc: "Proportional pts on every spin / scratch win", sub: "Per game win" },
          ].map(({ icon: Icon, title, desc, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
