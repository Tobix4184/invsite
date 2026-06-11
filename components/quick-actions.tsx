"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, TrendingUp, Ticket, UserRoundPlus, Swords, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { dailySignIn } from "@/app/actions/account"
import { SITE } from "@/lib/plans"
import { GamesPopup } from "@/components/games/games-popup"
import { cn } from "@/lib/utils"

export function QuickActions({
  signedInToday = false,
  freeSlotAvailable = false,
  hasActiveInvestment = false,
  drawOpen = true,
}: {
  signedInToday?: boolean
  freeSlotAvailable?: boolean
  hasActiveInvestment?: boolean
  drawOpen?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(signedInToday)
  const [gamesOpen, setGamesOpen] = useState(false)

  function handleSignIn() {
    if (done) {
      toast.info("You already claimed your sign-in bonus today")
      return
    }
    startTransition(async () => {
      const res = await dailySignIn()
      if (res.ok) {
        toast.success(res.message)
        setDone(true)
        router.refresh()
      } else if ("requiresInvestment" in res && res.requiresInvestment) {
        toast.error(res.message, {
          action: { label: "Invest Now", onClick: () => router.push("/products") },
        })
      } else {
        toast.info(res.message)
        setDone(true)
      }
    })
  }

  const actions = [
    {
      label: done ? "Claimed" : "Check In",
      icon: CalendarCheck2,
      onClick: handleSignIn,
      color: "text-primary",
      bg: "bg-primary/12",
      pulse: !done,
      disabled: pending,
    },
    {
      label: "Earnings",
      icon: TrendingUp,
      onClick: () => router.push("/my-investments"),
      color: "text-success",
      bg: "bg-success/12",
    },
    {
      label: "Gift Code",
      icon: Ticket,
      onClick: () => router.push("/gift-code"),
      color: "text-primary",
      bg: "bg-primary/12",
    },
    {
      label: "Invite",
      icon: UserRoundPlus,
      onClick: () => router.push("/team"),
      color: "text-primary",
      bg: "bg-primary/12",
    },
  ]

  return (
    <>
      <GamesPopup
        open={gamesOpen}
        onClose={() => setGamesOpen(false)}
        freeSlotAvailable={freeSlotAvailable}
        hasActiveInvestment={hasActiveInvestment}
        drawOpen={drawOpen}
      />

      <div className="flex flex-col gap-3">
        {/* Daily check-in banner — only shown when not claimed */}
        {!done && (
          <button
            onClick={handleSignIn}
            disabled={pending}
            className="group flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-left transition-all hover:bg-primary/12 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <CalendarCheck2 className="h-5 w-5 text-primary animate-shake" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">!</span>
            </span>
            <div className="flex flex-1 flex-col min-w-0">
              <span className="text-sm font-black">Claim daily check-in bonus</span>
              <span className="text-xs text-primary font-semibold">
                Tap to earn <span className="font-black">₦{SITE.signInBonus.toLocaleString()}</span> now
              </span>
            </div>
            {/* Pulse dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          </button>
        )}

        {/* 4-icon grid */}
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className="relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center transition-all hover:bg-surface active:scale-95 disabled:opacity-60"
            >
              {action.pulse && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              )}
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", action.bg)}>
                <action.icon className={cn("h-5 w-5", action.color)} strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-bold leading-tight text-muted-foreground">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Arena / Games CTA */}
        <button
          onClick={() => setGamesOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:bg-surface active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/12">
            <Swords className="h-5 w-5 text-amber-400" strokeWidth={1.8} />
          </span>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-black">Arena</span>
            <span className="text-xs text-muted-foreground">Stake &amp; Spin &middot; Lucky Draw &middot; Lock Vault</span>
          </div>
          {/* Live badge */}
          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-black text-success">
            LIVE
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </>
  )
}
