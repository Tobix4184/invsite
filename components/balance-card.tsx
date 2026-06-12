'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowDownLeft, ArrowUpRight, CircleDollarSign } from 'lucide-react'
import { formatNaira } from '@/lib/plans'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function BalanceCard({
  balance: initialBalance,
  todayIncome: initialTodayIncome,
}: {
  balance: number
  todayIncome: number
}) {
  const [show, setShow] = useState(true)

  const { data } = useSWR('/api/live-balance', fetcher, {
    fallbackData: { balance: initialBalance, todayIncome: initialTodayIncome },
    refreshInterval: 10_000,   // poll every 10 seconds
    revalidateOnFocus: true,   // also refresh when user tabs back in
    dedupingInterval: 5_000,
  })

  const balance = data?.balance ?? initialBalance
  const todayIncome = data?.todayIncome ?? initialTodayIncome

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5"
      style={{
        background: 'linear-gradient(135deg, oklch(0.22 0.025 60) 0%, oklch(0.19 0.015 55) 60%, oklch(0.17 0.02 50) 100%)',
        border: '1px solid oklch(1 0 0 / 10%)',
      }}
    >
      {/* Decorative orb */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, oklch(0.75 0.16 75) 0%, transparent 70%)' }}
      />

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Total Balance
          </p>
        </div>
        <button
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide balance' : 'Show balance'}
          className="rounded-full border border-border bg-background/30 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Balance amount */}
      <p className="relative mt-3 text-[2.6rem] font-black leading-none tracking-tight tabular-nums transition-all duration-500">
        {show ? formatNaira(balance) : '₦ ••••••'}
      </p>

      {/* Today's income badge */}
      <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} today
      </div>

      {/* Action buttons */}
      <div className="relative mt-5 flex gap-2.5">
        <Link
          href="/deposits"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background/25 py-2.5 text-xs font-bold text-foreground backdrop-blur-sm transition-all hover:bg-background/40 active:scale-95"
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background/25 py-2.5 text-xs font-bold text-foreground backdrop-blur-sm transition-all hover:bg-background/40 active:scale-95"
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          Withdraw
        </Link>
      </div>
    </section>
  )
}
