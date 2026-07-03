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
    <section className="relative overflow-hidden rounded-3xl border-2 border-ink bg-primary p-5 text-primary-foreground shadow-[5px_5px_0_0_var(--ink)]">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-background px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-foreground">
          <Wallet className="h-3.5 w-3.5" />
          Wallet Balance
        </span>
        <button
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide balance' : 'Show balance'}
          className="press flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-background text-foreground"
        >
          {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Balance — oversized editorial number */}
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
    </section>
  )
}
