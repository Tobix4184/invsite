"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, TrendingUp, Ticket, UserRoundPlus, Gamepad2, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { dailySignIn } from "@/app/actions/account"
import { SITE, formatNaira } from "@/lib/plans"
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
      {/* Check-in banner */}
      {!done && (
        <button
          onClick={handleSignIn}
          disabled={pending}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 text-left transition-all active:scale-[0.99] disabled:opacity-60 glow-primary"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <CalendarCheck2 className="h-5 w-5 text-primary" />
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-black">Claim daily check-in</span>
            <span className="text-xs font-semibold text-primary">
              Earn <span className="font-black">+{formatNaira(SITE.signInBonus)}</span> right now
            </span>
          </div>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        </button>
      )}

      {/* Shortcut grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: done ? "Checked In" : "Check-In", sub: done ? "Back tomorrow" : `+${formatNaira(SITE.signInBonus)}`, icon: CalendarCheck2, action: handleSignIn, accent: !done },
          { label: "My Earnings", sub: "Daily returns", icon: TrendingUp, action: () => router.push("/my-investments") },
          { label: "Gift Code", sub: "Redeem promo", icon: Ticket, action: () => router.push("/gift-code") },
          { label: "Invite", sub: "Referral bonus", icon: UserRoundPlus, action: () => router.push("/team") },
          { label: "Games", sub: "Spin & win", icon: Gamepad2, action: () => router.push("/games") },
        ].map(({ label, sub, icon: Icon, action, accent }) => (
          <button
            key={label}
            onClick={action}
            disabled={pending && label.includes("Check")}
            className={cn(
              "card-glass group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.98] disabled:opacity-60",
              accent && "border-primary/30",
            )}
          >
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-active:scale-90",
              accent ? "bg-primary/20" : "bg-surface",
            )}>
              <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} strokeWidth={1.9} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate text-sm font-bold leading-tight", accent && "text-primary")}>{label}</span>
              <span className="truncate text-[11px] leading-tight text-muted-foreground">{sub}</span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          </button>
        ))}
      </div>
    </div>
  )
}
