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
  RefreshCw,
  CalendarClock,
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
  // false = Face A (naira wallet), true = Face B (weekend points)
  const [showPoints, setShowPoints] = useState(false)

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
    <section className="relative overflow-hidden rounded-3xl border-2 border-ink shadow-[5px_5px_0_0_var(--ink)]">
      {/* Face A — Naira wallet */}
      <div
        className={`bg-primary p-5 text-primary-foreground transition-all duration-300 ${
          showPoints ? 'hidden' : 'block'
        }`}
      >
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-background px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Wallet Balance
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPoints(true)}
              aria-label="Switch to weekend points"
              title="View Weekend Points"
              className="press flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-background text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide balance' : 'Show balance'}
              className="press flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-background text-foreground"
            >
              {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Balance */}
        <p className="mt-4 text-[3rem] font-black leading-none tracking-tight tabular-nums">
          {show ? formatNaira(balance) : '₦ ••••'}
        </p>

        {/* Earnings row */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-success px-3 py-1 text-xs font-black text-success-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
            </span>
            {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} earned today
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/deposits"
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-background py-3.5 text-sm font-black text-foreground shadow-[3px_3px_0_0_var(--ink)]"
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
      </div>

      {/* Face B — Weekend Points */}
      <div
        className={`bg-card p-5 transition-all duration-300 ${
          showPoints ? 'block' : 'hidden'
        }`}
      >
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-primary-foreground">
            <Star className="h-3.5 w-3.5" />
            Weekend Salary
          </span>
          <button
            onClick={() => setShowPoints(false)}
            aria-label="Switch to wallet balance"
            title="View Wallet"
            className="press flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-surface text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Points count — big display */}
        <div className="mt-4">
          <p className="text-[3rem] font-black leading-none tracking-tight tabular-nums text-foreground">
            {weekendPoints.toLocaleString()}
            <span className="ml-2 text-xl font-black text-muted-foreground">pts</span>
          </p>
          {/* Naira equivalent pill */}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-gold/30 px-3 py-1 text-xs font-black text-foreground">
            <span>≈ {formatNaira(nairaEquivalent)}</span>
            <span className="text-muted-foreground">({pointsPerNaira * 10} pts = ₦5)</span>
          </div>
        </div>

        {/* Payout notice */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-ink bg-surface px-4 py-2.5">
          <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Next payout</p>
            <p className="text-sm font-black text-foreground">{nextPayoutDay}</p>
          </div>
        </div>

        {/* How points are earned */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Invest', sub: '+500 pts' },
            { label: 'Refer', sub: '+1,000 pts' },
            { label: 'Games', sub: 'Win pts' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border-2 border-ink bg-surface py-2">
              <p className="text-xs font-black text-foreground">{item.label}</p>
              <p className="text-[10px] font-bold text-primary">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
