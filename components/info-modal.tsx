'use client'

import { Gift, CalendarDays, Users, Clock, Send, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SITE, formatNaira } from '@/lib/plans'

const items = [
  {
    icon: Gift,
    title: 'Welcome Bonus',
    desc: `${formatNaira(SITE.welcomeBonus)} welcome bonus cash`,
    tint: 'text-primary',
    bg: 'bg-primary/15',
  },
  {
    icon: CalendarDays,
    title: 'Daily Sign-In',
    desc: `${formatNaira(SITE.signInBonus)} bonus + gift code every day`,
    tint: 'text-amber-400',
    bg: 'bg-amber-400/15',
  },
  {
    icon: Users,
    title: 'Referral Bonus',
    desc: `L1: ${SITE.referralLevel1}% (Promoters: ${SITE.promoterLevel1}%) • L2: ${SITE.referralLevel2}%`,
    tint: 'text-success',
    bg: 'bg-success/15',
  },
  {
    icon: Clock,
    title: 'Withdrawal Hours',
    desc: SITE.withdrawalHours,
    tint: 'text-sky-400',
    bg: 'bg-sky-400/15',
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
      <div className="relative z-10 h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-popover p-6 pb-8 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-3 pb-6 pt-2 text-center">
          <Logo className="h-16 w-16" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{SITE.name}</h2>
            <p className="text-sm text-muted-foreground">{SITE.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-4"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.tint}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{item.title}</p>
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
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4" /> Join Telegram Group
          </a>
          <a
            href={SITE.telegramChannel}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            <Send className="h-4 w-4 text-primary" /> Join Telegram Channel
          </a>
        </div>
      </div>
    </div>
  )
}
