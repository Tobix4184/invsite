'use client'

import Link from 'next/link'
import { ArrowDownToLine, ArrowUpFromLine, Gift, LogIn, UserPlus } from 'lucide-react'

const actions = [
  { label: 'Topup', icon: ArrowDownToLine, href: '/topup', tint: 'text-success', bg: 'bg-success/15' },
  { label: 'Withdraw', icon: ArrowUpFromLine, href: '/withdraw', tint: 'text-amber-400', bg: 'bg-amber-400/15' },
  { label: 'Gift Code', icon: Gift, href: '/gift-code', tint: 'text-pink-400', bg: 'bg-pink-400/15' },
  { label: 'Sign In', icon: LogIn, href: '/sign-in', tint: 'text-sky-400', bg: 'bg-sky-400/15' },
  { label: 'Invite', icon: UserPlus, href: '/team', tint: 'text-primary', bg: 'bg-primary/15' },
]

export function QuickActions() {
  return (
    <section className="grid grid-cols-5 gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
            <action.icon className={`h-5 w-5 ${action.tint}`} />
          </span>
          <span className="text-[11px] font-medium leading-tight text-muted-foreground">
            {action.label}
          </span>
        </Link>
      ))}
    </section>
  )
}
