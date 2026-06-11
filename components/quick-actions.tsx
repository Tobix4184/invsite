"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogIn, UserPlus, Gamepad2, ChevronRight, Gift, Zap } from "lucide-react"
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
          action: { label: "Invest Now", onClick: () => router.push("/products") },
        })
      } else {
        toast.info(res.message)
        setDone(true)
      }
    })
  }

  const gridActions = [
    { label: "Sign In", icon: LogIn, onClick: handleSignIn, tint: "text-sky-400", bg: "bg-sky-400/15", pulse: !done, done },
    { label: "Earn", icon: Zap, onClick: () => router.push("/my-investments"), tint: "text-success", bg: "bg-success/15" },
    { label: "Gift Code", icon: Gift, onClick: () => router.push("/gift-code"), tint: "text-pink-400", bg: "bg-pink-400/15" },
    { label: "Invite", icon: UserPlus, onClick: () => router.push("/team"), tint: "text-primary", bg: "bg-primary/15" },
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
        {/* Daily sign-in banner */}
        {!done && (
          <button
            onClick={handleSignIn}
            disabled={pending}
            className="flex w-full items-center gap-3 rounded-xl border border-sky-400/25 bg-sky-400/8 px-4 py-3 text-left transition-colors hover:bg-sky-400/12 disabled:opacity-60"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/20">
              <LogIn className="h-5 w-5 text-sky-400 animate-shake" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-black text-background">!</span>
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold">Claim daily sign-in bonus</span>
              <span className="text-xs text-sky-400 font-semibold">
                Tap to earn <span className="font-black">₦{SITE.signInBonus}</span> now
              </span>
            </div>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
          </button>
        )}

        {/* 4-icon grid */}
        <div className="grid grid-cols-4 gap-2">
          {gridActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={pending && action.label === "Sign In"}
              className="relative flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {action.pulse && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-400" />
                </span>
              )}
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.done === true ? "text-success" : action.tint}`} />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground leading-tight">
                {action.label === "Sign In" && done ? "Claimed" : action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Games CTA */}
        <button
          onClick={() => setGamesOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-left transition-colors hover:bg-amber-500/12"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15">
            <Gamepad2 className="h-5 w-5 text-amber-400" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
            </span>
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-bold">Play &amp; Earn</span>
            <span className="text-xs text-amber-400 font-medium">Stake &amp; Spin · Lucky Draw · Lock Vault</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </>
  )
}
