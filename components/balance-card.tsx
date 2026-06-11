'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { formatNaira } from '@/lib/plans'

export function BalanceCard({
  balance,
  todayIncome,
}: {
  balance: number
  todayIncome: number
}) {
  const [show, setShow] = useState(true)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/8 via-transparent to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Balance</p>
          <button
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide balance' : 'Show balance'}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>

        <p className="text-4xl font-black tracking-tight tabular-nums">
          {show ? formatNaira(balance) : '₦ ••••••'}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-bold text-success">
            <TrendingUp className="h-3.5 w-3.5" />
            {show ? `+${formatNaira(todayIncome)}` : '+₦ •••'} today
          </div>

          <div className="flex gap-2">
            <Link
              href="/topup"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowDownToLine className="h-3 w-3" />
              Deposit
            </Link>
            <Link
              href="/withdraw"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowUpFromLine className="h-3 w-3" />
              Withdraw
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
