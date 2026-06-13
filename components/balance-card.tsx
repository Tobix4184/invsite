'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
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
    <section className="rounded-xl border border-border bg-card p-5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Wallet Balance
        </p>
        <button
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide balance' : 'Show balance'}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Balance — oversized editorial number */}
      <p className="mt-2 text-[2.8rem] font-black leading-none tracking-tight tabular-nums">
        {show ? formatNaira(balance) : '₦ ••••'}
      </p>

      {/* Earnings row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-success/12 px-2.5 py-1 text-xs font-bold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} today
        </span>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-border" />

      {/* Action buttons — full-width rows, not pill circles */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/deposits"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity active:opacity-80"
        >
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-bold text-foreground transition-opacity active:opacity-80"
        >
          Withdraw
        </Link>
      </div>
    </section>
  )
}
