"use client"

import { Clock3, Users, Wallet, ArrowDownToLine, TrendingUp, ShieldCheck, Send, Headphones, BadgeCheck } from "lucide-react"
import { SITE, formatNaira } from "@/lib/plans"

export function HeroInfo({ isPromoter = false }: { isPromoter?: boolean }) {
  const level1Rate = isPromoter ? SITE.promoterLevel1 : SITE.referralLevel1

  return (
    <section className="flex flex-col gap-4">
      {/* Platform highlight card */}
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[5px_5px_0_0_var(--ink)]">
        {/* Header banner */}
        <div className="border-b-2 border-ink bg-primary px-5 py-6 text-primary-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-background px-3 py-1 text-[11px] font-black uppercase tracking-widest text-foreground">
            <BadgeCheck className="h-3.5 w-3.5" />
            {SITE.tagline}
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-balance">
            Earn Daily Returns<br />on Every Plan
          </h2>
          <p className="mt-2 text-sm font-semibold text-primary-foreground/80">
            Deposit once. Earn every day. Withdraw when you want.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-0.5 bg-ink/15">
          <Stat
            icon={ArrowDownToLine}
            tint="text-success-foreground"
            bg="bg-success"
            label="Min. Deposit"
            value={formatNaira(SITE.minDeposit)}
          />
          <Stat
            icon={Wallet}
            tint="text-gold-foreground"
            bg="bg-gold"
            label="Min. Withdrawal"
            value={formatNaira(SITE.minWithdrawal)}
          />
          <Stat
            icon={Users}
            tint={isPromoter ? "text-gold-foreground" : "text-primary-foreground"}
            bg={isPromoter ? "bg-gold" : "bg-primary"}
            label={isPromoter ? "Referral L1 (Partner)" : "Referral Level 1"}
            value={`${level1Rate}%`}
          />
          <Stat
            icon={TrendingUp}
            tint="text-primary-foreground"
            bg="bg-primary"
            label="Referral Level 2"
            value={`${SITE.referralLevel2}%`}
          />
        </div>

        {/* Footer info row */}
        <div className="flex flex-wrap items-center justify-center gap-3 bg-card px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 text-success" />
            Withdrawal: {SITE.withdrawalHours}
          </span>
          <span className="h-1 w-1 rounded-full bg-ink" />
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Daily sign-in {formatNaira(SITE.signInBonus)} bonus
          </span>
        </div>
      </div>

      {/* Community & Support CTAs */}
      <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[5px_5px_0_0_var(--ink)]">
        <div className="border-b-2 border-ink px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Join Our Community</p>
          <p className="mt-0.5 text-sm font-bold text-foreground">Stay updated. Get support. Grow together.</p>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {/* Telegram Group */}
          <a
            href={SITE.telegramGroup}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-3.5 rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 shadow-[3px_3px_0_0_var(--ink)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary">
              <Send className="h-5 w-5 text-primary-foreground" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">Telegram Group</p>
              <p className="text-xs text-muted-foreground">Chat with the community &amp; other investors</p>
            </div>
            <span className="shrink-0 rounded-full border-2 border-ink bg-primary px-2.5 py-0.5 text-[11px] font-black text-primary-foreground">JOIN</span>
          </a>

          {/* Telegram Channel */}
          <a
            href={SITE.telegramChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-3.5 rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 shadow-[3px_3px_0_0_var(--ink)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold">
              <BadgeCheck className="h-5 w-5 text-gold-foreground" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">Official Channel</p>
              <p className="text-xs text-muted-foreground">Announcements, updates &amp; platform news</p>
            </div>
            <span className="shrink-0 rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 text-[11px] font-black text-gold-foreground">FOLLOW</span>
          </a>

          {/* Support */}
          <a
            href={SITE.telegramSupport}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center gap-3.5 rounded-2xl border-2 border-ink bg-surface px-4 py-3.5 shadow-[3px_3px_0_0_var(--ink)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-success">
              <Headphones className="h-5 w-5 text-success-foreground" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">Customer Support</p>
              <p className="text-xs text-muted-foreground">Need help? Message us directly on Telegram</p>
            </div>
            <span className="shrink-0 rounded-full border-2 border-ink bg-success px-2.5 py-0.5 text-[11px] font-black text-success-foreground">CHAT</span>
          </a>
        </div>
      </div>
    </section>
  )
}

function Stat({
  icon: Icon,
  tint,
  bg,
  label,
  value,
}: {
  icon: typeof Wallet
  tint: string
  bg: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 bg-card p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${bg}`}>
        <Icon className={`h-4 w-4 ${tint}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-black tabular-nums">{value}</p>
      </div>
    </div>
  )
}
