'use client'

import { useState, useEffect, useRef } from 'react'
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
  ArrowRight,
} from 'lucide-react'
import { formatNaira } from '@/lib/plans'
import useSWR from 'swr'

const TX_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  deposit:        { label: 'Deposit',    color: 'text-success' },
  withdrawal:     { label: 'Withdrawal', color: 'text-white/60' },
  daily_earning:  { label: 'Daily earn', color: 'text-success' },
  referral:       { label: 'Referral',   color: 'text-gold' },
  task:           { label: 'Task',       color: 'text-gold' },
  game_win:       { label: 'Game win',   color: 'text-gold' },
  points_payout:  { label: 'Pts payout', color: 'text-success' },
  welcome_bonus:  { label: 'Bonus',      color: 'text-gold' },
}

type Tx = { id: number; type: string; amount: string; description: string | null; createdAt: string }

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
  const [slide, setSlide] = useState(0)
  const [txSlide, setTxSlide] = useState(0)
  const txTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: txData } = useSWR('/api/recent-transactions', fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  })
  const recentTxns: Tx[] = txData?.transactions ?? []

  // Auto-cycle through transactions every 3s
  useEffect(() => {
    if (recentTxns.length <= 1) return
    txTimerRef.current = setInterval(() => {
      setTxSlide(s => (s + 1) % recentTxns.length)
    }, 3000)
    return () => { if (txTimerRef.current) clearInterval(txTimerRef.current) }
  }, [recentTxns.length])

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
      {/* Sliding track — two panels side by side, equal height enforced by matching content */}
      <div
        className="flex transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateX(${slide === 0 ? '0%' : '-50%'})`, width: '200%' }}
      >
        {/* ── Face A: Naira wallet ──────────────────────────────────── */}
        <div className="w-1/2 shrink-0 bg-primary p-5 text-primary-foreground">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
              <Wallet className="h-3 w-3" /> Wallet
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSlide(1)}
                aria-label="View weekend points"
                className="press flex h-7 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-wider"
              >
                <Star className="h-2.5 w-2.5" />
                Points
                <ChevronRight className="h-2.5 w-2.5 opacity-60" />
              </button>
              <button
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Hide balance' : 'Show balance'}
                className="press flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10"
              >
                {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Balance */}
          <p className="mt-4 text-[2.6rem] font-black leading-none tracking-tight tabular-nums">
            {show ? formatNaira(balance) : '₦ ••••'}
          </p>

          {/* Today earnings pill */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
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
              className="press flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-black"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </Link>
            <Link
              href="/withdraw"
              className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-gold py-3 text-sm font-black text-gold-foreground shadow-[3px_3px_0_0_var(--ink)]"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Link>
          </div>

          {/* Recent transactions ticker */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Recent</span>
              <Link
                href="/transactions"
                className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white"
              >
                View all <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>

            {recentTxns.length === 0 ? (
              <p className="px-3 py-2.5 text-[11px] text-white/40">No transactions yet</p>
            ) : (
              <div className="relative h-[2.6rem] overflow-hidden">
                {recentTxns.map((tx, i) => {
                  const meta = TX_TYPE_LABEL[tx.type] ?? { label: tx.type, color: 'text-white' }
                  const amt = Number(tx.amount)
                  const isCredit = ['deposit','daily_earning','referral','task','game_win','points_payout','welcome_bonus'].includes(tx.type)
                  return (
                    <div
                      key={tx.id}
                      className="absolute inset-0 flex items-center justify-between px-3 transition-all duration-500 ease-in-out"
                      style={{
                        transform: `translateY(${(i - txSlide) * 100}%)`,
                        opacity: i === txSlide ? 1 : 0,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <span className="truncate text-[10px] text-white/40 max-w-[110px]">
                          {tx.description?.replace(/[₦,]/g, '').slice(0, 30) ?? ''}
                        </span>
                      </div>
                      <span className={`shrink-0 text-sm font-black tabular-nums ${isCredit ? 'text-success' : 'text-white/70'}`}>
                        {isCredit ? '+' : '-'}{show ? formatNaira(Math.abs(amt)) : '₦ •••'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Slide dots */}
            {recentTxns.length > 1 && (
              <div className="flex items-center justify-center gap-1 py-1.5">
                {recentTxns.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTxSlide(i)}
                    className={`rounded-full transition-all duration-300 ${i === txSlide ? 'w-3 h-1 bg-white' : 'w-1 h-1 bg-white/30'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Dot indicators */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>

        {/* ── Face B: Weekend Points ────────────────────────────────── */}
        <div className="w-1/2 shrink-0 bg-card p-5">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-foreground">
              <Star className="h-3 w-3" /> Weekend Pts
            </span>
            <button
              onClick={() => setSlide(0)}
              aria-label="Back to wallet"
              className="press flex h-7 items-center gap-1 rounded-full border-2 border-ink bg-surface px-2.5 text-[10px] font-black uppercase tracking-wider text-foreground"
            >
              <ChevronLeft className="h-2.5 w-2.5 opacity-60" />
              Wallet
            </button>
          </div>

          {/* Points balance */}
          <p className="mt-4 text-[2.6rem] font-black leading-none tracking-tight tabular-nums text-foreground">
            {weekendPoints.toLocaleString()}
            <span className="ml-1.5 text-xl font-bold text-muted-foreground">pts</span>
          </p>

          {/* Naira equiv */}
          <p className="mt-2.5 text-sm font-bold text-muted-foreground">
            ≈ {formatNaira(nairaEquivalent)}
            <span className="ml-1.5 text-xs opacity-60">10 pts = ₦{(10 * pointsPerNaira).toFixed(0)}</span>
          </p>

          {/* Next payout */}
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-surface px-4 py-3">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Next payout</p>
              <p className="text-sm font-black text-foreground">{nextPayoutDay}</p>
            </div>
          </div>

          {/* Withdraw points CTA */}
          <Link
            href="/weekend-salary"
            className="press mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3 text-sm font-black text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Withdraw Points
          </Link>

          {/* Dot indicators */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
            <span className="h-1.5 w-5 rounded-full bg-ink" />
          </div>
        </div>
      </div>
    </section>
  )
}
