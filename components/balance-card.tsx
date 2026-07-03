'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react'
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
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  })

  const balance = data?.balance ?? initialBalance
  const todayIncome = data?.todayIncome ?? initialTodayIncome

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-5 glow-primary">
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-success/15 blur-3xl" />

      <div className="relative">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Wallet Balance
          </span>
          <button
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide balance' : 'Show balance'}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted-foreground transition-colors hover:text-foreground"
          >
            {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {/* Balance — oversized editorial number */}
        <p className="mt-3 text-[2.9rem] font-black leading-none tracking-tight tabular-nums">
          {show ? formatNaira(balance) : '₦ ••••'}
        </p>

        {/* Earnings row */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-bold text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} earned today
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Link
            href="/deposits"
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground transition-all active:scale-[0.98]"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Deposit
          </Link>
          <Link
            href="/withdraw"
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-black text-foreground transition-all active:scale-[0.98]"
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Withdraw
          </Link>
        </div>
      </div>
    </section>
  )
}
