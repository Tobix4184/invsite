'use client'

import { Gift, CalendarDays, Users, Clock, Send, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SITE, formatNaira } from '@/lib/plans'

const items = [
  {
    icon: Gift,
    title: 'Welcome Bonus',
    desc: `${formatNaira(SITE.welcomeBonus)} welcome bonus cash`,
    tint: 'text-primary-foreground',
    bg: 'bg-primary',
  },
  {
    icon: CalendarDays,
    title: 'Daily Sign-In',
    desc: `${formatNaira(SITE.signInBonus)} bonus + gift code every day`,
    tint: 'text-gold-foreground',
    bg: 'bg-gold',
  },
  {
    icon: Users,
    title: 'Referral Bonus',
    desc: `L1: ${SITE.referralLevel1}% (Promoters: ${SITE.promoterLevel1}%) • L2: ${SITE.referralLevel2}%`,
    tint: 'text-success-foreground',
    bg: 'bg-success',
  },
  {
    icon: Clock,
    title: 'Withdrawal Hours',
    desc: SITE.withdrawalHours,
    tint: 'text-primary-foreground',
    bg: 'bg-primary',
  },
]

export function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center overflow-hidden sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-ink bg-popover p-6 pb-8 shadow-[6px_6px_0_0_var(--ink)] sm:max-h-[90vh] sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="press absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-card text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-3 pb-6 pt-2 text-center">
          <Logo className="h-16 w-16" />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{SITE.name}</h2>
            <p className="text-sm text-muted-foreground">{SITE.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.tint}`} />
              </div>
              <div className="min-w-0">
                <p className="font-black leading-tight">{item.title}</p>
                <p className="truncate text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={SITE.telegramGroup}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-3.5 font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)]"
          >
            <Send className="h-4 w-4" /> Join Telegram Group
          </a>
          <a
            href={SITE.telegramChannel}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-card py-3.5 font-black uppercase text-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <Send className="h-4 w-4 text-primary" /> Join Telegram Channel
          </a>
        </div>
      </div>
    </div>
  )
}
