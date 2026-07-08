"use client"

import { useState } from "react"
import useSWR from "swr"
import { BellDot, X, Clock3, Users, Wallet, ArrowDownToLine, TrendingUp, ShieldCheck, Send, Headphones, BadgeCheck } from "lucide-react"
import { LogoMark } from "@/components/logo"
import { SITE, formatNaira } from "@/lib/plans"

type PlatformInfo = {
  minDeposit: number
  minWithdrawal: number
  withdrawalCharge: number
  referralLevel1: number
  referralLevel2: number
  promoterLevel1: number
  withdrawalHours: string
  signInBonus: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AppHeader({ title, isPromoter = false }: { title?: string; isPromoter?: boolean }) {
  const isHome = !title
  const [open, setOpen] = useState(false)

  // Fetch live admin-set values via API route (keeps server-only pg/dns out of the browser bundle)
  const { data: info } = useSWR<PlatformInfo>(
    "/api/platform-info",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const minDeposit       = info?.minDeposit       ?? SITE.minDeposit
  const minWithdrawal    = info?.minWithdrawal    ?? (SITE.minWithdrawal ?? 1000)
  const withdrawalCharge = info?.withdrawalCharge ?? SITE.withdrawalCharge
  const referralLevel2   = info?.referralLevel2   ?? SITE.referralLevel2
  const withdrawalHours  = info?.withdrawalHours  ?? SITE.withdrawalHours
  const signInBonus      = info?.signInBonus      ?? SITE.signInBonus
  const level1Rate = isPromoter
    ? (info?.promoterLevel1 ?? SITE.promoterLevel1)
    : (info?.referralLevel1 ?? SITE.referralLevel1)

  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4 py-2">
          {isHome ? (
            <LogoMark />
          ) : (
            <h1 className="text-lg font-black uppercase tracking-tight">{title}</h1>
          )}

          <button
            onClick={() => setOpen(true)}
            aria-label="Platform info"
            className="press flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
          >
            <BellDot className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Info modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-slide-in-right mx-auto w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-ink bg-background pb-8"
            style={{ maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-background px-5 py-4">
              <div>
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink" />
                <p className="text-base font-black uppercase tracking-tight">Platform Info</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="press flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {/* Platform banner */}
              <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
                <div className="relative overflow-hidden border-b-2 border-ink bg-primary px-5 py-6 text-primary-foreground">
                  <div className="relative">
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
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-0">
                  <Stat icon={ArrowDownToLine} tint="text-success" label="Min. Deposit" value={formatNaira(minDeposit)} border="border-b-2 border-r-2" />
                  <Stat icon={Wallet} tint="text-gold" label="Min. Withdrawal" value={formatNaira(minWithdrawal)} border="border-b-2" />
                  <Stat
                    icon={Users}
                    tint={isPromoter ? "text-gold" : "text-primary"}
                    label={isPromoter ? "Referral L1 (Partner)" : "Referral Level 1"}
                    value={`${level1Rate}%`}
                    border="border-r-2"
                  />
                  <Stat icon={TrendingUp} tint="text-primary" label="Referral Level 2" value={`${referralLevel2}%`} border="border-b-2 border-r-2" />
                  <Stat icon={Wallet} tint="text-destructive" label="Withdrawal Fee" value={`${withdrawalCharge}%`} border="border-b-2" />
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-center gap-3 border-t-2 border-ink bg-surface px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5 text-success" />
                    Withdrawal: {withdrawalHours}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-ink" />
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Daily sign-in {formatNaira(signInBonus)} bonus
                  </span>
                </div>
              </div>

              {/* Community CTAs */}
              <div className="overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--ink)]">
                <div className="border-b-2 border-ink px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Join Our Community</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">Stay updated. Get support. Grow together.</p>
                </div>
                <div className="flex flex-col gap-2.5 p-4">
                  <CommunityLink
                    href={SITE.telegramGroup}
                    icon={Send}
                    title="Telegram Group"
                    desc="Chat with the community & other investors"
                    badge="JOIN"
                  />
                  <CommunityLink
                    href={SITE.telegramChannel}
                    icon={BadgeCheck}
                    title="Official Channel"
                    desc="Announcements, updates & platform news"
                    badge="FOLLOW"
                  />
                  <CommunityLink
                    href={SITE.telegramSupport}
                    icon={Headphones}
                    title="Customer Support"
                    desc="Need help? Message us directly on Telegram"
                    badge="CHAT"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CommunityLink({
  href, icon: Icon, title, desc, badge,
}: {
  href: string; icon: typeof Send; title: string; desc: string; badge: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="press flex items-center gap-3.5 rounded-2xl border-2 border-ink bg-card px-4 py-3.5 shadow-[2px_2px_0_0_var(--ink)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-foreground">{title}</p>
        <p className="text-xs font-medium text-muted-foreground">{desc}</p>
      </div>
      <span className="shrink-0 rounded-full border-2 border-ink bg-background px-2.5 py-0.5 text-[11px] font-black">{badge}</span>
    </a>
  )
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  border,
}: {
  icon: typeof Wallet
  tint: string
  label: string
  value: string
  border: string
}) {
  return (
    <div className={`flex items-center gap-3 bg-card p-4 ${border} border-ink`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-surface">
        <Icon className={`h-4 w-4 ${tint}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-black tabular-nums">{value}</p>
      </div>
    </div>
  )
}
