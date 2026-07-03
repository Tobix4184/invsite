"use client"

import { useState } from "react"
import Link from "next/link"
import { BellDot, X, Clock3, Users, Wallet, ArrowDownToLine, TrendingUp, ShieldCheck, Send, Headphones, BadgeCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import { SITE, formatNaira } from "@/lib/plans"

export function AppHeader({ title, isPromoter = false }: { title?: string; isPromoter?: boolean }) {
  const isHome = !title
  const [open, setOpen] = useState(false)
  const level1Rate = isPromoter ? SITE.promoterLevel1 : SITE.referralLevel1

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4 py-2">
          {isHome ? (
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9 ring-1 ring-primary/30" />
              <div className="leading-none">
                <span className="block text-base font-black tracking-tight">{SITE.name}</span>
                <span className="block text-[10px] font-medium text-muted-foreground">{SITE.tagline}</span>
              </div>
            </div>
          ) : (
            <h1 className="text-base font-black tracking-tight">{title}</h1>
          )}

          <button
            onClick={() => setOpen(true)}
            aria-label="Platform info"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          >
            <BellDot className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </header>

      {/* Info modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-md overflow-y-auto rounded-t-3xl bg-background pb-8"
            style={{ maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
              <div>
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
                <p className="text-base font-black tracking-tight">Platform Info</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {/* Platform banner */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                <div className="relative overflow-hidden bg-primary px-5 py-6 text-primary-foreground">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                  <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {SITE.tagline}
                    </span>
                    <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-balance">
                      Earn Daily Returns<br />on Every Plan
                    </h2>
                    <p className="mt-2 text-sm text-primary-foreground/75">
                      Deposit once. Earn every day. Withdraw when you want.
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-px bg-border">
                  <Stat icon={ArrowDownToLine} tint="text-emerald-400" bg="bg-emerald-400/10" label="Min. Deposit" value={formatNaira(SITE.minDeposit)} />
                  <Stat icon={Wallet} tint="text-amber-400" bg="bg-amber-400/10" label="Min. Withdrawal" value={formatNaira(SITE.minWithdrawal)} />
                  <Stat
                    icon={Users}
                    tint={isPromoter ? "text-amber-400" : "text-primary"}
                    bg={isPromoter ? "bg-amber-400/10" : "bg-primary/10"}
                    label={isPromoter ? "Referral L1 (Partner)" : "Referral Level 1"}
                    value={`${level1Rate}%`}
                  />
                  <Stat icon={TrendingUp} tint="text-sky-400" bg="bg-sky-400/10" label="Referral Level 2" value={`${SITE.referralLevel2}%`} />
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-center gap-3 bg-card px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5 text-emerald-400" />
                    Withdrawal: {SITE.withdrawalHours}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Daily sign-in {formatNaira(SITE.signInBonus)} bonus
                  </span>
                </div>
              </div>

              {/* Community CTAs */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Join Our Community</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">Stay updated. Get support. Grow together.</p>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <a
                    href={SITE.telegramGroup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 rounded-2xl border border-border bg-secondary/50 px-4 py-3.5 transition-colors active:bg-secondary"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
                      <Send className="h-5 w-5 text-sky-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Telegram Group</p>
                      <p className="text-xs text-muted-foreground">Chat with the community &amp; other investors</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-400">JOIN</span>
                  </a>

                  <a
                    href={SITE.telegramChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 rounded-2xl border border-border bg-secondary/50 px-4 py-3.5 transition-colors active:bg-secondary"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      <BadgeCheck className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Official Channel</p>
                      <p className="text-xs text-muted-foreground">Announcements, updates &amp; platform news</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">FOLLOW</span>
                  </a>

                  <a
                    href={SITE.telegramSupport}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 transition-colors active:bg-primary/10"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      <Headphones className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Customer Support</p>
                      <p className="text-xs text-muted-foreground">Need help? Message us directly on Telegram</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">CHAT</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${tint}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
