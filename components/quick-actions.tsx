"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, TrendingUp, Ticket, UserRoundPlus, Lock, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { dailySignIn } from "@/app/actions/account"
import { SITE } from "@/lib/plans"
import { cn } from "@/lib/utils"

export function QuickActions({ signedInToday = false }: { signedInToday?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(signedInToday)

  function handleSignIn() {
    if (done) { toast.info("Already claimed today"); return }
    startTransition(async () => {
      const res = await dailySignIn()
      if (res.ok) { toast.success(res.message); setDone(true); router.refresh() }
      else if ("requiresInvestment" in res && res.requiresInvestment) {
        toast.error(res.message, { action: { label: "Invest Now", onClick: () => router.push("/products") } })
      } else { toast.info(res.message); setDone(true) }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Check-in banner — accent strip on the left edge */}
      {!done && (
        <button
          onClick={handleSignIn}
          disabled={pending}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-primary/25 bg-primary/8 px-4 py-3.5 text-left transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {/* Left accent bar */}
          <span className="absolute left-0 top-0 h-full w-1 bg-primary" />

          <CalendarCheck2 className="ml-1 h-5 w-5 shrink-0 text-primary" />
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-black">Claim daily check-in</span>
            <span className="text-xs text-primary font-semibold">
              Earn <span className="font-black">+₦{SITE.signInBonus.toLocaleString()}</span> right now
            </span>
          </div>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        </button>
      )}

      {/* Shortcut list — horizontal rows, not icon grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {[
          { label: done ? "Check-in done" : "Daily Check-In", sub: done ? "Come back tomorrow" : `Claim ₦${SITE.signInBonus}`, icon: CalendarCheck2, action: handleSignIn, accent: !done },
          { label: "My Earnings",   sub: "Track daily returns",      icon: TrendingUp,    action: () => router.push("/my-investments") },
          { label: "Gift Code",     sub: "Redeem a promo code",      icon: Ticket,        action: () => router.push("/gift-code") },
          { label: "Invite Friends",sub: "Earn referral bonuses",    icon: UserRoundPlus, action: () => router.push("/team") },
          { label: "Lock Vault",    sub: "Lock funds, earn bonus",   icon: Lock,          action: () => router.push("/games") },
        ].map(({ label, sub, icon: Icon, action, accent }) => (
          <button
            key={label}
            onClick={action}
            disabled={pending && label.includes("Check")}
            className={cn(
              "flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-surface active:bg-surface disabled:opacity-60",
            )}
          >
            <span className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              accent ? "bg-primary/15" : "bg-surface"
            )}>
              <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} strokeWidth={1.8} />
            </span>
            <div className="flex flex-1 flex-col min-w-0">
              <span className={cn("text-sm font-bold leading-tight", accent && "text-primary")}>{label}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{sub}</span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          </button>
        ))}
      </div>
    </div>
  )
}
