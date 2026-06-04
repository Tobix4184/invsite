'use client'

import { useState } from 'react'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'
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
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/30 via-card to-card p-5 shadow-xl">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
          <button
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide balance' : 'Show balance'}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
          {show ? formatNaira(balance) : '₦ • • • • •'}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-sm font-semibold text-success">
          <TrendingUp className="h-4 w-4" />
          {show ? `+${formatNaira(todayIncome)}` : '+₦ • • •'} today
        </div>
      </div>
    </section>
  )
}
