'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Star,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatNaira } from '@/lib/plans'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function BalanceCard({
  balance: initialBalance,
  todayIncome: initialTodayIncome,
  weekendPoints: initialPoints,
  pointsPerNaira: initialRate,
  nextPayoutDay: initialPayoutDay,
}: {
  balance: number
  todayIncome: number
  weekendPoints: number
  pointsPerNaira: number
  nextPayoutDay: string
}) {
  const [show, setShow] = useState(true)
  // 0 = wallet face, 1 = weekend points face
  const [slide, setSlide] = useState(0)

  const { data } = useSWR('/api/live-balance', fetcher, {
    fallbackData: {
      balance: initialBalance,
      todayIncome: initialTodayIncome,
      weekendPoints: initialPoints,
      pointsPerNaira: initialRate,
      nextPayoutDay: initialPayoutDay,
    },
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })

  const balance = data?.balance ?? initialBalance
  const todayIncome = data?.todayIncome ?? initialTodayIncome
  const weekendPoints = data?.weekendPoints ?? initialPoints
  const pointsPerNaira = data?.pointsPerNaira ?? initialRate
  const nextPayoutDay = data?.nextPayoutDay ?? initialPayoutDay
  const nairaEquivalent = weekendPoints * pointsPerNaira

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-ink shadow-[5px_5px_0_0_var(--ink)]">
      {/* Sliding track — two panels side by side */}
      <div
        className="flex transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateX(${slide === 0 ? '0%' : '-50%'})`, width: '200%' }}
      >
        {/* ── Face A — Naira wallet ─────────────────────────── */}
        <div className="w-1/2 shrink-0 bg-primary p-5 text-primary-foreground">
          {/* Label row */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-primary-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Wallet
            </span>
            <div className="flex items-center gap-2">
              {/* Slide right to points */}
              <button
                onClick={() => setSlide(1)}
                aria-label="View weekend points"
                className="press flex h-8 items-center gap-1 rounded-full border-2 border-white/20 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground"
              >
                <Star className="h-3 w-3" />
                Points
                <ChevronRight className="h-3 w-3 opacity-70" />
              </button>
              <button
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Hide balance' : 'Show balance'}
                className="press flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-primary-foreground"
              >
                {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Balance */}
          <p className="mt-4 text-[2.75rem] font-black leading-none tracking-tight tabular-nums">
            {show ? formatNaira(balance) : '₦ ••••'}
          </p>

          {/* Earnings pill */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 bg-white/10 px-3 py-1 text-xs font-black text-primary-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} today
            </span>
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href="/deposits"
              className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-white/20 bg-white/10 py-3.5 text-sm font-black text-primary-foreground"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </Link>
            <Link
              href="/withdraw"
              className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-gold py-3.5 text-sm font-black text-gold-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Link>
          </div>

          {/* Slide indicator dots */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>

        {/* ── Face B — Weekend Points ───────────────────────── */}
        <div className="w-1/2 shrink-0 bg-card p-5">
          {/* Label row */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-primary-foreground">
              <Star className="h-3.5 w-3.5" />
              Weekend Salary
            </span>
            {/* Slide left back to wallet */}
            <button
              onClick={() => setSlide(0)}
              aria-label="Back to wallet"
              className="press flex h-8 items-center gap-1 rounded-full border-2 border-ink bg-surface px-2.5 text-[10px] font-black uppercase tracking-wider text-foreground"
            >
              <ChevronLeft className="h-3 w-3 opacity-70" />
              Wallet
            </button>
          </div>

          {/* Points display */}
          <div className="mt-4">
            <p className="text-[2.75rem] font-black leading-none tracking-tight tabular-nums text-foreground">
              {weekendPoints.toLocaleString()}
              <span className="ml-2 text-xl font-bold text-muted-foreground">pts</span>
            </p>
            <p className="mt-1.5 text-sm font-bold text-muted-foreground">
              ≈ {formatNaira(nairaEquivalent)}
              <span className="ml-2 text-xs font-semibold opacity-60">(10 pts = ₦{(10 * pointsPerNaira).toFixed(0)})</span>
            </p>
          </div>

          {/* Payout date */}
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-surface px-4 py-2.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Next payout</p>
              <p className="text-sm font-black text-foreground">{nextPayoutDay}</p>
            </div>
          </div>

          {/* Earn grid */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Invest', sub: '+500 pts' },
              { label: 'Refer', sub: '+1,000 pts' },
              { label: 'Games', sub: 'Win pts' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border-2 border-ink bg-surface py-2">
                <p className="text-xs font-black text-foreground">{item.label}</p>
                <p className="text-[10px] font-bold text-primary">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Slide indicator dots */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
            <span className="h-1.5 w-4 rounded-full bg-ink" />
          </div>
        </div>
      </div>
    </section>
  )
}
