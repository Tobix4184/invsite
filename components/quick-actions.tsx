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
          className="press group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 border-ink bg-gold px-4 py-4 text-left text-gold-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-background">
            <CalendarCheck2 className="h-5 w-5 text-foreground" />
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-black uppercase tracking-tight">Claim daily check-in</span>
            <span className="text-xs font-bold">
              Earn <span className="font-black">+{formatNaira(SITE.signInBonus)}</span> right now
            </span>
          </div>
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-40" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-ink bg-primary" />
          </span>
        </button>
      )}

      {/* Shortcut grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: done ? "Checked In" : "Check-In", sub: done ? "Back tomorrow" : `+${formatNaira(SITE.signInBonus)}`, icon: CalendarCheck2, action: handleSignIn, chip: "bg-gold" },
          { label: "My Earnings", sub: "Daily returns", icon: TrendingUp, action: () => router.push("/my-investments"), chip: "bg-success" },
          { label: "Gift Code", sub: "Redeem promo", icon: Ticket, action: () => router.push("/gift-code"), chip: "bg-primary" },
          { label: "Invite", sub: "Referral bonus", icon: UserRoundPlus, action: () => router.push("/team"), chip: "bg-primary" },
          { label: "Games", sub: "Spin & win", icon: Gamepad2, action: () => router.push("/games"), chip: "bg-success" },
        ].map(({ label, sub, icon: Icon, action, chip }) => (
          <button
            key={label}
            onClick={action}
            disabled={pending && label.includes("Check")}
            className="press group flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-3.5 py-3 text-left shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
          >
            <span className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink",
              chip,
            )}>
              <Icon className="h-4 w-4 text-foreground" strokeWidth={2.2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-black leading-tight">{label}</span>
              <span className="truncate text-[11px] font-semibold leading-tight text-muted-foreground">{sub}</span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
