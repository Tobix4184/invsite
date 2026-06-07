"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Gift, LogIn, UserPlus, Gamepad2 } from "lucide-react"
import { toast } from "sonner"
import { dailySignIn } from "@/app/actions/account"
import { SITE } from "@/lib/plans"
import { GamesPopup } from "@/components/games/games-popup"

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
          action: {
            label: "Invest Now",
            onClick: () => router.push("/products"),
          },
        })
      } else {
        toast.info(res.message)
        setDone(true)
      }
    })
  }

  const linkActions = [
    { label: "Topup", icon: ArrowDownToLine, href: "/topup", tint: "text-success", bg: "bg-success/15" },
    { label: "Withdraw", icon: ArrowUpFromLine, href: "/withdraw", tint: "text-amber-400", bg: "bg-amber-400/15" },
    { label: "Gift Code", icon: Gift, href: "/gift-code", tint: "text-pink-400", bg: "bg-pink-400/15" },
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
      {/* Sign-in call-to-action banner */}
      {!done && (
        <button
          onClick={handleSignIn}
          disabled={pending}
          className="flex w-full items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-left transition-colors hover:bg-sky-400/15 disabled:opacity-60"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/20">
            <LogIn className="h-5 w-5 text-sky-400 animate-shake" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-black text-background">
              !
            </span>
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-bold text-foreground">Claim your daily sign-in bonus</span>
            <span className="text-xs text-sky-400 font-semibold">
              Tap to earn {" "}
              <span className="font-black">₦{SITE.signInBonus}</span>
              {" "}right now →
            </span>
          </div>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
          </span>
        </button>
      )}

      {/* Quick action grid */}
      <section className="grid grid-cols-5 gap-2">
        {linkActions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
              <action.icon className={`h-5 w-5 ${action.tint}`} />
            </span>
            <span className="text-[11px] font-medium leading-tight text-muted-foreground">{action.label}</span>
          </button>
        ))}

        {/* Sign-in grid button */}
        <button
          onClick={handleSignIn}
          disabled={pending}
          className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {!done && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-sky-400 opacity-75" />
            </span>
          )}
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? "bg-success/15" : "bg-sky-400/15"}`}>
            <LogIn className={`h-5 w-5 ${done ? "text-success" : "text-sky-400"} ${!done ? "animate-shake" : ""}`} />
          </span>
          <span className="text-[11px] font-medium leading-tight text-muted-foreground">
            {done ? "Claimed" : "Sign In"}
          </span>
        </button>

        <button
          onClick={() => router.push("/team")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <UserPlus className="h-5 w-5 text-primary" />
          </span>
          <span className="text-[11px] font-medium leading-tight text-muted-foreground">Invite</span>
        </button>
      </section>

      {/* Games CTA banner */}
      <button
        onClick={() => setGamesOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-left transition-all active:scale-[0.99]"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.025 264) 0%, oklch(0.23 0.035 65) 100%)" }}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/15">
          <Gamepad2 className="h-5 w-5 text-amber-400" />
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
          </span>
        </span>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-bold text-foreground">Play &amp; Earn</span>
          <span className="text-xs text-amber-400 font-semibold">
            Spin &amp; win up to 3× · Daily Lucky Draw
          </span>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    </div>
    </>
  )
}
